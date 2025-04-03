import { Status as PlayerStatus } from "../enums/player/Status";
import { Card } from "./Card";
import WebSocket from 'ws';

export class Player {
    id: string;
    socket: WebSocket;
    status: PlayerStatus;
    hand: Card[];

    constructor(id: string, socket: WebSocket) {
        this.id = id;
        this.socket = socket;
        this.status = PlayerStatus.NOT_READY;
        this.hand = [];
    }

    sendMessage(message: any) {
        this.socket.send(JSON.stringify(message));
    }

    addCard(card: Card) {
        this.hand.push(card);
    }

    removeCard(card: Card) {
        this.hand = this.hand.filter(c => c !== card);
    }
}