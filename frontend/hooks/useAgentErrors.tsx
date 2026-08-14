import { ReactNode, useEffect } from 'react';
import { toast as sonnerToast } from 'sonner';
import { useAgent, useSessionContext } from '@livekit/components-react';
import { WarningIcon } from '@phosphor-icons/react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

import { useNotifications } from './useNotifications';

interface ToastProps {
  title: ReactNode;
  description: ReactNode;
}

function toastAlert(toast: ToastProps) {
  const { title, description } = toast;
  
  // Also push to our persistent store
  useNotifications.getState().addNotification(
    title as string, 
    description ? "Check toast for details" : undefined
  );

  return sonnerToast.error(title, {
    description: description,
    duration: 15_000,
  });
}

export function useAgentErrors() {
  const agent = useAgent();
  const { isConnected, end } = useSessionContext();

  useEffect(() => {
    if (isConnected && agent.state === 'failed') {
      const reasons = agent.failureReasons;

      toastAlert({
        title: 'Connection Failed: Lexi left the room',
        description: (
          <div className="flex flex-col gap-1 mt-2 text-sm">
            <span className="font-bold uppercase tracking-wide">Why it happened:</span>
            {reasons.length > 1 && (
              <ul className="list-inside list-disc mb-2">
                {reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            )}
            {reasons.length === 1 && <span className="mb-2">{reasons[0]}</span>}
            {reasons.length === 0 && <span className="mb-2">The Python backend server is offline or crashed.</span>}
            
            <span className="font-bold uppercase tracking-wide mt-1">How to resolve it:</span>
            <span>1. Open your terminal and check if the backend is running.</span>
            <span>2. If it stopped, restart it with <code className="bg-black/10 px-1 rounded">uv run python src/agent.py dev</code></span>
            <span>3. Verify your API keys in the backend <code className="bg-black/10 px-1 rounded">.env.local</code> file.</span>
            <span>4. Click 'Start Again' below to retry.</span>
          </div>
        ),
      });

      end();
    }
  }, [agent, isConnected, end]);
}
