// ── Administración · MCIs contributivos por integrante ──
// Construye el bloque por integrante (MCI contributivo + medidas predictivas)
// y gestiona su edición, más el modal "Nuevo MCI contributivo".

function adminContribHTML() {
  return ST.miembros.map(m => {
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

// ── Modal Nuevo MCI contributivo ──
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
