import { CardUtils } from "../utils/CardUtils";
import { Card } from "./Card";

export class Hand {
    cards: Card[];

    constructor() {
        this.cards = [];
    }

    removeCard(cardToBeRemoved: Card, isLightSideActive?: boolean) {
        this.cards = this.cards.filter(card => !CardUtils.areCardsEqual(cardToBeRemoved, card, isLightSideActive))
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