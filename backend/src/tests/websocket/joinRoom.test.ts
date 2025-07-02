import http from 'http';
import { setupWebSocket } from '../../scripts/WebSocket';
import { WebSockTestClient } from '../clients/WebSocketTestClient'; // Adjust import path as needed

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

test("WebSocket server should allow player to join a room and respond with JOINED_ROOM", async () => {
    const url = `ws://localhost:${port}`;
    const player1 = new WebSockTestClient(url);
    const player2 = new WebSockTestClient(url);

    await Promise.all([player1.connect(), player2.connect()]);

    player1.send({ type: 'CREATE_ROOM' });
    const createdRoomMsg = await player1.waitFor('ROOM_CREATED');
    expect(createdRoomMsg.type).toBe('ROOM_CREATED');
    const roomId = createdRoomMsg.roomId;

    player2.send({ type: 'JOIN_ROOM', roomId });
    const joinedRoomMsg = await player2.waitFor('JOINED_ROOM');
    const joinedRoomMsgBroadcast = await player1.waitFor('NEW_PLAYER_JOINED')

    expect(joinedRoomMsg.type).toBe('JOINED_ROOM');
    expect(joinedRoomMsg.roomId).toBe(roomId);
    expect(joinedRoomMsgBroadcast.type).toBe('NEW_PLAYER_JOINED');
    expect(joinedRoomMsgBroadcast.roomId).toBe(roomId);
    expect(joinedRoomMsgBroadcast.playerId).toBe(joinedRoomMsg.playerId);

    player1.close();
    player2.close();
});
