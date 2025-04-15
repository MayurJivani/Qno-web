import { ActionCards } from "../enums/cards/ActionCards";
import { CardFace } from "../enums/cards/CardFace";
import { Card } from "../models/Card";

export class CardUtils {
    static lightSideActionCards: string[] = [
        ActionCards.Light.Pauli_X,
        ActionCards.Light.Pauli_Z,
    ];

    static darkSideActionCards: string[] = [
        ActionCards.Dark.Pauli_Y,
        ActionCards.Dark.Teleportation,
    ];

    static lightSideWildCards: string[] = [
        ActionCards.WildCard.Colour_Superposition,
        ActionCards.WildCard.Measurement,
        ActionCards.WildCard.Entanglement
    ]

    static darkSideWildCards: string[] = [
        ActionCards.WildCard.Colour_Superposition,
        ActionCards.WildCard.Measurement,
        ActionCards.WildCard.Superposition
    ]

    static areCardsEqual(cardA: Card, cardB: Card): boolean {
        return (cardA.lightSide.colour === cardB.lightSide.colour && cardA.lightSide.value === cardB.lightSide.value)
            && (cardA.darkSide.colour === cardB.darkSide.colour && cardA.darkSide.value === cardB.darkSide.value);
    }

    static isActionCard(cardFace: CardFace): boolean {

        const allActions = [
            ...CardUtils.lightSideActionCards,
            ...CardUtils.darkSideActionCards,
            ...CardUtils.lightSideWildCards,
            ...CardUtils.darkSideWildCards
        ];

        return allActions.includes(cardFace.value);
    }

    //active means the card face that is currently in play
    static getActiveFace(card: Card, isLightSideUp: boolean): CardFace {
        return isLightSideUp ? card.lightSide : card.darkSide;
    }

    //inactive means the card face that is currently not in play
    static getInactiveFace(card: Card, isLightSideUp: boolean): CardFace {
        return isLightSideUp ? card.darkSide : card.lightSide;
    }
}