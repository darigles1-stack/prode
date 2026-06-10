import React, { useState, useEffect } from 'react';
import { PlusCircle, CheckCircle, Award, Calendar, RefreshCcw, ShieldAlert, Sparkles, Users, Trash2, Shield, ShieldOff } from 'lucide-react';
import { SoccerMatch, UserProfile } from '../types';
import { dbService } from '../lib/dbService';

interface AdminPanelProps {
  currentUser: UserProfile;
  matches: SoccerMatch[];
  onAddMatch: (homeTeam: string, awayTeam: string, matchDateISO: string) => Promise<string>;
  onSettleMatch: (matchId: string, homeScore: number, awayScore: number) => Promise<void>;
  prizes: { first: string; second: string; third: string };
  onUpdatePrizes: (newPrizes: { first: string; second: string; third: string }) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  matches,
  onAddMatch,
  onSettleMatch,
  prizes,
  onUpdatePrizes
}) => {
  // --- User Management ---
  const [users, setUsers] = useState<UserProfile[]>([]);
  
  useEffect(() => {
    const unsub = dbService.subscribeUsers((data) => {
      setUsers(data);
    });
    return () => unsub();
  }, []);

  const handleToggleAdmin = async (userId: string, currentStatus: boolean, userEmail: string) => {
    if (userId === currentUser.uid) return;
    try {
      await dbService.toggleAdminStatus(userId, !currentStatus, userEmail);
    } catch (e) {
      console.error(e);
      alert('Error cambiando estado de admin');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === currentUser.uid) return;
    if (window.confirm('¿Estás seguro de que querés eliminar a este usuario del torneo? Esto borrará su cuenta, pero sus pronósticos podrían quedar huérfanos. ¿Continuar?')) {
      try {
        await dbService.deleteUser(userId);
      } catch (e) {
        console.error(e);
        alert('Error eliminando usuario');
      }
    }
  };

  // New match form states
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [matchDate, setMatchDate] = useState('');
  const [formErr, setFormErr] = useState('');
  const [formSuccess, setFormSuccess] = useState(false);
  const [adding, setAdding] = useState(false);

  // Prizes config states
  const [prizeFirst, setPrizeFirst] = useState(prizes.first);
  const [prizeSecond, setPrizeSecond] = useState(prizes.second);
  const [prizeThird, setPrizeThird] = useState(prizes.third);
  const [prizeSuccess, setPrizeSuccess] = useState(false);

  const handleSavePrizes = () => {
    onUpdatePrizes({
      first: prizeFirst,
      second: prizeSecond,
      third: prizeThird
    });
    setPrizeSuccess(true);
    setTimeout(() => setPrizeSuccess(false), 2500);
  };

  // Score inputs for settling matches
  const [settleScores, setSettleScores] = useState<{ [matchId: string]: { home: string; away: string } }>({});
  const [settlingId, setSettlingId] = useState<string | null>(null);
  const [settleErr, setSettleErr] = useState<{ [matchId: string]: string }>({});

  const handleCreateMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!homeTeam.trim() || !awayTeam.trim() || !matchDate) {
      setFormErr('Por favor completá todos los campos');
      return;
    }

    setFormErr('');
    setAdding(true);

    try {
      // Structure team name to have some emoji flags if none entered
      let homeWithEmoji = homeTeam.trim();
      let awayWithEmoji = awayTeam.trim();

      // Simple emoji guesses for Latin America/European corporate matchups
      const addFlag = (name: string) => {
        const lower = name.toLowerCase();
        if (lower.includes('argentina') && !lower.includes('🇦🇷')) return name + ' 🇦🇷';
        if (lower.includes('brasil') && !lower.includes('🇧🇷')) return name + ' 🇧🇷';
        if (lower.includes('francia') && !lower.includes('🇫🇷')) return name + ' 🇫🇷';
        if (lower.includes('alemania') && !lower.includes('🇩🇪')) return name + ' 🇩🇪';
        if (lower.includes('españa') && !lower.includes('🇪🇸')) return name + ' 🇪🇸';
        if (lower.includes('italia') && !lower.includes('🇮🇹')) return name + ' 🇮🇹';
        if (lower.includes('inglaterra') && !lower.includes('🏴󠁧󠁢󠁥󠁮󠁧󠁿')) return name + ' 🏴󠁧󠁢󠁥󠁮󠁧󠁿';
        if (lower.includes('uruguay') && !lower.includes('🇺🇾')) return name + ' 🇺🇾';
        if (lower.includes('colombia') && !lower.includes('🇨🇴')) return name + ' 🇨🇴';
        if (lower.includes('chile') && !lower.includes('🇨🇱')) return name + ' 🇨🇱';
        if (lower.includes('méxico') && !lower.includes('🇲🇽')) return name + ' 🇲🇽';
        if (lower.includes('paraguay') && !lower.includes('🇵🇾')) return name + ' 🇵🇾';
        return name + ' ⚽';
      };

      homeWithEmoji = addFlag(homeWithEmoji);
      awayWithEmoji = addFlag(awayWithEmoji);

      // Convert date string locale input (local) to ISO string
      const isoDate = new Date(matchDate).toISOString();
      await onAddMatch(homeWithEmoji, awayWithEmoji, isoDate);
      
      setFormSuccess(true);
      setHomeTeam('');
      setAwayTeam('');
      setMatchDate('');
      
      setTimeout(() => setFormSuccess(false), 3000);
    } catch (err) {
      setFormErr('Error agregando partido');
    } finally {
      setAdding(false);
    }
  };

  const handleSettleScoreChange = (matchId: string, team: 'home' | 'away', val: string) => {
    const sanitizedVal = val.replace(/[^0-9]/g, '');
    setSettleScores(prev => ({
      ...prev,
      [matchId]: {
        ...prev[matchId] || { home: '', away: '' },
        [team]: sanitizedVal
      }
    }));
  };

  const handleSettleMatchAction = async (matchId: string) => {
    const scores = settleScores[matchId];
    if (!scores || scores.home === '' || scores.away === '') {
      setSettleErr(prev => ({ ...prev, [matchId]: 'Ingresá el resultado final de ambos equipos' }));
      return;
    }

    const home = parseInt(scores.home, 10);
    const away = parseInt(scores.away, 10);

    if (isNaN(home) || isNaN(away)) {
      setSettleErr(prev => ({ ...prev, [matchId]: 'Goles inválidos' }));
      return;
    }

    setSettleErr(prev => ({ ...prev, [matchId]: '' }));
    setSettlingId(matchId);

    try {
      await onSettleMatch(matchId, home, away);
      // Remove settled scores entry
      setSettleScores(prev => {
        const copy = { ...prev };
        delete copy[matchId];
        return copy;
      });
    } catch (err) {
      setSettleErr(prev => ({ ...prev, [matchId]: 'Hubo un error liquidando el partido' }));
    } finally {
      setSettlingId(null);
    }
  };

  // Only obtain pending matches to calculate settling scores
  const pendingMatches = matches.filter(m => m.status === 'pending');

  return (
    <div id="admin-panel" className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
      
      {/* Stacked forms Column */}
      <div className="lg:col-span-1 space-y-6">
        
        {/* 1. Add Match form module */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm h-fit">
          <h3 className="text-base font-bold text-blue-900 mb-1 flex items-center gap-1.5">
            <PlusCircle className="h-5 w-5 text-blue-700 font-sans" />
            <span>Agregar Nuevo Partido</span>
          </h3>
          <p className="text-xs text-slate-500 mb-4">Ingresá fechas futuras para que los empleados puedan votar</p>
          
          <form onSubmit={handleCreateMatch} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Equipo Local (Ej. Argentina)
              </label>
              <input
                type="text"
                placeholder="Argentina"
                value={homeTeam}
                onChange={(e) => setHomeTeam(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-750 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Equipo Visitante (Ej. Francia)
              </label>
              <input
                type="text"
                placeholder="Francia"
                value={awayTeam}
                onChange={(e) => setAwayTeam(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-750 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Fecha y Hora de Inicio
              </label>
              <input
                type="datetime-local"
                value={matchDate}
                onChange={(e) => setMatchDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-500 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>

            {formErr && (
              <p className="text-xs text-rose-500 font-medium bg-rose-50 p-2 rounded-lg">
                {formErr}
              </p>
            )}

            {formSuccess && (
              <p className="text-xs text-blue-700 font-bold bg-blue-50 p-2 rounded-lg flex items-center gap-1 border border-blue-200">
                <CheckCircle className="h-4 w-4 shrink-0" />
                ¡Partido agregado exitosamente!
              </p>
            )}

            <button
              type="submit"
              disabled={adding}
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-blue-950 font-extrabold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-all shadow-md cursor-pointer"
            >
              {adding ? (
                <>
                  <RefreshCcw className="h-3.5 w-3.5 animate-spin" />
                  <span>Registrando...</span>
                </>
              ) : (
                <span>Crear Partido</span>
              )}
            </button>
          </form>
        </div>

        {/* 3. Configure Prizes form module */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-extrabold text-amber-900 mb-1 flex items-center gap-1.5 font-sans">
            <Sparkles className="h-4.5 w-4.5 text-amber-500 shrink-0" />
            <span>Configurar Premios del Podio</span>
          </h3>
          <p className="text-[11px] text-slate-500 mb-4">Editá los textos del podio final para motivar a los colaboradores de BanCo</p>
          
          <div className="space-y-3.5">
            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                Premio 1° Puesto 🥇
              </label>
              <input
                type="text"
                value={prizeFirst}
                onChange={(e) => setPrizeFirst(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                Premio 2° Puesto 🥈
              </label>
              <input
                type="text"
                value={prizeSecond}
                onChange={(e) => setPrizeSecond(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                Premio 3° Puesto 🥉
              </label>
              <input
                type="text"
                value={prizeThird}
                onChange={(e) => setPrizeThird(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:bg-white transition-all"
              />
            </div>

            {prizeSuccess && (
              <p className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 p-2 rounded-lg">
                ¡Premios guardados correctamente!
              </p>
            )}

            <button
              onClick={handleSavePrizes}
              className="w-full bg-blue-700 hover:bg-blue-800 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-all shadow-md cursor-pointer"
            >
              <span>Guardar Configuración</span>
            </button>
          </div>
        </div>

      </div>

      {/* 2. Settle Match score module */}
      <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <h3 className="text-base font-bold text-blue-900 mb-1 flex items-center gap-1.5">
          <Award className="h-5 w-5 text-blue-700" />
          <span>Cargar Resultados Reales & Liquidar Puntos</span>
        </h3>
        <p className="text-xs text-slate-500 mb-4">Ingresá los marcadores de partidos finalizados para cerrar el juego e impactar puntos</p>

        {pendingMatches.length > 0 ? (
          <div className="space-y-4">
            {pendingMatches.map(match => {
              const score = settleScores[match.id] || { home: '', away: '' };
              const isPastKickoff = Date.now() >= new Date(match.matchDate).getTime();

              return (
                <div 
                  key={match.id} 
                  className={`border rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                    isPastKickoff ? 'bg-amber-50/40 border-amber-200' : 'bg-slate-50/50 border-slate-100'
                  }`}
                >
                  
                  {/* Match team descriptions */}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-800">{match.homeTeam}</span>
                      <span className="text-xs text-slate-400 font-bold">vs</span>
                      <span className="font-bold text-slate-800">{match.awayTeam}</span>
                    </div>

                    <div className="flex items-center space-x-2 mt-1.5 text-xs text-slate-500 font-mono">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      <span>{new Date(match.matchDate).toLocaleString('es-AR')}</span>
                      {isPastKickoff && (
                        <span className="bg-amber-100 text-amber-800 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                          <ShieldAlert className="h-2.5 w-2.5" />
                          Jugándose / Finalizado
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Settle Score box enter */}
                  <div className="flex items-center space-x-3.5 self-end md:self-center">
                    <div className="flex items-center space-x-1.5">
                      <input
                        type="text"
                        pattern="[0-9]*"
                        placeholder="Real Local"
                        value={score.home}
                        onChange={(e) => handleSettleScoreChange(match.id, 'home', e.target.value)}
                        className="w-12 h-9 border border-slate-200 text-center text-sm font-extrabold bg-white text-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                      />
                      <span className="text-slate-400 font-bold">:</span>
                      <input
                        type="text"
                        pattern="[0-9]*"
                        placeholder="Real Visita"
                        value={score.away}
                        onChange={(e) => handleSettleScoreChange(match.id, 'away', e.target.value)}
                        className="w-12 h-9 border border-slate-200 text-center text-sm font-extrabold bg-white text-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                      />
                    </div>

                    <button
                      onClick={() => handleSettleMatchAction(match.id)}
                      disabled={settlingId === match.id}
                      className="bg-blue-700 hover:bg-blue-800 text-white font-extrabold px-3 py-2.5 rounded-lg text-xs leading-none transition-all flex items-center space-x-1 shadow-sm cursor-pointer"
                    >
                      {settlingId === match.id ? (
                        <>
                          <RefreshCcw className="h-3 w-3 animate-spin" />
                          <span>Cerrando...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3.5 w-3.5 text-yellow-405 text-yellow-400" />
                          <span>Liquidar</span>
                        </>
                      )}
                    </button>
                  </div>

                  {settleErr[match.id] && (
                    <div className="w-full text-left text-xs text-rose-500 font-medium">
                      {settleErr[match.id]}
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-50 border border-slate-100 rounded-xl">
            <CheckCircle className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <h4 className="font-semibold text-slate-700 text-xs">No hay partidos pendientes</h4>
            <p className="text-xs text-slate-400">Todos los partidos cargados han sido cerrados y liquidados.</p>
          </div>
        )}
      </div>

      {/* 4. User Management Module (Full Width) */}
      <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm mt-2">
        <h3 className="text-base font-bold text-blue-900 mb-1 flex items-center gap-1.5">
          <Users className="h-5 w-5 text-blue-700" />
          <span>Gestión de Usuarios Competidores</span>
        </h3>
        <p className="text-xs text-slate-500 mb-4">Administrá quiénes participan del torneo, otorgá permisos de administrador o eliminá perfiles si ya no son de la empresa.</p>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-extrabold">
              <tr>
                <th className="px-4 py-3 rounded-l-lg">Competidor</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3 text-center">Rol Actual</th>
                <th className="px-4 py-3 text-center">Puntos</th>
                <th className="px-4 py-3 rounded-r-lg text-right">Acciones (Peligro)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(u => {
                const isMe = u.uid === currentUser.uid;
                return (
                  <tr key={u.uid} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      <div className="flex items-center gap-2">
                        {u.photoURL ? (
                          <img src={u.photoURL} alt={u.name} className="w-6 h-6 rounded-full" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] text-blue-700 font-bold uppercase">
                            {u.name.substring(0, 2)}
                          </div>
                        )}
                        <span>{u.name}</span>
                        {isMe && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 rounded uppercase font-bold">Vos</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{u.email}</td>
                    <td className="px-4 py-3 text-center">
                      {u.isAdmin ? (
                        <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          <Shield className="w-3 h-3" /> Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          Jugador
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center font-mono font-bold text-slate-700">{u.points}</td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={() => handleToggleAdmin(u.uid, !!u.isAdmin, u.email)}
                        disabled={isMe}
                        className={`inline-flex items-center justify-center p-1.5 rounded-lg transition-colors border ${
                          isMe 
                            ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed' 
                            : u.isAdmin 
                              ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                        title={u.isAdmin ? 'Quitar rol Administrador' : 'Hacer Administrador'}
                      >
                        {u.isAdmin ? <ShieldOff className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                      </button>
                      
                      <button
                        onClick={() => handleDeleteUser(u.uid)}
                        disabled={isMe}
                        className={`inline-flex items-center justify-center p-1.5 rounded-lg transition-colors border ${
                          isMe 
                            ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed' 
                            : 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'
                        }`}
                        title="Eliminar usuario"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-4 text-xs text-slate-500">No se encontraron usuarios.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
