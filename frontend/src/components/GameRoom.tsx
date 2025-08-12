import React, { useState, useEffect, useCallback } from 'react';
import { useGameSocket } from '../hooks/useGameSocket';
import { Card } from '../models/Card';
import { CardFace } from '../enums/cards/CardFace';
import { Hand } from '../models/Hand';
import { ColourUtils } from '../utils/ColourUtil';

interface WSMessage {
  type: string;
  [key: string]: unknown;
}


const CardComponent: React.FC<{
  card: Card;
  isLightSideActive?: boolean;
  onClick?: () => void;
}> = ({ card, isLightSideActive, onClick }) => {
  let cardFaceToShow: CardFace | undefined;

  if (isLightSideActive) {
    cardFaceToShow = card.lightSide ?? card.darkSide;
  } else {
    cardFaceToShow = card.darkSide ?? card.lightSide;
  }

  if (!cardFaceToShow) {
    // fallback UI if both sides are missing, or return null etc.
    return <div className="w-16 h-24 rounded-xl bg-gray-500 flex items-center justify-center">?</div>;
  }

  return (
    <div
      onClick={onClick}
      className="w-16 h-24 rounded-xl shadow-lg text-white font-bold text-sm flex items-center justify-center text-center px-1 py-1 cursor-pointer select-none transition-transform transform hover:scale-110 overflow-hidden leading-tight break-words"
      style={{ backgroundColor: ColourUtils.ColourHexValues[cardFaceToShow.colour] }}
    >
      {cardFaceToShow.value}
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
  const [myHand, setMyHand] = useState<Hand>(new Hand());
  const [opponentDecks, setOpponentDecks] = useState<Record<string, Card[]>>({});
  const [isLightSideActive, setIsLightSideActive] = useState(true);
  const [players, setPlayers] = useState<string[]>([]);
  const [readyPlayers, setReadyPlayers] = useState<Set<string>>(new Set());
  const [drawTop, setDrawTop] = useState<CardFace | null>(null);
  const [discardTop, setDiscardTop] = useState<CardFace | null>(null);
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
    setMyHand(new Hand());
    setOpponentDecks({});
    setPlayers([]);
    setReadyPlayers(new Set());
    setDrawTop(null);
    setDiscardTop(null);
  };

  function isJoinedRoomMessage(msg: WSMessage): msg is WSMessage & { roomId: string; playerId: string } {
    return typeof msg.roomId === 'string' && typeof msg.playerId === 'string';
  }

  const handleSocketMessage = useCallback((data: WSMessage) => {
    switch (data.type) {
      case 'ROOM_CREATED':
        setIsHost(true);
        break;

      case 'JOINED_ROOM': {
        if (isJoinedRoomMessage(data)) {
          setRoomId(data.roomId);
          setPlayerId(data.playerId);
          localStorage.setItem('roomId', data.roomId);
          localStorage.setItem('playerId', data.playerId);
        }
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
        const handData: Card[] = (data as any).hand.cards
        if (handData && Array.isArray(handData)) {
          setMyHand((prev: Hand) => {
            console.log("Hand received from backend: ", prev);
            prev.setCards(handData);
            return prev;
          });
          setGameStarted(true);
        }
        break;
      }

      case 'OPPONENT_HAND': {
        const hands = data.opponentHands as Record<string, CardFace[]>;
        const parsed: Record<string, Card[]> = {};

        for (const [id, cardFaces] of Object.entries(hands)) {
          parsed[id] = cardFaces.map(cardFace => new Card(undefined, cardFace));
        }

        setOpponentDecks(parsed); // now it's Record<string, Card[]>
        break;
      }



      case 'CARD_DRAWN': {
        const card: Card = data.card as any;
        setMyHand((prev: Hand) => {
          prev.addCard(card)
          return prev;
        });
        break;
      }

      case 'OPPONENT_DREW_CARD': {
        const { opponentId, card } = data as any;
        setOpponentDecks(prev => ({
          ...prev,
          [opponentId]: [
            ...(prev[opponentId] || []),
            new Card(undefined, card) // ✅ store as Card object, not OpponentCard
          ]
        }));
        break;
      }

      case 'PLAYED_CARD': {
        const cardFace: CardFace = data.card as any;
        let cardInstance: Card;
        if(isLightSideActive) {
          cardInstance = new Card(undefined, cardFace, undefined)
        } else {
          cardInstance = new Card(undefined, undefined, cardFace)
        }
        setMyHand(prevHand => {
          const newHand = new Hand();
          newHand.setCards(prevHand.getCards());  
          newHand.removeCard(cardInstance, isLightSideActive);
          return newHand;
        });
        break;
      }


      case 'DRAW_PILE_TOP':
        setDrawTop(data.card as CardFace);
        break;

      case 'DISCARD_PILE_TOP':
        setDiscardTop(data.card as CardFace);
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
    console.log(myHand)
    sendMessage({ type: 'PLAY_CARD', roomId, playerId, card });
  };
  const handleDrawCard = () => sendMessage({ type: 'DRAW_CARD', roomId, playerId });

  const renderCardOnTopOfDrawPile = (cardFace: CardFace | null) => (
    cardFace && (
      <div className="mb-4">
        <h3 className="font-semibold">{'Draw Pile Top:'}</h3>
        <div className="flex justify-center">
          <CardComponent
            card={isLightSideActive ? new Card(undefined, undefined, cardFace) : new Card(undefined, cardFace, undefined)}
            isLightSideActive={isLightSideActive}
          />
        </div>
      </div>
    )
  );

  const renderCardOnTopOfDiscardPile = (cardFace: CardFace | null) => (
    cardFace && (
      <div className="mb-4">
        <h3 className="font-semibold">{'Discard Pile Top:'}</h3>
        <div className="flex justify-center">
          <CardComponent
            card={!isLightSideActive ? new Card(undefined, undefined, cardFace) : new Card(undefined, cardFace, undefined)}
            isLightSideActive={isLightSideActive}
          />
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
                onClick={() => setIsLightSideActive(prev => !prev)}
              >
                Flip Cards ({isLightSideActive ? 'Light' : 'Dark'} cardFace Up)
              </button>

              {renderCardOnTopOfDiscardPile(discardTop)}
              {renderCardOnTopOfDrawPile(drawTop)}

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
                          key={card.id ?? i}
                          card={card}
                          isLightSideActive={!isLightSideActive}
                          onClick={() => {
                            if (playerId === currentPlayerId) handlePlayCard(card);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ))}

              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold">Your Cards:</h3>
                <div className="flex flex-wrap justify-center gap-2">
                  {myHand.getCards().map((card, i) => (
                    <CardComponent
                      key={card.id ?? i}
                      card={card}
                      isLightSideActive={isLightSideActive}
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
