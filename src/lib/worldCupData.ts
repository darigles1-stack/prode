// FIFA World Cup 2026 - Exact group stage schedule with 72 matches as requested by the user

export interface WorldCupScheduleMatch {
  nro: number;
  fase: string;
  fecha: string; // YYYY-MM-DD
  hora: string;  // HH:MM
  local: string;
  visitante: string;
  estadio: string;
  localFlag: string;
  visitanteFlag: string;
}

// Map of World Cup 2026 countries to their respective flag emojis
export const COUNTRY_FLAGS: Record<string, string> = {
  "México": "🇲🇽",
  "Sudáfrica": "🇿🇦",
  "Corea del Sur": "🇰🇷",
  "Rep. Checa": "🇨🇿",
  "República Checa": "🇨🇿",
  "Canadá": "🇨🇦",
  "Bosnia y Herzegovina": "🇧🇦",
  "Qatar": "🇶🇦",
  "Suiza": "🇨🇭",
  "Brasil": "🇧🇷",
  "Marruecos": "🇲🇦",
  "Haití": "🇭🇹",
  "Escocia": "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  "EE.UU.": "🇺🇸",
  "Estados Unidos": "🇺🇸",
  "Paraguay": "🇵🇾",
  "Australia": "🇦🇺",
  "Turquía": "🇹🇷",
  "Alemania": "🇩🇪",
  "Curazao": "🇨🇼",
  "Costa de Marfil": "🇨🇮",
  "Ecuador": "🇪🇨",
  "Países Bajos": "🇳🇱",
  "Japón": "🇯🇵",
  "Suecia": "🇸🇪",
  "Túnez": "🇹🇳",
  "Bélgica": "🇧🇪",
  "Egipto": "🇪🇬",
  "Irán": "🇮🇷",
  "Nueva Zelanda": "🇳🇿",
  "España": "🇪🇸",
  "Cabo Verde": "🇨🇻",
  "Arabia Saudí": "🇸🇦",
  "Arabia Saudita": "🇸🇦",
  "Uruguay": "🇺🇾",
  "Francia": "🇫🇷",
  "Senegal": "🇸🇳",
  "Irak": "🇮🇶",
  "Noruega": "🇳🇴",
  "Argentina": "🇦🇷",
  "Argelia": "🇩🇿",
  "Austria": "🇦🇹",
  "Jordania": "🇯🇴",
  "Portugal": "🇵🇹",
  "RD de Congo": "🇨🇩",
  "Uzbekistán": "🇺🇿",
  "Colombia": "🇨🇴",
  "Inglaterra": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  "Croacia": "🇭🇷",
  "Ghana": "🇬🇭",
  "Panamá": "🇵🇦",
  "Venezuela": "🇻🇪",
  "Jamaica": "🇯🇲",
  "Honduras": "🇭🇳",
  "Chile": "🇨🇱",
  "Perú": "🇵🇪",
  "Dinamarca": "🇩🇰",
  "Costa Rica": "🇨🇷",
  "Serbia": "🇷🇸"
};

export const getFlagForCountry = (name: string): string => {
  const clean = name.trim();
  return COUNTRY_FLAGS[clean] || "🏳️";
};

export const getCountryCode = (name: string): string => {
  const clean = name.trim();
  const codes: Record<string, string> = {
    "México": "mx",
    "Sudáfrica": "za",
    "Corea del Sur": "kr",
    "Rep. Checa": "cz",
    "República Checa": "cz",
    "Canadá": "ca",
    "Bosnia y Herzegovina": "ba",
    "Qatar": "qa",
    "Suiza": "ch",
    "Brasil": "br",
    "Marruecos": "ma",
    "Haití": "ht",
    "Escocia": "gb-sct",
    "EE.UU.": "us",
    "Estados Unidos": "us",
    "Paraguay": "py",
    "Australia": "au",
    "Turquía": "tr",
    "Alemania": "de",
    "Curazao": "cw",
    "Costa de Marfil": "ci",
    "Ecuador": "ec",
    "Países Bajos": "nl",
    "Japón": "jp",
    "Suecia": "se",
    "Túnez": "tn",
    "Bélgica": "be",
    "Egipto": "eg",
    "Irán": "ir",
    "Nueva Zelanda": "nz",
    "España": "es",
    "Cabo Verde": "cv",
    "Arabia Saudí": "sa",
    "Arabia Saudita": "sa",
    "Uruguay": "uy",
    "Francia": "fr",
    "Senegal": "sn",
    "Irak": "iq",
    "Noruega": "no",
    "Argentina": "ar",
    "Argelia": "dz",
    "Austria": "at",
    "Jordania": "jo",
    "Portugal": "pt",
    "RD de Congo": "cd",
    "Uzbekistán": "uz",
    "Colombia": "co",
    "Inglaterra": "gb-eng",
    "Croacia": "hr",
    "Ghana": "gh",
    "Panamá": "pa",
    "Venezuela": "ve",
    "Jamaica": "jm",
    "Honduras": "hn",
    "Chile": "cl",
    "Perú": "pe",
    "Dinamarca": "dk",
    "Costa Rica": "cr",
    "Serbia": "rs"
  };
  return codes[clean] || "un";
};

export const getTeamDisplayName = (name: string): string => {
  const flag = getFlagForCountry(name);
  return `${name} ${flag}`;
};

export const OFFICIAL_WORLD_STAGE_MATCHES: WorldCupScheduleMatch[] = [
  // --- GRUPO A ---
  { "nro": 1, "fase": "Grupo A", "fecha": "2026-06-11", "hora": "16:00", "local": "México", "visitante": "Sudáfrica", "estadio": "Ciudad de México", "localFlag": "🇲🇽", "visitanteFlag": "🇿🇦" },
  { "nro": 2, "fase": "Grupo A", "fecha": "2026-06-11", "hora": "23:00", "local": "Corea del Sur", "visitante": "Rep. Checa", "estadio": "Guadalajara", "localFlag": "🇰🇷", "visitanteFlag": "🇨🇿" },
  { "nro": 13, "fase": "Grupo A", "fecha": "2026-06-18", "hora": "13:00", "local": "Rep. Checa", "visitante": "Sudáfrica", "estadio": "Atlanta", "localFlag": "🇨🇿", "visitanteFlag": "🇿🇦" },
  { "nro": 14, "fase": "Grupo A", "fecha": "2026-06-18", "hora": "22:00", "local": "México", "visitante": "Corea del Sur", "estadio": "Guadalajara", "localFlag": "🇲🇽", "visitanteFlag": "🇰🇷" },
  { "nro": 25, "fase": "Grupo A", "fecha": "2026-06-24", "hora": "22:00", "local": "Sudáfrica", "visitante": "Corea del Sur", "estadio": "Houston", "localFlag": "🇿🇦", "visitanteFlag": "🇰🇷" },
  { "nro": 26, "fase": "Grupo A", "fecha": "2026-06-24", "hora": "22:00", "local": "Rep. Checa", "visitante": "México", "estadio": "Ciudad de México", "localFlag": "🇨🇿", "visitanteFlag": "🇲🇽" },

  // --- GRUPO B ---
  { "nro": 3, "fase": "Grupo B", "fecha": "2026-06-12", "hora": "16:00", "local": "Canadá", "visitante": "Bosnia y Herzegovina", "estadio": "Toronto", "localFlag": "🇨🇦", "visitanteFlag": "🇧🇦" },
  { "nro": 4, "fase": "Grupo B", "fecha": "2026-06-13", "hora": "16:00", "local": "Qatar", "visitante": "Suiza", "estadio": "Bahía de San Francisco", "localFlag": "🇶🇦", "visitanteFlag": "🇨🇭" },
  { "nro": 15, "fase": "Grupo B", "fecha": "2026-06-18", "hora": "16:00", "local": "Suiza", "visitante": "Bosnia y Herzegovina", "estadio": "Atlanta", "localFlag": "🇨🇭", "visitanteFlag": "🇧🇦" },
  { "nro": 16, "fase": "Grupo B", "fecha": "2026-06-18", "hora": "19:00", "local": "Canadá", "visitante": "Qatar", "estadio": "Vancouver", "localFlag": "🇨🇦", "visitanteFlag": "🇶🇦" },
  { "nro": 27, "fase": "Grupo B", "fecha": "2026-06-24", "hora": "16:00", "local": "Bosnia y Herzegovina", "visitante": "Qatar", "estadio": "Seattle", "localFlag": "🇧🇦", "visitanteFlag": "🇶🇦" },
  { "nro": 28, "fase": "Grupo B", "fecha": "2026-06-24", "hora": "16:00", "local": "Suiza", "visitante": "Canadá", "estadio": "Vancouver", "localFlag": "🇨🇭", "visitanteFlag": "🇨🇦" },

  // --- GRUPO C ---
  { "nro": 5, "fase": "Grupo C", "fecha": "2026-06-13", "hora": "19:00", "local": "Brasil", "visitante": "Marruecos", "estadio": "Nueva York / New Jersey", "localFlag": "🇧🇷", "visitanteFlag": "🇲🇦" },
  { "nro": 6, "fase": "Grupo C", "fecha": "2026-06-13", "hora": "22:00", "local": "Haití", "visitante": "Escocia", "estadio": "Los Ángeles", "localFlag": "🇭🇹", "visitanteFlag": "🏴" },
  { "nro": 17, "fase": "Grupo C", "fecha": "2026-06-19", "hora": "19:00", "local": "Escocia", "visitante": "Marruecos", "estadio": "Gillette", "localFlag": "🏴", "visitanteFlag": "🇲🇦" },
  { "nro": 18, "fase": "Grupo C", "fecha": "2026-06-19", "hora": "22:00", "local": "Brasil", "visitante": "Haití", "estadio": "Los Ángeles", "localFlag": "🇧🇷", "visitanteFlag": "🇭🇹" },
  { "nro": 29, "fase": "Grupo C", "fecha": "2026-06-24", "hora": "19:00", "local": "Escocia", "visitante": "Brasil", "estadio": "Miami", "localFlag": "🏴", "visitanteFlag": "🇧🇷" },
  { "nro": 30, "fase": "Grupo C", "fecha": "2026-06-24", "hora": "19:00", "local": "Marruecos", "visitante": "Haití", "estadio": "Atlanta", "localFlag": "🇲🇦", "visitanteFlag": "🇭🇹" },

  // --- GRUPO D ---
  { "nro": 7, "fase": "Grupo D", "fecha": "2026-06-12", "hora": "22:00", "local": "EE.UU.", "visitante": "Paraguay", "estadio": "Los Ángeles", "localFlag": "🇺🇸", "visitanteFlag": "🇵🇾" },
  { "nro": 8, "fase": "Grupo D", "fecha": "2026-06-14", "hora": "01:00", "local": "Australia", "visitante": "Turquía", "estadio": "Vancouver", "localFlag": "🇦🇺", "visitanteFlag": "🇹🇷" },
  { "nro": 19, "fase": "Grupo D", "fecha": "2026-06-19", "hora": "16:00", "local": "EE.UU.", "visitante": "Australia", "estadio": "Boston", "localFlag": "🇺🇸", "visitanteFlag": "🇦🇺" },
  { "nro": 20, "fase": "Grupo D", "fecha": "2026-06-20", "hora": "00:00", "local": "Turquía", "visitante": "Paraguay", "estadio": "Bahía de San Francisco", "localFlag": "🇹🇷", "visitanteFlag": "🇵🇾" },
  { "nro": 31, "fase": "Grupo D", "fecha": "2026-06-25", "hora": "23:00", "local": "Paraguay", "visitante": "Australia", "estadio": "Bahía de San Francisco", "localFlag": "🇵🇾", "visitanteFlag": "🇦🇺" },
  { "nro": 32, "fase": "Grupo D", "fecha": "2026-06-25", "hora": "23:00", "local": "Turquía", "visitante": "EE.UU.", "estadio": "Los Ángeles", "localFlag": "🇹🇷", "visitanteFlag": "🇺🇸" },

  // --- GRUPO E ---
  { "nro": 9, "fase": "Grupo E", "fecha": "2026-06-14", "hora": "14:00", "local": "Alemania", "visitante": "Curazao", "estadio": "Los Ángeles", "localFlag": "🇩🇪", "visitanteFlag": "🇨🇼" },
  { "nro": 10, "fase": "Grupo E", "fecha": "2026-06-14", "hora": "20:00", "local": "Costa de Marfil", "visitante": "Ecuador", "estadio": "Filadelfia", "localFlag": "🇨🇮", "visitanteFlag": "🇪🇨" },
  { "nro": 21, "fase": "Grupo E", "fecha": "2026-06-20", "hora": "17:00", "local": "Alemania", "visitante": "Costa de Marfil", "estadio": "Toronto", "localFlag": "🇩🇪", "visitanteFlag": "🇨🇮" },
  { "nro": 22, "fase": "Grupo E", "fecha": "2026-06-20", "hora": "21:00", "local": "Ecuador", "visitante": "Curazao", "estadio": "Kansas City", "localFlag": "🇪🇨", "visitanteFlag": "🇨🇼" },
  { "nro": 33, "fase": "Grupo E", "fecha": "2026-06-25", "hora": "17:00", "local": "Curazao", "visitante": "Costa de Marfil", "estadio": "Filadelfia", "localFlag": "🇨🇼", "visitanteFlag": "🇨🇮" },
  { "nro": 34, "fase": "Grupo E", "fecha": "2026-06-25", "hora": "17:00", "local": "Ecuador", "visitante": "Alemania", "estadio": "Nueva York / New Jersey", "localFlag": "🇪🇨", "visitanteFlag": "🇩🇪" },

  // --- GRUPO F ---
  { "nro": 11, "fase": "Grupo F", "fecha": "2026-06-14", "hora": "17:00", "local": "Países Bajos", "visitante": "Japón", "estadio": "Dallas", "localFlag": "🇳🇱", "visitanteFlag": "🇯🇵" },
  { "nro": 12, "fase": "Grupo F", "fecha": "2026-06-14", "hora": "23:00", "local": "Suecia", "visitante": "Túnez", "estadio": "Monterrey", "localFlag": "🇸🇪", "visitanteFlag": "🇹🇳" },
  { "nro": 23, "fase": "Grupo F", "fecha": "2026-06-20", "hora": "14:00", "local": "Países Bajos", "visitante": "Suecia", "estadio": "Toronto", "localFlag": "🇳🇱", "visitanteFlag": "🇸🇪" },
  { "nro": 24, "fase": "Grupo F", "fecha": "2026-06-21", "hora": "01:00", "local": "Túnez", "visitante": "Japón", "estadio": "Monterrey", "localFlag": "🇹🇳", "visitanteFlag": "🇯🇵" },
  { "nro": 35, "fase": "Grupo F", "fecha": "2026-06-25", "hora": "20:00", "local": "Japón", "visitante": "Suecia", "estadio": "Dallas", "localFlag": "🇯🇵", "visitanteFlag": "🇸🇪" },
  { "nro": 36, "fase": "Grupo F", "fecha": "2026-06-25", "hora": "20:00", "local": "Túnez", "visitante": "Países Bajos", "estadio": "Kansas City", "localFlag": "🇹🇳", "visitanteFlag": "🇳🇱" },

  // --- GRUPO G ---
  { "nro": 37, "fase": "Grupo G", "fecha": "2026-06-15", "hora": "16:00", "local": "Bélgica", "visitante": "Egipto", "estadio": "Seattle", "localFlag": "🇧🇪", "visitanteFlag": "🇪🇬" },
  { "nro": 38, "fase": "Grupo G", "fecha": "2026-06-15", "hora": "22:00", "local": "Irán", "visitante": "Nueva Zelanda", "estadio": "Los Ángeles", "localFlag": "🇮🇷", "visitanteFlag": "🇳🇿" },
  { "nro": 39, "fase": "Grupo G", "fecha": "2026-06-21", "hora": "16:00", "local": "Bélgica", "visitante": "Irán", "estadio": "Los Ángeles", "localFlag": "🇧🇪", "visitanteFlag": "🇮🇷" },
  { "nro": 40, "fase": "Grupo G", "fecha": "2026-06-21", "hora": "22:00", "local": "Nueva Zelanda", "visitante": "Egipto", "estadio": "Vancouver", "localFlag": "🇳🇿", "visitanteFlag": "🇪🇬" },
  { "nro": 41, "fase": "Grupo G", "fecha": "2026-06-27", "hora": "00:00", "local": "Nueva Zelanda", "visitante": "Bélgica", "estadio": "Atlanta", "localFlag": "🇳🇿", "visitanteFlag": "🇧🇪" },
  { "nro": 42, "fase": "Grupo G", "fecha": "2026-06-27", "hora": "00:00", "local": "Egipto", "visitante": "Irán", "estadio": "Seattle", "localFlag": "🇪🇬", "visitanteFlag": "🇮🇷" },

  // --- GRUPO H ---
  { "nro": 43, "fase": "Grupo H", "fecha": "2026-06-15", "hora": "13:00", "local": "España", "visitante": "Cabo Verde", "estadio": "Atlanta", "localFlag": "🇪🇸", "visitanteFlag": "🇨🇻" },
  { "nro": 44, "fase": "Grupo H", "fecha": "2026-06-15", "hora": "19:00", "local": "Arabia Saudí", "visitante": "Uruguay", "estadio": "Miami", "localFlag": "🇸🇦", "visitanteFlag": "🇺🇾" },
  { "nro": 45, "fase": "Grupo H", "fecha": "2026-06-21", "hora": "13:00", "local": "España", "visitante": "Arabia Saudí", "estadio": "Boston", "localFlag": "🇪🇸", "visitanteFlag": "🇸🇦" },
  { "nro": 46, "fase": "Grupo H", "fecha": "2026-06-21", "hora": "19:00", "local": "Uruguay", "visitante": "Cabo Verde", "estadio": "Miami", "localFlag": "🇺🇾", "visitanteFlag": "🇨🇻" },
  { "nro": 47, "fase": "Grupo H", "fecha": "2026-06-26", "hora": "21:00", "local": "Cabo Verde", "visitante": "Arabia Saudí", "estadio": "Houston", "localFlag": "🇨🇻", "visitanteFlag": "🇸🇦" },
  { "nro": 48, "fase": "Grupo H", "fecha": "2026-06-26", "hora": "21:00", "local": "Uruguay", "visitante": "España", "estadio": "Guadalajara", "localFlag": "🇺🇾", "visitanteFlag": "🇪🇸" },

  // --- GRUPO I ---
  { "nro": 49, "fase": "Grupo I", "fecha": "2026-06-16", "hora": "16:00", "local": "Francia", "visitante": "Senegal", "estadio": "Nueva York / New Jersey", "localFlag": "🇫🇷", "visitanteFlag": "🇸🇳" },
  { "nro": 50, "fase": "Grupo I", "fecha": "2026-06-16", "hora": "19:00", "local": "Irak", "visitante": "Noruega", "estadio": "Boston", "localFlag": "🇮🇶", "visitanteFlag": "🇳🇴" },
  { "nro": 51, "fase": "Grupo I", "fecha": "2026-06-22", "hora": "18:00", "local": "Francia", "visitante": "Irak", "estadio": "Filadelfia", "localFlag": "🇫🇷", "visitanteFlag": "🇮🇶" },
  { "nro": 52, "fase": "Grupo I", "fecha": "2026-06-22", "hora": "21:00", "local": "Noruega", "visitante": "Senegal", "estadio": "Nueva York / New Jersey", "localFlag": "🇳🇴", "visitanteFlag": "🇸🇳" },
  { "nro": 53, "fase": "Grupo I", "fecha": "2026-06-26", "hora": "16:00", "local": "Senegal", "visitante": "Irak", "estadio": "Toronto", "localFlag": "🇸🇳", "visitanteFlag": "🇮🇶" },
  { "nro": 54, "fase": "Grupo I", "fecha": "2026-06-26", "hora": "16:00", "local": "Noruega", "visitante": "Francia", "estadio": "Boston", "localFlag": "🇳🇴", "visitanteFlag": "🇫🇷" },

  // --- GRUPO J ---
  { "nro": 55, "fase": "Grupo J", "fecha": "2026-06-16", "hora": "22:00", "local": "Argentina", "visitante": "Argelia", "estadio": "Kansas City", "localFlag": "🇦🇷", "visitanteFlag": "🇩🇿" },
  { "nro": 56, "fase": "Grupo J", "fecha": "2026-06-17", "hora": "01:00", "local": "Austria", "visitante": "Jordania", "estadio": "Bahía de San Francisco", "localFlag": "🇦🇹", "visitanteFlag": "🇯🇴" },
  { "nro": 57, "fase": "Grupo J", "fecha": "2026-06-22", "hora": "14:00", "local": "Argentina", "visitante": "Austria", "estadio": "Dallas", "localFlag": "🇦🇷", "visitanteFlag": "🇦🇹" },
  { "nro": 58, "fase": "Grupo J", "fecha": "2026-06-23", "hora": "00:00", "local": "Jordania", "visitante": "Argelia", "estadio": "Bahía de San Francisco", "localFlag": "🇯🇴", "visitanteFlag": "🇩🇿" },
  { "nro": 59, "fase": "Grupo J", "fecha": "2026-06-27", "hora": "23:00", "local": "Argelia", "visitante": "Austria", "estadio": "Kansas City", "localFlag": "🇩🇿", "visitanteFlag": "🇦🇹" },
  { "nro": 60, "fase": "Grupo J", "fecha": "2026-06-27", "hora": "23:00", "local": "Jordania", "visitante": "Argentina", "estadio": "Dallas", "localFlag": "🇯🇴", "visitanteFlag": "🇦🇷" },

  // --- GRUPO K ---
  { "nro": 61, "fase": "Grupo K", "fecha": "2026-06-17", "hora": "14:00", "local": "Portugal", "visitante": "RD de Congo", "estadio": "Atlanta", "localFlag": "🇵🇹", "visitanteFlag": "🇨🇩" },
  { "nro": 62, "fase": "Grupo K", "fecha": "2026-06-17", "hora": "23:00", "local": "Uzbekistán", "visitante": "Colombia", "estadio": "Ciudad de México", "localFlag": "🇺🇿", "visitanteFlag": "🇨🇴" },
  { "nro": 63, "fase": "Grupo K", "fecha": "2026-06-23", "hora": "14:00", "local": "Portugal", "visitante": "Uzbekistán", "estadio": "Houston", "localFlag": "🇵🇹", "visitanteFlag": "🇺🇿" },
  { "nro": 64, "fase": "Grupo K", "fecha": "2026-06-23", "hora": "23:00", "local": "Colombia", "visitante": "RD de Congo", "estadio": "Guadalajara", "localFlag": "🇨🇴", "visitanteFlag": "🇨🇩" },
  { "nro": 65, "fase": "Grupo K", "fecha": "2026-06-27", "hora": "20:30", "local": "RD de Congo", "visitante": "Uzbekistán", "estadio": "Atlanta", "localFlag": "🇨🇩", "visitanteFlag": "🇺🇿" },
  { "nro": 66, "fase": "Grupo K", "fecha": "2026-06-27", "hora": "20:30", "local": "Colombia", "visitante": "Portugal", "estadio": "Miami", "localFlag": "🇨🇴", "visitanteFlag": "🇵🇹" },

  // --- GRUPO L ---
  { "nro": 67, "fase": "Grupo L", "fecha": "2026-06-17", "hora": "17:00", "local": "Inglaterra", "visitante": "Croacia", "estadio": "Dallas", "localFlag": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "visitanteFlag": "🇭🇷" },
  { "nro": 68, "fase": "Grupo L", "fecha": "2026-06-17", "hora": "20:00", "local": "Ghana", "visitante": "Panamá", "estadio": "Toronto", "localFlag": "🇬🇭", "visitanteFlag": "🇵🇦" },
  { "nro": 69, "fase": "Grupo L", "fecha": "2026-06-23", "hora": "17:00", "local": "Inglaterra", "visitante": "Ghana", "estadio": "Boston", "localFlag": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "visitanteFlag": "🇬🇭" },
  { "nro": 70, "fase": "Grupo L", "fecha": "2026-06-23", "hora": "20:00", "local": "Panamá", "visitante": "Croacia", "estadio": "Toronto", "localFlag": "🇵🇦", "visitanteFlag": "🇭🇷" },
  { "nro": 71, "fase": "Grupo L", "fecha": "2026-06-27", "hora": "18:00", "local": "Croacia", "visitante": "Ghana", "estadio": "Filadelfia", "localFlag": "🇭🇷", "visitanteFlag": "🇬🇭" },
  { "nro": 72, "fase": "Grupo L", "fecha": "2026-06-27", "hora": "18:00", "local": "Panamá", "visitante": "Inglaterra", "estadio": "Nueva York / New Jersey", "localFlag": "🇵🇦", "visitanteFlag": "🏴󠁧󠁢󠁥󠁮󠁧󠁿" }
];
