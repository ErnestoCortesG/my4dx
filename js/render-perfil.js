// ── Vista Perfil de integrante — extraído de render.js (v2.3) ──
// Perfil dividido en Tabs (uno por MCI contributivo) + banner con el promedio
// de cumplimiento. Un contributivo puede ser tipo 'renovacion' (mini-dashboard
// con filtro de mes, KPIs, línea y barras por gerencia) o normal (medidas).

let perfTab   = 0;        // índice del contributivo activo
let renovMes  = 'todos';  // filtro de mes del dashboard de renovación
let predMes   = null;     // filtro de mes de medidas predictivas semanales (null = vigente)

// Charts de "claves de vendedores" que se rellenan tras insertar el HTML (flujo
// medir-luego-render para responsividad 1:1 sin estirar el SVG).
let _cvPending    = [];   // ids de contributivos por rellenar
let _cvResizeObs  = null; // ResizeObserver único (se evita apilar observers)
let _cvResizeRaf  = 0;    // rAF de throttle del resize

const _MES_AB = { 1:'ene',2:'feb',3:'mar',4:'abr',5:'may',6:'jun',7:'jul',8:'ago',9:'sep',10:'oct',11:'nov',12:'dic' };
const MESES_LARGO = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
function _semColor(p) { return p >= 75 ? '#4CAF50' : p >= 60 ? '#FFC107' : '#E02500'; }
function _gerShort(g) {
  return String(g)
    .replace('Funcionarios y Colaboradores', 'Funcion.')
    .replace('Matrices ', 'Mtz ')
    .replace('Matriz ', 'Mtz ');
}

// ── Perfil de integrante ──────────────────────────────────────────────────
function renderPerfil() {
  const m = ST.miembros.find(x => x.id === mActivo);
  if (!m) {
    document.getElementById('perfil-content').innerHTML =
      '<p style="padding:20px;color:var(--text-3)">Selecciona un integrante en el panel izquierdo.</p>';
    return;
  }
  const s  = getSem(sem);
  const ro = !canEdit();

  // Score compromisos
  const cs = (s.comps || []).filter(c => c.lider.split(' ')[0] === m.nombre.split(' ')[0]);
  const compPct = cs.length ? Math.round(cs.filter(c => c.done).length / cs.length * 100) : null;
  const compSc  = compPct === null ? '#aaa' : compPct >= 100 ? '#4CAF50' : compPct >= 50 ? '#FFC107' : '#E02500';

  const alineados  = mcisDeIntegrante(m);
  const contribs   = m.contributivos || [];
  if (perfTab >= contribs.length) perfTab = 0;

  // Banner: promedio simple de los scores de contributivos con datos
  const scores  = contribs.map(c => contribScore(c)).filter(x => x !== null);
  const bAvg    = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10 : null;
  const bCol    = bAvg === null ? '#aaa' : bAvg >= 75 ? '#4CAF50' : bAvg >= 50 ? '#FFC107' : '#E02500';
  const bParts  = contribs.map(c => {
    const sc = contribScore(c);
    return `<div class="pb-part"><span style="color:${sc===null?'var(--text-4)':'var(--ink)'}">${sc===null?'—':sc+'%'}</span><small>${esc(c.nombre)}</small></div>`;
  }).join('<div class="pb-plus">+</div>');

  // Tabs
  const tabbar = contribs.length >= 2
    ? `<div class="ctabs">${contribs.map((c, i) =>
        `<button class="ctab ${i === perfTab ? 'on' : ''}" onclick="selPerfTab(${i})">${i + 1}. ${esc(c.nombre)}</button>`).join('')}</div>`
    : '';

  const active  = contribs[perfTab];
  const content = !active
    ? `<div class="perf-mci-contributivo"><div style="font-size:12px;color:var(--text-3);padding:6px 2px">Este integrante no tiene MCI contributivos. Agrégalos desde Administración.</div></div>`
    : (active.tipo === 'renovacion' && active.dash)
      ? renovDashHTML(active)
      : (active.tipo === 'clavesagente' && active.claves)
        ? clavesDashHTML(active)
        : (active.tipo === 'clavesvend' && active.clavesvend)
          ? clavesVendDashHTML(active)
          : contribMedidasHTML(active, ro);

  document.getElementById('perfil-content').innerHTML = `
    <div class="perf-back-bar">
      <button class="perf-back-btn" onclick="volverTablero()">← Tablero general</button>
    </div>

    <div class="perf-hero">
      <div class="mhdr-av" style="background:${m.color};width:54px;height:54px;font-size:20px;font-weight:800">${esc(m.ini)}</div>
      <div class="perf-hero-info">
        <div class="perf-hero-name">${esc(m.nombre)}</div>
        <div class="perf-hero-cargo">${esc(m.cargo)}</div>
        ${(() => { const et = etiquetaMCI(m); return `<span class="tag ${et.tc}" style="margin-top:6px;display:inline-block">${esc(et.texto)}</span>`; })()}
      </div>
      <div class="perf-hero-scores">
        <div class="perf-score-chip" style="border-color:${compSc}">
          <div class="perf-score-num" style="color:${compSc}">${compPct !== null ? compPct + '%' : '—'}</div>
          <div class="perf-score-lbl">Compromisos</div>
        </div>
      </div>
    </div>

    <div class="perf-banner" style="border-color:${bCol}">
      <div><div class="pb-lab">Cumplimiento MCI Contributivo</div><div class="pb-sub">promedio de tableros con datos</div></div>
      <div class="pb-big" style="color:${bCol}">${bAvg !== null ? bAvg + '%' : '—'}</div>
      <div class="pb-parts">${bParts}</div>
    </div>

    ${tabbar}
    <div class="ctab-pane">${content}</div>
  `;

  // Rellena las gráficas de claves de vendedores midiendo su contenedor ya insertado.
  _flushClavesVendCharts();
}

// Dispara el render medido de cada chart de claves-vendedores pendiente (tras
// insertar el HTML, para que el host ya tenga ancho real).
function _flushClavesVendCharts() {
  const ids = _cvPending; _cvPending = [];
  ids.forEach(cid => requestAnimationFrame(() => renderClavesVendChart(cid)));
}

// ── Contributivo NORMAL (medidas predictivas) ──────────────────────────────
function contribMedidasHTML(c, ro) {
  const predRowHTML = p => {
    const mesEff = (predMes === null) ? MES_DE_SEM[sem] : predMes;
    const a   = p.semanal ? predMesVal(p.id, mesEff) : parseFloat(p.actual);
    const has = !isNaN(a) && a > 0;
    const pc  = has ? Math.min(100, Math.round(a / p.meta * 100)) : 0;
    const fc  = pc >= 100 ? '#4CAF50' : pc >= 50 ? '#FFC107' : '#E02500';
    const bc  = pc >= 100 ? 'bg' : pc >= 50 ? 'by' : 'br';
    const valFmt = has ? a + esc(p.uni) : '—';
    const valInp = (p.actual !== undefined && p.actual !== null && p.actual !== '') ? p.actual : '';
    const inp = (ro || p.semanal)
      ? `<span style="font-size:13px;font-weight:700;color:${has ? fc : 'var(--text-4)'}"><strong>${valFmt}</strong></span>`
      : `<div style="display:flex;align-items:center;gap:6px">
           <input class="pinp" type="number" value="${valInp}" placeholder="—" style="width:80px;font-size:13px"
             data-pred-id="${p.id}" onchange="savePredActual('${p.id}',this.value)">
           <span style="font-size:11px;color:var(--text-3)">${esc(p.uni)}</span>
         </div>`;
    return `<tr>
      <td style="font-weight:500;line-height:1.35">${esc(p.label)}</td>
      <td style="color:var(--text-3);font-size:11px;white-space:nowrap">meta: ${p.meta}${esc(p.uni)}</td>
      <td>${inp}</td>
      <td><div class="mbar" style="width:90px"><div class="mfill" style="transform:scaleX(${(pc/100).toFixed(3)});background:${fc}"></div></div>
        <span style="font-size:10px;color:var(--text-4)">${has ? pc + '%' : '—'}</span></td>
      <td><span class="badge ${has ? bc : ''}" style="${!has ? 'color:var(--text-4)' : ''}">${has ? pc+'%' : '—'}</span></td>
    </tr>`;
  };
  const cScore = contribScoreAcum(c);
  const cSc = cScore === null ? '#aaa' : cScore >= 100 ? '#4CAF50' : cScore >= 50 ? '#FFC107' : '#E02500';
  const cMcis = (c.mciAlineados || []).slice().sort((a,b)=>a-b);
  const cBadges = cMcis.length
    ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px">${cMcis.map(n => `<span class="perf-mci-badge">MCI ${n} · ${esc(ST.mciTitulos?.[n] || 'General')}</span>`).join('')}</div>` : '';
  const rows = (c.preds || []).map(predRowHTML).join('');
  // Chips de mes: solo si al menos una medida es de captura semanal (ej. Sandra).
  const tieneSemanal = (c.preds || []).some(p => p.semanal);
  const mesActualIdx = MES_DE_SEM[sem];
  const chipsMes = tieneSemanal
    ? `<div class="mchips" style="margin-bottom:8px">
        <button class="mchip ${predMes === null ? 'on' : ''}" onclick="selPredMes(null)">Vigente</button>
        ${MESES_LARGO.map((nm, i) => `<button class="mchip ${predMes === i ? 'on' : ''} ${i > mesActualIdx ? 'dim' : ''}" onclick="selPredMes(${i})">${nm}</button>`).join('')}
      </div>`
    : '';
  return `<div class="perf-mci-contributivo">
    ${cBadges}
    <div class="perf-mci-avance" style="background:${cSc}20;border:1px solid ${cSc}40">
      <span style="font-size:20px;font-weight:900;color:${cSc};font-family:'Lato',sans-serif">${cScore !== null ? cScore + '%' : '—'}</span>
      <span style="font-size:11px;color:var(--text-3);margin-left:8px">Cumplimiento del MCI contributivo</span>
    </div>
    ${chipsMes}
    <div class="ptbl-wrap" style="margin-top:10px">
      <table class="ptbl">
        <thead><tr><th>Medida predictiva</th><th>Meta anual</th><th>Actual</th><th>Avance</th><th>Semáforo</th></tr></thead>
        <tbody>${rows || `<tr><td colspan="5" style="font-size:11px;color:var(--text-3);padding:8px 4px">Sin medidas predictivas.</td></tr>`}</tbody>
      </table>
    </div>
  </div>`;
}

// ── Contributivo tipo DASHBOARD de renovación ──────────────────────────────
// Consolida la vista según el filtro de mes (renovMes): 'todos' o el número de mes.
function renovView(dash, sel) {
  const meses = dash.meses || [];
  if (sel === 'todos') {
    const mad = meses.filter(x => x.maduro && x.base > 0);
    const den = mad.reduce((a, x) => a + x.base, 0);
    const map = {};
    mad.forEach(x => (x.ger || []).forEach(g => {
      if (!map[g.g]) map[g.g] = { num: 0, den: 0, acro: g.acro };
      map[g.g].num += g.pct * g.base; map[g.g].den += g.base;
    }));
    const gers = Object.keys(map).map(k => ({ g: k, acro: map[k].acro, base: map[k].den, pct: map[k].den ? Math.round(map[k].num / map[k].den * 10) / 10 : 0 }));
    return { pct: den ? Math.round(mad.reduce((a, x) => a + x.pct1er * x.base, 0) / den * 10) / 10 : null,
             base: den, gers, maduro: true, label: 'Todos · maduros' };
  }
  const mm = meses.find(x => x.m === sel);
  if (!mm) return { pct: null, base: 0, gers: [], maduro: false, label: '' };
  return { pct: mm.pct1er, base: mm.base, gers: (mm.ger || []).map(g => ({ g: g.g, acro: g.acro, base: g.base, pct: g.pct })), maduro: mm.maduro, label: mm.nombre };
}

function renovDashHTML(c) {
  const dash  = c.dash, meses = dash.meses || [], meta = dash.meta || 75, sel = renovMes;
  const anyInm = meses.some(x => !x.maduro);
  const chips = `<button class="mchip ${sel === 'todos' ? 'on' : ''}" data-mes="todos" onclick="selRenovMes('todos')">Todos</button>` +
    meses.map(x => `<button class="mchip ${sel === x.m ? 'on' : ''} ${x.maduro ? '' : 'dim'}" data-mes="${x.m}" onclick="selRenovMes(${x.m})">${x.nombre}${x.maduro ? '' : '*'}</button>`).join('');
  const nota  = anyInm ? `<span class="mnote">* meses en maduración (1er recibo por cobrarse)</span>` : '';
  const cMcis = (c.mciAlineados || []).slice().sort((a,b)=>a-b);
  const cBadges = cMcis.length
    ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px">${cMcis.map(n => `<span class="perf-mci-badge">MCI ${n} · ${esc(ST.mciTitulos?.[n] || 'General')}</span>`).join('')}</div>` : '';
  return `<div class="renov-dash">
    ${cBadges}
    <div class="renov-months" id="renov-months"><span class="mlbl">Mes:</span>${chips}${nota}</div>
    <div id="renov-dyn">${renovDynHTML(dash, meta)}</div>
    <div class="renov-card"><div class="renov-ct">% Renovado 1er recibo · acumulado (avance mes a mes)</div><div class="ptbl-wrap">${renovLineSVG(dash, meta)}</div></div>
  </div>`;
}

// Parte dinámica del dashboard (cambia con el filtro de mes): KPIs + barras.
function renovDynHTML(dash, meta) {
  const v = renovView(dash, renovMes);
  const pcol = v.pct === null ? '#aaa' : _semColor(v.pct);
  return `<div class="dyn-in">
    <div class="rkpis">
      <div class="rkpi hl"><div class="rkv" style="color:${pcol}">${v.pct !== null ? v.pct + '%' : '—'}</div><div class="rkl">% Renovado · 1er recibo</div></div>
      <div class="rkpi"><div class="rkv">${v.base ? v.base.toLocaleString('es-MX') : '—'}</div><div class="rkl">Base Renovable</div></div>
      <div class="rkpi"><div class="rkv" style="color:#E02500">${meta}%</div><div class="rkl">Meta Renovación</div></div>
    </div>
    <div class="renov-card"><div class="renov-ct">Gerencias · % 1er recibo · ${esc(v.label)}</div><div class="ptbl-wrap">${renovBarsSVG(v.gers, meta)}</div></div>
  </div>`;
}

function renovLineSVG(dash, meta) {
  // Acumulado: en cada mes, % = Σ(1er recibo ene..mes) ÷ Σ(base ene..mes).
  let sb = 0, su = 0;
  const pts = (dash.meses || []).filter(x => x.maduro && x.base > 0).map(x => {
    sb += x.base; su += x.base * x.pct1er / 100;
    return { nombre: x.nombre, val: Math.round(su / sb * 1000) / 10 };
  });
  const W = 620, H = 150, PL = 30, PR = 12, TOP = 16, BOT = 26, baseY = H - BOT, plotH = baseY - TOP;
  const ymin = 50, ymax = 80;
  const yOf = v => baseY - (v - ymin) / (ymax - ymin) * plotH;
  const xOf = i => PL + (pts.length <= 1 ? 0 : i * (W - PL - PR) / (pts.length - 1));
  let s = '';
  [55, 60, 65, 70, 75].forEach(g => { const y = yOf(g); s += `<line x1="${PL}" y1="${y.toFixed(1)}" x2="${W-PR}" y2="${y.toFixed(1)}" stroke="rgba(5,23,46,.09)"/><text x="${PL-4}" y="${(y+3).toFixed(1)}" font-size="9" fill="var(--text-3)" text-anchor="end">${g}</text>`; });
  const my = yOf(meta);
  s += `<line x1="${PL}" y1="${my.toFixed(1)}" x2="${W-PR}" y2="${my.toFixed(1)}" stroke="#dc2626" stroke-width="1.2" stroke-dasharray="6 3"/><text x="${W-PR}" y="${(my-3).toFixed(1)}" font-size="9" font-weight="800" fill="#dc2626" text-anchor="end">meta ${meta}%</text>`;
  const poly = pts.map((x, i) => `${xOf(i).toFixed(1)},${yOf(x.val).toFixed(1)}`).join(' ');
  s += `<polyline class="rline" points="${poly}" fill="none" stroke="#1e88e5" stroke-width="2.5" stroke-linejoin="round"/>`;
  pts.forEach((x, i) => {
    s += `<circle cx="${xOf(i).toFixed(1)}" cy="${yOf(x.val).toFixed(1)}" r="3" fill="#1e88e5"><title>Acum. a ${x.nombre}: ${x.val}%</title></circle>`;
    s += `<text x="${xOf(i).toFixed(1)}" y="${(yOf(x.val)-7).toFixed(1)}" font-size="8.5" font-weight="700" fill="#1565c0" text-anchor="middle">${x.val}</text>`;
    s += `<text x="${xOf(i).toFixed(1)}" y="${(baseY+14).toFixed(1)}" font-size="9" fill="var(--text-3)" text-anchor="middle">${x.nombre}</text>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" style="width:80%;min-width:336px;height:auto;display:block;margin:0 auto" role="img">${s}</svg>`;
}

function renovBarsSVG(gers, meta) {
  const n = Math.max(gers.length, 1);
  const rot = n > 10;                       // muchas gerencias → etiquetas rotadas
  const PL = 30, PR = 14, TOP = 14, BOT = rot ? 54 : 30, H = rot ? 200 : 180;
  const slot = 34, W = PL + PR + n * slot;
  const baseY = H - BOT, plotH = baseY - TOP, bw = slot * 0.6;
  const yOf = v => baseY - (v / 100) * plotH;
  let s = '';
  [0, 50, 100].forEach(g => { const y = yOf(g); s += `<line x1="${PL}" y1="${y.toFixed(1)}" x2="${W-PR}" y2="${y.toFixed(1)}" stroke="rgba(5,23,46,.09)"/><text x="${PL-4}" y="${(y+3).toFixed(1)}" font-size="9" fill="var(--text-3)" text-anchor="end">${g}</text>`; });
  const my = yOf(meta);
  s += `<line x1="${PL}" y1="${my.toFixed(1)}" x2="${W-PR}" y2="${my.toFixed(1)}" stroke="#dc2626" stroke-width="1" stroke-dasharray="5 3"/>`;
  gers.forEach((g, i) => {
    const cx = PL + slot * i + slot / 2, x = cx - bw / 2, v = g.pct;
    const lab = esc(g.acro || _gerShort(g.g));
    const bs = (g.base != null) ? ` · base renovable: ${g.base.toLocaleString('es-MX')} póliza${g.base === 1 ? '' : 's'}` : '';
    s += `<rect class="rbar" x="${x.toFixed(1)}" y="${yOf(v).toFixed(1)}" width="${bw.toFixed(1)}" height="${(baseY - yOf(v)).toFixed(1)}" rx="2" fill="${_semColor(v)}"><title>${esc(g.g)} · ${v}%${bs}</title></rect>`;
    s += `<text x="${cx.toFixed(1)}" y="${(yOf(v)-3).toFixed(1)}" font-size="7.5" font-weight="800" fill="var(--ink)" text-anchor="middle">${v}%</text>`;
    s += rot
      ? `<text transform="rotate(-42 ${cx.toFixed(1)} ${(baseY+11).toFixed(1)})" x="${cx.toFixed(1)}" y="${(baseY+11).toFixed(1)}" font-size="7" fill="var(--text-3)" text-anchor="end">${lab}</text>`
      : `<text x="${cx.toFixed(1)}" y="${(baseY+13).toFixed(1)}" font-size="7.5" fill="var(--text-3)" text-anchor="middle">${lab}</text>`;
  });
  // Muchas gerencias (Franquicias) → ancho completo con scroll; pocas (Promotorías) → 60% centrada.
  const style = rot
    ? `width:100%;min-width:${W}px;height:auto;display:block`
    : `width:60%;min-width:260px;height:auto;display:block;margin:0 auto`;
  return `<svg viewBox="0 0 ${W} ${H}" style="${style}" role="img">${s}</svg>`;
}

// ── Contributivo tipo DASHBOARD de claves de agente (barras apiladas) ───────
// Semáforo sobre el ACUMULADO de claves: ≤rojo → rojo, <verde → amarillo, ≥verde → verde.
function clavesDashHTML(c) {
  const K = c.claves, meses = K.meses || [], metaMes = K.metaMes || 50, metaTot = K.metaTotal || 250;
  const rojo = K.semRojo || 100, verde = K.semVerde || 200;
  const acum = meses.reduce((a, m) => a + (m.total || 0), 0);
  const semC = acum <= rojo ? '#E02500' : acum >= verde ? '#4CAF50' : '#FFC107';
  const semB = acum <= rojo ? 'br' : acum >= verde ? 'bg' : 'by';
  const semT = acum <= rojo ? 'Rojo' : acum >= verde ? 'Verde' : 'Amarillo';
  const cMcis = (c.mciAlineados || []).slice().sort((a,b)=>a-b);
  const cBadges = cMcis.length
    ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px">${cMcis.map(n => `<span class="perf-mci-badge">MCI ${n} · ${esc(ST.mciTitulos?.[n] || 'General')}</span>`).join('')}</div>` : '';
  return `<div class="claves-dash">
    ${cBadges}
    <div class="rkpis">
      <div class="rkpi hl"><div class="rkv" style="color:${semC}">${acum}</div><div class="rkl">Claves acumuladas</div></div>
      <div class="rkpi"><div class="rkv">${metaTot}</div><div class="rkl">Meta al año</div></div>
      <div class="rkpi"><div class="rkv" style="color:#E02500">${metaMes}</div><div class="rkl">Meta mensual</div></div>
    </div>
    <div style="text-align:center;margin:2px 0 10px"><span class="badge ${semB}">Semáforo ${semT} · acumulado ${acum} / meta ${metaTot}</span></div>
    <div class="renov-card"><div class="renov-ct">Claves de agente por mes · por Estado/Provincia (meta ${metaMes}/mes)</div><div class="ptbl-wrap">${clavesStackedSVG(K)}</div></div>
  </div>`;
}

function _clavesColor(estado, idx) {
  if (estado === 'Sin estado') return '#9fb3c0';
  const PAL = ['#4e79a7','#f28e2b','#59a14f','#e15759','#76b7b2','#edc948','#b07aa1','#9c755f','#ff9da7','#8cd17d','#86bcb6','#d37295','#b6992d','#499894','#79706e','#d7b5a6','#1f77b4','#bab0ac'];
  return PAL[idx % PAL.length];
}

function clavesStackedSVG(K) {
  const meses = K.meses || [], metaMes = K.metaMes || 50;
  // union de estados (orden estable; "Sin estado" al final → arriba del apilado)
  const est = [];
  meses.forEach(m => (m.segs || []).forEach(s => { if (!est.includes(s.estado)) est.push(s.estado); }));
  est.sort((a, b) => a === 'Sin estado' ? 1 : b === 'Sin estado' ? -1 : a.localeCompare(b, 'es'));
  const colOf = e => _clavesColor(e, est.indexOf(e));
  const maxTot = Math.max(metaMes, ...meses.map(m => m.total || 0), 10);
  const YMAX = Math.ceil(maxTot / 10) * 10, step = YMAX <= 40 ? 5 : 10;
  const W = 620, H = 340, PL = 30, PR = 150, TOP = 20, BOT = 28, baseY = H - BOT, plotH = baseY - TOP;
  const yOf = v => baseY - (v / YMAX) * plotH;
  const slot = (W - PL - PR) / Math.max(meses.length, 1), bw = Math.min(84, slot * 0.5);
  let s = '';
  for (let g = 0; g <= YMAX; g += step) { const y = yOf(g); s += `<line x1="${PL}" y1="${y.toFixed(1)}" x2="${W-PR}" y2="${y.toFixed(1)}" stroke="rgba(5,23,46,.09)"/><text x="${PL-6}" y="${(y+3).toFixed(1)}" font-size="9" fill="var(--text-3)" text-anchor="end">${g}</text>`; }
  const my = yOf(metaMes);
  s += `<line x1="${PL}" y1="${my.toFixed(1)}" x2="${W-PR}" y2="${my.toFixed(1)}" stroke="#dc2626" stroke-width="1.3" stroke-dasharray="6 3"/><text x="${W-PR}" y="${(my-3).toFixed(1)}" font-size="9" font-weight="800" fill="#dc2626" text-anchor="end">meta ${metaMes}/mes</text>`;
  meses.forEach((m, mi) => {
    const cx = PL + slot * mi + slot / 2, x = cx - bw / 2;
    const byEst = {}; (m.segs || []).forEach(seg => { byEst[seg.estado] = seg.n; });
    let acc = 0;
    est.forEach(e => {
      const n = byEst[e]; if (!n) return;
      const y0 = yOf(acc), y1 = yOf(acc + n);
      s += `<rect class="rbar" x="${x.toFixed(1)}" y="${y1.toFixed(1)}" width="${bw.toFixed(1)}" height="${(y0 - y1).toFixed(1)}" fill="${colOf(e)}"><title>${esc(e)} · ${n} clave${n===1?'':'s'} (${m.nombre})</title></rect>`;
      acc += n;
    });
    s += `<text x="${cx.toFixed(1)}" y="${(yOf(m.total)-6).toFixed(1)}" font-size="14" font-weight="900" fill="var(--ink)" text-anchor="middle">${m.total}</text>`;
    s += `<text x="${cx.toFixed(1)}" y="${(baseY+15).toFixed(1)}" font-size="11" fill="var(--text-3)" text-anchor="middle">${m.nombre}</text>`;
  });
  s += `<line x1="${PL}" y1="${baseY}" x2="${W-PR}" y2="${baseY}" stroke="var(--text-3)" stroke-opacity=".4"/>`;
  // leyenda (arriba del apilado primero)
  const lx = W - PR + 8; let ly = TOP + 2;
  s += `<text x="${lx}" y="${ly}" font-size="9" font-weight="700" fill="var(--ink)">Estado/Provincia</text>`;
  est.slice().reverse().forEach((e, i) => { const yy = ly + 12 + i * 14; s += `<rect x="${lx}" y="${(yy-8).toFixed(1)}" width="10" height="10" rx="2" fill="${colOf(e)}"/><text x="${lx+14}" y="${yy.toFixed(1)}" font-size="8.5" fill="var(--ink)">${esc(e)}</text>`; });
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block" role="img">${s}</svg>`;
}

// ── Contributivo tipo DASHBOARD de claves de vendedores (barras apiladas) ────
// Datos alimentados manualmente por semana desde Administración. El modelo lo
// provee BACK: c.clavesvend = { metaTotal, estados:[], semanas:{ [semN]:{ [estado]:n } } }.
// Usa los helpers globales clavesVendAcum(c, sem) y clavesVendSemana(c, n).
function clavesVendDashHTML(c) {
  const K = c.clavesvend || {};
  const acum   = clavesVendAcum(c, sem);
  const actual = clavesVendSemana(c, sem);
  const metaTot = K.metaTotal || 0;
  const acol = metaTot > 0 ? (acum >= metaTot ? '#4CAF50' : acum >= metaTot * 0.5 ? '#FFC107' : '#E02500') : 'var(--navy)';
  const rango = SEMANAS[sem] || '';
  const cMcis = (c.mciAlineados || []).slice().sort((a,b)=>a-b);
  const cBadges = cMcis.length
    ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px">${cMcis.map(n => `<span class="perf-mci-badge">MCI ${n} · ${esc(ST.mciTitulos?.[n] || 'General')}</span>`).join('')}</div>` : '';
  _cvPending.push(c.id);  // se rellena tras insertar (medir-luego-render responsivo)
  // Suma de claves del MES en curso (mes de la semana actual `sem`): recorre las
  // semanas del payload cuyo mes (MES_DE_SEM) coincide con el mes de `sem`.
  const mesIdx = (typeof MES_DE_SEM !== 'undefined' && MES_DE_SEM) ? MES_DE_SEM[sem] : undefined;
  const semanasK = (c.clavesvend && c.clavesvend.semanas) || {};
  let monthSum = 0, monthWeeks = 0;
  if (mesIdx !== undefined) {
    Object.keys(semanasK).forEach(k => {
      const n = Number(k);
      if (MES_DE_SEM && MES_DE_SEM[n] === mesIdx) {
        const v = clavesVendSemana(c, n);
        monthSum += v;
        if (v > 0) monthWeeks++;
      }
    });
  }
  const mesNom = (mesIdx !== undefined && MESES_LARGO[mesIdx]) ? MESES_LARGO[mesIdx] : 'Mes en curso';
  const monthCard = `<div class="cv-month-card">
      <div class="cv-mc-title">${esc(mesNom)}</div>
      <div class="cv-mc-num">${monthSum}</div>
      <div class="cv-mc-unit">claves</div>
      <div class="cv-mc-sub">${monthWeeks} ${monthWeeks === 1 ? 'semana' : 'semanas'} con datos</div>
    </div>`;
  return `<div class="clavesvend-dash">
    ${cBadges}
    <div class="cv-kpis">
      <div class="cv-kpi hl"><div class="cv-kv" style="color:${acol}">${acum}</div><div class="cv-kl">Total acumulado${metaTot ? ` · meta ${metaTot}` : ''}</div></div>
      <div class="cv-kpi"><div class="cv-kv">${actual}</div><div class="cv-kl">Claves de la semana actual · Sem ${sem}${rango ? ` (${esc(rango)})` : ''}</div></div>
    </div>
    <div class="cv-chart-row">
      <div class="renov-card cv-chart-col"><div class="renov-ct">Claves de vendedores por semana · por Estado/Provincia</div><div class="ptbl-wrap" id="cv-chart-host-${c.id}"></div></div>
      ${monthCard}
    </div>
  </div>`;
}

// Mide el host ya insertado y pinta el SVG a su ancho real (1:1). Instala un
// único ResizeObserver que re-pinta al cambiar el ancho (throttle con rAF).
function renderClavesVendChart(cid) {
  const host = document.getElementById('cv-chart-host-' + cid);
  if (!host) return;
  const m = ST.miembros.find(x => x.id === mActivo);
  const c = m && (m.contributivos || []).find(x => x.id === cid);
  if (!c) return;
  const availW = host.clientWidth || 360;
  host.innerHTML = clavesVendStackedSVG(c, availW);
  // Un solo observer: desconecta el anterior antes de observar el host actual.
  if (_cvResizeObs) _cvResizeObs.disconnect();
  let lastW = availW;
  _cvResizeObs = new ResizeObserver(entries => {
    const w = Math.round(entries[0].contentRect.width);
    if (w === lastW) return;
    lastW = w;
    if (_cvResizeRaf) cancelAnimationFrame(_cvResizeRaf);
    _cvResizeRaf = requestAnimationFrame(() => renderClavesVendChart(cid));
  });
  _cvResizeObs.observe(host);
}

function clavesVendStackedSVG(c, availW) {
  const K = c.clavesvend || {};
  const semanas = K.semanas || {}, estados = K.estados || [], metaTot = K.metaTotal || 0;
  const colOf = e => _clavesColor(e, estados.indexOf(e));
  // Solo las semanas del MES EN CURSO (el mes de la semana seleccionada) que
  // tengan datos, en orden ascendente. Así la gráfica queda alineada con la card
  // del mes y con el navegador de semanas.
  const totOf = n => estados.reduce((a, e) => a + (Number((semanas[n] || {})[e]) || 0), 0);
  const _mesIdx = (typeof MES_DE_SEM !== 'undefined') ? MES_DE_SEM[sem] : null;
  const weeks = Object.keys(semanas)
    .map(Number)
    .filter(n => totOf(n) > 0 && (_mesIdx == null || MES_DE_SEM[n] === _mesIdx))
    .sort((a, b) => a - b);
  if (!weeks.length) {
    const _mesNom = (_mesIdx != null && MESES_LARGO[_mesIdx]) ? MESES_LARGO[_mesIdx] : 'este mes';
    return `<div style="font-size:12px;color:var(--text-3);padding:18px 6px;text-align:center">Sin claves capturadas en ${esc(_mesNom)}. Alimenta los datos desde Administración por semana.</div>`;
  }
  const maxWeek = Math.max(...weeks.map(totOf), 1);
  // La escala se ajusta a los conteos SEMANALES (no a metaTot, que es un objetivo
  // ACUMULADO anual: iría al tope y aplastaría las barras). El semáforo de la meta
  // vive en el acumulado (tarjeta KPI + banner del perfil), no en las barras.
  const vmax = Math.max(maxWeek, 1);
  const YMAX = Math.ceil(vmax / (vmax <= 20 ? 2 : 10)) * (vmax <= 20 ? 2 : 10) || 10, step = YMAX <= 20 ? 2 : YMAX <= 40 ? 5 : 10;

  // ── Layout responsivo (render 1:1: el SVG NO se estira, así que tipografías y
  // trazos conservan su tamaño en px a cualquier ancho). Medimos contra availW. ──
  const AW = Math.max(availW || 360, 200);
  const mobile = AW < 430;                    // en móvil quitamos la columna de leyenda
  const PL = 28, LEG = mobile ? 0 : 122, TOP = 16, BOT = 24;
  const plotW = Math.max(AW - PL - LEG, 120);
  const nW = Math.max(weeks.length, 1);
  // El slot llena el ancho disponible, acotado para que las barras no queden ni
  // amontonadas (mín) ni exageradamente separadas (máx): con muchas semanas cae al
  // mínimo y el contenedor hace scroll; con pocas, ensancha y llena la columna.
  const slot = Math.max(44, Math.min(120, plotW / nW));
  const bw = Math.max(16, Math.min(46, slot * 0.52));
  const plotRight = PL + nW * slot;             // borde derecho del área de barras
  const W = plotRight + LEG;                    // ancho total del contenido
  // Alto proporcional a los datos, acotado; se extiende si la leyenda (una fila
  // por estado) necesita más espacio, para no recortarla.
  const plotH = Math.max(150, Math.min(240, 150 + YMAX * 4));
  const baseY = TOP + plotH;
  const legHeight = LEG ? (40 + estados.length * 12) : 0;
  const H = Math.max(TOP + plotH + BOT, legHeight);
  const yOf = v => baseY - (v / YMAX) * plotH;
  let s = '';
  for (let g = 0; g <= YMAX; g += step) { const y = yOf(g); s += `<line x1="${PL}" y1="${y.toFixed(1)}" x2="${plotRight}" y2="${y.toFixed(1)}" stroke="rgba(5,23,46,.08)"/><text x="${PL-5}" y="${(y+3).toFixed(1)}" font-size="8" fill="var(--text-3)" text-anchor="end">${g}</text>`; }
  const cxOf = i => PL + slot * i + slot / 2;
  // Barras apiladas (reveal escalonado por semana)
  weeks.forEach((n, wi) => {
    const cx = cxOf(wi), x = cx - bw / 2, wk = semanas[n] || {};
    if (n === sem) s += `<rect x="${(cx - slot/2 + 2).toFixed(1)}" y="${TOP.toFixed(1)}" width="${(slot-4).toFixed(1)}" height="${(baseY-TOP).toFixed(1)}" fill="#E0A80014" rx="4"/>`;
    let acc = 0;
    estados.forEach(e => {
      const nn = Number(wk[e]) || 0; if (!nn) return;
      const y0 = yOf(acc), y1 = yOf(acc + nn);
      s += `<rect class="rbar" style="animation-delay:${(wi*0.05).toFixed(2)}s" x="${x.toFixed(1)}" y="${y1.toFixed(1)}" width="${bw.toFixed(1)}" height="${(y0 - y1).toFixed(1)}" fill="${colOf(e)}"><title>Sem ${n} · ${esc(e)}: ${nn} clave${nn===1?'':'s'}</title></rect>`;
      acc += nn;
    });
  });
  // Línea total general + etiquetas numéricas encima de cada barra
  const poly = weeks.map((n, i) => `${cxOf(i).toFixed(1)},${yOf(totOf(n)).toFixed(1)}`).join(' ');
  s += `<polyline class="rline" points="${poly}" fill="none" stroke="#f28e2b" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
  weeks.forEach((n, i) => {
    const t = totOf(n), cx = cxOf(i), yy = yOf(t);
    s += `<circle cx="${cx.toFixed(1)}" cy="${yy.toFixed(1)}" r="2.6" fill="#f28e2b"><title>Sem ${n} · Total general: ${t}</title></circle>`;
    s += `<text x="${cx.toFixed(1)}" y="${(yy-7).toFixed(1)}" font-size="11" font-weight="800" fill="var(--ink)" text-anchor="middle">${t}</text>`;
    const cur = n === sem;
    s += `<text x="${cx.toFixed(1)}" y="${(baseY+14).toFixed(1)}" font-size="9.5" font-weight="${cur?'800':'400'}" fill="${cur?'#a76a00':'var(--text-3)'}" text-anchor="middle">Sem ${n}</text>`;
  });
  s += `<line x1="${PL}" y1="${baseY}" x2="${plotRight}" y2="${baseY}" stroke="var(--text-3)" stroke-opacity=".4"/>`;
  // Leyenda "Total general" + estados (columna derecha; en móvil va como chips HTML)
  if (LEG) {
    const lx = plotRight + 8; let ly = TOP + 2;
    s += `<line x1="${lx}" y1="${(ly-3).toFixed(1)}" x2="${lx+11}" y2="${(ly-3).toFixed(1)}" stroke="#f28e2b" stroke-width="2"/><circle cx="${lx+5.5}" cy="${(ly-3).toFixed(1)}" r="2.4" fill="#f28e2b"/><text x="${lx+15}" y="${ly.toFixed(1)}" font-size="8" font-weight="700" fill="var(--ink)">Total general</text>`;
    ly += 13;
    s += `<text x="${lx}" y="${ly.toFixed(1)}" font-size="8.5" font-weight="700" fill="var(--ink)">Estado/Provincia</text>`;
    estados.slice().reverse().forEach((e, i) => { const yy = ly + 11 + i * 12; s += `<rect x="${lx}" y="${(yy-8).toFixed(1)}" width="9" height="9" rx="2" fill="${colOf(e)}"/><text x="${lx+13}" y="${yy.toFixed(1)}" font-size="8" fill="var(--ink)">${esc(e)}</text>`; });
  }
  // Render 1:1 (viewBox = W×H reales): sin estirar, la tipografía y los trazos
  // conservan sus px. Si W ≤ availW se centra; si W > availW, .ptbl-wrap desplaza.
  const svg = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="display:block;margin:0 auto" role="img">${s}</svg>`;
  // En móvil la leyenda se muestra como chips HTML bajo el SVG (no comprime el plot).
  if (mobile) {
    const chips = `<span class="cv-leg-chip"><i class="cv-leg-line"></i>Total general</span>` +
      estados.map(e => `<span class="cv-leg-chip"><i style="background:${colOf(e)}"></i>${esc(e)}</span>`).join('');
    return svg + `<div class="cv-leg-chips">${chips}</div>`;
  }
  return svg;
}

// ── Handlers de UI ──────────────────────────────────────────────────────────
function selPerfTab(i)  { perfTab = i; renovMes = 'todos'; predMes = null; renderPerfil(); }

// Cambio de mes en medidas predictivas semanales (ej. Sandra): re-render completo,
// la tabla es pequeña y no requiere la animación parcial de renovDynHTML.
function selPredMes(v) { predMes = v; renderPerfil(); }

// Cambio de mes: actualiza SOLO la parte dinámica (KPIs + barras) para animar la
// transición sin re-renderizar toda la vista. Si no encuentra los nodos, recae en render completo.
function selRenovMes(v) {
  renovMes = v;
  const dyn = document.getElementById('renov-dyn');
  const monthsRow = document.getElementById('renov-months');
  const m = ST.miembros.find(x => x.id === mActivo);
  const c = m && (m.contributivos || [])[perfTab];
  if (!dyn || !monthsRow || !c || !c.dash) { renderPerfil(); return; }
  monthsRow.querySelectorAll('.mchip').forEach(b => b.classList.toggle('on', b.dataset.mes === String(v)));
  dyn.innerHTML = renovDynHTML(c.dash, c.dash.meta || 75);
}

// ── Edición de medidas (Actual) ─────────────────────────────────────────────
// Localiza una medida por id (en cualquier contributivo) y fija/borra su `actual`.
function setPredActualRaw(pid, val) {
  for (const m of ST.miembros) {
    for (const c of (m.contributivos || [])) {
      const p = (c.preds || []).find(x => x.id === pid);
      if (p) {
        const num = parseFloat(val);
        if (val === '' || val === null || val === undefined || isNaN(num)) delete p.actual;
        else p.actual = num;
        return true;
      }
    }
  }
  return false;
}

function savePredActual(pid, val) {
  if (!canEdit()) { toast('Sin permisos'); return; }
  if (!setPredActualRaw(pid, val)) return;
  renderTablero();
  if (pagina === 'perfil') renderPerfil();
  guardarConfig();
}
