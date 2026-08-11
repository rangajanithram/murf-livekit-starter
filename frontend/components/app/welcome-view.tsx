import { Button } from '@/components/ui/button';
import MeshText from '@/components/ui/mesh-text';
import { useState } from 'react';

interface WelcomeViewProps {
  onStartCall: () => void;
  isReconnect?: boolean;
  language: 'en' | 'hi';
  onLanguageChange: (lang: 'en' | 'hi') => void;
}

export const WelcomeView = ({
  onStartCall,
  isReconnect = false,
  language,
  onLanguageChange,
  ref,
}: React.ComponentProps<'div'> & WelcomeViewProps) => {
  
  const translations = {
    en: {
      desc: "Your AI study companion. Open your notebook and let's get started.",
      reconnect: "Class dismissed! But your notebook is always here if you want to learn more.",
      start: "Start Learning"
    },
    hi: {
      desc: "आपकी एआई स्टडी पार्टनर। अपनी नोटबुक खोलें और चलिए शुरू करते हैं!",
      reconnect: "क्लास खत्म! लेकिन अगर आप और सीखना चाहते हैं तो आपकी नोटबुक हमेशा यहीं है।",
      start: "सीखना शुरू करें"
    }
  };

  const t = translations[language];
  const [phone, setPhone] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [callStatus, setCallStatus] = useState('');

  const displayPhone = !isFocused && phone.length >= 4 
    ? 'x'.repeat(phone.length - 4) + phone.slice(-4) 
    : phone;

  const handleCallMe = async () => {
    if (!phone) return;
    setIsCalling(true);
    setCallStatus('Calling...');
    try {
      const res = await fetch('/api/outbound', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      if (res.ok) {
        setCallStatus('Phone ringing! Answer it to talk to Lexi.');
      } else {
        setCallStatus('Failed to initiate call.');
      }
    } catch (e) {
      setCallStatus('Error initiating call.');
    }
    setIsCalling(false);
  };

  return (
    <div ref={ref} className="relative w-full h-full min-h-screen overflow-hidden flex flex-col items-center justify-center text-center px-4">
      {/* Language Toggle */}
      <div className="absolute top-6 right-6 z-50 flex gap-2">
        <button 
          onClick={() => onLanguageChange('en')}
          className={`px-3 py-1 font-mono text-sm font-bold border-2 sketchy-box transition-all ${language === 'en' ? 'bg-[#002045] text-white border-[#002045]' : 'bg-white text-[#002045] border-[#002045]'}`}
        >
          EN
        </button>
        <button 
          onClick={() => onLanguageChange('hi')}
          className={`px-3 py-1 font-mono text-sm font-bold border-2 sketchy-box transition-all ${language === 'hi' ? 'bg-[#002045] text-white border-[#002045]' : 'bg-white text-[#002045] border-[#002045]'}`}
        >
          HI
        </button>
      </div>

      <section className="relative z-10 flex flex-col items-center justify-center w-full px-4">
        {/* MeshText Heading */}
        <div className="w-[800px] max-w-full h-[140px] sm:h-[200px] md:h-[240px] mb-4 sm:mb-8 transform -rotate-1">
          <MeshText 
            text="Lexi AI" 
            color="#002045"
            colorSplit={true} 
            customColors={["#1a365d", "#003f25"]} 
          />
        </div>

        <p className="font-mono text-base sm:text-lg text-[#002045] w-full max-w-md mx-auto mb-8 sm:mb-12 transform rotate-1 bg-white/50 backdrop-blur-sm p-3 sm:p-4 rounded-xl sketchy-border pencil-shadow">
          {isReconnect ? t.reconnect : t.desc}
        </p>

        <Button
          size="lg"
          onClick={onStartCall}
          className="mt-2 sm:mt-6 w-full max-w-[320px] h-14 sm:h-16 bg-[#ffffff] border-2 border-[#002045] text-[#002045] hover:bg-[#f2e580] sketchy-box pencil-shadow transition-all duration-300 z-50 pointer-events-auto cursor-pointer flex items-center justify-center gap-2 group font-mono text-lg sm:text-xl font-bold tracking-wider"
        >
          <span className="material-symbols-outlined text-2xl sm:text-3xl group-hover:rotate-12 transition-transform">edit</span>
          {isReconnect && language === 'en' ? 'Start Again' : isReconnect && language === 'hi' ? 'फिर से शुरू करें' : t.start}
        </Button>

        {/* Call Me Feature */}
        <div className="mt-8 flex flex-col items-center gap-3 z-50 w-full max-w-[320px] p-4 bg-white/70 backdrop-blur-md rounded-xl border-2 border-[#002045] sketchy-box shadow-md pointer-events-auto">
          <p className="font-mono text-sm font-bold text-[#002045]">Or get a phone call from Lexi!</p>
          <input
            type={isFocused ? "tel" : "text"}
            placeholder="e.g. +919353143053"
            value={displayPhone}
            onChange={(e) => {
              // Only update if they are actively typing (focused).
              // If not focused, ignore the change to prevent masking issues.
              if (isFocused) {
                setPhone(e.target.value);
              }
            }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="w-full px-3 py-2 border-2 border-[#002045] rounded-md font-mono text-sm focus:outline-none focus:bg-[#f2e580]/30"
          />
          <Button
            size="sm"
            onClick={handleCallMe}
            disabled={isCalling || !phone}
            className="w-full bg-[#002045] text-white hover:bg-[#1a365d] border-2 border-transparent hover:border-[#f2e580] font-mono text-sm font-bold transition-all disabled:opacity-50"
          >
            {isCalling ? 'Dialing...' : 'Call Me'}
          </Button>
          {callStatus && (
            <p className="font-mono text-xs text-[#ba1a1a] font-bold mt-1 animate-pulse">{callStatus}</p>
          )}
        </div>
      </section>

      {/* Decorative Doodles */}
      <div className="absolute top-1/4 right-[15%] opacity-20 rotate-12 pointer-events-none animate-scribble">
        <span className="material-symbols-outlined text-[80px] text-[#002045]">menu_book</span>
      </div>
      <div className="absolute bottom-1/4 left-[10%] opacity-15 -rotate-12 pointer-events-none animate-scribble-slow">
        <span className="material-symbols-outlined text-[100px] text-[#002045]">school</span>
      </div>
      <div className="absolute top-[10%] left-[20%] opacity-10 rotate-45 pointer-events-none animate-scribble">
        <span className="material-symbols-outlined text-[60px] text-[#ba1a1a]">calculate</span>
      </div>
      <div className="absolute bottom-[15%] right-[25%] opacity-15 -rotate-6 pointer-events-none animate-scribble-slow">
        <span className="material-symbols-outlined text-[70px] text-[#003f25]">science</span>
      </div>
      <div className="absolute top-[40%] left-[5%] opacity-10 rotate-[30deg] pointer-events-none animate-scribble">
        <span className="material-symbols-outlined text-[50px] text-[#002045]">edit_document</span>
      </div>
      <div className="absolute top-[60%] right-[8%] opacity-10 -rotate-[20deg] pointer-events-none animate-scribble-slow">
        <span className="material-symbols-outlined text-[90px] text-[#ba1a1a]">abc</span>
      </div>
      <div className="absolute top-[80%] left-[15%] opacity-15 rotate-12 pointer-events-none animate-scribble">
        <span className="material-symbols-outlined text-[75px] text-[#002045]">backpack</span>
      </div>
      <div className="absolute top-[5%] right-[5%] opacity-10 -rotate-12 pointer-events-none animate-scribble-slow">
        <span className="material-symbols-outlined text-[65px] text-[#003f25]">straighten</span>
      </div>
      <div className="absolute top-[30%] left-[2%] opacity-10 rotate-[25deg] pointer-events-none animate-scribble">
        <span className="material-symbols-outlined text-[85px] text-[#ba1a1a]">palette</span>
      </div>
      <div className="absolute bottom-[5%] right-[40%] opacity-10 -rotate-[15deg] pointer-events-none animate-scribble-slow">
        <span className="material-symbols-outlined text-[60px] text-[#002045]">history_edu</span>
      </div>
      <div className="absolute top-[50%] right-[20%] opacity-15 rotate-[45deg] pointer-events-none animate-scribble">
        <span className="material-symbols-outlined text-[70px] text-[#002045]">rocket_launch</span>
      </div>
      <div className="absolute top-[20%] right-[30%] opacity-10 -rotate-[10deg] pointer-events-none animate-scribble-slow">
        <span className="material-symbols-outlined text-[55px] text-[#ba1a1a]">emoji_objects</span>
      </div>
      <div className="absolute bottom-[35%] left-[25%] opacity-10 rotate-[15deg] pointer-events-none animate-scribble">
        <span className="material-symbols-outlined text-[80px] text-[#003f25]">cruelty_free</span>
      </div>
      <div className="absolute bottom-[50%] left-[15%] opacity-15 -rotate-[25deg] pointer-events-none animate-scribble-slow">
        <span className="material-symbols-outlined text-[65px] text-[#002045]">functions</span>
      </div>
    </div>
  );
};

