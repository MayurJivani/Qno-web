import { useEffect } from "react";

const MovingDotsBackground = () => {
  useEffect(() => {
    const background = document.createElement('div');
    background.className = 'background-dots';
    Object.assign(background.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      overflow: 'hidden',
      zIndex: '0',
    });

    const COLORS = ['#ff0044', '#ffdd00', '#A2D729', '#FC5A2E', '#448aff','#00A89A','#F433AB','#82298F'];
    
    for (let i = 0; i < 250; i++) {
      const dot = document.createElement('div');
      dot.className = 'dot';
      const size = Math.floor(Math.random() * 3 + 3) + 'px';
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      Object.assign(dot.style, {
        position: 'absolute',
        width: size,
        height: size,
        backgroundColor: color,
        boxShadow: `0 0 5px ${color}`,
        top: `${Math.random() * 100}%`,
        left: `${Math.random() * 100}%`,
        imageRendering: 'pixelated',
        animation: `moveLeft ${Math.random() * 8 + 6}s linear infinite`,
      });
      background.appendChild(dot);
    }

    document.body.appendChild(background);

    return () => {
      document.body.removeChild(background);
    };
  }, []);

  return null;
};

export default MovingDotsBackground;
