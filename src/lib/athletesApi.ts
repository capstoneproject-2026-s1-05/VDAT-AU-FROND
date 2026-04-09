/**
 * Unified Athletes & Jump Analysis API Client
 *
 * Connects to the Volleyball Toolkit Backend's /api/athletes/* endpoints
 * for cross-platform athlete matching (Catapult ↔ GymAware) and
 * jump analysis (Node.js rewrite of JumpData-BEACHVB.R).
 *
 * Features:
 *   - Unified athlete registry with cross-references
 *   - Athlete matching statistics and management
 *   - Jump analysis from Catapult basketball events
 *   - Longitudinal jump trend analysis
 *
 * Backend endpoints: /api/athletes/*
 */

const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

// ============================================================
// Unified Athlete Types
// ============================================================

export interface LinkedAthlete {
  /** Primary ID (Catapult UUID) */
  id: string;
  /** Display name (from Catapult) */
  name: string;
  /** Catapult athlete UUID */
  catapultId: string;
  /** GymAware athlete reference (null if not linked) */
  gymAwareRef: number | string | null;
  /** How the match was made */
  matchMethod: 'exact' | 'nickname' | 'fuzzy' | 'prefix' | 'manual_override' | null;
  /** Confidence score 0-1 */
  matchConfidence: number | null;
  /** Data availability flags */
  hasCatapult: boolean;
  hasGymAware: boolean;
}

export interface MatchStats {
  total: number;
  matched: number;
  unmatchedCatapult: number;
  unmatchedGymAware: number;
  matchRate: number;
  byMethod: {
    exact: number;
    nickname: number;
    fuzzy: number;
    prefix: number;
    manual_override: number;
  };
}

export interface UnmatchedAthlete {
  catapultId?: string;
  catapultName?: string;
  gymAwareRef?: number | string;
  gymAwareName?: string;
}

export interface MatchStatusResponse {
  matchStats: MatchStats;
  unmatchedCatapult: UnmatchedAthlete[];
  unmatchedGymAware: UnmatchedAthlete[];
  timestamp: string;
}

// ============================================================
// Jump Analysis Types (from JumpData-BEACHVB.R rewrite)
// ============================================================

export interface JumpAnalysisResult {
  athleteId: string;
  athleteName: string;
  activityId: string;
  totalEvents: number;
  jumpEvents: number;
  movementBreakdown: {
    lowIntensity: number;
    medIntensity: number;
    highIntensity: number;
    jumps: number;
  };
  jumpHeights: {
    min: number;
    max: number;
    mean: number;
    median: number;
    stdDev: number;
  };
  heightDistribution: Array<{
    band: string;
    count: number;
    percentage: number;
  }>;
  timeline: Array<{
    timestamp: string;
    height: number;
    type: string;
  }>;
}

export interface LongitudinalJumpResult {
  athleteId: string;
  athleteName: string;
  activities: Array<{
    activityId: string;
    activityName: string;
    date: string;
    totalJumps: number;
    avgHeight: number;
    maxHeight: number;
    jumpLoad: number;
  }>;
  trend: {
    avgHeightTrend: 'improving' | 'stable' | 'declining';
    jumpCountTrend: 'increasing' | 'stable' | 'decreasing';
  };
}

export interface ActivityJumpResult {
  activityId: string;
  athletes: Array<{
    athleteId: string;
    athleteName: string;
    totalJumps: number;
    avgHeight: number;
    maxHeight: number;
    jumpLoad: number;
  }>;
}

// ============================================================
// Generic API Fetch
// ============================================================

async function athletesFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(`${API_BASE}/api/athletes${endpoint}`, {
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
      throw new Error('Request timeout — Athletes API did not respond within 30s');
    }
    throw error;
  }
}

// ============================================================
// Unified Athletes
// ============================================================

/**
 * Fetch the unified athlete list with cross-references.
 */
export async function getLinkedAthletes(options?: {
  search?: string;
  hasGymAware?: boolean;
}): Promise<{ data: LinkedAthlete[]; total: number; matchStats: MatchStats }> {
  const params = new URLSearchParams();
  if (options?.search) params.set('search', options.search);
  if (options?.hasGymAware) params.set('hasGymAware', 'true');
  const qs = params.toString();
  return athletesFetch(`/linked${qs ? `?${qs}` : ''}`);
}

/**
 * Fetch a single unified athlete with enriched data from all sources.
 */
export async function getLinkedAthlete(
  catapultId: string,
  options?: { startDate?: string; endDate?: string }
): Promise<{ data: LinkedAthlete & { gymAwareSummary: unknown } }> {
  const params = new URLSearchParams();
  if (options?.startDate) params.set('startDate', options.startDate);
  if (options?.endDate) params.set('endDate', options.endDate);
  const qs = params.toString();
  return athletesFetch(`/linked/${catapultId}${qs ? `?${qs}` : ''}`);
}

/**
 * Fetch detailed matching algorithm statistics.
 */
export async function getMatchStatus(): Promise<{ data: MatchStatusResponse }> {
  return athletesFetch('/match-status');
}

/**
 * Manually link a Catapult athlete to a GymAware athlete.
 */
export async function manualLinkAthlete(
  catapultId: string,
  gymAwareRef: string | number,
  note?: string
): Promise<{ message: string; matchStats: MatchStats }> {
  return athletesFetch('/manual-link', {
    method: 'POST',
    body: JSON.stringify({ catapultId, gymAwareRef, note }),
  });
}

/**
 * Force refresh the unified athlete registry.
 */
export async function refreshAthleteRegistry(): Promise<{
  message: string;
  matchStats: MatchStats;
}> {
  return athletesFetch('/refresh');
}

// ============================================================
// Jump Analysis
// ============================================================

/**
 * Analyse jumps for a single athlete in a single activity.
 * Uses Catapult's "basketball" event type.
 */
export async function getAthleteJumpAnalysis(
  athleteId: string,
  activityId: string
): Promise<{ data: JumpAnalysisResult }> {
  return athletesFetch(`/jump-analysis/${athleteId}/${activityId}`);
}

/**
 * Analyse jump trends across multiple activities for one athlete.
 */
export async function getAthleteLongitudinalJumps(
  athleteId: string,
  days?: number
): Promise<{ data: LongitudinalJumpResult }> {
  const qs = days ? `?days=${days}` : '';
  return athletesFetch(`/jump-analysis/${athleteId}/longitudinal${qs}`);
}

/**
 * Analyse jumps for all athletes in a single activity.
 */
export async function getActivityJumpAnalysis(
  activityId: string
): Promise<{ data: ActivityJumpResult }> {
  return athletesFetch(`/jump-analysis/activity/${activityId}`);
}

// ============================================================
// Connection Check
// ============================================================

/**
 * Check if the unified athletes API is reachable.
 */
export async function isAthletesApiAvailable(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(`${API_BASE}/api/athletes/match-status`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
}