// Test games are reproducible: the room creator opens, and the deck is dealt from a fixed seed.
// Play is random (TurnManager.pickStart, the shuffles); left that way, each run dealt different
// hands and a different handful of these tests failed on cards they could not play.
import { TurnManager } from '../scripts/TurnManager';

TurnManager.pickStart = () => 0;

// mulberry32: a small seeded generator, plenty for shuffling test decks.
let seed = 0x9e3779b9;
Math.random = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
