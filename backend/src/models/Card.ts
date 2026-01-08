import { CardFace } from '../enums/cards/CardFace';

export class Card {
    id: number;
    lightSide: CardFace;
    darkSide: CardFace;

    constructor(id: number, lightSide: CardFace, darkSide: CardFace) {
        this.id = id;
        this.lightSide = lightSide;
        this.darkSide = darkSide;
    }
}
