export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
  points: number;
  exactHitsCount?: number;
  outcomeHitsCount?: number;
  forecastsCount?: number;
  isAdmin?: boolean;
  isBanned?: boolean;
  legajo?: string;
  gerencia?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SoccerMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  matchDate: string; // ISO String
  homeScore?: number | null; // Real result
  awayScore?: number | null; // Real result
  status: 'pending' | 'finished'; // Matches default to pending, finished once settled
  phase?: string; // e.g., 'grupos', '16avos', '8vos', 'cuartos', 'semis', 'final'
  createdAt: string;
  updatedAt?: string;
}

export interface UserForecast {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  matchId: string;
  homeScore: number;
  awayScore: number;
  pointsEarned?: number | null;
  createdAt: string;
  updatedAt?: string;
}

export interface Standing {
  position: number;
  positionTrend?: 'up' | 'down' | 'same';
  previousPosition?: number;
  userId: string;
  userName: string;
  userEmail: string;
  photoURL?: string;
  points: number;
  forecastsCount: number;
  exactHitsCount: number;
  outcomeHitsCount: number;
  legajo?: string;
  gerencia?: string;
}
