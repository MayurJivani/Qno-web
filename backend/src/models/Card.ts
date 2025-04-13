import { CardFace } from '../enums/cards/CardFace';

export class Card {
    lightSide: CardFace;
    darkSide: CardFace;

    constructor(lightSide: CardFace, darkSide: CardFace) {
        this.lightSide = lightSide;
        this.darkSide = darkSide;
    }
}
