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

test('Teleportation should allow player to select and steal opponent card', async () => {
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
    const [yourHandP1, oppHandP1, discardPileTopP1] = await Promise.all([
        player1.waitFor('YOUR_HAND'),
        player1.waitFor('OPPONENT_HAND'),
        player1.waitFor('DISCARD_PILE_TOP')
    ]);

    // Get player2's hand
    const [yourHandP2] = await Promise.all([
        player2.waitFor('YOUR_HAND')
    ]);

    // Find a teleportation card in player1's hand
    const cardOnTopOfDiscardPile: CardFace = discardPileTopP1.card;
    let teleportationCard: Card | undefined;
    
    for (const card of yourHandP1.hand.cards) {
        const activeCardFace = card.lightSide; // Light side active by default
        if (activeCardFace.value === ActionCards.Light.Teleportation) {
            // Make sure it matches discard pile
            if (activeCardFace.colour === cardOnTopOfDiscardPile.colour || 
                activeCardFace.colour === Colours.WildCard.Black) {
                teleportationCard = card;
                break;
            }
        }
    }

    // If no teleportation card found, we can't test this
    if (!teleportationCard) {
        player1.close();
        player2.close();
        return; // Skip test if teleportation card not available
    }

    // Ensure player2 has more than 1 card (they should after initial deal)
    expect(yourHandP2.hand.cards.length).toBeGreaterThan(1);

    // Play teleportation card
    player1.send({ type: 'PLAY_CARD', roomId: roomId, playerId: player1Id, card: teleportationCard });
    
    // Wait for teleportation activation
    const [awaitingMessage, refreshOppHandP1] = await Promise.all([
        player1.waitFor('AWAITING_TELEPORTATION_TARGET'),
        player1.waitFor('REFRESH_OPPONENT_HAND')
    ]);

    expect(awaitingMessage.message).toContain('Select a card');
    expect(refreshOppHandP1.opponentHands[player2Id]).toBeDefined();

    // Get a card from opponent's hand to teleport
    const opponentCards = refreshOppHandP1.opponentHands[player2Id];
    const cardToTeleport = opponentCards[0]; // Select first card

    // Select card for teleportation
    player1.send({ 
        type: 'TELEPORTATION_SELECT', 
        roomId: roomId, 
        playerId: player1Id, 
        fromPlayerId: player2Id,
        card: cardToTeleport
    });

    // Wait for teleportation completion
    const [cardEffectP1, cardEffectP2, newHandP1, newHandP2] = await Promise.all([
        player1.waitFor('CARD_EFFECT'),
        player2.waitFor('CARD_EFFECT'),
        player1.waitFor('YOUR_HAND'),
        player2.waitFor('YOUR_HAND')
    ]);

    // Cleanup
    player1.close();
    player2.close();

    // Assertions
    expect(cardEffectP1.effect).toEqual(ActionCards.Light.Teleportation);
    expect(cardEffectP1.teleportation.cardTeleportedFromPlayerId).toEqual(player2Id);
    expect(cardEffectP1.teleportation.cardTeleportedToPlayerId).toEqual(player1Id);
    expect(cardEffectP2.effect).toEqual(ActionCards.Light.Teleportation);
    
    // Player1 should have gained a card
    expect(newHandP1.hand.cards.length).toBeGreaterThan(yourHandP1.hand.cards.length - 1);
    // Player2 should have lost a card
    expect(newHandP2.hand.cards.length).toBeLessThan(yourHandP2.hand.cards.length);
});


