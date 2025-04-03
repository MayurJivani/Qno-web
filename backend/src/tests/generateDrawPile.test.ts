import { generateDrawPile, drawPileJSON } from "../drawPile";

describe("Deck Generation", () => {
    it("should generate a valid deck", () => {
        generateDrawPile();

        //Parse the exported deck JSON
        const deckObject = JSON.parse(drawPileJSON);
        expect(deckObject).toHaveProperty("drawPile");
        expect(deckObject.drawPile.length).toEqual(108);

        //TODO: Implement checks to verify correct number of each card

        // Print the entire deck JSON
        console.log("Generated Deck JSON:", JSON.stringify(deckObject));
        console.log("Generated Deck Length:", deckObject.drawPile.length);
    });
});
