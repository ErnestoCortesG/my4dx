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

function loginFromModal() {
  const u = document.getElementById('ml-user').value.trim();
  const p = document.getElementById('ml-pass').value;
  document.getElementById('ml-err').textContent = '';
  const found = ST.usuarios.find(x => x.username === u && x.password === p);
  if (!found) {
    document.getElementById('ml-err').textContent = 'Usuario o contraseña incorrectos.';
    return;
  }
  su = found;
  closeModal('m-login');
  setupRole();
  renderAll();
}

// ── Logout → vuelve a modo invitado ───────────────────────────────────────
function logout() {
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
