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
  Copy,
  FileJson,
  AlertTriangle,
  UploadCloud
} from 'lucide-react';
import { SoccerMatch, UserProfile } from '../types';
import { dbService } from '../lib/dbService';
import { OFFICIAL_WORLD_STAGE_MATCHES, getFlagForCountry, getCountryCode } from '../lib/worldCupData';

// Helper to extract clean name and its robust flag
const getTeamNameAndFlag = (teamNameWithMaybeFlag: string) => {
  const cleanName = teamNameWithMaybeFlag
    .replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g, '')
    .replace(/\uDB40[\uDC00-\uDFFF]/g, '')
    .trim();
  const flag = getFlagForCountry(cleanName);
  const code = getCountryCode(cleanName);
  return { name: cleanName, flag, code };
};

interface AdminPanelProps {
  currentUser?: UserProfile;
  matches: SoccerMatch[];
  onAddMatch: (homeTeam: string, awayTeam: string, matchDateISO: string) => Promise<string>;
  onSettleMatch: (matchId: string, homeScore: number, awayScore: number) => Promise<void>;
  onUnsettleMatch: (matchId: string) => Promise<void>;
  prizes: { first: string; second: string; third: string };
  onUpdatePrizes: (newPrizes: { first: string; second: string; third: string }) => void;
  onLoadOfficialFixture?: () => Promise<void>;
  onGenerateKnockout?: (mode: 'dynamic' | 'placeholder') => Promise<{ success: boolean; count: number; message: string }>;
  users?: UserProfile[];
  onUpdateUser?: (userId: string, updates: Partial<UserProfile>) => Promise<void>;
  enabledPhases?: string[];
  onUpdateEnabledPhases?: (phases: string[]) => Promise<void>;
  onClearAllMatchResults?: () => Promise<void>;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  currentUser,
  matches,
  onAddMatch,
  onSettleMatch,
  onUnsettleMatch,
  prizes,
  onUpdatePrizes,
  onLoadOfficialFixture,
  onGenerateKnockout,
  users = [],
  onUpdateUser,
  enabledPhases = ['grupos'],
  onUpdateEnabledPhases,
  onClearAllMatchResults
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

  // Voting phase management states and handlers
  const [updatingPhases, setUpdatingPhases] = useState(false);
  const [phaseSuccess, setPhaseSuccess] = useState(false);

  const phaseSequence = ['grupos', '16avos', '8vos', 'cuartos', 'semis', 'final'];
  const phaseLabels: { [key: string]: string } = {
    grupos: 'Fase de Grupos 1️⃣',
    '16avos': '16avos de Final ⚽',
    '8vos': '8vos de Final 🛡️',
    cuartos: 'Cuartos de Final 🏆',
    semis: 'Semifinales ⭐',
    final: 'Gran Final 🏅'
  };

  const handleEnableNextPhase = async () => {
    if (!onUpdateEnabledPhases) return;
    const nextPhase = phaseSequence.find(p => !enabledPhases.includes(p));
    if (!nextPhase) {
      alert('¡Todas las etapas ya se encuentran habilitadas para votación!');
      return;
    }

    // Guard: prevent enabling a stage if matches have not been generated for it yet
    if (nextPhase !== 'grupos') {
      const hasMatches = matches.some(m => m.phase === nextPhase);
      if (!hasMatches) {
        const proceed = window.confirm(`⚠️ No se han encontrado partidos configurados/generados para la fase "${phaseLabels[nextPhase] || nextPhase}" en el sistema.\n\nNormalmente es aconsejable calcular y generar primero los cruces para evitar que los usuarios visualicen una pestaña vacía.\n\n¿Deseás habilitar la votación para esta fase de todas formas?`);
        if (!proceed) return;
      }
    }

    setUpdatingPhases(true);
    setPhaseSuccess(false);
    try {
      const updated = [...enabledPhases, nextPhase];
      await onUpdateEnabledPhases(updated);
      setPhaseSuccess(true);
      setTimeout(() => setPhaseSuccess(false), 3000);
    } catch (e) {
      console.error(e);
      alert('Error habilitando siguiente fase');
    } finally {
      setUpdatingPhases(false);
    }
  };

  const handleTogglePhase = async (phaseTag: string) => {
    if (!onUpdateEnabledPhases) return;

    // Guard: prevent enabling a stage if matches have not been generated for it yet
    if (!enabledPhases.includes(phaseTag) && phaseTag !== 'grupos') {
      const hasMatches = matches.some(m => m.phase === phaseTag);
      if (!hasMatches) {
        const proceed = window.confirm(`⚠️ No se han encontrado partidos configurados/generados para la fase "${phaseLabels[phaseTag] || phaseTag}" en el sistema.\n\nNormalmente es mejor generar las llaves primero para evitar que los usuarios visualicen un panel vacío o roto.\n\n¿Deseás habilitar la votación para esta fase de todas formas?`);
        if (!proceed) return;
      }
    }

    setUpdatingPhases(true);
    setPhaseSuccess(false);
    try {
      let updated: string[];
      if (enabledPhases.includes(phaseTag)) {
        updated = enabledPhases.filter(p => p !== phaseTag);
      } else {
        updated = [...enabledPhases, phaseTag];
      }
      await onUpdateEnabledPhases(updated);
      setPhaseSuccess(true);
      setTimeout(() => setPhaseSuccess(false), 3000);
    } catch (e) {
      console.error(e);
      alert('Error modificando estado de fase');
    } finally {
      setUpdatingPhases(false);
    }
  };

  // Knockout stage generator states
  const [generatingKnockout, setGeneratingKnockout] = useState(false);
  const [knockoutFeedback, setKnockoutFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSavePrizes = () => {
    onUpdatePrizes({
      first: prizeFirst,
      second: prizeSecond,
      third: prizeThird
    });
    setPrizeSuccess(true);
    setTimeout(() => setPrizeSuccess(false), 2500);
  };

  const handleGenerateKnockoutStage = async (mode: 'dynamic' | 'placeholder') => {
    if (!onGenerateKnockout) return;
    setGeneratingKnockout(true);
    setKnockoutFeedback(null);
    try {
      const res = await onGenerateKnockout(mode);
      if (res.success) {
        setKnockoutFeedback({ type: 'success', text: res.message });
      } else {
        setKnockoutFeedback({ type: 'error', text: res.message });
      }
    } catch (e: any) {
      console.error(e);
      setKnockoutFeedback({ type: 'error', text: 'Ocurrió un error inesperado al procesar las llaves.' });
    } finally {
      setGeneratingKnockout(false);
    }
  };

  // Score inputs for settling matches
  const [settleScores, setSettleScores] = useState<{ [matchId: string]: { home: string; away: string } }>({});
  const [settlingId, setSettlingId] = useState<string | null>(null);
  const [settleErr, setSettleErr] = useState<{ [matchId: string]: string }>({});
  const [settleSubTab, setSettleSubTab] = useState<'pending' | 'finished' | 'users'>('pending');

  // Tournament Reset States
  const [resetStep, setResetStep] = useState(0); // 0 = initial, 1 = first confirmation, 2 = second confirmation
  const [isResetting, setIsResetting] = useState(false);
  const [resetFeedback, setResetFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Clear Match Results States
  const [clearResultsStep, setClearResultsStep] = useState(0); // 0 = initial, 1 = confirm warning
  const [isClearingResults, setIsClearingResults] = useState(false);
  const [clearResultsFeedback, setClearResultsFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const handleClearAllMatchResultsAction = async () => {
    if (!onClearAllMatchResults) return;
    setIsClearingResults(true);
    setClearResultsFeedback(null);
    try {
      await onClearAllMatchResults();
      setClearResultsFeedback({ type: 'success', msg: '¡Todos los resultados reales han sido eliminados de manera segura! Todos los partidos volvieron a estado pendiente y se recalcularon los puntos de los usuarios a 0. Los pronósticos se mantuvieron intactos.' });
      setClearResultsStep(0);
    } catch (err: any) {
      console.error(err);
      setClearResultsFeedback({ type: 'error', msg: `Error al eliminar los resultados reales: ${err.message || err}` });
    } finally {
      setIsClearingResults(false);
    }
  };

  // Custom JSON Upload States
  const [customJsonText, setCustomJsonText] = useState('');
  const [isUploadingJson, setIsUploadingJson] = useState(false);
  const [jsonUploadFeedback, setJsonUploadFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Corrective JSON Upload for Match Dates/Schedules
  const [correctiveJsonText, setCorrectiveJsonText] = useState('');
  const [isUpdatingDates, setIsUpdatingDates] = useState(false);
  const [correctiveFeedback, setCorrectiveFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const handleResetTournament = async () => {
    setIsResetting(true);
    setResetFeedback(null);
    try {
      await dbService.resetTournament();
      setResetFeedback({ type: 'success', msg: '¡El torneo ha sido reiniciado por completo! Se eliminaron los pronósticos, los puntos y las fases finales, conservándose únicamente los encuentros de Fase de Grupos en estado pendiente.' });
      setResetStep(0);
    } catch (err: any) {
      console.error(err);
      setResetFeedback({ type: 'error', msg: `Error al reiniciar el torneo: ${err.message || err}` });
    } finally {
      setIsResetting(false);
    }
  };

  // --- Database Backup & Restoration States and Handlers ---
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupFeedback, setBackupFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [backupImportText, setBackupImportText] = useState('');
  const [backupImportStep, setBackupImportStep] = useState(0); // 0 = initial, 1 = confirm warning before overwriting everything

  const handleExportBackup = async () => {
    setBackupLoading(true);
    setBackupFeedback(null);
    try {
      const data = await dbService.exportBackupData();
      const filename = `prode_banco_resguardo_${new Date().toISOString().slice(0, 10)}.json`;
      downloadJSON(data, filename);
      setBackupFeedback({ type: 'success', msg: '¡Resguardo completo de base de datos generado y descargado con éxito!' });
    } catch (e: any) {
      console.error(e);
      setBackupFeedback({ type: 'error', msg: `Error al exportar datos de resguardo: ${e.message || e}` });
    } finally {
      setBackupLoading(false);
    }
  };

  const handleImportBackup = async (jsonString: string) => {
    if (!jsonString.trim()) {
      setBackupFeedback({ type: 'error', msg: 'Por favor, arrastrá un archivo JSON o pegá el texto para restaurar.' });
      return;
    }
    setBackupLoading(true);
    setBackupFeedback(null);
    try {
      const parsed = JSON.parse(jsonString);
      // Basic duck-typing verification that backup is complete
      if (typeof parsed !== 'object' || (!parsed.matches && !parsed.users && !parsed.forecasts)) {
        throw new Error('El JSON provisto no parece ser una copia de resguardo compatible (faltan colecciones de base de datos).');
      }
      const res = await dbService.importBackupData(parsed);
      if (res.success) {
        setBackupFeedback({ type: 'success', msg: res.message });
        setBackupImportText('');
        setBackupImportStep(0);
      } else {
        setBackupFeedback({ type: 'error', msg: res.message });
      }
    } catch (e: any) {
      console.error(e);
      setBackupFeedback({ type: 'error', msg: `Error importando/restaurando la copia: ${e.message || e}` });
    } finally {
      setBackupLoading(false);
    }
  };

  const handleBackupFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setBackupImportText(text);
      setBackupFeedback(null);
    };
    reader.readAsText(file);
  };


  const handleUploadCustomFixtureJson = async (jsonStringToParse: string) => {
    if (!jsonStringToParse.trim()) {
      setJsonUploadFeedback({ type: 'error', msg: 'La caja de texto JSON está vacía o el archivo no cargó correctamente.' });
      return;
    }

    setIsUploadingJson(true);
    setJsonUploadFeedback(null);

    try {
      let parsed = JSON.parse(jsonStringToParse);
      if (!Array.isArray(parsed)) {
        throw new Error('El JSON debe ser un Array (arreglo) de objetos correspondientes a partidos.');
      }

      const preparedMatches = [];
      for (let i = 0; i < parsed.length; i++) {
        const m = parsed[i];
        
        const home = m.homeTeam || m.local;
        const away = m.awayTeam || m.visitante;
        const dateStr = m.matchDate || m.date || m.fecha;

        if (!home || !away) {
          throw new Error(`En el partido en índice ${i} no se encontró el campo del equipo local ("homeTeam" o "local") o del equipo visitante ("awayTeam" o "visitante").`);
        }
        if (!dateStr) {
          throw new Error(`El partido en índice ${i} ("${home} vs ${away}") no especifica ninguna fecha de inicio.`);
        }

        let homeWithEmoji = home;
        let awayWithEmoji = away;
        
        const hasEmoji = (text: string) => /[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g.test(text);

        if (!hasEmoji(home)) {
          const cleanHome = home.replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g, '').replace(/\uDB40[\uDC00-\uDFFF]/g, '').trim();
          const flag = getFlagForCountry ? getFlagForCountry(cleanHome) : '';
          homeWithEmoji = `${cleanHome} ${flag || '🏳️'}`.trim();
        }

        if (!hasEmoji(away)) {
          const cleanAway = away.replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g, '').replace(/\uDB40[\uDC00-\uDFFF]/g, '').trim();
          const flag = getFlagForCountry ? getFlagForCountry(cleanAway) : '';
          awayWithEmoji = `${cleanAway} ${flag || '🏳️'}`.trim();
        }

        let isoDate: string;
        try {
          if (m.fecha && m.hora) {
            isoDate = new Date(`${m.fecha}T${m.hora}:00`).toISOString();
          } else {
            isoDate = new Date(dateStr).toISOString();
          }
        } catch {
          throw new Error(`La fecha "${dateStr}" del partido "${home} vs ${away}" no posee un formato de fecha ISO válido.`);
        }

        preparedMatches.push({
          id: m.id || m.nro ? `match_custom_${m.id || m.nro}` : `match_custom_${Date.now()}_${i}`,
          homeTeam: homeWithEmoji,
          awayTeam: awayWithEmoji,
          matchDate: isoDate,
          phase: m.phase || m.grupo || m.fase || 'grupos'
        });
      }

      await dbService.loadCustomStageFixture(preparedMatches);
      setJsonUploadFeedback({ type: 'success', msg: `¡Nuevo fixture de grupos cargado con absoluto éxito! Se registraron ${preparedMatches.length} partidos nuevos y se reiniciaron todos los pronósticos y puntos.` });
      setCustomJsonText('');
    } catch (e: any) {
      console.error(e);
      setJsonUploadFeedback({ type: 'error', msg: `Error de procesamiento del JSON: ${e.message || e}` });
    } finally {
      setIsUploadingJson(false);
    }
  };

  const handleJsonFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCustomJsonText(text);
      setJsonUploadFeedback(null);
    };
    reader.readAsText(file);
  };

  const handleCorrectiveJsonFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCorrectiveJsonText(text);
      setCorrectiveFeedback(null);
    };
    reader.readAsText(file);
  };

  const handleUpdateMatchDatesFromJson = async (jsonStringToParse: string) => {
    if (!jsonStringToParse.trim()) {
      setCorrectiveFeedback({ type: 'error', msg: 'La caja de texto JSON está vacía o el archivo no cargó correctamente.' });
      return;
    }

    setIsUpdatingDates(true);
    setCorrectiveFeedback(null);

    try {
      let parsed = JSON.parse(jsonStringToParse);
      if (!Array.isArray(parsed)) {
        throw new Error('El JSON debe ser un Array (arreglo) de objetos correspondientes a partidos.');
      }

      const res = await dbService.updateMatchDatesFromJson(parsed);
      if (res.success) {
        setCorrectiveFeedback({ type: 'success', msg: `¡Horarios corregidos con éxito! ${res.message}` });
        setCorrectiveJsonText('');
      } else {
        setCorrectiveFeedback({ type: 'error', msg: res.message });
      }
    } catch (e: any) {
      console.error(e);
      setCorrectiveFeedback({ type: 'error', msg: `Error de procesamiento del JSON: ${e.message || e}` });
    } finally {
      setIsUpdatingDates(false);
    }
  };

  // Export JSON state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const downloadJSON = (data: any, fileName: string) => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', url);
    downloadAnchor.setAttribute('download', fileName);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    
    // Defer cleanup and revocation to give browser time to start the download
    setTimeout(() => {
      document.body.removeChild(downloadAnchor);
      URL.revokeObjectURL(url);
    }, 1000);
  };

  const downloadCSV = (matchesList: any[], fileName: string) => {
    const headers = ["Número", "Local", "Visitante", "Fecha", "Hora (ARG)"];
    
    const sorted = [...matchesList].sort((a, b) => {
      const parseNum = (idStr: string) => {
        const m = idStr.match(/(\d+)$/);
        return m ? parseInt(m[1], 10) : null;
      };
      const numA = parseNum(a.id);
      const numB = parseNum(b.id);
      if (numA !== null && numB !== null) return numA - numB;
      return (a.matchDate || '').localeCompare(b.matchDate || '');
    });

    const rows = sorted.map((m, idx) => {
      const date = new Date(m.matchDate);
      const dateString = date.toLocaleDateString('es-AR', { year: 'numeric', month: '2-digit', day: '2-digit' });
      const timeString = date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
      
      const cleanHome = m.homeTeam.replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g, '').trim();
      const cleanAway = m.awayTeam.replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g, '').trim();

      return [
        idx + 1,
        `"${cleanHome}"`,
        `"${cleanAway}"`,
        `"${dateString}"`,
        `"${timeString}"`
      ];
    });

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', url);
    downloadAnchor.setAttribute('download', fileName);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    setTimeout(() => {
      document.body.removeChild(downloadAnchor);
      URL.revokeObjectURL(url);
    }, 1000);
  };

  const copyToClipboard = async (data: any, key: string) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
    } catch (err) {
      alert('No se pudo copiar al portapapeles. Te descargamos el archivo automáticamente.');
      downloadJSON(data, `${key}.json`);
    }
  };

  // Replicate exact group standing calculation for audit exports
  const calculateGroupStandings = () => {
    const teamToGroup: Record<string, string> = {};
    OFFICIAL_WORLD_STAGE_MATCHES.forEach(m => {
      teamToGroup[m.local] = m.fase;
      teamToGroup[m.visitante] = m.fase;
    });

    const cleanTeams = Object.keys(teamToGroup);

    const standings: Record<string, { team: string; clean: string; pts: number; gd: number; gf: number; ga: number; gp: number; group: string }> = {};
    
    cleanTeams.forEach(team => {
      standings[team] = {
        team,
        clean: team,
        pts: 0,
        gd: 0,
        gf: 0,
        ga: 0,
        gp: 0,
        group: teamToGroup[team]
      };
    });

    const findCleanName = (name: string): string => {
      if (!name) return "";
      const removed = name.replace(/[^\p{L}\s\.\-]/gu, '').replace(/\s+/g, ' ').trim();
      const match = cleanTeams.find(t => t.toLowerCase() === removed.toLowerCase());
      return match || removed;
    };

    const groupMatches = matches.filter(m => (m.phase || 'grupos') === 'grupos');

    groupMatches.forEach(m => {
      if (m.status === 'finished' && m.homeScore !== null && m.homeScore !== undefined && m.awayScore !== null && m.awayScore !== undefined) {
        const hClean = findCleanName(m.homeTeam);
        const aClean = findCleanName(m.awayTeam);

        const hRec = standings[hClean];
        const aRec = standings[aClean];

        if (hRec && aRec) {
          const hs = Number(m.homeScore);
          const as = Number(m.awayScore);

          hRec.gp += 1;
          aRec.gp += 1;
          hRec.gf += hs;
          hRec.ga += as;
          aRec.gf += as;
          aRec.ga += hs;
          hRec.gd = hRec.gf - hRec.ga;
          aRec.gd = aRec.gf - aRec.ga;

          if (hs > as) {
            hRec.pts += 3;
          } else if (as > hs) {
            aRec.pts += 3;
          } else {
            hRec.pts += 1;
            aRec.pts += 1;
          }
        }
      }
    });

    const groupsMap: Record<string, typeof standings[string][]> = {};
    Object.values(standings).forEach(rec => {
      if (!groupsMap[rec.group]) {
        groupsMap[rec.group] = [];
      }
      groupsMap[rec.group].push(rec);
    });

    const groupNamesAlphabetical = [
      "Grupo A", "Grupo B", "Grupo C", "Grupo D", "Grupo E", "Grupo F",
      "Grupo G", "Grupo H", "Grupo I", "Grupo J", "Grupo K", "Grupo L"
    ];

    const finalStandings: Record<string, typeof standings[string][]> = {};

    groupNamesAlphabetical.forEach(gName => {
      const list = (groupsMap[gName] || []).sort((a, b) => {
        if (b.pts !== a.pts) return b.pts - a.pts;
        if (b.gd !== a.gd) return b.gd - a.gd;
        if (b.gf !== a.gf) return b.gf - a.gf;
        return a.clean.localeCompare(b.clean);
      });
      finalStandings[gName] = list;
    });

    return finalStandings;
  };

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
      const cleanHome = m.homeTeam.replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g, '').replace(/\uDB40[\uDC00-\uDFFF]/g, '').trim();
      const cleanAway = m.awayTeam.replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g, '').replace(/\uDB40[\uDC00-\uDFFF]/g, '').trim();
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

        {/* TOURNAMENT PHASES VOTING ENABLEMENT MODULE */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-extrabold text-blue-950 mb-1 flex items-center gap-1.5 font-sans">
              <Award className="h-4.5 w-4.5 text-blue-700 shrink-0" />
              <span>Habilitar Etapas de Votación 🗳️</span>
            </h3>
            <p className="text-[11.5px] leading-relaxed text-slate-500">
              Controlá qué etapas de cruces están activas para que los empleados puedan emitir y modificar sus pronósticos.
            </p>
          </div>

          <button
            type="button"
            onClick={handleEnableNextPhase}
            disabled={updatingPhases}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
          >
            {updatingPhases ? (
              <RefreshCcw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <span>Habilitar Siguiente Etapa para Votar ➡️</span>
            )}
          </button>

          {phaseSuccess && (
            <p className="text-[10px] text-center font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 p-1.5 rounded-lg animate-pulse">
              ¡Estado de fases actualizado con éxito!
            </p>
          )}

          <div className="space-y-1.5 pt-3 border-t border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Fases del Fixture:
            </span>
            {phaseSequence.map(tag => {
              const isEnabled = enabledPhases.includes(tag);
              return (
                <div 
                  key={tag} 
                  className={`flex items-center justify-between p-2 rounded-xl border text-[11px] transition-colors ${
                    isEnabled 
                      ? 'border-blue-105 bg-blue-50/20 border-blue-200' 
                      : 'border-slate-100 bg-slate-50/50'
                  }`}
                >
                  <span className="font-bold text-slate-700">{phaseLabels[tag]}</span>
                  <button
                    type="button"
                    onClick={() => handleTogglePhase(tag)}
                    disabled={updatingPhases}
                    className={`px-2.5 py-1 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                      isEnabled 
                        ? 'bg-blue-600 text-white hover:bg-blue-700' 
                        : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                    }`}
                  >
                    {isEnabled ? 'Activa ✅' : 'Inactiva 🔒'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* GENERATE KNOCKOUT MODULE */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-extrabold text-blue-950 mb-1 flex items-center gap-1.5 font-sans">
            <Sparkles className="h-4.5 w-4.5 text-blue-700 shrink-0" />
            <span>Preparación: Llaves de Fase Final 🏆</span>
          </h3>
          <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">
            Generá automáticamente los dieciséis partidos de los <strong>16avos de Final</strong> una vez concluida la Fase de Grupos.
          </p>

          <div className="space-y-3">
            <button
              onClick={() => handleGenerateKnockoutStage('dynamic')}
              disabled={generatingKnockout}
              className="w-full bg-slate-900 hover:bg-slate-950 text-white font-extrabold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              {generatingKnockout ? (
                <RefreshCcw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <span>Calcular Clasificados Reales 🇦🇷</span>
              )}
            </button>

            <button
              onClick={() => handleGenerateKnockoutStage('placeholder')}
              disabled={generatingKnockout}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 font-extrabold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              {generatingKnockout ? (
                <RefreshCcw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <span>Crear Plantilla con Posiciones 🏆</span>
              )}
            </button>

            {knockoutFeedback && (
              <div className={`text-[11px] p-3 rounded-xl border font-medium ${
                knockoutFeedback.type === 'success' 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-250' 
                  : 'bg-rose-50 text-rose-800 border-rose-250'
              }`}>
                {knockoutFeedback.text}
              </div>
            )}

            <div className="bg-blue-50/50 rounded-xl p-3 border border-blue-100 text-[10.5px] text-blue-900 leading-relaxed space-y-1">
              <span className="font-extrabold block">🧠 ¿Cómo funciona la carga automática?</span>
              <p>
                <strong>Calcular Clasificados:</strong> Analiza todos tus partidos del Prode, calcula la tabla grupal (Puntos, DG, Goles a Favor) y empareja a los clasificados bajo las reglas oficiales del campeonato.
              </p>
              <p>
                <strong>Crear Plantilla:</strong> Carga marcadores conceptuales (como "1A vs 3C/D/E/F") permitiendo a los usuarios jugar y armar sus predicciones de fase final por adelantado.
              </p>
            </div>
          </div>
        </div>

        {/* EXPORT DATA & AUDIT SYSTEM (JSON) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-extrabold text-blue-950 mb-1 flex items-center gap-1.5 font-sans">
              <FileJson className="h-4.5 w-4.5 text-blue-700 shrink-0" />
              <span>Exportar & Auditar Datos (JSON) 📊</span>
            </h3>
            <p className="text-[11.5px] leading-relaxed text-slate-500">
              Generá, copiá o descargá los archivos de datos en tiempo real de cada etapa. Usá estos reportes para auditar las tablas de clasificación y verificar si los emparejamientos de 16avos de Final se calcularon adecuadamente.
            </p>
          </div>

          <div className="space-y-3.5 pt-1">
            {/* 1. Grupo matches */}
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-sans">
              <div>
                <span className="text-[11.5px] font-bold text-slate-800 block">Partidos: Fase de Grupos</span>
                <span className="text-[10px] text-slate-400">
                  {matches.filter(m => (m.phase || 'grupos') === 'grupos').length} partidos registrados
                </span>
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => copyToClipboard(matches.filter(m => (m.phase || 'grupos') === 'grupos'), 'grupos_partidos')}
                  className="flex items-center gap-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-extrabold py-1.5 px-2.5 rounded-lg text-[10px] transition-all cursor-pointer"
                >
                  <Copy className="h-3 w-3 shrink-0" />
                  {copiedKey === 'grupos_partidos' ? '¡Copiado! ✅' : 'Copiar'}
                </button>
                <button
                  type="button"
                  onClick={() => downloadJSON(matches.filter(m => (m.phase || 'grupos') === 'grupos'), 'fase_de_grupos_partidos.json')}
                  className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-extrabold py-1.5 px-2.5 rounded-lg text-[10px] transition-all cursor-pointer"
                >
                  <Download className="h-3 w-3 shrink-0" />
                  Bajar
                </button>
              </div>
            </div>

            {/* 2. Standings */}
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-sans">
              <div>
                <span className="text-[11.5px] font-bold text-slate-800 block">Posiciones de Grupos Calculadas</span>
                <span className="text-[10px] text-slate-400">
                  Pts, DG, Goles Favor/Contra (12 grupos)
                </span>
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => copyToClipboard(calculateGroupStandings(), 'posiciones_calculadas')}
                  className="flex items-center gap-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-extrabold py-1.5 px-2.5 rounded-lg text-[10px] transition-all cursor-pointer"
                >
                  <Copy className="h-3 w-3 shrink-0" />
                  {copiedKey === 'posiciones_calculadas' ? '¡Copiado! ✅' : 'Copiar'}
                </button>
                <button
                  type="button"
                  onClick={() => downloadJSON(calculateGroupStandings(), 'tablas_de_posiciones_grupos.json')}
                  className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-extrabold py-1.5 px-2.5 rounded-lg text-[10px] transition-all cursor-pointer"
                >
                  <Download className="h-3 w-3 shrink-0" />
                  Bajar
                </button>
              </div>
            </div>

            {/* 3. 16avos matches */}
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-sans">
              <div>
                <span className="text-[11.5px] font-bold text-slate-800 block">Partidos: 16avos de Final</span>
                <span className="text-[10px] text-slate-400">
                  {matches.filter(m => m.phase === '16avos').length} cruces calculados / creados
                </span>
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => copyToClipboard(matches.filter(m => m.phase === '16avos'), '16avos_partidos')}
                  className="flex items-center gap-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-extrabold py-1.5 px-2.5 rounded-lg text-[10px] transition-all cursor-pointer"
                >
                  <Copy className="h-3 w-3 shrink-0" />
                  {copiedKey === '16avos_partidos' ? '¡Copiado! ✅' : 'Copiar'}
                </button>
                <button
                  type="button"
                  onClick={() => downloadJSON(matches.filter(m => m.phase === '16avos'), '16avos_final_partidos.json')}
                  className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-extrabold py-1.5 px-2.5 rounded-lg text-[10px] transition-all cursor-pointer"
                  title="Descargar en formato JSON"
                >
                  <Download className="h-3 w-3 shrink-0" />
                  Bajar JSON
                </button>
                <button
                  type="button"
                  onClick={() => downloadCSV(matches.filter(m => m.phase === '16avos'), '16avos_final_partidos_fechas.csv')}
                  className="flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-extrabold py-1.5 px-2.5 rounded-lg text-[10px] transition-all cursor-pointer"
                  title="Descargar en formato CSV legible por Excel"
                >
                  <Download className="h-3 w-3 shrink-0" />
                  Bajar CSV
                </button>
              </div>
            </div>

            {/* 4. Complete system fixture */}
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-sans">
              <div>
                <span className="text-[11.5px] font-bold text-slate-800 block">Todo el Fixture del Sistema</span>
                <span className="text-[10px] text-slate-400">
                  {matches.length} partidos totales cargados
                </span>
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => copyToClipboard(matches, 'fixture_total')}
                  className="flex items-center gap-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-extrabold py-1.5 px-2.5 rounded-lg text-[10px] transition-all cursor-pointer"
                >
                  <Copy className="h-3 w-3 shrink-0" />
                  {copiedKey === 'fixture_total' ? '¡Copiado! ✅' : 'Copiar'}
                </button>
                <button
                  type="button"
                  onClick={() => downloadJSON(matches, 'fixture_completo_sistema.json')}
                  className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-extrabold py-1.5 px-2.5 rounded-lg text-[10px] transition-all cursor-pointer"
                >
                  <Download className="h-3 w-3 shrink-0" />
                  Bajar
                </button>
              </div>
            </div>

            <div className="p-3 bg-blue-50/60 text-blue-900 border border-blue-100 rounded-xl text-[10px] leading-relaxed space-y-1 font-sans">
              <span className="font-extrabold block text-blue-900">💡 Instrucción de Control de Cruces</span>
              <p>
                Si considerás que los cruces de los 16avos de Final no se armaron de acuerdo a tu previsto, hacé clic en el botón <strong>"Copiar"</strong> de las <strong>Posiciones calculadas</strong>, luego el de <strong>16avos de Final</strong>, y pegalos en la caja de conversación con el asistente de AI de Google Studio. Con eso controlaremos y corregiremos de inmediato cualquier diferencia algorítmica.
              </p>
            </div>
          </div>
        </div>

        {/* TOURNAMENT RESET & CLEANUP PANEL */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm border-rose-200">
          <h3 className="text-sm font-extrabold text-rose-950 mb-1 flex items-center gap-1.5 font-sans">
            <ShieldAlert className="h-4 w-4.5 text-rose-600 shrink-0" />
            <span>Limpieza & Reinicio del Torneo 🧹</span>
          </h3>
          <p className="text-[11px] text-slate-550 leading-relaxed text-slate-500 mb-4 font-sans">
            Eliminá por completo todos los puntos acumulados y los pronósticos de los colaboradores para empezar toda la competencia de vuelta desde cero. Se conservarán los encuentros de Fase de Grupos actuales con sus marcadores vacíos.
          </p>

          <div className="space-y-3">
            {resetStep === 0 ? (
              <button
                type="button"
                id="btn-reset-init"
                onClick={() => setResetStep(1)}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-extrabold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-all shadow-md cursor-pointer select-none"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Reiniciar Todo el Torneo 🔄</span>
              </button>
            ) : resetStep === 1 ? (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 space-y-3 font-sans">
                <p className="text-xs font-bold text-rose-900 flex items-center gap-1.5 text-left">
                  <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                  ¿Estás convencido? Paso 1 de 2
                </p>
                <p className="text-[10.5px] text-rose-800 leading-relaxed text-left">
                  Esta acción eliminará de forma irreversible todos los pronósticos ingresados por los usuarios de Banco de Corrientes y reiniciará sus puntajes a 0.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    id="btn-reset-step2"
                    onClick={() => setResetStep(2)}
                    className="flex-1 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-extrabold py-2 px-3 rounded-lg transition-all cursor-pointer select-none"
                  >
                    Sí, continuar ➡️
                  </button>
                  <button
                    type="button"
                    onClick={() => setResetStep(0)}
                    className="flex-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 text-[11px] font-bold py-2 px-3 rounded-lg transition-all cursor-pointer select-none"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-rose-100 border-2 border-rose-300 rounded-xl p-3.5 space-y-3 font-sans">
                <p className="text-xs font-black text-rose-950 flex items-center gap-1.5 text-left">
                  <AlertTriangle className="h-4 w-4 text-rose-700 animate-pulse shrink-0" />
                  Paso 2 de 2: CONFIRMACIÓN DEFINITIVA
                </p>
                <p className="text-[10.5px] text-rose-950 font-bold leading-relaxed text-left">
                  ⚠️ ESTA OPERACIÓN ES ABSOLUTAMENTE FINAL. ¿Realmente confirmás vaciar toda la competencia de la base de datos para comenzar nuevamente de 0?
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    id="btn-reset-confirm"
                    onClick={handleResetTournament}
                    disabled={isResetting}
                    className="flex-1 bg-rose-700 hover:bg-rose-800 text-white text-[11px] font-black py-2 px-3 rounded-lg transition-all cursor-pointer shadow flex items-center justify-center gap-1.5 select-none"
                  >
                    {isResetting ? (
                      <RefreshCcw className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                    <span>SÍ, REINICIAR DE 0</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setResetStep(0)}
                    disabled={isResetting}
                    className="flex-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 text-[11px] font-bold py-2 px-3 rounded-lg transition-all cursor-pointer select-none"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {resetFeedback && (
              <div className={`text-[11px] p-3 rounded-xl border font-semibold text-left ${
                resetFeedback.type === 'success' 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-250' 
                  : 'bg-rose-50 text-rose-800 border-rose-250'
              }`}>
                {resetFeedback.msg}
              </div>
            )}

            {/* VACIAR RESULTADOS REALES (SIMULADOR) */}
            <div className="border-t border-slate-100 pt-3 mt-3">
              <p className="text-[10px] text-slate-500 leading-relaxed mb-2 font-sans">
                ¿Solo querés re-simular? Vaciá únicamente los marcadores reales y recalculá los puntos a 0. Se conservarán todos los pronósticos y usuarios.
              </p>
              {clearResultsStep === 0 ? (
                <button
                  type="button"
                  id="btn-clear-results-init"
                  onClick={() => setClearResultsStep(1)}
                  className="w-full bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-250 font-extrabold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer select-none"
                >
                  <Trash2 className="h-3.5 w-3.5 text-amber-600" />
                  <span>Vaciar Resultados Reales (Simulador) 🗑️</span>
                </button>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-3 font-sans">
                  <p className="text-xs font-bold text-amber-900 flex items-center gap-1.5 text-left">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                    ¿Confirmás vaciar marcadores reales?
                  </p>
                  <p className="text-[10.5px] text-amber-800 leading-relaxed text-left">
                    Esto borrará el resultado real de todos los partidos jugados y restablecerá sus estados a pendiente. Los puntos de los usuarios volverán a 0, pero sus pronósticos y perfiles quedarán intactos.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      id="btn-clear-results-confirm"
                      onClick={handleClearAllMatchResultsAction}
                      disabled={isClearingResults}
                      className="flex-grow bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-extrabold py-2 px-3 rounded-lg transition-all cursor-pointer shadow flex items-center justify-center gap-1.5 select-none"
                    >
                      {isClearingResults ? (
                        <RefreshCcw className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                      <span>SÍ, VACIAR RESULTADOS</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setClearResultsStep(0)}
                      disabled={isClearingResults}
                      className="flex-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-650 text-[11px] font-bold py-2 px-3 rounded-lg transition-all cursor-pointer select-none"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
              {clearResultsFeedback && (
                <div className={`mt-2 text-[11px] p-3 rounded-xl border font-semibold text-left ${
                  clearResultsFeedback.type === 'success' 
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-250' 
                    : 'bg-rose-50 text-rose-800 border-rose-250'
                }`}>
                  {clearResultsFeedback.msg}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* DATABASE BACKUP & RESTORATION PANEL */}
        <div id="backup-migration-panel" className="bg-white border-2 border-blue-200 rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-extrabold text-blue-950 mb-1 flex items-center gap-1.5 font-sans">
            <Download className="h-4 w-4 text-blue-800 shrink-0" />
            <span>Migración Completa de Base de Datos (JSON) 💾</span>
          </h3>
          <p className="text-[11px] text-slate-500 leading-relaxed mb-4 font-sans text-left">
            Utilizá este panel para transportar o duplicar toda la información del Prode (partidos agendados, predicciones, usuarios registrados y configuraciones) usando archivos JSON independientes o unificados.
          </p>

          <div className="space-y-4">
            {/* Export Section (1 solo boton q me baje todos los json) */}
            <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="text-left">
                <span className="text-xs font-bold text-blue-950 block">1. Descargar copia de seguridad</span>
                <p className="text-[10px] text-slate-500">Unifica y descarga todos los partidos, usuarios, pronósticos y configuraciones en un solo archivo.</p>
              </div>
              <button
                type="button"
                id="btn-export-all-json"
                onClick={handleExportBackup}
                disabled={backupLoading}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-all shadow-md cursor-pointer select-none disabled:opacity-55 shrink-0"
              >
                {backupLoading ? (
                  <RefreshCcw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                <span>Descargar Backup Completo (JSON)</span>
              </button>
            </div>

            {/* Import Section (otra parte donde pueda subir los json para cargar la base de datos) */}
            <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/20">
              <div className="text-left">
                <span className="text-xs font-bold text-slate-800 block">2. Subir JSON para cargar la base de datos (Migración)</span>
                <p className="text-[10px] text-slate-400">Seleccioná o arrastrá el archivo JSON de resguardo descargado anteriormente para restablecer toda la información en este entorno.</p>
              </div>

              {/* File picker container */}
              <div className="border-2 border-dashed border-slate-300 hover:border-blue-400 bg-white p-4 rounded-xl transition-all cursor-pointer relative text-center">
                <input
                  type="file"
                  id="input-file-backup"
                  accept=".json"
                  onChange={handleBackupFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="flex flex-col items-center gap-1 font-sans py-1">
                  <UploadCloud className="h-6 w-6 text-slate-400" />
                  <span className="text-[11px] font-bold text-slate-600">Subir archivo JSON de migración</span>
                  <span className="text-[9px] text-slate-400">Hacé clic o arrastrá tu resguardo aquí</span>
                </div>
              </div>

              {/* Paste or Textarea */}
              <div className="space-y-1 text-left">
                <label className="block text-[9px] font-extrabold text-slate-400 uppercase">
                  O pegá el texto JSON de la copia de resguardo aquí:
                </label>
                <textarea
                  id="textarea-backup-raw"
                  value={backupImportText}
                  onChange={(e) => setBackupImportText(e.target.value)}
                  placeholder='{\n  "version": "1.0",\n  "matches": [...],\n  "forecasts": [...],\n  "users": [...]\n}'
                  rows={4}
                  className="w-full px-3 py-2 bg-white border border-slate-250 rounded-lg text-[10.5px] font-mono leading-normal focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all resize-y"
                />
              </div>

              {backupImportStep === 0 ? (
                <button
                  type="button"
                  id="btn-trigger-restore"
                  onClick={() => {
                    if (!backupImportText.trim()) return;
                    setBackupImportStep(1); // request warning confirmation
                  }}
                  disabled={backupLoading || !backupImportText.trim()}
                  className="w-full bg-slate-800 hover:bg-slate-900 text-white font-extrabold py-2 px-3 rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-all shadow cursor-pointer disabled:opacity-40 select-none"
                >
                  <RefreshCcw className="h-3.5 w-3.5" />
                  <span>Cargar y Restaurar Copia en la Base de Datos</span>
                </button>
              ) : (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 space-y-3 font-sans">
                  <p className="text-xs font-bold text-rose-900 flex items-center gap-1.5 text-left">
                    <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 shadow-sm" />
                    ⚠️ ALERTAS DE MIGRACIÓN: Se reescribirán todos los datos
                  </p>
                  <p className="text-[10px] text-rose-800 leading-relaxed text-left">
                    Al restaurar esta copia de resguardo, <strong>se borrarán permanentemente</strong> todos los partidos, predicciones e inscripciones de usuarios que existan actualmente y serán reemplazados por los del archivo de migración. ¿Confirmás proceder?
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      id="btn-confirm-import"
                      onClick={() => handleImportBackup(backupImportText)}
                      disabled={backupLoading}
                      className="flex-1 bg-rose-700 hover:bg-rose-800 text-white text-[11px] font-extrabold py-2 px-3 rounded-lg transition-all cursor-pointer select-none"
                    >
                      Sí, borrar datos y restaurar copia de migración 🔄
                    </button>
                    <button
                      type="button"
                      onClick={() => setBackupImportStep(0)}
                      className="flex-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 text-[11px] font-bold py-2 px-3 rounded-lg transition-all cursor-pointer select-none"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>

            {backupFeedback && (
              <div id="backup-feedback-message" className={`text-[11px] p-3 rounded-xl border text-left font-medium ${
                backupFeedback.type === 'success' 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-250' 
                  : 'bg-rose-50 text-rose-800 border-rose-250'
              }`}>
                {backupFeedback.msg}
              </div>
            )}
          </div>
        </div>

        {/* UPLOAD CUSTOM stage FIXTURE (JSON BASED) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-extrabold text-blue-950 mb-1 flex items-center gap-1.5 font-sans">
            <FileJson className="h-4.5 w-4.5 text-blue-700 shrink-0" />
            <span>Subir Fixture de Grupos Nuevo 📂</span>
          </h3>
          <p className="text-[11px] text-slate-500 leading-relaxed mb-4 font-sans">
            Importá un calendario de Fase de Grupos personalizado mediante archivos <strong>.json</strong> para dar inicio a otra edición con cruces o equipos totalmente distintos.
          </p>

          <div className="space-y-4">
            {/* Drag & drop or files picker container */}
            <div className="border border-dashed border-slate-300 hover:border-blue-400 bg-slate-50/50 hover:bg-blue-50/10 p-3.5 rounded-xl transition-all cursor-pointer relative text-center">
              <input
                type="file"
                accept=".json"
                onChange={handleJsonFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="flex flex-col items-center gap-1 font-sans">
                <UploadCloud className="h-7 w-7 text-blue-500" />
                <span className="text-xs font-bold text-slate-700">Arrastrá tu archivo .json</span>
                <span className="text-[10px] text-slate-400">o hacé clic para explorar tus carpetas</span>
              </div>
            </div>

            {/* Pasting area style indicator */}
            <div className="space-y-1">
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase text-left">
                O pegá el texto del JSON directamente abajo:
              </label>
              <textarea
                value={customJsonText}
                onChange={(e) => setCustomJsonText(e.target.value)}
                placeholder='[\n  {\n    "homeTeam": "Argentina",\n    "awayTeam": "Paraguay",\n    "matchDate": "2026-06-15T22:00:00Z",\n    "phase": "grupos"\n  }\n]'
                rows={5}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-mono leading-normal focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all resize-y"
              />
            </div>

            {jsonUploadFeedback && (
              <div className={`text-[11px] p-3 rounded-xl border text-left font-medium ${
                jsonUploadFeedback.type === 'success' 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                  : 'bg-rose-50 text-rose-800 border-rose-250'
              }`}>
                {jsonUploadFeedback.msg}
              </div>
            )}

            <button
              type="button"
              id="btn-upload-custom"
              onClick={() => handleUploadCustomFixtureJson(customJsonText)}
              disabled={isUploadingJson || !customJsonText.trim()}
              className="w-full bg-blue-700 hover:bg-blue-800 text-white font-extrabold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-all shadow-md cursor-pointer disabled:opacity-40 select-none"
            >
              {isUploadingJson ? (
                <>
                  <RefreshCcw className="h-3.5 w-3.5 animate-spin" />
                  <span>Procesando e Importando...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-3.5 w-3.5" />
                  <span>Cargar Nuevo Fixture de Grupos</span>
                </>
              )}
            </button>

            {/* Instruction block on format */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-150 text-[9.5px] text-slate-500 leading-relaxed font-sans mt-3 text-left space-y-1">
              <span className="font-extrabold text-slate-700 uppercase tracking-wide block">📋 Formato JSON Esperado:</span>
              <p>Debe ser un array de objetos con los siguientes campos:</p>
              <ul className="list-disc pl-3.5 space-y-0.5">
                <li><code className="bg-slate-200 px-1 rounded font-mono">homeTeam</code> o <code className="bg-slate-200 px-1 rounded font-mono">local</code> (ej: "México" o "México 🇲🇽")</li>
                <li><code className="bg-slate-200 px-1 rounded font-mono">awayTeam</code> o <code className="bg-slate-200 px-1 rounded font-mono">visitante</code> (ej: "Brasil")</li>
                <li><code className="bg-slate-200 px-1 rounded font-mono">matchDate</code>, <code className="bg-slate-200 px-1 rounded font-mono">date</code> o <code className="bg-slate-200 px-1 rounded font-mono">fecha</code> (formato ISO o YYYY-MM-DD HH:MM)</li>
                <li><code className="bg-slate-200 px-1 rounded font-mono">phase</code> o <code className="bg-slate-205 px-1 rounded font-mono">grupo</code> (opcional, ej: "Grupo A", por defecto "grupos")</li>
              </ul>
            </div>
          </div>
        </div>

        {/* CORRECTIVE UPLOAD FOR MATCH DATES (JSON BASED) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-extrabold text-blue-950 mb-1 flex items-center gap-1.5 font-sans">
            <Calendar className="h-4.5 w-4.5 text-blue-700 shrink-0" />
            <span>Corregir Horarios de Partidos (JSON) ⏰</span>
          </h3>
          <p className="text-[11px] text-slate-500 leading-relaxed mb-4 font-sans">
            Actualizá de forma masiva los horarios y fechas de partidos existentes cargando un archivo <strong>.json</strong> o pegando el contenido. Busca coincidencias por ID o nombres de equipos.
          </p>

          <div className="space-y-4">
            {/* Drag & drop or files picker container */}
            <div className="border border-dashed border-slate-300 hover:border-blue-400 bg-slate-50/50 hover:bg-blue-50/10 p-3.5 rounded-xl transition-all cursor-pointer relative text-center">
              <input
                type="file"
                accept=".json"
                onChange={handleCorrectiveJsonFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="flex flex-col items-center gap-1 font-sans">
                <UploadCloud className="h-7 w-7 text-blue-500" />
                <span className="text-xs font-bold text-slate-700">Arrastrá tu archivo .json</span>
                <span className="text-[10px] text-slate-400">o hacé clic para explorar tus carpetas</span>
              </div>
            </div>

            {/* Pasting area style indicator */}
            <div className="space-y-1">
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase text-left">
                O pegá el texto del JSON directamente abajo:
              </label>
              <textarea
                value={correctiveJsonText}
                onChange={(e) => setCorrectiveJsonText(e.target.value)}
                placeholder='[\n  {\n    "id": "16avos_1",\n    "matchDate": "2026-06-29T16:00:00.000Z"\n  }\n]'
                rows={5}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-mono leading-normal focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all resize-y"
              />
            </div>

            {correctiveFeedback && (
              <div className={`text-[11px] p-3 rounded-xl border text-left font-medium ${
                correctiveFeedback.type === 'success' 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                  : 'bg-rose-50 text-rose-800 border-rose-250'
              }`}>
                {correctiveFeedback.msg}
              </div>
            )}

            <button
              type="button"
              onClick={() => handleUpdateMatchDatesFromJson(correctiveJsonText)}
              disabled={isUpdatingDates || !correctiveJsonText.trim()}
              className="w-full bg-blue-700 hover:bg-blue-800 text-white font-extrabold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-all shadow-md cursor-pointer disabled:opacity-40 select-none"
            >
              {isUpdatingDates ? (
                <>
                  <RefreshCcw className="h-3.5 w-3.5 animate-spin" />
                  <span>Actualizando horarios...</span>
                </>
              ) : (
                <>
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Aplicar Corrección de Horarios</span>
                </>
              )}
            </button>

            {/* Instruction block on format */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-150 text-[9.5px] text-slate-500 leading-relaxed font-sans mt-3 text-left space-y-1">
              <span className="font-extrabold text-slate-700 uppercase tracking-wide block">📋 Formato JSON para Corrección:</span>
              <p>Se actualizará el campo de fecha de inicio para cada partido que coincida:</p>
              <ul className="list-disc pl-3.5 space-y-0.5">
                <li>Búsqueda por <code className="bg-slate-200 px-1 rounded font-mono">id</code> (ej: "16avos_3")</li>
                <li>Búsqueda por nombres de equipos: <code className="bg-slate-200 px-1 rounded font-mono">homeTeam</code>/<code className="bg-slate-200 px-1 rounded font-mono">local</code> y <code className="bg-slate-200 px-1 rounded font-mono">awayTeam</code>/<code className="bg-slate-200 px-1 rounded font-mono">visitante</code></li>
                <li>Campo de fecha: <code className="bg-slate-200 px-1 rounded font-mono">matchDate</code> o <code className="bg-slate-200 px-1 rounded font-mono">date</code> o <code className="bg-slate-200 px-1 rounded font-mono">fecha</code> (formato ISO)</li>
              </ul>
            </div>
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
          {settleSubTab === 'finished' && 'Corregí los goles de cualquier partido finalizado. Los puntos se recalcularán automáticamente.'}
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
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 bg-slate-100/50 py-1 px-2 rounded-lg">
                          <img 
                            src={`/flags/${getTeamNameAndFlag(match.homeTeam).code}.svg`} 
                            alt={getTeamNameAndFlag(match.homeTeam).name} 
                            title={getTeamNameAndFlag(match.homeTeam).name}
                            className="w-4 h-4 rounded-full shadow-sm select-none shrink-0" 
                            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                          />
                          <span className="font-bold text-slate-800 text-xs sm:text-sm">{getTeamNameAndFlag(match.homeTeam).name}</span>
                        </div>
                        <span className="text-xs text-slate-400 font-bold px-0.5">vs</span>
                        <div className="flex items-center gap-1.5 bg-slate-100/50 py-1 px-2 rounded-lg">
                          <span className="font-bold text-slate-800 text-xs sm:text-sm">{getTeamNameAndFlag(match.awayTeam).name}</span>
                          <img 
                            src={`/flags/${getTeamNameAndFlag(match.awayTeam).code}.svg`} 
                            alt={getTeamNameAndFlag(match.awayTeam).name} 
                            title={getTeamNameAndFlag(match.awayTeam).name}
                            className="w-4 h-4 rounded-full shadow-sm select-none shrink-0" 
                            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 mt-1.5 text-xs text-slate-500 font-mono flex-wrap gap-y-1">
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        <span>{new Date(match.matchDate).toLocaleString('es-AR')}</span>
                        {isPastKickoff && (
                          <span className="bg-amber-100 text-amber-800 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                            <ShieldAlert className="h-2.5 w-2.5" />
                            Jugándose / Finalizado
                          </span>
                        )}
                        <span className="bg-blue-100 text-blue-800 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider border border-blue-200">
                          {(() => {
                            const phaseLabels: { [key: string]: string } = {
                              'grupos': 'Fase de Grupos',
                              '16avos': '16avos de Final',
                              '8vos': '8vos de Final',
                              'cuartos': 'Cuartos de Final',
                              'semis': 'Semifinales',
                              'final': 'Gran Final'
                            };
                            const p = match.phase || 'grupos';
                            return phaseLabels[p] || (p.toLowerCase().includes('grupo') ? `Grupo ${p.replace(/grupo/i, '').trim()}` : p);
                          })()}
                        </span>
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
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5 bg-slate-100/40 py-1 px-2 rounded-lg">
                            <img 
                              src={`/flags/${getTeamNameAndFlag(match.homeTeam).code}.svg`} 
                              alt={getTeamNameAndFlag(match.homeTeam).name} 
                              title={getTeamNameAndFlag(match.homeTeam).name}
                              className="w-4 h-4 rounded-full shadow-sm select-none shrink-0" 
                              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                            />
                            <span className="font-extrabold text-slate-800 text-xs sm:text-sm">{getTeamNameAndFlag(match.homeTeam).name}</span>
                          </div>
                          <span className="text-xs text-slate-400 font-bold px-0.5">vs</span>
                          <div className="flex items-center gap-1.5 bg-slate-100/40 py-1 px-2 rounded-lg">
                            <span className="font-extrabold text-slate-800 text-xs sm:text-sm">{getTeamNameAndFlag(match.awayTeam).name}</span>
                            <img 
                              src={`/flags/${getTeamNameAndFlag(match.awayTeam).code}.svg`} 
                              alt={getTeamNameAndFlag(match.awayTeam).name} 
                              title={getTeamNameAndFlag(match.awayTeam).name}
                              className="w-4 h-4 rounded-full shadow-sm select-none shrink-0" 
                              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 mt-1.5 text-xs text-slate-500 font-mono flex-wrap gap-y-1">
                          <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <span>{new Date(match.matchDate).toLocaleDateString('es-AR')}</span>
                          <span className="bg-emerald-50 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-100">
                            Marcador: {match.homeScore} - {match.awayScore}
                          </span>
                          <span className="bg-blue-100 text-blue-800 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider border border-blue-200">
                            {(() => {
                              const phaseLabels: { [key: string]: string } = {
                                'grupos': 'Fase de Grupos',
                                '16avos': '16avos de Final',
                                '8vos': '8vos de Final',
                                'cuartos': 'Cuartos de Final',
                                'semis': 'Semifinales',
                                'final': 'Gran Final'
                              };
                              const p = match.phase || 'grupos';
                              return phaseLabels[p] || (p.toLowerCase().includes('grupo') ? `Grupo ${p.replace(/grupo/i, '').trim()}` : p);
                            })()}
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
              <h4 className="font-semibold text-slate-700 text-xs">No hay partidos finalizados</h4>
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

    </div>
  );
};
