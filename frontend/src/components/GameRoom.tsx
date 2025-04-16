import React, { useState, useEffect, useCallback } from 'react';
import { useGameSocket } from '../hooks/useGameSocket';
import { Card, Side } from '../classes/Card';

interface WSMessage {
  type: string;
  [key: string]: unknown;
}

interface OpponentCard {
  backFace: Side;
}

const COLORS = {
  light: {
    Blue: '#006bb5',
    Green: '#3ba345',
    Red: '#ec1c24',
    Yellow: '#ffda00',
    Black: '#010101',
  },
  dark: {
    Orange: '#f8a01b',
    Teal: '#00a89a',
    Pink: '#eb008b',
    Purple: '#82298f',
    Black: '#010101',
  },
};

const getColor = (side: Side, isLight: boolean): string =>
  (isLight ? COLORS.light : COLORS.dark)[side.colour] ?? 'gray';

const CardComponent: React.FC<{
  card: Card;
  isLight: boolean;
  onClick?: () => void;
}> = ({ card, isLight, onClick }) => {
  const face = isLight ? card.lightSide : card.darkSide;
  return (
    <div
      onClick={onClick}
      className="w-16 h-24 rounded-xl shadow-lg text-white font-bold text-sm flex items-center justify-center text-center px-1 py-1 cursor-pointer select-none transition-transform transform hover:scale-110 overflow-hidden leading-tight break-words"
      style={{ backgroundColor: getColor(face, isLight) }}
    >
      {face.value}
    </div>
  );
};

const GameRoom: React.FC = () => {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [inputRoomId, setInputRoomId] = useState('');
  const [ready, setReady] = useState(false);
  const [allReady, setAllReady] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [cardDeck, setCardDeck] = useState<Card[]>([]);
  const [opponentDecks, setOpponentDecks] = useState<Record<string, OpponentCard[]>>({});
  const [isLightSideUp, setIsLightSideUp] = useState(true);
  const [players, setPlayers] = useState<string[]>([]);
  const [readyPlayers, setReadyPlayers] = useState<Set<string>>(new Set());
  const [drawTop, setDrawTop] = useState<Side | null>(null);
  const [discardTop, setDiscardTop] = useState<Side | null>(null);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);


  useEffect(() => {
    setAllReady(players.length > 0 && players.every(id => readyPlayers.has(id)));
  }, [players, readyPlayers]);

  const resetGame = () => {
    setRoomId(null);
    setPlayerId(null);
    setInputRoomId('');
    setReady(false);
    setAllReady(false);
    setIsHost(false);
    setGameStarted(false);
    setCardDeck([]);
    setOpponentDecks({});
    setPlayers([]);
    setReadyPlayers(new Set());
    setDrawTop(null);
    setDiscardTop(null);
  };

  const parseCards = (raw: any[]): Card[] =>
    raw.map((c) => new Card(c.lightSide, c.darkSide));

  const handleSocketMessage = useCallback((data: WSMessage) => {
    switch (data.type) {
      case 'ROOM_CREATED':
        setIsHost(true);
        break;

      case 'JOINED_ROOM': {
        const { roomId, playerId } = data as { roomId: string; playerId: string };
        setRoomId(roomId);
        setPlayerId(playerId);
        localStorage.setItem('roomId', roomId);
        localStorage.setItem('playerId', playerId);
        break;
      }

      case 'NEW_PLAYER_JOINED': {
        const id = data.playerId as string;
        setPlayers(prev => prev.includes(id) ? prev : [...prev, id]);
        break;
      }

      case 'PLAYER_READY': {
        const id = data.playerId as string;
        setReadyPlayers(prev => new Set(prev).add(id));
        break;
      }

      case 'GAME_STARTED':
      case 'TURN_CHANGED': {
        const current = (data as any).currentPlayer as string;
        setCurrentPlayerId(current);
        if (data.type === 'GAME_STARTED') setGameStarted(true);
        break;
      }

      case 'YOUR_HAND': {
        const cards = (data.drawPile || data.hand) as any[];
        if (Array.isArray(cards)) {
          setCardDeck(parseCards(cards));
          setGameStarted(true);
        }
        break;
      }

      case 'OPPONENT_HAND': {
        const hands = data.opponentHands as Record<string, any[]>;
        const parsed: Record<string, OpponentCard[]> = {};
        for (const [id, cards] of Object.entries(hands)) {
          parsed[id] = cards.map(c => ({ backFace: c }));
        }
        setOpponentDecks(parsed);
        break;
      }

      case 'CARD_DRAWN': {
        const card = data.card as any;
        setCardDeck(prev => [...prev, new Card(card.lightSide, card.darkSide)]);
        break;
      }

      case 'OPPONENT_DREW_CARD': {
        const { opponentId, card } = data as any;
        setOpponentDecks(prev => ({
          ...prev,
          [opponentId]: [...(prev[opponentId] || []), { backFace: card }]
        }));
        break;
      }

      case 'DRAW_PILE_TOP':
        setDrawTop(data.card as Side);
        break;

      case 'DISCARD_PILE_TOP':
        setDiscardTop(data.card as Side);
        break;

      case 'LEFT_ROOM':
        alert('Left the room.');
        resetGame();
        break;

      case 'ERROR':
        alert(data.message as string);
        break;
    }
  }, []);

  const { connect, disconnect, sendMessage } = useGameSocket(handleSocketMessage);

  const handleCreateRoom = () => connect({ type: 'CREATE_ROOM' });
  const handleJoinRoom = () => connect({ type: 'JOIN_ROOM', roomId: inputRoomId });
  const handleLeaveRoom = () => {
    sendMessage({ type: 'LEFT_ROOM', roomId, playerId });
    disconnect();
    resetGame();
  };
  const handleReady = () => {
    setReady(true);
    sendMessage({ type: 'PLAYER_READY', roomId, playerId });
  };
  const handleStartGame = () => sendMessage({ type: 'START_GAME', roomId, playerId });
  const handlePlayCard = (card: Card) => {
    sendMessage({ type: 'PLAY_CARD', roomId, playerId, card });
    setCardDeck(prev => prev.filter(c => c !== card));
  };
  const handleDrawCard = () => sendMessage({ type: 'DRAW_CARD', roomId, playerId });

  const renderPileCard = (label: string, side: Side | null) => (
    side && (
      <div className="mb-4">
        <h3 className="font-semibold">{label}</h3>
        <div className="flex justify-center">
          <CardComponent card={new Card(side, side)} isLight={!COLORS.dark[side.colour]} />
        </div>
      </div>
    )
  );

  return (
    <div className="min-h-screen text-white p-6 text-center">
      <h1 className="text-3xl font-bold mb-4">Qno Game Room</h1>

      {roomId ? (
        <>
          <p
            className="text-sm mb-1 cursor-pointer hover:underline"
            onClick={() => {
              navigator.clipboard.writeText(roomId ?? '');
              alert('Room ID copied to clipboard!');
            }}
          >
            Room ID: {roomId}
          </p>
          <p className="text-sm mb-3">
            Player ID: {playerId} {playerId === currentPlayerId && '(Your Turn)'}
          </p>


          <button className="bg-red-600 hover:bg-red-700 px-4 py-1 rounded mb-4" onClick={handleLeaveRoom}>
            Leave Room
          </button>

          {gameStarted ? (
            <>
              <h2 className="text-xl mb-2 font-semibold">Game Started!</h2>
              <button
                className="bg-blue-600 hover:bg-blue-700 px-4 py-1 rounded mb-6"
                onClick={() => setIsLightSideUp(prev => !prev)}
              >
                Flip Cards ({isLightSideUp ? 'Light' : 'Dark'} Side Up)
              </button>

              {renderPileCard('Discard Pile Top:', discardTop)}
              {renderPileCard('Draw Pile Top:', drawTop)}

              <div className="mb-8">
                <h3 className="text-lg font-semibold">Opponent’s Cards:</h3>
                {Object.entries(opponentDecks).map(([id, cards]) => (
                  <div key={id} className="mb-4">
                    <p className="text-sm mb-2">
                      Opponent ID: {id}
                      {id === currentPlayerId && ' (Playing)'}
                    </p>

                    <div className="flex flex-wrap justify-center gap-2">
                      {cards.map((card, i) => (
                        <CardComponent
                          key={i}
                          card={new Card(card.backFace, card.backFace)}
                          isLight={false}
                        />
                      ))}
                    </div>
                  </div>
                ))}

              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold">Your Cards:</h3>
                <div className="flex flex-wrap justify-center gap-2">
                  {cardDeck.map((card, i) => (
                    <CardComponent
                      key={i}
                      card={card}
                      isLight={isLightSideUp}
                      onClick={() => {
                        if (playerId === currentPlayerId) handlePlayCard(card);
                      }}
                    />
                  ))}
                </div>
              </div>

              <button
                className={`px-4 py-2 rounded font-semibold ${playerId !== currentPlayerId ? 'bg-gray-500 cursor-not-allowed' : 'bg-yellow-500 hover:bg-yellow-600'}`}

                onClick={handleDrawCard}
                disabled={playerId !== currentPlayerId}
              >
                Draw Card
              </button>
            </>
          ) : (
            <div className="mt-4">
              {!ready && (
                <button
                  className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-semibold"
                  onClick={handleReady}
                >
                  Ready
                </button>
              )}
              {ready && <p className="mt-2">Waiting for opponent...</p>}
              {isHost && ready && allReady && (
                <button
                  className="mt-4 bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded font-semibold"
                  onClick={handleStartGame}
                >
                  Start Game
                </button>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <button className="bg-green-500 hover:bg-green-600 px-4 py-2 rounded font-semibold" onClick={handleCreateRoom}>
            Create Room
          </button>
          <input
            type="text"
            className="rounded p-2 text-white w-64"
            placeholder="Enter Room ID"
            value={inputRoomId}
            onChange={(e) => setInputRoomId(e.target.value)}
          />
          <button className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded font-semibold" onClick={handleJoinRoom}>
            Join Room
          </button>
        </div>
      )}
    </div>
  );
};

export default GameRoom;
