import React, { useState } from 'react';
import { Calendar, Search, MapPin, Check } from 'lucide-react';
import { SoccerMatch, UserForecast } from '../types';
import { OFFICIAL_WORLD_STAGE_MATCHES, getFlagForCountry, getCountryCode } from '../lib/worldCupData';

interface FixtureCompletoProps {
  matches: SoccerMatch[];
  forecasts: UserForecast[];
}

export const FixtureCompleto: React.FC<FixtureCompletoProps> = ({ matches, forecasts }) => {
  // Simple states for filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [filteredCountry, setFilteredCountry] = useState<string>('all');

  // Extract all unique country names from the official list
  const allCountries = Array.from(
    new Set(OFFICIAL_WORLD_STAGE_MATCHES.flatMap(f => [f.local, f.visitante]))
  ).sort((a, b) => a.localeCompare(b));

  // Extract unique groups (Grupo A to Grupo L)
  const allGroups = Array.from(
    new Set(OFFICIAL_WORLD_STAGE_MATCHES.map(f => f.fase))
  ).sort((a, b) => a.localeCompare(b));

  // Helper function to match the virtual fixture with active matches in our database
  // We compare clean team names (without emojis in DB if they don't have them, or matching substrings)
  const getLiveMatchData = (localName: string, visitanteName: string) => {
    const localLower = localName.toLowerCase().trim();
    const visitanteLower = visitanteName.toLowerCase().trim();

    return matches.find(m => {
      // Clean DB team names from emojis just in case
      const dbHomeClean = m.homeTeam.replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g, '').replace(/\uDB40[\uDC00-\uDFFF]/g, '').toLowerCase().trim();
      const dbAwayClean = m.awayTeam.replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g, '').replace(/\uDB40[\uDC00-\uDFFF]/g, '').toLowerCase().trim();

      return (
        (dbHomeClean.includes(localLower) || localLower.includes(dbHomeClean)) &&
        (dbAwayClean.includes(visitanteLower) || visitanteLower.includes(dbAwayClean))
      );
    });
  };

  // Convert "2026-06-11" + "16:00" to readable Spanish date format
  const formatPrettySpanishDate = (fechaStr: string, horaStr: string) => {
    const d = new Date(`${fechaStr}T${horaStr}:00`);
    return d.toLocaleDateString('es-AR', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) + ' hs';
  };

  // Filter the full fixture reference
  const filteredFixture = OFFICIAL_WORLD_STAGE_MATCHES.filter(f => {
    // 1. Group filter
    if (selectedGroup !== 'all' && f.fase !== selectedGroup) {
      return false;
    }

    // 2. Country filter
    if (filteredCountry !== 'all') {
      if (f.local !== filteredCountry && f.visitante !== filteredCountry) {
        return false;
      }
    }

    // 3. Text search filter
    if (searchTerm.trim() !== '') {
      const s = searchTerm.toLowerCase();
      const matchText = `${f.local} ${f.visitante} ${f.fase} ${f.estadio} partido ${f.nro}`.toLowerCase();
      if (!matchText.includes(s)) {
        return false;
      }
    }

    return true;
  });

  return (
    <div id="fixture-completo" className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="bg-blue-500/20 text-blue-300 font-mono text-[10px] uppercase font-black px-2.5 py-1 rounded-full tracking-wider border border-blue-500/20">
              Mundial Copa FIFA 2026 🇺🇸🇲🇽🇨🇦
            </span>
            <h2 className="text-xl md:text-2xl font-black tracking-tight mt-2.5">
              Fixture Oficial Completo (72 Partidos)
            </h2>
            <p className="text-xs text-slate-300 max-w-xl mt-1">
              Calendario oficial con los 72 encuentros competitivos de la fase de clasificación de grupos. Buscá tus países preferidos, revisá estadios, días y cruzá tus pronósticos creados en tiempo real.
            </p>
          </div>
          <div className="flex bg-slate-900/60 p-3 rounded-2xl border border-slate-800 shrink-0 text-center flex-col justify-center items-center">
            <span className="text-lg font-extrabold text-blue-400 font-mono">72 Partidos</span>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">12 Grupos (A-L)</span>
          </div>
        </div>
      </div>

      {/* Filters HUD */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-4 border border-slate-200 rounded-2xl shadow-sm">
        
        {/* Search Input */}
        <div>
          <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
            Buscar Palabra Clave
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Ej: Estadio Atlanta, México..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border rounded-xl text-xs hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white bg-slate-50 text-slate-800 font-medium"
            />
          </div>
        </div>

        {/* Selected Country */}
        <div>
          <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
            Filtrar por Selección
          </label>
          <select
            value={filteredCountry}
            onChange={(e) => setFilteredCountry(e.target.value)}
            className="w-full px-3 py-2 border rounded-xl text-xs hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white bg-slate-50 text-slate-800 font-medium"
          >
            <option value="all">Todas las selecciones ({allCountries.length} países)</option>
            {allCountries.map(c => (
              <option key={c} value={c}>{c} {getFlagForCountry(c)}</option>
            ))}
          </select>
        </div>

        {/* Selected Group */}
        <div>
          <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
            Filtrar por Grupo Torneo
          </label>
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="w-full px-3 py-2 border rounded-xl text-xs hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white bg-slate-50 text-slate-800 font-medium"
          >
            <option value="all">Todos los 12 Grupos (A-L)</option>
            {allGroups.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

      </div>

      {/* Grid Results of official matches */}
      {filteredFixture.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFixture.map(f => {
            const dbMatch = getLiveMatchData(f.local, f.visitante);
            const userForecast = dbMatch ? forecasts.find(frc => frc.matchId === dbMatch.id) : null;

            return (
              <div 
                key={f.nro}
                className={`bg-white border rounded-2xl p-4 shadow-sm hover:shadow-md transition-all text-left flex flex-col justify-between ${
                  dbMatch?.status === 'finished' 
                    ? 'border-blue-100 bg-blue-50/5' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  {/* Card Title Header with Game Number & Group */}
                  <div className="flex justify-between items-center mb-2.5">
                    <span className="inline-flex items-center text-[10px] uppercase font-black text-blue-900 bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-full font-mono">
                      {f.fase} • Partido {f.nro}
                    </span>
                    {dbMatch ? (
                      <span className="inline-flex items-center text-[10px] uppercase font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full font-mono">
                        Cargaddo en DB 🟢
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-[10px] uppercase font-bold text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-full font-mono">
                        Virtual / Ref 🗓️
                      </span>
                    )}
                  </div>

                  {/* Date & Time */}
                  <div className="text-[11px] font-mono font-medium text-slate-400 flex items-center gap-1 mb-1.5 capitalize">
                    <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>{formatPrettySpanishDate(f.fecha, f.hora)}</span>
                  </div>

                  {/* Stadium Indicator */}
                  <div className="text-[10px] font-mono font-medium text-slate-500 flex items-center gap-1 mb-3">
                    <MapPin className="h-3 w-3 text-red-500 shrink-0" />
                    <span className="truncate">Sede: {f.estadio}</span>
                  </div>

                  {/* Scoreboard layout */}
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-2">
                    {/* Home Team */}
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                      <div className="flex items-center gap-2">
                        <img 
                          src={`/flags/${getCountryCode(f.local)}.svg`} 
                          alt={f.local} 
                          title={f.local}
                          className="w-5 h-5 rounded-full shadow-sm select-none" 
                          referrerPolicy="no-referrer"
                        />
                        <span>{f.local}</span>
                      </div>
                      <span className="font-mono text-xs text-slate-400">Local</span>
                    </div>

                    {/* Score divider line */}
                    <div className="flex items-center justify-center py-1">
                      {dbMatch?.status === 'finished' ? (
                        <div className="bg-emerald-100/60 px-3 py-0.5 rounded-lg text-[10px] font-mono font-black text-emerald-900 flex items-center space-x-1 border border-emerald-200">
                          <span>Resultado:</span>
                          <span>{dbMatch.homeScore} - {dbMatch.awayScore}</span>
                        </div>
                      ) : (
                        <div className="w-full border-t border-slate-200/50 my-1"></div>
                      )}
                    </div>

                    {/* Away Team */}
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                      <div className="flex items-center gap-2">
                        <img 
                          src={`/flags/${getCountryCode(f.visitante)}.svg`} 
                          alt={f.visitante} 
                          title={f.visitante}
                          className="w-5 h-5 rounded-full shadow-sm select-none" 
                          referrerPolicy="no-referrer"
                        />
                        <span>{f.visitante}</span>
                      </div>
                      <span className="font-mono text-xs text-slate-400">Visitante</span>
                    </div>
                  </div>
                </div>

                {/* Forecast / Predictions Status at the bottom */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  {/* Forecast Status */}
                  {userForecast ? (
                    <span className="text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md font-semibold flex items-center gap-1 shrink-0">
                      <Check className="h-3.5 w-3.5" />
                      Tu Pronóstico: {userForecast.homeScore} - {userForecast.awayScore}
                    </span>
                  ) : dbMatch && dbMatch.status === 'pending' ? (
                    <span className="text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md font-medium shrink-0 animate-pulse">
                      ⚠️ Pronosticar en Prode
                    </span>
                  ) : dbMatch && dbMatch.status === 'finished' ? (
                    <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md font-medium shrink-0">
                      Sin predicción
                    </span>
                  ) : (
                    <span className="text-slate-400 leading-normal">
                      Carga disponible al iniciar la ronda
                    </span>
                  )}

                  {/* Points breakdown */}
                  {userForecast && dbMatch?.status === 'finished' && (
                    <span className="font-extrabold text-slate-800 font-mono text-xs">
                      {userForecast.pointsEarned === 3 ? '🔥 +3 Pts' : userForecast.pointsEarned === 1 ? '✅ +1 Pt' : '❌ 0 Pts'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl max-w-xl mx-auto shadow-sm">
          <Calendar className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <h4 className="font-bold text-slate-800 text-base">No se encontraron encuentros</h4>
          <p className="text-xs text-slate-500 mt-1">
            Ninguno de los partidos del fixture oficial de grupos coincide con las selecciones o filtros actuales.
          </p>
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedGroup('all');
              setFilteredCountry('all');
            }}
            className="mt-4 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-all cursor-pointer"
          >
            Limpiar Filtros
          </button>
        </div>
      )}

    </div>
  );
};
