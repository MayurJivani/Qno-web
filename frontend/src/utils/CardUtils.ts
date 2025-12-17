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
          return (
            cardA?.lightSide?.colour === cardB?.lightSide?.colour &&
            cardA?.lightSide?.value === cardB?.lightSide?.value
          );
        } else {
          return (
            cardA?.darkSide?.colour === cardB?.darkSide?.colour &&
            cardA?.darkSide?.value === cardB?.darkSide?.value
          );
        }
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

    // Format card value for display - replace underscores, handle special cases
    static formatCardValue(value: string): string {
        // Replace underscores with spaces
        let formatted = value.replace(/_/g, ' ');
        
        // Handle special cases for better readability with line breaks for long words
        formatted = formatted
            .replace(/Colour Superposition/gi, 'Colour\nSuperposition')
            .replace(/Color Superposition/gi, 'Color\nSuperposition')
            .replace(/Teleportation/gi, 'Teleport\nation')
            .replace(/Measurement/gi, 'Measure\nment')
            .replace(/Entanglement/gi, 'Entangle\nment');
        
        // For single long words, try to break them intelligently
        if (formatted.indexOf('\n') === -1 && formatted.length > 10) {
            // Find a good breaking point (prefer breaking at capital letters or after midpoint)
            const midPoint = Math.floor(formatted.length / 2);
            let breakPoint = midPoint;
            
            // Try to find a space near the midpoint
            const spaceBefore = formatted.lastIndexOf(' ', midPoint);
            const spaceAfter = formatted.indexOf(' ', midPoint);
            
            if (spaceBefore > 0 && (midPoint - spaceBefore) < (spaceAfter - midPoint || Infinity)) {
                breakPoint = spaceBefore;
            } else if (spaceAfter > 0) {
                breakPoint = spaceAfter;
            } else {
                // No space found, break at midpoint or before a capital letter
                for (let i = midPoint; i > 0; i--) {
                    if (formatted[i] >= 'A' && formatted[i] <= 'Z') {
                        breakPoint = i;
                        break;
                    }
                }
            }
            
            if (breakPoint > 0 && breakPoint < formatted.length) {
                formatted = formatted.substring(0, breakPoint).trim() + '\n' + formatted.substring(breakPoint).trim();
            }
        }
        
        return formatted;
    }

    // Get font size based on card value length
    static getCardFontSize(value: string): string {
        const originalLength = value.length;
        const formatted = CardUtils.formatCardValue(value);
        const lines = formatted.split('\n').length;
        const maxLineLength = Math.max(...formatted.split('\n').map(line => line.length));
        
        // For numbers, use larger font
        if (!isNaN(Number(value))) {
            return 'text-2xl';
        }
        
        // For multi-line text
        if (lines > 1) {
            if (maxLineLength > 10) {
                return 'text-[9px] leading-tight';
            }
            return 'text-[10px] leading-tight';
        }
        
        // For single line text
        if (originalLength > 15) {
            return 'text-[9px]';
        } else if (originalLength > 12) {
            return 'text-[10px]';
        } else if (originalLength > 8) {
            return 'text-xs';
        } else {
            return 'text-sm';
        }
    }
}