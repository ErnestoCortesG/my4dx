// ── Administración · MCIs generales ──
// Construye los grupos de WIGs editables y gestiona sus cambios y el alta de MCIs.

function adminMCIsHTML() {
  const mciNums = [...new Set(ST.wigs.map(w => w.mci))].sort((a,b) => a-b);
  const s = getSem(sem);
  return mciNums.map(n => {
    const tit  = ST.mciTitulos?.[n] || `MCI ${n}`;
    const wigs = ST.wigs.filter(w => w.mci === n);
    const cfg = ST.mciCfg?.[n] || {};
    const filas = wigs.map(w => {
      const actual = getWigVal(sem, w.id);
      const rol = w.rol || 'barra';
      return `<div class="waerow" data-wid="${w.id}">
        <div class="waefield waefield-actual">
          <label class="waelbl">Actual (Sem ${sem})</label>
          <input type="number" class="waeinp" value="${actual}"
            title="Valor acumulado a esta semana."
            onchange="saveWigActual('${w.id}',parseFloat(this.value)||0)">
        </div>
        <div class="waefield">
          <label class="waelbl">Elemento</label>
          <input type="text" class="waeinp" autocomplete="off" value="${esc(w.label)}"
            onchange="saveWigField('${w.id}','label',this.value)">
        </div>
        <div class="waefield waefield-rol">
          <label class="waelbl">Rol</label>
          <select class="waeinp waesel" onchange="saveWigRol('${w.id}',this.value)">
            <option value="barra"${rol === 'barra' ? ' selected' : ''}>Barra en gráfica</option>
            <option value="banner"${rol === 'banner' ? ' selected' : ''}>Fuente del banner</option>
          </select>
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
        <label class="wagcfg-lbl">Gráfica
          <select class="wagcfg-sel" onchange="saveMciCfg(${n},'tipo',this.value)" title="Tipo de gráfica del MCI">
            <option value="agrupada"${cfg.tipo === 'agrupada' ? ' selected' : ''}>Agrupada</option>
            <option value="apilada"${cfg.tipo === 'apilada' ? ' selected' : ''}>Apilada</option>
          </select>
        </label>
        <label class="wagcfg-lbl">Meta línea
          <input type="number" class="wagcfg-inp" value="${cfg.metaLinea ?? ''}" placeholder="—"
            onchange="saveMciCfg(${n},'metaLinea',this.value)" title="Nivel de la línea de meta de la gráfica">
        </label>
        <button type="button" class="waeadd" onclick="addWigToMCI(${n})">+ Elemento</button>
        <button type="button" class="wagdel" onclick="delMCI(${n})" title="Eliminar este MCI y todos sus elementos">×</button>
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

function saveMciCfg(n, field, val) {
  if (!ST.mciCfg) ST.mciCfg = {};
  if (!ST.mciCfg[n]) ST.mciCfg[n] = {};
  ST.mciCfg[n][field] = field === 'metaLinea' ? (parseFloat(val) || 0) : val;
  renderTablero();
  guardarConfig();
}

function saveWigRol(id, val) {
  const w = ST.wigs.find(x => x.id === id);
  if (!w) return;
  w.rol = val;
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

async function limpiarWigDatos(id) {
  const w = ST.wigs.find(x => x.id === id);
  if (!w) return;
  const ok = await confirmar({
    titulo: `Limpiar "${w.label}" · semana ${sem}`,
    mensaje: 'El elemento se conserva. Se elimina el registro de esta semana; el semáforo volverá a heredar el valor de la semana anterior (o quedará sin datos si no hay ninguno previo).',
    ok: 'Limpiar', peligro: true,
  });
  if (!ok) return;
  limpiarWig(id, sem);
  renderAll();
  guardarSemana(sem);
  toast(`Datos de "${w.label}" borrados (sem ${sem})`, 'ok');
}

function saveWigActual(id, val) {
  const s = getSem(sem);
  s.wigs[id] = val;
  if (!s.wigsExplicit) s.wigsExplicit = {};
  s.wigsExplicit[id] = true;
  renderTablero();
  guardarSemana(sem);
}

async function delWig(id) {
  if (ST.wigs.length <= 1) { toast('Debe quedar al menos un elemento', 'warn'); return; }
  const w = ST.wigs.find(x => x.id === id);
  const ok = await confirmar({
    titulo: 'Eliminar elemento',
    mensaje: `¿Eliminar "${w ? w.label : 'este elemento'}" del MCI? Se borra la definición y todos sus datos capturados. Esta acción no se puede deshacer.`,
    ok: 'Eliminar', peligro: true,
  });
  if (!ok) return;
  ST.wigs = ST.wigs.filter(x => x.id !== id);
  renderAdmin();
  renderTablero();
  guardarConfig();
  toast('Elemento eliminado', 'ok');
}

function addWigToMCI(mciNum) {
  // Hereda la unidad y la meta de los elementos hermanos del mismo MCI
  // (así un elemento nuevo en un MCI de "claves" no sale en "%").
  const hermanos = ST.wigs.filter(w => w.mci === mciNum);
  const uni  = hermanos.length ? (hermanos[0].uni || '%') : '%';
  const meta = hermanos.length ? hermanos[0].meta : 100;
  ST.wigs.push({ id: uid(), label: 'Nuevo elemento', inicio: 0, meta, uni, rol: 'barra', mci: mciNum, sub: '' });
  renderAdmin();
  renderTablero();
  guardarConfig();
}

// Elimina un MCI general completo: su título y todos sus elementos (WIGs),
// más los datos capturados de esos elementos en todas las semanas.
async function delMCI(n) {
  const tit = ST.mciTitulos?.[n] || `MCI ${n}`;
  const elems = ST.wigs.filter(w => w.mci === n);
  const ok = await confirmar({
    titulo: 'Eliminar MCI general',
    mensaje: `¿Eliminar "${tit}" y sus ${elems.length} elemento(s)? Se borran las definiciones y todos sus datos capturados en todas las semanas. Esta acción no se puede deshacer.`,
    ok: 'Eliminar', peligro: true,
  });
  if (!ok) return;
  const ids = new Set(elems.map(w => w.id));
  ST.wigs = ST.wigs.filter(w => w.mci !== n);
  if (ST.mciTitulos) delete ST.mciTitulos[n];
  // Purgar datos semanales de esos elementos; recordar qué semanas cambiaron
  const tocadas = [];
  Object.entries(ST.semanas || {}).forEach(([wk, s]) => {
    let ch = false;
    ids.forEach(id => {
      if (s.wigs && id in s.wigs) { delete s.wigs[id]; ch = true; }
      if (s.wigsExplicit && id in s.wigsExplicit) delete s.wigsExplicit[id];
      if (s.wigSem && id in s.wigSem) { delete s.wigSem[id]; ch = true; }
    });
    if (ch) tocadas.push(parseInt(wk));
  });
  renderAdmin();
  renderTablero();
  guardarConfig();
  tocadas.forEach(k => guardarSemana(k));
  toast(`MCI "${tit}" eliminado`, 'ok');
}

function openMCI() { document.getElementById('m-nuevomci').classList.add('open'); }

function saveMCI() {
  const tit  = document.getElementById('mci-tit').value.trim();
  const desc = document.getElementById('mci-desc').value.trim();
  const ini  = parseFloat(document.getElementById('mci-ini').value) || 0;
  const meta = parseFloat(document.getElementById('mci-meta').value) || 100;
  const uni  = document.getElementById('mci-uni').value.trim() || '';
  if (!tit) { toast('Escribe un título', 'warn'); return; }
  const mciN = Math.max(...ST.wigs.map(w => w.mci), 2) + 1;
  if (!ST.mciTitulos) ST.mciTitulos = {};
  ST.mciTitulos[mciN] = tit;
  ST.wigs.push({ id:'w'+uid(), label:desc || tit, inicio:ini, meta, uni, mci:mciN, sub:desc });
  closeModal('m-nuevomci');
  renderAdmin();
  renderTablero();
  guardarConfig();
}
