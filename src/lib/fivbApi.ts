/**
 * FIVB Live Data API Client
 *
 * Connects to the Volleyball Toolkit Backend's /api/fivb-live/* endpoints
 * which provide curated FIVB data for the Live Data page.
 *
 * Data sources:
 *   - Matches & Tournaments: Real FIVB VIS API data
 *   - Rankings: Real data from Volleyball World API
 *   - Player Stats: Real data scraped from Volleyball World competition pages
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

// --- Rankings (Real data from Volleyball World API) ---

export interface FivbRecentMatch {
  date: string;
  opponent: string;
  opponentCode: string;
  result: string;
  event: string;
  pointChange: number;
}

export interface FivbRankingEntry {
  rank: number;
  team: string;
  code: string;
  points: number;
  trend: 'up' | 'down' | 'stable';
  confederation: string;
  confederationName: string;
  flagUrl: string | null;
  recentMatches: FivbRecentMatch[];
}

export interface FivbRankingsResponse {
  success: boolean;
  rankings: FivbRankingEntry[];
  selectedTeamRank: FivbRankingEntry | null;
  gender: string;
  isLive: boolean;
  lastUpdate: string | null;
  source: string;
  timestamp: string;
}

// --- Player Statistics (Real data from Volleyball World scraping) ---

export interface FivbPlayer {
  rank: number;
  name: string;
  team: string;
  points: number;
  attackPoints: number;
  blockPoints: number;
  servePoints: number;
}

export interface FivbPlayerStatsResponse {
  success: boolean;
  players: FivbPlayer[];
  totalPlayers: number;
  competition: string;
  gender: string;
  isLive: boolean;
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
 * Get world rankings (real data from Volleyball World API).
 */
export async function getFivbRankings(
  gender = 'M',
  teamCode = 'AUS'
): Promise<FivbRankingsResponse> {
  const params = new URLSearchParams({ gender, teamCode });
  return fivbFetch<FivbRankingsResponse>(`/rankings?${params.toString()}`);
}

/**
 * Get player statistics (real data from Volleyball World competition pages).
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
