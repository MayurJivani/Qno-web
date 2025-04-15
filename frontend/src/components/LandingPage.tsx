import MovingDotsBackground from "./MovingDotsBackground";
import { useNavigate } from "react-router-dom";
export default function LandingPage() {
  const navigate = useNavigate();

  const handlePlayClick = () => {
    navigate(`/room`);
  };

  return (
    <>
      {/* Add the retro background wrapper back */}
      <div className="min-h-screen text-white font-['Press_Start_2P'] relative overflow-hidden">

        {/* Inject animated dots */}
        <MovingDotsBackground />

        {/* Header */}
        <header className="fixed top-0 left-0 w-full z-50 px-4 sm:px-6 py-4">
          <nav className="flex justify-end gap-6 sm:gap-10 text-yellow-300 text-[10px] sm:text-xs tracking-widest">
            <a href="#" className="hover:underline hover:text-white">HOME</a>
            <a href="#" className="hover:underline hover:text-white">ABOUT</a>
            <a href="#" className="hover:underline hover:text-white">RULES</a>
          </nav>
        </header>

        {/* Main Content */}
        <main className="relative z-10 pt-28 sm:pt-36 px-4 max-w-6xl mx-auto">
          {/* Hero Section */}
          <section className="text-center">
            <h1 className="text-3xl sm:text-5xl text-yellow-300 font-extrabold mb-6">
              Quantum-Based UNO Game
            </h1>

            <p className="mt-12 sm:mt-16 text-xs sm:text-lg text-white max-w-xl mx-auto leading-relaxed">
              Experience the classic card game with a quantum twist! Enjoy colorful, retro vibes and strategic gameplay.
            </p>

            <button className="bg-cyan-400 hover:bg-cyan-300 text-black text-sm sm:text-xl font-bold px-6 sm:px-10 py-3 sm:py-4 rounded shadow-md transition-transform hover:scale-105" onClick={handlePlayClick}>
              PLAY NOW
            </button>
          </section>

          {/* Future Cards Section */}
          <section className="mt-12 sm:mt-20 flex flex-wrap justify-center gap-6 px-2">
            {/* Example placeholder for cards */}
            {/* <img src="/images/card1.png" alt="Card 1" className="w-24 pixelated" /> */}
          </section>
        </main>
      </div>
    </>
  );
}
