// classes/Card.ts
export interface Side {
    colour: string;
    value: string;
  }
  
  export class Card {
    lightSide: Side;
    darkSide: Side;
  
    constructor(lightSide: Side, darkSide: Side) {
      this.lightSide = lightSide;
      this.darkSide = darkSide;
    }
  }
  