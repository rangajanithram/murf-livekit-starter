'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';

interface AnalyticsDashboardProps {
  onBack: () => void;
}

export function AnalyticsDashboard({ onBack }: AnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [channelFilter, setChannelFilter] = useState<string>('all');

  const fetchAnalytics = async () => {
    try {
      const res = await fetch('/api/analytics');
      const data = await res.json();
      if (Array.isArray(data)) {
        setAnalytics(data);
      } else {
        setAnalytics([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="p-10 text-[#002045] font-mono font-bold animate-pulse">Loading Analytics...</div>;
  }

  // Apply filter
  const filteredAnalytics = channelFilter === 'all' 
    ? analytics 
    : analytics.filter(a => a.channel.toLowerCase() === channelFilter.toLowerCase());

  const totalCalls = filteredAnalytics.length;
  const successfulCalls = filteredAnalytics.filter(a => a.success).length;
  const failedCalls = filteredAnalytics.filter(a => !a.success).length;
  const successRate = totalCalls > 0 ? Math.round((successfulCalls / totalCalls) * 100) : 0;

  // Group failures
  const failureReasons = filteredAnalytics.filter(a => !a.success).reduce((acc, curr) => {
    const reason = curr.failure_reason || 'Unknown Error';
    acc[reason] = (acc[reason] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="w-full max-w-6xl h-[80vh] overflow-y-auto p-8 rounded-xl border-2 sketchy-box bg-white/80 backdrop-blur-sm shadow-xl text-left font-sans"
    >
      <div className="flex justify-between items-center mb-8 pb-4 border-b-2 sketchy-border border-[#002045]/20">
        <h1 className="text-3xl font-black text-[#002045]">Call Analytics Dashboard</h1>
        <div className="flex items-center gap-4">
          <select 
            value={channelFilter} 
            onChange={(e) => setChannelFilter(e.target.value)}
            className="px-4 py-2 font-mono text-sm font-bold border-2 sketchy-box bg-white text-[#002045] border-[#002045] focus:outline-none"
          >
            <option value="all">All Channels</option>
            <option value="browser">Browser Only</option>
            <option value="sip">SIP Only</option>
          </select>
          <button 
            onClick={onBack}
            className="px-4 py-2 font-mono text-sm font-bold border-2 sketchy-box transition-all bg-white text-[#002045] border-[#002045] hover:bg-[#002045] hover:text-white"
          >
            Go Back
          </button>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="border-2 sketchy-box p-6 bg-white/50">
          <h3 className="text-[#002045]/60 font-mono text-sm font-bold uppercase tracking-wider mb-2">Total Calls</h3>
          <p className="text-4xl font-black text-[#002045]">{totalCalls}</p>
        </div>
        <div className="border-2 sketchy-box p-6 bg-green-50/50 border-green-600">
          <h3 className="text-green-600/80 font-mono text-sm font-bold uppercase tracking-wider mb-2">Successful</h3>
          <p className="text-4xl font-black text-green-700">{successfulCalls}</p>
        </div>
        <div className="border-2 sketchy-box p-6 bg-red-50/50 border-red-600">
          <h3 className="text-red-600/80 font-mono text-sm font-bold uppercase tracking-wider mb-2">Failed</h3>
          <p className="text-4xl font-black text-red-700">{failedCalls}</p>
        </div>
        <div className="border-2 sketchy-box p-6 bg-blue-50/50 border-blue-600">
          <h3 className="text-blue-600/80 font-mono text-sm font-bold uppercase tracking-wider mb-2">Success Rate</h3>
          <p className="text-4xl font-black text-blue-700">{successRate}%</p>
        </div>
      </div>

      {/* Failure Breakdown */}
      {failedCalls > 0 && (
        <div className="border-2 sketchy-box p-6 bg-white/50 mb-8">
          <h3 className="text-lg font-bold text-[#002045] mb-4">Failure Reasons</h3>
          <div className="flex gap-4 flex-wrap">
            {Object.entries(failureReasons).map(([reason, count]) => (
              <div key={reason} className="bg-red-50 text-red-800 px-4 py-2 border-2 sketchy-border border-red-200 flex items-center gap-2">
                <span className="font-semibold">{reason}:</span>
                <span className="font-mono font-bold text-lg">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline Chart */}
      <div className="border-2 sketchy-box p-6 bg-white/50 mb-8">
        <h3 className="text-lg font-bold text-[#002045] mb-4">Results Over Time</h3>
        <div className="flex items-end gap-1 h-32 overflow-hidden border-b-2 sketchy-border border-[#002045]/20 pb-2">
          {(() => {
            const maxDuration = Math.max(...filteredAnalytics.map(c => c.duration || 1));
            return filteredAnalytics.slice().reverse().map((call, i) => (
              <div 
                key={i} 
                className={`w-6 flex-shrink-0 sketchy-box transition-all hover:opacity-80 ${call.success ? 'bg-green-500 border-green-700' : 'bg-red-500 border-red-700'}`}
                style={{ height: `${Math.max(5, (call.duration / maxDuration) * 100)}%` }}
                title={`${call.success ? 'Success' : 'Failure'} (${call.duration}s)`}
              />
            ));
          })()}
          {filteredAnalytics.length === 0 && (
            <div className="w-full text-center text-[#002045]/50 font-mono text-sm pt-10">No data to chart</div>
          )}
        </div>
        <div className="text-xs font-mono text-[#002045]/60 mt-2 flex justify-between">
          <span>Older</span>
          <span>Newer →</span>
        </div>
      </div>

      {/* Call History Table */}
      <div className="border-2 sketchy-box bg-white/50 overflow-hidden">
        <div className="px-6 py-4 border-b-2 sketchy-border border-gray-200 bg-gray-50/50">
          <h3 className="text-lg font-bold text-[#002045]">Recent Calls History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[#002045]/70 font-mono text-xs uppercase tracking-wider border-b-2 sketchy-border border-gray-200">
                <th className="px-6 py-4 font-bold">Time</th>
                <th className="px-6 py-4 font-bold">Call ID</th>
                <th className="px-6 py-4 font-bold">User ID</th>
                <th className="px-6 py-4 font-bold">Channel</th>
                <th className="px-6 py-4 font-bold">Duration (s)</th>
                <th className="px-6 py-4 font-bold">Outcome</th>
                <th className="px-6 py-4 font-bold">Avg Latency (s)</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-gray-200/50">
              {filteredAnalytics.map((call) => (
                <tr key={call.call_id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 text-sm text-[#002045]/80 whitespace-nowrap">
                    {new Date(call.created_at + 'Z').toLocaleString()}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-[#002045]/60">{call.call_id.substring(0, 15)}...</td>
                  <td className="px-6 py-4 text-sm font-bold text-[#002045]">{call.user_id}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 border-2 sketchy-border text-[#002045]/70 text-xs font-bold uppercase">{call.channel}</span>
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-[#002045]">{call.duration}s</td>
                  <td className="px-6 py-4">
                    {call.success ? (
                      <span className="px-2 py-1 border-2 sketchy-border bg-green-50 text-green-700 text-xs font-bold uppercase">Success</span>
                    ) : (
                      <div className="flex flex-col">
                        <span className="px-2 py-1 border-2 sketchy-border bg-red-50 text-red-700 text-xs font-bold uppercase self-start mb-1">Failed</span>
                        <span className="text-xs text-[#002045]/60">{call.failure_reason}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-[#002045]">{call.latency ? call.latency.toFixed(2) : '-'}</td>
                </tr>
              ))}
              {filteredAnalytics.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-[#002045]/60 font-mono">
                    No calls recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
