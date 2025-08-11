import { ActionCards } from "../enums/cards/ActionCards";
import { CardFace } from "../enums/cards/CardFace";
import { Colours } from "../enums/cards/Colours";
import { Card } from "../models/Card";
import { CardUtils } from "../utils/CardUtils";

export class DrawPileManager {
	private drawPile: Card[] = [];

	constructor() {
		this.generateDrawPile();
	}

	private static lightSideColours: string[] = [
		Colours.Light.Blue,
		Colours.Light.Green,
		Colours.Light.Red,
		Colours.Light.Yellow,
	];
	private static lightSideActionCards: string[] = [
		ActionCards.Light.Pauli_X,
		ActionCards.Light.Teleportation,
	];
	private static darkSideColours: string[] = [
		Colours.Dark.Orange,
		Colours.Dark.Pink,
		Colours.Dark.Purple,
		Colours.Dark.Teal,
	];
	private static darkSideActionCards: string[] = [
		ActionCards.Dark.Pauli_Y,
		ActionCards.Dark.Pauli_Z,
	];

	private static addCardFace(cardFacesList: CardFace[], colour: string, value: string): void {
		const newCardFace: CardFace = { colour, value };
		cardFacesList.push(newCardFace);
	}

	private static shuffle<T>(array: T[]): void {
		for (let i = array.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[array[i], array[j]] = [array[j], array[i]];
		}
	}

	private generateDrawPile(): void {
		const light = DrawPileManager.generateLightSideCardFaces();
		const dark = DrawPileManager.generateDarkSideCardFaces();

		DrawPileManager.shuffle(light);
		DrawPileManager.shuffle(dark);

		const minLength = Math.min(light.length, dark.length);

		for (let i = 0; i < minLength; i++) {
			this.drawPile.push(new Card(i, light[i], dark[i]));
		}

		DrawPileManager.shuffle(this.drawPile);
	}

	// This function only RETURNS the top card from the draw pile
	public getTopCard(isLightSideActive: boolean): Card | null {
		if (this.drawPile.length === 0) return null;
		return isLightSideActive ? this.drawPile[0] : this.drawPile[this.drawPile.length - 1];
	}

	// This function REMOVES the top card from the draw pile
	public drawCardFromTop(isLightSideActive: boolean): Card | undefined {
		return isLightSideActive ? this.drawPile.shift() : this.drawPile.pop();
	}

	// This function RETURNS the visible card face of the card on top of the draw pile that is visible to all players
	public getVisibleTopCardFace(isLightSideActive: boolean): CardFace | null {
		const topCard = this.getTopCard(isLightSideActive);
		return topCard ? CardUtils.getInactiveFace(topCard, isLightSideActive) : null;
	}

	public getRemainingCardCount(): number {
		return this.drawPile.length;
	}

	public getRawDrawPile(): Card[] {
		return this.drawPile;
	}

	private static generateLightSideCardFaces(): CardFace[] {
		const faces: CardFace[] = [];

		//Generating light side card faces with number 0-9
		for (let i = 0; i <= 9; i++) {
			for (const colour of this.lightSideColours) {
				this.addCardFace(faces, colour, i.toString());
				//only 1 card of each colour with number 0, 2 cards of each colour for the rest of the numbers (1-9)
				if (i !== 0) this.addCardFace(faces, colour, i.toString());
			}
		}

		//Generating light side action card faces
		for (const action of this.lightSideActionCards) {
			//two action card of each type and colour
			for (const colour of this.lightSideColours) {
				this.addCardFace(faces, colour, action);
				this.addCardFace(faces, colour, action);
			}
		}

		//Generating wild action cards of black colour for the light side card faces
		for (let i = 0; i < 8; i++) {
			//8 colour superposition cards
			this.addCardFace(faces, Colours.WildCard.Black, ActionCards.WildCard.Colour_Superposition);
			if (2 * i < 8) {
				//4 measurement and entaglement cards
				this.addCardFace(faces, Colours.WildCard.Black, ActionCards.WildCard.Measurement);
				this.addCardFace(faces, Colours.WildCard.Black, ActionCards.WildCard.Entanglement);
			}
		}

		return faces;
	}

	private static generateDarkSideCardFaces(): CardFace[] {
		const faces: CardFace[] = [];

		//Generating dark side card faces with number 0-9
		for (let i = 0; i <= 9; i++) {
			//only 1 card of each colour with number 0, 2 cards of each colour for the rest of the numbers (1-9)
			for (const colour of this.darkSideColours) {
				this.addCardFace(faces, colour, i.toString());
				if (i !== 0) this.addCardFace(faces, colour, i.toString());
			}
		}

		//Generating dark side action card faces
		for (const action of this.darkSideActionCards) {
			for (const colour of this.darkSideColours) {
				//two action card of each type and colour
				this.addCardFace(faces, colour, action);
				this.addCardFace(faces, colour, action);
			}
		}

		//Generating wild action cards of black colour for the dark side card faces
		for (let i = 0; i < 8; i++) {
			//8 colour superposition cards
			this.addCardFace(faces, Colours.WildCard.Black, ActionCards.WildCard.Colour_Superposition);
			if (2 * i < 8) {
				//4 measurement and superposition cards
				this.addCardFace(faces, Colours.WildCard.Black, ActionCards.WildCard.Measurement);
				this.addCardFace(faces, Colours.WildCard.Black, ActionCards.WildCard.Superposition);
			}
		}

		return faces;
	}

	public drawFirstNonActionCard(isLightSideActive: boolean): Card | null {
		while (this.drawPile.length > 0) {
			const cardDrawn: Card = this.drawCardFromTop(isLightSideActive)!;
			const activeCardFaceDrawn: CardFace = CardUtils.getActiveFace(cardDrawn, isLightSideActive)!;
			if (CardUtils.isActionCard(activeCardFaceDrawn)) {
				isLightSideActive ? this.drawPile.push(cardDrawn) : this.drawPile.unshift(cardDrawn);
			} else {
				return cardDrawn;
			}
		}
		return null;
	}

}
