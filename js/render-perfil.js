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

  // ── MCIs generales alineados ─────────────────────────────────────────────
  const alineados = (m.mciAlineados || []).slice().sort((a, b) => a - b);

  // ── Tabla de medidas predictivas (acumulativo) ───────────────────────────
  const predRows = (m.preds || []).map(p => {
    const v    = s.preds[p.id] || '';          // valor semana actual (para edición)
    const acum = predAcumVal(p.id);            // suma acumulada de todas las semanas
    const pc   = acum ? Math.min(100, Math.round(acum / p.meta * 100)) : 0;
    const fc   = pc >= 100 ? '#4CAF50' : pc >= 50 ? '#FFC107' : '#E02500';
    const bc   = pc >= 100 ? 'bg' : pc >= 50 ? 'by' : 'br';
    const pmci = p.mci || 'Ambos MCIs';   // tolera medidas sin MCI asignado
    const mt   = pmci === 'MCI 1 · Conservación' ? 'tc'
               : pmci === 'MCI 2 · Recluta'       ? 'tr'
               : pmci === 'Soporte 4DX'            ? 'ts' : 'ta';
    const acumFmt = acum ? acum + esc(p.uni) : '—';
    const inp = ro
      ? `<span style="font-size:13px;font-weight:700;color:${acum ? fc : 'var(--text-4)'}"><strong>${acumFmt}</strong></span>`
      : `<div style="display:flex;flex-direction:column;gap:2px">
           <div style="display:flex;align-items:center;gap:6px">
             <input class="pinp" type="number" value="${v}" placeholder="—"
               style="width:80px;font-size:13px"
               data-pred-id="${p.id}"
               onchange="updPred('${p.id}',this.value)">
             <span style="font-size:11px;color:var(--text-3)">${esc(p.uni)}</span>
           </div>
           <span style="font-size:10px;color:var(--text-3)">Acum: <strong>${acumFmt}</strong></span>
         </div>`;
    return `<tr>
      <td><span class="tag ${mt}">${esc(pmci).replace('MCI 1 · Conservación','Cons.').replace('MCI 2 · Recluta','Recluta').replace('Soporte 4DX','Soporte').replace('Ambos MCIs','Ambos')}</span></td>
      <td style="font-weight:500;line-height:1.35">${esc(p.label)}</td>
      <td style="color:var(--text-3);font-size:11px;white-space:nowrap">meta: ${p.meta}${esc(p.uni)}</td>
      <td>${inp}</td>
      <td>
        <div class="mbar" style="width:90px"><div class="mfill" style="transform:scaleX(${(pc/100).toFixed(3)});background:${fc}"></div></div>
        <span style="font-size:10px;color:var(--text-4)">${acum ? pc + '%' : '—'}</span>
      </td>
      <td><span class="badge ${acum ? bc : ''}" style="${!acum ? 'color:var(--text-4)' : ''}">${acum ? pc+'%' : '—'}</span></td>
    </tr>`;
  }).join('');

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
        <span class="tag ${m.tc}" style="margin-top:6px;display:inline-block">${esc(m.tag)}</span>
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

    <div class="perf-mci-contributivo">
      <div class="perf-sec-label">MCI Contributivo</div>
      ${alineados.length ? `<div style="display:flex;gap:6px;margin-bottom:8px">${alineados.map(n => `<span class="perf-mci-badge">MCI ${n} · ${esc(ST.mciTitulos?.[n] || 'General')}</span>`).join('')}</div>` : ''}
      <div class="perf-mci-texto">${esc(m.mci)}</div>
      <div class="perf-mci-avance" style="background:${predSc}20;border:1px solid ${predSc}40">
        <span style="font-size:20px;font-weight:900;color:${predSc};font-family:'Lato',sans-serif">${predScore !== null ? predScore + '%' : '—'}</span>
        <span style="font-size:11px;color:var(--text-3);margin-left:8px">Cumplimiento de MCI Contributivo</span>
      </div>
    </div>

    <div class="perf-sec-label" style="margin:16px 0 8px">Medidas Predictivas · Acumulado</div>
    <div class="perf-section" style="padding:0">
      <table class="ptbl">
        <thead><tr><th>MCI</th><th>Medida predictiva</th><th>Meta anual</th><th>${ro ? 'Total acumulado' : 'Sem. actual / Acum.'}</th><th>Avance</th><th>Semáforo</th></tr></thead>
        <tbody>${predRows}</tbody>
      </table>
    </div>
  `;
}

