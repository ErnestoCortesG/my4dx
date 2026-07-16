// ── Módulo Administración — orquestador ──
// renderAdmin() compone tres secciones, cada una en su propio archivo:
//   render-admin-usuarios.js  → adminUsuariosHTML() + CRUD de usuarios
//   render-admin-mcis.js      → adminMCIsHTML()     + edición de WIGs / MCIs generales
//   render-admin-contrib.js   → adminContribHTML()  + MCIs contributivos por integrante

function renderAdmin() {
  if (!isAdmin()) {
    document.getElementById('apanel').innerHTML = '<p style="color:#E02500;padding:14px">Acceso restringido.</p>';
    return;
  }
  document.getElementById('apanel').innerHTML = `
    <div class="acard">
      <div class="achdr">
        <h3>Usuarios del sistema</h3>
        <button type="button" class="bconfirm" style="padding:5px 10px;font-size:11px" onclick="openNewUser()">+ Nuevo usuario</button>
      </div>${adminUsuariosHTML()}
    </div>
    <div class="acard">
      <div class="achdr">
        <h3>MCIs generales</h3>
        <button type="button" class="bconfirm" style="padding:5px 10px;font-size:11px" onclick="openMCI()">+ Nuevo MCI</button>
      </div>${adminMCIsHTML()}
    </div>
    <div class="acard">
      <div class="achdr">
        <h3>MCI contributivos por integrante</h3>
        <button type="button" class="bconfirm" style="padding:5px 10px;font-size:11px" onclick="openContrib()">+ Nuevo MCI contributivo</button>
      </div>
      ${adminContribHTML()}
    </div>`;
}
