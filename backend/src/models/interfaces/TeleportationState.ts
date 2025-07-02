export interface TeleportationState {
    awaitingPlayerId: string;  // Which player needs to pick the card
    status: 'AWAITING_SELECTION' | 'COMPLETED';  // What's the status of teleportation
}