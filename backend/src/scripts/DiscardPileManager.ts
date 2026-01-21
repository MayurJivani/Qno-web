import { CardFace } from "../enums/cards/CardFace";
import { Card } from "../models/Card";
import { CardUtils } from "../utils/CardUtils";

export class DiscardPileManager {
    private discardPile: Card[];

    constructor() {
        this.discardPile = [];
    }

    // Reset the discard pile (for new game)
    public reset(): void {
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
        
        // Get the actual index considering light/dark side orientation
        const actualIndex = isLightSideActive ? index : (this.discardPile.length - 1) - index;
        
        // Get the card to move
        const cardToMove = this.discardPile[actualIndex];
        if (!cardToMove) return null;
        
        // Remove the card from its current position
        this.discardPile.splice(actualIndex, 1);
        
        // Calculate middle index (considering the array is now one element shorter)
        const middleIndex = Math.floor(this.discardPile.length / 2);
        
        // Insert the card at the middle position
        this.discardPile.splice(middleIndex, 0, cardToMove);
        
        return cardToMove;
    }

    public getDiscardPileCardCount(): number {
        return this.discardPile.length;
    }

    public getRawDiscardPile(): Card[] {
        return this.discardPile;
    }

    // Insert card in the middle of the discard pile
    public insertCardInMiddle(card: Card, isLightSideActive: boolean): void {
        const middleIndex = Math.floor(this.discardPile.length / 2);
        if (isLightSideActive) {
            this.discardPile.splice(middleIndex, 0, card);
        } else {
            // For dark side, insert from the end
            const reverseIndex = this.discardPile.length - middleIndex;
            this.discardPile.splice(reverseIndex, 0, card);
        }
    }

    // Extract cards for reshuffling into draw pile
    // Keeps top and bottom cards, returns middle cards to be shuffled into draw pile
    public extractCardsForReshuffle(isLightSideActive: boolean): Card[] {
        // Need at least 3 cards to extract middle cards (top + bottom + at least 1 middle)
        if (this.discardPile.length <= 2) {
            return [];
        }

        let cardsToReshuffle: Card[] = [];

        if (isLightSideActive) {
            // Light side: top is index 0, bottom is last index
            // Keep index 0 (top) and last index (bottom), extract everything in between
            const topCard = this.discardPile[0];
            const bottomCard = this.discardPile[this.discardPile.length - 1];
            cardsToReshuffle = this.discardPile.slice(1, -1); // Get middle cards
            this.discardPile = [topCard, bottomCard]; // Keep only top and bottom
        } else {
            // Dark side: top is last index, bottom is index 0
            // Keep last index (top) and index 0 (bottom), extract everything in between
            const topCard = this.discardPile[this.discardPile.length - 1];
            const bottomCard = this.discardPile[0];
            cardsToReshuffle = this.discardPile.slice(1, -1); // Get middle cards
            this.discardPile = [bottomCard, topCard]; // Keep only bottom and top (in correct order)
        }

        return cardsToReshuffle;
    }

}
