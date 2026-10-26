import React from "react";

type IconProps = { className?: string };

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

// Bit-flip: the active side drops into the box
export const IconPauliX: React.FC<IconProps> = ({ className }) => (
  <svg {...base} className={className} strokeWidth={2}>
    <rect x="7" y="12.5" width="10" height="6.5" rx="1.3" />
    <path d="M17 4c-3.5 0-6 2-6 5.5" />
    <path d="M11 9.5l-1.2-2.6M11 9.5l2.7-0.5" />
  </svg>
);

// Flips side AND reverses turn direction: X's box-drop, plus Z's swap as a badge
export const IconPauliY: React.FC<IconProps> = ({ className }) => (
  <svg {...base} className={className} strokeWidth={2}>
    <rect x="8" y="9" width="10" height="7" rx="1.3" />
    <path d="M8 4c0 3.2 1.8 5.5 5 5.5" />
    <path d="M13 9.5l-2.4-1.4M13 9.5l-0.6 2.5" />
    <path d="M17 3.5l3 3" />
    <path d="M20 3.8v2.5M20 6.5h-2.5" />
  </svg>
);

// Reverses turn direction only: a diagonal swap
export const IconPauliZ: React.FC<IconProps> = ({ className }) => (
  <svg {...base} className={className} strokeWidth={2}>
    <path d="M7 17L17 7" />
    <path d="M17 7l-4 0M17 7l0 4" />
    <path d="M7 17l4 0M7 17l0-4" />
  </svg>
);

// A card beamed straight into another hand
export const IconTeleportation: React.FC<IconProps> = ({ className }) => (
  <svg {...base} className={className}>
    <path d="M4 12h13" strokeDasharray="2.8 2.6" />
    <path d="M13 7l4 5-4 5" />
  </svg>
);

// Protractor + needle: reveals a card
export const IconMeasurement: React.FC<IconProps> = ({ className }) => (
  <svg {...base} className={className}>
    <path d="M4 16a8 8 0 0 1 16 0" />
    <path d="M12 16 17.5 8.5" />
    <path d="M17.5 8.5 14.7 8.9" />
    <path d="M17.5 8.5 18.1 11.1" />
  </svg>
);

// Atom: two crossing orbits, undetermined until measured
export const IconSuperposition: React.FC<IconProps> = ({ className }) => (
  <svg {...base} className={className}>
    <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
    <ellipse cx="12" cy="12" rx="9" ry="4" />
    <ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(60 12 12)" />
  </svg>
);

// Linked hands/decks
export const IconEntanglement: React.FC<IconProps> = ({ className }) => (
  <svg {...base} className={className}>
    <rect x="3" y="6" width="7" height="12" rx="2" />
    <rect x="14" y="6" width="7" height="12" rx="2" />
    <path d="M10 12h4" />
  </svg>
);

// Coherence scattering apart
export const IconDecoherence: React.FC<IconProps> = ({ className }) => (
  <svg {...base} className={className}>
    <circle cx="12" cy="12" r="2.1" />
    <path d="M12 4v3M12 17v3M4 12h3M17 12h3M6.3 6.3l2.1 2.1M15.6 15.6l2.1 2.1M6.3 17.7l2.1-2.1M15.6 8.4l2.1-2.1" />
  </svg>
);

export const CARD_ICONS: Record<string, React.FC<IconProps>> = {
  Pauli_X: IconPauliX,
  Pauli_Y: IconPauliY,
  Pauli_Z: IconPauliZ,
  Teleportation: IconTeleportation,
  Measurement: IconMeasurement,
  Superposition: IconSuperposition,
  Entanglement: IconEntanglement,
  Decoherence: IconDecoherence,
};
