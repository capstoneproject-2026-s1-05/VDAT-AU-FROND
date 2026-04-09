/**
 * useLinkedAthletes — React hooks for unified athlete registry
 *
 * Provides cross-platform athlete data by merging Catapult and GymAware
 * athletes through the backend's intelligent matching algorithm.
 *
 * Strategy:
 *   1. Fetch the unified athlete registry from /api/athletes/linked
 *   2. Expose linked athletes with data availability flags
 *   3. Provide matching statistics for the DataSources page
 *   4. Support jump analysis from Catapult basketball events
 *
 * Usage:
 *   const { athletes, matchStats, loading, error } = useLinkedAthletes();
 *   const { analysis, loading, error } = useJumpAnalysis(athleteId, activityId);
 */

import { useState, useEffect, useRef } from 'react';
import {
  getLinkedAthletes,
  getLinkedAthlete,
  getMatchStatus,
  getAthleteJumpAnalysis,
  getAthleteLongitudinalJumps,
  getActivityJumpAnalysis,
  type LinkedAthlete,
  type MatchStats,
  type MatchStatusResponse,
  type JumpAnalysisResult,
  type LongitudinalJumpResult,
  type ActivityJumpResult,
} from '@/lib/athletesApi';

// ============================================================
// Hook: useLinkedAthletes
// ============================================================

/**
 * Fetch the unified athlete list with cross-references.
 */
export function useLinkedAthletes(options?: {
  search?: string;
  hasGymAware?: boolean;
}) {
  const [athletes, setAthletes] = useState<LinkedAthlete[]>([]);
  const [matchStats, setMatchStats] = useState<MatchStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    setLoading(true);
    setError(null);

    getLinkedAthletes(optionsRef.current)
      .then(res => {
        setAthletes(res.data);
        setMatchStats(res.matchStats);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return { athletes, matchStats, loading, error };
}

// ============================================================
// Hook: useLinkedAthlete (single athlete with enriched data)
// ============================================================

export function useLinkedAthlete(
  catapultId: string | null,
  options?: { startDate?: string; endDate?: string }
) {
  const [athlete, setAthlete] = useState<(LinkedAthlete & { gymAwareSummary: unknown }) | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    if (!catapultId) {
      setAthlete(null);
      return;
    }

    setLoading(true);
    setError(null);

    getLinkedAthlete(catapultId, optionsRef.current)
      .then(res => {
        setAthlete(res.data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [catapultId]);

  return { athlete, loading, error };
}

// ============================================================
// Hook: useMatchStatus
// ============================================================

/**
 * Fetch detailed matching algorithm statistics.
 */
export function useMatchStatus() {
  const [data, setData] = useState<MatchStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    getMatchStatus()
      .then(res => {
        setData(res.data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return { data, loading, error };
}

// ============================================================
// Hook: useJumpAnalysis
// ============================================================

/**
 * Analyse jumps for a single athlete in a single activity.
 */
export function useJumpAnalysis(
  athleteId: string | null,
  activityId: string | null
) {
  const [analysis, setAnalysis] = useState<JumpAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!athleteId || !activityId) {
      setAnalysis(null);
      return;
    }

    setLoading(true);
    setError(null);

    getAthleteJumpAnalysis(athleteId, activityId)
      .then(res => {
        setAnalysis(res.data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [athleteId, activityId]);

  return { analysis, loading, error };
}

// ============================================================
// Hook: useLongitudinalJumps
// ============================================================

/**
 * Analyse jump trends across multiple activities for one athlete.
 */
export function useLongitudinalJumps(
  athleteId: string | null,
  days?: number
) {
  const [data, setData] = useState<LongitudinalJumpResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!athleteId) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    getAthleteLongitudinalJumps(athleteId, days)
      .then(res => {
        setData(res.data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [athleteId, days]);

  return { data, loading, error };
}

// ============================================================
// Hook: useActivityJumps
// ============================================================

/**
 * Analyse jumps for all athletes in a single activity.
 */
export function useActivityJumps(activityId: string | null) {
  const [data, setData] = useState<ActivityJumpResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activityId) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    getActivityJumpAnalysis(activityId)
      .then(res => {
        setData(res.data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [activityId]);

  return { data, loading, error };
}