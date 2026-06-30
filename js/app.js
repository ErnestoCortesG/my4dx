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

function semAnterior()  { if (sem > 1)  { sem--; renderAll(); } }
function semSiguiente() { if (sem < 27) { sem++; renderAll(); } }

function selectM(id) {
  if (su?.rol === 'integrante' && su.mid && id !== 'todos' && id !== su.mid) {
    toast('Solo puedes ver tu propio perfil'); return;
  }
  mActivo = id;
  document.querySelectorAll('.mcard').forEach(x => x.classList.remove('active'));
  document.getElementById('card-' + id)?.classList.add('active');
  renderAll();
}

// ── Init ───────────────────────────────────────────────────────────────────
(async function init() {
  await loadState();
  // cssText forzado para superar especificidad de selectores de ID en styles.css
  document.getElementById('login-screen').style.cssText =
    'display:flex;align-items:center;justify-content:center;min-height:100vh;background:linear-gradient(135deg,#1B3A6B,#0d2040)';
  document.getElementById('app-shell').style.cssText = 'display:none';
})();
