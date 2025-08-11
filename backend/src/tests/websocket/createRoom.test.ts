import http from 'http';
import { setupWebSocketServer } from '../../scripts/WebSocket';
import { WebSockTestClient } from '../clients/WebSocketTestClient'; // adjust path as necessary

let server: http.Server;
let port: number;

beforeAll((done) => {
    server = http.createServer();
    server.listen(() => {
        port = (server.address() as any).port;
        setupWebSocketServer(server);
        done();
    });
});

afterAll(() => {
    server.close();
});

test('WebSocket server creates room and responds with ROOM_CREATED', async () => {
    const wsClient = new WebSockTestClient(`ws://localhost:${port}`);
    await wsClient.connect();

    wsClient.send({ type: 'CREATE_ROOM' });
    const message = await wsClient.waitFor('ROOM_CREATED');

    expect(message).toHaveProperty('roomId');
    expect(message).toHaveProperty('playerId');
    expect(typeof message.roomId).toBe('string');
    expect(typeof message.playerId).toBe('string');

    console.log('Room created with ID:', message.roomId);

    wsClient.close();
});
