// ── Variables globales de navegación/sesión ───────────────────────────────
let sem = 1;
let mActivo = 'todos';
let pagina = 'tablero';
let su = null;        // usuario en sesión (perfil sin contraseña)
let editUID = null;   // id del usuario en edición (modal)
let authToken = null; // token de sesión emitido por el servidor
let USERS = [];        // cache de usuarios (solo se llena para admin, vía /api/users)

const TOKEN_KEY = '4dx-clickseguros-token';

// ── Estado principal ───────────────────────────────────────────────────────
// Nota: los usuarios ya NO viven aquí — están en el servidor (tabla `users`).
let ST = {
  miembros:    JSON.parse(JSON.stringify(MB)),
  wigs:        JSON.parse(JSON.stringify(WB)),
  mciTitulos:  { 1: 'Conservación de agentes', 2: 'Recluta de claves' },
  semanas:     {}
};

// ── Helpers ───────────────────────────────────────────────────────────────
function uid() {
  return Math.random().toString(36).slice(2, 9);
}

/**
 * Escapa texto para insertarlo con seguridad en HTML (contenido o atributos).
 * Previene XSS almacenado en campos editables por el usuario (nombres,
 * etiquetas, evidencias de compromisos, títulos de MCI, etc.).
 */
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function defComps() {
  return [
    {id:uid(), lider:'Sandra Martínez', mci:'MCI 1 · Conservación', txt:'Identificar agentes en riesgo de Promotorías.',        done:true},
    {id:uid(), lider:'Ernesto Cortés',  mci:'MCI 1 · Conservación', txt:'Montar alerta semanal de agentes en riesgo.',           done:false},
    {id:uid(), lider:'Maricruz García', mci:'MCI 1 · Conservación', txt:'Revisar tablero Franquicias: Gdl, Qro, Mty.',           done:false},
    {id:uid(), lider:'Zvi Mitrani',     mci:'MCI 2 · Recluta',      txt:'Confirmar proceso contacto <24h a leads.',              done:true},
    {id:uid(), lider:'Leslie Zetina',   mci:'MCI 2 · Recluta',      txt:'Empujar claves en proceso a emisión.',                  done:false},
    {id:uid(), lider:'Nataly Mora',     mci:'MCI 2 · Recluta',      txt:'Entregar leads calificados sem 1 a Recluta.',           done:false},
    {id:uid(), lider:'Sully Mitrani',   mci:'Soporte 4DX',          txt:'Confirmar 8 líderes con tablero antes mié.',            done:false},
    {id:uid(), lider:'Ernesto Cortés',  mci:'Soporte 4DX',          txt:'Homologar definiciones clave del sistema.',             done:true}
  ];
}

/**
 * Devuelve el objeto de semana n, creándolo si no existe.
 * Rellena con `w.inicio` solo los WIGs aún undefined — no pisa datos ya guardados.
 * Nunca devuelve undefined: es el único punto de acceso a ST.semanas[n].
 * @param {number} n - Número de semana (1–TOTAL_SEM)
 */
function getSem(n) {
  // Los compromisos demo de fábrica pertenecen a la semana 27 (29 jun–5 jul)
  if (!ST.semanas[n]) ST.semanas[n] = { wigs:{}, wigSem:{}, preds:{}, comps: n === 27 ? defComps() : [] };
  if (!ST.semanas[n].wigSem) ST.semanas[n].wigSem = {};
  return ST.semanas[n];
}

// ¿El WIG tiene algún registro capturado (acumulado o avance semanal)?
// Sin datos, el elemento se excluye de promedios y semáforos.
function wigTieneDatos(wigId) {
  return Object.values(ST.semanas || {}).some(s =>
    (s.wigs && s.wigs[wigId] !== undefined) ||
    (s.wigSem && s.wigSem[wigId] != null)
  );
}

// Borra los registros de un WIG en la semana n (el elemento sigue existiendo).
// Al quitar el valor explícito de esa semana, getWigVal vuelve a heredar el de
// la semana anterior; si ninguna semana conserva registros, el elemento queda
// "sin datos" y fuera de los semáforos.
function limpiarWig(wigId, n) {
  const s = ST.semanas[n];
  if (!s) return;
  if (s.wigs)         delete s.wigs[wigId];
  if (s.wigsExplicit) delete s.wigsExplicit[wigId];
  if (s.wigSem)       delete s.wigSem[wigId];
}

// Devuelve el valor acumulado más reciente de un WIG hasta la semana n,
// buscando hacia atrás sin escribir — nunca bloquea el valor en ST.semanas.
function getWigVal(n, wigId) {
  for (let i = n; i >= 1; i--) {
    const s = ST.semanas[i];
    if (s && s.wigs[wigId] !== undefined) return s.wigs[wigId];
  }
  const w = ST.wigs.find(x => x.id === wigId);
  return w ? w.inicio : 0;
}

// ── Persistencia (documentos normalizados) ──────────────────────────────────
// El estado se guarda por secciones independientes en el servidor:
//   'config'  → { wigs, miembros, mciTitulos }   (definiciones globales)
//   'week:N'  → datos capturados de la semana N   (valores, avances, compromisos)
// Cada documento tiene su propia versión (control optimista): editar la config y
// editar una semana ya no se pisan, ni tampoco dos semanas distintas entre sí.

let docVersions = {};   // key → versión conocida por el cliente

function _configDoc() {
  return { wigs: ST.wigs, miembros: ST.miembros, mciTitulos: ST.mciTitulos, _semCal: ST._semCal };
}

/**
 * Guarda un documento en el servidor con control optimista de versión.
 * En conflicto (409) recarga el estado y avisa; el usuario reaplica su cambio.
 * Siempre respalda el estado completo en localStorage (modo offline).
 */
async function guardarDoc(key, data) {
  try { localStorage.setItem('4dx-clickseguros-2026', JSON.stringify(ST)); } catch (_) {}
  if (!authToken) return;   // sin sesión no se escribe en el servidor
  try {
    const res = await fetch('/api/doc', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken },
      body:    JSON.stringify({ key, data, version: docVersions[key] || 0 })
    });
    if (res.status === 401) { toast('Sesión expirada — vuelve a iniciar sesión'); return; }
    if (res.status === 409) {
      toast('Otro usuario actualizó estos datos — recargando…');
      await loadState();
      renderAll();
      return;
    }
    if (res.ok) {
      const r = await res.json();
      docVersions[key] = r.version;
      toast('Guardado ✓');
    }
  } catch (_) {
    // Sin servidor: el respaldo en localStorage alcanza
  }
}

// Atajos por sección
function guardarConfig()   { return guardarDoc('config', _configDoc()); }
function guardarSemana(n)  { return guardarDoc('week:' + n, getSem(n)); }

// Compatibilidad: guarda config + la semana activa (usar los atajos cuando se
// sabe qué sección cambió es más granular y evita conflictos innecesarios).
async function guardar() {
  await guardarConfig();
  await guardarSemana(sem);
}

/**
 * Carga el estado al arrancar, ensamblado desde los documentos del servidor.
 * Prioridad: servidor → localStorage → datos de fábrica (MB/WB).
 */
async function loadState() {
  // 1. Intentar cargar desde el servidor
  try {
    const res    = await fetch('/api/state');
    const parsed = await res.json();
    if (parsed && parsed.wigs) {
      docVersions = parsed._versions || {};
      delete parsed._versions;
      ST = parsed;
      _migrarST();
      return;
    }
  } catch (_) {}

  // 2. Fallback: localStorage (modo offline o sin servidor)
  try {
    const raw    = localStorage.getItem('4dx-clickseguros-2026');
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && parsed.wigs) { ST = parsed; _migrarST(); }
  } catch (_) {}
}

function _migrarST() {
  // Purgar usuarios/contraseñas de blobs de versiones anteriores (ahora viven
  // en el servidor con hash). Evita que queden contraseñas en texto plano.
  if (ST.usuarios) delete ST.usuarios;
  if (!ST.mciTitulos) {
    ST.mciTitulos = { 1: 'Conservación de agentes', 2: 'Recluta de claves' };
  }
  // Reparar medidas predictivas sin MCI asignado (crasheaban renderPerfil)
  (ST.miembros || []).forEach(m => {
    (m.preds || []).forEach(p => { if (!p.mci) p.mci = 'Ambos MCIs'; });
  });
  // Migrar numeración de semanas al calendario anual (S1 = 1 ene 2026).
  // El esquema anterior arrancaba en S1 = 29 jun, que equivale a la S27
  // del calendario: se desplazan todas las semanas guardadas +26.
  if (!ST._semCal) {
    const viejo = ST.semanas || {};
    const nuevo = {};
    Object.keys(viejo).forEach(k => { nuevo[parseInt(k) + 26] = viejo[k]; });
    // La antigua semana 1 (ahora 27) guardaba valores capturados por Admin
    // sin marca de explícito — se marcan para que sobrevivan la limpieza.
    if (nuevo[27] && nuevo[27].wigs) {
      nuevo[27].wigsExplicit = nuevo[27].wigsExplicit || {};
      Object.keys(nuevo[27].wigs).forEach(id => { nuevo[27].wigsExplicit[id] = true; });
    }
    ST.semanas = nuevo;
    ST._semCal = true;
  }
  // Migrar mciAlineados: copiar del seed MB para miembros que aún no lo tienen
  ST.miembros.forEach(m => {
    if (!m.mciAlineados) {
      const seed = MB.find(x => x.id === m.id);
      m.mciAlineados = seed?.mciAlineados ? [...seed.mciAlineados] : [];
    }
  });
  // Migrar wigSem: garantizar que todas las semanas existentes tengan el campo
  Object.values(ST.semanas || {}).forEach(s => {
    if (!s.wigSem) s.wigSem = {};
  });
  // Limpiar wigs de semanas 2+ que no estén marcados como explícitos.
  // Semana 1 se preserva intacta; semanas posteriores heredan vía getWigVal.
  Object.entries(ST.semanas || {}).forEach(([n, s]) => {
    if (parseInt(n) > 1) {
      // Conservar solo valores marcados explícitamente por Admin
      const exp = s.wigsExplicit || {};
      Object.keys(s.wigs || {}).forEach(id => {
        if (!exp[id]) delete s.wigs[id];
      });
    }
  });
}
