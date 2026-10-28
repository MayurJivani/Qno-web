import { Direction } from "../enums/gameRoom/Direction";

export class TurnManager {
    private playerIds: string[];
    private currentIndex: number = 0;
    private direction: Direction = Direction.Clockwise;

    /** Who opens the game. Random in play; the test setup pins it so turn-order tests can say who goes first. */
    static pickStart = (players: number): number => Math.floor(Math.random() * players);

    constructor(playerIds: string[]) {
        this.playerIds = playerIds;
        this.currentIndex = TurnManager.pickStart(playerIds.length);
    }

    getCurrentPlayerId(): string {
        return this.playerIds[this.currentIndex];
    }

    advanceTurn(): string {
        const len = this.playerIds.length;
        this.currentIndex = (this.currentIndex + this.direction + len) % len;
        return this.getCurrentPlayerId();
    }

    reverseDirection(): void {
        this.direction = this.direction === Direction.Clockwise
            ? Direction.AntiClockwise
            : Direction.Clockwise;
    }

    removePlayer(playerId: string): void {
        const index = this.playerIds.indexOf(playerId);
        if (index === -1) return;

        this.playerIds.splice(index, 1);
        if (index < this.currentIndex || (index === this.currentIndex && this.currentIndex === this.playerIds.length)) {
            this.currentIndex--;
        }

        this.currentIndex = Math.max(0, this.currentIndex % this.playerIds.length);
    }

    getDirection(): Direction {
        return this.direction;
    }

    getPlayerOrder(): string[] {
        return [...this.playerIds];
    }
}
