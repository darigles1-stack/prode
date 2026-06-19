import React, { useState, useEffect, useRef } from 'react';
import { Search, Trophy, Medal, SearchX, Sparkles, Star, CheckCircle2, ArrowUp, ArrowDown, Minus, Crown } from 'lucide-react';
import { Standing, UserProfile } from '../types';

interface LeaderboardProps {
  standings: Standing[];
  currentUser: UserProfile | null;
  prizes?: { first: string; second: string; third: string };
  isLoading?: boolean;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ standings, currentUser, prizes, isLoading = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const currentUserRowRef = useRef<HTMLTableRowElement | null>(null);

  // Automatically scroll to the logged-in user when the standings mount or load and calculation completes
  useEffect(() => {
    if (!isLoading && currentUserRowRef.current && !searchTerm) {
      const timer = setTimeout(() => {
        currentUserRowRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isLoading, standings.length, currentUser?.uid, searchTerm]);

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
        <div
          className="rounded-3xl p-6 shadow-xl overflow-hidden relative"
          style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)' }}
        >
          {/* Decorative background sparkles */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-4 right-8 w-1 h-1 bg-yellow-400 rounded-full opacity-60 animate-ping" style={{ animationDuration: '3s' }} />
            <div className="absolute top-12 right-20 w-1.5 h-1.5 bg-blue-400 rounded-full opacity-40 animate-ping" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }} />
            <div className="absolute top-6 left-12 w-1 h-1 bg-purple-400 rounded-full opacity-50 animate-ping" style={{ animationDuration: '4s', animationDelay: '1s' }} />
            <div className="absolute bottom-12 left-6 w-1.5 h-1.5 bg-yellow-300 rounded-full opacity-30 animate-ping" style={{ animationDuration: '3.5s', animationDelay: '0.8s' }} />
            <div className="absolute bottom-8 right-10 w-1 h-1 bg-indigo-400 rounded-full opacity-50 animate-ping" style={{ animationDuration: '2.8s', animationDelay: '1.5s' }} />
          </div>

          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-2 relative z-10 select-none">
            <Trophy className="h-4 w-4 text-yellow-400" />
            <span>Podio de Líderes BanCo</span>
          </h3>

          <div className="grid grid-cols-3 items-end gap-3 md:gap-5 max-w-lg mx-auto pb-2 relative z-10">

            {/* ─── 2nd Place ─── */}
            <div className="flex flex-col items-center group/step transition-all duration-300 hover:-translate-y-1">
              {secondPlace ? (
                <>
                  <div className="relative flex flex-col items-center mb-3">
                    {/* Glow ring */}
                    <div className="absolute inset-0 rounded-full opacity-0 group-hover/step:opacity-100 transition-opacity duration-300"
                      style={{ boxShadow: '0 0 20px 6px rgba(148,163,184,0.4)', borderRadius: '9999px' }} />
                    <div
                      className="h-14 w-14 md:h-16 md:w-16 rounded-full flex items-center justify-center font-bold text-base overflow-hidden transition-all duration-300 group-hover/step:scale-110"
                      style={{ border: '3px solid #94a3b8', boxShadow: '0 0 0 3px rgba(148,163,184,0.25), 0 4px 20px rgba(0,0,0,0.5)' }}
                    >
                      {secondPlace.photoURL ? (
                        <img src={secondPlace.photoURL} alt={secondPlace.userName} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #475569, #334155)' }}>
                          <span className="text-xl font-black text-slate-200">{secondPlace.userName.charAt(0).toUpperCase()}</span>
                        </div>
                      )}
                    </div>
                    {/* Medal badge */}
                    <span
                      className="absolute -bottom-2 text-[10px] font-black px-2 py-0.5 rounded-full select-none"
                      style={{ background: 'linear-gradient(135deg, #94a3b8, #64748b)', color: '#fff', boxShadow: '0 2px 6px rgba(0,0,0,0.4)' }}
                    >🥈 2°</span>
                  </div>
                  <div className="text-center w-full px-1 mt-1">
                    <div className="font-bold text-xs text-white truncate drop-shadow">{secondPlace.userName}</div>
                    <div className="font-mono text-slate-400 text-[11px] font-extrabold mt-0.5">{secondPlace.points} pts</div>
                  </div>
                </>
              ) : (
                <div className="text-slate-600 text-[10px] italic mb-2">Vacante</div>
              )}
              {/* Pedestal */}
              <div
                className="w-full h-16 rounded-t-xl mt-4 flex items-center justify-center relative overflow-hidden"
                style={{ background: 'linear-gradient(180deg, #475569 0%, #334155 60%, #1e293b 100%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15), 0 -2px 8px rgba(0,0,0,0.3)' }}
              >
                <div className="absolute inset-x-0 top-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, #94a3b8, transparent)' }} />
                <span className="text-4xl font-black font-mono select-none" style={{ color: 'rgba(148,163,184,0.5)' }}>2</span>
              </div>
              {/* Metal label */}
              <div className="mt-1.5 px-3 py-0.5 rounded-full text-[10px] font-black tracking-widest uppercase select-none"
                style={{ background: 'linear-gradient(135deg, #94a3b8, #64748b)', color: '#fff', boxShadow: '0 1px 6px rgba(148,163,184,0.4)' }}
              >🥈 Plata</div>
            </div>

            {/* ─── 1st Place ─── */}
            <div className="flex flex-col items-center group/step transition-all duration-300 hover:-translate-y-2">
              {firstPlace ? (
                <>
                  {/* Crown with glow */}
                  <div className="relative mb-1">
                    <Crown className="h-6 w-6 fill-yellow-400 text-yellow-300 animate-bounce drop-shadow-lg" style={{ filter: 'drop-shadow(0 0 8px rgba(250,204,21,0.8))' }} />
                  </div>
                  <div className="relative flex flex-col items-center mb-3">
                    {/* Gold glow ring */}
                    <div className="absolute inset-0 rounded-full transition-opacity duration-300 opacity-70 group-hover/step:opacity-100"
                      style={{ boxShadow: '0 0 25px 8px rgba(250,204,21,0.35)', borderRadius: '9999px' }} />
                    <div
                      className="h-18 w-18 md:h-20 md:w-20 rounded-full flex items-center justify-center font-bold text-lg overflow-hidden transition-all duration-300 group-hover/step:scale-110"
                      style={{
                        width: '4.5rem', height: '4.5rem',
                        border: '3px solid #facc15',
                        boxShadow: '0 0 0 4px rgba(250,204,21,0.2), 0 6px 30px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)'
                      }}
                    >
                      {firstPlace.photoURL ? (
                        <img src={firstPlace.photoURL} alt={firstPlace.userName} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #92400e, #78350f)' }}>
                          <span className="text-2xl font-black text-yellow-200">{firstPlace.userName.charAt(0).toUpperCase()}</span>
                        </div>
                      )}
                    </div>
                    {/* Gold badge */}
                    <span
                      className="absolute -bottom-2 text-[10px] font-black px-2.5 py-0.5 rounded-full select-none"
                      style={{ background: 'linear-gradient(135deg, #facc15, #f59e0b)', color: '#451a03', boxShadow: '0 2px 8px rgba(250,204,21,0.5)' }}
                    >👑 1°</span>
                  </div>
                  <div className="text-center w-full px-1 mt-1">
                    <div className="font-extrabold text-sm text-white truncate" style={{ textShadow: '0 0 20px rgba(250,204,21,0.4)' }}>{firstPlace.userName}</div>
                    <div className="font-mono text-yellow-400 text-xs font-black mt-0.5">{firstPlace.points} pts</div>
                  </div>
                </>
              ) : (
                <div className="text-slate-600 text-[10px] italic mb-2">Vacante</div>
              )}
              {/* Tallest pedestal */}
              <div
                className="w-full h-24 rounded-t-xl mt-4 flex items-center justify-center relative overflow-hidden"
                style={{ background: 'linear-gradient(180deg, #854d0e 0%, #713f12 50%, #3f1d07 100%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 -2px 12px rgba(0,0,0,0.4)' }}
              >
                <div className="absolute inset-x-0 top-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, #facc15, transparent)' }} />
                <span className="text-5xl font-black font-mono select-none" style={{ color: 'rgba(250,204,21,0.35)' }}>1</span>
              </div>
              {/* Metal label */}
              <div className="mt-1.5 px-3 py-0.5 rounded-full text-[10px] font-black tracking-widest uppercase select-none"
                style={{ background: 'linear-gradient(135deg, #facc15, #f59e0b)', color: '#451a03', boxShadow: '0 1px 8px rgba(250,204,21,0.55)' }}
              >👑 Oro</div>
            </div>

            {/* ─── 3rd Place ─── */}
            <div className="flex flex-col items-center group/step transition-all duration-300 hover:-translate-y-1">
              {thirdPlace ? (
                <>
                  <div className="relative flex flex-col items-center mb-3">
                    <div className="absolute inset-0 rounded-full opacity-0 group-hover/step:opacity-100 transition-opacity duration-300"
                      style={{ boxShadow: '0 0 18px 5px rgba(180,83,9,0.4)', borderRadius: '9999px' }} />
                    <div
                      className="h-12 w-12 md:h-14 md:w-14 rounded-full flex items-center justify-center font-bold text-base overflow-hidden transition-all duration-300 group-hover/step:scale-110"
                      style={{ border: '3px solid #b45309', boxShadow: '0 0 0 3px rgba(180,83,9,0.25), 0 4px 20px rgba(0,0,0,0.5)' }}
                    >
                      {thirdPlace.photoURL ? (
                        <img src={thirdPlace.photoURL} alt={thirdPlace.userName} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #92400e, #78350f)' }}>
                          <span className="text-lg font-black text-amber-200">{thirdPlace.userName.charAt(0).toUpperCase()}</span>
                        </div>
                      )}
                    </div>
                    {/* Bronze badge */}
                    <span
                      className="absolute -bottom-2 text-[10px] font-black px-2 py-0.5 rounded-full select-none"
                      style={{ background: 'linear-gradient(135deg, #b45309, #92400e)', color: '#fef3c7', boxShadow: '0 2px 6px rgba(0,0,0,0.4)' }}
                    >🥉 3°</span>
                  </div>
                  <div className="text-center w-full px-1 mt-1">
                    <div className="font-bold text-xs text-white truncate drop-shadow">{thirdPlace.userName}</div>
                    <div className="font-mono text-amber-500 text-[11px] font-extrabold mt-0.5">{thirdPlace.points} pts</div>
                  </div>
                </>
              ) : (
                <div className="text-slate-600 text-[10px] italic mb-2">Vacante</div>
              )}
              {/* Pedestal */}
              <div
                className="w-full h-12 rounded-t-xl mt-4 flex items-center justify-center relative overflow-hidden"
                style={{ background: 'linear-gradient(180deg, #92400e 0%, #78350f 60%, #3f1d07 100%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), 0 -2px 8px rgba(0,0,0,0.3)' }}
              >
                <div className="absolute inset-x-0 top-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, #b45309, transparent)' }} />
                <span className="text-3xl font-black font-mono select-none" style={{ color: 'rgba(180,83,9,0.45)' }}>3</span>
              </div>
              {/* Metal label */}
              <div className="mt-1.5 px-3 py-0.5 rounded-full text-[10px] font-black tracking-widest uppercase select-none"
                style={{ background: 'linear-gradient(135deg, #b45309, #92400e)', color: '#fef3c7', boxShadow: '0 1px 6px rgba(180,83,9,0.45)' }}
              >🥉 Bronce</div>
            </div>

          </div>
        </div>
      )}

      {/* Corporate Prizes Display Card */}
      <div id="corporate-prizes-accent" className="bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-amber-600/10 border border-amber-500/25 rounded-2xl p-5 text-slate-800 text-left">
        <div className="flex items-center space-x-2 mb-2.5">
          <Sparkles className="h-5 w-5 text-amber-500 animate-pulse" />
          <h3 className="font-extrabold text-sm uppercase tracking-wider text-amber-900">
            Premios del Podio Corporativo
          </h3>
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
              <p className="text-xs font-black text-slate-800 leading-snug mt-1 whitespace-pre-line">
                {prizes?.first || `15.000.000 puntos para canjear en Tienda MÁSBanCo
Kit de aliento:
👕 Camiseta + 👒 Piluso + 🏳️ Bandera + 🥤 Termo + 🧉 Mate + 🎒 Mochila`}
              </p>
            </div>
          </div>
          {/* Second Prize Card */}
          <div className="bg-white border hover:border-slate-400 border-slate-200 rounded-xl p-4 flex items-start space-x-3 transition-all hover:shadow-sm">
            <span className="text-2xl mt-0.5 select-none">🥈</span>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Segundo Puesto</div>
              <p className="text-xs font-black text-slate-800 leading-snug mt-1 whitespace-pre-line">
                {prizes?.second || `10.000.000 puntos para canjear en Tienda MÁSBanCo
Kit de aliento:
👕 Camiseta + 🎒 Mochila + 📓 Libreta`}
              </p>
            </div>
          </div>
          {/* Third Prize Card */}
          <div className="bg-white border hover:border-amber-600/50 border-amber-500/20 rounded-xl p-4 flex items-start space-x-3 transition-all hover:shadow-sm">
            <span className="text-2xl mt-0.5 select-none">🥉</span>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tercer Puesto</div>
              <p className="text-xs font-black text-slate-800 leading-snug mt-1 whitespace-pre-line">
                {prizes?.third || `5.000.000 puntos para canjear en Tienda MÁSBanCo
Kit de aliento:
👕 Camiseta + 🧢 Gorro + 🍼 Botella + 📓 Libreta`}
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
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-16 text-center min-h-[350px] space-y-4">
            {/* Elegant spinning orbit */}
            <div className="relative flex items-center justify-center w-16 h-16 select-none">
              <div className="absolute w-16 h-16 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shadow-inner">
                <Trophy className="h-5 w-5 text-blue-600 animate-pulse" />
              </div>
            </div>
            <div className="space-y-1">
              <h4 className="font-extrabold text-slate-800 text-sm">Calculando Posiciones...</h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Procesando pronósticos y actualizando el ranking en tiempo real.
              </p>
            </div>
          </div>
        ) : filteredStandings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[11px] font-semibold uppercase tracking-wider border-b border-slate-100">
                  <th className="py-3.5 px-5 text-center w-16">Pos</th>
                  <th className="py-3.5 px-3 text-center w-24">Tendencia</th>
                  <th className="py-3.5 px-3 animate-fadeIn">Participante</th>
                  <th className="py-3.5 px-3 hidden md:table-cell">Legajo / Gerencia</th>
                  <th className="py-3.5 px-3 text-center">Puntos</th>

                  <th className="py-3.5 px-3 text-center hidden sm:table-cell">Resultado Exacto (+3)</th>
                  <th className="py-3.5 px-3 text-center hidden sm:table-cell">Acertó Ganador (+1)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
                {filteredStandings.map((row) => {
                  const isCurrent = currentUser && row.userId === currentUser.uid;
                  const isFirst = row.position === 1;
                  const isSecond = row.position === 2;
                  const isThird = row.position === 3;
                  const isTop3 = isFirst || isSecond || isThird;

                  let rowBgClass = '';
                  if (isCurrent) {
                    rowBgClass = 'bg-blue-50 hover:bg-blue-100/65 border-l-[4px] border-l-blue-600';
                  } else if (isFirst) {
                    rowBgClass = 'bg-amber-50/40 hover:bg-amber-100/30 border-l-[4px] border-l-amber-500 font-semibold';
                  } else if (isSecond) {
                    rowBgClass = 'bg-slate-50/40 hover:bg-slate-100/30 border-l-[4px] border-l-slate-400 font-semibold';
                  } else if (isThird) {
                    rowBgClass = 'bg-orange-50/15 hover:bg-orange-100/20 border-l-[4px] border-l-amber-600/70 font-semibold';
                  } else {
                    rowBgClass = 'hover:bg-slate-50/80';
                  }

                  return (
                    <tr
                      key={row.userId}
                      ref={isCurrent ? currentUserRowRef : undefined}
                      className={`transition-colors ${rowBgClass}`}
                    >
                      {/* Position Cell */}
                      <td className="py-4 px-5 text-center">
                        {isFirst ? (
                          <div className="flex items-center justify-center relative">
                            <span className="inline-flex items-center justify-center h-8 w-8 rounded-full text-xs font-black leading-none bg-gradient-to-br from-amber-400 via-yellow-200 to-amber-500 text-yellow-950 shadow-[0_2px_8px_rgba(234,179,8,0.35)] border border-amber-300 relative z-10 transition-transform hover:scale-105">
                              1
                            </span>
                            <Crown className="absolute -top-2.5 h-4 w-4 text-amber-500 fill-amber-300 rotate-12 z-20 animate-pulse" />
                          </div>
                        ) : isSecond ? (
                          <div className="flex items-center justify-center relative">
                            <span className="inline-flex items-center justify-center h-8 w-8 rounded-full text-xs font-black leading-none bg-gradient-to-br from-slate-300 via-slate-100 to-slate-450 text-slate-800 shadow-[0_2px_8px_rgba(148,163,184,0.25)] border border-slate-200 relative z-10 transition-transform hover:scale-105">
                              2
                            </span>
                          </div>
                        ) : isThird ? (
                          <div className="flex items-center justify-center relative">
                            <span className="inline-flex items-center justify-center h-8 w-8 rounded-full text-xs font-black leading-none bg-gradient-to-br from-amber-650 via-amber-500 to-amber-700 text-amber-50 shadow-[0_2px_8px_rgba(180,83,9,0.25)] border border-amber-550 relative z-10 transition-transform hover:scale-105">
                              3
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold leading-none text-slate-500">
                            {row.position}
                          </span>
                        )}
                      </td>

                      {/* Trend Cell */}
                      <td className="py-4 px-3 text-center">
                        <div className="flex items-center justify-center">
                          {row.positionTrend === 'up' && (
                            <div className="inline-flex items-center gap-1 text-emerald-600 font-extrabold text-[10px] bg-emerald-100/60 border border-emerald-300/60 px-2 py-0.5 rounded-full shadow-[0_1px_2px_rgba(16,185,129,0.05)]" title="Subió puestos en la última fecha terminado">
                              <ArrowUp className="h-3.5 w-3.5 stroke-[3px] text-emerald-600" />
                              <span>Subió</span>
                            </div>
                          )}
                          {row.positionTrend === 'down' && (
                            <div className="inline-flex items-center gap-1 text-rose-600 font-extrabold text-[10px] bg-rose-100/60 border border-rose-300/60 px-2 py-0.5 rounded-full shadow-[0_1px_2px_rgba(239,68,68,0.05)]" title="Bajó puestos en la última fecha terminado">
                              <ArrowDown className="h-3.5 w-3.5 stroke-[3px] text-rose-600" />
                              <span>Bajó</span>
                            </div>
                          )}
                          {(row.positionTrend === 'same' || !row.positionTrend) && (
                            <div className="inline-flex items-center gap-1 text-slate-500 font-bold text-[10px] bg-slate-100/80 border border-slate-300/40 px-2 py-0.5 rounded-full" title="Mantuvo su posición en la última fecha">
                              <Minus className="h-3 w-3 stroke-[3px] text-slate-400" />
                              <span>Igual</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Participant Cell */}
                      <td className="py-4 px-3 text-left">
                        <div className="flex items-center space-x-3">
                          {row.photoURL ? (
                            <img 
                              src={row.photoURL} 
                              alt={row.userName} 
                              className={`rounded-full border object-cover shrink-0 ${
                                isFirst ? 'h-10 w-10 border-amber-300 ring-2 ring-amber-400/20 shadow-sm' :
                                isSecond ? 'h-9.5 w-9.5 border-slate-300 ring-2 ring-slate-400/10' :
                                isThird ? 'h-9 w-9 border-amber-500/50 ring-2 ring-amber-500/10' :
                                'h-8 w-8'
                              }`} 
                            />
                          ) : (
                            <div className={`rounded-full flex items-center justify-center font-bold uppercase shrink-0 ${
                              isFirst ? 'h-10 w-10 bg-amber-100 text-amber-800 border-2 border-amber-300 text-sm shadow-sm' :
                              isSecond ? 'h-9.5 w-9.5 bg-slate-100 text-slate-800 border-2 border-slate-300 text-sm' :
                              isThird ? 'h-9 w-9 bg-amber-50/80 text-amber-900 border-2 border-amber-500/40 text-xs' :
                              'h-8 w-8 bg-slate-100 border text-slate-700 text-xs'
                            }`}>
                              {row.userName.charAt(0)}
                            </div>
                          )}
                          <div>
                            <div className="flex flex-wrap items-center gap-1.5 text-left justify-start">
                              <span className={`text-slate-900 font-semibold leading-tight ${
                                isFirst ? 'text-base font-black text-amber-950' :
                                isSecond ? 'text-[15px] font-bold text-slate-900' :
                                isThird ? 'text-[14.5px] font-medium text-slate-850' :
                                'text-sm'
                              }`}>
                                {row.userName}
                              </span>
                              {isFirst && (
                                <span className="bg-amber-100/90 text-amber-900 text-[9px] font-black px-1.5 py-0.5 rounded-full border border-amber-300/60 flex items-center gap-0.5 shadow-sm shrink-0 select-none">
                                  <Trophy className="h-2.5 w-2.5 text-amber-600 fill-amber-500 animate-pulse" />
                                  Puntero
                                </span>
                              )}
                              {isSecond && (
                                <span className="bg-slate-100 text-slate-800 text-[9px] font-black px-1.5 py-0.5 rounded-full border border-slate-300 flex items-center gap-0.5 shrink-0 select-none">
                                  <Medal className="h-2.5 w-2.5 text-slate-500 fill-slate-300" />
                                  Escolta
                                </span>
                              )}
                              {isThird && (
                                <span className="bg-orange-50 text-amber-900 text-[9px] font-black px-1.5 py-0.5 rounded-full border border-amber-300/40 flex items-center gap-0.5 shrink-0 select-none">
                                  <Medal className="h-2.5 w-2.5 text-amber-600 fill-amber-400" />
                                  Tercero
                                </span>
                              )}
                              {isCurrent && (
                                <span className="bg-blue-100 text-blue-900 text-[9px] font-black px-2 py-0.5 rounded-full border border-blue-200 uppercase tracking-wider shrink-0 select-none">
                                  Tú
                                </span>
                              )}
                            </div>
                            <div className="text-left flex flex-col sm:flex-row sm:items-center sm:gap-2">
                              <span className={`text-slate-400 font-mono text-xs ${isFirst ? 'font-medium' : ''}`}>{row.userEmail}</span>
                              {/* Mobile/Compact badges fallback */}
                              <div className="flex flex-wrap gap-1 mt-1 sm:mt-0">
                                {/* Mobile Plenos & Aciertos */}
                                <span className="inline-flex items-center sm:hidden text-[10px] font-bold text-yellow-800 bg-yellow-50 border border-yellow-200 px-1.5 py-0.5 rounded font-mono">
                                  <Sparkles className="h-2.5 w-2.5 mr-0.5 text-amber-500 fill-amber-300" />
                                  {row.exactHitsCount} Plenos
                                </span>
                                <span className="inline-flex items-center sm:hidden text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded font-mono">
                                  <CheckCircle2 className="h-2.5 w-2.5 mr-0.5 text-blue-550" />
                                  {row.outcomeHitsCount} Aciertos
                                </span>

                                {/* Mobile Legajo & Gerencia */}
                                {row.legajo && (
                                  <span className="bg-slate-100 text-slate-600 text-[9px] font-extrabold px-1.5 py-0.5 rounded border border-slate-200/50 md:hidden">
                                    Legajo: #{row.legajo}
                                  </span>
                                )}
                                {row.gerencia && (
                                  <span className="bg-blue-50 text-blue-700 text-[9px] font-bold px-1.5 py-0.5 rounded border border-blue-100 md:hidden">
                                    {row.gerencia}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Legajo / Gerencia dedicated column */}
                      <td className="py-4 px-3 hidden md:table-cell text-left">
                        <div className="flex flex-col space-y-1">
                          {row.legajo ? (
                            <span className="text-xs font-extrabold text-slate-800 bg-slate-100/80 border border-slate-200 px-2 py-0.5 rounded-md w-fit font-mono">
                              Legajo #{row.legajo}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Legajo sin cargar</span>
                          )}
                          {row.gerencia && (
                            <span className="text-[9.5px] font-bold text-blue-700 bg-blue-50/70 border border-blue-100 px-2 py-0.5 rounded-md w-fit uppercase tracking-wide">
                              {row.gerencia}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Points Cell */}
                      <td className="py-4 px-3 text-center">
                        <span className={`font-mono leading-none ${
                          isFirst ? 'text-base font-black text-amber-800 bg-amber-100/75 px-3 py-1.5 rounded-full border border-amber-300 shadow-sm' :
                          isSecond ? 'text-sm font-black text-slate-850 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200' :
                          isThird ? 'text-sm font-black text-amber-900 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200/40' :
                          'text-sm font-extrabold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-full'
                        }`}>
                          {row.points}
                        </span>
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
            <li><strong>Cierre de Carga:</strong> Se permite cargar o editar tu pronóstico libremente hasta **5 minutos antes** de la hora estipulada de kickoff.</li>
          </ul>
        </div>
      </div>

    </div>
  );
};
