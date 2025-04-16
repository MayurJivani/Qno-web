import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import GameRoom from './components/GameRoom';
import AboutPage from './components/AboutPage';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/room" element={<GameRoom />} />
        <Route path="/about-us" element={<AboutPage />} />
      </Routes>
    </Router>
  );
};

export default App;
