// ── Variables globales de navegación/sesión ───────────────────────────────
let sem = 1;
let mActivo = 'todos';
let pagina = 'tablero';
let su = null;       // usuario en sesión
let editUID = null;  // id del usuario en edición (modal)

// ── Estado principal ───────────────────────────────────────────────────────
let ST = {
  usuarios:    JSON.parse(JSON.stringify(UB)),
  miembros:    JSON.parse(JSON.stringify(MB)),
  wigs:        JSON.parse(JSON.stringify(WB)),
  mciTitulos:  { 1: 'Conservación de agentes', 2: 'Recluta de claves' },
  semanas:     {}
};

// ── Helpers ───────────────────────────────────────────────────────────────
function uid() {
  return Math.random().toString(36).slice(2, 9);
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
 * @param {number} n - Número de semana (1–27)
 */
function getSem(n) {
  if (!ST.semanas[n]) ST.semanas[n] = { wigs:{}, wigSem:{}, preds:{}, comps: n === 1 ? defComps() : [] };
  if (!ST.semanas[n].wigSem) ST.semanas[n].wigSem = {};
  return ST.semanas[n];
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

// ── Persistencia ───────────────────────────────────────────────────────────

/**
 * Guarda el estado en el servidor (SQLite) y en localStorage como respaldo.
 * Fire-and-forget seguro: los errores de red no rompen la UI.
 */
async function guardar() {
  const payload = JSON.stringify(ST);

  // Intenta guardar en el servidor SQLite
  try {
    await fetch('/api/state', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    payload
    });
  } catch (_) {
    // Sin servidor: el respaldo en localStorage alcanza
  }

  // Siempre guarda también en localStorage como caché local / respaldo offline
  try { localStorage.setItem('4dx-clickseguros-2026', payload); } catch (_) {}

  toast('Guardado ✓');
}

/**
 * Carga el estado al arrancar.
 * Prioridad: servidor → localStorage → datos de fábrica (UB/MB/WB).
 */
async function loadState() {
  // 1. Intentar cargar desde el servidor
  try {
    const res    = await fetch('/api/state');
    const parsed = await res.json();
    if (parsed && parsed.usuarios) { ST = parsed; _migrarST(); return; }
  } catch (_) {}

  // 2. Fallback: localStorage (modo offline o sin servidor)
  try {
    const raw    = localStorage.getItem('4dx-clickseguros-2026');
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && parsed.usuarios) { ST = parsed; _migrarST(); }
  } catch (_) {}
}

function _migrarST() {
  if (!ST.mciTitulos) {
    ST.mciTitulos = { 1: 'Conservación de agentes', 2: 'Recluta de claves' };
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
