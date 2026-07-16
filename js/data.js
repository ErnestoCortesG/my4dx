// ── Semanas de calendario 2026 (S1 = 1 ene, lunes a domingo) ──────────────
// Se generan automáticamente: S1 va del 1 ene al primer domingo (4 ene) y la
// última termina el 31 dic. Total: 53 semanas.
const MESES_CORTOS = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const SEMANAS = (() => {
  const labels = [''];
  let ini = new Date(2026, 0, 1);
  while (ini.getFullYear() === 2026) {
    const dow = ini.getDay() === 0 ? 7 : ini.getDay();
    let fin = new Date(ini);
    fin.setDate(fin.getDate() + (7 - dow));
    if (fin.getFullYear() !== 2026) fin = new Date(2026, 11, 31);
    labels.push(ini.getMonth() === fin.getMonth()
      ? `${ini.getDate()}–${fin.getDate()} ${MESES_CORTOS[fin.getMonth()]}`
      : `${ini.getDate()} ${MESES_CORTOS[ini.getMonth()]}–${fin.getDate()} ${MESES_CORTOS[fin.getMonth()]}`);
    ini = new Date(fin);
    ini.setDate(ini.getDate() + 1);
  }
  return labels;
})();
const TOTAL_SEM = SEMANAS.length - 1;

// Semana de calendario correspondiente a la fecha de hoy (1–TOTAL_SEM)
function semanaActual() {
  const hoy = new Date();
  if (hoy < new Date(2026, 0, 1))               return 1;
  if (hoy > new Date(2026, 11, 31, 23, 59, 59)) return TOTAL_SEM;
  if (hoy <= new Date(2026, 0, 4, 23, 59, 59))  return 1;
  const dias = Math.floor((hoy - new Date(2026, 0, 5)) / 86400000);
  return Math.min(TOTAL_SEM, 2 + Math.floor(dias / 7));
}

// ── Miembros ───────────────────────────────────────────────────────────────
const MB = [
  { id:'sully',    nombre:'Sully Mitrani',   cargo:'PMO · Ejecución 4DX',     ini:'SM', color:'#041224', tag:'Ambos MCIs',    tc:'ta',
    mci:'De 0 a 100% de áreas con tablero 4DX actualizado.', mciAlineados:[],
    preds:[
      {id:'sp1', label:'Líderes con tablero antes mié 6pm',  meta:8,   uni:' líderes',    mci:'Soporte 4DX'},
      {id:'sp2', label:'Compromisos cerrados por área',       meta:100, uni:'%',            mci:'Soporte 4DX'},
      {id:'sp3', label:'Áreas con semáforo + bloqueo',        meta:8,   uni:' áreas',       mci:'Soporte 4DX'}
    ]
  },
  { id:'ernesto',  nombre:'Ernesto Cortés',  cargo:'BI · Digital · Datos',    ini:'EC', color:'#1565c0', tag:'Ambos MCIs',    tc:'ta',
    mci:'Sistema semanal de alertas al 100% agentes en riesgo al 31 jul.', mciAlineados:[1],
    preds:[
      {id:'ep1', label:'Agentes en riesgo identificados',     meta:100, uni:'%',            mci:'MCI 1 · Conservación'},
      {id:'ep2', label:'Tableros semanales funcionando',       meta:8,   uni:' áreas',       mci:'Soporte 4DX'},
      {id:'ep3', label:'Bloqueos digitales resueltos',         meta:5,   uni:' sem',         mci:'Ambos MCIs'}
    ]
  },
  { id:'zvi-r',    nombre:'Zvi Mitrani',     cargo:'Reclutamiento',           ini:'ZM', color:'#6a1b9a', tag:'Recluta',       tc:'tr',
    mci:'De 157 altas a 540 claves nuevas. 35% con producción en 90 días.', mciAlineados:[2],
    preds:[
      {id:'zp1', label:'Leads contactados <24h',              meta:90,  uni:'%',            mci:'MCI 2 · Recluta'},
      {id:'zp2', label:'Entrevistas calificadas semanales',   meta:10,  uni:' entrevistas', mci:'MCI 2 · Recluta'},
      {id:'zp3', label:'Expedientes completos vs iniciados',  meta:80,  uni:'%',            mci:'MCI 2 · Recluta'}
    ]
  },
  { id:'zvi-c',    nombre:'Zvi Mitrani',     cargo:'Capacitación',            ini:'ZM', color:'#2d6a4f', tag:'Ambos MCIs',    tc:'ta',
    mci:'80% prom. y 60% franq. con inducción en 30 días al 30 sep.', mciAlineados:[2],
    preds:[
      {id:'cp1', label:'Agentes nuevos inducción 30d (prom.)',meta:80,  uni:'%',            mci:'MCI 2 · Recluta'},
      {id:'cp2', label:'Agentes nuevos inducción 30d (franq.)',meta:60, uni:'%',            mci:'MCI 2 · Recluta'}
    ]
  },
  { id:'leslie',   nombre:'Leslie Zetina',   cargo:'Gerencia de Embajadores', ini:'LZ', color:'#c62828', tag:'Recluta',       tc:'tr',
    mci:'5–10 altas/mes por aseguradora. 35% con venta en 90 días.', mciAlineados:[2],
    preds:[
      {id:'lp1', label:'Prospectos por embajador (mín 15)',   meta:15,  uni:' prosp.',      mci:'MCI 2 · Recluta'},
      {id:'lp2', label:'Claves en proceso a emisión',         meta:10,  uni:' claves',      mci:'MCI 2 · Recluta'},
      {id:'lp3', label:'Acompañamientos comerciales sem.',    meta:3,   uni:' acomp.',      mci:'MCI 2 · Recluta'}
    ]
  },
  { id:'sandra',   nombre:'Sandra Martínez', cargo:'Promotorías',             ini:'SM', color:'#e65100', tag:'Conservación',  tc:'tc',
    mci:'De 61.55% a 70% conservación Promotorías. Base: 627 · Meta: 439.', mciAlineados:[1],
    preds:[
      {id:'sn1', label:'Renovaciones a vencer 45d identificadas', meta:100, uni:'%',       mci:'MCI 1 · Conservación'},
      {id:'sn2', label:'Agentes baja producción contactados',      meta:20,  uni:' agentes',mci:'MCI 1 · Conservación'},
      {id:'sn3', label:'Tiempo resp. solicitudes críticas (hrs)',  meta:24,  uni:'h',       mci:'MCI 1 · Conservación'}
    ]
  },
  { id:'maricruz', nombre:'Maricruz García', cargo:'Franquicias',             ini:'MG', color:'#37474f', tag:'Cons.+Recluta', tc:'ta',
    mci:'De 53.57% a 70% conservación Franquicias + tablero por franquicia.', mciAlineados:[1],
    preds:[
      {id:'mg1', label:'Franquicias con agentes en riesgo',        meta:6,  uni:' franq.', mci:'MCI 1 · Conservación'},
      {id:'mg2', label:'Agentes con caída producción contactados', meta:30, uni:' agentes',mci:'MCI 1 · Conservación'},
      {id:'mg3', label:'Tablero revisado con franquicias',         meta:6,  uni:' rev.',   mci:'MCI 1 · Conservación'}
    ]
  },
  { id:'nataly',   nombre:'Nataly Mora',     cargo:'Marketing',               ini:'NM', color:'#4a148c', tag:'Ambos MCIs',    tc:'ta',
    mci:'Leads calificados semanales + campañas a agentes en riesgo.', mciAlineados:[1,2],
    preds:[
      {id:'np1', label:'Leads calificados entregados a Recluta', meta:20, uni:' leads',   mci:'MCI 2 · Recluta'},
      {id:'np2', label:'Campañas a agentes en riesgo',           meta:1,  uni:' campaña', mci:'MCI 1 · Conservación'},
      {id:'np3', label:'Conversión lead → clave',               meta:15, uni:'%',         mci:'MCI 2 · Recluta'}
    ]
  }
];

// ── WIGs / MCIs generales ─────────────────────────────────────────────────
const WB = [
  {id:'cg', label:'Conservación global', inicio:55.36, meta:70,   uni:'%',       mci:1, sub:'2,804 agentes · Meta: 1,963'},
  {id:'fr', label:'Franquicias',         inicio:53.57, meta:70,   uni:'%',       mci:1, sub:'Base: 2,177 · Meta: 1,524'},
  {id:'pr', label:'Promotorías',         inicio:61.55, meta:70,   uni:'%',       mci:1, sub:'Base: 627 · Meta: 439'},
  {id:'cl', label:'Claves nuevas acum.', inicio:591,   meta:1000, uni:' claves', mci:2, sub:'Click: 486 · Aseg.: 105/135'},
  {id:'cv', label:'Claves con venta 90d',inicio:28,    meta:350,  uni:' claves', mci:2, sub:'Meta: 35% del total'}
];

// Los usuarios y sus contraseñas viven ahora en el servidor (tabla `users`,
// contraseñas hasheadas). El cliente los obtiene vía /api/users (solo admin)
// y nunca maneja contraseñas en texto plano. Ver server.py → SEED_USERS.
