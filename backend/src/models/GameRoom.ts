import WebSocket from 'ws';
import { DiscardPileManager } from "../scripts/DiscardPileManager";
import { DrawPileManager } from "../scripts/DrawPileManager";
import { CardFace } from "../enums/cards/CardFace";
import { Status as GameRoomStatus } from "../enums/gameRoom/Status";
import { Status as PlayerStatus } from "../enums/player/Status";
import { TurnManager } from "../scripts/TurnManager";
import { CardUtils } from "../utils/CardUtils";
import { Logger } from "../utils/Logger";
import { Card } from "./Card";
import { Player } from "./Player";
import { TeleportationState } from './interfaces/TeleportationState';

export class GameRoom {
    public id: string;
    public players: Map<string, Player>;
    public playerNames: Map<string, string>;
    public host: Player;
    public isLightSideActive: boolean;
    public status: GameRoomStatus;
    public drawPileManager: DrawPileManager;
    public discardPileManager: DiscardPileManager;
    public turnManager?: TurnManager;
    public teleportationState?: TeleportationState | null;
    public drawnCardAwaitingDecision?: Map<string, Card>;
    public entanglementState?: { awaitingPlayerId: string; status: 'AWAITING_SELECTION' | 'COMPLETED' } | null;
    // Separate pile for entanglement cards - stores the entanglement card while entanglement is active
    public entanglementPile: Card[];
    // Store the card that was on top of discard pile when entanglement was played
    public cardBeforeEntanglement?: Card | null;
    // Store the card that was on top of discard pile when superposition was played
    public cardBeforeSuperposition?: Card | null;
    // Track disconnected players with their reconnection timers
    public disconnectedPlayers: Map<string, { 
        playerId: string; 
        sessionToken: string; 
        timer: ReturnType<typeof setTimeout>;
        disconnectedAt: number;
    }>;

    constructor(id: string, host: Player) {
        this.id = id;
        this.players = new Map();
        this.playerNames = new Map();
        this.host = host;
        this.isLightSideActive = true;
        this.drawPileManager = new DrawPileManager();
        this.discardPileManager = new DiscardPileManager();
        this.status = GameRoomStatus.NOT_STARTED;
        this.players.set(host.id, host);
        this.playerNames.set(host.id, host.name);
        this.teleportationState = null;
        this.drawnCardAwaitingDecision = new Map();
        this.entanglementState = null;
        this.entanglementPile = [];
        this.cardBeforeEntanglement = null;
        this.cardBeforeSuperposition = null;
        this.disconnectedPlayers = new Map();
    }

    public addPlayer(player: Player, playerMap: Map<WebSocket, { roomId: string; playerId: string }>): void {
        if (this.players.size < 4 && this.status === GameRoomStatus.NOT_STARTED) {
            this.players.set(player.id, player);
            this.playerNames.set(player.id, player.name);
            playerMap.set(player.socket, { roomId: this.id, playerId: player.id });
            
            // Build list of existing players with their ready states
            const existingPlayers = Array.from(this.players.entries()).map(([id, p]) => ({
                id,
                name: p.name,
                isReady: p.isReady(),
                isHost: this.host.id === id
            }));
            
            // Send JOINED_ROOM with full player list to the new player
            player.sendMessage({ 
                type: 'JOINED_ROOM', 
                roomId: this.id, 
                playerId: player.id,
                players: existingPlayers,
                hostId: this.host.id
            });
            
            // Notify other players about the new player
            this.broadcast({ type: "NEW_PLAYER_JOINED", roomId: this.id, playerId: player.id, playerName: player.name }, [player.id]);
        } else {
            player.sendMessage({ type: 'ERROR', message: 'Room is full or not joinable' });
        }
    }

    public removePlayer(playerId: string, rooms: Map<string, GameRoom>): void {
        this.players.delete(playerId);
        this.playerNames.delete(playerId);
        if (this.turnManager) {
            this.turnManager.removePlayer(playerId);
        }

        Logger.info("DISCONNECTED", `Player: ${playerId} has left room: ${this.id}`);
        if (this.players.size === 0) {
            rooms.delete(this.id);
            Logger.info("ROOM_DELETED", `Room: ${this.id} was deleted as there were no players left`);
        } else {
            this.broadcast({ type: 'PLAYER_LEFT', playerId });
        }
    }

    public startTurnManager(): void {
        const playerIds = [...this.players.keys()];
        this.turnManager = new TurnManager(playerIds);
    }

    // If and when the host of the game room leaves, assign a new player as the host
    public assignNewHost() {
        const remainingPlayers = Array.from(this.players.values());
        if (remainingPlayers.length > 0) {
            this.host = remainingPlayers[0];
            this.broadcast({ type: 'NEW_HOST', newHostId: this.host.id });
            Logger.info("NEW_HOST", `Player: ${this.host.id} is now the new host of room: ${this.id}.`);
        }
    }

    // Reset the game room for a new game (flushes all game state while keeping players)
    public resetForNewGame(): void {
        Logger.info("GAME_RESET", `Resetting game state for room: ${this.id}`);

        // Reset draw pile with fresh deck
        this.drawPileManager.reset();

        // Clear discard pile
        this.discardPileManager.reset();

        // Clear all player hands and reset their status
        this.players.forEach(player => {
            player.getHand().setCards([]);
            player.markNotReady();
            player.isEntangled = false;
            player.entanglementPartner = null;
            player.entanglementInitiator = null;
        });

        // Reset game state
        this.isLightSideActive = true;
        this.status = GameRoomStatus.NOT_STARTED;
        this.turnManager = undefined;
        this.teleportationState = null;
        this.drawnCardAwaitingDecision = new Map();
        this.entanglementState = null;
        this.entanglementPile = [];
        this.cardBeforeEntanglement = null;
        this.cardBeforeSuperposition = null;

        // Notify all players about the reset
        this.broadcast({
            type: 'GAME_RESET',
            message: 'Game has been reset. Ready up to start a new game!',
            roomId: this.id
        });

        Logger.info("GAME_RESET", `Game state reset complete for room: ${this.id}`);
    }

    public broadcast(message: any, excludePlayerId: string[] = []): void {
        this.players.forEach(player => {
            if (!excludePlayerId.includes(player.id)) {
                player.sendMessage(message);
            }
        });
    }

    public allPlayersReady(): boolean {
        return this.players.size >= 2 && this.players.size <= 4 &&
            [...this.players.values()].every(p => p.status === PlayerStatus.READY);
    }

    public canStartGame(playerId: string): boolean {
        return playerId === this.host.id && this.allPlayersReady();
    }

    public getCurrentPlayerId(): string | undefined {
        return this.turnManager?.getCurrentPlayerId();
    }

    // Check if room is not full and game hasn't started yet
    public canJoin(): boolean {
        return this.players.size < 4 && this.status === GameRoomStatus.NOT_STARTED;
    }

    // Mark a player as disconnected and start grace period timer
    public markPlayerDisconnected(
        playerId: string, 
        onTimeout: () => void,
        gracePeriodMs: number = 30000
    ): void {
        const player = this.players.get(playerId);
        if (!player) return;

        player.isDisconnected = true;
        
        // Clear any existing timer for this player
        const existing = this.disconnectedPlayers.get(playerId);
        if (existing) {
            clearTimeout(existing.timer);
        }

        const timer = setTimeout(() => {
            onTimeout();
        }, gracePeriodMs);

        this.disconnectedPlayers.set(playerId, {
            playerId,
            sessionToken: player.sessionToken,
            timer,
            disconnectedAt: Date.now()
        });

        Logger.info("PLAYER_DISCONNECTED", `Player: ${playerId} disconnected. Grace period started (${gracePeriodMs / 1000}s) in room: ${this.id}`);
        
        // Notify other players
        this.broadcast({ 
            type: 'PLAYER_DISCONNECTED', 
            playerId, 
            playerName: player.name,
            gracePeriodMs 
        }, [playerId]);
    }

    // Check if a player can reconnect (matching playerId and sessionToken)
    public canPlayerReconnect(playerId: string, sessionToken: string): boolean {
        const disconnectedInfo = this.disconnectedPlayers.get(playerId);
        if (!disconnectedInfo) {
            // Player might still be in the room but not marked as disconnected
            const player = this.players.get(playerId);
            return player !== undefined && player.sessionToken === sessionToken;
        }
        return disconnectedInfo.sessionToken === sessionToken;
    }

    // Reconnect a player - cancel timer and restore their socket
    public reconnectPlayer(playerId: string, newSocket: WebSocket, playerMap: Map<WebSocket, { roomId: string; playerId: string }>): Player | null {
        const player = this.players.get(playerId);
        if (!player) return null;

        // Clear the disconnect timer
        const disconnectedInfo = this.disconnectedPlayers.get(playerId);
        if (disconnectedInfo) {
            clearTimeout(disconnectedInfo.timer);
            this.disconnectedPlayers.delete(playerId);
        }

        // Update player's socket
        player.updateSocket(newSocket);
        playerMap.set(newSocket, { roomId: this.id, playerId });

        Logger.info("PLAYER_RECONNECTED", `Player: ${playerId} reconnected to room: ${this.id}`);

        // Notify other players
        this.broadcast({ 
            type: 'PLAYER_RECONNECTED', 
            playerId,
            playerName: player.name 
        }, [playerId]);

        return player;
    }

    // Permanently remove a disconnected player (timeout expired)
    public removeDisconnectedPlayer(playerId: string, rooms: Map<string, GameRoom>): void {
        const player = this.players.get(playerId);
        if (!player) return;

        // Get the player's cards before removing
        const playerCards = player.getHandCards();
        
        // Clear the disconnect timer if it exists
        const disconnectedInfo = this.disconnectedPlayers.get(playerId);
        if (disconnectedInfo) {
            clearTimeout(disconnectedInfo.timer);
            this.disconnectedPlayers.delete(playerId);
        }

        // Clear entanglement if the player was entangled
        if (player.isEntangled && player.entanglementPartner) {
            player.entanglementPartner.clearEntanglement();
            // Clear the entanglement pile and restore normal play
            this.entanglementPile = [];
            this.cardBeforeEntanglement = null;
        }

        // Remove player from the game
        this.players.delete(playerId);
        this.playerNames.delete(playerId);
        if (this.turnManager) {
            this.turnManager.removePlayer(playerId);
        }

        // Shuffle the player's cards back into the draw pile
        if (playerCards.length > 0) {
            this.drawPileManager.addCardsAndShuffle(playerCards);
            Logger.info("CARDS_RECYCLED", `${playerCards.length} cards from player ${playerId} shuffled back into draw pile in room: ${this.id}`);
        }

        Logger.info("PLAYER_REMOVED", `Player: ${playerId} permanently removed from room: ${this.id} after timeout`);

        // Check if room should be deleted
        if (this.players.size === 0) {
            rooms.delete(this.id);
            Logger.info("ROOM_DELETED", `Room: ${this.id} was deleted as there were no players left`);
            return;
        }

        // If only 1 player left during a game, that player wins
        if (this.status === GameRoomStatus.IN_PROGRESS && this.players.size === 1) {
            const winner = Array.from(this.players.values())[0];
            this.broadcast({ 
                type: 'GAME_OVER', 
                winnerId: winner.id, 
                winnerName: winner.name,
                reason: 'All other players left the game'
            });
            this.status = GameRoomStatus.FINISHED;
            return;
        }

        // Notify remaining players
        this.broadcast({ 
            type: 'PLAYER_LEFT_PERMANENTLY', 
            playerId,
            remainingPlayers: this.players.size,
            cardsRecycled: playerCards.length
        });

        // Broadcast updated draw pile top (since cards were added)
        this.broadcastTopOfDrawPile();

        // If it was this player's turn, advance to next player
        if (this.turnManager && this.turnManager.getCurrentPlayerId() === playerId) {
            // The turn manager already removed this player, so current player is now the next one
            const nextPlayerId = this.turnManager.getCurrentPlayerId();
            this.broadcast({ type: 'TURN_UPDATE', playerId: nextPlayerId });
        }
    }

    // Check if it's a disconnected player's turn
    public isDisconnectedPlayersTurn(): boolean {
        if (!this.turnManager) return false;
        const currentPlayerId = this.turnManager.getCurrentPlayerId();
        const currentPlayer = this.players.get(currentPlayerId);
        return currentPlayer?.isDisconnected ?? false;
    }

    // Get active (connected) player count
    public getActivePlayerCount(): number {
        return Array.from(this.players.values()).filter(p => !p.isDisconnected).length;
    }

    private sendTopOfDrawPile(player: Player): CardFace | null {
        const topCard: Card | null = this.drawPileManager.getTopCard(this.isLightSideActive);
        if (!topCard) {
            Logger.error('Failed to get card on top of draw pile, draw pile is empty');
            return null;
        }
        const faceToShow: CardFace | undefined = CardUtils.getInactiveFace(topCard, this.isLightSideActive);
        if (!faceToShow) {
            Logger.error('Failed to get inactive face of card on top of draw pile');
            return null;
        }

        player.sendMessage({
            type: 'DRAW_PILE_TOP',
            card: faceToShow
        });

        return faceToShow;
    }

    public broadcastTopOfDrawPile(): void {
        let cardOnTopOfDrawPile: CardFace | null = null;
        for (const player of this.players.values()) {
            const cardFace = this.sendTopOfDrawPile(player);
            if (cardFace && !cardOnTopOfDrawPile) {
                cardOnTopOfDrawPile = cardFace;
            }
        }
        if (cardOnTopOfDrawPile !== null) {
            const cardFace: CardFace = cardOnTopOfDrawPile; // Type narrowing helper
            Logger.info("DRAW_PILE_TOP", `New card face visible on top of draw pile is: ${cardFace.colour} ${cardFace.value} card in room: ${this.id}.`);
        }
    }

    private sendTopOfDiscardPile(player: Player): CardFace | null {
        // Normal case: show the top card of discard pile
        // (During entanglement, non-entangled players play cards that get added to the discard pile,
        // so we show the actual top card, not cardBeforeEntanglement)
        const cardToShow: Card | null = this.discardPileManager.getTopCard(this.isLightSideActive);
        
        if (!cardToShow) {
            Logger.error('Failed to get card on top of discard pile, discard pile might be empty');
            return null;
        }
        const faceToShow: CardFace | undefined = CardUtils.getActiveFace(cardToShow, this.isLightSideActive);
        if (!faceToShow) {
            Logger.error('Failed to get active face of card on top of discard pile');
            return null;
        }

        player.sendMessage({
            type: 'DISCARD_PILE_TOP',
            card: faceToShow
        });

        return faceToShow;
    }

    public broadcastTopOfDiscardPile(): void {
        let cardOnTopOfDiscardPile: CardFace | null = null;
        for (const player of this.players.values()) {
            const cardFace = this.sendTopOfDiscardPile(player);
            if (cardFace && !cardOnTopOfDiscardPile) {
                cardOnTopOfDiscardPile = cardFace;
            }
        }
        if (cardOnTopOfDiscardPile !== null) {
            const cardFace: CardFace = cardOnTopOfDiscardPile; // Type narrowing helper
            Logger.info("DISCARD_PILE_TOP", `New card face visible on top of discard pile is: ${cardFace.colour} ${cardFace.value} card in room: ${this.id}.`);
        }
    }

    public getCurrentPlayer(): Player | undefined {
        return this.players.get(this.turnManager?.getCurrentPlayerId()!);
    }

    public broadcastOpponentHands(): void {
        // Get turn order from TurnManager if available, otherwise use players Map order
        const turnOrder = this.turnManager ? this.turnManager.getPlayerOrder() : Array.from(this.players.keys());
        
        this.players.forEach(p => {
            const opponentPlayersHands: Record<string, CardFace[]> = {};
            const playerNamesObj: Record<string, string> = {};

            // Build playerNames object for all players
            this.playerNames.forEach((name, id) => {
                playerNamesObj[id] = name;
            });

            // Maintain turn order when building opponentHands
            const opponentIds = turnOrder.filter(id => id !== p.id);
            opponentIds.forEach(opId => {
                const op = this.players.get(opId);
                if (op) {
                    opponentPlayersHands[opId] = op.getHandCards().map(card => CardUtils.getInactiveFace(card, this.isLightSideActive));
                }
            });

            p.sendMessage({
                type: 'OPPONENT_HAND',
                opponentHands: opponentPlayersHands,
                playerNames: playerNamesObj,
                turnOrder: turnOrder
            });
        });
    }

    // Check if there's an active entanglement (cards in entanglement pile)
    public hasActiveEntanglement(): boolean {
        return this.entanglementPile.length > 0;
    }

    // Get the entangled player IDs
    public getEntangledPlayerIds(): string[] {
        return Array.from(this.players.values())
            .filter(p => p.isEntangled)
            .map(p => p.id);
    }

    // Add card to entanglement pile
    public addToEntanglementPile(card: Card): void {
        this.entanglementPile.push(card);
    }

    // Clear entanglement pile and return the cards
    public clearEntanglementPile(): Card[] {
        const cards = [...this.entanglementPile];
        this.entanglementPile = [];
        this.cardBeforeEntanglement = null;
        return cards;
    }

    // Broadcast entanglement pile state to all players
    public broadcastEntanglementPile(): void {
        const entangledPlayerIds = this.getEntangledPlayerIds();
        const entanglementCards = this.entanglementPile.map(card => 
            CardUtils.getActiveFace(card, this.isLightSideActive)
        );

        this.broadcast({
            type: 'ENTANGLEMENT_PILE_UPDATE',
            cards: entanglementCards,
            entangledPlayerIds: entangledPlayerIds,
            isActive: this.hasActiveEntanglement()
        });
    }

    // Ensure no action card is on top of discard pile - remove action cards until a non-action card is on top
    public ensureNonActionCardOnTop(): void {
        while (true) {
            const topCard = this.discardPileManager.getTopCard(this.isLightSideActive);
            if (!topCard) {
                // No cards left - draw a non-action card
                const newCard = this.drawPileManager.drawFirstNonActionCard(this.isLightSideActive);
                if (newCard) {
                    this.discardPileManager.addCardOnTop(newCard, this.isLightSideActive);
                }
                break;
            }
            
            const topCardFace = CardUtils.getActiveFace(topCard, this.isLightSideActive);
            if (!CardUtils.isActionCard(topCardFace)) {
                // Top card is not an action card - we're done
                break;
            }
            
            // Remove the action card from top
            this.discardPileManager.removeCardAtIndex(0, this.isLightSideActive);
            Logger.info("DISCARD_PILE", `Removed action card ${topCardFace.colour} ${topCardFace.value} from top of discard pile in room: ${this.id}`);
        }
    }
}
