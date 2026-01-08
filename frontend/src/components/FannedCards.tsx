import React from 'react';
import { Card } from '../models/Card';
import { CardUtils } from '../utils/CardUtils';

interface FannedCardsProps {
  cards: Card[];
  isLightSideActive: boolean;
  onClick?: (card: Card, index: number) => void;
  isSelectable?: boolean;
  fanDirection?: 'left' | 'right' | 'up';
  isFlipping?: boolean;
  mustPlayMeasurement?: boolean;
}

const FannedCards: React.FC<FannedCardsProps> = ({ 
  cards, 
  isLightSideActive, 
  onClick,
  isSelectable = false,
  fanDirection = 'left',
  isFlipping = false,
  mustPlayMeasurement = false
}) => {
  if (cards.length === 0) return null;

  const maxRotation = 15;
  const rotationStep = (maxRotation * 2) / Math.max(cards.length - 1, 1);

  return (
    <div className="relative" style={{ 
      height: '100px',
      width: cards.length > 1 ? `${cards.length * 18 + 64}px` : '64px',
      perspective: '1000px'
    }}>
      {cards.map((card, index) => {
        const rotation = -maxRotation + (rotationStep * index);
        const finalRotation = fanDirection === 'right' ? rotation : rotation;
        const offsetX = index * 18;
        const offsetY = Math.abs(finalRotation) * 0.5;
        
        return (
          <div
            key={card.id || index}
            className="absolute transition-all duration-300 hover:z-50 hover:scale-110"
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
                const activeFace = isLightSideActive ? card.lightSide : card.darkSide;
                if (activeFace?.value === 'Measurement') {
                  onClick && onClick(card, index);
                }
              } else {
                onClick && onClick(card, index);
              }
            }}
          >
            <>
              <div className="transition-transform duration-200 hover:-translate-y-4">
                {(() => {
                  const activeFace = isLightSideActive ? card.lightSide : card.darkSide;
                  const isMeasurement = activeFace?.value === 'Measurement';
                  const shouldHighlight = mustPlayMeasurement && isMeasurement;
                  const shouldDisable = mustPlayMeasurement && !isMeasurement;
                  return (
                    <div
                      className={`relative w-16 h-24 sm:w-20 sm:h-28 flex flex-col items-center justify-center text-white font-bold p-1 sm:p-1.5 border-2 rounded-sm transition-transform duration-150 ${
                        shouldDisable
                          ? 'border-gray-500 opacity-50 cursor-not-allowed'
                          : shouldHighlight
                            ? 'border-purple-400 ring-4 ring-purple-400 ring-offset-2 animate-pulse cursor-pointer'
                            : onClick || isSelectable
                              ? 'border-black hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_#000] active:translate-x-[0px] active:translate-y-[0px] active:shadow-none cursor-pointer'
                              : 'border-black cursor-default'
                      } ${isSelectable ? 'ring-2 ring-yellow-400 ring-offset-1' : ''} ${isFlipping ? 'card-flip-animation' : ''}`}
                      style={{
                        background: getPixelGradient((isLightSideActive ? card.lightSide : card.darkSide)?.colour || 'Gray'),
                        imageRendering: "pixelated",
                        fontFamily: "'Press Start 2P', cursive",
                        boxShadow: shouldHighlight
                          ? '0 0 20px rgba(168, 85, 247, 0.8), 0 4px 8px rgba(0, 0, 0, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.1)'
                          : '0 4px 8px rgba(0, 0, 0, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.1)'
                      }}
                    >
                      <div className="absolute inset-0 rounded-sm border-2 border-white opacity-10 hover:opacity-40 transition-opacity duration-200 pointer-events-none" />
                      <div className="z-10 flex flex-col items-center justify-center text-center w-full h-full px-0.5">
                        <span className="uppercase text-[6px] sm:text-[7px] leading-tight drop-shadow-[1px_1px_0_rgba(0,0,0,0.7)] mb-0.5">
                          {(isLightSideActive ? card.lightSide : card.darkSide)?.colour || ''}
                        </span>
                        <span 
                          className={`${
                            !isNaN(Number((isLightSideActive ? card.lightSide : card.darkSide)?.value)) 
                              ? 'text-lg sm:text-xl' 
                              : 'text-[8px] sm:text-[9px]'
                          } leading-tight drop-shadow-[1px_1px_0_rgba(0,0,0,0.7)] whitespace-pre-line break-words`}
                          style={{
                            lineHeight: '1.1',
                            wordBreak: 'break-word',
                            maxWidth: '100%',
                            overflow: 'hidden',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical'
                          }}
                        >
                          {CardUtils.formatCardValue((isLightSideActive ? card.lightSide : card.darkSide)?.value || '')}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>
              {(() => {
                const activeFace = isLightSideActive ? card.lightSide : card.darkSide;
                const isMeasurement = activeFace?.value === 'Measurement';
                const shouldHighlight = mustPlayMeasurement && isMeasurement;
                return (
                  <>
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
                  </>
                );
              })()}
            </>
          </div>
        );
      })}
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
    Gray: "linear-gradient(145deg, #9ca3af, #4b5563)",
  };
  return pixelGradientMap[colour] || "#cccccc";
}

export default FannedCards;

