import React from 'react';
import { useAudio } from '../contexts/AudioContext';

const MuteButton: React.FC = () => {
  const { isMuted, toggleMute } = useAudio();

  return (
    <button
      onClick={toggleMute}
      className="fixed bottom-4 left-4 z-[999] w-12 h-12 rounded-full bg-black/70 hover:bg-black/90 border-2 border-yellow-400/50 hover:border-yellow-400 flex items-center justify-center transition-all duration-200 shadow-lg hover:scale-110 group"
      title={isMuted ? 'Unmute' : 'Mute'}
      aria-label={isMuted ? 'Unmute background music' : 'Mute background music'}
    >
      {isMuted ? (
        // Muted icon (speaker with X)
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-6 h-6 text-gray-400 group-hover:text-white transition-colors"
        >
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <line x1="23" y1="9" x2="17" y2="15" />
          <line x1="17" y1="9" x2="23" y2="15" />
        </svg>
      ) : (
        // Unmuted icon (speaker with waves)
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-6 h-6 text-yellow-400 group-hover:text-yellow-300 transition-colors"
        >
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        </svg>
      )}
    </button>
  );
};

export default MuteButton;
