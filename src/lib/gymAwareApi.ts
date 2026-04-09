/**
 * GymAware Cloud API Client
 *
 * Connects to the Volleyball Toolkit Backend's /api/gymaware-live/* endpoints
 * which proxy real GymAware Cloud API data for strength testing and
 * load-velocity profiling.
 *
 * Features:
 *   - Type-safe responses matching GymAware Cloud data structures
 *   - Strength summary with exercise-level aggregation
 *   - Load-velocity profiling with estimated 1RM
 *   - Exercise classification (lower body, upper body, olympic, jump, etc.)
 *
 * Backend endpoints: /api/gymaware-live/*
 */

const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

// ============================================================
// GymAware API Types
// ============================================================

export interface GymAwareAthlete {
  reference: number | string;
  firstName: string;
  lastName: string;
  displayName: string;
  gender: string | null;
  dateOfBirth: string | null;
  teams: string[];
  source: 'gymaware';
}

export interface GymAwareRep {
  // Identity
  reference: number | string;
  personReference: number | string;
  personName: string;

  // Exercise info
  exerciseName: string;
  exerciseType: ExerciseType;
  timestamp: string;

  // Concentric metrics (lifting phase)
  concentricMeanForce: number | null;
  concentricPeakForce: number | null;
  concentricMeanVelocity: number | null;
  concentricPeakVelocity: number | null;
  concentricMeanPower: number | null;
  concentricPeakPower: number | null;
  concentricRFD: number | null;
  concentricDuration: number | null;
  concentricROM: number | null;

  // Eccentric metrics (lowering phase)
  eccentricMeanForce: number | null;
  eccentricPeakForce: number | null;
  eccentricMeanVelocity: number | null;
  eccentricPeakVelocity: number | null;
  eccentricMeanPower: number | null;
  eccentricPeakPower: number | null;
  eccentricDuration: number | null;
  eccentricROM: number | null;

  // Jump metrics
  jumpHeight: number | null;
  RSI: number | null;
  contactTime: number | null;
  flightTime: number | null;

  // Load
  load: number | null;
  bodyMass: number | null;
  repNumber: number | null;
  setNumber: number | null;

  // Tags and metadata
  tags: string[];
  notes: string;

  source: 'gymaware';
}

export type ExerciseType =
  | 'lower_body'
  | 'upper_body'
  | 'olympic'
  | 'posterior_chain'
  | 'jump'
  | 'pull'
  | 'unilateral'
  | 'other';

export interface GymAwareExercise {
  name: string;
  type: ExerciseType;
  count: number;
}

export interface GymAwareExerciseSummary {
  name: string;
  type: ExerciseType;
  repCount: number;
  metrics: {
    peakForce: number | null;
    avgForce: number | null;
    peakPower: number | null;
    avgPower: number | null;
    peakVelocity: number | null;
    avgVelocity: number | null;
    maxLoad: number | null;
    avgJumpHeight: number | null;
    peakJumpHeight: number | null;
  };
}

export interface GymAwareAthleteSummary {
  athleteRef: number | string;
  totalReps: number;
  totalSessions: number;
  exercises: GymAwareExerciseSummary[];
  latestSession: string | null;
  dateRange: {
    earliest: string | null;
    latest: string | null;
  };
  source: 'gymaware';
}

export interface GymAwareLoadVelocityPoint {
  load: number;
  meanVelocity: number;
  bestVelocity: number;
  reps: number;
}

export interface GymAwareLoadVelocityProfile {
  athleteRef: number | string;
  exerciseName: string;
  dataPoints: GymAwareLoadVelocityPoint[];
  estimated1RM: number | null;
  mvt: number;
  repsAnalysed: number;
  source: 'gymaware';
}

export interface GymAwareStatus {
  status: 'live' | 'error';
  athleteCount: number;
  message?: string;
  source: 'gymaware';
}

// ============================================================
// Generic API Fetch
// ============================================================

async function gymAwareFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(`${API_BASE}/api/gymaware-live${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(
        (errorBody as { message?: string }).message ||
          `HTTP ${response.status}: ${response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Request timeout — GymAware API did not respond within 30s');
    }
    throw error;
  }
}

// ============================================================
// Athletes
// ============================================================

/**
 * Fetch all athletes from GymAware Cloud.
 * Note: GymAware is shared across all SASI sports (~790 athletes).
 */
export async function getGymAwareAthletes(search?: string): Promise<GymAwareAthlete[]> {
  const qs = search ? `?search=${encodeURIComponent(search)}` : '';
  const res = await gymAwareFetch<{ data: GymAwareAthlete[]; total: number }>(
    `/athletes${qs}`
  );
  return res.data;
}

/**
 * Fetch a single athlete by GymAware reference ID.
 */
export async function getGymAwareAthlete(ref: string | number): Promise<GymAwareAthlete> {
  const res = await gymAwareFetch<{ data: GymAwareAthlete }>(`/athletes/${ref}`);
  return res.data;
}

// ============================================================
// Reps (Exercise Data)
// ============================================================

/**
 * Fetch reps for a specific athlete.
 */
export async function getGymAwareAthleteReps(
  ref: string | number,
  options?: { startDate?: string; endDate?: string }
): Promise<GymAwareRep[]> {
  const params = new URLSearchParams();
  if (options?.startDate) params.set('startDate', options.startDate);
  if (options?.endDate) params.set('endDate', options.endDate);
  const qs = params.toString();
  const res = await gymAwareFetch<{ data: GymAwareRep[]; total: number }>(
    `/athletes/${ref}/reps${qs ? `?${qs}` : ''}`
  );
  return res.data;
}

/**
 * Fetch all reps across all athletes.
 */
export async function getGymAwareReps(
  options?: { startDate?: string; endDate?: string }
): Promise<GymAwareRep[]> {
  const params = new URLSearchParams();
  if (options?.startDate) params.set('startDate', options.startDate);
  if (options?.endDate) params.set('endDate', options.endDate);
  const qs = params.toString();
  const res = await gymAwareFetch<{ data: GymAwareRep[]; total: number }>(
    `/reps${qs ? `?${qs}` : ''}`
  );
  return res.data;
}

// ============================================================
// Exercises
// ============================================================

/**
 * Fetch all unique exercises from the reps data.
 */
export async function getGymAwareExercises(
  options?: { startDate?: string; endDate?: string }
): Promise<GymAwareExercise[]> {
  const params = new URLSearchParams();
  if (options?.startDate) params.set('startDate', options.startDate);
  if (options?.endDate) params.set('endDate', options.endDate);
  const qs = params.toString();
  const res = await gymAwareFetch<{ data: GymAwareExercise[]; total: number }>(
    `/exercises${qs ? `?${qs}` : ''}`
  );
  return res.data;
}

// ============================================================
// Athlete Summary & Load-Velocity Profile
// ============================================================

/**
 * Fetch a strength summary for an athlete.
 * Aggregates reps into exercise-level summaries with peak/avg metrics.
 */
export async function getGymAwareAthleteSummary(
  ref: string | number,
  options?: { startDate?: string; endDate?: string }
): Promise<GymAwareAthleteSummary> {
  const params = new URLSearchParams();
  if (options?.startDate) params.set('startDate', options.startDate);
  if (options?.endDate) params.set('endDate', options.endDate);
  const qs = params.toString();
  const res = await gymAwareFetch<{ data: GymAwareAthleteSummary }>(
    `/athletes/${ref}/summary${qs ? `?${qs}` : ''}`
  );
  return res.data;
}

/**
 * Fetch a load-velocity profile for an athlete on a specific exercise.
 * Used for estimating 1RM and tracking strength development.
 */
export async function getGymAwareLoadVelocityProfile(
  ref: string | number,
  exercise: string,
  options?: { startDate?: string; endDate?: string }
): Promise<GymAwareLoadVelocityProfile> {
  const params = new URLSearchParams({ exercise });
  if (options?.startDate) params.set('startDate', options.startDate);
  if (options?.endDate) params.set('endDate', options.endDate);
  const res = await gymAwareFetch<{ data: GymAwareLoadVelocityProfile }>(
    `/athletes/${ref}/load-velocity?${params.toString()}`
  );
  return res.data;
}

// ============================================================
// Status & Cache
// ============================================================

/**
 * Fetch GymAware API connection status.
 */
export async function getGymAwareStatus(): Promise<GymAwareStatus> {
  const res = await gymAwareFetch<{ data: GymAwareStatus }>('/status');
  return res.data;
}

/**
 * Clear the backend GymAware API cache.
 */
export async function clearGymAwareCache(): Promise<void> {
  await gymAwareFetch('/cache/clear');
}

// ============================================================
// Connection Check
// ============================================================

/**
 * Check if the GymAware Live API backend is reachable.
 * Returns true if the backend responds, false otherwise.
 */
export async function isGymAwareAvailable(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(`${API_BASE}/api/gymaware-live/status`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!response.ok) return false;
    const body = await response.json();
    return body?.data?.status === 'live';
  } catch {
    return false;
  }
}

// ============================================================
// Data Transformation: GymAware → Frontend Types
// ============================================================

import type { StrengthRecord } from './mockData';

/**
 * Transform GymAware reps into the frontend's StrengthRecord format.
 * This allows existing Strength & Power page components to work with real data.
 */
export function transformToStrengthRecords(reps: GymAwareRep[]): StrengthRecord[] {
  return reps
    .filter(r => r.exerciseName && r.timestamp)
    .map(r => {
      const testType = classifyTestType(r.exerciseName);
      return {
        date: r.timestamp.split('T')[0],
        testType,
        jumpHeight: r.jumpHeight != null ? r.jumpHeight * 100 : undefined, // m → cm
        peakForce: r.concentricPeakForce ?? undefined,
        peakPower: r.concentricPeakPower ?? undefined,
        rfd: r.concentricRFD ?? undefined,
        meanVelocity: r.concentricMeanVelocity ?? undefined,
        load: r.load ?? undefined,
        estimated1RM: undefined, // Calculated at profile level, not per-rep
      };
    });
}

/**
 * Classify a GymAware exercise name into a StrengthRecord testType.
 */
function classifyTestType(
  exerciseName: string
): StrengthRecord['testType'] {
  const lower = exerciseName.toLowerCase();

  if (lower.includes('cmj') || lower.includes('counter movement') || lower.includes('countermovement')) {
    return 'cmj';
  }
  if (lower.includes('squat jump') || lower.includes('sj')) {
    return 'squat_jump';
  }
  if (lower.includes('imtp') || lower.includes('isometric')) {
    return 'imtp';
  }
  if (lower.includes('nord') || lower.includes('hamstring')) {
    return 'nordboard';
  }

  // Any exercise with load data is load-velocity
  return 'load_velocity';
}