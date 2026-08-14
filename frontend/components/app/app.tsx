'use client';

import React, { useMemo } from 'react';
import { TokenSource } from 'livekit-client';
import { useSession } from '@livekit/components-react';
import { WarningIcon } from '@phosphor-icons/react/dist/ssr';
import type { AppConfig } from '@/app-config';
import { AgentSessionProvider } from '@/components/agents-ui/agent-session-provider';
import { StartAudioButton } from '@/components/agents-ui/start-audio-button';
import { ViewController } from '@/components/app/view-controller';
import { SettingsPanel } from '@/components/app/settings-panel';
import { Toaster } from '@/components/ui/sonner';
import { useAgentErrors } from '@/hooks/useAgentErrors';
import { useDebugMode } from '@/hooks/useDebug';
import { getSandboxTokenSource } from '@/lib/utils';
import { Sidebar } from '@/components/app/sidebar';

const IN_DEVELOPMENT = process.env.NODE_ENV !== 'production';

function AppSetup() {
  useDebugMode({ enabled: IN_DEVELOPMENT });
  useAgentErrors();

  return null;
}

function Clock() {
  const [mounted, setMounted] = React.useState(false);
  const [time, setTime] = React.useState(new Date());

  React.useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!mounted) return null;

  return (
    <div className="absolute top-[20px] left-[20px] z-50 p-2 px-4 rounded-xl shadow-sm border-2 sketchy-border pencil-shadow bg-background/80 backdrop-blur transform -rotate-2">
      <div className="text-sm font-bold">{time.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</div>
      <div className="text-lg font-mono text-primary">{time.toLocaleTimeString()}</div>
    </div>
  );
}

interface AppProps {
  appConfig: AppConfig;
}

export function App({ appConfig }: AppProps) {
  const [uiSize, setUiSize] = React.useState<'normal' | 'large'>('large');
  const [volume, setVolume] = React.useState<number>(1.0);

  const tokenSource = useMemo(() => {
    return typeof process.env.NEXT_PUBLIC_CONN_DETAILS_ENDPOINT === 'string'
      ? getSandboxTokenSource(appConfig)
      : TokenSource.endpoint('/api/token');
  }, [appConfig]);

  const session = useSession(
    tokenSource,
    {
      agentName: appConfig.agentName ? appConfig.agentName : undefined,
      agentConnectTimeoutMilliseconds: 120000,
    }
  );

  React.useEffect(() => {
    if (uiSize === 'large') {
      document.documentElement.style.fontSize = '120%'; // Scales 1rem = 19.2px
    } else {
      document.documentElement.style.fontSize = '100%'; // Scales 1rem = 16px
    }
    // Cleanup on unmount just in case
    return () => {
      document.documentElement.style.fontSize = '100%';
    };
  }, [uiSize]);

  return (
    <AgentSessionProvider session={session} volume={volume}>
      <AppSetup />
      <Clock />
      <Sidebar />
      <SettingsPanel uiSize={uiSize} setUiSize={setUiSize} volume={volume} setVolume={setVolume} />
      <div className="w-full h-full ruled-bg relative">
        <div className="margin-line"></div>
        <div className="margin-line-horizontal"></div>
        <main className="grid h-svh grid-cols-1 place-content-center pl-[380px]">
          <ViewController appConfig={appConfig} />
        </main>
      </div>
      <StartAudioButton label="Start Audio" />
      <Toaster
        icons={{
          warning: <WarningIcon weight="bold" />,
        }}
        position="top-center"
        className="toaster group"
        style={
          {
            '--normal-bg': 'var(--popover)',
            '--normal-text': 'var(--popover-foreground)',
            '--normal-border': 'var(--border)',
          } as React.CSSProperties
        }
      />
    </AgentSessionProvider>
  );
}
