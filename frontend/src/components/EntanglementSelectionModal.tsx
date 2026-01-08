import React, { useState } from 'react';

interface Opponent {
  id: string;
  name: string;
}

interface EntanglementSelectionModalProps {
  opponents: Opponent[];
  onSelect: (opponent1Id: string, opponent2Id: string) => void;
  onCancel?: () => void;
}

const EntanglementSelectionModal: React.FC<EntanglementSelectionModalProps> = ({
  opponents,
  onSelect,
  onCancel,
}) => {
  const [selectedOpponents, setSelectedOpponents] = useState<Set<string>>(new Set());

  const toggleOpponent = (opponentId: string) => {
    const newSelected = new Set(selectedOpponents);
    if (newSelected.has(opponentId)) {
      newSelected.delete(opponentId);
    } else {
      if (newSelected.size < 2) {
        newSelected.add(opponentId);
      }
    }
    setSelectedOpponents(newSelected);
  };

  const handleConfirm = () => {
    if (selectedOpponents.size === 2) {
      const [opponent1Id, opponent2Id] = Array.from(selectedOpponents);
      onSelect(opponent1Id, opponent2Id);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 border-2 border-yellow-400">
        <h2 className="text-2xl font-bold text-yellow-300 mb-4 text-center">
          🔗 Entanglement Selection
        </h2>
        <p className="text-white mb-4 text-center text-sm">
          Select 2 opponents to entangle. They will draw 1 card each and be forced to play Measurement if they have it.
        </p>
        <div className="space-y-2 mb-6">
          {opponents.map((opponent) => (
            <button
              key={opponent.id}
              onClick={() => toggleOpponent(opponent.id)}
              className={`w-full p-3 rounded-lg font-bold transition-all ${
                selectedOpponents.has(opponent.id)
                  ? 'bg-yellow-400 text-black hover:bg-yellow-500'
                  : 'bg-gray-700 text-white hover:bg-gray-600'
              } ${selectedOpponents.size >= 2 && !selectedOpponents.has(opponent.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={selectedOpponents.size >= 2 && !selectedOpponents.has(opponent.id)}
            >
              {opponent.name || opponent.id.substring(0, 8)}
              {selectedOpponents.has(opponent.id) && ' ✓'}
            </button>
          ))}
        </div>
        <div className="flex gap-4 justify-center">
          {onCancel && (
            <button
              className="px-6 py-3 bg-gray-600 hover:bg-gray-700 active:bg-gray-800 rounded-lg font-bold text-lg transition-all shadow-lg hover:scale-105 text-white"
              onClick={onCancel}
            >
              Cancel
            </button>
          )}
          <button
            className="px-6 py-3 bg-green-600 hover:bg-green-700 active:bg-green-800 rounded-lg font-bold text-lg transition-all shadow-lg hover:scale-105 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleConfirm}
            disabled={selectedOpponents.size !== 2}
          >
            Entangle ({selectedOpponents.size}/2)
          </button>
        </div>
      </div>
    </div>
  );
};

export default EntanglementSelectionModal;

