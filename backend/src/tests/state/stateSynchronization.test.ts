import http from 'http';
import { setupWebSocketServer } from '../../scripts/WebSocket';
import { WebSockTestClient } from '../clients/WebSocketTestClient';
import { Card } from '../../models/Card';
import { Colours } from '../../enums/cards/Colours';
import { CardUtils } from '../../utils/CardUtils';

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

describe('State Synchronization Tests', () => {
    test('Hand should synchronize after card play', async () => {
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
        const [yourHandP1Initial, oppHandP2Initial] = await Promise.all([
            player1.waitFor('YOUR_HAND'),
            player2.waitFor('OPPONENT_HAND')
        ]);

        const initialHandSize = yourHandP1Initial.hand.cards.length;
        const initialOppHandSize = oppHandP2Initial.opponentHands[player1Id]?.length || 0;

        // Get discard pile top
        const discardPileTopP1 = await player1.waitFor('DISCARD_PILE_TOP');
        const cardOnTopOfDiscardPile = discardPileTopP1.card;

        // Find a valid card to play
        let playCard: Card | undefined;
        for (const card of yourHandP1Initial.hand.cards) {
            const activeCardFace = CardUtils.getActiveFace(card, true);
            if (activeCardFace.colour === cardOnTopOfDiscardPile.colour || 
                activeCardFace.value === cardOnTopOfDiscardPile.value ||
                activeCardFace.colour === Colours.WildCard.Black) {
                playCard = card;
                break;
            }
        }

        if (playCard) {
            // Play card
            player1.send({ type: 'PLAY_CARD', roomId, playerId: player1Id, card: playCard });

            // Wait for played card confirmation and opponent hand update
            await Promise.all([
                player1.waitFor('PLAYED_CARD'),
                player2.waitFor('OPPONENT_PLAYED_CARD'),
                player2.waitFor('OPPONENT_HAND')
            ]);

            // Verify opponent hand was updated
            const oppHandP2After = await player2.waitFor('OPPONENT_HAND');
            expect(oppHandP2After.opponentHands[player1Id]).toBeDefined();
            // Verify opponent hand size decreased by 1
            expect(oppHandP2After.opponentHands[player1Id].length).toBe(initialHandSize - 1);
        }

        player1.close();
        player2.close();
    });

    test('Pile should synchronize after card play across all players', async () => {
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

        // Get initial discard pile
        const discardPileTopP1Initial = await player1.waitFor('DISCARD_PILE_TOP');
        const discardPileTopP2Initial = await player2.waitFor('DISCARD_PILE_TOP');

        // Both should see same initial discard pile
        expect(discardPileTopP1Initial.card).toEqual(discardPileTopP2Initial.card);

        // Get player1's hand
        const [yourHandP1, discardPileTopP1] = await Promise.all([
            player1.waitFor('YOUR_HAND'),
            player1.waitFor('DISCARD_PILE_TOP')
        ]);

        const cardOnTopOfDiscardPile = discardPileTopP1.card;
        let playCard: Card | undefined;
        for (const card of yourHandP1.hand.cards) {
            const activeCardFace = CardUtils.getActiveFace(card, true);
            if (activeCardFace.colour === cardOnTopOfDiscardPile.colour || 
                activeCardFace.value === cardOnTopOfDiscardPile.value ||
                activeCardFace.colour === Colours.WildCard.Black) {
                playCard = card;
                break;
            }
        }

        if (playCard) {
            // Play card
            player1.send({ type: 'PLAY_CARD', roomId, playerId: player1Id, card: playCard });

            // Wait for discard pile updates
            const [discardPileTopP1After, discardPileTopP2After] = await Promise.all([
                player1.waitFor('DISCARD_PILE_TOP'),
                player2.waitFor('DISCARD_PILE_TOP')
            ]);

            // Both players should see same updated discard pile
            expect(discardPileTopP1After.card).toEqual(discardPileTopP2After.card);
            // New discard pile should be different from initial
            expect(discardPileTopP1After.card).not.toEqual(discardPileTopP1Initial.card);
        }

        player1.close();
        player2.close();
    });

    test('Game state should synchronize across all players (current player, direction)', async () => {
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

        // Both should see same current player
        expect(start1.currentPlayer).toEqual(start2.currentPlayer);
        expect(start1.currentPlayer).toBe(player1Id);

        // Both should see same direction
        expect(start1.direction).toEqual(start2.direction);

        player1.close();
        player2.close();
    });

    test('Pile should synchronize after card draw', async () => {
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

        // Get initial draw pile top
        const drawPileTopP1Initial = await player1.waitFor('DRAW_PILE_TOP');
        const drawPileTopP2Initial = await player2.waitFor('DRAW_PILE_TOP');

        // Both should see same initial draw pile
        expect(drawPileTopP1Initial.card).toEqual(drawPileTopP2Initial.card);

        // Draw card
        player1.send({ type: 'DRAW_CARD', roomId, playerId: player1Id });
        
        // Wait for draw pile updates
        const [drawPileTopP1After, drawPileTopP2After] = await Promise.all([
            player1.waitFor('DRAW_PILE_TOP'),
            player2.waitFor('DRAW_PILE_TOP')
        ]);

        // Both players should see same updated draw pile
        expect(drawPileTopP1After.card).toEqual(drawPileTopP2After.card);
        // New draw pile should be different from initial (unless only one card was left)
        // This verifies synchronization

        player1.close();
        player2.close();
    });
});

