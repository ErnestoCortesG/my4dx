// ── Módulo Administración (usuarios, MCIs, contributivos) — extraído de render.js (v2.3) ──

// ── Admin ──────────────────────────────────────────────────────────────────
function renderAdmin() {
  if (!isAdmin()) {
    document.getElementById('apanel').innerHTML = '<p style="color:#E02500;padding:14px">Acceso restringido.</p>';
    return;
  }
  const usHtml = USERS.map(u => {
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

  // Agrupar WIGs por número de MCI
  const mciNums = [...new Set(ST.wigs.map(w => w.mci))].sort((a,b) => a-b);
  const s = getSem(sem);

  const mciHtml = mciNums.map(n => {
    const tit  = ST.mciTitulos?.[n] || `MCI ${n}`;
    const wigs = ST.wigs.filter(w => w.mci === n);
    const filas = wigs.map(w => {
      const actual = getWigVal(sem, w.id);
      return `<div class="waerow" data-wid="${w.id}">
        <div class="waefield">
          <label class="waelbl">Elemento</label>
          <input type="text" class="waeinp" autocomplete="off" value="${esc(w.label)}"
            onchange="saveWigField('${w.id}','label',this.value)">
        </div>
        <div class="waefield waefield-num">
          <label class="waelbl">Inicio</label>
          <input type="number" class="waeinp" value="${w.inicio}"
            onchange="saveWigField('${w.id}','inicio',parseFloat(this.value)||0)">
        </div>
        <div class="waefield waefield-num">
          <label class="waelbl">Meta</label>
          <input type="number" class="waeinp" value="${w.meta}"
            onchange="saveWigField('${w.id}','meta',parseFloat(this.value)||0)">
        </div>
        <div class="waefield waefield-num">
          <label class="waelbl">Unidad</label>
          <input type="text" class="waeinp waeinp-sm" autocomplete="off" value="${esc(w.uni || '')}"
            onchange="saveWigField('${w.id}','uni',this.value)">
        </div>
        <div class="waefield waefield-num">
          <label class="waelbl">Actual (Sem ${sem})</label>
          <input type="number" class="waeinp" value="${actual}"
            onchange="saveWigActual('${w.id}',parseFloat(this.value)||0)">
        </div>
        <div class="waefield waefield-num">
          <label class="waelbl">Avance sem. ${sem}</label>
          <input type="number" class="waeinp" value="${s.wigSem[w.id] ?? ''}" placeholder="—"
            onchange="saveWigSem('${w.id}',this.value)">
        </div>
        <div class="waefield waefield-uni">
          <label class="waelbl">Unidad avance sem.</label>
          <input type="text" class="waeinp" autocomplete="off" value="${esc(w.uniSem||'')}" placeholder="${esc(w.uni)}"
            onchange="saveWigField('${w.id}','uniSem',this.value)">
        </div>
        <div class="waefield waefield-num">
          <label class="waelbl">Meta semanal</label>
          <input type="number" class="waeinp" value="${w.metaSem ?? ''}" placeholder="auto"
            title="Meta de avance por semana. Si se deja vacío se calcula como (Meta − Inicio) ÷ 53 (semanas del año)."
            onchange="saveWigField('${w.id}','metaSem',this.value===''?null:parseFloat(this.value)||0)">
        </div>
        <div class="waefield waefield-sub">
          <label class="waelbl">Descripción</label>
          <input type="text" class="waeinp" autocomplete="off" value="${esc(w.sub||'')}"
            onchange="saveWigField('${w.id}','sub',this.value)">
        </div>
        <button type="button" class="waeclean" onclick="limpiarWigDatos('${w.id}')" title="Borrar todos los valores capturados de este elemento (el elemento se conserva y deja de contar en los semáforos)">Limpiar</button>
        <button type="button" class="waedel" onclick="delWig('${w.id}')" title="Eliminar elemento">×</button>
      </div>`;
    }).join('');

    return `<div class="wagroup">
      <div class="waghdr">
        <span class="wagnum">MCI ${n}</span>
        <input type="text" class="wagtit-inp" autocomplete="off" value="${esc(tit)}"
          onchange="saveMCITitulo(${n},this.value)" title="Editar título del MCI">
        <button type="button" class="waeadd" onclick="addWigToMCI(${n})">+ Elemento</button>
      </div>
      <div class="waebody">${filas}</div>
    </div>`;
  }).join('');

  // ── MCI contributivos por integrante ─────────────────────────────────────
  const contribHtml = ST.miembros.map(m => {
    const predRows = (m.preds || []).map(p => {
      return `<div class="predrow" data-pid="${p.id}">
        <input type="text" class="predinp predinp-lbl" autocomplete="off"
          value="${esc(p.label||'')}" placeholder="Nombre de la medida"
          onchange="savePredField('${m.id}','${p.id}','label',this.value)">
        <input type="number" class="predinp predinp-num" value="${p.meta}"
          placeholder="Meta" title="Meta"
          onchange="savePredField('${m.id}','${p.id}','meta',parseFloat(this.value)||0)">
        <input type="text" class="predinp predinp-uni" autocomplete="off"
          value="${esc(p.uni||'')}" placeholder="Unidad"
          onchange="savePredField('${m.id}','${p.id}','uni',this.value)">
        <button type="button" class="preddel" onclick="delPred('${m.id}','${p.id}')" title="Eliminar medida">×</button>
      </div>`;
    }).join('');

    const ini = m.nombre.split(' ').map(x => x[0]).join('').slice(0,2).toUpperCase();
    const mciNums = [...new Set(ST.wigs.map(w => w.mci))].sort((a,b) => a-b);
    const alineados = m.mciAlineados || [];
    const mciChecks = mciNums.map(n => {
      const tit = esc(ST.mciTitulos?.[n] || `MCI ${n}`);
      const checked = alineados.includes(n) ? ' checked' : '';
      return `<label class="mci-check-lbl">
        <input type="checkbox" value="${n}"${checked}
          onchange="toggleMciAlineado('${m.id}',${n},this.checked)">
        <span>MCI ${n} · ${tit}</span>
      </label>`;
    }).join('');

    return `<div class="mcont-blk">
      <div class="mcont-hdr">
        <div class="mav" style="background:${m.color};width:30px;height:30px;font-size:11px">${esc(ini)}</div>
        <div>
          <div style="font-size:12px;font-weight:700;color:var(--ink)">${esc(m.nombre)}</div>
          <div style="font-size:10px;color:var(--text-3)">${esc(m.cargo)}</div>
        </div>
      </div>
      <div class="mcont-mci">
        <label class="waelbl">MCI contributivo</label>
        <input type="text" class="waeinp" autocomplete="off"
          value="${esc(m.mci||'')}" placeholder="Descripción del MCI de este integrante"
          onchange="saveMiembroMCI('${m.id}',this.value)">
      </div>
      <div class="mcont-mci" style="margin-top:6px">
        <label class="waelbl">Alineado a MCI general</label>
        <div class="mci-checks-wrap">${mciChecks}</div>
      </div>
      <div class="mcont-preds-hdr">
        <span class="waelbl" style="line-height:2">Medidas predictivas</span>
        <button type="button" class="waeadd" style="font-size:10px;padding:3px 8px"
          onclick="addPredToMiembro('${m.id}')">+ Agregar medida</button>
      </div>
      <div class="mcont-preds" id="preds-${m.id}">
        <div class="predrow predrow-hdr">
          <span class="waelbl" style="flex:1">Medida</span>
          <span class="waelbl" style="width:60px">Meta</span>
          <span class="waelbl" style="width:52px">Unidad</span>
          <span style="width:22px"></span>
        </div>
        ${predRows || '<div style="font-size:11px;color:var(--text-3);padding:6px 2px">Sin medidas — usa "+ Agregar medida"</div>'}
      </div>
    </div>`;
  }).join('');

  document.getElementById('apanel').innerHTML = `
    <div class="acard">
      <div class="achdr">
        <h3>Usuarios del sistema</h3>
        <button type="button" class="bconfirm" style="padding:5px 10px;font-size:11px" onclick="openNewUser()">+ Nuevo usuario</button>
      </div>${usHtml}
    </div>
    <div class="acard">
      <div class="achdr">
        <h3>MCIs generales</h3>
        <button type="button" class="bconfirm" style="padding:5px 10px;font-size:11px" onclick="openMCI()">+ Nuevo MCI</button>
      </div>${mciHtml}
    </div>
    <div class="acard">
      <div class="achdr">
        <h3>MCI contributivos por integrante</h3>
        <button type="button" class="bconfirm" style="padding:5px 10px;font-size:11px" onclick="openContrib()">+ Nuevo MCI contributivo</button>
      </div>
      ${contribHtml}
    </div>`;
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

// ── Gestión MCI admin ─────────────────────────────────────────────────────
function saveMCITitulo(num, titulo) {
  if (!ST.mciTitulos) ST.mciTitulos = {};
  ST.mciTitulos[num] = titulo.trim() || `MCI ${num}`;
  renderTablero();
  guardarConfig();
}

function saveWigField(id, field, val) {
  const w = ST.wigs.find(x => x.id === id);
  if (!w) return;
  w[field] = val;
  renderTablero();
  guardarConfig();
}

function limpiarWigDatos(id) {
  const w = ST.wigs.find(x => x.id === id);
  if (!w) return;
  if (!confirm(`¿Borrar los valores de "${w.label}" en la semana ${sem}?\n\nEl elemento se conserva. Se elimina el registro de esta semana; el semáforo volverá a heredar el valor de la semana anterior (o quedará sin datos si no hay ninguno previo).`)) return;
  limpiarWig(id, sem);
  renderAll();
  guardarSemana(sem);
  toast(`Datos de "${w.label}" borrados (sem ${sem})`);
}

function saveWigActual(id, val) {
  const s = getSem(sem);
  s.wigs[id] = val;
  if (!s.wigsExplicit) s.wigsExplicit = {};
  s.wigsExplicit[id] = true;
  renderTablero();
  guardarSemana(sem);
}

function saveWigSem(id, val) {
  const s = getSem(sem);
  const n = parseFloat(val);
  if (val === '' || val === null) {
    delete s.wigSem[id];
  } else {
    s.wigSem[id] = isNaN(n) ? 0 : n;
  }
  renderTablero();
  guardarSemana(sem);
}

function delWig(id) {
  if (ST.wigs.length <= 1) { toast('Debe quedar al menos un elemento'); return; }
  ST.wigs = ST.wigs.filter(x => x.id !== id);
  renderAdmin();
  renderTablero();
  guardarConfig();
}

function addWigToMCI(mciNum) {
  const tit = ST.mciTitulos?.[mciNum] || `MCI ${mciNum}`;
  ST.wigs.push({ id: uid(), label: 'Nuevo elemento', inicio: 0, meta: 100, uni: '%', mci: mciNum, sub: '' });
  renderAdmin();
  renderTablero();
  guardarConfig();
}

// ── MCI contributivos ─────────────────────────────────────────────────────
function _mciOpts() {
  // Genera opciones para el selector de MCI en medidas predictivas.
  // El "val" usa la primera palabra del título para compatibilidad con datos existentes
  // (ej: 'MCI 1 · Conservación'). Si el usuario renombra el MCI el val se actualiza
  // pero los preds guardados seguirán mostrando su valor original.
  const nums = [...new Set(ST.wigs.map(w => w.mci))].sort((a,b) => a-b);
  const base = nums.map(n => {
    const titulo = ST.mciTitulos?.[n] || `MCI ${n}`;
    const corto  = titulo.split(' ')[0];
    return { val: `MCI ${n} · ${corto}`, lbl: `MCI ${n} · ${titulo}` };
  });
  base.push({ val:'Soporte 4DX', lbl:'Soporte 4DX' });
  base.push({ val:'Ambos MCIs',  lbl:'Ambos MCIs'  });
  // Incluir cualquier valor ya existente en preds que no esté en la lista generada
  const vals = new Set(base.map(o => o.val));
  ST.miembros.forEach(m => (m.preds||[]).forEach(p => {
    if (p.mci && !vals.has(p.mci)) { base.push({ val:p.mci, lbl:p.mci }); vals.add(p.mci); }
  }));
  return base;
}

function saveMiembroMCI(mid, texto) {
  const m = ST.miembros.find(x => x.id === mid);
  if (m) m.mci = texto;
  guardarConfig();
}

function toggleMciAlineado(mid, n, checked) {
  const m = ST.miembros.find(x => x.id === mid);
  if (!m) return;
  if (!m.mciAlineados) m.mciAlineados = [];
  if (checked) { if (!m.mciAlineados.includes(n)) m.mciAlineados.push(n); }
  else { m.mciAlineados = m.mciAlineados.filter(x => x !== n); }
  guardarConfig();
}

function savePredField(mid, pid, field, val) {
  const m = ST.miembros.find(x => x.id === mid);
  if (!m) return;
  const p = (m.preds || []).find(x => x.id === pid);
  if (p) p[field] = val;
  renderTablero();
  guardarConfig();
}

function delPred(mid, pid) {
  const m = ST.miembros.find(x => x.id === mid);
  if (!m) return;
  m.preds = (m.preds || []).filter(x => x.id !== pid);
  renderAdmin();
  renderTablero();
  guardarConfig();
}

function addPredToMiembro(mid) {
  const m = ST.miembros.find(x => x.id === mid);
  if (!m) return;
  if (!m.preds) m.preds = [];
  m.preds.push({ id: uid(), label: 'Nueva medida', meta: 100, uni: '%', mci: 'Ambos MCIs' });
  renderAdmin();
  renderTablero();
  guardarConfig();
}

// ── Modal Nuevo MCI contributivo ──────────────────────────────────────────
function openContrib() {
  document.getElementById('mc-mid').innerHTML =
    ST.miembros.map(m => `<option value="${m.id}">${esc(m.nombre)} — ${esc(m.cargo)}</option>`).join('');
  document.getElementById('mc-nom').value = '';
  document.getElementById('mc-preds-rows').innerHTML = '';
  // Generar checkboxes de MCIs generales
  const mciNums = [...new Set(ST.wigs.map(w => w.mci))].sort((a,b) => a-b);
  document.getElementById('mc-mci-checks').innerHTML = mciNums.map(n => {
    const tit = esc(ST.mciTitulos?.[n] || `MCI ${n}`);
    return `<label class="mci-check-lbl">
      <input type="checkbox" value="${n}">
      <span>MCI ${n} · ${tit}</span>
    </label>`;
  }).join('');
  mcAddPredRow(); // una fila vacía por defecto
  document.getElementById('m-contrib').classList.add('open');
}

function mcAddPredRow() {
  const idx = Date.now();
  const row = document.createElement('div');
  row.className = 'predrow';
  row.dataset.idx = idx;
  row.innerHTML = `
    <input type="text" class="predinp predinp-lbl" autocomplete="off" placeholder="Nombre de la medida">
    <input type="number" class="predinp predinp-num" placeholder="Meta" value="100">
    <input type="text" class="predinp predinp-uni" autocomplete="off" placeholder="%" value="%">
    <button type="button" class="preddel" onclick="this.closest('.predrow').remove()" title="Quitar">×</button>`;
  document.getElementById('mc-preds-rows').appendChild(row);
}

function saveContrib() {
  const mid = document.getElementById('mc-mid').value;
  const nom = document.getElementById('mc-nom').value.trim();
  if (!mid) { toast('Selecciona un integrante'); return; }

  const m = ST.miembros.find(x => x.id === mid);
  if (!m) return;

  // Actualizar MCI contributivo si se capturó nombre
  if (nom) m.mci = nom;

  // Leer checkboxes de alineación a MCIs generales
  const checks = document.querySelectorAll('#mc-mci-checks input[type=checkbox]');
  m.mciAlineados = [];
  checks.forEach(cb => { if (cb.checked) m.mciAlineados.push(parseInt(cb.value)); });

  // Leer todas las filas de medidas del modal
  const filas = document.querySelectorAll('#mc-preds-rows .predrow');
  filas.forEach(row => {
    const label = row.querySelector('.predinp-lbl').value.trim();
    if (!label) return; // omitir filas vacías
    const meta = parseFloat(row.querySelector('.predinp-num').value) || 0;
    const uni  = row.querySelector('.predinp-uni').value.trim();
    if (!m.preds) m.preds = [];
    m.preds.push({ id: uid(), label, meta, uni, mci: 'Ambos MCIs' });
  });

  closeModal('m-contrib');
  renderAdmin();
  renderTablero();
  guardarConfig();
}

function openMCI() { document.getElementById('m-nuevomci').classList.add('open'); }

function saveMCI() {
  const tit  = document.getElementById('mci-tit').value.trim();
  const desc = document.getElementById('mci-desc').value.trim();
  const ini  = parseFloat(document.getElementById('mci-ini').value) || 0;
  const meta = parseFloat(document.getElementById('mci-meta').value) || 100;
  const uni  = document.getElementById('mci-uni').value.trim() || '';
  if (!tit) { toast('Escribe un título'); return; }
  const mciN = Math.max(...ST.wigs.map(w => w.mci), 2) + 1;
  if (!ST.mciTitulos) ST.mciTitulos = {};
  ST.mciTitulos[mciN] = tit;
  ST.wigs.push({ id:'w'+uid(), label:desc || tit, inicio:ini, meta, uni, mci:mciN, sub:desc });
  closeModal('m-nuevomci');
  renderAdmin();
  renderTablero();
  guardarConfig();
}

