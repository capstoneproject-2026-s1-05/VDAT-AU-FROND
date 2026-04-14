/**
 * useFivbData — React hooks for fetching FIVB Live Data
 *
 * Strategy:
 *   1. On mount, check if the backend FIVB API is available
 *   2. If available, fetch real data from all endpoints
 *   3. If unavailable, set `disconnected` state
 *   4. Matches auto-refresh every 30 seconds when live
 *
 * All data is now real (no demo data):
 *   - Matches: FIVB VIS API
 *   - Tournaments: FIVB VIS API
 *   - Rankings: Volleyball World API
 *   - Player Stats: Volleyball World scraping
 *
 * Hooks:
 *   useFivbData()          — Connection check
 *   useFivbMatches()       — Recent matches with auto-refresh
 *   useFivbTournaments()   — Tournament overview
 *   useFivbRankings()      — World rankings (real)
 *   useFivbPlayerStats()   — Player statistics (real)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  isFivbAvailable,
  getFivbMatches,
  getFivbTournaments,
  getFivbRankings,
  getFivbPlayerStats,
  type FivbMatch,
  type FivbTournament,
  type FivbRankingEntry,
  type FivbPlayer,
  type FivbRankingsResponse,
  type FivbPlayerStatsResponse,
} from '@/lib/fivbApi';

// ============================================================
// Types
// ============================================================

interface FivbConnectionState {
  isLive: boolean;
  disconnected: boolean;
  loading: boolean;
  error: string | null;
}

// ============================================================
// Hook: useFivbData (connection check)
// ============================================================

export function useFivbData(): FivbConnectionState {
  const [state, setState] = useState<FivbConnectionState>({
    isLive: false,
    disconnected: false,
    loading: true,
    error: null,
  });

  const checkedRef = useRef(false);

  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;

    async function init() {
      try {
        const available = await isFivbAvailable();
        setState({
          isLive: available,
          disconnected: !available,
          loading: false,
          error: available ? null : 'FIVB API is not reachable.',
        });
      } catch (err) {
        setState({
          isLive: false,
          disconnected: true,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to connect to FIVB API',
        });
      }
    }

    init();
  }, []);

  return state;
}

// ============================================================
// Hook: useFivbMatches (with auto-refresh)
// ============================================================

export function useFivbMatches(
  isLive: boolean,
  teamCode = 'AUS',
  limit = 20,
  autoRefreshMs = 30000
) {
  const [matches, setMatches] = useState<FivbMatch[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchMatches = useCallback(async () => {
    if (!isLive) return;

    setLoading(true);
    setError(null);

    try {
      const result = await getFivbMatches(teamCode, limit);
      setMatches(result.matches);
      setTotal(result.total);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch matches');
    } finally {
      setLoading(false);
    }
  }, [isLive, teamCode, limit]);

  // Initial fetch
  useEffect(() => {
    if (!isLive) {
      setMatches([]);
      return;
    }

    fetchMatches();
  }, [fetchMatches, isLive]);

  // Auto-refresh
  useEffect(() => {
    if (!isLive || autoRefreshMs <= 0) return;

    const interval = setInterval(fetchMatches, autoRefreshMs);
    return () => clearInterval(interval);
  }, [isLive, autoRefreshMs, fetchMatches]);

  return { matches, total, loading, error, lastRefresh, refetch: fetchMatches };
}

// ============================================================
// Hook: useFivbTournaments
// ============================================================

export function useFivbTournaments(isLive: boolean, limit = 10) {
  const [tournaments, setTournaments] = useState<FivbTournament[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLive) {
      setTournaments([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    getFivbTournaments(limit)
      .then(result => {
        if (!cancelled) {
          setTournaments(result.tournaments);
          setLoading(false);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch tournaments');
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [isLive, limit]);

  return { tournaments, loading, error };
}

// ============================================================
// Hook: useFivbRankings (Real Data)
// ============================================================

export function useFivbRankings(isLive: boolean, gender = 'M') {
  const [rankings, setRankings] = useState<FivbRankingEntry[]>([]);
  const [selectedTeamRank, setSelectedTeamRank] = useState<FivbRankingEntry | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLive) {
      setRankings([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    getFivbRankings(gender)
      .then((result: FivbRankingsResponse) => {
        if (!cancelled) {
          setRankings(result.rankings);
          setSelectedTeamRank(result.selectedTeamRank ?? null);
          setLastUpdate(result.lastUpdate ?? null);
          setLoading(false);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch rankings');
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [isLive, gender]);

  return { rankings, selectedTeamRank, lastUpdate, loading, error };
}

// ============================================================
// Hook: useFivbPlayerStats (Real Data)
// ============================================================

export function useFivbPlayerStats(isLive: boolean, gender = 'M') {
  const [players, setPlayers] = useState<FivbPlayer[]>([]);
  const [competition, setCompetition] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLive) {
      setPlayers([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    getFivbPlayerStats(gender)
      .then((result: FivbPlayerStatsResponse) => {
        if (!cancelled) {
          setPlayers(result.players);
          setCompetition(result.competition || '');
          setLoading(false);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch player stats');
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [isLive, gender]);

  return { players, competition, loading, error };
}
