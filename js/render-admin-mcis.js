// ── Administración · MCIs generales ──
// Construye los grupos de WIGs editables y gestiona sus cambios y el alta de MCIs.

function adminMCIsHTML() {
  const mciNums = [...new Set(ST.wigs.map(w => w.mci))].sort((a,b) => a-b);
  const s = getSem(sem);
  return mciNums.map(n => {
    const tit  = ST.mciTitulos?.[n] || `MCI ${n}`;
    const wigs = ST.wigs.filter(w => w.mci === n);
    const filas = wigs.map(w => {
      const actual = getWigVal(sem, w.id);
      return `<div class="waerow" data-wid="${w.id}">
        <div class="waefield">
          <label class="waelbl">Elemento</label>
          <input type="text" class="waeinp" autocomplete="off" value="${esc(w.label)}"
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
          <input type="text" class="waeinp waeinp-sm" autocomplete="off" value="${esc(w.uni || '')}"
            onchange="saveWigField('${w.id}','uni',this.value)">
        </div>
        <div class="waefield waefield-num">
          <label class="waelbl">Actual (Sem ${sem})</label>
          <input type="number" class="waeinp" value="${actual}"
            onchange="saveWigActual('${w.id}',parseFloat(this.value)||0)">
        </div>
        <div class="waefield waefield-num">
          <label class="waelbl">Avance sem. ${sem}</label>
          <input type="number" class="waeinp" value="${s.wigSem[w.id] ?? ''}" placeholder="—"
            onchange="saveWigSem('${w.id}',this.value)">
        </div>
        <div class="waefield waefield-uni">
          <label class="waelbl">Unidad avance sem.</label>
          <input type="text" class="waeinp" autocomplete="off" value="${esc(w.uniSem||'')}" placeholder="${esc(w.uni)}"
            onchange="saveWigField('${w.id}','uniSem',this.value)">
        </div>
        <div class="waefield waefield-num">
          <label class="waelbl">Meta semanal</label>
          <input type="number" class="waeinp" value="${w.metaSem ?? ''}" placeholder="auto"
            title="Meta de avance por semana. Si se deja vacío se calcula como (Meta − Inicio) ÷ 53 (semanas del año)."
            onchange="saveWigField('${w.id}','metaSem',this.value===''?null:parseFloat(this.value)||0)">
        </div>
        <div class="waefield waefield-sub">
          <label class="waelbl">Descripción</label>
          <input type="text" class="waeinp" autocomplete="off" value="${esc(w.sub||'')}"
            onchange="saveWigField('${w.id}','sub',this.value)">
        </div>
        <button type="button" class="waeclean" onclick="limpiarWigDatos('${w.id}')" title="Borrar todos los valores capturados de este elemento (el elemento se conserva y deja de contar en los semáforos)">Limpiar</button>
        <button type="button" class="waedel" onclick="delWig('${w.id}')" title="Eliminar elemento">×</button>
      </div>`;
    }).join('');

    return `<div class="wagroup">
      <div class="waghdr">
        <span class="wagnum">MCI ${n}</span>
        <input type="text" class="wagtit-inp" autocomplete="off" value="${esc(tit)}"
          onchange="saveMCITitulo(${n},this.value)" title="Editar título del MCI">
        <button type="button" class="waeadd" onclick="addWigToMCI(${n})">+ Elemento</button>
      </div>
      <div class="waebody">${filas}</div>
    </div>`;
  }).join('');
}

function saveMCITitulo(num, titulo) {
  if (!ST.mciTitulos) ST.mciTitulos = {};
  ST.mciTitulos[num] = titulo.trim() || `MCI ${num}`;
  renderTablero();
  guardarConfig();
}

function saveWigField(id, field, val) {
  const w = ST.wigs.find(x => x.id === id);
  if (!w) return;
  w[field] = val;
  renderTablero();
  guardarConfig();
}

function limpiarWigDatos(id) {
  const w = ST.wigs.find(x => x.id === id);
  if (!w) return;
  if (!confirm(`¿Borrar los valores de "${w.label}" en la semana ${sem}?\n\nEl elemento se conserva. Se elimina el registro de esta semana; el semáforo volverá a heredar el valor de la semana anterior (o quedará sin datos si no hay ninguno previo).`)) return;
  limpiarWig(id, sem);
  renderAll();
  guardarSemana(sem);
  toast(`Datos de "${w.label}" borrados (sem ${sem})`);
}

function saveWigActual(id, val) {
  const s = getSem(sem);
  s.wigs[id] = val;
  if (!s.wigsExplicit) s.wigsExplicit = {};
  s.wigsExplicit[id] = true;
  renderTablero();
  guardarSemana(sem);
}

function saveWigSem(id, val) {
  const s = getSem(sem);
  const n = parseFloat(val);
  if (val === '' || val === null) {
    delete s.wigSem[id];
  } else {
    s.wigSem[id] = isNaN(n) ? 0 : n;
  }
  renderTablero();
  guardarSemana(sem);
}

function delWig(id) {
  if (ST.wigs.length <= 1) { toast('Debe quedar al menos un elemento'); return; }
  ST.wigs = ST.wigs.filter(x => x.id !== id);
  renderAdmin();
  renderTablero();
  guardarConfig();
}

function addWigToMCI(mciNum) {
  const tit = ST.mciTitulos?.[mciNum] || `MCI ${mciNum}`;
  ST.wigs.push({ id: uid(), label: 'Nuevo elemento', inicio: 0, meta: 100, uni: '%', mci: mciNum, sub: '' });
  renderAdmin();
  renderTablero();
  guardarConfig();
}

function openMCI() { document.getElementById('m-nuevomci').classList.add('open'); }

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
  closeModal('m-nuevomci');
  renderAdmin();
  renderTablero();
  guardarConfig();
}
