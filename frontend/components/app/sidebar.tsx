'use client';
import React from 'react';
import { useSessionContext } from '@livekit/components-react';
import { useNotifications } from '@/hooks/useNotifications';
import { useAppState } from '@/hooks/useAppState';

export function Sidebar() {
  const { isConnected } = useSessionContext();
  const { notifications } = useNotifications();
  const { activeTab } = useAppState();

  return (
    <div className="absolute top-[130px] bottom-[20px] left-[20px] w-[340px] flex flex-col gap-6 z-40">
      {/* Top Section: Contextual Instructions */}
      <div className="flex-1 flex flex-col gap-2 min-h-0">
        <h2 className="text-lg font-bold font-mono pl-2">Instructions</h2>
        <div className="p-4 rounded-xl border-2 sketchy-border pencil-shadow bg-background/95 font-mono text-sm flex-1 overflow-y-auto space-y-4">
          {!isConnected ? (
            activeTab === 'home' ? (
              <>
                <p>Welcome to Lexi's Classroom!</p>
                <p className="font-bold">To Get Started:</p>
                <ul className="list-disc pl-4 space-y-2">
                  <li>Click the "Connect" button in the center.</li>
                  <li>Make sure your microphone is enabled.</li>
                  <li>Wait for Lexi to greet you!</li>
                </ul>
              </>
            ) : activeTab === 'teacher' ? (
              <>
                <p className="font-bold border-b border-black/10 pb-2">Teacher Dashboard</p>
                <ul className="list-disc pl-4 space-y-3">
                  <li><strong>Live Monitoring:</strong> Watch your students interact with Lexi in real-time.</li>
                  <li><strong>Handoff Alerts:</strong> See when a student requests human assistance.</li>
                  <li><strong>Join Call:</strong> Click on an active session to jump in and help the student directly.</li>
                </ul>
              </>
            ) : (
              <>
                <p className="font-bold border-b border-black/10 pb-2">Analytics Dashboard</p>
                <ul className="list-disc pl-4 space-y-3">
                  <li><strong>Call Metrics:</strong> Track total calls, success rates, and average durations.</li>
                  <li><strong>Engagement:</strong> View how many math problems Calci solved vs Lexi's general tutoring.</li>
                  <li><strong>Outcomes:</strong> Review session transcripts and AI-graded feedback.</li>
                </ul>
              </>
            )
          ) : (
            <>
              <p className="font-bold border-b border-black/10 pb-2">Available Features</p>
              <ul className="list-disc pl-4 space-y-3">
                <li>
                  <strong>English Practice:</strong> Speak naturally. Lexi will respond and guide you.
                </li>
                <li>
                  <strong>Maths Specialist (Calci):</strong> Ask a complex math problem like <em>"What is 456 times 89?"</em> to be transferred to Calci.
                </li>
                <li>
                  <strong>Return to Lexi:</strong> Tell Calci <em>"I'm done with math"</em> to switch back.
                </li>
                <li>
                  <strong>Trivia Game:</strong> Say <em>"I want to play trivia about science"</em> to test your knowledge.
                </li>
                <li>
                  <strong>Human Teacher:</strong> Say <em>"I need a human teacher to help me"</em> to escalate the call.
                </li>
                <li>
                  <strong>Knowledge Search:</strong> Ask a general knowledge question to search Wikipedia.
                </li>
              </ul>
            </>
          )}
        </div>
      </div>
      
      {/* Bottom Section: Notification History */}
      <div className="flex-1 flex flex-col gap-2 min-h-0">
        <h2 className="text-lg font-bold font-mono pl-2">System Log</h2>
        <div className="p-4 rounded-xl border-2 sketchy-border pencil-shadow bg-background/95 font-mono text-xs flex-1 overflow-y-auto space-y-2">
          {notifications.length === 0 ? (
            <p className="opacity-50 italic">No system events yet...</p>
          ) : (
            notifications.map(n => (
              <div key={n.id} className="border-b border-black/10 pb-2 mb-2 last:border-0 last:mb-0">
                <span className="opacity-50 text-[10px] block mb-1">{n.timestamp.toLocaleTimeString()}</span>
                <span className="font-bold block">{n.title}</span>
                {n.description && <span className="block mt-1 opacity-80">{n.description}</span>}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
