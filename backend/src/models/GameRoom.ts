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
    public host: Player;
    public isLightSideActive: boolean;
    public status: GameRoomStatus;
    public drawPileManager: DrawPileManager;
    public discardPileManager: DiscardPileManager;
    public turnManager?: TurnManager;
    public teleportationState?: TeleportationState | null;

    constructor(id: string, host: Player) {
        this.id = id;
        this.players = new Map();
        this.host = host;
        this.isLightSideActive = true;
        this.drawPileManager = new DrawPileManager();
        this.discardPileManager = new DiscardPileManager();
        this.status = GameRoomStatus.NOT_STARTED;
        this.players.set(host.id, host);
        this.teleportationState = null;
    }

    public addPlayer(player: Player, playerMap: Map<WebSocket, { roomId: string; playerId: string }>): void {
        if (this.players.size < 4 && this.status === GameRoomStatus.NOT_STARTED) {
            this.players.set(player.id, player);
            playerMap.set(player.socket, { roomId: this.id, playerId: player.id });
            player.sendMessage({ type: 'JOINED_ROOM', roomId: this.id, playerId: player.id });
            this.broadcast({ type: "NEW_PLAYER_JOINED", roomId: this.id, playerId: player.id }, [player.id]);
        } else {
            player.sendMessage({ type: 'ERROR', message: 'Room is full or not joinable' });
        }
    }

    public removePlayer(playerId: string, rooms: Map<string, GameRoom>): void {
        this.players.delete(playerId);
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
        return (playerId === this.host.id && this.allPlayersReady()) ? true : false;
    }

    public getCurrentPlayerId(): string | undefined {
        return this.turnManager?.getCurrentPlayerId();
    }

    // Check if room is not full and game hasn't started yet
    public canJoin(): boolean {
        return this.players.size < 4 && (this.status == GameRoomStatus.NOT_STARTED) ? true : false;
    }

    private sendTopOfDrawPile(player: Player): CardFace | null {
        const topCard: Card | null = this.drawPileManager.getTopCard(this.isLightSideActive);
        if (!topCard) {
            Logger.error('Failed to get card on top of draw pile, draw pile is empty');
            return null;
        }
        const faceToShow: CardFace = CardUtils.getInactiveFace(topCard, this.isLightSideActive);

        player.sendMessage({
            type: 'DRAW_PILE_TOP',
            card: faceToShow
        });

        return faceToShow;
    }

    public broadcastTopOfDrawPile(): void {
        let cardOnTopOfDrawPile: CardFace;
        this.players.forEach(player => {
            cardOnTopOfDrawPile = this.sendTopOfDrawPile(player)!;
        });
        Logger.info("DRAW_PILE_TOP", `New card face visible on top of draw pile is: ${cardOnTopOfDrawPile!.colour} ${cardOnTopOfDrawPile!.value} card in room: ${this.id}.`);
    }

    private sendTopOfDiscardPile(player: Player): CardFace | null {
        const topCard: Card | null = this.discardPileManager.getTopCard(this.isLightSideActive);
        if (!topCard) {
            Logger.error('Failed to get card on top of discard pile, discard pile might be empty');
            return null;
        }
        const faceToShow: CardFace = CardUtils.getActiveFace(topCard, this.isLightSideActive);

        player.sendMessage({
            type: 'DISCARD_PILE_TOP',
            card: faceToShow
        });

        return faceToShow;
    }

    public broadcastTopOfDiscardPile(): void {
        let cardOnTopOfDiscardPile: CardFace;
        this.players.forEach(player => {
            cardOnTopOfDiscardPile = this.sendTopOfDiscardPile(player)!;
        });
        Logger.info("DISCARD_PILE_TOP", `New card face visible on top of discard pile is: ${cardOnTopOfDiscardPile!.colour} ${cardOnTopOfDiscardPile!.value} card in room: ${this.id}.`);
    }

    public getCurrentPlayer(): Player | undefined {
        return this.players.get(this.turnManager?.getCurrentPlayerId()!);
    }
}
