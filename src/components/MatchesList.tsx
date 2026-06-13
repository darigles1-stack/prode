import React, { useState } from 'react';
import { Clock, Lock, Unlock, CheckCircle2, AlertCircle, Save, Calendar, ShieldCheck, RefreshCcw, Sparkles } from 'lucide-react';
import { SoccerMatch, UserForecast } from '../types';
import { getFlagForCountry, getCountryCode } from '../lib/worldCupData';

interface MatchesListProps {
  matches: SoccerMatch[];
  forecasts: UserForecast[];
  allForecasts: UserForecast[];
  onSaveForecast: (matchId: string, homeScore: number, awayScore: number) => Promise<void>;
  userId: string;
  isUserAdmin?: boolean;
  onLoadOfficialFixture?: () => Promise<void>;
  enabledPhases?: string[];
  onGenerateKnockout?: (mode: 'dynamic' | 'placeholder', targetPhase: string) => Promise<{ success: boolean; count: number; message: string }>;
}

export const MatchesList: React.FC<MatchesListProps> = ({
  matches,
  forecasts,
  allForecasts,
  onSaveForecast,
  userId,
  isUserAdmin = false,
  onLoadOfficialFixture,
  enabledPhases = ['grupos'],
  onGenerateKnockout
}) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'finished'>('all');
  const [selectedPhase, setSelectedPhase] = useState<string>('grupos');
  const [inputStates, setInputStates] = useState<{ [matchId: string]: { home: string; away: string } }>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [errorFeedback, setErrorFeedback] = useState<{ [matchId: string]: string }>({});
  const [successFeedback, setSuccessFeedback] = useState<{ [matchId: string]: boolean }>({});
  const [expandedPredictions, setExpandedPredictions] = useState<{ [matchId: string]: boolean }>({});

  // Loading state for bulk fixture generation
  const [loadingFixture, setLoadingFixture] = useState(false);
  const [fixtureSuccess, setFixtureSuccess] = useState(false);

  // States for dynamic stage generation within MatchesList
  const [generatingKnockout, setGeneratingKnockout] = useState(false);
  const [knockoutResult, setKnockoutResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleGenerateKnockoutPhase = async (mode: 'dynamic' | 'placeholder') => {
    if (!onGenerateKnockout) return;
    setGeneratingKnockout(true);
    setKnockoutResult(null);
    try {
      const res = await onGenerateKnockout(mode, selectedPhase);
      setKnockoutResult({ success: res.success, message: res.message });
      if (res.success) {
        // Clear cached input values to refresh matches
        setInputStates({});
      }
    } catch (err) {
      setKnockoutResult({ success: false, message: 'Ocurrió un error inesperado al generar las llaves.' });
    } finally {
      setGeneratingKnockout(false);
    }
  };

  const handleGenerateFixture = async () => {
    if (!onLoadOfficialFixture) return;
    setLoadingFixture(true);
    try {
      await onLoadOfficialFixture();
      setFixtureSuccess(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingFixture(false);
    }
  };

  // Get user forecast for a specific match
  const getForecast = (matchId: string) => forecasts.find(f => f.matchId === matchId);

  // Helper to extract clean name and its robust flag
  const getTeamNameAndFlag = (teamNameWithMaybeFlag: string) => {
    const cleanName = teamNameWithMaybeFlag
      .replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g, '')
      .trim();
    const flag = getFlagForCountry(cleanName);
    const code = getCountryCode(cleanName);
    return { name: cleanName, flag, code };
  };

  // Toggle predicting employee lists
  const togglePredictions = (matchId: string) => {
    setExpandedPredictions(prev => ({
      ...prev,
      [matchId]: !prev[matchId]
    }));
  };

  // Helper to format Spanish dates
  const formatMatchDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('es-AR', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  // Helper to calculate lock status
  const getLockInfo = (matchDateStr: string) => {
    const kickoff = new Date(matchDateStr).getTime();
    const fiveMinutesMs = 5 * 60 * 1000;
    const lockTime = kickoff - fiveMinutesMs;
    const now = Date.now();
    const isLocked = now >= lockTime;

    return {
      isLocked,
      lockDeadline: new Date(lockTime),
      timeLeftString: (() => {
        if (isLocked) return '';
        const diff = lockTime - now;
        const mins = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(mins / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `Cierra en ${days}d ${hours % 24}h`;
        if (hours > 0) return `Cierra en ${hours}h ${mins % 60}m`;
        return `Cierra en ${mins} minutos`;
      })()
    };
  };

  const handleScoreChange = (matchId: string, team: 'home' | 'away', value: string) => {
    // Only allow whole positive integers
    const sanitizedVal = value.replace(/[^0-9]/g, '');
    setInputStates(prev => ({
      ...prev,
      [matchId]: {
        ...prev[matchId] || { home: '', away: '' },
        [team]: sanitizedVal
      }
    }));
  };

  const handleSubmit = async (matchId: string) => {
    const match = matches.find(m => m.id === matchId);
    if (!match) return;
    const matchPhase = match.phase || 'grupos';
    const isPhaseUnlocked = isUserAdmin || matchPhase === 'grupos' || enabledPhases.includes(matchPhase);
    
    if (!isPhaseUnlocked) {
      setErrorFeedback(prev => ({ ...prev, [matchId]: 'Esta fase aún no ha sido habilitada para votación' }));
      return;
    }

    const customState = inputStates[matchId];
    const existing = getForecast(matchId);
    
    // Fallback to existing or empty
    const hStr = customState?.home !== undefined ? customState.home : (existing ? String(existing.homeScore) : '');
    const aStr = customState?.away !== undefined ? customState.away : (existing ? String(existing.awayScore) : '');

    if (hStr === '' || aStr === '') {
      setErrorFeedback(prev => ({ ...prev, [matchId]: 'Ingresá goles para ambos equipos' }));
      return;
    }

    const home = parseInt(hStr, 10);
    const away = parseInt(aStr, 10);

    if (isNaN(home) || isNaN(away) || home < 0 || home > 99 || away < 0 || away > 99) {
      setErrorFeedback(prev => ({ ...prev, [matchId]: 'Ingresá valores entre 0 y 99' }));
      return;
    }

    setErrorFeedback(prev => ({ ...prev, [matchId]: '' }));
    setSavingId(matchId);
    
    try {
      await onSaveForecast(matchId, home, away);
      setSuccessFeedback(prev => ({ ...prev, [matchId]: true }));
      setTimeout(() => {
        setSuccessFeedback(prev => ({ ...prev, [matchId]: false }));
      }, 3000);
    } catch (err) {
      setErrorFeedback(prev => ({ ...prev, [matchId]: 'Error guardando datos' }));
    } finally {
      setSavingId(null);
    }
  };

  // Filter matches
  const filteredMatches = matches.filter(m => {
    const matchPhase = m.phase || 'grupos';
    if (matchPhase !== selectedPhase) return false;

    if (filter === 'pending') return m.status === 'pending';
    if (filter === 'finished') return m.status === 'finished';
    return true;
  });

  const phasesList = [
    { tag: 'grupos', title: 'Fase de Grupos' },
    { tag: '16avos', title: '16avos de Final' },
    { tag: '8vos', title: '8vos de Final' },
    { tag: 'cuartos', title: 'Cuartos de Final' },
    { tag: 'semis', title: 'Semifinales' },
    { tag: 'final', title: 'Gran Final' }
  ];

  return (
    <div id="matches-panel" className="space-y-6">
 
      {/* Knockout Stages Sub-navigation Tabs */}
      <div id="knockout-stages-tabs" className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-1 mb-3">
          <Sparkles className="h-3.5 w-3.5 text-blue-600" />
          <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">
            Fases del Torneo Oficial Prode
          </span>
        </div>
        <div className="flex items-center gap-3 overflow-x-auto pb-1.5 -mx-1 px-1 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
          {phasesList.map((stg, index) => {
            const isSelected = selectedPhase === stg.tag;
            
            // Check if phase is unlocked
            let isUnlocked = true;
            if (stg.tag !== 'grupos' && !isUserAdmin) {
              isUnlocked = enabledPhases.includes(stg.tag);
            }

            const phaseMatches = matches.filter(m => (m.phase || 'grupos') === stg.tag);
            const totalMatches = phaseMatches.length;
            const finishedInPhase = phaseMatches.filter(m => m.status === 'finished').length;

            return (
              <button
                key={stg.tag}
                onClick={() => {
                  if (isUnlocked) {
                    setSelectedPhase(stg.tag);
                  }
                }}
                disabled={!isUnlocked}
                className={`flex items-start gap-2.5 p-3 px-4 rounded-xl border-2 transition-all text-left shrink-0 min-w-[155px] ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/20 shadow-sm cursor-pointer'
                    : isUnlocked
                      ? 'border-slate-200 bg-white hover:border-slate-400 cursor-pointer'
                      : 'border-slate-200 bg-slate-50/60 opacity-65 cursor-not-allowed select-none'
                }`}
                title={
                  isUnlocked
                    ? `Ver fixture de ${stg.title}`
                    : `La fase de ${stg.title} está programada. Se habilitará cuando finalice la fase anterior.`
                }
              >
                <div className={`p-1.5 rounded-lg shrink-0 ${
                  isSelected
                    ? 'bg-blue-600 text-white'
                    : isUnlocked
                      ? 'bg-slate-100 text-blue-700'
                      : 'bg-slate-200 text-slate-400'
                }`}>
                  {!isUnlocked ? (
                    <Lock className="h-4 w-4" />
                  ) : (
                    <Calendar className="h-4 w-4" />
                  )}
                </div>
                <div className="text-left font-sans">
                  <span className={`text-[11px] font-black block leading-tight ${
                    isSelected ? 'text-blue-900' : 'text-slate-700 font-bold'
                  }`}>
                    {stg.title}
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-wider block mt-0.5 font-mono">
                    {totalMatches > 0 ? (
                      <span className={finishedInPhase === totalMatches ? 'text-blue-700' : 'text-emerald-600'}>
                        {finishedInPhase}/{totalMatches} Jugados
                      </span>
                    ) : isUnlocked ? (
                      <span className="text-amber-600">Por configurar ⚙️</span>
                    ) : (
                      <span className="text-slate-400">Próximamente 🔒</span>
                    )}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Filters Hub Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-blue-950 border border-blue-900 p-4 rounded-xl">
        <div>
          <h3 className="text-sm font-semibold text-white">Fixture de Partidos</h3>
          <p className="text-xs text-blue-200">Guardá tus pronósticos exactos para acumular puntos</p>
        </div>
        
        <div className="flex border border-blue-800 bg-blue-900/50 p-1 rounded-xl w-fit">
          <button
            onClick={() => setFilter('all')}
            className={`text-xs font-bold px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              filter === 'all' ? 'bg-yellow-400 text-blue-950 shadow' : 'text-blue-100 hover:text-white'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`text-xs font-bold px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              filter === 'pending' ? 'bg-yellow-400 text-blue-950 shadow' : 'text-blue-100 hover:text-white'
            }`}
          >
            Pendientes
          </button>
          <button
            onClick={() => setFilter('finished')}
            className={`text-xs font-bold px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              filter === 'finished' ? 'bg-yellow-400 text-blue-950 shadow' : 'text-blue-100 hover:text-white'
            }`}
          >
            Finalizados
          </button>
        </div>
      </div>

      {/* Match cards grid */}
      {filteredMatches.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredMatches.map(match => {
            const forecast = getForecast(match.id);
            const { isLocked, timeLeftString, lockDeadline } = getLockInfo(match.matchDate);
            const hasStarted = Date.now() >= new Date(match.matchDate).getTime();
            
            const matchPhase = match.phase || 'grupos';
            const isPhaseUnlocked = isUserAdmin || matchPhase === 'grupos' || enabledPhases.includes(matchPhase);

            // Local input memory or default to loaded forecast
            const homeVal = inputStates[match.id]?.home !== undefined 
              ? inputStates[match.id].home 
              : (forecast ? String(forecast.homeScore) : '');
            
            const awayVal = inputStates[match.id]?.away !== undefined 
              ? inputStates[match.id].away 
              : (forecast ? String(forecast.awayScore) : '');

            const isFormDirty = forecast 
              ? (homeVal !== String(forecast.homeScore) || awayVal !== String(forecast.awayScore))
              : (homeVal !== '' || awayVal !== '');

            // Calculate points outcome display for finished matches
            const renderPointsResult = () => {
              if (match.status !== 'finished') return null;
              if (!forecast) {
                return (
                  <div className="mt-3.5 bg-slate-100 text-slate-500 text-[11px] py-1.5 px-3 rounded-lg text-center font-medium border border-slate-200">
                    No cargaste pronóstico para este partido (+0 Puntos)
                  </div>
                );
              }

              const pts = forecast.pointsEarned ?? 0;
              return (
                <div className={`mt-3.5 flex items-center justify-between text-xs p-3 rounded-xl border ${
                  pts === 3 
                    ? 'bg-yellow-50 text-yellow-900 border-yellow-200' 
                    : pts === 1 
                      ? 'bg-blue-50 text-blue-900 border-blue-200'
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}>
                  <div className="flex items-center space-x-1.5">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-blue-700" />
                    <span className="font-medium">
                      {pts === 3 
                        ? '🔥 ¡Acertaste resultado exacto!' 
                        : pts === 1 
                          ? '✅ ¡Acertaste ganador / empate!' 
                          : '❌ Resultado errado'}
                    </span>
                  </div>
                  <span className="font-mono font-extrabold text-sm whitespace-nowrap">
                    +{pts} PTS
                  </span>
                </div>
              );
            };

            return (
              <div 
                key={match.id} 
                className={`bg-white border text-left rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between ${
                  match.status === 'finished' ? 'border-blue-100 bg-blue-50/10' : 'border-slate-200'
                }`}
              >
                
                {/* Match Header Info */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    {/* Lock Status Header Indicator */}
                    {match.status === 'finished' ? (
                      <span className="inline-flex items-center text-[10px] uppercase font-bold text-slate-500 bg-slate-100 border px-2 py-0.5 rounded-full font-mono">
                        Partido Finalizado
                      </span>
                    ) : !isPhaseUnlocked ? (
                      <span className="inline-flex items-center text-[10px] uppercase font-bold text-amber-600 bg-amber-55 border border-amber-200 px-2 py-0.5 rounded-full font-mono">
                        <Lock className="h-2.5 w-2.5 mr-1" />
                        Fase Inactiva 🔒
                      </span>
                    ) : isLocked ? (
                      <span className="inline-flex items-center text-[10px] uppercase font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full font-mono">
                        <Lock className="h-2.5 w-2.5 mr-1" />
                        Bloqueado (Cerrado)
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-[10px] uppercase font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full font-mono">
                        <Unlock className="h-2.5 w-2.5 mr-1" />
                        Abierto (Editable)
                      </span>
                    )}

                    {/* Time limit label for pending matches */}
                    {match.status === 'pending' && !isLocked && timeLeftString && (
                      <span className="text-[11px] font-medium text-amber-600 flex items-center gap-1 font-mono">
                        <Clock className="h-3 w-3" />
                        {timeLeftString}
                      </span>
                    )}
                  </div>

                  {/* Scheduled Kickoff Text */}
                  <div className="flex items-center text-xs text-slate-400 gap-1.5 mb-4 font-mono">
                    <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="capitalize">{formatMatchDate(match.matchDate)}</span>
                  </div>

                  {/* High visual SCORE BOARD container */}
                  <div className="bg-slate-55 border border-slate-150 bg-slate-50/50 rounded-xl p-3.5 flex items-center justify-between shadow-inner">
                    {/* Home Team */}
                    <div className="flex-1 flex items-center justify-end font-semibold text-sm text-slate-800 pr-2">
                      <div className="flex items-center gap-1.5 truncate text-slate-800 font-extrabold text-xs tracking-tight hover:scale-105 transition-transform cursor-default">
                        <img 
                          src={`/flags/${getTeamNameAndFlag(match.homeTeam).code}.svg`} 
                          alt={getTeamNameAndFlag(match.homeTeam).name} 
                          title={getTeamNameAndFlag(match.homeTeam).name}
                          className="w-5 h-5 rounded-full shadow-sm select-none" 
                        />
                        <span>{getTeamNameAndFlag(match.homeTeam).name}</span>
                      </div>
                    </div>

                    {/* SCORE (Real Score or VS text) */}
                    <div className="flex flex-col items-center px-4 font-mono">
                      {match.status === 'finished' ? (
                        <div className="flex items-center space-x-2">
                          <span className="text-2xl font-black text-blue-900">{match.homeScore}</span>
                          <span className="text-slate-350 font-bold">-</span>
                          <span className="text-2xl font-black text-blue-900">{match.awayScore}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-200/60 px-2.5 py-1 rounded-lg">
                          VS
                        </span>
                      )}
                      
                      <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold mt-1">
                        Resultado Real
                      </span>
                    </div>

                    {/* Away Team */}
                    <div className="flex-1 flex items-center justify-start font-semibold text-sm text-slate-800 pl-2">
                      <div className="flex items-center gap-1.5 truncate text-slate-800 font-extrabold text-xs tracking-tight hover:scale-105 transition-transform cursor-default">
                        <span>{getTeamNameAndFlag(match.awayTeam).name}</span>
                        <img 
                          src={`/flags/${getTeamNameAndFlag(match.awayTeam).code}.svg`} 
                          alt={getTeamNameAndFlag(match.awayTeam).name} 
                          title={getTeamNameAndFlag(match.awayTeam).name}
                          className="w-5 h-5 rounded-full shadow-sm select-none" 
                        />
                      </div>
                    </div>
                  </div>

                  {/* User forecast scoring logic entry box */}
                  <div className="mt-4 border-t border-dashed border-slate-200 pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Tu Pronóstico:
                      </span>
                      {forecast && (
                        <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                          Guardado
                        </span>
                      )}
                    </div>

                    {/* Forecast Entry Input Control Row */}
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center space-x-1 flex-1">
                        {/* Home Forecasted score input */}
                        <input
                          type="text"
                          pattern="[0-9]*"
                          inputMode="numeric"
                          maxLength={2}
                          value={homeVal}
                          onChange={(e) => handleScoreChange(match.id, 'home', e.target.value)}
                          disabled={!isPhaseUnlocked || isLocked || match.status === 'finished' || savingId === match.id}
                          placeholder="-"
                          className="w-12 h-10 border border-slate-200 bg-slate-50 rounded-lg text-center text-base font-extrabold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white disabled:bg-slate-100 disabled:text-slate-400 transition-all font-mono"
                        />
                        
                        <span className="text-slate-300 font-bold">:</span>
                        
                        {/* Away Forecasted score input */}
                        <input
                          type="text"
                          pattern="[0-9]*"
                          inputMode="numeric"
                          maxLength={2}
                          value={awayVal}
                          onChange={(e) => handleScoreChange(match.id, 'away', e.target.value)}
                          disabled={!isPhaseUnlocked || isLocked || match.status === 'finished' || savingId === match.id}
                          placeholder="-"
                          className="w-12 h-10 border border-slate-200 bg-slate-50 rounded-lg text-center text-base font-extrabold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white disabled:bg-slate-100 disabled:text-slate-400 transition-all font-mono"
                        />
                      </div>

                      {/* Submit / Update Button for open matches */}
                      {match.status === 'pending' && (
                        <button
                          onClick={() => handleSubmit(match.id)}
                          disabled={!isPhaseUnlocked || isLocked || savingId === match.id || !isFormDirty}
                          className={`px-3 py-2 text-xs font-bold rounded-lg flex items-center space-x-1 transition-all shadow-sm cursor-pointer ${
                            isLocked 
                              ? 'bg-slate-100 text-slate-400 cursor-not-allowed border'
                              : savingId === match.id
                                ? 'bg-amber-100 text-amber-700 border border-amber-250 cursor-not-allowed'
                                : !isFormDirty 
                                  ? 'bg-slate-55 text-slate-400 border border-slate-250 hover:text-slate-600 hover:bg-slate-100'
                                  : 'bg-yellow-405 bg-yellow-400 text-blue-955 text-blue-900 border border-yellow-500/20 hover:bg-yellow-500'
                          }`}
                        >
                          {savingId === match.id ? (
                            <RefreshCcw className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Save className="h-3.5 w-3.5" />
                          )}
                          <span>{savingId === match.id ? 'Guardando...' : (forecast ? 'Actualizar' : 'Guardar')}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Display Feedbacks */}
                <div className="mt-2 min-h-[20px]">
                  {errorFeedback[match.id] && (
                    <p className="text-[10px] text-rose-500 font-medium flex items-center gap-0.5">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      {errorFeedback[match.id]}
                    </p>
                  )}
                  {successFeedback[match.id] && (
                    <p className="text-[10px] text-blue-600 font-bold flex items-center gap-0.5">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                      ¡Pronóstico guardado exitosamente!
                    </p>
                  )}
                </div>

                {/* Settle outcomes details rendering */}
                {renderPointsResult()}



              </div>
            );
          })}
        </div>
      ) : matches.length === 0 ? (
        <div className="p-8 md:p-12 text-center bg-white border border-slate-200 rounded-2xl max-w-2xl mx-auto shadow-sm">
          <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-4 animate-bounce" />
          <h4 className="font-bold text-slate-800 text-lg">La base de datos de Partidos está vacía</h4>
          <p className="text-xs text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed">
            Parece que aún no se han cargado los enfrentamientos correspondientes al Prode Corporativo de la fecha.
          </p>
          
          {isUserAdmin ? (
            <div className="mt-6 p-5 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl space-y-3.5 text-left">
              <span className="text-[10px] uppercase font-mono font-black text-blue-800 tracking-wider bg-white px-2.5 py-1 rounded-full border border-blue-105">
                Acceso Administrador BanCo 🛠️
              </span>
              <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                Como Administrador, podés cargar instantáneamente el **Fixture Oficial Prode de 10 Partidos** para que todos los empleados de la institución comiencen a emitir sus pronósticos.
              </p>
              
              {fixtureSuccess ? (
                <div className="bg-emerald-50 border border-emerald-250 p-2.5 rounded-xl text-center text-xs font-bold text-emerald-800">
                  ¡Fixture de partidos cargado con éxito! Cargando listado de inmediato...
                </div>
              ) : (
                <button
                  onClick={handleGenerateFixture}
                  disabled={loadingFixture}
                  className="w-full bg-blue-700 hover:bg-blue-800 text-white font-extrabold py-3 px-4 rounded-xl text-xs flex items-center justify-center space-x-2.5 transition-all shadow-md cursor-pointer disabled:bg-slate-300"
                >
                  {loadingFixture ? (
                    <>
                      <RefreshCcw className="h-4 w-4 animate-spin" />
                      <span>Generando Base de Partidos en Firestore...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4.5 w-4.5 text-yellow-400 animate-pulse" />
                      <span>Cargar Fixture Oficial del Torneo</span>
                    </>
                  )}
                </button>
              )}
            </div>
          ) : (
            <div className="mt-6 p-4 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-400 italic">
              El administrador de BanCo Corrientes estará publicando la plantilla de partidos en breve. ¡Regresá pronto con tus pronósticos ganadores listos!
            </div>
          )}
        </div>
      ) : (
        <div className="p-8 md:p-12 text-center bg-white border border-slate-200 rounded-2xl max-w-2xl mx-auto shadow-sm">
          <Sparkles className="h-12 w-12 text-blue-450 text-blue-400 mx-auto mb-4 animate-pulse" />
          <h4 className="font-bold text-slate-800 text-lg">
            La fase {
              (() => {
                const phaseLabels: { [key: string]: string } = {
                  'grupos': 'Fase de Grupos ⚽',
                  '16avos': '16avos de Final 🏆',
                  '8vos': '8vos de Final 🛡️',
                  'cuartos': 'Cuartos de Final 🥇',
                  'semis': 'Semifinales 🌟',
                  'final': 'Gran Final 👑'
                };
                return phaseLabels[selectedPhase] || selectedPhase;
              })()
            } aún no está configurada
          </h4>
          <p className="text-xs text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed">
            Aún no se han configurado ni cargado los partidos correspondientes a esta llave/fase en el fixture.
          </p>
          
          {isUserAdmin && onGenerateKnockout ? (
            <div className="mt-6 p-5 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl space-y-3.5 text-left">
              <span className="text-[10px] uppercase font-mono font-black text-blue-800 tracking-wider bg-white px-2.5 py-1 rounded-full border border-blue-105">
                Módulo Administrador BanCo 🛠️
              </span>
              <p className="text-xs text-slate-650 font-bold leading-relaxed text-slate-700">
                Como Administrador, podés generar automáticamente las llaves de esta fase sin borrar ninguna información del resto del torneo ni los pronósticos de otros usuarios.
              </p>
              
              <div className="grid grid-cols-1 gap-2.5">
                <button
                  onClick={() => handleGenerateKnockoutPhase('dynamic')}
                  disabled={generatingKnockout}
                  className="w-full bg-blue-700 hover:bg-blue-800 text-white font-extrabold py-3 px-4 rounded-xl text-xs flex items-center justify-center space-x-2 transition-all shadow-md cursor-pointer disabled:bg-slate-350 disabled:bg-slate-300"
                >
                  {generatingKnockout ? (
                    <>
                      <RefreshCcw className="h-4 w-4 animate-spin" />
                      <span>Generando cruces...</span>
                    </>
                  ) : (
                    <span>Calcular Clasificados desde Fase Anterior ⚽</span>
                  )}
                </button>
                
                <button
                  onClick={() => handleGenerateKnockoutPhase('placeholder')}
                  disabled={generatingKnockout}
                  className="w-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-extrabold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center space-x-2 transition-all shadow-sm cursor-pointer disabled:bg-slate-305 disabled:bg-slate-300"
                >
                  <span>Crear Llaves con Plantilla de Demostración 🏆</span>
                </button>
              </div>

              {knockoutResult && (
                <div className={`mt-3 p-3 rounded-xl text-xs font-bold leading-relaxed border ${
                  knockoutResult.success 
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-250' 
                    : 'bg-rose-50 text-rose-800 border-rose-250'
                }`}>
                  {knockoutResult.message}
                </div>
              )}
            </div>
          ) : (
            <div className="mt-6 p-4 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-400 italic">
              El administrador de BanCo Corrientes estará publicando los cruces correspondientes a esta fase una vez computados los resultados anteriores. ¡Regresá pronto con tus pronósticos listos!
            </div>
          )}
        </div>
      )}

    </div>
  );
};
