// ── Permisos ───────────────────────────────────────────────────────────────
const isAdmin  = () => su?.rol === 'admin';
const canEdit  = () => su?.rol === 'admin';
const canComp  = () => su?.rol === 'admin' || su?.rol === 'integrante';

// ── Login / Logout ─────────────────────────────────────────────────────────
function login() {
  const u = document.getElementById('l-user').value.trim();
  const p = document.getElementById('l-pass').value;
  document.getElementById('l-err').textContent = '';

  const found = ST.usuarios.find(x => x.username === u && x.password === p);
  if (!found) {
    document.getElementById('l-err').textContent = 'Usuario o contraseña incorrectos.';
    return;
  }
  su = found;
  // cssText con !important supera la especificidad de los selectores de ID en styles.css
  document.getElementById('login-screen').style.cssText = 'display:none!important';
  document.getElementById('app-shell').style.cssText    = 'display:flex!important;flex-direction:column;height:100vh';
  setupRole();
  renderAll();
}

function logout() {
  su = null;
  document.getElementById('login-screen').style.cssText =
    'display:flex!important;align-items:center;justify-content:center;min-height:100vh;background:linear-gradient(135deg,#1B3A6B,#0d2040)';
  document.getElementById('app-shell').style.cssText = 'display:none!important';
  document.getElementById('l-user').value = '';
  document.getElementById('l-pass').value = '';
  document.getElementById('l-err').textContent = '';
}

// ── Configurar UI según rol ────────────────────────────────────────────────
function setupRole() {
  const ini = su.nombre.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase();
  document.getElementById('nav-av').textContent  = ini;
  document.getElementById('nav-av').style.background = su.color;
  document.getElementById('nav-un').textContent  = su.nombre.split(' ')[0];
  document.getElementById('nav-ur').textContent  =
    su.rol === 'admin' ? 'Administrador' : su.rol === 'integrante' ? 'Integrante' : 'Visualizador';
  document.getElementById('tab-admin').style.display  = isAdmin() ? 'flex' : 'none';
  document.getElementById('bsave').style.display      = canEdit() ? 'inline-flex' : 'none';
  document.getElementById('bnewcomp').style.display   = canComp() ? 'inline-flex' : 'none';
  // Al entrar como integrante, fijar la vista a su propio miembro para evitar ver datos ajenos desde el inicio
  if (su.rol === 'integrante' && su.mid) mActivo = su.mid;
}
