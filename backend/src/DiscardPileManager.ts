import { CardFace } from "./enums/cards/CardFace";
import { Card } from "./models/Card";
import { CardUtils } from "./utils/CardUtils";

export class DiscardPileManager {
    private discardPile: Card[];

    constructor() {
        this.discardPile = [];
    }

    public addCardOnTop(card: Card): void {
        this.discardPile.unshift(card);
    }

    // This function RETURNS the top card from the draw pile considering the active card face
    public getTopCard(isLightSideActive: boolean): Card | null {
        if (this.discardPile.length === 0) return null;
        return isLightSideActive ? this.discardPile[0] : this.discardPile[this.discardPile.length - 1];
    }

    public getActiveTopCardFace(isLightSideActive: boolean): CardFace | null {
        const topCard = this.getTopCard(isLightSideActive);
        return topCard ? CardUtils.getActiveFace(topCard, isLightSideActive) : null;
    }

    public getDiscardPileCardCount(): number {
        return this.discardPile.length;
    }

    public getRawDiscardPile(): Card[] {
        return this.discardPile;
    }

}
