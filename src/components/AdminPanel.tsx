import React, { useState, useEffect } from 'react';
import { 
  PlusCircle, 
  CheckCircle, 
  Award, 
  Calendar, 
  RefreshCcw, 
  ShieldAlert, 
  Sparkles, 
  Users, 
  Trash2, 
  Shield, 
  ShieldOff,
  Download,
  FileCode2,
  ArrowRightLeft
} from 'lucide-react';
import { SoccerMatch, UserProfile, UserForecast } from '../types';
import { dbService } from '../lib/dbService';

interface AdminPanelProps {
  currentUser?: UserProfile;
  matches: SoccerMatch[];
  onAddMatch: (homeTeam: string, awayTeam: string, matchDateISO: string) => Promise<string>;
  onSettleMatch: (matchId: string, homeScore: number, awayScore: number) => Promise<void>;
  onUnsettleMatch: (matchId: string) => Promise<void>;
  prizes: { first: string; second: string; third: string };
  onUpdatePrizes: (newPrizes: { first: string; second: string; third: string }) => void;
  onLoadOfficialFixture?: () => Promise<void>;
  users?: UserProfile[];
  onUpdateUser?: (userId: string, updates: Partial<UserProfile>) => Promise<void>;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  currentUser,
  matches,
  onAddMatch,
  onSettleMatch,
  onUnsettleMatch,
  prizes,
  onUpdatePrizes,
  users = [],
  onUpdateUser
}) => {
  // --- User Management List ---
  const [internalUsers, setInternalUsers] = useState<UserProfile[]>([]);
  
  useEffect(() => {
    if (users && users.length > 0) {
      setInternalUsers(users);
      return;
    }
    const unsub = dbService.subscribeUsers((data) => {
      setInternalUsers(data);
    });
    return () => unsub();
  }, [users]);

  // --- Admin Toggle ---
  const handleToggleAdmin = async (userId: string, currentStatus: boolean, userEmail: string) => {
    if (currentUser && userId === currentUser.uid) return;
    try {
      if (dbService.toggleAdminStatus) {
        await dbService.toggleAdminStatus(userId, !currentStatus, userEmail);
      } else if (onUpdateUser) {
        await onUpdateUser(userId, { isAdmin: !currentStatus });
      } else {
        await dbService.updateUserProfile(userId, { isAdmin: !currentStatus });
      }
    } catch (e) {
      console.error(e);
      alert('Error cambiando estado de admin');
    }
  };

  // --- Delete User ---
  const handleDeleteUser = async (userId: string) => {
    if (currentUser && userId === currentUser.uid) return;
    if (window.confirm('¿Estás seguro de que querés eliminar a este usuario del torneo? Esto borrará su cuenta, pero sus pronósticos podrían quedar huérfanos. ¿Continuar?')) {
      try {
        if (dbService.deleteUser) {
          await dbService.deleteUser(userId);
        } else {
          alert('Función de eliminación no disponible en el servicio de DB');
        }
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
  const [settleSubTab, setSettleSubTab] = useState<'pending' | 'finished' | 'users'>('pending');

  // Bulk JSON Upload states
  const [bulkJson, setBulkJson] = useState('');
  const [bulkStatus, setBulkStatus] = useState<{ type: 'error' | 'success', msg: string } | null>(null);
  const [isBulking, setIsBulking] = useState(false);

  // Match Form creation
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
    const m = matches.find(match => match.id === matchId);
    const defaultHome = m && m.homeScore !== null ? String(m.homeScore) : '';
    const defaultAway = m && m.awayScore !== null ? String(m.awayScore) : '';

    setSettleScores(prev => ({
      ...prev,
      [matchId]: {
        home: defaultHome,
        away: defaultAway,
        ...prev[matchId],
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

  const [unsettlingId, setUnsettlingId] = useState<string | null>(null);

  const handleUnsettleMatchAction = async (matchId: string) => {
    setUnsettlingId(matchId);
    try {
      await onUnsettleMatch(matchId);
    } catch (err) {
      console.error("Error reopening match:", err);
    } finally {
      setUnsettlingId(null);
    }
  };

  const pendingMatches = matches.filter(m => m.status === 'pending');
  const finishedMatches = matches.filter(m => m.status === 'finished');

  // Bulk JSON liquidator actions
  const handleGenerateJsonTemplate = () => {
    const template = pendingMatches.map(m => {
      // Remove flags for clean team names in the template
      const cleanHome = m.homeTeam.replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g, '').trim();
      const cleanAway = m.awayTeam.replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g, '').trim();
      return {
        local: cleanHome,
        visitante: cleanAway,
        golesLocal: 0,
        golesVisitante: 0
      };
    });
    setBulkJson(JSON.stringify(template, null, 2));
    setBulkStatus(null);
  };

  const handleBulkSettle = async () => {
    setBulkStatus(null);
    if (!bulkJson.trim()) {
      setBulkStatus({ type: 'error', msg: 'Ingresá el JSON con los resultados.' });
      return;
    }

    let parsed: any[];
    try {
      parsed = JSON.parse(bulkJson);
      if (!Array.isArray(parsed)) throw new Error('Root is not an array');
    } catch (e) {
      setBulkStatus({ type: 'error', msg: 'Formato JSON inválido. Asegurate de que sea un Array válido.' });
      return;
    }

    setIsBulking(true);
    let successCount = 0;
    let errorCount = 0;

    for (const item of parsed) {
      if (!item.local || !item.visitante || typeof item.golesLocal !== 'number' || typeof item.golesVisitante !== 'number') {
        errorCount++;
        continue;
      }

      // Find match
      const homeSearch = item.local.toLowerCase().trim();
      const awaySearch = item.visitante.toLowerCase().trim();

      const match = pendingMatches.find(m => 
        m.homeTeam.toLowerCase().includes(homeSearch) && 
        m.awayTeam.toLowerCase().includes(awaySearch)
      );

      if (match) {
        try {
          await onSettleMatch(match.id, item.golesLocal, item.golesVisitante);
          successCount++;
        } catch (e) {
          errorCount++;
        }
      } else {
        errorCount++;
      }
    }

    setIsBulking(false);
    if (successCount > 0 && errorCount === 0) {
      setBulkStatus({ type: 'success', msg: `¡Se liquidaron ${successCount} partidos correctamente!` });
      setBulkJson('');
    } else if (successCount > 0 && errorCount > 0) {
      setBulkStatus({ type: 'success', msg: `Se liquidaron ${successCount} partidos. Hubo error o no se encontraron ${errorCount} partidos.` });
    } else {
      setBulkStatus({ type: 'error', msg: `No se pudo liquidar ningún partido. Revisá los nombres de los equipos o si ya estaban liquidados.` });
    }
  };

  // --- MIGRATION TOOLS ---
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const handleExportJson = async () => {
    setIsExporting(true);
    setExportStatus(null);
    try {
      // Gather all data via subscriptions (one-shot)
      const getData = <T>(fn: (cb: (d: T) => void) => (() => void) | void): Promise<T> =>
        new Promise(resolve => {
          const unsub = fn((data) => {
            resolve(data);
            if (typeof unsub === 'function') unsub();
          });
        });

      const [allUsers, allMatches, allForecasts] = await Promise.all([
        getData<UserProfile[]>(cb => dbService.subscribeUsers(cb)),
        getData<SoccerMatch[]>(cb => dbService.subscribeMatches(cb)),
        getData<UserForecast[]>(cb => dbService.subscribeAllForecasts(cb)),
      ]);

      const exportPayload = {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        data: { users: allUsers, matches: allMatches, forecasts: allForecasts }
      };

      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prode_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setExportStatus({ type: 'success', msg: `✅ Backup exportado: ${allUsers.length} usuarios, ${allMatches.length} partidos, ${allForecasts.length} pronósticos.` });
    } catch (err) {
      console.error(err);
      setExportStatus({ type: 'error', msg: '❌ Error exportando. Revisá la consola.' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleGenerateSupabaseSql = () => {
    const sql = `-- =============================================================
-- SUPABASE / POSTGRESQL SCHEMA - Prode BanCo Corrientes
-- Generado automáticamente el ${new Date().toLocaleDateString('es-AR')}
-- Instrucciones:
--   1. Ir a tu proyecto en https://supabase.com
--   2. Abrir SQL Editor y pegar este script completo
--   3. Ejecutar con "Run"
-- =============================================================

-- Habilitar extensión uuid si no está activa
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================
-- TABLA: profiles (Usuarios del torneo)
-- =============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  uid           TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  photo_url     TEXT,
  points        INTEGER NOT NULL DEFAULT 0,
  is_admin      BOOLEAN NOT NULL DEFAULT FALSE,
  is_banned     BOOLEAN NOT NULL DEFAULT FALSE,
  legajo        TEXT,
  gerencia      TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ
);

-- =============================================================
-- TABLA: matches (Fixture de partidos)
-- =============================================================
CREATE TABLE IF NOT EXISTS public.matches (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  home_team     TEXT NOT NULL,
  away_team     TEXT NOT NULL,
  match_date    TIMESTAMPTZ NOT NULL,
  home_score    INTEGER,
  away_score    INTEGER,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'finished')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ
);

-- =============================================================
-- TABLA: forecasts (Pronósticos de usuarios)
-- =============================================================
CREATE TABLE IF NOT EXISTS public.forecasts (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES public.profiles(uid) ON DELETE CASCADE,
  user_name     TEXT NOT NULL,
  user_email    TEXT NOT NULL,
  match_id      TEXT NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  home_score    INTEGER NOT NULL CHECK (home_score >= 0 AND home_score <= 99),
  away_score    INTEGER NOT NULL CHECK (away_score >= 0 AND away_score <= 99),
  points_earned INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ,
  UNIQUE(user_id, match_id)
);

-- =============================================================
-- ÍNDICES para mejorar performance en consultas frecuentes
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_forecasts_user_id  ON public.forecasts(user_id);
CREATE INDEX IF NOT EXISTS idx_forecasts_match_id ON public.forecasts(match_id);
CREATE INDEX IF NOT EXISTS idx_matches_date       ON public.matches(match_date);
CREATE INDEX IF NOT EXISTS idx_matches_status     ON public.matches(status);

-- =============================================================
-- TRIGGER: Crear perfil automático cuando el usuario se registra
-- =============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (uid, name, email, photo_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (uid) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================
-- ROW LEVEL SECURITY (RLS) - Equivalente a las reglas de Firestore
-- =============================================================
ALTER TABLE public.profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forecasts ENABLE ROW LEVEL SECURITY;

-- profiles: cualquier usuario logueado puede ver, solo puede editar el suyo
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid()::TEXT = uid)
  WITH CHECK (auth.uid()::TEXT = uid);

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::TEXT = uid);

-- matches: cualquier usuario logueado puede ver; solo admins pueden escribir
CREATE POLICY "matches_select" ON public.matches
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "matches_admin_write" ON public.matches
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE uid = auth.uid()::TEXT AND is_admin = TRUE)
  );

-- forecasts: todos pueden ver; solo el propio usuario puede crear/editar
-- y solamente hasta 5 minutos antes del inicio del partido
CREATE POLICY "forecasts_select" ON public.forecasts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "forecasts_insert_own_before_lock" ON public.forecasts
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid()::TEXT = user_id
    AND EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id
        AND NOW() < m.match_date - INTERVAL '5 minutes'
    )
  );

CREATE POLICY "forecasts_update_own_before_lock" ON public.forecasts
  FOR UPDATE TO authenticated
  USING (auth.uid()::TEXT = user_id)
  WITH CHECK (
    auth.uid()::TEXT = user_id
    AND EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id
        AND NOW() < m.match_date - INTERVAL '5 minutes'
    )
  );

CREATE POLICY "forecasts_delete_own_before_lock" ON public.forecasts
  FOR DELETE TO authenticated
  USING (
    auth.uid()::TEXT = user_id
    AND EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id
        AND NOW() < m.match_date - INTERVAL '5 minutes'
    )
  );

-- Admins pueden actualizar pronósticos para asentar puntos
CREATE POLICY "forecasts_admin_update" ON public.forecasts
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE uid = auth.uid()::TEXT AND is_admin = TRUE)
  );

-- =============================================================
-- FIN DEL SCRIPT
-- Próximos pasos:
--   1. Habilitá Google como proveedor de Auth en Supabase > Authentication > Providers
--   2. Instalá el cliente: npm install @supabase/supabase-js
--   3. Configurá las variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
-- =============================================================
`;

    const blob = new Blob([sql], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `supabase_prode_schema_${new Date().toISOString().slice(0, 10)}.sql`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div id="admin-panel" className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left animate-fadeIn">
      
      {/* 1. Left stacked forms block (Add match and podio configurator) */}
      <div className="lg:col-span-1 space-y-6">
        
        {/* ADD MATCH MODULE */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm h-fit">
          <h3 className="text-base font-bold text-blue-900 mb-1 flex items-center gap-1.5 font-sans">
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

        {/* PRIZES CONFIGURATION MODULE */}
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

      {/* 2. Middle column: Real scores settling tabs, reabrir finished, and employee legajo edits */}
      <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <h3 className="text-base font-bold text-blue-900 mb-1 flex items-center gap-1.5 font-sans">
          <Award className="h-5 w-5 text-blue-700 shrink-0" />
          <span>
            {settleSubTab === 'pending' && 'Resultados Reales & Liquidación'}
            {settleSubTab === 'finished' && 'Resultados Reales & Corrección'}
            {settleSubTab === 'users' && 'Auditoría de Personal y Control de Accesos'}
          </span>
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          {settleSubTab === 'pending' && 'Ingresá los marcadores de partidos que finalizaron para calcular y acreditar los puntos.'}
          {settleSubTab === 'finished' && 'Corregí los goles de cualquier partido cerrado. Los puntos se recalcularán automáticamente.'}
          {settleSubTab === 'users' && 'Audita Legajos y Gerencias de colaboradores de Banco de Corrientes o suspende accesos.'}
        </p>

        {/* Sub-Tabs selector */}
        <div className="flex flex-wrap border-b border-slate-100 mb-5 gap-y-2">
          <button
            type="button"
            onClick={() => setSettleSubTab('pending')}
            className={`pb-2.5 px-3 font-bold text-xs transition-all border-b-2 flex items-center gap-2 cursor-pointer select-none ${
              settleSubTab === 'pending'
                ? 'border-blue-700 text-blue-800'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <span>Pendientes ({pendingMatches.length})</span>
          </button>
          
          <button
            type="button"
            onClick={() => setSettleSubTab('finished')}
            className={`pb-2.5 px-3 font-bold text-xs transition-all border-b-2 flex items-center gap-2 cursor-pointer select-none ${
              settleSubTab === 'finished'
                ? 'border-blue-700 text-blue-800'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <span>Finalizados ({finishedMatches.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSettleSubTab('users')}
            className={`pb-2.5 px-3 font-bold text-xs transition-all border-b-2 flex items-center gap-2 cursor-pointer select-none ${
              settleSubTab === 'users'
                ? 'border-blue-700 text-blue-800'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <span>Audit Legajos y Suspensiones ({internalUsers.length}) 🚫</span>
          </button>
        </div>

        {/* Tab content 1: Pending Matches */}
        {settleSubTab === 'pending' && (
          pendingMatches.length > 0 ? (
            <div className="space-y-4">
              {pendingMatches.map(match => {
                const score = settleScores[match.id] || { home: '', away: '' };
                const isPastKickoff = Date.now() >= new Date(match.matchDate).getTime();

                return (
                  <div 
                    key={match.id} 
                    className={`border rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                      isPastKickoff ? 'bg-amber-50/45 border-amber-200' : 'bg-slate-50/50 border-slate-100'
                    }`}
                  >
                    {/* Match team descriptions */}
                    <div className="flex-1 text-left">
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
                          placeholder="Local"
                          value={score.home}
                          onChange={(e) => handleSettleScoreChange(match.id, 'home', e.target.value)}
                          className="w-12 h-9 border border-slate-200 text-center text-sm font-extrabold bg-white text-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono shadow-sm"
                        />
                        <span className="text-slate-400 font-bold">:</span>
                        <input
                          type="text"
                          pattern="[0-9]*"
                          placeholder="Visita"
                          value={score.away}
                          onChange={(e) => handleSettleScoreChange(match.id, 'away', e.target.value)}
                          className="w-12 h-9 border border-slate-200 text-center text-sm font-extrabold bg-white text-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono shadow-sm"
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
                            <Sparkles className="h-3.5 w-3.5 text-yellow-400" />
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
              <CheckCircle className="h-8 w-8 text-slate-350 mx-auto mb-2" />
              <h4 className="font-semibold text-slate-700 text-xs text-center">No hay partidos pendientes</h4>
              <p className="text-xs text-slate-400 text-center">Excelente. Todos los partidos agendados han sido liquidados.</p>
            </div>
          )
        )}

        {/* Tab content 2: Finished / Closed Matches */}
        {settleSubTab === 'finished' && (
          finishedMatches.length > 0 ? (
            <div className="space-y-4">
              <p className="text-[11px] text-slate-650 bg-slate-50 p-3 rounded-xl border border-slate-100 text-slate-600 mb-2 leading-relaxed">
                ¿Hubo un error de carga? Modificá los goles directamente en los casilleros de abajo y guardá con <strong>Guardar Corrección</strong> para recalcular automáticamente los puntajes, o hacé clic en <strong>Reabrir Partido</strong> para dejarlo pendiente.
              </p>

              <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-1">
                {finishedMatches.map(match => {
                  const isReopening = unsettlingId === match.id;
                  const isSettling = settlingId === match.id;
                  const score = settleScores[match.id] || { 
                    home: match.homeScore !== null ? String(match.homeScore) : '', 
                    away: match.awayScore !== null ? String(match.awayScore) : '' 
                  };

                  const hasChanges = (score.home !== '' && score.away !== '') && 
                    (Number(score.home) !== match.homeScore || Number(score.away) !== match.awayScore);

                  return (
                    <div 
                      key={match.id} 
                      className="border border-slate-150 bg-slate-50/30 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all"
                    >
                      {/* Match team descriptions */}
                      <div className="flex-1 text-left">
                        <div className="flex items-center space-x-2">
                          <span className="font-extrabold text-slate-800">{match.homeTeam}</span>
                          <span className="text-xs text-slate-400 font-bold">vs</span>
                          <span className="font-extrabold text-slate-800">{match.awayTeam}</span>
                        </div>

                        <div className="flex items-center space-x-2 mt-1.5 text-xs text-slate-500 font-mono">
                          <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <span>{new Date(match.matchDate).toLocaleDateString('es-AR')}</span>
                          <span className="bg-emerald-50 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-100">
                            Marcador: {match.homeScore} - {match.awayScore}
                          </span>
                        </div>
                      </div>

                      {/* Settle Score box edit */}
                      <div className="flex items-center space-x-3.5 self-end md:self-center">
                        <div className="flex items-center space-x-1.5">
                          <input
                            type="text"
                            pattern="[0-9]*"
                            placeholder="Local"
                            value={score.home}
                            onChange={(e) => handleSettleScoreChange(match.id, 'home', e.target.value)}
                            className="w-12 h-9 border border-slate-250 text-center text-sm font-extrabold bg-white text-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono shadow-sm"
                          />
                          <span className="text-slate-400 font-bold">:</span>
                          <input
                            type="text"
                            pattern="[0-9]*"
                            placeholder="Visita"
                            value={score.away}
                            onChange={(e) => handleSettleScoreChange(match.id, 'away', e.target.value)}
                            className="w-12 h-9 border border-slate-250 text-center text-sm font-extrabold bg-white text-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono shadow-sm"
                          />
                        </div>

                        <div className="flex items-center space-x-2">
                          {hasChanges && (
                            <button
                              onClick={() => handleSettleMatchAction(match.id)}
                              disabled={isSettling}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-3 py-2.5 rounded-lg text-xs leading-none transition-all flex items-center space-x-1 shadow-sm cursor-pointer select-none"
                            >
                              {isSettling ? (
                                <RefreshCcw className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                              <span>Guardar</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleUnsettleMatchAction(match.id)}
                            disabled={isReopening}
                            className="px-3 py-2.5 text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-250 rounded-lg font-bold text-xs leading-none flex items-center gap-1 cursor-pointer disabled:opacity-50 select-none transition-all"
                            title="Volver a poner el partido en estado Pendiente (Borra el marcador y descuenta puntos)"
                          >
                            <RefreshCcw className={`h-3 w-3.5 ${isReopening ? 'animate-spin' : ''}`} />
                            <span>Reabrir</span>
                          </button>
                        </div>
                      </div>

                      {settleErr[match.id] && (
                        <div className="w-full text-left text-xs text-rose-500 font-medium mt-1">
                          {settleErr[match.id]}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-50 border border-slate-100 rounded-xl">
              <Calendar className="h-8 w-8 text-slate-350 mx-auto mb-2" />
              <h4 className="font-semibold text-slate-700 text-xs">No hay partidos cerrados</h4>
              <p className="text-xs text-slate-400">Una vez que pongas marcador a un partido, aparecerá en esta lista para que puedas corregirlo cuando quieras.</p>
            </div>
          )
        )}

        {/* Tab content 3: User list, files (Legajos), gerencias, and ban actions */}
        {settleSubTab === 'users' && (
          <div className="space-y-4">
            <div className="bg-slate-100 border border-slate-200 p-4 rounded-2xl text-xs text-slate-600 leading-relaxed space-y-1.5 mb-2 text-left">
              <span className="font-extrabold text-blue-900 block">🛡️ Panel de Control del Personal Autorizado</span>
              <p>
                Como Administrador Oficial del Prode de <strong>Banco de Corrientes</strong>, tenés el poder de auditar los números de Legajo y Gerencia cargados por los usuarios, corregirlos directamente si se equivocaron, o suspender/banear perfiles de manera temporal o definitiva.
              </p>
            </div>

            {internalUsers.length > 0 ? (
              <div className="border border-slate-100 rounded-2xl overflow-hidden divide-y divide-slate-100 bg-white shadow-sm">
                {internalUsers.map(u => {
                  const isBanned = u.isBanned || false;
                  return (
                    <div 
                      key={u.uid} 
                      className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                        isBanned ? 'bg-rose-50/40 text-rose-950' : 'hover:bg-slate-50/30'
                      }`}
                    >
                      {/* Left: User Details */}
                      <div className="flex items-center space-x-3.5 flex-1 min-w-0 text-left">
                        {u.photoURL ? (
                          <img 
                            src={u.photoURL} 
                            alt={u.name} 
                            className="h-10 w-10 rounded-xl border border-slate-200"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className={`h-10 w-10 text-xs font-black rounded-xl flex items-center justify-center border text-white ${
                            isBanned ? 'bg-rose-600 border-rose-300' : 'bg-blue-600 border-blue-300'
                          }`}>
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-extrabold text-xs text-slate-800 truncate">{u.name}</span>
                            {u.isAdmin && (
                              <span className="bg-yellow-101 text-yellow-800 bg-yellow-100 text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                                Admin
                              </span>
                            )}
                            {isBanned && (
                              <span className="bg-red-100 text-red-800 text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider animate-pulse">
                                Suspendido 🚫
                              </span>
                            )}
                          </div>
                          <p className="text-[10.5px] font-mono text-slate-400 truncate">{u.email}</p>
                          
                          {/* File info (Legajo/Gerencia) badges or editable inputs */}
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <span className="text-[10px] font-sans text-slate-500">Ficha:</span>
                            <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-slate-200/60">
                              Legajo: {u.legajo ? `#${u.legajo}` : 'SIN CARGAR ⚠️'}
                            </span>
                            <span className="bg-slate-100 text-slate-700 text-[10px] font-medium px-2 py-0.5 rounded-md border border-slate-200/60">
                              Gerencia: {u.gerencia || 'SIN SECTOR ⚠️'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Direct Edit + Banning Controls */}
                      <div className="flex flex-wrap items-center justify-end gap-3 self-end md:self-center shrink-0">
                        {/* Compact inline update fields */}
                        <div className="flex items-center space-x-2">
                          <div className="text-left">
                            <span className="block text-[8px] font-black text-slate-400 uppercase mb-0.5 pl-1">Legajo</span>
                            <input 
                              type="text"
                              placeholder="Faltante"
                              defaultValue={u.legajo || ''}
                              onBlur={async (e) => {
                                const v = e.target.value.trim();
                                if (u.legajo !== v) {
                                  if (onUpdateUser) {
                                    await onUpdateUser(u.uid, { legajo: v || undefined });
                                  } else {
                                    await dbService.updateUserProfile(u.uid, { legajo: v || undefined });
                                  }
                                }
                              }}
                              className="px-2.5 py-1 text-[10.5px] border border-slate-200 rounded-lg w-20 focus:outline-none bg-slate-50 text-slate-700 font-semibold focus:bg-white"
                              title="Editar legajo"
                            />
                          </div>
                          <div className="text-left">
                            <span className="block text-[8px] font-black text-slate-400 uppercase mb-0.5 pl-1">Gerencia</span>
                            <input 
                              type="text"
                              placeholder="Faltante"
                              defaultValue={u.gerencia || ''}
                              onBlur={async (e) => {
                                const v = e.target.value.trim();
                                if (u.gerencia !== v) {
                                  if (onUpdateUser) {
                                    await onUpdateUser(u.uid, { gerencia: v || undefined });
                                  } else {
                                    await dbService.updateUserProfile(u.uid, { gerencia: v || undefined });
                                  }
                                }
                              }}
                              className="px-2.5 py-1 text-[10.5px] border border-slate-200 rounded-lg w-28 focus:outline-none bg-slate-50 text-slate-700 font-semibold focus:bg-white"
                              title="Editar sector/gerencia"
                            />
                          </div>
                        </div>

                        {/* Ban trigger button */}
                        <div className="self-end">
                          <button
                            type="button"
                            onClick={async () => {
                              const confirmAction = window.confirm(
                                isBanned 
                                  ? `¿Habilitar nuevamente al colaborador ${u.name}?`
                                  : `¿Suspender temporalmente al colaborador ${u.name}? No podrá realizar pronósticos.`
                              );
                              if (confirmAction) {
                                if (onUpdateUser) {
                                  await onUpdateUser(u.uid, { isBanned: !isBanned });
                                } else {
                                  await dbService.updateUserProfile(u.uid, { isBanned: !isBanned });
                                }
                              }
                            }}
                            className={`px-3 py-1.5 font-bold text-xs rounded-lg transition-all cursor-pointer select-none border ${
                              isBanned 
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100' 
                                : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100/80'
                            }`}
                          >
                            {isBanned ? 'Habilitar Cuenta ✅' : 'Suspender Acceso 🚫'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 border border-slate-100 rounded-xl">
                <ShieldAlert className="h-8 w-8 text-slate-350 mx-auto mb-2" />
                <h4 className="font-semibold text-slate-700 text-xs text-center">No hay usuarios registrados</h4>
                <p className="text-xs text-slate-400 text-center font-sans">Una vez que tus compañeros de área inicien sesión, figurarán listados en este panel.</p>
              </div>
            )}
          </div>
        )}

        {/* Bulk Upload JSON Module within the Settle Matches block */}
        {settleSubTab === 'pending' && (
          <div className="mt-8 border-t border-slate-200 pt-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-3">
              <div className="text-left">
                <h4 className="text-sm font-bold text-slate-800">Carga Masiva de Resultados (JSON)</h4>
                <p className="text-[11px] text-slate-500">
                  Ideal si tenés muchos partidos que finalizar a la vez.{' '}
                  <button onClick={handleGenerateJsonTemplate} className="text-blue-600 hover:underline font-bold cursor-pointer">
                    Generar plantilla base de partidos pendientes
                  </button>.
                </p>
              </div>
              
              <button
                onClick={handleBulkSettle}
                disabled={isBulking}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-extrabold px-4 py-2 rounded-lg text-xs transition-all flex items-center space-x-1.5 shadow-sm cursor-pointer whitespace-nowrap"
              >
                {isBulking ? (
                  <>
                    <RefreshCcw className="h-3.5 w-3.5 animate-spin" />
                    <span>Procesando...</span>
                  </>
                ) : (
                  <>
                    <Award className="h-3.5 w-3.5 shrink-0" />
                    <span>Liquidar Masivamente</span>
                  </>
                )}
              </button>
            </div>

            <textarea
              value={bulkJson}
              onChange={(e) => setBulkJson(e.target.value)}
              placeholder={'[\n  { "local": "Argentina", "visitante": "Francia", "golesLocal": 2, "golesVisitante": 0 }\n]'}
              className="w-full h-32 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all resize-y"
              spellCheck="false"
            />

            {bulkStatus && (
              <div className={`mt-2 text-xs font-bold p-2.5 rounded-lg border text-left ${
                bulkStatus.type === 'success' 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-rose-50 text-rose-600 border-rose-200'
              }`}>
                {bulkStatus.msg}
              </div>
            )}
          </div>
        )}

      </div>

      {/* 4. User Management Module (Full Width Bottom block - col-span-3) */}
      <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm mt-3">
        <h3 className="text-base font-bold text-blue-900 mb-1 flex items-center gap-1.5 font-sans">
          <Users className="h-5 w-5 text-blue-700 shrink-0" />
          <span>Gestión de Usuarios Competidores</span>
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Administrá quiénes participan del torneo, otorgá permisos de administrador o eliminá perfiles si ya no pertenecen a la empresa.
        </p>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-extrabold font-sans">
              <tr>
                <th className="px-4 py-3 rounded-l-lg">Competidor</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3 text-center">Rol Actual</th>
                <th className="px-4 py-3 text-center">Puntos</th>
                <th className="px-4 py-3 rounded-r-lg text-right">Acciones (Peligro)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {internalUsers.map(u => {
                const isMe = currentUser && u.uid === currentUser.uid;
                const displayName = u.name || 'NN';
                return (
                  <tr key={u.uid} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-800 text-left">
                      <div className="flex items-center gap-2">
                        {u.photoURL ? (
                          <img src={u.photoURL} alt={displayName} className="w-6 h-6 rounded-full" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] text-blue-700 font-bold uppercase">
                            {displayName.substring(0, 2)}
                          </div>
                        )}
                        <span>{displayName}</span>
                        {isMe && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 rounded uppercase font-bold ml-1.5">Vos</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs text-left">{u.email}</td>
                    <td className="px-4 py-3 text-center">
                      {u.isAdmin ? (
                        <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          <Shield className="w-3 h-3 text-amber-600" /> Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-slate-505 text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          Jugador
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center font-mono font-bold text-slate-700">{u.points || 0}</td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={() => handleToggleAdmin(u.uid, !!u.isAdmin, u.email)}
                        disabled={!!isMe}
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
                        disabled={!!isMe}
                        className={`inline-flex items-center justify-center p-1.5 rounded-lg transition-colors border ${
                          isMe 
                            ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed' 
                            : 'bg-rose-50 text-rose-600 border-rose-250 hover:bg-rose-100'
                        }`}
                        title="Eliminar usuario"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {internalUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-4 text-xs text-slate-500">No se encontraron usuarios.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Migration Tools Module (Full Width Bottom block) */}
      <div className="lg:col-span-3 bg-gradient-to-br from-slate-900 to-blue-950 border border-slate-700 rounded-2xl p-6 shadow-lg mt-3">
        <div className="flex items-center gap-2 mb-1">
          <ArrowRightLeft className="h-5 w-5 text-yellow-400" />
          <h3 className="text-base font-bold text-white font-sans">Herramientas de Migración de Base de Datos</h3>
        </div>
        <p className="text-xs text-slate-400 mb-5 max-w-2xl">
          Exportá una copia completa de todos los datos del sistema (usuarios, partidos y pronósticos) en formato JSON, o generá el script SQL necesario para crear la base de datos equivalente en <strong className="text-white">Supabase (PostgreSQL)</strong> y migrar sin perder información.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Card 1: Export Firebase JSON */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-5 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <div className="bg-blue-500/20 border border-blue-400/20 rounded-lg p-2 shrink-0">
                <Download className="h-5 w-5 text-blue-300" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Exportar Base de Datos Completa (JSON)</h4>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  Descarga todos los usuarios, partidos y pronósticos actuales en un archivo <code className="bg-white/10 px-1 rounded text-blue-200">.json</code>. Usalo como backup o para migrar los datos a Supabase.
                </p>
              </div>
            </div>
            <button
              id="btn-export-firebase-json"
              onClick={handleExportJson}
              disabled={isExporting}
              className="mt-auto w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 text-white font-bold py-2.5 px-4 rounded-lg text-xs transition-all cursor-pointer"
            >
              {isExporting ? (
                <><RefreshCcw className="h-3.5 w-3.5 animate-spin" /><span>Exportando datos...</span></>
              ) : (
                <><Download className="h-3.5 w-3.5" /><span>Descargar Backup JSON</span></>
              )}
            </button>
            {exportStatus && (
              <div className={`text-xs font-medium p-2.5 rounded-lg border text-left ${
                exportStatus.type === 'success'
                  ? 'bg-emerald-900/40 text-emerald-300 border-emerald-700/50'
                  : 'bg-rose-900/40 text-rose-300 border-rose-700/50'
              }`}>
                {exportStatus.msg}
              </div>
            )}
          </div>

          {/* Card 2: Generate Supabase SQL */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-5 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <div className="bg-emerald-500/20 border border-emerald-400/20 rounded-lg p-2 shrink-0">
                <FileCode2 className="h-5 w-5 text-emerald-300" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Generar Script SQL para Supabase</h4>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  Descarga el script <code className="bg-white/10 px-1 rounded text-emerald-200">.sql</code> completo para crear las tablas, índices, disparadores y políticas de seguridad (RLS) equivalentes a las de Firebase en tu proyecto de Supabase.
                </p>
              </div>
            </div>
            <button
              id="btn-generate-supabase-sql"
              onClick={handleGenerateSupabaseSql}
              className="mt-auto w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 rounded-lg text-xs transition-all cursor-pointer"
            >
              <FileCode2 className="h-3.5 w-3.5" />
              <span>Descargar Script SQL (Supabase)</span>
            </button>
            <div className="text-[10px] text-slate-500 leading-relaxed">
              <span className="font-bold text-slate-400">Pasos:</span> Crear proyecto en supabase.com → SQL Editor → Pegar y ejecutar el script → Habilitar Auth con Google → Instalar <code className="bg-white/10 px-0.5 rounded">@supabase/supabase-js</code>.
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};
