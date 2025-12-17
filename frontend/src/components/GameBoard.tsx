import React from 'react';
import { Card } from '../models/Card';
import { CardFace } from '../enums/cards/CardFace';
import PlayerAvatar from './PlayerAvatar';
import FannedCards from './FannedCards';
import CardComponent from './CardComponent';

interface GameBoardProps {
  sortedPlayerIds: string[];
  playerId: string | null;
  playerNames: Record<string, string>;
  currentPlayerId: string | null;
  myHand: { getCards: () => Card[] };
  opponentDecks: Record<string, Card[]>;
  isLightSideActive: boolean;
  discardTop: CardFace | null;
  drawTop: CardFace | null;
  discardPileShake: boolean;
  turnDirection: 'clockwise' | 'anti-clockwise';
  isTeleportationMode: boolean;
  getPlayerPosition: (index: number, totalPlayers: number) => 'top-left' | 'top-right' | 'mid-right' | 'bottom-center' | 'top-center';
  onPlayCard: (card: Card) => void;
  onDrawCard: () => void;
  onTeleportationSelect: (card: Card, fromPlayerId: string) => void;
}

const GameBoard: React.FC<GameBoardProps> = ({
  sortedPlayerIds,
  playerId,
  playerNames,
  currentPlayerId,
  myHand,
  opponentDecks,
  isLightSideActive,
  discardTop,
  drawTop,
  discardPileShake,
  turnDirection,
  isTeleportationMode,
  getPlayerPosition,
  onPlayCard,
  onDrawCard,
  onTeleportationSelect,
}) => {
  return (
    <div className="relative min-h-screen" style={{ perspective: '1000px' }}>
      {/* Player Avatars - positioned around the board */}
      {sortedPlayerIds.map((id, index) => {
        const position = getPlayerPosition(index, sortedPlayerIds.length);
        const isCurrentTurn = id === currentPlayerId;
        const isYou = id === playerId;
        const cardCount = id === playerId 
          ? myHand.getCards().length 
          : (opponentDecks[id]?.length || 0);
        
        // Only render if we have card count info or it's the current player
        if (id === playerId || opponentDecks[id]?.length !== undefined) {
          return (
            <PlayerAvatar
              key={id}
              name={playerNames[id] || id.substring(0, 8)}
              cardCount={cardCount}
              isCurrentTurn={isCurrentTurn}
              isYou={isYou}
              position={position}
            />
          );
        }
        return null;
      })}

      {/* Central Game Board */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[20%] z-30 flex items-center gap-8">
        {/* Turn Direction Indicator */}
        <div className="absolute -top-18 left-1/2 -translate-x-1/2 z-40">
          <div 
            className="text-4xl transition-transform duration-500"
            style={{
              transform: turnDirection === 'clockwise' ? 'rotate(0deg)' : 'rotate(180deg)'
            }}
          >
            {turnDirection === 'clockwise' ? '➡️' : '⬅️'}
          </div>
        </div>

        {/* Draw Pile - Left of Center */}
        <div className="flex flex-col items-center relative z-50">
          <div className="text-white text-xs font-bold mb-2 drop-shadow-lg bg-black/50 px-2 py-0.5 rounded">DRAW PILE</div>
          {drawTop && (
            <div 
              className={`relative cursor-pointer transition-transform hover:scale-110 ${
                playerId === currentPlayerId && !isTeleportationMode ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
              }`}
              style={{
                transform: 'translateZ(30px) rotate(-5deg)',
                transformStyle: 'preserve-3d'
              }}
              onClick={() => {
                if (playerId === currentPlayerId && !isTeleportationMode) {
                  onDrawCard();
                }
              }}
            >
              <div className="absolute -bottom-1 -right-1 w-16 h-[88px] sm:w-[72px] sm:h-[104px] rounded-lg bg-blue-900/60 blur-sm"></div>
              <div className="relative">
                <CardComponent
                  card={isLightSideActive ? new Card(undefined, undefined, drawTop) : new Card(undefined, drawTop, undefined)}
                  isLight={!isLightSideActive}
                  className="w-16 h-[88px] sm:w-[72px] sm:h-[104px]"
                />
              </div>
            </div>
          )}
        </div>

        {/* Discard Pile - Center */}
        <div className="flex flex-col items-center relative z-50">
          <div className="text-white text-xs font-bold mb-2 drop-shadow-lg bg-black/50 px-2 py-0.5 rounded">DISCARD PILE</div>
          {discardTop && (
            <div 
              className={`relative transition-all duration-300 ${discardPileShake ? 'discard-pile-shake' : ''}`}
              style={{
                transform: 'translateZ(50px)',
                transformStyle: 'preserve-3d'
              }}
            >
              <div className="absolute -bottom-2 -right-2 w-16 h-[88px] sm:w-[72px] sm:h-[104px] rounded-lg bg-black/40 blur-sm"></div>
              <div className="relative">
                <CardComponent
                  card={!isLightSideActive ? new Card(undefined, undefined, discardTop) : new Card(undefined, discardTop, undefined)}
                  isLight={!!isLightSideActive}
                  className="w-16 h-[88px] sm:w-[72px] sm:h-[104px]"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Opponent Hands - Fanned Cards positioned below avatars */}
      {sortedPlayerIds.filter(id => id !== playerId).map((id) => {
        // Get position as if this opponent was in the full sorted list
        // This ensures opponent cards align with their avatar positions
        const opponentIndexInFullList = sortedPlayerIds.findIndex(pid => pid === id);
        const position = getPlayerPosition(opponentIndexInFullList, sortedPlayerIds.length);
        const cards = opponentDecks[id] || [];
        const isSelectable = isTeleportationMode && playerId === currentPlayerId;
        
        // Position opponent cards below their avatars - match avatar positions
        // Add more space between avatar and cards to prevent overlapping
        const positionStyles = {
          'top-left': { top: '180px', left: '20px', transform: 'translateX(0)' },
          'top-right': { top: '180px', right: '20px', transform: 'translateX(0)' },
          'mid-right': { top: 'calc(50% + 80px)', right: '20px', transform: 'translateY(0)' },
          'top-center': { top: '180px', left: '50%', transform: 'translateX(-50%)' }, // Center below top-center avatar with more space
          'bottom-center': { top: '180px', left: '50%', transform: 'translateX(-50%)' } // Shouldn't happen for opponent
        };

        return (
          <div 
            key={id}
            className="absolute z-30"
            style={positionStyles[position]}
          >
            <FannedCards
              cards={cards}
              isLightSideActive={!isLightSideActive}
              onClick={isSelectable ? (card: Card) => {
                if (!card.id) return;
                onTeleportationSelect(card, id);
              } : undefined}
              isSelectable={isSelectable}
              fanDirection={position === 'top-center' ? 'left' : 'right'}
            />
          </div>
        );
      })}

      {/* Your Hand - Bottom Center, Fanned */}
      {/* Positioned with more space above to avoid overlapping with avatar */}
      <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-40">
        {myHand.getCards().length > 0 && (
          <div className="relative">
            <FannedCards
              cards={myHand.getCards()}
              isLightSideActive={isLightSideActive}
              onClick={(card: Card) => {
                if (playerId === currentPlayerId && !isTeleportationMode) {
                  onPlayCard(card);
                }
              }}
              fanDirection="left"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default GameBoard;

