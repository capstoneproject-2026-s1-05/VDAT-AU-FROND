/**
 * Catapult OpenField API Client
 *
 * Connects to the Volleyball Toolkit Backend's /api/catapult-live/* endpoints
 * which proxy real Catapult Connect API data.
 *
 * Features:
 *   - Type-safe responses matching Catapult OpenField data structures
 *   - Enhanced stats: HR zones, velocity bands, accel/decel, metabolic power
 *   - IMA events: jump profiling, explosive movement analysis
 *   - Efforts: sprint and acceleration effort breakdowns
 *   - Data transformation to match existing frontend interfaces
 *
 * Backend endpoints: /api/catapult-live/*
 * Catapult API docs: https://docs.connect.catapultsports.com/reference/introduction
 */

const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

// ============================================================
// Catapult API Types (matching real API response structures)
// ============================================================

export interface CatapultAthlete {
  id: string;
  first_name: string;
  last_name: string;
  jersey: string | null;
  gender: string | null;
  position_name: string | null;
  image_url: string | null;
  velocity_max: number | null;
  weight: number | null;
  height: number | null;
  date_of_birth: string | null;
}

export interface CatapultActivity {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  tag_names: string[];
  owner: {
    id: string;
    first_name: string;
    last_name: string;
  };
  periods: CatapultPeriod[];
}

export interface CatapultPeriod {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
}

export interface CatapultStatRecord {
  athlete_id: string;
  athlete_name?: string;
  athlete_jersey?: string;
  activity_id: string;
  activity_name?: string;
  start_time?: string;
  period_name?: string;
  position_name?: string;
  // Key volleyball metrics
  total_player_load?: number;
  peak_player_load?: number;
  total_distance?: number;
  total_duration?: number;
  max_vel?: number;
  max_heart_rate?: number;
  bmp_jumping_load_total?: number;
  bmp_running_load_total?: number;
  bmp_dynamic_load_total?: number;
  bmp_jumping_duration_total?: number;
  // Additional fields returned dynamically
  [key: string]: unknown;
}

export interface CatapultGroupSummary {
  activityId: string;
  athleteCount: number;
  rows: CatapultGroupRow[];
}

export interface CatapultGroupRow {
  athleteId: string;
  athleteName: string;
  jersey: string | null;
  position: string;
  duration: number;
  distance: number;
  playerLoad: number;
  plPerMin: number;
  totalJumps: number;
  maxVelocity: number;
  maxHeartRate: number;
  peakPlayerLoad: number;
  bmpJumpingLoad: number;
  bmpRunningLoad: number;
  bmpDynamicLoad: number;
}

export interface CatapultLongitudinalPoint {
  activityId: string;
  activityName: string;
  date: string;
  periodName: string;
  /** Activity tags from Catapult (e.g. ["match", "vnl"]) for session type classification */
  tagNames: string[];
  playerLoad: number;
  peakPlayerLoad: number;
  plPerMin: number;
  distance: number;
  duration: number;
  maxVelocity: number;
  maxHeartRate: number;
  /** Precise jump count from Catapult TOTAL_JUMPS parameter; null if unavailable */
  totalJumps: number | null;
  bmpJumpingLoad: number;
  bmpRunningLoad: number;
  bmpDynamicLoad: number;
  bmpJumpingDuration: number;
  // Expanded metrics from enhanced longitudinal
  avgHeartRate?: number;
  heartRateExertion?: number;
  redZone?: number;
  highSpeedDistance?: number;
  sprintDistance?: number;
  accelerationEfforts?: number;
  decelerationEfforts?: number;
}

export interface CatapultParameter {
  id: string;
  name: string;
  unit: string | null;
}

// ============================================================
// NEW: Enhanced Stats Types
// ============================================================

export interface CatapultEnhancedRow {
  athleteId: string;
  athleteName: string;
  jersey: string | null;
  position: string;
  // Core metrics
  duration: number;
  distance: number;
  playerLoad: number;
  plPerMin: number;
  peakPlayerLoad: number;
  totalJumps: number;
  maxVelocity: number;
  // Heart rate
  maxHeartRate: number;
  avgHeartRate: number;
  heartRateExertion: number;
  redZone: number;
  hrBand1Duration: number;
  hrBand2Duration: number;
  hrBand3Duration: number;
  hrBand4Duration: number;
  hrBand5Duration: number;
  hrBand6Duration: number;
  // Velocity bands
  standingDistance: number;
  walkingDistance: number;
  joggingDistance: number;
  runningDistance: number;
  highSpeedDistance: number;
  sprintDistance: number;
  // Acceleration / deceleration
  accelerationEfforts: number;
  decelerationEfforts: number;
  maxAcceleration: number;
  maxDeceleration: number;
  // Intensity
  meteragePerMin: number;
  workRestRatio: number;
  highSpeedEfforts: number;
  sprintEfforts: number;
  // Metabolic power
  energy: number;
  highMetabolicLoadDistance: number;
  // Body movement
  bmpJumpingLoad: number;
  bmpRunningLoad: number;
  bmpDynamicLoad: number;
  // Load scores
  volumeScore: number;
  intensityScore: number;
  overallScore: number;
  // Impacts
  impacts: number;
}

export interface CatapultEnhancedStats {
  activityId: string;
  athleteCount: number;
  rows: CatapultEnhancedRow[];
}

// ============================================================
// NEW: IMA Events Types
// ============================================================

export interface CatapultIMAEvent {
  type?: string;
  event_type?: string;
  category?: string;
  start_time?: string;
  end_time?: string;
  timestamp?: string;
  magnitude?: number;
  value?: number;
  peak_value?: number;
  duration?: number;
  direction?: string;
  [key: string]: unknown;
}

export interface CatapultJumpProfile {
  athleteId: string;
  activityId: string;
  totalJumps: number;
  peakMagnitude: number;
  avgMagnitude: number;
  magnitudeBands: {
    low: number;
    moderate: number;
    high: number;
    veryHigh: number;
  };
  timeline: Array<{
    timestamp: string;
    magnitude: number;
    duration: number;
  }>;
  rawEventCount: number;
}

// ============================================================
// NEW: Efforts Types
// ============================================================

export interface CatapultEffort {
  startTime: string;
  endTime: string;
  duration: number;
  distance: number;
  peakVelocity: number;
  peakAcceleration: number;
  band: number;
}

export interface CatapultEffortAnalysis {
  athleteId: string;
  activityId: string;
  totalEfforts: number;
  velocityEfforts: {
    count: number;
    peakVelocity: number;
    avgDistance: number;
    efforts: CatapultEffort[];
  };
  accelerationEfforts: {
    count: number;
    peakAcceleration: number;
    efforts: CatapultEffort[];
  };
}

// ============================================================
// Generic API Fetch
// ============================================================

async function catapultFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(`${API_BASE}/api/catapult-live${endpoint}`, {
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
      throw new Error(errorBody.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Request timeout — Catapult API did not respond within 30s');
    }
    throw error;
  }
}

// ============================================================
// Core API Methods (existing)
// ============================================================

/**
 * Fetch all athletes from Catapult OpenField
 */
export async function getCatapultAthletes(filters?: {
  search?: string;
  gender?: string;
  position?: string;
}): Promise<CatapultAthlete[]> {
  const params = new URLSearchParams();
  if (filters?.search) params.set('search', filters.search);
  if (filters?.gender) params.set('gender', filters.gender);
  if (filters?.position) params.set('position', filters.position);

  const qs = params.toString();
  const res = await catapultFetch<{ data: CatapultAthlete[]; total: number }>(
    `/athletes${qs ? `?${qs}` : ''}`
  );
  return res.data;
}

/**
 * Fetch activities (training sessions / matches) with pagination
 */
export async function getCatapultActivities(
  page = 1,
  pageSize = 25
): Promise<CatapultActivity[]> {
  const res = await catapultFetch<{ data: CatapultActivity[] }>(
    `/activities?page=${page}&pageSize=${pageSize}`
  );
  return res.data;
}

/**
 * Fetch a single activity by ID
 */
export async function getCatapultActivity(activityId: string): Promise<CatapultActivity> {
  const res = await catapultFetch<{ data: CatapultActivity }>(`/activities/${activityId}`);
  return res.data;
}

/**
 * Query performance statistics
 */
export async function queryCatapultStats(options: {
  activityIds: string[];
  athleteIds?: string[];
  parameterIds?: string[];
  groupBy?: string;
}): Promise<CatapultStatRecord[]> {
  const res = await catapultFetch<{ data: CatapultStatRecord[] }>('/stats', {
    method: 'POST',
    body: JSON.stringify(options),
  });
  return res.data;
}

/**
 * Get group summary for an activity (AMS Group Summary view)
 */
export async function getCatapultGroupSummary(
  activityId: string
): Promise<CatapultGroupSummary> {
  const res = await catapultFetch<{ data: CatapultGroupSummary }>(
    `/group-summary/${activityId}`
  );
  return res.data;
}

/**
 * Get longitudinal tracking data for an athlete
 */
export async function getCatapultLongitudinal(
  athleteId: string,
  options?: { activityIds?: string[]; pageSize?: number }
): Promise<CatapultLongitudinalPoint[]> {
  const params = new URLSearchParams();
  if (options?.activityIds) params.set('activityIds', options.activityIds.join(','));
  if (options?.pageSize) params.set('pageSize', String(options.pageSize));

  const qs = params.toString();
  const res = await catapultFetch<{ data: CatapultLongitudinalPoint[] }>(
    `/longitudinal/${athleteId}${qs ? `?${qs}` : ''}`
  );
  return res.data;
}

/**
 * Fetch available parameters (metrics)
 */
export async function getCatapultParameters(
  search?: string
): Promise<CatapultParameter[]> {
  const qs = search ? `?search=${encodeURIComponent(search)}` : '';
  const res = await catapultFetch<{ data: CatapultParameter[] }>(`/parameters${qs}`);
  return res.data;
}

/**
 * Clear the backend Catapult API cache
 */
export async function clearCatapultCache(): Promise<void> {
  await catapultFetch('/cache/clear');
}

// ============================================================
// NEW: Enhanced Stats API
// ============================================================

/**
 * Get enhanced statistics for an activity including:
 * HR zones, velocity bands, accel/decel efforts, metabolic power, load scores.
 */
export async function getCatapultEnhancedStats(
  activityId: string
): Promise<CatapultEnhancedStats> {
  const res = await catapultFetch<{ data: CatapultEnhancedStats }>(
    `/enhanced-stats/${activityId}`
  );
  return res.data;
}

// ============================================================
// NEW: IMA Events API
// ============================================================

/**
 * Fetch IMA events for an athlete in an activity.
 * Returns jumps, accelerations, decelerations, and changes of direction.
 */
export async function getCatapultEvents(
  athleteId: string,
  activityId: string
): Promise<CatapultIMAEvent[]> {
  const res = await catapultFetch<{ data: CatapultIMAEvent[] }>(
    `/events/${athleteId}/${activityId}`
  );
  return res.data;
}

/**
 * Get a volleyball-specific jump profile analysis from IMA events.
 * Includes magnitude distribution, peak/avg magnitude, and timeline.
 */
export async function getCatapultJumpProfile(
  athleteId: string,
  activityId: string
): Promise<CatapultJumpProfile> {
  const res = await catapultFetch<{ data: CatapultJumpProfile }>(
    `/jump-profile/${athleteId}/${activityId}`
  );
  return res.data;
}

// ============================================================
// NEW: Efforts API
// ============================================================

/**
 * Fetch velocity and acceleration efforts for an athlete in an activity.
 */
export async function getCatapultEfforts(
  athleteId: string,
  activityId: string
): Promise<CatapultEffort[]> {
  const res = await catapultFetch<{ data: CatapultEffort[] }>(
    `/efforts/${athleteId}/${activityId}`
  );
  return res.data;
}

/**
 * Get categorised effort analysis (velocity vs acceleration efforts).
 */
export async function getCatapultEffortAnalysis(
  athleteId: string,
  activityId: string
): Promise<CatapultEffortAnalysis> {
  const res = await catapultFetch<{ data: CatapultEffortAnalysis }>(
    `/effort-analysis/${athleteId}/${activityId}`
  );
  return res.data;
}

// ============================================================
// NEW: Activity Sub-Resources
// ============================================================

/**
 * Fetch periods (sub-segments) for an activity.
 */
export async function getCatapultActivityPeriods(
  activityId: string
): Promise<CatapultPeriod[]> {
  const res = await catapultFetch<{ data: CatapultPeriod[] }>(
    `/activities/${activityId}/periods`
  );
  return res.data;
}

/**
 * Fetch athletes who participated in an activity.
 */
export async function getCatapultActivityAthletes(
  activityId: string
): Promise<CatapultAthlete[]> {
  const res = await catapultFetch<{ data: CatapultAthlete[] }>(
    `/activities/${activityId}/athletes`
  );
  return res.data;
}

/**
 * Fetch tags for an activity.
 */
export async function getCatapultActivityTags(
  activityId: string
): Promise<Array<{ id: string; name: string }>> {
  const res = await catapultFetch<{ data: Array<{ id: string; name: string }> }>(
    `/activities/${activityId}/tags`
  );
  return res.data;
}

// ============================================================
// Data Transformation: Catapult → Frontend Mock Format
// ============================================================

import type { TrainingSession, Player } from './mockData';

/**
 * Transform Catapult group summary rows into the frontend's TrainingSession format.
 * This allows existing TrainingLoad page charts to work with real data.
 *
 * Uses classifySessionType for robust session type detection from both
 * activity name and optional tag_names.
 */
export function transformToTrainingSessions(
  rows: CatapultGroupRow[],
  activityDate: string,
  activityName: string,
  tagNames: string[] = []
): TrainingSession[] {
  const sessionType = classifySessionType(activityName, tagNames);

  return rows.map(row => ({
    date: activityDate,
    sessionType,
    playerLoad: row.playerLoad,
    jumpCount: row.totalJumps,
    highIntensityEfforts: Math.round(row.bmpDynamicLoad / 10), // approximate
    duration: Math.round(row.duration / 60), // seconds → minutes
    distanceCovered: Math.round(row.distance),
    accelerations: Math.round(row.bmpRunningLoad / 5), // approximate
  }));
}

// ============================================================
// Session Type Classification
// ============================================================

/**
 * Keywords used to classify Catapult activities into session types.
 * Checked against both activity name and tag_names for robust matching.
 * Order matters — first match wins.
 */
const SESSION_TYPE_RULES: { type: TrainingSession['sessionType']; keywords: string[] }[] = [
  {
    type: 'match',
    keywords: ['match', 'game', 'competition', 'comp', 'fixture', 'vnl', 'fivb', 'tournament', 'test match', 'friendly'],
  },
  {
    type: 'recovery',
    keywords: ['recovery', 'rehab', 'cool down', 'cooldown', 'regeneration', 'regen', 'active recovery', 'pool', 'yoga'],
  },
  {
    type: 'gym',
    keywords: ['gym', 'weights', 'strength', 'lifting', 'resistance', 'power', 'conditioning', 'weight room', 's&c'],
  },
  // Default fallback is 'training' — no keywords needed
];

/**
 * Classify a Catapult activity into a session type using both
 * the activity name and tag_names array.
 */
function classifySessionType(
  activityName: string,
  tagNames: string[] = []
): TrainingSession['sessionType'] {
  const searchText = [
    activityName,
    ...tagNames,
  ].join(' ').toLowerCase();

  for (const rule of SESSION_TYPE_RULES) {
    if (rule.keywords.some(kw => searchText.includes(kw))) {
      return rule.type;
    }
  }

  return 'training';
}

// ============================================================
// Data Transformation
// ============================================================

/**
 * Transform Catapult longitudinal data into TrainingSession format
 * for time-series charts.
 */
export function transformLongitudinalToSessions(
  points: CatapultLongitudinalPoint[]
): TrainingSession[] {
  return points.map(p => ({
    date: p.date ? p.date.split('T')[0] : '',
    sessionType: classifySessionType(p.activityName, p.tagNames),
    playerLoad: p.playerLoad,
    jumpCount: p.totalJumps != null ? Math.round(p.totalJumps) : Math.round(p.bmpJumpingLoad),
    highIntensityEfforts: Math.round(p.bmpDynamicLoad / 10),
    duration: Math.round(p.duration / 60),
    distanceCovered: Math.round(p.distance),
    accelerations: Math.round(p.bmpRunningLoad / 5),
  }));
}

/**
 * Transform Catapult athletes into partial Player objects
 * that can be merged with existing mock data or used standalone.
 */
export function transformCatapultAthlete(athlete: CatapultAthlete): Partial<Player> {
  return {
    id: athlete.id,
    name: `${athlete.first_name} ${athlete.last_name}`,
    number: athlete.jersey ? parseInt(athlete.jersey, 10) : 0,
    nationality: 'Australia',
    position: athlete.position_name || 'Unknown',
    height: athlete.height ? Math.round(athlete.height * 100) : 0, // m → cm
    photo: athlete.image_url || undefined,
  };
}

// ============================================================
// NEW: Enhanced Stats Helpers
// ============================================================

/**
 * Extract HR zone distribution from an enhanced stats row.
 * Returns an array of { zone, label, duration, color } for charting.
 */
export function extractHRZones(row: CatapultEnhancedRow): Array<{
  zone: number;
  label: string;
  duration: number;
  color: string;
}> {
  return [
    { zone: 1, label: 'Zone 1 (Rest)', duration: row.hrBand1Duration, color: '#94a3b8' },
    { zone: 2, label: 'Zone 2 (Light)', duration: row.hrBand2Duration, color: '#22c55e' },
    { zone: 3, label: 'Zone 3 (Moderate)', duration: row.hrBand3Duration, color: '#eab308' },
    { zone: 4, label: 'Zone 4 (Hard)', duration: row.hrBand4Duration, color: '#f97316' },
    { zone: 5, label: 'Zone 5 (Very Hard)', duration: row.hrBand5Duration, color: '#ef4444' },
    { zone: 6, label: 'Zone 6 (Max)', duration: row.hrBand6Duration, color: '#dc2626' },
  ];
}

/**
 * Extract velocity band distribution from an enhanced stats row.
 * Returns an array of { band, label, distance, color } for charting.
 */
export function extractVelocityBands(row: CatapultEnhancedRow): Array<{
  band: number;
  label: string;
  distance: number;
  color: string;
}> {
  return [
    { band: 1, label: 'Standing', distance: row.standingDistance, color: '#94a3b8' },
    { band: 2, label: 'Walking', distance: row.walkingDistance, color: '#22c55e' },
    { band: 3, label: 'Jogging', distance: row.joggingDistance, color: '#3b82f6' },
    { band: 4, label: 'Running', distance: row.runningDistance, color: '#eab308' },
    { band: 5, label: 'High Speed', distance: row.highSpeedDistance, color: '#f97316' },
    { band: 6, label: 'Sprinting', distance: row.sprintDistance, color: '#ef4444' },
  ];
}

// ============================================================
// Connection Check
// ============================================================

/**
 * Check if the Catapult Live API backend is reachable.
 * Returns true if the backend responds, false otherwise.
 */
export async function isCatapultAvailable(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(`${API_BASE}/api/catapult-live/cache/clear`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
}