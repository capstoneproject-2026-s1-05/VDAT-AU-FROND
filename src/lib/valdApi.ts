/**
 * VALD ForceDecks API Client
 *
 * Connects to the Volleyball Toolkit Backend's /api/vald-live/* endpoints
 * which proxy VALD ForceDecks force plate data for CMJ testing.
 *
 * Features:
 *   - CMJ summary with best/avg metrics and L/R asymmetry
 *   - CMJ trend data (jump height over time)
 *   - Type-safe responses
 *
 * Backend endpoints: /api/vald-live/*
 */

const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

// ============================================================
// Types
// ============================================================

export interface ValdCMJBest {
  jumpHeight: number | null;
  jumpHeightImpMom: number | null;
  peakForce: number | null;
  peakPower: number | null;
  rsiModified: number | null;
  peakVelocity: number | null;
  concentricPeakForce: number | null;
  eccentricPeakForce: number | null;
  concentricPeakPower: number | null;
  eccentricPeakPower: number | null;
  contractionTime: number | null;
  eccentricDuration: number | null;
  concentricDuration: number | null;
  peakLandingForce: number | null;
}

export interface ValdCMJAvg {
  jumpHeight: number | null;
  peakForce: number | null;
  peakPower: number | null;
  rsiModified: number | null;
  peakVelocity: number | null;
}

export interface ValdAsymmetry {
  left: number;
  right: number;
  index: number; // percentage, positive = left dominant
}

export interface ValdCMJSummary {
  hasData: boolean;
  testDate?: string;
  testId?: string;
  weight?: number;
  totalTests?: number;
  trialCount?: number;
  best?: ValdCMJBest;
  avg?: ValdCMJAvg;
  asymmetry?: ValdAsymmetry | null;
  valdAthleteId?: string;
  valdAthleteName?: string;
  error?: string;
}

export interface ValdCMJTrendPoint {
  date: string;
  jumpHeight: number | null;
  peakForce: number | null;
  rsiModified: number | null;
  weight: number | null;
}

export interface ValdHealthStatus {
  status: 'connected' | 'disconnected';
  teams?: number;
  teamName?: string;
  error?: string;
}

// ============================================================
// Generic Fetch
// ============================================================

async function valdFetch<T>(endpoint: string, timeoutMs = 180000): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${API_BASE}/api/vald-live${endpoint}`, {
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(
        (errorBody as { error?: string }).error ||
          `HTTP ${response.status}: ${response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Request timeout — VALD API did not respond');
    }
    throw error;
  }
}

// ============================================================
// API Methods
// ============================================================

/**
 * Check VALD API connection health.
 */
export async function getValdHealth(): Promise<ValdHealthStatus> {
  return valdFetch<ValdHealthStatus>('/health', 15000);
}

/**
 * Get CMJ summary for an athlete by name.
 * The backend matches the name against VALD's athlete database.
 */
export async function getValdCMJSummary(athleteName: string): Promise<ValdCMJSummary> {
  const encoded = encodeURIComponent(athleteName);
  return valdFetch<ValdCMJSummary>(`/athlete/${encoded}/cmj-summary`);
}

/**
 * Get CMJ trend data for an athlete by name.
 * Returns jump height, peak force, and RSI over time.
 */
export async function getValdCMJTrend(athleteName: string): Promise<ValdCMJTrendPoint[]> {
  const encoded = encodeURIComponent(athleteName);
  return valdFetch<ValdCMJTrendPoint[]>(`/athlete/${encoded}/cmj-trend`);
}

/**
 * Check if the VALD Live API backend is reachable.
 */
export async function isValdAvailable(): Promise<boolean> {
  try {
    const health = await getValdHealth();
    return health.status === 'connected';
  } catch {
    return false;
  }
}
