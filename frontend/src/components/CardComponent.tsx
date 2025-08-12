import React from "react";
import { Card } from "../models/Card";

interface CardComponentProps {
  card: Card;
  isLight: boolean;
  onClick?: () => void;
  className?: string;
}

const CardComponent: React.FC<CardComponentProps> = ({
  card,
  isLight,
  onClick,
  className = "",
}) => {
  const side = isLight ? card?.lightSide : card?.darkSide;

  if (!side) {
    return (
      <div className="w-24 h-36 sm:w-28 sm:h-40 flex items-center justify-center bg-gray-500 text-white rounded border-2 border-red-500">
        <p className="text-xs text-center">Invalid card</p>
      </div>
    );
  }

  return (
    <div
      className={`relative w-24 h-36 sm:w-28 sm:h-40 flex flex-col items-center justify-center text-white font-bold text-xs sm:text-sm p-2 border-4 border-black rounded-sm transition-transform duration-150 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_#000] active:translate-x-[0px] active:translate-y-[0px] active:shadow-none ${className}`}
      onClick={onClick}
      style={{
        background: getPixelGradient(side.colour),
        imageRendering: "pixelated",
        fontFamily: "'Press Start 2P', cursive",
        transform: `translateZ(0)`
      }}
    >

      <div className="absolute inset-0 rounded-sm border-4 border-white opacity-10 hover:opacity-40 transition-opacity duration-200 pointer-events-none" />

      <div className="z-10 flex flex-col items-center justify-center text-center">
        <span className="uppercase text-sm sm:text-base drop-shadow-[2px_2px_0_rgba(0,0,0,0.7)]">{side.colour}</span>
        <span className="text-3xl sm:text-xl drop-shadow-[2px_2px_0_rgba(0,0,0,0.7)]">{side.value}</span>
      </div>
    </div>
  );
};

function getPixelGradient(colour: string): string {
  const pixelGradientMap: Record<string, string> = {
    Red: "linear-gradient(145deg, #ff6b6b, #8b0000)",
    Blue: "linear-gradient(145deg, #5bc0eb, #1e3a8a)",
    Green: "linear-gradient(145deg, #3cd070, #065f46)",
    Yellow: "linear-gradient(145deg, #fde047, #b45309)",
    Black: "linear-gradient(145deg, #1f2937, #000000)",
    Pink: "linear-gradient(145deg, #ff5fa2, #9d174d)",
    Teal: "linear-gradient(145deg, #2dd4bf, #0f766e)",
    Orange: "linear-gradient(145deg, #fb923c, #b45309)",
    Purple: "linear-gradient(145deg, #a78bfa, #5b21b6)",
    White: "linear-gradient(145deg, #ffffff, #e5e5e5)",
  };
  return pixelGradientMap[colour] || "#cccccc";
}

export default CardComponent;
