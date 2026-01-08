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
    public isEntangled: boolean;
    public entanglementPartner: Player | null;
    public entanglementInitiator: Player | null;

    constructor(id: string, name: string, socket: WebSocket) {
        this.id = id;
        this.name = name;
        this.socket = socket;
        this.status = PlayerStatus.NOT_READY;
        this.hand = new Hand();
        this.isEntangled = false;
        this.entanglementPartner = null;
        this.entanglementInitiator = null;
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

    // Reset entanglement state
    clearEntanglement() {
        this.isEntangled = false;
        this.entanglementPartner = null;
        this.entanglementInitiator = null;
    }

    // Set entanglement with another player
    setEntangled(partner: Player, initiator: Player) {
        this.isEntangled = true;
        this.entanglementPartner = partner;
        this.entanglementInitiator = initiator;
    }
}