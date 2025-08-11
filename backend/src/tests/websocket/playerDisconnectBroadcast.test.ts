import http from 'http';
import { setupWebSocketServer } from '../../scripts/WebSocket';
import { WebSockTestClient } from '../clients/WebSocketTestClient'; // Adjust path as necessary

let server: http.Server;
let port: number;

beforeAll((done) => {
    server = http.createServer();
    setupWebSocketServer(server);
    server.listen(() => {
        port = (server.address() as any).port;
        done();
    });
});

afterAll(() => {
    server.close();
});

test("player disconnects and is removed from room", async () => {
    const url = `ws://localhost:${port}`;
    const player1 = new WebSockTestClient(url);
    const player2 = new WebSockTestClient(url);

    await Promise.all([player1.connect(), player2.connect()]);

    // Player 1 creates a room
    player1.send({ type: 'CREATE_ROOM' });
    const createdMsg = await player1.waitFor('ROOM_CREATED');
    const roomId = createdMsg.roomId;

    // Player 2 joins the room
    player2.send({ type: 'JOIN_ROOM', roomId });
    const joinMsg = await player2.waitFor('JOINED_ROOM');
    const player2Id = joinMsg.playerId;

    // Player 2 leaves room
    player2.send({ type: 'LEFT_ROOM', roomId, playerId: player2Id });

    const playerLeftMsg = await player1.waitFor('PLAYER_LEFT');
    expect(playerLeftMsg.type).toBe('PLAYER_LEFT');
    expect(playerLeftMsg.playerId).toBe(player2Id);

    player1.close();
    player2.close();
});
