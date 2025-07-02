import { CardUtils } from "../utils/CardUtils";
import { Card } from "./Card";

export class Hand {
    cards: Card[];

    constructor() {
        this.cards = [];
    }

    removeCard(cardToBeRemoved: Card) {
        this.cards = this.cards.filter(card => !CardUtils.areCardsEqual(cardToBeRemoved, card))
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