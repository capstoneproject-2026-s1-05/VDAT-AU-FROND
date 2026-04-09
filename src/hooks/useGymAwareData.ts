/**
 * useGymAwareData — React hooks for fetching real GymAware Cloud data
 *
 * Strategy:
 *   1. On mount, check if the backend GymAware API is available
 *   2. If available, fetch real data from /api/gymaware-live/*
 *   3. If unavailable, set `disconnected` state — NO mock fallback
 *   4. Expose loading/error/disconnected states and a `isLive` flag to the UI
 *
 * Usage:
 *   const { isLive, disconnected, loading, error, athleteCount } = useGymAwareData();
 *   const { summary, loading, error } = useGymAwareSummary(gymAwareRef);
 *   const { profile, loading, error } = useGymAwareLoadVelocity(gymAwareRef, exercise);
 */

import { useState, useEffect, useRef } from 'react';
import {
  isGymAwareAvailable,
  getGymAwareAthletes,
  getGymAwareAthleteSummary,
  getGymAwareAthleteReps,
  getGymAwareLoadVelocityProfile,
  getGymAwareExercises,
  transformToStrengthRecords,
  type GymAwareAthlete,
  type GymAwareAthleteSummary,
  type GymAwareRep,
  type GymAwareLoadVelocityProfile,
  type GymAwareExercise,
} from '@/lib/gymAwareApi';
import type { StrengthRecord } from '@/lib/mockData';

// ============================================================
// Types
// ============================================================

interface GymAwareDataState {
  /** Whether the backend GymAware API is reachable and returned data */
  isLive: boolean;
  /** Whether the backend is confirmed unreachable */
  disconnected: boolean;
  /** Whether data is currently being fetched */
  loading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Total number of athletes in GymAware */
  athleteCount: number;
}

// ============================================================
// Hook: useGymAwareData (connection check)
// ============================================================

export function useGymAwareData() {
  const [state, setState] = useState<GymAwareDataState>({
    isLive: false,
    disconnected: false,
    loading: true,
    error: null,
    athleteCount: 0,
  });

  const checkedRef = useRef(false);

  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;

    async function init() {
      try {
        const available = await isGymAwareAvailable();

        if (available) {
          const athletes = await getGymAwareAthletes();
          setState({
            isLive: true,
            disconnected: false,
            loading: false,
            error: null,
            athleteCount: athletes.length,
          });
        } else {
          setState({
            isLive: false,
            disconnected: true,
            loading: false,
            error: 'GymAware API is not reachable. Check backend connection.',
            athleteCount: 0,
          });
        }
      } catch (err) {
        setState({
          isLive: false,
          disconnected: true,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to connect to GymAware API',
          athleteCount: 0,
        });
      }
    }

    init();
  }, []);

  return state;
}

// ============================================================
// Hook: useGymAwareSummary
// ============================================================

/**
 * Fetch a strength summary for a GymAware athlete.
 * Returns exercise-level aggregations with peak/avg metrics.
 */
export function useGymAwareSummary(
  gymAwareRef: string | number | null,
  options?: { startDate?: string; endDate?: string }
) {
  const [summary, setSummary] = useState<GymAwareAthleteSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    if (!gymAwareRef) {
      setSummary(null);
      return;
    }

    setLoading(true);
    setError(null);

    getGymAwareAthleteSummary(gymAwareRef, optionsRef.current)
      .then(data => {
        setSummary(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [gymAwareRef]);

  return { summary, loading, error };
}

// ============================================================
// Hook: useGymAwareReps
// ============================================================

/**
 * Fetch reps for a GymAware athlete, transformed into StrengthRecords.
 */
export function useGymAwareReps(
  gymAwareRef: string | number | null,
  options?: { startDate?: string; endDate?: string }
) {
  const [reps, setReps] = useState<GymAwareRep[]>([]);
  const [strengthRecords, setStrengthRecords] = useState<StrengthRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    if (!gymAwareRef) {
      setReps([]);
      setStrengthRecords([]);
      return;
    }

    setLoading(true);
    setError(null);

    getGymAwareAthleteReps(gymAwareRef, optionsRef.current)
      .then(data => {
        setReps(data);
        setStrengthRecords(transformToStrengthRecords(data));
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [gymAwareRef]);

  return { reps, strengthRecords, loading, error };
}

// ============================================================
// Hook: useGymAwareLoadVelocity
// ============================================================

/**
 * Fetch a load-velocity profile for an athlete on a specific exercise.
 */
export function useGymAwareLoadVelocity(
  gymAwareRef: string | number | null,
  exercise: string | null,
  options?: { startDate?: string; endDate?: string }
) {
  const [profile, setProfile] = useState<GymAwareLoadVelocityProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    if (!gymAwareRef || !exercise) {
      setProfile(null);
      return;
    }

    setLoading(true);
    setError(null);

    getGymAwareLoadVelocityProfile(gymAwareRef, exercise, optionsRef.current)
      .then(data => {
        setProfile(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [gymAwareRef, exercise]);

  return { profile, loading, error };
}

// ============================================================
// Hook: useGymAwareExercises
// ============================================================

/**
 * Fetch all unique exercises from GymAware reps data.
 */
export function useGymAwareExercises(
  options?: { startDate?: string; endDate?: string }
) {
  const [exercises, setExercises] = useState<GymAwareExercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    setLoading(true);
    setError(null);

    getGymAwareExercises(optionsRef.current)
      .then(data => {
        setExercises(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return { exercises, loading, error };
}