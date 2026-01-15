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
            playerNames: playerNamesObj
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
                opponentHands: opponentPlayersHands,
                playerNames: playerNamesObj
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

        let cardFacePlayed: CardFace = CardUtils.getActiveFace(card, room.isLightSideActive);

        // If player is entangled, they can ONLY play Measurement card
        if (player.isEntangled) {
            // Entangled players can ONLY play Measurement card (on the entanglement pile)
            if (cardFacePlayed.value !== ActionCards.WildCard.Measurement) {
                player.sendMessage({
                    type: 'ERROR',
                    message: 'You are entangled! You can only play a Measurement card to resolve the entanglement.'
                });
                return;
            }
            
            // Measurement card is played on the entanglement pile, not the main discard pile
            player.setHandCards(player.getHandCards().filter(c => !CardUtils.areCardsEqual(c, card)));
            
            // Add Measurement card to the entanglement pile
            room.addToEntanglementPile(card);
            
            player.sendMessage({
                type: 'PLAYED_CARD',
                card: cardFacePlayed,
                playerId: player.id,
                effect: ActionCards.WildCard.Measurement,
                onEntanglementPile: true
            });
            
            room.broadcast({
                type: 'OPPONENT_PLAYED_CARD',
                card: cardFacePlayed,
                opponentId: player.id,
                effect: ActionCards.WildCard.Measurement,
                onEntanglementPile: true
            }, [player.id]);
            
            Logger.info("PLAYED_CARD", `Player: ${player.id} played Measurement on entanglement pile in room: ${room.id}.`);
            
            room.broadcastEntanglementPile();
            
            CardEffectEngine.handleMeasurementOnEntanglement(room, player, card);
            return;
        }
        if (CardEffectEngine.checkValidMove(card, room, player)) {
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

            // If entanglement is active and this is a non-entangled player, update cardBeforeEntanglement
            // so other non-entangled players can continue playing on the new top card
            if (room.hasActiveEntanglement() && !player.isEntangled) {
                room.cardBeforeEntanglement = card;
            }

            // Broadcast updated opponent hands to all players after card is played
            room.broadcastOpponentHands();

            // Check win condition - if player's hand is empty, they win
            if (player.getHandCards().length === 0) {
                GameManager.endGame(room, player);
                return;
            }

            // Entanglement card is handled separately
            // The entanglement card goes to a separate pile, not the main discard pile
            // Other players continue playing on the card before entanglement
            if (cardFacePlayed.value == ActionCards.WildCard.Entanglement) {
                // Check if an entanglement is already active BEFORE doing anything
                if (room.hasActiveEntanglement()) {
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
                        message: 'Cannot play Entanglement: An entanglement is already active. Wait for it to be resolved first.'
                    });
                    
                    // Update discard pile top
                    room.broadcastTopOfDiscardPile();
                    room.broadcastOpponentHands();
                    
                    Logger.info("ENTANGLEMENT_BLOCKED", `Player ${player.id} tried to play Entanglement while one is already active in room: ${room.id}`);
                    return;
                }
                
                // Store the card that was on top before entanglement
                room.cardBeforeEntanglement = room.discardPileManager.getCardBelowTopCard(room.isLightSideActive);
                
                // Remove entanglement card from discard pile (it was just added there)
                room.discardPileManager.removeCardAtIndex(0, room.isLightSideActive);
                
                // Add entanglement card to the separate entanglement pile
                room.addToEntanglementPile(card);
                
                // Broadcast the correct discard pile top (the card before entanglement)
                room.broadcastTopOfDiscardPile();
                
                CardEffectEngine.handleCardEffect(card, room);
                
                // Broadcast the entanglement pile state
                room.broadcastEntanglementPile();
                
                // Turn advances normally - game continues for other players
                GameManager.handleRoomUpdate(room, { advanceTurn: true });
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

    public static endGame(room: GameRoom, winner: Player): void {
        if (room.status === GameRoomStatus.FINISHED) {
            return; // Game already ended
        }

        room.status = GameRoomStatus.FINISHED;

        const winnerName = room.playerNames.get(winner.id) || winner.id.substring(0, 8);
        Logger.info("GAME_END", `Player ${winnerName} (${winner.id}) won the game in room: ${room.id}`);

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

        if (!room.drawPileManager.getRemainingCardCount()) {
            player.sendMessage({ type: 'ERROR', message: 'No cards left in the deck' });
            return;
        }

        let cardDrawn: Card = room.drawPileManager.drawCardFromTop(room.isLightSideActive)!;
        let turnChangeHandled: boolean = false;
        player.getHand().addCard(cardDrawn);
        let cardFaceDrawn: CardFace = CardUtils.getActiveFace(cardDrawn, room.isLightSideActive);
        Logger.info("CARD_DRAWN", `Player: ${player.id} drew a ${cardFaceDrawn.colour} ${cardFaceDrawn.value} card in room: ${room.id}.`);
        
        // If player is entangled, their partner also draws a card (correlated drawing)
        if (player.isEntangled && player.entanglementPartner) {
            const partner = player.entanglementPartner;
            
            if (room.drawPileManager.getRemainingCardCount() > 0) {
                let partnerCardDrawn: Card = room.drawPileManager.drawCardFromTop(room.isLightSideActive)!;
                partner.getHand().addCard(partnerCardDrawn);
                let partnerCardFaceDrawn: CardFace = CardUtils.getActiveFace(partnerCardDrawn, room.isLightSideActive);
                
                Logger.info("CARD_DRAWN", `Entangled Partner: ${partner.id} also drew a ${partnerCardFaceDrawn.colour} ${partnerCardFaceDrawn.value} card (correlated) in room: ${room.id}.`);
                
                // Send updated hand to partner
                partner.sendMessage({
                    type: 'CARD_DRAWN',
                    card: partnerCardDrawn,
                    hand: partner.getHandCards()
                });
                
                // Broadcast to opponents that partner drew a card
                room.broadcast({
                    type: 'OPPONENT_DREW_CARD',
                    card: CardUtils.getInactiveFace(partnerCardDrawn, room.isLightSideActive),
                    opponentId: partner.id
                }, [partner.id]);
            }
        }
        
        // If the card drawn can be played, prompt the user instead of auto-playing
        // BUT: If it's an Entanglement card and there's already an active entanglement, don't prompt
        const isEntanglementCard = cardFaceDrawn.value === ActionCards.WildCard.Entanglement;
        const canActuallyPlay = CardEffectEngine.checkValidMove(cardDrawn, room, player) && 
                               !(isEntanglementCard && room.hasActiveEntanglement());
        
        if (canActuallyPlay) {
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
        const nextPlayer = room.turnManager.advanceTurn();
        room.broadcast({
            type: 'TURN_CHANGED',
            currentPlayer: nextPlayer,
            direction: room.turnManager.getDirection()
        });
    }
}
