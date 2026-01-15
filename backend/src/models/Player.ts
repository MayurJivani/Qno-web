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
    // Session token for reconnection identification
    public sessionToken: string;
    // Tracks if player is currently disconnected (in grace period)
    public isDisconnected: boolean;

    constructor(id: string, name: string, socket: WebSocket, sessionToken?: string) {
        this.id = id;
        this.name = name;
        this.socket = socket;
        this.status = PlayerStatus.NOT_READY;
        this.hand = new Hand();
        this.isEntangled = false;
        this.entanglementPartner = null;
        this.entanglementInitiator = null;
        this.sessionToken = sessionToken || '';
        this.isDisconnected = false;
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
        // Don't send messages to disconnected players
        if (this.isDisconnected) return;
        try {
            if (this.socket.readyState === WebSocket.OPEN) {
                this.socket.send(JSON.stringify(message));
            }
        } catch (error) {
            // Socket might be closed, mark as disconnected
            this.isDisconnected = true;
        }
    }

    // Update the socket when player reconnects
    updateSocket(newSocket: WebSocket) {
        this.socket = newSocket;
        this.isDisconnected = false;
    }

    markReady() {
        this.status = PlayerStatus.READY;
    }

    markNotReady() {
        this.status = PlayerStatus.NOT_READY;
    }

    isReady(): boolean {
        return this.status === PlayerStatus.READY;
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