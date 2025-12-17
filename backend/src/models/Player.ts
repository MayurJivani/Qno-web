import { Status as PlayerStatus } from "../enums/player/Status";
import { Card } from "./Card";
import WebSocket from 'ws';
import { Hand } from "./Hand";

export class Player {
    id: string;
    name: string;
    socket: WebSocket;
    status: PlayerStatus;
    private hand: Hand;

    constructor(id: string, name: string, socket: WebSocket) {
        this.id = id;
        this.name = name;
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

    sendMessage(message: any) {
        this.socket.send(JSON.stringify(message));
    }

    markReady() {
        this.status = PlayerStatus.READY;
    }
}