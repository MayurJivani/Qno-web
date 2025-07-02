import http from 'http';
import { ActionCards } from '../../enums/cards/ActionCards';
import { Colours } from '../../enums/cards/Colours';
import { Card } from '../../models/Card';
import { setupWebSocket } from '../../scripts/WebSocket';
import { WebSockTestClient } from '../clients/WebSocketTestClient';
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
        player1.waitFor('GAME_STARTED'),
        player2.waitFor('GAME_STARTED'),
    ]);

    // Get each players hands
    const [yourHandP1, oppHandP1, discardPileTopP1] = await Promise.all([
        player1.waitFor('YOUR_HAND'),
        player1.waitFor('OPPONENT_HAND'),
        player1.waitFor('DISCARD_PILE_TOP')
    ]);

    const [yourHandP2, oppHandP2, discardPileTopP2] = await Promise.all([
        player2.waitFor('YOUR_HAND'),
        player2.waitFor('OPPONENT_HAND'),
        player2.waitFor('DISCARD_PILE_TOP')
    ]);


    const cardOnTopOfDiscardPile: CardFace = discardPileTopP1.card;
    let playCard: Card = new Card({ colour: cardOnTopOfDiscardPile.colour, value: ActionCards.Light.Pauli_X }, { colour: Colours.Dark.Orange, value: "9" });

    // Play card
    player1.send({ type: 'PLAY_CARD', roomId: roomId, playerId: player1Id, card: playCard });
    const [serverAcknowledgement, player1played, nextPlayerP1, nextPlayerP2, cardEffectP1, cardEffectP2] = await Promise.all([
        player1.waitFor('PLAYED_CARD'),
        player2.waitFor('OPPONENT_PLAYED_CARD'),
        player1.waitFor('TURN_CHANGED'),
        player2.waitFor('TURN_CHANGED'),
        player1.waitFor('CARD_EFFECT'),
        player2.waitFor('CARD_EFFECT')
    ])

    // Cleanup
    player1.close();
    player2.close();

    // Assertions
    expect(serverAcknowledgement.card).toEqual(player1played.card);
    expect(serverAcknowledgement.playerId).toEqual(player1played.opponentId);
    expect(nextPlayerP1.currentPlayer).toEqual(nextPlayerP2.currentPlayer);
    expect(cardEffectP1.effect).toEqual(cardEffectP2.effect);
    expect(cardEffectP1.isLightSideActive).toEqual(cardEffectP2.isLightSideActive);
});
