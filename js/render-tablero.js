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
          <div class="mhdr-mci">${(() => { const cs = m.contributivos || []; return cs.length > 1 ? `${cs.length} MCI contributivos` : esc(cs[0]?.nombre || ''); })()}</div>
          ${(() => { const et = etiquetaMCI(m); return `<span class="tag ${et.tc}" style="margin-top:6px;display:inline-block">${esc(et.texto)}</span>`; })()}
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
      return Math.min(100, Math.max(0, Math.round(a / w.meta * 100)));
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
  // Gráfico de barras mensual: por cada mes con dato, una barra = acumulado a la
  // última semana del mes + carril tenue = ritmo ideal del mes (meta × mes/12).
  // CADA barra se colorea con su semáforo MENSUAL: acumulado del mes vs. ritmo
  // ideal de ese mes (verde ≥100%, amarillo ≥50%, rojo <50%). Meses sin captura
  // quedan vacíos. Resalta el mes en curso.
  const MESES_G = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  const _colFill = p => p >= 100 ? 'var(--green)'    : p >= 50 ? 'var(--yellow)'    : 'var(--cta)';
  const _colDk   = p => p >= 100 ? 'var(--green-dk)' : p >= 50 ? 'var(--yellow-dk)' : 'var(--red-dk)';
  const PALETA_GRUPO = ['#2563eb', '#ea580c', '#7c3aed', '#0d9488'];
  function wigBarrasMes(w) {
    const W = 360, H = 138, PL = 8, PR = 8, TOP = 20, BOT = 42;
    const baseY = H - BOT, usable = baseY - TOP;
    const a = getWigVal(sem, w.id);
    const vmax = Math.max(w.meta, a, 1);            // escala a la meta (o al valor si la rebasa)
    const hY = v => (v / vmax) * usable;
    const slot = (W - PL - PR) / 12;
    const barW = slot * 0.6;
    const bxOf = m => PL + slot * m + (slot - barW) / 2;
    const cxOf = m => PL + slot * m + slot / 2;
    const mesActual = MES_DE_SEM[sem];
    const fmt = v => (Math.round(v * 10) / 10).toString();
    // Primera pasada: qué meses tienen dato (captura explícita hasta la semana en curso)
    const conDato = {};
    let ultimoMes = -1;
    for (let m = 0; m < 12; m++) {
      const lastWk = ULTIMA_SEM_MES[m];
      const wkCap = lastWk ? Math.min(lastWk, sem) : 0;
      let tiene = false;
      if (lastWk) for (let k = 1; k <= wkCap; k++) {
        if (MES_DE_SEM[k] === m && ST.semanas[k] && ST.semanas[k].wigs && ST.semanas[k].wigs[w.id] !== undefined) { tiene = true; break; }
      }
      conDato[m] = tiene ? wkCap : 0;
      if (tiene) ultimoMes = m;
    }
    // Mes a resaltar: el mes en curso si tiene barra; si no, el último con dato.
    const mesResaltado = conDato[mesActual] ? mesActual : ultimoMes;
    // Meta mensual: 'fija' (= la meta cada mes) o 'rampa' (acumulada meta×mes/12).
    // Se decide por el flag explícito w.metaMensual; si no existe, se infiere por
    // la unidad (% → fija, conteo → rampa).
    const metaFijaMensual = w.metaMensual ? (w.metaMensual === 'fija')
                                          : ((w.uni || '').trim() === '%');
    let carriles = '', barras = '', valores = '', highlight = '', meses = '', metasMes = '';
    for (let m = 0; m < 12; m++) {
      const cx = cxOf(m);
      meses += `<text x="${cx.toFixed(1)}" y="${(baseY + 14).toFixed(1)}" font-size="9" fill="${conDato[m] ? '#666' : '#c2c2c2'}" text-anchor="middle">${MESES_G[m]}</text>`;
      if (!conDato[m]) continue;
      const val = getWigVal(conDato[m], w.id);
      const ideal = metaFijaMensual ? w.meta : w.meta * ((m + 1) / 12);
      // Semáforo MENSUAL de esta barra: acumulado del mes vs. ritmo ideal del mes
      const pMes = ideal > 0 ? (val / ideal) * 100 : (val > 0 ? 100 : 0);
      const bFill = _colFill(pMes), bDk = _colDk(pMes);
      const bx = bxOf(m), ch = hY(ideal), bh = Math.max(hY(val), 1.5);
      carriles += `<rect x="${bx.toFixed(1)}" y="${(baseY - ch).toFixed(1)}" width="${barW.toFixed(1)}" height="${ch.toFixed(1)}" rx="2" fill="rgba(5,23,46,.07)"/>`;
      barras   += `<rect x="${bx.toFixed(1)}" y="${(baseY - bh).toFixed(1)}" width="${barW.toFixed(1)}" height="${bh.toFixed(1)}" rx="2" fill="${bFill}"/>`;
      valores  += `<text x="${cx.toFixed(1)}" y="${(baseY - Math.max(ch, bh) - 3).toFixed(1)}" font-size="8.5" font-weight="700" fill="${bDk}" text-anchor="middle">${fmt(val)}</text>`;
      // Valor de la META de este mes (ritmo ideal), bajo la etiqueta del mes.
      metasMes += `<text x="${cx.toFixed(1)}" y="${(baseY + 25).toFixed(1)}" font-size="8" font-weight="700" fill="var(--mid)" text-anchor="middle">${Math.round(ideal)}</text>`;
      metasMes += `<text x="${cx.toFixed(1)}" y="${(baseY + 33).toFixed(1)}" font-size="6.5" fill="#9aa" text-anchor="middle">meta</text>`;
      if (m === mesResaltado) {
        const hh = Math.max(ch, bh);
        highlight = `<rect x="${(bx - 2).toFixed(1)}" y="${(baseY - hh - 2).toFixed(1)}" width="${(barW + 4).toFixed(1)}" height="${(hh + 2).toFixed(1)}" rx="3" fill="none" stroke="var(--navy)" stroke-width="1.3"/>`;
      }
    }
    // Línea de meta: horizontal punteada al nivel de la meta (arriba si nadie la rebasa).
    const metaY = baseY - hY(w.meta);
    const metaLine = `<line x1="${PL}" y1="${metaY.toFixed(1)}" x2="${W - PR}" y2="${metaY.toFixed(1)}" stroke="var(--cta)" stroke-width="1" stroke-dasharray="5 3"/>`;
    return `<svg viewBox="0 0 ${W} ${H}" class="wig-bar-svg" aria-hidden="true">
      ${carriles}${metaLine}${barras}${highlight}${valores}
      <line x1="${PL}" y1="${baseY}" x2="${W - PR}" y2="${baseY}" stroke="rgba(5,23,46,.15)" stroke-width="1"/>
      <text x="${W - PR}" y="${(metaY - 3).toFixed(1)}" font-size="8" font-weight="700" fill="var(--cta)" text-anchor="end">meta ${fmt(w.meta)}</text>
      ${meses}${metasMes}
    </svg>`;
  }

  // Gráfica MENSUAL AGRUPADA: varias barras por mes (una por elemento), escala
  // 0–100%, con línea de meta de referencia. Para MCIs de elementos en % (ej.
  // conservación: Franquicias + Promotorías juntas).
  function wigBarrasMesGrupo(ws, metaLinea) {
    const W = 360, H = 152, PL = 8, PR = 8, TOP = 26, BOT = 42;
    const baseY = H - BOT, usable = baseY - TOP, vmax = 100;
    const hY = v => (v / vmax) * usable;
    const slot = (W - PL - PR) / 12;
    const cxOf = m => PL + slot * m + slot / 2;
    const grpW = slot * 0.66, bw = grpW / ws.length;
    const mesActual = MES_DE_SEM[sem];
    const fmt = v => (Math.round(v * 10) / 10).toString();
    const info = ws.map((w, j) => {
      const cd = {};
      for (let m = 0; m < 12; m++) {
        const lastWk = ULTIMA_SEM_MES[m], wkCap = lastWk ? Math.min(lastWk, sem) : 0;
        let tiene = false;
        if (lastWk) for (let k = 1; k <= wkCap; k++) {
          if (MES_DE_SEM[k] === m && ST.semanas[k] && ST.semanas[k].wigs && ST.semanas[k].wigs[w.id] !== undefined) { tiene = true; break; }
        }
        cd[m] = tiene ? wkCap : 0;
      }
      return { w, j, cd, color: PALETA_GRUPO[j % PALETA_GRUPO.length] };
    });
    const monthHas = m => info.some(x => x.cd[m]);
    let barras = '', valores = '', meses = '', highlight = '';
    for (let m = 0; m < 12; m++) {
      const cx = cxOf(m), hay = monthHas(m);
      meses += `<text x="${cx.toFixed(1)}" y="${(baseY + 14).toFixed(1)}" font-size="9" fill="${hay ? '#666' : '#c2c2c2'}" text-anchor="middle">${MESES_G[m]}</text>`;
      if (!hay) continue;
      const grpStart = cx - grpW / 2;
      info.forEach(it => {
        if (!it.cd[m]) return;
        const val = getWigVal(it.cd[m], it.w.id);
        const bx = grpStart + it.j * bw;
        const bh = Math.max(hY(val), 1.5);
        barras  += `<rect x="${bx.toFixed(1)}" y="${(baseY - bh).toFixed(1)}" width="${(bw - 1).toFixed(1)}" height="${bh.toFixed(1)}" rx="1.5" fill="${it.color}"/>`;
        valores += `<text x="${(bx + bw / 2).toFixed(1)}" y="${(baseY - bh - 2).toFixed(1)}" font-size="7" font-weight="700" fill="${it.color}" text-anchor="middle">${fmt(val)}</text>`;
      });
      if (m === mesActual) {
        highlight += `<rect x="${(grpStart - 2).toFixed(1)}" y="${TOP.toFixed(1)}" width="${(grpW + 4).toFixed(1)}" height="${(baseY - TOP).toFixed(1)}" rx="3" fill="none" stroke="var(--navy)" stroke-width="1" stroke-dasharray="2 2"/>`;
      }
    }
    const metaY = baseY - hY(metaLinea);
    const metaLine = `<line x1="${PL}" y1="${metaY.toFixed(1)}" x2="${W - PR}" y2="${metaY.toFixed(1)}" stroke="var(--cta)" stroke-width="1.2" stroke-dasharray="5 3"/>`;
    let leyenda = '';
    info.forEach((it, i) => {
      const lx = PL + i * 92;
      leyenda += `<rect x="${lx}" y="4" width="9" height="9" rx="2" fill="${it.color}"/><text x="${lx + 12}" y="12" font-size="8.5" fill="var(--ink)">${esc(it.w.label)}</text>`;
    });
    return `<svg viewBox="0 0 ${W} ${H}" class="wig-bar-svg" aria-hidden="true">
      ${leyenda}${metaLine}${barras}${highlight}${valores}
      <line x1="${PL}" y1="${baseY}" x2="${W - PR}" y2="${baseY}" stroke="rgba(5,23,46,.15)" stroke-width="1"/>
      <text x="${W - PR}" y="${(metaY - 3).toFixed(1)}" font-size="8" font-weight="700" fill="var(--cta)" text-anchor="end">meta ${fmt(metaLinea)}%</text>
      ${meses}
    </svg>`;
  }

  // Gráfica MENSUAL combinada: barra = cantidad (elemento de conteo) y su porción
  // "con venta" (conteo × % del elemento en %). Solo aparecen los meses con dato.
  function wigBarrasClaves(cntW, pctW) {
    const W = 360, H = 150, PL = 8, PR = 8, TOP = 22, BOT = 42;
    const baseY = H - BOT, usable = baseY - TOP;
    const vmax = Math.max(cntW.meta, getWigVal(sem, cntW.id), 1);
    const hY = v => (v / vmax) * usable;
    const slot = (W - PL - PR) / 12, barW = slot * 0.58;
    const bxOf = m => PL + slot * m + (slot - barW) / 2;
    const cxOf = m => PL + slot * m + slot / 2;
    const mesActual = MES_DE_SEM[sem];
    const fmt = v => (Math.round(v * 10) / 10).toString();
    const conDatoDe = wid => {
      const cd = {};
      for (let m = 0; m < 12; m++) {
        const lastWk = ULTIMA_SEM_MES[m], wkCap = lastWk ? Math.min(lastWk, sem) : 0;
        let tiene = false;
        if (lastWk) for (let k = 1; k <= wkCap; k++) {
          if (MES_DE_SEM[k] === m && ST.semanas[k] && ST.semanas[k].wigs && ST.semanas[k].wigs[wid] !== undefined) { tiene = true; break; }
        }
        cd[m] = tiene ? wkCap : 0;
      }
      return cd;
    };
    const cdCnt = conDatoDe(cntW.id), cdPct = conDatoDe(pctW.id);
    let bars = '', greens = '', vals = '', meses = '', highlight = '';
    for (let m = 0; m < 12; m++) {
      const cx = cxOf(m), hay = cdCnt[m];
      meses += `<text x="${cx.toFixed(1)}" y="${(baseY + 14).toFixed(1)}" font-size="9" fill="${hay ? '#666' : '#c2c2c2'}" text-anchor="middle">${MESES_G[m]}</text>`;
      if (!hay) continue;
      const cnt = getWigVal(cdCnt[m], cntW.id);
      const pct = cdPct[m] ? getWigVal(cdPct[m], pctW.id) : 0;
      const venta = cnt * pct / 100;
      const bx = bxOf(m), htot = Math.max(hY(cnt), 1.5), hven = hY(venta);
      bars   += `<rect x="${bx.toFixed(1)}" y="${(baseY - htot).toFixed(1)}" width="${barW.toFixed(1)}" height="${htot.toFixed(1)}" rx="2" fill="rgba(5,23,46,.12)"/>`;
      greens += `<rect x="${bx.toFixed(1)}" y="${(baseY - hven).toFixed(1)}" width="${barW.toFixed(1)}" height="${hven.toFixed(1)}" rx="2" fill="#0d9488"/>`;
      vals   += `<text x="${cx.toFixed(1)}" y="${(baseY - htot - 12).toFixed(1)}" font-size="8" font-weight="700" fill="var(--ink)" text-anchor="middle">${fmt(cnt)}</text>`;
      vals   += `<text x="${cx.toFixed(1)}" y="${(baseY - htot - 3).toFixed(1)}" font-size="8" font-weight="800" fill="#0f766e" text-anchor="middle">${fmt(pct)}%</text>`;
      if (m === mesActual) {
        highlight += `<rect x="${(bx - 2).toFixed(1)}" y="${TOP.toFixed(1)}" width="${(barW + 4).toFixed(1)}" height="${(baseY - TOP).toFixed(1)}" rx="3" fill="none" stroke="var(--navy)" stroke-width="1" stroke-dasharray="2 2"/>`;
      }
    }
    const metaY = baseY - hY(cntW.meta);
    const metaLine = `<line x1="${PL}" y1="${metaY.toFixed(1)}" x2="${W - PR}" y2="${metaY.toFixed(1)}" stroke="var(--cta)" stroke-width="1" stroke-dasharray="5 3"/>`;
    const leyenda =
      `<rect x="${PL}" y="4" width="9" height="9" rx="2" fill="#0d9488"/><text x="${PL + 12}" y="12" font-size="8.5" fill="var(--ink)">Con venta 90d</text>` +
      `<rect x="${PL + 92}" y="4" width="9" height="9" rx="2" fill="rgba(5,23,46,.12)"/><text x="${PL + 104}" y="12" font-size="8.5" fill="var(--ink)">Claves</text>`;
    return `<svg viewBox="0 0 ${W} ${H}" class="wig-bar-svg" aria-hidden="true">
      ${leyenda}${bars}${metaLine}${greens}${highlight}${vals}
      <line x1="${PL}" y1="${baseY}" x2="${W - PR}" y2="${baseY}" stroke="rgba(5,23,46,.15)" stroke-width="1"/>
      <text x="${W - PR}" y="${(metaY - 3).toFixed(1)}" font-size="8" font-weight="700" fill="var(--cta)" text-anchor="end">meta ${fmt(cntW.meta)}</text>
      ${meses}
    </svg>`;
  }

  function mciBloque(num, tit, ws) {
    // MCI de elementos en % (varios) → una sola gráfica agrupada (ej. conservación).
    const esGrupoPct = ws.length > 1 && ws.every(w => (w.uni || '').trim() === '%');
    if (esGrupoPct) {
      const avgs = ws.filter(w => wigTieneDatos(w.id)).map(w =>
        Math.min(100, Math.max(0, Math.round(getWigVal(sem, w.id) / w.meta * 100))));
      const avg = avgs.length ? Math.round(avgs.reduce((a, b) => a + b, 0) / avgs.length) : null;
      const bc  = avg === null ? 'by' : avg >= 100 ? 'bg' : avg >= 50 ? 'by' : 'br';
      const et  = avg === null ? 'Sin datos' : avg >= 100 ? 'Verde' : avg >= 50 ? 'Amarillo' : 'Rojo';
      return `<div class="mci-block">
        <div class="mci-hdr">
          <div class="mci-num">${num}</div>
          <div class="mci-tit">${esc(tit)}</div>
          <span class="mci-avg">${avg === null ? '—' : avg + '%'}</span>
          <span class="badge ${bc}">${et}</span>
        </div>
        <div class="wig-pair"><div class="wrow">
          <div class="wig-track">${wigBarrasMesGrupo(ws, 70)}</div>
        </div></div>
      </div>`;
    }
    // MCI con un elemento de conteo + uno en % → gráfica combinada (claves + % con venta).
    const cntW = ws.find(w => (w.uni || '').trim() !== '%');
    const pctW = ws.find(w => (w.uni || '').trim() === '%');
    if (ws.length === 2 && cntW && pctW) {
      // El % del encabezado = avance del elemento de conteo (claves) hacia su meta,
      // que es lo que representa la altura de la barra en la gráfica.
      const avg = wigTieneDatos(cntW.id)
        ? Math.min(100, Math.max(0, Math.round(getWigVal(sem, cntW.id) / cntW.meta * 100)))
        : null;
      const bc  = avg === null ? 'by' : avg >= 100 ? 'bg' : avg >= 50 ? 'by' : 'br';
      const et  = avg === null ? 'Sin datos' : avg >= 100 ? 'Verde' : avg >= 50 ? 'Amarillo' : 'Rojo';
      return `<div class="mci-block">
        <div class="mci-hdr">
          <div class="mci-num">${num}</div>
          <div class="mci-tit">${esc(tit)}</div>
          <span class="mci-avg">${avg === null ? '—' : avg + '%'}</span>
          <span class="badge ${bc}">${et}</span>
        </div>
        <div class="wig-pair"><div class="wrow">
          <div class="wig-track">${wigBarrasClaves(cntW, pctW)}</div>
        </div></div>
      </div>`;
    }
    const rows = ws.map(w => {
      const conDatos = wigTieneDatos(w.id);
      const a   = getWigVal(sem, w.id);
      return `<div class="wig-pair">
        <div class="wrow">
          <span class="wnombre">${esc(w.label)}</span>
          <div class="wig-val-row">
            <span class="wactual">${conDatos ? a + esc(w.uni) : '—'}</span><span class="wmeta">→ meta ${w.meta}${esc(w.uni)}</span>${conDatos ? '' : '<span class="wmeta" style="font-style:italic">sin datos — no cuenta en semáforos</span>'}
          </div>
          <div class="wig-track">${wigBarrasMes(w)}</div>
          <div class="wfoot"><span>inicio: ${w.inicio}${esc(w.uni)}</span><span>${esc(w.sub || '')}</span></div>
        </div>
      </div>`;
    }).join('');
    // Promedio del bloque: solo elementos con datos capturados
    const avgs = ws.filter(w => wigTieneDatos(w.id)).map(w => {
      const a = getWigVal(sem, w.id);
      return Math.min(100, Math.max(0, Math.round(a / w.meta * 100)));
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
    const mciTags = mcisDeIntegrante(m).map(n =>
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
          <div class="contrib-score-sub">${(() => { const cs = m.contributivos || []; if (!cs.length) return 'Sin MCI contributivo'; if (cs.length > 1) return `${cs.length} MCI contributivos`; const nm = cs[0].nombre || ''; return esc(nm.length > 60 ? nm.slice(0,59)+'…' : nm); })()}</div>
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

