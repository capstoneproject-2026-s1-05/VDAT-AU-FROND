/**
 * FivbLive: FIVB Live Data page
 *
 * Displays live/recent match scores, tournament standings, world rankings,
 * and player statistics from the FIVB Volleyball Information System.
 *
 * Data strategy:
 *   - Matches & Tournaments: Real FIVB VIS API data via backend proxy
 *   - Rankings & Player Stats: Demo data (clearly labeled)
 *   - Auto-refresh for match data every 30 seconds
 *   - Graceful disconnected state when backend is unavailable
 */
import { useState, useMemo, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts';
import {
  Globe, Wifi, WifiOff, Loader2, Trophy, Users,
  TrendingUp, TrendingDown, Minus, Medal,
  BarChart3, Shield, Clock, RefreshCw, AlertTriangle,
} from 'lucide-react';
import {
  useFivbData,
  useFivbMatches,
  useFivbTournaments,
  useFivbRankings,
  useFivbPlayerStats,
} from '@/hooks/useFivbData';
import { motion } from 'framer-motion';
import type { FivbMatch, FivbPlayer, FivbRankingEntry } from '@/lib/fivbApi';

// ── Tooltip style (matches VDAT dark theme) ────────────────
const tooltipStyle = {
  background: 'oklch(0.17 0.025 260)',
  border: '1px solid oklch(0.28 0.02 260)',
  borderRadius: '8px',
  fontSize: 12,
};

// ── Match result color helper ──────────────────────────────
function getMatchResultColor(match: FivbMatch, teamCode: string): string {
  if (match.status === 'upcoming') return 'text-muted-foreground';
  const isTeamA = match.teamA.code === teamCode;
  const teamSets = isTeamA ? match.teamA.setsWon : match.teamB.setsWon;
  const oppSets = isTeamA ? match.teamB.setsWon : match.teamA.setsWon;
  if (teamSets == null || oppSets == null) return 'text-muted-foreground';
  if (teamSets > oppSets) return 'text-emerald-400';
  if (teamSets < oppSets) return 'text-red-400';
  return 'text-yellow-400';
}

function getMatchResultLabel(match: FivbMatch, teamCode: string): string {
  if (match.status === 'upcoming') return 'Upcoming';
  const isTeamA = match.teamA.code === teamCode;
  const teamSets = isTeamA ? match.teamA.setsWon : match.teamB.setsWon;
  const oppSets = isTeamA ? match.teamB.setsWon : match.teamA.setsWon;
  if (teamSets == null || oppSets == null) return '—';
  if (teamSets > oppSets) return 'WIN';
  if (teamSets < oppSets) return 'LOSS';
  return 'DRAW';
}

// ── Trend icon helper ──────────────────────────────────────
function TrendIcon({ trend }: { trend: string }) {
  if (trend === 'up') return <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />;
  if (trend === 'down') return <TrendingDown className="w-3.5 h-3.5 text-red-400" />;
  return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
}

// ── Demo badge ─────────────────────────────────────────────
function DemoBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30">
      <AlertTriangle className="w-3 h-3" /> DEMO DATA
    </span>
  );
}

// ══════════════════════════════════════════════════════════════
// Main Component
// ══════════════════════════════════════════════════════════════
export default function FivbLive() {
  const { isLive, disconnected, loading: connectionLoading, error: connectionError } = useFivbData();

  const [selectedGender, setSelectedGender] = useState('M');
  const [selectedTeamCode, setSelectedTeamCode] = useState('AUS');

  // Data hooks
  const {
    matches, total: totalMatches, loading: matchesLoading,
    error: matchesError, lastRefresh, refetch: refetchMatches,
  } = useFivbMatches(isLive, selectedTeamCode, 20, 30000);

  const { tournaments, loading: tournamentsLoading } = useFivbTournaments(isLive, 6);

  const { rankings, australiaRank, isDemo: rankingsIsDemo, loading: rankingsLoading } =
    useFivbRankings(isLive, selectedGender);

  const { players, isDemo: playersIsDemo, loading: playersLoading } =
    useFivbPlayerStats(isLive, selectedGender);

  // Update document title
  useEffect(() => {
    document.title = 'FIVB Live Data — VDAT';
    return () => { document.title = 'VDAT'; };
  }, []);

  // ── Derived data ──────────────────────────────────────────

  // Match win/loss summary
  const matchSummary = useMemo(() => {
    const finished = matches.filter(m => m.status === 'finished');
    let wins = 0;
    let losses = 0;
    for (const m of finished) {
      const isTeamA = m.teamA.code === selectedTeamCode;
      const teamSets = isTeamA ? m.teamA.setsWon : m.teamB.setsWon;
      const oppSets = isTeamA ? m.teamB.setsWon : m.teamA.setsWon;
      if (teamSets != null && oppSets != null) {
        if (teamSets > oppSets) wins++;
        else if (teamSets < oppSets) losses++;
      }
    }
    return { wins, losses, total: finished.length };
  }, [matches, selectedTeamCode]);

  // Player stats for bar chart
  const playerChartData = useMemo(() => {
    return players.map((p: FivbPlayer) => ({
      name: p.name.split(' ').pop() || p.name,
      fullName: p.name,
      points: p.stats.pointsScored,
      aces: p.stats.serveAces,
      blocks: p.stats.blocks,
      digs: p.stats.digs,
      efficiency: Math.round(p.stats.attackEfficiency * 100),
    }));
  }, [players]);

  // Player radar data for selected player
  const [selectedPlayerIdx, setSelectedPlayerIdx] = useState(0);
  const selectedPlayer = players[selectedPlayerIdx] ?? null;

  const radarData = useMemo(() => {
    if (!selectedPlayer) return [];
    const s = selectedPlayer.stats;
    // Normalize values to 0-100 scale for radar
    const maxPoints = Math.max(...players.map((p: FivbPlayer) => p.stats.pointsScored), 1);
    const maxAces = Math.max(...players.map((p: FivbPlayer) => p.stats.serveAces), 1);
    const maxBlocks = Math.max(...players.map((p: FivbPlayer) => p.stats.blocks), 1);
    const maxDigs = Math.max(...players.map((p: FivbPlayer) => p.stats.digs), 1);
    return [
      { stat: 'Points', value: Math.round((s.pointsScored / maxPoints) * 100) },
      { stat: 'Efficiency', value: Math.round(s.attackEfficiency * 100) },
      { stat: 'Aces', value: Math.round((s.serveAces / maxAces) * 100) },
      { stat: 'Blocks', value: Math.round((s.blocks / maxBlocks) * 100) },
      { stat: 'Digs', value: Math.round((s.digs / maxDigs) * 100) },
    ];
  }, [selectedPlayer, players]);

  // Rankings top 10 for chart
  const rankingsTop10 = useMemo(() => {
    return rankings.filter((r: FivbRankingEntry) => r.rank <= 10).map((r: FivbRankingEntry) => ({
      team: r.code,
      fullName: r.team,
      points: r.points,
      rank: r.rank,
    }));
  }, [rankings]);

  // ══════════════════════════════════════════════════════════
  // Loading state
  // ══════════════════════════════════════════════════════════
  if (connectionLoading) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm">Connecting to FIVB VIS API...</p>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════
  // Disconnected state
  // ══════════════════════════════════════════════════════════
  if (disconnected) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-heading flex items-center gap-2">
            <Globe className="w-6 h-6 text-primary" />
            FIVB Live Data
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-destructive/15 text-destructive border border-destructive/30">
              <WifiOff className="w-3 h-3" /> DISCONNECTED
            </span>
          </h1>
        </div>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <WifiOff className="w-16 h-16 text-muted-foreground/30 mb-6" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Backend Not Connected</h2>
          <p className="text-sm text-muted-foreground max-w-md mb-4">
            Unable to reach the FIVB API backend. FIVB live data requires a connection to the backend server which proxies requests to the FIVB VIS API.
          </p>
          {connectionError && (
            <p className="text-xs text-destructive mb-4">{connectionError}</p>
          )}
          <div className="glass-card rounded-xl p-5 max-w-md text-left">
            <p className="text-xs font-semibold mb-2">To connect:</p>
            <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
              <li>Open a terminal in the backend directory</li>
              <li>Run <code className="px-1.5 py-0.5 rounded bg-secondary text-primary font-mono text-[11px]">cd VDAT-AU-BACKEND && npm start</code></li>
              <li>Ensure the server is running on <code className="px-1.5 py-0.5 rounded bg-secondary text-primary font-mono text-[11px]">http://localhost:4000</code></li>
              <li>Refresh this page</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════
  // Connected — Main render
  // ══════════════════════════════════════════════════════════
  return (
    <div className="p-6 lg:p-8 space-y-6">

      {/* ── Header ──────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading flex items-center gap-2">
            <Globe className="w-6 h-6 text-primary" />
            FIVB Live Data
            {isLive && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-teal/15 text-teal border border-teal/30">
                <Wifi className="w-3 h-3" /> LIVE
              </span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Match scores, tournament standings, world rankings, and player statistics from FIVB VIS
          </p>
        </div>
        <div className="flex gap-3 flex-wrap items-center">
          <Select value={selectedGender} onValueChange={setSelectedGender}>
            <SelectTrigger className="w-36 bg-secondary border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="M">Men&apos;s</SelectItem>
              <SelectItem value="W">Women&apos;s</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedTeamCode} onValueChange={setSelectedTeamCode}>
            <SelectTrigger className="w-36 bg-secondary border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="AUS">Australia</SelectItem>
              <SelectItem value="JPN">Japan</SelectItem>
              <SelectItem value="POL">Poland</SelectItem>
              <SelectItem value="BRA">Brazil</SelectItem>
              <SelectItem value="USA">USA</SelectItem>
              <SelectItem value="ITA">Italy</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Loading indicator ────────────────────────────── */}
      {(matchesLoading || tournamentsLoading || rankingsLoading || playersLoading) && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-3 h-3 animate-spin" />
          Loading FIVB data...
        </div>
      )}

      {/* ── Summary Cards ────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          {
            label: 'Total Matches',
            value: String(totalMatches),
            unit: 'all time',
            icon: Trophy,
            color: 'text-primary',
          },
          {
            label: 'Recent Wins',
            value: String(matchSummary.wins),
            unit: `of ${matchSummary.total}`,
            icon: Medal,
            color: 'text-emerald-400',
          },
          {
            label: 'Recent Losses',
            value: String(matchSummary.losses),
            unit: `of ${matchSummary.total}`,
            icon: Shield,
            color: 'text-red-400',
          },
          {
            label: `${selectedGender === 'M' ? "Men's" : "Women's"} Rank`,
            value: australiaRank ? `#${australiaRank.rank}` : '—',
            unit: 'world',
            icon: BarChart3,
            color: 'text-primary',
          },
          {
            label: 'Ranking Points',
            value: australiaRank ? String(australiaRank.points) : '—',
            unit: 'pts',
            icon: TrendingUp,
            color: 'text-teal',
          },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            className="glass-card rounded-xl p-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <stat.icon className={`w-5 h-5 ${stat.color} mb-2`} />
            <p className="stat-number text-2xl text-foreground">
              {stat.value}
              <span className="text-xs text-muted-foreground ml-1">{stat.unit}</span>
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════ */}
      {/* Section A: Recent Match Scores                    */}
      {/* ══════════════════════════════════════════════════ */}
      <motion.div
        className="glass-card rounded-xl p-5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Trophy className="w-4 h-4 text-primary" />
            Recent Match Scores
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-teal/15 text-teal border border-teal/30">
              <Wifi className="w-3 h-3" /> LIVE
            </span>
          </h2>
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            {lastRefresh && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {lastRefresh.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={() => { refetchMatches(); }}
              className="flex items-center gap-1 hover:text-primary transition-colors"
            >
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
          </div>
        </div>

        {matchesError && (
          <p className="text-xs text-destructive mb-3">{matchesError}</p>
        )}

        {matches.length === 0 && !matchesLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            <Trophy className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No matches found for {selectedTeamCode}</p>
            <p className="text-xs mt-1">Try selecting a different team</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
            {matches.map((match) => (
              <div
                key={match.no}
                className="flex items-center gap-4 p-3 rounded-lg bg-secondary/50 hover:bg-secondary/80 transition-colors"
              >
                {/* Date */}
                <div className="w-20 text-[10px] text-muted-foreground shrink-0">
                  {match.date || 'TBD'}
                  {match.city && (
                    <div className="text-[9px] opacity-70">{match.city}</div>
                  )}
                </div>

                {/* Team A */}
                <div className={`flex-1 text-right text-sm ${match.teamA.code === selectedTeamCode ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                  <span className="text-[10px] text-muted-foreground mr-1">{match.teamA.code}</span>
                  {match.teamA.name}
                </div>

                {/* Score */}
                <div className="w-24 text-center shrink-0">
                  <div className="text-lg font-bold font-mono">
                    <span className={match.teamA.code === selectedTeamCode ? getMatchResultColor(match, selectedTeamCode) : 'text-muted-foreground'}>
                      {match.teamA.setsWon ?? '-'}
                    </span>
                    <span className="text-muted-foreground mx-1">:</span>
                    <span className={match.teamB.code === selectedTeamCode ? getMatchResultColor(match, selectedTeamCode) : 'text-muted-foreground'}>
                      {match.teamB.setsWon ?? '-'}
                    </span>
                  </div>
                  {match.sets.length > 0 && (
                    <div className="text-[9px] text-muted-foreground">
                      ({match.sets.map(s => `${s.teamA}-${s.teamB}`).join(', ')})
                    </div>
                  )}
                </div>

                {/* Team B */}
                <div className={`flex-1 text-left text-sm ${match.teamB.code === selectedTeamCode ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                  {match.teamB.name}
                  <span className="text-[10px] text-muted-foreground ml-1">{match.teamB.code}</span>
                </div>

                {/* Result badge */}
                <div className={`w-12 text-center text-[10px] font-semibold ${getMatchResultColor(match, selectedTeamCode)}`}>
                  {getMatchResultLabel(match, selectedTeamCode)}
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* ══════════════════════════════════════════════════ */}
      {/* Two-column layout: Rankings + Player Stats        */}
      {/* ══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Section D: World Rankings */}
        <motion.div
          className="glass-card rounded-xl p-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            FIVB World Rankings ({selectedGender === 'M' ? "Men's" : "Women's"})
            {rankingsIsDemo && <DemoBadge />}
          </h2>

          {/* Rankings bar chart */}
          {rankingsTop10.length > 0 && (
            <div className="h-48 mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rankingsTop10} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.02 260)" />
                  <XAxis type="number" tick={{ fill: 'oklch(0.6 0.02 260)', fontSize: 10 }} />
                  <YAxis dataKey="team" type="category" width={40} tick={{ fill: 'oklch(0.6 0.02 260)', fontSize: 10 }} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${value} pts`, 'Points']} />
                  <Bar dataKey="points" fill="oklch(0.7 0.15 200)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Rankings table */}
          <div className="max-h-[320px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left py-2 px-2 w-10">#</th>
                  <th className="text-left py-2 px-2">Team</th>
                  <th className="text-right py-2 px-2">Points</th>
                  <th className="text-center py-2 px-2 w-10">Trend</th>
                </tr>
              </thead>
              <tbody>
                {rankings.map((r: FivbRankingEntry) => (
                  <tr
                    key={r.rank}
                    className={`border-b border-border/50 ${r.code === 'AUS' ? 'bg-primary/10 font-semibold' : ''}`}
                  >
                    <td className="py-1.5 px-2 text-muted-foreground">{r.rank}</td>
                    <td className="py-1.5 px-2">
                      <span className="text-[10px] text-muted-foreground mr-1">{r.code}</span>
                      {r.team}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono">{r.points}</td>
                    <td className="py-1.5 px-2 text-center"><TrendIcon trend={r.trend} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {rankings.length === 0 && !rankingsLoading && (
            <div className="text-center py-8 text-muted-foreground">
              <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No ranking data available</p>
            </div>
          )}
        </motion.div>

        {/* Section C: Player Statistics */}
        <motion.div
          className="glass-card rounded-xl p-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Player Statistics ({selectedGender === 'M' ? "Men's" : "Women's"} — Australia)
            {playersIsDemo && <DemoBadge />}
          </h2>

          {players.length > 0 ? (
            <>
              {/* Player selector */}
              <div className="mb-4">
                <Select
                  value={String(selectedPlayerIdx)}
                  onValueChange={(v) => setSelectedPlayerIdx(parseInt(v, 10))}
                >
                  <SelectTrigger className="w-full bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {players.map((p: FivbPlayer, i: number) => (
                      <SelectItem key={i} value={String(i)}>
                        #{p.number} {p.name} — {p.position}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Radar chart */}
              {radarData.length > 0 && (
                <div className="h-52 mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="oklch(0.28 0.02 260)" />
                      <PolarAngleAxis dataKey="stat" tick={{ fill: 'oklch(0.6 0.02 260)', fontSize: 10 }} />
                      <PolarRadiusAxis tick={{ fill: 'oklch(0.4 0.02 260)', fontSize: 8 }} domain={[0, 100]} />
                      <Radar
                        name={selectedPlayer?.name || ''}
                        dataKey="value"
                        stroke="oklch(0.7 0.15 200)"
                        fill="oklch(0.7 0.15 200)"
                        fillOpacity={0.3}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Player stats table */}
              <div className="max-h-[260px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left py-2 px-2">#</th>
                      <th className="text-left py-2 px-2">Player</th>
                      <th className="text-left py-2 px-2">Pos</th>
                      <th className="text-right py-2 px-2">Pts</th>
                      <th className="text-right py-2 px-2">Eff%</th>
                      <th className="text-right py-2 px-2">Aces</th>
                      <th className="text-right py-2 px-2">Blk</th>
                      <th className="text-right py-2 px-2">Digs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {players.map((p: FivbPlayer, i: number) => (
                      <tr
                        key={i}
                        className={`border-b border-border/50 cursor-pointer transition-colors ${i === selectedPlayerIdx ? 'bg-primary/10' : 'hover:bg-secondary/50'}`}
                        onClick={() => setSelectedPlayerIdx(i)}
                      >
                        <td className="py-1.5 px-2 text-muted-foreground">{p.number}</td>
                        <td className="py-1.5 px-2 font-medium">{p.name}</td>
                        <td className="py-1.5 px-2 text-muted-foreground text-[10px]">{p.position}</td>
                        <td className="py-1.5 px-2 text-right font-mono">{p.stats.pointsScored}</td>
                        <td className="py-1.5 px-2 text-right font-mono">{(p.stats.attackEfficiency * 100).toFixed(0)}%</td>
                        <td className="py-1.5 px-2 text-right font-mono">{p.stats.serveAces}</td>
                        <td className="py-1.5 px-2 text-right font-mono">{p.stats.blocks}</td>
                        <td className="py-1.5 px-2 text-right font-mono">{p.stats.digs}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            !playersLoading && (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No player statistics available</p>
              </div>
            )
          )}
        </motion.div>
      </div>

      {/* ══════════════════════════════════════════════════ */}
      {/* Section: Player Performance Comparison Chart      */}
      {/* ══════════════════════════════════════════════════ */}
      {playerChartData.length > 0 && (
        <motion.div
          className="glass-card rounded-xl p-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            Player Performance Comparison
            {playersIsDemo && <DemoBadge />}
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={playerChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.02 260)" />
                <XAxis dataKey="name" tick={{ fill: 'oklch(0.6 0.02 260)', fontSize: 10 }} />
                <YAxis tick={{ fill: 'oklch(0.6 0.02 260)', fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="points" name="Points" fill="oklch(0.7 0.15 200)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="aces" name="Aces" fill="oklch(0.82 0.14 85)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="blocks" name="Blocks" fill="oklch(0.7 0.18 150)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="digs" name="Digs" fill="oklch(0.75 0.12 30)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* ══════════════════════════════════════════════════ */}
      {/* Section B: Tournament Overview                    */}
      {/* ══════════════════════════════════════════════════ */}
      <motion.div
        className="glass-card rounded-xl p-5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-primary" />
          Tournament Overview
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-teal/15 text-teal border border-teal/30">
            <Wifi className="w-3 h-3" /> LIVE
          </span>
        </h2>

        {tournaments.length === 0 && !tournamentsLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            <Trophy className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No tournament data available</p>
            <p className="text-xs mt-1">Tournament data is loaded from the FIVB VIS API</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tournaments.map((t) => (
              <div key={t.no} className="rounded-lg bg-secondary/50 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-foreground truncate flex-1 mr-2" title={t.name}>
                    {t.name}
                  </h3>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary shrink-0">
                    {t.gender}
                  </span>
                </div>

                {t.pools.length > 0 ? (
                  <div className="space-y-2">
                    {t.pools.slice(0, 2).map((pool) => (
                      <div key={pool.no}>
                        <p className="text-[10px] text-muted-foreground mb-1">{pool.name}</p>
                        {pool.rankings.length > 0 ? (
                          <div className="space-y-0.5">
                            {pool.rankings.map((r) => (
                              <div
                                key={r.rank}
                                className={`flex items-center justify-between text-[10px] px-1.5 py-0.5 rounded ${r.teamCode === 'AUS' ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground'}`}
                              >
                                <span>{r.rank}. {r.teamName}</span>
                                <span className="font-mono">{r.matchWon}W-{r.matchLost}L</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[10px] text-muted-foreground/50">No standings yet</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground/50">No pool data available</p>
                )}
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* ── Footer info ─────────────────────────────────── */}
      <div className="text-[10px] text-muted-foreground/50 text-center pt-2">
        Data sourced from FIVB Volleyball Information System (VIS). Match and tournament data is live from the FIVB VIS API.
        Rankings and player statistics are demo data — real-time data requires FIVB partner API credentials.
        Match data auto-refreshes every 30 seconds.
      </div>
    </div>
  );
}
