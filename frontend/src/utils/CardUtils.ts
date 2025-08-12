import { ActionCards } from "../enums/cards/ActionCards";
import { CardFace } from "../enums/cards/CardFace";
import { Card } from "../models/Card";

export class CardUtils {
    static lightSideActionCards: string[] = [
        ActionCards.Light.Pauli_X,
        ActionCards.Light.Teleportation,
    ];

    static darkSideActionCards: string[] = [
        ActionCards.Dark.Pauli_Y,
        ActionCards.Dark.Pauli_Z,
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

    static areCardsEqual(
        cardA: Card, 
        cardB: Card, 
        isLightSideActive?: boolean
        
      ): boolean {
        console.log("cardA:     ", cardA)
        console.log("cardB: ",cardB)
        if (isLightSideActive === undefined) {
          // check both sides
          return (
            cardA?.lightSide?.colour === cardB?.lightSide?.colour &&
            cardA?.lightSide?.value === cardB?.lightSide?.value &&
            cardA?.darkSide?.colour === cardB?.darkSide?.colour &&
            cardA?.darkSide?.value === cardB?.darkSide?.value
          );
        }
      
        if (isLightSideActive) {
          if (
            cardA?.lightSide?.colour === cardB?.lightSide?.colour &&
            cardA?.lightSide?.value === cardB?.lightSide?.value
          ){
            console.log("light side same hai")
            return true;
          }
        } else {
          return (
            cardA?.darkSide?.colour === cardB?.darkSide?.colour &&
            cardA?.darkSide?.value === cardB?.darkSide?.value
          );
        }

        return false;
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
    static getActiveFace(card: Card, isLightSideUp: boolean): CardFace | undefined {
        return isLightSideUp ? card.lightSide : card.darkSide;
    }

    //inactive means the card face that is currently not in play
    static getInactiveFace(card: Card, isLightSideUp: boolean): CardFace | undefined {
        return isLightSideUp ? card.darkSide : card.lightSide;
    }

    static getInactiveFaceWithId(card: Card, isLightSideUp: boolean): Card {
        return isLightSideUp ? { id: card.id, darkSide: card.darkSide, lightSide: { colour: "", value: "" } } : { id: card.id, lightSide: card.lightSide, darkSide: { colour: "", value: "" } }
    }
}