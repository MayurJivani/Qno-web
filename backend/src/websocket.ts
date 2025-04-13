import WebSocket, { WebSocketServer } from 'ws';
import http from 'http';  // Import the http module
import { Card } from './models/Card';
import { Status as GameRoomStatus } from './enums/gameRoom/Status';
import { Status as PlayerStatus } from './enums/player/Status';
import { v4 as uuidv4 } from 'uuid';
import { CardFace } from './enums/cards/CardFace';
import { GameRoom } from './models/GameRoom';
import { Player } from './models/Player';

const rooms: Map<string, GameRoom> = new Map();
const playerMap = new Map<WebSocket, { roomId: string, playerId: string }>();

export function setupWebSocket(server: http.Server) {
	const wss = new WebSocketServer({ server });

	wss.on('connection', (ws: WebSocket) => {
		console.log('[CONNECTED] A user has connected.');

		ws.send(JSON.stringify({ type: 'CONNECTED', message: 'WebSocket connection setup successfully' }))

		ws.on('message', (message: string) => {
			handleMessage(ws, JSON.parse(message));
		});
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
		'GET_GAME_STATE': () => sendGameState(ws)
	};

	const action = actions[message.type];
	if (action) action();
	else console.log('Unknown message type:', message.type);
};


const createRoom = (ws: WebSocket) => {

	const roomId = uuidv4();
	const playerId = uuidv4();

	// Save player info
	playerMap.set(ws, { roomId, playerId });

	const player: Player = new Player(playerId, ws);

	const room: GameRoom = new GameRoom(roomId, player);
	playerMap.set(ws, { roomId: roomId, playerId: playerId });
	ws.send(JSON.stringify({ type: 'ROOM_CREATED', roomId, playerId }));

	//addPlayer() function implicitly sends 'JOINED_ROOM' message to client
	room.addPlayer(player, playerMap);
	rooms.set(roomId, room);

	console.log(`[ROOM_CREATED] Room created: ${roomId}`);
	console.log(`[ROOM_CREATED] Player: ${playerId} has joined room: ${roomId} `);
};

const joinRoom = (ws: WebSocket, roomId: string) => {

	const room: GameRoom = rooms.get(roomId)!;
	if (!room) {
		ws.send(JSON.stringify({ type: 'ERROR', message: 'Room not found' }));
		return;
	}
	const playerId = uuidv4();
	// Check if room is not full and game hasn't started yet
	if (room.players.size < 4 && (room.status == GameRoomStatus.NOT_STARTED)) {
		playerMap.set(ws, { roomId, playerId });
		const newPlayer: Player = new Player(playerId, ws);
		//addPlayer() function implicitly sends 'JOINED_ROOM' message to client
		room.addPlayer(newPlayer, playerMap)
		room.broadcast({ type: 'ROOM_JOINED', playerId: playerId});
		console.log(`[ROOM_JOINED] Player: ${playerId} has joined room: ${roomId}`);
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
			console.log(`[ERROR] Player: ${playerId} not found in playerMap.`);
			ws.close(); // Close the connection anyway
			return;
		}
		roomID = result.roomId;
		playerID = result.playerId;
	}

	// Retrieve the room
	const room = rooms.get(roomID);
	if (!room) {
		console.log(`[ERROR] Room ${roomID} was not found. WebSocket could not be closed.`);
		return;
	}

	const isHost = room.host.id === playerID;

	// Remove player from the room and clean up mappings
	// Remove player implicitly checks whether room size is 0 or not. If it is zero, it deletes the room.
	room.removePlayer(playerID, rooms);
	playerMap.delete(ws);
	ws.close();

	// If the room is empty, no need to broadcast anything
	if (room.players.size === 0) {
		return;
	}

	// Otherwise, notify remaining players first
	room.broadcast({ type: 'PLAYER_LEFT', playerID });

	// If host left, assign a new one
	if (isHost) {
		const remainingPlayers = Array.from(room.players.values());
		if (remainingPlayers.length > 0) {
			room.host = remainingPlayers[0];
			room.broadcast({ type: 'NEW_HOST', newHostId: room.host.id });
			console.log(`[NEW_HOST] Player: ${room.host.id} is now the new host of room: ${room.id}.`);
		}
	}
};

const handlePlayerReady = (ws: WebSocket, roomId: string, playerId: string) => {

	const result: { room: GameRoom, player: Player } | undefined = checkValidity(roomId, playerId);

	//If result is empty, return
	if (!result) {
		return;
	}

	result.player.status = PlayerStatus.READY;
	result.room.broadcast({ type: 'PLAYER_READY', playerId });
	console.log(`[PLAYER_READY] Player: ${playerId} is ready in room ${roomId}.`);
};

const handleGameStart = (ws: WebSocket, roomId: string, playerId: string) => {

	const result: { room: GameRoom, player: Player } | undefined = checkValidity(roomId, playerId);

	//If result is empty, return
	if (!result) {
		return;
	}

	let room: GameRoom = result.room;

	//Check if the person starting the game is the host of the gameRoom
	if (playerId === room.host.id && room.allPlayersReady()) {
		console.log(`[START_GAME] Starting game in room: ${roomId}.`);
		room.status = GameRoomStatus.ACTIVE;
		room.broadcast({ type: 'START_GAME', roomId: roomId, drawPile: room.drawPile });
		dealCards(room);
	}
}

const dealCards = (room: GameRoom) => {

	for (let i = 0; i < 7; i++) {
		room.players.forEach(p => {
			if (room.drawPile.length > 0) {
				const card = room.drawPile.shift();
				if (card) p.hand.push(card);
			}
		});
	}

	room.players.forEach((p: Player) => {

		const opponentPlayersHands: Map<string, CardFace[]> = new Map();
		//Opponents are players who have different id's than the current player
		const opponents = Array.from(room.players.values()).filter(op => op.id !== p.id);

		opponents.forEach(op => {
			let hand: Card[] = op.hand;
			let visibleCardFaces: CardFace[] = [];
			hand.forEach(card => {
				let cardFace: CardFace = inactiveCardFace(room, card);
				visibleCardFaces.push(cardFace);
			})
			opponentPlayersHands.set(op.id, visibleCardFaces);
		})

		p.sendMessage({
			type: 'YOUR_HAND',
			hand: p.hand
		})

		p.sendMessage({
			type: 'OPPONENT_HAND',
			opponentHands: Object.fromEntries(opponentPlayersHands) // Convert Map to object for serialization
		})
	})
};

const handleCardPlay = (ws: WebSocket, roomId: string, playerId: string, card: Card) => {
	const result: { room: GameRoom, player: Player } | undefined = checkValidity(roomId, playerId);

	//If result is empty, return
	if (!result) {
		return;
	}

	const { room, player } = result;

	player.hand = player.hand.filter(c => !areCardsEqual(c, card));

	handleCardEffect(card);

	let cardFacePlayed: CardFace = activeCardFace(room, card);

	room.players.forEach(p => {
		if (p.id !== playerId) {

			p.socket.send(JSON.stringify({
				type: 'OPPONENT_PLAYED_CARD',
				cardFacePlayed,
				opponentId: playerId
			}));
		} else {
			p.socket.send(JSON.stringify({
				type: 'PLAYED_CARD',
				cardFacePlayed,
				playerId: playerId
			}));
		}
	});

	console.log(`[PLAYED_CARD] Player: ${playerId} played a ${cardFacePlayed.colour} ${cardFacePlayed.number} card in room: ${roomId}.`);
};


const handleDrawCard = (ws: WebSocket, roomId: string, playerId: string) => {
	const result: { room: GameRoom, player: Player } | undefined = checkValidity(roomId, playerId);

	//If result is empty, return
	if (!result) {
		return;
	}

	const { room, player } = result;

	if (!room.drawPile.length) {
		ws.send(JSON.stringify({ type: 'ERROR', message: 'No cards left in the deck' }));
		return;
	}

	const card = room.drawPile.shift()!;
	player.hand.push(card);

	// Send the card drawn to the current player along with their updated hand
	player.socket.send(JSON.stringify({
		type: 'CARD_DRAWN',
		card: card,
		hand: player.hand
	}));

	let cardFaceDrawn: CardFace = activeCardFace(room, card);
	console.log(`[CARD_DRAWN] Player: ${playerId} drew a ${cardFaceDrawn.colour} ${cardFaceDrawn.number} card in room: ${roomId}.`);

	const opponents = Array.from(room.players.values()).filter(op => op.id !== playerId);
	opponents.forEach(opponent => {
		opponent.socket.send(JSON.stringify({
			type: 'OPPONENT_DREW_CARD',
			card: inactiveCardFace(room, card),
			opponentId: playerId // Pass the playerId of the person who drew the card
		}));
	});
};

const handleCardEffect = (card: Card) => {
	//TODO
}

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

const sendGameState = (ws: WebSocket) => {
	const gameState = {
		rooms: Array.from(rooms.values()).map(room => ({
			id: room.id,
			players: Array.from(room.players.keys()),
			deckSize: room.drawPile.length
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
		console.log(`Room ${roomId} was not found.`);
		return;
	}

	const player: Player | undefined = room.players.get(playerId);
	if (!player) {
		console.log(`Player ${playerId} was not found.`);
		return;
	}

	return {
		room: room,
		player: player
	};
}

//active means the card face that is currently in play
function activeCardFace(room: GameRoom, card: Card): CardFace {
	return room.isLightSideUp ? card.lightSide : card.darkSide;
}

//inactive means the card face that is currently not in play
function inactiveCardFace(room: GameRoom, card: Card): CardFace {
	return room.isLightSideUp ? card.darkSide : card.lightSide;
}

function areCardsEqual(cardA: Card, cardB: Card): boolean {
	return (cardA.lightSide.colour === cardB.lightSide.colour && cardA.lightSide.number === cardB.lightSide.number)
		&& (cardA.darkSide.colour === cardB.darkSide.colour && cardA.darkSide.number === cardB.darkSide.number);
}
