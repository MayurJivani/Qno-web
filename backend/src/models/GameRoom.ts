import { Player } from "./Player";
import { Card } from "./Card";
import { Status as PlayerStatus } from "../enums/player/Status";
import { Status as GameRoomStatus } from "../enums/gameRoom/Status";
import { DrawPileManager } from "../DrawPileManager";
import { TurnManager } from "../TurnManager";
import WebSocket from 'ws';
import { CardFace } from "../enums/cards/CardFace";
import { CardUtils } from "../utils/CardUtils";
import { CardEffectEngine } from "../CardEffectEngine";
import { DiscardPileManager } from "../DiscardPileManager";

export class GameRoom {
    id: string;
    players: Map<string, Player>;
    host: Player;
    isLightSideActive: boolean;
    status: GameRoomStatus;
    drawPileManager: DrawPileManager;
    discardPileManager: DiscardPileManager;
    turnManager?: TurnManager;

    constructor(id: string, host: Player) {
        this.id = id;
        this.players = new Map();
        this.host = host;
        this.isLightSideActive = true;
        this.drawPileManager = new DrawPileManager();
        this.discardPileManager = new DiscardPileManager();
        this.status = GameRoomStatus.NOT_STARTED;
        this.players.set(host.id, host);
    }

    addPlayer(player: Player, playerMap: Map<WebSocket, { roomId: string; playerId: string }>): void {
        if (this.players.size < 4 && this.status === GameRoomStatus.NOT_STARTED) {
            this.players.set(player.id, player);
            playerMap.set(player.socket, { roomId: this.id, playerId: player.id });
            player.sendMessage({ type: 'JOINED_ROOM', roomId: this.id, playerId: player.id });
            this.broadcast({ type: "NEW_PLAYER_JOINED", roomId: this.id, playerId: player.id }, player.id);
        } else {
            player.sendMessage({ type: 'ERROR', message: 'Room is full or not joinable' });
        }
    }

    removePlayer(playerId: string, rooms: Map<string, GameRoom>): void {
        this.players.delete(playerId);
        if (this.turnManager) {
            this.turnManager.removePlayer(playerId);
        }

        console.log(`[DISCONNECTED] Player: ${playerId} has left room: ${this.id}`);
        if (this.players.size === 0) {
            rooms.delete(this.id);
            console.log(`[ROOM_DELETED] Room: ${this.id} was deleted as there were no players left`);
        } else {
            this.broadcast({ type: 'PLAYER_LEFT', playerId });
        }
    }

    assignNewHost() {
        const remainingPlayers = Array.from(this.players.values());
        if (remainingPlayers.length > 0) {
            this.host = remainingPlayers[0];
            this.broadcast({ type: 'NEW_HOST', newHostId: this.host.id });
            console.log(`[NEW_HOST] Player: ${this.host.id} is now the new host of room: ${this.id}.`);
        }
    }

    broadcast(message: any, excludePlayerId?: string): void {
        this.players.forEach(player => {
            if (player.id !== excludePlayerId) {
                player.sendMessage(message);
            }
        });
    }

    allPlayersReady(): boolean {
        return this.players.size >= 2 && this.players.size <= 4 &&
            [...this.players.values()].every(p => p.status === PlayerStatus.READY);
    }

    canStartGame(playerId: string): boolean {
        return (playerId === this.host.id && this.allPlayersReady()) ? true : false;
    }

    startGame(): void {
        if (!this.allPlayersReady()) {
            console.warn(`[ERROR] Couldn't start game since all players aren't ready`);
            return;
        }

        if (this.status !== GameRoomStatus.NOT_STARTED) {
            console.warn(`[WARN] Attempted to start game in already started room: ${this.id}`);
            return;
        }

        this.status = GameRoomStatus.IN_PROGRESS;

        const playerIds = [...this.players.keys()];
        this.turnManager = new TurnManager(playerIds);

        this.broadcast({
            type: "GAME_STARTED",
            roomId: this.id,
            currentPlayer: this.getCurrentPlayerId(),
            direction: this.turnManager.getDirection(),
        });

        this.dealCards();
        const revealFirstCard: Card = this.drawPileManager.drawFirstNonActionCard(this.isLightSideActive)!;
        this.discardPileManager.addCardOnTop(revealFirstCard);
        // NOTE: After first card from draw pile is revealed, 93 cards would be remaining in the draw pile (assuming 2 players)
        // 7 + 7 (no. of cards in each players hand) + 1 (card revealed) + 93 = 108 total cards
        this.broadcastTopOfDrawPile();
        this.broadcastTopOfDiscardPile();
    }

    private dealCards(): void {
        for (let i = 0; i < 7; i++) {
            this.players.forEach(p => {
                if (this.drawPileManager.getRemainingCardCount() > 0) {
                    const card = this.drawPileManager.getRawDrawPile().shift();
                    if (card) p.hand.push(card);
                }
            });
        }

        this.players.forEach(p => {
            const opponentPlayersHands: Record<string, CardFace[]> = {};
            const opponents = Array.from(this.players.values()).filter(op => op.id !== p.id);

            opponents.forEach(op => {
                opponentPlayersHands[op.id] = op.hand.map(card => CardUtils.getInactiveFace(card, this.isLightSideActive));
            });

            p.sendMessage({
                type: 'YOUR_HAND',
                hand: p.hand
            });

            p.sendMessage({
                type: 'OPPONENT_HAND',
                opponentHands: opponentPlayersHands
            });
        });
    }

    playCard(player: Player, card: Card) {
        if (CardEffectEngine.checkValidMove(card, this)) {
            // Remove the card from the player's hand if it is a valid move
            player.hand = player.hand.filter(c => !CardUtils.areCardsEqual(c, card));
            this.discardPileManager.addCardOnTop(card); // Insert at the top of the discard pile
            let cardFacePlayed: CardFace = CardUtils.getActiveFace(card, this.isLightSideActive);

            player.sendMessage({
                type: 'PLAYED_CARD',
                card: cardFacePlayed,
                playerId: player.id
            })

            // Send the card played by the player to the opponents
            this.broadcast({
                type: 'OPPONENT_PLAYED_CARD',
                card: cardFacePlayed,
                opponentId: player.id // Pass the playerId of the person who drew the card
            }, player.id)

            console.log(`[PLAYED_CARD] Player: ${player.id} played a ${cardFacePlayed.colour} ${cardFacePlayed.value} card in room: ${this.id}.`);

            const effectResult = CardEffectEngine.handleCardEffect(card, player, this);
            if (effectResult.advanceTurn) {
                this.advanceTurn();
            }

            // Send the new card on top of draw pile
            this.broadcastTopOfDrawPile();
            // Send the new card on top of discard pile
            this.broadcastTopOfDiscardPile();
        }
        else {
            player.sendMessage({
                type: 'ERROR',
                message: 'Invalid move. Cannot play this card.'
            })
            return;
        }

    }

    drawCard(player: Player) {
        if (!this.drawPileManager.getRemainingCardCount()) {
            player.sendMessage({ type: 'ERROR', message: 'No cards left in the deck' });
            return;
        }

        let cardDrawn: Card = this.drawPileManager.drawCardFromTop(this.isLightSideActive)!;
        let turnChangeHandled: boolean = false;
        player.hand.push(cardDrawn);
        let cardFaceDrawn: CardFace = CardUtils.getActiveFace(cardDrawn, this.isLightSideActive);
        console.log(`[CARD_DRAWN] Player: ${player.id} drew a ${cardFaceDrawn.colour} ${cardFaceDrawn.value} card in room: ${this.id}.`);
        // If the card drawn can be played, play it forcefully
        if (CardEffectEngine.checkValidMove(cardDrawn, this)) {
            this.playCard(player, cardDrawn);
            turnChangeHandled = true;
        }

        // Send the card drawn to the current player along with their updated hand
        player.sendMessage({
            type: 'CARD_DRAWN',
            card: cardDrawn,
            hand: player.hand
        });

        // Send the card drawn by the player to the opponents
        this.broadcast({
            type: 'OPPONENT_DREW_CARD',
            card: CardUtils.getInactiveFace(cardDrawn, this.isLightSideActive),
            opponentId: player.id // Pass the playerId of the person who drew the card
        }, player.id);

        // Change turn to next player
        if (!turnChangeHandled) {
            this.advanceTurn();
            // Send the new card on top of draw pile
            this.broadcastTopOfDrawPile();
            // Send the new card on top of discard pile
            this.broadcastTopOfDiscardPile();
        }
    }

    getCurrentPlayerId(): string | undefined {
        return this.turnManager?.getCurrentPlayerId();
    }

    advanceTurn(): void {
        if (!this.turnManager) return;
        const nextPlayer = this.turnManager.advanceTurn();
        this.broadcast({ type: 'TURN_CHANGED', currentPlayer: nextPlayer });
    }

    // TODO: Move this out of GameRoom.ts and into CardEffectEngine
    reverseDirection(): void {
        if (!this.turnManager) return;
        this.turnManager.reverseDirection();
        this.broadcast({ type: 'DIRECTION_REVERSED', direction: this.turnManager.getDirection() });
    }

    // Check if room is not full and game hasn't started yet
    canJoin(): boolean {
        return this.players.size < 4 && (this.status == GameRoomStatus.NOT_STARTED) ? true : false;
    }

    sendTopOfDrawPile(player: Player): CardFace | null {
        const topCard: Card | null = this.drawPileManager.getTopCard(this.isLightSideActive);
        if (!topCard) {
            console.log('[ERROR] Failed to draw card, draw pile is empty');
            return null;
        }
        const faceToShow: CardFace = CardUtils.getInactiveFace(topCard, this.isLightSideActive);

        player.sendMessage({
            type: 'DRAW_PILE_TOP',
            card: faceToShow
        });

        return faceToShow;
    }

    broadcastTopOfDrawPile(): void {
        let cardOnTopOfDrawPile: CardFace;
        this.players.forEach(player => {
            cardOnTopOfDrawPile = this.sendTopOfDrawPile(player)!;
        });
        console.log(`[DRAW_PILE_TOP] New card face visible on top of draw pile is: ${cardOnTopOfDrawPile!.colour} ${cardOnTopOfDrawPile!.value} card in room: ${this.id}.`);
    }

    sendTopOfDiscardPile(player: Player): CardFace | null {
        const topCard: Card | null = this.discardPileManager.getTopCard(this.isLightSideActive);
        if (!topCard) {
            console.log('[ERROR] Failed to get card on top of discard pile, discard pile might be empty');
            return null;
        }
        const faceToShow: CardFace = CardUtils.getActiveFace(topCard, this.isLightSideActive);

        player.sendMessage({
            type: 'DISCARD_PILE_TOP',
            card: faceToShow
        });

        return faceToShow;
    }

    broadcastTopOfDiscardPile(): void {
        let cardOnTopOfDiscardPile: CardFace;
        this.players.forEach(player => {
            cardOnTopOfDiscardPile = this.sendTopOfDiscardPile(player)!;
        });
        console.log(`[DISCARD_PILE_TOP] New card face visible on top of discard pile is: ${cardOnTopOfDiscardPile!.colour} ${cardOnTopOfDiscardPile!.value} card in room: ${this.id}.`);
    }
}
