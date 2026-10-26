import React from 'react';

interface BlochSphereProps {
  // true when the discard pile is showing its light-side faces (state |0>)
  isLightSideActive: boolean;
  // true while a Superposition wildcard sits on top of the discard pile,
  // undetermined until a Measurement card collapses it back to a pole
  isSuperpositionActive: boolean;
}

const BlochSphere: React.FC<BlochSphereProps> = ({ isLightSideActive, isSuperpositionActive }) => {
  const pole = isSuperpositionActive ? 'equator' : isLightSideActive ? 'north' : 'south';

  return (
    <div
      className="flex flex-col items-center gap-1 select-none"
      title={
        isSuperpositionActive
          ? 'Superposition: state undetermined until Measurement'
          : isLightSideActive
            ? 'State |0>: light side active'
            : 'State |1>: dark side active'
      }
    >
      <span
        className={`text-[9px] sm:text-xs font-bold transition-opacity duration-300 drop-shadow-[1px_1px_0_rgba(0,0,0,0.8)] ${pole === 'north' ? 'text-yellow-300 opacity-100' : 'text-yellow-300/30'
          }`}
      >
        |0⟩
      </span>

      <div className="relative w-12 h-12 sm:w-20 sm:h-20">
        {/* Sphere body: hemisphere gradient + glossy highlight */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.55), transparent 40%),
              linear-gradient(to bottom, #ffe14b 0%, #fff7d6 46%, #1a0045 54%, #00171f 100%)`,
            boxShadow: '0 0 12px rgba(0,240,255,0.35), inset -4px -4px 10px rgba(0,0,0,0.5)',
          }}
        />

        {/* Equator ring */}
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[26%] rounded-full border border-white/40 pointer-events-none" />

        {/* State vector */}
        <div
          className={`absolute w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${pole === 'equator' ? 'bloch-equator-orbit' : 'transition-[top] duration-500 ease-out'
            }`}
          style={{
            left: pole === 'equator' ? undefined : '50%',
            top: pole === 'north' ? '2%' : pole === 'south' ? '88%' : undefined,
            transform: pole === 'equator' ? undefined : 'translateX(-50%)',
            background: pole === 'south' ? '#00f0ff' : '#ffe14b',
            boxShadow: `0 0 8px 2px ${pole === 'south' ? 'rgba(0,240,255,0.9)' : 'rgba(255,225,75,0.9)'}`,
          }}
        />

        {isSuperpositionActive && (
          <span className="absolute inset-0 flex items-center justify-center text-[10px] sm:text-xs text-purple-200 font-bold drop-shadow-[1px_1px_0_rgba(0,0,0,0.9)] animate-pulse">
            ψ
          </span>
        )}
      </div>

      <span
        className={`text-[9px] sm:text-xs font-bold transition-opacity duration-300 drop-shadow-[1px_1px_0_rgba(0,0,0,0.8)] ${pole === 'south' ? 'text-cyan-300 opacity-100' : 'text-cyan-300/30'
          }`}
      >
        |1⟩
      </span>
    </div>
  );
};

export default BlochSphere;
