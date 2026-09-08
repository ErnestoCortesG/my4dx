// ── Administración · MCIs contributivos por integrante ──
// Construye el bloque por integrante (MCI contributivo + medidas predictivas)
// y gestiona su edición, más el modal "Nuevo MCI contributivo".

function adminContribHTML() {
  const mciNums = [...new Set(ST.wigs.map(w => w.mci))].sort((a,b) => a-b);
  return ST.miembros.map(m => {
    const ini = m.nombre.split(' ').map(x => x[0]).join('').slice(0,2).toUpperCase();

    // Un sub-bloque por MCI contributivo: MCI general(es) al que pertenece +
    // nombre editable + sus medidas.
    const contribBlks = (m.contributivos || []).map(c => {
      const cAl = c.mciAlineados || [];
      const mciChecks = mciNums.map(n => {
        const tit = esc(ST.mciTitulos?.[n] || `MCI ${n}`);
        const checked = cAl.includes(n) ? ' checked' : '';
        return `<label class="mci-check-lbl">
          <input type="checkbox" value="${n}"${checked}
            onchange="toggleContribMci('${m.id}','${c.id}',${n},this.checked)">
          <span>MCI ${n} · ${tit}</span>
        </label>`;
      }).join('');
      const predRows = (c.preds || []).map(p => {
        return `<div class="predrow" data-pid="${p.id}">
          ${p.semanal ? `<div class="waefield waefield-actual" style="margin-right:6px">
            <label class="waelbl">Actual (Sem ${sem})</label>
            <input type="number" class="waeinp" value="${getPredVal(sem, p.id) ?? ''}"
              title="Valor acumulado a esta semana."
              onchange="savePredWeekly('${p.id}',parseFloat(this.value)||0)">
          </div>` : ''}
          <input type="text" class="predinp predinp-lbl" autocomplete="off"
            value="${esc(p.label||'')}" placeholder="Nombre de la medida"
            onchange="savePredField('${m.id}','${c.id}','${p.id}','label',this.value)">
          <input type="number" class="predinp predinp-num" value="${p.meta}"
            placeholder="Meta" title="Meta"
            onchange="savePredField('${m.id}','${c.id}','${p.id}','meta',parseFloat(this.value)||0)">
          <input type="text" class="predinp predinp-uni" autocomplete="off"
            value="${esc(p.uni||'')}" placeholder="Unidad"
            onchange="savePredField('${m.id}','${c.id}','${p.id}','uni',this.value)">
          <button type="button" class="preddel" onclick="delPred('${m.id}','${c.id}','${p.id}')" title="Eliminar medida">×</button>
        </div>`;
      }).join('');

      const body = (c.tipo === 'clavesvend')
        ? clavesVendAdminHTML(c)
        : (c.tipo === 'renovacion')
          ? renovAdminHTML(c)
          : `<div class="mcont-preds">
          <div class="predrow predrow-hdr">
            <span class="waelbl" style="flex:1">Medida</span>
            <span class="waelbl" style="width:60px">Meta</span>
            <span class="waelbl" style="width:52px">Unidad</span>
            <span style="width:22px"></span>
          </div>
          ${predRows || '<div style="font-size:11px;color:var(--text-3);padding:6px 2px">Sin medidas — usa "+ Agregar medida"</div>'}
        </div>
        <button type="button" class="waeadd" style="font-size:10px;padding:3px 8px;margin-top:6px"
          onclick="addPredToContrib('${m.id}','${c.id}')">+ Agregar medida</button>`;

      const mm = c.metaMensual || {};
      const metaMensualHTML = `<div class="ccontrib-mm">
        <label class="mci-check-lbl">
          <input type="checkbox" ${mm.activo ? 'checked' : ''}
            onchange="toggleContribMetaMensual('${m.id}','${c.id}',this.checked)">
          <span>Meta mensual (semáforo)</span>
        </label>
        ${mm.activo ? `<div class="cv-meta-row" style="margin-top:6px">
          <input type="number" class="predinp cv-num" min="0" placeholder="Meta" value="${mm.valor ?? ''}"
            onchange="saveContribMetaMensual('${m.id}','${c.id}','valor',this.value)">
          <input type="text" class="predinp predinp-uni" autocomplete="off" placeholder="Unidad"
            value="${esc(mm.unidad||'')}" onchange="saveContribMetaMensual('${m.id}','${c.id}','unidad',this.value)">
        </div>` : ''}
      </div>`;

      return `<div class="ccontrib-blk">
        <div class="ccontrib-hdr">
          <input type="text" class="waeinp" autocomplete="off"
            value="${esc(c.nombre||'')}" placeholder="Nombre del MCI contributivo"
            onchange="saveContribNombre('${m.id}','${c.id}',this.value)">
          <button type="button" class="waedel" onclick="delContrib('${m.id}','${c.id}')" title="Eliminar este MCI contributivo">×</button>
        </div>
        <div class="ccontrib-mci">
          <label class="waelbl">Pertenece a MCI general</label>
          <div class="mci-checks-wrap">${mciChecks}</div>
        </div>
        ${metaMensualHTML}
        ${body}
      </div>`;
    }).join('');

    return `<div class="mcont-blk">
      <div class="mcont-hdr">
        <div class="mav" style="background:${m.color};width:30px;height:30px;font-size:11px">${esc(ini)}</div>
        <div style="flex:1;display:flex;flex-direction:column;gap:3px;min-width:0">
          <input type="text" class="waeinp" autocomplete="off" value="${esc(m.nombre)}"
            placeholder="Nombre completo" style="font-size:12px;font-weight:700;padding:3px 6px"
            onchange="saveMiembroNombre('${m.id}',this.value)">
          <input type="text" class="waeinp" autocomplete="off" value="${esc(m.cargo || '')}"
            placeholder="Cargo / Área" style="font-size:10px;padding:2px 6px"
            onchange="saveMiembroCargo('${m.id}',this.value)">
        </div>
        <button type="button" class="mcont-del" onclick="delMiembro('${m.id}')" title="Eliminar este integrante y sus medidas">×</button>
      </div>
      <div class="mcont-preds-hdr">
        <span class="waelbl" style="line-height:2">MCI contributivos</span>
        <button type="button" class="waeadd" style="font-size:10px;padding:3px 8px"
          onclick="openContrib('${m.id}')">+ Nuevo MCI contributivo</button>
      </div>
      ${contribBlks || '<div style="font-size:11px;color:var(--text-3);padding:6px 2px">Sin MCI contributivos — usa "+ Nuevo MCI contributivo".</div>'}
    </div>`;
  }).join('');
}

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
  return base;
}

// Renombra un MCI contributivo de un integrante.
function saveContribNombre(mid, cid, texto) {
  const m = ST.miembros.find(x => x.id === mid);
  const c = m && (m.contributivos || []).find(x => x.id === cid);
  if (c) c.nombre = texto;
  renderTablero();
  guardarConfig();
}

// Elimina un MCI contributivo completo (con sus medidas) de un integrante.
async function delContrib(mid, cid) {
  const m = ST.miembros.find(x => x.id === mid);
  const c = m && (m.contributivos || []).find(x => x.id === cid);
  if (!c) return;
  const ok = await confirmar({
    titulo: 'Eliminar MCI contributivo',
    mensaje: `¿Eliminar "${c.nombre || 'este MCI contributivo'}" y sus ${(c.preds||[]).length} medida(s)? Esta acción no se puede deshacer.`,
    ok: 'Eliminar', peligro: true,
  });
  if (!ok) return;
  m.contributivos = (m.contributivos || []).filter(x => x.id !== cid);
  renderAdmin();
  renderTablero();
  guardarConfig();
  toast('MCI contributivo eliminado', 'ok');
}

// Alinea/desalinea un MCI contributivo a un MCI general. La etiqueta del
// integrante se deriva de la unión de estos → refrescar tablero/perfil.
function toggleContribMci(mid, cid, n, checked) {
  const m = ST.miembros.find(x => x.id === mid);
  const c = m && (m.contributivos || []).find(x => x.id === cid);
  if (!c) return;
  if (!c.mciAlineados) c.mciAlineados = [];
  if (checked) { if (!c.mciAlineados.includes(n)) c.mciAlineados.push(n); }
  else { c.mciAlineados = c.mciAlineados.filter(x => x !== n); }
  renderTablero();
  guardarConfig();
}

// Activa/desactiva la meta mensual (semáforo) de un MCI contributivo. Aplica
// de forma genérica a cualquier tipo de contributivo; hoy solo el dashboard
// de "claves de vendedores" (Victoria) la usa para colorear su tarjeta del
// mes en curso — ver clavesVendDashHTML en render-perfil.js.
function toggleContribMetaMensual(mid, cid, checked) {
  const m = ST.miembros.find(x => x.id === mid);
  const c = m && (m.contributivos || []).find(x => x.id === cid);
  if (!c) return;
  if (!c.metaMensual) c.metaMensual = { activo: false, valor: 0, unidad: '' };
  c.metaMensual.activo = !!checked;
  renderAdmin();
  renderPerfil();
  renderTablero();
  guardarConfig();
}

function saveContribMetaMensual(mid, cid, field, val) {
  const m = ST.miembros.find(x => x.id === mid);
  const c = m && (m.contributivos || []).find(x => x.id === cid);
  if (!c) return;
  if (!c.metaMensual) c.metaMensual = { activo: true, valor: 0, unidad: '' };
  if (field === 'valor') c.metaMensual.valor = Math.max(0, parseFloat(val) || 0);
  else if (field === 'unidad') c.metaMensual.unidad = (val || '').trim();
  renderPerfil();
  renderTablero();
  guardarConfig();
}

// Abre el modal para crear un integrante nuevo (nombre, cargo, color).
// La alineación a MCI generales ya no se captura aquí: vive en cada MCI
// contributivo que se agregue después.
function openMiembro() {
  document.getElementById('mi-nom').value   = '';
  document.getElementById('mi-cargo').value = '';
  document.getElementById('mi-color').value = '#041224';
  document.getElementById('m-miembro').classList.add('open');
}

// Crea el integrante en ST.miembros y persiste con guardarConfig().
// La etiqueta se deriva en render (etiquetaMCI) de los MCI de sus contributivos.
function saveMiembro() {
  const nombre = document.getElementById('mi-nom').value.trim();
  const cargo  = document.getElementById('mi-cargo').value.trim();
  const color  = document.getElementById('mi-color').value || '#041224';
  if (!nombre) { toast('Escribe un nombre', 'warn'); return; }
  // Iniciales: 1ª letra de las dos primeras palabras; si es una sola, sus 2 primeras letras.
  const palabras = nombre.split(/\s+/).filter(Boolean);
  const ini = (palabras.length >= 2
    ? palabras[0][0] + palabras[1][0]
    : nombre.slice(0, 2)).toUpperCase();
  ST.miembros.push({ id: uid(), nombre, cargo, ini, color, contributivos: [] });
  closeModal('m-miembro');
  renderAdmin();
  renderTablero();
  guardarConfig();
  toast('Integrante agregado', 'ok');
}

// Edita el NOMBRE de un integrante y propaga el cambio a todo lo relacionado:
// re-deriva las iniciales del avatar y actualiza el "líder" en los compromisos
// guardados (todas las semanas). Sidebar, tablero y perfil se refrescan.
function saveMiembroNombre(mid, val) {
  const m = ST.miembros.find(x => x.id === mid);
  if (!m) return;
  const nuevo = (val || '').trim();
  if (!nuevo) { toast('El nombre no puede quedar vacío', 'warn'); renderAdmin(); return; }
  const viejo = m.nombre;
  if (nuevo === viejo) return;
  m.nombre = nuevo;
  // Re-derivar iniciales del avatar
  const pal = nuevo.split(/\s+/).filter(Boolean);
  m.ini = (pal.length >= 2 ? pal[0][0] + pal[1][0] : nuevo.slice(0, 2)).toUpperCase();
  // Actualizar el líder en los compromisos guardados que referían el nombre viejo
  const tocadas = [];
  Object.entries(ST.semanas || {}).forEach(([wk, s]) => {
    let ch = false;
    (s.comps || []).forEach(c => { if (c.lider === viejo) { c.lider = nuevo; ch = true; } });
    if (ch) tocadas.push(parseInt(wk));
  });
  renderAll();
  guardarConfig();
  tocadas.forEach(k => guardarSemana(k));
  toast('Integrante actualizado', 'ok');
}

// Edita el CARGO/área de un integrante. Se muestra en sidebar, tablero, perfil
// y admin — todos leen ST, así que basta con re-renderizar y persistir.
function saveMiembroCargo(mid, val) {
  const m = ST.miembros.find(x => x.id === mid);
  if (!m) return;
  m.cargo = (val || '').trim();
  renderAll();
  guardarConfig();
}

// Elimina un integrante: su MCI contributivo y todas sus medidas predictivas.
async function delMiembro(mid) {
  const m = ST.miembros.find(x => x.id === mid);
  if (!m) return;
  const nContrib = (m.contributivos || []).length;
  const nPreds = (m.contributivos || []).reduce((t, c) => t + (c.preds || []).length, 0);
  const ok = await confirmar({
    titulo: 'Eliminar integrante',
    mensaje: `¿Eliminar a "${m.nombre}"? Se borran sus ${nContrib} MCI contributivo(s) y ${nPreds} medida(s) predictiva(s). Desaparecerá del panel lateral y del tablero. Esta acción no se puede deshacer.`,
    ok: 'Eliminar', peligro: true,
  });
  if (!ok) return;
  ST.miembros = ST.miembros.filter(x => x.id !== mid);
  if (mActivo === mid) mActivo = 'todos';   // evita quedar en un perfil borrado
  renderAdmin();
  renderTablero();
  guardarConfig();
  toast(`Integrante "${m.nombre}" eliminado`, 'ok');
}

function savePredField(mid, cid, pid, field, val) {
  const m = ST.miembros.find(x => x.id === mid);
  const c = m && (m.contributivos || []).find(x => x.id === cid);
  const p = c && (c.preds || []).find(x => x.id === pid);
  if (p) p[field] = val;
  renderTablero();
  guardarConfig();
}

// Captura semanal manual de una medida predictiva marcada `p.semanal === true`
// (ej. las de Sandra Martínez). El valor se guarda en la semana activa `sem`,
// igual que saveWigActual para los WIGs.
function savePredWeekly(predId, val) {
  const s = getSem(sem);
  if (!s.preds) s.preds = {};
  s.preds[predId] = val;
  renderTablero();
  if (pagina === 'perfil') renderPerfil();
  guardarSemana(sem);
}

async function delPred(mid, cid, pid) {
  const m = ST.miembros.find(x => x.id === mid);
  const c = m && (m.contributivos || []).find(x => x.id === cid);
  if (!c) return;
  const p = (c.preds || []).find(x => x.id === pid);
  const ok = await confirmar({
    titulo: 'Eliminar medida predictiva',
    mensaje: `¿Eliminar la medida${p && p.label ? ` "${p.label}"` : ''}? Se borra junto con sus valores capturados.`,
    ok: 'Eliminar', peligro: true,
  });
  if (!ok) return;
  c.preds = (c.preds || []).filter(x => x.id !== pid);
  renderAdmin();
  renderTablero();
  guardarConfig();
  toast('Medida eliminada', 'ok');
}

function addPredToContrib(mid, cid) {
  const m = ST.miembros.find(x => x.id === mid);
  const c = m && (m.contributivos || []).find(x => x.id === cid);
  if (!c) return;
  if (!c.preds) c.preds = [];
  c.preds.push({ id: uid(), label: 'Nueva medida', meta: 100, uni: '%' });
  renderAdmin();
  renderTablero();
  guardarConfig();
}

// ── Captura semanal · Claves de vendedores (tipo 'clavesvend') ──────────────
// Formulario compacto que se edita semana a semana. La semana activa la marca
// el navegador global (`sem`): la captura aplica a esa semana.
function clavesVendAdminHTML(c) {
  const K = c.clavesvend || (c.clavesvend = { metaTotal: 0, estados: [], semanas: {} });
  const estados = K.estados || [], wk = K.semanas?.[sem] || {};
  const rango = SEMANAS[sem] || '';
  const rows = estados.length
    ? estados.map(e => `<div class="cv-row">
        <input type="text" class="predinp cv-est" autocomplete="off" value="${esc(e)}"
          title="Renombrar estado/provincia"
          onchange="renameClavesVendEstado('${c.id}',${esc(JSON.stringify(e))},this.value)">
        <input type="number" class="predinp cv-num" min="0" value="${Number(wk[e]) || 0}"
          title="Claves de la semana" onchange="setClavesVendCount('${c.id}',${sem},${esc(JSON.stringify(e))},this.value)">
        <button type="button" class="preddel" title="Quitar estado"
          onclick="delClavesVendEstado('${c.id}',${esc(JSON.stringify(e))})">×</button>
      </div>`).join('')
    : '<div style="font-size:11px;color:var(--text-3);padding:6px 2px">Sin estados — agrega uno abajo.</div>';
  return `<div class="cv-admin">
    <div class="cv-meta-row">
      <label class="waelbl">Meta total (año)</label>
      <input type="number" class="predinp cv-num" min="0" value="${Number(K.metaTotal) || 0}"
        onchange="saveClavesVendMeta('${c.id}',this.value)">
    </div>
    <div class="cv-wk-hdr">Captura de <b>Sem ${sem}</b>${rango ? ` · ${esc(rango)}` : ''} <span>(usa el navegador de semanas)</span></div>
    <div class="cv-rows">
      <div class="cv-row cv-row-hdr">
        <span class="waelbl" style="flex:1">Estado/Provincia</span>
        <span class="waelbl" style="width:60px">Claves</span>
        <span style="width:22px"></span>
      </div>
      ${rows}
    </div>
    <div class="cv-add">
      <input type="text" class="predinp cv-add-inp" id="cv-add-${c.id}" autocomplete="off"
        placeholder="Nuevo estado/provincia"
        onkeydown="if(event.key==='Enter'){event.preventDefault();addClavesVendEstado('${c.id}',this.value);this.value='';}">
      <button type="button" class="waeadd" style="font-size:10px;padding:3px 8px"
        onclick="var i=document.getElementById('cv-add-${c.id}');addClavesVendEstado('${c.id}',i.value);i.value='';">+ Agregar estado</button>
    </div>
  </div>`;
}

// Localiza un contributivo por id en cualquier integrante.
function _findClavesVend(cid) {
  for (const m of ST.miembros) {
    const c = (m.contributivos || []).find(x => x.id === cid);
    if (c) { if (!c.clavesvend) c.clavesvend = { metaTotal: 0, estados: [], semanas: {} }; return c; }
  }
  return null;
}

function saveClavesVendMeta(cid, val) {
  const c = _findClavesVend(cid); if (!c) return;
  c.clavesvend.metaTotal = Math.max(0, parseFloat(val) || 0);
  renderPerfil();
  guardarConfig();
}

function setClavesVendCount(cid, semN, estado, val) {
  const c = _findClavesVend(cid); if (!c) return;
  const K = c.clavesvend;
  if (!K.semanas[semN]) K.semanas[semN] = {};
  const n = Math.max(0, parseFloat(val) || 0);
  if (n > 0) K.semanas[semN][estado] = n;
  else delete K.semanas[semN][estado];
  renderPerfil();
  guardarConfig();
}

function addClavesVendEstado(cid, estado) {
  const c = _findClavesVend(cid); if (!c) return;
  const nombre = (estado || '').trim();
  if (!nombre) { toast('Escribe un estado', 'warn'); return; }
  const K = c.clavesvend;
  if (!K.estados.includes(nombre)) K.estados.push(nombre);
  renderAdmin();
  renderPerfil();
  guardarConfig();
}

async function delClavesVendEstado(cid, estado) {
  const c = _findClavesVend(cid); if (!c) return;
  const ok = await confirmar({
    titulo: 'Quitar estado',
    mensaje: `¿Quitar "${estado}" y sus claves capturadas en todas las semanas?`,
    ok: 'Quitar', peligro: true,
  });
  if (!ok) return;
  const K = c.clavesvend;
  K.estados = K.estados.filter(x => x !== estado);
  Object.values(K.semanas).forEach(wk => { delete wk[estado]; });
  renderAdmin();
  renderPerfil();
  guardarConfig();
  toast('Estado quitado', 'ok');
}

function renameClavesVendEstado(cid, oldName, newName) {
  const c = _findClavesVend(cid); if (!c) return;
  const nuevo = (newName || '').trim();
  const K = c.clavesvend;
  if (!nuevo) { toast('El nombre no puede quedar vacío', 'warn'); renderAdmin(); return; }
  if (nuevo === oldName) return;
  if (K.estados.includes(nuevo)) { toast('Ya existe ese estado', 'warn'); renderAdmin(); return; }
  const i = K.estados.indexOf(oldName);
  if (i < 0) return;
  K.estados[i] = nuevo;
  Object.values(K.semanas).forEach(wk => {
    if (wk[oldName] !== undefined) { wk[nuevo] = wk[oldName]; delete wk[oldName]; }
  });
  renderAdmin();
  renderPerfil();
  guardarConfig();
}

// ── Modal Nuevo MCI contributivo ──
// Crea SIEMPRE un contributivo nuevo en el integrante elegido (no sobre-escribe
// los existentes). Se abre desde el botón dentro del bloque de cada integrante,
// que preselecciona ese integrante (preMid) para no agregarlo al equivocado.
function openContrib(preMid) {
  document.getElementById('mc-mid').innerHTML =
    ST.miembros.map(m => `<option value="${m.id}">${esc(m.nombre)} — ${esc(m.cargo)}</option>`).join('');
  if (preMid) document.getElementById('mc-mid').value = preMid;
  document.getElementById('mc-nom').value = '';
  document.getElementById('mc-preds-rows').innerHTML = '';
  // Checkboxes: a qué MCI general(es) pertenece este contributivo
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
  if (!mid) { toast('Selecciona un integrante', 'warn'); return; }
  if (!nom) { toast('Escribe el nombre del MCI contributivo', 'warn'); return; }

  const m = ST.miembros.find(x => x.id === mid);
  if (!m) return;

  // Construir las medidas nuevas desde las filas del modal
  const preds = [];
  document.querySelectorAll('#mc-preds-rows .predrow').forEach(row => {
    const label = row.querySelector('.predinp-lbl').value.trim();
    if (!label) return; // omitir filas vacías
    const meta = parseFloat(row.querySelector('.predinp-num').value) || 0;
    const uni  = row.querySelector('.predinp-uni').value.trim();
    preds.push({ id: uid(), label, meta, uni });
  });

  // MCI general(es) al que pertenece este contributivo
  const mciAlineados = [...document.querySelectorAll('#mc-mci-checks input:checked')]
    .map(cb => parseInt(cb.value));

  // Crear SIEMPRE un contributivo nuevo (nunca sobre-escribe los existentes)
  if (!m.contributivos) m.contributivos = [];
  m.contributivos.push({ id: uid(), nombre: nom, mciAlineados, preds });

  closeModal('m-contrib');
  renderAdmin();
  renderTablero();
  guardarConfig();
  toast('MCI contributivo agregado', 'ok');
}

// ── Captura manual · Renovación (tipo 'renovacion', ej. Sandra Martínez) ────
// Las GERENCIAS se definen UNA sola vez (catálogo) y ya no se repiten por
// mes. Lo único que se captura periódicamente es, por gerencia, su base y
// % 1er recibo de la SEMANA en curso (usa el navegador de semanas global,
// igual que "claves de vendedores" o los WIGs) — cada captura SUSTITUYE a la
// anterior, nunca se acumula. La vista por mes del perfil (render-perfil.js)
// reconstruye cada mes a partir de estas capturas semanales, así que el
// filtro de mes existente sigue funcionando igual, solo que ya no hay que
// re-teclear las gerencias cada mes. "Maduro" (si el 1er recibo de un mes ya
// se cobró) sigue siendo un juicio manual — no se puede derivar de los
// números — y se marca por mes con un checkbox aparte.

// Localiza un MCI contributivo por id en cualquier integrante.
function _findContrib(cid) {
  for (const m of ST.miembros) {
    const c = (m.contributivos || []).find(x => x.id === cid);
    if (c) return c;
  }
  return null;
}

function saveRenovMeta(cid, val) {
  const c = _findContrib(cid); if (!c) return;
  if (!c.dash) c.dash = { meta: 75, gerencias: [], madurez: {} };
  c.dash.meta = Math.max(0, parseFloat(val) || 0);
  renderPerfil();
  guardarConfig();
}

// Marca/desmarca un mes calendario (1–12) como "maduro". No tiene sentido
// marcar un mes futuro a la semana en vista, así que esos llegan deshabilitados.
function toggleRenovMaduro(cid, mNum, checked) {
  const c = _findContrib(cid); if (!c) return;
  if (!c.dash) c.dash = { meta: 75, gerencias: [], madurez: {} };
  if (!c.dash.madurez) c.dash.madurez = {};
  c.dash.madurez[mNum] = !!checked;
  renderPerfil();
  guardarConfig();
}

// ── Catálogo de gerencias (se define una sola vez, no por mes) ─────────────
function addRenovGerencia(cid) {
  const c = _findContrib(cid); if (!c) return;
  if (!c.dash) c.dash = { meta: 75, gerencias: [], madurez: {} };
  if (!c.dash.gerencias) c.dash.gerencias = [];
  c.dash.gerencias.push({ id: uid(), nombre: 'Nueva gerencia', acro: '' });
  renderAdmin();
  guardarConfig();
}

function saveRenovGerenciaField(cid, gerId, field, val) {
  const c = _findContrib(cid); if (!c) return;
  const g = (c.dash?.gerencias || []).find(x => x.id === gerId);
  if (!g) return;
  g[field] = val;
  renderPerfil();
  guardarConfig();
}

async function delRenovGerencia(cid, gerId) {
  const c = _findContrib(cid); if (!c) return;
  const g = (c.dash?.gerencias || []).find(x => x.id === gerId);
  if (!g) return;
  const ok = await confirmar({
    titulo: 'Quitar gerencia',
    mensaje: `¿Quitar "${esc(g.nombre || 'esta gerencia')}" del catálogo? Su historial de capturas semanales deja de mostrarse (no cuenta más en el perfil).`,
    ok: 'Quitar', peligro: true,
  });
  if (!ok) return;
  c.dash.gerencias = c.dash.gerencias.filter(x => x.id !== gerId);
  renderAdmin();
  renderPerfil();
  guardarConfig();
  toast('Gerencia quitada', 'ok');
}

// ── Captura SEMANAL por gerencia (sustituye, no se acumula) ────────────────
// Igual patrón que saveWigActual: escribe en la semana activa `sem` y guarda
// ese documento de semana (no el config), consistente con el resto de la app.
function saveRenovGerWeekly(cid, gerId, field, val) {
  const c = _findContrib(cid); if (!c) return;
  const s = getSem(sem);
  if (!s.renov) s.renov = {};
  if (!s.renov[gerId]) s.renov[gerId] = {};
  s.renov[gerId][field] = parseFloat(val) || 0;
  renderPerfil();
  guardarSemana(sem);
}

function renovAdminHTML(c) {
  const dash = c.dash || (c.dash = { meta: 75, gerencias: [], madurez: {} });
  if (!dash.gerencias) dash.gerencias = [];
  if (!dash.madurez)   dash.madurez   = {};
  const mesVista = _renovMesVistaIdx();
  const rango = SEMANAS[sem] || '';

  const gerCatalogRows = dash.gerencias.map(g => `<div class="rg-row" data-gid="${g.id}">
      <input type="text" class="predinp rg-nom" autocomplete="off" value="${esc(g.nombre || '')}" placeholder="Gerencia"
        onchange="saveRenovGerenciaField('${c.id}','${g.id}','nombre',this.value)">
      <input type="text" class="predinp rg-acro" autocomplete="off" value="${esc(g.acro || '')}" placeholder="Acrónimo"
        onchange="saveRenovGerenciaField('${c.id}','${g.id}','acro',this.value)">
      <button type="button" class="preddel" title="Quitar gerencia" onclick="delRenovGerencia('${c.id}','${g.id}')">×</button>
    </div>`).join('')
    || '<div style="font-size:11px;color:var(--text-3);padding:4px 2px">Sin gerencias — agrega una abajo.</div>';

  const madurezChips = MESES_LARGO.map((nm, i) => {
    const m = i + 1, futuro = m > mesVista;
    return `<label class="renov-maduro-chip ${futuro ? 'dim' : ''}" ${futuro ? 'title="Aún no llega esa semana en la vista actual"' : ''}>
      <input type="checkbox" ${dash.madurez[m] ? 'checked' : ''} ${futuro ? 'disabled' : ''}
        onchange="toggleRenovMaduro('${c.id}',${m},this.checked)">
      ${MESES_CORTOS[i]}
    </label>`;
  }).join('');

  const capRows = dash.gerencias.length ? dash.gerencias.map(g => {
    const wkBase = getRenovVal(sem, g.id, 'base');
    const wkPct  = getRenovVal(sem, g.id, 'pct');
    return `<div class="rg-row" data-gid="${g.id}">
      <span class="rg-cap-nom">${esc(g.nombre || '(sin nombre)')}</span>
      <input type="number" class="predinp rg-num" value="${wkBase ?? ''}" placeholder="Base" title="Base renovable"
        onchange="saveRenovGerWeekly('${c.id}','${g.id}','base',this.value)">
      <input type="number" class="predinp rg-num" step="0.1" value="${wkPct ?? ''}" placeholder="%" title="% 1er recibo"
        onchange="saveRenovGerWeekly('${c.id}','${g.id}','pct',this.value)">
    </div>`;
  }).join('') : '<div style="font-size:11px;color:var(--text-3);padding:6px 2px">Agrega gerencias arriba para poder capturar la semana.</div>';

  return `<div class="renov-admin">
    <div class="cv-meta-row">
      <label class="waelbl">Meta de renovación (%)</label>
      <input type="number" class="predinp cv-num" min="0" max="100" value="${dash.meta ?? 75}"
        onchange="saveRenovMeta('${c.id}',this.value)">
    </div>

    <div class="waelbl" style="margin:10px 0 4px">Gerencias (catálogo — se define una sola vez)</div>
    <div class="rg-rows">
      <div class="rg-row rg-row-hdr">
        <span class="waelbl" style="flex:1">Gerencia</span>
        <span class="waelbl" style="width:70px">Acrónimo</span>
        <span style="width:22px"></span>
      </div>
      ${gerCatalogRows}
    </div>
    <button type="button" class="waeadd" style="font-size:10px;padding:3px 8px;margin-top:6px"
      onclick="addRenovGerencia('${c.id}')">+ Agregar gerencia</button>

    <div class="waelbl" style="margin:14px 0 4px">Meses maduros (1er recibo ya cobrado)</div>
    <div class="renov-maduro-chips">${madurezChips}</div>

    <div class="cv-wk-hdr">Captura de <b>Sem ${sem}</b>${rango ? ` · ${esc(rango)}` : ''} <span>(usa el navegador de semanas)</span></div>
    <div class="rg-rows">
      <div class="rg-row rg-row-hdr">
        <span class="waelbl" style="flex:1">Gerencia</span>
        <span class="waelbl" style="width:70px">Base</span>
        <span class="waelbl" style="width:70px">% 1er recibo</span>
      </div>
      ${capRows}
    </div>
  </div>`;
}
