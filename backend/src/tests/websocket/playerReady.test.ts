import http from 'http';
import { setupWebSocket } from '../../scripts/WebSocket';
import { WebSockTestClient } from '../clients/WebSocketTestClient'; // adjust the path if needed

let server: http.Server;
let port: number;

beforeAll((done) => {
    server = http.createServer();
    setupWebSocket(server);
    server.listen(() => {
        port = (server.address() as any).port;
        done();
    });
});

afterAll(() => {
    server.close();
});

test("player status is marked as ready", async () => {
    const ws = new WebSockTestClient(`ws://localhost:${port}`);
    await ws.connect();

    ws.send({ type: 'CREATE_ROOM' });
    const createdRoomMsg = await ws.waitFor('ROOM_CREATED');

    const { roomId, playerId } = createdRoomMsg;

    ws.send({ type: 'PLAYER_READY', roomId, playerId });
    const readyMsg = await ws.waitFor('PLAYER_READY');

    expect(readyMsg.type).toBe('PLAYER_READY');
    expect(readyMsg.playerId).toBe(playerId);

    ws.close();
});
