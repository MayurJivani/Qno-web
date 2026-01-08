import http from 'http';
import { setupWebSocket } from '../../scripts/WebSocket';
import { WebSockTestClient } from '../clients/WebSocketTestClient';
import { CardUtils } from '../../utils/CardUtils';

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
        player1.waitFor('GAME_STARTED'),
        player2.waitFor('GAME_STARTED'),
    ]);

    // Get player hands
    const [yourHandP1, oppHandP1] = await Promise.all([
        player1.waitFor('YOUR_HAND'),
        player1.waitFor('OPPONENT_HAND'),
    ]);

    const [yourHandP2, oppHandP2] = await Promise.all([
        player2.waitFor('YOUR_HAND'),
        player2.waitFor('OPPONENT_HAND'),
    ]);

    const originalNoOfCards: number = yourHandP1.hand.length;

    // Draw card from draw pile
    player1.send({ type: 'DRAW_CARD', roomId: roomId, playerId: player1Id });
    const [serverAcknowledgement, player1drew, drawPileTopP1, drawPileTopP2, nextPlayerP1, nextPlayerP2] = await Promise.all([
        player1.waitFor('CARD_DRAWN'),
        player2.waitFor('OPPONENT_DREW_CARD'),
        player1.waitFor('DISCARD_PILE_TOP'),
        player2.waitFor('DISCARD_PILE_TOP'),
        player1.waitFor('TURN_CHANGED'),
        player2.waitFor('TURN_CHANGED')
    ])

    // Cleanup
    player1.close();
    player2.close();

    // Assertions
    expect(CardUtils.getInactiveFace(serverAcknowledgement.card, true)).toEqual(player1drew.card);
    expect(drawPileTopP1.card).toEqual(drawPileTopP2.card);
    expect(nextPlayerP1).toEqual(nextPlayerP2)
});
