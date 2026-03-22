/**
 * Home Page: Landing/overview with hero section and quick stats
 * Design: Athletic Intelligence — dark background, gold accents
 */
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Database,
  GitCompare,
  TrendingUp,
  Users,
  Zap,
  ArrowRight,
} from 'lucide-react';
import { players, dataSources } from '@/lib/mockData';

// ── 动画变体定义 ──────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5 },
  }),
};

export default function Home() {
  const connectedSources = dataSources.filter(s => s.status === 'connected').length;
  const totalRecords = dataSources.reduce((sum, s) => sum + (s.recordCount || 0), 0);

  return (
    <div className="min-h-full">

      {/* ═══════════════════════════════════════════════════════
          区域 1: Hero Section（英雄区）
          修复：增加 px-6 lg:px-10 左右内边距，避免内容贴边
          ═══════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden">
        {/* 背景渐变 */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-teal/5" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />

        <div className="relative px-6 lg:px-10 py-16 lg:py-24">
          <div className="max-w-3xl">
            {/* 标签徽章 */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              custom={0}
            >
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-primary/15 text-primary border border-primary/20 mb-6">
                <Zap className="w-3 h-3" />
                Volleyball Australia — Performance Analytics
              </span>
            </motion.div>

            {/* 主标题 */}
            <motion.h1
              className="text-4xl lg:text-6xl font-bold font-heading tracking-tight leading-[1.1] mb-6"
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              custom={1}
            >
              Volleyball Data{' '}
              <span className="text-primary">Analysis</span>{' '}
              Toolkit
            </motion.h1>

            {/* 描述文字 */}
            <motion.p
              className="text-lg text-muted-foreground max-w-xl mb-8 leading-relaxed"
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              custom={2}
            >
              Extract, aggregate, and analyse athlete performance data from multiple
              volleyball platforms. Built as a proof of concept for Volleyball Australia's
              high-performance program.
            </motion.p>

            {/* CTA 按钮组 */}
            <motion.div
              className="flex flex-wrap gap-3"
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              custom={3}
            >
              <Link href="/dashboard">
                <Button size="lg" className="gap-2 font-semibold">
                  <LayoutDashboard className="w-4 h-4" />
                  Open Dashboard
                </Button>
              </Link>
              <Link href="/sources">
                <Button size="lg" variant="outline" className="gap-2 border-border hover:bg-secondary">
                  <Database className="w-4 h-4" />
                  View Data Sources
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          区域 2: Quick Stats（快速统计卡片）
          修复：用 px-6 lg:px-10 替代 container，保持一致的内边距
          ═══════════════════════════════════════════════════════ */}
      <section className="px-6 lg:px-10 py-12">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Data Sources', value: dataSources.length, icon: Database, color: 'text-primary' },
            { label: 'Connected', value: connectedSources, icon: Zap, color: 'text-teal' },
            { label: 'Athletes Tracked', value: players.length, icon: Users, color: 'text-primary' },
            { label: 'Total Records', value: totalRecords.toLocaleString(), icon: TrendingUp, color: 'text-teal' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              className="glass-card rounded-xl p-5"
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              custom={i + 4}
            >
              <stat.icon className={`w-5 h-5 ${stat.color} mb-3`} />
              <p className="stat-number text-2xl lg:text-3xl text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          区域 3: Feature Cards（功能入口卡片）
          ═══════════════════════════════════════════════════════ */}
      <section className="px-6 lg:px-10 pb-16">
        <h2 className="text-xl font-bold mb-6">Core Capabilities</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              title: 'Multi-Source Extraction',
              desc: 'Connect to Catapult, VALD, GymAware, Whoop, Teamworks AMS, and import CSV files for unified data access.',
              icon: Database,
              href: '/sources',
            },
            {
              title: 'Player Performance Analysis',
              desc: 'Radar charts, trend lines, and statistical breakdowns for training load, strength, recovery, and match performance.',
              icon: TrendingUp,
              href: '/dashboard',
            },
            {
              title: 'Athlete Comparison',
              desc: 'Side-by-side comparison of athletes across all statistical categories with overlay radar charts.',
              icon: GitCompare,
              href: '/compare',
            },
          ].map((feature, i) => (
            <motion.div
              key={feature.title}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              custom={i + 8}
            >
              <Link href={feature.href}>
                <div className="group glass-card rounded-xl p-5 hover:border-primary/30 transition-all duration-300 cursor-pointer h-full">
                  <div className="flex items-center gap-2 mb-3">
                    <feature.icon className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-sm">{feature.title}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                    {feature.desc}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-primary font-medium group-hover:gap-2 transition-all">
                    Explore <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
