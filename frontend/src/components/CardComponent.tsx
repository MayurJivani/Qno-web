import React from "react";
import { Card } from "../models/Card";
import { CardUtils } from "../utils/CardUtils";
import { CARD_ICONS } from "./CardIcons";

interface CardComponentProps {
  card: Card;
  isLight: boolean;
  onClick?: () => void;
  className?: string;
  // Must-play glow, e.g. the Measurement card while entangled
  highlighted?: boolean;
  // Not currently playable
  dimmed?: boolean;
  // Valid teleportation target
  selectable?: boolean;
}

const CardComponent: React.FC<CardComponentProps> = ({
  card,
  isLight,
  onClick,
  className = "",
  highlighted = false,
  dimmed = false,
  selectable = false,
}) => {
  const side = isLight ? card?.lightSide : card?.darkSide;

  if (!side) {
    return (
      <div className="w-24 h-36 sm:w-28 sm:h-40 flex items-center justify-center bg-gray-500 text-white rounded-2xl border-2 border-red-500">
        <p className="text-xs text-center">Invalid card</p>
      </div>
    );
  }

  const hasCustomSize = className.includes('w-') && className.includes('h-');
  const defaultSize = 'w-16 h-24 sm:w-20 sm:h-28';
  const sizeClasses = hasCustomSize ? '' : defaultSize;

  const isNumber = !isNaN(Number(side.value));
  const Icon = CARD_ICONS[side.value];
  const label = CardUtils.formatCardValue(side.value);

  const corner = Icon ? (
    <Icon className="w-3 h-3 sm:w-4 sm:h-4" />
  ) : (
    <span className="text-[9px] sm:text-xs font-black">{side.value}</span>
  );

  return (
    <div
      className={`relative ${sizeClasses} rounded-2xl overflow-hidden transition-all duration-150 ${dimmed
          ? 'opacity-40 grayscale cursor-not-allowed'
          : highlighted
            ? 'ring-4 ring-purple-400 ring-offset-1 animate-pulse cursor-pointer'
            : `${onClick ? 'cursor-pointer hover:-translate-y-1 hover:shadow-xl' : ''}`
        } ${selectable ? 'ring-2 ring-yellow-400 ring-offset-1' : ''} ${className}`}
      onClick={dimmed ? undefined : onClick}
      title={label}
      style={{
        background: getCardGradient(side.colour),
        boxShadow: highlighted
          ? '0 0 16px rgba(168, 85, 247, 0.8), 0 4px 10px rgba(0, 0, 0, 0.5)'
          : '0 3px 8px rgba(0, 0, 0, 0.45)',
      }}
    >
      <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 text-white/85">{corner}</div>
      <div className="absolute bottom-1.5 right-1.5 sm:bottom-2 sm:right-2 text-white/85 rotate-180">{corner}</div>

      <div className="relative z-10 flex flex-col items-center justify-center text-center w-full h-full gap-0.5 px-1.5">
        {isNumber ? (
          <span className="font-black text-white text-2xl sm:text-4xl drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]">
            {side.value}
          </span>
        ) : Icon ? (
          <>
            <Icon className="w-5 h-5 sm:w-8 sm:h-8 shrink-0 text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]" />
            <span className="font-bold uppercase text-white text-[5px] sm:text-[7.5px] leading-[1.15] break-words w-full">
              {label}
            </span>
          </>
        ) : (
          <span className="font-black text-white text-sm sm:text-lg uppercase">{label}</span>
        )}
      </div>
    </div>
  );
};

function getCardGradient(colour: string): string {
  const gradientMap: Record<string, string> = {
    Red: "linear-gradient(145deg, #ff6b6b, #8b0000)",
    Blue: "linear-gradient(145deg, #5bc0eb, #1e3a8a)",
    Green: "linear-gradient(145deg, #3cd070, #065f46)",
    Yellow: "linear-gradient(145deg, #fde047, #b45309)",
    Black: "linear-gradient(145deg, #3f3f46, #000000)",
    Pink: "linear-gradient(145deg, #ff5fa2, #9d174d)",
    Teal: "linear-gradient(145deg, #2dd4bf, #0f766e)",
    Orange: "linear-gradient(145deg, #fb923c, #b45309)",
    Purple: "linear-gradient(145deg, #a78bfa, #5b21b6)",
    White: "linear-gradient(145deg, #ffffff, #e5e5e5)",
    Gray: "linear-gradient(145deg, #9ca3af, #4b5563)",
  };
  return gradientMap[colour] || "#cccccc";
}

export default CardComponent;
