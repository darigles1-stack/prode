import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc,
  getDocs, 
  setDoc, 
  updateDoc, 
  addDoc,
  deleteDoc,
  query, 
  where, 
  orderBy, 
  onSnapshot,
  Timestamp,
  getDocFromServer,
  writeBatch
} from 'firebase/firestore';
import { SoccerMatch, UserProfile, UserForecast, Standing } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';
import { OFFICIAL_WORLD_STAGE_MATCHES, getFlagForCountry } from './worldCupData';

// Support Vercel / dynamic environment variables overrides
const globalEnv = (import.meta as any).env || {};
const envConfig = {
  apiKey: globalEnv.VITE_FIREBASE_API_KEY,
  authDomain: globalEnv.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: globalEnv.VITE_FIREBASE_PROJECT_ID,
  storageBucket: globalEnv.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: globalEnv.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: globalEnv.VITE_FIREBASE_APP_ID,
  firestoreDatabaseId: globalEnv.VITE_FIREBASE_FIRESTORE_DATABASE_ID,
};

// Merge workspace configuration with any dynamic VITE_ environment variables
export const activeConfig = {
  apiKey: envConfig.apiKey || firebaseConfig?.apiKey,
  authDomain: envConfig.authDomain || firebaseConfig?.authDomain,
  projectId: envConfig.projectId || firebaseConfig?.projectId,
  storageBucket: envConfig.storageBucket || firebaseConfig?.storageBucket,
  messagingSenderId: envConfig.messagingSenderId || firebaseConfig?.messagingSenderId,
  appId: envConfig.appId || firebaseConfig?.appId,
  firestoreDatabaseId: envConfig.firestoreDatabaseId 
    ? envConfig.firestoreDatabaseId 
    : (
        (envConfig.projectId && envConfig.projectId !== firebaseConfig?.projectId) 
          ? undefined 
          : firebaseConfig?.firestoreDatabaseId
      ),
};

// Detect if real Firebase is configured
export const isFirebaseActive = 
  activeConfig && 
  activeConfig.apiKey && 
  activeConfig.apiKey !== 'placeholder' &&
  activeConfig.projectId !== 'placeholder';

let app;
let auth: any = null;
let db: any = null;

export const shouldUseFirebase = (): boolean => {
  return !!(isFirebaseActive && db && auth?.currentUser);
};

if (isFirebaseActive) {
  try {
    app = getApps().length === 0 ? initializeApp(activeConfig) : getApp();
    auth = getAuth(app);
    db = activeConfig.firestoreDatabaseId 
      ? getFirestore(app, activeConfig.firestoreDatabaseId)
      : getFirestore(app);

    // Validate connection to Firestore as requested in specs
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error: any) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.warn("Please check your Firebase configuration: Client is offline.");
        }
      }
    };
    testConnection();
  } catch (err) {
    console.error("Failed to initialize active Firebase service:", err);
  }
}

// ----------------------------------------------------
// Firestore Hardened Error Handler
// ----------------------------------------------------
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
    },
    operationType,
    path
  };
  console.error('Firestore Error Details: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// ----------------------------------------------------
// Seed Data for Local Preview Simulation
// ----------------------------------------------------
const SEED_MATCHES: SoccerMatch[] = [
  {
    id: "match-1",
    homeTeam: "Argentina 🇦🇷",
    awayTeam: "Francia 🇫🇷",
    matchDate: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), // Starts tomorrow (unlocked)
    status: 'pending',
    createdAt: new Date().toISOString()
  },
  {
    id: "match-2",
    homeTeam: "Brasil 🇧🇷",
    awayTeam: "Alemania 🇩🇪",
    matchDate: new Date(Date.now() + 1000 * 60 * 10).toISOString(), // Starts in 10 mins (locked!)
    status: 'pending',
    createdAt: new Date().toISOString()
  },
  {
    id: "match-3",
    homeTeam: "España 🇪🇸",
    awayTeam: "Italia 🇮🇹",
    matchDate: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // Finished we can settle
    homeScore: 2,
    awayScore: 1,
    status: 'finished',
    createdAt: new Date().toISOString()
  },
  {
    id: "match-4",
    homeTeam: "Inglaterra 🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    awayTeam: "Países Bajos 🇳🇱",
    matchDate: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(), // Starts in 2 days (unlocked)
    status: 'pending',
    createdAt: new Date().toISOString()
  }
];

const SEED_USERS: UserProfile[] = [
  {
    uid: "mock-user-1",
    name: "Lionel Messi",
    email: "messi@corporate.com",
    points: 6,
    isAdmin: false,
    createdAt: new Date().toISOString()
  },
  {
    uid: "mock-user-2",
    name: "Kylian Mbappé",
    email: "mbappe@corporate.com",
    points: 4,
    isAdmin: false,
    createdAt: new Date().toISOString()
  },
  {
    uid: "admin-darigles",
    name: "Darío (Admin)",
    email: "darigles1@gmail.com",
    points: 1,
    isAdmin: true,
    createdAt: new Date().toISOString()
  }
];

const SEED_FORECASTS: UserForecast[] = [
  {
    id: "forecast-1",
    userId: "mock-user-1",
    userName: "Lionel Messi",
    userEmail: "messi@corporate.com",
    matchId: "match-3",
    homeScore: 2,
    awayScore: 1,
    pointsEarned: 3, // Exact hit! -> 3 points
    createdAt: new Date().toISOString()
  },
  {
    id: "forecast-2",
    userId: "mock-user-2",
    userName: "Kylian Mbappé",
    userEmail: "mbappe@corporate.com",
    matchId: "match-3",
    homeScore: 1,
    awayScore: 0,
    pointsEarned: 1, // Winner hit only -> 1 point
    createdAt: new Date().toISOString()
  },
  {
    id: "forecast-3",
    userId: "admin-darigles",
    userName: "Darío (Admin)",
    userEmail: "darigles1@gmail.com",
    matchId: "match-3",
    homeScore: 0,
    awayScore: 2,
    pointsEarned: 0, // Miss -> 0 points
    createdAt: new Date().toISOString()
  }
];

// Initialize localStorage if necessary
const getLocalData = <T>(key: string, initial: T[]): T[] => {
  const store = localStorage.getItem(`prode_${key}`);
  if (!store) {
    localStorage.setItem(`prode_${key}`, JSON.stringify(initial));
    return initial;
  }
  return JSON.parse(store);
};

const setLocalData = <T>(key: string, data: T[]) => {
  localStorage.setItem(`prode_${key}`, JSON.stringify(data));
};

// ----------------------------------------------------
// Unified Database Operations (Firebase ⇄ LocalStorage)
// ----------------------------------------------------

export const dbService = {
  // --- AUTH SERVICES ---
  onAuthChange(callback: (userProfile: UserProfile | null) => void) {
    if (isFirebaseActive && auth) {
      return onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
        if (user) {
          try {
            // Get user profile from firestore
            const userDocRef = doc(db, 'users', user.uid);
            let userSnap = await getDoc(userDocRef);
            
            let profile: UserProfile;
            const isBootstrappedAdmin = user.email === 'darigles1@gmail.com';
            
            if (userSnap.exists()) {
              const data = userSnap.data();
              const createdAt = data.createdAt instanceof Timestamp 
                ? data.createdAt.toDate().toISOString() 
                : (data.createdAt || new Date().toISOString());
              const updatedAt = data.updatedAt instanceof Timestamp 
                ? data.updatedAt.toDate().toISOString() 
                : data.updatedAt;

              profile = {
                ...data,
                uid: user.uid,
                createdAt,
                updatedAt
              } as UserProfile;
              
              // Ensure backend admin aligns with the boostrapped rule
              if (isBootstrappedAdmin && !profile.isAdmin) {
                profile.isAdmin = true;
                await updateDoc(userDocRef, { isAdmin: true });
              }
            } else {
              const createdAtTimestamp = Timestamp.now();
              const profilePayload = {
                uid: user.uid,
                name: user.displayName || user.email?.split('@')[0] || 'Participante',
                email: user.email || '',
                photoURL: user.photoURL || undefined,
                points: 0,
                isAdmin: isBootstrappedAdmin,
                createdAt: createdAtTimestamp
              };
              
              await setDoc(userDocRef, profilePayload);
              
              // Register also in admins collection if admin
              if (isBootstrappedAdmin) {
                await setDoc(doc(db, 'admins', user.uid), {
                  email: user.email,
                  assignedAt: createdAtTimestamp
                });
              }

              profile = {
                ...profilePayload,
                createdAt: createdAtTimestamp.toDate().toISOString()
              } as UserProfile;
            }
            callback(profile);
          } catch (err) {
            console.error("Error setting up authenticated user in Firestore:", err);
            // Standalone safe fallback profile
            callback({
              uid: user.uid,
              name: user.displayName || 'Usuario Corporativo',
              email: user.email || '',
              photoURL: user.photoURL || undefined,
              points: 0,
              isAdmin: user.email === 'darigles1@gmail.com',
              createdAt: new Date().toISOString()
            });
          }
        } else {
          callback(null);
        }
      });
    } else {
      // Offline Local Auth simulation
      const savedUser = localStorage.getItem('prode_current_user');
      if (savedUser) {
        callback(JSON.parse(savedUser));
      } else {
        callback(null);
      }
      return () => {}; // return unsubscribing function
    }
  },

  async loginWithGoogle(): Promise<UserProfile> {
    if (isFirebaseActive && auth) {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const isBootstrappedAdmin = user.email === 'darigles1@gmail.com';
      const userDocRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userDocRef);
      
      let profile: UserProfile;
      if (userSnap.exists()) {
        const data = userSnap.data();
        const createdAt = data.createdAt instanceof Timestamp 
          ? data.createdAt.toDate().toISOString() 
          : (data.createdAt || new Date().toISOString());
        const updatedAt = data.updatedAt instanceof Timestamp 
          ? data.updatedAt.toDate().toISOString() 
          : data.updatedAt;

        profile = {
          ...data,
          uid: user.uid,
          createdAt,
          updatedAt
        } as UserProfile;

        if (isBootstrappedAdmin && !profile.isAdmin) {
          profile.isAdmin = true;
          await updateDoc(userDocRef, { isAdmin: true });
        }
      } else {
        const createdAtTimestamp = Timestamp.now();
        const profilePayload = {
          uid: user.uid,
          name: user.displayName || user.email?.split('@')[0] || 'Participante',
          email: user.email || '',
          photoURL: user.photoURL || undefined,
          points: 0,
          isAdmin: isBootstrappedAdmin,
          createdAt: createdAtTimestamp
        };
        await setDoc(userDocRef, profilePayload);
        if (isBootstrappedAdmin) {
          await setDoc(doc(db, 'admins', user.uid), { email: user.email });
        }

        profile = {
          ...profilePayload,
          createdAt: createdAtTimestamp.toDate().toISOString()
        } as UserProfile;
      }
      return profile;
    } else {
      // Local Auth simulation - Default login as employee or ask
      const mockAdmin: UserProfile = {
        uid: "admin-darigles",
        name: "Darío (Admin)",
        email: "darigles1@gmail.com",
        points: 1,
        isAdmin: true,
        createdAt: new Date().toISOString()
      };
      localStorage.setItem('prode_current_user', JSON.stringify(mockAdmin));
      // Seed users list if not loaded yet
      getLocalData('users', SEED_USERS);
      return mockAdmin;
    }
  },

  async loginAsMockUser(uid: string): Promise<UserProfile> {
    const list = getLocalData('users', SEED_USERS);
    const found = list.find(u => u.uid === uid);
    if (found) {
      localStorage.setItem('prode_current_user', JSON.stringify(found));
      return found;
    }
    throw new Error("Usuario no encontrado");
  },

  async createMockUser(name: string, email: string): Promise<UserProfile> {
    const list = getLocalData('users', SEED_USERS);
    const emailLower = email.toLowerCase();
    
    // Check if exists
    const existingUser = list.find(u => u.email.toLowerCase() === emailLower);
    if (existingUser) {
      localStorage.setItem('prode_current_user', JSON.stringify(existingUser));
      return existingUser;
    }

    const newUser: UserProfile = {
      uid: `mock-user-${Date.now()}`,
      name,
      email,
      points: 0,
      isAdmin: emailLower === 'darigles1@gmail.com',
      createdAt: new Date().toISOString()
    };

    list.push(newUser);
    setLocalData('users', list);
    localStorage.setItem('prode_current_user', JSON.stringify(newUser));
    return newUser;
  },

  async logout() {
    if (isFirebaseActive && auth) {
      await signOut(auth);
    } else {
      localStorage.removeItem('prode_current_user');
    }
  },

  // --- MATCHES SERVICES ---
  subscribeMatches(callback: (matches: SoccerMatch[]) => void) {
    if (shouldUseFirebase()) {
      const q = query(collection(db, 'matches'), orderBy('matchDate', 'asc'));
      return onSnapshot(q, (snapshot) => {
        const matches: SoccerMatch[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          // Convert Firestore Timestamp to string ISO
          let matchDate = '';
          if (data.matchDate instanceof Timestamp) {
            matchDate = data.matchDate.toDate().toISOString();
          } else {
            matchDate = data.matchDate;
          }
          matches.push({
            id: doc.id,
            homeTeam: data.homeTeam,
            awayTeam: data.awayTeam,
            matchDate,
            homeScore: data.homeScore ?? null,
            awayScore: data.awayScore ?? null,
            status: data.status,
            phase: data.phase || 'grupos',
            createdAt: data.createdAt,
            updatedAt: data.updatedAt
          });
        });
        callback(matches);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'matches');
      });
    } else {
      // Local implementation
      const matches = getLocalData('matches', SEED_MATCHES);
      // Sort matches
      const sorted = [...matches].sort((a,b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime());
      callback(sorted);
      
      // Return unsubscription wrapper
      const listener = () => {
        const updated = getLocalData('matches', SEED_MATCHES);
        callback([...updated].sort((a,b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime()));
      };
      window.addEventListener('prode_db_updated', listener);
      return () => {
        window.removeEventListener('prode_db_updated', listener);
      };
    }
  },

  async clearAllMatches(): Promise<void> {
    if (shouldUseFirebase()) {
      try {
        const qSnap = await getDocs(collection(db, 'matches'));
        for (const docSnap of qSnap.docs) {
          await deleteDoc(doc(db, 'matches', docSnap.id));
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, 'matches');
        throw err;
      }
    } else {
      setLocalData('matches', []);
      window.dispatchEvent(new Event('prode_db_updated'));
    }
  },

  async addMatch(homeTeam: string, awayTeam: string, matchDateISO: string, phase: string = 'grupos', customId?: string): Promise<string> {
    const isFirebase = shouldUseFirebase();
    const matchData = {
      homeTeam,
      awayTeam,
      matchDate: isFirebase ? Timestamp.fromDate(new Date(matchDateISO)) : matchDateISO,
      status: 'pending' as const,
      phase,
      createdAt: isFirebase ? Timestamp.now() : new Date().toISOString()
    };

    if (isFirebase) {
      try {
        if (customId) {
          const docRef = doc(db, 'matches', customId);
          await setDoc(docRef, matchData, { merge: true });
          return customId;
        } else {
          const docRef = await addDoc(collection(db, 'matches'), matchData);
          return docRef.id;
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'matches');
        throw err;
      }
    } else {
      const matches = getLocalData<SoccerMatch>('matches', SEED_MATCHES);
      const newId = customId || `match-${Date.now()}`;
      
      const existingIndex = matches.findIndex(m => m.id === newId);
      if (existingIndex > -1) {
        matches[existingIndex] = {
          ...matches[existingIndex],
          homeTeam,
          awayTeam,
          matchDate: matchDateISO,
          phase
        };
      } else {
        matches.push({
          id: newId,
          homeTeam,
          awayTeam,
          matchDate: matchDateISO,
          status: 'pending',
          phase,
          createdAt: new Date().toISOString()
        });
      }
      setLocalData('matches', matches);
      window.dispatchEvent(new Event('prode_db_updated'));
      return newId;
    }
  },

  // --- FORECASTS SERVICES ---
  subscribeUserForecasts(userId: string, callback: (forecasts: UserForecast[]) => void) {
    if (shouldUseFirebase()) {
      const q = query(collection(db, 'forecasts'), where('userId', '==', userId));
      return onSnapshot(q, (snapshot) => {
        const forecasts: UserForecast[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          const createdAt = data.createdAt instanceof Timestamp 
            ? data.createdAt.toDate().toISOString() 
            : (data.createdAt || new Date().toISOString());
          const updatedAt = data.updatedAt instanceof Timestamp 
            ? data.updatedAt.toDate().toISOString() 
            : data.updatedAt;

          forecasts.push({
            id: doc.id,
            userId: data.userId,
            userName: data.userName,
            userEmail: data.userEmail,
            matchId: data.matchId,
            homeScore: data.homeScore,
            awayScore: data.awayScore,
            pointsEarned: data.pointsEarned ?? null,
            createdAt,
            updatedAt
          });
        });
        callback(forecasts);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'forecasts');
      });
    } else {
      const allForecasts = getLocalData<UserForecast>('forecasts', SEED_FORECASTS);
      const userForecasts = allForecasts.filter(f => f.userId === userId);
      callback(userForecasts);

      const listener = () => {
        const updatedAll = getLocalData<UserForecast>('forecasts', SEED_FORECASTS);
        callback(updatedAll.filter(f => f.userId === userId));
      };
      window.addEventListener('prode_db_updated', listener);
      return () => window.removeEventListener('prode_db_updated', listener);
    }
  },

  subscribeAllForecasts(callback: (forecasts: UserForecast[]) => void) {
    if (shouldUseFirebase()) {
      return onSnapshot(collection(db, 'forecasts'), (snapshot) => {
        const forecasts: UserForecast[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          const createdAt = data.createdAt instanceof Timestamp 
            ? data.createdAt.toDate().toISOString() 
            : (data.createdAt || new Date().toISOString());
          const updatedAt = data.updatedAt instanceof Timestamp 
            ? data.updatedAt.toDate().toISOString() 
            : data.updatedAt;

          forecasts.push({
            id: doc.id,
            userId: data.userId,
            userName: data.userName,
            userEmail: data.userEmail,
            matchId: data.matchId,
            homeScore: data.homeScore,
            awayScore: data.awayScore,
            pointsEarned: data.pointsEarned ?? null,
            createdAt,
            updatedAt
          });
        });
        callback(forecasts);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'forecasts');
      });
    } else {
      const forecasts = getLocalData<UserForecast>('forecasts', SEED_FORECASTS);
      callback(forecasts);
      const listener = () => {
        callback(getLocalData<UserForecast>('forecasts', SEED_FORECASTS));
      };
      window.addEventListener('prode_db_updated', listener);
      return () => window.removeEventListener('prode_db_updated', listener);
    }
  },

  async saveForecast(
    userId: string, 
    userName: string, 
    userEmail: string, 
    matchId: string, 
    homeScore: number, 
    awayScore: number
  ): Promise<void> {
    const isFirebase = shouldUseFirebase();
    const forecastId = `${userId}_${matchId}`;
    const forecastData = {
      userId,
      userName,
      userEmail,
      matchId,
      homeScore: Number(homeScore),
      awayScore: Number(awayScore),
      updatedAt: isFirebase ? Timestamp.now() : new Date().toISOString()
    };

    if (isFirebase) {
      try {
        const forecastRef = doc(db, 'forecasts', forecastId);
        const forecastSnap = await getDoc(forecastRef);
        
        if (forecastSnap.exists()) {
          // Rule asserts only homeScore, awayScore, updatedAt can be modified
          await updateDoc(forecastRef, {
            homeScore: Number(homeScore),
            awayScore: Number(awayScore),
            updatedAt: Timestamp.now()
          });
        } else {
          await setDoc(forecastRef, {
            ...forecastData,
            id: forecastId,
            createdAt: Timestamp.now()
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `forecasts/${forecastId}`);
        throw err;
      }
    } else {
      const forecasts = getLocalData<UserForecast>('forecasts', SEED_FORECASTS);
      const idx = forecasts.findIndex(f => f.userId === userId && f.matchId === matchId);
      
      if (idx > -1) {
        forecasts[idx].homeScore = Number(homeScore);
        forecasts[idx].awayScore = Number(awayScore);
        forecasts[idx].updatedAt = new Date().toISOString();
      } else {
        forecasts.push({
          id: forecastId,
          userId,
          userName,
          userEmail,
          matchId,
          homeScore: Number(homeScore),
          awayScore: Number(awayScore),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      setLocalData('forecasts', forecasts);
      window.dispatchEvent(new Event('prode_db_updated'));
    }
  },

  // --- SCORE CALCULATION & GAME SETTLEMENT (ADMIN FLUID ACTION) ---
  /**
   * Settles a match score, updates all forecasts and rewards points of players.
   * Sistema de Puntos:
   *  - Resultado exacto: 3 puntos.
   *  - Acertar ganador (o empate) pero no resultado exacto: 1 punto.
   *  - Error: 0 puntos.
   */
  async settleMatch(matchId: string, homeScore: number, awayScore: number): Promise<void> {
    const finalHomeScore = Number(homeScore);
    const finalAwayScore = Number(awayScore);

    if (shouldUseFirebase()) {
      try {
        // 1. Update the match
        const matchRef = doc(db, 'matches', matchId);
        await updateDoc(matchRef, {
          homeScore: finalHomeScore,
          awayScore: finalAwayScore,
          status: 'finished',
          updatedAt: Timestamp.now()
        });

        // 2. Perform a complete, robust recalculation of ALL forecasts and ALL users from scratch!
        await this.syncUserForecastsAndPoints();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `settle/${matchId}`);
        throw err;
      }
    } else {
      // Local Storage simulation
      const matches = getLocalData<SoccerMatch>('matches', SEED_MATCHES);
      const mIdx = matches.findIndex(m => m.id === matchId);
      if (mIdx > -1) {
        matches[mIdx].homeScore = finalHomeScore;
        matches[mIdx].awayScore = finalAwayScore;
        matches[mIdx].status = 'finished';
        matches[mIdx].updatedAt = new Date().toISOString();
        setLocalData('matches', matches);
      }

      // Perform complete recalculation cleanly
      await this.syncUserForecastsAndPoints();
    }
  },

  async unsettleMatch(matchId: string): Promise<void> {
    if (shouldUseFirebase()) {
      try {
        // 1. Reset match status and scores
        const matchRef = doc(db, 'matches', matchId);
        await updateDoc(matchRef, {
          homeScore: null,
          awayScore: null,
          status: 'pending',
          updatedAt: Timestamp.now()
        });

        // 2. Perform a complete, robust recalculation of ALL forecasts and ALL users from scratch!
        await this.syncUserForecastsAndPoints();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `unsettle/${matchId}`);
        throw err;
      }
    } else {
      // Local Storage simulation
      const matches = getLocalData<SoccerMatch>('matches', SEED_MATCHES);
      const mIdx = matches.findIndex(m => m.id === matchId);
      if (mIdx > -1) {
        matches[mIdx].homeScore = null;
        matches[mIdx].awayScore = null;
        matches[mIdx].status = 'pending';
        matches[mIdx].updatedAt = new Date().toISOString();
        setLocalData('matches', matches);
      }

      // Perform complete recalculation cleanly
      await this.syncUserForecastsAndPoints();
    }
  },

  // --- LEADERBOARD STANDINGS ---
  subscribeStandings(callback: (standings: Standing[]) => void) {
    if (shouldUseFirebase()) {
      let users: UserProfile[] = [];
      let forecasts: UserForecast[] = [];
      let usersLoaded = false;
      let forecastsLoaded = false;

      const triggerCallback = () => {
        if (usersLoaded && forecastsLoaded) {
          const standings = computeStandings(users, forecasts);
          callback(standings);
        }
      };

      const unsubUsers = onSnapshot(collection(db, 'users'), (usersSnapshot) => {
        users = [];
        usersSnapshot.forEach(doc => {
          const data = doc.data();
          const createdAt = data.createdAt instanceof Timestamp 
            ? data.createdAt.toDate().toISOString() 
            : (data.createdAt || new Date().toISOString());
          const updatedAt = data.updatedAt instanceof Timestamp 
            ? data.updatedAt.toDate().toISOString() 
            : data.updatedAt;

          users.push({ 
            ...data, 
            createdAt,
            updatedAt,
            uid: doc.id 
          } as UserProfile);
        });
        usersLoaded = true;
        triggerCallback();
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'users');
      });

      const unsubForecasts = onSnapshot(collection(db, 'forecasts'), (forecastsSnapshot) => {
        forecasts = [];
        forecastsSnapshot.forEach(doc => {
          const data = doc.data();
          const createdAt = data.createdAt instanceof Timestamp 
            ? data.createdAt.toDate().toISOString() 
            : (data.createdAt || new Date().toISOString());
          const updatedAt = data.updatedAt instanceof Timestamp 
            ? data.updatedAt.toDate().toISOString() 
            : data.updatedAt;

          forecasts.push({
            ...data,
            createdAt,
            updatedAt,
            id: doc.id
          } as UserForecast);
        });
        forecastsLoaded = true;
        triggerCallback();
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'forecasts');
      });

      return () => {
        unsubUsers();
        unsubForecasts();
      };
    } else {
      // Offline simulation
      const users = getLocalData<UserProfile>('users', SEED_USERS);
      const forecasts = getLocalData<UserForecast>('forecasts', SEED_FORECASTS);
      
      const standings = computeStandings(users, forecasts);
      callback(standings);

      const listener = () => {
        const u = getLocalData<UserProfile>('users', SEED_USERS);
        const f = getLocalData<UserForecast>('forecasts', SEED_FORECASTS);
        callback(computeStandings(u, f));
      };
      window.addEventListener('prode_db_updated', listener);
      return () => window.removeEventListener('prode_db_updated', listener);
    }
  },

  subscribeUsers(callback: (users: UserProfile[]) => void) {
    if (shouldUseFirebase()) {
      return onSnapshot(collection(db, 'users'), (snapshot) => {
        const users: UserProfile[] = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          const createdAt = data.createdAt instanceof Timestamp 
            ? data.createdAt.toDate().toISOString() 
            : (data.createdAt || new Date().toISOString());
          const updatedAt = data.updatedAt instanceof Timestamp 
            ? data.updatedAt.toDate().toISOString() 
            : data.updatedAt;

          users.push({ 
            ...data, 
            createdAt,
            updatedAt,
            uid: doc.id 
          } as UserProfile);
        });
        callback(users);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'users');
      });
    } else {
      const users = getLocalData<UserProfile>('users', SEED_USERS);
      callback(users);
      const listener = () => {
        callback(getLocalData<UserProfile>('users', SEED_USERS));
      };
      window.addEventListener('prode_db_updated', listener);
      return () => window.removeEventListener('prode_db_updated', listener);
    }
  },

  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
    if (shouldUseFirebase()) {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        ...updates,
        updatedAt: Timestamp.now()
      });
    } else {
      const users = getLocalData<UserProfile>('users', SEED_USERS);
      const idx = users.findIndex(u => u.uid === userId);
      if (idx !== -1) {
        users[idx] = {
          ...users[idx],
          ...updates,
          updatedAt: new Date().toISOString()
        };
        setLocalData('users', users);
        
        // Update current user locally if it's the current user
        const currentUserStr = localStorage.getItem('prode_current_user');
        if (currentUserStr) {
          const parsed = JSON.parse(currentUserStr);
          if (parsed.uid === userId) {
            localStorage.setItem('prode_current_user', JSON.stringify({
              ...parsed,
              ...updates,
              updatedAt: new Date().toISOString()
            }));
          }
        }
        
        window.dispatchEvent(new Event('prode_db_updated'));
      }
    }
  },

  async toggleAdminStatus(userId: string, targetStatus: boolean, email?: string): Promise<void> {
    if (shouldUseFirebase()) {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        isAdmin: targetStatus,
        updatedAt: Timestamp.now()
      });
    } else {
      await this.updateUserProfile(userId, { isAdmin: targetStatus });
    }
  },

  async deleteUser(userId: string): Promise<void> {
    if (shouldUseFirebase()) {
      const userRef = doc(db, 'users', userId);
      await deleteDoc(userRef);
    } else {
      const users = getLocalData<UserProfile>('users', SEED_USERS);
      const updated = users.filter(u => u.uid !== userId);
      setLocalData('users', updated);
      window.dispatchEvent(new Event('prode_db_updated'));
    }
  },

  async syncUserForecastsAndPoints(): Promise<{ success: boolean; message: string }> {
    try {
      if (shouldUseFirebase()) {
        // 1. Fetch all matches
        const matchesRef = collection(db, 'matches');
        const matchesSnap = await getDocs(matchesRef);
        const matchesMap: { [id: string]: any } = {};
        matchesSnap.forEach(doc => {
          matchesMap[doc.id] = doc.data();
        });

        // 2. Fetch all forecasts
        const forecastsRef = collection(db, 'forecasts');
        const forecastsSnap = await getDocs(forecastsRef);
        const userForecasts: { [userId: string]: any[] } = {};
        
        let batch = writeBatch(db);
        let writeCount = 0;

        const checkAndCommitBatch = async () => {
          if (writeCount >= 450) {
            await batch.commit();
            batch = writeBatch(db);
            writeCount = 0;
          }
        };

        // Update individual forecast points if the match is finished but the forecast wasn't scored correctly
        for (const fDoc of forecastsSnap.docs) {
          const fData = fDoc.data();
          const match = matchesMap[fData.matchId];
          const userId = fData.userId;
          
          if (!userId) continue;

          if (!userForecasts[userId]) {
            userForecasts[userId] = [];
          }

          let pointsEarned = fData.pointsEarned ?? null;

          if (match && match.status === 'finished') {
            const finalHome = Number(match.homeScore);
            const finalAway = Number(match.awayScore);
            const pHome = Number(fData.homeScore);
            const pAway = Number(fData.awayScore);

            let calculatedPoints = 0;
            if (pHome === finalHome && pAway === finalAway) {
              calculatedPoints = 3;
            } else {
              const forecastResult = Math.sign(pHome - pAway);
              const actualResult = Math.sign(finalHome - finalAway);
              if (forecastResult === actualResult) {
                calculatedPoints = 1;
              }
            }

            if (pointsEarned !== calculatedPoints) {
              pointsEarned = calculatedPoints;
              batch.update(doc(db, 'forecasts', fDoc.id), {
                pointsEarned,
                updatedAt: Timestamp.now()
              });
              writeCount++;
              await checkAndCommitBatch();
            }
          } else {
            if (pointsEarned !== null) {
              pointsEarned = null;
              batch.update(doc(db, 'forecasts', fDoc.id), {
                pointsEarned: null,
                updatedAt: Timestamp.now()
              });
              writeCount++;
              await checkAndCommitBatch();
            }
          }

          userForecasts[userId].push({
            ...fData,
            pointsEarned
          });
        }

        // 3. For each user, sum points and update their profile only if points actually changed!
        const usersRef = collection(db, 'users');
        const usersSnap = await getDocs(usersRef);
        
        for (const uDoc of usersSnap.docs) {
          const userId = uDoc.id;
          const forecasts = userForecasts[userId] || [];
          
          let totalPoints = 0;
          forecasts.forEach(f => {
            if (f.pointsEarned !== null && f.pointsEarned !== undefined) {
              totalPoints += f.pointsEarned;
            }
          });

          // Only perform document update write if totalPoints differs from current data points
          const currentPoints = uDoc.data().points ?? 0;
          if (totalPoints !== currentPoints) {
            batch.update(doc(db, 'users', userId), {
              points: totalPoints,
              updatedAt: Timestamp.now()
            });
            writeCount++;
            await checkAndCommitBatch();
          }
        }

        // Commit any remaining writes in the active batch
        if (writeCount > 0) {
          await batch.commit();
        }
      } else {
        // Localstorage offline sync
        const matches = getLocalData<SoccerMatch>('matches', SEED_MATCHES);
        const forecasts = getLocalData<UserForecast>('forecasts', SEED_FORECASTS);
        const users = getLocalData<UserProfile>('users', SEED_USERS);

        // Recalculate each forecast points based on finished matches
        forecasts.forEach(f => {
          const match = matches.find(m => m.id === f.matchId);
          if (match && match.status === 'finished') {
            const finalHome = Number(match.homeScore);
            const finalAway = Number(match.awayScore);
            const pHome = Number(f.homeScore);
            const pAway = Number(f.awayScore);

            if (pHome === finalHome && pAway === finalAway) {
              f.pointsEarned = 3;
            } else {
              const forecastResult = Math.sign(pHome - pAway);
              const actualResult = Math.sign(finalHome - finalAway);
              if (forecastResult === actualResult) {
                f.pointsEarned = 1;
              } else {
                f.pointsEarned = 0;
              }
            }
          } else {
            f.pointsEarned = null;
          }
        });

        localStorage.setItem('prode_forecasts', JSON.stringify(forecasts));

        // Recalculate each user points
        users.forEach(u => {
          const userForecasts = forecasts.filter(f => f.userId === u.uid);
          let totalPoints = 0;
          userForecasts.forEach(f => {
            if (f.pointsEarned !== null && f.pointsEarned !== undefined) {
              totalPoints += f.pointsEarned;
            }
          });
          u.points = totalPoints;
          u.updatedAt = new Date().toISOString();
        });

        localStorage.setItem('prode_users', JSON.stringify(users));
        
        // Update session if currently logged in
        const currentUser = localStorage.getItem('prode_current_user');
        if (currentUser) {
          const parsed = JSON.parse(currentUser);
          const updatedUser = users.find(u => u.uid === parsed.uid);
          if (updatedUser) {
            localStorage.setItem('prode_current_user', JSON.stringify(updatedUser));
          }
        }
      }

      // Record sync timestamp in localStorage
      localStorage.setItem('prode_last_daily_sync', new Date().toISOString());
      window.dispatchEvent(new Event('prode_db_updated'));
      return { success: true, message: 'La sincronización de pronósticos se realizó correctamente.' };
    } catch (err) {
      console.error('Error syncing user forecasts & points:', err);
      return { success: false, message: 'Ocurrió un error al intentar sincronizar.' };
    }
  },

  async clearKnockoutMatches(phase: string): Promise<void> {
    if (shouldUseFirebase()) {
      try {
        const qSnap = await getDocs(query(collection(db, 'matches'), where('phase', '==', phase)));
        for (const docSnap of qSnap.docs) {
          await deleteDoc(doc(db, 'matches', docSnap.id));
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `matches-${phase}`);
        throw err;
      }
    } else {
      const localMatches = getLocalData<SoccerMatch>('matches', SEED_MATCHES);
      const filtered = localMatches.filter(m => m.phase !== phase);
      setLocalData('matches', filtered);
    }
    window.dispatchEvent(new Event('prode_db_updated'));
  },

  async generateKnockoutMatches(currentMatches: SoccerMatch[], mode: 'dynamic' | 'placeholder', targetPhase: string = '16avos'): Promise<{ success: boolean; count: number; message: string }> {
    let pendingCount = 0;
    try {
      // 1. Fetch current existing matches of targetPhase to reuse their IDs (and save predictions)
      let existingMatchesOfPhase: SoccerMatch[] = [];
      if (shouldUseFirebase()) {
        try {
          const qSnap = await getDocs(query(collection(db, 'matches'), where('phase', '==', targetPhase)));
          existingMatchesOfPhase = qSnap.docs.map(docSnap => {
            const data = docSnap.data();
            let mDate = '';
            if (data.matchDate instanceof Timestamp) {
              mDate = data.matchDate.toDate().toISOString();
            } else if (data.matchDate && data.matchDate.seconds !== undefined) {
              mDate = new Date(data.matchDate.seconds * 1000).toISOString();
            } else {
              mDate = data.matchDate || '';
            }
            return {
              id: docSnap.id,
              homeTeam: data.homeTeam || '',
              awayTeam: data.awayTeam || '',
              matchDate: mDate,
              status: data.status || 'pending',
              phase: targetPhase,
              createdAt: data.createdAt || new Date().toISOString()
            } as SoccerMatch;
          });
        } catch (err) {
          console.error(`Error fetching existing ${targetPhase} matches from Firebase:`, err);
          existingMatchesOfPhase = currentMatches.filter(m => m.phase === targetPhase);
        }
      } else {
        const localMatches = getLocalData<SoccerMatch>('matches', SEED_MATCHES);
        existingMatchesOfPhase = localMatches.filter(m => m.phase === targetPhase);
      }

      // Sort existing matches to map them to the pairings in a stable order
      existingMatchesOfPhase.sort((a, b) => {
        const parseNum = (idStr: string) => {
          const m = idStr.match(new RegExp(`${targetPhase}_(\\d+)`));
          return m ? parseInt(m[1], 10) : null;
        };
        const numA = parseNum(a.id);
        const numB = parseNum(b.id);
        if (numA !== null && numB !== null) return numA - numB;
        if (numA !== null) return -1;
        if (numB !== null) return 1;
        return (a.matchDate || '').localeCompare(b.matchDate || '') || a.id.localeCompare(b.id);
      });

      let pairings: { home: string; away: string }[] = [];

      if (targetPhase === '16avos') {
        if (mode === 'placeholder') {
          pairings = [
            { home: "1° Grupo A 🏆", away: "Mejor 3° Grupo C/D/E/F 🏆" },
            { home: "2° Grupo A 🏆", away: "2° Grupo B 🏆" },
            { home: "1° Grupo B 🏆", away: "Mejor 3° Grupo A/C/D 🏆" },
            { home: "1° Grupo C 🏆", away: "2° Grupo D 🏆" },
            { home: "1° Grupo D 🏆", away: "Mejor 3° Grupo B/E/F 🏆" },
            { home: "2° Grupo C 🏆", away: "2° Grupo E 🏆" },
            { home: "1° Grupo E 🏆", away: "Mejor 3° Grupo A/D/F 🏆" },
            { home: "1° Grupo F 🏆", away: "2° Grupo G 🏆" },
            { home: "1° Grupo G 🏆", away: "Mejor 3° Grupo B/C/H 🏆" },
            { home: "2° Grupo F 🏆", away: "2° Grupo H 🏆" },
            { home: "1° Grupo H 🏆", away: "Mejor 3° Grupo A/I/J 🏆" },
            { home: "1° Grupo I 🏆", away: "2° Grupo J 🏆" },
            { home: "1° Grupo J 🏆", away: "Mejor 3° Grupo G/K/L 🏆" },
            { home: "2° Grupo I 🏆", away: "2° Grupo K 🏆" },
            { home: "1° Grupo K 🏆", away: "Mejor 3° Grupo E/H/L 🏆" },
            { home: "1° Grupo L 🏆", away: "2° Grupo A/B 🏆" }
          ];
        } else {
          // Build dynamic group standings
          const teamToGroup: Record<string, string> = {};
          OFFICIAL_WORLD_STAGE_MATCHES.forEach(m => {
            teamToGroup[m.local] = m.fase;
            teamToGroup[m.visitante] = m.fase;
          });

          const cleanTeams = Object.keys(teamToGroup);
          const standings: Record<string, { team: string; clean: string; pts: number; gf: number; ga: number; gd: number; gp: number; group: string }> = {};

          cleanTeams.forEach(clean => {
            const flag = getFlagForCountry ? getFlagForCountry(clean) : '';
            standings[clean] = {
              team: `${clean} ${flag}`.trim(),
              clean,
              pts: 0,
              gf: 0,
              ga: 0,
              gd: 0,
              gp: 0,
              group: teamToGroup[clean]
            };
          });

          const findCleanName = (name: string): string => {
            if (!name) return "";
            const removed = name.replace(/[^\p{L}\s\.\-]/gu, '').replace(/\s+/g, ' ').trim();
            const match = cleanTeams.find(t => t.toLowerCase() === removed.toLowerCase());
            return match || removed;
          };

          const groupMatches = currentMatches.filter(m => (m.phase || 'grupos') === 'grupos');
          pendingCount = groupMatches.filter(m => m.status !== 'finished').length;

          groupMatches.forEach(m => {
            if (m.status === 'finished' && m.homeScore !== null && m.homeScore !== undefined && m.awayScore !== null && m.awayScore !== undefined) {
              const hClean = findCleanName(m.homeTeam);
              const aClean = findCleanName(m.awayTeam);

              const hRec = standings[hClean];
              const aRec = standings[aClean];

              if (hRec && aRec) {
                const hs = Number(m.homeScore);
                const as = Number(m.awayScore);

                hRec.gp += 1;
                aRec.gp += 1;
                hRec.gf += hs;
                hRec.ga += as;
                aRec.gf += as;
                aRec.ga += hs;
                hRec.gd = hRec.gf - hRec.ga;
                aRec.gd = aRec.gf - aRec.ga;

                if (hs > as) {
                  hRec.pts += 3;
                } else if (as > hs) {
                  aRec.pts += 3;
                } else {
                  hRec.pts += 1;
                  aRec.pts += 1;
                }
              }
            }
          });

          const groupsMap: Record<string, typeof standings[string][]> = {};
          Object.values(standings).forEach(rec => {
            if (!groupsMap[rec.group]) {
              groupsMap[rec.group] = [];
            }
            groupsMap[rec.group].push(rec);
          });

          const firsts: string[] = [];
          const seconds: string[] = [];
          const thirds: typeof standings[string][] = [];

          const groupNamesAlphabetical = [
            "Grupo A", "Grupo B", "Grupo C", "Grupo D", "Grupo E", "Grupo F",
            "Grupo G", "Grupo H", "Grupo I", "Grupo J", "Grupo K", "Grupo L"
          ];

          groupNamesAlphabetical.forEach(gName => {
            const list = (groupsMap[gName] || []).sort((a, b) => {
              if (b.pts !== a.pts) return b.pts - a.pts;
              if (b.gd !== a.gd) return b.gd - a.gd;
              if (b.gf !== a.gf) return b.gf - a.gf;
              return a.clean.localeCompare(b.clean);
            });

            const matchesInGroup = groupMatches.filter(m => {
              const hClean = findCleanName(m.homeTeam);
              return teamToGroup[hClean] === gName;
            });
            const groupFinished = matchesInGroup.length > 0 && matchesInGroup.every(m => m.status === 'finished');

            if (groupFinished) {
              if (list[0]) firsts.push(list[0].team);
              if (list[1]) seconds.push(list[1].team);
              if (list[2]) thirds.push(list[2]);
            } else {
              firsts.push(`1° ${gName} 🏆`);
              seconds.push(`2° ${gName} 🏆`);
              thirds.push({
                team: `3° ${gName} 🏆`,
                clean: `3_third_${gName}`,
                pts: -1,
                gd: -100,
                gf: -100,
                ga: 100,
                gp: 0,
                group: gName
              });
            }
          });

          const sortedThirds = thirds.sort((a, b) => {
            if (b.pts !== a.pts) return b.pts - a.pts;
            if (b.gd !== a.gd) return b.gd - a.gd;
            if (b.gf !== a.gf) return b.gf - a.gf;
            return a.clean.localeCompare(b.clean);
          });

          const bestThirdsOverall = sortedThirds.slice(0, 8);

          // Helper functions with fallback to group placeholder
          const getFirstOfGroup = (gName: string, idx: number): string => {
            return firsts[idx] || `1° ${gName} 🏆`;
          };

          const getSecondOfGroup = (gName: string, idx: number): string => {
            return seconds[idx] || `2° ${gName} 🏆`;
          };

          const assignedThirdsSet = new Set<string>();

          const getBestThirdOf = (groups: string[]): string => {
            const found = bestThirdsOverall.find(t => 
              groups.includes(t.group) && 
              !assignedThirdsSet.has(t.clean) &&
              !t.team.includes('3°') // Is a real qualified team
            );
            if (found) {
              assignedThirdsSet.add(found.clean);
              return found.team;
            }
            const groupLetters = groups.map(g => g.replace("Grupo ", "")).join("/");
            return `Mejor 3° Grupo ${groupLetters} 🏆`;
          };

          const getSecondOfGroupAB = (): string => {
            const grBFinished = (groupMatches.filter(m => {
              const hClean = findCleanName(m.homeTeam);
              return teamToGroup[hClean] === 'Grupo B';
            }).length > 0) && groupMatches.filter(m => {
              const hClean = findCleanName(m.homeTeam);
              return teamToGroup[hClean] === 'Grupo B';
            }).every(m => m.status === 'finished');

            const grAFinished = (groupMatches.filter(m => {
              const hClean = findCleanName(m.homeTeam);
              return teamToGroup[hClean] === 'Grupo A';
            }).length > 0) && groupMatches.filter(m => {
              const hClean = findCleanName(m.homeTeam);
              return teamToGroup[hClean] === 'Grupo A';
            }).every(m => m.status === 'finished');

            if (grBFinished && seconds[1] && !seconds[1].includes('Grupo B')) {
              return seconds[1];
            }
            if (grAFinished && seconds[0] && !seconds[0].includes('Grupo A')) {
              return seconds[0];
            }
            return "2° Grupo A/B 🏆";
          };

          pairings = [
            { home: getFirstOfGroup("Grupo A", 0), away: getBestThirdOf(['Grupo C', 'Grupo D', 'Grupo E', 'Grupo F']) },
            { home: getSecondOfGroup("Grupo A", 0), away: getSecondOfGroup("Grupo B", 1) },
            { home: getFirstOfGroup("Grupo B", 1), away: getBestThirdOf(['Grupo A', 'Grupo C', 'Grupo D']) },
            { home: getFirstOfGroup("Grupo C", 2), away: getSecondOfGroup("Grupo D", 3) },
            { home: getFirstOfGroup("Grupo D", 3), away: getBestThirdOf(['Grupo B', 'Grupo E', 'Grupo F']) },
            { home: getSecondOfGroup("Grupo C", 2), away: getSecondOfGroup("Grupo E", 4) },
            { home: getFirstOfGroup("Grupo E", 4), away: getBestThirdOf(['Grupo A', 'Grupo D', 'Grupo F']) },
            { home: getFirstOfGroup("Grupo F", 5), away: getSecondOfGroup("Grupo G", 6) },
            { home: getFirstOfGroup("Grupo G", 6), away: getBestThirdOf(['Grupo B', 'Grupo C', 'Grupo H']) },
            { home: getSecondOfGroup("Grupo F", 5), away: getSecondOfGroup("Grupo H", 7) },
            { home: getFirstOfGroup("Grupo H", 7), away: getSecondOfGroup("Grupo J", 9) },
            { home: getFirstOfGroup("Grupo I", 8), away: getBestThirdOf(['Grupo C', 'Grupo D', 'Grupo G', 'Grupo H']) },
            { home: getFirstOfGroup("Grupo J", 9), away: getSecondOfGroup("Grupo H", 7) },
            { home: getSecondOfGroup("Grupo I", 8), away: getSecondOfGroup("Grupo K", 10) },
            { home: getFirstOfGroup("Grupo K", 10), away: getBestThirdOf(['Grupo E', 'Grupo H', 'Grupo L']) },
            { home: getFirstOfGroup("Grupo L", 11), away: getSecondOfGroupAB() }
          ];
        }
      } else {
        // Generic logic for 8vos, cuartos, semis, final
        let sourcePhase = '';
        let pairsCount = 0;
        let sourceLabel = '';
        if (targetPhase === '8vos') { sourcePhase = '16avos'; pairsCount = 8; sourceLabel = '16avos'; }
        else if (targetPhase === 'cuartos') { sourcePhase = '8vos'; pairsCount = 4; sourceLabel = '8vos'; }
        else if (targetPhase === 'semis') { sourcePhase = 'cuartos'; pairsCount = 2; sourceLabel = '8vos (Cuartos)'; }
        else if (targetPhase === 'final') { sourcePhase = 'semis'; pairsCount = 1; sourceLabel = '8vos (Semis)'; }

        const getWinnerOfMatch = (idxOneBased: number, fallbackLabel: string): string => {
          if (mode === 'placeholder') return fallbackLabel;
          const parentMatchId = `${sourcePhase}_${idxOneBased}`;
          const m = currentMatches.find(x => x.id === parentMatchId);
          if (m && m.status === 'finished' && m.homeScore !== null && m.awayScore !== null) {
            if (m.homeScore > m.awayScore) return m.homeTeam;
            if (m.awayScore > m.homeScore) return m.awayTeam;
            return `Ganador ${m.homeTeam} / ${m.awayTeam}`;
          }
          return fallbackLabel;
        };

        for (let j = 0; j < pairsCount; j++) {
          const homeIdx = 2 * j + 1;
          const awayIdx = 2 * j + 2;
          const homeTag = getWinnerOfMatch(homeIdx, `Ganador M${homeIdx} de ${sourcePhase.toUpperCase()} 🏆`);
          const awayTag = getWinnerOfMatch(awayIdx, `Ganador M${awayIdx} de ${sourcePhase.toUpperCase()} 🏆`);
          pairings.push({ home: homeTag, away: awayTag });
        }
      }

      // Safe date calculation to guarantee no NaN values
      let lastSourceMatchDate = Date.now();
      const prevPhase = targetPhase === '16avos' ? 'grupos' : (targetPhase === '8vos' ? '16avos' : (targetPhase === 'cuartos' ? '8vos' : (targetPhase === 'semis' ? 'cuartos' : 'semis')));
      try {
        const times = currentMatches
          .filter(m => m.phase === prevPhase && m.matchDate)
          .map(m => {
            let t = Date.now();
            if (typeof m.matchDate === 'string') {
              t = new Date(m.matchDate).getTime();
            } else if (m.matchDate && typeof (m.matchDate as any).toDate === 'function') {
              t = (m.matchDate as any).toDate().getTime();
            } else if (m.matchDate && (m.matchDate as any).seconds !== undefined) {
              t = (m.matchDate as any).seconds * 1000;
            } else {
              t = new Date(m.matchDate as any).getTime();
            }
            return isNaN(t) ? Date.now() : t;
          });
        if (times.length > 0) {
          lastSourceMatchDate = Math.max(...times);
        }
      } catch (err) {
        console.error("Error calculating lastSourceMatchDate safely:", err);
      }

      const baseStartMillis = lastSourceMatchDate > Date.now()
        ? lastSourceMatchDate + 1000 * 60 * 60 * 24
        : Date.now() + 1000 * 60 * 60 * 24;

      let createdCounter = 0;
      for (let i = 0; i < pairings.length; i++) {
        const pair = pairings[i];
        const dayOffset = Math.floor(i / 4);
        const hourOffset = 12 + (i % 4) * 3;
        
        const dateObj = new Date(baseStartMillis);
        dateObj.setDate(dateObj.getDate() + dayOffset);
        dateObj.setHours(hourOffset, 0, 0, 0);

        // Reuse existing match ID if available at index i to preserve user predictions!
        const existingMatch = existingMatchesOfPhase[i];
        
        if (existingMatch) {
          if (shouldUseFirebase()) {
            await setDoc(doc(db, 'matches', existingMatch.id), {
              homeTeam: pair.home,
              awayTeam: pair.away,
              matchDate: Timestamp.fromDate(new Date(dateObj.toISOString()))
            }, { merge: true });
          } else {
            const matches = getLocalData<SoccerMatch>('matches', SEED_MATCHES);
            const idx = matches.findIndex(m => m.id === existingMatch.id);
            if (idx > -1) {
              matches[idx] = {
                ...matches[idx],
                homeTeam: pair.home,
                awayTeam: pair.away,
                matchDate: dateObj.toISOString()
              };
              setLocalData('matches', matches);
            }
          }
        } else {
          const stableId = `${targetPhase}_${i + 1}`;
          await this.addMatch(pair.home, pair.away, dateObj.toISOString(), targetPhase, stableId);
        }
        createdCounter++;
      }

      // If there are excess existing matches (e.g. more than pairings length due to config changes), clean them up
      if (existingMatchesOfPhase.length > pairings.length) {
        for (let i = pairings.length; i < existingMatchesOfPhase.length; i++) {
          const excessMatch = existingMatchesOfPhase[i];
          if (shouldUseFirebase()) {
            try {
              await deleteDoc(doc(db, 'matches', excessMatch.id));
            } catch (err) {
              console.error(`Error deleting excess ${targetPhase} match:`, err);
            }
          } else {
            const localMatches = getLocalData<SoccerMatch>('matches', SEED_MATCHES);
            const filtered = localMatches.filter(m => m.id !== excessMatch.id);
            setLocalData('matches', filtered);
          }
        }
      }

      const phaseLabels: { [key: string]: string } = {
        '16avos': '16avos de Final',
        '8vos': '8vos de Final',
        'cuartos': 'Cuartos de Final',
        'semis': 'Semifinales',
        'final': 'Gran Final'
      };
      const labelValue = phaseLabels[targetPhase] || targetPhase;

      let msg = `¡Se actualizaron correctamente las ${createdCounter} llaves de ${labelValue}! Se cargaron los competidores correspondientes y tus pronósticos ya existen se mantuvieron 100% a salvo de forma exitosa.`;
      if (targetPhase === '16avos' && mode === 'dynamic' && pendingCount > 0) {
        msg = `⚠️ ¡Atención! Se calcularon las llaves de los 16avos de Final, pero se detectaron ${pendingCount} partidos de Fase de Grupos aún PENDIENTES de finalización en el sistema.\n\nPor este motivo, las selecciones de los grupos que aún no finalizaron se muestran provisoriamente como "1°" / "2°" de su grupo (esqueleto).\n\nUna vez cargues los resultados reales de esos partidos pendientes, volvé a hacer clic en "Calcular Clasificados Reales" para actualizar automáticamente los países correspondientes sin perder tus pronósticos ya cargados.`;
      } else if (targetPhase === '16avos' && mode === 'dynamic') {
        msg = `🎉 ¡Éxito total! Se calcularon y cargaron de forma perfecta las llaves de 16avos de Final con los países ya clasificados reales de cada uno de los grupos tras concluir la fase inicial.`;
      }

      window.dispatchEvent(new Event('prode_db_updated'));
      return {
        success: true,
        count: createdCounter,
        message: msg
      };
    } catch (e) {
      console.error("Error generating knockout matches:", e);
      return {
        success: false,
        count: 0,
        message: 'Ocurrió un error al intentar crear las llaves del torneo.'
      };
    }
  },

  subscribeSettings(callback: (settingsData: { enabledPhases: string[] }) => void) {
    if (shouldUseFirebase()) {
      const docRef = doc(db, 'settings', 'config');
      return onSnapshot(docRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          callback({
            enabledPhases: data.enabledPhases || ['grupos']
          });
        } else {
          setDoc(docRef, { enabledPhases: ['grupos'] })
            .then(() => callback({ enabledPhases: ['grupos'] }))
            .catch(err => console.error("Error creating default settings:", err));
        }
      }, (error) => {
        console.error("Error subscribing to settings:", error);
        callback({ enabledPhases: ['grupos'] });
      });
    } else {
      const getLocalSettings = () => {
        const stored = localStorage.getItem('prode_enabled_phases');
        if (stored) {
          try {
            return { enabledPhases: JSON.parse(stored) };
          } catch (e) {}
        }
        return { enabledPhases: ['grupos'] };
      };
      
      callback(getLocalSettings());

      const listener = () => {
        callback(getLocalSettings());
      };
      window.addEventListener('prode_db_updated', listener);
      return () => {
        window.removeEventListener('prode_db_updated', listener);
      };
    }
  },

  async updateEnabledPhases(enabledPhases: string[]): Promise<void> {
    if (shouldUseFirebase()) {
      try {
        const docRef = doc(db, 'settings', 'config');
        await setDoc(docRef, { enabledPhases }, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, 'settings/config');
      }
    } else {
      localStorage.setItem('prode_enabled_phases', JSON.stringify(enabledPhases));
      window.dispatchEvent(new Event('prode_db_updated'));
    }
  },

  async resetTournament(): Promise<void> {
    if (shouldUseFirebase()) {
      try {
        // 1. Delete all forecasts
        const forecastsRef = collection(db, 'forecasts');
        const forecastsSnap = await getDocs(forecastsRef);
        
        let batch = writeBatch(db);
        let writeCount = 0;
        const checkAndCommitBatch = async () => {
          if (writeCount >= 450) {
            await batch.commit();
            batch = writeBatch(db);
            writeCount = 0;
          }
        };

        for (const docSnap of forecastsSnap.docs) {
          batch.delete(doc(db, 'forecasts', docSnap.id));
          writeCount++;
          await checkAndCommitBatch();
        }

        // 2. Set all users' points to 0
        const usersRef = collection(db, 'users');
        const usersSnap = await getDocs(usersRef);
        for (const docSnap of usersSnap.docs) {
          batch.update(doc(db, 'users', docSnap.id), {
            points: 0,
            updatedAt: Timestamp.now()
          });
          writeCount++;
          await checkAndCommitBatch();
        }

        // 3. Reset matches: keep 'grupos', delete knockouts
        const matchesRef = collection(db, 'matches');
        const matchesSnap = await getDocs(matchesRef);
        for (const docSnap of matchesSnap.docs) {
          const data = docSnap.data();
          const p = data.phase || 'grupos';
          if (p === 'grupos' || p.toLowerCase().startsWith('grupo')) {
            batch.update(doc(db, 'matches', docSnap.id), {
              homeScore: null,
              awayScore: null,
              status: 'pending',
              updatedAt: Timestamp.now()
            });
            writeCount++;
            await checkAndCommitBatch();
          } else {
            batch.delete(doc(db, 'matches', docSnap.id));
            writeCount++;
            await checkAndCommitBatch();
          }
        }

        // 4. Reset enabled phases to just 'grupos'
        const settingsRef = doc(db, 'settings', 'config');
        batch.set(settingsRef, { enabledPhases: ['grupos'] }, { merge: true });
        writeCount++;

        if (writeCount > 0) {
          await batch.commit();
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'reset-tournament');
        throw err;
      }
    } else {
      // Local Storage Fallback simulation
      setLocalData('forecasts', []);

      const users = getLocalData<UserProfile>('users', SEED_USERS);
      users.forEach(u => {
        u.points = 0;
        u.updatedAt = new Date().toISOString();
      });
      setLocalData('users', users);

      const matches = getLocalData<SoccerMatch>('matches', SEED_MATCHES);
      const filteredMatches = matches
        .filter(m => {
          const p = m.phase || 'grupos';
          return p === 'grupos' || p.toLowerCase().startsWith('grupo');
        })
        .map(m => ({
          ...m,
          homeScore: null,
          awayScore: null,
          status: 'pending' as const,
          updatedAt: new Date().toISOString()
        }));
      setLocalData('matches', filteredMatches);

      localStorage.setItem('prode_enabled_phases', JSON.stringify(['grupos']));
      window.dispatchEvent(new Event('prode_db_updated'));
    }
  },

  async loadCustomStageFixture(customMatches: any[]): Promise<void> {
    if (shouldUseFirebase()) {
      try {
        // 1. Delete all forecasts
        const forecastsRef = collection(db, 'forecasts');
        const forecastsSnap = await getDocs(forecastsRef);
        
        let batch = writeBatch(db);
        let writeCount = 0;
        const checkAndCommitBatch = async () => {
          if (writeCount >= 450) {
            await batch.commit();
            batch = writeBatch(db);
            writeCount = 0;
          }
        };

        for (const docSnap of forecastsSnap.docs) {
          batch.delete(doc(db, 'forecasts', docSnap.id));
          writeCount++;
          await checkAndCommitBatch();
        }

        // 2. Set all users' points to 0
        const usersRef = collection(db, 'users');
        const usersSnap = await getDocs(usersRef);
        for (const docSnap of usersSnap.docs) {
          batch.update(doc(db, 'users', docSnap.id), {
            points: 0,
            updatedAt: Timestamp.now()
          });
          writeCount++;
          await checkAndCommitBatch();
        }

        // 3. Delete all old matches
        const matchesRef = collection(db, 'matches');
        const matchesSnap = await getDocs(matchesRef);
        for (const docSnap of matchesSnap.docs) {
          batch.delete(doc(db, 'matches', docSnap.id));
          writeCount++;
          await checkAndCommitBatch();
        }

        // 4. Reset enabled phases to just 'grupos'
        const settingsRef = doc(db, 'settings', 'config');
        batch.set(settingsRef, { enabledPhases: ['grupos'] }, { merge: true });
        writeCount++;
        await checkAndCommitBatch();

        // 5. Add new custom matches of phase 'grupos'
        for (const item of customMatches) {
          const mId = item.id || `match-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
          const mDocRef = doc(db, 'matches', mId);
          
          let mDate = new Date().toISOString();
          if (item.matchDate) {
            mDate = new Date(item.matchDate).toISOString();
          } else if (item.date) {
            mDate = new Date(item.date).toISOString();
          }

          const matchPayload = {
            homeTeam: item.homeTeam,
            awayTeam: item.awayTeam,
            matchDate: Timestamp.fromDate(new Date(mDate)),
            status: 'pending',
            phase: item.phase || 'grupos',
            createdAt: Timestamp.now()
          };
          
          batch.set(mDocRef, matchPayload);
          writeCount++;
          await checkAndCommitBatch();
        }

        if (writeCount > 0) {
          await batch.commit();
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'load-custom-fixture');
        throw err;
      }
    } else {
      // Local Storage Fallback simulation
      setLocalData('forecasts', []);

      const users = getLocalData<UserProfile>('users', SEED_USERS);
      users.forEach(u => {
        u.points = 0;
        u.updatedAt = new Date().toISOString();
      });
      setLocalData('users', users);

      const newMatchesList: SoccerMatch[] = customMatches.map((item, idx) => {
        let mDate = new Date().toISOString();
        if (item.matchDate) {
          mDate = new Date(item.matchDate).toISOString();
        } else if (item.date) {
          mDate = new Date(item.date).toISOString();
        }
        return {
          id: item.id || `match-${Date.now()}-${idx}`,
          homeTeam: item.homeTeam,
          awayTeam: item.awayTeam,
          matchDate: mDate,
          status: 'pending' as const,
          phase: item.phase || 'grupos',
          createdAt: new Date().toISOString()
        };
      });
      setLocalData('matches', newMatchesList);

      localStorage.setItem('prode_enabled_phases', JSON.stringify(['grupos']));
      window.dispatchEvent(new Event('prode_db_updated'));
    }
  },

  async exportBackupData(): Promise<any> {
    const isFirebase = shouldUseFirebase();
    if (isFirebase) {
      try {
        const matchesSnap = await getDocs(collection(db, 'matches'));
        const matches = matchesSnap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            matchDate: data.matchDate && typeof data.matchDate.toDate === 'function' ? data.matchDate.toDate().toISOString() : data.matchDate,
            createdAt: data.createdAt && typeof data.createdAt.toDate === 'function' ? data.createdAt.toDate().toISOString() : data.createdAt
          };
        });

        const forecastsSnap = await getDocs(collection(db, 'forecasts'));
        const forecasts = forecastsSnap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            updatedAt: data.updatedAt && typeof data.updatedAt.toDate === 'function' ? data.updatedAt.toDate().toISOString() : data.updatedAt
          };
        });

        const usersSnap = await getDocs(collection(db, 'users'));
        const users = usersSnap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            createdAt: data.createdAt && typeof data.createdAt.toDate === 'function' ? data.createdAt.toDate().toISOString() : data.createdAt,
            updatedAt: data.updatedAt && typeof data.updatedAt.toDate === 'function' ? data.updatedAt.toDate().toISOString() : data.updatedAt
          };
        });

        const settingsDoc = await getDoc(doc(db, 'settings', 'config'));
        const settings = settingsDoc.exists() ? settingsDoc.data() : { enabledPhases: ['grupos'] };

        return {
          version: '1.0',
          exportedAt: new Date().toISOString(),
          matches,
          forecasts,
          users,
          settings
        };
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'backup-export');
        throw err;
      }
    } else {
      // Local Storage Backup
      const matches = getLocalData<any>('matches', []);
      const forecasts = getLocalData<any>('forecasts', []);
      const users = getLocalData<any>('users', SEED_USERS);
      let enabledPhases = ['grupos'];
      try {
        const localPhases = localStorage.getItem('prode_enabled_phases');
        if (localPhases) enabledPhases = JSON.parse(localPhases);
      } catch {}

      return {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        matches,
        forecasts,
        users,
        settings: { enabledPhases }
      };
    }
  },

  async importBackupData(backupData: any): Promise<{ success: boolean; message: string }> {
    if (!backupData || typeof backupData !== 'object') {
      throw new Error('Datos de resguardo inválidos.');
    }

    const { matches = [], forecasts = [], users = [], settings = {} } = backupData;
    const isFirebase = shouldUseFirebase();

    if (isFirebase) {
      try {
        // 1. Clear existing collections to avoid duplicates/orphans
        const deleteCol = async (colPath: string) => {
          const snap = await getDocs(collection(db, colPath));
          let batch = writeBatch(db);
          let count = 0;
          for (const d of snap.docs) {
            batch.delete(doc(db, colPath, d.id));
            count++;
            if (count >= 400) {
              await batch.commit();
              batch = writeBatch(db);
              count = 0;
            }
          }
          if (count > 0) {
            await batch.commit();
          }
        };

        await deleteCol('matches');
        await deleteCol('forecasts');
        await deleteCol('users');

        // 2. Insert new docs
        let batch = writeBatch(db);
        let writeCount = 0;
        const checkAndCommitBatch = async () => {
          if (writeCount >= 400) {
            await batch.commit();
            batch = writeBatch(db);
            writeCount = 0;
          }
        };

        for (const m of matches) {
          const mDocRef = doc(db, 'matches', m.id);
          const matchPayload = {
            homeTeam: m.homeTeam,
            awayTeam: m.awayTeam,
            matchDate: m.matchDate ? Timestamp.fromDate(new Date(m.matchDate)) : Timestamp.now(),
            status: m.status || 'pending',
            phase: m.phase || 'grupos',
            createdAt: m.createdAt ? Timestamp.fromDate(new Date(m.createdAt)) : Timestamp.now(),
            homeScore: m.homeScore !== undefined && m.homeScore !== null ? Number(m.homeScore) : null,
            awayScore: m.awayScore !== undefined && m.awayScore !== null ? Number(m.awayScore) : null,
          };
          batch.set(mDocRef, matchPayload);
          writeCount++;
          await checkAndCommitBatch();
        }

        // Insert forecasts
        for (const f of forecasts) {
          const fDocRef = doc(db, 'forecasts', f.id);
          const forecastPayload = {
            userId: f.userId,
            matchId: f.matchId,
            homeScore: Number(f.homeScore),
            awayScore: Number(f.awayScore),
            pointsEarned: f.pointsEarned !== undefined && f.pointsEarned !== null ? Number(f.pointsEarned) : null,
            updatedAt: f.updatedAt ? Timestamp.fromDate(new Date(f.updatedAt)) : Timestamp.now(),
          };
          batch.set(fDocRef, forecastPayload);
          writeCount++;
          await checkAndCommitBatch();
        }

        // Insert users
        for (const u of users) {
          const uDocRef = doc(db, 'users', u.id || u.uid);
          const userPayload = {
            uid: u.uid || u.id,
            name: u.name,
            email: u.email,
            photoURL: u.photoURL || '',
            points: u.points !== undefined ? Number(u.points) : 0,
            isAdmin: !!u.isAdmin,
            isBanned: !!u.isBanned,
            legajo: u.legajo || '',
            gerencia: u.gerencia || '',
            createdAt: u.createdAt ? Timestamp.fromDate(new Date(u.createdAt)) : Timestamp.now(),
            updatedAt: u.updatedAt ? Timestamp.fromDate(new Date(u.updatedAt)) : Timestamp.now(),
          };
          batch.set(uDocRef, userPayload);
          writeCount++;
          await checkAndCommitBatch();
        }

        // Set Settings Config
        const settingsRef = doc(db, 'settings', 'config');
        const enabledPhases = settings.enabledPhases || ['grupos'];
        batch.set(settingsRef, { enabledPhases }, { merge: true });
        writeCount++;

        if (writeCount > 0) {
          await batch.commit();
        }

        // Refresh calculations
        await this.syncUserForecastsAndPoints();

        return { success: true, message: 'Restauración importada con éxito.' };
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'backup-import');
        throw err;
      }
    } else {
      // Local Storage Import Restore
      setLocalData('matches', matches);
      setLocalData('forecasts', forecasts);
      setLocalData('users', users);
      if (settings.enabledPhases) {
        localStorage.setItem('prode_enabled_phases', JSON.stringify(settings.enabledPhases));
      }
      window.dispatchEvent(new Event('prode_db_updated'));
      return { success: true, message: 'Restauración local importada con éxito.' };
    }
  }
};

// Standings calculation helper
function computeStandings(users: UserProfile[], forecasts: UserForecast[]): Standing[] {
  const standingsMap: { [userId: string]: Standing } = {};

  // Filter out banned users from participating in rankings/standings blocks
  const activeUsers = users.filter(u => !u.isBanned);

  activeUsers.forEach(u => {
    standingsMap[u.uid] = {
      position: 0,
      userId: u.uid,
      userName: u.name,
      userEmail: u.email,
      photoURL: u.photoURL,
      points: u.points || 0,
      forecastsCount: 0,
      exactHitsCount: 0,
      outcomeHitsCount: 0,
      legajo: u.legajo,
      gerencia: u.gerencia
    };
  });

  forecasts.forEach(f => {
    const row = standingsMap[f.userId];
    if (row) {
      row.forecastsCount += 1;
      if (f.pointsEarned === 3) {
        row.exactHitsCount += 1;
      } else if (f.pointsEarned === 1) {
        row.outcomeHitsCount += 1;
      }
    }
  });

  // Convert to array, sort by points DESC, then exactHits DESC, then outcomeHits DESC
  const list = Object.values(standingsMap).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.exactHitsCount !== a.exactHitsCount) return b.exactHitsCount - a.exactHitsCount;
    return b.forecastsCount - a.forecastsCount; // More predictions is a tie-breaker
  });

  // Assign position index
  return list.map((item, index) => ({
    ...item,
    position: index + 1
  }));
}
