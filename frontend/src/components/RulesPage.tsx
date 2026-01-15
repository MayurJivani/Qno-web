// src/components/RulesPage.tsx
import MovingDotsBackground from "./MovingDotsBackground";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export default function RulesPage() {
  const navigate = useNavigate();

  const handleHomeClick = () => navigate(`/`);
  const handleAboutClick = () => navigate(`/about-us`);

  return (
    <div className="min-h-screen text-white font-['Press_Start_2P'] relative overflow-hidden">
      <MovingDotsBackground />

      {/* Header */}
      <header className="fixed top-0 left-0 w-full z-50 px-4 sm:px-6 py-4">
        <nav className="flex justify-end gap-6 sm:gap-10 text-yellow-300 text-[10px] sm:text-xs tracking-widest">
          <a href="#" className="hover:underline hover:text-white" onClick={handleHomeClick}>HOME</a>
          <a href="#" className="hover:underline hover:text-white" onClick={handleAboutClick}>ABOUT</a>
          <a href="#" className="hover:underline hover:text-white">RULES</a>
        </nav>
      </header>

      {/* Main Content */}
      <main className="relative z-10 pt-24 sm:pt-28 px-4 sm:px-6 max-w-5xl mx-auto pb-12">
        {/* Title */}
        <motion.section
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl sm:text-5xl text-yellow-300 font-extrabold mb-4 text-shadow-lg/30">
            GAME RULES
          </h1>
          <p className="text-xs sm:text-sm text-gray-300 mb-8">
            Quantum-Based Card Game
          </p>
        </motion.section>

        {/* Rules Content */}
        <div className="space-y-8">
          {/* Overview */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-black/50 backdrop-blur-lg border border-yellow-300 rounded-xl shadow-[0_0_10px_#facc15] p-6"
          >
            <h2 className="text-xl sm:text-2xl text-yellow-300 mb-4">📖 OVERVIEW</h2>
            <div className="text-xs sm:text-sm text-gray-200 leading-relaxed space-y-3">
              <p>
                Qno is a quantum-themed card game where players try to be the first to empty their hand. 
                Cards have two sides (Light and Dark), and you can only play cards that match the active side's 
                color or value on top of the discard pile.
              </p>
              <p>
                The game starts with the Light side active. You can see your own cards on both sides, but 
                opponents only see the inactive side of their cards!
              </p>
            </div>
          </motion.section>

          {/* Deck Composition */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-black/50 backdrop-blur-lg border border-yellow-300 rounded-xl shadow-[0_0_10px_#facc15] p-6"
          >
            <h2 className="text-xl sm:text-2xl text-yellow-300 mb-4">🎴 DECK COMPOSITION</h2>
            <div className="text-xs sm:text-sm text-gray-200 leading-relaxed space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Light Side */}
                <div className="bg-yellow-900/20 p-4 rounded border border-yellow-500">
                  <h3 className="text-yellow-300 font-bold mb-3">Light Side</h3>
                  <ul className="list-none space-y-1">
                    <li>• 76 Number cards</li>
                    <li>• 8 Pauli X</li>
                    <li>• 8 Teleportation</li>
                    <li>• 4 Decoherence</li>
                    <li>• 8 Measurement</li>
                    <li>• 4 Entanglement</li>
                    <li className="mt-2 text-yellow-300 font-bold">Total: 108 cards</li>
                  </ul>
                </div>
                {/* Dark Side */}
                <div className="bg-purple-900/20 p-4 rounded border border-purple-500">
                  <h3 className="text-purple-300 font-bold mb-3">Dark Side</h3>
                  <ul className="list-none space-y-1">
                    <li>• 76 Number cards</li>
                    <li>• 8 Pauli Y</li>
                    <li>• 8 Pauli Z</li>
                    <li>• 4 Decoherence</li>
                    <li>• 8 Measurement</li>
                    <li>• 4 Superposition</li>
                    <li className="mt-2 text-purple-300 font-bold">Total: 108 cards</li>
                  </ul>
                </div>
              </div>
              <p className="text-center text-gray-300">
                <strong>216 double-sided cards total</strong>
              </p>
            </div>
          </motion.section>

          {/* Setup */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-black/50 backdrop-blur-lg border border-yellow-300 rounded-xl shadow-[0_0_10px_#facc15] p-6"
          >
            <h2 className="text-xl sm:text-2xl text-yellow-300 mb-4">🎮 SETUP</h2>
            <div className="text-xs sm:text-sm text-gray-200 leading-relaxed space-y-3">
              <ul className="list-none space-y-2 pl-4">
                <li className="flex items-start">
                  <span className="text-yellow-300 mr-2">•</span>
                  <span>2-4 players can join a room</span>
                </li>
                <li className="flex items-start">
                  <span className="text-yellow-300 mr-2">•</span>
                  <span>Each player starts with 7 cards</span>
                </li>
                <li className="flex items-start">
                  <span className="text-yellow-300 mr-2">•</span>
                  <span>One card is revealed on the discard pile to start</span>
                </li>
                <li className="flex items-start">
                  <span className="text-yellow-300 mr-2">•</span>
                  <span>Game starts with Light side active (clockwise turns)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-yellow-300 mr-2">•</span>
                  <span>All players must be ready before the host can start the game</span>
                </li>
              </ul>
            </div>
          </motion.section>

          {/* Basic Rules */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-black/50 backdrop-blur-lg border border-yellow-300 rounded-xl shadow-[0_0_10px_#facc15] p-6"
          >
            <h2 className="text-xl sm:text-2xl text-yellow-300 mb-4">🎯 BASIC RULES</h2>
            <div className="text-xs sm:text-sm text-gray-200 leading-relaxed space-y-3">
              <div>
                <h3 className="text-yellow-300 mb-2">Playing Cards</h3>
                <p>
                  On your turn, you can play a card if it matches the top card on the discard pile by:
                </p>
                <ul className="list-none space-y-1 pl-4 mt-2">
                  <li className="flex items-start">
                    <span className="text-yellow-300 mr-2">→</span>
                    <span>Same <strong>color</strong> (on the active side)</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-yellow-300 mr-2">→</span>
                    <span>Same <strong>value</strong> (number or action)</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-yellow-300 mr-2">→</span>
                    <span>Any <strong>black</strong> wild card</span>
                  </li>
                </ul>
              </div>
              <div className="mt-4">
                <h3 className="text-yellow-300 mb-2">Drawing Cards</h3>
                <p>
                  If you can't play a card, you must draw one card from the draw pile. 
                  If the drawn card can be played, you'll be prompted to either <strong>play it</strong> or <strong>keep it</strong> in your hand. 
                  If you keep it (or it can't be played), your turn ends.
                </p>
              </div>
              <div className="mt-4">
                <h3 className="text-yellow-300 mb-2">Winning</h3>
                <p className="text-green-300 font-bold">
                  🏆 The first player to empty their hand WINS!
                </p>
              </div>
            </div>
          </motion.section>

          {/* Card Colors */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-black/50 backdrop-blur-lg border border-yellow-300 rounded-xl shadow-[0_0_10px_#facc15] p-6"
          >
            <h2 className="text-xl sm:text-2xl text-yellow-300 mb-4">🌈 CARD COLORS</h2>
            <div className="text-xs sm:text-sm text-gray-200 leading-relaxed">
              <p className="mb-3">The deck contains cards in these colors:</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-red-600/30 p-3 rounded border border-red-400">
                  <strong className="text-red-300">RED</strong>
                </div>
                <div className="bg-blue-600/30 p-3 rounded border border-blue-400">
                  <strong className="text-blue-300">BLUE</strong>
                </div>
                <div className="bg-green-600/30 p-3 rounded border border-green-400">
                  <strong className="text-green-300">GREEN</strong>
                </div>
                <div className="bg-yellow-600/30 p-3 rounded border border-yellow-400">
                  <strong className="text-yellow-300">YELLOW</strong>
                </div>
                <div className="bg-purple-600/30 p-3 rounded border border-purple-400">
                  <strong className="text-purple-300">PURPLE</strong>
                </div>
                <div className="bg-pink-600/30 p-3 rounded border border-pink-400">
                  <strong className="text-pink-300">PINK</strong>
                </div>
                <div className="bg-teal-600/30 p-3 rounded border border-teal-400">
                  <strong className="text-teal-300">TEAL</strong>
                </div>
                <div className="bg-orange-600/30 p-3 rounded border border-orange-400">
                  <strong className="text-orange-300">ORANGE</strong>
                </div>
              </div>
              <p className="mt-4">
                <strong className="text-gray-300">BLACK</strong> cards are wild cards and can be played on any color. These include: Measurement, Superposition, Entanglement, and Decoherence.
              </p>
            </div>
          </motion.section>

          {/* Light Side Action Cards */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-black/50 backdrop-blur-lg border border-yellow-300 rounded-xl shadow-[0_0_10px_#facc15] p-6"
          >
            <h2 className="text-xl sm:text-2xl text-yellow-300 mb-4">⚡ LIGHT SIDE ACTION CARDS</h2>
            <div className="text-xs sm:text-sm text-gray-200 leading-relaxed space-y-4">
              <div className="bg-yellow-900/30 p-4 rounded border border-yellow-500">
                <h3 className="text-yellow-300 font-bold mb-2">Pauli X</h3>
                <p>
                  Flips all cards to show the opposite side (Light ↔ Dark). This changes which side 
                  is active for all players. Opponent cards you see will flip!
                </p>
              </div>
              <div className="bg-yellow-900/30 p-4 rounded border border-yellow-500">
                <h3 className="text-yellow-300 font-bold mb-2">Teleportation</h3>
                <p>
                  Steal a card from an opponent's hand! Click on any opponent card to teleport it to your hand.
                  <br />
                  <strong className="text-red-300">⚠️ Cannot be used if opponent has only 1 card!</strong>
                </p>
              </div>
            </div>
          </motion.section>

          {/* Dark Side Action Cards */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-black/50 backdrop-blur-lg border border-yellow-300 rounded-xl shadow-[0_0_10px_#facc15] p-6"
          >
            <h2 className="text-xl sm:text-2xl text-yellow-300 mb-4">🌑 DARK SIDE ACTION CARDS</h2>
            <div className="text-xs sm:text-sm text-gray-200 leading-relaxed space-y-4">
              <div className="bg-purple-900/30 p-4 rounded border border-purple-500">
                <h3 className="text-purple-300 font-bold mb-2">Pauli Y</h3>
                <p>
                  Flips all cards AND reverses the turn direction! This powerful card does both: 
                  changes the active side and flips the turn order (clockwise ↔ anti-clockwise).
                  <br /><br />
                  <strong>2-Player Games:</strong> The player who plays Pauli Y gets to repeat their turn!
                </p>
              </div>
              <div className="bg-purple-900/30 p-4 rounded border border-purple-500">
                <h3 className="text-purple-300 font-bold mb-2">Pauli Z</h3>
                <p>
                  Reverses the turn direction without flipping sides. Use this to change the turn order 
                  (clockwise ↔ anti-clockwise) while keeping the current side active.
                  <br /><br />
                  <strong>2-Player Games:</strong> The player who plays Pauli Z gets to repeat their turn!
                </p>
              </div>
            </div>
          </motion.section>

          {/* Wild Cards */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-black/50 backdrop-blur-lg border border-yellow-300 rounded-xl shadow-[0_0_10px_#facc15] p-6"
          >
            <h2 className="text-xl sm:text-2xl text-yellow-300 mb-4">🎴 WILD CARDS</h2>
            <div className="text-xs sm:text-sm text-gray-200 leading-relaxed space-y-4">
              <div className="bg-black/50 p-4 rounded border border-gray-500">
                <h3 className="text-white font-bold mb-2">Measurement</h3>
                <p>
                  <strong className="text-purple-300">On Superposition:</strong> Collapses with a <strong>50/50 quantum outcome</strong>:
                  <br />
                  • 50% chance: The original card (before Superposition) returns with its <strong>Light side</strong> active
                  <br />
                  • 50% chance: The <strong>Dark side</strong> of the original card returns AND <strong>all cards flip</strong> (like Pauli X)
                  <br /><br />
                  <strong className="text-pink-300">On Entanglement:</strong> Resolves entanglement with <strong>50/50 random outcome</strong> - one entangled player draws 3 cards, the other draws 0.
                  <br /><br />
                  <strong className="text-cyan-300">On normal cards:</strong> Reveals the card below it on the discard pile.
                </p>
              </div>
              <div className="bg-black/50 p-4 rounded border border-gray-500">
                <h3 className="text-white font-bold mb-2">Superposition</h3>
                <p>
                  Creates quantum uncertainty! When played, the current discard pile top is saved. 
                  While Superposition is active, only <strong>Measurement</strong> or another <strong>Superposition</strong> card can be played.
                  If you can't play either, you must draw cards until you can.
                  <br /><br />
                  <span className="text-yellow-300">Playing Superposition on Superposition:</span> Returns the original saved card to the top, then starts a new Superposition state.
                </p>
              </div>
              <div className="bg-black/50 p-4 rounded border border-gray-500">
                <h3 className="text-white font-bold mb-2">Decoherence</h3>
                <p>
                  Draws a new non-action card from the draw pile and places it on the discard pile. 
                  This reveals a new card that players can now match!
                </p>
              </div>
              <div className="bg-black/50 p-4 rounded border border-gray-500">
                <h3 className="text-white font-bold mb-2">Entanglement</h3>
                <p>
                  <strong className="text-pink-300">Separate Pile:</strong> When played, the Entanglement card goes to a <strong>separate pile</strong> next to the discard pile (not on top of it). This allows non-entangled players to continue playing normally!
                  <br /><br />
                  <strong className="text-purple-300">2-Player Games:</strong> You become entangled with your opponent automatically.
                  <br /><br />
                  <strong className="text-purple-300">3-4 Player Games:</strong> Select 2 opponents to entangle them together!
                  <br /><br />
                  <strong className="text-cyan-300">Entangled Player Rules:</strong>
                  <br />
                  • Can <strong>ONLY</strong> play Measurement cards (no other cards allowed)
                  <br />
                  • If one entangled player draws a card, their partner <strong>automatically draws too</strong> (correlated drawing)
                  <br /><br />
                  <strong className="text-green-300">Non-Entangled Players:</strong> Continue playing normally on the main discard pile while entanglement is active.
                  <br /><br />
                  <strong className="text-yellow-300">Resolution:</strong> When an entangled player plays Measurement, 50/50 outcome - one draws 3 cards, other draws 0. Both Entanglement and Measurement cards slide into the middle of the discard pile.
                  <br /><br />
                  <span className="text-red-300">⚠️ Only one entanglement can be active at a time!</span>
                </p>
              </div>
            </div>
          </motion.section>

          {/* Game Flow */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="bg-black/50 backdrop-blur-lg border border-yellow-300 rounded-xl shadow-[0_0_10px_#facc15] p-6"
          >
            <h2 className="text-xl sm:text-2xl text-yellow-300 mb-4">🔄 GAME FLOW</h2>
            <div className="text-xs sm:text-sm text-gray-200 leading-relaxed space-y-3">
              <ol className="list-decimal list-inside space-y-2 pl-2">
                <li>Create or join a room</li>
                <li>All players click "Ready"</li>
                <li>Host clicks "Start Game"</li>
                <li>Each player receives 7 cards</li>
                <li>Turns proceed clockwise (or anti-clockwise if reversed)</li>
                <li>On your turn: play a matching card OR draw a card</li>
                <li>If you draw a playable card, choose to <strong>play</strong> or <strong>keep</strong> it</li>
                <li>Action cards trigger their effects immediately</li>
                <li>After any effect resolution, action cards cannot stay on top of the discard pile</li>
                <li>First player to empty their hand wins! 🏆</li>
              </ol>
            </div>
          </motion.section>

          {/* Special Situations */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="bg-black/50 backdrop-blur-lg border border-yellow-300 rounded-xl shadow-[0_0_10px_#facc15] p-6"
          >
            <h2 className="text-xl sm:text-2xl text-yellow-300 mb-4">💡 SPECIAL SITUATIONS</h2>
            <div className="text-xs sm:text-sm text-gray-200 leading-relaxed space-y-3">
              <div>
                <h3 className="text-yellow-300 mb-2">Teleportation Mode</h3>
                <p>
                  When Teleportation is played, you must select an opponent's card before doing anything else. 
                  You cannot play other cards or draw until you select a card to teleport.
                </p>
              </div>
              <div className="mt-4">
                <h3 className="text-yellow-300 mb-2">Superposition Lock</h3>
                <p>
                  When Superposition is on the discard pile, only <strong>Measurement</strong> or <strong>Superposition</strong> cards can be played. 
                  Players must draw cards until they get one of these. The original card (before Superposition) 
                  is saved and will return when collapsed - but with a 50/50 chance of flipping to its dark side!
                </p>
              </div>
              <div className="mt-4">
                <h3 className="text-yellow-300 mb-2">Side Flipping</h3>
                <p>
                  When Pauli X or Pauli Y flips the sides, all cards change their active face. 
                  This means the discard pile card changes color/value, and opponent cards you see 
                  will flip to show their other side!
                </p>
              </div>
              <div className="mt-4">
                <h3 className="text-yellow-300 mb-2">No Action Card on Top</h3>
                <p>
                  After any effect resolution (Measurement, Decoherence) or side flip (Pauli X/Y), 
                  an action card cannot remain on top of the discard pile. If one ends up there, 
                  it's automatically replaced with a non-action card from the pile or draw deck.
                </p>
              </div>
              <div className="mt-4">
                <h3 className="text-yellow-300 mb-2">Entanglement Resolution</h3>
                <p>
                  When Entanglement is active:
                  <br /><br />
                  <strong className="text-purple-300">Entangled Players:</strong> Can <strong>ONLY</strong> play Measurement cards - no other cards are allowed! If they draw a card, their entangled partner automatically draws one too (quantum correlation).
                  <br /><br />
                  <strong className="text-green-300">Non-Entangled Players:</strong> Continue playing normally on the main discard pile. The game doesn't stop for them!
                  <br /><br />
                  <strong className="text-cyan-300">Collapse:</strong> When an entangled player plays Measurement, the entanglement collapses with a <strong>50/50 random outcome</strong>: one entangled player draws 3 cards, the other draws 0. Both the Entanglement and Measurement cards slide into the middle of the discard pile.
                  <br /><br />
                  <strong className="text-red-300">Important:</strong> Only one entanglement can be active at a time - if players are already entangled, you cannot play another Entanglement card!
                </p>
              </div>
            </div>
          </motion.section>

          {/* Tips */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
            className="bg-black/50 backdrop-blur-lg border border-green-400 rounded-xl shadow-[0_0_10px_#4ade80] p-6"
          >
            <h2 className="text-xl sm:text-2xl text-green-300 mb-4">💪 PRO TIPS</h2>
            <div className="text-xs sm:text-sm text-gray-200 leading-relaxed space-y-2">
              <ul className="list-none space-y-2 pl-4">
                <li className="flex items-start">
                  <span className="text-green-300 mr-2">💡</span>
                  <span>Save action cards for strategic moments - they can change the game!</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-300 mr-2">💡</span>
                  <span>Pay attention to which side is active - it affects what you can play</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-300 mr-2">💡</span>
                  <span>Use Teleportation to steal valuable cards from opponents</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-300 mr-2">💡</span>
                  <span>Pauli Y is powerful - it flips sides AND reverses turns!</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-300 mr-2">💡</span>
                  <span>Watch opponent card counts - you can't teleport their last card</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-300 mr-2">💡</span>
                  <span>Keep Measurement cards handy - they resolve both Superposition AND Entanglement</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-300 mr-2">💡</span>
                  <span>Superposition has 50/50 risk - the collapse might flip ALL cards!</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-300 mr-2">💡</span>
                  <span>When entangled, drawing cards means your partner draws too - use this strategically!</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-300 mr-2">💡</span>
                  <span>Non-entangled players can keep playing - entanglement doesn't stop the game for everyone</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-300 mr-2">💡</span>
                  <span>Entangle players who have fewer cards - they're less likely to have Measurement</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-300 mr-2">💡</span>
                  <span>When you draw a playable card, sometimes keeping it is better than playing immediately!</span>
                </li>
              </ul>
            </div>
          </motion.section>
        </div>

        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
          className="text-center mt-10"
        >
          <button
            onClick={handleHomeClick}
            className="px-6 sm:px-10 py-3 sm:py-4 bg-cyan-400 hover:bg-cyan-300 text-black text-sm sm:text-xl font-extrabold rounded-none border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
            style={{ fontFamily: "'Press Start 2P', cursive", imageRendering: "pixelated" }}
          >
            BACK TO HOME
          </button>
        </motion.div>
      </main>
    </div>
  );
}


