// classes/Card.ts
export interface Side {
    colour: string;
    number: string;
  }
  
  export class Card {
    lightSide: Side;
    darkSide: Side;
  
    constructor(lightSide: Side, darkSide: Side) {
      this.lightSide = lightSide;
      this.darkSide = darkSide;
    }
  }
  