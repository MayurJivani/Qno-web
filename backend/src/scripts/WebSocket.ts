import WebSocket, { WebSocketServer } from 'ws';
import http from 'http';  // Import the http module
import { Card } from '../models/Card';
import { v4 as uuidv4 } from 'uuid';
import { GameRoom } from '../models/GameRoom';
import { Player } from '../models/Player';
import { Status as GameRoomStatus } from '../enums/gameRoom/Status';
import { GameManager } from './GameManager';
import { Logger } from '../utils/Logger';
import { CardEffectEngine } from './CardEffectEngine';

const rooms: Map<string, GameRoom> = new Map();
const playerMap = new Map<WebSocket, { roomId: string, playerId: string }>();

export function setupWebSocketServer(server: http.Server) {
	const wss = new WebSocketServer({ server });

	wss.on('connection', (ws: WebSocket) => {
		Logger.info("CONNECTED", 'A user has connected.');
		ws.send(JSON.stringify({ type: 'CONNECTED', message: 'WebSocket connection setup successfully' }));
		ws.on('message', (message: Buffer) => {
			try {
				const messageStr = message.toString('utf-8');
				handleMessage(ws, messageStr);
			} catch (error) {
				Logger.error(`Error handling message: ${error instanceof Error ? error.message : 'Unknown error'}`);
			}
		});
		ws.on('close', () => handlePlayerDisconnect(ws));
		ws.on('error', (err) => Logger.error(`WebSocket error: ${err.message || 'Unknown error'}`));
	});
}

const handleMessage = (ws: WebSocket, message: string) => {
	try {
		const parsed = JSON.parse(message);
		
		if (!parsed.type || typeof parsed.type !== 'string') {
			Logger.error('Invalid message: missing or invalid type');
			ws.send(JSON.stringify({ type: 'ERROR', message: 'Invalid message format' }));
			return;
		}

		const actions: { [key: string]: () => void } = {
			'CREATE_ROOM': () => {
				const playerName = typeof parsed.playerName === 'string' ? parsed.playerName.trim() : '';
				if (!playerName) {
					ws.send(JSON.stringify({ type: 'ERROR', message: 'Player name is required' }));
					return;
				}
				createRoom(ws, playerName);
			},
			'JOIN_ROOM': () => {
				if (typeof parsed.roomId !== 'string') {
					ws.send(JSON.stringify({ type: 'ERROR', message: 'Invalid roomId' }));
					return;
				}
				const playerName = typeof parsed.playerName === 'string' ? parsed.playerName.trim() : '';
				if (!playerName) {
					ws.send(JSON.stringify({ type: 'ERROR', message: 'Player name is required' }));
					return;
				}
				joinRoom(ws, parsed.roomId, playerName);
			},
			'REJOIN_ROOM': () => {
				if (typeof parsed.roomId !== 'string' || typeof parsed.playerId !== 'string') {
					ws.send(JSON.stringify({ type: 'ERROR', message: 'Invalid roomId or playerId' }));
					return;
				}
				rejoinRoom(ws, parsed.roomId, parsed.playerId);
			},
			'LEFT_ROOM': () => handlePlayerDisconnect(ws, parsed.roomId, parsed.playerId),
			'PLAYER_READY': () => {
				if (typeof parsed.roomId !== 'string' || typeof parsed.playerId !== 'string') {
					ws.send(JSON.stringify({ type: 'ERROR', message: 'Invalid roomId or playerId' }));
					return;
				}
				handlePlayerReady(ws, parsed.roomId, parsed.playerId);
			},
			'START_GAME': () => {
				if (typeof parsed.roomId !== 'string' || typeof parsed.playerId !== 'string') {
					ws.send(JSON.stringify({ type: 'ERROR', message: 'Invalid roomId or playerId' }));
					return;
				}
				handleGameStart(ws, parsed.roomId, parsed.playerId);
			},
			'PLAY_CARD': () => {
				if (typeof parsed.roomId !== 'string' || typeof parsed.playerId !== 'string' || !parsed.card) {
					ws.send(JSON.stringify({ type: 'ERROR', message: 'Invalid play card request' }));
					return;
				}
				handleCardPlay(ws, parsed.roomId, parsed.playerId, parsed.card);
			},
			'DRAW_CARD': () => {
				if (typeof parsed.roomId !== 'string' || typeof parsed.playerId !== 'string') {
					ws.send(JSON.stringify({ type: 'ERROR', message: 'Invalid roomId or playerId' }));
					return;
				}
				handleDrawCard(ws, parsed.roomId, parsed.playerId);
			},
			'TELEPORTATION_SELECT': () => {
				if (typeof parsed.roomId !== 'string' || typeof parsed.playerId !== 'string' || 
				    typeof parsed.fromPlayerId !== 'string' || !parsed.card) {
					ws.send(JSON.stringify({ type: 'ERROR', message: 'Invalid teleportation selection' }));
					return;
				}
				handleTeleportationSelection(ws, parsed.roomId, parsed.playerId, parsed.fromPlayerId, parsed.card);
			},
			'ENTANGLEMENT_SELECT': () => {
				if (typeof parsed.roomId !== 'string' || typeof parsed.playerId !== 'string' || 
				    typeof parsed.opponent1Id !== 'string' || typeof parsed.opponent2Id !== 'string') {
					ws.send(JSON.stringify({ type: 'ERROR', message: 'Invalid entanglement selection' }));
					return;
				}
				handleEntanglementSelection(ws, parsed.roomId, parsed.playerId, parsed.opponent1Id, parsed.opponent2Id);
			},
			'DRAWN_CARD_DECISION': () => {
				if (typeof parsed.roomId !== 'string' || typeof parsed.playerId !== 'string' || 
				    typeof parsed.decision !== 'string' || !['PLAY', 'KEEP'].includes(parsed.decision)) {
					ws.send(JSON.stringify({ type: 'ERROR', message: 'Invalid drawn card decision' }));
					return;
				}
				handleDrawnCardDecision(ws, parsed.roomId, parsed.playerId, parsed.decision);
			},
		'GET_GAME_STATE': () => sendGameState(ws),
	};

		const action = actions[parsed.type];
		if (action) {
			action();
		} else {
			Logger.error(`Unknown message type: ${parsed.type}`);
			ws.send(JSON.stringify({ type: 'ERROR', message: `Unknown message type: ${parsed.type}` }));
		}
	} catch (error) {
		Logger.error(`Error parsing message: ${error instanceof Error ? error.message : 'Unknown error'}`);
		ws.send(JSON.stringify({ type: 'ERROR', message: 'Failed to parse message' }));
	}
};


const createRoom = (ws: WebSocket, playerName: string) => {
	const roomId = uuidv4();
	const playerId = uuidv4();
	const player: Player = new Player(playerId, playerName, ws);
	const room: GameRoom = new GameRoom(roomId, player);
	playerMap.set(ws, { roomId, playerId });
	ws.send(JSON.stringify({ type: 'ROOM_CREATED', roomId, playerId }));
	//addPlayer() function implicitly sends 'JOINED_ROOM' message to client and broadcasts 'NEW_PLAYER_JOINED' message to other players
	room.addPlayer(player, playerMap);
	rooms.set(roomId, room);
	Logger.info("ROOM_CREATED", `Room created: ${roomId}`);
	Logger.info("ROOM_JOINED", `Player: ${playerId} (${playerName}) has joined room: ${roomId} `);
};

const joinRoom = (ws: WebSocket, roomId: string, playerName: string) => {
	const room: GameRoom = rooms.get(roomId)!;
	if (!room) return ws.send(JSON.stringify({ type: 'ERROR', message: 'Room not found' }));
	const playerId = uuidv4();
	playerMap.set(ws, { roomId, playerId });
	if (room.canJoin()) {
		const newPlayer: Player = new Player(playerId, playerName, ws);
		//addPlayer() function implicitly sends 'JOINED_ROOM' message to client and broadcasts 'NEW_PLAYER_JOINED' message to other players
		room.addPlayer(newPlayer, playerMap);
		Logger.info("ROOM_JOINED", `Player: ${playerId} (${playerName}) has joined room: ${roomId}`);
	} else {
		if (room.status !== GameRoomStatus.NOT_STARTED) {
			ws.send(JSON.stringify({ type: 'ERROR', message: 'Cannot join. Game has already started.' }));
			return;
		}
		if (room.players.size >= 4) {
			ws.send(JSON.stringify({ type: 'ERROR', message: 'Room is full.' }));
			return;
		}
	}
};

const handlePlayerDisconnect = (ws: WebSocket, roomId?: string, playerId?: string) => {
	// Initialize playerID and roomID
	let roomID = roomId ?? null;
	let playerID = playerId ?? null;
	// Determine the player and room if not provided
	if (!roomID || !playerID) {
		const result = playerMap.get(ws);
		if (!result) {
			Logger.error(`Player: ${playerId} not found in playerMap.`);
			ws.close(); // Close the connection anyway
			return;
		}
		roomID = result.roomId;
		playerID = result.playerId;
	}
	// Retrieve the room
	const room = rooms.get(roomID);
	if (!room) {
		Logger.error(`Room ${roomID} was not found. WebSocket could not be closed.`);
		return;
	}
	const isHost = room.host.id === playerID;
	// Remove player from the room and clean up mappings
	// Remove player implicitly checks whether room size is 0 or not. If it is zero, it deletes the room.
	room.removePlayer(playerID, rooms);
	playerMap.delete(ws);
	ws.close();
	// If no players are left in the room, return
	if (room.players.size === 0) return;
	// If host left, assign a new one
	if (isHost) {
		room.assignNewHost();
	}
};

const handlePlayerReady = (_ws: WebSocket, roomId: string, playerId: string) => {
	const result = checkValidity(roomId, playerId);
	//If result is empty, return
	if (!result) return;
	result.player.markReady();
	result.room.broadcast({ type: 'PLAYER_READY', playerId });
	Logger.info("PLAYER_READY", `Player: ${playerId} is ready in room ${roomId}.`);
};

const handleGameStart = (ws: WebSocket, roomId: string, playerId: string) => {
	const result = checkValidity(roomId, playerId);
	if (!result) return;
	const { room } = result;
	if (room.canStartGame(playerId)) {
		Logger.info("START_GAME", `Starting game in room: ${roomId}.`);
		GameManager.startGame(room);
	} else {
		ws.send(JSON.stringify({ type: 'ERROR', message: 'Not authorized or players not ready' }));
	}
}

// Export alias for backward compatibility with existing tests
export { setupWebSocketServer as setupWebSocket };
const handleCardPlay = (_ws: WebSocket, roomId: string, playerId: string, card: Card) => {
	const result = checkValidity(roomId, playerId);
	if (!result) return;
	const { room, player } = result;
	GameManager.playCard(room, player, card);
};


const handleDrawCard = (_ws: WebSocket, roomId: string, playerId: string) => {
	const result = checkValidity(roomId, playerId);
	if (!result) return;
	const { room, player } = result;
	GameManager.drawCard(room, player)
};

const handleDrawnCardDecision = (_ws: WebSocket, roomId: string, playerId: string, decision: 'PLAY' | 'KEEP') => {
	const result = checkValidity(roomId, playerId);
	if (!result) return;
	const { room, player } = result;
	GameManager.handleDrawnCardDecision(room, player, decision);
};

const rejoinRoom = (ws: WebSocket, roomId: string, playerId: string) => {
	const room = rooms.get(roomId);

	if (!room || !room.players.has(playerId)) {
		ws.send(JSON.stringify({ type: 'ERROR', message: 'Could not rejoin: Invalid room or playerId' }));
		return;
	}

	// Re-associate ws with this player
	playerMap.set(ws, { playerId, roomId });

	ws.send(JSON.stringify({
		type: 'REJOINED_ROOM',
		playerId,
		roomId,
	}));
}

const handleTeleportationSelection = (_ws: WebSocket, roomId: string, playerId: string, fromPlayerId: string, cardData: any) => {
	const result = checkValidity(roomId, playerId);
	if (!result) return;
	const { room, player } = result;
	
	// Construct a proper Card object from the received data
	// The frontend may only send one side (the visible inactive face), so we need to handle that
	// We'll use the ID to find the actual card in the opponent's hand, which has both sides
	if (!cardData || !cardData.id) {
		player.sendMessage({ type: 'ERROR', message: 'Invalid card data' });
		return;
	}
	
	// Find the actual card in the opponent's hand by ID (it has both sides)
	const fromPlayer = room.players.get(fromPlayerId);
	if (!fromPlayer) {
		player.sendMessage({ type: 'ERROR', message: 'Invalid player selected.' });
		return;
	}
	
	const actualCard = fromPlayer.getHandCards().find(c => c.id === cardData.id);
	if (!actualCard) {
		player.sendMessage({ type: 'ERROR', message: 'Selected card not found in opponent\'s hand.' });
		return;
	}
	
	CardEffectEngine.handleTeleportationSelection(room, player, fromPlayerId, actualCard)
}

const handleEntanglementSelection = (_ws: WebSocket, roomId: string, playerId: string, opponent1Id: string, opponent2Id: string) => {
	const result = checkValidity(roomId, playerId);
	if (!result) return;
	const { room, player } = result;
	
	GameManager.handleEntanglementSelection(room, player, opponent1Id, opponent2Id);
}

const sendGameState = (ws: WebSocket) => {
	const gameState = {
		rooms: Array.from(rooms.values()).map(room => ({
			id: room.id,
			players: Array.from(room.players.keys()),
			deckSize: room.drawPileManager.getRemainingCardCount()
		})),
		playerMap: Array.from(playerMap.entries()).map(([_ws, data]) => ({
			roomId: data.roomId,
			playerId: data.playerId
		}))
	};

	ws.send(JSON.stringify({ type: 'GAME_STATE', data: gameState }));
};

function checkValidity(roomId: string, playerId: string) {
	const room: GameRoom | undefined = rooms.get(roomId);
	if (!room) {
		Logger.error(`Room ${roomId} was not found.`);
		return;
	}

	const player: Player | undefined = room.players.get(playerId);
	if (!player) {
		Logger.error(`Player ${playerId} was not found.`);
		return;
	}

	return {
		room: room,
		player: player
	};
}


