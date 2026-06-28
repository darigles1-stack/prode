import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, Timestamp, query, where } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

const configPath = path.resolve('./firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function repair() {
  console.log("Iniciando reparación de fechas de 16avos en Firestore...");
  
  const q = query(collection(db, 'matches'), where('phase', '==', '16avos'));
  const snap = await getDocs(q);
  
  console.log(`Se encontraron ${snap.size} partidos de 16avos.`);

  const offsetMap: { [key: number]: { day: number; hour: number } } = {
    0: { day: 1, hour: 13 },  // M74
    1: { day: 2, hour: 13 },  // M77
    2: { day: 0, hour: 16 },  // M73
    3: { day: 1, hour: 17 },  // M75
    4: { day: 1, hour: 21 },  // M76
    5: { day: 2, hour: 17 },  // M78
    6: { day: 2, hour: 21 },  // M79
    7: { day: 3, hour: 13 },  // M80
    8: { day: 4, hour: 13 },  // M83
    9: { day: 4, hour: 17 },  // M84
    10: { day: 3, hour: 17 }, // M81
    11: { day: 3, hour: 21 }, // M82
    12: { day: 5, hour: 13 }, // M86
    13: { day: 5, hour: 17 }, // M88
    14: { day: 4, hour: 21 }, // M85
    15: { day: 5, hour: 21 }  // M87
  };

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const id = docSnap.id; // e.g., "16avos_3"
    
    const m = id.match(/_(\d+)$/);
    if (!m) {
      console.log(`Saltando partido con ID no estándar: ${id}`);
      continue;
    }
    
    const matchIndexOneBased = parseInt(m[1], 10);
    const i = matchIndexOneBased - 1; // 0-indexed
    
    const offsets = offsetMap[i];
    if (!offsets) {
      console.log(`No se encontraron offsets para el índice ${i} (ID: ${id})`);
      continue;
    }

    // June is 5 (0-indexed). June 28 is day 0.
    const dateObj = new Date(2026, 5, 28 + offsets.day, offsets.hour, 0, 0, 0);
    const dateISO = dateObj.toISOString();
    
    console.log(`Actualizando ${id} (${data.homeTeam} vs ${data.awayTeam}):`);
    console.log(`  - Fecha anterior (aprox): ${data.matchDate?.seconds ? new Date(data.matchDate.seconds * 1000).toISOString() : data.matchDate}`);
    console.log(`  - Nueva fecha: ${dateISO} (ARG local: ${dateObj.toLocaleString('es-AR')})`);

    const docRef = doc(db, 'matches', id);
    await updateDoc(docRef, {
      matchDate: Timestamp.fromDate(dateObj)
    });
  }

  console.log("Reparación finalizada exitosamente.");
  process.exit(0);
}

repair().catch(err => {
  console.error("Error en la reparación:", err);
  process.exit(1);
});
