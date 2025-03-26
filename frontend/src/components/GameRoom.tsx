import React, { useEffect, useState } from 'react';
import WebSocketClient from './WebSocketClient';

const GameRoom: React.FC = () => {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [inputRoomId, setInputRoomId] = useState<string>('');
  const [ready, setReady] = useState<boolean>(false);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [cardDeck, setCardDeck] = useState<any[]>([]);
  const [discardCardDeck, setDiscardCardDeck] = useState<any[]>([]);
  const [opponentCardDeck, setOpponentCardDeck] = useState<any[]>([]);

  const handleCreateRoom = () => {
    WebSocketClient.send(JSON.stringify({ type: 'CREATE_ROOM' }));
  };

  const handleJoinRoom = () => {
    WebSocketClient.send(JSON.stringify({ type: 'JOIN_ROOM', roomId: inputRoomId }));
  };

  const handleReady = () => {
    setReady(true);
    WebSocketClient.send(JSON.stringify({ type: 'READY', roomId, playerId }));
  };

  const handleCardPlay = (card: any) => {
    WebSocketClient.send(JSON.stringify({ type: 'PLAY_CARD', roomId, playerId, card }));

    setCardDeck((prevHand) => prevHand.filter(c => c !== card));
    setDiscardCardDeck((prevDiscard) => [...prevDiscard, card]);
  };

  // 🔹 Function to draw a card
  const handleDrawCard = () => {
    if (!roomId || !playerId) return;

    WebSocketClient.send(JSON.stringify({
      type: 'DRAW_CARD',
      roomId,
      playerId
    }));
  };

  useEffect(() => {
    WebSocketClient.onmessage = (message: MessageEvent) => {
      const data = JSON.parse(message.data);

      switch (data.type) {
        case 'ROOM_CREATED':
          setRoomId(data.roomId);
          setPlayerId(data.playerId);
          break;
        case 'JOINED_ROOM':
          setRoomId(data.roomId);
          setPlayerId(data.playerId);
          break;
        case 'START_GAME':
          setGameStarted(true);
          setCardDeck(Object.values(data.deck || {}));
          break;
        case 'YOUR_HAND':
          setCardDeck(Object.values(data.hand || {}));
          setOpponentCardDeck(Object.values(data.opponentHand || {}));
          break;
        case 'OPPONENT_PLAYED_CARD':
          console.log("Opponent Played Card:", data.card);
          console.log("Opponent's Hand Before:", opponentCardDeck);

          setOpponentCardDeck(prev => prev.filter(c => c.backFace.cardId !== data.card.backFace.cardId));
          console.log("Opponent's Hand After:", opponentCardDeck);
          setDiscardCardDeck(prev => [...prev, data.card]);
          break;

        case 'CARD_DRAWN':  // 🔹 Handling the drawn card
          setCardDeck(prevDeck => [...prevDeck, data.card]);
          break;
        case 'OPPONENT_DREW_CARD':
          setOpponentCardDeck(prevDeck => [...prevDeck, { backFace: data.card.backFace }]); // Add backface card to opponent's hand
          break;
        case 'ERROR':
          alert(data.message);
          break;
        default:
          console.warn("Unknown message type received:", data);
      }
    };
  }, [roomId, playerId, opponentCardDeck]);

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>Qno Game Room</h1>
      {roomId ? (
        <div>
          <p>Room ID: {roomId}</p>
          <p>Player ID: {playerId ? playerId : 'Waiting for player ID...'}</p>

          {gameStarted ? (
            <div>
              <h2>Game Started!</h2>

              <h3>Opponent's Hand:</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
                {opponentCardDeck.map((card, index) => (
                  <div key={index} style={{ border: '1px solid black', padding: '10px' }}>
                    <p><strong>Card {index + 1}</strong></p>
                    {card.backFace ? (
                      <p>{card.backFace.cardColor} - {card.backFace.cardValue}</p>
                    ) : (
                      <p>Unknown</p>
                    )}
                  </div>
                ))}
              </div>


              <h3>Your Cards:</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
                {cardDeck.map((card, index) => (
                  <div
                    key={index}
                    style={{ border: '1px solid black', padding: '10px', cursor: 'pointer' }}
                    onClick={() => handleCardPlay(card)}
                  >
                    <p><strong>Card {index + 1}</strong></p>
                    <p>{card.frontFace.cardColor} - {card.frontFace.cardValue}</p>
                  </div>
                ))}
              </div>

              <h3>Discard Pile:</h3>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                {discardCardDeck.map((card, index) => (
                  <div key={index} style={{ border: '1px solid red', padding: '10px' }}>
                    <p><strong>Discard {index + 1}</strong></p>
                    <p>{card.frontFace.cardColor} - {card.frontFace.cardValue}</p>
                  </div>
                ))}
              </div>

              <button onClick={handleDrawCard}>Draw Card</button>

            </div>
          ) : (
            <div>
              {!ready && <button onClick={handleReady}>Ready</button>}
              {ready && <p>Waiting for other player...</p>}
            </div>
          )}
        </div>
      ) : (
        <div>
          <button onClick={handleCreateRoom}>Create Room</button>
          <input
            type="text"
            placeholder="Enter Room ID"
            value={inputRoomId}
            onChange={(e) => setInputRoomId(e.target.value)}
          />
          <button onClick={handleJoinRoom}>Join Room</button>
        </div>
      )}
    </div>
  );
};

export default GameRoom;
