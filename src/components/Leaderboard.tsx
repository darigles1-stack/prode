import React, { useState } from 'react';
import { Search, Trophy, Medal, SearchX, Sparkles, Star, CheckCircle2 } from 'lucide-react';
import { Standing, UserProfile } from '../types';

interface LeaderboardProps {
  standings: Standing[];
  currentUser: UserProfile | null;
  prizes?: { first: string; second: string; third: string };
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ standings, currentUser, prizes }) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Filter lists based on input query
  const filteredStandings = standings.filter(s =>
    s.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.userEmail.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Extract Podium Users
  const podium = standings.slice(0, 3);
  const firstPlace = podium[0] || null;
  const secondPlace = podium[1] || null;
  const thirdPlace = podium[2] || null;

  return (
    <div id="leaderboard-panel" className="space-y-6">

      {/* Visual Podium Highlights */}
      {standings.length > 0 && (
        <div className="bg-blue-950 border border-blue-900 rounded-2xl p-6 shadow-md">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 mb-6 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-400" />
            <span>Podio de Líderes</span>
          </h3>

          <div className="grid grid-cols-3 items-end gap-2 md:gap-4 max-w-lg mx-auto pt-4 pb-2">
            {/* 2nd Place */}
            <div className="flex flex-col items-center">
              {secondPlace ? (
                <>
                  <div className="relative group flex flex-col items-center">
                    <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-slate-700 border-2 border-slate-300 flex items-center justify-center font-bold text-white text-base overflow-hidden">
                      {secondPlace.photoURL ? (
                        <img src={secondPlace.photoURL} alt={secondPlace.userName} className="h-full w-full object-cover" />
                      ) : (
                        secondPlace.userName.charAt(0).toUpperCase()
                      )}
                    </div>
                    <span className="absolute -top-3 bg-slate-300 text-slate-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow border border-slate-400">
                      2°
                    </span>
                  </div>
                  <div className="text-center mt-2 max-w-[90px] truncate">
                    <div className="font-semibold text-xs text-slate-200">{secondPlace.userName}</div>
                    <div className="font-mono text-yellow-400 text-xs font-bold">{secondPlace.points} pts</div>
                  </div>
                </>
              ) : (
                <div className="text-slate-600 text-xs">-</div>
              )}
              <div className="w-full bg-slate-800 border-t border-slate-700 h-16 rounded-t-xl mt-3 flex items-center justify-center shadow">
                <Medal className="h-6 w-6 text-slate-400 opacity-60" />
              </div>
            </div>

            {/* 1st Place */}
            <div className="flex flex-col items-center">
              {firstPlace ? (
                <>
                  <div className="relative flex flex-col items-center">
                    <Star className="h-4 w-4 text-amber-400 absolute -top-4 animate-bounce" />
                    <div className="h-12 w-12 md:h-14 md:w-14 rounded-full bg-slate-700 border-2 border-amber-400 flex items-center justify-center font-bold text-white text-lg overflow-hidden shadow-lg shadow-amber-955">
                      {firstPlace.photoURL ? (
                        <img src={firstPlace.photoURL} alt={firstPlace.userName} className="h-full w-full object-cover" />
                      ) : (
                        firstPlace.userName.charAt(0).toUpperCase()
                      )}
                    </div>
                    <span className="absolute -top-3 bg-amber-400 text-amber-955 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md border border-amber-300">
                      1°
                    </span>
                  </div>
                  <div className="text-center mt-2 max-w-[100px] truncate">
                    <div className="font-bold text-sm text-amber-300">{firstPlace.userName}</div>
                    <div className="font-mono text-yellow-400 text-sm font-extrabold">{firstPlace.points} pts</div>
                  </div>
                </>
              ) : (
                <div className="text-slate-600 text-xs">-</div>
              )}
              <div className="w-full bg-gradient-to-b from-blue-900 to-slate-800 border-t border-blue-500/30 h-24 rounded-t-xl mt-3 flex items-center justify-center shadow-lg shadow-blue-950/40">
                <Trophy className="h-8 w-8 text-yellow-400" />
              </div>
            </div>

            {/* 3rd Place */}
            <div className="flex flex-col items-center">
              {thirdPlace ? (
                <>
                  <div className="relative flex flex-col items-center">
                    <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-slate-700 border-2 border-amber-700 flex items-center justify-center font-bold text-white text-base overflow-hidden">
                      {thirdPlace.photoURL ? (
                        <img src={thirdPlace.photoURL} alt={thirdPlace.userName} className="h-full w-full object-cover" />
                      ) : (
                        thirdPlace.userName.charAt(0).toUpperCase()
                      )}
                    </div>
                    <span className="absolute -top-3 bg-amber-700 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow border border-amber-800">
                      3°
                    </span>
                  </div>
                  <div className="text-center mt-2 max-w-[90px] truncate">
                    <div className="font-semibold text-xs text-slate-200">{thirdPlace.userName}</div>
                    <div className="font-mono text-yellow-400 text-xs font-bold">{thirdPlace.points} pts</div>
                  </div>
                </>
              ) : (
                <div className="text-slate-600 text-xs">-</div>
              )}
              <div className="w-full bg-slate-800 border-t border-slate-700 h-12 rounded-t-xl mt-3 flex items-center justify-center shadow">
                <Medal className="h-5 w-5 text-amber-750 opacity-60" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Corporate Prizes Display Card */}
      <div id="corporate-prizes-accent" className="bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-amber-600/10 border border-amber-500/25 rounded-2xl p-5 text-slate-800 text-left">
        <div className="flex items-center space-x-2 mb-2.5">
          <Sparkles className="h-5 w-5 text-amber-500 animate-pulse" />
          <h3 className="font-extrabold text-sm uppercase tracking-wider text-amber-900">Premios del Podio Corporativo</h3>
        </div>
        <p className="text-xs text-slate-600 mb-4 leading-relaxed">
          ¡Competí sanamente con tus compañeros de <strong>BanCo</strong>! El torneo corporativo de pronósticos otorgará los siguientes premios a los 3 empleados que finalicen en la cima del ranking:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* First Prize Card */}
          <div className="bg-white border hover:border-amber-400 border-amber-200 rounded-xl p-4 flex items-start space-x-3 transition-all hover:shadow-sm">
            <span className="text-2xl mt-0.5 select-none">🥇</span>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Primer Puesto</div>
              <p className="text-xs font-black text-slate-800 leading-snug mt-1">
                {prizes?.first || "A definir"}
              </p>
            </div>
          </div>
          {/* Second Prize Card */}
          <div className="bg-white border hover:border-slate-400 border-slate-200 rounded-xl p-4 flex items-start space-x-3 transition-all hover:shadow-sm">
            <span className="text-2xl mt-0.5 select-none">🥈</span>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Segundo Puesto</div>
              <p className="text-xs font-black text-slate-800 leading-snug mt-1">
                {prizes?.second || "A definir"}
              </p>
            </div>
          </div>
          {/* Third Prize Card */}
          <div className="bg-white border hover:border-amber-600/50 border-amber-500/20 rounded-xl p-4 flex items-start space-x-3 transition-all hover:shadow-sm">
            <span className="text-2xl mt-0.5 select-none">🥉</span>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tercer Puesto</div>
              <p className="text-xs font-black text-slate-800 leading-snug mt-1">
                {prizes?.third || "A definir"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Standings Grid / List */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">

        {/* Search header bar */}
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Ranking General</h2>
            <p className="text-xs text-slate-500">Posiciones actualizadas al instante con cada partido terminado</p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar participante..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-64 pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Standings Table */}
        {filteredStandings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[11px] font-semibold uppercase tracking-wider border-b border-slate-100">
                  <th className="py-3.5 px-5 text-center w-16">Pos</th>
                  <th className="py-3.5 px-3">Participante</th>
                  <th className="py-3.5 px-3 text-center">Puntos</th>
                  <th className="py-3.5 px-3 text-center hidden md:table-cell">Pronósticos</th>
                  <th className="py-3.5 px-3 text-center hidden sm:table-cell">Resultado Exacto (+3)</th>
                  <th className="py-3.5 px-3 text-center hidden sm:table-cell">Acertó Ganador (+1)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
                {filteredStandings.map((row) => {
                  const isCurrent = currentUser && row.userId === currentUser.uid;
                  return (
                    <tr
                      key={row.userId}
                      className={`hover:bg-slate-50/80 transition-colors ${isCurrent ? 'bg-blue-50 hover:bg-blue-100/60 font-medium' : ''
                        }`}
                    >
                      {/* Position Cell */}
                      <td className="py-4 px-5 text-center">
                        <span className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold leading-none ${row.position === 1 ? 'bg-amber-100 text-amber-800' :
                            row.position === 2 ? 'bg-slate-100 text-slate-700' :
                              row.position === 3 ? 'bg-amber-50 text-amber-700' :
                                'text-slate-500'
                          }`}>
                          {row.position}
                        </span>
                      </td>

                      {/* Participant Cell */}
                      <td className="py-4 px-3">
                        <div className="flex items-center space-x-3">
                          {row.photoURL ? (
                            <img src={row.photoURL} alt={row.userName} className="h-8 w-8 rounded-full border" />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-slate-100 border text-slate-700 flex items-center justify-center font-bold text-xs uppercase">
                              {row.userName.charAt(0)}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center space-x-1.5">
                              <span className="text-slate-900 font-semibold">{row.userName}</span>
                              {isCurrent && (
                                <span className="bg-yellow-100 text-yellow-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                  Tú
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-slate-400 font-mono">{row.userEmail}</span>
                          </div>
                        </div>
                      </td>

                      {/* Points Cell */}
                      <td className="py-4 px-3 text-center">
                        <span className="text-sm font-extrabold text-slate-900 bg-slate-105 bg-slate-100 px-2.5 py-1 rounded-full font-mono">
                          {row.points}
                        </span>
                      </td>

                      {/* Prognostics Count Cell */}
                      <td className="py-4 px-3 text-center font-mono text-slate-500 hidden md:table-cell">
                        {row.forecastsCount}
                      </td>

                      {/* Exact Hits Cell */}
                      <td className="py-4 px-3 text-center hidden sm:table-cell">
                        <span className="inline-flex items-center text-xs font-semibold text-yellow-800 bg-yellow-50 border border-yellow-250 px-2 py-0.5 rounded-full font-mono">
                          <Sparkles className="h-3 w-3 mr-1" />
                          {row.exactHitsCount}
                        </span>
                      </td>

                      {/* Outcome Hits Cell */}
                      <td className="py-4 px-3 text-center hidden sm:table-cell">
                        <span className="inline-flex items-center text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-mono">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          {row.outcomeHitsCount}
                        </span>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-50">
            <SearchX className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <h4 className="font-semibold text-slate-700 text-sm">Sin resultados</h4>
            <p className="text-xs text-slate-400 mt-1">Saca el filtro o intenta con otros términos de búsqueda.</p>
          </div>
        )}
      </div>

      {/* Rules block explanation */}
      <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl flex items-start space-x-3.5">
        <Trophy className="h-5 w-5 text-blue-700 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold text-slate-800 text-sm">Reglas Oficiales de Puntuación</h4>
          <ul className="text-xs text-slate-500 mt-2 space-y-1.5 list-disc pl-4">
            <li><strong>Resultado exacto (3 puntos):</strong> Acertar el marcador exacto de ambos equipos (ej. si termina 2-1 y tu pronóstico fue 2-1).</li>
            <li><strong>Ganador o Empate (1 punto):</strong> Acertar cuál equipo gana (o si empatan) pero errar la cantidad exacta de goles.</li>
            <li><strong>Errado (0 puntos):</strong> Si no se concreta ninguna de las condiciones anteriores.</li>
            <li><strong>Cierre de Carga:</strong> Se permite cargar o editar tu pronóstico libremente hasta **1 hora antes** de la hora estipulada de kickoff.</li>
          </ul>
        </div>
      </div>

    </div>
  );
};
