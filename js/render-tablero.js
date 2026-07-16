// ── Vista Tablero MCI (WIGs + gráfico racetrack) — extraído de render.js (v2.3) ──

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
      const sc  = pct >= 100 ? '#4CAF50' : pct >= 50 ? '#FFC107' : '#E8220A';
      box.innerHTML = `<div class="mhdr">
        <div class="mhdr-av" style="background:${m.color}">${esc(m.ini)}</div>
        <div class="mhdr-info">
          <div class="mhdr-name">${esc(m.nombre)}</div>
          <div class="mhdr-cargo">${esc(m.cargo)}</div>
          <div class="mhdr-mci">${esc(m.mci)}</div>
          <span class="tag ${m.tc}" style="margin-top:6px;display:inline-block">${esc(m.tag)}</span>
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

  // Tarjetas MCI: una por cada número de MCI, mostrando promedio de avance de sus elementos
  const mciNums2 = [...new Set(ST.wigs.map(w => w.mci))].sort((a,b) => a-b);
  const mciCards = mciNums2.map(n => {
    // Solo los elementos con datos capturados cuentan para el semáforo
    const ws  = ST.wigs.filter(w => w.mci === n && wigTieneDatos(w.id));
    const avs = ws.map(w => {
      const a = getWigVal(sem, w.id);
      return Math.min(100, Math.max(0, Math.round((a - w.inicio) / (w.meta - w.inicio) * 100)));
    });
    const tit = esc(ST.mciTitulos?.[n] || `MCI ${n}`);
    if (!avs.length) {
      return `<div class="scard" style="border-top:4px solid var(--border)">
        <div class="slabel">MCI ${n} · ${tit}</div>
        <div class="sval" style="color:var(--text-4)">—</div>
        <div class="ssub">sin datos</div>
      </div>`;
    }
    const avg = Math.round(avs.reduce((a, b) => a + b, 0) / avs.length);
    const sc  = avg >= 100 ? '#4CAF50' : avg >= 50 ? '#FFC107' : '#E02500';
    const vc  = avg >= 100 ? 'g' : avg < 50 ? 'r' : '';
    return `<div class="scard" style="border-top:4px solid ${sc}">
      <div class="slabel">MCI ${n} · ${tit}</div>
      <div class="sval ${vc}">${avg}%</div>
    </div>`;
  }).join('');

  document.getElementById('scards').innerHTML = `
    ${mciCards}
    <div class="scard" style="border-top:4px solid ${pct2 >= 100 ? '#4CAF50' : pct2 >= 50 ? '#FFC107' : '#E02500'}">
      <div class="slabel">Compromisos sem. ${sem}</div>
      <div class="sval ${pct2 >= 100 ? 'g' : pct2 >= 50 ? '' : 'r'}">${pct2}%</div>
      <div class="ssub">${dn} de ${tot} cumplidos</div>
    </div>
    <div class="scard">
      <div class="slabel">Semana de ejecución</div>
      <div class="sval">${sem}</div>
      <div class="ssub">de ${TOTAL_SEM} · Cierre 31 dic 2026</div>
    </div>`;

  // Bloques MCI
  const ro = !canEdit();
  // Gráfico racetrack: carriles + línea de meta ideal (metaSem acumulado)
  // + línea de avance real (rectas entre semanas con valor explícito).
  function wigTrackSVG(w, lineColor) {
    const W = 560, H = 56, PL = 6, PR = 6, PT = 7, PB = 7;
    // Ritmo de la línea ideal: metaSem solo aplica si está en la misma unidad
    // que el acumulado (sin override uniSem); si no, ritmo derivado de la meta anual
    const mismaUni = w.uniSem == null || w.uniSem === '' || w.uniSem === w.uni;
    const wkTarget = (mismaUni && w.metaSem != null && w.metaSem > 0)
      ? w.metaSem
      : (w.meta - w.inicio) / TOTAL_SEM;
    const a = getWigVal(sem, w.id);
    const idealEnd = Math.min(w.meta, w.inicio + wkTarget * (TOTAL_SEM - 1));
    const vmin = Math.min(w.inicio, a);
    const vmax = Math.max(w.meta, a, idealEnd);
    const span = (vmax - vmin) || 1;
    const x = k => PL + (k - 1) / (TOTAL_SEM - 1) * (W - PL - PR);
    const y = v => H - PB - (v - vmin) / span * (H - PT - PB);
    // Carriles alternados de fondo
    const laneH = H / 4;
    let lanes = '';
    for (let i = 0; i < 4; i++) {
      if (i % 2 === 0) lanes += `<rect x="0" y="${(i * laneH).toFixed(1)}" width="${W}" height="${laneH.toFixed(1)}" fill="rgba(5,23,46,.05)"/>`;
    }
    // Línea ideal: recta desde inicio; si alcanza la meta antes de la última semana, tramo plano
    const hitWeek = wkTarget > 0 ? 1 + (w.meta - w.inicio) / wkTarget : TOTAL_SEM;
    const ideal = hitWeek < TOTAL_SEM
      ? `M${x(1).toFixed(1)},${y(w.inicio).toFixed(1)} L${x(hitWeek).toFixed(1)},${y(w.meta).toFixed(1)} L${x(TOTAL_SEM).toFixed(1)},${y(w.meta).toFixed(1)}`
      : `M${x(1).toFixed(1)},${y(w.inicio).toFixed(1)} L${x(TOTAL_SEM).toFixed(1)},${y(idealEnd).toFixed(1)}`;
    // Línea real: anclas = semanas con valor guardado; sin historial es una
    // recta pura inicio → valor actual en la semana en curso
    const pts = [[1, w.inicio]];
    for (let k = 1; k <= sem; k++) {
      const sk = ST.semanas[k];
      if (sk && sk.wigs[w.id] !== undefined) pts.push([k, parseFloat(sk.wigs[w.id])]);
    }
    const last = pts[pts.length - 1];
    if (last[0] < sem) pts.push([sem, a]);
    const real = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p[0]).toFixed(1)},${y(p[1]).toFixed(1)}`).join(' ');
    const ex = x(pts[pts.length - 1][0]).toFixed(1), ey = y(pts[pts.length - 1][1]).toFixed(1);
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" class="wig-track-svg" aria-hidden="true">
      ${lanes}
      <path d="${ideal}" stroke="#999" stroke-width="1.3" stroke-dasharray="4 3" fill="none" vector-effect="non-scaling-stroke"/>
      <path d="${real}" stroke="${lineColor}" stroke-width="2.2" fill="none" vector-effect="non-scaling-stroke"/>
      <circle cx="${ex}" cy="${ey}" r="4.5" fill="${lineColor}" stroke="#fff" stroke-width="1.5"/>
    </svg>`;
  }

  function mciBloque(num, tit, ws) {
    const rows = ws.map(w => {
      const conDatos = wigTieneDatos(w.id);
      const a   = getWigVal(sem, w.id);
      const av  = Math.min(100, Math.max(0, Math.round((a - w.inicio) / (w.meta - w.inicio) * 100)));
      // Sin datos capturados: línea neutra, fuera del semáforo
      const lineColor = !conDatos ? 'var(--border)' : av >= 100 ? 'var(--green)' : av >= 50 ? 'var(--yellow)' : 'var(--cta)';
      const ws_      = s.wigSem[w.id];
      const wkTarget = (w.metaSem != null && w.metaSem > 0) ? w.metaSem : (w.meta - w.inicio) / TOTAL_SEM;
      const wkPct    = (ws_ != null && wkTarget > 0) ? Math.min(100, Math.round(ws_ / wkTarget * 100)) : null;
      const wkFc     = wkPct === null ? 'fy' : wkPct >= 100 ? 'fg' : wkPct >= 50 ? 'fy' : 'fr';
      const wkUni    = esc((w.uniSem != null && w.uniSem !== '') ? w.uniSem : w.uni);
      const wkVal    = ws_ != null ? `${ws_ > 0 ? '+' : ''}${ws_}${wkUni === '%' ? '' : wkUni}` : '—';
      const wkScale  = wkPct !== null ? (wkPct / 100).toFixed(3) : '0';
      const semRow   = `<div class="wig-semline">
        <span class="wig-semline-lbl">Avance sem. ${sem}</span>
        <span class="wig-sem-val">${wkVal}</span>
        <div class="wig-sem-bwrap"><div class="mfill ${wkFc}" style="transform:scaleX(${wkScale})"></div></div>
        <span class="wmeta">meta ${wkTarget > 0 ? (Math.round(wkTarget * 10) / 10) + (wkUni === '%' ? '' : wkUni) : '—'}${w.metaSem == null ? ' (auto)' : ''}</span>
      </div>`;
      return `<div class="wig-pair">
        <div class="wrow">
          <span class="wnombre">${esc(w.label)}</span>
          <div class="wig-val-row">
            <span class="wactual">${conDatos ? a + esc(w.uni) : '—'}</span><span class="wmeta">→ meta ${w.meta}${esc(w.uni)}</span>${conDatos ? '' : '<span class="wmeta" style="font-style:italic">sin datos — no cuenta en semáforos</span>'}
          </div>
          <div class="wig-track">${wigTrackSVG(w, lineColor)}</div>
          <div class="wfoot"><span>inicio: ${w.inicio}${esc(w.uni)} · sem 1</span><span>${esc(w.sub || '')}</span><span>sem ${TOTAL_SEM}</span></div>
        </div>${semRow}
      </div>`;
    }).join('');
    // Promedio del bloque: solo elementos con datos capturados
    const avgs = ws.filter(w => wigTieneDatos(w.id)).map(w => {
      const a = getWigVal(sem, w.id);
      return Math.round((a - w.inicio) / (w.meta - w.inicio) * 100);
    });
    const avg = avgs.length ? Math.round(avgs.reduce((a, b) => a + b, 0) / avgs.length) : null;
    const bc  = avg === null ? 'by' : avg >= 100 ? 'bg' : avg >= 50 ? 'by' : 'br';
    const et  = avg === null ? 'Sin datos' : avg >= 100 ? 'Verde' : avg >= 50 ? 'Amarillo' : 'Rojo';

    return `<div class="mci-block">
      <div class="mci-hdr">
        <div class="mci-num">${num}</div>
        <div class="mci-tit">${esc(tit)}</div>
        <span class="mci-avg">${avg === null ? '—' : avg + '%'}</span>
        <span class="badge ${bc}">${et}</span>
      </div>${rows}
    </div>`;
  }
  const mciNums = [...new Set(ST.wigs.map(w => w.mci))].sort((a,b) => a-b);
  const divMCI = `<div class="divisor" style="grid-column:1/-1">
    <div class="divisor-line"></div>
    <div class="divisor-pill">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
        <line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
      </svg>MCIs generales
    </div>
    <div class="divisor-line rev"></div>
  </div>`;
  document.getElementById('twigs').innerHTML =
    divMCI + mciNums.map(n => mciBloque(n, ST.mciTitulos?.[n] || `MCI ${n}`, ST.wigs.filter(w => w.mci === n))).join('');

  // Predictivas — siempre muestra todos los integrantes sin importar la selección
  const areas = ST.miembros;
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
  const bl = `<div class="contrib-grid">${areas.map(m => {
    const predScore = predScoreAcum(m);
    const sc  = predScore === null ? '#bbb' : predScore >= 100 ? '#4CAF50' : predScore >= 50 ? '#FFC107' : '#E02500';
    const bgc = predScore === null ? '#f8f8f8' : predScore >= 100 ? '#f0faf2' : predScore >= 50 ? '#fffbf0' : '#fff5f3';
    const R = 28, CX = 34, CY = 34, SW = 7;
    const circ = 2 * Math.PI * R;
    const filled = predScore !== null ? (predScore / 100) * circ : 0;
    const mciTags = (m.mciAlineados||[]).map(n =>
      `<span class="contrib-mci-tag">MCI ${n}</span>`).join('');
    return `<div class="contrib-card" style="background:${bgc};border-color:${sc}40"
        onclick="selectM('${m.id}')"
        tabindex="0" role="button"
        aria-label="Ver perfil de ${esc(m.nombre)}"
        onkeydown="if(event.key==='Enter'||event.key===' '){selectM('${m.id}');event.preventDefault()}"
        title="Ver perfil de ${esc(m.nombre)}">
      <div class="contrib-card-top">
        <div class="contrib-av" style="background:${m.color}">${esc(m.ini)}</div>
        <div class="contrib-info">
          <div class="contrib-name">${esc(m.nombre)}</div>
          <div class="contrib-cargo">${esc(m.cargo)}</div>
          ${mciTags ? `<div class="contrib-tags">${mciTags}</div>` : ''}
        </div>
      </div>
      <div class="contrib-score-row">
        <svg width="68" height="68" viewBox="0 0 68 68" style="flex-shrink:0">
          <circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="#e8e8e8" stroke-width="${SW}"/>
          <circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="${sc}" stroke-width="${SW}"
            stroke-dasharray="${filled.toFixed(1)} ${circ.toFixed(1)}" stroke-linecap="round"
            transform="rotate(-90 ${CX} ${CY})"/>
          <text x="${CX}" y="${CY + 4}" text-anchor="middle" fill="${sc}"
            font-size="11" font-weight="800" font-family="Lato,sans-serif">${predScore !== null ? predScore+'%' : '—'}</text>
        </svg>
        <div class="contrib-score-info">
          <div class="contrib-score-lbl">MCI Contributivo</div>
          <div class="contrib-score-num" style="color:${sc}">${predScore !== null ? predScore+'%' : 'Sin datos'}</div>
          <div class="contrib-score-sub">${esc(m.mci.length > 60 ? m.mci.slice(0,59)+'…' : m.mci)}</div>
        </div>
      </div>
    </div>`;
  }).join('')}</div>`;
  document.getElementById('tpreds').innerHTML = div + bl;
}

function updWIG(id, v) {
  if (!canEdit()) { toast('Sin permisos'); return; }
  if (!v && v !== 0) return;
  const s = getSem(sem);
  s.wigs[id] = parseFloat(v);
  if (!s.wigsExplicit) s.wigsExplicit = {};
  s.wigsExplicit[id] = true;
  renderTablero();
  guardarSemana(sem);
}

function updPred(id, v) {
  if (!canEdit()) { toast('Sin permisos'); return; }
  if (!v && v !== 0) return;
  getSem(sem).preds[id] = parseFloat(v);
  renderTablero();
  if (pagina === 'perfil') renderPerfil();
  guardarSemana(sem);
}

