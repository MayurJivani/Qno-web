import WebSocket, { WebSocketServer } from 'ws';
import http from 'http';  
import { generateDeck, Card } from './deck';
import { v4 as uuidv4 } from 'uuid';

interface Player {
    id: string;
    socket: WebSocket;
    ready: boolean;
    hand: { id: string; frontFace: Card; backFace: Card }[];
}

interface GameRoom {
    id: string;
    players: Map<string, Player>; // Keyed by player ID for O(1) lookups
    deck: { id: string; frontFace: Card; backFace: Card }[];
}

const rooms: Map<string, GameRoom> = new Map();
const playerMap = new Map<WebSocket, { roomId: string, playerId: string }>();

export function setupWebSocket(server: http.Server) {
    const wss = new WebSocketServer({ server });

    wss.on('connection', (ws: WebSocket) => {
        console.log('A user has connected.');
        const playerId = uuidv4();
        playerMap.set(ws, { roomId: '', playerId });

        ws.on('message', (message: string) => handleMessage(ws, JSON.parse(message)));
        ws.on('close', () => handlePlayerDisconnect(ws));
        ws.on('error', (err) => console.error('WebSocket error:', err));
    });
}

const handlePlayerDisconnect = (ws: WebSocket) => {
    const { roomId, playerId } = playerMap.get(ws)!;
    const room = rooms.get(roomId);

    if (room) {
        room.players.delete(playerId);
        notifyRoomPlayers(room, 'PLAYER_LEFT', playerId);
        
        // Cleanup room if no players left
        if (room.players.size === 0) {
            rooms.delete(roomId);
            console.log(`Room ${roomId} deleted as no players are left.`);
        }
    }

    playerMap.delete(ws); // Clean up player data
    ws.send(JSON.stringify({ type: 'LEFT_ROOM', roomId }));
};

const notifyRoomPlayers = (room: GameRoom, type: string, playerId: string) => {
    room.players.forEach(player => {
        player.socket.send(JSON.stringify({ type, playerId }));
    });
};

const handleMessage = (ws: WebSocket, message: any) => {
    const actions: { [key: string]: Function } = {
        'CREATE_ROOM': () => createRoom(ws),
        'LEFT_ROOM': () => handlePlayerDisconnect(ws),
        'JOIN_ROOM': () => joinRoom(ws, message.roomId),
        'READY': () => handlePlayerReady(ws, message.roomId, message.playerId),
        'PLAY_CARD': () => handleCardPlay(ws, message.roomId, message.playerId, message.card),
        'DRAW_CARD': () => handleDrawCard(ws, message.roomId, message.playerId),
        'GET_GAME_STATE': () => sendGameState(ws)
    };

    const action = actions[message.type];
    if (action) action();
    else console.log('Unknown message type:', message.type);
};

const sendGameState = (ws: WebSocket) => {
    const gameState = {
        rooms: Array.from(rooms.values()).map(room => ({
            id: room.id,
            players: Array.from(room.players.keys()),
            deckSize: room.deck.length
        })),
        playerMap: Array.from(playerMap.entries()).map(([ws, data]) => ({
            roomId: data.roomId,
            playerId: data.playerId
        }))
    };

    ws.send(JSON.stringify({ type: 'GAME_STATE', data: gameState }));
};

const createRoom = (ws: WebSocket) => {
    const roomId = uuidv4();
    const { playerId } = playerMap.get(ws)!;
    const { newDeck } = generateDeck();
    const deck = Object.entries(newDeck).map(([key, value]) => ({
        id: key, frontFace: value.frontFace, backFace: value.backFace
    }));

    const room: GameRoom = { id: roomId, players: new Map([[playerId, { id: playerId, socket: ws, ready: false, hand: [] }]]), deck };
    rooms.set(roomId, room);
    playerMap.set(ws, { roomId, playerId });
    ws.send(JSON.stringify({ type: 'ROOM_CREATED', roomId, playerId }));
    console.log(`Room created: ${roomId}`);
};

const joinRoom = (ws: WebSocket, roomId: string) => {
    const room = rooms.get(roomId);
    if (room && room.players.size < 4) {
        const { playerId } = playerMap.get(ws)!;
        room.players.set(playerId, { id: playerId, socket: ws, ready: false, hand: [] });
        playerMap.set(ws, { roomId, playerId });
        ws.send(JSON.stringify({ type: 'JOINED_ROOM', roomId, playerId }));
        console.log(`Player joined room: ${roomId}`);
    } else {
        ws.send(JSON.stringify({ type: 'ERROR', message: 'Room is full or does not exist' }));
    }
};

const handlePlayerReady = (ws: WebSocket, roomId: string, playerId: string) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const player = room.players.get(playerId);
    if (!player) return;

    player.ready = true;
    console.log(`Player ${playerId} is ready in room ${roomId}.`);

    if (room.players.size === 4 && Array.from(room.players.values()).every(p => p.ready)) {
        console.log(`Both players in room ${roomId} are ready. Starting game.`);
        room.players.forEach(p => p.socket.send(JSON.stringify({ type: 'START_GAME', deck: room.deck })));

        dealCards(room);
    }
};

const dealCards = (room: GameRoom) => {
    for (let i = 0; i < 7; i++) {
        room.players.forEach(p => {
            if (room.deck.length > 0) {
                const card = room.deck.shift();
                if (card) p.hand.push(card);
            }
        });
    }

    room.players.forEach(p => {
        const opponents = Array.from(room.players.values()).filter(op => op !== p);
        const opponentHands = opponents.map(op => ({
            playerId: op.id, // You can also include playerId to identify each opponent
            hand: op.hand.map(card => ({ backFace: card.backFace }))
        }));
    
        p.socket.send(JSON.stringify({
            type: 'YOUR_HAND',
            hand: p.hand,
            opponentHands: opponentHands // Send the array of opponent hands
        }));
    });
    
};

const handleCardPlay = (ws: WebSocket, roomId: string, playerId: string, card: any) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const player = room.players.get(playerId);
    if (!player) return;

    player.hand = player.hand.filter(c => c !== card);

    room.players.forEach(p => {
        if (p.id !== playerId) {
            
            p.socket.send(JSON.stringify({
                type: 'OPPONENT_PLAYED_CARD',
                card,
                opponentId: playerId  
            }));
        }
    });

    console.log(`Player ${playerId} played a card in room ${roomId}.`);
};


const handleDrawCard = (ws: WebSocket, roomId: string, playerId: string) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const player = room.players.get(playerId);
    if (!player) return;

    if (room.deck.length > 0) {
        const card = room.deck.shift();
        if (card) {
            player.hand.push(card);
            console.log(`Player ${playerId} drew a card in room ${roomId}.`);

            // Send the card drawn to the current player along with their updated hand
            player.socket.send(JSON.stringify({ type: 'CARD_DRAWN', card, hand: player.hand }));

            const opponents = Array.from(room.players.values()).filter(p => p.id !== playerId);
            opponents.forEach(opponent => {
                
                opponent.socket.send(JSON.stringify({
                    type: 'OPPONENT_DREW_CARD',
                    card: { backFace: card.backFace },
                    opponentId: playerId  // Pass the playerId of the person who drew the card
                }));
            });
        }
    } else {
        ws.send(JSON.stringify({ type: 'ERROR', message: 'No cards left in the deck' }));
    }
};

