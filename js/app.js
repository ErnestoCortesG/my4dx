// ── Navegación ─────────────────────────────────────────────────────────────
function goPage(p, el) {
  if (p === 'admin' && !isAdmin()) { toast('Acceso restringido'); return; }
  document.querySelectorAll('.page').forEach(x => x.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(x => x.classList.remove('active'));
  document.getElementById('page-' + p).classList.add('active');
  if (el) el.classList.add('active');
  pagina = p;
  renderAll();
}

function flushPredInputs() {
  if (pagina !== 'perfil') return;
  document.querySelectorAll('#perfil-content .pinp').forEach(function(inp) {
    var v = inp.value.trim();
    if (v !== '' && inp.dataset.predId) {
      getSem(sem).preds[inp.dataset.predId] = parseFloat(v);
    }
  });
}

function semAnterior()  { if (sem > 1)  { flushPredInputs(); sem--; renderAll(); } }
function semSiguiente() { if (sem < 27) { flushPredInputs(); sem++; renderAll(); } }

function selectM(id) {
  if (su?.rol === 'integrante' && su.mid && id !== 'todos' && id !== su.mid) {
    toast('Solo puedes ver tu propio perfil'); return;
  }
  mActivo = id;
  document.querySelectorAll('.mcard').forEach(x => x.classList.remove('active'));
  document.getElementById('card-' + id)?.classList.add('active');
  if (id !== 'todos') {
    // Navegar a página de perfil del integrante
    document.querySelectorAll('.page').forEach(x => x.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(x => x.classList.remove('active'));
    document.getElementById('page-perfil').classList.add('active');
    pagina = 'perfil';
  }
  renderAll();
}

function volverTablero() {
  goPage('tablero', document.getElementById('tab-tablero'));
}

// ── Init ───────────────────────────────────────────────────────────────────
(async function init() {
  await loadState();
  // Arranca directamente en el app sin login screen
  document.getElementById('app-shell').style.cssText = 'display:flex!important;flex-direction:column;height:100vh';
  setupGuestRole();
  setupDraggable();
  renderAll();
})();
