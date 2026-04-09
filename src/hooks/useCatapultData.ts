/**
 * useCatapultData — React hook for fetching real Catapult data
 *
 * Strategy:
 *   1. On mount, check if the backend Catapult API is available
 *   2. If available, fetch real data from /api/catapult-live/*
 *   3. If unavailable, set `disconnected` state — NO mock fallback
 *   4. Expose loading/error/disconnected states and a `isLive` flag to the UI
 *
 * Usage:
 *   const { athletes, activities, isLive, disconnected, loading, error } = useCatapultData();
 */

import { useState, useEffect, useRef } from 'react';
import {
  isCatapultAvailable,
  getCatapultAthletes,
  getCatapultActivities,
  getCatapultGroupSummary,
  getCatapultLongitudinal,
  getCatapultEnhancedStats,
  getCatapultEvents,
  getCatapultJumpProfile,
  getCatapultEffortAnalysis,
  transformCatapultAthlete,
  transformLongitudinalToSessions,
  type CatapultAthlete,
  type CatapultActivity,
  type CatapultGroupSummary,
  type CatapultLongitudinalPoint,
  type CatapultEnhancedStats,
  type CatapultIMAEvent,
  type CatapultJumpProfile,
  type CatapultEffortAnalysis,
} from '@/lib/catapultApi';
import type { Player, TrainingSession } from '@/lib/mockData';

// ============================================================
// Types
// ============================================================

interface CatapultDataState {
  /** Whether the backend Catapult API is reachable and returned data */
  isLive: boolean;
  /** Whether the backend is confirmed unreachable */
  disconnected: boolean;
  /** Whether data is currently being fetched */
  loading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Athletes from Catapult (empty when disconnected) */
  athletes: CatapultAthlete[];
  /** Activities from Catapult (empty when disconnected) */
  activities: CatapultActivity[];
}

// ============================================================
// Hook: useCatapultData
// ============================================================

export function useCatapultData() {
  const [state, setState] = useState<CatapultDataState>({
    isLive: false,
    disconnected: false,
    loading: true,
    error: null,
    athletes: [],
    activities: [],
  });

  const checkedRef = useRef(false);

  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;

    async function init() {
      try {
        const available = await isCatapultAvailable();

        if (available) {
          const [athletes, activities] = await Promise.all([
            getCatapultAthletes(),
            getCatapultActivities(1, 25),
          ]);

          setState({
            isLive: true,
            disconnected: false,
            loading: false,
            error: null,
            athletes,
            activities,
          });
        } else {
          // Backend not reachable — DISCONNECTED, no mock fallback
          setState({
            isLive: false,
            disconnected: true,
            loading: false,
            error: 'Backend API is not reachable. Start the backend server to connect to Catapult.',
            athletes: [],
            activities: [],
          });
        }
      } catch (err) {
        setState({
          isLive: false,
          disconnected: true,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to connect to Catapult API',
          athletes: [],
          activities: [],
        });
      }
    }

    init();
  }, []);

  return state;
}

// ============================================================
// Hook: useCatapultGroupSummary
// ============================================================

export function useCatapultGroupSummary(activityId: string | null) {
  const [data, setData] = useState<CatapultGroupSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activityId) return;

    setLoading(true);
    setError(null);

    getCatapultGroupSummary(activityId)
      .then(summary => {
        setData(summary);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [activityId]);

  return { data, loading, error };
}

// ============================================================
// Hook: useCatapultLongitudinal
// ============================================================

export function useCatapultLongitudinal(
  athleteId: string | null,
  options?: { activityIds?: string[]; pageSize?: number }
) {
  const [data, setData] = useState<CatapultLongitudinalPoint[]>([]);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stabilize options reference
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    if (!athleteId) return;

    setLoading(true);
    setError(null);

    getCatapultLongitudinal(athleteId, optionsRef.current)
      .then(points => {
        setData(points);
        setSessions(transformLongitudinalToSessions(points));
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [athleteId]);

  return { data, sessions, loading, error };
}

// ============================================================
// Hook: useCatapultEnhancedStats
// ============================================================

/**
 * Fetch enhanced statistics for a specific activity.
 * Returns HR zones, velocity bands, accel/decel efforts, metabolic power, load scores.
 */
export function useCatapultEnhancedStats(activityId: string | null) {
  const [data, setData] = useState<CatapultEnhancedStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activityId) return;

    setLoading(true);
    setError(null);

    getCatapultEnhancedStats(activityId)
      .then(stats => {
        setData(stats);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [activityId]);

  return { data, loading, error };
}

// ============================================================
// Hook: useCatapultEvents
// ============================================================

/**
 * Fetch IMA events for an athlete in an activity.
 */
export function useCatapultEvents(athleteId: string | null, activityId: string | null) {
  const [data, setData] = useState<CatapultIMAEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!athleteId || !activityId) return;

    setLoading(true);
    setError(null);

    getCatapultEvents(athleteId, activityId)
      .then(events => {
        setData(events);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [athleteId, activityId]);

  return { data, loading, error };
}

// ============================================================
// Hook: useCatapultJumpProfile
// ============================================================

/**
 * Fetch volleyball-specific jump profile analysis from IMA events.
 */
export function useCatapultJumpProfile(athleteId: string | null, activityId: string | null) {
  const [data, setData] = useState<CatapultJumpProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!athleteId || !activityId) return;

    setLoading(true);
    setError(null);

    getCatapultJumpProfile(athleteId, activityId)
      .then(profile => {
        setData(profile);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [athleteId, activityId]);

  return { data, loading, error };
}

// ============================================================
// Hook: useCatapultEffortAnalysis
// ============================================================

/**
 * Fetch categorised effort analysis (velocity vs acceleration efforts).
 */
export function useCatapultEffortAnalysis(athleteId: string | null, activityId: string | null) {
  const [data, setData] = useState<CatapultEffortAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!athleteId || !activityId) return;

    setLoading(true);
    setError(null);

    getCatapultEffortAnalysis(athleteId, activityId)
      .then(analysis => {
        setData(analysis);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [athleteId, activityId]);

  return { data, loading, error };
}

// ============================================================
// Helper: Get players from Catapult data (no mock fallback)
// ============================================================

export function getMergedPlayers(
  catapultAthletes: CatapultAthlete[],
  isLive: boolean
): Player[] {
  // When not live, return empty — pages should show DISCONNECTED state
  if (!isLive || catapultAthletes.length === 0) {
    return [];
  }

  // Create Catapult athletes as Player objects
  const catapultPlayers: Player[] = catapultAthletes.map(ca => {
    const partial = transformCatapultAthlete(ca);

    return {
      id: ca.id,
      name: `${ca.first_name} ${ca.last_name}`,
      number: partial.number || 0,
      team: 'Volleyball Australia',
      nationality: 'Australia',
      position: partial.position || 'Unknown',
      height: partial.height || 0,
      age: ca.date_of_birth
        ? Math.floor((Date.now() - new Date(ca.date_of_birth).getTime()) / (365.25 * 86400000))
        : 0,
      photo: partial.photo,
      source: 'catapult' as const,
      stats: {
        attackPoints: 0,
        attackAttempts: 0,
        attackPercentage: 0,
        blockPoints: 0,
        blockAttempts: 0,
        serviceAces: 0,
        serviceErrors: 0,
        serviceAttempts: 0,
        receptionExcellent: 0,
        receptionAttempts: 0,
        receptionPercentage: 0,
        digs: 0,
        setAssists: 0,
        totalPoints: 0,
        matchesPlayed: 0,
        setsPlayed: 0,
        pointsPerSet: 0,
      },
      matchHistory: [],
      physicalData: {
        trainingSessions: [],
        strengthRecords: [],
        recoveryRecords: [],
        wellnessRecords: [],
        injuries: [],
      },
    };
  });

  return catapultPlayers;
}