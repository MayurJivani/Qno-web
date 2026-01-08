import http from 'http';
import { setupWebSocket } from '../../scripts/WebSocket';
import { WebSockTestClient } from '../clients/WebSocketTestClient'; // adjust the import path as needed

let server: http.Server;
let port: number;

beforeAll((done) => {
    server = http.createServer();
    server.listen(() => {
        port = (server.address() as any).port;
        setupWebSocket(server);
        done();
    });
});

afterAll(() => {
    server.close();
});

test('WebSocket server responds with CONNECTED', async () => {
    const wsClient = new WebSockTestClient(`ws://localhost:${port}`);
    await wsClient.connect();

    const message = await wsClient.waitFor('CONNECTED');

    expect(message).toMatchObject({
        type: 'CONNECTED',
        message: 'WebSocket connection setup successfully',
    });

    wsClient.close();
});
