// ── Núcleo: orquestador, sidebar, helpers y utilidades UI — extraído de render.js (v2.3) ──

// ── Orquestador ───────────────────────────────────────────────────────────
function renderAll() {
  document.getElementById('wlbl').textContent = 'Sem ' + sem + ' · ' + (SEMANAS[sem] || '');
  renderSidebar();
  if (pagina === 'tablero')      renderTablero();
  if (pagina === 'compromisos')  renderCompromisos();
  if (pagina === 'scores')       renderScores();
  if (pagina === 'admin')        renderAdmin();
  if (pagina === 'perfil')       renderPerfil();
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

// ── Score acumulativo de MCI contributivo ─────────────────────────────────
// Para cada predictiva acumula el total de todas las semanas vs la meta anual.
function predScoreAcum(m) {
  if (!m.preds || !m.preds.length) return null;
  const pcts = m.preds.map(p => {
    const acum = predAcumVal(p.id);
    if (!acum) return null;
    return Math.min(100, Math.round(acum / p.meta * 100));
  }).filter(x => x !== null);
  return pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null;
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
