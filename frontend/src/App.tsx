import React from 'react';
import './App.css';
import GameRoom from './components/GameRoom';

const App: React.FC = () => {
  return (
    <div className="App">
      <h1>Welcome to Qno</h1>
      <GameRoom />
    </div>
  );
};

export default App;
