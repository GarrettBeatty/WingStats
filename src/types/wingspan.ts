// Core Wingspan game data types

export interface ScoreBreakdown {
  birds: number;
  bonus: number;
  endOfRound: number;
  eggs: number;
  cachedFood: number;
  tuckedCards: number;
}

export interface PlayerScore {
  id: string;
  gameId: string;
  playerId?: string; // linked user ID (optional)
  playerName: string;
  position: number; // 1-5 for player order
  scores: ScoreBreakdown;
  totalScore: number;
  isWinner: boolean;
}

export interface Game {
  id: string;
  playedAt: string; // ISO date string
  playerCount: number;
  uploadedBy: string;
  imageUrl?: string;
  createdAt: string;
  players: PlayerScore[];
}

export interface User {
  id: string;
  discordId?: string;
  username: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface PlayerStats {
  userId: string;
  username: string;
  avatarUrl?: string;
  gamesPlayed: number;
  totalWins: number;
  winRate: number;
  averageScore: number;
  highScore: number;
  lowScore: number;
  standardDeviation: number;
  categoryAverages: ScoreBreakdown;
  recentGames: Game[];
  scoreTrend: number[]; // last N game scores
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatarUrl?: string;
  gamesPlayed: number;
  winRate: number;
  averageScore: number;
}

// API response types
export interface ParsedScoreResponse {
  success: boolean;
  players: {
    name: string;
    scores: ScoreBreakdown;
    total: number;
  }[];
  winners: string[];
  error?: string;
}

// Form types for manual entry
export interface GameFormData {
  playedAt: string;
  players: {
    name: string;
    birds: number;
    bonus: number;
    endOfRound: number;
    eggs: number;
    cachedFood: number;
    tuckedCards: number;
  }[];
}

// Chart data types
export interface CategoryChartData {
  category: string;
  value: number;
  fill: string;
}

export interface TrendChartData {
  game: number;
  score: number;
  date: string;
}

export interface ComparisonChartData {
  category: string;
  player1: number;
  player2: number;
}
