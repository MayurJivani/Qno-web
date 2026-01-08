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

describe('Invalid Card Play Tests', () => {
    test('Should return error when playing card that does not match discard pile', async () => {
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

        // Get discard pile top
        const discardPileTopP1 = await player1.waitFor('DISCARD_PILE_TOP');
        const discardPileTop = discardPileTopP1.card;

        // Create a card that definitely doesn't match
        // Find a color that doesn't match and a value that doesn't match
        let invalidCard: Card;
        if (discardPileTop.colour === Colours.Light.Red) {
            invalidCard = new Card(
                1,
                { colour: Colours.Light.Blue, value: '9' },
                { colour: Colours.Dark.Purple, value: '8' }
            );
        } else {
            invalidCard = new Card(
                1,
                { colour: Colours.Light.Red, value: '9' },
                { colour: Colours.Dark.Purple, value: '8' }
            );
        }

        // Try to play invalid card
        player1.send({ type: 'PLAY_CARD', roomId, playerId: player1Id, card: invalidCard });

        const errorMsg = await player1.waitFor('ERROR');
        expect(errorMsg.message).toContain('Invalid move');

        player1.close();
        player2.close();
    });

    test('Should return error when playing non-Measurement card on Superposition', async () => {
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

        // Find a Superposition card in player1's hand
        let superpositionCard: Card | undefined;
        for (const card of yourHandP1.hand.cards) {
            const activeCardFace = CardUtils.getActiveFace(card, true);
            if (activeCardFace.value === 'Superposition') {
                superpositionCard = card;
                break;
            }
        }

        // If Superposition card found, play it
        if (superpositionCard) {
            player1.send({ type: 'PLAY_CARD', roomId, playerId: player1Id, card: superpositionCard });
            await player1.waitFor('PLAYED_CARD');

            // Now try to play a non-Measurement card
            const discardTop = await player1.waitFor('DISCARD_PILE_TOP');
            if (discardTop.card.value === 'Superposition') {
                // Try to play any other card (non-Measurement)
                let invalidCard: Card | undefined;
                for (const card of yourHandP1.hand.cards) {
                    const activeCardFace = CardUtils.getActiveFace(card, true);
                    if (activeCardFace.value !== 'Measurement' && !CardUtils.areCardsEqual(card, superpositionCard!)) {
                        invalidCard = card;
                        break;
                    }
                }

                if (invalidCard) {
                    player2.send({ type: 'PLAY_CARD', roomId, playerId: player2Id, card: invalidCard });
                    const errorMsg = await player2.waitFor('ERROR');
                    expect(errorMsg.message).toContain('Invalid move');
                }
            }
        }

        player1.close();
        player2.close();
    });
});

