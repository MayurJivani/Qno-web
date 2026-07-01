// src/components/LandingPage.tsx
import React, { useState, useEffect } from 'react';
import MovingDotsBackground from "./MovingDotsBackground";
import { Link, useNavigate } from "react-router-dom";
import { Card } from "../models/Card";
import CardComponent from "./CardComponent";

export default function LandingPage() {
  const navigate = useNavigate();

  const handlePlayClick = () => {
    navigate(`/room`);
  };

  const dummyCards = [
    new Card(undefined, { colour: "Red", value: "5" }, { colour: "Pink", value: "Pauli X" }),
    new Card(undefined, { colour: "Blue", value: "6" }, { colour: "Teal", value: "Pauli Y" }),
    new Card(undefined, { colour: "Green", value: "7" }, { colour: "Purple", value: "Pauli Z" }),
    new Card(undefined, { colour: "Yellow", value: "8" }, { colour: "Orange", value: "Teleport" }),
    new Card(undefined, { colour: "Black", value: "Wild" }, { colour: "Black", value: "Wild" }),
  ];

  // Randomly choose one side for all cards (50/50 chance - either all light or all dark)
  const showLightSide = Math.random() > 0.5;

  const [radius, setRadius] = useState(300);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setRadius(140);
      } else if (window.innerWidth < 1024) {
        setRadius(220);
      } else {
        setRadius(300);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);


  return (
    <div className="h-screen w-screen text-white font-['Press_Start_2P'] relative overflow-hidden flex flex-col justify-between">
      <MovingDotsBackground />

      {/* Header */}
      <header className="fixed top-0 left-0 w-full z-50 px-4 sm:px-6 py-4">
        <nav className="flex justify-end gap-6 sm:gap-10 text-yellow-300 text-[8px] sm:text-xs tracking-widest">
          <Link to="/" className="hover:underline hover:text-white">HOME</Link>
          <Link to="/about-us" className="hover:underline hover:text-white">ABOUT</Link>
          <Link to="/rules" className="hover:underline hover:text-white">RULES</Link>
        </nav>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-grow flex flex-col items-center justify-center px-4 max-w-6xl mx-auto w-full">
        {/* Hero Section */}
        <section className="text-center w-full">
          <h1 className="text-xl sm:text-5xl text-yellow-300 font-extrabold mb-2 sm:mb-6 text-shadow-lg/30 px-2 leading-tight">
            Quantum-Based UNO Game
          </h1>

          <p className="mt-2 sm:mt-8 text-[8px] sm:text-lg text-white max-w-xl mx-auto leading-relaxed px-4 opacity-90">
            Experience the classic card game with a quantum twist! Enjoy colorful, retro vibes and strategic gameplay.
          </p>

          <button
            onClick={handlePlayClick}
            className="mt-6 sm:mt-10 relative px-6 sm:px-10 py-2 sm:py-4 bg-cyan-400 hover:bg-cyan-300 text-black text-[10px] sm:text-xl font-extrabold rounded-none border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
            style={{ fontFamily: "'Press Start 2P', cursive", imageRendering: "pixelated" }}
          >
            PLAY NOW
          </button>

        </section>

        {/* Card Preview Section with Semicircle Layout */}
        <section className="mt-4 sm:mt-15 relative h-[100px] sm:h-[200px] w-full flex justify-center items-end pointer-events-none">
          {dummyCards.map((card, index) => {
            const angle = (index - (dummyCards.length - 1) / 2) * 12;
            const rad = (angle * Math.PI) / 180;
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
                <div
                  className="retro-card-glow"
                  style={{ '--card-index': index } as React.CSSProperties}
                >
                  <CardComponent
                    card={card}
                    isLight={showLightSide}
                    className="w-24 h-36 sm:w-24 sm:h-36"
                  />
                </div>
              </div>
            );
          })}
        </section>
      </main>
    </div>
  );
}
