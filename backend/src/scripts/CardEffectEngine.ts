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
            // Pass card to measurement handler for entanglement collapse check
            const effectResult = this.applyEffect(cardFace, room, card);
            if (effectResult?.blocked) {
                return { advanceTurn: true, blocked: true };
            }
            return { advanceTurn: true };
        }
        // For normal cards, no special handling is needed.
        return { advanceTurn: true };
    }

    static applyEffect(cardFace: CardFace, room: GameRoom, card?: Card): { blocked?: boolean } | undefined {
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
                this.handleMeasurement(cardFace, room, card);
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

    private static handleMeasurement(cardFace: CardFace, room: GameRoom, cardPlayed?: Card) {
        const currentPlayer = room.getCurrentPlayer();
        const wasEntangled = currentPlayer && currentPlayer.isEntangled;
        
        // Check if this measurement is played by an entangled player
        if (currentPlayer && currentPlayer.isEntangled && cardPlayed) {
            // Handle entanglement collapse
            this.handleMeasurementCollapse(room, currentPlayer, cardPlayed);
        }

        const cardPlayedBeforeMeasurementCard: Card = room.discardPileManager.getCardBelowTopCard(room.isLightSideActive)!;
        let measuredCard: Card;
        const cardBelowFace = CardUtils.getActiveFace(cardPlayedBeforeMeasurementCard, room.isLightSideActive);
        
        if (cardBelowFace.value == ActionCards.WildCard.Superposition) {
            // Superposition: draw a new non-action card
            const superpositionCollapsedIntoCard: Card = room.drawPileManager.drawFirstNonActionCard(room.isLightSideActive)!;
            measuredCard = superpositionCollapsedIntoCard;
            room.discardPileManager.addCardOnTop(superpositionCollapsedIntoCard, room.isLightSideActive);
        } else if (wasEntangled && CardUtils.isActionCard(cardBelowFace)) {
            // After entanglement collapse, if card below is an action card, draw a non-action card instead
            const nonActionCard: Card = room.drawPileManager.drawFirstNonActionCard(room.isLightSideActive)!;
            measuredCard = nonActionCard;
            room.discardPileManager.removeCardAtIndex(1, room.isLightSideActive);
            room.discardPileManager.addCardOnTop(nonActionCard, room.isLightSideActive);
        } else {
            // Normal measurement: reveal the card below
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

    private static handleEntanglement(cardFace: CardFace, room: GameRoom) {
        const currentPlayer: Player | undefined = room.getCurrentPlayer();
        if (!currentPlayer) return;

        const totalPlayers = room.players.size;

        // For 2-player games: automatically entangle both players (including the one who played)
        if (totalPlayers === 2) {
            const opponent = Array.from(room.players.values()).find(op => op.id !== currentPlayer.id);
            if (!opponent) {
                Logger.error(`Entanglement: Could not find opponent in 2-player game in room: ${room.id}`);
                return;
            }

            // Entangle both players (current player and opponent)
            currentPlayer.setEntangled(opponent, currentPlayer);
            opponent.setEntangled(currentPlayer, currentPlayer);

            // Note: Both players do NOT draw cards immediately in the new implementation

            // Broadcast entanglement effect
            const player1Name = room.playerNames.get(currentPlayer.id) || currentPlayer.id.substring(0, 8);
            const player2Name = room.playerNames.get(opponent.id) || opponent.id.substring(0, 8);
            
            room.broadcast({
                type: 'CARD_EFFECT',
                effect: ActionCards.WildCard.Entanglement,
                entanglement: {
                    player1Id: currentPlayer.id,
                    player2Id: opponent.id,
                    initiatorId: currentPlayer.id
                }
            });

                // Notify about entanglement
                room.broadcast({
                    type: 'ENTANGLEMENT_NOTIFICATION',
                    message: `🔗 ${player1Name} and ${player2Name} are entangled! Both must play Measurement or draw and skip.`,
                    notificationType: 'entangled'
                });

            Logger.info("ENTANGLEMENT", `Player ${currentPlayer.id} entangled with opponent ${opponent.id} (2-player game) in room: ${room.id}`);

            // Check win conditions
            if (currentPlayer.getHandCards().length === 0) {
                GameManager.endGame(room, currentPlayer);
                return;
            }
            if (opponent.getHandCards().length === 0) {
                GameManager.endGame(room, opponent);
                return;
            }

            return; // Turn advances normally (handled by caller)
        }

        // For 3-4 player games: require selection of 2 opponents
        // Set up entanglement state for player selection
        room.entanglementState = {
            awaitingPlayerId: currentPlayer.id,
            status: "AWAITING_SELECTION"
        };

        Logger.info("EFFECT", `Entanglement: Waiting for Player: ${currentPlayer.id} to select 2 opponents to entangle in room: ${room.id}`);

        // Send message to current player to select 2 opponents
        const opponents = Array.from(room.players.values()).filter(op => op.id !== currentPlayer.id);
        
        currentPlayer.sendMessage({
            type: 'AWAITING_ENTANGLEMENT_SELECTION',
            message: 'Select 2 opponents to entangle.',
            opponents: opponents.map(op => ({ id: op.id, name: room.playerNames.get(op.id) || op.id }))
        });

        // Broadcast that entanglement is being set up
        room.broadcast({
            type: 'CARD_EFFECT',
            effect: cardFace.value
        }, [currentPlayer.id]);
    }

    // Handle entanglement selection - called from GameManager
    public static handleEntanglementSelection(room: GameRoom, player: Player, opponent1Id: string, opponent2Id: string) {
        if (!room.entanglementState || room.entanglementState.awaitingPlayerId !== player.id) {
            player.sendMessage({
                type: 'ERROR',
                message: 'Not authorized to perform entanglement action.'
            });
            Logger.error(`Player: ${player.id} is not allowed to entangle players in room: ${room.id}`);
            return { advanceTurn: false };
        }

        const opponent1 = room.players.get(opponent1Id);
        const opponent2 = room.players.get(opponent2Id);

        if (!opponent1 || !opponent2 || opponent1.id === opponent2.id) {
            player.sendMessage({
                type: 'ERROR',
                message: 'Invalid opponent selection. Must select 2 different opponents.'
            });
            Logger.error(`Player: ${player.id} attempted to entangle invalid players in room: ${room.id}`);
            return { advanceTurn: false };
        }

        // Set up entanglement between the two opponents
        opponent1.setEntangled(opponent2, player);
        opponent2.setEntangled(opponent1, player);

        // Note: Both players do NOT draw cards immediately when entanglement is created
        // They only draw when they take their turn (if they don't have Measurement)

        // Broadcast updated opponent hands (to show updated card counts)
        room.broadcastOpponentHands();

        // Broadcast entanglement effect
        const player1Name = room.playerNames.get(opponent1Id) || opponent1Id.substring(0, 8);
        const player2Name = room.playerNames.get(opponent2Id) || opponent2Id.substring(0, 8);
        const initiatorName = room.playerNames.get(player.id) || player.id.substring(0, 8);
        
        room.broadcast({
            type: 'CARD_EFFECT',
            effect: ActionCards.WildCard.Entanglement,
            entanglement: {
                player1Id: opponent1Id,
                player2Id: opponent2Id,
                initiatorId: player.id
            }
        });

        // Notify about entanglement
        room.broadcast({
            type: 'ENTANGLEMENT_NOTIFICATION',
            message: `🔗 ${initiatorName} entangled ${player1Name} and ${player2Name}! Both must play Measurement or draw and skip.`,
            notificationType: 'entangled'
        });

        Logger.info("ENTANGLEMENT", `Player ${player.id} entangled players ${opponent1Id} and ${opponent2Id} in room: ${room.id}`);

        // Mark entanglement as completed
        room.entanglementState = { awaitingPlayerId: room.entanglementState.awaitingPlayerId, status: 'COMPLETED' };

        // Check win conditions
        if (opponent1.getHandCards().length === 0) {
            GameManager.endGame(room, opponent1);
            return { advanceTurn: false };
        }
        if (opponent2.getHandCards().length === 0) {
            GameManager.endGame(room, opponent2);
            return { advanceTurn: false };
        }

        return { advanceTurn: true };
    }

    // Check if entangled player must play Measurement card
    public static checkEntangledPlayerTurn(room: GameRoom, player: Player): { mustPlayMeasurement: boolean; measurementCard?: Card } {
        if (!player.isEntangled) {
            return { mustPlayMeasurement: false };
        }

        // Check if player has a Measurement card
        const measurementCard = player.getHandCards().find(card => {
            const activeFace = CardUtils.getActiveFace(card, room.isLightSideActive);
            return activeFace.value === ActionCards.WildCard.Measurement;
        });

        if (measurementCard) {
            return { mustPlayMeasurement: true, measurementCard };
        }

        return { mustPlayMeasurement: false };
    }

    // Handle measurement collapse when played by entangled player
    public static handleMeasurementCollapse(room: GameRoom, player: Player, _measurementCard: Card): void {
        if (!player.isEntangled || !player.entanglementPartner) {
            return; // Not entangled or no partner, proceed with normal measurement
        }

        const partner = player.entanglementPartner;

        // 50/50 random outcome
        const outcome = Math.random() < 0.5;

        let firstPlayer: Player;
        let secondPlayer: Player;

        // Determine which player is "first" in turn order
        const playerIds = room.turnManager?.getPlayerOrder() || Array.from(room.players.keys());
        const playerIndex = playerIds.indexOf(player.id);
        const partnerIndex = playerIds.indexOf(partner.id);

        if (playerIndex < partnerIndex) {
            firstPlayer = player;
            secondPlayer = partner;
        } else {
            firstPlayer = partner;
            secondPlayer = player;
        }

        // Apply collapse outcome
        let firstPlayerCards = 0;
        let secondPlayerCards = 0;

        if (outcome) {
            // Outcome A: First player draws 3, second draws 0
            firstPlayerCards = 3;
            secondPlayerCards = 0;
        } else {
            // Outcome B: First player draws 0, second draws 3
            firstPlayerCards = 0;
            secondPlayerCards = 3;
        }

        // Draw cards for players
        for (let i = 0; i < firstPlayerCards; i++) {
            const card = room.drawPileManager.drawCardFromTop(room.isLightSideActive);
            if (card) {
                firstPlayer.getHand().addCard(card);
            }
        }

        for (let i = 0; i < secondPlayerCards; i++) {
            const card = room.drawPileManager.drawCardFromTop(room.isLightSideActive);
            if (card) {
                secondPlayer.getHand().addCard(card);
            }
        }

        // Send updated hands
        firstPlayer.sendMessage({
            type: 'YOUR_HAND',
            hand: firstPlayer.getHand()
        });

        secondPlayer.sendMessage({
            type: 'YOUR_HAND',
            hand: secondPlayer.getHand()
        });

        // Remove entanglement from both players
        firstPlayer.clearEntanglement();
        secondPlayer.clearEntanglement();

        // Determine which player drew 3 cards
        const playerWhoDrew3 = firstPlayerCards === 3 ? firstPlayer : secondPlayer;
        const playerWhoDrew0 = firstPlayerCards === 3 ? secondPlayer : firstPlayer;
        
        // Get player names for notification
        const player3Name = room.playerNames.get(playerWhoDrew3.id) || playerWhoDrew3.id.substring(0, 8);
        const player0Name = room.playerNames.get(playerWhoDrew0.id) || playerWhoDrew0.id.substring(0, 8);
        
        // Broadcast collapse outcome
        room.broadcast({
            type: 'ENTANGLEMENT_COLLAPSED',
            collapsedBy: player.id,
            player1Id: firstPlayer.id,
            player2Id: secondPlayer.id,
            player1Cards: firstPlayerCards,
            player2Cards: secondPlayerCards,
            playerWhoDrew3: playerWhoDrew3.id,
            playerWhoDrew0: playerWhoDrew0.id,
            playerWhoDrew3Name: player3Name,
            playerWhoDrew0Name: player0Name,
            outcome: outcome ? 'A' : 'B'
        });

        // Broadcast clear notification about who got what
        const notificationMessage = `⚛️ Entanglement Collapsed! ${player3Name} drew 3 cards, ${player0Name} drew 0.`;
        Logger.info("ENTANGLEMENT_NOTIFICATION", `Broadcasting: ${notificationMessage} in room: ${room.id}`);
        room.broadcast({
            type: 'ENTANGLEMENT_NOTIFICATION',
            message: notificationMessage,
            notificationType: 'collapse'
        });

        // Broadcast updated opponent hands
        room.broadcastOpponentHands();

        Logger.info("ENTANGLEMENT_COLLAPSE", `Entanglement collapsed by ${player.id}. Outcome: ${outcome ? 'A' : 'B'}. ${firstPlayer.id} draws ${firstPlayerCards}, ${secondPlayer.id} draws ${secondPlayerCards} in room: ${room.id}`);

        // Check win conditions
        if (firstPlayer.getHandCards().length === 0) {
            GameManager.endGame(room, firstPlayer);
        } else if (secondPlayer.getHandCards().length === 0) {
            GameManager.endGame(room, secondPlayer);
        }
    }

    private static handleSuperposition(cardFace: CardFace, room: GameRoom) {
        Logger.info("EFFECT", `Superposition: Superposition card has been played in room: ${room.id}`);
        room.broadcast({
            type: 'CARD_EFFECT',
            effect: cardFace.value
        });
    }
}
