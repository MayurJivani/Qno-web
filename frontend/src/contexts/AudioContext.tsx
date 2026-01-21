import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface AudioContextType {
  isMuted: boolean;
  toggleMute: () => void;
  isPlaying: boolean;
}

const AudioContext = createContext<AudioContextType | null>(null);

// Singleton audio element - lives outside React lifecycle
let globalAudio: HTMLAudioElement | null = null;
let globalHasUserInteracted = false;

const getAudioElement = (): HTMLAudioElement => {
  if (!globalAudio) {
    globalAudio = new Audio('/Theme.mp4');
    globalAudio.loop = true;
    globalAudio.volume = 0.3;
    globalAudio.preload = 'auto';
    
    // Load mute state from localStorage
    const savedMuted = localStorage.getItem('bgMusicMuted');
    globalAudio.muted = savedMuted === 'true';
  }
  return globalAudio;
};

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMuted, setIsMuted] = useState(() => {
    const saved = localStorage.getItem('bgMusicMuted');
    return saved === 'true';
  });
  const [isPlaying, setIsPlaying] = useState(false);

  // Initialize and sync with global audio element
  useEffect(() => {
    const audio = getAudioElement();
    
    // Sync initial state
    setIsPlaying(!audio.paused);
    setIsMuted(audio.muted);

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, []);

  // Handle mute state changes
  useEffect(() => {
    const audio = getAudioElement();
    audio.muted = isMuted;
    localStorage.setItem('bgMusicMuted', String(isMuted));
  }, [isMuted]);

  // Listen for user interaction to start playing
  useEffect(() => {
    const handleInteraction = () => {
      if (!globalHasUserInteracted) {
        globalHasUserInteracted = true;
        const audio = getAudioElement();
        if (audio.paused) {
          audio.play().catch(() => {
            // Autoplay still blocked, will try on next interaction
            globalHasUserInteracted = false;
          });
        }
      }
    };

    document.addEventListener('click', handleInteraction);
    document.addEventListener('keydown', handleInteraction);
    document.addEventListener('touchstart', handleInteraction);

    // Try to play immediately if already interacted
    if (globalHasUserInteracted) {
      const audio = getAudioElement();
      if (audio.paused) {
        audio.play().catch(() => {});
      }
    }

    return () => {
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
    // Try to play if not playing
    const audio = getAudioElement();
    if (audio.paused) {
      audio.play().catch(() => {});
    }
  }, []);

  return (
    <AudioContext.Provider value={{ isMuted, toggleMute, isPlaying }}>
      {children}
    </AudioContext.Provider>
  );
};
