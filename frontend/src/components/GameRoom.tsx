import React, { useEffect, useState } from 'react';
import WebSocketClient from './WebSocketClient';

const GameRoom: React.FC = () => {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [inputRoomId, setInputRoomId] = useState<string>('');
  const [ready, setReady] = useState<boolean>(false);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [cardDeck, setCardDeck] = useState<any[]>([]); // Store the deck
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
    WebSocketClient.send(
      JSON.stringify({ type: 'PLAY_CARD', roomId, playerId, card })
    );
  
    setCardDeck((prevHand) => prevHand.filter(c => c !== card));
  
    setDiscardCardDeck((prevDiscard) => [...prevDiscard, card]);
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
        case 'START_GAME': {
          setGameStarted(true);
          console.log("Received deck:", data.deck);
          const formattedDeck = Object.values(data.deck || {});
          setCardDeck(formattedDeck);
          break;
        }
        case 'YOUR_HAND': {
          console.log("Received hand:", data.hand);
          console.log("Received opponent's hand:", data.opponentHand);
          const formattedHand = Object.values(data.hand || {});
          setCardDeck(formattedHand);
          setOpponentCardDeck(Object.values(data.opponentHand || {}));
          break;
        }
        case 'ERROR':
          alert(data.message);
          break;
        default:
          console.warn("Unknown message type received:", data);
      }
    };
  }, [roomId, playerId]);

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
              <p>Your cards:</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
                {cardDeck.length > 0 ? (
                  cardDeck.map((card, index) => (
                    <div 
                      key={index} 
                      style={{ border: '1px solid black', padding: '10px', cursor: 'pointer' }} 
                      onClick={() => handleCardPlay(card)}
                    >
                      <p><strong>Card {index + 1}</strong></p>
                      {card.frontFace && card.backFace ? (
                        <>
                          <p>Front: {card.frontFace.cardColor} - {card.frontFace.cardValue} ({card.frontFace.cardSide})</p>
                          <p>Back: {card.backFace.cardColor} - {card.backFace.cardValue} ({card.backFace.cardSide})</p>
                        </>
                      ) : (
                        <p>Invalid card data</p>
                      )}
                    </div>
                  ))
                ) : (
                  <p>No cards received</p>
                )}
              </div>
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
