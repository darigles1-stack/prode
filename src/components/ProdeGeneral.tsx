import React, { useState } from 'react';
import { Search, Info, Grid, Trophy, CheckSquare, Sparkles, Filter, Calendar, Lock, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { SoccerMatch, Standing, UserForecast } from '../types';

interface ProdeGeneralProps {
  matches: SoccerMatch[];
  standings: Standing[];
  allForecasts: UserForecast[];
  currentUserUid?: string;
  isUserAdmin?: boolean;
}

export const ProdeGeneral: React.FC<ProdeGeneralProps> = ({
  matches,
  standings,
  allForecasts,
  currentUserUid,
  isUserAdmin = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [matchFilter, setMatchFilter] = useState<'all' | 'pending' | 'finished'>('all');

  // Helper to determine if match predictions are locked
  const isMatchLocked = (matchDateStr: string) => {
    const kickoff = new Date(matchDateStr).getTime();
    const fiveMinutesMs = 5 * 60 * 1000;
    const lockTime = kickoff - fiveMinutesMs;
    return Date.now() >= lockTime;
  };

  // Filter matches to make column set more readable if desired and sort chronologically
  const displayMatches = matches
    .filter(m => {
      if (matchFilter === 'pending') return m.status === 'pending';
      if (matchFilter === 'finished') return m.status === 'finished';
      return true;
    })
    .sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime());

  // Filter rows (participants)
  const displayStandings = standings.filter(s =>
    s.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.userEmail.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Helper to find prediction details
  const getForecastForCell = (userId: string, matchId: string) => {
    return allForecasts.find(f => f.userId === userId && f.matchId === matchId);
  };

  // Extract compact label (like "ARG - FRA")
  const getMatchTitle = (match: SoccerMatch) => {
    // Slice flags out or just grab first three letters of main word
    const extractName = (fullName: string) => {
      const clean = fullName.replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g, '').replace(/\uDB40[\uDC00-\uDFFF]/g, '').trim();
      return clean.slice(0, 4).toUpperCase();
    };
    return `${extractName(match.homeTeam)} vs ${extractName(match.awayTeam)}`;
  };

  return (
    <div id="general-prode-view" className="space-y-6 text-left">
      
      {/* Intro visual banner */}
      <div className="bg-gradient-to-r from-blue-950 to-blue-900 border border-blue-800 rounded-2xl p-5 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-black tracking-tight text-white flex items-center gap-2">
            <Grid className="h-5 w-5 text-yellow-405 text-yellow-450 text-yellow-400" />
            <span>Planilla General de Pronósticos</span>
          </h3>
          <p className="text-xs text-blue-200 mt-1 max-w-xl">
            Transparencia total. Explorá de forma cruzada los pronósticos de la fase de grupos de todos los empleados y compará tus apuestas en tiempo real con los líderes del torneo.
          </p>
        </div>

        {/* Column Filters */}
        <div className="flex border border-blue-800 bg-blue-900/50 p-1 rounded-xl w-fit self-start md:self-center">
          <button
            onClick={() => setMatchFilter('all')}
            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              matchFilter === 'all' ? 'bg-yellow-400 text-blue-950 shadow' : 'text-blue-100 hover:text-white'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setMatchFilter('pending')}
            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              matchFilter === 'pending' ? 'bg-yellow-400 text-blue-950 shadow' : 'text-blue-100 hover:text-white'
            }`}
          >
            Abiertos
          </button>
          <button
            onClick={() => setMatchFilter('finished')}
            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              matchFilter === 'finished' ? 'bg-yellow-400 text-blue-950 shadow' : 'text-blue-100 hover:text-white'
            }`}
          >
            Finalizados
          </button>
        </div>
      </div>

      {/* Row Search Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Filtrar por nombre de compañero..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-800"
          />
        </div>

        {/* Quick color key reference */}
        <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-500 font-medium">
          <span className="font-bold uppercase text-[9px] text-slate-400">Referencia:</span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-yellow-100 border border-yellow-300"></span>
            <span>Pleno (+3)</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-blue-50 border border-blue-200"></span>
            <span>Ganador (+1)</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-slate-100 border border-slate-250"></span>
            <span>Errado/Pendiente</span>
          </span>
        </div>
      </div>

      {/* Mobile swiping tip layout helper banner */}
      <div className="sm:hidden bg-blue-50 border border-blue-200/60 rounded-xl p-3 text-center text-[11px] font-extrabold text-blue-900 animate-pulse flex items-center justify-center gap-1.5 shadow-sm">
        <span>📱 Deslizá la tabla hacia la derecha para ver todos los partidos de los compañeros 👉</span>
      </div>

      {/* Matrix Table block with visual horizontal overflow */}
      {displayMatches.length > 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-auto max-h-[600px] md:max-h-[65vh]">
            {/* Set a min-width to avoid compression */}
            <table className="w-full text-left border-collapse min-w-[700px]">
              
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200 sticky top-0 z-20">
                  <th className="py-4 px-0.5 sm:px-4 w-[60px] sm:w-56 min-w-[60px] sm:min-w-[224px] sticky left-0 top-0 bg-slate-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] z-30 font-bold text-slate-800 text-[10px] sm:text-[11px] uppercase text-center">Pos/Part</th>
                  
                  {/* Matches Column Headers */}
                  {displayMatches.map(match => (
                    <th key={match.id} className="py-3 px-3 text-center border-l border-slate-150 min-w-[110px] bg-slate-50 sticky top-0 z-20">
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] text-blue-900 font-extrabold truncate max-w-[130px]">
                          {getMatchTitle(match)}
                        </span>
                        
                        {/* Real Result badge if finished */}
                        {match.status === 'finished' ? (
                          <span className="bg-slate-900 text-white text-[10px] font-black px-2 py-0.5 rounded-full mt-1 font-mono">
                            {match.homeScore} - {match.awayScore}
                          </span>
                        ) : isMatchLocked(match.matchDate) ? (
                          <span className="text-[9px] text-rose-600 bg-rose-50 px-2 py-0.5 rounded font-bold mt-1">
                            Bloqueado
                          </span>
                        ) : (
                          <span className="text-[9px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded font-semibold mt-1">
                            Abierto
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                {displayStandings.map((userRow) => {
                  const isCurrent = currentUserUid === userRow.userId;
                  return (
                    <tr 
                      key={userRow.userId}
                      className={`hover:bg-slate-50/50 transition-colors ${
                        isCurrent ? 'bg-blue-50/30' : ''
                      }`}
                    >
                      {/* Pos + Participant combined sticky block */}
                      <td className="py-2 sm:py-3.5 px-0.5 sm:px-4 sticky left-0 bg-white border-r border-slate-100 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] w-[60px] sm:w-56 min-w-[60px] sm:min-w-[224px]">
                        {/* Compact mobile layout */}
                        <div className="sm:hidden flex flex-col justify-center space-y-0.5 text-center min-w-0">
                          {/* Position & Trend */}
                          <div className="flex items-center justify-center space-x-0.5">
                            <span className="font-mono font-black text-slate-900 text-[10px]">
                              #{userRow.position}
                            </span>
                            {userRow.positionTrend === 'up' && (
                              <ArrowUp className="h-2.5 w-2.5 text-emerald-500 stroke-[3.5px] shrink-0" />
                            )}
                            {userRow.positionTrend === 'down' && (
                              <ArrowDown className="h-2.5 w-2.5 text-rose-500 stroke-[3.5px] shrink-0" />
                            )}
                          </div>
                          
                          {/* Name (highly truncated) */}
                          <div className="font-bold text-slate-950 text-[10px] leading-tight truncate px-0.5" title={userRow.userName}>
                            {userRow.userName}
                          </div>

                          {/* Points & tag */}
                          <div className="flex flex-col items-center">
                            <span className="text-[10px] font-extrabold text-blue-700 font-mono leading-none">
                              {userRow.points}p
                            </span>
                            {isCurrent && (
                              <span className="bg-yellow-100 text-yellow-800 text-[8px] font-black px-1 rounded-full mt-0.5 scale-90">
                                Tú
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Rich desktop layout */}
                        <div className="hidden sm:flex items-center space-x-2.5 max-w-[210px] min-w-0">
                          {/* Position Badge & Trend */}
                          <div className="flex flex-col items-center justify-center shrink-0 min-w-[32px]">
                            <span className="font-mono font-bold text-slate-900 text-xs">
                              #{userRow.position}
                            </span>
                            <div className="flex items-center justify-center mt-0.5">
                              {userRow.positionTrend === 'up' && (
                                <ArrowUp className="h-2.5 w-2.5 text-emerald-500 stroke-[3.5px] shrink-0" title="Subió puestos en la última fecha" />
                              )}
                              {userRow.positionTrend === 'down' && (
                                <ArrowDown className="h-2.5 w-2.5 text-rose-500 stroke-[3.5px] shrink-0" title="Bajó puestos en la última fecha" />
                              )}
                              {(userRow.positionTrend === 'same' || !userRow.positionTrend) && (
                                <Minus className="h-2.5 w-2.5 text-slate-300 stroke-[3.5px] shrink-0" title="Mantuvo su posición" />
                              )}
                            </div>
                          </div>

                          {/* Avatar picture/initial */}
                          <div className="shrink-0">
                            {userRow.photoURL ? (
                              <img src={userRow.photoURL} alt={userRow.userName} className="h-7 w-7 rounded-full border border-slate-200" />
                            ) : (
                              <div className="h-7 w-7 rounded-full bg-slate-100 border text-slate-700 flex items-center justify-center font-bold text-[10px] uppercase">
                                {userRow.userName.charAt(0)}
                              </div>
                            )}
                          </div>

                          {/* Details (Name and points) */}
                          <div className="truncate min-w-0 flex-1">
                            <div className="font-bold text-slate-900 truncate flex items-center gap-0.5 text-[11px]">
                              <span className="truncate" title={userRow.userName}>{userRow.userName}</span>
                              {isCurrent && (
                                <span className="bg-yellow-100 text-yellow-800 text-[8px] font-extrabold px-1.5 rounded-full shrink-0">
                                  Tú
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 font-medium font-mono truncate">
                              {userRow.points} pts • ({userRow.exactHitsCount ?? 0} Plenos)
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Score cell columns */}
                      {displayMatches.map(match => {
                        const cellForecast = getForecastForCell(userRow.userId, match.id);
                        const isFinished = match.status === 'finished';
                        const isLocked = isMatchLocked(match.matchDate);
                        const shouldShowForecast = isCurrent || isLocked;

                        // Check points status
                        const getCellColorClass = () => {
                          if (!cellForecast) return 'text-slate-350 bg-slate-50/30';
                          if (!shouldShowForecast) return 'text-slate-400 bg-slate-50/50';
                          if (!isFinished) return 'font-bold bg-white text-slate-700';
                          
                          if (cellForecast.pointsEarned === 3) {
                            return 'bg-yellow-50 text-yellow-900 font-extrabold border-2 border-yellow-300 rounded shadow-sm';
                          } else if (cellForecast.pointsEarned === 1) {
                            return 'bg-blue-50/80 text-blue-905 text-blue-800 font-bold border border-blue-200 rounded';
                          } else {
                            return 'bg-slate-100 text-slate-400 line-through';
                          }
                        };

                        return (
                          <td key={match.id} className="py-3 px-3 text-center border-l border-slate-100 min-w-[110px]">
                            <div className={`p-2 text-center text-[11px] font-mono mx-auto max-w-[85px] leading-snug transition-all ${getCellColorClass()}`}>
                              {cellForecast ? (
                                shouldShowForecast ? (
                                  <>
                                    <div className="text-xs font-black">
                                      {cellForecast.homeScore} - {cellForecast.awayScore}
                                    </div>
                                    {isFinished && (
                                      <span className="text-[9px] font-extrabold block mt-0.5">
                                        +{cellForecast.pointsEarned ?? 0} PTS
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-[10px] text-slate-400 italic flex items-center justify-center gap-1 select-none font-sans" title="Se revelará cuando cierre la carga">
                                    <Lock className="h-3 w-3 shrink-0 text-slate-300" /> Oculto
                                  </span>
                                )
                              ) : (
                                <span className="italic select-none font-sans text-slate-405 text-slate-400">Sin cargar</span>
                              )}
                            </div>
                          </td>
                        );
                      })}

                    </tr>
                  );
                })}
              </tbody>

            </table>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center bg-slate-50 border border-slate-200 rounded-2xl">
          <Calendar className="h-10 w-10 text-slate-305 text-slate-300 mx-auto mb-3" />
          <h4 className="font-semibold text-slate-700 text-sm">No hay partidos para mostrar en la grilla</h4>
          <p className="text-xs text-slate-400 mt-1">Crea partidos en el Panel de Administración para ver la grilla completa.</p>
        </div>
      )}

      {/* Corporate compliance information notes */}
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-start space-x-3">
        <Info className="h-4.5 w-4.5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-800 leading-relaxed">
          <span className="font-bold block mb-0.5">Fase de Grupos y Play-Offs</span>
          Los pronósticos correspondientes a partidos pendientes solo se vuelven visibles para el resto de los participantes una vez bloqueada la hora de carga (5 minutos antes del pitazo inicial), resguardando la competitividad y evitando plagio de estrategias de marcadores corporativos.
        </div>
      </div>

    </div>
  );
};
