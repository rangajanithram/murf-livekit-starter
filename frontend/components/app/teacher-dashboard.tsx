'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';

interface TeacherDashboardProps {
  onBack: () => void;
}

export function TeacherDashboard({ onBack }: TeacherDashboardProps) {
  const [escalations, setEscalations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const fetchEscalations = async () => {
    try {
      const res = await fetch('/api/escalations');
      const data = await res.json();
      if (Array.isArray(data)) {
        setEscalations(data);
      } else {
        console.error('API returned non-array:', data);
        setEscalations([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEscalations();
    const interval = setInterval(fetchEscalations, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleResolve = async (id: string, phone: string | null) => {
    setResolvingId(id);
    try {
      await fetch('/api/escalations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ escalation_id: id }),
      });
      
      if (phone) {
        await fetch('/api/outbound', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone }),
        });
        alert(`Resolved! Calling user at ${phone} to notify them.`);
      } else {
        alert('Resolved! (No phone number found to call back)');
      }
      
      fetchEscalations();
    } catch (e) {
      console.error(e);
    } finally {
      setResolvingId(null);
    }
  };

  if (loading) {
    return <div className="p-10 text-[#002045] font-mono font-bold animate-pulse">Loading Escalations...</div>;
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="w-full max-w-5xl h-[80vh] overflow-y-auto p-8 rounded-xl border-2 sketchy-box bg-white/80 backdrop-blur-sm shadow-xl text-left font-sans"
    >
      <div className="flex justify-between items-center mb-8 pb-4 border-b-2 sketchy-border border-[#002045]/20">
        <h1 className="text-3xl font-black text-[#002045]">Support Escalations</h1>
        <div className="flex items-center gap-4">
          <div className="px-4 py-2 border-2 sketchy-box bg-[#ba1a1a]/10 text-[#ba1a1a] font-bold">
            {escalations.filter(e => e.status === 'OPEN').length} Open Requests
          </div>
          <button 
            onClick={onBack}
            className="px-4 py-2 font-mono text-sm font-bold border-2 sketchy-box transition-all bg-white text-[#002045] border-[#002045] hover:bg-[#002045] hover:text-white"
          >
            Go Back
          </button>
        </div>
      </div>

      {escalations.length === 0 ? (
        <div className="border-2 sketchy-box p-12 text-center bg-white/50">
          <h3 className="text-xl font-bold text-[#002045]">No escalations found</h3>
          <p className="text-[#002045]/70 mt-2 font-mono">All learners are happy and practicing!</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {escalations.map((esc) => (
            <div 
              key={esc.escalation_id} 
              className={`p-6 border-2 sketchy-box transition-colors ${esc.status === 'OPEN' ? 'bg-red-50/50 border-[#ba1a1a]' : 'bg-gray-50/50 border-gray-300'}`}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-mono font-bold text-lg text-[#002045]">{esc.escalation_id}</span>
                    <span className={`px-2 py-1 text-xs font-bold uppercase border-2 sketchy-border ${
                      esc.status === 'OPEN' ? 'bg-[#ba1a1a]/20 text-[#ba1a1a] border-[#ba1a1a]' : 'bg-green-100 text-green-800 border-green-800'
                    }`}>
                      {esc.status}
                    </span>
                    {esc.status === 'OPEN' && (
                      <span className={`px-2 py-1 text-xs font-bold uppercase border-2 sketchy-border ${
                        esc.urgency === 'high' || esc.urgency === 'emergency' ? 'bg-orange-100 text-orange-800 border-orange-800' : 'bg-yellow-100 text-yellow-800 border-yellow-800'
                      }`}>
                        {esc.urgency}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-[#002045]/70 font-mono">
                    User: {esc.user_id} | Language: {esc.language} | Method: {esc.follow_up_method} | Phone: {esc.phone_number || 'None'}
                  </div>
                </div>
                <div className="text-sm font-mono text-[#002045]/50 text-right">
                  {new Date(esc.created_at + 'Z').toLocaleString()}
                </div>
              </div>
              
              <div className="mb-4">
                <h4 className="font-bold text-[#002045] mb-1 font-sans">Summary</h4>
                <p className="text-[#002045]/80 bg-white/50 p-4 border-2 sketchy-border text-sm leading-relaxed">{esc.summary}</p>
              </div>

              {esc.status === 'OPEN' && (
                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => handleResolve(esc.escalation_id, esc.phone_number)}
                    disabled={resolvingId === esc.escalation_id}
                    className="px-6 py-2 border-2 sketchy-box font-bold bg-[#ba1a1a] text-white hover:bg-[#ba1a1a]/80 disabled:opacity-50 transition-colors"
                  >
                    {resolvingId === esc.escalation_id ? 'Resolving...' : 'Mark Resolved & Call Back'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
