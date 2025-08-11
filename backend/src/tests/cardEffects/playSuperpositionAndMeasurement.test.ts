import http from 'http';
import { ActionCards } from '../../enums/cards/ActionCards';
import { CardFace } from '../../enums/cards/CardFace';
import { Colours } from '../../enums/cards/Colours';
import { Card } from '../../models/Card';
import { setupWebSocketServer } from '../../scripts/WebSocket';
import { WebSockTestClient } from '../clients/WebSocketTestClient';

let server: http.Server;
let port: number;

beforeAll((done) => {
    server = http.createServer();
    setupWebSocketServer(server);
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
    const player3 = new WebSockTestClient(url);

    await Promise.all([player1.connect(), player2.connect()]);

    player1.send({ type: 'CREATE_ROOM' });
    const { roomId, playerId: player1Id } = await player1.waitFor('ROOM_CREATED');

    player2.send({ type: 'JOIN_ROOM', roomId });
    const { playerId: player2Id } = await player2.waitFor('JOINED_ROOM');

    player3.send({ type: 'JOIN_ROOM', roomId });
    const { playerId: player3Id } = await player3.waitFor('JOINED_ROOM');

    // Both ready
    player1.send({ type: 'PLAYER_READY', roomId, playerId: player1Id });
    await player1.waitFor('PLAYER_READY');
    await player2.waitFor('PLAYER_READY');
    await player3.waitFor('PLAYER_READY');

    player2.send({ type: 'PLAYER_READY', roomId, playerId: player2Id });
    await player1.waitFor('PLAYER_READY');
    await player2.waitFor('PLAYER_READY');
    await player3.waitFor('PLAYER_READY');

    player3.send({ type: 'PLAYER_READY', roomId, playerId: player3Id });
    await player1.waitFor('PLAYER_READY');
    await player2.waitFor('PLAYER_READY');
    await player3.waitFor('PLAYER_READY');
    // Start game
    player1.send({ type: 'START_GAME', roomId, playerId: player1Id });

    const [start1, start2, start3] = await Promise.all([
        player1.waitFor('GAME_STARTED'),
        player2.waitFor('GAME_STARTED'),
        player3.waitFor('GAME_STARTED'),
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


    let cardOnTopOfDiscardPile: CardFace = discardPileTopP1.card;

    let player1PlayCard: Card = new Card(10, { colour: cardOnTopOfDiscardPile.colour, value: ActionCards.Light.Pauli_X }, { colour: Colours.Dark.Orange, value: "9" });
    // Player 1 plays card
    player1.send({ type: 'PLAY_CARD', roomId: roomId, playerId: player1Id, card: player1PlayCard });
    let [newDiscardPileTopP1] = await Promise.all([
        player1.waitFor('DISCARD_PILE_TOP')
    ])
    cardOnTopOfDiscardPile = newDiscardPileTopP1.card;

    let player2PlayCard: Card = new Card(10, { colour: Colours.Light.Blue, value: "9" }, { colour: Colours.WildCard.Black, value: ActionCards.WildCard.Superposition });
    // Player 2 plays card
    player2.send({ type: 'PLAY_CARD', roomId: roomId, playerId: player2Id, card: player2PlayCard });
    let [newDiscardPileTopP2] = await Promise.all([
        player2.waitFor('DISCARD_PILE_TOP')
    ])
    cardOnTopOfDiscardPile = newDiscardPileTopP2.card;

    let player3PlayCard: Card = new Card(10, { colour: Colours.Light.Blue, value: "9" }, { colour: Colours.WildCard.Black, value: ActionCards.WildCard.Measurement });
    // Player 3 plays card
    player3.send({ type: 'PLAY_CARD', roomId: roomId, playerId: player3Id, card: player3PlayCard });
    let [newDiscardPileTopP3] = await Promise.all([
        player3.waitFor('DISCARD_PILE_TOP')
    ])
    cardOnTopOfDiscardPile = newDiscardPileTopP3.card;

    const [serverAcknowledgement,
        player3playedP1,
        player3playedP2,
        nextPlayerP1,
        nextPlayerP2,
        nextPlayerP3,
        cardEffectP1,
        cardEffectP2,
        cardEffectP3,
        newNewDiscardPileTop] = await Promise.all([
            player3.waitFor('PLAYED_CARD'),
            player1.waitFor('OPPONENT_PLAYED_CARD'),
            player2.waitFor('OPPONENT_PLAYED_CARD'),
            player1.waitFor('TURN_CHANGED'),
            player2.waitFor('TURN_CHANGED'),
            player3.waitFor('TURN_CHANGED'),
            player1.waitFor('CARD_EFFECT'),
            player2.waitFor('CARD_EFFECT'),
            player3.waitFor('CARD_EFFECT'),
            player1.waitFor('DISCARD_PILE_TOP')
        ])

    // Cleanup
    player1.close();
    player2.close();
    player3.close();

    // Assertions
    expect(serverAcknowledgement.card).toEqual(player3playedP1.card);
    expect(serverAcknowledgement.card).toEqual(player3playedP2.card);
    expect(serverAcknowledgement.playerId).toEqual(player3playedP1.opponentId);
    expect(nextPlayerP1.currentPlayer).toEqual(nextPlayerP2.currentPlayer);
    expect(nextPlayerP1.currentPlayer).toEqual(nextPlayerP3.currentPlayer);
    expect(cardEffectP1.effect).toEqual(cardEffectP2.effect);
    expect(cardEffectP1.effect).toEqual(cardEffectP3.effect);
    expect(cardEffectP1.isLightSideActive).toEqual(cardEffectP2.isLightSideActive);
});
