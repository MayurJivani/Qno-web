import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface VictoryModalProps {
  isOpen: boolean;
  isWinner: boolean;
  winnerName: string;
  onClose: () => void;
}

const VictoryModal: React.FC<VictoryModalProps> = ({ isOpen, isWinner, winnerName, onClose }) => {
  useEffect(() => {
    if (isOpen) {
      // Auto-close after 8 seconds
      const timer = setTimeout(() => {
        onClose();
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200]"
            onClick={onClose}
          />

          {/* Modal Content */}
          <div className="fixed inset-0 z-[201] flex items-center justify-center pointer-events-none">
            <motion.div
              initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
              animate={{ 
                scale: 1, 
                opacity: 1, 
                rotate: 0,
                transition: {
                  type: "spring",
                  stiffness: 300,
                  damping: 20
                }
              }}
              exit={{ scale: 0.5, opacity: 0, rotate: 10 }}
              className="pointer-events-auto bg-gradient-to-br from-yellow-400 via-yellow-300 to-yellow-500 border-4 border-yellow-600 rounded-2xl shadow-[0_0_50px_rgba(255,215,0,0.8)] p-8 max-w-md w-[90%] text-center"
              style={{ fontFamily: "'Press Start 2P', cursive" }}
            >
              {/* Confetti Animation Container */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl">
                {[...Array(20)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{
                      x: '50%',
                      y: '50%',
                      opacity: 1,
                      scale: 1,
                    }}
                    animate={{
                      x: `${50 + (Math.random() - 0.5) * 200}%`,
                      y: `${50 + (Math.random() - 0.5) * 200}%`,
                      opacity: 0,
                      scale: 0,
                      rotate: 360,
                    }}
                    transition={{
                      duration: 2,
                      delay: i * 0.1,
                      ease: "easeOut"
                    }}
                    className="absolute text-2xl"
                    style={{
                      left: '50%',
                      top: '50%',
                    }}
                  >
                    {['🎉', '🎊', '⭐', '✨', '🏆'][Math.floor(Math.random() * 5)]}
                  </motion.div>
                ))}
              </div>

              {/* Content */}
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="relative z-10"
              >
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    repeatType: "reverse"
                  }}
                  className="text-6xl mb-4"
                >
                  {isWinner ? '🏆' : '🎮'}
                </motion.div>

                <motion.h2
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ 
                    type: "spring",
                    stiffness: 200,
                    delay: 0.4
                  }}
                  className={`text-2xl sm:text-3xl mb-4 ${
                    isWinner ? 'text-green-700' : 'text-gray-800'
                  } drop-shadow-[2px_2px_0_rgba(0,0,0,0.3)]`}
                >
                  {isWinner ? 'YOU WON!' : 'GAME OVER'}
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="text-xs sm:text-sm text-gray-800 mb-6 leading-relaxed"
                >
                  {isWinner 
                    ? 'Congratulations! You are the winner!'
                    : `${winnerName} won the game!`
                  }
                </motion.p>

                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onClose}
                  className="bg-black text-yellow-300 px-6 py-3 rounded-lg text-sm font-bold border-2 border-gray-800 hover:bg-gray-900 transition-colors shadow-lg"
                >
                  CLOSE
                </motion.button>
              </motion.div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default VictoryModal;

