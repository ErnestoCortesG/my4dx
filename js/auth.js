// ── Permisos ───────────────────────────────────────────────────────────────
const isAdmin  = () => su?.rol === 'admin';
const canEdit  = () => su?.rol === 'admin';
const canComp  = () => su?.rol === 'admin' || su?.rol === 'integrante';

// ── Modo invitado (sin sesión) ─────────────────────────────────────────────
function setupGuestRole() {
  su = null;
  document.getElementById('btn-login-nav').style.display  = 'flex';
  document.getElementById('user-pill-wrap').style.display = 'none';
  document.getElementById('tab-admin').style.display      = 'none';
  document.getElementById('bsave').style.display          = 'none';
  document.getElementById('bnewcomp').style.display       = 'none';
}

// ── Modal de login ─────────────────────────────────────────────────────────
function openLoginModal() {
  document.getElementById('ml-user').value = '';
  document.getElementById('ml-pass').value = '';
  document.getElementById('ml-err').textContent = '';
  document.getElementById('m-login').classList.add('open');
  setTimeout(() => document.getElementById('ml-user').focus(), 60);
}

async function loginFromModal() {
  const u = document.getElementById('ml-user').value.trim();
  const p = document.getElementById('ml-pass').value;
  document.getElementById('ml-err').textContent = '';
  try {
    const res = await fetch('/api/login', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ username: u, password: p })
    });
    if (!res.ok) {
      document.getElementById('ml-err').textContent = 'Usuario o contraseña incorrectos.';
      return;
    }
    const data = await res.json();
    authToken = data.token;
    su        = data.user;
    try { localStorage.setItem(TOKEN_KEY, authToken); } catch (_) {}
    if (isAdmin()) await cargarUsuarios();
    closeModal('m-login');
    setupRole();
    renderAll();
  } catch (_) {
    document.getElementById('ml-err').textContent = 'No se pudo conectar con el servidor.';
  }
}

// Restaura la sesión desde el token guardado (al recargar la página).
async function restoreSession() {
  let token = null;
  try { token = localStorage.getItem(TOKEN_KEY); } catch (_) {}
  if (!token) return;
  try {
    const res = await fetch('/api/session', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (!res.ok) { try { localStorage.removeItem(TOKEN_KEY); } catch (_) {} return; }
    const data = await res.json();
    authToken = token;
    su        = data.user;
    if (isAdmin()) await cargarUsuarios();
    setupRole();
  } catch (_) {}
}

// Carga la lista de usuarios (solo admin) al cache global USERS.
async function cargarUsuarios() {
  try {
    const res = await fetch('/api/users', {
      headers: { 'Authorization': 'Bearer ' + authToken }
    });
    USERS = res.ok ? await res.json() : [];
  } catch (_) { USERS = []; }
}

// ── Logout → vuelve a modo invitado ───────────────────────────────────────
async function logout() {
  if (authToken) {
    try {
      await fetch('/api/logout', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + authToken }
      });
    } catch (_) {}
  }
  authToken = null;
  USERS = [];
  try { localStorage.removeItem(TOKEN_KEY); } catch (_) {}
  setupGuestRole();
  renderAll();
}

// ── Configurar UI según rol ────────────────────────────────────────────────
function setupRole() {
  const ini = su.nombre.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase();
  document.getElementById('nav-av').textContent      = ini;
  document.getElementById('nav-av').style.background = su.color;
  document.getElementById('nav-un').textContent      = su.nombre.split(' ')[0];
  document.getElementById('nav-ur').textContent      =
    su.rol === 'admin' ? 'Administrador' : su.rol === 'integrante' ? 'Integrante' : 'Visualizador';
  document.getElementById('btn-login-nav').style.display  = 'none';
  document.getElementById('user-pill-wrap').style.display = 'flex';
  document.getElementById('tab-admin').style.display      = isAdmin() ? 'flex' : 'none';
  document.getElementById('bsave').style.display          = canEdit() ? 'inline-flex' : 'none';
  document.getElementById('bnewcomp').style.display       = canComp() ? 'inline-flex' : 'none';
  // Al entrar como integrante, fijar la vista a su propio miembro
  if (su.rol === 'integrante' && su.mid) mActivo = su.mid;
}
