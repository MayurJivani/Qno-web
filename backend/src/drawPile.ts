import { Card } from "./models/Card";
import { CardFace } from "./enums/cards/CardFace";
import { Colours } from "./enums/cards/Colours";
import { ActionCards } from "./enums/cards/ActionCards";

// Constants and variables
const lightSideColours: string[] = [
	Colours.Light.Blue,
	Colours.Light.Green,
	Colours.Light.Red,
	Colours.Light.Yellow,
];
const lightSideActionCards: string[] = [
	ActionCards.Light.Pauli_X,
	ActionCards.Light.Pauli_Z,
];
const darkSideColours: string[] = [
	Colours.Dark.Orange,
	Colours.Dark.Pink,
	Colours.Dark.Purple,
	Colours.Dark.Teal,
];
const darkSideActionCards: string[] = [
	ActionCards.Dark.Pauli_Y,
	ActionCards.Dark.Teleportation,
];



// Helper function that creates a CardFace object and adds it to a list
function addCardFace(cardFacesList: CardFace[], colour: string, number: string): void {
	const newCardFace: CardFace = {
		colour: colour,
		number: number,
	};
	cardFacesList.push(newCardFace);
}

// Helper function that shuffles an array randomly
export function Shuffle<T>(array: T[]): void {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]]; // Swap elements
	}
}

// Function to generate complete card deck
export function generateDrawPile(): Card[] {

	const drawPile: Card[] = [];

	const lightSideCardFaces: CardFace[] = generateLightSideCardFaces();
	const darkSideCardFaces: CardFace[] = generateDarkSideCardFaces();

	Shuffle(lightSideCardFaces);
	Shuffle(darkSideCardFaces);

	//No. of light side card faces should be equal to number of dark side card faces ideally
	let noOfCardFaces: number = lightSideCardFaces.length;

	for (let i = 0; i < noOfCardFaces; i++) {
		let lightSideCardFace: CardFace = lightSideCardFaces[i];
		let darkSideCardFace: CardFace = darkSideCardFaces[i];

		let card: Card = new Card(lightSideCardFace, darkSideCardFace);
		drawPile.push(card);
	}

	Shuffle(drawPile);
	return drawPile;
}

function generateLightSideCardFaces(): CardFace[] {

	const lightSideCardFaces: CardFace[] = [];
	//Generating light side card faces with number 0-9
	for (let i = 0; i <= 9; i++) {
		for (let j = 0; j < lightSideColours.length; j++) {
			addCardFace(lightSideCardFaces, lightSideColours[j], i.toString());
			//only 1 card of each colour with number 0, 2 cards of each colour for the rest of the numbers (1-9)
			if (i != 0) {
				addCardFace(lightSideCardFaces, lightSideColours[j], i.toString());
			}
		}
	}

	//Generating light side action card faces
	for (let i = 0; i < lightSideActionCards.length; i++) {
		for (let j = 0; j < lightSideColours.length; j++) {
			//two action card of each type and colour
			addCardFace(lightSideCardFaces, lightSideColours[j], lightSideActionCards[i]);
			addCardFace(lightSideCardFaces, lightSideColours[j], lightSideActionCards[i]);
		}
	}

	//Generating wild action cards of black colour for the light side card faces
	for (let i = 0; i < 8; i++) {
		//8 entaglement cards
		addCardFace(lightSideCardFaces, Colours.WildCard.Black, ActionCards.WildCard.Entanglement
		);
		//4 measurement and colour superposition cards
		if (2 * i < 8) {
			addCardFace(lightSideCardFaces, Colours.WildCard.Black, ActionCards.WildCard.Measurement);
			addCardFace(lightSideCardFaces, Colours.WildCard.Black, ActionCards.WildCard.Colour_Superposition);
		}
	}

	return lightSideCardFaces;
}

function generateDarkSideCardFaces(): CardFace[] {


	const darkSideCardFaces: CardFace[] = [];
	//Generating dark side card faces with number 0-9
	for (let i = 0; i <= 9; i++) {
		for (let j = 0; j < darkSideColours.length; j++) {
			addCardFace(darkSideCardFaces, darkSideColours[j], i.toString());
			//only 1 card of each colour with number 0, 2 cards of each colour for the rest of the numbers (1-9)
			if (i != 0) {
				addCardFace(darkSideCardFaces, darkSideColours[j], i.toString());
			}
		}
	}

	//Generating dark side action card faces
	for (let i = 0; i < darkSideActionCards.length; i++) {
		for (let j = 0; j < darkSideColours.length; j++) {
			//two action card of each type and colour
			addCardFace(darkSideCardFaces, darkSideColours[j], darkSideActionCards[i]);
			addCardFace(darkSideCardFaces, darkSideColours[j], darkSideActionCards[i]);
		}
	}

	//Generating wild action cards of black colour for the dark side card faces
	for (let i = 0; i < 8; i++) {
		//8 entaglement cards
		addCardFace(darkSideCardFaces, Colours.WildCard.Black, ActionCards.WildCard.Entanglement);
		//4 measurement and colour superposition cards
		if (2 * i < 8) {
			addCardFace(darkSideCardFaces, Colours.WildCard.Black, ActionCards.WildCard.Measurement);
			addCardFace(darkSideCardFaces, Colours.WildCard.Black, ActionCards.WildCard.Colour_Superposition);
		}
	}

	return darkSideCardFaces;
}

