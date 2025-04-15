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
      style={{
        ...cardStyle,
        backgroundColor: getColor(face, isLight),
      }}
    >
      {face.number}
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
  const [opponentCardDecks, setOpponentCardDecks] = useState<Record<string, OpponentCard[]>>({});
  const [isLightSideUp, setIsLightSideUp] = useState(true);
  const [playerList, setPlayerList] = useState<string[]>([]);
  const [readyPlayerIds, setReadyPlayerIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setAllReady(playerList.length > 0 && playerList.every((id) => readyPlayerIds.has(id)));
  }, [playerList, readyPlayerIds]);

  const resetGameState = () => {
    setRoomId(null);
    setPlayerId(null);
    setReady(false);
    setAllReady(false);
    setGameStarted(false);
    setCardDeck([]);
    setOpponentCardDecks({});
    setIsHost(false);
  };

  const onSocketMessage = useCallback((data: WSMessage) => {
    console.log('[WS] Received:', data);

    switch (data.type) {
      case 'ROOM_CREATED':
      case 'JOINED_ROOM': {
        const { roomId, playerId } = data as { roomId: string; playerId: string };
        setRoomId(roomId);
        setPlayerId(playerId);
        localStorage.setItem('roomId', roomId);
        localStorage.setItem('playerId', playerId);
        if (data.type === 'ROOM_CREATED') setIsHost(true);
        break;
      }

      case 'ROOM_JOINED': {
        const joinedPlayerId = data.playerId as string;
        setPlayerList((prev) => (prev.includes(joinedPlayerId) ? prev : [...prev, joinedPlayerId]));
        break;
      }

      case 'PLAYER_READY': {
        const readyId = data.playerId as string;
        setReadyPlayerIds((prev) => new Set(prev).add(readyId));
        break;
      }

      case 'START_GAME':
      case 'YOUR_HAND': {
        const cards = (data.drawPile || data.hand) as any[];
        if (!Array.isArray(cards)) {
          console.error(`[WS] Invalid card data for ${data.type}:`, data);
          return;
        }
        setCardDeck(cards.map(c =>
          new Card(
            { colour: c.lightSide.colour, number: c.lightSide.number },
            { colour: c.darkSide.colour, number: c.darkSide.number }
          )
        ));
        setGameStarted(true);
        break;
      }

      case 'OPPONENT_HAND': {
        const rawOpponentHands = data.opponentHands as Record<string, any[]>;
        const parsedHands: Record<string, OpponentCard[]> = Object.entries(rawOpponentHands).reduce(
          (acc, [id, cards]) => {
            acc[id] = cards.map(c => ({ backFace: { colour: c.colour, number: c.number } }));
            return acc;
          },
          {} as Record<string, OpponentCard[]>
        );
        setOpponentCardDecks(parsedHands);
        break;
      }

      case 'CARD_DRAWN': {
        const newCard = data.card as any;

        if (!newCard?.lightSide || !newCard?.darkSide) {
          console.error('[WS] Invalid card format in CARD_DRAWN:', newCard);
          return;
        }

        const constructedCard = new Card(
          { colour: newCard.lightSide.colour, number: newCard.lightSide.number },
          { colour: newCard.darkSide.colour, number: newCard.darkSide.number }
        );

        setCardDeck((prev) => [...prev, constructedCard]);
        break;
      }

      case 'OPPONENT_DREW_CARD': {
        const { opponentId, card } = data as {
          opponentId: string;
          card: { colour: string; number: string };
        };
      
        setOpponentCardDecks((prev) => {
          const opponentDeck = prev[opponentId] ?? [];
          const newCard = { backFace: { colour: card.colour, number: card.number } };
      
          return {
            ...prev,
            [opponentId]: [...opponentDeck, newCard], // create new array
          };
        });
      
        break;
      }
      


      case 'LEFT_ROOM':
        alert('Left the room.');
        break;

      case 'ERROR':
        alert(data.message as string);
        break;
    }
  }, []);

  const handleCreateRoom = () => connect({ type: 'CREATE_ROOM' });
  const handleJoinRoom = () => connect({ type: 'JOIN_ROOM', roomId: inputRoomId });
  const handleLeaveRoom = () => {
    sendMessage({ type: 'LEFT_ROOM', roomId, playerId });
    disconnect();
    resetGameState();
  };
  const handleReady = () => {
    setReady(true);
    sendMessage({ type: 'PLAYER_READY', roomId, playerId });
  };
  const handleStartGame = () => sendMessage({ type: 'START_GAME', roomId, playerId });
  const handleCardPlay = (card: Card) => {
    sendMessage({ type: 'PLAY_CARD', roomId, playerId, card });
    setCardDeck((prev) => prev.filter((c) => c !== card));
  };
  const handleDrawCard = () => sendMessage({ type: 'DRAW_CARD', roomId, playerId });

  const { connect, disconnect, sendMessage } = useGameSocket(onSocketMessage);

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>Qno Game Room</h1>

      {roomId ? (
        <>
          <p>Room ID: {roomId}</p>
          <p>Player ID: {playerId}</p>
          <button onClick={handleLeaveRoom}>Leave Room</button>

          {gameStarted ? (
            <>
              <h2>Game Started!</h2>
              <button onClick={() => setIsLightSideUp((prev) => !prev)}>
                Flip Cards ({isLightSideUp ? 'Light' : 'Dark'} Side Up)
              </button>

              <section>
                <h3>Opponent’s Cards:</h3>
                {Object.entries(opponentCardDecks).map(([opponentId, cards]) => (
                  <div key={opponentId} style={{ marginBottom: '20px' }}>
                    <h4>Opponent ID: {opponentId}</h4>
                    <div style={cardRowStyle}>
                      {cards.map((card, i) => (
                        <div
                          key={i}
                          style={{
                            ...cardStyle,
                            backgroundColor: getColor(card.backFace, false),
                          }}
                        >
                          {card.backFace.number}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </section>

              <section>
                <h3>Your Cards:</h3>
                <div style={cardRowStyle}>
                  {cardDeck.map((card, i) => (
                    <CardComponent
                      key={i}
                      card={card}
                      isLight={isLightSideUp}
                      onClick={() => handleCardPlay(card)}
                    />
                  ))}
                </div>
              </section>

              <button onClick={handleDrawCard}>Draw Card</button>
            </>
          ) : (
            <>
              {!ready && <button onClick={handleReady}>Ready</button>}
              {ready && <p>Waiting for opponent...</p>}
              {isHost && ready && allReady && <button onClick={handleStartGame}>Start Game</button>}
            </>
          )}
        </>
      ) : (
        <>
          <button onClick={handleCreateRoom}>Create Room</button>
          <input
            placeholder="Room ID"
            value={inputRoomId}
            onChange={(e) => setInputRoomId(e.target.value)}
          />
          <button onClick={handleJoinRoom}>Join Room</button>
        </>
      )}
    </div>
  );
};

const cardRowStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'center',
  gap: '10px',
};

const cardStyle: React.CSSProperties = {
  border: '1px solid black',
  padding: '20px',
  width: '60px',
  height: '90px',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  borderRadius: '8px',
  fontSize: '20px',
  fontWeight: 'bold',
  color: 'white',
  cursor: 'pointer',
  userSelect: 'none',
  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)',
  transition: 'transform 0.2s',
};



export default GameRoom;
