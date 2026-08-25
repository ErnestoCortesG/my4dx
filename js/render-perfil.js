// ── Vista Perfil de integrante — extraído de render.js (v2.3) ──

// ── Perfil de integrante ──────────────────────────────────────────────────
function renderPerfil() {
  const m = ST.miembros.find(x => x.id === mActivo);
  if (!m) {
    document.getElementById('perfil-content').innerHTML =
      '<p style="padding:20px;color:var(--text-3)">Selecciona un integrante en el panel izquierdo.</p>';
    return;
  }
  const s   = getSem(sem);
  const ro  = !canEdit();

  // ── Score compromisos ─────────────────────────────────────────────────────
  const cs   = (s.comps || []).filter(c => c.lider.split(' ')[0] === m.nombre.split(' ')[0]);
  const compPct = cs.length ? Math.round(cs.filter(c => c.done).length / cs.length * 100) : null;
  const compSc  = compPct === null ? '#aaa' : compPct >= 100 ? '#4CAF50' : compPct >= 50 ? '#FFC107' : '#E02500';

  // ── Score acumulativo MCI contributivo ───────────────────────────────────
  const predScore = predScoreAcum(m);
  const predSc = predScore === null ? '#aaa' : predScore >= 100 ? '#4CAF50' : predScore >= 50 ? '#FFC107' : '#E02500';

  // ── MCIs generales alineados (unión de los de sus contributivos) ─────────
  const alineados = mcisDeIntegrante(m);

  // ── Bloques de MCI contributivos (uno por contributivo) ───────────────────
  // Cada contributivo: nombre + su score + su tabla de medidas (sin columna MCI).
  const predRowHTML = p => {
    const a    = parseFloat(p.actual);         // valor actual manual de la medida
    const has  = !isNaN(a) && a > 0;
    const pc   = has ? Math.min(100, Math.round(a / p.meta * 100)) : 0;
    const fc   = pc >= 100 ? '#4CAF50' : pc >= 50 ? '#FFC107' : '#E02500';
    const bc   = pc >= 100 ? 'bg' : pc >= 50 ? 'by' : 'br';
    const valFmt = has ? a + esc(p.uni) : '—';
    const valInp = (p.actual !== undefined && p.actual !== null && p.actual !== '') ? p.actual : '';
    const inp = ro
      ? `<span style="font-size:13px;font-weight:700;color:${has ? fc : 'var(--text-4)'}"><strong>${valFmt}</strong></span>`
      : `<div style="display:flex;align-items:center;gap:6px">
           <input class="pinp" type="number" value="${valInp}" placeholder="—"
             style="width:80px;font-size:13px"
             data-pred-id="${p.id}"
             onchange="savePredActual('${p.id}',this.value)">
           <span style="font-size:11px;color:var(--text-3)">${esc(p.uni)}</span>
         </div>`;
    return `<tr>
      <td style="font-weight:500;line-height:1.35">${esc(p.label)}</td>
      <td style="color:var(--text-3);font-size:11px;white-space:nowrap">meta: ${p.meta}${esc(p.uni)}</td>
      <td>${inp}</td>
      <td>
        <div class="mbar" style="width:90px"><div class="mfill" style="transform:scaleX(${(pc/100).toFixed(3)});background:${fc}"></div></div>
        <span style="font-size:10px;color:var(--text-4)">${has ? pc + '%' : '—'}</span>
      </td>
      <td><span class="badge ${has ? bc : ''}" style="${!has ? 'color:var(--text-4)' : ''}">${has ? pc+'%' : '—'}</span></td>
    </tr>`;
  };

  const contribBlocks = (m.contributivos || []).length
    ? (m.contributivos).map(c => {
        const cScore = contribScoreAcum(c);
        const cSc = cScore === null ? '#aaa' : cScore >= 100 ? '#4CAF50' : cScore >= 50 ? '#FFC107' : '#E02500';
        const rows = (c.preds || []).map(predRowHTML).join('');
        const cMcis = (c.mciAlineados || []).slice().sort((a,b)=>a-b);
        const cBadges = cMcis.length
          ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px">${cMcis.map(n => `<span class="perf-mci-badge">MCI ${n} · ${esc(ST.mciTitulos?.[n] || 'General')}</span>`).join('')}</div>`
          : `<div style="font-size:11px;color:var(--text-3);margin-bottom:8px">Sin MCI general asignado</div>`;
        return `
    <div class="perf-mci-contributivo" style="margin-bottom:14px">
      <div class="perf-mci-texto" style="font-weight:700">${esc(c.nombre)}</div>
      ${cBadges}
      <div class="perf-mci-avance" style="background:${cSc}20;border:1px solid ${cSc}40">
        <span style="font-size:20px;font-weight:900;color:${cSc};font-family:'Lato',sans-serif">${cScore !== null ? cScore + '%' : '—'}</span>
        <span style="font-size:11px;color:var(--text-3);margin-left:8px">Cumplimiento del MCI contributivo</span>
      </div>
      <div class="ptbl-wrap" style="margin-top:10px">
        <table class="ptbl">
          <thead><tr><th>Medida predictiva</th><th>Meta anual</th><th>Actual</th><th>Avance</th><th>Semáforo</th></tr></thead>
          <tbody>${rows || `<tr><td colspan="5" style="font-size:11px;color:var(--text-3);padding:8px 4px">Sin medidas predictivas.</td></tr>`}</tbody>
        </table>
      </div>
    </div>`;
      }).join('')
    : `<div class="perf-mci-contributivo"><div style="font-size:12px;color:var(--text-3);padding:6px 2px">Este integrante no tiene MCI contributivos. Agrégalos desde Administración.</div></div>`;

  // ── Render final ──────────────────────────────────────────────────────────
  document.getElementById('perfil-content').innerHTML = `
    <div class="perf-back-bar">
      <button class="perf-back-btn" onclick="volverTablero()">
        ← Tablero general
      </button>
      <span class="perf-sem-lbl">Sem ${sem} · ${SEMANAS[sem] || ''}</span>
    </div>

    <div class="perf-hero">
      <div class="mhdr-av" style="background:${m.color};width:54px;height:54px;font-size:20px;font-weight:800">${esc(m.ini)}</div>
      <div class="perf-hero-info">
        <div class="perf-hero-name">${esc(m.nombre)}</div>
        <div class="perf-hero-cargo">${esc(m.cargo)}</div>
        ${(() => { const et = etiquetaMCI(m); return `<span class="tag ${et.tc}" style="margin-top:6px;display:inline-block">${esc(et.texto)}</span>`; })()}
      </div>
      <div class="perf-hero-scores">
        <div class="perf-score-chip" style="border-color:${predSc}">
          <div class="perf-score-num" style="color:${predSc}">${predScore !== null ? predScore + '%' : '—'}</div>
          <div class="perf-score-lbl">Predictivas</div>
        </div>
        <div class="perf-score-chip" style="border-color:${compSc}">
          <div class="perf-score-num" style="color:${compSc}">${compPct !== null ? compPct + '%' : '—'}</div>
          <div class="perf-score-lbl">Compromisos</div>
        </div>
      </div>
    </div>

    <div class="perf-sec-label">MCI Contributivo${(m.contributivos||[]).length > 1 ? 's' : ''}</div>
    ${alineados.length ? `<div style="display:flex;gap:6px;margin-bottom:10px">${alineados.map(n => `<span class="perf-mci-badge">MCI ${n} · ${esc(ST.mciTitulos?.[n] || 'General')}</span>`).join('')}</div>` : ''}
    ${contribBlocks}
  `;
}

// Localiza una medida predictiva por id (en cualquier contributivo de cualquier
// integrante) y fija/borra su valor `actual`. Devuelve true si cambió.
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

// Guarda el valor "Actual" manual de una medida (persistido en la config del
// integrante) y refresca tablero + perfil. El avance/semáforo = actual / meta.
function savePredActual(pid, val) {
  if (!canEdit()) { toast('Sin permisos'); return; }
  if (!setPredActualRaw(pid, val)) return;
  renderTablero();
  if (pagina === 'perfil') renderPerfil();
  guardarConfig();
}

