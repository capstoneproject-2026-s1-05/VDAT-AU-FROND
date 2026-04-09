/**
 * StrengthPower: Jump profiling from Catapult IMA + GymAware strength data
 *
 * Data strategy:
 *   - Catapult OpenField API provides: IMA jump events, effort analysis,
 *     jump magnitude distribution, acceleration/deceleration efforts
 *   - GymAware Cloud API provides: Load-velocity profiling, estimated 1RM,
 *     peak power, mean velocity, exercise summaries
 *   - Cross-platform athlete matching links Catapult ↔ GymAware athletes
 *   - VALD (placeholder): CMJ jump height, peak force, asymmetry — awaiting API credentials
 *   - When backend is unavailable, shows DISCONNECTED state
 *   - NO mock data fallback
 *
 * Enhanced with real data:
 *   - Jump profile analysis (magnitude bands, peak/avg, timeline) — Catapult
 *   - Effort analysis (velocity efforts / sprints, acceleration efforts) — Catapult
 *   - BMP load breakdown (jumping, running, dynamic) — Catapult
 *   - Strength summary (exercises, peak force, power, velocity) — GymAware
 *   - Load-velocity profile with estimated 1RM — GymAware
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
  LineChart,
  Line,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
  ComposedChart,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import {
  Dumbbell, TrendingUp, AlertTriangle, Gauge, ArrowUpDown,
  Zap, WifiOff, Wifi, Loader2, Flame, Database,
} from 'lucide-react';
import {
  useCatapultData,
  useCatapultLongitudinal,
  useCatapultJumpProfile,
  useCatapultEffortAnalysis,
  getMergedPlayers,
} from '@/hooks/useCatapultData';
import {
  useGymAwareData,
  useGymAwareSummary,
  useGymAwareLoadVelocity,
} from '@/hooks/useGymAwareData';
import { useLinkedAthletes } from '@/hooks/useLinkedAthletes';
import { motion } from 'framer-motion';

// ── Tooltip style (matches VDAT-AU-FROND dark theme) ────────
const tooltipStyle = {
  background: 'oklch(0.17 0.025 260)',
  border: '1px solid oklch(0.28 0.02 260)',
  borderRadius: '8px',
  fontSize: 12,
};

// ── Jump magnitude band colors ──────────────────────────────
const JUMP_BAND_COLORS = {
  low: '#94a3b8',
  moderate: '#22c55e',
  high: '#f97316',
  veryHigh: '#ef4444',
};

// ══════════════════════════════════════════════════════════════
// Main Component
// ══════════════════════════════════════════════════════════════
export default function StrengthPower() {
  const {
    athletes: catapultAthletes,
    activities,
    isLive,
    disconnected,
    loading: apiLoading,
    error: apiError,
  } = useCatapultData();

  const players = useMemo(
    () => getMergedPlayers(catapultAthletes, isLive),
    [catapultAthletes, isLive]
  );

  // GymAware connection status
  const { isLive: gymAwareLive, disconnected: gymAwareDisconnected } = useGymAwareData();

  // Linked athletes (cross-platform matching)
  const { athletes: linkedAthletes } = useLinkedAthletes();

  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [selectedActivityId, setSelectedActivityId] = useState('');
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);

  // Set default player once list is ready
  useEffect(() => {
    if (players.length > 0 && !selectedPlayerId) {
      setSelectedPlayerId(players[0].id);
    }
  }, [players, selectedPlayerId]);

  // Set default activity
  useEffect(() => {
    if (activities.length > 0 && !selectedActivityId) {
      setSelectedActivityId(activities[0].id);
    }
  }, [activities, selectedActivityId]);

  const player = useMemo(
    () => players.find(p => p.id === selectedPlayerId),
    [selectedPlayerId, players]
  );

  // Find the linked athlete to get GymAware reference
  const linkedAthlete = useMemo(() => {
    return linkedAthletes.find(a => a.catapultId === selectedPlayerId);
  }, [linkedAthletes, selectedPlayerId]);

  const gymAwareRef = linkedAthlete?.gymAwareRef ?? null;

  // ── Catapult longitudinal data (for BMP load trends) ──
  const { data: longitudinalData, loading: longitudinalLoading } =
    useCatapultLongitudinal(isLive ? selectedPlayerId : null);

  // ── Catapult jump profile (from IMA events) ──
  const { data: jumpProfile, loading: jumpProfileLoading } =
    useCatapultJumpProfile(
      isLive ? selectedPlayerId : null,
      isLive ? selectedActivityId : null
    );

  // ── Catapult effort analysis ──
  const { data: effortAnalysis, loading: effortLoading } =
    useCatapultEffortAnalysis(
      isLive ? selectedPlayerId : null,
      isLive ? selectedActivityId : null
    );

  // ── GymAware strength summary ──
  const { summary: gymAwareSummary, loading: gymAwareSummaryLoading } =
    useGymAwareSummary(gymAwareLive ? gymAwareRef : null);

  // Set default exercise from GymAware summary
  useEffect(() => {
    if (gymAwareSummary?.exercises && gymAwareSummary.exercises.length > 0 && !selectedExercise) {
      setSelectedExercise(gymAwareSummary.exercises[0].name);
    }
  }, [gymAwareSummary, selectedExercise]);

  // ── GymAware load-velocity profile ──
  const { profile: loadVelocityProfile, loading: lvLoading } =
    useGymAwareLoadVelocity(gymAwareLive ? gymAwareRef : null, selectedExercise);

  // ── Derived chart data ─────────────────────────────────────

  // BMP load trend from longitudinal data
  const bmpTrendData = useMemo(() => {
    if (!longitudinalData || longitudinalData.length === 0) return [];
    return longitudinalData.map(p => ({
      date: p.date ? p.date.split('T')[0].slice(5) : '',
      jumpingLoad: p.bmpJumpingLoad,
      runningLoad: p.bmpRunningLoad,
      dynamicLoad: p.bmpDynamicLoad,
      totalJumps: p.totalJumps ?? Math.round(p.bmpJumpingLoad),
    }));
  }, [longitudinalData]);

  // Jump magnitude band data for pie chart
  const jumpBandData = useMemo(() => {
    if (!jumpProfile?.magnitudeBands) return [];
    const bands = jumpProfile.magnitudeBands;
    return [
      { name: 'Low', value: bands.low, color: JUMP_BAND_COLORS.low },
      { name: 'Moderate', value: bands.moderate, color: JUMP_BAND_COLORS.moderate },
      { name: 'High', value: bands.high, color: JUMP_BAND_COLORS.high },
      { name: 'Very High', value: bands.veryHigh, color: JUMP_BAND_COLORS.veryHigh },
    ].filter(d => d.value > 0);
  }, [jumpProfile]);

  // Jump timeline for scatter plot
  const jumpTimelineData = useMemo(() => {
    if (!jumpProfile?.timeline) return [];
    return jumpProfile.timeline.map((j, i) => ({
      index: i + 1,
      magnitude: j.magnitude,
      duration: j.duration,
    }));
  }, [jumpProfile]);

  // Load-velocity chart data
  const lvChartData = useMemo(() => {
    if (!loadVelocityProfile?.dataPoints) return [];
    return loadVelocityProfile.dataPoints.map(p => ({
      load: p.load,
      velocity: p.meanVelocity,
      bestVelocity: p.bestVelocity,
      reps: p.reps,
    }));
  }, [loadVelocityProfile]);

  // GymAware exercise summary for bar chart
  const exerciseChartData = useMemo(() => {
    if (!gymAwareSummary?.exercises) return [];
    return gymAwareSummary.exercises
      .filter(e => e.metrics.peakPower != null || e.metrics.peakForce != null)
      .slice(0, 8)
      .map(e => ({
        name: e.name.length > 15 ? e.name.slice(0, 15) + '...' : e.name,
        fullName: e.name,
        peakPower: e.metrics.peakPower ?? 0,
        peakForce: e.metrics.peakForce ?? 0,
        avgVelocity: e.metrics.avgVelocity ?? 0,
        reps: e.repCount,
      }));
  }, [gymAwareSummary]);

  // ══════════════════════════════════════════════════════════
  // Loading state
  // ══════════════════════════════════════════════════════════
  if (apiLoading) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm">Connecting to Catapult OpenField...</p>
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
            <Dumbbell className="w-6 h-6 text-primary" />
            Strength & Power
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-destructive/15 text-destructive border border-destructive/30">
              <WifiOff className="w-3 h-3" /> DISCONNECTED
            </span>
          </h1>
        </div>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <WifiOff className="w-16 h-16 text-muted-foreground/30 mb-6" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Backend Not Connected</h2>
          <p className="text-sm text-muted-foreground max-w-md mb-4">
            Unable to reach the Catapult API backend. Strength and power data requires a live connection to the backend server.
          </p>
          {apiError && (
            <p className="text-xs text-destructive mb-4">{apiError}</p>
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

      {/* ── Header with selectors ────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading flex items-center gap-2">
            <Dumbbell className="w-6 h-6 text-primary" />
            Strength & Power
            {isLive && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-teal/15 text-teal border border-teal/30">
                <Wifi className="w-3 h-3" /> CATAPULT
              </span>
            )}
            {gymAwareLive && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/15 text-primary border border-primary/30">
                <Wifi className="w-3 h-3" /> GYMAWARE
              </span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Jump profiling, effort analysis, and strength testing data
            {linkedAthlete?.hasGymAware && (
              <span className="text-primary ml-1">(linked to GymAware)</span>
            )}
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Select value={selectedPlayerId} onValueChange={(v) => { setSelectedPlayerId(v); setSelectedExercise(null); }}>
            <SelectTrigger className="w-48 bg-secondary border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              {players.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {p.number ? `#${p.number} ` : ''}{p.name}
                  {linkedAthletes.find(la => la.catapultId === p.id)?.hasGymAware ? ' ✔' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {activities.length > 0 && (
            <Select value={selectedActivityId} onValueChange={setSelectedActivityId}>
              <SelectTrigger className="w-56 bg-secondary border-border">
                <SelectValue placeholder="Select activity..." />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {activities.slice(0, 15).map(a => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name.length > 30 ? a.name.slice(0, 30) + '...' : a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* ── Loading indicator ────────────────────────────── */}
      {isLive && (longitudinalLoading || jumpProfileLoading || effortLoading || gymAwareSummaryLoading || lvLoading) && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-3 h-3 animate-spin" />
          Loading strength & power data...
        </div>
      )}

      {/* ── Summary Cards ────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          {
            label: 'Total Jumps',
            value: jumpProfile?.totalJumps?.toString() || '—',
            unit: 'in activity',
            icon: ArrowUpDown,
            color: 'text-primary',
          },
          {
            label: 'Peak Magnitude',
            value: jumpProfile?.peakMagnitude?.toFixed(1) || '—',
            unit: 'g',
            icon: Zap,
            color: 'text-teal',
          },
          {
            label: 'Avg Magnitude',
            value: jumpProfile?.avgMagnitude?.toFixed(1) || '—',
            unit: 'g',
            icon: TrendingUp,
            color: 'text-primary',
          },
          {
            label: gymAwareSummary ? 'GymAware Reps' : 'Velocity Efforts',
            value: gymAwareSummary
              ? gymAwareSummary.totalReps.toString()
              : (effortAnalysis?.velocityEfforts?.count?.toString() || '—'),
            unit: gymAwareSummary ? 'total' : 'sprints',
            icon: gymAwareSummary ? Dumbbell : Flame,
            color: gymAwareSummary ? 'text-primary' : 'text-orange-400',
          },
          {
            label: loadVelocityProfile?.estimated1RM ? 'Est. 1RM' : 'Accel Efforts',
            value: loadVelocityProfile?.estimated1RM
              ? `${loadVelocityProfile.estimated1RM}`
              : (effortAnalysis?.accelerationEfforts?.count?.toString() || '—'),
            unit: loadVelocityProfile?.estimated1RM ? 'kg' : 'efforts',
            icon: Gauge,
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

      {/* ── BMP Load Trend (longitudinal) ────────────────── */}
      <motion.div
        className="glass-card rounded-xl p-5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          Body Movement Profile — Load Trend
          <span className="text-[10px] text-muted-foreground font-normal">(Catapult BMP across sessions)</span>
        </h2>
        <div className="h-64">
          {bmpTrendData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={bmpTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.02 260)" />
                <XAxis dataKey="date" tick={{ fill: 'oklch(0.6 0.02 260)', fontSize: 10 }} />
                <YAxis yAxisId="load" tick={{ fill: 'oklch(0.6 0.02 260)', fontSize: 10 }} />
                <YAxis yAxisId="jumps" orientation="right" tick={{ fill: 'oklch(0.6 0.02 260)', fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar yAxisId="load" dataKey="jumpingLoad" name="Jumping Load" fill="oklch(0.82 0.14 85)" opacity={0.7} radius={[3, 3, 0, 0]} stackId="bmp" />
                <Bar yAxisId="load" dataKey="runningLoad" name="Running Load" fill="oklch(0.75 0.14 175)" opacity={0.7} stackId="bmp" />
                <Bar yAxisId="load" dataKey="dynamicLoad" name="Dynamic Load" fill="oklch(0.7 0.14 280)" opacity={0.7} stackId="bmp" radius={[3, 3, 0, 0]} />
                <Line yAxisId="jumps" type="monotone" dataKey="totalJumps" name="Total Jumps" stroke="oklch(0.7 0.18 25)" strokeWidth={2} dot={{ r: 2 }} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
              No longitudinal data available for this athlete
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Jump Profile — Magnitude Distribution & Timeline ── */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Jump Magnitude Distribution */}
        <motion.div
          className="glass-card rounded-xl p-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-primary" />
            Jump Magnitude Distribution
            <span className="text-[10px] text-muted-foreground font-normal">(selected activity)</span>
          </h2>
          <div className="h-56">
            {jumpBandData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={jumpBandData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {jumpBandData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                No jump profile data — select an activity above
              </div>
            )}
          </div>
        </motion.div>

        {/* Jump Timeline (scatter) */}
        <motion.div
          className="glass-card rounded-xl p-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-teal" />
            Jump Timeline
            <span className="text-[10px] text-muted-foreground font-normal">(magnitude per jump)</span>
          </h2>
          <div className="h-56">
            {jumpTimelineData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.02 260)" />
                  <XAxis dataKey="index" name="Jump #" tick={{ fill: 'oklch(0.6 0.02 260)', fontSize: 10 }} />
                  <YAxis dataKey="magnitude" name="Magnitude (g)" tick={{ fill: 'oklch(0.6 0.02 260)', fontSize: 10 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Scatter name="Jumps" data={jumpTimelineData} fill="oklch(0.82 0.14 85)" />
                </ScatterChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                No jump timeline data available
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* ── Effort Analysis Summary ──────────────────────── */}
      {effortAnalysis && (
        <motion.div
          className="glass-card rounded-xl p-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-400" />
            Effort Analysis
            <span className="text-[10px] text-muted-foreground font-normal">(selected activity)</span>
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-3 rounded-lg bg-secondary/30 border border-border">
              <p className="text-[10px] text-muted-foreground mb-1">Total Efforts</p>
              <p className="stat-number text-xl text-foreground">{effortAnalysis.totalEfforts}</p>
            </div>
            <div className="p-3 rounded-lg bg-secondary/30 border border-border">
              <p className="text-[10px] text-muted-foreground mb-1">Peak Velocity</p>
              <p className="stat-number text-xl text-foreground">
                {effortAnalysis.velocityEfforts.peakVelocity.toFixed(1)}
                <span className="text-xs text-muted-foreground ml-1">m/s</span>
              </p>
            </div>
            <div className="p-3 rounded-lg bg-secondary/30 border border-border">
              <p className="text-[10px] text-muted-foreground mb-1">Avg Sprint Distance</p>
              <p className="stat-number text-xl text-foreground">
                {effortAnalysis.velocityEfforts.avgDistance.toFixed(1)}
                <span className="text-xs text-muted-foreground ml-1">m</span>
              </p>
            </div>
            <div className="p-3 rounded-lg bg-secondary/30 border border-border">
              <p className="text-[10px] text-muted-foreground mb-1">Peak Acceleration</p>
              <p className="stat-number text-xl text-foreground">
                {effortAnalysis.accelerationEfforts.peakAcceleration.toFixed(1)}
                <span className="text-xs text-muted-foreground ml-1">m/s²</span>
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── GymAware Section ─────────────────────────────── */}
      <div className="grid lg:grid-cols-2 gap-4">

        {/* GymAware Exercise Summary */}
        <motion.div
          className={`glass-card rounded-xl p-5 ${!gymAwareLive ? 'border border-dashed border-border' : ''}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Dumbbell className="w-4 h-4 text-primary" />
            Strength Summary (GymAware)
            {gymAwareLive ? (
              linkedAthlete?.hasGymAware ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/15 text-primary border border-primary/30">
                  <Wifi className="w-3 h-3" /> LIVE
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground border border-border">
                  NOT LINKED
                </span>
              )
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-destructive/15 text-destructive border border-destructive/30">
                <WifiOff className="w-3 h-3" /> DISCONNECTED
              </span>
            )}
          </h2>

          {gymAwareLive && linkedAthlete?.hasGymAware && gymAwareSummary && gymAwareSummary.totalReps > 0 ? (
            <>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="p-2 rounded-lg bg-secondary/30 border border-border text-center">
                  <p className="stat-number text-lg text-foreground">{gymAwareSummary.totalReps}</p>
                  <p className="text-[10px] text-muted-foreground">Total Reps</p>
                </div>
                <div className="p-2 rounded-lg bg-secondary/30 border border-border text-center">
                  <p className="stat-number text-lg text-foreground">{gymAwareSummary.totalSessions}</p>
                  <p className="text-[10px] text-muted-foreground">Sessions</p>
                </div>
                <div className="p-2 rounded-lg bg-secondary/30 border border-border text-center">
                  <p className="stat-number text-lg text-foreground">{gymAwareSummary.exercises.length}</p>
                  <p className="text-[10px] text-muted-foreground">Exercises</p>
                </div>
              </div>
              <div className="h-48">
                {exerciseChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={exerciseChartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.02 260)" />
                      <XAxis type="number" tick={{ fill: 'oklch(0.6 0.02 260)', fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" width={100} tick={{ fill: 'oklch(0.6 0.02 260)', fontSize: 9 }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="peakPower" name="Peak Power (W)" fill="oklch(0.7 0.18 280)" radius={[0, 3, 3, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                    No exercise data with power metrics
                  </div>
                )}
              </div>
              {gymAwareSummary.latestSession && (
                <p className="text-[10px] text-muted-foreground mt-2">
                  Latest session: {gymAwareSummary.latestSession}
                </p>
              )}
            </>
          ) : gymAwareLive && !linkedAthlete?.hasGymAware ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertTriangle className="w-8 h-8 text-muted-foreground/20 mb-3" />
              <p className="text-sm text-muted-foreground mb-1">Athlete Not Linked</p>
              <p className="text-xs text-muted-foreground/70 max-w-xs">
                This athlete has not been matched to a GymAware profile. Check the Data Sources page for matching status.
              </p>
            </div>
          ) : !gymAwareLive ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <WifiOff className="w-8 h-8 text-muted-foreground/20 mb-3" />
              <p className="text-sm text-muted-foreground mb-1">GymAware Disconnected</p>
              <p className="text-xs text-muted-foreground/70 max-w-xs">
                GymAware Cloud API is not reachable. Strength data will appear when the backend connects.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Database className="w-8 h-8 text-muted-foreground/20 mb-3" />
              <p className="text-sm text-muted-foreground">No strength data available</p>
            </div>
          )}
        </motion.div>

        {/* GymAware Load-Velocity Profile */}
        <motion.div
          className={`glass-card rounded-xl p-5 ${!gymAwareLive ? 'border border-dashed border-border' : ''}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Gauge className="w-4 h-4 text-teal" />
            Load-Velocity Profile
            {gymAwareLive && linkedAthlete?.hasGymAware ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/15 text-primary border border-primary/30">
                <Wifi className="w-3 h-3" /> LIVE
              </span>
            ) : !gymAwareLive ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-destructive/15 text-destructive border border-destructive/30">
                <WifiOff className="w-3 h-3" /> DISCONNECTED
              </span>
            ) : null}
          </h2>

          {gymAwareLive && linkedAthlete?.hasGymAware ? (
            <>
              {/* Exercise selector */}
              {gymAwareSummary && gymAwareSummary.exercises.length > 0 && (
                <Select value={selectedExercise || ''} onValueChange={setSelectedExercise}>
                  <SelectTrigger className="w-full bg-secondary border-border mb-3">
                    <SelectValue placeholder="Select exercise..." />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {gymAwareSummary.exercises.map(e => (
                      <SelectItem key={e.name} value={e.name}>
                        {e.name} ({e.repCount} reps)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Load-velocity chart */}
              <div className="h-48">
                {lvChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.02 260)" />
                      <XAxis
                        dataKey="load"
                        name="Load (kg)"
                        tick={{ fill: 'oklch(0.6 0.02 260)', fontSize: 10 }}
                        label={{ value: 'Load (kg)', position: 'bottom', offset: -5, style: { fill: 'oklch(0.6 0.02 260)', fontSize: 10 } }}
                      />
                      <YAxis
                        dataKey="velocity"
                        name="Velocity (m/s)"
                        tick={{ fill: 'oklch(0.6 0.02 260)', fontSize: 10 }}
                        label={{ value: 'Velocity (m/s)', angle: -90, position: 'insideLeft', style: { fill: 'oklch(0.6 0.02 260)', fontSize: 10 } }}
                      />
                      <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => value.toFixed(3)} />
                      <Scatter name="Mean Velocity" data={lvChartData} fill="oklch(0.7 0.18 280)" />
                    </ScatterChart>
                  </ResponsiveContainer>
                ) : lvLoading ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Loading profile...
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                    No load-velocity data for this exercise
                  </div>
                )}
              </div>

              {/* 1RM and MVT info */}
              {loadVelocityProfile && (
                <div className="grid grid-cols-3 gap-3 mt-3">
                  <div className="p-2 rounded-lg bg-secondary/30 border border-border text-center">
                    <p className="stat-number text-lg text-foreground">
                      {loadVelocityProfile.estimated1RM ? `${loadVelocityProfile.estimated1RM} kg` : '—'}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Est. 1RM</p>
                  </div>
                  <div className="p-2 rounded-lg bg-secondary/30 border border-border text-center">
                    <p className="stat-number text-lg text-foreground">{loadVelocityProfile.mvt} m/s</p>
                    <p className="text-[10px] text-muted-foreground">MVT</p>
                  </div>
                  <div className="p-2 rounded-lg bg-secondary/30 border border-border text-center">
                    <p className="stat-number text-lg text-foreground">{loadVelocityProfile.repsAnalysed}</p>
                    <p className="text-[10px] text-muted-foreground">Reps Analysed</p>
                  </div>
                </div>
              )}
            </>
          ) : !gymAwareLive ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Gauge className="w-10 h-10 text-muted-foreground/20 mb-3" />
              <p className="text-sm text-muted-foreground mb-2">GymAware Cloud Data</p>
              <p className="text-xs text-muted-foreground/70 max-w-xs">
                Barbell velocity, load-velocity profiles, estimated 1RM, and peak power will appear here once the backend connects to GymAware.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <AlertTriangle className="w-8 h-8 text-muted-foreground/20 mb-3" />
              <p className="text-sm text-muted-foreground">Athlete not linked to GymAware</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* ── VALD Placeholder ─────────────────────────────── */}
      <motion.div
        className="glass-card rounded-xl p-5 border border-dashed border-border"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
      >
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-primary" />
          CMJ Testing (VALD ForceDecks)
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground border border-border">
            <Database className="w-3 h-3" /> AWAITING INTEGRATION
          </span>
        </h2>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <ArrowUpDown className="w-10 h-10 text-muted-foreground/20 mb-3" />
          <p className="text-sm text-muted-foreground mb-2">VALD Force Plate Data</p>
          <p className="text-xs text-muted-foreground/70 max-w-xs">
            CMJ jump height, peak force, RSI, and left/right asymmetry will appear here once VALD API credentials are configured.
          </p>
          <div className="flex gap-4 mt-4">
            {['Jump Height', 'Peak Force', 'RSI', 'Asymmetry'].map(metric => (
              <div key={metric} className="text-center">
                <p className="stat-number text-lg text-muted-foreground/30">—</p>
                <p className="text-[10px] text-muted-foreground/50">{metric}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}