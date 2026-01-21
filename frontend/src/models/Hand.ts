import { CardUtils } from "../utils/CardUtils";
import { Card } from "./Card";

export class Hand {
    cards: Card[];

    constructor() {
        this.cards = [];
    }

    removeCard(cardToBeRemoved: Card, isLightSideActive?: boolean) {
        // Use findIndex to ensure we only remove ONE card, not all matching cards
        const index = this.cards.findIndex(card => CardUtils.areCardsEqual(cardToBeRemoved, card, isLightSideActive));
        if (index !== -1) {
            this.cards.splice(index, 1);
        }
    }

    addCard(cardToBeAdded: Card) {
        this.cards.push(cardToBeAdded);
    }

    getCards(): Card[] {
        return this.cards;
    }

    setCards(cards: Card[]) {
        this.cards = cards;
    }
}