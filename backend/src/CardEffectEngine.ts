import { Card } from "./models/Card";
import { Player } from "./models/Player";
import { GameRoom } from "./models/GameRoom";
import { CardFace } from "./enums/cards/CardFace";
import { CardUtils } from "./utils/CardUtils";
import { Colours } from "./enums/cards/Colours";

export class CardEffectEngine {

    static handleCardEffect(card: Card, player: Player, room: GameRoom): { advanceTurn: boolean } {

        const cardFace: CardFace = CardUtils.getActiveFace(card, room.isLightSideActive);
        if (CardUtils.isActionCard(cardFace)) {
            this.applyEffect(cardFace, player, room);
            return { advanceTurn: true };
        }
        // For normal cards, no special handling is needed.
        return { advanceTurn: true };

    }

    static applyEffect(cardFace: CardFace, player: Player, room: GameRoom) {
        // Example logic for different effects
        switch (cardFace.value) {
            case "Pauli_X":
                this.handlePauliX(player, room);
                break;
            case "Teleportation":
                this.handleTeleportation(player, room);
                break;
            case "Measurement":
                this.handleMeasurement(player, room);
                break;
            // Add more cases as needed
            default:
                // No special effect, normal card
                break;
        }
    }

    static checkValidMove(cardPlayed: Card, room: GameRoom): boolean {
        const activeCardFaceOnTopOfDiscardPile: CardFace | null = room.discardPileManager.getActiveTopCardFace(room.isLightSideActive);
        const activeCardFacePlayed: CardFace = CardUtils.getActiveFace(cardPlayed, room.isLightSideActive)
        // If discard pile is empty i.e. no card has been played yet
        if (!activeCardFaceOnTopOfDiscardPile) {
            return true;
        } else {
            if ((activeCardFaceOnTopOfDiscardPile.colour == activeCardFacePlayed.colour) // If colour matches
                || (activeCardFaceOnTopOfDiscardPile.value == activeCardFacePlayed.value)// If value matches
                || (activeCardFacePlayed.colour == Colours.WildCard.Black)) {            // If card played is an action card 
                return true;
            }
        }
        return false;
    }

    private static handlePauliX(player: Player, room: GameRoom) {
        console.log(`[EFFECT] Pauli_X: Flipping light/dark side in room: ${room.id}`);
        room.isLightSideActive = !room.isLightSideActive;
        room.broadcast({
            type: "SIDE_FLIPPED",
            isLightSideActive: room.isLightSideActive,
        });
    }

    private static handleTeleportation(player: Player, room: GameRoom) {
        console.log(`[EFFECT] Teleportation: Changing turn order or skipping...`);
        // Example: maybe skip next player, or let player take another turn
        // Implement logic as needed
    }

    private static handleMeasurement(player: Player, room: GameRoom) {
        console.log(`[EFFECT] Measurement: Peeking opponent hand, or similar...`);
        // Implement effect
    }

    // Add more handlers as needed
}
