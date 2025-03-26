import WebSocket, { WebSocketServer } from 'ws';
import http from 'http';  // Import the http module
import { generateDeck,Card  } from './deck';

interface Player {
    id: string;
    socket: WebSocket;
    ready: boolean;
    hand: { id: string; frontFace: Card; backFace: Card }[];
}

interface GameRoom {
    id: string;
    players: Player[];
    deck: { id: string; frontFace: Card; backFace: Card }[];
}

interface Deck {
    [key: string]: {
        frontFace: Card;
        backFace: Card;
    };
}

const rooms: Map<string, GameRoom> = new Map();

export function setupWebSocket(server: http.Server) {  // Use http.Server here
    const wss = new WebSocketServer({ server });

    wss.on('connection', (ws: WebSocket) => {
        console.log('A player has connected.');

        ws.on('message', (message: string) => {
            const parsedMessage = JSON.parse(message);
            handleMessage(ws, parsedMessage);
        });

        ws.on('close', () => {
            console.log('Player disconnected.');
            for (const [roomId, room] of rooms) {
                const index = room.players.findIndex(p => p.socket === ws);
                if (index !== -1) {
                    room.players.splice(index, 1);
                    if (room.players.length === 0) {
                        rooms.delete(roomId);
                        console.log(`Room ${roomId} deleted as no players are left.`);
                    } else {
                        room.players.forEach(p => p.socket.send(JSON.stringify({ type: 'PLAYER_LEFT', roomId })));
                    }
                    break;
                }
            }
        });
    });
}

const handleMessage = (ws: WebSocket, message: any) => {
    switch (message.type) {
        case 'CREATE_ROOM':
            createRoom(ws);
            break;
        case 'JOIN_ROOM':
            joinRoom(ws, message.roomId);
            break;
        case 'READY':
            handlePlayerReady(ws, message.roomId, message.playerId);
            break;
        case 'PLAY_CARD':
            handleCardPlay(ws, message.roomId, message.playerId, message.card);
            break;
        case 'DRAW_CARD':
            handleDrawCard(ws, message.roomId, message.playerId);
            break;
        default:
            console.log('Unknown message type:', message.type);
    }
};

const createRoom = (ws: WebSocket) => {
    const roomId = generateUniqueId();
    const playerId = generateUniqueId();
    const { newDeck } = generateDeck();
    const deck = Object.entries(newDeck).map(([key, value]) => ({
        id: key, 
        frontFace: value.frontFace,
        backFace: value.backFace
    }));
    

    const room: GameRoom = { 
        id: roomId, 
        players: [{ id: playerId, socket: ws, ready: false, hand: [] }], 
        deck 
    };

    rooms.set(roomId, room);

    ws.send(JSON.stringify({ type: 'ROOM_CREATED', roomId, playerId }));
    console.log(`Room created: ${roomId}`);
};

const joinRoom = (ws: WebSocket, roomId: string) => {
    const room = rooms.get(roomId);
    if (room && room.players.length < 2) {
        const playerId = generateUniqueId();
        room.players.push({ id: playerId, socket: ws, ready: false,  hand: [] });
        ws.send(JSON.stringify({ type: 'JOINED_ROOM', roomId, playerId }));
        console.log(`Player joined room: ${roomId}`);
    } else {
        ws.send(JSON.stringify({ type: 'ERROR', message: 'Room is full or does not exist' }));
    }
};

const handlePlayerReady = (ws: WebSocket, roomId: string, playerId: string) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const player = room.players.find(p => p.id === playerId);
    if (!player) return;

    player.ready = true;
    console.log(`Player ${playerId} is ready in room ${roomId}.`);

    if (room.players.length === 2 && room.players.every(p => p.ready)) {
        console.log(`Both players in room ${roomId} are ready. Starting game.`);
        room.players.forEach(p => p.socket.send(JSON.stringify({ type: 'START_GAME', deck:room.deck })));

        if (room.deck.length < 14) {
            console.log(`Not enough cards to start the game in room ${roomId}.`);
            return;
        }

        // Deal cards alternately (7 cards each)
        for (let i = 0; i < 7; i++) {
            room.players.forEach(p => {
                if (room.deck.length > 0) {
                    const card = room.deck.shift(); // Take one card from the top of the deck
                    if (card) p.hand.push(card);
                }
            });
        }

        room.players.forEach(p => {
            const opponent = room.players.find(op => op !== p);

            p.socket.send(JSON.stringify({
                type: 'YOUR_HAND',
                hand: p.hand,
                opponentHand: opponent 
                    ? opponent.hand.map(card => ({
                        backFace: card.backFace 
                    })) 
                    : []
            }));
        });
    }
};

const handleCardPlay = (ws: WebSocket, roomId: string, playerId: string, card: any) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const player = room.players.find(p => p.id === playerId);
    if (!player) return;

    // Remove card from player's hand
    player.hand = player.hand.filter(c => c !== card);

    // Broadcast to the opponent
    room.players.forEach(p => {
        if (p.id !== playerId) { // Send only to the opponent
            p.socket.send(JSON.stringify({
                type: 'OPPONENT_PLAYED_CARD',
                card: card
            }));
        }
    });

    console.log(`Player ${playerId} played a card in room ${roomId}.`);
};

const handleDrawCard = (ws: WebSocket, roomId: string, playerId: string) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const player = room.players.find(p => p.id === playerId);
    if (!player) return;

    if (room.deck.length > 0) {
        const card = room.deck.shift(); // Take one card from the deck
        if (card) {
            player.hand.push(card);
            console.log(`Player ${playerId} drew a card in room ${roomId}.`);

            // Send updated hand to the player
            player.socket.send(JSON.stringify({
                type: 'CARD_DRAWN',
                card: card,  // Full card details
                hand: player.hand
            }));

            // Find the opponent
            const opponent = room.players.find(p => p.id !== playerId);
            if (opponent) {
                opponent.socket.send(JSON.stringify({
                    type: 'OPPONENT_DREW_CARD',
                    card: { backFace: card.backFace }  // Send only the back face
                }));
            }
        }
    } else {
        ws.send(JSON.stringify({ type: 'ERROR', message: 'No cards left in the deck' }));
    }
};


const generateUniqueId = (): string => {
    return Math.random().toString(36).substr(2, 9);
};

