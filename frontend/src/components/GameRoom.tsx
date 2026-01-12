import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useGameSocket } from '../hooks/useGameSocket';
import { Card } from '../models/Card';
import { CardFace } from '../enums/cards/CardFace';
import { Hand } from '../models/Hand';
import RoomCreationForm from './RoomCreationForm';
import EffectNotifications from './EffectNotifications';
import PlayableCardModal from './PlayableCardModal';
import GameBoard from './GameBoard';
import EntanglementSelectionModal from './EntanglementSelectionModal';
import WebSocketLogWindow, { WSLogEntry } from './WebSocketLogWindow';
import VictoryModal from './VictoryModal';

interface WSMessage {
  type: string;
  [key: string]: unknown;
}





const GameRoom: React.FC = () => {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [inputRoomId, setInputRoomId] = useState('');
  const [inputPlayerName, setInputPlayerName] = useState<string>('');
  const [playerNames, setPlayerNames] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);
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
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [effectNotification, setEffectNotification] = useState<{ message: string; type: string } | null>(null);
  const [isTeleportationMode, setIsTeleportationMode] = useState(false);
  const [isEntanglementMode, setIsEntanglementMode] = useState(false);
  const [entanglementOpponents, setEntanglementOpponents] = useState<Array<{ id: string; name: string }>>([]);
  const [entangledPlayers, setEntangledPlayers] = useState<Set<string>>(new Set());
  const [mustPlayMeasurement, setMustPlayMeasurement] = useState(false);
  const [turnDirection, setTurnDirection] = useState<'clockwise' | 'anti-clockwise'>('clockwise');
  const [discardPileShake, setDiscardPileShake] = useState(false);
  const [playableCardDrawn, setPlayableCardDrawn] = useState<{ card: Card; message: string } | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [wsLogs, setWsLogs] = useState<WSLogEntry[]>([]);
  const [showVictoryModal, setShowVictoryModal] = useState(false);
  const [victoryData, setVictoryData] = useState<{ isWinner: boolean; winnerName: string } | null>(null);

  // Use refs for values used in callbacks to avoid dependency issues
  const isLightSideActiveRef = useRef(isLightSideActive);
  const playerIdRef = useRef(playerId);
  const inputPlayerNameRef = useRef(inputPlayerName);
  const playerNamesRef = useRef(playerNames);
  
  // Notification queue system
  const notificationQueueRef = useRef<Array<{ message: string; type: string; duration: number }>>([]);
  const notificationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isProcessingNotificationRef = useRef(false);

  useEffect(() => {
    isLightSideActiveRef.current = isLightSideActive;
  }, [isLightSideActive]);

  useEffect(() => {
    playerIdRef.current = playerId;
  }, [playerId]);

  useEffect(() => {
    inputPlayerNameRef.current = inputPlayerName;
  }, [inputPlayerName]);

  useEffect(() => {
    playerNamesRef.current = playerNames;
  }, [playerNames]);

  const allReady = useMemo(() => {
    return players.length > 0 && players.every(id => readyPlayers.has(id));
  }, [players, readyPlayers]);


  function isJoinedRoomMessage(msg: WSMessage): msg is WSMessage & { roomId: string; playerId: string } {
    return typeof msg.roomId === 'string' && typeof msg.playerId === 'string';
  }

  // Function to process notification queue - using ref to avoid closure issues
  const processNotificationQueueRef = useRef<() => void>(() => {});
  
  // Function to add notification to queue - using ref to avoid closure issues
  const queueNotificationRef = useRef<(message: string, type: string, duration: number) => void>();
  
  // Initialize the process function
  processNotificationQueueRef.current = () => {
    if (isProcessingNotificationRef.current) {
      return; // Already processing, will be triggered when current notification finishes
    }

    if (notificationQueueRef.current.length === 0) {
      return; // No notifications in queue
    }

    const nextNotification = notificationQueueRef.current.shift();
    if (!nextNotification) {
      return;
    }

    console.log('Processing notification:', nextNotification.message); // Debug log
    isProcessingNotificationRef.current = true;
    setEffectNotification({ message: nextNotification.message, type: nextNotification.type });

    // Clear any existing timeout
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
    }

    // Set timeout to process next notification
    notificationTimeoutRef.current = setTimeout(() => {
      setEffectNotification(null);
      isProcessingNotificationRef.current = false;
      // Process next notification after a short delay
      setTimeout(() => {
        processNotificationQueueRef.current();
      }, 300);
    }, nextNotification.duration);
  };
  
  // Initialize the queue function
  queueNotificationRef.current = (message: string, type: string, duration: number = 3000) => {
    console.log('Queueing notification:', message, 'Type:', type, 'Duration:', duration); // Debug log
    notificationQueueRef.current.push({ message, type, duration });
    processNotificationQueueRef.current();
  };

  // Stable wrapper for use in callbacks
  const queueNotification = useCallback((message: string, type: string, duration: number = 3000) => {
    if (queueNotificationRef.current) {
      queueNotificationRef.current(message, type, duration);
    }
  }, []);

  const handleSocketMessage = useCallback((data: unknown) => {
    const message = data as WSMessage;
    setIsConnecting(false);
    setConnectionError(null);
    const currentIsLightSideActive = isLightSideActiveRef.current;
    const currentPlayerId = playerIdRef.current;
    
    switch (message.type) {
      case 'ROOM_CREATED':
        setIsHost(true);
        break;

      case 'JOINED_ROOM': {
        if (isJoinedRoomMessage(message)) {
          setRoomId(message.roomId);
          setPlayerId(message.playerId);
          localStorage.setItem('roomId', message.roomId);
          localStorage.setItem('playerId', message.playerId);
          // Store current player's name from ref
          const currentName = inputPlayerNameRef.current;
          if (currentName && currentName.trim()) {
            setPlayerNames(prev => ({ ...prev, [message.playerId]: currentName.trim() }));
          }
        }
        break;
      }


      case 'NEW_PLAYER_JOINED': {
        const id = message.playerId as string;
        const name = (message as { playerName?: string }).playerName;
        setPlayers(prev => prev.includes(id) ? prev : [...prev, id]);
        if (name) {
          setPlayerNames(prev => ({ ...prev, [id]: name }));
        }
        break;
      }

      case 'PLAYER_READY': {
        const id = message.playerId as string;
        setReadyPlayers(prev => new Set(prev).add(id));
        break;
      }

      case 'GAME_STARTED':
      case 'TURN_CHANGED': {
        const gameData = message as { currentPlayer?: string; direction?: number; playerNames?: Record<string, string>; turnOrder?: string[] };
        const current = gameData.currentPlayer;
        if (typeof current === 'string') {
          setCurrentPlayerId(current);
          // Check if current player is entangled and has Measurement card
          if (current === playerId && entangledPlayers.has(current)) {
            const hasMeasurement = myHand.getCards().some(card => {
              const activeFace = isLightSideActive ? card.lightSide : card.darkSide;
              return activeFace?.value === 'Measurement';
            });
            setMustPlayMeasurement(hasMeasurement);
          } else {
            setMustPlayMeasurement(false);
          }
        }
        if (gameData.direction !== undefined) {
          setTurnDirection(gameData.direction === 1 ? 'clockwise' : 'anti-clockwise');
        }
        if (gameData.playerNames) {
          setPlayerNames(gameData.playerNames);
        }
        if (gameData.turnOrder && Array.isArray(gameData.turnOrder)) {
          // Use the turn order from backend to ensure correct sequence
          setPlayers(gameData.turnOrder);
        }
        if (message.type === 'GAME_STARTED') setGameStarted(true);
        break;
      }

      case 'YOUR_HAND': {
        const handData = (message as { hand?: { cards?: Card[] } }).hand?.cards;
        if (handData && Array.isArray(handData)) {
          setMyHand(() => {
            const newHand = new Hand();
            newHand.setCards(handData);
            return newHand;
          });
          setGameStarted(true);
        }
        break;
      }

      case 'OPPONENT_HAND': {
        const hands = message.opponentHands as Record<string, CardFace[]>;
        const playerNamesData = (message as { playerNames?: Record<string, string> }).playerNames;
        const turnOrderData = (message as { turnOrder?: string[] }).turnOrder;
        
        if (playerNamesData) {
          setPlayerNames(prev => ({ ...prev, ...playerNamesData }));
        }
        const parsed: Record<string, Card[]> = {};

        // Use turn order from backend if available, otherwise fall back to opponentHands keys + current player
        if (turnOrderData && Array.isArray(turnOrderData)) {
          // Use the turn order from backend to ensure correct sequence
          setPlayers(turnOrderData);
        } else {
          // Extract all opponent IDs from the opponentHands keys
          const opponentIds = Object.keys(hands);
          
          // Update players list: include all opponents + current player
          // This ensures joined players see all existing players immediately
          if (currentPlayerId) {
            setPlayers(() => {
              const allPlayers = [...opponentIds, currentPlayerId];
              // Remove duplicates and maintain order
              return Array.from(new Set(allPlayers));
            });
          }
        }

        for (const [id, cardFaces] of Object.entries(hands)) {
          // Map card faces to Card objects
          // The cardFace received is the inactive face, so we need to put it in the correct side
          // Use the current state value, not the ref (which might be stale after side flip)
          const isLightActive = isLightSideActiveRef.current;
          parsed[id] = cardFaces.map(cardFace => {
            // If light side is active, inactive face is dark side
            // If dark side is active, inactive face is light side
            if (isLightActive) {
              return new Card(undefined, undefined, cardFace); // dark side (inactive)
            } else {
              return new Card(undefined, cardFace, undefined); // light side (inactive)
            }
          });
        }

        setOpponentDecks(parsed); // now it's Record<string, Card[]>
        break;
      }



      case 'CARD_DRAWN': {
        // Backend sends both the card and the updated hand
        // Use the hand directly to avoid duplicates
        const handData = (message as { hand?: Card[] }).hand;
        if (handData && Array.isArray(handData)) {
          setMyHand(() => {
            const newHand = new Hand();
            newHand.setCards(handData);
            // If player is entangled and just drew Measurement, they'll need to play it next turn
            // The TURN_CHANGED handler will check this, but we can prepare here
            return newHand;
          });
        }
        break;
      }

      case 'PLAYABLE_CARD_DRAWN': {
        const card = (message as { card?: Card }).card;
        const msg = (message as { message?: string }).message || 'You drew a playable card!';
        if (card) {
          setPlayableCardDrawn({ card, message: msg });
        }
        break;
      }

      case 'OPPONENT_DREW_CARD': {
        // The backend will send OPPONENT_HAND to update the full hand state
        // We can still use this for any immediate UI feedback if needed
        // But the OPPONENT_HAND handler will ensure the correct state
        break;
      }

      case 'PLAYED_CARD': {
        const cardFace = (message as { card?: CardFace }).card;
        if (!cardFace) break;
        let cardInstance: Card;
        if(currentIsLightSideActive) {
          cardInstance = new Card(undefined, cardFace, undefined)
        } else {
          cardInstance = new Card(undefined, undefined, cardFace)
        }
        setMyHand((prevHand: Hand) => {
          const newHand = new Hand();
          newHand.setCards(prevHand.getCards());  
          newHand.removeCard(cardInstance, currentIsLightSideActive);
          return newHand;
        });
        break;
      }

      case 'OPPONENT_PLAYED_CARD': {
        // The backend will send OPPONENT_HAND to update the full hand state
        // We can still use this for any immediate UI feedback if needed
        // But the OPPONENT_HAND handler will ensure the correct state
        break;
      }


      case 'GAME_END': {
        const gameEndData = message as { winnerId?: string; winnerName?: string; message?: string };
        setGameStarted(false);
        const winnerId = gameEndData.winnerId;
        const isWinner = winnerId === currentPlayerId;
        
        // Get winner name from message or playerNames state
        const winnerName = gameEndData.winnerName || 
          (winnerId && playerNamesRef.current[winnerId]) || 
          'Someone';
        
        setVictoryData({ isWinner, winnerName });
        setShowVictoryModal(true);
        break;
      }

      case 'CARD_EFFECT': {
        const effectData = message as { 
          effect?: string; 
          isLightSideActive?: boolean; 
          direction?: string;
          teleportation?: {
            cardTeleportedFromPlayerId?: string;
            cardTeleportedToPlayerId?: string;
            cardTeleported?: number;
          };
          entanglement?: {
            player1Id?: string;
            player2Id?: string;
            initiatorId?: string;
          };
        };
        
        // Handle side flip effects (Pauli X, Pauli Y)
        if (typeof effectData.isLightSideActive === 'boolean') {
          // Update state and ref immediately so OPPONENT_HAND handler uses correct value
          setIsLightSideActive(effectData.isLightSideActive);
          isLightSideActiveRef.current = effectData.isLightSideActive;
          
          // Trigger flip animation
          setIsFlipping(true);
          setTimeout(() => setIsFlipping(false), 600); // Match animation duration
          
          if (effectData.effect === 'Pauli_X') {
            setEffectNotification({ message: '🔀 Side Flipped!', type: 'flip' });
            setTimeout(() => setEffectNotification(null), 2000);
          } else if (effectData.effect === 'Pauli_Y') {
            setEffectNotification({ message: '🔀 Side Flipped & Direction Reversed!', type: 'flip' });
            setTimeout(() => setEffectNotification(null), 2000);
          }
        }
        
        // Handle direction change (Pauli Z, Pauli Y)
        if (effectData.direction !== undefined) {
          const dirValue = typeof effectData.direction === 'number' ? effectData.direction : 
            (String(effectData.direction) === '1' || effectData.direction === 'clockwise' ? 1 : -1);
          const newDirection = dirValue === 1 ? 'clockwise' : 'anti-clockwise';
          setTurnDirection(newDirection);
          if (effectData.effect === 'Pauli_Z') {
            setEffectNotification({ message: `🔄 Turn Direction: ${newDirection === 'clockwise' ? '→ Clockwise' : '← Anti-clockwise'}`, type: 'direction' });
            setTimeout(() => setEffectNotification(null), 2000);
          }
        }
        
        // Handle Measurement effect
        if (effectData.effect === 'Measurement') {
          setEffectNotification({ message: '📏 Measurement: Card Revealed!', type: 'measurement' });
          setDiscardPileShake(true);
          setTimeout(() => setDiscardPileShake(false), 500);
          setTimeout(() => setEffectNotification(null), 2000);
        }
        
        // Handle Decoherence effect
        if (effectData.effect === 'Decoherence') {
          setEffectNotification({ message: '🌈 Decoherence: New Card Revealed!', type: 'superposition' });
          setDiscardPileShake(true);
          setTimeout(() => setDiscardPileShake(false), 500);
          setTimeout(() => setEffectNotification(null), 2000);
        }
        
        // Handle Superposition effect
        if (effectData.effect === 'Superposition') {
          setEffectNotification({ message: '⚛️ Superposition: Waiting for Measurement...', type: 'superposition' });
          setTimeout(() => setEffectNotification(null), 2000);
        }
        
        // Handle Teleportation completion
        if (effectData.teleportation) {
          const { cardTeleportedToPlayerId, cardTeleportedFromPlayerId, cardTeleported } = effectData.teleportation;
          if (cardTeleportedToPlayerId === currentPlayerId) {
            setEffectNotification({ message: '✨ Card Teleported to Your Hand!', type: 'teleportation' });
          } else {
            setEffectNotification({ message: '✨ A Card Was Teleported!', type: 'teleportation' });
          }
          setIsTeleportationMode(false);
          // Remove the teleported card from the opponent's hand immediately
          if (cardTeleportedFromPlayerId && cardTeleportedFromPlayerId !== currentPlayerId && cardTeleported) {
            setOpponentDecks(prev => {
              const updated = { ...prev };
              if (updated[cardTeleportedFromPlayerId]) {
                updated[cardTeleportedFromPlayerId] = updated[cardTeleportedFromPlayerId].filter(
                  (c: Card) => c.id !== cardTeleported
                );
              }
              return updated;
            });
          }
          setTimeout(() => setEffectNotification(null), 2000);
          // Opponent hands will be refreshed by backend via OPPONENT_HAND message to hide IDs
        }

        // Handle Entanglement effect
        if (effectData.entanglement) {
          const { player1Id, player2Id } = effectData.entanglement;
          if (player1Id && player2Id) {
            setEntangledPlayers(new Set([player1Id, player2Id]));
            const player1Name = playerNames[player1Id] || player1Id.substring(0, 8);
            const player2Name = playerNames[player2Id] || player2Id.substring(0, 8);
            setEffectNotification({ 
              message: `🔗 ${player1Name} and ${player2Name} are entangled!`, 
              type: 'entanglement' 
            });
            setTimeout(() => setEffectNotification(null), 3000);
          }
        }

        // Handle Entanglement card being played
        if (effectData.effect === 'Entanglement') {
          // Will be handled by AWAITING_ENTANGLEMENT_SELECTION message
        }
        break;
      }

      case 'AWAITING_ENTANGLEMENT_SELECTION': {
        setIsEntanglementMode(true);
        const entanglementMsg = (message as { message?: string; opponents?: Array<{ id: string; name: string }> });
        setEntanglementOpponents(entanglementMsg.opponents || []);
        setEffectNotification({ message: `🔗 ${entanglementMsg.message || 'Select 2 opponents to entangle.'}`, type: 'entanglement' });
        break;
      }

      case 'ENTANGLEMENT_COLLAPSED': {
        const collapseData = message as {
          collapsedBy?: string;
          player1Id?: string;
          player2Id?: string;
          player1Cards?: number;
          player2Cards?: number;
          playerWhoDrew3?: string;
          playerWhoDrew0?: string;
          playerWhoDrew3Name?: string;
          playerWhoDrew0Name?: string;
          outcome?: 'A' | 'B';
        };
        
        if (collapseData.player1Id && collapseData.player2Id) {
          // Remove entanglement status
          setEntangledPlayers(prev => {
            const updated = new Set(prev);
            updated.delete(collapseData.player1Id!);
            updated.delete(collapseData.player2Id!);
            return updated;
          });

          // Note: The notification about who drew 3/0 cards is handled by ENTANGLEMENT_NOTIFICATION
          // which is broadcast to all players from the backend with the correct player names
        }
        setMustPlayMeasurement(false);
        break;
      }

      case 'ENTANGLEMENT_NOTIFICATION': {
        console.log('Received ENTANGLEMENT_NOTIFICATION:', message); // Debug log
        const notifData = message as {
          message?: string;
          notificationType?: 'entangled' | 'skip' | 'collapse';
        };
        console.log('Notification data:', notifData); // Debug log
        if (notifData.message) {
          const duration = notifData.notificationType === 'collapse' ? 5000 : 3000;
          console.log('Calling queueNotification with:', notifData.message, 'duration:', duration); // Debug log
          queueNotification(notifData.message, 'entanglement', duration);
        } else {
          console.warn('ENTANGLEMENT_NOTIFICATION received but message is missing'); // Debug log
        }
        break;
      }

      case 'AWAITING_TELEPORTATION_TARGET': {
        setIsTeleportationMode(true);
        const teleportMsg = (message as { message?: string }).message || 'Select a card from an opponent to teleport.';
        setEffectNotification({ message: `🎯 ${teleportMsg}`, type: 'teleportation' });
        break;
      }

      case 'REFRESH_OPPONENT_HAND': {
        const hands = (message as { opponentHands?: Record<string, Card[]> }).opponentHands;
        if (hands) {
          const parsed: Record<string, Card[]> = {};
          for (const [id, cards] of Object.entries(hands)) {
            // Cards from REFRESH_OPPONENT_HAND have IDs and the inactive face populated
            // When light side is active, darkSide is populated and lightSide is empty
            // When dark side is active, lightSide is populated and darkSide is empty
            parsed[id] = cards.map((card: Card) => {
              // The backend sends Card objects with id and one face populated
              // We need to preserve both the ID and the face structure
              const cardId = card.id !== undefined && card.id !== null ? card.id : undefined;
              const lightSide = card.lightSide?.colour && card.lightSide?.value ? card.lightSide : undefined;
              const darkSide = card.darkSide?.colour && card.darkSide?.value ? card.darkSide : undefined;
              return new Card(cardId, lightSide, darkSide);
            });
          }
          setOpponentDecks(parsed);
        }
        break;
      }

      case 'DRAW_PILE_TOP':
        setDrawTop(message.card as CardFace);
        break;

      case 'DISCARD_PILE_TOP':
        setDiscardTop(message.card as CardFace);
        break;

      case 'LEFT_ROOM':
        alert('Left the room.');
        // Reset game state
        setRoomId(null);
        setPlayerId(null);
        setInputRoomId('');
        setInputPlayerName('');
        setReady(false);
        setIsHost(false);
        setGameStarted(false);
        setMyHand(new Hand());
        setOpponentDecks({});
        setPlayerNames({});
        setPlayers([]);
        setReadyPlayers(new Set());
        setDrawTop(null);
        setDiscardTop(null);
        setIsTeleportationMode(false);
        setEffectNotification(null);
        break;

      case 'ERROR': {
        const errorMessage = message.message as string;
        setConnectionError(errorMessage);
        setIsConnecting(false);
        // Only alert for connection errors, not game errors
        if (errorMessage.includes('connect') || errorMessage.includes('connection')) {
          alert(errorMessage);
        }
        break;
      }
      case 'CONNECTED': {
        setIsConnecting(false);
        setConnectionError(null);
        break;
      }
    }
  }, []); // No dependencies needed - using refs for dynamic values

  // WebSocket logger - only log gameplay action messages
  const wsLogger = useCallback((direction: 'sent' | 'received', type: string, data: unknown) => {
    // Filter to only show gameplay messages (card plays, effects, entanglement, teleportation)
    const gameActionTypes = [
      'PLAYED_CARD',
      'OPPONENT_PLAYED_CARD',
      'CARD_EFFECT',
      'ENTANGLEMENT_NOTIFICATION',
      'ENTANGLEMENT_COLLAPSED',
      'AWAITING_ENTANGLEMENT_SELECTION',
      'AWAITING_TELEPORTATION_TARGET',
      'TELEPORTATION_SELECT',
      'TURN_CHANGED',
      'DRAW_CARD',
      'DRAWN_CARD_DECISION'
    ];
    
    // Only log if it's a game action type
    if (gameActionTypes.includes(type)) {
      setWsLogs(prev => [...prev, {
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        direction,
        type,
        data
      }]);
    }
  }, []);

  const { connect, disconnect, sendMessage } = useGameSocket(handleSocketMessage, wsLogger);

  const handleCreateRoom = useCallback(() => {
    if (!inputPlayerName.trim()) {
      alert('Please enter your name');
      return;
    }
    setIsConnecting(true);
    connect({ type: 'CREATE_ROOM', playerName: inputPlayerName.trim() });
  }, [connect, inputPlayerName]);

  const handleJoinRoom = useCallback(() => {
    if (!inputRoomId.trim()) {
      alert('Please enter a room ID');
      return;
    }
    if (!inputPlayerName.trim()) {
      alert('Please enter your name');
      return;
    }
    setIsConnecting(true);
    connect({ type: 'JOIN_ROOM', roomId: inputRoomId, playerName: inputPlayerName.trim() });
  }, [connect, inputRoomId, inputPlayerName]);
  const handleLeaveRoom = () => {
    sendMessage({ type: 'LEFT_ROOM', roomId, playerId });
    disconnect();
    // Reset game state
    setRoomId(null);
    setPlayerId(null);
    setInputRoomId('');
    setInputPlayerName('');
    setReady(false);
    setIsHost(false);
    setGameStarted(false);
    setMyHand(new Hand());
    setOpponentDecks({});
    setPlayerNames({});
    setPlayers([]);
    setReadyPlayers(new Set());
    setDrawTop(null);
    setDiscardTop(null);
    setIsTeleportationMode(false);
    setEffectNotification(null);
    setPlayableCardDrawn(null);
  };
  const handleReady = () => {
    setReady(true);
    sendMessage({ type: 'PLAYER_READY', roomId, playerId });
  };
  const handleStartGame = () => sendMessage({ type: 'START_GAME', roomId, playerId });
  const handlePlayCard = (card: Card) => {
    sendMessage({ type: 'PLAY_CARD', roomId, playerId, card });
  };
  const handleDrawCard = () => sendMessage({ type: 'DRAW_CARD', roomId, playerId });

  const handleDrawnCardDecision = (decision: 'PLAY' | 'KEEP') => {
    if (roomId && playerId) {
      sendMessage({ type: 'DRAWN_CARD_DECISION', roomId, playerId, decision });
      setPlayableCardDrawn(null);
    }
  };

  const getPlayerPosition = useCallback((index: number, totalPlayers: number) => {
    if (totalPlayers === 2) {
      return index === 0 ? 'top-center' : 'bottom-center';
    } else if (totalPlayers === 3) {
      // For 3 players: opponents closer to center
      return index === 0 ? 'top-right-center' : index === 1 ? 'top-left-center' : 'bottom-center';
    } else {
      // For 4 players: one on top, two on left-right sides
      return index === 0 ? 'top-center' : index === 1 ? 'mid-left' : index === 2 ? 'mid-right' : 'bottom-center';
    }
  }, []);

  // Sort players based on turn order from viewing player's perspective
  // Players are arranged in turn order around the board, with viewing player at bottom
  const sortedPlayerIds = useMemo(() => {
    if (!playerId || players.length === 0) return players;
    if (players.length === 1) return players;
    
    // Find viewing player's index in players array (this should match turn order from backend)
    const viewingPlayerIndex = players.indexOf(playerId);
    if (viewingPlayerIndex === -1) {
      // Fallback: current player last
      const others = players.filter(id => id !== playerId);
      return [...others, playerId];
    }
    
    // Arrange players around the board in turn order
    // Position mapping:
    // - For 3 players: [top-left-center, top-right-center, bottom-center (viewing)]
    // - For 4 players: [top-center, mid-left, mid-right, bottom-center (viewing)]
    const ordered: string[] = [];
    
    if (turnDirection === 'clockwise') {
      if (players.length === 3) {
        // 3 players: previous -> top-left, next -> top-right, viewing -> bottom
        const nextPlayerIdx = (viewingPlayerIndex + 1) % players.length;
        const prevPlayerIdx = (viewingPlayerIndex - 1 + players.length) % players.length;
        ordered.push(players[prevPlayerIdx]); // top-left-center (index 0)
        ordered.push(players[nextPlayerIdx]); // top-right-center (index 1)
        ordered.push(playerId); // bottom-center (index 2, viewing)
      } else if (players.length === 4) {
        // 4 players: 2nd next -> top-center, next -> mid-left, previous -> mid-right, viewing -> bottom
        const nextPlayerIdx = (viewingPlayerIndex + 1) % players.length;
        const secondNextIdx = (viewingPlayerIndex + 2) % players.length;
        const prevPlayerIdx = (viewingPlayerIndex - 1 + players.length) % players.length;
        ordered.push(players[secondNextIdx]); // top-center (index 0)
        ordered.push(players[nextPlayerIdx]); // mid-left (index 1)
        ordered.push(players[prevPlayerIdx]); // mid-right (index 2)
        ordered.push(playerId); // bottom-center (index 3, viewing)
      } else {
        // 2 players: next -> top, viewing -> bottom
        const nextPlayerIdx = (viewingPlayerIndex + 1) % players.length;
        ordered.push(players[nextPlayerIdx]);
        ordered.push(playerId);
      }
    } else {
      // Anti-clockwise: reverse the order
      if (players.length === 3) {
        const nextPlayerIdx = (viewingPlayerIndex - 1 + players.length) % players.length;
        const prevPlayerIdx = (viewingPlayerIndex + 1) % players.length;
        ordered.push(players[nextPlayerIdx]); // top-left-center (index 0) - reversed
        ordered.push(players[prevPlayerIdx]); // top-right-center (index 1) - reversed
        ordered.push(playerId); // bottom-center (index 2, viewing)
      } else if (players.length === 4) {
        const nextPlayerIdx = (viewingPlayerIndex - 1 + players.length) % players.length;
        const secondNextIdx = (viewingPlayerIndex - 2 + players.length) % players.length;
        const prevPlayerIdx = (viewingPlayerIndex + 1) % players.length;
        ordered.push(players[secondNextIdx]); // top-center (index 0) - reversed
        ordered.push(players[nextPlayerIdx]); // mid-left (index 1) - reversed
        ordered.push(players[prevPlayerIdx]); // mid-right (index 2) - reversed
        ordered.push(playerId); // bottom-center (index 3, viewing)
      } else {
        const nextPlayerIdx = (viewingPlayerIndex - 1 + players.length) % players.length;
        ordered.push(players[nextPlayerIdx]);
        ordered.push(playerId);
      }
    }
    
    return ordered;
  }, [players, playerId, turnDirection]);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Grid background */}
      <div className="qno-grid-bg"></div>

      {/* Header */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-50">
        <div className="flex items-center gap-4">
          {gameStarted && (
            <div className={`inline-block px-4 py-2 rounded-lg font-bold text-lg shadow-2xl ${
              playerId === currentPlayerId ? 'bg-yellow-400 text-black animate-pulse' : 'bg-gray-600 text-white'
            }`}>
              {playerId === currentPlayerId ? '🔄 Your Turn' : '⏳ Waiting...'}
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          {gameStarted && (
            <div className="bg-black/50 px-4 py-2 rounded-lg font-semibold text-white text-sm">
              {turnDirection === 'clockwise' ? '⬅️' : '➡️'} {turnDirection === 'clockwise' ? 'CW' : 'CCW'}
            </div>
          )}
          {roomId && (
            <>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(roomId ?? '');
                  alert('Room ID copied!');
                }}
                className="text-xs sm:text-sm text-white/80 hover:text-white bg-black/30 px-3 py-1 rounded transition-all"
              >
                Room: {roomId?.substring(0, 8)}...
              </button>
              <button
                className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-semibold transition-all shadow-lg text-sm"
                onClick={handleLeaveRoom}
              >
                Leave
              </button>
            </>
          )}
        </div>
      </div>

      {roomId ? (
        <>
          {gameStarted ? (
            <>
              <EffectNotifications
                effectNotification={effectNotification}
                isTeleportationMode={isTeleportationMode}
              />
              {mustPlayMeasurement && playerId === currentPlayerId && (
                <div className="fixed top-32 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-lg font-semibold text-center bg-purple-600 animate-pulse border-2 border-yellow-400 shadow-2xl">
                  ⚛️ You are entangled! You must play your Measurement card!
                </div>
              )}
                    <GameBoard
                      sortedPlayerIds={sortedPlayerIds}
                      playerId={playerId}
                      playerNames={playerNames}
                      currentPlayerId={currentPlayerId}
                      myHand={myHand}
                      opponentDecks={opponentDecks}
                      isLightSideActive={isLightSideActive}
                      discardTop={discardTop}
                      drawTop={drawTop}
                      discardPileShake={discardPileShake}
                      turnDirection={turnDirection}
                      isTeleportationMode={isTeleportationMode}
                      isFlipping={isFlipping}
                      entangledPlayers={entangledPlayers}
                      mustPlayMeasurement={mustPlayMeasurement}
                      getPlayerPosition={getPlayerPosition}
                      onPlayCard={handlePlayCard}
                      onDrawCard={handleDrawCard}
                      onTeleportationSelect={(card, fromPlayerId) => {
                        sendMessage({
                          type: 'TELEPORTATION_SELECT',
                          roomId,
                          playerId,
                          fromPlayerId,
                          card: {
                            id: card.id,
                            lightSide: card.lightSide,
                            darkSide: card.darkSide
                          }
                        });
                        setIsTeleportationMode(false);
                        setEffectNotification(null);
                      }}
                    />
              <PlayableCardModal
                playableCardDrawn={playableCardDrawn}
                isLightSideActive={isLightSideActive}
                onDecision={handleDrawnCardDecision}
              />
              {isEntanglementMode && (
                <EntanglementSelectionModal
                  opponents={entanglementOpponents}
                  onSelect={(opponent1Id, opponent2Id) => {
                    sendMessage({
                      type: 'ENTANGLEMENT_SELECT',
                      roomId,
                      playerId,
                      opponent1Id,
                      opponent2Id
                    });
                    setIsEntanglementMode(false);
                    setEffectNotification(null);
                  }}
                  onCancel={() => {
                    setIsEntanglementMode(false);
                    setEffectNotification(null);
                  }}
                />
              )}
            </>
          ) : (
            <div className="mt-20 space-y-4 flex flex-col items-center relative z-50">
              {!ready && (
                <button
                  className="bg-green-600 hover:bg-green-700 active:bg-green-800 px-6 py-3 rounded-lg font-bold text-lg transition-colors shadow-lg"
                  onClick={handleReady}
                >
                  ✅ Ready
                </button>
              )}
              {ready && (
                <p className="mt-2 text-yellow-300 font-semibold">
                  ⏳ Waiting for opponent{players.length > 1 ? 's' : ''}...
                  <span className="block text-sm text-gray-300 mt-1">
                    ({readyPlayers.size}/{players.length} ready)
                  </span>
                </p>
              )}
              {isHost && ready && allReady && (
                <button
                  className="mt-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 px-6 py-3 rounded-lg font-bold text-lg transition-all shadow-lg hover:scale-105"
                  onClick={handleStartGame}
                >
                  🚀 Start Game
                </button>
              )}
            </div>
          )}
        </>
      ) : (
        <RoomCreationForm
          inputPlayerName={inputPlayerName}
          inputRoomId={inputRoomId}
          isConnecting={isConnecting}
          connectionError={connectionError}
          onPlayerNameChange={setInputPlayerName}
          onRoomIdChange={setInputRoomId}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
        />
      )}
      {gameStarted && (
        <WebSocketLogWindow 
          logs={wsLogs}
          onClear={() => setWsLogs([])}
        />
      )}
      {victoryData && (
        <VictoryModal
          isOpen={showVictoryModal}
          isWinner={victoryData.isWinner}
          winnerName={victoryData.winnerName}
          onClose={() => {
            setShowVictoryModal(false);
            setVictoryData(null);
          }}
        />
      )}
    </div>
  );
};

export default GameRoom;
