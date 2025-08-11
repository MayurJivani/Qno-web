import { Card } from "../../models/Card";
import { Hand } from "../../models/Hand";
import { CardFace } from "../cards/CardFace";
import { Direction } from "../gameRoom/Direction";

export const StoCEvents = {
    GAME_STARTED: "GAME_STARTED",
    JOINED_ROOM: "JOINED_ROOM",
    NEW_PLAYER_JOINED: "NEW_PLAYER_JOINED",
    PLAYER_LEFT: "PLAYER_LEFT",
    NEW_HOST: "NEW_HOST",
    DRAW_PILE_TOP: "DRAW_PILE_TOP",
    DISCARD_PILE_TOP: "DISCARD_PILE_TOP",
    YOUR_HAND: "YOUR_HAND",
    OPPONENT_HAND: "OPPONENT_HAND",
    PLAYED_CARD: "PLAYED_CARD",
    OPPONENT_PLAYED_CARD: "OPPONENT_PLAYED_CARD",
    CARD_DRAWN: "CARD_DRAWN",
    OPPONENT_DREW_CARD: "OPPONENT_DREW_CARD",
    TURN_CHANGED: "TURN_CHANGED",
    CARD_EFFECT: "CARD_EFFECT",
    REFRESH_OPPONENT_HAND: "REFRESH_OPPONENT_HAND",
    AWAITING_TELEPORTATION_TARGET: "AWAITING_TELEPORTATION_TARGET",
    ERROR: "ERROR",
} as const;

// ✅ Payloads indexed by *key* (not value)
export type ServerToClientPayloads = {
    GAME_STARTED: {
        roomId: string;
        currentPlayer: string;
        direction: Direction;
    };
    JOINED_ROOM: { roomId: string; playerId: string };
    NEW_PLAYER_JOINED: { roomId: string; playerId: string };
    PLAYER_LEFT: { playerId: string };
    NEW_HOST: { newHostId: string };
    DRAW_PILE_TOP: { card: CardFace };
    DISCARD_PILE_TOP: { card: CardFace };
    YOUR_HAND: { hand: Hand }; // or ReturnType<Player['getHand']>
    OPPONENT_HAND: { opponentHands: Record<string, CardFace[]> };
    PLAYED_CARD: { card: CardFace; playerId: string; effect?: string }; // or EffectType
    OPPONENT_PLAYED_CARD: { card: CardFace; opponentId: string; effect?: string };
    CARD_DRAWN: { card: Card; hand: Card[] };
    OPPONENT_DREW_CARD: { card: CardFace; opponentId: string };
    TURN_CHANGED: { currentPlayer: string };
    CARD_EFFECT: { [key: string]: any };
    REFRESH_OPPONENT_HAND: {[key: string]: any };
    AWAITING_TELEPORTATION_TARGET: {[key: string]: any };
    ERROR: { message: string };
};

// ✅ Values of StoCEvents (string literals)
export type ServerToClientEvents = typeof StoCEvents[keyof typeof StoCEvents];

// ✅ Map event *values* to payloads
export type PayloadByEventValue = {
    [K in keyof ServerToClientPayloads as typeof StoCEvents[K]]: ServerToClientPayloads[K];
};

// ✅ Final helper type for sending messages
export type ServerToClientMessage<T extends ServerToClientEvents = ServerToClientEvents> = {
    type: T;
} & PayloadByEventValue[T];
