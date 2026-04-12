/**
 * useValdData — React hooks for fetching VALD ForceDecks CMJ data
 *
 * Strategy:
 *   1. On mount, check if the backend VALD API is available
 *   2. If available, fetch real data from /api/vald-live/*
 *   3. If unavailable, set `disconnected` state — NO mock fallback
 *   4. Expose loading/error/disconnected states and a `isLive` flag to the UI
 *
 * Usage:
 *   const { isLive, disconnected, loading } = useValdData();
 *   const { summary, loading, error } = useValdCMJSummary(athleteName);
 *   const { trend, loading, error } = useValdCMJTrend(athleteName);
 */

import { useState, useEffect, useRef } from 'react';
import {
  isValdAvailable,
  getValdCMJSummary,
  getValdCMJTrend,
  type ValdCMJSummary,
  type ValdCMJTrendPoint,
} from '@/lib/valdApi';

// ============================================================
// Types
// ============================================================

interface ValdDataState {
  /** Whether the backend VALD API is reachable */
  isLive: boolean;
  /** Whether the backend is confirmed unreachable */
  disconnected: boolean;
  /** Whether data is currently being fetched */
  loading: boolean;
  /** Error message if fetch failed */
  error: string | null;
}

// ============================================================
// Hook: useValdData (connection check)
// ============================================================

export function useValdData() {
  const [state, setState] = useState<ValdDataState>({
    isLive: false,
    disconnected: false,
    loading: true,
    error: null,
  });

  const checkedRef = useRef(false);

  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;

    async function init() {
      try {
        const available = await isValdAvailable();
        setState({
          isLive: available,
          disconnected: !available,
          loading: false,
          error: available ? null : 'VALD API is not reachable.',
        });
      } catch (err) {
        setState({
          isLive: false,
          disconnected: true,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to connect to VALD API',
        });
      }
    }

    init();
  }, []);

  return state;
}

// ============================================================
// Hook: useValdCMJSummary
// ============================================================

/**
 * Fetch CMJ summary for an athlete by name.
 * Returns best/avg metrics, asymmetry, and test metadata.
 */
export function useValdCMJSummary(athleteName: string | null) {
  const [summary, setSummary] = useState<ValdCMJSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!athleteName) {
      setSummary(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    getValdCMJSummary(athleteName)
      .then(data => {
        if (!cancelled) {
          setSummary(data);
          setLoading(false);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [athleteName]);

  return { summary, loading, error };
}

// ============================================================
// Hook: useValdCMJTrend
// ============================================================

/**
 * Fetch CMJ trend data for an athlete by name.
 * Returns jump height, peak force, and RSI over time.
 */
export function useValdCMJTrend(athleteName: string | null) {
  const [trend, setTrend] = useState<ValdCMJTrendPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!athleteName) {
      setTrend([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    getValdCMJTrend(athleteName)
      .then(data => {
        if (!cancelled) {
          setTrend(data);
          setLoading(false);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [athleteName]);

  return { trend, loading, error };
}
