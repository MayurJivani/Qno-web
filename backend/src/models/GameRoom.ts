import { Player } from "./Player";
import { Card } from "./Card";
import { Status as PlayerStatus } from "../enums/player/Status";
import { Status as GameRoomStatus } from "../enums/gameRoom/Status";
import { generateDrawPile } from "../drawPile";
import WebSocket from 'ws';

export class GameRoom {
    id: string;
    players: Map<string, Player>;
    host: Player;
    isLightSideUp: boolean;
    drawPile: Card[];
    status: GameRoomStatus;

    constructor(id: string, host: Player) {
        this.id = id;
        this.players = new Map();
        this.host = host;
        this.isLightSideUp = true;
        this.drawPile = generateDrawPile();
        this.status = GameRoomStatus.NOT_STARTED;
        this.players.set(host.id, host);
    }

    addPlayer(player: Player, playerMap: Map<WebSocket, { roomId: string; playerId: string }>): void {
        if (this.players.size < 4 && this.status === GameRoomStatus.NOT_STARTED) {
            this.players.set(player.id, player);
            playerMap.set(player.socket, { roomId: this.id, playerId: player.id });
            player.sendMessage({ type: 'JOINED_ROOM', roomId: this.id, playerId: player.id });
        } else {
            player.sendMessage({ type: 'ERROR', message: 'Room is full or not joinable' });
        }
    }

    removePlayer(playerId: string, rooms: Map<string, GameRoom>): void {
        this.players.delete(playerId);
        console.log(`[DISCONNECTED] Player: ${playerId} has left room: ${this.id}`);
        if (this.players.size === 0) {
            rooms.delete(this.id);
            console.log(`[ROOM_DELETED] Room: ${this.id} was deleted as there were no players left`);
        }
    }

    broadcast(message: any, excludePlayerId?: string): void {
        this.players.forEach(player => {
            if (player.id !== excludePlayerId) {
                player.sendMessage(message);
            }
        });
    }

    allPlayersReady(): Boolean {
        //Check if Room has 2-4 players and if all players are ready before starting the game
        return this.players.size >= 2 && this.players.size <= 4 &&
            [...this.players.values()].every(p => p.status === PlayerStatus.READY);
    }
}
