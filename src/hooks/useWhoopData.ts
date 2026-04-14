/**
 * WHOOP Data Hooks
 *
 * React hooks for fetching and managing WHOOP physiological data.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  isWhoopAvailable,
  getWhoopStatus,
  getWhoopOverview,
  type WhoopStatus,
  type WhoopOverview,
  type WhoopRecoveryRecord,
  type WhoopSleepRecord,
  type WhoopCycleRecord,
} from '../lib/whoopApi';

// ============================================================
// useWhoopConnection — Check WHOOP availability and status
// ============================================================

export interface WhoopConnectionState {
  available: boolean;
  status: WhoopStatus | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useWhoopConnection(): WhoopConnectionState {
  const [available, setAvailable] = useState(false);
  const [status, setStatus] = useState<WhoopStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const isAvail = await isWhoopAvailable();
      setAvailable(isAvail);

      if (isAvail) {
        const s = await getWhoopStatus();
        setStatus(s);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check WHOOP status');
      setAvailable(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return { available, status, loading, error, refresh: fetchStatus };
}

// ============================================================
// useWhoopOverview — Combined dashboard data
// ============================================================

export interface WhoopOverviewState {
  data: WhoopOverview | null;
  connected: boolean;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => void;
}

export function useWhoopOverview(userId?: string, autoRefreshMs = 60000): WhoopOverviewState {
  const [data, setData] = useState<WhoopOverview | null>(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const resp = await getWhoopOverview(userId);
      setData(resp.data);
      setConnected(resp.connected);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch WHOOP data');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();

    if (autoRefreshMs > 0) {
      intervalRef.current = setInterval(fetchData, autoRefreshMs);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData, autoRefreshMs]);

  return { data, connected, loading, error, lastUpdated, refresh: fetchData };
}

// ============================================================
// Utility: Transform WHOOP data to RecoveryRecord format
// ============================================================

export interface TransformedRecoveryDay {
  date: string;
  recoveryScore: number;
  hrv: number;
  restingHR: number;
  spo2: number;
  skinTemp: number;
  strain: number;
  avgHR: number;
  maxHR: number;
  kilojoule: number;
  sleepPerformance: number;
  sleepEfficiency: number;
  sleepConsistency: number;
  sleepHours: number;
  remSleepHours: number;
  deepSleepHours: number;
  lightSleepHours: number;
  awakeHours: number;
  respiratoryRate: number;
}

/**
 * Transform raw WHOOP overview data into a unified daily record array.
 * Merges recovery, sleep, and cycle data by matching cycle_id.
 */
export function transformOverviewToDaily(overview: WhoopOverview): TransformedRecoveryDay[] {
  const cycleMap = new Map<number, WhoopCycleRecord>();
  for (const c of overview.cycles) {
    cycleMap.set(c.id, c);
  }

  const sleepMap = new Map<number, WhoopSleepRecord>();
  for (const s of overview.sleep) {
    if (!s.nap && s.score_state === 'SCORED') {
      sleepMap.set(s.cycle_id, s);
    }
  }

  const days: TransformedRecoveryDay[] = [];

  for (const rec of overview.recovery) {
    if (rec.score_state !== 'SCORED' || !rec.score) continue;

    const cycle = cycleMap.get(rec.cycle_id);
    const sleep = sleepMap.get(rec.cycle_id);

    const milliToHours = (ms: number) => Math.round((ms / 3600000) * 100) / 100;

    days.push({
      date: cycle?.start?.split('T')[0] || rec.created_at.split('T')[0],
      recoveryScore: rec.score.recovery_score,
      hrv: Math.round(rec.score.hrv_rmssd_milli * 100) / 100,
      restingHR: rec.score.resting_heart_rate,
      spo2: rec.score.spo2_percentage,
      skinTemp: rec.score.skin_temp_celsius,
      strain: cycle?.score?.strain ? Math.round(cycle.score.strain * 100) / 100 : 0,
      avgHR: cycle?.score?.average_heart_rate || 0,
      maxHR: cycle?.score?.max_heart_rate || 0,
      kilojoule: cycle?.score?.kilojoule ? Math.round(cycle.score.kilojoule) : 0,
      sleepPerformance: sleep?.score?.sleep_performance_percentage || 0,
      sleepEfficiency: sleep?.score?.sleep_efficiency_percentage ? Math.round(sleep.score.sleep_efficiency_percentage * 10) / 10 : 0,
      sleepConsistency: sleep?.score?.sleep_consistency_percentage || 0,
      sleepHours: sleep?.score?.stage_summary
        ? milliToHours(
            (sleep.score.stage_summary.total_light_sleep_time_milli || 0) +
            (sleep.score.stage_summary.total_slow_wave_sleep_time_milli || 0) +
            (sleep.score.stage_summary.total_rem_sleep_time_milli || 0)
          )
        : 0,
      remSleepHours: sleep?.score?.stage_summary
        ? milliToHours(sleep.score.stage_summary.total_rem_sleep_time_milli || 0)
        : 0,
      deepSleepHours: sleep?.score?.stage_summary
        ? milliToHours(sleep.score.stage_summary.total_slow_wave_sleep_time_milli || 0)
        : 0,
      lightSleepHours: sleep?.score?.stage_summary
        ? milliToHours(sleep.score.stage_summary.total_light_sleep_time_milli || 0)
        : 0,
      awakeHours: sleep?.score?.stage_summary
        ? milliToHours(sleep.score.stage_summary.total_awake_time_milli || 0)
        : 0,
      respiratoryRate: sleep?.score?.respiratory_rate
        ? Math.round(sleep.score.respiratory_rate * 10) / 10
        : 0,
    });
  }

  return days.sort((a, b) => b.date.localeCompare(a.date));
}
