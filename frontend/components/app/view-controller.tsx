'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { AnimatePresence, motion } from 'motion/react';
import { useSessionContext, useConnectionState } from '@livekit/components-react';
import { ConnectionState } from 'livekit-client';
import { toast } from 'sonner';
import type { AppConfig } from '@/app-config';
import { AgentSessionView_01 } from '@/components/agents-ui/blocks/agent-session-view-01';
import { WelcomeView } from '@/components/app/welcome-view';

import { SplashScreen } from '@/components/app/splash-screen';

const MotionWelcomeView = motion.create(WelcomeView);
const MotionSessionView = motion.create(AgentSessionView_01);

const VIEW_MOTION_PROPS = {
  variants: {
    visible: {
      opacity: 1,
    },
    hidden: {
      opacity: 0,
    },
  },
  initial: 'hidden',
  animate: 'visible',
  exit: 'hidden',
  transition: {
    duration: 0.5,
    ease: 'linear',
  },
};

interface ViewControllerProps {
  appConfig: AppConfig;
}

export function ViewController({ appConfig }: ViewControllerProps) {
  const { isConnected, start } = useSessionContext();
  const connectionState = useConnectionState();
  const { resolvedTheme } = useTheme();
  const [hasConnected, setHasConnected] = useState(false);
  const [isAppLoaded, setIsAppLoaded] = useState(false);
  const [language, setLanguage] = useState<'en' | 'hi'>('en');

  useEffect(() => {
    if (isConnected) {
      setHasConnected(true);
    }
  }, [isConnected]);

  const handleStart = async () => {
    try {
      await start();
    } catch (err: any) {
      const msg = err?.message?.toLowerCase() || '';
      if (msg.includes('permission') || msg.includes('device') || msg.includes('notallowederror')) {
        toast.error('Microphone Access Denied', {
          description: 'Lexi needs access to your microphone to talk with you. Please allow it in your browser settings.',
          duration: 8000,
        });
      } else {
        toast.error('Connection Failed: Could not reach the room', {
          description: (
            <div className="flex flex-col gap-1 mt-2 text-sm">
              <span className="font-bold uppercase tracking-wide">Why it happened:</span>
              <span className="mb-2">Could not connect to the LiveKit server. Your connection might be unstable or the LiveKit token is invalid.</span>
              
              <span className="font-bold uppercase tracking-wide">How to resolve it:</span>
              <span>1. Verify <code className="bg-black/10 px-1 rounded">LIVEKIT_API_KEY</code> and <code className="bg-black/10 px-1 rounded">LIVEKIT_API_SECRET</code> in your frontend .env file.</span>
              <span>2. Check your internet connection.</span>
              <span>3. Ensure the LiveKit cloud project is active.</span>
            </div>
          ),
          duration: 15_000,
        });
      }
    }
  };

  return (
    <AnimatePresence mode="wait">
      {/* Splash Screen (App Initial Load) */}
      {!isAppLoaded && (
        <SplashScreen key="splash" onComplete={() => setIsAppLoaded(true)} language={language} />
      )}

      {/* Welcome view */}
      {isAppLoaded && connectionState === ConnectionState.Disconnected && (
        <MotionWelcomeView
          key="welcome"
          {...VIEW_MOTION_PROPS}
          isReconnect={hasConnected}
          language={language}
          onLanguageChange={setLanguage}
          onStartCall={handleStart}
        />
      )}
      {/* Connecting view */}
      {connectionState === ConnectionState.Connecting && (
        <motion.div
          key="connecting"
          {...VIEW_MOTION_PROPS}
          className="fixed inset-0 flex flex-col items-center justify-center z-[100]"
        >
          <div className="flex flex-col items-center gap-6">
            <div className="relative w-24 h-24 flex items-center justify-center">
              <svg className="w-full h-full animate-spin text-[#002045]" viewBox="0 0 140 140">
                <circle cx="70" cy="70" r="60" fill="none" stroke="currentColor" strokeWidth="12" className="opacity-20"></circle>
                <path d="M70,10 A60,60 0 0,1 130,70" fill="none" stroke="currentColor" strokeWidth="14" strokeLinecap="round"></path>
              </svg>
              <span className="material-symbols-outlined absolute text-3xl text-[#002045]">edit</span>
            </div>
            <h2 className="font-mono text-3xl font-bold text-[#002045] animate-pulse text-center px-4">
              {language === 'hi' ? 'लेक्सी से कनेक्ट हो रहा है...' : 'Connecting to Lexi...'}
            </h2>
            <p className="font-mono text-lg text-[#43474e] text-center px-4">
              {language === 'hi' ? 'कृपया प्रतीक्षा करें...' : 'Please wait while we grab a notebook.'}
            </p>
          </div>
        </motion.div>
      )}
      {/* Session view */}
      {isConnected && (
        <MotionSessionView
          key="session-view"
          {...VIEW_MOTION_PROPS}
          language={language}
          supportsChatInput={appConfig.supportsChatInput}
          supportsVideoInput={appConfig.supportsVideoInput}
          supportsScreenShare={appConfig.supportsScreenShare}
          isPreConnectBufferEnabled={appConfig.isPreConnectBufferEnabled}
          audioVisualizerType={appConfig.audioVisualizerType}
          audioVisualizerColor={
            resolvedTheme === 'dark'
              ? appConfig.audioVisualizerColorDark
              : appConfig.audioVisualizerColor
          }
          audioVisualizerColorShift={appConfig.audioVisualizerColorShift}
          audioVisualizerBarCount={appConfig.audioVisualizerBarCount}
          audioVisualizerGridRowCount={appConfig.audioVisualizerGridRowCount}
          audioVisualizerGridColumnCount={appConfig.audioVisualizerGridColumnCount}
          audioVisualizerRadialBarCount={appConfig.audioVisualizerRadialBarCount}
          audioVisualizerRadialRadius={appConfig.audioVisualizerRadialRadius}
          audioVisualizerWaveLineWidth={appConfig.audioVisualizerWaveLineWidth}
          className="fixed inset-0"
        />
      )}
    </AnimatePresence>
  );
}
