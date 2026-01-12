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

        // Build playerNames object
        const playerNamesObj: Record<string, string> = {};
        room.playerNames.forEach((name, id) => {
            playerNamesObj[id] = name;
        });

        room.broadcast({
            type: "GAME_STARTED",
            roomId: room.id,
            currentPlayer: room.getCurrentPlayerId(),
            direction: room.turnManager!.getDirection(),
            playerNames: playerNamesObj,
            turnOrder: room.turnManager!.getPlayerOrder()
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

        // Build playerNames object
        const playerNamesObj: Record<string, string> = {};
        room.playerNames.forEach((name, id) => {
            playerNamesObj[id] = name;
        });

        // Get turn order from TurnManager
        const turnOrder = room.turnManager ? room.turnManager.getPlayerOrder() : Array.from(room.players.keys());

        room.players.forEach(p => {
            const opponentPlayersHands: Record<string, CardFace[]> = {};
            
            // Maintain turn order when building opponentHands
            const opponentIds = turnOrder.filter(id => id !== p.id);
            opponentIds.forEach(opId => {
                const op = room.players.get(opId);
                if (op) {
                    opponentPlayersHands[opId] = op.getHandCards().map(card => CardUtils.getInactiveFace(card, room.isLightSideActive));
                }
            });

            // Each player sees complete information about their hand (along with id of the cards)
            p.sendMessage({
                type: 'YOUR_HAND',
                hand: p.getHand()
            });

            p.sendMessage({
                type: 'OPPONENT_HAND',
                opponentHands: opponentPlayersHands,
                playerNames: playerNamesObj,
                turnOrder: turnOrder
            });
        });
    }

    public static playCard(room: GameRoom, player: Player, card: Card) {
        // Check if teleportation is in progress and this player is waiting for selection
        if (room.teleportationState && room.teleportationState.status === 'AWAITING_SELECTION' 
            && room.teleportationState.awaitingPlayerId === player.id) {
            player.sendMessage({
                type: 'ERROR',
                message: 'Cannot play cards while waiting for teleportation selection. Please select a card to teleport first.'
            });
            return;
        }

        // Check if entanglement selection is in progress
        if (room.entanglementState && room.entanglementState.status === 'AWAITING_SELECTION' 
            && room.entanglementState.awaitingPlayerId === player.id) {
            player.sendMessage({
                type: 'ERROR',
                message: 'Cannot play cards while waiting for entanglement selection. Please select 2 opponents to entangle first.'
            });
            return;
        }

        // Check if player is entangled and must play Measurement
        if (player.isEntangled) {
            const entanglementCheck = CardEffectEngine.checkEntangledPlayerTurn(room, player);
            if (entanglementCheck.mustPlayMeasurement) {
                const cardFacePlayed = CardUtils.getActiveFace(card, room.isLightSideActive);
                // If they're trying to play something other than Measurement, block it
                if (cardFacePlayed.value !== ActionCards.WildCard.Measurement) {
                    player.sendMessage({
                        type: 'ERROR',
                        message: 'You are entangled! You must play your Measurement card this turn.'
                    });
                    return;
                }
                // If they're playing Measurement, proceed (entanglement collapse will be handled in handleMeasurement)
            } else {
                // Entangled player without Measurement card - skip turn (only allow drawing)
                player.sendMessage({
                    type: 'ERROR',
                    message: 'You are entangled and do not have a Measurement card. Your turn is skipped. You can only draw a card.'
                });
                return;
            }
        }

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

            // Broadcast updated opponent hands to all players after card is played
            room.broadcastOpponentHands();

            // Check win condition - if player's hand is empty, they win
            if (player.getHandCards().length === 0) {
                GameManager.endGame(room, player);
                return;
            }

            // Entanglement card is handled separately (like teleportation)
            // For 2-player games, it automatically entangles both players (no selection needed)
            // For 3-4 player games, it requires selection modal
            if (cardFacePlayed.value == ActionCards.WildCard.Entanglement) {
                CardEffectEngine.handleCardEffect(card, room);
                // For 2-player games, entanglement is applied immediately in handleEntanglement
                // so we advance turn normally. For 3-4 player games, selection is required
                // so we don't advance turn yet (will advance after selection)
                if (room.players.size === 2) {
                    // Turn advances normally - handleEntanglement already applied the effect
                    GameManager.handleRoomUpdate(room, { advanceTurn: true });
                }
                // For 3-4 players, turn doesn't advance yet (waiting for selection)
                return;
            }

            // Teleportation card is handled separately
            if (cardFacePlayed.value == ActionCards.Light.Teleportation) {
                // Check if teleportation can be used before applying effect
                const opponents = Array.from(room.players.values()).filter(op => op.id !== player.id);
                const hasOpponentWithOneCard = opponents.some(op => op.getHandCards().length === 1);
                
                if (hasOpponentWithOneCard) {
                    // Return card to player's hand
                    player.getHand().addCard(card);
                    // Remove card from discard pile
                    room.discardPileManager.removeCardAtIndex(0, room.isLightSideActive);
                    
                    player.sendMessage({
                        type: 'YOUR_HAND',
                        hand: player.getHand()
                    });
                    player.sendMessage({
                        type: 'ERROR',
                        message: 'Cannot use Teleportation: An opponent only has one card remaining. You cannot take their last card.'
                    });
                    // Update discard pile top
                    room.broadcastTopOfDiscardPile();
                    // Advance turn since the card play was blocked
                    this.advanceTurn(room);
                    room.broadcastTopOfDrawPile();
                    return;
                }

                // Teleportation can proceed
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

    public static handleEntanglementSelection(room: GameRoom, player: Player, opponent1Id: string, opponent2Id: string) {
        const effectResult = CardEffectEngine.handleEntanglementSelection(room, player, opponent1Id, opponent2Id);
        GameManager.handleRoomUpdate(room, effectResult);
    }

    public static endGame(room: GameRoom, winner: Player): void {
        if (room.status === GameRoomStatus.FINISHED) {
            return; // Game already ended
        }

        room.status = GameRoomStatus.FINISHED;

        const winnerName = room.playerNames.get(winner.id) || winner.id.substring(0, 8);
        Logger.info("GAME_END", `Player ${winner.id} (${winnerName}) won the game in room: ${room.id}`);

        room.broadcast({
            type: 'GAME_END',
            winnerId: winner.id,
            winnerName: winnerName,
            message: `${winnerName} won the game!`
        });
    }

    private static handleRoomUpdate(room: GameRoom, effectResult: { advanceTurn: boolean }) {
        // Don't advance turn if game has ended
        if (room.status === GameRoomStatus.FINISHED) {
            return;
        }

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
        // Check if teleportation is in progress and this player is waiting for selection
        if (room.teleportationState && room.teleportationState.status === 'AWAITING_SELECTION' 
            && room.teleportationState.awaitingPlayerId === player.id) {
            player.sendMessage({
                type: 'ERROR',
                message: 'Cannot draw cards while waiting for teleportation selection. Please select a card to teleport first.'
            });
            return;
        }

        // Check if entanglement selection is in progress
        if (room.entanglementState && room.entanglementState.status === 'AWAITING_SELECTION' 
            && room.entanglementState.awaitingPlayerId === player.id) {
            player.sendMessage({
                type: 'ERROR',
                message: 'Cannot draw cards while waiting for entanglement selection. Please select 2 opponents to entangle first.'
            });
            return;
        }

        // Check if player is entangled - if they don't have Measurement, they must draw and skip turn
        if (player.isEntangled) {
            const entanglementCheck = CardEffectEngine.checkEntangledPlayerTurn(room, player);
            if (!entanglementCheck.mustPlayMeasurement) {
                // Entangled player without Measurement - draw 1 card and skip turn
                if (!room.drawPileManager.getRemainingCardCount()) {
                    player.sendMessage({ type: 'ERROR', message: 'No cards left in the deck' });
                    return;
                }

                let cardDrawn: Card = room.drawPileManager.drawCardFromTop(room.isLightSideActive)!;
                player.getHand().addCard(cardDrawn);
                let cardFaceDrawn: CardFace = CardUtils.getActiveFace(cardDrawn, room.isLightSideActive);
                const isMeasurementCard = cardFaceDrawn.value === ActionCards.WildCard.Measurement;
                
                Logger.info("CARD_DRAWN", `Entangled Player: ${player.id} drew a ${cardFaceDrawn.colour} ${cardFaceDrawn.value} card and skipped turn in room: ${room.id}.`);
                
                player.sendMessage({
                    type: 'CARD_DRAWN',
                    card: cardDrawn,
                    hand: player.getHandCards()
                });

                room.broadcast({
                    type: 'OPPONENT_DREW_CARD',
                    card: CardUtils.getInactiveFace(cardDrawn, room.isLightSideActive),
                    opponentId: player.id
                }, [player.id]);

                // Notify that entangled player drew and skipped turn
                const playerName = room.playerNames.get(player.id) || player.id.substring(0, 8);
                const notificationMessage = isMeasurementCard
                    ? `🔗 ${playerName} is entangled - drew Measurement card and skipped turn (must play it next turn!)`
                    : `🔗 ${playerName} is entangled - drew 1 card and skipped turn (must play Measurement if available)`;
                    
                room.broadcast({
                    type: 'ENTANGLEMENT_NOTIFICATION',
                    message: notificationMessage,
                    notificationType: 'skip'
                });

                room.broadcastOpponentHands();
                room.broadcastTopOfDrawPile();
                
                // Skip turn - advance to next player
                this.advanceTurn(room);
                room.broadcastTopOfDiscardPile();
                return;
            }
            // If they have Measurement, they must play it (handled in playCard)
        }

        if (!room.drawPileManager.getRemainingCardCount()) {
            player.sendMessage({ type: 'ERROR', message: 'No cards left in the deck' });
            return;
        }

        let cardDrawn: Card = room.drawPileManager.drawCardFromTop(room.isLightSideActive)!;
        let turnChangeHandled: boolean = false;
        player.getHand().addCard(cardDrawn);
        let cardFaceDrawn: CardFace = CardUtils.getActiveFace(cardDrawn, room.isLightSideActive);
        Logger.info("CARD_DRAWN", `Player: ${player.id} drew a ${cardFaceDrawn.colour} ${cardFaceDrawn.value} card in room: ${room.id}.`);
        
        // If the card drawn can be played, prompt the user instead of auto-playing
        if (CardEffectEngine.checkValidMove(cardDrawn, room)) {
            // Store the drawn card in room state so we can play it later if user chooses
            room.drawnCardAwaitingDecision!.set(player.id, cardDrawn);
            
            // Send prompt to player
            player.sendMessage({
                type: 'PLAYABLE_CARD_DRAWN',
                card: cardDrawn,
                message: 'You drew a playable card! Would you like to play it or keep it?'
            });
            
            // Still send CARD_DRAWN to update hand, but don't advance turn yet
            player.sendMessage({
                type: 'CARD_DRAWN',
                card: cardDrawn,
                hand: player.getHandCards()
            });
            
            // Send the card drawn by the player to the opponents
            room.broadcast({
                type: 'OPPONENT_DREW_CARD',
                card: CardUtils.getInactiveFace(cardDrawn, room.isLightSideActive),
                opponentId: player.id
            }, [player.id]);
            
            // Broadcast updated opponent hands
            room.broadcastOpponentHands();
            return; // Don't advance turn yet - wait for user decision
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

        // Broadcast updated opponent hands to all players after card is drawn
        room.broadcastOpponentHands();

        // Change turn to next player
        if (!turnChangeHandled) {
            this.advanceTurn(room);
            // Send the new card on top of draw pile
            room.broadcastTopOfDrawPile();
            // Send the new card on top of discard pile
            room.broadcastTopOfDiscardPile();
        }
    }

    public static handleDrawnCardDecision(room: GameRoom, player: Player, decision: 'PLAY' | 'KEEP') {
        const drawnCard = room.drawnCardAwaitingDecision?.get(player.id);
        if (!drawnCard) {
            player.sendMessage({ type: 'ERROR', message: 'No drawn card awaiting decision' });
            return;
        }

        // Remove from awaiting decision map
        room.drawnCardAwaitingDecision!.delete(player.id);

        if (decision === 'PLAY') {
            // Play the drawn card
            this.playCard(room, player, drawnCard);
        } else {
            // Keep the card - just advance turn
            this.advanceTurn(room);
            room.broadcastTopOfDrawPile();
            room.broadcastTopOfDiscardPile();
        }
    }

    private static advanceTurn(room: GameRoom): void {
        if (!room.turnManager || room.status === GameRoomStatus.FINISHED) return;
        
        // Check if there are any entangled players
        const entangledPlayers = Array.from(room.players.values()).filter(p => p.isEntangled);
        
        if (entangledPlayers.length > 0 && entangledPlayers.length < room.players.size) {
            // If there are entangled players, only advance to entangled players
            const entangledPlayerIds = new Set(entangledPlayers.map(p => p.id));
            let nextPlayerId = room.turnManager.advanceTurn();
            let attempts = 0;
            const maxAttempts = room.players.size * 2; // Safety limit
            
            // Skip non-entangled players one by one
            while (!entangledPlayerIds.has(nextPlayerId) && attempts < maxAttempts) {
                // Broadcast that this player was skipped
                const skippedPlayer = room.players.get(nextPlayerId);
                if (skippedPlayer) {
                    const skippedPlayerName = room.playerNames.get(skippedPlayer.id) || skippedPlayer.id.substring(0, 8);
                    room.broadcast({
                        type: 'ENTANGLEMENT_NOTIFICATION',
                        message: `⏭️ ${skippedPlayerName} skipped (not entangled) - only entangled players can play`,
                        notificationType: 'skip'
                    });
                }
                nextPlayerId = room.turnManager.advanceTurn();
                attempts++;
            }
            
            if (attempts >= maxAttempts) {
                Logger.error(`advanceTurn: Could not find entangled player after ${maxAttempts} attempts in room: ${room.id}`);
                // Fallback to normal turn
                nextPlayerId = room.turnManager.getCurrentPlayerId();
            }
            
            room.broadcast({
                type: 'TURN_CHANGED',
                currentPlayer: nextPlayerId,
                direction: room.turnManager.getDirection()
            });
        } else {
            // Normal turn advancement when no entanglement or all players are entangled
            const nextPlayer = room.turnManager.advanceTurn();
            room.broadcast({
                type: 'TURN_CHANGED',
                currentPlayer: nextPlayer,
                direction: room.turnManager.getDirection()
            });
        }
    }
}
