'use client';

import { useState, useEffect } from 'react';

export default function EscalationsDashboard() {
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
      // 1. Mark as resolved in DB
      await fetch('/api/escalations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ escalation_id: id }),
      });
      
      // 2. Trigger the callback using the outbound API if a phone number was captured
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
    return <div className="p-10">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-10 font-sans">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Support Escalations</h1>
          <div className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg text-sm font-semibold">
            {escalations.filter(e => e.status === 'OPEN').length} Open Requests
          </div>
        </div>

        {escalations.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-xl font-medium text-gray-500">No escalations found</h3>
            <p className="text-gray-400 mt-2">All learners are happy and practicing!</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {escalations.map((esc) => (
              <div 
                key={esc.escalation_id} 
                className={`p-6 rounded-xl shadow-sm border ${esc.status === 'OPEN' ? 'bg-white border-red-200' : 'bg-gray-100 border-gray-200'}`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-mono font-bold text-lg">{esc.escalation_id}</span>
                      <span className={`px-2 py-1 text-xs font-bold rounded uppercase ${
                        esc.status === 'OPEN' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {esc.status}
                      </span>
                      {esc.status === 'OPEN' && (
                        <span className={`px-2 py-1 text-xs font-bold rounded uppercase ${
                          esc.urgency === 'high' || esc.urgency === 'emergency' ? 'bg-orange-100 text-orange-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {esc.urgency} Priority
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 mt-2">
                      <span className="font-semibold text-gray-700">User ID:</span> {esc.user_id} <br />
                      <span className="font-semibold text-gray-700">Phone:</span> {esc.phone_number || 'Not provided'} <br />
                      <span className="font-semibold text-gray-700">Language:</span> {esc.language}
                    </div>
                  </div>
                  
                  {esc.status === 'OPEN' && (
                    <button
                      onClick={() => handleResolve(esc.escalation_id, esc.phone_number)}
                      disabled={resolvingId === esc.escalation_id}
                      className="px-4 py-2 bg-black hover:bg-gray-800 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                    >
                      {resolvingId === esc.escalation_id ? 'Resolving...' : 'Resolve & Call Back'}
                    </button>
                  )}
                </div>

                <div className="bg-gray-50 rounded-lg p-4 text-gray-700 whitespace-pre-wrap border border-gray-100">
                  <span className="font-semibold text-gray-900 block mb-2">Summary:</span>
                  {esc.summary}
                </div>
                
                <div className="mt-4 text-sm text-gray-500 flex justify-between">
                  <span>Requested follow up: <span className="font-medium text-gray-700">{esc.follow_up_method}</span></span>
                  <span>Created: {new Date(esc.created_at).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
