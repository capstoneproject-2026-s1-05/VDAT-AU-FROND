/**
 * DataSources — Data integration hub
 *
 * Shows connection status for all data platforms (Catapult, GymAware, FIVB VIS),
 * cross-platform athlete matching statistics, and the unified athlete registry.
 *
 * UI: (shadcn/ui + Tailwind + framer-motion)
 */
import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Database, Wifi, WifiOff, RefreshCw, Search,
  Users, Link2, AlertTriangle, CheckCircle2,
  Activity, Dumbbell, Globe, ChevronRight, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent,
} from '@/components/ui/card';
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from '@/components/ui/tabs';
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

// Hooks
import { useCatapultData } from '@/hooks/useCatapultData';
import { useGymAwareData } from '@/hooks/useGymAwareData';
import { useLinkedAthletes, useMatchStatus } from '@/hooks/useLinkedAthletes';

// Static data source definitions (for display)
import { dataSources } from '@/lib/mockData';

// ── Chart Colors (VDAT-AU-FROND theme) ──────────────────────
const CHART_COLORS = {
  gold: 'oklch(0.82 0.14 85)',
  teal: 'oklch(0.75 0.14 175)',
  red: 'oklch(0.7 0.18 25)',
};

// ══════════════════════════════════════════════════════════════
// Main Component
// ══════════════════════════════════════════════════════════════
export default function DataSources() {
  // ── Live connection hooks ──────────────────────────────────
  const catapult = useCatapultData();
  const gymAware = useGymAwareData();
  const { athletes: linkedAthletes, matchStats, loading: linkedLoading, error: linkedError } = useLinkedAthletes();
  const { data: matchStatusData, loading: matchStatusLoading } = useMatchStatus();

  // ── Local state ────────────────────────────────────────────
  const [athleteSearch, setAthleteSearch] = useState('');
  const [athleteFilter, setAthleteFilter] = useState<'all' | 'matched' | 'unmatched'>('all');

  // ── Derived data ───────────────────────────────────────────
  const filteredAthletes = useMemo(() => {
    let result = [...linkedAthletes];
    if (athleteSearch) {
      const q = athleteSearch.toLowerCase();
      result = result.filter(a => a.name.toLowerCase().includes(q));
    }
    if (athleteFilter === 'matched') {
      result = result.filter(a => a.hasGymAware);
    } else if (athleteFilter === 'unmatched') {
      result = result.filter(a => !a.hasGymAware);
    }
    return result;
  }, [linkedAthletes, athleteSearch, athleteFilter]);

  // Build live connection status array
  const liveConnections = [
    {
      id: 'catapult',
      name: 'Catapult OpenField',
      icon: Activity,
      isLive: catapult.isLive,
      loading: catapult.loading,
      error: catapult.error,
      detail: catapult.isLive
        ? `${catapult.athletes.length} athletes · ${catapult.activities.length} activities`
        : catapult.error || 'Disconnected',
    },
    {
      id: 'gymaware',
      name: 'GymAware Cloud',
      icon: Dumbbell,
      isLive: gymAware.isLive,
      loading: gymAware.loading,
      error: gymAware.error,
      detail: gymAware.isLive
        ? `${gymAware.athleteCount} athletes`
        : gymAware.error || 'Disconnected',
    },
    {
      id: 'fivb',
      name: 'FIVB VIS',
      icon: Globe,
      isLive: true, // FIVB VIS is always available (public XML API)
      loading: false,
      error: null,
      detail: 'Public XML API — always available',
    },
  ];

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="p-6 lg:p-8 space-y-6">

      {/* ── Page Header ──────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold font-heading flex items-center gap-2">
          <Database className="w-6 h-6 text-primary" />
          Data Sources
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage integrations, monitor live connections, and view the unified athlete registry.
        </p>
      </div>

      {/* ── Tabs: Connections / Athlete Registry / Match Status ── */}
      <Tabs defaultValue="connections">
        <TabsList variant="line" className="mb-4">
          <TabsTrigger value="connections">
            <Wifi className="w-3.5 h-3.5 mr-1.5" />
            Live Connections
          </TabsTrigger>
          <TabsTrigger value="registry">
            <Users className="w-3.5 h-3.5 mr-1.5" />
            Athlete Registry
          </TabsTrigger>
          <TabsTrigger value="matching">
            <Link2 className="w-3.5 h-3.5 mr-1.5" />
            Match Status
          </TabsTrigger>
        </TabsList>

        {/* ────────────────────────────────────────────────── */}
        {/* TAB 1: Live Connections                            */}
        {/* ────────────────────────────────────────────────── */}
        <TabsContent value="connections" className="space-y-6">

          {/* Live API connections */}
          <div className="grid md:grid-cols-3 gap-4">
            {liveConnections.map((conn, i) => (
              <motion.div
                key={conn.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="bg-transparent border-border">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <conn.icon className="w-4 h-4 text-primary" />
                        <CardTitle className="text-sm">{conn.name}</CardTitle>
                      </div>
                      {conn.loading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      ) : conn.isLive ? (
                        <Badge variant="outline" className="text-teal border-teal/30 bg-teal/10 text-[10px]">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          LIVE
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-[10px]">
                          <WifiOff className="w-3 h-3 mr-1" />
                          OFFLINE
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">{conn.detail}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Static data sources (from mockData) */}
          <div>
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Database className="w-4 h-4 text-primary" />
              All Configured Data Sources
            </h2>
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
              {dataSources.map((ds, i) => (
                <motion.div
                  key={ds.id}
                  className="glass-card rounded-xl p-4 hover:border-primary/30 transition-all duration-300"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-sm font-medium">{ds.name}</h3>
                    <Badge
                      variant={
                        ds.status === 'connected' ? 'outline' : ds.status === 'error' ? 'destructive' : 'secondary'
                      }
                      className={
                        ds.status === 'connected'
                          ? 'text-teal border-teal/30 bg-teal/10 text-[10px]'
                          : ds.status === 'error'
                            ? 'text-[10px]'
                            : 'text-[10px]'
                      }
                    >
                      {ds.status === 'connected' ? 'Connected' : ds.status === 'error' ? 'Error' : 'Available'}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">
                    {ds.description}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span className="uppercase tracking-wider">{ds.category}</span>
                    {ds.recordCount && (
                      <span className="stat-number">{ds.recordCount.toLocaleString()} records</span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* ────────────────────────────────────────────────── */}
        {/* TAB 2: Athlete Registry                            */}
        {/* ────────────────────────────────────────────────── */}
        <TabsContent value="registry" className="space-y-4">

          {/* Summary stats */}
          {matchStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Total Athletes', value: matchStats.total, color: 'text-foreground' },
                { label: 'Matched', value: matchStats.matched, color: 'text-teal' },
                { label: 'Unmatched (Catapult)', value: matchStats.unmatchedCatapult, color: 'text-primary' },
                { label: 'Match Rate', value: `${matchStats.matchRate}%`, color: 'text-primary' },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  className="glass-card rounded-xl p-4 text-center"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <p className={`stat-number text-2xl ${stat.color}`}>{stat.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          )}

          {/* Search and filter */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search athletes..."
                value={athleteSearch}
                onChange={(e) => setAthleteSearch(e.target.value)}
                className="pl-9 bg-secondary border-border"
              />
            </div>
            <Select value={athleteFilter} onValueChange={(v) => setAthleteFilter(v as typeof athleteFilter)}>
              <SelectTrigger className="w-44 bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="all">All Athletes</SelectItem>
                <SelectItem value="matched">Matched Only</SelectItem>
                <SelectItem value="unmatched">Unmatched Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Athlete table */}
          {linkedLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="ml-2 text-sm text-muted-foreground">Loading athlete registry...</span>
            </div>
          ) : linkedError ? (
            <div className="glass-card rounded-xl p-6 text-center">
              <AlertTriangle className="w-8 h-8 text-destructive mx-auto mb-2" />
              <p className="text-sm text-destructive">{linkedError}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Make sure the backend server is running on {import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000'}
              </p>
            </div>
          ) : (
            <Card className="bg-transparent border-border">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Catapult ID</TableHead>
                      <TableHead>GymAware Ref</TableHead>
                      <TableHead>Match Method</TableHead>
                      <TableHead>Confidence</TableHead>
                      <TableHead>Platforms</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAthletes.map((athlete, i) => (
                      <TableRow key={athlete.id}>
                        <TableCell className="font-medium">{athlete.name}</TableCell>
                        <TableCell className="stat-number text-xs text-muted-foreground">
                          {athlete.catapultId.slice(0, 8)}...
                        </TableCell>
                        <TableCell className="stat-number text-xs">
                          {athlete.gymAwareRef || '—'}
                        </TableCell>
                        <TableCell>
                          {athlete.matchMethod ? (
                            <Badge variant="secondary" className="text-[10px]">
                              {athlete.matchMethod}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {athlete.matchConfidence != null ? (
                            <span className={`stat-number text-xs ${
                              athlete.matchConfidence >= 90 ? 'text-teal' :
                              athlete.matchConfidence >= 70 ? 'text-primary' : 'text-destructive'
                            }`}>
                              {athlete.matchConfidence}%
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {athlete.hasCatapult && (
                              <Badge variant="outline" className="text-[9px] border-primary/30 text-primary">
                                CAT
                              </Badge>
                            )}
                            {athlete.hasGymAware && (
                              <Badge variant="outline" className="text-[9px] border-teal/30 text-teal">
                                GYM
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredAthletes.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No athletes match your filters.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ────────────────────────────────────────────────── */}
        {/* TAB 3: Match Status                                */}
        {/* ────────────────────────────────────────────────── */}
        <TabsContent value="matching" className="space-y-4">

          {matchStatusLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="ml-2 text-sm text-muted-foreground">Loading match status...</span>
            </div>
          ) : matchStatusData ? (
            <>
              {/* Match method breakdown */}
              <div className="glass-card rounded-xl p-5">
                <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-primary" />
                  Matching Algorithm Breakdown
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {Object.entries(matchStatusData.matchStats.byMethod).map(([method, count], i) => (
                    <motion.div
                      key={method}
                      className="text-center p-3 rounded-lg bg-secondary/50"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <p className="stat-number text-xl text-foreground">{count}</p>
                      <p className="text-[10px] text-muted-foreground mt-1 capitalize">
                        {method.replace('_', ' ')}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Unmatched athletes */}
              {matchStatusData.unmatchedCatapult.length > 0 && (
                <Card className="bg-transparent border-border">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-primary" />
                      Unmatched Catapult Athletes ({matchStatusData.unmatchedCatapult.length})
                    </CardTitle>
                    <CardDescription>
                      These Catapult athletes could not be matched to a GymAware profile.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Catapult Name</TableHead>
                          <TableHead>Catapult ID</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {matchStatusData.unmatchedCatapult.map((a, i) => (
                          <TableRow key={i}>
                            <TableCell>{a.catapultName || '—'}</TableCell>
                            <TableCell className="stat-number text-xs text-muted-foreground">
                              {a.catapultId || '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {matchStatusData.unmatchedGymAware.length > 0 && (
                <Card className="bg-transparent border-border">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-teal" />
                      Unmatched GymAware Athletes ({matchStatusData.unmatchedGymAware.length})
                    </CardTitle>
                    <CardDescription>
                      These GymAware athletes could not be matched to a Catapult profile.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>GymAware Name</TableHead>
                          <TableHead>GymAware Ref</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {matchStatusData.unmatchedGymAware.map((a, i) => (
                          <TableRow key={i}>
                            <TableCell>{a.gymAwareName || '—'}</TableCell>
                            <TableCell className="stat-number text-xs text-muted-foreground">
                              {a.gymAwareRef || '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <div className="glass-card rounded-xl p-6 text-center">
              <AlertTriangle className="w-8 h-8 text-destructive mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Could not load match status. Make sure the backend is running.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}