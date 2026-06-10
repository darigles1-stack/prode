export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
  points: number;
  isAdmin?: boolean;
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
  userId: string;
  userName: string;
  userEmail: string;
  photoURL?: string;
  points: number;
  forecastsCount: number;
  exactHitsCount: number;
  outcomeHitsCount: number;
}
