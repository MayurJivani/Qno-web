import { CardEffectEngine } from "./CardEffectEngine";
import { CardFace } from "../enums/cards/CardFace";
import { Status as GameRoomStatus } from "../enums/gameRoom/Status";
import { Card } from "../models/Card";
import { GameRoom } from "../models/GameRoom";
import { Player } from "../models/Player";
import { CardUtils } from "../utils/CardUtils";
import { Logger } from "../utils/Logger";
import { ActionCards } from "../enums/cards/ActionCards";

export class GameManager {
    public static startGame(room: GameRoom): void {
        if (!room.allPlayersReady()) {
            Logger.error(`Couldn't start game since all players aren't ready`);
            return;
        }

        if (room.status !== GameRoomStatus.NOT_STARTED) {
            Logger.error(`Attempted to start game in already started room: ${room.id}`);
            return;
        }

        room.status = GameRoomStatus.IN_PROGRESS;

        room.startTurnManager();

        room.broadcast({
            type: "GAME_STARTED",
            roomId: room.id,
            currentPlayer: room.getCurrentPlayerId(),
            direction: room.turnManager!.getDirection(),
        });

        this.dealCards(room);
        const revealFirstCard: Card = room.drawPileManager.drawFirstNonActionCard(room.isLightSideActive)!;
        room.discardPileManager.addCardOnTop(revealFirstCard, room.isLightSideActive);
        // NOTE: After first card from draw pile is revealed, 93 cards would be remaining in the draw pile (assuming 2 players)
        // 7 + 7 (no. of cards in each players hand) + 1 (card revealed) + 93 = 108 total cards
        room.broadcastTopOfDrawPile();
        room.broadcastTopOfDiscardPile();
    }

    private static dealCards(room: GameRoom): void {
        for (let i = 0; i < 7; i++) {
            room.players.forEach(p => {
                if (room.drawPileManager.getRemainingCardCount() > 0) {
                    const card = room.drawPileManager.getRawDrawPile().shift();
                    if (card) p.getHand().addCard(card);
                }
            });
        }

        room.players.forEach(p => {
            const opponentPlayersHands: Record<string, CardFace[]> = {};
            const opponents = Array.from(room.players.values()).filter(op => op.id !== p.id);

            opponents.forEach(op => {
                // Each player should only see the inactive card faces of the opponents hands (without the id's)
                opponentPlayersHands[op.id] = op.getHandCards().map(card => CardUtils.getInactiveFace(card, room.isLightSideActive));
            });

            // Each player sees complete information about their hand (along with id of the cards)
            p.sendMessage({
                type: 'YOUR_HAND',
                hand: p.getHand()
            });

            p.sendMessage({
                type: 'OPPONENT_HAND',
                opponentHands: opponentPlayersHands
            });
        });
    }

    public static playCard(room: GameRoom, player: Player, card: Card) {
        let cardFacePlayed: CardFace = CardUtils.getActiveFace(card, room.isLightSideActive);
        if (CardEffectEngine.checkValidMove(card, room)) {
            // Remove the card from the player's hand if it is a valid move
            // TODO: Check if the card being played actually exists in the player's hand or not
            player.setHandCards(player.getHandCards().filter(c => !CardUtils.areCardsEqual(c, card)));
            room.discardPileManager.addCardOnTop(card, room.isLightSideActive); // Insert at the top of the discard pile
            const effectType = CardUtils.isActionCard(cardFacePlayed) ? cardFacePlayed.value : undefined;

            player.sendMessage({
                type: 'PLAYED_CARD',
                card: cardFacePlayed,
                playerId: player.id,
                effect: effectType
            })

            // Send the card played by the player to the opponents
            room.broadcast({
                type: 'OPPONENT_PLAYED_CARD',
                card: cardFacePlayed,
                opponentId: player.id, // Pass the playerId of the person who drew the card
                effect: effectType
            }, [player.id])

            Logger.info("PLAYED_CARD", ` Player: ${player.id} played a ${cardFacePlayed.colour} ${cardFacePlayed.value} card in room: ${room.id}.`);

            // Teleportation card is handled separately
            if (cardFacePlayed.value == ActionCards.Light.Teleportation) {
                CardEffectEngine.handleCardEffect(card, room);
                return;
            }
            const effectResult = CardEffectEngine.handleCardEffect(card, room);

            GameManager.handleRoomUpdate(room, effectResult);
        }
        else {
            Logger.error(` Player: ${player.id} tried to play an invalid card (${cardFacePlayed.colour} ${cardFacePlayed.value}) in room: ${room.id}.`);
            player.sendMessage({
                type: 'ERROR',
                message: 'Invalid move. Cannot play this card.'
            })
            return;
        }
    }

    public static handleTeleportation(room: GameRoom, player: Player, fromPlayerId: string, card: Card) {
        const effectResult = CardEffectEngine.handleTeleportationSelection(room, player, fromPlayerId, card);
        GameManager.handleRoomUpdate(room, effectResult)
    }

    private static handleRoomUpdate(room: GameRoom, effectResult: { advanceTurn: boolean }) {
        const currentCardOnTopOfDrawPile: Card = room.drawPileManager.getTopCard(room.isLightSideActive)!;
        if (effectResult.advanceTurn) {
            this.advanceTurn(room);
        }

        const newCardOnTopOfDrawPile: Card = room.drawPileManager.getTopCard(room.isLightSideActive)!;

        // If the card on top of draw pile is now different, send the new card on top of draw pile
        if (!CardUtils.areCardsEqual(newCardOnTopOfDrawPile, currentCardOnTopOfDrawPile)) {
            room.broadcastTopOfDrawPile();
        }
        // Send the new card on top of discard pile
        room.broadcastTopOfDiscardPile();
    }

    public static drawCard(room: GameRoom, player: Player) {
        if (!room.drawPileManager.getRemainingCardCount()) {
            player.sendMessage({ type: 'ERROR', message: 'No cards left in the deck' });
            return;
        }

        let cardDrawn: Card = room.drawPileManager.drawCardFromTop(room.isLightSideActive)!;
        let turnChangeHandled: boolean = false;
        player.getHand().addCard(cardDrawn);
        let cardFaceDrawn: CardFace = CardUtils.getActiveFace(cardDrawn, room.isLightSideActive);
        Logger.info("CARD_DRAWN", `Player: ${player.id} drew a ${cardFaceDrawn.colour} ${cardFaceDrawn.value} card in room: ${room.id}.`);
        // If the card drawn can be played, play it forcefully
        if (CardEffectEngine.checkValidMove(cardDrawn, room)) {
            this.playCard(room, player, cardDrawn);
            turnChangeHandled = true;
        }

        // Send the card drawn to the current player along with their updated hand
        player.sendMessage({
            type: 'CARD_DRAWN',
            card: cardDrawn,
            hand: player.getHandCards()
        });

        // Send the card drawn by the player to the opponents
        room.broadcast({
            type: 'OPPONENT_DREW_CARD',
            card: CardUtils.getInactiveFace(cardDrawn, room.isLightSideActive),
            opponentId: player.id // Pass the playerId of the person who drew the card
        }, [player.id]);

        // Change turn to next player
        if (!turnChangeHandled) {
            this.advanceTurn(room);
            // Send the new card on top of draw pile
            room.broadcastTopOfDrawPile();
            // Send the new card on top of discard pile
            room.broadcastTopOfDiscardPile();
        }
    }

    private static advanceTurn(room: GameRoom): void {
        if (!room.turnManager) return;
        const nextPlayer = room.turnManager.advanceTurn();
        room.broadcast({ type: 'TURN_CHANGED', currentPlayer: nextPlayer });
    }
}
