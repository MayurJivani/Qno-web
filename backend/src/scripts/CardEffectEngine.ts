import { Card } from "../models/Card";
import { Player } from "../models/Player";
import { GameRoom } from "../models/GameRoom";
import { CardFace } from "../enums/cards/CardFace";
import { CardUtils } from "../utils/CardUtils";
import { Colours } from "../enums/cards/Colours";
import { ActionCards } from "../enums/cards/ActionCards";
import { Direction } from "../enums/gameRoom/Direction";
import { GameManager } from "./GameManager";
import { Logger } from "../utils/Logger";

export class CardEffectEngine {

    static handleCardEffect(card: Card, room: GameRoom): { advanceTurn: boolean; blocked?: boolean } {
        const cardFace: CardFace = CardUtils.getActiveFace(card, room.isLightSideActive);
        if (CardUtils.isActionCard(cardFace)) {
            const effectResult = this.applyEffect(cardFace, room);
            if (effectResult?.blocked) {
                return { advanceTurn: true, blocked: true };
            }
            return { advanceTurn: true };
        }
        // For normal cards, no special handling is needed.
        return { advanceTurn: true };
    }

    static applyEffect(cardFace: CardFace, room: GameRoom): { blocked?: boolean } | undefined {
        switch (cardFace.value) {
            case ActionCards.Light.Pauli_X:
                this.handlePauliX(cardFace, room);
                return undefined;
            case ActionCards.Dark.Pauli_Y:
                this.handlePauliY(cardFace, room);
                return undefined;
            case ActionCards.Dark.Pauli_Z:
                this.handlePauliZ(cardFace, room);
                return undefined;
            case ActionCards.Light.Teleportation:
                return this.handleTeleportation(cardFace, room);
            case ActionCards.WildCard.Measurement:
                this.handleMeasurement(cardFace, room);
                return undefined;
            case ActionCards.WildCard.Superposition:
                this.handleSuperposition(cardFace, room);
                return undefined;
            case ActionCards.WildCard.Entanglement:
                this.handleEntanglement(cardFace, room);
                return undefined;
            case ActionCards.WildCard.Colour_Superposition:
                this.handleColourSuperposition(cardFace, room);
                return undefined;
            default:
                // No special effect, normal card
                return undefined;
        }
    }

    static checkValidMove(cardPlayed: Card, room: GameRoom): boolean {
        const activeCardFaceOnTopOfDiscardPile: CardFace | null = room.discardPileManager.getActiveFaceOfTopCard(room.isLightSideActive);
        const activeCardFacePlayed: CardFace = CardUtils.getActiveFace(cardPlayed, room.isLightSideActive)
        // If discard pile is empty i.e. no card has been played yet
        if (!activeCardFaceOnTopOfDiscardPile) {
            return true;
        } else if (activeCardFaceOnTopOfDiscardPile.value == ActionCards.WildCard.Superposition) {
            if (activeCardFacePlayed.value == ActionCards.WildCard.Measurement) {
                return true;
            } else {
                return false;
            }
        }
        else {
            if ((activeCardFaceOnTopOfDiscardPile.colour == activeCardFacePlayed.colour) // If colour matches
                || (activeCardFaceOnTopOfDiscardPile.value == activeCardFacePlayed.value)// If value matches
                || (activeCardFacePlayed.colour == Colours.WildCard.Black)) {            // If card played is an action card 
                return true;
            }
        }
        return false;
    }

    private static handlePauliX(cardFace: CardFace, room: GameRoom) {
        room.isLightSideActive = !room.isLightSideActive;
        const activeSide: string = room.isLightSideActive ? "light side" : "dark side"
        Logger.info("EFFECT", `Pauli_X: Flipping active side to ${activeSide} in room: ${room.id}`);
        room.broadcast({
            type: 'CARD_EFFECT',
            effect: cardFace.value,
            isLightSideActive: room.isLightSideActive,
        });
        // After flipping sides, refresh opponent hands so they show the new inactive faces
        room.broadcastOpponentHands();
        // After flipping sides, broadcast updated draw and discard pile cards
        // because the visible faces have changed
        room.broadcastTopOfDrawPile();
        room.broadcastTopOfDiscardPile();
    }

    private static handlePauliY(cardFace: CardFace, room: GameRoom) {
        room.isLightSideActive = !room.isLightSideActive;
        const activeSide: string = room.isLightSideActive ? "light side" : "dark side"
        if (!room.turnManager) return;
        room.turnManager.reverseDirection();
        const currentDirection: Direction = room.turnManager?.getDirection()!;
        const direction: string = currentDirection == Direction.Clockwise ? "clockwise" : "anti-clockwise"
        Logger.info("EFFECT", `Pauli_Y: Flipping active side to ${activeSide} and direction to ${direction} in room: ${room.id}`);
        room.broadcast({
            type: 'CARD_EFFECT',
            effect: cardFace.value,
            isLightSideActive: room.isLightSideActive,
            direction: room.turnManager.getDirection()
        });
        // After flipping sides, refresh opponent hands so they show the new inactive faces
        room.broadcastOpponentHands();
        // After flipping sides, broadcast updated draw and discard pile cards
        // because the visible faces have changed
        room.broadcastTopOfDrawPile();
        room.broadcastTopOfDiscardPile();
    }

    private static handlePauliZ(cardFace: CardFace, room: GameRoom) {
        if (!room.turnManager) return;
        room.turnManager.reverseDirection();
        const currentDirection: Direction = room.turnManager?.getDirection()!;
        const direction: string = currentDirection == Direction.Clockwise ? "clockwise" : "anti-clockwise"
        Logger.info("EFFECT", `Pauli_Z: Flipping direction to ${direction} in room: ${room.id}`);
        room.broadcast({
            type: 'CARD_EFFECT',
            effect: cardFace.value,
            direction: room.turnManager.getDirection()
        });
    }

    private static handleTeleportation(_cardFace: CardFace, room: GameRoom): { blocked: boolean } | undefined {

        const currentPlayer: Player | undefined = room.getCurrentPlayer();
        if (!currentPlayer) return undefined;

        // Check if any opponent has only one card - teleportation can't be used on last card
        const opponents = Array.from(room.players.values()).filter(op => op.id !== currentPlayer.id);
        const hasOpponentWithOneCard = opponents.some(op => op.getHandCards().length === 1);
        
        if (hasOpponentWithOneCard) {
            currentPlayer.sendMessage({
                type: 'ERROR',
                message: 'Cannot use Teleportation: An opponent only has one card remaining. You cannot take their last card.'
            });
            Logger.info("EFFECT", `Teleportation blocked: Player ${currentPlayer.id} attempted to teleport but opponent has only one card in room: ${room.id}`);
            return { blocked: true };
        }

        room.teleportationState = {
            awaitingPlayerId: currentPlayer.id,
            status: "AWAITING_SELECTION"
        }

        Logger.info("EFFECT", `Teleportation: Waiting for Player: ${currentPlayer.id} to select a card to teleport in room: ${room.id}`);

        room.players.forEach(p => {
            const opponentPlayersHands: Record<string, Card[]> = {};
            const opponents = Array.from(room.players.values()).filter(op => op.id !== p.id);

            // Refresh each opponents hand along with the id of their cards
            // Only show opponents who have more than one card (can't teleport from single card hands)
            opponents.forEach(op => {
                if (op.getHandCards().length > 1) {
                    // Each player should only see the inactive card faces of the opponents hands (with the id's)
                    opponentPlayersHands[op.id] = op.getHandCards().map(card => CardUtils.getInactiveFaceWithId(card, room.isLightSideActive));
                }
            });

            //Send a map of playerid:hand while also sending card id along with each card face to each player.
            //This is done to enable the server to uniquely identify which card should get teleported
            p.sendMessage({
                type: 'REFRESH_OPPONENT_HAND',
                opponentHands: opponentPlayersHands
            });
        });

        currentPlayer.sendMessage({
            type: 'AWAITING_TELEPORTATION_TARGET',
            message: 'Select a card from an opponent to teleport into your hand.',
        });

        return undefined; // Success
    }

    // 'player' is the current player who played the teleportation card and 'fromPlayerId' is the id of the player from whose hand the card has been teleported
    public static handleTeleportationSelection(room: GameRoom, player: Player, fromPlayerId: string, cardSelected: Card) {
        if (!room.teleportationState || room.teleportationState.awaitingPlayerId !== player.id) {
            player.sendMessage({
                type: 'ERROR',
                message: 'Not authorized to perform teleportation action.'
            });
            Logger.error(`Player: ${player.id} is not allowed to teleport a card in room: ${room.id}`);
            return { advanceTurn: false };
        }

        const fromPlayer = room.players.get(fromPlayerId);
        if (!fromPlayer) {
            player.sendMessage({
                type: 'ERROR',
                message: 'Invalid player selected.'
            });
            Logger.error(`Player: ${player.id} attempted to teleport a card from an invalid Player with id: ${fromPlayerId} in room: ${room.id}`);
            return { advanceTurn: false };;
        }

        const cardIndex = fromPlayer.getHandCards().findIndex(c => c.id == cardSelected.id);
        if (cardIndex === -1) {
            player.sendMessage({
                type: 'ERROR',
                message: 'Selected card not found in opponent\'s hand.'
            });
            Logger.error(`Player: ${player.id} attempted to teleport an invalid card : ${cardSelected.id, cardSelected.lightSide, cardSelected.darkSide} from Player with id: ${fromPlayerId} in room: ${room.id}`);
            return { advanceTurn: false };
        }

        // Remove card from opponent's hand
        fromPlayer.getHand().removeCard(cardSelected);

        // Add card to current player's hand
        player.getHand().addCard(cardSelected);

        // Send updated hand to the player who received the teleported card
        player.sendMessage({
            type: 'YOUR_HAND',
            hand: player.getHand()
        });

        // Send updated hand to the player who lost the teleported card
        fromPlayer.sendMessage({
            type: 'YOUR_HAND',
            hand: fromPlayer.getHand()
        });

        room.broadcast({
            type: 'CARD_EFFECT',
            effect: ActionCards.Light.Teleportation,
            teleportation: {
                cardTeleportedFromPlayerId: fromPlayerId,
                cardTeleportedToPlayerId: player.id,
                cardTeleported: cardSelected.id
            }
        })

        let cardTeleportedActiceFace = CardUtils.getActiveFace(cardSelected, room.isLightSideActive);

        Logger.info("TELEPORTATION", `Player ${player.id} teleported card ${cardTeleportedActiceFace.colour} ${cardTeleportedActiceFace.value} from player: ${fromPlayerId} in room: ${room.id}`);

        // Mark teleportation as completed
        room.teleportationState = { awaitingPlayerId: room.teleportationState.awaitingPlayerId, status: 'COMPLETED' };

        // Refresh opponent hands to hide card IDs after teleportation is complete
        room.broadcastOpponentHands();

        // Check win conditions after teleportation
        // Check if player who received card wins (hand empty - shouldn't happen as they just got a card, but check anyway)
        if (player.getHandCards().length === 0) {
            GameManager.endGame(room, player);
            return { advanceTurn: false };
        }

        // Check if opponent who lost card loses (hand empty)
        if (fromPlayer.getHandCards().length === 0) {
            GameManager.endGame(room, player); // Current player wins
            return { advanceTurn: false };
        }

        return { advanceTurn: true };
    }

    private static handleMeasurement(cardFace: CardFace, room: GameRoom) {
        const cardPlayedBeforeMeasurementCard: Card = room.discardPileManager.getCardBelowTopCard(room.isLightSideActive)!;
        let measuredCard: Card;
        if (CardUtils.getActiveFace(cardPlayedBeforeMeasurementCard, room.isLightSideActive).value == ActionCards.WildCard.Superposition) {
            const superpositionCollapsedIntoCard: Card = room.drawPileManager.drawFirstNonActionCard(room.isLightSideActive)!;
            measuredCard = superpositionCollapsedIntoCard;
            room.discardPileManager.addCardOnTop(superpositionCollapsedIntoCard, room.isLightSideActive);
        } else {
            // Index 0 will be the measurement card just played, Index 1 will be the card below the measurement card. 
            // removeCardAtIndex() takes into account if light side is active or not and respectively removes the card either from the front or back of the discard pile
            room.discardPileManager.removeCardAtIndex(1, room.isLightSideActive)
            room.discardPileManager.addCardOnTop(cardPlayedBeforeMeasurementCard, room.isLightSideActive);
            measuredCard = cardPlayedBeforeMeasurementCard;
        }
        let measuredCardActiveFace = CardUtils.getActiveFace(measuredCard, room.isLightSideActive);
        Logger.info("EFFECT", `Measurement: Measurement card output is ${measuredCardActiveFace.colour} ${measuredCardActiveFace.value} in room: ${room.id}`);
        room.broadcast({
            type: 'CARD_EFFECT',
            effect: cardFace.value
        });
    }

    private static handleColourSuperposition(cardFace: CardFace, room: GameRoom) {
        const newCardOnTopOfDiscardPile: Card | null = room.drawPileManager.drawFirstNonActionCard(room.isLightSideActive);
        if (newCardOnTopOfDiscardPile == null) {
            Logger.error("No non-action cards left in the draw pile");
            return;
        }
        room.discardPileManager.addCardOnTop(newCardOnTopOfDiscardPile, room.isLightSideActive);
        let newCardActiceFace = CardUtils.getActiveFace(newCardOnTopOfDiscardPile, room.isLightSideActive);
        Logger.info("EFFECT", `Colour Superposition: Colour Superposition card output is ${newCardActiceFace.colour} ${newCardActiceFace.value} in room: ${room.id}`);
        room.broadcast({
            type: 'CARD_EFFECT',
            effect: cardFace.value
        });
    }

    private static handleEntanglement(_cardFace: CardFace, _room: GameRoom) {
        throw new Error("Method not implemented.");
    }

    private static handleSuperposition(cardFace: CardFace, room: GameRoom) {
        Logger.info("EFFECT", `Superposition: Superposition card has been played in room: ${room.id}`);
        room.broadcast({
            type: 'CARD_EFFECT',
            effect: cardFace.value
        });
    }
}
