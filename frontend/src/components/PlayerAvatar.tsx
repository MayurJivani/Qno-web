import React from 'react';

interface PlayerAvatarProps {
  name: string;
  cardCount: number;
  isCurrentTurn: boolean;
  isYou: boolean;
  position: 'top-left' | 'top-right' | 'mid-right' | 'mid-left' | 'bottom-center' | 'top-center' | 'top-left-center' | 'top-right-center';
  avatar?: string;
  isEntangled?: boolean;
  isDisconnected?: boolean;
}

const avatars = ['🐱', '🐶', '🐭', '🦊', '🐻', '🐼', '🐨', '🦁'];

const PlayerAvatar: React.FC<PlayerAvatarProps> = ({ 
  name, 
  cardCount, 
  isCurrentTurn, 
  isYou,
  position,
  avatar,
  isEntangled = false,
  isDisconnected = false
}) => {
  const avatarEmoji = avatar || avatars[Math.abs(name.charCodeAt(0)) % avatars.length];
  
  const positionClasses = {
    'top-left': 'top-20 left-8',
    'top-right': 'top-20 right-8',
    'mid-right': 'top-86 right-53 -translate-y-1/2',
    'mid-left': 'top-86 left-53 -translate-y-1/2',
    'bottom-center': 'bottom-45 left-1/2 -translate-x-1/2',
    'top-center': 'top-20 left-1/2 -translate-x-1/2',
    'top-left-center': 'top-40 left-1/5',
    'top-right-center': 'top-40 right-1/5'
  };

  return (
    <div 
      className={`absolute ${positionClasses[position]} z-40 transition-all duration-300 ${isCurrentTurn ? 'scale-110' : 'scale-100'} ${isDisconnected ? 'opacity-50' : ''} flex flex-col items-center`}
      style={{
        filter: isDisconnected 
          ? 'grayscale(80%)' 
          : isCurrentTurn 
            ? 'drop-shadow(0 0 20px rgba(255, 215, 0, 0.8))' 
            : 'none'
      }}
    >
      {/* Disconnected Indicator */}
      {isDisconnected && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[8px] px-1.5 py-0.5 rounded-full animate-pulse font-bold z-50 flex items-center gap-0.5 whitespace-nowrap">
          <span>⚠️</span><span>Offline</span>
        </div>
      )}
      {/* Name Banner */}
      <div className={`text-center mb-0.5 ${isCurrentTurn ? 'animate-pulse' : ''}`}>
        <div className={`inline-block px-1.5 py-0.5 rounded font-bold text-[10px] shadow-md ${
          isDisconnected ? 'bg-gray-400 text-gray-700' :
          isYou ? 'bg-yellow-400 text-black' : isCurrentTurn ? 'bg-green-400 text-black' : 'bg-blue-500 text-white'
        }`}>
          {name}
        </div>
      </div>
      
      {/* Avatar */}
      <div className="relative">
        <div 
          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xl sm:text-2xl shadow-lg border-2 transition-all duration-300 mx-auto ${
            isEntangled
              ? 'border-purple-400 bg-purple-200/30 animate-pulse'
              : isCurrentTurn 
                ? 'border-yellow-400 bg-yellow-200/30 scale-110' 
                : 'border-white/50 bg-white/10'
          }`}
          style={{
            boxShadow: isEntangled
              ? '0 0 20px rgba(168, 85, 247, 0.8), inset 0 0 15px rgba(255, 255, 255, 0.3)'
              : isCurrentTurn 
                ? '0 0 20px rgba(255, 215, 0, 0.8), inset 0 0 15px rgba(255, 255, 255, 0.3)' 
                : '0 2px 10px rgba(0, 0, 0, 0.3)'
          }}
        >
          {avatarEmoji}
        </div>
        {isEntangled && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center animate-pulse">
            <span className="text-[8px]">🔗</span>
          </div>
        )}
        {isCurrentTurn && !isEntangled && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full flex items-center justify-center animate-ping">
            <span className="text-[6px]">🎯</span>
          </div>
        )}
      </div>
      
      {/* Card Count */}
      <div className={`mt-0.5 text-center shadow-md px-1 py-0.5 rounded ${
        isCurrentTurn ? 'bg-yellow-300 text-black' : 'bg-white text-black'
      }`}>
        <div className="text-[7px] sm:text-[8px] font-semibold opacity-75">Cards {cardCount}</div>
      </div>
    </div>
  );
};

export default PlayerAvatar;

