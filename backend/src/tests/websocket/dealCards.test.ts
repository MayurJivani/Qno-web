import http from 'http';
import { setupWebSocket } from '../../scripts/WebSocket';
import { WebSockTestClient } from '../clients/WebSocketTestClient';
import { Card } from '../../models/Card';
import { CardFace } from '../../enums/cards/CardFace';
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

    const [yourHandP1, oppHandP1, drawPileTopP1, discardPileTopP1] = await Promise.all([
        player1.waitFor('YOUR_HAND'),
        player1.waitFor('OPPONENT_HAND'),
        player1.waitFor('DRAW_PILE_TOP'),
        player1.waitFor('DISCARD_PILE_TOP')
    ]);

    const [yourHandP2, oppHandP2, drawPileTopP2, discardPileTopP2] = await Promise.all([
        player2.waitFor('YOUR_HAND'),
        player2.waitFor('OPPONENT_HAND'),
        player2.waitFor('DRAW_PILE_TOP'),
        player2.waitFor('DISCARD_PILE_TOP')
    ]);

    // Cleanup
    player1.close();
    player2.close();

    // Assertions
    expect(yourHandP1.hand).not.toEqual(yourHandP2.hand);

    const P1FacesVisible: CardFace[] = [];
    yourHandP2.hand.forEach((card: Card) => {
        const inactiveCardFace = CardUtils.getInactiveFace(card, true);
        P1FacesVisible.push(inactiveCardFace);
    })

    const P2FacesVisible: CardFace[] = [];
    yourHandP1.hand.forEach((card: Card) => {
        const inactiveCardFace = CardUtils.getInactiveFace(card, true);
        P2FacesVisible.push(inactiveCardFace);
    })

    expect(Object.values(oppHandP1.opponentHands)[0]).toEqual(P1FacesVisible);
    expect(Object.values(oppHandP2.opponentHands)[0]).toEqual(P2FacesVisible);
    expect(drawPileTopP1).toEqual(drawPileTopP2);
    expect(discardPileTopP1).toEqual(discardPileTopP2);
});
