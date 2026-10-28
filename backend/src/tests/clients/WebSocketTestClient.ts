import WebSocket from 'ws';

export class WebSockTestClient {
    private ws: WebSocket;
    private messageQueue: any[] = [];

    constructor(url: string) {
        this.ws = new WebSocket(url);
        this.ws.on('message', this.handleMessage.bind(this));
    }

    private handleMessage(data: WebSocket.RawData) {
        const msg = JSON.parse(data.toString());
        this.messageQueue.push(msg);
    }

    async connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.ws.on('open', () => resolve());
            this.ws.on('error', (err) => reject(err));
        });
    }

    send(msg: any) {
        this.ws.send(JSON.stringify(msg));
    }

    async waitFor(type: string, timeout = 5000): Promise<any> {
        const start = Date.now();

        return new Promise((resolve, reject) => {
            const interval = setInterval(() => {
                const reversedIndex = [...this.messageQueue].reverse().findIndex(msg => msg.type === type);
                const index = reversedIndex === -1 ? -1 : this.messageQueue.length - 1 - reversedIndex;
                if (index !== -1) {
                    const [msg] = this.messageQueue.splice(index, 1);
                    clearInterval(interval);
                    resolve(msg);
                } else if (Date.now() - start > timeout) {
                    clearInterval(interval);
                    reject(new Error(`Timeout waiting for message type: ${type}`));
                }
            }, 10);
        });
    }

    /**
     * A playable draw waits for PLAY or KEEP before the turn moves on. The prompt is sent before
     * CARD_DRAWN, so once a test has read the draw it is already queued; tests that only draw keep.
     */
    keepDrawnCardIfAsked(roomId: string, playerId: string) {
        const i = this.messageQueue.findIndex(msg => msg.type === 'PLAYABLE_CARD_DRAWN');
        if (i === -1) return;
        this.messageQueue.splice(i, 1);
        this.send({ type: 'DRAWN_CARD_DECISION', roomId, playerId, decision: 'KEEP' });
    }

    close() {
        this.ws.close();
    }
}
