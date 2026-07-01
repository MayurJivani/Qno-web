import React, { useState, useEffect } from 'react';

const OrientationOverlay: React.FC = () => {
    const [isPortrait, setIsPortrait] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkOrientation = () => {
            const portrait = window.innerHeight > window.innerWidth;
            // We check for mobile context - usually windows smaller than 1024px width in landscape
            // or simply if portrait and small width.
            const mobile = window.innerWidth <= 1024 || (window.innerHeight <= 1024 && window.innerWidth < window.innerHeight);
            setIsPortrait(portrait);
            setIsMobile(mobile);
        };

        checkOrientation();
        window.addEventListener('resize', checkOrientation);
        window.addEventListener('orientationchange', checkOrientation);

        return () => {
            window.removeEventListener('resize', checkOrientation);
            window.removeEventListener('orientationchange', checkOrientation);
        };
    }, []);

    if (!isMobile || !isPortrait) return null;

    return (
        <div className="fixed inset-0 z-[9999] bg-[#2b0057] flex flex-col items-center justify-center text-center p-6 text-white font-['Press_Start_2P']">
            <div className="mb-12">
                <div className="w-16 h-28 border-4 border-yellow-300 rounded-xl relative animate-rotate-phone mx-auto">
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 w-8 h-1 bg-yellow-300/50 rounded-full"></div>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-4 h-4 border-2 border-yellow-300/50 rounded-full"></div>
                </div>
            </div>
            <h2 className="text-xl sm:text-2xl text-yellow-300 mb-6 drop-shadow-[0_4px_0_rgba(0,0,0,1)]">ROTATE DEVICE</h2>
            <p className="text-[10px] sm:text-xs leading-loose max-w-xs mx-auto opacity-80">
                PLEASE SWITCH TO LANDSCAPE MODE<br />
                FOR THE BEST QUANTUM EXPERIENCE
            </p>

            <div className="mt-12 flex gap-2">
                <div className="w-2 h-2 bg-red-500 animate-pulse"></div>
                <div className="w-2 h-2 bg-yellow-500 animate-pulse delay-75"></div>
                <div className="w-2 h-2 bg-green-500 animate-pulse delay-150"></div>
            </div>
        </div>
    );
};

export default OrientationOverlay;
