// ===================================
// Firebase Configuration (Modular SDK)
// ===================================

// Importa las funciones necesarias del SDK modular de Firebase
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, set, onValue, child } from 'firebase/database';

// Tu Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBjxduk8IYzwIWIcZbRS4OlQ0ZoNLVFZEw",
  authDomain: "proyecto-asistenciaste.firebaseapp.com",
  databaseURL: "https://proyecto-asistenciaste-default-rtdb.firebaseio.com",
  projectId: "proyecto-asistenciaste",
  storageBucket: "proyecto-asistenciaste.firebasestorage.app",
  messagingSenderId: "371479274638",
  appId: "1:371479274638:web:383bf3cc126b6aa94d15df"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
export const rtdb = getDatabase(app); // Exporta la instancia de Realtime Database

console.log("✅ Firebase inicializado correctamente (SDK Modular)");

// Helper functions para Firebase (Modular)
export async function getAsamblea(asambleaId) {
  try {
    const dbRef = ref(rtdb);
    const snapshot = await get(child(dbRef, `asambleas/${asambleaId}`));
    return snapshot.exists() ? snapshot.val() : null;
  } catch (error) {
    console.error("Error obteniendo asamblea:", error);
    return null;
  }
}

export async function getAsistencias(asambleaId) {
  try {
    const dbRef = ref(rtdb);
    const snapshot = await get(child(dbRef, `asambleas/${asambleaId}/asistencias`));
    return snapshot.exists() ? snapshot.val() : {};
  } catch (error) {
    console.error("Error obteniendo asistencias:", error);
    return {};
  }
}

export async function saveAsistencia(asambleaId, rut, nombreCompleto, timestamp) {
  try {
    const id = `${rut}-${timestamp}`;
    await set(ref(rtdb, `asambleas/${asambleaId}/asistencias/${id}`), {
      rut: rut,
      nombreCompleto: nombreCompleto,
      timestamp: timestamp,
      fecha: new Date(timestamp).toLocaleDateString('es-CL'),
      hora: new Date(timestamp).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
    });
    console.log("✅ Asistencia guardada en Firebase");
    return true;
  } catch (error) {
    console.error("Error guardando asistencia:", error);
    return false;
  }
}

export function listenToAsistencias(asambleaId, callback) {
  try {
    const asistenciasRef = ref(rtdb, `asambleas/${asambleaId}/asistencias`);
    onValue(asistenciasRef, (snapshot) => {
      const data = snapshot.val() || {};
      callback(data);
    });
  } catch (error) {
    console.error("Error escuchando asistencias:", error);
  }
}

// Local storage fallback functions (sin cambios, ya que no dependen de Firebase)
export function getAsambleas() {
  const asambleas = localStorage.getItem('asambleas');
  return asambleas ? JSON.parse(asambleas) : [];
}

export function saveAsambleaLocal(asamblea) {
  const asambleas = getAsambleas();
  asambleas.push(asamblea);
  localStorage.setItem('asambleas', JSON.stringify(asambleas));
}

export function updateAsambleaLocal(asambleaId, data) {
  let asambleas = getAsambleas();
  const index = asambleas.findIndex(a => a.id === asambleaId);
  if (index !== -1) {
    asambleas[index] = { ...asambleas[index], ...data };
    localStorage.setItem('asambleas', JSON.stringify(asambleas));
  }
}

export function deleteAsambleaLocal(asambleaId) {
  let asambleas = getAsambleas();
  asambleas = asambleas.filter(a => a.id !== asambleaId);
  localStorage.setItem('asambleas', JSON.stringify(asambleas));
}
