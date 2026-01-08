export interface Colors<T extends string> {
    [K in T]: string;
  }
  
  // 🟦 Possible keys for each side
  export type LightColors = "Blue" | "Green" | "Red" | "Yellow" | "Black";
  export type DarkColors = "Orange" | "Teal" | "Pink" | "Purple" | "Black";
  
  // 🗂 Colors object with type safety
  export const COLORS: {
    light: Colors<LightColors>;
    dark: Colors<DarkColors>;
  } = {
    light: {
      Blue: "#2196f3",
      Green: "#4caf50",
      Red: "#f44336",
      Yellow: "#ffeb3b",
      Black: "#000000",
    },
    dark: {
      Orange: "#ff9800",
      Teal: "#009688",
      Pink: "#e91e63",
      Purple: "#9c27b0",
      Black: "#000000",
    },
  };
  