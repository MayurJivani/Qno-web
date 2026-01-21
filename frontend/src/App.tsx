import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import GameRoom from './components/GameRoom';
import AboutPage from './components/AboutPage';
import RulesPage from './components/RulesPage';
import { AudioProvider } from './contexts/AudioContext';
import MuteButton from './components/MuteButton';

const App: React.FC = React.memo(() => {
  return (
    <AudioProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/room" element={<GameRoom />} />
          <Route path="/about-us" element={<AboutPage />} />
          <Route path="/rules" element={<RulesPage />} />
        </Routes>
        {/* Global mute button - appears on all pages */}
        <MuteButton />
      </Router>
    </AudioProvider>
  );
});

App.displayName = 'App';

export default App;
