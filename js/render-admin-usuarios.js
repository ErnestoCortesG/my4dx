// ── Administración · Usuarios ──
// Construye la lista de usuarios y gestiona su alta/edición/baja (vía API).

function adminUsuariosHTML() {
  return USERS.map(u => {
    const ini = u.nombre.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase();
    const rb  = u.rol === 'admin' ? 'rba' : u.rol === 'integrante' ? 'rbi' : 'rbv';
    const rl  = u.rol === 'admin' ? 'Admin' : u.rol === 'integrante' ? 'Integrante' : 'Visualizador';
    return `<div class="urow">
      <div class="uav" style="background:${u.color}">${ini}</div>
      <div class="uinfo">
        <div class="uname2">${esc(u.nombre)}</div>
        <div class="umeta">@${esc(u.username)} · ${esc(u.cargo)}</div>
        <span class="rb ${rb}">${rl}</span>
      </div>
      <button class="bedit" onclick="openEditUser('${u.id}')">Editar</button>
      ${u.id !== 'u1' ? `<button class="bdel" onclick="delUser('${u.id}')">×</button>` : ''}
    </div>`;
  }).join('');
}

function openNewUser() {
  editUID = null;
  document.getElementById('m-user-tit').textContent = 'Nuevo usuario';
  ['u-nom','u-usr','u-pwd','u-cargo'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('u-pwd').placeholder = 'Contraseña';
  document.getElementById('u-rol').value = 'integrante';
  document.getElementById('u-mid').innerHTML =
    '<option value="">— Sin asociar —</option>' +
    ST.miembros.map(m => `<option value="${m.id}">${esc(m.nombre)}</option>`).join('');
  document.getElementById('m-user').classList.add('open');
}

function openEditUser(id) {
  editUID = id;
  const u = USERS.find(x => x.id === id);
  if (!u) return;
  document.getElementById('m-user-tit').textContent = 'Editar usuario';
  document.getElementById('u-nom').value   = u.nombre;
  document.getElementById('u-usr').value   = u.username;
  document.getElementById('u-pwd').value   = '';   // vacío = conservar la contraseña actual
  document.getElementById('u-pwd').placeholder = 'Dejar vacío para no cambiar';
  document.getElementById('u-rol').value   = u.rol;
  document.getElementById('u-cargo').value = u.cargo;
  document.getElementById('u-mid').innerHTML =
    '<option value="">— Sin asociar —</option>' +
    ST.miembros.map(m => `<option value="${m.id}"${u.mid === m.id ? ' selected' : ''}>${esc(m.nombre)}</option>`).join('');
  document.getElementById('m-user').classList.add('open');
}

function onRolChange() {
  const r = document.getElementById('u-rol').value;
  document.getElementById('u-mid-row').style.display = r === 'integrante' ? '' : 'none';
}

async function saveUser() {
  const nom   = document.getElementById('u-nom').value.trim();
  const usr   = document.getElementById('u-usr').value.trim();
  const pwd   = document.getElementById('u-pwd').value;
  const rol   = document.getElementById('u-rol').value;
  const cargo = document.getElementById('u-cargo').value.trim();
  const mid   = document.getElementById('u-mid').value || null;
  // Al crear se exige contraseña; al editar es opcional (vacío = conservar)
  if (!nom || !usr || (!editUID && !pwd)) { toast('Completa los campos requeridos'); return; }
  const cols = { admin:'#E02500', integrante:'#1B3A6B', visualizador:'#666' };
  const payload = { id: editUID || null, nombre:nom, username:usr, rol, cargo, mid, color:cols[rol] };
  if (pwd) payload.password = pwd;   // solo se envía si se capturó
  try {
    const res = await fetch('/api/users', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken },
      body:    JSON.stringify(payload)
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      toast(e.error || 'No se pudo guardar el usuario'); return;
    }
    await cargarUsuarios();
    closeModal('m-user');
    renderAdmin();
    toast('Usuario guardado ✓');
  } catch (_) { toast('Error de conexión'); }
}

async function delUser(id) {
  if (id === 'u1') { toast('No se puede eliminar el admin principal'); return; }
  if (!confirm('¿Eliminar este usuario?')) return;
  try {
    const res = await fetch('/api/users/delete', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken },
      body:    JSON.stringify({ id })
    });
    if (!res.ok) { toast('No se pudo eliminar'); return; }
    await cargarUsuarios();
    renderAdmin();
    toast('Usuario eliminado');
  } catch (_) { toast('Error de conexión'); }
}
