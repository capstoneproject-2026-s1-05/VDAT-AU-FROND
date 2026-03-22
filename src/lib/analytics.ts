import type { PlayerStats } from './mockData';

/**
 * 描述性统计：计算一组数值的均值、中位数、标准差、最小值、最大值
 * 这是数据分析中最基础的工具函数
 */
export function descriptiveStats(values: number[]) {
  if (values.length === 0) return { mean: 0, median: 0, stdDev: 0, min: 0, max: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const median = sorted[Math.floor(sorted.length / 2)];
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return {
    mean: Math.round(mean * 100) / 100,
    median,
    stdDev: Math.round(Math.sqrt(variance) * 100) / 100,
    min: sorted[0],
    max: sorted[sorted.length - 1],
  };
}

/**
 * 移动平均：平滑时间序列数据，减少噪声
 * window 参数决定平滑窗口大小（默认 3）
 */
export function movingAverage(values: number[], window = 3): number[] {
  return values.map((_, i, arr) => {
    const start = Math.max(0, i - Math.floor(window / 2));
    const end = Math.min(arr.length, i + Math.ceil(window / 2));
    const slice = arr.slice(start, end);
    return Math.round((slice.reduce((s, v) => s + v, 0) / slice.length) * 100) / 100;
  });
}

/**
 * 复合表现指数 (0-100)：将球员的多维统计压缩为单一评分
 * 权重分配：进攻 40%、拦网 15%、发球 15%、接发 15%、得分效率 15%
 */
export function calculatePerformanceIndex(stats: PlayerStats): number {
  const attackScore = Math.min(stats.attackPercentage * 2, 100);
  const blockScore = Math.min((stats.blockPoints / Math.max(stats.blockAttempts, 1)) * 200, 100);
  const serveScore = Math.min((stats.serviceAces / Math.max(stats.serviceAttempts, 1)) * 500, 100);
  const receptionScore = stats.receptionPercentage;
  const scoringScore = Math.min(stats.pointsPerSet * 25, 100);

  const index = Math.round(
    attackScore * 0.4 +
    blockScore * 0.15 +
    serveScore * 0.15 +
    receptionScore * 0.15 +
    scoringScore * 0.15
  );
  return Math.min(index, 100);
}

/**
 * 表现等级：将数字评分转换为可读的等级标签和颜色
 */
export function getPerformanceLevel(index: number): {
  level: string;
  color: string;
  description: string;
} {
  if (index >= 80) return { level: 'Elite', color: 'text-primary', description: 'Top-tier performance' };
  if (index >= 60) return { level: 'Strong', color: 'text-teal', description: 'Above average' };
  if (index >= 40) return { level: 'Average', color: 'text-muted-foreground', description: 'Room for improvement' };
  return { level: 'Developing', color: 'text-destructive', description: 'Needs attention' };
}

/**
 * 导出球员数据为 CSV 格式
 * 用于 Dashboard 的 "Export CSV" 按钮
 */
export function exportPlayersToCSV(playerList: { name: string; position: string; stats: PlayerStats }[]): string {
  const headers = ['Name', 'Position', 'Total Points', 'Attack %', 'Block Pts', 'Aces', 'Reception %', 'Points/Set'];
  const rows = playerList.map(p => [
    p.name,
    p.position,
    p.stats.totalPoints,
    p.stats.attackPercentage,
    p.stats.blockPoints,
    p.stats.serviceAces,
    p.stats.receptionPercentage,
    p.stats.pointsPerSet,
  ].join(','));
  return [headers.join(','), ...rows].join('\n');
}