// Mock data representing volleyball player statistics from multiple data platforms
// In a production PoC, these would be fetched from FIVB VIS, Volleyball World, etc.

export interface Player {
  id: string;
  name: string;
  number: number;
  team: string;
  nationality: string;
  position: string;
  height: number; // cm
  age: number;
  photo?: string;
  stats: PlayerStats;
  matchHistory: MatchStat[];
  source: DataSource;
  // New: Physical performance & health data
  physicalData: PhysicalData;
}

export interface PlayerStats {
  attackPoints: number;
  attackAttempts: number;
  attackPercentage: number;
  blockPoints: number;
  blockAttempts: number;
  serviceAces: number;
  serviceErrors: number;
  serviceAttempts: number;
  receptionExcellent: number;
  receptionAttempts: number;
  receptionPercentage: number;
  digs: number;
  setAssists: number;
  totalPoints: number;
  matchesPlayed: number;
  setsPlayed: number;
  pointsPerSet: number;
}

export interface MatchStat {
  date: string;
  opponent: string;
  result: string;
  points: number;
  attacks: number;
  blocks: number;
  aces: number;
  digs: number;
  receptionPct: number;
}

// ============================================================
// Physical Performance & Health Data Types
// ============================================================

/** Catapult training load data */
export interface TrainingSession {
  date: string;
  sessionType: 'training' | 'match' | 'recovery' | 'gym';
  playerLoad: number;        // Catapult PlayerLoad (AU)
  jumpCount: number;          // Number of jumps
  highIntensityEfforts: number;
  duration: number;           // minutes
  distanceCovered: number;    // meters
  accelerations: number;
}

/** VALD / GymAware strength & power data */
export interface StrengthRecord {
  date: string;
  testType: 'cmj' | 'squat_jump' | 'nordboard' | 'imtp' | 'load_velocity';
  jumpHeight?: number;        // cm (CMJ / Squat Jump)
  peakForce?: number;         // N
  peakPower?: number;         // W
  rfd?: number;               // Rate of force development (N/s)
  asymmetry?: number;         // Left/Right asymmetry %
  meanVelocity?: number;      // m/s (GymAware load-velocity)
  load?: number;              // kg (GymAware)
  estimated1RM?: number;      // kg
  isometricStrength?: number; // N (IMTP)
}

/** Whoop recovery & wellness data */
export interface RecoveryRecord {
  date: string;
  hrv: number;                // Heart Rate Variability (ms)
  restingHR: number;          // Resting Heart Rate (bpm)
  recoveryScore: number;      // 0-100%
  sleepHours: number;         // Total sleep hours
  sleepQuality: number;       // 0-100%
  remSleep: number;           // hours
  deepSleep: number;          // hours
  lightSleep: number;         // hours
  awakeTime: number;          // hours
  strain: number;             // Whoop strain score (0-21)
}

/** Teamworks AMS wellness survey data */
export interface WellnessRecord {
  date: string;
  fatigue: number;            // 1-10
  soreness: number;           // 1-10
  stress: number;             // 1-10
  mood: number;               // 1-10
  sleepQuality: number;       // 1-10
  overallWellness: number;    // average
  injuryStatus: 'healthy' | 'minor' | 'moderate' | 'severe';
  injuryNote?: string;
}

/** Injury tracking record */
export interface InjuryRecord {
  date: string;
  type: string;
  bodyPart: string;
  severity: 'minor' | 'moderate' | 'severe';
  status: 'active' | 'recovering' | 'resolved';
  returnDate?: string;
  notes: string;
}

/** Combined physical data for a player */
export interface PhysicalData {
  trainingSessions: TrainingSession[];
  strengthRecords: StrengthRecord[];
  recoveryRecords: RecoveryRecord[];
  wellnessRecords: WellnessRecord[];
  injuries: InjuryRecord[];
}

export type DataSource = 'fivb_vis' | 'volleyball_world' | 'flashscore' | 'volleybox' | 'manual_csv' | 'catapult' | 'vald' | 'gymaware' | 'whoop' | 'teamworks';

export interface DataSourceInfo {
  id: string;
  name: string;
  description: string;
  url: string;
  status: 'connected' | 'available' | 'error';
  lastSync?: string;
  recordCount?: number;
  category: 'competition' | 'physical' | 'import';
}

// ============================================================
// Data Source Definitions
// ============================================================

export const dataSources: DataSourceInfo[] = [
  // Physical Performance Platforms (Primary — per client requirements)
  {
    id: 'catapult',
    name: 'Catapult',
    description: 'Wearable athlete tracking — PlayerLoad, jump counts, high-intensity efforts, accelerations, and session duration for training and match monitoring.',
    url: 'https://www.catapultsports.com/',
    status: 'connected',
    lastSync: '2026-03-12T08:30:00Z',
    recordCount: 1842,
    category: 'physical',
  },
  {
    id: 'vald',
    name: 'VALD Performance',
    description: 'Force plate testing — countermovement jump (CMJ) height, peak force, asymmetry detection, and NordBord hamstring strength profiling.',
    url: 'https://www.vfrcedecks.com/',
    status: 'connected',
    lastSync: '2026-03-11T14:00:00Z',
    recordCount: 624,
    category: 'physical',
  },
  {
    id: 'gymaware',
    name: 'GymAware',
    description: 'Velocity-based training — load-velocity profiling, mean/peak velocity, estimated 1RM, and power output tracking across strength exercises.',
    url: 'https://www.gymaware.com/',
    status: 'connected',
    lastSync: '2026-03-10T16:45:00Z',
    recordCount: 438,
    category: 'physical',
  },
  {
    id: 'whoop',
    name: 'Whoop',
    description: 'Recovery and readiness monitoring — heart rate variability (HRV), resting heart rate, sleep architecture (REM/deep/light), strain, and recovery scores.',
    url: 'https://www.whoop.com/',
    status: 'connected',
    lastSync: '2026-03-12T06:00:00Z',
    recordCount: 2156,
    category: 'physical',
  },
  {
    id: 'teamworks',
    name: 'Teamworks AMS',
    description: 'Athlete management system — subjective wellness surveys (fatigue, soreness, stress, mood), injury tracking, and return-to-play management.',
    url: 'https://www.teamworks.com/',
    status: 'connected',
    lastSync: '2026-03-12T07:15:00Z',
    recordCount: 1320,
    category: 'physical',
  },
  // Competition Data Platforms
  {
    id: 'fivb_vis',
    name: 'FIVB VIS',
    description: 'Volleyball Information System — Official FIVB database with player profiles, match data, rankings, and tournament results for international competitions.',
    url: 'https://www.fivb.org/Vis2009/XmlRequest.asmx',
    status: 'connected',
    lastSync: '2026-03-02T14:30:00Z',
    recordCount: 2847,
    category: 'competition',
  },
  {
    id: 'volleyball_world',
    name: 'Volleyball World',
    description: 'Official competition statistics from Volleyball World including VNL, World Championships, and Olympic qualifiers with detailed per-match analytics.',
    url: 'https://en.volleyballworld.com/',
    status: 'connected',
    lastSync: '2026-03-02T12:00:00Z',
    recordCount: 1523,
    category: 'competition',
  },
  {
    id: 'flashscore',
    name: 'Flashscore',
    description: 'Live scores and historical results for Australian volleyball leagues and international competitions with set-by-set scoring data.',
    url: 'https://www.flashscore.com/volleyball/australia/',
    status: 'available',
    recordCount: 4210,
    category: 'competition',
  },
  // Import
  {
    id: 'manual_csv',
    name: 'CSV / DataVolley Import',
    description: 'Import custom statistics from CSV files or DataVolley DVW exports. Supports bulk upload of match-level and player-level data for local analysis.',
    url: '',
    status: 'connected',
    lastSync: '2026-03-01T09:15:00Z',
    recordCount: 156,
    category: 'import',
  },
];

// ============================================================
// Mock Data Generators
// ============================================================

/** Generate random match history for a player */
const generateMatchHistory = (): MatchStat[] => {
  const opponents = ['Brazil', 'Japan', 'Italy', 'Poland', 'USA', 'France', 'Serbia', 'Argentina', 'Germany', 'Canada'];
  const results = ['3-1', '3-2', '2-3', '3-0', '1-3', '3-2', '3-1', '0-3', '3-2', '3-1'];
  return opponents.map((opp, i) => ({
    date: `2026-0${Math.floor(i / 4) + 1}-${String((i * 3 + 5) % 28 + 1).padStart(2, '0')}`,
    opponent: opp,
    result: results[i],
    points: Math.floor(Math.random() * 20) + 5,
    attacks: Math.floor(Math.random() * 30) + 10,
    blocks: Math.floor(Math.random() * 5),
    aces: Math.floor(Math.random() * 4),
    digs: Math.floor(Math.random() * 10) + 2,
    receptionPct: Math.floor(Math.random() * 30) + 50,
  }));
};

/** Generate 30 days of Catapult training load data */
function generateTrainingSessions(): TrainingSession[] {
  const sessions: TrainingSession[] = [];
  const types: TrainingSession['sessionType'][] = ['training', 'match', 'recovery', 'gym'];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    // Some days off
    if (Math.random() < 0.15) continue;
    const sessionType = types[Math.floor(Math.random() * types.length)];
    const isMatch = sessionType === 'match';
    const isRecovery = sessionType === 'recovery';
    sessions.push({
      date: d.toISOString().split('T')[0],
      sessionType,
      playerLoad: isRecovery ? Math.round(80 + Math.random() * 120) : isMatch ? Math.round(400 + Math.random() * 250) : Math.round(250 + Math.random() * 200),
      jumpCount: isRecovery ? Math.floor(Math.random() * 10) : isMatch ? Math.floor(40 + Math.random() * 60) : Math.floor(20 + Math.random() * 40),
      highIntensityEfforts: isRecovery ? Math.floor(Math.random() * 5) : Math.floor(10 + Math.random() * 30),
      duration: isRecovery ? Math.floor(30 + Math.random() * 30) : isMatch ? Math.floor(90 + Math.random() * 40) : Math.floor(60 + Math.random() * 60),
      distanceCovered: isRecovery ? Math.floor(500 + Math.random() * 1000) : Math.floor(2000 + Math.random() * 4000),
      accelerations: Math.floor(10 + Math.random() * 40),
    });
  }
  return sessions;
}

/** Generate strength test records (weekly) */
function generateStrengthRecords(): StrengthRecord[] {
  const records: StrengthRecord[] = [];
  for (let w = 11; w >= 0; w--) {
    const d = new Date();
    d.setDate(d.getDate() - w * 7);
    const dateStr = d.toISOString().split('T')[0];
    // CMJ test
    records.push({
      date: dateStr,
      testType: 'cmj',
      jumpHeight: Math.round((35 + Math.random() * 15) * 10) / 10,
      peakForce: Math.round(1800 + Math.random() * 800),
      peakPower: Math.round(3500 + Math.random() * 1500),
      rfd: Math.round(8000 + Math.random() * 4000),
      asymmetry: Math.round((Math.random() * 12) * 10) / 10,
    });
    // IMTP test (every other week)
    if (w % 2 === 0) {
      records.push({
        date: dateStr,
        testType: 'imtp',
        isometricStrength: Math.round(2200 + Math.random() * 1000),
        peakForce: Math.round(2500 + Math.random() * 1000),
        rfd: Math.round(10000 + Math.random() * 5000),
      });
    }
    // Load-velocity (every other week, offset)
    if (w % 2 === 1) {
      records.push({
        date: dateStr,
        testType: 'load_velocity',
        meanVelocity: Math.round((0.5 + Math.random() * 0.8) * 100) / 100,
        load: Math.round(60 + Math.random() * 80),
        estimated1RM: Math.round(100 + Math.random() * 60),
        peakPower: Math.round(800 + Math.random() * 600),
      });
    }
  }
  return records;
}

/** Generate 30 days of Whoop recovery data */
function generateRecoveryRecords(): RecoveryRecord[] {
  const records: RecoveryRecord[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const sleepH = Math.round((6 + Math.random() * 3) * 10) / 10;
    records.push({
      date: d.toISOString().split('T')[0],
      hrv: Math.round(40 + Math.random() * 80),
      restingHR: Math.round(48 + Math.random() * 18),
      recoveryScore: Math.round(30 + Math.random() * 70),
      sleepHours: sleepH,
      sleepQuality: Math.round(40 + Math.random() * 60),
      remSleep: Math.round(sleepH * 0.22 * 10) / 10,
      deepSleep: Math.round(sleepH * 0.18 * 10) / 10,
      lightSleep: Math.round(sleepH * 0.45 * 10) / 10,
      awakeTime: Math.round(sleepH * 0.15 * 10) / 10,
      strain: Math.round((5 + Math.random() * 16) * 10) / 10,
    });
  }
  return records;
}

/** Generate 30 days of Teamworks wellness data */
function generateWellnessRecords(): WellnessRecord[] {
  const records: WellnessRecord[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const fatigue = Math.round((3 + Math.random() * 6) * 10) / 10;
    const soreness = Math.round((2 + Math.random() * 6) * 10) / 10;
    const stress = Math.round((2 + Math.random() * 5) * 10) / 10;
    const mood = Math.round((4 + Math.random() * 5) * 10) / 10;
    const sleepQ = Math.round((4 + Math.random() * 5) * 10) / 10;
    records.push({
      date: d.toISOString().split('T')[0],
      fatigue,
      soreness,
      stress,
      mood,
      sleepQuality: sleepQ,
      overallWellness: Math.round(((fatigue + soreness + stress + mood + sleepQ) / 5) * 10) / 10,
      injuryStatus: Math.random() > 0.9 ? 'minor' : 'healthy',
    });
  }
  return records;
}

/** Generate injury history */
function generateInjuries(): InjuryRecord[] {
  const injuries: InjuryRecord[] = [];
  if (Math.random() > 0.4) {
    injuries.push({
      date: '2026-01-15',
      type: 'Strain',
      bodyPart: 'Right Shoulder',
      severity: 'minor',
      status: 'resolved',
      returnDate: '2026-01-28',
      notes: 'Mild rotator cuff strain from overuse. Resolved with physio.',
    });
  }
  if (Math.random() > 0.6) {
    injuries.push({
      date: '2026-02-20',
      type: 'Sprain',
      bodyPart: 'Left Ankle',
      severity: 'moderate',
      status: 'recovering',
      returnDate: '2026-03-15',
      notes: 'Grade 2 lateral ankle sprain during match. Progressive return to play.',
    });
  }
  return injuries;
}

// ============================================================
// Player Data
// ============================================================

export const players: Player[] = [
  {
    id: 'p1',
    name: 'Thomas Edgar',
    number: 17,
    team: 'Australia',
    nationality: 'AUS',
    position: 'Outside Hitter',
    height: 198,
    age: 32,
    stats: {
      attackPoints: 187, attackAttempts: 412, attackPercentage: 45.4,
      blockPoints: 22, blockAttempts: 89,
      serviceAces: 18, serviceErrors: 12, serviceAttempts: 156,
      receptionExcellent: 45, receptionAttempts: 120, receptionPercentage: 52.3,
      digs: 67, setAssists: 5, totalPoints: 227, matchesPlayed: 24, setsPlayed: 78,
      pointsPerSet: 2.91,
    },
    matchHistory: generateMatchHistory(),
    source: 'fivb_vis',
    physicalData: {
      trainingSessions: generateTrainingSessions(),
      strengthRecords: generateStrengthRecords(),
      recoveryRecords: generateRecoveryRecords(),
      wellnessRecords: generateWellnessRecords(),
      injuries: generateInjuries(),
    },
  },
  {
    id: 'p2',
    name: 'Luke Perry',
    number: 4,
    team: 'Australia',
    nationality: 'AUS',
    position: 'Setter',
    height: 192,
    age: 28,
    stats: {
      attackPoints: 32, attackAttempts: 98, attackPercentage: 32.7,
      blockPoints: 15, blockAttempts: 72,
      serviceAces: 12, serviceErrors: 8, serviceAttempts: 134,
      receptionExcellent: 12, receptionAttempts: 35, receptionPercentage: 34.3,
      digs: 45, setAssists: 312, totalPoints: 59, matchesPlayed: 22, setsPlayed: 71,
      pointsPerSet: 0.83,
    },
    matchHistory: generateMatchHistory(),
    source: 'fivb_vis',
    physicalData: {
      trainingSessions: generateTrainingSessions(),
      strengthRecords: generateStrengthRecords(),
      recoveryRecords: generateRecoveryRecords(),
      wellnessRecords: generateWellnessRecords(),
      injuries: generateInjuries(),
    },
  },
  {
    id: 'p3',
    name: 'Beau Graham',
    number: 9,
    team: 'Australia',
    nationality: 'AUS',
    position: 'Middle Blocker',
    height: 205,
    age: 26,
    stats: {
      attackPoints: 98, attackAttempts: 198, attackPercentage: 49.5,
      blockPoints: 45, blockAttempts: 134,
      serviceAces: 8, serviceErrors: 6, serviceAttempts: 112,
      receptionExcellent: 5, receptionAttempts: 18, receptionPercentage: 27.8,
      digs: 23, setAssists: 3, totalPoints: 151, matchesPlayed: 20, setsPlayed: 65,
      pointsPerSet: 2.32,
    },
    matchHistory: generateMatchHistory(),
    source: 'volleyball_world',
    physicalData: {
      trainingSessions: generateTrainingSessions(),
      strengthRecords: generateStrengthRecords(),
      recoveryRecords: generateRecoveryRecords(),
      wellnessRecords: generateWellnessRecords(),
      injuries: generateInjuries(),
    },
  },
  {
    id: 'p4',
    name: 'Nehemiah Mote',
    number: 11,
    team: 'Australia',
    nationality: 'AUS',
    position: 'Opposite',
    height: 201,
    age: 25,
    stats: {
      attackPoints: 210, attackAttempts: 478, attackPercentage: 43.9,
      blockPoints: 18, blockAttempts: 76,
      serviceAces: 22, serviceErrors: 15, serviceAttempts: 178,
      receptionExcellent: 8, receptionAttempts: 25, receptionPercentage: 32.0,
      digs: 34, setAssists: 2, totalPoints: 250, matchesPlayed: 26, setsPlayed: 88,
      pointsPerSet: 2.84,
    },
    matchHistory: generateMatchHistory(),
    source: 'fivb_vis',
    physicalData: {
      trainingSessions: generateTrainingSessions(),
      strengthRecords: generateStrengthRecords(),
      recoveryRecords: generateRecoveryRecords(),
      wellnessRecords: generateWellnessRecords(),
      injuries: generateInjuries(),
    },
  },
  {
    id: 'p5',
    name: 'Arshdeep Dosanjh',
    number: 7,
    team: 'Australia',
    nationality: 'AUS',
    position: 'Libero',
    height: 183,
    age: 24,
    stats: {
      attackPoints: 0, attackAttempts: 0, attackPercentage: 0,
      blockPoints: 0, blockAttempts: 0,
      serviceAces: 0, serviceErrors: 0, serviceAttempts: 0,
      receptionExcellent: 98, receptionAttempts: 165, receptionPercentage: 59.4,
      digs: 145, setAssists: 18, totalPoints: 0, matchesPlayed: 24, setsPlayed: 82,
      pointsPerSet: 0,
    },
    matchHistory: generateMatchHistory(),
    source: 'volleyball_world',
    physicalData: {
      trainingSessions: generateTrainingSessions(),
      strengthRecords: generateStrengthRecords(),
      recoveryRecords: generateRecoveryRecords(),
      wellnessRecords: generateWellnessRecords(),
      injuries: generateInjuries(),
    },
  },
  {
    id: 'p6',
    name: 'Jordan Richards',
    number: 14,
    team: 'Australia',
    nationality: 'AUS',
    position: 'Outside Hitter',
    height: 195,
    age: 27,
    stats: {
      attackPoints: 156, attackAttempts: 378, attackPercentage: 41.3,
      blockPoints: 12, blockAttempts: 56,
      serviceAces: 15, serviceErrors: 10, serviceAttempts: 145,
      receptionExcellent: 52, receptionAttempts: 132, receptionPercentage: 39.4,
      digs: 78, setAssists: 8, totalPoints: 183, matchesPlayed: 23, setsPlayed: 75,
      pointsPerSet: 2.44,
    },
    matchHistory: generateMatchHistory(),
    source: 'flashscore',
    physicalData: {
      trainingSessions: generateTrainingSessions(),
      strengthRecords: generateStrengthRecords(),
      recoveryRecords: generateRecoveryRecords(),
      wellnessRecords: generateWellnessRecords(),
      injuries: generateInjuries(),
    },
  },
];

// Radar chart data helper
export function getRadarData(player: Player) {
  const s = player.stats;
  return [
    { category: 'Attack', value: Math.min(s.attackPercentage * 2, 100), fullMark: 100 },
    { category: 'Block', value: Math.min((s.blockPoints / Math.max(s.blockAttempts, 1)) * 200, 100), fullMark: 100 },
    { category: 'Serve', value: Math.min((s.serviceAces / Math.max(s.serviceAttempts, 1)) * 500, 100), fullMark: 100 },
    { category: 'Reception', value: s.receptionPercentage, fullMark: 100 },
    { category: 'Dig', value: Math.min((s.digs / Math.max(s.setsPlayed, 1)) * 50, 100), fullMark: 100 },
    { category: 'Scoring', value: Math.min(s.pointsPerSet * 25, 100), fullMark: 100 },
  ];
}

// Performance trend data
export function getPerformanceTrend(player: Player) {
  return player.matchHistory.map((m, i) => ({
    match: `M${i + 1}`,
    opponent: m.opponent,
    points: m.points,
    attacks: m.attacks,
    efficiency: Math.round((m.points / Math.max(m.attacks, 1)) * 100),
  }));
}