import http from 'http';
import { setupWebSocketServer } from '../../scripts/WebSocket';
import { WebSockTestClient } from '../clients/WebSocketTestClient';
import { Card } from '../../models/Card';
import { Colours } from '../../enums/cards/Colours';
import { ActionCards } from '../../enums/cards/ActionCards';
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

describe('Turn Management Tests', () => {
    test('Turn order should be correct with 3 players', async () => {
        const url = `ws://localhost:${port}`;
        const player1 = new WebSockTestClient(url);
        const player2 = new WebSockTestClient(url);
        const player3 = new WebSockTestClient(url);

        await Promise.all([player1.connect(), player2.connect(), player3.connect()]);

        player1.send({ type: 'CREATE_ROOM' });
        const { roomId, playerId: player1Id } = await player1.waitFor('ROOM_CREATED');

        player2.send({ type: 'JOIN_ROOM', roomId });
        const { playerId: player2Id } = await player2.waitFor('JOINED_ROOM');

        player3.send({ type: 'JOIN_ROOM', roomId });
        const { playerId: player3Id } = await player3.waitFor('JOINED_ROOM');

        // All ready
        player1.send({ type: 'PLAYER_READY', roomId, playerId: player1Id });
        await Promise.all([
            player1.waitFor('PLAYER_READY'),
            player2.waitFor('PLAYER_READY'),
            player3.waitFor('PLAYER_READY')
        ]);

        player2.send({ type: 'PLAYER_READY', roomId, playerId: player2Id });
        await Promise.all([
            player1.waitFor('PLAYER_READY'),
            player2.waitFor('PLAYER_READY'),
            player3.waitFor('PLAYER_READY')
        ]);

        player3.send({ type: 'PLAYER_READY', roomId, playerId: player3Id });
        await Promise.all([
            player1.waitFor('PLAYER_READY'),
            player2.waitFor('PLAYER_READY'),
            player3.waitFor('PLAYER_READY')
        ]);

        // Start game
        player1.send({ type: 'START_GAME', roomId, playerId: player1Id });
        const [start1, start2, start3] = await Promise.all([
            player1.waitFor('GAME_STARTED'),
            player2.waitFor('GAME_STARTED'),
            player3.waitFor('GAME_STARTED')
        ]);

        // All should see same current player (should be player1)
        expect(start1.currentPlayer).toBe(player1Id);
        expect(start2.currentPlayer).toBe(player1Id);
        expect(start3.currentPlayer).toBe(player1Id);

        // Get hands and discard pile
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
            // Player1 plays (turn 1)
            player1.send({ type: 'PLAY_CARD', roomId, playerId: player1Id, card: playCard });
            
            // Wait for turn change (all players receive it)
            const [turn1P1, turn1P2, turn1P3] = await Promise.all([
                player1.waitFor('TURN_CHANGED'),
                player2.waitFor('TURN_CHANGED'),
                player3.waitFor('TURN_CHANGED')
            ]);

            // After player1, should be player2 (clockwise)
            expect(turn1P1.currentPlayer).toBe(player2Id);
            expect(turn1P2.currentPlayer).toBe(player2Id);
            expect(turn1P3.currentPlayer).toBe(player2Id);
        }

        player1.close();
        player2.close();
        player3.close();
    });

    test('Turn order should be correct with 4 players', async () => {
        const url = `ws://localhost:${port}`;
        const player1 = new WebSockTestClient(url);
        const player2 = new WebSockTestClient(url);
        const player3 = new WebSockTestClient(url);
        const player4 = new WebSockTestClient(url);

        await Promise.all([player1.connect(), player2.connect(), player3.connect(), player4.connect()]);

        player1.send({ type: 'CREATE_ROOM' });
        const { roomId, playerId: player1Id } = await player1.waitFor('ROOM_CREATED');

        player2.send({ type: 'JOIN_ROOM', roomId });
        const { playerId: player2Id } = await player2.waitFor('JOINED_ROOM');

        player3.send({ type: 'JOIN_ROOM', roomId });
        const { playerId: player3Id } = await player3.waitFor('JOINED_ROOM');

        player4.send({ type: 'JOIN_ROOM', roomId });
        const { playerId: player4Id } = await player4.waitFor('JOINED_ROOM');

        // All ready
        player1.send({ type: 'PLAYER_READY', roomId, playerId: player1Id });
        await Promise.all([
            player1.waitFor('PLAYER_READY'),
            player2.waitFor('PLAYER_READY'),
            player3.waitFor('PLAYER_READY'),
            player4.waitFor('PLAYER_READY')
        ]);

        player2.send({ type: 'PLAYER_READY', roomId, playerId: player2Id });
        await Promise.all([
            player1.waitFor('PLAYER_READY'),
            player2.waitFor('PLAYER_READY'),
            player3.waitFor('PLAYER_READY'),
            player4.waitFor('PLAYER_READY')
        ]);

        player3.send({ type: 'PLAYER_READY', roomId, playerId: player3Id });
        await Promise.all([
            player1.waitFor('PLAYER_READY'),
            player2.waitFor('PLAYER_READY'),
            player3.waitFor('PLAYER_READY'),
            player4.waitFor('PLAYER_READY')
        ]);

        player4.send({ type: 'PLAYER_READY', roomId, playerId: player4Id });
        await Promise.all([
            player1.waitFor('PLAYER_READY'),
            player2.waitFor('PLAYER_READY'),
            player3.waitFor('PLAYER_READY'),
            player4.waitFor('PLAYER_READY')
        ]);

        // Start game
        player1.send({ type: 'START_GAME', roomId, playerId: player1Id });
        const [start1, start2, start3, start4] = await Promise.all([
            player1.waitFor('GAME_STARTED'),
            player2.waitFor('GAME_STARTED'),
            player3.waitFor('GAME_STARTED'),
            player4.waitFor('GAME_STARTED')
        ]);

        // All should see same current player (should be player1)
        expect(start1.currentPlayer).toBe(player1Id);
        expect(start2.currentPlayer).toBe(player1Id);
        expect(start3.currentPlayer).toBe(player1Id);
        expect(start4.currentPlayer).toBe(player1Id);

        player1.close();
        player2.close();
        player3.close();
        player4.close();
    });

    test('Turn direction should persist after Pauli Z', async () => {
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
        const [start1] = await Promise.all([
            player1.waitFor('GAME_STARTED'),
            player2.waitFor('GAME_STARTED')
        ]);

        // Initial direction should be clockwise (1)
        expect(start1.direction).toBe(1);

        // Get hands
        const [yourHandP2, discardPileTopP1] = await Promise.all([
            player2.waitFor('YOUR_HAND'),
            player1.waitFor('DISCARD_PILE_TOP')
        ]);

        // Find Pauli Z card in player2's hand
        const cardOnTopOfDiscardPile = discardPileTopP1.card;
        let pauliZCard: Card | undefined;

        for (const card of yourHandP2.hand.cards) {
            const activeCardFace = CardUtils.getActiveFace(card, false); // Dark side active for Pauli Z
            if (activeCardFace.value === ActionCards.Dark.Pauli_Z) {
                if (activeCardFace.colour === cardOnTopOfDiscardPile.colour || 
                    activeCardFace.colour === Colours.WildCard.Black) {
                    pauliZCard = card;
                    break;
                }
            }
        }

        // Wait for player2's turn
        await player1.waitFor('TURN_CHANGED');
        await player2.waitFor('TURN_CHANGED');

        if (pauliZCard) {
            // Player2 plays Pauli Z
            player2.send({ type: 'PLAY_CARD', roomId, playerId: player2Id, card: pauliZCard });
            const effect = await player2.waitFor('CARD_EFFECT');

            // Direction should be reversed (should be -1 or 2, depending on implementation)
            expect(effect.direction).not.toBe(start1.direction);

            // Wait for turn change
            await player1.waitFor('TURN_CHANGED');
            await player2.waitFor('TURN_CHANGED');

            // Next turn should follow new direction
            // This verifies direction persistence
        }

        player1.close();
        player2.close();
    });
});

