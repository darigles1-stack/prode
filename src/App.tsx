/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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
  Award
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
import { OFFICIAL_WORLD_STAGE_MATCHES } from './lib/worldCupData';

export default function App() {
  // Application Data States
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [matches, setMatches] = useState<SoccerMatch[]>([]);
  const [forecasts, setForecasts] = useState<UserForecast[]>([]);
  const [allForecasts, setAllForecasts] = useState<UserForecast[]>([]);
  const [standings, setStandings] = useState<Standing[]>([]);

  // Corporate Prizes Configuration State
  const [prizes, setPrizes] = useState<{ first: string; second: string; third: string }>(() => {
    const stored = localStorage.getItem('prode_prizes');
    if (stored) return JSON.parse(stored);
    return {
      first: "Smart TV 55'' 4K + Camiseta de la Selección Oficial 🇦🇷",
      second: "Kit de Asado Premium (Tabla de Quebracho con Cubiertos grabados) 🥩",
      third: "Combo Matero Stanley Corporativo BanCo Corrientes 🧉"
    };
  });

  const handleUpdatePrizes = (newPrizes: { first: string; second: string; third: string }) => {
    setPrizes(newPrizes);
    localStorage.setItem('prode_prizes', JSON.stringify(newPrizes));
    window.dispatchEvent(new Event('prode_db_updated'));
  };

  // Page Controls
  const [activeTab, setActiveTab] = useState<'matches' | 'fixture-completo' | 'standings' | 'prode-general' | 'prizes' | 'admin'>('matches');
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Manual Profile creation for the unauthenticated landing screen
  const [customName, setCustomName] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [landingErr, setLandingErr] = useState('');

  // 1. Initial Subscriptions setup
  useEffect(() => {
    // Auth Listener
    const unsubAuth = dbService.onAuthChange((profile) => {
      setCurrentUser(profile);
      setLoadingAuth(false);
    });

    // Matches List Subscription
    const unsubMatches = dbService.subscribeMatches((data) => {
      setMatches(data);
    });

    // General Leaderboard subscription
    const unsubStandings = dbService.subscribeStandings((data) => {
      setStandings(data);
    });

    // All Forecasts subscription
    const unsubAllForecasts = dbService.subscribeAllForecasts((data) => {
      setAllForecasts(data);
    });

    return () => {
      unsubAuth();
      unsubMatches();
      unsubStandings();
      unsubAllForecasts();
    };
  }, []);

  // 2. Personal Forecasts subscription triggered by Active User profile changes
  useEffect(() => {
    if (!currentUser) {
      setForecasts([]);
      return;
    }

    const unsubForecasts = dbService.subscribeUserForecasts(currentUser.uid, (data) => {
      setForecasts(data);
    });

    return () => {
      unsubForecasts();
    };
  }, [currentUser]);

  // Handle Logins
  const handleGoogleLogin = async () => {
    try {
      setLoadingAuth(true);
      await dbService.loginWithGoogle();
    } catch (err) {
      console.error("Login failure:", err);
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
          {loadingAuth ? (
            <motion.div 
              key="auth-loading" 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center p-16 space-y-4 text-center flex-1 h-[60vh]"
            >
              <div className="h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm font-semibold text-slate-500 font-mono">Buscando sesión...</p>
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

              {/* View/Tab selector bar */}
              <div className="flex border-b border-slate-200">
                <button
                  onClick={() => setActiveTab('matches')}
                  className={`flex items-center gap-2 pb-3.5 px-5 text-sm font-bold transition-all relative cursor-pointer ${
                    activeTab === 'matches' 
                      ? 'text-blue-900 font-extrabold' 
                      : 'text-slate-400 hover:text-slate-700'
                  }`}
                >
                  <Calendar className="h-4 w-4" />
                  <span>Fixture y Pronósticos</span>
                  {activeTab === 'matches' && (
                    <motion.div 
                      layoutId="active-tab-line" 
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-700" 
                    />
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('fixture-completo')}
                  className={`flex items-center gap-2 pb-3.5 px-5 text-sm font-bold transition-all relative cursor-pointer ${
                    activeTab === 'fixture-completo' 
                      ? 'text-blue-900 font-extrabold' 
                      : 'text-slate-400 hover:text-slate-700'
                  }`}
                >
                  <Calendar className="h-4 w-4 text-emerald-600" />
                  <span>Fixture Completo 🗓️</span>
                  {activeTab === 'fixture-completo' && (
                    <motion.div 
                      layoutId="active-tab-line" 
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-700" 
                    />
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('standings')}
                  className={`flex items-center gap-2 pb-3.5 px-5 text-sm font-bold transition-all relative cursor-pointer ${
                    activeTab === 'standings' 
                      ? 'text-blue-900 font-extrabold' 
                      : 'text-slate-400 hover:text-slate-700'
                  }`}
                >
                  <Trophy className="h-4 w-4" />
                  <span>Tabla de Posiciones</span>
                  {activeTab === 'standings' && (
                    <motion.div 
                      layoutId="active-tab-line" 
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-700" 
                    />
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('prode-general')}
                  className={`flex items-center gap-2 pb-3.5 px-5 text-sm font-bold transition-all relative cursor-pointer ${
                    activeTab === 'prode-general' 
                      ? 'text-blue-900 font-extrabold' 
                      : 'text-slate-400 hover:text-slate-700'
                  }`}
                >
                  <Grid className="h-4 w-4" />
                  <span>Prode General</span>
                  {activeTab === 'prode-general' && (
                    <motion.div 
                      layoutId="active-tab-line" 
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-700" 
                    />
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('prizes')}
                  className={`flex items-center gap-2 pb-3.5 px-5 text-sm font-bold transition-all relative cursor-pointer ${
                    activeTab === 'prizes' 
                      ? 'text-blue-900 font-extrabold' 
                      : 'text-slate-400 hover:text-slate-700'
                  }`}
                >
                  <Award className="h-4 w-4 text-amber-500" />
                  <span>Premios del Podio</span>
                  {activeTab === 'prizes' && (
                    <motion.div 
                      layoutId="active-tab-line" 
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-700" 
                    />
                  )}
                </button>

                {isUserAdmin && (
                  <button
                    onClick={() => setActiveTab('admin')}
                    className={`flex items-center gap-2 pb-3.5 px-5 text-sm font-bold transition-all relative cursor-pointer ${
                      activeTab === 'admin' 
                        ? 'text-yellow-600 font-extrabold' 
                        : 'text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    <Settings className="h-4 w-4" />
                    <span>Panel de Control (Admin)</span>
                    {activeTab === 'admin' && (
                      <motion.div 
                        layoutId="active-tab-line" 
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-yellow-500" 
                      />
                    )}
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
                  />
                )}

                {activeTab === 'fixture-completo' && (
                  <FixtureCompleto 
                    matches={matches}
                    forecasts={forecasts}
                  />
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
                    prizes={prizes}
                    onUpdatePrizes={handleUpdatePrizes}
                    onLoadOfficialFixture={handleLoadOfficialFixture}
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
