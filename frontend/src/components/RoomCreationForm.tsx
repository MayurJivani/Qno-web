import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface RoomCreationFormProps {
  inputPlayerName: string;
  inputRoomId: string;
  isConnecting: boolean;
  connectionError: string | null;
  onPlayerNameChange: (value: string) => void;
  onRoomIdChange: (value: string) => void;
  onCreateRoom: () => void;
  onJoinRoom: () => void;
  onReconnect?: () => void;
}

const RoomCreationForm: React.FC<RoomCreationFormProps> = ({
  inputPlayerName,
  inputRoomId,
  isConnecting,
  connectionError,
  onPlayerNameChange,
  onRoomIdChange,
  onCreateRoom,
  onJoinRoom,
  onReconnect,
}) => {
  const navigate = useNavigate();
  const [hasStoredSession, setHasStoredSession] = useState(false);

  useEffect(() => {
    // Check if there's a stored session that can be reconnected
    const storedRoomId = localStorage.getItem('roomId');
    const storedPlayerId = localStorage.getItem('playerId');
    const storedSessionToken = localStorage.getItem('sessionToken');
    setHasStoredSession(!!(storedRoomId && storedPlayerId && storedSessionToken));
  }, []);

  const handleClearSession = () => {
    localStorage.removeItem('roomId');
    localStorage.removeItem('playerId');
    localStorage.removeItem('sessionToken');
    setHasStoredSession(false);
  };

  return (
    <div className="flex flex-col items-center gap-4 p-8 bg-gradient-to-br from-purple-900/90 via-indigo-900/90 to-pink-900/90 rounded-xl border-2 border-yellow-400 shadow-2xl relative z-50 max-w-md mx-auto mt-20 backdrop-blur-sm" 
         style={{ fontFamily: "'Press Start 2P', cursive" }}>
      {/* Back Button */}
      <button
        onClick={() => navigate('/')}
        className="absolute top-4 left-4 text-yellow-300 hover:text-white text-xs flex items-center gap-1 transition-colors"
        style={{ fontFamily: "'Press Start 2P', cursive" }}
      >
        <span>←</span>
        <span>HOME</span>
      </button>
      <h2 className="text-2xl sm:text-3xl font-bold text-yellow-300 mb-4 drop-shadow-lg">🎴 QNO</h2>
      {connectionError && (
        <div className="bg-red-600 text-white px-4 py-2 rounded mb-2 w-full text-center text-xs">
          {connectionError}
        </div>
      )}
      <div className="flex flex-col gap-2 w-full">
        <label className="text-white text-xs text-left w-full px-1">Enter Your Name</label>
        <input
          type="text"
          className="rounded-none p-3 text-black w-full text-center font-semibold text-sm bg-gray-200 border-2 border-gray-400 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400 z-50 relative"
          placeholder="Enter Your Name"
          value={inputPlayerName}
          onChange={(e) => onPlayerNameChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !isConnecting && inputPlayerName.trim()) {
              onCreateRoom();
            }
          }}
          disabled={isConnecting}
          maxLength={20}
          autoFocus
          style={{ fontFamily: "'Press Start 2P', cursive", imageRendering: "pixelated" }}
        />
      </div>
      <div className="flex flex-col gap-3 w-full">
        <button 
          className="bg-green-500 hover:bg-green-600 px-4 py-3 rounded-none font-bold text-sm disabled:bg-gray-500 disabled:cursor-not-allowed transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none border-4 border-black text-white relative z-50 flex items-center justify-center gap-2" 
          onClick={onCreateRoom}
          disabled={isConnecting || !inputPlayerName.trim()}
          style={{ fontFamily: "'Press Start 2P', cursive", imageRendering: "pixelated" }}
        >
          <span className="text-lg">🎮</span>
          <span>{isConnecting ? 'Connecting...' : 'Create Room'}</span>
        </button>
        <div className="text-center text-gray-400 font-semibold text-xs">OR</div>
        <div className="flex flex-col gap-2">
          <label className="text-white text-xs text-left w-full px-1">Enter Room ID</label>
          <input
            type="text"
            className="rounded-none p-3 text-black w-full text-center font-semibold text-sm bg-gray-200 border-2 border-gray-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400 z-50 relative"
            placeholder="Enter Room ID"
            value={inputRoomId}
            onChange={(e) => onRoomIdChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isConnecting && inputRoomId.trim() && inputPlayerName.trim()) {
                onJoinRoom();
              }
            }}
            disabled={isConnecting}
            style={{ fontFamily: "'Press Start 2P', cursive", imageRendering: "pixelated" }}
          />
        </div>
        <button 
          className="bg-blue-500 hover:bg-blue-600 px-4 py-3 rounded-none font-bold text-sm disabled:bg-gray-500 disabled:cursor-not-allowed transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none border-4 border-black text-white relative z-50 flex items-center justify-center gap-2" 
          onClick={onJoinRoom}
          disabled={isConnecting || !inputRoomId.trim() || !inputPlayerName.trim()}
          style={{ fontFamily: "'Press Start 2P', cursive", imageRendering: "pixelated" }}
        >
          <span className="text-lg">🚪</span>
          <span>{isConnecting ? 'Connecting...' : 'Join Room'}</span>
        </button>
      </div>

      {/* Reconnect Section */}
      {hasStoredSession && onReconnect && (
        <div className="w-full mt-4 pt-4 border-t-2 border-yellow-400/50">
          <div className="text-center text-yellow-300 font-semibold text-xs mb-3">
            Previous Session Found
          </div>
          <div className="flex gap-2">
            <button 
              className="flex-1 bg-orange-500 hover:bg-orange-600 px-4 py-3 rounded-none font-bold text-sm disabled:bg-gray-500 disabled:cursor-not-allowed transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none border-4 border-black text-white relative z-50 flex items-center justify-center gap-2" 
              onClick={onReconnect}
              disabled={isConnecting}
              style={{ fontFamily: "'Press Start 2P', cursive", imageRendering: "pixelated" }}
            >
              <span className="text-lg">🔄</span>
              <span>{isConnecting ? 'Reconnecting...' : 'Reconnect'}</span>
            </button>
            <button 
              className="bg-gray-500 hover:bg-gray-600 px-3 py-3 rounded-none font-bold text-sm transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none border-4 border-black text-white relative z-50 flex items-center justify-center" 
              onClick={handleClearSession}
              disabled={isConnecting}
              title="Clear stored session"
              style={{ fontFamily: "'Press Start 2P', cursive", imageRendering: "pixelated" }}
            >
              <span className="text-lg">🗑️</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomCreationForm;