import { CardFace } from "../enums/cards/CardFace";
import { Card } from "../models/Card";
import { CardUtils } from "../utils/CardUtils";

export class DiscardPileManager {
    private discardPile: Card[];

    constructor() {
        this.discardPile = [];
    }

    public addCardOnTop(card: Card, isLightSideActive: boolean): void {
        (isLightSideActive == true) ? this.discardPile.unshift(card) : this.discardPile.push(card);
    }

    // This function RETURNS the top card from the draw pile considering the active card face
    public getTopCard(isLightSideActive: boolean): Card | null {
        if (this.discardPile.length === 0) return null;
        return isLightSideActive ? this.discardPile[0] : this.discardPile[this.discardPile.length - 1];
    }

    public getActiveFaceOfTopCard(isLightSideActive: boolean): CardFace | null {
        const topCard = this.getTopCard(isLightSideActive);
        return topCard ? CardUtils.getActiveFace(topCard, isLightSideActive) : null;
    }

    public getCardBelowTopCard(isLightSideActive: boolean): Card | null {
        if (this.discardPile.length === 0) return null;
        return isLightSideActive ? this.discardPile[1] : this.discardPile[this.discardPile.length - 2];
    }

    public removeCardAtIndex(index: number, isLightSideActive: boolean): Card | null {
        if (index < 0 || index > this.discardPile.length - 1) return null;
        const cardRemoved: Card[] = isLightSideActive ? this.discardPile.splice(index, 1) : this.discardPile.splice((this.discardPile.length - 1) - index, 1);
        return cardRemoved[0];
    }

    public getDiscardPileCardCount(): number {
        return this.discardPile.length;
    }

    public getRawDiscardPile(): Card[] {
        return this.discardPile;
    }

}
