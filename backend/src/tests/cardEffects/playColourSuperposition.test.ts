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

test('Colour Superposition should draw and reveal new non-action card', async () => {
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

    await Promise.all([
        player1.waitFor('GAME_STARTED'),
        player2.waitFor('GAME_STARTED'),
    ]);

    // Get initial hands
    const [yourHandP1, discardPileTopP1] = await Promise.all([
        player1.waitFor('YOUR_HAND'),
        player1.waitFor('DISCARD_PILE_TOP')
    ]);

    // Find a Colour Superposition card in player1's hand
    const cardOnTopOfDiscardPile: CardFace = discardPileTopP1.card;
    let colourSuperpositionCard: Card | undefined;
    
    for (const card of yourHandP1.hand.cards) {
        const activeCardFace = card.lightSide; // Light side active by default
        if (activeCardFace.value === ActionCards.WildCard.Colour_Superposition) {
            // Colour Superposition is a wild card (black), so it can be played on any color
            colourSuperpositionCard = card;
            break;
        }
    }

    // If no Colour Superposition card found, skip test
    if (!colourSuperpositionCard) {
        player1.close();
        player2.close();
        return;
    }

    const previousDiscardTop = discardPileTopP1.card;

    // Play Colour Superposition card
    player1.send({ type: 'PLAY_CARD', roomId: roomId, playerId: player1Id, card: colourSuperpositionCard });
    
    // Wait for effect and new discard pile top
    const [cardEffectP1, cardEffectP2, newDiscardPileTopP1, newDiscardPileTopP2] = await Promise.all([
        player1.waitFor('CARD_EFFECT'),
        player2.waitFor('CARD_EFFECT'),
        player1.waitFor('DISCARD_PILE_TOP'),
        player2.waitFor('DISCARD_PILE_TOP')
    ]);

    // Cleanup
    player1.close();
    player2.close();

    // Assertions
    expect(cardEffectP1.effect).toEqual(ActionCards.WildCard.Colour_Superposition);
    expect(cardEffectP2.effect).toEqual(ActionCards.WildCard.Colour_Superposition);
    
    // New discard pile top should be different (a new non-action card was drawn)
    expect(newDiscardPileTopP1.card).not.toEqual(previousDiscardTop);
    expect(newDiscardPileTopP1.card).toEqual(newDiscardPileTopP2.card);
    
    // New card should be a non-action card (should not be an action card)
    const newCardValue = newDiscardPileTopP1.card.value;
    expect(newCardValue).not.toEqual(ActionCards.Light.Pauli_X);
    expect(newCardValue).not.toEqual(ActionCards.Light.Teleportation);
    expect(newCardValue).not.toEqual(ActionCards.Dark.Pauli_Y);
    expect(newCardValue).not.toEqual(ActionCards.Dark.Pauli_Z);
});


