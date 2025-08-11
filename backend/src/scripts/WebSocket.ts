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
		ws.send(JSON.stringify({ type: 'CONNECTED', message: 'WebSocket connection setup successfully' }))
		ws.on('message', (message: string) => handleMessage(ws, JSON.parse(message)));
		ws.on('close', () => handlePlayerDisconnect(ws));
		ws.on('error', (err) => console.error('WebSocket error:', err));
	});
}

const handleMessage = (ws: WebSocket, message: any) => {
	const actions: { [key: string]: Function } = {
		'CREATE_ROOM': () => createRoom(ws),
		'JOIN_ROOM': () => joinRoom(ws, message.roomId),
		'REJOIN_ROOM': () => rejoinRoom(ws, message.roomId, message.playerId),
		'LEFT_ROOM': () => handlePlayerDisconnect(ws, message.roomId, message.playerId),
		'PLAYER_READY': () => handlePlayerReady(ws, message.roomId, message.playerId),
		'START_GAME': () => handleGameStart(ws, message.roomId, message.playerId),
		'PLAY_CARD': () => handleCardPlay(ws, message.roomId, message.playerId, message.card),
		'DRAW_CARD': () => handleDrawCard(ws, message.roomId, message.playerId),
		'TELEPORTATION_SELECT': () => handleTeleportationSelection(ws, message.roomId, message.playerId, message.fromPlayerId, message.card),
		'GET_GAME_STATE': () => sendGameState(ws),
	};

	const action = actions[message.type];
	action ? action() : Logger.error(`Unknown message type: ${message.type}`);
};


const createRoom = (ws: WebSocket) => {
	const roomId = uuidv4();
	const playerId = uuidv4();
	playerMap.set(ws, { roomId, playerId });
	const player: Player = new Player(playerId, ws);
	const room: GameRoom = new GameRoom(roomId, player);
	playerMap.set(ws, { roomId: roomId, playerId: playerId });
	ws.send(JSON.stringify({ type: 'ROOM_CREATED', roomId, playerId }));
	//addPlayer() function implicitly sends 'JOINED_ROOM' message to client and broadcasts 'NEW_PLAYER_JOINED' message to other players
	room.addPlayer(player, playerMap);
	rooms.set(roomId, room);
	Logger.info("ROOM_CREATED", `Room created: ${roomId}`);
	Logger.info("ROOM_JOINED", `Player: ${playerId} has joined room: ${roomId} `);
};

const joinRoom = (ws: WebSocket, roomId: string) => {
	const room: GameRoom = rooms.get(roomId)!;
	if (!room) return ws.send(JSON.stringify({ type: 'ERROR', message: 'Room not found' }));
	const playerId = uuidv4();
	playerMap.set(ws, { roomId, playerId });
	if (room.canJoin()) {
		const newPlayer: Player = new Player(playerId, ws);
		//addPlayer() function implicitly sends 'JOINED_ROOM' message to client and broadcasts 'NEW_PLAYER_JOINED' message to other players
		room.addPlayer(newPlayer, playerMap);
		Logger.info("ROOM_JOINED", `Player: ${playerId} has joined room: ${roomId}`);
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

const handlePlayerReady = (ws: WebSocket, roomId: string, playerId: string) => {
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

const handleCardPlay = (ws: WebSocket, roomId: string, playerId: string, card: Card) => {
	const result = checkValidity(roomId, playerId);
	if (!result) return;
	const { room, player } = result;
	GameManager.playCard(room, player, card);
};


const handleDrawCard = (ws: WebSocket, roomId: string, playerId: string) => {
	const result = checkValidity(roomId, playerId);
	if (!result) return;
	const { room, player } = result;
	GameManager.drawCard(room, player)
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

const handleTeleportationSelection = (ws: WebSocket, roomId: string, playerId: string, fromPlayerId: string, card: Card) => {
	const result = checkValidity(roomId, playerId);
	if (!result) return;
	const { room, player } = result;
	GameManager.handleTeleportation(room, player, fromPlayerId, card)
}

const sendGameState = (ws: WebSocket) => {
	const gameState = {
		rooms: Array.from(rooms.values()).map(room => ({
			id: room.id,
			players: Array.from(room.players.keys()),
			deckSize: room.drawPileManager.getRemainingCardCount()
		})),
		playerMap: Array.from(playerMap.entries()).map(([ws, data]) => ({
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


