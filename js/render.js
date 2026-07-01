// ── Orquestador ───────────────────────────────────────────────────────────
function renderAll() {
  document.getElementById('wlbl').textContent = 'Sem ' + sem + ' · ' + (SEMANAS[sem] || '');
  renderSidebar();
  if (pagina === 'tablero')      renderTablero();
  if (pagina === 'compromisos')  renderCompromisos();
  if (pagina === 'scores')       renderScores();
  if (pagina === 'admin')        renderAdmin();
}

// ── Sidebar ────────────────────────────────────────────────────────────────
function renderSidebar() {
  const s = getSem(sem), cs = s.comps || [];
  document.getElementById('sb-members').innerHTML = ST.miembros.map(m => {
    // Match por primer apellido para tolerar "Zvi Mitrani" vs "Zvi" en compromisos legacy
    const mine = cs.filter(c => c.lider.split(' ')[0] === m.nombre.split(' ')[0]);
    const pct  = mine.length ? Math.round(mine.filter(c => c.done).length / mine.length * 100) : null;
    const dc   = pct === null ? 'dg' : pct >= 80 ? 'dg' : pct >= 50 ? 'dy' : 'dr';
    const isA  = mActivo === m.id;
    return `<div class="mcard${isA ? ' active' : ''}" id="card-${m.id}" onclick="selectM('${m.id}')">
      <div class="mav" style="background:${m.color}">${m.ini}</div>
      <div class="minfo">
        <div class="mname">${m.nombre.split(' ').slice(0, 2).join(' ')}</div>
        <div class="mcargo">${m.cargo.split('·')[0].trim()}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:3px">
        ${pct !== null ? `<span style="font-size:12px;font-weight:800;color:#fff">${pct}%</span>` : ''}
        <div class="mdot ${dc}"></div>
      </div>
    </div>`;
  }).join('');
  if (mActivo === 'todos') document.getElementById('card-todos')?.classList.add('active');
}

// ── Tablero (WIGs + predictivas) ──────────────────────────────────────────
function renderTablero() {
  const s = getSem(sem);

  // Cabecera de miembro seleccionado
  const box = document.getElementById('mhdr-box');
  if (mActivo === 'todos') {
    box.innerHTML = '';
  } else {
    const m = ST.miembros.find(x => x.id === mActivo);
    if (!m) { box.innerHTML = ''; } else {
      const cs  = (s.comps || []).filter(c => c.lider.split(' ')[0] === m.nombre.split(' ')[0]);
      const pct = cs.length ? Math.round(cs.filter(c => c.done).length / cs.length * 100) : 0;
      const sc  = pct >= 80 ? '#4CAF50' : pct >= 50 ? '#FFC107' : '#E8220A';
      box.innerHTML = `<div class="mhdr">
        <div class="mhdr-av" style="background:${m.color}">${m.ini}</div>
        <div class="mhdr-info">
          <div class="mhdr-name">${m.nombre}</div>
          <div class="mhdr-cargo">${m.cargo}</div>
          <div class="mhdr-mci">${m.mci}</div>
          <span class="tag ${m.tc}" style="margin-top:6px;display:inline-block">${m.tag}</span>
        </div>
        <div class="mhdr-score">
          <div class="snum" style="color:${sc}">${pct}</div>
          <div style="font-size:16px;color:${sc};margin-top:-4px">%</div>
          <div class="sbarw"><div class="sbarf" style="width:${pct}%;background:${sc}"></div></div>
          <div class="slbl" style="margin-top:3px">score sem. ${sem}</div>
        </div>
      </div>`;
    }
  }

  // Tarjetas resumen
  const cs   = s.comps || [];
  const tot  = cs.length, dn = cs.filter(c => c.done).length;
  const pct2 = tot ? Math.round(dn / tot * 100) : 0;
  const cg   = parseFloat(s.wigs['cg'] ?? 55.36);
  const cl   = parseFloat(s.wigs['cl'] ?? 591);
  const prev = sem > 1 ? getSem(sem - 1) : null;
  const cgp  = prev ? parseFloat(prev.wigs['cg'] ?? 55.36) : 55.36;
  const dl   = (cg - cgp).toFixed(2);
  document.getElementById('scards').innerHTML = `
    <div class="scard">
      <div class="slabel">Conservación global</div>
      <div class="sval ${cg >= 70 ? 'g' : ''}">${cg}%</div>
      <div class="ssub">Meta: 70% · inicio: 55.36%</div>
      <div class="sdelta ${dl >= 0 ? 'up' : 'dn'}">${dl >= 0 ? '+' : ''}${dl} pts vs sem. anterior</div>
    </div>
    <div class="scard">
      <div class="slabel">Claves nuevas acum.</div>
      <div class="sval ${cl >= 1000 ? 'g' : ''}">${cl}</div>
      <div class="ssub">Meta: 1,000 · 35% en prod. 90d</div>
    </div>
    <div class="scard">
      <div class="slabel">Compromisos sem. ${sem}</div>
      <div class="sval ${pct2 >= 80 ? 'g' : pct2 >= 50 ? '' : 'r'}">${pct2}%</div>
      <div class="ssub">${dn} de ${tot} cumplidos</div>
    </div>
    <div class="scard">
      <div class="slabel">Semana de ejecución</div>
      <div class="sval">${sem}</div>
      <div class="ssub">de 27 · Cierre 31 dic 2026</div>
    </div>`;

  // Bloques MCI
  const ro = !canEdit();
  function mciBloque(num, tit, ws) {
    const rows = ws.map(w => {
      const a  = parseFloat(s.wigs[w.id] ?? w.inicio);
      const av = Math.min(100, Math.max(0, Math.round((a - w.inicio) / (w.meta - w.inicio) * 100)));
      const pt = Math.min(100, Math.round(a / w.meta * 100));
      const fc = av >= 70 ? 'fg' : av >= 40 ? 'fy' : 'fr';
      const bc = av >= 70 ? 'bg' : av >= 40 ? 'by' : 'br';
      const bt = av >= 70 ? 'Verde' : av >= 40 ? 'Amarillo' : 'Rojo';
      return `<div class="wrow">
        <div class="wtop"><span class="wnombre">${w.label}</span><span class="badge ${bc}">${bt}</span></div>
        <div style="display:flex;align-items:baseline;gap:6px;margin-bottom:3px">
          <span class="wactual">${a}${w.uni}</span><span class="wmeta">→ meta ${w.meta}${w.uni}</span>
        </div>
        <div class="pbg"><div class="pfill ${fc}" style="width:${pt}%"></div></div>
        <div class="wfoot">
          <span>inicio: ${w.inicio}${w.uni}</span><span>${w.sub || ''}</span><span>${av}% avance</span>
        </div>
      </div>`;
    }).join('');
    const avgs = ws.map(w => {
      const a = parseFloat(s.wigs[w.id] ?? w.inicio);
      return Math.round((a - w.inicio) / (w.meta - w.inicio) * 100);
    });
    const avg = Math.round(avgs.reduce((a, b) => a + b, 0) / avgs.length);
    const bc  = avg >= 70 ? 'bg' : avg >= 40 ? 'by' : 'br';
    const em  = avg >= 70 ? '🟢' : avg >= 40 ? '🟡' : '🔴';
    const et  = avg >= 70 ? 'Verde' : avg >= 40 ? 'Amarillo' : 'Rojo';
    return `<div class="mci-block">
      <div class="mci-hdr">
        <div class="mci-num">${num}</div>
        <div class="mci-tit">${tit}</div>
        <span class="badge ${bc}">${em} ${et}</span>
      </div>${rows}
    </div>`;
  }
  const mciNums = [...new Set(ST.wigs.map(w => w.mci))].sort((a,b) => a-b);
  document.getElementById('twigs').innerHTML =
    mciNums.map(n => mciBloque(n, ST.mciTitulos?.[n] || `MCI ${n}`, ST.wigs.filter(w => w.mci === n))).join('');

  // Predictivas
  const areas = mActivo === 'todos'
    ? ST.miembros
    : [ST.miembros.find(m => m.id === mActivo)].filter(Boolean);
  const tit2 = 'MCI contributivo y medidas predictivas';
  const div = `<div class="divisor">
    <div class="divisor-line"></div>
    <div class="divisor-pill">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>${tit2}
    </div>
    <div class="divisor-line rev"></div>
  </div>`;
  const bl = areas.map(m => {
    // Score de predictivas del miembro: promedio de avance de todas sus preds con valor
    const predAvgs = m.preds.map(p => {
      const n = parseFloat(s.preds[p.id]) || 0;
      return n ? Math.min(100, Math.round(n / p.meta * 100)) : null;
    }).filter(x => x !== null);
    const predScore = predAvgs.length
      ? Math.round(predAvgs.reduce((a, b) => a + b, 0) / predAvgs.length)
      : null;
    const sc  = predScore === null ? '#aaa' : predScore >= 80 ? '#4CAF50' : predScore >= 50 ? '#FFC107' : '#E8220A';
    const sem2 = predScore === null ? '—' : predScore >= 80 ? '🟢' : predScore >= 50 ? '🟡' : '🔴';

    const rows = m.preds.map(p => {
      const v  = s.preds[p.id] || '', n = parseFloat(v) || 0;
      const pc = n ? Math.min(100, Math.round(n / p.meta * 100)) : 0;
      const fc = pc >= 80 ? 'fg' : pc >= 50 ? 'fy' : 'fr';
      const bc = pc >= 80 ? 'bg' : pc >= 50 ? 'by' : 'br';
      const mt = p.mci === 'MCI 1 · Conservación' ? 'tc'
               : p.mci === 'MCI 2 · Recluta'       ? 'tr'
               : p.mci === 'Soporte 4DX'            ? 'ts' : 'ta';
      const ml = p.mci === 'MCI 1 · Conservación' ? 'Cons.'
               : p.mci === 'MCI 2 · Recluta'       ? 'Recluta'
               : p.mci === 'Soporte 4DX'            ? 'Soporte' : 'Ambos';
      const inp = ro
        ? `<span style="font-size:12px;font-weight:600">${v || '—'}${p.uni}</span>`
        : `<input class="pinp" type="number" value="${v}" placeholder="—"
             onchange="updPred('${p.id}',this.value)">
           <span style="font-size:10px;color:#aaa;margin-left:2px">${p.uni}</span>`;
      return `<tr>
        <td><span class="tag ${mt}">${ml}</span></td>
        <td style="font-weight:500">${p.label}</td>
        <td style="color:#aaa;font-size:11px">meta: ${p.meta}${p.uni}</td>
        <td>${inp}</td>
        <td>
          <div class="mbar"><div class="mfill ${fc}" style="width:${pc}%"></div></div>
          <span style="font-size:10px;color:#aaa">${v ? pc + '%' : '—'}</span>
        </td>
        <td><span class="badge ${v ? bc : ''}" style="${!v?'color:#ccc':''}">${v ? (pc>=80?'🟢':pc>=50?'🟡':'🔴')+' '+pc+'%' : '—'}</span></td>
      </tr>`;
    }).join('');

    // ── Gráfica donut (SVG) ────────────────────────────────────────────────
    const R = 38, CX = 46, CY = 46, SW = 9;
    const circ = 2 * Math.PI * R;
    const filled = predScore !== null ? (predScore / 100) * circ : 0;
    const gaugeLabel = predScore !== null ? predScore + '%' : '—';
    const donut = `<svg width="92" height="92" viewBox="0 0 92 92" style="flex-shrink:0">
      <circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="#eee" stroke-width="${SW}"/>
      <circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="${sc}" stroke-width="${SW}"
        stroke-dasharray="${filled} ${circ}" stroke-linecap="round"
        transform="rotate(-90 ${CX} ${CY})"/>
      <text x="${CX}" y="${CY - 5}" text-anchor="middle" fill="${sc}"
        font-size="13" font-weight="800" font-family="sans-serif">${gaugeLabel}</text>
      <text x="${CX}" y="${CY + 9}" text-anchor="middle" fill="#aaa"
        font-size="8" font-family="sans-serif">AVANCE</text>
    </svg>`;

    // ── Barras por medida (SVG) ────────────────────────────────────────────
    const barH = 14, barGap = 8, padX = 4, labelW = 0;
    const predBars = m.preds.map(p => {
      const n  = parseFloat(s.preds[p.id]) || 0;
      const pc = n ? Math.min(100, Math.round(n / p.meta * 100)) : 0;
      const bc = n ? (pc >= 80 ? '#4CAF50' : pc >= 50 ? '#FFC107' : '#E8220A') : '#e0e0e0';
      const lbl = p.label.length > 32 ? p.label.slice(0, 31) + '…' : p.label;
      return { lbl, pc, bc, val: n ? pc + '%' : '—' };
    });
    const svgH = predBars.length * (barH + barGap) + barGap;
    const barSvg = `<svg viewBox="0 0 260 ${svgH}" style="width:100%;height:${svgH}px">
      ${predBars.map((b, i) => {
        const y = barGap + i * (barH + barGap);
        const bw = Math.round(b.pc / 100 * 190);
        return `
        <text x="${padX}" y="${y + barH - 3}" font-size="9" fill="#666" font-family="sans-serif"
          style="dominant-baseline:auto">${b.lbl}</text>
        <rect x="${padX}" y="${y + barH + 2}" width="190" height="6" rx="3" fill="#eee"/>
        <rect x="${padX}" y="${y + barH + 2}" width="${bw}" height="6" rx="3" fill="${b.bc}"/>
        <text x="${padX + 196}" y="${y + barH + 9}" font-size="9" font-weight="700"
          fill="${b.bc}" font-family="sans-serif">${b.val}</text>`;
      }).join('')}
    </svg>`;

    return `<div class="pblock">
      <div class="pbhdr">
        <div style="display:flex;align-items:center;gap:8px">
          <div style="width:26px;height:26px;border-radius:50%;background:${m.color};
            display:flex;align-items:center;justify-content:center;color:#fff;font-size:10px;font-weight:700">${m.ini}</div>
          <div>
            <div style="font-size:12px;font-weight:700;color:#444;text-transform:uppercase;letter-spacing:.04em">${m.nombre} · ${m.cargo}</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          ${predScore !== null ? `<span style="font-size:13px;font-weight:800;color:${sc}">${sem2} ${predScore}%</span>` : ''}
          <span class="tag ${m.tc}">${m.tag}</span>
        </div>
      </div>
      <div style="background:#f0f4fa;border-bottom:1px solid #dde3ef;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;gap:10px">
        <div style="display:flex;align-items:flex-start;gap:6px;flex:1;min-width:0">
          <span style="font-size:9px;font-weight:700;color:#7a90b0;text-transform:uppercase;letter-spacing:.06em;margin-top:2px;white-space:nowrap">MCI contributivo</span>
          <span style="font-size:11px;color:#333;line-height:1.4">${m.mci}</span>
        </div>
        <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
          <div style="display:flex;flex-direction:column;align-items:center;background:#fff;border:1px solid ${sc};border-radius:8px;padding:4px 10px;min-width:54px">
            <span style="font-size:15px;font-weight:800;color:${sc};line-height:1">${predScore !== null ? predScore + '%' : '—'}</span>
            <span style="font-size:9px;color:#aaa;margin-top:1px">cumplimiento</span>
          </div>
          <span style="font-size:18px;line-height:1">${sem2}</span>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:12px;padding:12px 14px;background:#fff;border-bottom:1px solid #f0f0ee">
        ${donut}
        <div style="flex:1;min-width:0">${barSvg}</div>
      </div>
      <table class="ptbl">
        <thead><tr><th>MCI</th><th>Medida predictiva</th><th>Meta</th><th>Valor esta semana</th><th>Avance</th><th>Semáforo</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  }).join('');
  document.getElementById('tpreds').innerHTML = div + bl;
}

function updWIG(id, v) {
  if (!canEdit()) { toast('Sin permisos'); return; }
  if (!v && v !== 0) return;
  getSem(sem).wigs[id] = parseFloat(v);
  renderTablero();
  toast('WIG actualizado');
}

function updPred(id, v) {
  if (!canEdit()) { toast('Sin permisos'); return; }
  if (!v && v !== 0) return;
  getSem(sem).preds[id] = parseFloat(v);
  renderTablero();
  toast('Predictiva guardada');
}

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
            value="${(c.prueba || '').replace(/"/g, '&quot;')}"
            ${saved ? 'disabled' : ''}>
          <button type="button" class="prueba-btn" id="pbtn-save-${c.id}"
            style="${saved ? 'display:none' : ''}"
            onclick="savePrueba('${c.id}')">Guardar</button>
          <button type="button" class="prueba-btn prueba-edit" id="pbtn-edit-${c.id}"
            style="${saved ? '' : 'display:none'}"
            onclick="editPrueba('${c.id}')">Editar</button>
        </div>` : (c.done && c.prueba ? `
        <div class="cprueba-ro">
          <span class="prueba-lbl">Prueba:</span> ${c.prueba}
        </div>` : '');
      return `<div class="citem">
        <div class="chk${c.done ? ' done' : ''}" ${pc ? `onclick="togComp('${c.id}')"` : 'style="cursor:default"'}>
          <svg width="10" height="8" viewBox="0 0 10 8">
            <path d="M1 4L4 7L9 1" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="cbody">
          <div class="clider">${c.lider}</div>
          <div class="ctxt${c.done ? ' dt' : ''}">${c.txt}</div>
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
          ${ST.miembros.map(m => `<option value="${m.nombre}">${m.nombre.split(' ')[0]}</option>`).join('')}
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
    html || '<div style="padding:20px;color:#aaa;text-align:center">Sin compromisos registrados.</div>';
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
  guardar();
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
  guardar();
}

function delComp(id) {
  if (!isAdmin()) return;
  const s = getSem(sem);
  s.comps = s.comps.filter(x => x.id !== id);
  renderAll();
  guardar();
}

function qAdd(mci) {
  if (!isAdmin()) return;
  const k   = mci.replace(/[\s·]/g, '_');
  const txt = document.getElementById('qi-' + k)?.value?.trim();
  const lid = document.getElementById('ql-' + k)?.value;
  if (!txt) return;
  getSem(sem).comps.push({ id:uid(), lider:lid, mci, txt, done:false });
  renderAll();
  guardar();
}

function qAddSelf(mci) {
  if (!canComp()) return;
  const k   = mci.replace(/[\s·]/g, '_');
  const txt = document.getElementById('qi-' + k)?.value?.trim();
  if (!txt) return;
  getSem(sem).comps.push({ id:uid(), lider:su.nombre, mci, txt, done:false });
  renderAll();
  guardar();
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
    ST.miembros.map(m => `<option value="${m.nombre}">${m.nombre}</option>`).join('');
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
  guardar();
}

// ── Scores ─────────────────────────────────────────────────────────────────
function renderScores() {
  const rows = ST.miembros.map(m => {
    const ss = [];
    for (let n = 1; n <= sem; n++) {
      const sd = ST.semanas[n];
      if (!sd) { ss.push(null); continue; }
      const mine = (sd.comps || []).filter(c => c.lider.split(' ')[0] === m.nombre.split(' ')[0]);
      ss.push(mine.length ? Math.round(mine.filter(c => c.done).length / mine.length * 100) : null);
    }
    const v   = ss.filter(x => x !== null);
    const avg = v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : 0;
    const col = avg >= 80 ? '#4CAF50' : avg >= 50 ? '#FFC107' : '#E8220A';
    const celdas = ss.map((x, i) => x !== null
      ? `<span style="font-size:10px;font-weight:700;padding:2px 5px;border-radius:3px;
           background:${x>=80?'#e8f5e9':x>=50?'#fff8e1':'#ffebee'};
           color:${x>=80?'#2d7a2d':x>=50?'#b87900':'#c62828'}">S${i+1}:${x}%</span>`
      : `<span style="font-size:10px;color:#ccc">S${i+1}:—</span>`
    ).join(' ');
    return `<tr>
      <td style="display:flex;align-items:center;gap:8px">
        <div style="width:28px;height:28px;border-radius:50%;background:${m.color};
          color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center">${m.ini}</div>
        <div><div style="font-weight:600">${m.nombre}</div><div style="font-size:10px;color:#aaa">${m.cargo}</div></div>
      </td>
      <td><span class="tag ${m.tc}">${m.tag}</span></td>
      <td><span style="font-size:15px;font-weight:800;color:${col}">${avg}%</span></td>
      <td style="display:flex;gap:3px;flex-wrap:wrap">${celdas}</td>
    </tr>`;
  }).join('');
  document.getElementById('scorelist').innerHTML = `<table class="stbl">
    <thead><tr><th>Líder</th><th>MCI</th><th>Promedio</th><th>Histórico</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

// ── Admin ──────────────────────────────────────────────────────────────────
function renderAdmin() {
  if (!isAdmin()) {
    document.getElementById('apanel').innerHTML = '<p style="color:#E8220A;padding:14px">Acceso restringido.</p>';
    return;
  }
  const usHtml = ST.usuarios.map(u => {
    const ini = u.nombre.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase();
    const rb  = u.rol === 'admin' ? 'rba' : u.rol === 'integrante' ? 'rbi' : 'rbv';
    const rl  = u.rol === 'admin' ? 'Admin' : u.rol === 'integrante' ? 'Integrante' : 'Visualizador';
    return `<div class="urow">
      <div class="uav" style="background:${u.color}">${ini}</div>
      <div class="uinfo">
        <div class="uname2">${u.nombre}</div>
        <div class="umeta">@${u.username} · ${u.cargo}</div>
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
      const actual = parseFloat(s.wigs[w.id] ?? w.inicio);
      return `<div class="waerow" data-wid="${w.id}">
        <div class="waefield">
          <label class="waelbl">Elemento</label>
          <input type="text" class="waeinp" autocomplete="off" value="${w.label.replace(/"/g,'&quot;')}"
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
          <input type="text" class="waeinp waeinp-sm" autocomplete="off" value="${w.uni || ''}"
            onchange="saveWigField('${w.id}','uni',this.value)">
        </div>
        <div class="waefield waefield-num">
          <label class="waelbl">Actual (Sem ${sem})</label>
          <input type="number" class="waeinp" value="${actual}"
            onchange="saveWigActual('${w.id}',parseFloat(this.value)||0)">
        </div>
        <div class="waefield waefield-sub">
          <label class="waelbl">Descripción</label>
          <input type="text" class="waeinp" autocomplete="off" value="${(w.sub||'').replace(/"/g,'&quot;')}"
            onchange="saveWigField('${w.id}','sub',this.value)">
        </div>
        <button type="button" class="waedel" onclick="delWig('${w.id}')" title="Eliminar elemento">×</button>
      </div>`;
    }).join('');

    return `<div class="wagroup">
      <div class="waghdr">
        <span class="wagnum">MCI ${n}</span>
        <input type="text" class="wagtit-inp" autocomplete="off" value="${tit.replace(/"/g,'&quot;')}"
          onchange="saveMCITitulo(${n},this.value)" title="Editar título del MCI">
        <button type="button" class="waeadd" onclick="addWigToMCI(${n})">+ Elemento</button>
      </div>
      <div class="waebody">${filas}</div>
    </div>`;
  }).join('');

  // ── MCI contributivos por integrante ─────────────────────────────────────
  const mciOpts = _mciOpts();
  const contribHtml = ST.miembros.map(m => {
    const predRows = (m.preds || []).map(p => {
      const selOpts = mciOpts.map(o =>
        `<option value="${o.val}"${p.mci === o.val ? ' selected' : ''}>${o.lbl}</option>`
      ).join('');
      return `<div class="predrow" data-pid="${p.id}">
        <input type="text" class="predinp predinp-lbl" autocomplete="off"
          value="${(p.label||'').replace(/"/g,'&quot;')}" placeholder="Nombre de la medida"
          onchange="savePredField('${m.id}','${p.id}','label',this.value)">
        <input type="number" class="predinp predinp-num" value="${p.meta}"
          placeholder="Meta" title="Meta"
          onchange="savePredField('${m.id}','${p.id}','meta',parseFloat(this.value)||0)">
        <input type="text" class="predinp predinp-uni" autocomplete="off"
          value="${(p.uni||'').replace(/"/g,'&quot;')}" placeholder="Unidad"
          onchange="savePredField('${m.id}','${p.id}','uni',this.value)">
        <select class="predinp predinp-mci"
          onchange="savePredField('${m.id}','${p.id}','mci',this.value)">${selOpts}</select>
        <button type="button" class="preddel" onclick="delPred('${m.id}','${p.id}')" title="Eliminar medida">×</button>
      </div>`;
    }).join('');

    const ini = m.nombre.split(' ').map(x => x[0]).join('').slice(0,2).toUpperCase();
    return `<div class="mcont-blk">
      <div class="mcont-hdr">
        <div class="mav" style="background:${m.color};width:30px;height:30px;font-size:11px">${ini}</div>
        <div>
          <div style="font-size:12px;font-weight:700;color:#222">${m.nombre}</div>
          <div style="font-size:10px;color:#888">${m.cargo}</div>
        </div>
      </div>
      <div class="mcont-mci">
        <label class="waelbl">MCI contributivo</label>
        <input type="text" class="waeinp" autocomplete="off"
          value="${(m.mci||'').replace(/"/g,'&quot;')}" placeholder="Descripción del MCI de este integrante"
          onchange="saveMiembroMCI('${m.id}',this.value)">
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
          <span class="waelbl" style="width:130px">MCI</span>
          <span style="width:22px"></span>
        </div>
        ${predRows || '<div style="font-size:11px;color:#bbb;padding:6px 2px">Sin medidas — usa "+ Agregar medida"</div>'}
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
  document.getElementById('u-rol').value = 'integrante';
  document.getElementById('u-mid').innerHTML =
    '<option value="">— Sin asociar —</option>' +
    ST.miembros.map(m => `<option value="${m.id}">${m.nombre}</option>`).join('');
  document.getElementById('m-user').classList.add('open');
}

function openEditUser(id) {
  editUID = id;
  const u = ST.usuarios.find(x => x.id === id);
  if (!u) return;
  document.getElementById('m-user-tit').textContent = 'Editar usuario';
  document.getElementById('u-nom').value   = u.nombre;
  document.getElementById('u-usr').value   = u.username;
  document.getElementById('u-pwd').value   = u.password;
  document.getElementById('u-rol').value   = u.rol;
  document.getElementById('u-cargo').value = u.cargo;
  document.getElementById('u-mid').innerHTML =
    '<option value="">— Sin asociar —</option>' +
    ST.miembros.map(m => `<option value="${m.id}"${u.mid === m.id ? ' selected' : ''}>${m.nombre}</option>`).join('');
  document.getElementById('m-user').classList.add('open');
}

function onRolChange() {
  const r = document.getElementById('u-rol').value;
  document.getElementById('u-mid-row').style.display = r === 'integrante' ? '' : 'none';
}

function saveUser() {
  const nom   = document.getElementById('u-nom').value.trim();
  const usr   = document.getElementById('u-usr').value.trim();
  const pwd   = document.getElementById('u-pwd').value;
  const rol   = document.getElementById('u-rol').value;
  const cargo = document.getElementById('u-cargo').value.trim();
  const mid   = document.getElementById('u-mid').value || null;
  if (!nom || !usr || !pwd) { toast('Completa los campos requeridos'); return; }
  const cols = { admin:'#E8220A', integrante:'#1B3A6B', visualizador:'#666' };
  if (editUID) {
    const u = ST.usuarios.find(x => x.id === editUID);
    if (u) Object.assign(u, { nombre:nom, username:usr, password:pwd, rol, cargo, mid, color:cols[rol] });
  } else {
    ST.usuarios.push({ id:uid(), nombre:nom, username:usr, password:pwd, rol, cargo, mid, color:cols[rol] });
  }
  closeModal('m-user');
  renderAdmin();
  guardar();
}

function delUser(id) {
  if (id === 'u1') { toast('No se puede eliminar el admin principal'); return; }
  ST.usuarios = ST.usuarios.filter(x => x.id !== id);
  renderAdmin();
  guardar();
}

// ── Gestión MCI admin ─────────────────────────────────────────────────────
function saveMCITitulo(num, titulo) {
  if (!ST.mciTitulos) ST.mciTitulos = {};
  ST.mciTitulos[num] = titulo.trim() || `MCI ${num}`;
  renderTablero();
  guardar();
}

function saveWigField(id, field, val) {
  const w = ST.wigs.find(x => x.id === id);
  if (!w) return;
  w[field] = val;
  renderTablero();
  guardar();
}

function saveWigActual(id, val) {
  const s = getSem(sem);
  s.wigs[id] = val;
  renderTablero();
  guardar();
}

function delWig(id) {
  if (ST.wigs.length <= 1) { toast('Debe quedar al menos un elemento'); return; }
  ST.wigs = ST.wigs.filter(x => x.id !== id);
  renderAdmin();
  renderTablero();
  guardar();
}

function addWigToMCI(mciNum) {
  const tit = ST.mciTitulos?.[mciNum] || `MCI ${mciNum}`;
  ST.wigs.push({ id: uid(), label: 'Nuevo elemento', inicio: 0, meta: 100, uni: '%', mci: mciNum, sub: '' });
  renderAdmin();
  renderTablero();
  guardar();
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
  guardar();
}

function savePredField(mid, pid, field, val) {
  const m = ST.miembros.find(x => x.id === mid);
  if (!m) return;
  const p = (m.preds || []).find(x => x.id === pid);
  if (p) p[field] = val;
  renderTablero();
  guardar();
}

function delPred(mid, pid) {
  const m = ST.miembros.find(x => x.id === mid);
  if (!m) return;
  m.preds = (m.preds || []).filter(x => x.id !== pid);
  renderAdmin();
  renderTablero();
  guardar();
}

function addPredToMiembro(mid) {
  const m = ST.miembros.find(x => x.id === mid);
  if (!m) return;
  if (!m.preds) m.preds = [];
  const opts = _mciOpts();
  m.preds.push({ id: uid(), label: 'Nueva medida', meta: 100, uni: '%', mci: opts[0]?.val || 'Soporte 4DX' });
  renderAdmin();
  renderTablero();
  guardar();
}

// ── Modal Nuevo MCI contributivo ──────────────────────────────────────────
function openContrib() {
  document.getElementById('mc-mid').innerHTML =
    ST.miembros.map(m => `<option value="${m.id}">${m.nombre} — ${m.cargo}</option>`).join('');
  document.getElementById('mc-nom').value = '';
  document.getElementById('mc-preds-rows').innerHTML = '';
  mcAddPredRow(); // una fila vacía por defecto
  document.getElementById('m-contrib').classList.add('open');
}

function mcAddPredRow() {
  const opts = _mciOpts();
  const idx  = Date.now();
  const selOpts = opts.map(o => `<option value="${o.val}">${o.lbl}</option>`).join('');
  const row = document.createElement('div');
  row.className = 'predrow';
  row.dataset.idx = idx;
  row.innerHTML = `
    <input type="text" class="predinp predinp-lbl" autocomplete="off" placeholder="Nombre de la medida">
    <input type="number" class="predinp predinp-num" placeholder="Meta" value="100">
    <input type="text" class="predinp predinp-uni" autocomplete="off" placeholder="%" value="%">
    <select class="predinp predinp-mci">${selOpts}</select>
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

  // Leer todas las filas de medidas del modal
  const filas = document.querySelectorAll('#mc-preds-rows .predrow');
  filas.forEach(row => {
    const label = row.querySelector('.predinp-lbl').value.trim();
    if (!label) return; // omitir filas vacías
    const meta = parseFloat(row.querySelector('.predinp-num').value) || 0;
    const uni  = row.querySelector('.predinp-uni').value.trim();
    const mci  = row.querySelector('.predinp-mci').value;
    if (!m.preds) m.preds = [];
    m.preds.push({ id: uid(), label, meta, uni, mci });
  });

  closeModal('m-contrib');
  renderAdmin();
  renderTablero();
  guardar();
}

function openMCI() { document.getElementById('m-mci').classList.add('open'); }

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
  closeModal('m-mci');
  renderAdmin();
  renderTablero();
  guardar();
}

// ── Utilidades UI ──────────────────────────────────────────────────────────
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

function toast(msg) {
  const el = document.getElementById('tst');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2200);
}
