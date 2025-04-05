import http from 'http';
import { setupWebSocket } from '../../websocket';
import { WebSockTestClient } from '../clients/WebSocketTestClient'; // Adjust the import path as needed

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

test("room is deleted when last player leaves", async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });

    const url = `ws://localhost:${port}`;
    const player1 = new WebSockTestClient(url);
    const player2 = new WebSockTestClient(url);

    await Promise.all([player1.connect(), player2.connect()]);

    // Player 1 creates the room
    player1.send({ type: 'CREATE_ROOM' });
    const createdMsg = await player1.waitFor('ROOM_CREATED');
    const roomId = createdMsg.roomId;

    // Player 2 joins the room
    player2.send({ type: 'JOIN_ROOM', roomId });
    await player2.waitFor('JOINED_ROOM');

    // Close Player 2
    player2.close();
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Close Player 1
    player1.close();
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Assert last log
    const calls = consoleSpy.mock.calls;
    const lastLog = calls[calls.length - 1][0];

    expect(lastLog).toBe(`[ROOM_DELETED] Room: ${roomId} was deleted as there were no players left`);

    consoleSpy.mockRestore();
});
