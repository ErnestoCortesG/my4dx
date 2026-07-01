# my4DX · ClickSeguros 2026

Tablero de ejecución **4DX** (Las 4 Disciplinas de la Ejecución) para una Dirección Comercial . Permite monitorear el avance semanal de los dos MCIs generales, las medidas predictivas de cada área, los compromisos individuales y el score de cumplimiento por líder.

---

## Inicio rápido

```bash
cd 4dx-clickseguros
python server.py
```

Abre `http://localhost:8000` en el navegador. Para compartir con el equipo en la misma red usa `http://[IP-de-tu-máquina]:8000`.

Puerto personalizado:

```bash
python server.py 9000
```

### Credenciales de demo

| Usuario | Contraseña | Rol |
|---------|------------|-----|
| `admin` | `admin123` | Administrador — edita todo |
| `integrante` | `click2026` | Integrante — solo sus compromisos (Sandra Martínez) |
| `view` | `view2026` | Visualizador — solo lectura |

---

## Estructura de archivos

```
4dx-clickseguros/
├── index.html          # Esqueleto HTML + modales + carga de scripts
├── server.py           # Backend SQLite — sirve archivos estáticos + API REST
├── 4dx.db              # Base de datos SQLite (se crea al primer arranque)
├── css/
│   └── styles.css      # Todos los estilos (sin frameworks)
└── js/
    ├── data.js         # Datos base: SEMANAS, MB (miembros), WB (WIGs), UB (usuarios)
    ├── state.js        # Estado global ST, getSem(), guardar(), loadState()
    ├── auth.js         # login(), logout(), setupRole(), permisos
    ├── render.js       # Todas las funciones de render y modales
    └── app.js          # Navegación, selectM(), semAnterior/Siguiente(), init
```

### Orden de carga de scripts

```
data.js → state.js → auth.js → render.js → app.js
```

Todos comparten el scope global `window` — no hay módulos ES.

---

## Arquitectura

### Stack

- **Frontend:** HTML5 + CSS3 + JavaScript vanilla — sin frameworks, sin bundler
- **Backend:** Python 3.7+ stdlib (`http.server` + `sqlite3`) — sin dependencias externas
- **Base de datos:** SQLite — archivo `4dx.db` en la misma carpeta
- **Persistencia doble:** servidor SQLite (fuente de verdad) + `localStorage` (caché offline)

### Cómo fluye la persistencia

```
Arranque
  └── loadState() → GET /api/state (servidor)
                  → fallback: localStorage
                  → fallback: datos de fábrica (UB/MB/WB)

Mutación (compromiso, usuario, MCI)
  └── guardar()   → POST /api/state (servidor)
                  → también escribe localStorage como respaldo

WIGs y predictivas
  └── botón Guardar → guardar() manual
```

El frontend siempre trabaja contra el objeto `ST` en memoria. `guardar()` persiste ese objeto completo como JSON — tanto en SQLite como en localStorage. Si el servidor no está disponible, la app sigue funcionando en modo offline con localStorage.

### API del servidor

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/state` | Devuelve el estado completo como JSON |
| `POST` | `/api/state` | Guarda el estado completo (upsert) |
| `GET` | `/*` | Sirve archivos estáticos (index.html, css/, js/) |

### Esquema SQLite

```sql
CREATE TABLE app_state (
    id         INTEGER PRIMARY KEY CHECK (id = 1),  -- fila única
    data       TEXT    NOT NULL,                     -- ST completo en JSON
    updated_at TEXT    DEFAULT (datetime('now'))
);
```

Una sola fila con el estado completo. Simple, sin migraciones, backup = copiar `4dx.db`.

### Pantallas y control de visibilidad

El sistema tiene dos pantallas: `#login-screen` y `#app-shell`. La visibilidad se controla **exclusivamente desde JS** con `element.style.cssText` — no con `.classList`. Esto supera la especificidad de los selectores de ID en el CSS, evitando el bug donde el CSS pisaba los cambios de JS.

```js
// Login → App
document.getElementById('login-screen').style.cssText = 'display:none!important';
document.getElementById('app-shell').style.cssText    = 'display:flex!important;flex-direction:column;height:100vh';
```

### Modelo de estado

```js
ST = {
  usuarios:   [...],            // copia mutable de UB
  miembros:   [...],            // copia mutable de MB (con preds[])
  wigs:       [...],            // copia mutable de WB
  mciTitulos: { 1: '...', 2: '...' },  // títulos editables de MCIs generales
  semanas: {
    1: {
      wigs:  { cg: 55.36, fr: 53.57, pr: 61.55, cl: 591, cv: 28 },
      preds: { sp1: 6, ep1: 80, ... },
      comps: [{ id, lider, mci, txt, done }, ...]
    },
    2: { ... },
    ...
  }
}
```

`mciTitulos` se migra automáticamente al cargar un estado guardado que no lo tenga (`_migrarST()` en `state.js`). El `mciBloque()` en Tablero y las opciones del selector de MCI lo leen siempre desde aquí — sin texto hardcodeado.

`getSem(n)` inicializa la semana si no existe, copiando los valores de inicio de los WIGs. Nunca devuelve `undefined`.

### Semáforo

| Color | Condición sobre el avance `(actual - inicio) / (meta - inicio)` |
|-------|------------------------------------------------------------------|
| 🟢 Verde | Avance ≥ 70% |
| 🟡 Amarillo | Avance 40–69% |
| 🔴 Rojo | Avance < 40% |

### Score semanal

```
score_líder_semana_N = compromisos_cumplidos_N / total_compromisos_N × 100
score_histórico      = promedio de todas las semanas con datos
```

El match líder ↔ compromiso se hace por primer apellido (`lider.split(' ')[0]`) para tolerar nombres completos vs. cortos en datos legacy.

---

## Sistema de roles

| Rol | Permisos |
|-----|----------|
| `admin` | Ver todo · CRUD de usuarios · Gestión completa de MCIs generales y contributivos · CRUD de compromisos de cualquier líder |
| `integrante` | Ver todo · Agregar compromisos **solo para sí mismo** · Marcar cumplidos **solo sus propios** compromisos |
| `visualizador` | Solo lectura — sin botones de edición |

El campo `mid` en un usuario tipo `integrante` enlaza con el `id` del miembro en `MB`. Si es `null`, puede ver todo pero no editar.

---

## Los 2 MCIs generales

### MCI 1 · Conservación de agentes
> Incrementar la conservación global de **55.36% a 70%** al 31 de diciembre de 2026.

**Fórmula:** Agente conservado = Prima pagada 2026 ≥ Prima pagada 2025 × 80%

| Segmento | Base 2025 | Meta 70% |
|----------|-----------|----------|
| Franquicias | 2,177 | 1,524 |
| Promotorías | 627 | 439 |
| **Total** | **2,804** | **1,963** |

### MCI 2 · Recluta de claves
> Generar al menos **1,000 claves nuevas únicas** al 31 de diciembre de 2026, con 35% en producción en 90 días.

**Regla de conteo:** cada clave emitida por aseguradora cuenta por separado (Alta Click + Quálitas + Mapfre = 3 claves).

---

## Los 8 líderes

| ID | Nombre | Área | Contribuye a |
|----|--------|------|-------------|
| `sully` | Sully Mitrani | PMO · Ejecución 4DX | Ambos MCIs |
| `ernesto` | Ernesto Cortés | BI · Digital · Datos | Ambos MCIs |
| `zvi-r` | Zvi Mitrani | Reclutamiento | MCI 2 |
| `zvi-c` | Zvi Mitrani | Capacitación | Ambos MCIs |
| `leslie` | Leslie Zetina | Gerencia de Embajadores | MCI 2 |
| `sandra` | Sandra Martínez | Promotorías | MCI 1 |
| `maricruz` | Maricruz García | Franquicias | MCI 1 + MCI 2 |
| `nataly` | Nataly Mora | Marketing | Ambos MCIs |

Los IDs de predictivas (`sp1`, `ep1`, `zp1`, etc.) son estables — son las claves del objeto `preds` dentro de cada semana. **No cambiar sin migrar el estado guardado en `4dx.db`.**

---

## Semanas

Las semanas van de **S1 (29 jun 2026) a S27 (31 dic 2026)**. Solo S1–S13 tienen etiqueta de fechas en el array `SEMANAS`; las semanas S14–S27 muestran solo el número.

---

## Operación y mantenimiento

### Levantar el servidor (manual)

```bash
cd "C:\ruta\a\4dx-clickseguros"
python server.py
```

El servidor queda corriendo en la terminal. Cerrar la terminal detiene el servidor.

### Backup

Copiar el archivo `4dx.db` es suficiente para respaldar todos los datos:

```bash
copy 4dx.db  4dx-backup-YYYYMMDD.db
```

### Restaurar un backup

Detener el servidor, reemplazar `4dx.db` por el backup, reiniciar el servidor.

### Ver los datos en SQLite (opcional)

Con cualquier cliente SQLite (DB Browser for SQLite, DBeaver, etc.):

```sql
SELECT updated_at, json_extract(data, '$.semanas') FROM app_state;
```

### Limpiar el estado (reset de fábrica)

```bash
del 4dx.db
python server.py   -- crea una nueva 4dx.db vacía
```

Al primer `guardar()` desde la app se re-inicializa con los datos de fábrica de `data.js`.

---

## Despliegue en red local

1. Anotar la IP de la máquina que correrá el servidor:
   ```bash
   ipconfig   # buscar IPv4 Address, ej. 192.168.1.50
   ```
2. Arrancar el servidor: `python server.py`
3. Compartir la URL con el equipo: `http://192.168.1.50:8000`
4. Asegurarse de que el firewall de Windows permite el puerto 8000:
   ```powershell
   netsh advfirewall firewall add rule name="my4DX" dir=in action=allow protocol=TCP localport=8000
   ```

---

## Cadencia semanal (sesión MCI)

**Jueves · 14:00–15:00 h · 60 min**

| Tiempo | Bloque | Contenido |
|--------|--------|-----------|
| 5 min | Apertura CEO | ¿Ganamos o perdemos? ¿Qué MCI está en riesgo? |
| 20 min | Tablero MCI 1 | Conservación global, Promotorías, Franquicias, agentes en riesgo |
| 20 min | Tablero MCI 2 | Claves acumuladas, leads, contacto <24h, en proceso, emitidas |
| 10 min | Compromisos | ¿Qué predictiva moví? ¿Qué bloqueo tengo? ¿A qué me comprometo? |
| 5 min | Cierre CEO | Decisiones, prioridades, responsables y fechas |

---

## Tablero MCI · Medidas predictivas por integrante

La sección **Medidas predictivas por integrante** muestra un bloque por cada líder con tres capas de información:

### Encabezado del bloque

```
SULLY MITRANI · PMO · EJECUCIÓN 4DX    🟡 63%
```

- Nombre, área y rol del integrante
- Score general de predictivas: promedio del avance `(valor_actual / meta × 100)` de todas las medidas con dato capturado
- Semáforo global: 🟢 ≥ 80% · 🟡 50–79% · 🔴 < 50% · — sin datos

### Banda MCI CONTRIBUTIVO

Franja gris debajo del encabezado con el texto descriptivo del MCI al que contribuye el integrante (campo `mci` en `MB`).

### Tabla de medidas predictivas

| # | Medida | Meta | Valor sem. N | Avance | Semáforo |
|---|--------|------|-------------|--------|----------|
| 1 | Descripción | 100% | 60% | 60% | 🟡 |

- **Semáforo por fila:** calculado como `Math.min(100, Math.round(valor / meta × 100))`; mismos umbrales que el global
- **Sin dato** (campo vacío): muestra `—` en la columna de semáforo y no se incluye en el promedio global

---

## Compromisos · Evidencia de cumplimiento

Al palomear un compromiso, aparece debajo del texto un campo de evidencia con dos botones:

- **Guardar** — persiste la descripción en SQLite + localStorage y deshabilita el campo
- **Editar** — re-habilita el campo para corregir o ampliar la evidencia

Un usuario sin permisos de edición ve la evidencia en modo solo lectura (franja verde con "Prueba: …").

---

## Integrantes · MCIs disponibles al agregar compromiso

Cuando un integrante agrega un compromiso (fila quick-add o modal "+ Nuevo"), el selector de MCI solo muestra los grupos a los que realmente contribuye, derivados de los valores únicos de `preds[].mci` de su miembro asociado.

| Integrante | MCIs disponibles |
|---|---|
| Sully Mitrani | Soporte 4DX |
| Ernesto Cortés | MCI 1 · Conservación · Soporte 4DX · Ambos MCIs |
| Zvi Mitrani (Reclutamiento) | MCI 2 · Recluta |
| Zvi Mitrani (Capacitación) | MCI 2 · Recluta |
| Leslie Zetina | MCI 2 · Recluta |
| Sandra Martínez | MCI 1 · Conservación |
| Maricruz García | MCI 1 · Conservación |
| Nataly Mora | MCI 2 · Recluta |

---

## Historial de cambios

### v1.5 — Gestión de MCIs en Administración (jul 2026)

#### MCIs generales (nueva vista jerárquica)
- Panel rediseñado: cada MCI muestra sus elementos/WIGs agrupados con campos editables inline: Elemento, Inicio, Meta, Unidad, Actual (semana activa) y Descripción
- Título del MCI editable directamente desde el encabezado del grupo; se persiste en `ST.mciTitulos`
- **+ Elemento** por grupo agrega un sub-elemento nuevo al MCI
- **+ Nuevo MCI** (modal) crea un MCI completo con título y primer elemento
- Eliminación de elementos individuales con botón ×
- `mciTitulos` migrado automáticamente en estados guardados previos (`_migrarST`)

#### MCIs contributivos por integrante (sección nueva)
- Un bloque por cada integrante mostrando su MCI contributivo (texto editable) y sus medidas predictivas
- Medidas editables inline: nombre, meta, unidad, MCI asignado (selector dinámico)
- **+ Agregar medida** añade una fila por miembro
- **+ Nuevo MCI contributivo** (modal): selecciona integrante, captura nombre del MCI y agrega medidas; las preds se suman a las existentes sin borrarlas
- Selector de MCI en medidas derivado de `_mciOpts()` — incluye MCIs numerados + Soporte 4DX + Ambos MCIs + cualquier valor existente no reconocido

#### Tablero MCI
- Eliminados los campos "Actualizar…" y botones OK de las tarjetas de WIG — el valor actual ahora se gestiona exclusivamente desde Administración

#### Técnico
- `mciParaIntegrante()` ahora es completamente dinámico: deriva las opciones de `_mciOpts()` y detecta múltiples MCIs numerados para incluir "Ambos MCIs" automáticamente
- Fix CSS: especificidad de `.predrow .predinp-*` corregida para que los anchos de columna no sean pisados por `.frow input { width:100% }`

---

### v1.4 — Evidencia de compromisos + UX (jun 2026)
- Campo de evidencia al palomear un compromiso: Guardar (deshabilita) + Editar (re-habilita)
- Cache-busting en `server.py`: timestamp de arranque inyectado en URLs de JS/CSS → el navegador siempre descarga versión fresca al reiniciar el servidor
- Selector de MCI filtrado para integrantes: solo ven los grupos a los que contribuyen
- Fix: todos los botones de modales tienen `type="button"` → evita prompt de guardar credenciales del navegador
- Fix: modal de usuario con `autocomplete="off"` en todos los campos de texto

### v1.3 — Predictivas por integrante (jun 2026)
- Encabezado de bloque muestra score general (🟢/🟡/🔴 + %) por integrante
- Banda **MCI CONTRIBUTIVO** entre encabezado y tabla de predictivas
- Nueva columna **Semáforo** en la tabla de medidas predictivas (por fila)
- Filas sin dato no afectan el promedio global del integrante

### v1.2 — Backend SQLite (jun 2026)
- Agregado `server.py`: Python stdlib, sirve archivos estáticos + API `/api/state`
- Base de datos `4dx.db` (SQLite) como fuente de verdad compartida entre usuarios
- `loadState()` y `guardar()` migrados a `fetch` async con fallback a localStorage
- `init()` en `app.js` convertido a `async` para aguardar `loadState()`
- Auto-guardado en todas las mutaciones: compromisos, usuarios, MCIs
- WIGs y predictivas siguen usando botón Guardar manual

### v1.1 — Módulos (jun 2026)
- Separado de archivo único `4dx-clickseguros-app.html` a estructura modular
- Migrado `window.storage` (Claude Artifacts) a `localStorage`
- Corregido bug de semáforo: template literal `'avg>=40?🟡'` era string, no ternario
- `init` convertido de `async` a síncrono

### v1.0 — Archivo único (jun 2026)
- Versión inicial en `4dx-clickseguros-app.html`
- Login con `style.cssText` para superar especificidad CSS
- 8 líderes, 2 MCIs, 3 roles, persistencia localStorage
