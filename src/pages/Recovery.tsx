/**
 * Recovery & Wellness Page
 *
 * Displays WHOOP physiological data for athlete recovery monitoring.
 * Features:
 *   - "Connect WHOOP" OAuth flow for athlete authorization
 *   - Recovery Score trend chart
 *   - HRV (Heart Rate Variability) trend chart
 *   - Sleep breakdown (REM, Deep, Light, Awake)
 *   - Strain & Heart Rate chart
 *   - Summary cards (latest recovery, HRV, resting HR, strain, sleep, SpO2)
 *   - Daily data table
 *   - Auto-refresh every 60 seconds
 */

import { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, AreaChart, Area,
  ReferenceLine, Cell,
} from 'recharts';
import {
  useWhoopConnection,
  useWhoopOverview,
  transformOverviewToDaily,
  type TransformedRecoveryDay,
} from '../hooks/useWhoopData';
import { getConnectUrl, disconnectWhoopUser } from '../lib/whoopApi';

// ============================================================
// Helper Components
// ============================================================

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-[#1a2332] rounded-xl p-4 h-24" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-[#1a2332] rounded-xl p-6 h-72" />
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ type }: { type: 'live' | 'whoop' | 'disconnected' }) {
  const styles = {
    live: 'bg-green-500/20 text-green-400 border-green-500/30',
    whoop: 'bg-[#44d62c]/20 text-[#44d62c] border-[#44d62c]/30',
    disconnected: 'bg-red-500/20 text-red-400 border-red-500/30',
  };
  const labels = { live: 'LIVE', whoop: 'WHOOP', disconnected: 'DISCONNECTED' };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${styles[type]}`}>
      {labels[type]}
    </span>
  );
}

function SummaryCard({
  label, value, unit, subtitle, color,
}: {
  label: string; value: string | number; unit?: string; subtitle?: string; color?: string;
}) {
  return (
    <div className="bg-[#1a2332] rounded-xl border border-[#2a3a4a] p-4">
      <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">{label}</div>
      <div className="flex items-baseline gap-1">
        <span className={`text-2xl font-bold ${color || 'text-white'}`}>{value}</span>
        {unit && <span className="text-sm text-gray-400">{unit}</span>}
      </div>
      {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
    </div>
  );
}

function getRecoveryColor(score: number): string {
  if (score >= 67) return '#44d62c'; // Green
  if (score >= 34) return '#ffcc00'; // Yellow
  return '#ff4444'; // Red
}

function getRecoveryLabel(score: number): string {
  if (score >= 67) return 'Green';
  if (score >= 34) return 'Yellow';
  return 'Red';
}

// ============================================================
// Connect WHOOP Section (shown when no user is connected)
// ============================================================

function ConnectWhoopSection({ backendAvailable }: { backendAvailable: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="bg-[#1a2332] rounded-2xl border border-[#2a3a4a] p-10 max-w-lg text-center">
        {/* WHOOP Logo */}
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#44d62c]/10 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-10 h-10 text-[#44d62c]" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-white mb-3">Connect WHOOP</h2>
        <p className="text-gray-400 mb-6 leading-relaxed">
          Connect your WHOOP device to view real-time recovery, sleep, strain, and HRV data.
          Each athlete authorizes individually via WHOOP's secure OAuth 2.0 flow.
        </p>

        <div className="space-y-3 text-sm text-gray-500 mb-8">
          <div className="flex items-center gap-2 justify-center">
            <span className="w-2 h-2 rounded-full bg-[#44d62c]" />
            Recovery Score &amp; HRV
          </div>
          <div className="flex items-center gap-2 justify-center">
            <span className="w-2 h-2 rounded-full bg-[#44d62c]" />
            Sleep Performance &amp; Stages
          </div>
          <div className="flex items-center gap-2 justify-center">
            <span className="w-2 h-2 rounded-full bg-[#44d62c]" />
            Day Strain &amp; Heart Rate
          </div>
          <div className="flex items-center gap-2 justify-center">
            <span className="w-2 h-2 rounded-full bg-[#44d62c]" />
            SpO2 &amp; Skin Temperature
          </div>
        </div>

        {backendAvailable ? (
          <a
            href={getConnectUrl()}
            className="inline-flex items-center gap-2 bg-[#44d62c] hover:bg-[#3bc025] text-black font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
            </svg>
            Connect WHOOP Account
          </a>
        ) : (
          <div className="text-red-400 text-sm">
            Backend server is not reachable. Please ensure the backend is running on port 4000.
          </div>
        )}

        <p className="text-xs text-gray-600 mt-4">
          You will be redirected to WHOOP's secure login page to authorize access.
        </p>
      </div>
    </div>
  );
}

// ============================================================
// Dashboard Charts
// ============================================================

function RecoveryTrendChart({ days }: { days: TransformedRecoveryDay[] }) {
  const chartData = [...days].reverse().map(d => ({
    date: d.date.slice(5), // MM-DD
    recovery: d.recoveryScore,
    fill: getRecoveryColor(d.recoveryScore),
  }));

  return (
    <div className="bg-[#1a2332] rounded-xl border border-[#2a3a4a] p-6">
      <div className="flex items-center gap-3 mb-4">
        <h3 className="text-lg font-semibold text-white">Recovery Score Trend</h3>
        <StatusBadge type="whoop" />
      </div>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a3a4a" />
          <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 11 }} />
          <YAxis domain={[0, 100]} tick={{ fill: '#9ca3af', fontSize: 11 }} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1a2332', border: '1px solid #2a3a4a', borderRadius: 8 }}
            labelStyle={{ color: '#9ca3af' }}
          />
          <ReferenceLine y={67} stroke="#44d62c" strokeDasharray="3 3" strokeOpacity={0.5} />
          <ReferenceLine y={34} stroke="#ffcc00" strokeDasharray="3 3" strokeOpacity={0.5} />
          <Bar dataKey="recovery" name="Recovery %" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, idx) => (
              <Cell key={idx} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function HrvTrendChart({ days }: { days: TransformedRecoveryDay[] }) {
  const chartData = [...days].reverse().map(d => ({
    date: d.date.slice(5),
    hrv: d.hrv,
    restingHR: d.restingHR,
  }));

  return (
    <div className="bg-[#1a2332] rounded-xl border border-[#2a3a4a] p-6">
      <div className="flex items-center gap-3 mb-4">
        <h3 className="text-lg font-semibold text-white">HRV &amp; Resting Heart Rate</h3>
        <StatusBadge type="whoop" />
      </div>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a3a4a" />
          <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 11 }} />
          <YAxis yAxisId="hrv" tick={{ fill: '#9ca3af', fontSize: 11 }} />
          <YAxis yAxisId="hr" orientation="right" tick={{ fill: '#9ca3af', fontSize: 11 }} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1a2332', border: '1px solid #2a3a4a', borderRadius: 8 }}
            labelStyle={{ color: '#9ca3af' }}
          />
          <Legend />
          <Line yAxisId="hrv" type="monotone" dataKey="hrv" name="HRV (ms)" stroke="#06b6d4" strokeWidth={2} dot={{ r: 3 }} />
          <Line yAxisId="hr" type="monotone" dataKey="restingHR" name="Resting HR (bpm)" stroke="#f43f5e" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function SleepBreakdownChart({ days }: { days: TransformedRecoveryDay[] }) {
  const chartData = [...days].reverse().map(d => ({
    date: d.date.slice(5),
    rem: d.remSleepHours,
    deep: d.deepSleepHours,
    light: d.lightSleepHours,
    awake: d.awakeHours,
  }));

  return (
    <div className="bg-[#1a2332] rounded-xl border border-[#2a3a4a] p-6">
      <div className="flex items-center gap-3 mb-4">
        <h3 className="text-lg font-semibold text-white">Sleep Breakdown</h3>
        <StatusBadge type="whoop" />
      </div>
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a3a4a" />
          <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 11 }} />
          <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} label={{ value: 'Hours', angle: -90, position: 'insideLeft', fill: '#9ca3af', fontSize: 11 }} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1a2332', border: '1px solid #2a3a4a', borderRadius: 8 }}
            labelStyle={{ color: '#9ca3af' }}
            formatter={(value: number) => `${value.toFixed(1)}h`}
          />
          <Legend />
          <Area type="monotone" dataKey="deep" name="Deep Sleep" stackId="1" fill="#6366f1" stroke="#6366f1" fillOpacity={0.8} />
          <Area type="monotone" dataKey="rem" name="REM Sleep" stackId="1" fill="#8b5cf6" stroke="#8b5cf6" fillOpacity={0.8} />
          <Area type="monotone" dataKey="light" name="Light Sleep" stackId="1" fill="#a78bfa" stroke="#a78bfa" fillOpacity={0.6} />
          <Area type="monotone" dataKey="awake" name="Awake" stackId="1" fill="#ef4444" stroke="#ef4444" fillOpacity={0.5} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function StrainChart({ days }: { days: TransformedRecoveryDay[] }) {
  const chartData = [...days].reverse().map(d => ({
    date: d.date.slice(5),
    strain: d.strain,
    avgHR: d.avgHR,
    maxHR: d.maxHR,
  }));

  return (
    <div className="bg-[#1a2332] rounded-xl border border-[#2a3a4a] p-6">
      <div className="flex items-center gap-3 mb-4">
        <h3 className="text-lg font-semibold text-white">Day Strain &amp; Heart Rate</h3>
        <StatusBadge type="whoop" />
      </div>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a3a4a" />
          <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 11 }} />
          <YAxis yAxisId="strain" domain={[0, 21]} tick={{ fill: '#9ca3af', fontSize: 11 }} />
          <YAxis yAxisId="hr" orientation="right" tick={{ fill: '#9ca3af', fontSize: 11 }} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1a2332', border: '1px solid #2a3a4a', borderRadius: 8 }}
            labelStyle={{ color: '#9ca3af' }}
          />
          <Legend />
          <Line yAxisId="strain" type="monotone" dataKey="strain" name="Strain (0-21)" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
          <Line yAxisId="hr" type="monotone" dataKey="avgHR" name="Avg HR (bpm)" stroke="#06b6d4" strokeWidth={1.5} dot={false} strokeDasharray="5 5" />
          <Line yAxisId="hr" type="monotone" dataKey="maxHR" name="Max HR (bpm)" stroke="#ef4444" strokeWidth={1.5} dot={false} strokeDasharray="5 5" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============================================================
// Daily Data Table
// ============================================================

function DailyDataTable({ days }: { days: TransformedRecoveryDay[] }) {
  return (
    <div className="bg-[#1a2332] rounded-xl border border-[#2a3a4a] p-6">
      <div className="flex items-center gap-3 mb-4">
        <h3 className="text-lg font-semibold text-white">Daily Recovery Data</h3>
        <StatusBadge type="whoop" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2a3a4a] text-gray-400 text-xs uppercase">
              <th className="text-left py-2 px-3">Date</th>
              <th className="text-center py-2 px-3">Recovery</th>
              <th className="text-center py-2 px-3">HRV</th>
              <th className="text-center py-2 px-3">RHR</th>
              <th className="text-center py-2 px-3">Strain</th>
              <th className="text-center py-2 px-3">Sleep</th>
              <th className="text-center py-2 px-3">Sleep Perf</th>
              <th className="text-center py-2 px-3">SpO2</th>
              <th className="text-center py-2 px-3">Resp Rate</th>
            </tr>
          </thead>
          <tbody>
            {days.map((d, i) => (
              <tr key={i} className="border-b border-[#2a3a4a]/50 hover:bg-[#2a3a4a]/30">
                <td className="py-2 px-3 text-gray-300 font-mono text-xs">{d.date}</td>
                <td className="py-2 px-3 text-center">
                  <span
                    className="inline-block px-2 py-0.5 rounded-full text-xs font-bold"
                    style={{
                      backgroundColor: `${getRecoveryColor(d.recoveryScore)}20`,
                      color: getRecoveryColor(d.recoveryScore),
                    }}
                  >
                    {d.recoveryScore}%
                  </span>
                </td>
                <td className="py-2 px-3 text-center text-cyan-400 font-mono">{d.hrv.toFixed(1)}</td>
                <td className="py-2 px-3 text-center text-rose-400 font-mono">{d.restingHR}</td>
                <td className="py-2 px-3 text-center text-amber-400 font-mono">{d.strain.toFixed(1)}</td>
                <td className="py-2 px-3 text-center text-purple-400 font-mono">{d.sleepHours.toFixed(1)}h</td>
                <td className="py-2 px-3 text-center text-indigo-400 font-mono">{d.sleepPerformance}%</td>
                <td className="py-2 px-3 text-center text-gray-300 font-mono">{d.spo2 ? `${d.spo2.toFixed(1)}%` : '—'}</td>
                <td className="py-2 px-3 text-center text-gray-300 font-mono">{d.respiratoryRate ? `${d.respiratoryRate}` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// Main Recovery Page
// ============================================================

export default function Recovery() {
  const connection = useWhoopConnection();
  const overview = useWhoopOverview(undefined, 60000);
  const [showTable, setShowTable] = useState(false);

  // Check URL params for OAuth callback results
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('whoop_connected') === 'true') {
      // Refresh data after successful connection
      connection.refresh();
      overview.refresh();
      // Clean URL
      window.history.replaceState({}, '', '/recovery');
    }
    if (params.get('whoop_error')) {
      // Error is shown via the connection state
      window.history.replaceState({}, '', '/recovery');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const days = useMemo(() => {
    if (!overview.data) return [];
    return transformOverviewToDaily(overview.data);
  }, [overview.data]);

  const latest = days.length > 0 ? days[0] : null;

  // Determine page state
  const isConnected = overview.connected && overview.data !== null;
  const isLoading = connection.loading || overview.loading;

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-white">Recovery &amp; Wellness</h1>
            {isConnected ? <StatusBadge type="live" /> : <StatusBadge type="disconnected" />}
          </div>
          <p className="text-gray-400 mt-1">
            {isConnected
              ? `Physiological recovery data from WHOOP — ${overview.data?.profile.first_name} ${overview.data?.profile.last_name}`
              : 'Monitor athlete recovery, sleep, strain, and HRV via WHOOP'}
          </p>
        </div>

        {isConnected && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">
              {overview.lastUpdated && `Updated ${overview.lastUpdated.toLocaleTimeString()}`}
            </span>
            <button
              onClick={overview.refresh}
              className="px-3 py-1.5 text-sm bg-[#1a2332] border border-[#2a3a4a] rounded-lg text-gray-300 hover:bg-[#2a3a4a] transition-colors"
            >
              Refresh
            </button>
            <button
              onClick={() => setShowTable(!showTable)}
              className="px-3 py-1.5 text-sm bg-[#1a2332] border border-[#2a3a4a] rounded-lg text-gray-300 hover:bg-[#2a3a4a] transition-colors"
            >
              {showTable ? 'Hide Table' : 'Show Table'}
            </button>
            <button
              onClick={async () => {
                const userId = connection.status?.users[0]?.userId;
                if (userId) {
                  await disconnectWhoopUser(userId);
                  connection.refresh();
                  overview.refresh();
                }
              }}
              className="px-3 py-1.5 text-sm bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors"
            >
              Disconnect
            </button>
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading && !isConnected && <LoadingSkeleton />}

      {/* Not Connected State */}
      {!isLoading && !isConnected && (
        <ConnectWhoopSection backendAvailable={connection.available} />
      )}

      {/* Connected Dashboard */}
      {isConnected && latest && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            <SummaryCard
              label="Recovery"
              value={`${latest.recoveryScore}%`}
              subtitle={getRecoveryLabel(latest.recoveryScore)}
              color={`text-[${getRecoveryColor(latest.recoveryScore)}]`}
            />
            <SummaryCard
              label="HRV"
              value={latest.hrv.toFixed(1)}
              unit="ms"
              subtitle="RMSSD"
              color="text-cyan-400"
            />
            <SummaryCard
              label="Resting HR"
              value={latest.restingHR}
              unit="bpm"
              color="text-rose-400"
            />
            <SummaryCard
              label="Day Strain"
              value={latest.strain.toFixed(1)}
              unit="/ 21"
              color="text-amber-400"
            />
            <SummaryCard
              label="Sleep"
              value={latest.sleepHours.toFixed(1)}
              unit="hours"
              subtitle={`${latest.sleepPerformance}% performance`}
              color="text-purple-400"
            />
            <SummaryCard
              label="SpO2"
              value={latest.spo2 ? latest.spo2.toFixed(1) : '—'}
              unit="%"
              subtitle={latest.skinTemp ? `${latest.skinTemp.toFixed(1)}°C skin` : undefined}
              color="text-gray-300"
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <RecoveryTrendChart days={days} />
            <HrvTrendChart days={days} />
            <SleepBreakdownChart days={days} />
            <StrainChart days={days} />
          </div>

          {/* Daily Data Table (toggleable) */}
          {showTable && <DailyDataTable days={days} />}

          {/* Footer */}
          <div className="mt-6 text-center text-xs text-gray-600 border-t border-[#2a3a4a] pt-4">
            Data sourced from WHOOP via OAuth 2.0 Developer API.
            Recovery, sleep, and strain data auto-refreshes every 60 seconds.
            {overview.data?.profile && (
              <span className="ml-2">
                Connected as {overview.data.profile.first_name} {overview.data.profile.last_name} ({overview.data.profile.email})
              </span>
            )}
          </div>
        </>
      )}

      {/* Connected but no data yet */}
      {isConnected && !latest && !isLoading && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg mb-2">Connected to WHOOP, but no scored data available yet.</p>
          <p className="text-sm">Recovery data will appear after your first scored physiological cycle.</p>
        </div>
      )}
    </div>
  );
}
