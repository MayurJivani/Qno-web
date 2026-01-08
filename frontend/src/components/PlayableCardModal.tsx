import React from 'react';
import { Card } from '../models/Card';
import CardComponent from './CardComponent';

interface PlayableCardModalProps {
  playableCardDrawn: { card: Card; message: string } | null;
  isLightSideActive: boolean;
  onDecision: (decision: 'PLAY' | 'KEEP') => void;
}

const PlayableCardModal: React.FC<PlayableCardModalProps> = ({
  playableCardDrawn,
  isLightSideActive,
  onDecision,
}) => {
  if (!playableCardDrawn) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 border-2 border-yellow-400">
        <h2 className="text-2xl font-bold text-yellow-300 mb-4 text-center">
          🎴 Playable Card Drawn!
        </h2>
        <p className="text-white mb-4 text-center">
          {playableCardDrawn.message}
        </p>
        <div className="flex justify-center mb-6">
          <CardComponent
            card={playableCardDrawn.card}
            isLight={isLightSideActive}
          />
        </div>
        <div className="flex gap-4 justify-center">
          <button
            className="px-6 py-3 bg-green-600 hover:bg-green-700 active:bg-green-800 rounded-lg font-bold text-lg transition-all shadow-lg hover:scale-105 text-white"
            onClick={() => onDecision('PLAY')}
          >
            ✅ Play Card
          </button>
          <button
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg font-bold text-lg transition-all shadow-lg hover:scale-105 text-white"
            onClick={() => onDecision('KEEP')}
          >
            💾 Keep Card
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlayableCardModal;

