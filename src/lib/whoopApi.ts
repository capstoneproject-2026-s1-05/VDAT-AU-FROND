/**
 * WHOOP API Client
 *
 * Frontend API client for the WHOOP integration.
 * Communicates with the backend /api/whoop endpoints.
 */

const API_BASE = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000'}/api/whoop`;

// ============================================================
// Types
// ============================================================

export interface WhoopProfile {
  user_id: number;
  email: string;
  first_name: string;
  last_name: string;
  body: {
    height_meter: number;
    weight_kilogram: number;
    max_heart_rate: number;
  } | null;
}

export interface WhoopRecoveryScore {
  user_calibrating: boolean;
  recovery_score: number;
  resting_heart_rate: number;
  hrv_rmssd_milli: number;
  spo2_percentage: number;
  skin_temp_celsius: number;
}

export interface WhoopRecoveryRecord {
  cycle_id: number;
  sleep_id: string;
  user_id: number;
  created_at: string;
  updated_at: string;
  score_state: string;
  score: WhoopRecoveryScore;
}

export interface WhoopSleepStage {
  total_in_bed_time_milli: number;
  total_awake_time_milli: number;
  total_no_data_time_milli: number;
  total_light_sleep_time_milli: number;
  total_slow_wave_sleep_time_milli: number;
  total_rem_sleep_time_milli: number;
  sleep_cycle_count: number;
  disturbance_count: number;
}

export interface WhoopSleepNeeded {
  baseline_milli: number;
  need_from_sleep_debt_milli: number;
  need_from_recent_strain_milli: number;
  need_from_recent_nap_milli: number;
}

export interface WhoopSleepScore {
  stage_summary: WhoopSleepStage;
  sleep_needed: WhoopSleepNeeded;
  respiratory_rate: number;
  sleep_performance_percentage: number;
  sleep_consistency_percentage: number;
  sleep_efficiency_percentage: number;
}

export interface WhoopSleepRecord {
  id: string;
  cycle_id: number;
  user_id: number;
  created_at: string;
  updated_at: string;
  start: string;
  end: string;
  timezone_offset: string;
  nap: boolean;
  score_state: string;
  score: WhoopSleepScore;
}

export interface WhoopCycleScore {
  strain: number;
  kilojoule: number;
  average_heart_rate: number;
  max_heart_rate: number;
}

export interface WhoopCycleRecord {
  id: number;
  user_id: number;
  created_at: string;
  updated_at: string;
  start: string;
  end: string;
  timezone_offset: string;
  score_state: string;
  score: WhoopCycleScore;
}

export interface WhoopWorkoutScore {
  strain: number;
  average_heart_rate: number;
  max_heart_rate: number;
  kilojoule: number;
  percent_recorded: number;
  distance_meter: number;
  altitude_gain_meter: number;
  altitude_change_meter: number;
  zone_durations: Record<string, number>;
}

export interface WhoopWorkoutRecord {
  id: string;
  user_id: number;
  created_at: string;
  updated_at: string;
  start: string;
  end: string;
  timezone_offset: string;
  sport_name: string;
  score_state: string;
  score: WhoopWorkoutScore;
  sport_id: number;
}

export interface WhoopOverview {
  profile: WhoopProfile;
  recovery: WhoopRecoveryRecord[];
  sleep: WhoopSleepRecord[];
  cycles: WhoopCycleRecord[];
}

export interface WhoopStatus {
  configured: boolean;
  connectedUsers: number;
  users: WhoopConnectedUser[];
  cacheEntries: number;
  frontendUrl: string;
  redirectUri: string;
}

export interface WhoopConnectedUser {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  connected: boolean;
  tokenValid: boolean;
}

// ============================================================
// API Client
// ============================================================

async function whoopFetch<T>(path: string, timeout = 15000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const resp = await fetch(`${API_BASE}${path}`, {
      signal: controller.signal,
      credentials: 'include',
    });

    if (!resp.ok) {
      const body = await resp.json().catch(() => ({}));
      throw new Error(body.message || `WHOOP API error: ${resp.status}`);
    }

    return resp.json();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Check if the WHOOP backend is reachable.
 */
export async function isWhoopAvailable(): Promise<boolean> {
  try {
    await whoopFetch<{ data: WhoopStatus }>('/status', 5000);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get WHOOP integration status.
 */
export async function getWhoopStatus(): Promise<WhoopStatus> {
  const resp = await whoopFetch<{ data: WhoopStatus }>('/status');
  return resp.data;
}

/**
 * Get the WHOOP connect URL (redirects to WHOOP authorization).
 */
export function getConnectUrl(): string {
  return `${API_BASE}/connect`;
}

/**
 * Get combined overview data (recovery + sleep + cycles + profile).
 */
export async function getWhoopOverview(userId?: string): Promise<{
  data: WhoopOverview | null;
  connected: boolean;
  message?: string;
}> {
  const params = userId ? `?userId=${userId}` : '';
  return whoopFetch(`/overview${params}`);
}

/**
 * Get recovery data.
 */
export async function getWhoopRecovery(opts?: {
  userId?: string;
  limit?: number;
  start?: string;
  end?: string;
}): Promise<{ data: { records: WhoopRecoveryRecord[]; next_token?: string } | null; connected: boolean }> {
  const params = new URLSearchParams();
  if (opts?.userId) params.set('userId', opts.userId);
  if (opts?.limit) params.set('limit', String(opts.limit));
  if (opts?.start) params.set('start', opts.start);
  if (opts?.end) params.set('end', opts.end);
  const qs = params.toString();
  return whoopFetch(`/recovery${qs ? `?${qs}` : ''}`);
}

/**
 * Get sleep data.
 */
export async function getWhoopSleep(opts?: {
  userId?: string;
  limit?: number;
  start?: string;
  end?: string;
}): Promise<{ data: { records: WhoopSleepRecord[]; next_token?: string } | null; connected: boolean }> {
  const params = new URLSearchParams();
  if (opts?.userId) params.set('userId', opts.userId);
  if (opts?.limit) params.set('limit', String(opts.limit));
  if (opts?.start) params.set('start', opts.start);
  if (opts?.end) params.set('end', opts.end);
  const qs = params.toString();
  return whoopFetch(`/sleep${qs ? `?${qs}` : ''}`);
}

/**
 * Get cycle (strain) data.
 */
export async function getWhoopCycles(opts?: {
  userId?: string;
  limit?: number;
  start?: string;
  end?: string;
}): Promise<{ data: { records: WhoopCycleRecord[]; next_token?: string } | null; connected: boolean }> {
  const params = new URLSearchParams();
  if (opts?.userId) params.set('userId', opts.userId);
  if (opts?.limit) params.set('limit', String(opts.limit));
  if (opts?.start) params.set('start', opts.start);
  if (opts?.end) params.set('end', opts.end);
  const qs = params.toString();
  return whoopFetch(`/cycles${qs ? `?${qs}` : ''}`);
}

/**
 * Get workout data.
 */
export async function getWhoopWorkouts(opts?: {
  userId?: string;
  limit?: number;
  start?: string;
  end?: string;
}): Promise<{ data: { records: WhoopWorkoutRecord[]; next_token?: string } | null; connected: boolean }> {
  const params = new URLSearchParams();
  if (opts?.userId) params.set('userId', opts.userId);
  if (opts?.limit) params.set('limit', String(opts.limit));
  if (opts?.start) params.set('start', opts.start);
  if (opts?.end) params.set('end', opts.end);
  const qs = params.toString();
  return whoopFetch(`/workouts${qs ? `?${qs}` : ''}`);
}

/**
 * Disconnect a user.
 */
export async function disconnectWhoopUser(userId: string): Promise<void> {
  await fetch(`${API_BASE}/disconnect/${userId}`, {
    method: 'POST',
    credentials: 'include',
  });
}

/**
 * Get connected users list.
 */
export async function getWhoopUsers(): Promise<WhoopConnectedUser[]> {
  const resp = await whoopFetch<{ data: WhoopConnectedUser[] }>('/users');
  return resp.data;
}
