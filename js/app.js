// ── Navegación ─────────────────────────────────────────────────────────────
function goPage(p, el) {
  if (p === 'admin' && !isAdmin()) { toast('Acceso restringido', 'warn'); return; }
  document.querySelectorAll('.page').forEach(x => x.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(x => x.classList.remove('active'));
  document.getElementById('page-' + p).classList.add('active');
  if (el) el.classList.add('active');
  // Entrar al Tablero MCI por la pestaña de navegación (o "← Tablero general"
  // desde un perfil) siempre debe ser la vista general: si no se limpia
  // mActivo, queda pegado el banner del integrante que se estaba viendo en
  // el perfil hasta que el usuario hace click en "Todos" en el menú lateral.
  if (p === 'tablero') mActivo = 'todos';
  pagina = p;
  renderAll();
}

function flushPredInputs() {
  if (pagina !== 'perfil') return;
  let cambio = false;
  document.querySelectorAll('#perfil-content .pinp').forEach(function(inp) {
    if (inp.dataset.predId && setPredActualRaw(inp.dataset.predId, inp.value.trim())) {
      cambio = true;
    }
  });
  if (cambio) guardarConfig();
}

function semAnterior()  { if (sem > 1)  { flushPredInputs(); sem--; renderAll(); } }
function semSiguiente() { if (sem < TOTAL_SEM) { flushPredInputs(); sem++; renderAll(); } }
function semHoy()       { const h = semanaActual(); if (sem !== h) { flushPredInputs(); sem = h; renderAll(); } }

function selectM(id) {
  if (su?.rol === 'integrante' && su.mid && id !== 'todos' && id !== su.mid) {
    toast('Solo puedes ver tu propio perfil', 'warn'); return;
  }
  mActivo = id;
  perfTab = 0; renovMes = 'todos';   // reset del tab/filtro al cambiar de integrante
  document.querySelectorAll('.mcard').forEach(x => x.classList.remove('active'));
  document.getElementById('card-' + id)?.classList.add('active');
  if (id !== 'todos') {
    // Navegar a página de perfil del integrante
    document.querySelectorAll('.page').forEach(x => x.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(x => x.classList.remove('active'));
    document.getElementById('page-perfil').classList.add('active');
    pagina = 'perfil';
  } else if (pagina === 'perfil') {
    // "Todos" desde un perfil → volver al Tablero general
    document.querySelectorAll('.page').forEach(x => x.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(x => x.classList.remove('active'));
    document.getElementById('page-tablero').classList.add('active');
    document.getElementById('tab-tablero')?.classList.add('active');
    pagina = 'tablero';
  }
  renderAll();
}

function volverTablero() {
  goPage('tablero', document.getElementById('tab-tablero'));
}

// ── Init ───────────────────────────────────────────────────────────────────
(async function init() {
  await loadState();
  sem = semanaActual();   // arranca en la semana de calendario en curso
  // Arranca directamente en el app sin login screen
  document.getElementById('app-shell').style.cssText = 'display:flex!important;flex-direction:column;height:100vh';
  setupGuestRole();
  await restoreSession();   // si hay token guardado, restaura la sesión
  setupDraggable();
  renderAll();
})();
