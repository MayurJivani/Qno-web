import { CardFace } from '../enums/cards/CardFace';

export class Card {
    lightSide: CardFace;
    darkSide: CardFace;

    constructor(lightSide: CardFace, darkSide: CardFace) {
        this.lightSide = lightSide;
        this.darkSide = darkSide;
    }

    getActiveFace(isLightSideUp: boolean): CardFace {
        return isLightSideUp ? this.lightSide : this.darkSide;
    }

    getInactiveFace(isLightSideUp: boolean): CardFace {
        return isLightSideUp ? this.darkSide : this.lightSide;
    }
}
