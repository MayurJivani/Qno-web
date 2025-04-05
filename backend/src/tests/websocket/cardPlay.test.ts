import http from 'http';
import { setupWebSocket } from '../../websocket';
import { WebSockTestClient } from '../clients/WebSocketTestClient';
import { Card } from '../../models/Card';
import { CardFace } from '../../enums/cards/CardFace';

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

test('Each player should receive correct hand and opponent hand', async () => {
    const url = `ws://localhost:${port}`;
    const player1 = new WebSockTestClient(url);
    const player2 = new WebSockTestClient(url);

    await Promise.all([player1.connect(), player2.connect()]);

    player1.send({ type: 'CREATE_ROOM' });
    const { roomId, playerId: player1Id } = await player1.waitFor('ROOM_CREATED');

    player2.send({ type: 'JOIN_ROOM', roomId });
    const { playerId: player2Id } = await player2.waitFor('JOINED_ROOM');

    // Both ready
    player1.send({ type: 'PLAYER_READY', roomId, playerId: player1Id });
    await player1.waitFor('PLAYER_READY');
    await player2.waitFor('PLAYER_READY');

    player2.send({ type: 'PLAYER_READY', roomId, playerId: player2Id });
    await player1.waitFor('PLAYER_READY');
    await player2.waitFor('PLAYER_READY');

    // Start game
    player1.send({ type: 'START_GAME', roomId, playerId: player1Id });

    const [start1, start2] = await Promise.all([
        player1.waitFor('START_GAME'),
        player2.waitFor('START_GAME'),
    ]);

    const [yourHandP1, oppHandP1] = await Promise.all([
        player1.waitFor('YOUR_HAND'),
        player1.waitFor('OPPONENT_HAND'),
    ]);

    const [yourHandP2, oppHandP2] = await Promise.all([
        player2.waitFor('YOUR_HAND'),
        player2.waitFor('OPPONENT_HAND'),
    ]);

    player1.send({ type: 'PLAY_CARD', roomId: roomId, playerId: player1Id, card: yourHandP1.hand[0] });
    const [serverAcknowledgement, player1played] = await Promise.all([
        player1.waitFor('PLAYED_CARD'),
        player2.waitFor('OPPONENT_PLAYED_CARD')
    ])

    // Cleanup
    player1.close();
    player2.close();

    // Assertions
    expect(serverAcknowledgement.cardFacePlayed).toEqual(player1played.cardFacePlayed);
    expect(serverAcknowledgement.playerId).toEqual(player1played.opponentId);

});
