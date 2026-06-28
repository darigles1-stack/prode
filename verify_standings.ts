import { OFFICIAL_WORLD_STAGE_MATCHES } from './src/lib/worldCupData.js';
import fs from 'fs';

// Load simulated results
const results = JSON.parse(fs.readFileSync('./simulated_group_results.json', 'utf8'));

// Map teams to group phase
const teamToGroup: Record<string, string> = {};
OFFICIAL_WORLD_STAGE_MATCHES.forEach(m => {
  teamToGroup[m.local] = m.fase;
  teamToGroup[m.visitante] = m.fase;
});

const cleanTeams = Object.keys(teamToGroup);
const standings: Record<string, { team: string; clean: string; pts: number; gf: number; ga: number; gd: number; gp: number; group: string }> = {};

cleanTeams.forEach(clean => {
  standings[clean] = {
    team: clean,
    clean,
    pts: 0,
    gf: 0,
    ga: 0,
    gd: 0,
    gp: 0,
    group: teamToGroup[clean]
  };
});

results.forEach((m: any) => {
  const hClean = m.local;
  const aClean = m.visitante;

  const hRec = standings[hClean];
  const aRec = standings[aClean];

  if (hRec && aRec) {
    const hs = Number(m.golesLocal);
    const as = Number(m.golesVisitante);

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
});

const groupsMap: Record<string, typeof standings[string][]> = {};
Object.values(standings).forEach(rec => {
  if (!groupsMap[rec.group]) {
    groupsMap[rec.group] = [];
  }
  groupsMap[rec.group].push(rec);
});

const firsts: string[] = [];
const seconds: string[] = [];
const thirds: typeof standings[string][] = [];

const groupNamesAlphabetical = [
  "Grupo A", "Grupo B", "Grupo C", "Grupo D", "Grupo E", "Grupo F",
  "Grupo G", "Grupo H", "Grupo I", "Grupo J", "Grupo K", "Grupo L"
];

console.log("=== POSICIONES POR GRUPO ===");
groupNamesAlphabetical.forEach(gName => {
  const list = (groupsMap[gName] || []).sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.gd !== a.gd) return b.gd - a.gd;
    if (b.gf !== a.gf) return b.gf - a.gf;
    return a.clean.localeCompare(b.clean);
  });

  console.log(`\n${gName}:`);
  list.forEach((t, idx) => {
    console.log(`  ${idx + 1}. ${t.team} - Pts: ${t.pts}, DG: ${t.gd}, GF: ${t.gf}`);
  });

  if (list[0]) firsts.push(list[0].team);
  if (list[1]) seconds.push(list[1].team);
  if (list[2]) thirds.push(list[2]);
});

const sortedThirds = thirds.sort((a, b) => {
  if (b.pts !== a.pts) return b.pts - a.pts;
  if (b.gd !== a.gd) return b.gd - a.gd;
  if (b.gf !== a.gf) return b.gf - a.gf;
  return a.clean.localeCompare(b.clean);
});

console.log("\n=== TERCEROS ORDENADOS ===");
sortedThirds.forEach((t, idx) => {
  console.log(`  ${idx + 1}. ${t.team} (${t.group}) - Pts: ${t.pts}, DG: ${t.gd}, GF: ${t.gf}`);
});

const bestThirdsOverall = sortedThirds.slice(0, 8);
console.log("\n=== MEJORES 8 TERCEROS ===");
bestThirdsOverall.forEach((t, idx) => {
  console.log(`  ${idx + 1}. ${t.team} (${t.group})`);
});

// Helper functions with fallback to group placeholder
const getFirstOfGroup = (gName: string, idx: number): string => {
  return firsts[idx] || `1° ${gName} 🏆`;
};

const getSecondOfGroup = (gName: string, idx: number): string => {
  return seconds[idx] || `2° ${gName} 🏆`;
};

const assignedThirdsSet = new Set<string>();

const getBestThirdOf = (groups: string[]): string => {
  const found = bestThirdsOverall.find(t => 
    groups.includes(t.group) && 
    !assignedThirdsSet.has(t.clean) &&
    !t.team.includes('3°') // Is a real qualified team
  );
  if (found) {
    assignedThirdsSet.add(found.clean);
    return found.team;
  }
  const groupLetters = groups.map(g => g.replace("Grupo ", "")).join("/");
  return `Mejor 3° Grupo ${groupLetters} 🏆`;
};

const pairings = [
  { match: "M74", home: getFirstOfGroup("Grupo E", 4), away: getBestThirdOf(['Grupo A', 'Grupo B', 'Grupo C', 'Grupo D', 'Grupo F']) }, // Match 74
  { match: "M77", home: getFirstOfGroup("Grupo I", 8), away: getBestThirdOf(['Grupo C', 'Grupo D', 'Grupo F', 'Grupo G', 'Grupo H']) }, // Match 77
  { match: "M73", home: getSecondOfGroup("Grupo A", 0), away: getSecondOfGroup("Grupo B", 1) }, // Match 73
  { match: "M75", home: getFirstOfGroup("Grupo F", 5), away: getSecondOfGroup("Grupo C", 2) }, // Match 75
  { match: "M76", home: getFirstOfGroup("Grupo C", 2), away: getSecondOfGroup("Grupo F", 5) }, // Match 76
  { match: "M78", home: getSecondOfGroup("Grupo E", 4), away: getSecondOfGroup("Grupo I", 8) }, // Match 78
  { match: "M79", home: getFirstOfGroup("Grupo A", 0), away: getBestThirdOf(['Grupo C', 'Grupo E', 'Grupo F', 'Grupo H', 'Grupo I']) }, // Match 79
  { match: "M80", home: getFirstOfGroup("Grupo L", 11), away: getBestThirdOf(['Grupo E', 'Grupo H', 'Grupo I', 'Grupo J', 'Grupo K']) }, // Match 80
  { match: "M83", home: getSecondOfGroup("Grupo K", 10), away: getSecondOfGroup("Grupo L", 11) }, // Match 83
  { match: "M84", home: getFirstOfGroup("Grupo H", 7), away: getSecondOfGroup("Grupo J", 9) }, // Match 84
  { match: "M81", home: getFirstOfGroup("Grupo D", 3), away: getBestThirdOf(['Grupo B', 'Grupo E', 'Grupo F', 'Grupo I', 'Grupo J']) }, // Match 81
  { match: "M82", home: getFirstOfGroup("Grupo G", 6), away: getBestThirdOf(['Grupo A', 'Grupo E', 'Grupo H', 'Grupo I', 'Grupo J']) }, // Match 82
  { match: "M86", home: getFirstOfGroup("Grupo J", 9), away: getSecondOfGroup("Grupo H", 7) }, // Match 86
  { match: "M88", home: getSecondOfGroup("Grupo D", 3), away: getSecondOfGroup("Grupo G", 6) }, // Match 88
  { match: "M85", home: getFirstOfGroup("Grupo B", 1), away: getBestThirdOf(['Grupo E', 'Grupo F', 'Grupo G', 'Grupo I', 'Grupo J']) }, // Match 85
  { match: "M87", home: getFirstOfGroup("Grupo K", 10), away: getBestThirdOf(['Grupo D', 'Grupo E', 'Grupo I', 'Grupo J', 'Grupo L']) } // Match 87
];

console.log("\n=== CRUCES GENERADOS ===");
pairings.forEach((p, idx) => {
  console.log(`  ${p.match} (ID base: 16avos_${idx+1}): ${p.home} vs. ${p.away}`);
});
