import WebSocket from "ws";
import {
    ServerToClientEvents,
    ServerToClientMessage
} from "../enums/events/ServerToClient";
import { Status as PlayerStatus } from "../enums/player/Status";
import { Card } from "./Card";
import { Hand } from "./Hand";

export class Player {
    id: string;
    socket: WebSocket;
    status: PlayerStatus;
    private hand: Hand;

    constructor(id: string, socket: WebSocket) {
        this.id = id;
        this.socket = socket;
        this.status = PlayerStatus.NOT_READY;
        this.hand = new Hand();
    }

    getHand(): Hand {
        return this.hand;
    }

    getHandCards(): Card[] {
        return this.hand.getCards();
    }

    setHandCards(hand: Card[]) {
        this.hand.setCards(hand);
    }

    sendMessage<T extends ServerToClientEvents>(
        message: ServerToClientMessage<T>
    ) {
        this.socket.send(JSON.stringify(message));
    }

    markReady() {
        this.status = PlayerStatus.READY;
    }
}
