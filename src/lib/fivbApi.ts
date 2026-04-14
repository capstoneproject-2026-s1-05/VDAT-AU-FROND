/**
 * FIVB Live Data API Client
 *
 * Connects to the Volleyball Toolkit Backend's /api/fivb-live/* endpoints
 * which provide curated FIVB VIS data and demo data for the Live Data page.
 *
 * Data sources:
 *   - Matches & Tournaments: Real FIVB VIS API data
 *   - Rankings & Player Stats: Demo data (FIVB credentials required for real data)
 *
 * Backend endpoints: /api/fivb-live/*
 */

const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

// ============================================================
// Types
// ============================================================

export interface FivbMatchTeam {
  name: string;
  code: string;
  setsWon: number | null;
}

export interface FivbSetScore {
  set: number;
  teamA: number;
  teamB: number;
}

export interface FivbMatch {
  no: number;
  date: string | null;
  dateUtc: string | null;
  city: string | null;
  teamA: FivbMatchTeam;
  teamB: FivbMatchTeam;
  sets: FivbSetScore[];
  status: 'finished' | 'upcoming' | 'live';
  tournamentName: string | null;
  tournamentNo: number | null;
  duration: number | null;
}

export interface FivbMatchesResponse {
  success: boolean;
  matches: FivbMatch[];
  total: number;
  teamCode: string;
  isLive: boolean;
  source: string;
  timestamp: string;
}

export interface FivbPoolRankingEntry {
  rank: number;
  teamName: string;
  teamCode: string;
  points: number;
  matchWon: number;
  matchLost: number;
  setWon: number;
  setLost: number;
}

export interface FivbPool {
  no: number;
  name: string;
  rankings: FivbPoolRankingEntry[];
}

export interface FivbTournament {
  no: number;
  name: string;
  gender: string;
  pools: FivbPool[];
}

export interface FivbTournamentsResponse {
  success: boolean;
  tournaments: FivbTournament[];
  total: number;
  isLive: boolean;
  source: string;
  timestamp: string;
}

export interface FivbRankingEntry {
  rank: number;
  team: string;
  code: string;
  points: number;
  previousRank: number;
  trend: 'up' | 'down' | 'stable';
}

export interface FivbRankingsResponse {
  success: boolean;
  rankings: FivbRankingEntry[];
  australiaRank: FivbRankingEntry | null;
  gender: string;
  isDemo: boolean;
  demoNote: string;
  source: string;
  timestamp: string;
}

export interface FivbPlayerStats {
  pointsScored: number;
  attackEfficiency: number;
  serveAces: number;
  blocks: number;
  digs: number;
  attackAttempts: number;
}

export interface FivbPlayer {
  name: string;
  position: string;
  number: number;
  stats: FivbPlayerStats;
}

export interface FivbPlayerStatsResponse {
  success: boolean;
  players: FivbPlayer[];
  gender: string;
  isDemo: boolean;
  demoNote: string;
  source: string;
  timestamp: string;
}

export interface FivbHealthStatus {
  status: 'live' | 'error';
  message: string;
  source: string;
  cacheStats: { entries: number };
}

export interface FivbHealthResponse {
  success: boolean;
  data: FivbHealthStatus;
  timestamp: string;
}

// ============================================================
// Generic Fetch
// ============================================================

async function fivbFetch<T>(endpoint: string, timeoutMs = 30000): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${API_BASE}/api/fivb-live${endpoint}`, {
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
      throw new Error('Request timeout — FIVB API did not respond within 30s');
    }
    throw error;
  }
}

// ============================================================
// API Methods
// ============================================================

/**
 * Check FIVB API health and connectivity.
 */
export async function getFivbHealth(): Promise<FivbHealthResponse> {
  return fivbFetch<FivbHealthResponse>('/health', 10000);
}

/**
 * Get recent matches for a team.
 */
export async function getFivbMatches(
  teamCode = 'AUS',
  limit = 20
): Promise<FivbMatchesResponse> {
  const params = new URLSearchParams({ teamCode, limit: String(limit) });
  return fivbFetch<FivbMatchesResponse>(`/matches?${params.toString()}`);
}

/**
 * Get tournament overview with pool standings.
 */
export async function getFivbTournaments(
  limit = 10
): Promise<FivbTournamentsResponse> {
  return fivbFetch<FivbTournamentsResponse>(`/tournaments?limit=${limit}`);
}

/**
 * Get world rankings (demo data).
 */
export async function getFivbRankings(
  gender = 'M'
): Promise<FivbRankingsResponse> {
  return fivbFetch<FivbRankingsResponse>(`/rankings?gender=${gender}`);
}

/**
 * Get player statistics (demo data).
 */
export async function getFivbPlayerStats(
  gender = 'M'
): Promise<FivbPlayerStatsResponse> {
  return fivbFetch<FivbPlayerStatsResponse>(`/player-stats?gender=${gender}`);
}

/**
 * Check if the FIVB Live API backend is reachable.
 */
export async function isFivbAvailable(): Promise<boolean> {
  try {
    const health = await getFivbHealth();
    return health.data?.status === 'live';
  } catch {
    return false;
  }
}
