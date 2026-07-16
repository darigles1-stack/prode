import React, { useState, useMemo } from 'react';
import { Trophy, Calendar, Sparkles, Sliders, ChevronRight, HelpCircle, GitCommit, Volume2, VolumeX, SkipForward } from 'lucide-react';
import { SoccerMatch } from '../types';
import { OFFICIAL_WORLD_STAGE_MATCHES, getFlagForCountry, getCountryCode } from '../lib/worldCupData';
// @ts-ignore
import copaImg from '../assets/images/copa3.png';
// @ts-ignore
import finalBgImg from '../assets/images/final.png';

interface PosicionesYCopasProps {
  matches: SoccerMatch[];
  initialSubTab?: 'grupos' | 'llaves';
}

export const PosicionesYCopas: React.FC<PosicionesYCopasProps> = ({ matches, initialSubTab = 'grupos' }) => {
  const [subTab, setSubTab] = useState<'grupos' | 'llaves'>(initialSubTab);

  React.useEffect(() => {
    if (initialSubTab) {
      setSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackIdx, setCurrentTrackIdx] = useState(0);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const playlist = React.useMemo(() => [
    '/musicas/tema1.mp3',
    '/musicas/tema2.mp3',
    '/musicas/tema4.mp3',
    '/musicas/tema5.mp3',
    '/musicas/tema6.mp3',
    '/musicas/tema7.mp3'
  ], []);

  React.useEffect(() => {
    if (subTab === 'llaves') {
      const trackPath = playlist[currentTrackIdx];
      const audio = new Audio(trackPath);
      audio.loop = false;
      audioRef.current = audio;

      const playAudio = async () => {
        try {
          await audio.play();
          setIsPlaying(true);
        } catch (err) {
          console.log(`Autoplay block or failed play for ${trackPath}:`, err);
        }
      };

      playAudio();

      const handleEnded = () => {
        setCurrentTrackIdx(prev => (prev + 1) % playlist.length);
      };

      const handleError = () => {
        console.warn(`Audio error on ${trackPath}. Skipping to next.`);
        setCurrentTrackIdx(prev => (prev + 1) % playlist.length);
      };

      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('error', handleError);

      return () => {
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('error', handleError);
        audio.pause();
        audioRef.current = null;
        setIsPlaying(false);
      };
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
        setIsPlaying(false);
      }
    }
  }, [subTab, currentTrackIdx, playlist]);

  const toggleMute = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(err => {
        console.error("Failed to play audio:", err);
      });
    }
  };

  const handleNextTrack = () => {
    setCurrentTrackIdx(prev => (prev + 1) % playlist.length);
  };
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

  const groupColors: Record<string, string> = {
    "Grupo A": "border-emerald-500/30 text-emerald-400 bg-emerald-950/20",
    "Grupo B": "border-pink-500/30 text-pink-400 bg-pink-950/20",
    "Grupo C": "border-amber-500/30 text-amber-400 bg-amber-950/20",
    "Grupo D": "border-indigo-500/30 text-indigo-400 bg-indigo-950/20",
    "Grupo E": "border-orange-500/30 text-orange-400 bg-orange-950/20",
    "Grupo F": "border-lime-500/30 text-lime-400 bg-lime-950/20",
    "Grupo G": "border-rose-500/30 text-rose-400 bg-rose-950/20",
    "Grupo H": "border-cyan-500/30 text-cyan-400 bg-cyan-950/20",
    "Grupo I": "border-purple-500/30 text-purple-400 bg-purple-950/20",
    "Grupo J": "border-teal-500/30 text-teal-400 bg-teal-950/20",
    "Grupo K": "border-yellow-500/30 text-yellow-400 bg-yellow-950/20",
    "Grupo L": "border-sky-500/30 text-sky-400 bg-sky-950/20"
  };

  const renderGroupCardMin = (gName: string) => {
    const teams = groupStandings[gName] || [];
    return (
      <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-1.5 flex flex-col items-center gap-1 shadow-md w-[70px] select-none hover:border-zinc-700 transition-all">
        <div className="grid grid-cols-2 gap-1 bg-black/40 p-1 rounded-lg border border-zinc-900 w-[46px] h-[46px] items-center justify-center">
          {teams.slice(0, 4).map((t, idx) => {
            const code = getCountryCode(t.team);
            return code ? (
              <img 
                key={idx}
                src={`/flags/${code}.svg`} 
                alt={t.team} 
                className="w-3.5 h-3.5 rounded-full object-cover shadow-sm"
              />
            ) : (
              <span key={idx} className="text-[10px] leading-none">{t.flag || '🏳️'}</span>
            );
          })}
          {Array.from({ length: Math.max(0, 4 - teams.length) }).map((_, idx) => (
            <span key={`empty-${idx}`} className="text-[10px] leading-none">🏳️</span>
          ))}
        </div>
        <span className={`text-[8px] font-black tracking-wider px-1.5 py-0.5 rounded-full border leading-none ${groupColors[gName]}`}>
          {gName.replace("Grupo ", "GRP ")}
        </span>
      </div>
    );
  };

  const renderBracketMatchCard = (match: SoccerMatch | undefined, slotLabel: string, acceptsLabel: string) => {
    if (!match) {
      return (
        <div className="bg-zinc-950/30 border border-dashed border-zinc-800/60 rounded-xl p-2 w-[165px] text-center opacity-50 shadow-sm flex flex-col items-center justify-center h-[62px]">
          <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest block mb-0.5">{slotLabel}</span>
          <span className="text-[8px] text-zinc-600 font-bold truncate max-w-full px-1">{acceptsLabel}</span>
        </div>
      );
    }

    const isFinished = match.status === 'finished';
    const isHomeWinner = isFinished && (match.homeScore ?? 0) > (match.awayScore ?? 0);
    const isAwayWinner = isFinished && (match.awayScore ?? 0) > (match.homeScore ?? 0);

    const homeInfo = getKnockoutTeamInfo(match.homeTeam);
    const awayInfo = getKnockoutTeamInfo(match.awayTeam);

    const dateFormatted = match.matchDate ? (() => {
      try {
        const d = new Date(match.matchDate);
        return d.toLocaleDateString('es-AR', {
          month: 'numeric',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }) + ' hs';
      } catch (e) {
        return '';
      }
    })() : '';

    return (
      <div className={`bg-zinc-955/80 border bg-zinc-950 border-zinc-800/80 rounded-xl overflow-hidden shadow-md w-[165px] select-none hover:border-zinc-700 transition-all relative ${
        isFinished ? 'border-zinc-800/80' : 'border-blue-950/60 ring-1 ring-blue-500/5'
      }`}>
        <div className="px-2 py-0.5 text-[7.5px] font-black text-zinc-500 font-mono tracking-wider border-b border-zinc-900 flex justify-between bg-zinc-950 bg-opacity-60">
          <span>{slotLabel}</span>
          <span>{dateFormatted}</span>
        </div>

        <div className="px-2 py-1 flex items-center justify-between border-b border-zinc-900/30">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {!homeInfo.isPlaceholder && homeInfo.code ? (
              <img 
                src={`/flags/${homeInfo.code}.svg`} 
                alt={homeInfo.name} 
                className="w-3.5 h-3.5 rounded-full object-cover shrink-0"
              />
            ) : (
              <span className="text-[10px] shrink-0 leading-none">{homeInfo.flag}</span>
            )}
            <span className={`text-[10px] truncate leading-none ${
              isFinished 
                ? isHomeWinner 
                  ? 'font-black text-white' 
                  : 'text-zinc-500 font-medium' 
                : 'font-bold text-zinc-300'
            }`}>
              {homeInfo.name}
            </span>
          </div>
          <span className={`text-[10px] font-black font-mono px-1 rounded text-center min-w-4 shrink-0 leading-none py-0.5 ${
            isFinished 
              ? isHomeWinner 
                ? 'bg-emerald-950/50 text-emerald-400' 
                : 'bg-zinc-900/60 text-zinc-600' 
              : 'bg-zinc-900/20 text-zinc-500'
          }`}>
            {match.homeScore !== null ? match.homeScore : '-'}
          </span>
        </div>

        <div className="px-2 py-1 flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {!awayInfo.isPlaceholder && awayInfo.code ? (
              <img 
                src={`/flags/${awayInfo.code}.svg`} 
                alt={awayInfo.name} 
                className="w-3.5 h-3.5 rounded-full object-cover shrink-0"
              />
            ) : (
              <span className="text-[10px] shrink-0 leading-none">{awayInfo.flag}</span>
            )}
            <span className={`text-[10px] truncate leading-none ${
              isFinished 
                ? isAwayWinner 
                  ? 'font-black text-white' 
                  : 'text-zinc-500 font-medium' 
                : 'font-bold text-zinc-300'
            }`}>
              {awayInfo.name}
            </span>
          </div>
          <span className={`text-[10px] font-black font-mono px-1 rounded text-center min-w-4 shrink-0 leading-none py-0.5 ${
            isFinished 
              ? isAwayWinner 
                ? 'bg-emerald-950/50 text-emerald-400' 
                : 'bg-zinc-900/60 text-zinc-600' 
              : 'bg-zinc-900/20 text-zinc-500'
          }`}>
            {match.awayScore !== null ? match.awayScore : '-'}
          </span>
        </div>
      </div>
    );
  };

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
        <div className="space-y-6">
          {/* Quick HUD guide for brackets */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md flex flex-col sm:flex-row items-center justify-between gap-3 font-sans text-white">
            <div className="flex items-center gap-2.5">
              <Trophy className="h-5 w-5 text-amber-400 shrink-0" />
              <div>
                <span className="text-xs font-black text-amber-300 block">Fase Eliminatoria - Camino a la Gloria 🏆</span>
                <span className="text-[10.5px] text-slate-400">
                  Visualización oficial simétrica del fixture. Deslizá lateralmente para ver el cuadro completo.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-[10.5px] font-bold text-slate-400 shrink-0">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full inline-block"></span> Finalizado
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 bg-amber-500 rounded-full inline-block animate-pulse"></span> Activo / En Curso
              </span>
            </div>
          </div>

          {/* Symmetrical visual bracket container */}
          <div className="overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent rounded-3xl border border-zinc-800 bg-[#060606] shadow-2xl p-6">
            <div className="min-w-[1950px] flex items-center justify-between gap-4 py-8 relative">
              
              {/* --- LEFT HAND BRANCH --- */}

              {/* Column 1: Groups A-F */}
              <div className="flex flex-col justify-between h-[750px] w-[75px] shrink-0">
                {renderGroupCardMin("Grupo A")}
                {renderGroupCardMin("Grupo B")}
                {renderGroupCardMin("Grupo C")}
                {renderGroupCardMin("Grupo D")}
                {renderGroupCardMin("Grupo E")}
                {renderGroupCardMin("Grupo F")}
              </div>

              {/* Column 2: 16avos - Left (8 Matches) */}
              <div className="flex flex-col justify-between h-[750px] w-[170px] shrink-0">
                {renderBracketMatchCard(knockoutPhases['16avos'][0], "16avos M74", "1E vs 3ABCDF")}
                {renderBracketMatchCard(knockoutPhases['16avos'][1], "16avos M77", "1I vs 3CDFGH")}
                {renderBracketMatchCard(knockoutPhases['16avos'][2], "16avos M73", "2A vs 2B")}
                {renderBracketMatchCard(knockoutPhases['16avos'][3], "16avos M75", "1F vs 2C")}
                {renderBracketMatchCard(knockoutPhases['16avos'][8], "16avos M83", "2K vs 2L")}
                {renderBracketMatchCard(knockoutPhases['16avos'][9], "16avos M84", "1H vs 2J")}
                {renderBracketMatchCard(knockoutPhases['16avos'][10], "16avos M81", "1D vs 3BEFIJ")}
                {renderBracketMatchCard(knockoutPhases['16avos'][11], "16avos M82", "1G vs 3AEHIJ")}
              </div>

              {/* Column 3: 8vos - Left (4 Matches) */}
              <div className="flex flex-col justify-around h-[750px] w-[170px] shrink-0 py-6">
                {renderBracketMatchCard(knockoutPhases['8vos'][0], "8vos M89", "Ganador M74 vs M77")}
                {renderBracketMatchCard(knockoutPhases['8vos'][1], "8vos M90", "Ganador M73 vs M75")}
                {renderBracketMatchCard(knockoutPhases['8vos'][4], "8vos M93", "Ganador M83 vs M84")}
                {renderBracketMatchCard(knockoutPhases['8vos'][5], "8vos M94", "Ganador M81 vs M82")}
              </div>

              {/* Column 4: Cuartos - Left (2 Matches) */}
              <div className="flex flex-col justify-around h-[750px] w-[170px] shrink-0 py-16">
                {renderBracketMatchCard(knockoutPhases['cuartos'][0], "Cuartos M97", "Ganador M89 vs M90")}
                {renderBracketMatchCard(knockoutPhases['cuartos'][2], "Cuartos M98", "Ganador M93 vs M94")}
              </div>

              {/* Column 5: Semis - Left (1 Match) */}
              <div className="flex flex-col justify-center h-[750px] w-[170px] shrink-0">
                {renderBracketMatchCard(knockoutPhases['semis'][0], "Semi M101", "Ganador M97 vs M98")}
              </div>


              {/* --- CENTRAL PORTION (WORLD CHAMPIONS & TROPHY) --- */}

              <div className="flex flex-col justify-center items-center h-[750px] w-[260px] shrink-0 select-none text-center gap-3 relative rounded-2xl z-10">
                {/* Faded Background Image */}
                <div 
                  className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[780px] -z-10 bg-center bg-no-repeat bg-contain pointer-events-none select-none"
                  style={{ 
                    backgroundImage: `url(${finalBgImg})`,
                    opacity: 0.35
                  }}
                />

                {/* Audio Controls Bar */}
                <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5 bg-black/60 border border-zinc-800/80 p-1 rounded-xl shadow-lg">
                  {/* Mute/Unmute Button */}
                  <button 
                    onClick={toggleMute}
                    className="p-1.5 rounded-lg hover:bg-zinc-800/60 text-zinc-400 hover:text-white transition-all cursor-pointer flex items-center justify-center"
                    title={isPlaying ? "Silenciar música 🔊" : "Activar música 🔇"}
                  >
                    {isPlaying ? (
                      <Volume2 className="h-5 w-5 animate-pulse text-yellow-400" />
                    ) : (
                      <VolumeX className="h-5 w-5 text-zinc-500" />
                    )}
                  </button>

                  {/* Skip to Next Button */}
                  <button 
                    onClick={handleNextTrack}
                    className="p-1.5 rounded-lg hover:bg-zinc-800/60 text-zinc-400 hover:text-white transition-all cursor-pointer flex items-center justify-center border-l border-zinc-800/60 pl-2"
                    title="Siguiente canción ⏭️"
                  >
                    <SkipForward className="h-5 w-5 text-zinc-400 hover:text-zinc-200" />
                  </button>
                </div>

                <div className="text-zinc-500 font-mono text-[9px] uppercase font-black tracking-widest">WORLD CHAMPIONS</div>
                
                {/* FIFA Trophy Container with gold radial glow using copaImg */}
                 <div className="relative flex items-center justify-center py-1">
                   <img 
                     src={copaImg} 
                     alt="Copa del Mundo" 
                     className="w-24 h-32 object-contain drop-shadow-[0_0_35px_rgba(251,191,36,0.4)]"
                   />
                   <div className="absolute -inset-4 bg-amber-400/5 rounded-full blur-2xl -z-10 animate-pulse"></div>
                 </div>

                {/* Gran Final Card */}
                <div className="w-full flex justify-center">
                  {renderBracketMatchCard((knockoutPhases['final'] || []).find(m => m.id === 'final_1'), "GRAN FINAL", "Ganador Semifinales")}
                </div>

                <div className="text-zinc-400 font-mono text-[9px] uppercase font-black tracking-widest mt-2">BRONZE WINNER</div>
                
                {/* Tercer Puesto Card */}
                <div className="w-full flex justify-center">
                  {renderBracketMatchCard((knockoutPhases['final'] || []).find(m => m.id === 'final_2' || m.id === 'tercer_1'), "TERCER PUESTO", "Perdedor Semifinales")}
                </div>

                <div className="mt-2 flex flex-col items-center gap-1">
                  <span className="text-[12px] font-black tracking-[0.2em] text-amber-500/80 uppercase font-mono">2026</span>
                  <span className="text-[9px] font-black tracking-widest text-zinc-600 uppercase font-mono">FIFA WORLD CUP</span>
                </div>
              </div>


              {/* --- RIGHT HAND BRANCH --- */}

              {/* Column 7: Semis - Right (1 Match) */}
              <div className="flex flex-col justify-center h-[750px] w-[170px] shrink-0">
                {renderBracketMatchCard(knockoutPhases['semis'][1], "Semi M102", "Ganador M99 vs M100")}
              </div>

              {/* Column 8: Cuartos - Right (2 Matches) */}
              <div className="flex flex-col justify-around h-[750px] w-[170px] shrink-0 py-16">
                {renderBracketMatchCard(knockoutPhases['cuartos'][1], "Cuartos M99", "Ganador M91 vs M92")}
                {renderBracketMatchCard(knockoutPhases['cuartos'][3], "Cuartos M100", "Ganador M95 vs M96")}
              </div>

              {/* Column 9: 8vos - Right (4 Matches) */}
              <div className="flex flex-col justify-around h-[750px] w-[170px] shrink-0 py-6">
                {renderBracketMatchCard(knockoutPhases['8vos'][2], "8vos M91", "Ganador M76 vs M78")}
                {renderBracketMatchCard(knockoutPhases['8vos'][3], "8vos M92", "Ganador M79 vs M80")}
                {renderBracketMatchCard(knockoutPhases['8vos'][6], "8vos M95", "Ganador M86 vs M88")}
                {renderBracketMatchCard(knockoutPhases['8vos'][7], "8vos M96", "Ganador M85 vs M87")}
              </div>

              {/* Column 10: 16avos - Right (8 Matches) */}
              <div className="flex flex-col justify-between h-[750px] w-[170px] shrink-0">
                {renderBracketMatchCard(knockoutPhases['16avos'][4], "16avos M76", "1C vs 2F")}
                {renderBracketMatchCard(knockoutPhases['16avos'][5], "16avos M78", "2E vs 2I")}
                {renderBracketMatchCard(knockoutPhases['16avos'][6], "16avos M79", "1A vs 3CEFHI")}
                {renderBracketMatchCard(knockoutPhases['16avos'][7], "16avos M80", "1L vs 3EHIJK")}
                {renderBracketMatchCard(knockoutPhases['16avos'][12], "16avos M86", "1J vs 2H")}
                {renderBracketMatchCard(knockoutPhases['16avos'][13], "16avos M88", "2D vs 2G")}
                {renderBracketMatchCard(knockoutPhases['16avos'][14], "16avos M85", "1B vs 3EFGIJ")}
                {renderBracketMatchCard(knockoutPhases['16avos'][15], "16avos M87", "1K vs 3DEIJL")}
              </div>

              {/* Column 11: Groups G-L */}
              <div className="flex flex-col justify-between h-[750px] w-[75px] shrink-0">
                {renderGroupCardMin("Grupo G")}
                {renderGroupCardMin("Grupo H")}
                {renderGroupCardMin("Grupo I")}
                {renderGroupCardMin("Grupo J")}
                {renderGroupCardMin("Grupo K")}
                {renderGroupCardMin("Grupo L")}
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
  
  const clean = teamName.replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g, '').replace(/\uDB40[\uDC00-\uDFFF]/g, '').trim();
  const flag = getFlagForCountry(clean);
  const code = getCountryCode(clean);
  return { name: clean, flag, code, isPlaceholder: false };
}

