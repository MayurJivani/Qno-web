import React from 'react';
import { Card } from '../models/Card';
import CardComponent from './CardComponent';

interface FannedCardsProps {
  cards: Card[];
  isLightSideActive: boolean;
  onClick?: (card: Card, index: number) => void;
  isSelectable?: boolean;
  fanDirection?: 'left' | 'right' | 'up';
  isFlipping?: boolean;
  mustPlayMeasurement?: boolean;
  isPlayerHand?: boolean; // true for player's hand (at bottom), false for opponent hands (at top)
}

const FannedCards: React.FC<FannedCardsProps> = ({
  cards,
  isLightSideActive,
  onClick,
  isSelectable = false,
  fanDirection = 'left',
  isFlipping = false,
  mustPlayMeasurement = false,
  isPlayerHand = true
}) => {
  if (cards.length === 0) return null;

  const isSmall = typeof window !== 'undefined' && window.innerWidth < 640;
  const overlap = isSmall ? 12 : 18;
  const cardBaseWidth = isSmall ? 48 : 80;

  const maxRotation = 15;
  const rotationStep = (maxRotation * 2) / Math.max(cards.length - 1, 1);

  return (
    <div className="relative" style={{
      height: isSmall ? '80px' : '100px',
      width: cards.length > 1 ? `${cards.length * overlap + cardBaseWidth}px` : `${cardBaseWidth}px`,
      perspective: '1000px'
    }}>
      {cards.map((card, index) => {
        const rotation = -maxRotation + (rotationStep * index);
        const finalRotation = fanDirection === 'right' ? rotation : rotation;
        const offsetX = index * overlap;
        const offsetY = Math.abs(finalRotation) * (isSmall ? 0.3 : 0.5);

        const activeFace = isLightSideActive ? card.lightSide : card.darkSide;
        const tooltipValue = (activeFace?.value || '').replace(/_/g, ' ');
        const isMeasurement = activeFace?.value === 'Measurement';
        const shouldHighlight = mustPlayMeasurement && isMeasurement;
        const shouldDisable = mustPlayMeasurement && !isMeasurement;

        return (
          <div
            key={card.id || index}
            className="group absolute transition-all duration-300 hover:z-50 hover:scale-110"
            style={{
              left: `${offsetX}px`,
              top: `${offsetY}px`,
              transform: `rotate(${finalRotation}deg)`,
              transformOrigin: 'bottom center',
              cursor: onClick || isSelectable ? 'pointer' : 'default',
              zIndex: index
            }}
            onClick={() => {
              if (mustPlayMeasurement) {
                // Only allow clicking Measurement card when mustPlayMeasurement is true
                if (activeFace?.value === 'Measurement') {
                  onClick?.(card, index);
                }
              } else {
                onClick?.(card, index);
              }
            }}
          >
            {/* Hover Tooltip - Card Value */}
            {/* Position tooltip above for player hand (at bottom), below for opponent hands (at top) */}
            <div className={`absolute left-1/2 -translate-x-1/2 bg-black/95 border-2 border-yellow-300 rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 shadow-[0_0_10px_rgba(250,204,21,0.5)] ${isPlayerHand ? '-top-10' : '-bottom-10'
              }`}>
              <span className="text-yellow-300 text-[10px] sm:text-xs font-['Press_Start_2P'] drop-shadow-[1px_1px_0_rgba(0,0,0,0.8)] block">
                {tooltipValue}
              </span>
              {/* Tooltip Arrow - points down for player hand, up for opponent hands */}
              <div className={`absolute left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-r-[5px] ${isPlayerHand
                ? 'top-full border-t-[5px] border-l-transparent border-r-transparent border-t-yellow-300'
                : 'bottom-full border-b-[5px] border-l-transparent border-r-transparent border-b-yellow-300'
                }`}></div>
            </div>

            <div className={`transition-transform duration-200 hover:-translate-y-4 ${isFlipping ? 'card-flip-animation' : ''}`}>
              <CardComponent
                card={card}
                isLight={isLightSideActive}
                className="w-12 h-20 sm:w-20 sm:h-28"
                highlighted={shouldHighlight}
                dimmed={shouldDisable}
                selectable={isSelectable && !!card.id && !shouldHighlight}
              />
            </div>
            {shouldHighlight && (
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold z-20 animate-pulse border-2 border-white">
                ⚛️
              </div>
            )}
            {isSelectable && card.id && !shouldHighlight && (
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center text-black text-xs font-bold z-20 animate-pulse">
                ✨
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default FannedCards;

