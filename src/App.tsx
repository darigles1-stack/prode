/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Calendar, 
  Settings, 
  LogIn, 
  UserPlus, 
  ShieldAlert, 
  AlertTriangle,
  Info,
  Grid,
  Award,
  Sparkles,
  TrendingUp,
  Target,
  CheckCircle,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';
// @ts-ignore
import bancoLogo from './assets/images/banco_logo_1781105885770.png';
// @ts-ignore
import doradoLogo from './assets/images/dorado_logo_1781107742273.png';
import { dbService, isFirebaseActive } from './lib/dbService';
import { SoccerMatch, UserProfile, UserForecast, Standing } from './types';
import { Header } from './components/Header';
import { Leaderboard } from './components/Leaderboard';
import { MatchesList } from './components/MatchesList';
import { AdminPanel } from './components/AdminPanel';
import { ProfileSelector } from './components/ProfileSelector';
import { ProdeGeneral } from './components/ProdeGeneral';
import { PrizesTab } from './components/PrizesTab';
import { FixtureCompleto } from './components/FixtureCompleto';
import { PosicionesYCopas } from './components/PosicionesYCopas';
import { OFFICIAL_WORLD_STAGE_MATCHES } from './lib/worldCupData';

export default function App() {
  // Application Data States
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [matches, setMatches] = useState<SoccerMatch[]>([]);
  const [forecasts, setForecasts] = useState<UserForecast[]>([]);
  const [allForecasts, setAllForecasts] = useState<UserForecast[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [enabledPhases, setEnabledPhases] = useState<string[]>(['grupos']);

  // Standing leaderboard derived in-memory to save heavy duplicate database reads
  const standings = useMemo(() => {
    return dbService.computeStandings(users, allForecasts, matches);
  }, [users, allForecasts, matches]);

 const [prizes, setPrizes] = useState<{ first: string; second: string; third: string }>(() => {
  const stored = localStorage.getItem('prode_prizes');
  if (stored) return JSON.parse(stored);
  return {
    first: `1° Premio:
  15.000.000 puntos para canjear en Tienda MÁSBanCo
  Kit de aliento:
  👕 Camiseta + 👒 Piluso + 🏳️ Bandera + 🥤 Termo + 🧉 Mate + 🎒 Mochila`,

      second: `2° Premio:
  10.000.000 puntos para canjear en Tienda MÁSBanCo
  Kit de aliento:
  👕 Camiseta + 🎒 Mochila + 📓 Libreta`,

      third: `3° Premio:
  5.000.000 puntos para canjear en Tienda MÁSBanCo
  Kit de aliento:
  👕 Camiseta + 🧢 Gorro + 🍼 Botella + 📓 Libreta`
    };
  });

  const handleUpdatePrizes = (newPrizes: { first: string; second: string; third: string }) => {
    setPrizes(newPrizes);
    localStorage.setItem('prode_prizes', JSON.stringify(newPrizes));
    window.dispatchEvent(new Event('prode_db_updated'));
  };

  const handleUpdateUser = async (userId: string, updates: Partial<UserProfile>) => {
    try {
      await dbService.updateUserProfile(userId, updates);
      // If we are updating the logged in user, apply state update
      if (currentUser && currentUser.uid === userId) {
        setCurrentUser(prev => prev ? { ...prev, ...updates } : null);
      }
    } catch (e) {
      console.error("Error setting user profile details:", e);
    }
  };

  // Page Controls
  const [activeTab, setActiveTab] = useState<'matches' | 'fixture-completo' | 'posiciones-copas' | 'standings' | 'prode-general' | 'prizes' | 'admin'>('matches');
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingData, setLoadingData] = useState(true);

  // Manual Profile creation for the unauthenticated landing screen
  const [customName, setCustomName] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [landingErr, setLandingErr] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  // 1. Initial Auth status subscription setup
  useEffect(() => {
    // Auth Listener
    const unsubAuth = dbService.onAuthChange((profile) => {
      setCurrentUser(profile);
      setLoadingAuth(false);
    });

    return () => {
      unsubAuth();
    };
  }, []);

  // Automatic Daily sync if needed (once every 24 hours)
  useEffect(() => {
    const runDailySyncIfNeeded = async () => {
      if (!currentUser) return;
      
      const lastSyncStr = localStorage.getItem('prode_last_daily_sync');
      let shouldSync = false;
      if (!lastSyncStr) {
        shouldSync = true;
      } else {
        const lastSync = new Date(lastSyncStr).getTime();
        const diff = Date.now() - lastSync;
        const oneDayMs = 24 * 60 * 60 * 1000;
        if (diff >= oneDayMs) {
          shouldSync = true;
        }
      }

      if (shouldSync) {
        console.log("Ejecutando sincronización automática de pronósticos y puntos diario...");
        try {
          await dbService.syncUserForecastsAndPoints();
          localStorage.setItem('prode_last_daily_sync', new Date().toISOString());
        } catch (e) {
          console.error("Error during automatic sync:", e);
        }
      }
    };

    runDailySyncIfNeeded();
  }, [currentUser]);

  // 2. Data subscriptions triggered by Active User profile changes
  useEffect(() => {
    if (!currentUser) {
      setMatches([]);
      setAllForecasts([]);
      setForecasts([]);
      setUsers([]);
      setLoadingData(true);
      return;
    }

    setLoadingData(true);

    // Matches List Subscription
    const unsubMatches = dbService.subscribeMatches((data) => {
      setMatches(data);
      setLoadingData(false);
    });

    // All Forecasts subscription
    const unsubAllForecasts = dbService.subscribeAllForecasts((data) => {
      setAllForecasts(data);
    });

    // Personal Forecasts subscription
    const unsubForecasts = dbService.subscribeUserForecasts(currentUser.uid, (data) => {
      setForecasts(data);
    });

    // All User Profiles subscription (to display/restrict legajo lists and manage suspensions)
    const unsubUsers = dbService.subscribeUsers((data) => {
      setUsers(data);
    });

    // Global Settings subscription for active phases
    const unsubSettings = dbService.subscribeSettings((data) => {
      setEnabledPhases(data.enabledPhases);
    });

    return () => {
      unsubMatches();
      unsubAllForecasts();
      unsubForecasts();
      unsubUsers();
      unsubSettings();
    };
  }, [currentUser?.uid]);

  // Handle Logins
  const handleGoogleLogin = async () => {
    try {
      setAuthError(null);
      setLoadingAuth(true);
      await dbService.loginWithGoogle();
    } catch (err: any) {
      console.error("Login failure:", err);
      const errMsg = err?.message || String(err);
      if (errMsg.includes('auth/unauthorized-domain') || errMsg.includes('unauthorized-domain')) {
        setAuthError(
          'Error de dominio no autorizado (auth/unauthorized-domain). Tu dominio de Vercel no está autorizado en Google Firebase para iniciar sesión con Google.\n\nPara solucionarlo en 1 minuto:\n1. Entrá a la consola de Firebase: https://console.firebase.google.com/\n2. Seleccioná el proyecto "friendly-forest-6hh41"\n3. Clickeá en "Authentication" (menú izquierdo) y luego en la pestaña "Settings" (Configuración, arriba).\n4. Desplazate a "Authorized domains" (Dominios autorizados) y clickeá "Add domain" (Agregar dominio).\n5. Escribí el dominio de tu sitio de Vercel (por ejemplo, prode-corporativo.vercel.app, sin "https://" ni barras) y guardalo.\n6. ¡Listo! Recargá tu sitio de Vercel e intentá de nuevo.'
        );
      } else if (errMsg.includes('auth/popup-blocked') || errMsg.includes('popup-blocked')) {
        setAuthError(
          '¡Ventana emergente bloqueada! Tu navegador impidió abrir la pantalla de Google. Por favor, permití ventanas emergentes para este sitio e intentá de nuevo.'
        );
      } else if (errMsg.includes('auth/popup-closed-by-user') || errMsg.includes('popup-closed-by-user')) {
        setAuthError(
          'El inicio de sesión fue cancelado porque la ventana emergente de Google se cerró antes de completar el registro.'
        );
      } else {
        setAuthError(`Falló el inicio de sesión: ${errMsg}`);
      }
    } finally {
      setLoadingAuth(false);
    }
  };

  const handleLogout = async () => {
    await dbService.logout();
    setCurrentUser(null);
    setActiveTab('matches');
  };

  const handleSelectSimulatedProfile = async (uid: string) => {
    const profile = await dbService.loginAsMockUser(uid);
    setCurrentUser(profile);
  };

  const handleCreateSimulatedProfile = async (name: string, email: string) => {
    const profile = await dbService.createMockUser(name, email);
    setCurrentUser(profile);
    return profile;
  };

  const handleLandingFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim() || !customEmail.trim()) {
      setLandingErr('Por favor completá todos los campos');
      return;
    }
    if (!customEmail.includes('@')) {
      setLandingErr('Formato de correo inválido');
      return;
    }
    
    setLandingErr('');
    try {
      const u = await dbService.createMockUser(customName.trim(), customEmail.toLowerCase().trim());
      setCurrentUser(u);
    } catch (err) {
      setLandingErr('Error registrando usuario');
    }
  };

  // Actions for Match setups
  const handleAddMatch = async (homeTeam: string, awayTeam: string, matchDateISO: string) => {
    return dbService.addMatch(homeTeam, awayTeam, matchDateISO);
  };

  const handleSettleMatch = async (matchId: string, homeScore: number, awayScore: number) => {
    return dbService.settleMatch(matchId, homeScore, awayScore);
  };

  const handleUnsettleMatch = async (matchId: string) => {
    return dbService.unsettleMatch(matchId);
  };

  const handleGenerateKnockout = async (mode: 'dynamic' | 'placeholder', targetPhase: string = '16avos') => {
    return dbService.generateKnockoutMatches(matches, mode, targetPhase);
  };

  const handleUpdateEnabledPhases = async (phases: string[]) => {
    return dbService.updateEnabledPhases(phases);
  };

  const handleLoadOfficialFixture = async () => {
    // Clear old placeholder/simulated matches to start fresh
    await dbService.clearAllMatches();

    for (const item of OFFICIAL_WORLD_STAGE_MATCHES) {
      const homeWithFlag = `${item.local} ${item.localFlag}`;
      const awayWithFlag = `${item.visitante} ${item.visitanteFlag}`;
      const isoDate = new Date(`${item.fecha}T${item.hora}:00`).toISOString();
      await dbService.addMatch(homeWithFlag, awayWithFlag, isoDate);
    }
    // Dispatch safety event if local storage is active
    window.dispatchEvent(new Event('prode_db_updated'));
  };

  const handleSaveForecast = async (matchId: string, homeScore: number, awayScore: number) => {
    if (!currentUser) return;
    return dbService.saveForecast(
      currentUser.uid,
      currentUser.name,
      currentUser.email,
      matchId,
      homeScore,
      awayScore
    );
  };

  // Display status of User Role
  const isUserAdmin = currentUser?.isAdmin || currentUser?.email === 'darigles1@gmail.com';

  // Find current user's placement and statistics in the standings
  const userStanding = currentUser ? standings.find(s => s.userId === currentUser.uid) : null;
  const userRank = userStanding ? userStanding.position : null;
  const prevRank = userStanding ? (userStanding.previousPosition ?? userStanding.position) : null;
  const userTrend = userStanding ? userStanding.positionTrend : 'same';
  const totalCompetitors = standings.length;
  const userPoints = userStanding ? userStanding.points : (currentUser?.points || 0);
  const exactHits = userStanding ? (userStanding.exactHitsCount || 0) : 0;
  const outcomeHits = userStanding ? (userStanding.outcomeHitsCount || 0) : 0;
  const totalForecasts = userStanding ? (userStanding.forecastsCount || 0) : 0;

  return (
    <div id="app-root" className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      
      {/* 1. Header Navigation HUD */}
      <Header 
        user={currentUser} 
        logo={currentUser ? doradoLogo : bancoLogo}
        isFirebaseActive={isFirebaseActive} 
        onLogout={handleLogout} 
        onLogin={handleGoogleLogin}
        standings={standings}
      />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <AnimatePresence mode="wait">
          {loadingAuth || (currentUser && loadingData) ? (
            <motion.div 
              key="auth-loading" 
              initial={{ opacity: 0, scale: 0.98 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.98 }}
              className="flex flex-col items-center justify-center p-8 sm:p-16 text-center flex-1 min-h-[55vh]"
            >
              {/* Elegant dual-ring orbiting soccer spinner */}
              <div className="relative flex items-center justify-center w-28 h-28 mb-6 select-none">
                {/* Outermost dotted orbit ring */}
                <div className="absolute w-28 h-28 border-2 border-dashed border-blue-600/20 rounded-full animate-[spin_10s_linear_infinite]"></div>
                {/* Secondary sleek teal glass ring */}
                <div className="absolute w-24 h-24 border-4 border-slate-100 border-t-blue-600 border-b-cyan-500 border-l-transparent border-r-transparent rounded-full animate-[spin_1.5s_linear_infinite]"></div>
                {/* Inner glowing core wrapper with rotating ball */}
                <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center shadow-inner relative">
                  <span className="text-4xl animate-[spin_3s_linear_infinite] inline-block filter drop-shadow">
                    ⚽
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight text-blue-950 uppercase">
                  PRODE BANCO DE CORRIENTES
                </h3>
                <p className="text-xs sm:text-sm font-bold text-slate-500 max-w-xs mx-auto flex items-center justify-center gap-1.5 leading-relaxed">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  {loadingAuth ? "Buscando sesión actual..." : "Conectando con la base de datos..."}
                </p>
                <div className="pt-2">
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase bg-slate-150 rounded-full py-1 px-3.5 tracking-wider border border-slate-200 shadow-sm select-none">
                    Cargando Fixture y Pronósticos...
                  </span>
                </div>
              </div>
            </motion.div>
          ) : !currentUser ? (
            // 2. Unauthenticated Cover/Landing View
            <motion.div 
              key="landing-auth"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="max-w-xl mx-auto my-8 bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xl"
            >
              {/* Visual Banner Cover */}
              <div className="bg-gradient-to-br from-blue-950 via-slate-900 to-blue-900 p-8 text-center text-white relative">
                <div className="absolute top-4 right-4 bg-yellow-500/25 border border-yellow-500/20 px-3 py-1 rounded-full text-[10px] font-mono text-yellow-300 animate-pulse">
                  {isFirebaseActive ? 'Servidor Conectado' : 'Modo Simulador'}
                </div>
                
                {/* Brand Corporate Logo */}
                <div className="flex justify-center mb-6">
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="bg-white p-5 rounded-3xl shadow-2xl shadow-slate-950/50 border border-slate-700/20 flex items-center justify-center"
                  >
                    <img 
                      src={bancoLogo} 
                      alt="BanCo - El Banco de Corrientes" 
                      className="h-28 md:h-36 w-auto object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </motion.div>
                </div>

                <h2 className="text-2xl font-black tracking-tight mb-2">Ingresá al Torneo Corporativo</h2>
                <p className="text-xs text-slate-350 max-w-sm mx-auto leading-relaxed">
                  Cargá tus pronósticos de los partidos, ganá puntos según aciertos mecánicos y ascendé en el ranking de empleados de **BanCo Corrientes**.
                </p>
              </div>

              {/* Login Actions selector area */}
              <div className="p-8 space-y-6">
                {isFirebaseActive ? (
                  // Active Firebase flow
                  <div className="space-y-4 text-center">
                    <button
                      onClick={handleGoogleLogin}
                      className="w-full py-3.5 px-4 bg-blue-700 hover:bg-blue-800 text-white font-extrabold rounded-2xl text-sm transition-all shadow-md shadow-blue-950/20 flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      <LogIn className="h-5 w-5" />
                      <span>Iniciar Sesión con Google</span>
                    </button>
                    <p className="text-[11px] text-slate-400">
                      Usa tu cuenta de Google para registrar tus predicciones de forma segura.
                    </p>

                    {authError && (
                      <div className="bg-rose-50 border border-rose-200/60 p-4 rounded-xl text-xs text-rose-850 text-left space-y-2 mt-4 shadow-sm">
                        <div className="flex items-start space-x-2">
                          <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-rose-950 text-sm block">Error de Autenticación</span>
                            <p className="mt-1 leading-relaxed text-rose-800 font-medium whitespace-pre-line">
                              {authError}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  // Local Simulated Auth Flow
                  <div className="space-y-6">
                    <div className="bg-blue-50/75 border border-blue-200/60 p-4 rounded-xl text-xs text-blue-850 flex items-start space-x-2.5">
                      <Info className="h-4.5 w-4.5 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Información de Desarrollo / Demostración</span>
                        <p className="mt-1 leading-relaxed text-blue-750">
                          La base de datos Firebase no ha sido vinculada todavía en este espacio. No te preocupes: el sistema está corriendo sobre un <strong>Simulador Local en Memoria (LocalStorage)</strong> 100% funcional y listo para usarse. Podés crear cualquier perfil ficticio o usar uno pre-seeded abajo.
                        </p>
                      </div>
                    </div>

                    {/* Preconfigured Fast logins */}
                    <div className="space-y-2.5">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Logins rápidos listos para testear:
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <button
                          onClick={() => handleSelectSimulatedProfile('mock-user-1')}
                          className="p-3 text-left bg-slate-50 border border-slate-200 hover:border-blue-300 rounded-xl transition-all text-xs cursor-pointer"
                        >
                          <div className="font-bold text-slate-800 text-left">Lionel Messi</div>
                          <span className="text-[10px] text-slate-400 font-mono block mt-0.5">messi@corporate.com</span>
                        </button>
                        <button
                          onClick={() => handleSelectSimulatedProfile('mock-user-2')}
                          className="p-3 text-left bg-slate-50 border border-slate-200 hover:border-blue-300 rounded-xl transition-all text-xs cursor-pointer"
                        >
                          <div className="font-bold text-slate-800 text-left">Kylian Mbappé</div>
                          <span className="text-[10px] text-slate-400 font-mono block mt-0.5">mbappe@corporate.com</span>
                        </button>
                        <button
                          onClick={() => handleSelectSimulatedProfile('admin-darigles')}
                          className="p-3 text-left bg-blue-50/50 border border-blue-200 hover:bg-blue-50 rounded-xl transition-all text-xs cursor-pointer"
                        >
                          <div className="font-bold text-blue-800 text-left">Darío (Admin)</div>
                          <span className="text-[10px] text-blue-600 font-mono block mt-0.5">darigles1@gmail.com</span>
                        </button>
                      </div>
                    </div>

                    {/* Custom simulated registration */}
                    <div className="border-t border-slate-100 pt-5">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                        O registrarse como nuevo empleado simulated:
                      </h4>
                      <form onSubmit={handleLandingFormSubmit} className="space-y-3.5">
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="text"
                            placeholder="Nombre y Apellido"
                            value={customName}
                            onChange={(e) => setCustomName(e.target.value)}
                            className="px-3 py-2 border rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white bg-slate-50 text-slate-800"
                          />
                          <input
                            type="email"
                            placeholder="correo@empresa.com"
                            value={customEmail}
                            onChange={(e) => setCustomEmail(e.target.value)}
                            className="px-3 py-2 border rounded-xl text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white bg-slate-50 text-slate-800"
                          />
                        </div>

                        {landingErr && (
                          <p className="text-xs text-rose-500 font-medium">{landingErr}</p>
                        )}

                        <button
                          type="submit"
                          className="w-full py-2.5 bg-yellow-400 hover:bg-yellow-500 text-blue-950 font-extrabold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-all shadow-sm cursor-pointer"
                        >
                          <UserPlus className="h-4 w-4" />
                          <span>Registrarse e Ingresar</span>
                        </button>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ) : currentUser.isBanned ? (
            // Banned / Suspended account view
            <motion.div 
              key="auth-banned"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="max-w-xl mx-auto my-12 bg-white border border-rose-200 rounded-3xl overflow-hidden shadow-xl text-left"
            >
              <div className="bg-gradient-to-br from-rose-950 via-rose-905 to-red-900 p-8 text-center text-white">
                <div className="inline-flex p-3 bg-red-500/20 border border-red-500/30 rounded-2xl mb-3 animate-pulse">
                  <ShieldAlert className="h-8 w-8 text-rose-400" />
                </div>
                <h2 className="text-xl font-black tracking-tight text-white">
                  Acceso Suspendido Administrativamente
                </h2>
                <p className="text-xs text-rose-200 mt-1">
                  Tu ficha de usuario ha sido suspendida para resguardar las reglas de competencia del Prode
                </p>
              </div>
              <div className="p-6 md:p-8 space-y-5">
                <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl text-xs text-rose-900 leading-relaxed">
                  <span className="font-extrabold block mb-1">⚠️ Aviso Importante:</span>
                  Estimado/a <strong>{currentUser.name}</strong>, el panel de auditoría de BanCo Corrientes ha restringido de manera temporal o definitiva tu participación. No podrás registrar nuevos pronósticos, ver marcadores, ni cobrar/reclamar premios oficiales adheridos a las bases.
                </div>
                <p className="text-xs text-slate-500 text-center leading-relaxed">
                  Si considerás que esto se trata de un error o necesitás más aclaraciones, por favor ponte en contacto directo con tu respectiva <strong>Gerencia de Área</strong> o con la Dirección de Recursos Humanos de la institución.
                </p>
              </div>
            </motion.div>
          ) : (
            // 3. Authenticated App Home View
            <motion.div 
              key="auth-home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Optional Local Profile switcher widget at the top */}
              {!isFirebaseActive && (
                <ProfileSelector 
                  currentUser={currentUser} 
                  onSelectUser={handleSelectSimulatedProfile} 
                  onCreateUser={handleCreateSimulatedProfile}
                />
              )}

              {/* Profile complete alert warning panel (Legajo y Gerencia) */}
              {currentUser && (!currentUser.legajo || !currentUser.gerencia) && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-3xl p-6 shadow-sm text-left relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                    <Trophy className="h-40 w-40 text-blue-900" />
                  </div>
                  <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center space-x-2 text-blue-900 font-extrabold text-sm">
                        <span className="bg-blue-600 text-white rounded-full p-1 leading-none shrink-0 text-[10px]">⚠️</span>
                        <span>¡Completá tus datos para calificar a los Premios oficiales!</span>
                      </div>
                      <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                        Para tener derecho a reclamar los premios oficiales es obligatorio registrar tu Número de Legajo y Gerencia del Banco de Corrientes.
                      </p>
                      
                      {/* Inline compact inputs */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3.5 mt-4">
                        <div className="flex-1 max-w-xs text-left">
                          <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Número de Legajo</label>
                          <input 
                            type="text"
                            placeholder="Ej. 10452"
                            id="profile-input-legajo"
                            defaultValue={currentUser.legajo || ''}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        
                        <div className="flex-1 max-w-xs text-left">
                          <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Gerencia / Sucursal</label>
                          <input 
                            type="text"
                            placeholder="Ej. Gerencia de Sistemas"
                            id="profile-input-gerencia"
                            defaultValue={currentUser.gerencia || ''}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={async () => {
                            const legajoEl = document.getElementById('profile-input-legajo') as HTMLInputElement;
                            const gerenciaEl = document.getElementById('profile-input-gerencia') as HTMLInputElement;
                            const legajo = legajoEl?.value.trim() || '';
                            const gerencia = gerenciaEl?.value.trim() || '';
                            if (legajo && gerencia) {
                              await dbService.updateUserProfile(currentUser.uid, { legajo, gerencia });
                              setCurrentUser(prev => prev ? { ...prev, legajo, gerencia } : null);
                            }
                          }}
                          className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-extrabold text-xs rounded-xl shadow-md transition-all shrink-0 cursor-pointer"
                        >
                          Guardar Datos
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Compact Active User Profile Metadata display & update */}
              {currentUser && currentUser.legajo && currentUser.gerencia && (
                <div className="bg-slate-100 border border-slate-200 rounded-2xl p-3 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left text-xs">
                  <div className="flex flex-wrap items-center gap-2 text-slate-600">
                    <span className="font-bold text-slate-700">Mi Ficha de Empleado:</span>
                    <span className="bg-white border text-slate-700 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md">
                      Legajo: #{currentUser.legajo}
                    </span>
                    <span className="bg-white border text-slate-700 text-[10px] font-bold px-2.5 py-0.5 rounded-md">
                      Sector: {currentUser.gerencia}
                    </span>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => {
                      // Trigger re-edit by temporarily clearing states locally so the input card renders
                      setCurrentUser(prev => prev ? { ...prev, legajo: undefined, gerencia: undefined } : null);
                    }}
                    className="text-blue-700 hover:text-blue-800 font-extrabold text-[11px] flex items-center gap-1 cursor-pointer select-none"
                  >
                    ✏️ Modificar mis datos de legajo
                  </button>
                </div>
              )}

              {/* COMPLEMENTO VISUAL: PANEL PRINCIPAL DE RENDIMIENTO Y ESTADÍSTICAS - VERSIÓN ULTRA COMPACTA (REDUCIDA AL 50%) */}
              {currentUser && (
                <div id="user-performance-dashboard-hero" className="bg-gradient-to-r from-blue-950 to-indigo-950 rounded-2xl p-3 md:p-3.5 text-white shadow-md border border-blue-800/60 relative overflow-hidden text-left my-3 w-full">
                  {/* Decorative faint background watermark */}
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none select-none">
                    <Trophy className="h-16 w-16 text-yellow-300" />
                  </div>

                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 relative z-10">
                    {/* Left header identification */}
                    <div className="flex items-center gap-2.5">
                      <div className="bg-yellow-400/10 p-1.5 rounded-lg border border-yellow-400/20 shrink-0">
                        <Sparkles className="h-4 w-4 text-yellow-400" />
                      </div>
                      <div>
                        <div className="text-[9px] font-extrabold text-blue-300 tracking-wider uppercase leading-none">Mi Desempeño Oficial</div>
                        <div className="text-xs font-black text-white flex items-center gap-1.5 mt-0.5">
                          <span className="truncate max-w-[130px]">{currentUser.name || 'Mi Cuenta'}</span>
                          {userRank && (
                            <span className="text-[9px] bg-emerald-500/25 text-emerald-300 font-extrabold px-1.5 py-0.5 rounded-md border border-emerald-500/35">
                              Top {Math.max(1, Math.round((userRank / totalCompetitors) * 100))}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Stats horizontal strip - Ultra space saver */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 flex-grow md:flex-initial md:min-w-[620px]">
                      {/* PUNTOS */}
                      <div className="bg-white/5 border border-white/10 rounded-xl px-2.5 py-1 flex items-center justify-between gap-2 hover:bg-white/[8%] transition-colors">
                        <div>
                          <div className="text-[8px] text-slate-350 font-extrabold uppercase tracking-wide">Puntos</div>
                          <div className="text-base font-black text-yellow-300 font-mono leading-tight">{userPoints}</div>
                        </div>
                        <Target className="h-3.5 w-3.5 text-yellow-400/70 shrink-0" />
                      </div>

                      {/* POSICIÓN */}
                      <div className="bg-white/5 border border-white/10 rounded-xl px-2.5 py-1 flex items-center justify-between gap-2 hover:bg-white/[8%] transition-colors">
                        <div>
                          <div className="text-[8px] text-slate-350 font-extrabold uppercase tracking-wide">Puesto Actual</div>
                          <div className="text-base font-black text-emerald-300 font-mono leading-tight">
                            {userRank !== null ? `#${userRank}` : 'S/D'}
                          </div>
                          {prevRank !== null && (
                            <div className="text-[8.5px] text-indigo-200/80 font-bold font-mono mt-0.5">
                              Anterior: #{prevRank}
                            </div>
                          )}
                        </div>
                        <TrendingUp className="h-3.5 w-3.5 text-emerald-400/70 shrink-0" />
                      </div>

                      {/* TENDENCIA */}
                      <div className="bg-white/5 border border-white/10 rounded-xl px-2.5 py-1 flex items-center justify-between gap-2 hover:bg-white/[8%] transition-colors">
                        <div>
                          <div className="text-[8px] text-slate-350 font-extrabold uppercase tracking-wide">Tendencia</div>
                          <div className="text-[11px] font-black leading-tight flex items-center gap-1 mt-0.5">
                            {userTrend === 'up' && (
                              <span className="text-emerald-400 flex items-center gap-0.5" title="¡Subiste posiciones en la última fecha!">
                                <ArrowUp className="h-3.5 w-3.5 stroke-[3px]" />
                                Subió
                              </span>
                            )}
                            {userTrend === 'down' && (
                              <span className="text-rose-450 flex items-center gap-0.5" title="Bajaste posiciones en la última fecha">
                                <ArrowDown className="h-3.5 w-3.5 stroke-[3px]" />
                                Bajó
                              </span>
                            )}
                            {(userTrend === 'same' || !userTrend) && (
                              <span className="text-slate-300 flex items-center gap-0.5" title="Mantuviste tu posición">
                                <Minus className="h-3 w-3 stroke-[3px]" />
                                Igual
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* PLENOS */}
                      <div className="bg-white/5 border border-white/10 rounded-xl px-2.5 py-1 flex items-center justify-between gap-2 hover:bg-white/[8%] transition-colors">
                        <div>
                          <div className="text-[8px] text-slate-350 font-extrabold uppercase tracking-wide">Plenos (3p)</div>
                          <div className="text-base font-black text-cyan-300 font-mono leading-tight">{exactHits}</div>
                        </div>
                        <Award className="h-3.5 w-3.5 text-cyan-400/70 shrink-0" />
                      </div>

                      {/* ACIERTOS */}
                      <div className="bg-white/5 border border-white/10 rounded-xl px-2.5 py-1 flex items-center justify-between gap-2 hover:bg-white/[8%] transition-colors">
                        <div>
                          <div className="text-[8px] text-slate-350 font-extrabold uppercase tracking-wide">Aciertos (1p)</div>
                          <div className="text-base font-black text-purple-300 font-mono leading-tight">{outcomeHits}</div>
                        </div>
                        <CheckCircle className="h-3.5 w-3.5 text-purple-400/70 shrink-0" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* View/Tab selector bar */}
              <div id="main-tabs-selector" className="flex flex-wrap border-b border-slate-200 pb-2.5 gap-2 select-none justify-start">
                <button
                  type="button"
                  id="tab-matches"
                  onClick={() => setActiveTab('matches')}
                  className={`flex items-center gap-1.5 py-2 px-3 sm:px-4 text-xs sm:text-sm font-bold rounded-xl transition-all relative cursor-pointer select-none ${
                    activeTab === 'matches' 
                      ? 'bg-blue-50/85 text-blue-900 border-b-2 border-blue-700 shadow-sm font-extrabold' 
                      : 'bg-slate-50/70 text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                  }`}
                >
                  <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4 text-blue-700 shrink-0" />
                  <span>Fixture y Pronósticos</span>
                </button>

                <button
                  type="button"
                  id="tab-fixture-completo"
                  onClick={() => setActiveTab('fixture-completo')}
                  className={`flex items-center gap-1.5 py-2 px-3 sm:px-4 text-xs sm:text-sm font-bold rounded-xl transition-all relative cursor-pointer select-none ${
                    activeTab === 'fixture-completo' 
                      ? 'bg-blue-50/85 text-blue-900 border-b-2 border-blue-700 shadow-sm font-extrabold' 
                      : 'bg-slate-50/70 text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                  }`}
                >
                  <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4 text-emerald-600 shrink-0" />
                  <span>Fixture Completo 🗓️</span>
                </button>

                <button
                  type="button"
                  id="tab-posiciones-copas"
                  onClick={() => setActiveTab('posiciones-copas')}
                  className={`flex items-center gap-1.5 py-2 px-3 sm:px-4 text-xs sm:text-sm font-bold rounded-xl transition-all relative cursor-pointer select-none ${
                    activeTab === 'posiciones-copas' 
                      ? 'bg-blue-50/85 text-blue-900 border-b-2 border-blue-700 shadow-sm font-extrabold' 
                      : 'bg-slate-50/70 text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                  }`}
                >
                  <Trophy className="h-3.5 w-3.5 md:h-4 md:w-4 text-amber-500 shrink-0" />
                  <span>Tablas y Copas 🏆</span>
                </button>

                <button
                  type="button"
                  id="tab-standings"
                  onClick={() => setActiveTab('standings')}
                  className={`flex items-center gap-1.5 py-2 px-3 sm:px-4 text-xs sm:text-sm font-bold rounded-xl transition-all relative cursor-pointer select-none ${
                    activeTab === 'standings' 
                      ? 'bg-blue-50/85 text-blue-900 border-b-2 border-blue-700 shadow-sm font-extrabold' 
                      : 'bg-slate-50/70 text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                  }`}
                >
                  <Trophy className="h-3.5 w-3.5 md:h-4 md:w-4 shrink-0" />
                  <span>Tabla de Posiciones</span>
                </button>

                <button
                  type="button"
                  id="tab-prode-general"
                  onClick={() => setActiveTab('prode-general')}
                  className={`flex items-center gap-1.5 py-2 px-3 sm:px-4 text-xs sm:text-sm font-bold rounded-xl transition-all relative cursor-pointer select-none ${
                    activeTab === 'prode-general' 
                      ? 'bg-blue-50/85 text-blue-900 border-b-2 border-blue-700 shadow-sm font-extrabold' 
                      : 'bg-slate-50/70 text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                  }`}
                >
                  <Grid className="h-3.5 w-3.5 md:h-4 md:w-4 shrink-0" />
                  <span>Prode General 👥</span>
                </button>

                <button
                  type="button"
                  id="tab-prizes"
                  onClick={() => setActiveTab('prizes')}
                  className={`flex items-center gap-1.5 py-2 px-3 sm:px-4 text-xs sm:text-sm font-bold rounded-xl transition-all relative cursor-pointer select-none ${
                    activeTab === 'prizes' 
                      ? 'bg-blue-50/85 text-blue-900 border-b-2 border-blue-700 shadow-sm font-extrabold' 
                      : 'bg-slate-50/70 text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                  }`}
                >
                  <Award className="h-3.5 w-3.5 md:h-4 md:w-4 text-amber-500 shrink-0" />
                  <span>Premios del Podio 🎁</span>
                </button>

                {isUserAdmin && (
                  <button
                    type="button"
                    id="tab-admin"
                    onClick={() => setActiveTab('admin')}
                    className={`flex items-center gap-1.5 py-2 px-3 sm:px-4 text-xs sm:text-sm font-extrabold rounded-xl transition-all relative cursor-pointer select-none ${
                      activeTab === 'admin' 
                        ? 'bg-yellow-50 text-yellow-800 border-b-2 border-yellow-600 shadow-sm' 
                        : 'bg-slate-50/75 text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                    }`}
                  >
                    <Settings className="h-3.5 w-3.5 md:h-4 md:w-4 text-yellow-600 shrink-0 animate-pulse" />
                    <span>Panel de Control (Admin) ⚙️</span>
                  </button>
                )}
              </div>

              {/* Active Tab rendering */}
              <div className="pt-2">
                {activeTab === 'matches' && (
                  <MatchesList 
                    matches={matches} 
                    forecasts={forecasts} 
                    allForecasts={allForecasts}
                    onSaveForecast={handleSaveForecast} 
                    userId={currentUser.uid}
                    isUserAdmin={isUserAdmin}
                    onLoadOfficialFixture={handleLoadOfficialFixture}
                    enabledPhases={enabledPhases}
                    onGenerateKnockout={handleGenerateKnockout}
                  />
                )}

                {activeTab === 'fixture-completo' && (
                  <FixtureCompleto 
                    matches={matches}
                    forecasts={forecasts}
                  />
                )}

                {activeTab === 'posiciones-copas' && (
                  <PosicionesYCopas matches={matches} />
                )}

                {activeTab === 'standings' && (
                  <Leaderboard 
                    standings={standings} 
                    currentUser={currentUser}
                    prizes={prizes}
                  />
                )}

                {activeTab === 'prode-general' && (
                  <ProdeGeneral
                    matches={matches}
                    standings={standings}
                    allForecasts={allForecasts}
                    currentUserUid={currentUser.uid}
                    isUserAdmin={isUserAdmin}
                  />
                )}

                {activeTab === 'prizes' && (
                  <PrizesTab prizes={prizes} />
                )}

                {activeTab === 'admin' && isUserAdmin && (
                  <AdminPanel 
                    currentUser={currentUser!}
                    matches={matches} 
                    onAddMatch={handleAddMatch} 
                    onSettleMatch={handleSettleMatch}
                    onUnsettleMatch={handleUnsettleMatch}
                    prizes={prizes}
                    onUpdatePrizes={handleUpdatePrizes}
                    onLoadOfficialFixture={handleLoadOfficialFixture}
                    onGenerateKnockout={handleGenerateKnockout}
                    enabledPhases={enabledPhases}
                    onUpdateEnabledPhases={handleUpdateEnabledPhases}
                    users={users}
                    onUpdateUser={handleUpdateUser}
                  />
                )}
              </div>

            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer Info credit with corporate AI and bonding notice */}
      <footer className="py-8 border-t border-slate-200 text-center text-xs text-slate-500 mt-12 bg-white">
        <div className="max-w-3xl mx-auto px-4 space-y-4">
          <p className="font-black text-slate-700">Prode Corporativo Web – Torneo Oficial de Empleados de BanCo</p>
          
          <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl text-left space-y-2.5 text-[11px] text-slate-600 max-w-2xl mx-auto leading-relaxed">
            <span className="font-bold text-blue-900 block text-center">
              🤖 Sistema Diseñado & Acelerado con Inteligencia Artificial (IA)
            </span>
            <p className="text-center text-slate-500 text-xs">
              Nos complace compartir con todos los colaboradores de <strong>Banco de Corrientes S.A.</strong> que esta plataforma interactiva de pronósticos deportivos ha sido desarrollada y perfeccionada utilizando la última generación de <strong>Inteligencia Artificial</strong>. Esta potente sinergia nos demuestra cómo la tecnología nos ampara para acelerar tareas complejas, automatizar cálculos interactivos y promover la integración y diversión sana entre los equipos de la institución.
            </p>
            <p className="font-bold text-center text-blue-900 mt-2 select-none">
              ¡Les deseamos el mayor de los éxitos en sus predicciones y marcadores! ⚽🇦🇷🧉
            </p>
          </div>
          
          <p className="text-[10px] text-slate-400">
            © {new Date().getFullYear()} Banco de Corrientes S.A. • Procesamiento de Datos Protegido
          </p>
        </div>
      </footer>

    </div>
  );
}
