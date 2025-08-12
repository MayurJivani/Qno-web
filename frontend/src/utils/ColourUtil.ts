import { Colours } from "../enums/cards/Colours";

export class ColourUtils {

    static ColourHexValues: Record<string, string> = {
        [Colours.Light.Blue]: '#006bb5',
        [Colours.Light.Green]: '#3ba345',
        [Colours.Light.Red]: '#ec1c24',
        [Colours.Light.Yellow]: '#ffda00',
    
        [Colours.Dark.Orange]: '#f8a01b',
        [Colours.Dark.Teal]: '#00a89a',
        [Colours.Dark.Pink]: '#eb008b',
        [Colours.Dark.Purple]: '#82298f',
    
        [Colours.WildCard.Black]: '#010101',
    };

}