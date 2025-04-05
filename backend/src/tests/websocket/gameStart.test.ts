import http from 'http';
import { setupWebSocket } from '../../websocket';
import { WebSockTestClient } from '../clients/WebSocketTestClient'; // adjust the path accordingly

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

test('WebSocket server should check if all players are ready before starting game and then broadcast game start to each player', async () => {
    const url = `ws://localhost:${port}`;
    const player1 = new WebSockTestClient(url);
    const player2 = new WebSockTestClient(url);

    await Promise.all([player1.connect(), player2.connect()]);

    player1.send({ type: 'CREATE_ROOM' });
    const { roomId, playerId: player1Id } = await player1.waitFor('ROOM_CREATED');

    player2.send({ type: 'JOIN_ROOM', roomId });
    const { playerId: player2Id } = await player2.waitFor('JOINED_ROOM');

    player1.send({ type: 'PLAYER_READY', roomId, playerId: player1Id });
    await Promise.all([
        player1.waitFor('PLAYER_READY'),
        player2.waitFor('PLAYER_READY'),
    ]);

    player2.send({ type: 'PLAYER_READY', roomId, playerId: player2Id });
    await Promise.all([
        player1.waitFor('PLAYER_READY'),
        player2.waitFor('PLAYER_READY'),
    ]);

    player1.send({ type: 'START_GAME', roomId, playerId: player1Id });

    const [gameStartedMsgP1, gameStartedMsgP2] = await Promise.all([
        player1.waitFor('START_GAME'),
        player2.waitFor('START_GAME'),
    ]);

    expect(gameStartedMsgP1.type).toBe('START_GAME');
    expect(gameStartedMsgP1.roomId).toBe(roomId);
    expect(gameStartedMsgP1.drawPile).toHaveLength(108);

    expect(gameStartedMsgP2.type).toBe('START_GAME');
    expect(gameStartedMsgP2.roomId).toBe(roomId);
    expect(gameStartedMsgP2.drawPile).toHaveLength(108);

    expect(gameStartedMsgP1.drawPile).toEqual(gameStartedMsgP2.drawPile);

    player1.close();
    player2.close();
});
