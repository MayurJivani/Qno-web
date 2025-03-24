// deck.ts
export interface Card {
    cardId?: number;       // Make cardId optional for initialization
    cardColor: string;
    cardValue: string;
    cardSide: string;
}

// Constants and variables
const colorsLight = ['red', 'green', 'blue', 'yellow'];
const colorsDark = ['purple', 'pink', 'orange', 'teal'];
const cardValues = Array.from({ length: 10 }, (_, i) => i.toString()); // 0-9

const cardsLight: Card[] = [];
const cardsDark: Card[] = [];
const cardIdMap = new Map<string, number>();
let currentId = 1;

// Function to generate cards and assign IDs
function generateCards(colors: string[], isLightSide: boolean) {
    const cardSide = isLightSide ? "light" : "dark";
    const cards = isLightSide ? cardsLight : cardsDark;

    // 0 cards (1 card of 0 for each color)
    colors.forEach(color => {
        const card: Card = {
            cardId: currentId,
            cardColor: color,
            cardValue: "0",
            cardSide: cardSide
        };
        cards.push(card);
        cardIdMap.set(JSON.stringify(card), currentId);
        currentId++;
    });

    // 1-9 cards (2 cards for each number for each color)
    for (let value of cardValues.slice(1)) {
        colors.forEach(color => {
            for (let i = 0; i < 2; i++) { // 2 cards for each number
                const card: Card = {
                    cardColor: color,
                    cardValue: value,
                    cardSide: cardSide
                };

                // Check if the card already exists
                const key = JSON.stringify(card);
                if (cardIdMap.has(key)) {
                    // Use existing cardId
                    card.cardId = cardIdMap.get(key);
                } else {
                    // Assign new cardId and store it
                    card.cardId = currentId;
                    cardIdMap.set(key, currentId);
                    currentId++;
                }

                cards.push(card);
            }
        });
    }

    // Special cards
    const specialCards = isLightSide ? [
        { name: "Entanglement", count: 8, color: "black" },
        { name: "Measurement", count: 4, color: "black" },
        { name: "Colour Superposition", count: 4, color: "black" },
        { name: "Pauli X", count: 2, color: colors }, // 2 cards for each Light Side Color
        { name: "Pauli Z", count: 2, color: colors }  // 2 cards for each Light Side Color
    ] : [
        { name: "Superposition", count: 8, color: "black" },
        { name: "Measurement", count: 4, color: "black" },
        { name: "Colour Superposition", count: 4, color: "black" },
        { name: "Pauli Y", count: 2, color: colors }, // 2 cards for each Dark Side Color
        { name: "Teleportation", count: 2, color: colors } // 2 cards for each Dark Side Color
    ];

    specialCards.forEach(({ name, count, color }) => {
        if (Array.isArray(color)) {
            color.forEach(c => {
                for (let i = 0; i < count; i++) {
                    const card: Card = {
                        cardColor: c,
                        cardValue: name,
                        cardSide: cardSide
                    };

                    // Check if the special card already exists
                    const key = JSON.stringify(card);
                    if (cardIdMap.has(key)) {
                        card.cardId = cardIdMap.get(key);
                    } else {
                        card.cardId = currentId;
                        cardIdMap.set(key, currentId);
                        currentId++;
                    }

                    cards.push(card);
                }
            });
        } else {
            for (let i = 0; i < count; i++) {
                const card: Card = {
                    cardColor: color,
                    cardValue: name,
                    cardSide: cardSide
                };

                const key = JSON.stringify(card);
                if (cardIdMap.has(key)) {
                    card.cardId = cardIdMap.get(key);
                } else {
                    card.cardId = currentId;
                    cardIdMap.set(key, currentId);
                    currentId++;
                }

                cards.push(card);
            }
        }
    });
}

// Generate cards for Light Side and Dark Side
function generateDeck() {
     // Reset data before generating a new deck
     cardsLight.length = 0;
     cardsDark.length = 0;
     cardIdMap.clear();
     currentId = 1;
    generateCards(colorsLight, true);
    generateCards(colorsDark, false);

    // Shuffle function
    function shuffle(array: Card[]) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    // Shuffle both light and dark side cards
    shuffle(cardsLight);
    shuffle(cardsDark);

    // Combine cards into newDeck with paired light and dark sides
    const newDeck: { [key: string]: { frontFace: Card; backFace: Card } } = {};
    for (let i = 0; i < cardsLight.length; i++) {
        newDeck[(i + 1).toString()] = {
            frontFace: cardsLight[i],
            backFace: cardsDark[i]
        };
    }

    // Prepare the final JSON structure
    return {
        deckValidation: {
            lightSideCount: cardsLight.length,
            darkSideCount: cardsDark.length,
            totalCount: cardsLight.length + cardsDark.length
        },
        newDeck: newDeck
    };
}

// Export the deck as JSON
export const deckJson = JSON.stringify({ deck: generateDeck() }, null, 2);
export { generateDeck }; // Export the generateDeck function
