// ── Semanas (S1 = 29 jun, S13 = última con etiqueta) ──────────────────────
const SEMANAS = [
  '', '29 jun–5 jul','6–12 jul','13–19 jul','20–26 jul',
  '27 jul–2 ago','3–9 ago','10–16 ago','17–23 ago','24–30 ago',
  '31 ago–6 sep','7–13 sep','14–20 sep','21–27 sep'
];

// ── Miembros ───────────────────────────────────────────────────────────────
const MB = [
  { id:'sully',    nombre:'Sully Mitrani',   cargo:'PMO · Ejecución 4DX',     ini:'SM', color:'#1B3A6B', tag:'Ambos MCIs',    tc:'ta',
    mci:'De 0 a 100% de áreas con tablero 4DX actualizado.',
    preds:[
      {id:'sp1', label:'Líderes con tablero antes mié 6pm',  meta:8,   uni:' líderes',    mci:'Soporte 4DX'},
      {id:'sp2', label:'Compromisos cerrados por área',       meta:100, uni:'%',            mci:'Soporte 4DX'},
      {id:'sp3', label:'Áreas con semáforo + bloqueo',        meta:8,   uni:' áreas',       mci:'Soporte 4DX'}
    ]
  },
  { id:'ernesto',  nombre:'Ernesto Cortés',  cargo:'BI · Digital · Datos',    ini:'EC', color:'#1565c0', tag:'Ambos MCIs',    tc:'ta',
    mci:'Sistema semanal de alertas al 100% agentes en riesgo al 31 jul.',
    preds:[
      {id:'ep1', label:'Agentes en riesgo identificados',     meta:100, uni:'%',            mci:'MCI 1 · Conservación'},
      {id:'ep2', label:'Tableros semanales funcionando',       meta:8,   uni:' áreas',       mci:'Soporte 4DX'},
      {id:'ep3', label:'Bloqueos digitales resueltos',         meta:5,   uni:' sem',         mci:'Ambos MCIs'}
    ]
  },
  { id:'zvi-r',    nombre:'Zvi Mitrani',     cargo:'Reclutamiento',           ini:'ZM', color:'#6a1b9a', tag:'Recluta',       tc:'tr',
    mci:'De 157 altas a 540 claves nuevas. 35% con producción en 90 días.',
    preds:[
      {id:'zp1', label:'Leads contactados <24h',              meta:90,  uni:'%',            mci:'MCI 2 · Recluta'},
      {id:'zp2', label:'Entrevistas calificadas semanales',   meta:10,  uni:' entrevistas', mci:'MCI 2 · Recluta'},
      {id:'zp3', label:'Expedientes completos vs iniciados',  meta:80,  uni:'%',            mci:'MCI 2 · Recluta'}
    ]
  },
  { id:'zvi-c',    nombre:'Zvi Mitrani',     cargo:'Capacitación',            ini:'ZM', color:'#2d6a4f', tag:'Ambos MCIs',    tc:'ta',
    mci:'80% prom. y 60% franq. con inducción en 30 días al 30 sep.',
    preds:[
      {id:'cp1', label:'Agentes nuevos inducción 30d (prom.)',meta:80,  uni:'%',            mci:'MCI 2 · Recluta'},
      {id:'cp2', label:'Agentes nuevos inducción 30d (franq.)',meta:60, uni:'%',            mci:'MCI 2 · Recluta'}
    ]
  },
  { id:'leslie',   nombre:'Leslie Zetina',   cargo:'Gerencia de Embajadores', ini:'LZ', color:'#c62828', tag:'Recluta',       tc:'tr',
    mci:'5–10 altas/mes por aseguradora. 35% con venta en 90 días.',
    preds:[
      {id:'lp1', label:'Prospectos por embajador (mín 15)',   meta:15,  uni:' prosp.',      mci:'MCI 2 · Recluta'},
      {id:'lp2', label:'Claves en proceso a emisión',         meta:10,  uni:' claves',      mci:'MCI 2 · Recluta'},
      {id:'lp3', label:'Acompañamientos comerciales sem.',    meta:3,   uni:' acomp.',      mci:'MCI 2 · Recluta'}
    ]
  },
  { id:'sandra',   nombre:'Sandra Martínez', cargo:'Promotorías',             ini:'SM', color:'#e65100', tag:'Conservación',  tc:'tc',
    mci:'De 61.55% a 70% conservación Promotorías. Base: 627 · Meta: 439.',
    preds:[
      {id:'sn1', label:'Renovaciones a vencer 45d identificadas', meta:100, uni:'%',       mci:'MCI 1 · Conservación'},
      {id:'sn2', label:'Agentes baja producción contactados',      meta:20,  uni:' agentes',mci:'MCI 1 · Conservación'},
      {id:'sn3', label:'Tiempo resp. solicitudes críticas (hrs)',  meta:24,  uni:'h',       mci:'MCI 1 · Conservación'}
    ]
  },
  { id:'maricruz', nombre:'Maricruz García', cargo:'Franquicias',             ini:'MG', color:'#37474f', tag:'Cons.+Recluta', tc:'ta',
    mci:'De 53.57% a 70% conservación Franquicias + tablero por franquicia.',
    preds:[
      {id:'mg1', label:'Franquicias con agentes en riesgo',        meta:6,  uni:' franq.', mci:'MCI 1 · Conservación'},
      {id:'mg2', label:'Agentes con caída producción contactados', meta:30, uni:' agentes',mci:'MCI 1 · Conservación'},
      {id:'mg3', label:'Tablero revisado con franquicias',         meta:6,  uni:' rev.',   mci:'MCI 1 · Conservación'}
    ]
  },
  { id:'nataly',   nombre:'Nataly Mora',     cargo:'Marketing',               ini:'NM', color:'#4a148c', tag:'Ambos MCIs',    tc:'ta',
    mci:'Leads calificados semanales + campañas a agentes en riesgo.',
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

// ── Usuarios base ─────────────────────────────────────────────────────────
const UB = [
  {id:'u1', username:'admin',      password:'admin123',  nombre:'Administrador',   rol:'admin',        color:'#E8220A', mid:null,     cargo:'Dirección'},
  {id:'u2', username:'integrante', password:'click2026', nombre:'Sandra Martínez', rol:'integrante',   color:'#e65100', mid:'sandra', cargo:'Promotorías'},
  {id:'u3', username:'view',       password:'view2026',  nombre:'Visualizador',    rol:'visualizador', color:'#666',    mid:null,     cargo:'Consulta'}
];
