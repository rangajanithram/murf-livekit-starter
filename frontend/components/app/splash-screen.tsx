'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';

export function SplashScreen({ onComplete, language = 'en' }: { onComplete: () => void, language?: 'en' | 'hi' }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // 1.5 seconds loading duration
    const duration = 1500; 
    const interval = 30;
    const step = 100 / (duration / interval);

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(onComplete, 400); // Wait briefly at 100% before exiting
          return 100;
        }
        return prev + step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <motion.div
      key="splash-screen"
      initial={{ opacity: 1 }}
      exit={{ 
        opacity: 0, 
        y: -50,
        filter: 'blur(10px)',
      }}
      transition={{ duration: 0.8, ease: 'easeInOut' }}
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#f9f9ff] ruled-bg"
    >
      <div className="flex flex-col items-center gap-8 w-full max-w-md px-8">
        
        {/* Animated Pencil Icon */}
        <div className="relative">
          <span className="material-symbols-outlined text-[80px] text-[#002045] animate-scribble">
            edit
          </span>
          <span className="material-symbols-outlined text-[40px] text-[#ba1a1a] absolute -top-4 -right-4 animate-scribble-slow opacity-50 rotate-45">
            auto_awesome
          </span>
        </div>
        
        {/* Loading text */}
        <h2 className="font-mono text-xl sm:text-3xl font-bold text-[#002045] animate-pulse text-center">
          {language === 'hi' ? 'नोटबुक खुल रही है...' : 'Opening Notebook...'}
        </h2>

        {/* Progress Bar Area */}
        <div className="w-full flex flex-col gap-2">
          <div className="w-full flex justify-between font-mono font-bold text-[#002045] uppercase tracking-wider text-xs sm:text-sm">
             <span className="animate-scribble-slow">
               {language === 'hi' ? 'पेंसिल तेज की जा रही है...' : 'Sharpening pencils...'}
             </span>
             <span>{Math.floor(progress)}%</span>
          </div>
          
          <div className="w-full h-8 sketchy-box border-2 border-[#002045] rounded-xl p-1 bg-white pencil-shadow relative overflow-hidden">
            {/* The fill bar */}
            <div 
              className="h-full bg-[#ba1a1a] rounded-lg transition-all duration-75 ease-linear"
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>
        </div>
        
      </div>

      {/* Background doodles for splash screen */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
        <div className="absolute top-1/4 right-[15%] opacity-30 rotate-12 animate-scribble">
          <span className="material-symbols-outlined text-[80px] text-[#002045]">menu_book</span>
        </div>
        <div className="absolute bottom-1/4 left-[10%] opacity-20 -rotate-12 animate-scribble-slow">
          <span className="material-symbols-outlined text-[100px] text-[#002045]">school</span>
        </div>
        <div className="absolute top-[10%] left-[20%] opacity-15 rotate-45 animate-scribble">
          <span className="material-symbols-outlined text-[60px] text-[#ba1a1a]">calculate</span>
        </div>
        <div className="absolute bottom-[15%] right-[25%] opacity-20 -rotate-6 animate-scribble-slow">
          <span className="material-symbols-outlined text-[70px] text-[#003f25]">science</span>
        </div>
      </div>
    </motion.div>
  );
}
