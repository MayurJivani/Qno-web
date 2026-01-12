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
  const [isMinimized, setIsMinimized] = useState(false);
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
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };

  const formatData = (data: unknown): string => {
    try {
      const jsonString = JSON.stringify(data, null, 2);
      // Truncate if too long
      if (jsonString.length > 500) {
        return jsonString.substring(0, 500) + '...';
      }
      return jsonString;
    } catch {
      return String(data);
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
              {isMinimized ? '▼' : '▲'}
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
                No WebSocket messages yet...
              </div>
            ) : (
              logs.map((log) => (
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

                {/* Data */}
                <pre className="text-gray-300 text-[7px] overflow-x-auto whitespace-pre-wrap break-words font-mono bg-black/30 p-1.5 rounded mt-1">
                  {formatData(log.data)}
                </pre>
              </div>
            )))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WebSocketLogWindow;

