import WebSocket, { WebSocketServer } from 'ws';
import http from 'http';  // Import the http module
import { generateDrawPile } from './drawPile';
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
		console.log('A user has connected.');
		const roomId = uuidv4();
		const playerId = uuidv4();
		playerMap.set(ws, { roomId, playerId });

		ws.on('message', (message: string) => handleMessage(ws, JSON.parse(message)));
		ws.on('close', () => handlePlayerDisconnect(ws));
		ws.on('error', (err) => console.error('WebSocket error:', err));
	});
}

const handleMessage = (ws: WebSocket, message: any) => {
	const actions: { [key: string]: Function } = {
		'CREATE_ROOM': () => createRoom(ws, message.roomId, message.playerId),
		'LEFT_ROOM': () => handlePlayerDisconnect(ws, message.roomId, message.playerId),
		'JOIN_ROOM': () => joinRoom(ws, message.roomId, message.playerId),
		'READY': () => handlePlayerReady(ws, message.roomId, message.playerId),
		'START': () => handleGameStart(ws, message.roomId, message.playerId),
		'PLAY_CARD': () => handleCardPlay(ws, message.roomId, message.playerId, message.card),
		'DRAW_CARD': () => handleDrawCard(ws, message.roomId, message.playerId),
		'GET_GAME_STATE': () => sendGameState(ws)
	};

	const action = actions[message.type];
	if (action) action();
	else console.log('Unknown message type:', message.type);
};


const createRoom = (ws: WebSocket, roomId: string, playerId: string) => {

	const player: Player = new Player(playerId, ws);

	const room: GameRoom = new GameRoom(roomId, player);
	rooms.set(roomId, room);
	playerMap.set(ws, { roomId: roomId, playerId: playerId });

	ws.send(JSON.stringify({ type: 'ROOM_CREATED', roomId, playerId }));
	console.log(`Room created: ${roomId}`);
};

const handlePlayerDisconnect = (ws: WebSocket, roomId?: string, playerId?: string) => {
	// Initialize playerID and roomID
	let roomID = roomId ?? null;
	let playerID = playerId ?? null;

	// Determine the player and room if not provided
	if (!roomID || !playerID) {
		const result = playerMap.get(ws);
		if (!result) {
			console.log("Player not found in playerMap.");
			return;
		}
		roomID = result.roomId;
		playerID = result.playerId;
	}

	// Send appropriate WebSocket message
	ws.send(JSON.stringify({
		type: playerId && roomId ? 'LEFT_ROOM' : 'DISCONNECTED',
		roomId: roomID
	}));

	// Retrieve the room
	const room = rooms.get(roomID);
	if (!room) {
		console.log(`Room ${roomID} was not found. WebSocket could not be closed.`);
		return;
	}

	// Remove player from the room and clean up mappings
	room.removePlayer(playerID, rooms);
	playerMap.delete(ws);
	ws.close();

	// If the room is empty, delete it; otherwise, notify remaining players
	if (room.players.size === 0) {
		rooms.delete(roomID);
		console.log(`Room ${roomID} deleted as no players are left.`);
	} else {
		room.broadcast({ type: 'PLAYER_LEFT', playerID });
	}
};

const joinRoom = (ws: WebSocket, roomId: string, playerId: string) => {

	const room: GameRoom = rooms.get(roomId)!;

	if (room && room.players.size < 4 && (room.status == GameRoomStatus.NOT_STARTED)) {
		const newPlayer: Player = new Player(playerId, ws);
		room.players.set(playerId, newPlayer);
		playerMap.set(ws, { roomId, playerId });

		ws.send(JSON.stringify({ type: 'JOINED_ROOM', roomId, playerId }));
		console.log(`Player joined room: ${roomId}`);
	} else {
		ws.send(JSON.stringify({ type: 'ERROR', message: 'Room is full or does not exist or cannot be joined currently' }));
	}
};

const handlePlayerReady = (ws: WebSocket, roomId: string, playerId: string) => {

	const result: { room: GameRoom, player: Player } | undefined = checkValidity(roomId, playerId);

	//If result is empty, return
	if (!result) {
		return;
	}

	result.player.status = PlayerStatus.READY;
	console.log(`Player ${playerId} is ready in room ${roomId}.`);
};

const handleGameStart = (ws: WebSocket, roomId: string, playerId: string) => {

	const result: { room: GameRoom, player: Player } | undefined = checkValidity(roomId, playerId);

	//If result is empty, return
	if (!result) {
		return;
	}

	let room = result.room;

	//Check if the person starting the game is the host of the gameRoom
	if (playerId === room.host.id && room.allPlayersReady()) {
		console.log(`Starting game in room ${roomId}.`);
		room.broadcast({ type: 'START_GAME', deck: room.drawPile });
		dealCards(room);
	}
}

const dealCards = (room: GameRoom) => {

	const opponentPlayersHands: Map<Player, CardFace[]> = new Map();

	for (let i = 0; i < 7; i++) {
		room.players.forEach(p => {
			if (room.drawPile.length > 0) {
				const card = room.drawPile.shift();
				if (card) p.hand.push(card);
			}
		});
	}

	room.players.forEach(p => {
		//Opponents are players who have different id's than the current player
		const opponents = Array.from(room.players.values()).filter(op => op.id !== p.id);

		opponents.forEach(op => {
			let hand: Card[] = op.hand;
			let visibleCardFaces: CardFace[] = [];
			hand.forEach(card => {
				let cardFace: CardFace = inactiveCardFace(room, card);
				visibleCardFaces.push(cardFace);
			})
			opponentPlayersHands.set(op, visibleCardFaces);
		})

		p.socket.send(JSON.stringify({
			type: 'YOUR_HAND',
			hand: p.hand,
			opponentHands: opponentPlayersHands // Send the array of opponent hands
		}));
	})
};

const handleCardPlay = (ws: WebSocket, roomId: string, playerId: string, card: Card) => {
	const result: { room: GameRoom, player: Player } | undefined = checkValidity(roomId, playerId);

	//If result is empty, return
	if (!result) {
		return;
	}

	const { room, player } = result;

	player.hand = player.hand.filter(c => c !== card);

	handleCardEffect(card);

	let cardFacePlayed: CardFace = activeCardFace(room, card);

	room.players.forEach(p => {
		if (p.id !== playerId) {

			p.socket.send(JSON.stringify({
				type: 'OPPONENT_PLAYED_CARD',
				cardFacePlayed,
				opponentId: playerId
			}));
		}
	});

	console.log(`Player ${playerId} played a ${cardFacePlayed.colour} ${cardFacePlayed.number} card in room ${roomId}.`);
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
	console.log(`Player ${playerId} drew a ${cardFaceDrawn.colour} ${cardFaceDrawn.number} card in room ${roomId}.`);

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

