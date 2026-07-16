// ── Vista Scores — extraído de render.js (v2.3) ──

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
    const col = avg >= 100 ? '#4CAF50' : avg >= 50 ? '#FFC107' : '#E8220A';
    const celdas = ss.map((x, i) => x !== null
      ? `<span style="font-size:10px;font-weight:700;padding:2px 5px;border-radius:3px;
           background:${x>=100?'#e8f5e9':x>=50?'#fff8e1':'#ffebee'};
           color:${x>=100?'#2d7a2d':x>=50?'#b87900':'#c62828'}">S${i+1}:${x}%</span>`
      : `<span style="font-size:10px;color:var(--text-4)">S${i+1}:—</span>`
    ).join(' ');
    return `<tr>
      <td style="display:flex;align-items:center;gap:8px">
        <div style="width:28px;height:28px;border-radius:50%;background:${m.color};
          color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center">${esc(m.ini)}</div>
        <div><div style="font-weight:600">${esc(m.nombre)}</div><div style="font-size:10px;color:var(--text-3)">${esc(m.cargo)}</div></div>
      </td>
      <td><span class="tag ${m.tc}">${esc(m.tag)}</span></td>
      <td><span style="font-size:15px;font-weight:800;color:${col}">${avg}%</span></td>
      <td style="display:flex;gap:3px;flex-wrap:wrap">${celdas}</td>
    </tr>`;
  }).join('');
  document.getElementById('scorelist').innerHTML = `<table class="stbl">
    <thead><tr><th>Líder</th><th>MCI</th><th>Promedio</th><th>Histórico</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

