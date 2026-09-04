// ── Núcleo: orquestador, sidebar, helpers y utilidades UI — extraído de render.js (v2.3) ──

// ── Orquestador ───────────────────────────────────────────────────────────
function renderAll() {
  actualizarStepperSemana();
  renderSidebar();
  if (pagina === 'tablero')      renderTablero();
  if (pagina === 'compromisos')  renderCompromisos();
  if (pagina === 'scores')       renderScores();
  if (pagina === 'admin')        renderAdmin();
  if (pagina === 'perfil')       renderPerfil();
}

// ── Stepper de semana (indicador + controles) ─────────────────────────────
// Número de semana grande + rango de fechas; marca "actual" cuando coincide con
// la semana de calendario en curso y deshabilita las flechas en los extremos.
function actualizarStepperSemana() {
  const cur = semanaActual();
  const num = document.getElementById('wk-num');
  const rng = document.getElementById('wk-range');
  const live = document.getElementById('wk-live');
  const prev = document.getElementById('wk-prev');
  const next = document.getElementById('wk-next');
  const step = document.getElementById('week-stepper');
  const hoy = document.getElementById('btn-sem-hoy');
  const esActual = sem === cur;
  if (num) num.textContent = 'Sem ' + sem;
  if (rng) rng.textContent = SEMANAS[sem] || '';
  if (live) live.hidden = !esActual;
  if (step) step.classList.toggle('is-actual', esActual);
  if (prev) prev.disabled = sem <= 1;
  if (next) next.disabled = sem >= TOTAL_SEM;
  if (hoy) hoy.disabled = esActual;
}

// ── Promedio del banner por MCI ───────────────────────────────────────────
// Devuelve { avg, raw, uni }. `avg` es 0..100 o null (progreso hacia la meta;
// ≥100 = meta alcanzada) y define SOLO el color del semáforo. `raw` es el
// valor capturado tal cual (sin transformar) — lo que se muestra en el número
// grande del banner cuando el elemento fuente ya es un porcentaje (ej. el %
// global de conservación): se alimenta directamente desde Administración y
// cada captura REEMPLAZA a la anterior (no se acumula ni promedia).
// 1) Si algún elemento con rol 'banner' tiene datos, usa ese.
// 2) Si no, según el tipo de gráfica del MCI:
//    - 'agrupada' (porcentajes): PROMEDIO del progreso de cada barra
//      (valor/meta·100). No se pueden sumar porcentajes.
//    - 'apilada' (conteos): SUMA de las barras / metaLinea del MCI.
// Sin datos → { avg:null, raw:null, uni:null }.
function bannerAvgMCI(n, ws) {
  const clamp = v => Math.min(100, Math.max(0, Math.round(v)));
  const banner = (ws || []).find(e => e.rol === 'banner' && wigTieneDatos(e.id));
  if (banner) {
    const raw = getWigVal(sem, banner.id);
    const avg = clamp(raw / (banner.meta || 100) * 100);
    const esPct = (banner.uni || '').trim() === '%';
    return esPct ? { avg, raw, uni: banner.uni } : { avg, raw: null, uni: null };
  }
  const bars = (ws || []).filter(e => e.rol !== 'banner' && wigTieneDatos(e.id));
  if (!bars.length) return { avg: null, raw: null, uni: null };
  const tipo = ST.mciCfg?.[n]?.tipo;
  if (tipo === 'apilada') {
    const sum = bars.reduce((a, b) => a + getWigVal(sem, b.id), 0);
    const metaLinea = ST.mciCfg?.[n]?.metaLinea || 100;
    return { avg: clamp(sum / metaLinea * 100), raw: null, uni: null };
  }
  // 'agrupada' (o default): promedio del progreso de cada barra hacia su meta.
  const prog = bars.map(b => getWigVal(sem, b.id) / (b.meta || 100) * 100);
  return { avg: clamp(prog.reduce((a, b) => a + b, 0) / prog.length), raw: null, uni: null };
}

// ── Sidebar ────────────────────────────────────────────────────────────────
function renderSidebar() {
  const s = getSem(sem), cs = s.comps || [];
  document.getElementById('sb-members').innerHTML = ST.miembros.map(m => {
    // Match por primer apellido para tolerar "Zvi Mitrani" vs "Zvi" en compromisos legacy
    const mine = cs.filter(c => c.lider.split(' ')[0] === m.nombre.split(' ')[0]);
    const pct  = mine.length ? Math.round(mine.filter(c => c.done).length / mine.length * 100) : null;
    const dc   = pct === null ? 'dy' : pct >= 100 ? 'dg' : pct >= 50 ? 'dy' : 'dr';
    const isA  = mActivo === m.id;
    const dcLabel = pct === null ? 'Sin datos' : pct >= 100 ? 'Verde' : pct >= 50 ? 'Amarillo' : 'Rojo';
    return `<div class="mcard${isA ? ' active' : ''}" id="card-${m.id}"
      onclick="selectM('${m.id}')"
      tabindex="0" role="button"
      aria-label="${esc(m.nombre)}, ${esc(m.cargo.split('·')[0].trim())}${isA ? ', seleccionado' : ''}"
      onkeydown="if(event.key==='Enter'||event.key===' '){selectM('${m.id}');event.preventDefault()}">
      <div class="mav" style="background:${m.color}">${esc(m.ini)}</div>
      <div class="minfo">
        <div class="mname">${esc(m.nombre.split(' ').slice(0, 2).join(' '))}</div>
        <div class="mcargo">${esc(m.cargo.split('·')[0].trim())}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:3px">
        ${pct !== null ? `<span style="font-size:12px;font-weight:800;color:#fff">${pct}%</span>` : ''}
        <div class="mdot ${dc}" aria-label="${dcLabel}" title="${dcLabel}"></div>
      </div>
    </div>`;
  }).join('');
  if (mActivo === 'todos') document.getElementById('card-todos')?.classList.add('active');
}

// ── Valor acumulativo de una predictiva (suma de todas las semanas) ────────
function predAcumVal(predId) {
  return Object.values(ST.semanas || {}).reduce(function(total, s) {
    var v = parseFloat(s.preds && s.preds[predId]);
    return total + (isNaN(v) || v <= 0 ? 0 : v);
  }, 0);
}

// Último valor semanal capturado de una medida predictiva hasta la semana n
// (calco de getWigVal en state.js, pero sin valor de respaldo "inicio" — los
// preds no tienen ese campo).
function getPredVal(n, predId) {
  for (let i = n; i >= 1; i--) {
    const s = ST.semanas[i];
    if (s && s.preds && s.preds[predId] !== undefined) return s.preds[predId];
  }
  return undefined;
}

// Valor de una medida predictiva "a fecha" de un mes dado (0-11), acotado por
// la semana `sem` vigente (mismo criterio que wigBarrasMes en render-tablero.js).
function predMesVal(predId, mes) {
  const lastWk = ULTIMA_SEM_MES[mes];
  const hasta = lastWk ? Math.min(lastWk, sem) : 0;
  return hasta < 1 ? undefined : getPredVal(hasta, predId);
}

// ── Captura semanal por gerencia (dashboards tipo 'renovacion') ────────────
// Mismo criterio que getWigVal/getPredVal: hereda hacia atrás el último valor
// capturado — nunca se acumula, cada captura semanal SUSTITUYE a la anterior.
// `field` es 'base' o 'pct'. Sin captura previa → undefined (a diferencia de
// los WIGs, una gerencia nueva no tiene "inicio" de respaldo).
function getRenovVal(n, gerId, field) {
  for (let i = n; i >= 1; i--) {
    const s = ST.semanas[i];
    const v = s && s.renov && s.renov[gerId] && s.renov[gerId][field];
    if (v !== undefined) return v;
  }
  return undefined;
}

// Valor de una gerencia "a fecha" de un mes dado (0-11), acotado por la
// semana `sem` vigente (mismo criterio que predMesVal).
function renovGerVal(gerId, mes, field) {
  const lastWk = ULTIMA_SEM_MES[mes];
  const hasta = lastWk ? Math.min(lastWk, sem) : 0;
  return hasta < 1 ? undefined : getRenovVal(hasta, gerId, field);
}

// ── Score de UN MCI contributivo ──────────────────────────────────────────
// Promedio de los % de sus medidas (cada una: valor actual manual vs meta).
// Ignora medidas sin valor; null si ninguna tiene.
function contribScoreAcum(c) {
  const preds = (c && c.preds) || [];
  const pcts = preds.map(p => {
    const a = p.semanal === true
      ? parseFloat(predMesVal(p.id, MES_DE_SEM[sem]))
      : parseFloat(p.actual);
    if (isNaN(a) || a <= 0) return null;
    return Math.min(100, Math.round(a / p.meta * 100));
  }).filter(x => x !== null);
  return pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null;
}

// ── Score de un contributivo (normal o tipo dashboard) ─────────────────────
// Renovación (tipo 'renovacion'): % 1er recibo global ponderado por base sobre
// los meses maduros. Normal: promedio de sus medidas (contribScoreAcum).
function contribScore(c) {
  if (c && c.tipo === 'renovacion' && c.dash) {
    return renovView(c.dash, 'todos').pct;
  }
  if (c && c.tipo === 'clavesagente' && c.claves) {
    const acum = (c.claves.meses || []).reduce((a, m) => a + (m.total || 0), 0);
    const tot = c.claves.metaTotal || 0;
    return tot ? Math.round(acum / tot * 100 * 10) / 10 : null;   // % hacia la meta anual
  }
  if (c && c.tipo === 'clavesvend') {
    // Claves de vendedores: acumulado de conteos semanales (≤ sem) vs metaTotal.
    return Math.min(100, Math.max(0, Math.round(
      clavesVendAcum(c, sem) / (c.clavesvend.metaTotal || 1) * 100)));
  }
  return contribScoreAcum(c);
}

// ── Claves de vendedores (tipo 'clavesvend') ───────────────────────────────
// Suma de conteos por estado de UNA semana (Sem n). 0 si no hay payload.
function clavesVendSemana(c, n) {
  const sems = c && c.clavesvend && c.clavesvend.semanas;
  if (!sems) return 0;
  const wk = sems[n];
  if (!wk) return 0;
  return Object.values(wk).reduce((a, v) => a + (parseFloat(v) || 0), 0);
}

// Acumulado hasta la semana `hasta` (inclusive): suma todas las semanas con
// clave ≤ hasta. Respeta el navegador de semanas (KPI + score).
function clavesVendAcum(c, hasta) {
  const sems = c && c.clavesvend && c.clavesvend.semanas;
  if (!sems) return 0;
  return Object.keys(sems).reduce((tot, k) => {
    return (parseInt(k, 10) <= hasta) ? tot + clavesVendSemana(c, k) : tot;
  }, 0);
}

// ── Score del INTEGRANTE ────────────────────────────────────────────────────
// Promedio simple de los scores de sus contributivos con datos (ignora null).
function predScoreAcum(m) {
  const scores = (m.contributivos || [])
    .map(c => contribScore(c))
    .filter(x => x !== null);
  return scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10 : null;
}


// ── Utilidades UI ──────────────────────────────────────────────────────────
function closeModal(id) {
  const mov = document.getElementById(id);
  if (!mov) return;
  mov.classList.remove('open');
  // Resetear posición de arrastre para que vuelva a centrarse la próxima vez
  const modal = mov.querySelector('.modal');
  if (modal) { modal.style.position = ''; modal.style.left = ''; modal.style.top = ''; modal.style.margin = ''; }
}

// Convierte el h3 de cada .modal en handle de arrastre. Idempotente (no duplica listeners).
function setupDraggable() {
  document.querySelectorAll('.modal').forEach(modal => {
    const h = modal.querySelector('h3');
    if (!h || h.dataset.drag) return;
    h.dataset.drag = '1';
    h.style.cursor = 'move';
    h.style.userSelect = 'none';
    h.addEventListener('mousedown', e => {
      const r  = modal.getBoundingClientRect();
      modal.style.position = 'fixed';
      modal.style.margin   = '0';
      modal.style.left     = r.left + 'px';
      modal.style.top      = r.top  + 'px';
      const ox = e.clientX - r.left;
      const oy = e.clientY - r.top;
      const move = e => {
        modal.style.left = Math.max(0, Math.min(e.clientX - ox, innerWidth  - modal.offsetWidth))  + 'px';
        modal.style.top  = Math.max(0, Math.min(e.clientY - oy, innerHeight - modal.offsetHeight)) + 'px';
      };
      const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup', up);
      e.preventDefault();
    });
  });
}

// Notificación efímera. tipo: 'ok' (default) | 'error' | 'warn' | 'info'.
let _toastTimer = null;
function toast(msg, tipo = 'ok') {
  const el = document.getElementById('tst');
  el.textContent = msg;
  el.className = 'toast toast-' + tipo;          // reinicia variante
  // reflow para reiniciar la animación si hay toasts consecutivos
  void el.offsetWidth;
  el.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'),
                           tipo === 'error' ? 3200 : 2200);
}

// Diálogo de confirmación con estilo de marca (reemplaza al confirm() nativo).
// Devuelve una Promise<boolean>. Usar con await en acciones destructivas.
function confirmar({ titulo = 'Confirmar', mensaje = '', ok = 'Confirmar',
                     cancelar = 'Cancelar', peligro = false } = {}) {
  return new Promise(resolve => {
    const mov = document.createElement('div');
    mov.className = 'mov';
    mov.innerHTML =
      `<div class="modal modal-confirm" role="alertdialog" aria-modal="true">
         <h3>${esc(titulo)}</h3>
         <p class="confirm-msg">${esc(mensaje)}</p>
         <div class="confirm-actions">
           <button type="button" class="bcancel" data-act="cancel">${esc(cancelar)}</button>
           <button type="button" class="${peligro ? 'bdanger' : 'bconfirm'}" data-act="ok">${esc(ok)}</button>
         </div>
       </div>`;
    document.body.appendChild(mov);
    requestAnimationFrame(() => mov.classList.add('open'));   // dispara la animación de entrada

    function onKey(e) { if (e.key === 'Escape') cerrar(false); }
    function cerrar(val) {
      document.removeEventListener('keydown', onKey);
      mov.classList.remove('open');
      setTimeout(() => mov.remove(), 260);   // espera a la transición de salida
      resolve(val);
    }
    mov.addEventListener('click', e => {
      if (e.target === mov) return cerrar(false);            // click fuera = cancelar
      const act = e.target.getAttribute('data-act');
      if (act === 'ok') cerrar(true);
      else if (act === 'cancel') cerrar(false);
    });
    document.addEventListener('keydown', onKey);
    setTimeout(() => mov.querySelector('[data-act="ok"]')?.focus(), 60);
  });
}
