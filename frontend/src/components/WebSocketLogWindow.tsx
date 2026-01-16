import React, { useState, useEffect, useRef } from 'react';

export interface WSLogEntry {
  id: string;
  timestamp: number;
  direction: 'sent' | 'received';
  type: string;
  data: unknown;
}

interface WebSocketLogWindowProps {
  logs: WSLogEntry[];
  onClear?: () => void;
}

const WebSocketLogWindow: React.FC<WebSocketLogWindowProps> = ({ logs, onClear }) => {
  const [isMinimized, setIsMinimized] = useState(true); // Start minimized by default
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (logContainerRef.current && !isMinimized) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, isMinimized]);

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit'
    } as Intl.DateTimeFormatOptions);
  };

  const formatMessage = (type: string, data: unknown): string | null => {
    try {
      const dataObj = data as Record<string, unknown>;
      
      switch (type) {
        case 'CARD_EFFECT': {
          const effect = dataObj.effect as string;
          
          if (effect === 'Teleportation') {
            return '📡 Teleportation: Card stolen!';
          } else if (effect === 'Pauli_X') {
            const isLight = dataObj.isLightSideActive as boolean;
            return `⚛️ Pauli X: Flipped to ${isLight ? 'Light' : 'Dark'} side`;
          } else if (effect === 'Pauli_Y') {
            const isLight = dataObj.isLightSideActive as boolean;
            const direction = dataObj.direction as number;
            const dir = direction === 1 ? '→' : '←';
            return `⚛️ Pauli Y: ${isLight ? 'Light' : 'Dark'} side, ${dir}`;
          } else if (effect === 'Pauli_Z') {
            const direction = dataObj.direction as number;
            const dir = direction === 1 ? '→ Clockwise' : '← Counter-clockwise';
            return `⚛️ Pauli Z: ${dir}`;
          } else if (effect === 'Superposition') {
            return '🔮 Superposition activated!';
          } else if (effect === 'Measurement') {
            return '📊 Measurement: Collapsed!';
          } else if (effect === 'Entanglement') {
            return '🔗 Entanglement: Players linked!';
          } else if (effect === 'Decoherence') {
            return '🌈 Decoherence: Color changed!';
          }
          return null; // Skip unknown effects
        }
        
        case 'ENTANGLEMENT_NOTIFICATION': {
          const msg = dataObj.message as string;
          return msg || '🔗 Entanglement event';
        }
        
        case 'ENTANGLEMENT_COLLAPSED': {
          const playerWhoDrew3Name = dataObj.playerWhoDrew3Name as string;
          const playerWhoDrew0Name = dataObj.playerWhoDrew0Name as string;
          return `💥 Collapsed! ${playerWhoDrew3Name} +3, ${playerWhoDrew0Name} +0`;
        }
        
        case 'DECK_RESHUFFLED': {
          const cardsReshuffled = dataObj.cardsReshuffled as number;
          return `🔄 Deck reshuffled (${cardsReshuffled || '?'} cards)`;
        }
        
        default:
          return null; // Don't show unrecognized types
      }
    } catch {
      return null;
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-[100] w-96 max-w-[calc(100vw-2rem)]">
      <div 
        className="bg-black/90 backdrop-blur-lg border-2 border-cyan-400 rounded-lg shadow-[0_0_15px_#06b6d4] overflow-hidden"
        style={{ fontFamily: "'Press Start 2P', cursive" }}
      >
        {/* Header */}
        <div className="bg-cyan-500/20 border-b-2 border-cyan-400 px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-cyan-300 text-[10px]">📡 WS LOG</span>
            <span className="text-yellow-400 text-[8px]">({logs.length})</span>
          </div>
          <div className="flex items-center gap-1">
            {onClear && (
              <button
                onClick={onClear}
                className="text-red-400 hover:text-red-300 text-[8px] px-2 py-1 hover:bg-red-500/20 rounded transition-colors"
                title="Clear logs"
              >
                CLEAR
              </button>
            )}
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="text-cyan-300 hover:text-cyan-200 text-[8px] px-2 py-1 hover:bg-cyan-500/20 rounded transition-colors"
              title={isMinimized ? "Expand" : "Minimize"}
            >
              {isMinimized ? '▲' : '▼'}
            </button>
          </div>
        </div>

        {/* Log Content */}
        {!isMinimized && (
          <div 
            ref={logContainerRef}
            className="max-h-96 overflow-y-auto p-2 space-y-2 bg-black/50 ws-log-scrollbar min-h-[200px]"
          >
            {logs.length === 0 ? (
              <div className="text-gray-400 text-[8px] text-center py-8">
                No game events yet...
              </div>
            ) : (
              logs.map((log) => {
                const message = formatMessage(log.type, log.data);
                if (!message) return null; // Skip logs without formatted messages
                return (
                  <div
                    key={log.id}
                    className={`p-2 rounded border-l-4 ${
                      log.direction === 'sent' 
                        ? 'bg-blue-500/10 border-blue-400' 
                        : 'bg-green-500/10 border-green-400'
                    } text-[8px]`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${
                          log.direction === 'sent' ? 'text-blue-400' : 'text-green-400'
                        }`}>
                          {log.direction === 'sent' ? '→' : '←'}
                        </span>
                        <span className="text-cyan-300 uppercase">{log.type}</span>
                      </div>
                      <span className="text-gray-400 text-[7px]">{formatTimestamp(log.timestamp)}</span>
                    </div>

                    {/* Formatted Message */}
                    <div className="text-gray-200 text-[7px] bg-black/30 p-1.5 rounded mt-1 leading-relaxed">
                      {message}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WebSocketLogWindow;
