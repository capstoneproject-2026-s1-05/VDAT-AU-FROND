/**
 * Dashboard: Player roster with stats overview, radar charts,
 * and Summary Insights module
 */
import { useState, useMemo } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  Search, ArrowRight, Filter, Download,
  AlertTriangle, TrendingUp, TrendingDown,
  Heart, Zap, Shield, Activity,
} from 'lucide-react';
import { players, getRadarData, type Player } from '@/lib/mockData';
import { calculatePerformanceIndex, getPerformanceLevel, exportPlayersToCSV } from '@/lib/analytics';
import DateRangeFilter, { getDefaultDateRange, type DateRange } from '@/components/DateRangeFilter';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

// ── 常量 ──────────────────────────────────────────────────────
const positions = ['All', 'Outside Hitter', 'Setter', 'Middle Blocker', 'Opposite', 'Libero'];

// ── Recharts 图表的通用样式配置 ────────────────────────────────
// 这些 OKLCH 颜色值与 index.css 中的主题保持一致
const CHART_COLORS = {
  gold: 'oklch(0.82 0.14 85)',       // --color-primary
  teal: 'oklch(0.75 0.14 175)',      // --color-teal
  red: 'oklch(0.7 0.18 25)',         // 柔和的红色
  grid: 'oklch(0.28 0.02 260)',      // 网格线
  label: 'oklch(0.6 0.02 260)',      // 轴标签
  tooltipBg: 'oklch(0.17 0.025 260)',
  tooltipBorder: 'oklch(0.28 0.02 260)',
};

// ── Summary Insights 生成函数 ──────────────────────────────────
// 自动扫描所有球员的运动科学数据，生成警报和洞察
function generateInsights(playerList: Player[]) {
  const insights: {
    type: 'warning' | 'positive' | 'info';
    icon: typeof AlertTriangle;
    title: string;
    detail: string;
  }[] = [];

  for (const p of playerList) {
    const recovery = p.physicalData.recoveryRecords;
    const training = p.physicalData.trainingSessions;

    // 检查 1: 低恢复评分（最近 3 天平均 < 40%）
    if (recovery.length > 0) {
      const recent = recovery.slice(-3);
      const avgRecovery = recent.reduce((s, r) => s + r.recoveryScore, 0) / recent.length;
      if (avgRecovery < 40) {
        insights.push({
          type: 'warning',
          icon: Heart,
          title: `${p.name} — Low Recovery`,
          detail: `Average recovery score of ${Math.round(avgRecovery)}% over the last 3 days. Consider reducing training load.`,
        });
      }
    }

    // 检查 2: 高 ACWR（急性慢性负荷比 > 1.3）
    if (training.length > 0) {
      const now = new Date();
      const acuteCutoff = new Date(now);
      acuteCutoff.setDate(now.getDate() - 7);
      const chronicCutoff = new Date(now);
      chronicCutoff.setDate(now.getDate() - 28);

      const acuteLoad = training
        .filter(s => new Date(s.date) >= acuteCutoff)
        .reduce((sum, s) => sum + s.playerLoad, 0);
      const chronicSessions = training.filter(s => new Date(s.date) >= chronicCutoff);
      const chronicLoad = chronicSessions.length > 0
        ? chronicSessions.reduce((sum, s) => sum + s.playerLoad, 0) / 4
        : 1;
      const acwr = acuteLoad / Math.max(chronicLoad, 1);

      if (acwr > 1.3) {
        insights.push({
          type: 'warning',
          icon: Zap,
          title: `${p.name} — High ACWR (${acwr.toFixed(2)})`,
          detail: `Acute-to-chronic workload ratio exceeds safe threshold. Elevated injury risk.`,
        });
      }
    }

    // 检查 3: 高不对称性（CMJ 左右力量差 > 10%）
    const cmjRecords = p.physicalData.strengthRecords.filter(r => r.testType === 'cmj');
    if (cmjRecords.length > 0) {
      const latest = cmjRecords[cmjRecords.length - 1];
      if (latest.asymmetry && latest.asymmetry > 10) {
        insights.push({
          type: 'warning',
          icon: AlertTriangle,
          title: `${p.name} — High Asymmetry (${latest.asymmetry}%)`,
          detail: `Left/right force asymmetry above 10% threshold. Monitor for injury risk.`,
        });
      }
    }

    // 检查 4: 活跃伤病
    const activeInjuries = p.physicalData.injuries.filter(
      inj => inj.status === 'active' || inj.status === 'recovering'
    );
    for (const inj of activeInjuries) {
      insights.push({
        type: 'info',
        icon: Shield,
        title: `${p.name} — ${inj.type} (${inj.bodyPart})`,
        detail: `Status: ${inj.status}. ${inj.returnDate ? `Expected return: ${inj.returnDate}` : 'No return date set.'}`,
      });
    }

    // 检查 5: 恢复趋势改善
    if (recovery.length >= 7) {
      const firstHalf = recovery.slice(-7, -3);
      const secondHalf = recovery.slice(-3);
      const avgFirst = firstHalf.reduce((s, r) => s + r.recoveryScore, 0) / firstHalf.length;
      const avgSecond = secondHalf.reduce((s, r) => s + r.recoveryScore, 0) / secondHalf.length;
      if (avgSecond > avgFirst + 15) {
        insights.push({
          type: 'positive',
          icon: TrendingUp,
          title: `${p.name} — Recovery Improving`,
          detail: `Recovery score trending up from ${Math.round(avgFirst)}% to ${Math.round(avgSecond)}%.`,
        });
      }
    }
  }

  // 排序：警告优先，然后信息，最后正面
  const order = { warning: 0, info: 1, positive: 2 };
  insights.sort((a, b) => order[a.type] - order[b.type]);
  return insights.slice(0, 6); // 最多显示 6 条
}

// ══════════════════════════════════════════════════════════════
// Dashboard 主组件
// ══════════════════════════════════════════════════════════════
export default function Dashboard() {
  // ── 状态管理 ────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [posFilter, setPosFilter] = useState('All');
  const [sortBy, setSortBy] = useState<'totalPoints' | 'attackPercentage' | 'pointsPerSet'>('totalPoints');
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange());

  // ── 派生数据（useMemo 缓存，避免每次渲染重新计算）──────────
  const filtered = useMemo(() => {
    let result = [...players];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) || p.team.toLowerCase().includes(q)
      );
    }
    if (posFilter !== 'All') {
      result = result.filter(p => p.position === posFilter);
    }
    result.sort((a, b) => b.stats[sortBy] - a.stats[sortBy]);
    return result;
  }, [search, posFilter, sortBy]);

  const insights = useMemo(() => generateInsights(players), []);

  // Team Scoring 柱状图数据
  const teamBarData = players.map(p => ({
    name: p.name.split(' ')[1] || p.name,
    attacks: p.stats.attackPoints,
    blocks: p.stats.blockPoints,
    aces: p.stats.serviceAces,
  }));

  // ── 渲染 ───────────────────────────────────────────────────
  return (
    <div className="p-4 lg:p-6 space-y-6">

      {/* ── 页面标题 + 日期过滤器 ──────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading">Player Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Australian national team athlete performance overview
          </p>
        </div>
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
      </div>

      {/* ── Summary Insights（团队洞察与警报）────────────────── */}
      {insights.length > 0 && (
        <motion.div
          className="glass-card rounded-xl p-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Team Insights & Alerts
          </h2>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
            {insights.map((insight, i) => {
              const colorMap = {
                warning: 'border-l-destructive bg-destructive/5',
                positive: 'border-l-teal bg-teal/5',
                info: 'border-l-primary bg-primary/5',
              };
              const iconColorMap = {
                warning: 'text-destructive',
                positive: 'text-teal',
                info: 'text-primary',
              };
              return (
                <motion.div
                  key={i}
                  className={`rounded-lg border-l-4 p-3 ${colorMap[insight.type]}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div className="flex items-start gap-2">
                    <insight.icon className={`w-4 h-4 mt-0.5 ${iconColorMap[insight.type]}`} />
                    <div>
                      <p className="text-xs font-medium">{insight.title}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                        {insight.detail}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ── Team Scoring 柱状图 ────────────────────────────── */}
      <div className="glass-card rounded-xl p-5">
        <h2 className="text-sm font-semibold mb-4">Team Scoring Breakdown</h2>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={teamBarData} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
              <XAxis dataKey="name" tick={{ fill: CHART_COLORS.label, fontSize: 11 }} />
              <YAxis tick={{ fill: CHART_COLORS.label, fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: CHART_COLORS.tooltipBg,
                  border: `1px solid ${CHART_COLORS.tooltipBorder}`,
                  borderRadius: '8px',
                  fontSize: 12,
                }}
              />
              <Bar dataKey="attacks" name="Attack Pts" fill={CHART_COLORS.gold} radius={[3, 3, 0, 0]} />
              <Bar dataKey="blocks" name="Block Pts" fill={CHART_COLORS.teal} radius={[3, 3, 0, 0]} />
              <Bar dataKey="aces" name="Aces" fill={CHART_COLORS.red} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── 搜索、筛选、导出 ──────────────────────────────── */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search athletes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-secondary border-border"
          />
        </div>
        <Select value={posFilter} onValueChange={setPosFilter}>
          <SelectTrigger className="w-44 bg-secondary border-border">
            <Filter className="w-3 h-3 mr-2 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {positions.map(p => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
          <SelectTrigger className="w-44 bg-secondary border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="totalPoints">Total Points</SelectItem>
            <SelectItem value="attackPercentage">Attack %</SelectItem>
            <SelectItem value="pointsPerSet">Points/Set</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs border-border hover:bg-secondary ml-auto"
          onClick={() => {
            const csv = exportPlayersToCSV(players);
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'volleyball_stats_export.csv';
            a.click();
            URL.revokeObjectURL(url);
            toast.success('Statistics exported to CSV');
          }}
        >
          <Download className="w-3 h-3" />
          Export CSV
        </Button>
      </div>

      {/* ── 球员卡片网格 ──────────────────────────────────── */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((player, i) => (
          <PlayerCard key={player.id} player={player} index={i} />
        ))}
      </div>

      {/* 空状态 */}
      {filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p>No athletes match your filters.</p>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// PlayerCard 子组件
// ══════════════════════════════════════════════════════════════
function PlayerCard({ player, index }: { player: Player; index: number }) {
  const radarData = getRadarData(player);
  const perfIndex = calculatePerformanceIndex(player.stats);
  const perfLevel = getPerformanceLevel(perfIndex);

  // 最新的恢复和健康数据
  const latestRecovery = player.physicalData.recoveryRecords[player.physicalData.recoveryRecords.length - 1];
  const latestWellness = player.physicalData.wellnessRecords[player.physicalData.wellnessRecords.length - 1];
  const recoveryScore = latestRecovery?.recoveryScore;
  const wellnessScore = latestWellness?.overallWellness;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
    >
      <div className="glass-card rounded-xl p-5 hover:border-primary/30 transition-all duration-300 cursor-pointer group">
        {/* 球员头部信息 */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="stat-number text-xs text-primary">#{player.number}</span>
              <h3 className="font-semibold text-sm">{player.name}</h3>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {player.position} · {player.team} · {player.height}cm
            </p>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
            {player.source === 'fivb_vis' ? 'FIVB' : player.source === 'volleyball_world' ? 'VW' : 'FS'}
          </span>
        </div>

        {/* 雷达图 */}
        <div className="h-40 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke={CHART_COLORS.grid} />
              <PolarAngleAxis
                dataKey="category"
                tick={{ fill: CHART_COLORS.label, fontSize: 10 }}
              />
              <Radar
                name={player.name}
                dataKey="value"
                stroke={CHART_COLORS.gold}
                fill={CHART_COLORS.gold}
                fillOpacity={0.15}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* 比赛统计 */}
        <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-border">
          <div>
            <p className="stat-number text-lg text-foreground">{player.stats.totalPoints}</p>
            <p className="text-[10px] text-muted-foreground">Total Pts</p>
          </div>
          <div>
            <p className="stat-number text-lg text-foreground">{player.stats.attackPercentage}%</p>
            <p className="text-[10px] text-muted-foreground">Attack %</p>
          </div>
          <div>
            <p className="stat-number text-lg text-foreground">{player.stats.pointsPerSet}</p>
            <p className="text-[10px] text-muted-foreground">Pts/Set</p>
          </div>
        </div>

        {/* 体能快速概览 */}
        <div className="grid grid-cols-3 gap-3 mt-2 pt-2 border-t border-border/50">
          <div>
            <p className={`stat-number text-sm ${
              recoveryScore !== undefined
                ? (recoveryScore >= 66 ? 'text-teal' : recoveryScore >= 33 ? 'text-primary' : 'text-destructive')
                : 'text-muted-foreground'
            }`}>
              {recoveryScore !== undefined ? `${recoveryScore}%` : '—'}
            </p>
            <p className="text-[9px] text-muted-foreground">Recovery</p>
          </div>
          <div>
            <p className={`stat-number text-sm ${
              wellnessScore !== undefined
                ? (wellnessScore >= 7 ? 'text-teal' : wellnessScore >= 5 ? 'text-primary' : 'text-destructive')
                : 'text-muted-foreground'
            }`}>
              {wellnessScore !== undefined ? wellnessScore.toFixed(1) : '—'}
            </p>
            <p className="text-[9px] text-muted-foreground">Wellness</p>
          </div>
          <div>
            <p className="stat-number text-sm text-foreground">
              {latestRecovery?.hrv || '—'}
            </p>
            <p className="text-[9px] text-muted-foreground">HRV</p>
          </div>
        </div>

        {/* 表现指数 */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
          <div>
            <span className={`text-[10px] font-medium ${perfLevel.color}`}>{perfLevel.level}</span>
            <p className="text-[9px] text-muted-foreground">{perfLevel.description}</p>
          </div>
          <div className="text-right">
            <span className="stat-number text-lg text-primary">{perfIndex}</span>
            <p className="text-[9px] text-muted-foreground">Perf. Index</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}