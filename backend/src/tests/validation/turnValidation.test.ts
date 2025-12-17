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

describe('Turn Validation Tests', () => {
    test('Should allow player to play card only on their turn', async () => {
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

        // Get initial state
        const [yourHandP1, discardPileTopP1] = await Promise.all([
            player1.waitFor('YOUR_HAND'),
            player1.waitFor('DISCARD_PILE_TOP')
        ]);

        // Verify first player is current player (should be player1)
        expect(start1.currentPlayer).toBe(player1Id);

        // Player1 should be able to play (it's their turn)
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
            // Player1 plays card (their turn)
            player1.send({ type: 'PLAY_CARD', roomId, playerId: player1Id, card: playCard });
            await player1.waitFor('PLAYED_CARD');
            await player1.waitFor('TURN_CHANGED');

            // Now player2 should be current player
            const turnChanged = await player2.waitFor('TURN_CHANGED');
            expect(turnChanged.currentPlayer).toBe(player2Id);
        }

        player1.close();
        player2.close();
    });

    test('Should allow player to draw card only on their turn', async () => {
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

        // Player1 draws card (their turn)
        player1.send({ type: 'DRAW_CARD', roomId, playerId: player1Id });
        await player1.waitFor('CARD_DRAWN');
        await player1.waitFor('TURN_CHANGED');

        // Now it should be player2's turn
        const turnChanged = await player2.waitFor('TURN_CHANGED');
        expect(turnChanged.currentPlayer).toBe(player2Id);

        player1.close();
        player2.close();
    });

    test('Should prevent playing card during teleportation mode', async () => {
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

        // Find a Teleportation card
        const cardOnTopOfDiscardPile = discardPileTopP1.card;
        let teleportationCard: Card | undefined;
        
        for (const card of yourHandP1.hand.cards) {
            const activeCardFace = CardUtils.getActiveFace(card, true);
            if (activeCardFace.value === 'Teleportation') {
                if (activeCardFace.colour === cardOnTopOfDiscardPile.colour || 
                    activeCardFace.colour === Colours.WildCard.Black) {
                    teleportationCard = card;
                    break;
                }
            }
        }

        if (teleportationCard) {
            // Play teleportation card
            player1.send({ type: 'PLAY_CARD', roomId, playerId: player1Id, card: teleportationCard });
            await player1.waitFor('AWAITING_TELEPORTATION_TARGET');

            // Try to play another card during teleportation mode
            let otherCard: Card | undefined;
            for (const card of yourHandP1.hand.cards) {
                if (!CardUtils.areCardsEqual(card, teleportationCard)) {
                    otherCard = card;
                    break;
                }
            }

            if (otherCard) {
                player1.send({ type: 'PLAY_CARD', roomId, playerId: player1Id, card: otherCard });
                const errorMsg = await player1.waitFor('ERROR');
                expect(errorMsg.message).toContain('teleportation');
            }
        }

        player1.close();
        player2.close();
    });

    test('Should prevent drawing card during teleportation mode', async () => {
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

        // Find a Teleportation card
        const cardOnTopOfDiscardPile = discardPileTopP1.card;
        let teleportationCard: Card | undefined;
        
        for (const card of yourHandP1.hand.cards) {
            const activeCardFace = CardUtils.getActiveFace(card, true);
            if (activeCardFace.value === 'Teleportation') {
                if (activeCardFace.colour === cardOnTopOfDiscardPile.colour || 
                    activeCardFace.colour === Colours.WildCard.Black) {
                    teleportationCard = card;
                    break;
                }
            }
        }

        if (teleportationCard) {
            // Play teleportation card
            player1.send({ type: 'PLAY_CARD', roomId, playerId: player1Id, card: teleportationCard });
            await player1.waitFor('AWAITING_TELEPORTATION_TARGET');

            // Try to draw card during teleportation mode
            player1.send({ type: 'DRAW_CARD', roomId, playerId: player1Id });
            const errorMsg = await player1.waitFor('ERROR');
            expect(errorMsg.message).toContain('teleportation');
        }

        player1.close();
        player2.close();
    });
});

