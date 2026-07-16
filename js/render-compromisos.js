// ── Vista Compromisos — extraído de render.js (v2.3) ──

// ── Compromisos ────────────────────────────────────────────────────────────
function renderCompromisos() {
  const s = getSem(sem);
  let cs = s.comps || [];
  if (mActivo !== 'todos') {
    const m = ST.miembros.find(x => x.id === mActivo);
    if (m) cs = cs.filter(c => c.lider.split(' ')[0] === m.nombre.split(' ')[0]);
  }
  const tit = mActivo === 'todos'
    ? `Todos · Semana ${sem}`
    : `${ST.miembros.find(x => x.id === mActivo)?.nombre || ''} · Semana ${sem}`;
  document.getElementById('ctit').textContent = tit;

  const gs = ['MCI 1 · Conservación', 'MCI 2 · Recluta', 'Soporte 4DX', 'Ambos MCIs'];
  const cols = { 'MCI 1 · Conservación':'#2d6a4f', 'MCI 2 · Recluta':'#1B3A6B', 'Soporte 4DX':'#e65100', 'Ambos MCIs':'#6a1b9a' };

  const html = gs.map(g => {
    const items = cs.filter(c => c.mci === g);
    if (!items.length) return '';
    const cum   = items.filter(c => c.done).length;
    const ihtml = items.map(c => {
      const pc = isAdmin() || (su?.rol === 'integrante' && c.lider.split(' ')[0] === su?.nombre.split(' ')[0]);
      const pd = isAdmin();
      const saved    = !!(c.prueba && c.prueba.trim());
      const pruebaHtml = c.done && pc ? `
        <div class="cprueba">
          <input class="prueba-inp" id="prueba-${c.id}"
            type="text" autocomplete="off"
            placeholder="Describe la prueba de cumplimiento…"
            value="${esc(c.prueba || '')}"
            ${saved ? 'disabled' : ''}>
          <button type="button" class="prueba-btn" id="pbtn-save-${c.id}"
            style="${saved ? 'display:none' : ''}"
            onclick="savePrueba('${c.id}')">Guardar</button>
          <button type="button" class="prueba-btn prueba-edit" id="pbtn-edit-${c.id}"
            style="${saved ? '' : 'display:none'}"
            onclick="editPrueba('${c.id}')">Editar</button>
        </div>` : (c.done && c.prueba ? `
        <div class="cprueba-ro">
          <span class="prueba-lbl">Prueba:</span> ${esc(c.prueba)}
        </div>` : '');
      return `<div class="citem">
        <div class="chk${c.done ? ' done' : ''}" ${pc ? `onclick="togComp('${c.id}')"` : 'style="cursor:default"'}>
          <svg width="10" height="8" viewBox="0 0 10 8">
            <path d="M1 4L4 7L9 1" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="cbody">
          <div class="clider">${esc(c.lider)}</div>
          <div class="ctxt${c.done ? ' dt' : ''}">${esc(c.txt)}</div>
          ${pruebaHtml}
        </div>
        ${pd ? `<button class="delbtn" onclick="delComp('${c.id}')">×</button>` : ''}
      </div>`;
    }).join('');

    let add = '';
    if (isAdmin()) {
      add = `<div class="addrow">
        <input class="ainp" placeholder="Nuevo compromiso…" id="qi-${g.replace(/[\s·]/g,'_')}">
        <select class="asel" id="ql-${g.replace(/[\s·]/g,'_')}">
          ${ST.miembros.map(m => `<option value="${esc(m.nombre)}">${esc(m.nombre.split(' ')[0])}</option>`).join('')}
        </select>
        <button class="badd" onclick="qAdd('${g}')">+</button>
      </div>`;
    } else if (su?.rol === 'integrante' && mciParaIntegrante().includes(g)) {
      add = `<div class="addrow">
        <input class="ainp" placeholder="Mi compromiso…" id="qi-${g.replace(/[\s·]/g,'_')}">
        <button class="badd" onclick="qAddSelf('${g}')">+</button>
      </div>`;
    }
    return `<div class="cblock">
      <div class="chdr">
        <h3 style="color:${cols[g]}">${g}</h3>
        <span class="badge ${cum === items.length ? 'bg' : cum > 0 ? 'by' : 'br'}">${cum}/${items.length}</span>
      </div>${ihtml}${add}
    </div>`;
  }).join('');

  document.getElementById('clist').innerHTML =
    html || '<div style="padding:20px;color:var(--text-3);text-align:center">Sin compromisos registrados.</div>';
}

function savePrueba(id) {
  const inp = document.getElementById('prueba-' + id);
  if (!inp) return;
  const c = getSem(sem).comps.find(x => x.id === id);
  if (!c) return;
  c.prueba = inp.value.trim();
  inp.disabled = true;
  document.getElementById('pbtn-save-' + id).style.display = 'none';
  document.getElementById('pbtn-edit-' + id).style.display = '';
  guardarSemana(sem);
  toast('Prueba guardada ✓');
}

function editPrueba(id) {
  const inp = document.getElementById('prueba-' + id);
  if (!inp) return;
  inp.disabled = false;
  inp.focus();
  inp.setSelectionRange(inp.value.length, inp.value.length);
  document.getElementById('pbtn-save-' + id).style.display = '';
  document.getElementById('pbtn-edit-' + id).style.display = 'none';
}

function togComp(id) {
  const s = getSem(sem), c = s.comps.find(x => x.id === id);
  if (!c) return;
  if (!isAdmin() && c.lider.split(' ')[0] !== su?.nombre.split(' ')[0]) {
    toast('Solo puedes marcar tus propios compromisos'); return;
  }
  c.done = !c.done;
  renderAll();
  guardarSemana(sem);
}

async function delComp(id) {
  if (!isAdmin()) return;
  const s = getSem(sem);
  const c = (s.comps || []).find(x => x.id === id);
  const ok = await confirmar({
    titulo: 'Eliminar compromiso',
    mensaje: `¿Eliminar este compromiso${c && c.lider ? ` de ${c.lider}` : ''}?`,
    ok: 'Eliminar', peligro: true,
  });
  if (!ok) return;
  s.comps = s.comps.filter(x => x.id !== id);
  renderAll();
  guardarSemana(sem);
  toast('Compromiso eliminado', 'ok');
}

function qAdd(mci) {
  if (!isAdmin()) return;
  const k   = mci.replace(/[\s·]/g, '_');
  const txt = document.getElementById('qi-' + k)?.value?.trim();
  const lid = document.getElementById('ql-' + k)?.value;
  if (!txt) return;
  getSem(sem).comps.push({ id:uid(), lider:lid, mci, txt, done:false });
  renderAll();
  guardarSemana(sem);
}

function qAddSelf(mci) {
  if (!canComp()) return;
  const k   = mci.replace(/[\s·]/g, '_');
  const txt = document.getElementById('qi-' + k)?.value?.trim();
  if (!txt) return;
  getSem(sem).comps.push({ id:uid(), lider:su.nombre, mci, txt, done:false });
  renderAll();
  guardarSemana(sem);
}

// Devuelve los grupos MCI a los que puede comprometerse un integrante,
// derivado de los valores únicos de preds[].mci de su miembro asociado.
// Si no hay miembro asociado o es admin, devuelve todos los grupos.
function mciParaIntegrante() {
  const ALL = _mciOpts().map(o => o.val);
  if (!su || su.rol !== 'integrante' || !su.mid) return ALL;
  const m = ST.miembros.find(x => x.id === su.mid);
  if (!m) return ALL;
  const unicos = [...new Set((m.preds || []).map(p => p.mci))];
  // Incluir 'Ambos MCIs' si el miembro tiene preds en más de un MCI numerado
  const mciNumerados = unicos.filter(v => /^MCI \d/.test(v));
  if (mciNumerados.length > 1 && !unicos.includes('Ambos MCIs')) unicos.push('Ambos MCIs');
  return ALL.filter(g => unicos.includes(g));
}

function openModalComp() {
  document.getElementById('m-lider').innerHTML =
    ST.miembros.map(m => `<option value="${esc(m.nombre)}">${esc(m.nombre)}</option>`).join('');
  document.getElementById('m-lider-row').style.display = su?.rol === 'integrante' ? 'none' : '';
  // Filtrar opciones de MCI según el integrante
  const permitidos = mciParaIntegrante();
  document.getElementById('m-mci').innerHTML = permitidos
    .map(g => `<option value="${g}">${g}</option>`).join('');
  document.getElementById('m-comp').classList.add('open');
}

function addComp() {
  if (!canComp()) return;
  const lid = su?.rol === 'integrante' ? su.nombre : document.getElementById('m-lider').value;
  const mci = document.getElementById('m-mci').value;
  const txt = document.getElementById('m-texto').value.trim();
  if (!txt) return;
  getSem(sem).comps.push({ id:uid(), lider:lid, mci, txt, done:false });
  closeModal('m-comp');
  document.getElementById('m-texto').value = '';
  renderAll();
  guardarSemana(sem);
}

