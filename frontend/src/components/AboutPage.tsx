// src/components/AboutPage.tsx
import MovingDotsBackground from "./MovingDotsBackground";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { TypeAnimation } from "react-type-animation";

export default function AboutPage() {
  const navigate = useNavigate();

  const handleAboutClick = () => navigate(`/about-us`);
  const handleHomeClick = () => navigate(`/`);

  const developers = [
    {
      bio: "Sentient Brainrot",
      skills: "Monster drank - 4",
      quote: "Listening Peter cat recoring co.",
      image: "/MayurXD.png",
    },
    {
      bio: "Rizzwik",
      skills: "Laptops broken - 1",
      quote: "Listening Skyrim Music🎵",
      image: "/Ritz.png",
    },
  ];

  return (
    <div className="min-h-screen text-white font-['Press_Start_2P'] relative overflow-hidden">
      <MovingDotsBackground />

      {/* Header */}
      <header className="fixed top-0 left-0 w-full z-50 px-4 sm:px-6 py-4">
        <nav className="flex justify-end gap-6 sm:gap-10 text-yellow-300 text-[10px] sm:text-xs tracking-widest">
          <a href="#" className="hover:underline hover:text-white" onClick={(e) => { e.preventDefault(); handleHomeClick(); }}>HOME</a>
          <a href="#" className="hover:underline hover:text-white" onClick={(e) => { e.preventDefault(); handleAboutClick(); }}>ABOUT</a>
          <a href="#" className="hover:underline hover:text-white" onClick={(e) => { e.preventDefault(); navigate('/rules'); }}>RULES</a>
        </nav>
      </header>

      {/* Main Content */}
      <main className="relative z-10 pt-28 sm:pt-20 px-4 max-w-4xl mx-auto">
        {/* Hero Section */}
        <section className="text-center mb-10">
          <h1 className="text-3xl sm:text-5xl text-yellow-300 font-extrabold mb-6 text-shadow-lg/30">
            Meet the Dev'z
          </h1>
        </section>

        {/* Developer Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-6 px-2 sm:px-4">
          {developers.map((dev, index) => (
            <motion.div
              key={dev.bio}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{
                scale: 1.05,
                rotate: 1,
                transition: { duration: 0.3 },
              }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              className="bg-black/50 backdrop-blur-lg border border-yellow-300 rounded-xl shadow-[0_0_10px_#facc15] p-4 group relative scale-80"
            >
              {/* Image with Shine Overlay */}
              <div className="relative overflow-hidden rounded-2xl ">
                <img
                  src={dev.image}
                  alt={dev.bio}
                  className="w-full h-full object-cover justify-center rounded-2xl transition-transform duration-500 group-hover:scale-102"
                />
                {/* Shine Effect */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none rotate-12" />
              </div>

              {/* Info */}
              <div className="mt-6 text-center">
                <p className="text-lg text-yellow-300 mb-1">{dev.bio}</p>
                <p className="text-sm text-white mb-2">{dev.skills}</p>
                <TypeAnimation
                  sequence={[dev.quote, 2000]}
                  speed={50}
                  repeat={Infinity}
                  className="text-xs text-yellow-100 italic block"
                />
              </div>
            </motion.div>
          ))}
        </section>
      </main>
    </div>
  );
}
