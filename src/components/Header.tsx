import React from 'react';
import { Trophy, LogOut, LogIn, Database, Sparkles } from 'lucide-react';
import { UserProfile, Standing } from '../types';

interface HeaderProps {
  user: UserProfile | null;
  logo: string;
  isFirebaseActive: boolean;
  onLogout: () => void;
  onLogin: () => void;
  standings: Standing[];
}

export const Header: React.FC<HeaderProps> = ({ 
  user, 
  logo,
  isFirebaseActive, 
  onLogout, 
  onLogin,
  standings
}) => {
  // Find current user's placement in the standings
  const userStanding = user ? standings.find(s => s.userId === user.uid) : null;
  const userRank = userStanding ? userStanding.position : null;
  const totalCompetitors = standings.length;

  return (
    <header id="app-header" className="bg-blue-950 border-b border-blue-900 text-white sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Main Logo & Title */}
          <div className="flex items-center space-x-3">
            {user ? (
              <div className="bg-white p-0.5 rounded-full shadow-md border-2 border-yellow-400 flex items-center justify-center h-12 w-12 overflow-hidden shrink-0">
                <img src={logo} alt="Banco Dorado Logo" className="h-full w-full object-contain" referrerPolicy="no-referrer" />
              </div>
            ) : (
              <div className="bg-yellow-400 p-2.5 rounded-xl shadow-lg shadow-blue-950 border border-yellow-300">
                <Trophy className="h-6 w-6 text-blue-955 text-blue-950 animate-pulse" />
              </div>
            )}
            <div>
              <h1 className="text-xl font-black tracking-tight bg-gradient-to-r from-yellow-400 via-white to-yellow-300 bg-clip-text text-transparent">
                Prode Corporativo Web
              </h1>
              <p className="text-xs text-blue-200 font-medium font-sans">
                Torneo de Pronósticos Oficial de Empleados
              </p>
            </div>
          </div>

          {/* Context Badges & User Panel */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Database Engine Status Badge */}
            <div className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-mono border ${
              isFirebaseActive 
                ? 'bg-blue-900/50 text-yellow-300 border-blue-800' 
                : 'bg-amber-950/40 text-amber-400 border-amber-900/60'
            }`}>
              <Database className="h-3.5 w-3.5" />
              <span>{isFirebaseActive ? 'Firestore Activo' : 'Simulador Local (Portable)'}</span>
            </div>

            {user ? (
              <div className="flex items-center gap-4 bg-blue-900/40 border border-blue-800/80 pl-3 pr-1 py-1 rounded-xl">
                {/* User Info & Stats Overview */}
                <div className="text-right">
                  <div className="font-semibold text-sm text-slate-100 max-w-[140px] truncate">
                    {user.name}
                  </div>
                  <div className="flex items-center justify-end space-x-2 text-[10px] text-blue-200 font-mono">
                    <span className="flex items-center text-yellow-400 font-bold">
                      <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                      {user.points} Puntos
                    </span>
                    {userRank !== null && (
                      <span className="border-l border-blue-800 pl-1.5">
                        Posición: #{userRank}/{totalCompetitors}
                      </span>
                    )}
                  </div>
                </div>

                {/* Profile Pic & Log Out Button */}
                <div className="flex items-center space-x-1">
                  {user.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt={user.name} 
                      className="h-8 w-8 rounded-lg border border-yellow-400/50"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-lg bg-blue-700 flex items-center justify-center font-bold text-sm text-white">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <button
                    id="btn-logout"
                    onClick={onLogout}
                    className="p-1.5 hover:bg-blue-900 text-slate-400 hover:text-rose-400 rounded-lg transition-all cursor-pointer"
                    title="Cerrar sesión"
                  >
                    <LogOut className="h-4.5 w-4.5" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                id="btn-login-header"
                onClick={onLogin}
                className="flex items-center space-x-2 bg-yellow-400 hover:bg-yellow-500 text-blue-950 text-sm font-extrabold px-4 py-2 rounded-xl transition-all shadow-md shadow-slate-950/20 cursor-pointer"
              >
                <LogIn className="h-4 w-4" />
                <span>Ingresar</span>
              </button>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
