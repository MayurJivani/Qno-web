// src/components/LandingPage.tsx
import MovingDotsBackground from "./MovingDotsBackground";
import { useNavigate } from "react-router-dom";
import { Card } from "../classes/Card";
import CardComponent from "./CardComponent";

export default function LandingPage() {
  const navigate = useNavigate();

  const handlePlayClick = () => {
    navigate(`/room`);
  };

  const handleAboutClick = () => {
    navigate(`/about-us`);
  };

  const handleHomeClick = () => {
    navigate(`/about-us`);
  };

  const dummyCards = [
    new Card({ colour: "Red", value: "5" }, { colour: "Pink", value: "Draw 1" }),
    new Card({ colour: "Blue", value: "6" }, { colour: "Teal", value: "Skip" }),
    new Card({ colour: "Green", value: "7" }, { colour: "Purple", value: "Reverse" }),
    new Card({ colour: "Yellow", value: "8" }, { colour: "Orange", value: "Wild" }),
    new Card({ colour: "Black", value: "Wild" }, { colour: "Black", value: "Flip" }),
  ];

  return (
    <div className="min-h-screen text-white font-['Press_Start_2P'] relative overflow-hidden">
      <MovingDotsBackground />

      {/* Header */}
      <header className="fixed top-0 left-0 w-full z-50 px-4 sm:px-6 py-4">
        <nav className="flex justify-end gap-6 sm:gap-10 text-yellow-300 text-[10px] sm:text-xs tracking-widest">
          <a href="" className="hover:underline hover:text-white" onClick={handleHomeClick}>HOME</a>
          <a href="" className="hover:underline hover:text-white" onClick={handleAboutClick}>ABOUT</a>
          <a href="" className="hover:underline hover:text-white">RULES</a>
        </nav>
      </header>

      {/* Main Content */}
      <main className="relative z-10 pt-28 sm:pt-36 px-4 max-w-6xl mx-auto ">
        {/* Hero Section */}
        <section className="text-center">
          <h1 className="text-3xl sm:text-5xl text-yellow-300 font-extrabold mb-6 text-shadow-lg/30">
            Quantum-Based UNO Game
          </h1>

          <p className="mt-12 sm:mt-16 text-xs sm:text-lg text-white max-w-xl mx-auto leading-relaxed">
            Experience the classic card game with a quantum twist! Enjoy colorful, retro vibes and strategic gameplay.
          </p>

          <button
  onClick={handlePlayClick}
  className="mt-10 relative px-6 sm:px-10 py-3 sm:py-4 bg-cyan-400 hover:bg-cyan-300 text-black text-sm sm:text-xl font-extrabold rounded-none border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
  style={{ fontFamily: "'Press Start 2P', cursive", imageRendering: "pixelated" }}
>
PLAY NOW
</button>

        </section>

        {/* Card Preview Section with Semicircle Layout */}
        <section className="mt-10 sm:mt-15 relative h-[200px] w-full flex justify-center items-end pointer-events-none">
          {dummyCards.map((card, index) => {
            const angle = (index - (dummyCards.length - 1) / 2) * 12;
            const rad = (angle * Math.PI) / 180;
            const radius = 300;
            const x = radius * Math.sin(rad);
            const y = radius * (1 - Math.cos(rad));
            return (
              <div
                key={index}
                className="absolute pointer-events-auto transition-transform duration-300"
                style={{
                  transform: `translate(${x}px, ${y}px) rotate(${angle}deg)`,
                  transformOrigin: "bottom center",
                }}
              >
                <CardComponent card={card} isLight={true} />
              </div>
            );
          })}
        </section>
      </main>
    </div>
  );
}
