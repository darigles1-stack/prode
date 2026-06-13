import React, { useState, useMemo } from 'react';
import { Trophy, Calendar, Sparkles, Sliders, ChevronRight, HelpCircle, GitCommit } from 'lucide-react';
import { SoccerMatch } from '../types';
import { OFFICIAL_WORLD_STAGE_MATCHES, getFlagForCountry, getCountryCode } from '../lib/worldCupData';

interface PosicionesYCopasProps {
  matches: SoccerMatch[];
}

export const PosicionesYCopas: React.FC<PosicionesYCopasProps> = ({ matches }) => {
  const [subTab, setSubTab] = useState<'grupos' | 'llaves'>('grupos');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('all');

  // --- 1. DYNAMIC GROUP STANDING CALCULATIONS ---
  const groupStandings = useMemo(() => {
    // Collect all real team list based on official schedule
    const teamToGroup: Record<string, string> = {};
    const teamToFlag: Record<string, string> = {};

    OFFICIAL_WORLD_STAGE_MATCHES.forEach(m => {
      teamToGroup[m.local] = m.fase;
      teamToGroup[m.visitante] = m.fase;
      teamToFlag[m.local] = m.localFlag;
      teamToFlag[m.visitante] = m.visitanteFlag;
    });

    const cleanTeams = Object.keys(teamToGroup);

    // Initialize standings structure
    const stats: Record<string, {
      team: string;
      flag: string;
      pj: number;
      g: number;
      e: number;
      p: number;
      gf: number;
      gc: number;
      gd: number;
      pts: number;
      group: string;
    }> = {};

    cleanTeams.forEach(teamName => {
      stats[teamName] = {
        team: teamName,
        flag: teamToFlag[teamName] || getFlagForCountry(teamName) || '🏳️',
        pj: 0,
        g: 0,
        e: 0,
        p: 0,
        gf: 0,
        gc: 0,
        gd: 0,
        pts: 0,
        group: teamToGroup[teamName]
      };
    });

    // Helper to extract clean name (handles flags in DB cases if any)
    const findCleanName = (name: string): string => {
      if (!name) return "";
      const removedText = name.replace(/[^\p{L}\s\.\-]/gu, '').replace(/\s+/g, ' ').trim();
      const match = cleanTeams.find(t => t.toLowerCase() === removedText.toLowerCase());
      return match || removedText;
    };

    // Filter group matches in DB
    const groupMatches = matches.filter(m => (m.phase || 'grupos') === 'grupos');

    groupMatches.forEach(m => {
      if (
        m.status === 'finished' && 
        m.homeScore !== null && 
        m.homeScore !== undefined && 
        m.awayScore !== null && 
        m.awayScore !== undefined
      ) {
        const homeClean = findCleanName(m.homeTeam);
        const awayClean = findCleanName(m.awayTeam);

        const homeStat = stats[homeClean];
        const awayStat = stats[awayClean];

        if (homeStat && awayStat) {
          const hs = Number(m.homeScore);
          const as = Number(m.awayScore);

          homeStat.pj += 1;
          awayStat.pj += 1;
          homeStat.gf += hs;
          homeStat.gc += as;
          awayStat.gf += as;
          awayStat.gc += hs;
          homeStat.gd = homeStat.gf - homeStat.gc;
          awayStat.gd = awayStat.gf - awayStat.gc;

          if (hs > as) {
            homeStat.pts += 3;
            homeStat.g += 1;
            awayStat.p += 1;
          } else if (as > hs) {
            awayStat.pts += 3;
            awayStat.g += 1;
            homeStat.p += 1;
          } else {
            homeStat.pts += 1;
            awayStat.pts += 1;
            homeStat.e += 1;
            awayStat.e += 1;
          }
        }
      }
    });

    // Bucket into Groups
    const groupsBuckets: Record<string, typeof stats[string][]> = {};
    Object.values(stats).forEach(item => {
      if (!groupsBuckets[item.group]) {
        groupsBuckets[item.group] = [];
      }
      groupsBuckets[item.group].push(item);
    });

    // Sort order: Group A, B, C... L
    const groupTabsKeys = [
      "Grupo A", "Grupo B", "Grupo C", "Grupo D", "Grupo E", "Grupo F",
      "Grupo G", "Grupo H", "Grupo I", "Grupo J", "Grupo K", "Grupo L"
    ];

    const sortedGroups: Record<string, typeof stats[string][]> = {};
    groupTabsKeys.forEach(gName => {
      const list = groupsBuckets[gName] || [];
      // Sort criteria: 1. PTS DESC, 2. GD DESC, 3. GF DESC, 4. alphabetically name
      list.sort((a, b) => {
        if (b.pts !== a.pts) return b.pts - a.pts;
        if (b.gd !== a.gd) return b.gd - a.gd;
        if (b.gf !== a.gf) return b.gf - a.gf;
        return a.team.localeCompare(b.team);
      });
      sortedGroups[gName] = list;
    });

    return sortedGroups;
  }, [matches]);


  // --- 2. DYNAMIC KNOCKOUT BRACKET PREPARATION ---
  // We extract matching phase matches
  const knockoutPhases = useMemo(() => {
    const phasesToExtract = ['16avos', '8vos', 'cuartos', 'semis', 'final'];
    const data: Record<string, SoccerMatch[]> = {
      '16avos': [],
      '8vos': [],
      'cuartos': [],
      'semis': [],
      'final': []
    };

    matches.forEach(m => {
      if (m.phase && phasesToExtract.includes(m.phase)) {
        data[m.phase].push(m);
      }
    });

    // Sort by id chronologically/indexed order so they match layout structure
    Object.keys(data).forEach(pKey => {
      data[pKey].sort((a, b) => {
        const idA = a.id || '';
        const idB = b.id || '';
        const numA = parseInt(idA.split('_')[1] || '0', 10);
        const numB = parseInt(idB.split('_')[1] || '0', 10);
        return numA - numB;
      });
    });

    return data;
  }, [matches]);


  // List of group tags
  const groupNames = [
    "Grupo A", "Grupo B", "Grupo C", "Grupo D", "Grupo E", "Grupo F",
    "Grupo G", "Grupo H", "Grupo I", "Grupo J", "Grupo K", "Grupo L"
  ];

  return (
    <div id="posiciones-y-copas-tab" className="space-y-6">
      
      {/* Tab bar header banner */}
      <div className="bg-gradient-to-r from-blue-950 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <span className="bg-amber-400 text-slate-950 font-mono text-[10px] uppercase font-black px-2.5 py-1 rounded-full tracking-wider border border-amber-300">
              📊 Tablas del Mundial & Copa
            </span>
            <h2 className="text-xl md:text-2xl font-black tracking-tight flex items-center gap-2">
              Progreso del Torneo en Vivo 🏆
            </h2>
            <p className="text-xs text-slate-300 max-w-xl">
              Visualizá de forma transparente cómo se mueven las tablas y el sendero para levantar la copa mundial. Los puntos, goles y cruces se calculan de manera automática a medida que se ingresan los resultados reales de cada partido.
            </p>
          </div>

          {/* Sub-selector tabs */}
          <div className="flex bg-slate-900/80 p-1.5 rounded-xl border border-indigo-900/50 self-start md:self-center shrink-0">
            <button
              onClick={() => setSubTab('grupos')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                subTab === 'grupos'
                  ? 'bg-blue-600 text-white shadow-md font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Fase de Grupos 📊
            </button>
            <button
              onClick={() => setSubTab('llaves')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                subTab === 'llaves'
                  ? 'bg-blue-600 text-white shadow-md font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Copa y Llaves Finales 🏆
            </button>
          </div>
        </div>
      </div>

      {subTab === 'grupos' ? (
        <div className="space-y-6">
          {/* Quick HUD guide */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3 font-sans">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 text-blue-700 rounded-xl">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-extrabold text-blue-950 block">Regla de Clasificación</span>
                <span className="text-[11px] text-slate-500">
                  Avanzan a <strong>16avos de Final</strong> los dos mejores de cada grupo (1° y 2°) y los mejores 8 terceros del torneo.
                </span>
              </div>
            </div>

            {/* Quick group selector list */}
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setSelectedGroupFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  selectedGroupFilter === 'all'
                    ? 'bg-blue-950 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                Todos
              </button>
              {groupNames.map(gn => (
                <button
                  key={gn}
                  onClick={() => setSelectedGroupFilter(gn)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    selectedGroupFilter === gn
                      ? 'bg-blue-950 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  {gn.replace('Grupo ', '')}
                </button>
              ))}
            </div>
          </div>

          {/* Groups Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groupNames
              .filter(gName => selectedGroupFilter === 'all' || selectedGroupFilter === gName)
              .map(gName => {
                const list = groupStandings[gName] || [];

                return (
                  <div key={gName} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col hover:border-blue-300 transition-all">
                    {/* Header bar aligned like standard World cup visual */}
                    <div className="bg-blue-950 text-white px-4 py-3 flex items-center justify-between font-sans">
                      <span className="text-xs font-black tracking-widest uppercase text-amber-300">
                        {gName.toUpperCase()}
                      </span>
                      <div className="flex gap-4 text-[9.5px] font-bold text-slate-300 font-mono tracking-wider">
                        <span className="w-4 text-center">PJ</span>
                        <span className="w-11 text-center">G-E-P</span>
                        <span className="w-4 text-center">DG</span>
                        <span className="w-6 text-center text-amber-300">PTS</span>
                      </div>
                    </div>

                    {/* Team rows rendering */}
                    <div className="divide-y divide-slate-100 font-sans flex-1">
                      {list.length === 0 ? (
                        <div className="p-8 text-center text-xs text-slate-400">
                          No se han cargado equipos en esta fase
                        </div>
                      ) : (
                        list.map((item, idx) => {
                          const isPromoted = idx < 2; // Rank 1 and 2 automatically promote
                          return (
                            <div 
                              key={item.team} 
                              className={`flex items-center justify-between px-4 py-3.5 transition-all ${
                                isPromoted ? 'bg-blue-50/20' : 'bg-white'
                              }`}
                            >
                              {/* Left details team */}
                              <div className="flex items-center gap-2.5">
                                {/* Position rank circle */}
                                <span className={`text-[10.5px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center font-mono ${
                                  idx === 0 
                                    ? 'bg-amber-100 text-amber-800' 
                                    : idx === 1 
                                      ? 'bg-blue-100 text-blue-800' 
                                      : idx === 2 
                                        ? 'bg-slate-100 text-slate-600' 
                                        : 'bg-red-50 text-red-500'
                                }`}>
                                  {idx + 1}
                                </span>

                                {/* Country Flag */}
                                {(() => {
                                  const code = getCountryCode(item.team);
                                  return code ? (
                                    <img 
                                      src={`/flags/${code}.svg`} 
                                      alt={item.team} 
                                      title={item.team}
                                      className="w-5 h-5 rounded-full shadow-sm select-none shrink-0 object-cover" 
                                      referrerPolicy="no-referrer"
                                    />
                                  ) : (
                                    <span className="text-base select-none inline-block leading-none">
                                      {item.flag}
                                    </span>
                                  );
                                })()}

                                {/* Name short abbreviations or clean names */}
                                <span className={`text-xs ${isPromoted ? 'font-black text-slate-900' : 'font-medium text-slate-600'}`}>
                                  {item.team}
                                </span>
                              </div>

                              {/* Right Stats aligned perfectly */}
                              <div className="flex gap-4 text-[10.5px] font-mono text-slate-700">
                                {/* Played matches (P) */}
                                <span className="w-4 text-center font-semibold text-slate-400">
                                  {item.pj}
                                </span>

                                {/* Won-Drawn-Lost representation */}
                                <span className="w-11 text-center text-[9.5px] font-normal text-slate-400">
                                  {item.g}-{item.e}-{item.p}
                                </span>

                                {/* Goal Difference (GD / DG) */}
                                <span className={`w-4 text-center font-bold ${
                                  item.gd > 0 
                                    ? 'text-emerald-600' 
                                    : item.gd < 0 
                                      ? 'text-rose-500' 
                                      : 'text-slate-400'
                                }`}>
                                  {item.gd > 0 ? `+${item.gd}` : item.gd}
                                </span>

                                {/* Points Box highlighted with solid container matching model image */}
                                <span className="w-6 text-center font-black rounded text-[11px] bg-blue-900 text-amber-300 shadow-sm leading-6 h-5.5 flex items-center justify-center">
                                  {item.pts}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                    {/* Foot note showing details */}
                    <div className="bg-slate-50/50 border-t border-slate-100 px-4 py-2 flex items-center justify-between text-[10px] text-slate-400 font-sans">
                      <span>Ref: G-E-P (Goles: {list.reduce((acc, c) => acc + c.gf, 0)}F / {list.reduce((acc, c) => acc + c.gc, 0)}C)</span>
                      <span className="flex items-center gap-1 font-semibold text-blue-800">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                        Cálculo automático
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Quick HUD guide for brackets */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 font-sans">
            <div className="flex items-center gap-2.5">
              <Trophy className="h-5 w-5 text-amber-500 shrink-0" />
              <div>
                <span className="text-xs font-extrabold text-slate-800 block">Camino al Cetro Mundialista</span>
                <span className="text-[10.5px] text-slate-500">
                  Las series son de eliminación directa. El ganador avanza de ronda y el perdedor queda descalificado.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-[10.5px] font-bold text-slate-600 shrink-0">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full inline-block"></span> Finalizado
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 bg-amber-500 rounded-full inline-block animate-pulse"></span> Pendiente / En Curso
              </span>
            </div>
          </div>

          {/* BRACKET TIMELINE COLUMNS (Desktops scrollable horizontal grid layout represents the binary tree beautifully) */}
          <div className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
            <div className="flex gap-6 min-w-[1240px] px-2 items-stretch font-sans">
              
              {/* PHASE COLUMN: 16avos */}
              <div className="flex-1 space-y-4">
                <div className="bg-slate-900 text-white rounded-xl py-2 px-3 text-center border border-slate-800 shadow-sm shrink-0">
                  <span className="text-[11px] font-black uppercase tracking-wider block">16avos de Final</span>
                  <span className="text-[9.5px] text-slate-400 font-mono">16 llaves (32 países)</span>
                </div>
                <div className="space-y-3">
                  {renderPhaseMatches(knockoutPhases['16avos'], '16avos')}
                </div>
              </div>

              {/* PHASE COLUMN: 8vos */}
              <div className="flex-1 space-y-4 flex flex-col justify-around">
                <div className="bg-slate-900 text-white rounded-xl py-2 px-3 text-center border border-slate-800 shadow-sm shrink-0">
                  <span className="text-[11px] font-black uppercase tracking-wider block">8vos de Final</span>
                  <span className="text-[9.5px] text-slate-400 font-mono">8 llaves</span>
                </div>
                <div className="space-y-12 py-6 flex-1 flex flex-col justify-around">
                  {renderPhaseMatches(knockoutPhases['8vos'], '8vos')}
                </div>
              </div>

              {/* PHASE COLUMN: Cuartos */}
              <div className="flex-1 space-y-4 flex flex-col justify-around">
                <div className="bg-slate-900 text-white rounded-xl py-2 px-3 text-center border border-slate-800 shadow-sm shrink-0">
                  <span className="text-[11px] font-black uppercase tracking-wider block">Cuartos de Final</span>
                  <span className="text-[9.5px] text-slate-400 font-mono">4 llaves</span>
                </div>
                <div className="space-y-24 py-12 flex-1 flex flex-col justify-around">
                  {renderPhaseMatches(knockoutPhases['cuartos'], 'cuartos')}
                </div>
              </div>

              {/* PHASE COLUMN: Semis */}
              <div className="flex-1 space-y-4 flex flex-col justify-around">
                <div className="bg-slate-900 text-white rounded-xl py-2 px-3 text-center border border-slate-800 shadow-sm shrink-0">
                  <span className="text-[11px] font-black uppercase tracking-wider block">Semifinales</span>
                  <span className="text-[9.5px] text-slate-400 font-mono">2 llaves</span>
                </div>
                <div className="space-y-40 py-24 flex-1 flex flex-col justify-around font-sans">
                  {renderPhaseMatches(knockoutPhases['semis'], 'semis')}
                </div>
              </div>

              {/* PHASE COLUMN: GRAN FINAL */}
              <div className="flex-1 space-y-4 flex flex-col justify-center">
                <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 rounded-xl py-2.5 px-3 text-center border border-amber-300 shadow bg-size tracking-wide shrink-0">
                  <span className="text-[11px] font-black uppercase tracking-widest block">¡GRAN FINAL DE COPA! 🏆</span>
                  <span className="text-[9px] font-extrabold text-slate-900 uppercase">Campeón Mundial 🗺️</span>
                </div>
                <div className="py-24 flex-1 flex flex-col justify-center">
                  {renderPhaseMatches(knockoutPhases['final'], 'final', true)}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- HELPER FUNCTION TO RENDER INDIVIDUAL MATCH CARDS IN BRACKET VIEW ---
function getKnockoutTeamInfo(teamName: string) {
  if (!teamName) return { name: "Pendiente", flag: "🔮", code: "", isPlaceholder: true };
  
  // Check if it's a structural group representation rather than a final country
  const isPlaceholder = teamName.includes('°') || 
                        teamName.toLowerCase().includes('grupo') || 
                        teamName.toLowerCase().includes('ganador') || 
                        teamName.includes('🏆') ||
                        teamName.includes('/');
                     
  if (isPlaceholder) {
    return { name: teamName, flag: "🔮", code: "", isPlaceholder: true };
  }
  
  const clean = teamName.replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g, '').trim();
  const flag = getFlagForCountry(clean);
  const code = getCountryCode(clean);
  return { name: clean, flag, code, isPlaceholder: false };
}

function renderPhaseMatches(matchList: SoccerMatch[], phaseKey: string, isGrandFinal = false) {
  if (matchList.length === 0) {
    const defaultCounts: Record<string, number> = {
      '16avos': 16,
      '8vos': 8,
      'cuartos': 4,
      'semis': 2,
      'final': 1
    };
    const count = defaultCounts[phaseKey] || 1;
    return Array.from({ length: count }).map((_, i) => (
      <div 
        key={`placeholder_col_${phaseKey}_${i}`} 
        className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-3 text-center opacity-60 font-sans shadow-sm"
      >
        <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400 block mb-1">
          Llave {i + 1} ({phaseKey.toUpperCase()})
        </span>
        <div className="text-[10px] text-slate-400 italic">Pendiente de Generación</div>
      </div>
    ));
  }

  return matchList.map((match, idx) => {
    const isFinished = match.status === 'finished';
    const isHomeWinner = isFinished && (match.homeScore ?? 0) > (match.awayScore ?? 0);
    const isAwayWinner = isFinished && (match.awayScore ?? 0) > (match.homeScore ?? 0);

    const homeInfo = getKnockoutTeamInfo(match.homeTeam);
    const awayInfo = getKnockoutTeamInfo(match.awayTeam);

    const matchDateFormatted = match.matchDate ? (() => {
      try {
        const d = new Date(match.matchDate);
        return d.toLocaleDateString('es-AR', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }) + ' hs';
      } catch (e) {
        return '';
      }
    })() : '';

    return (
      <div 
        key={match.id} 
        className={`bg-white border text-left rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all relative font-sans ${
          isGrandFinal 
            ? 'border-amber-400 ring-2 ring-amber-400/25 bg-amber-50/10' 
            : isFinished 
              ? 'border-slate-200' 
              : 'border-blue-200 ring-1 ring-blue-500/10'
        }`}
      >
        {/* Top bar with match series index & dates */}
        <div className={`px-2.5 py-1 text-[9px] font-bold font-mono uppercase tracking-wider flex items-center justify-between border-b ${
          isGrandFinal 
            ? 'bg-amber-100 text-amber-950 border-amber-200' 
            : 'bg-slate-50 text-slate-500 border-slate-100'
        }`}>
          <span>
            {isGrandFinal ? '👑 MATCH DE CAMPEONATO' : `${phaseKey.toUpperCase()} - LLAVE ${idx + 1}`}
          </span>
          <span className="text-slate-400 text-[8.5px]">
            {matchDateFormatted}
          </span>
        </div>

        {/* Team 1/Home Row */}
        <div className="px-2.5 py-2 flex items-center justify-between border-b border-slate-50">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              isFinished 
                ? isHomeWinner 
                  ? 'bg-emerald-500' 
                  : 'bg-slate-300' 
                : 'bg-amber-400 animate-pulse'
            }`}></span>
            
            {/* Country Flag image */}
            {!homeInfo.isPlaceholder && homeInfo.code ? (
              <img 
                src={`/flags/${homeInfo.code}.svg`} 
                alt={homeInfo.name} 
                title={homeInfo.name}
                className="w-4 h-4 rounded-full shadow-sm select-none shrink-0 object-cover" 
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="text-[12px] select-none shrink-0" title={homeInfo.name}>
                {homeInfo.flag}
              </span>
            )}

            <span className={`text-[10px] truncate ${
              isFinished 
                ? isHomeWinner 
                  ? 'font-black text-slate-900' 
                  : 'text-slate-400' 
                : 'font-semibold text-slate-700'
            }`}>
              {homeInfo.name}
            </span>
          </div>
          {/* Score Box */}
          <span className={`text-xs font-mono font-black py-0.5 px-1.5 rounded text-center min-w-5 shrink-0 ${
            isFinished 
              ? isHomeWinner 
                ? 'bg-emerald-100 text-emerald-800' 
                : 'bg-slate-100 text-slate-400' 
              : 'bg-slate-50 text-slate-400'
          }`}>
            {match.homeScore !== null ? match.homeScore : '-'}
          </span>
        </div>

        {/* Team 2/Away Row */}
        <div className="px-2.5 py-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              isFinished 
                ? isAwayWinner 
                  ? 'bg-emerald-500' 
                  : 'bg-slate-300' 
                : 'bg-amber-400 animate-pulse'
            }`}></span>

            {/* Country Flag image */}
            {!awayInfo.isPlaceholder && awayInfo.code ? (
              <img 
                src={`/flags/${awayInfo.code}.svg`} 
                alt={awayInfo.name} 
                title={awayInfo.name}
                className="w-4 h-4 rounded-full shadow-sm select-none shrink-0 object-cover" 
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="text-[12px] select-none shrink-0" title={awayInfo.name}>
                {awayInfo.flag}
              </span>
            )}

            <span className={`text-[10px] truncate ${
              isFinished 
                ? isAwayWinner 
                  ? 'font-black text-slate-900' 
                  : 'text-slate-400' 
                : 'font-semibold text-slate-700'
            }`}>
              {awayInfo.name}
            </span>
          </div>
          {/* Score Box */}
          <span className={`text-xs font-mono font-black py-0.5 px-1.5 rounded text-center min-w-5 shrink-0 ${
            isFinished 
              ? isAwayWinner 
                ? 'bg-emerald-100 text-emerald-800' 
                : 'bg-slate-100 text-slate-400' 
              : 'bg-slate-50 text-slate-400'
          }`}>
            {match.awayScore !== null ? match.awayScore : '-'}
          </span>
        </div>

        {/* Winner Highlight line */}
        {isFinished && (
          <div className="bg-emerald-50 border-t border-slate-100 text-[8.5px] font-extrabold text-emerald-800 px-2.5 py-1 flex items-center gap-1.5">
            <span className="lowercase">vencedor:</span>
            {isHomeWinner ? (
              !homeInfo.isPlaceholder && homeInfo.code ? (
                <img 
                  src={`/flags/${homeInfo.code}.svg`} 
                  alt={homeInfo.name} 
                  className="w-3.5 h-3.5 rounded-full select-none shrink-0 object-cover" 
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span>{homeInfo.flag}</span>
              )
            ) : (
              !awayInfo.isPlaceholder && awayInfo.code ? (
                <img 
                  src={`/flags/${awayInfo.code}.svg`} 
                  alt={awayInfo.name} 
                  className="w-3.5 h-3.5 rounded-full select-none shrink-0 object-cover" 
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span>{awayInfo.flag}</span>
              )
            )}
            <span>{isHomeWinner ? homeInfo.name : awayInfo.name} 🎉</span>
          </div>
        )}
      </div>
    );
  });
}
