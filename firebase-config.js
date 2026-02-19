// ===================================
// Firebase Configuration
// ===================================

// Import Firebase modules from CDN
// (These are loaded in HTML file)

// Your Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBjxduk8IYzwIWIcZbRS4OlQ0ZoNLVFZEw",
  authDomain: "proyecto-asistenciaste.firebaseapp.com",
  databaseURL: "https://proyecto-asistenciaste-default-rtdb.firebaseio.com",
  projectId: "proyecto-asistenciaste",
  storageBucket: "proyecto-asistenciaste.firebasestorage.app",
  messagingSenderId: "371479274638",
  appId: "1:371479274638:web:383bf3cc126b6aa94d15df"
};

// Initialize Firebase (will be called after SDK loads)
let firebaseApp;
let realtimeDB;

async function initializeFirebase() {
  try {
    // Initialize Firebase
    firebaseApp = firebase.initializeApp(firebaseConfig);
    realtimeDB = firebase.database(firebaseApp);
    console.log("✅ Firebase inicializado correctamente");
    return true;
  } catch (error) {
    console.error("❌ Error inicializando Firebase:", error);
    return false;
  }
}

// Helper functions para Firebase
async function getAsamblea(asambleaId) {
  try {
    const snapshot = await realtimeDB.ref(`asambleas/${asambleaId}`).get();
    return snapshot.exists() ? snapshot.val() : null;
  } catch (error) {
    console.error("Error obteniendo asamblea:", error);
    return null;
  }
}

async function getAsistencias(asambleaId) {
  try {
    const snapshot = await realtimeDB.ref(`asambleas/${asambleaId}/asistencias`).get();
    return snapshot.exists() ? snapshot.val() : {};
  } catch (error) {
    console.error("Error obteniendo asistencias:", error);
    return {};
  }
}

async function saveAsistencia(asambleaId, rut, nombreCompleto, timestamp) {
  try {
    const id = `${rut}-${timestamp}`;
    await realtimeDB.ref(`asambleas/${asambleaId}/asistencias/${id}`).set({
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

async function listenToAsistencias(asambleaId, callback) {
  try {
    realtimeDB.ref(`asambleas/${asambleaId}/asistencias`).on('value', (snapshot) => {
      const data = snapshot.val() || {};
      callback(data);
    });
  } catch (error) {
    console.error("Error escuchando asistencias:", error);
  }
}

// Local storage fallback functions
function getAsambleas() {
  const asambleas = localStorage.getItem('asambleas');
  return asambleas ? JSON.parse(asambleas) : [];
}

function saveAsambleaLocal(asamblea) {
  const asambleas = getAsambleas();
  asambleas.push(asamblea);
  localStorage.setItem('asambleas', JSON.stringify(asambleas));
}

function updateAsambleaLocal(asambleaId, data) {
  let asambleas = getAsambleas();
  const index = asambleas.findIndex(a => a.id === asambleaId);
  if (index !== -1) {
    asambleas[index] = { ...asambleas[index], ...data };
    localStorage.setItem('asambleas', JSON.stringify(asambleas));
  }
}

function deleteAsambleaLocal(asambleaId) {
  let asambleas = getAsambleas();
  asambleas = asambleas.filter(a => a.id !== asambleaId);
  localStorage.setItem('asambleas', JSON.stringify(asambleas));
}
