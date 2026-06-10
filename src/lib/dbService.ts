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
  getDocFromServer
} from 'firebase/firestore';
import { SoccerMatch, UserProfile, UserForecast, Standing } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';

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
  firestoreDatabaseId: envConfig.firestoreDatabaseId || firebaseConfig?.firestoreDatabaseId,
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
    matchDate: new Date(Date.now() + 1000 * 60 * 30).toISOString(), // Starts in 30 mins (locked!)
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
              profile = {
                ...userSnap.data(),
                uid: user.uid,
              } as UserProfile;
              
              // Ensure backend admin aligns with the boostrapped rule
              if (isBootstrappedAdmin && !profile.isAdmin) {
                profile.isAdmin = true;
                await updateDoc(userDocRef, { isAdmin: true });
              }
            } else {
              profile = {
                uid: user.uid,
                name: user.displayName || user.email?.split('@')[0] || 'Participante',
                email: user.email || '',
                photoURL: user.photoURL || undefined,
                points: 0,
                isAdmin: isBootstrappedAdmin,
                createdAt: new Date().toISOString()
              };
              
              await setDoc(userDocRef, profile);
              
              // Register also in admins collection if admin
              if (isBootstrappedAdmin) {
                await setDoc(doc(db, 'admins', user.uid), {
                  email: user.email,
                  assignedAt: new Timestamp(Date.now() / 1000, 0)
                });
              }
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
        profile = userSnap.data() as UserProfile;
        if (isBootstrappedAdmin && !profile.isAdmin) {
          profile.isAdmin = true;
          await updateDoc(userDocRef, { isAdmin: true });
        }
      } else {
        profile = {
          uid: user.uid,
          name: user.displayName || user.email?.split('@')[0] || 'Participante',
          email: user.email || '',
          photoURL: user.photoURL || undefined,
          points: 0,
          isAdmin: isBootstrappedAdmin,
          createdAt: new Date().toISOString()
        };
        await setDoc(userDocRef, profile);
        if (isBootstrappedAdmin) {
          await setDoc(doc(db, 'admins', user.uid), { email: user.email });
        }
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
    if (isFirebaseActive && db) {
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
    if (isFirebaseActive && db) {
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

  async addMatch(homeTeam: string, awayTeam: string, matchDateISO: string): Promise<string> {
    const matchData = {
      homeTeam,
      awayTeam,
      matchDate: isFirebaseActive ? Timestamp.fromDate(new Date(matchDateISO)) : matchDateISO,
      status: 'pending' as const,
      createdAt: isFirebaseActive ? Timestamp.now() : new Date().toISOString()
    };

    if (isFirebaseActive && db) {
      try {
        const docRef = await addDoc(collection(db, 'matches'), matchData);
        return docRef.id;
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'matches');
        throw err;
      }
    } else {
      const matches = getLocalData<SoccerMatch>('matches', SEED_MATCHES);
      const newId = `match-${Date.now()}`;
      matches.push({
        id: newId,
        homeTeam,
        awayTeam,
        matchDate: matchDateISO,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      setLocalData('matches', matches);
      window.dispatchEvent(new Event('prode_db_updated'));
      return newId;
    }
  },

  // --- FORECASTS SERVICES ---
  subscribeUserForecasts(userId: string, callback: (forecasts: UserForecast[]) => void) {
    if (isFirebaseActive && db) {
      const q = query(collection(db, 'forecasts'), where('userId', '==', userId));
      return onSnapshot(q, (snapshot) => {
        const forecasts: UserForecast[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          forecasts.push({
            id: doc.id,
            userId: data.userId,
            userName: data.userName,
            userEmail: data.userEmail,
            matchId: data.matchId,
            homeScore: data.homeScore,
            awayScore: data.awayScore,
            pointsEarned: data.pointsEarned ?? null,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt
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
    if (isFirebaseActive && db) {
      return onSnapshot(collection(db, 'forecasts'), (snapshot) => {
        const forecasts: UserForecast[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          forecasts.push({
            id: doc.id,
            userId: data.userId,
            userName: data.userName,
            userEmail: data.userEmail,
            matchId: data.matchId,
            homeScore: data.homeScore,
            awayScore: data.awayScore,
            pointsEarned: data.pointsEarned ?? null,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt
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
    const forecastId = `${userId}_${matchId}`;
    const forecastData = {
      userId,
      userName,
      userEmail,
      matchId,
      homeScore: Number(homeScore),
      awayScore: Number(awayScore),
      updatedAt: isFirebaseActive ? Timestamp.now() : new Date().toISOString()
    };

    if (isFirebaseActive && db) {
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

    if (isFirebaseActive && db) {
      try {
        // 1. Update the match
        const matchRef = doc(db, 'matches', matchId);
        await updateDoc(matchRef, {
          homeScore: finalHomeScore,
          awayScore: finalAwayScore,
          status: 'finished',
          updatedAt: Timestamp.now()
        });

        // 2. Fetch all forecasts for this match
        const forecastsRef = collection(db, 'forecasts');
        const q = query(forecastsRef, where('matchId', '==', matchId));
        const qSnap = await getDocs(q);

        const scoreChanges: { [uid: string]: number } = {};

        // Calculate earned points for each prediction
        for (const fDoc of qSnap.docs) {
          const fData = fDoc.data();
          const pHome = Number(fData.homeScore);
          const pAway = Number(fData.awayScore);

          let pointsEarned = 0;
          if (pHome === finalHomeScore && pAway === finalAwayScore) {
            pointsEarned = 3; // EXACT SCORE MATCH
          } else {
            const forecastResult = Math.sign(pHome - pAway);
            const actualResult = Math.sign(finalHomeScore - finalAwayScore);
            if (forecastResult === actualResult) {
              pointsEarned = 1; // CORRECT WINNER
            }
          }

          // Update forecast point attribution
          await updateDoc(doc(db, 'forecasts', fDoc.id), {
            pointsEarned,
            updatedAt: Timestamp.now()
          });

          scoreChanges[fData.userId] = pointsEarned;
        }

        // 3. Update related cumulative points of users
        for (const userId of Object.keys(scoreChanges)) {
          const userRef = doc(db, 'users', userId);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const currentPoints = userSnap.data().points || 0;
            await updateDoc(userRef, {
              points: currentPoints + scoreChanges[userId],
              updatedAt: Timestamp.now()
            });
          }
        }
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

      const forecasts = getLocalData<UserForecast>('forecasts', SEED_FORECASTS);
      const users = getLocalData<UserProfile>('users', SEED_USERS);

      forecasts.forEach(f => {
        if (f.matchId === matchId) {
          const pHome = Number(f.homeScore);
          const pAway = Number(f.awayScore);

          let pointsEarned = 0;
          if (pHome === finalHomeScore && pAway === finalAwayScore) {
            pointsEarned = 3;
          } else {
            const forecastResult = Math.sign(pHome - pAway);
            const actualResult = Math.sign(finalHomeScore - finalAwayScore);
            if (forecastResult === actualResult) {
              pointsEarned = 1;
            }
          }

          f.pointsEarned = pointsEarned;
          f.updatedAt = new Date().toISOString();

          // Award to users array
          const uIdx = users.findIndex(u => u.uid === f.userId);
          if (uIdx > -1) {
            users[uIdx].points = (users[uIdx].points || 0) + pointsEarned;
            users[uIdx].updatedAt = new Date().toISOString();
          }
        }
      });

      setLocalData('forecasts', forecasts);
      setLocalData('users', users);
      
      // Update session if currently logged in
      const currentUser = localStorage.getItem('prode_current_user');
      if (currentUser) {
        const parsed = JSON.parse(currentUser);
        const updatedUser = users.find(u => u.uid === parsed.uid);
        if (updatedUser) {
          localStorage.setItem('prode_current_user', JSON.stringify(updatedUser));
        }
      }

      window.dispatchEvent(new Event('prode_db_updated'));
    }
  },

  // --- LEADERBOARD STANDINGS ---
  subscribeStandings(callback: (standings: Standing[]) => void) {
    if (isFirebaseActive && db) {
      // Real time stream on users and forecasts to build exact, consistent leaderboard
      return onSnapshot(collection(db, 'users'), (usersSnapshot) => {
        // We also listen to forecasts to enrich extra hits analytics
        onSnapshot(collection(db, 'forecasts'), (forecastsSnapshot) => {
          const users: UserProfile[] = [];
          usersSnapshot.forEach(doc => {
            users.push({ ...doc.data() as UserProfile, uid: doc.id });
          });

          const forecasts: UserForecast[] = [];
          forecastsSnapshot.forEach(doc => {
            forecasts.push(doc.data() as UserForecast);
          });

          const standings = computeStandings(users, forecasts);
          callback(standings);
        });
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'users');
      });
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

  // --- ADMIN USER MANAGEMENT ---
  subscribeUsers(callback: (users: UserProfile[]) => void) {
    if (isFirebaseActive && db) {
      return onSnapshot(collection(db, 'users'), (snapshot) => {
        const users: UserProfile[] = [];
        snapshot.forEach((doc) => {
          users.push({ ...doc.data() as UserProfile, uid: doc.id });
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

  async deleteUser(userId: string): Promise<void> {
    if (isFirebaseActive && db) {
      try {
        await deleteDoc(doc(db, 'users', userId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `users/${userId}`);
        throw err;
      }
    } else {
      const users = getLocalData<UserProfile>('users', SEED_USERS);
      setLocalData('users', users.filter(u => u.uid !== userId));
      window.dispatchEvent(new Event('prode_db_updated'));
    }
  },

  async toggleAdminStatus(userId: string, newIsAdmin: boolean, userEmail: string): Promise<void> {
    if (isFirebaseActive && db) {
      try {
        // Update user doc
        await updateDoc(doc(db, 'users', userId), { isAdmin: newIsAdmin });
        
        // Update admins collection
        if (newIsAdmin) {
          await setDoc(doc(db, 'admins', userId), { email: userEmail, assignedAt: Timestamp.now() });
        } else {
          await deleteDoc(doc(db, 'admins', userId));
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
        throw err;
      }
    } else {
      const users = getLocalData<UserProfile>('users', SEED_USERS);
      const idx = users.findIndex(u => u.uid === userId);
      if (idx > -1) {
        users[idx].isAdmin = newIsAdmin;
        setLocalData('users', users);
        window.dispatchEvent(new Event('prode_db_updated'));
      }
    }
  }
};

// Standings calculation helper
function computeStandings(users: UserProfile[], forecasts: UserForecast[]): Standing[] {
  const standingsMap: { [userId: string]: Standing } = {};

  users.forEach(u => {
    standingsMap[u.uid] = {
      position: 0,
      userId: u.uid,
      userName: u.name,
      userEmail: u.email,
      photoURL: u.photoURL,
      points: u.points || 0,
      forecastsCount: 0,
      exactHitsCount: 0,
      outcomeHitsCount: 0
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
