import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import GameRoom from './components/GameRoom';
import AboutPage from './components/AboutPage';
import RulesPage from './components/RulesPage';

const App: React.FC = React.memo(() => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/room" element={<GameRoom />} />
        <Route path="/about-us" element={<AboutPage />} />
        <Route path="/rules" element={<RulesPage />} />
      </Routes>
    </Router>
  );
});

App.displayName = 'App';

export default App;
