# my4DX · ClickSeguros 2026

Tablero de ejecución **4DX** (Las 4 Disciplinas de la Ejecución) para la Dirección Comercial de Click Seguros. Permite monitorear el avance semanal de los dos MCIs generales, las medidas predictivas de cada área, los compromisos individuales y el score de cumplimiento por líder.

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
├── assets/
│   ├── logo-click.svg      # Logo original (navy + rojo) — uso en fondos claros
│   └── logo-click-neg.svg  # Logo versión negativa (blanco + rojo) — uso en navbar/fondos oscuros
├── css/
│   └── styles.css      # Todos los estilos (sin frameworks)
└── js/
    ├── data.js                # Datos base: SEMANAS, MB (miembros), WB (WIGs) — usuarios en el servidor
    ├── state.js               # Estado global ST, getSem(), getWigVal(), esc(), persistencia por documento
    ├── auth.js                # login(), logout(), restoreSession(), setupRole(), permisos
    ├── render-core.js         # Orquestador (renderAll), sidebar, helpers y utilidades UI (toast, modales)
    ├── render-tablero.js      # Vista Tablero MCI (WIGs + gráfico racetrack)
    ├── render-compromisos.js  # Vista Compromisos
    ├── render-scores.js       # Vista Scores
    ├── render-admin.js            # Administración: orquestador renderAdmin()
    ├── render-admin-usuarios.js   #   · sección Usuarios + CRUD
    ├── render-admin-mcis.js       #   · sección MCIs generales (WIGs) + edición
    ├── render-admin-contrib.js    #   · sección MCIs contributivos + medidas
    ├── render-perfil.js       # Vista Perfil de integrante
    └── app.js                 # Navegación, selectM(), semAnterior/Siguiente(), init
└── tests/
    ├── test_server.py    # Pruebas del backend (unittest): auth, hash, /api/doc, migración
    ├── test_client.mjs   # Pruebas de helpers de cliente (node:test): esc(), getWigVal()
    └── run.py            # Corre ambas suites y reporta un resultado unificado
```

### Orden de carga de scripts

```
data.js → state.js → auth.js →
  render-core → render-tablero → render-compromisos → render-scores →
  render-admin → render-admin-usuarios → render-admin-mcis → render-admin-contrib →
  render-perfil →
app.js
```

Todos comparten el scope global `window` — no hay módulos ES. Las funciones son declaraciones hoisted, así que el orden entre los `render-*.js` no importa; solo importa que carguen después de `state.js`/`auth.js` y que `app.js` sea el último (arranca `init()`).

> **Evolución futura (opcional, no implementada):** migrar a un toolchain con build (Vite + módulos ES, y eventualmente TypeScript o un framework). Se evaluó y **se dejó fuera a propósito**: aporta valor a escala (equipos grandes, features continuas, muchos componentes) que este proyecto no tiene. Con la app ya modular por vista/subdominio, el costo de introducir un pipeline de build y reescribir a módulos supera el beneficio para una herramienta interna de ~3 usuarios. Reconsiderar solo si crece el equipo de desarrollo o el ritmo de features.

---

## Pruebas

Sin dependencias externas — usan `unittest` (stdlib de Python) y `node:test` (runner nativo de Node).

```bash
python tests/run.py              # corre ambas suites (backend + cliente)

# o por separado:
python -m unittest discover -s tests -v    # solo backend
node --test tests/test_client.mjs          # solo helpers de cliente
```

- **`test_server.py`** (25 pruebas) — levanta el servidor en un hilo contra una BD temporal: hash/verificación de contraseñas, sesiones y expiración, login, escritura protegida, control optimista de versión en `/api/doc` (incluye 409), permisos de `/api/users` y migración blob→documentos.
- **`test_client.mjs`** (8 pruebas) — carga `state.js` en un sandbox `vm` (sin tocar el código de producción) y prueba `esc()` (anti-XSS) y `getWigVal()` (herencia de valores entre semanas).

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
                  → fallback: datos de fábrica (MB/WB)

Mutación (compromiso, usuario, MCI)
  └── guardar()   → POST /api/state (servidor)
                  → también escribe localStorage como respaldo
```

El frontend siempre trabaja contra el objeto `ST` en memoria. `guardar()` persiste ese objeto completo como JSON en SQLite y localStorage. Si el servidor no está disponible, la app sigue funcionando en modo offline.

### API del servidor

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `POST` | `/api/login` | — | Verifica usuario/contraseña; devuelve `{token, user}` |
| `POST` | `/api/logout` | Bearer | Invalida el token de sesión |
| `GET` | `/api/session` | Bearer | Restaura la sesión; devuelve `{user}` |
| `GET` | `/api/state` | — | Ensambla el estado completo desde los documentos; incluye `_versions` |
| `POST` | `/api/state` | Bearer (admin/integrante) | Compat: desglosa el estado completo en documentos |
| `POST` | `/api/doc` | Bearer (admin/integrante) | Guarda **un** documento (`config` o `week:N`) con control de versión |
| `GET` | `/api/users` | Bearer (admin) | Lista de usuarios **sin contraseñas** |
| `POST` | `/api/users` | Bearer (admin) | Crea o actualiza un usuario |
| `POST` | `/api/users/delete` | Bearer (admin) | Elimina un usuario |
| `GET` | `/*` | — | Sirve archivos estáticos (index.html, css/, js/, assets/) |

### Autenticación y seguridad

Los usuarios y contraseñas **viven en el servidor**, no en el estado de la app:

- **Contraseñas hasheadas** con PBKDF2-HMAC-SHA256 (100k iteraciones, salt aleatorio por usuario) — nunca en texto plano. Ver `hash_pwd` / `verify_pwd` en `server.py`.
- **Login del lado del servidor:** `/api/login` valida contra la tabla `users` y emite un token de sesión (`secrets.token_urlsafe`, TTL 12 h, **persistido en la tabla `sessions`**). El cliente lo guarda en `localStorage` y lo envía como `Authorization: Bearer <token>`. Al persistir en BD, las sesiones **sobreviven a reinicios del servidor**: tras una actualización o reinicio de la máquina los usuarios siguen dentro (no deben re-loguearse). Las sesiones expiradas se barren al arrancar.
- **Escritura protegida:** `POST /api/state` y todo el CRUD de usuarios exigen token válido; sin él responden 401/403. La lectura del tablero (`GET /api/state`) queda pública.
- El objeto `user` que devuelve el servidor **nunca incluye la contraseña ni su hash**.
- `_migrarST()` purga cualquier `ST.usuarios` heredado de versiones previas (donde las contraseñas se guardaban en texto plano en el blob).

> El servidor arranca los usuarios semilla (`SEED_USERS` en `server.py`) solo si la tabla `users` está vacía. Cambia esas contraseñas desde el panel de Admin en producción.

### CORS

Por defecto el servidor **no emite** el header `Access-Control-Allow-Origin`, así que solo funciona el mismo origen (server.py sirve frontend y API juntos) y el navegador bloquea peticiones cross-origin. Antes se emitía `*` (cualquier origen), que era innecesario y abría la API a cualquier sitio.

Para permitir un frontend en otro dominio/puerto (p. ej. desarrollo con Vite, o un frontend separado), exporta la variable de entorno con una allowlist separada por comas — solo esos orígenes reciben el header:

```bash
CORS_ORIGINS="https://4dx.miempresa.com,http://localhost:5173" python server.py
```

### Prevención de XSS

Todo texto editable por el usuario (nombres, cargos, etiquetas y descripciones de WIG, medidas predictivas, títulos de MCI, textos y evidencias de compromisos) se inserta con el helper **`esc()`** (en `state.js`), que escapa `& < > " '`. Aplica tanto a contenido HTML como a valores de atributo. Sin esto, un texto como `<img src=x onerror=…>` guardado en un campo se ejecutaría en la pantalla compartida del equipo (XSS almacenado). `esc()` reemplazó los `.replace(/"/g,'&quot;')` parciales que había en los inputs de Admin.

### Esquema SQLite

```sql
CREATE TABLE app_state (
    id         INTEGER PRIMARY KEY CHECK (id = 1),  -- fila única
    data       TEXT    NOT NULL,                     -- ST completo en JSON (sin usuarios)
    updated_at TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE users (
    id       TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    pwd_hash TEXT NOT NULL,          -- 'salt_hex:hash_hex' (PBKDF2-SHA256)
    nombre   TEXT, rol TEXT, mid TEXT, cargo TEXT, color TEXT
);

CREATE TABLE sessions (            -- sesiones persistentes (sobreviven reinicios)
    token    TEXT PRIMARY KEY,
    username TEXT, rol TEXT, uid TEXT,
    exp      REAL NOT NULL          -- epoch de expiración; se barren al arrancar
);
```

`users` guarda las credenciales. El estado del tablero **ya no vive en `app_state`** (blob único) sino en `state_docs`, un documento por sección:

```sql
CREATE TABLE state_docs (
    key        TEXT PRIMARY KEY,   -- 'config' | 'week:1' … 'week:53'
    data       TEXT    NOT NULL,   -- JSON de esa sección
    version    INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT    DEFAULT (datetime('now'))
);
```

- **`config`** — definiciones globales: `wigs`, `miembros`, `mciTitulos`, `_semCal`.
- **`week:N`** — datos capturados de la semana N: `wigs`, `wigsExplicit`, `wigSem`, `preds`, `comps`.

`GET /api/state` reensambla estos documentos en la forma `ST` que espera el cliente y añade `_versions` (versión por documento). El backup sigue siendo copiar `4dx.db`. La tabla `app_state` se conserva solo como origen para la migración one-shot a `state_docs`.

### Concurrencia (escritura por documento)

Antes, cualquier cambio guardaba **todo** el estado en una fila (`last-write-wins`): dos personas editando a la vez se pisaban. Ahora cada mutación guarda **solo el documento que tocó**, con control **optimista de versión**:

- El cliente guarda vía `guardarConfig()` o `guardarSemana(n)` → `POST /api/doc {key, data, version}`.
- El servidor rechaza con **409** si la versión enviada no coincide con la almacenada (alguien más escribió primero). El cliente entonces **recarga y avisa** (`toast`), sin pisar el cambio ajeno.
- Editar la configuración y una semana —o dos semanas distintas— nunca colisiona, porque son documentos separados. El único punto de contención residual es dos personas editando la **misma** semana a la vez, que ahora se detecta (409) en vez de perderse en silencio.

> Nota: `updWIG`/`updPred` (valores capturados en el perfil) antes no persistían al servidor — solo vivían en memoria. Con la normalización ahora guardan su semana correctamente.

> **Nota de despliegue:** el servidor de la app es `server.py` (Python stdlib). `.claude/launch.json` arranca el preview con `python server.py 5173`. Un servidor estático (`npx serve`) **no** sirve la API `/api/*` y la autenticación no funcionaría.

### Pantallas y control de visibilidad

El sistema tiene dos pantallas: `#login-screen` y `#app-shell`. La visibilidad se controla **exclusivamente desde JS** con `element.style.cssText` — no con `.classList`. Esto supera la especificidad de los selectores de ID en el CSS.

---

## Modelo de estado

```js
ST = {
  // (los usuarios NO viven aquí — están en la tabla `users` del servidor)
  miembros:   [...],            // copia mutable de MB (con preds[])
  wigs:       [...],            // copia mutable de WB (con uniSem opcional)
  mciTitulos: { 1: '...', 2: '...' },  // títulos editables de MCIs generales
  semanas: {
    1: {
      wigs:         { cg: 55.36, fr: 980, pr: 37, cl: 894, cv: 28 }, // valores explícitos Admin
      wigsExplicit: { cg: true, fr: true, ... },                      // marca qué valores son explícitos
      wigSem:       { cg: 1.2, fr: 25, ... },                         // avance semanal (independiente)
      preds:        { sp1: 6, ep1: 80, ... },
      comps:        [{ id, lider, mci, txt, done }, ...]
    },
    2: {
      wigs:         {},          // vacío → hereda de semana 1 vía getWigVal()
      wigsExplicit: {},
      wigSem:       {},          // avance semanal propio de esta semana
      preds:        {},
      comps:        []
    }
  }
}
```

### Elementos sin datos

Un elemento MCI sin ningún registro capturado (ni acumulado ni avance semanal en ninguna semana) **no cuenta en los semáforos**: se excluye del promedio del bloque y de las tarjetas resumen, y su gráfico se pinta en gris neutro con la leyenda "sin datos". Helpers en `state.js`:

- `wigTieneDatos(wigId)` — true si alguna semana tiene valor acumulado o avance semanal para ese WIG
- `limpiarWig(wigId, n)` — borra los registros del WIG **solo en la semana `n`** (`wigs`, `wigsExplicit`, `wigSem`); el elemento se conserva

En Administración, cada elemento tiene un botón **Limpiar** (con confirmación) que ejecuta `limpiarWigDatos()`: borra el registro de la **semana activa**, re-renderiza y persiste. Tras borrarlo, `getWigVal` vuelve a heredar el valor de la semana anterior (o queda sin datos si no hay ninguno previo).

### Acumulación de valores WIG

Los valores acumulados de los elementos MCI generales **se mantienen de semana en semana** a menos que Admin los cambie explícitamente. El mecanismo:

- **`getWigVal(n, wigId)`** — lectura lazy: busca hacia atrás desde semana `n` hasta la primera semana que tenga el valor marcado como explícito. Si no encuentra ninguno, devuelve `w.inicio`.
- **`saveWigActual(id, val)`** — escritura explícita desde Admin: guarda el valor en `ST.semanas[sem].wigs[id]` y marca `ST.semanas[sem].wigsExplicit[id] = true`.
- **`getSem(n)`** — solo inicializa la estructura de la semana; **nunca** copia valores WIG de semanas anteriores.
- **`_migrarST()`** — migración que limpia valores no explícitos de semanas 2+ al cargar el estado (elimina datos residuales de versiones anteriores).

### Campos del WIG (`ST.wigs[]`)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | string | Clave única (`cg`, `fr`, `pr`, `cl`, `cv`) |
| `label` | string | Nombre del elemento |
| `inicio` | number | Valor de partida (base 2025) |
| `meta` | number | Valor objetivo al 31 dic 2026 |
| `uni` | string | Unidad de medida (`%`, ` claves`, etc.) |
| `uniSem` | string? | Unidad para el avance semanal (override de `uni`; si null usa `uni`) |
| `metaSem` | number? | Meta de avance semanal (si null se calcula como `(meta - inicio) / TOTAL_SEM`) |
| `mci` | number | MCI al que pertenece (1 o 2) |
| `sub` | string | Descripción corta visible en el tablero |

---

## Sistema de semáforo

### Umbrales (todos los semáforos de la app)

| Color | Condición sobre el avance `(actual - inicio) / (meta - inicio) × 100` |
|-------|------------------------------------------------------------------------|
| Verde | Avance ≥ 100% |
| Amarillo | Avance 50–99% |
| Rojo | Avance < 50% |

### Score semanal

```
score_líder_semana_N = compromisos_cumplidos_N / total_compromisos_N × 100
score_histórico      = promedio de todas las semanas con datos
```

El match líder ↔ compromiso se hace por primer apellido (`lider.split(' ')[0]`) para tolerar nombres completos vs. cortos en datos legacy.

---

## Tablero MCI · Sección MCIs Generales

Cada MCI general se muestra en un bloque con:

- **Encabezado:** número, título, porcentaje promedio de avance de todos sus elementos y badge de semáforo
- **Elementos:** una fila por WIG con:
  - Nombre, valor acumulado actual → meta y descripción (`sub`)
  - **Gráfico racetrack** (`wigTrackSVG` en `render-tablero.js`): carriles horizontales alternados con dos trayectorias — línea punteada gris de meta ideal y línea sólida del color del semáforo con el avance real, terminada en un punto
  - Tira discreta de avance semanal: etiqueta "AVANCE SEM. N", valor, barra fina de 3px y meta semanal (sin badge — el color lo comunica la curva principal)
  - Divisor navy de 2px entre elementos consecutivos

### Lógica del gráfico racetrack

- **Línea ideal:** acumulación de `metaSem` por semana — `ideal(k) = inicio + metaSem × (k−1)`, topada en `meta`. Si la meta se alcanza antes de la última semana (53), la línea continúa plana hasta el final. **Regla de unidades:** `metaSem` solo se usa si está en la misma unidad que el acumulado (sin override `uniSem`); si el avance semanal se mide en otra unidad, el ritmo ideal se deriva como `(meta − inicio) / TOTAL_SEM`.
- **Línea real:** rectas entre "anclas" — las semanas donde existe un valor guardado en `ST.semanas[k].wigs`. Sin historial intermedio, es una recta pura desde `inicio` (sem 1) hasta el valor actual en la semana en curso (equivale a dividir el avance entre las semanas transcurridas).
- **Escala Y:** de `min(inicio, actual)` a `max(meta, actual, idealFinal)` — la curva real nunca se sale del área visible aunque supere la meta.

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

Las semanas siguen el **calendario anual 2026**: S1 = 1–4 ene (parcial) y S53 = 28–31 dic, con semanas de lunes a domingo. El array `SEMANAS` se genera automáticamente en `data.js` (índice 0 vacío, base 1). Constantes y helpers:

- `TOTAL_SEM` — número total de semanas del año (53)
- `semanaActual()` — semana de calendario correspondiente a la fecha de hoy; la app arranca posicionada en ella

**Migración:** el esquema anterior iniciaba en S1 = 29 jun (26 semanas de desfase). `_migrarST()` desplaza una sola vez todas las semanas guardadas +26 (marca `ST._semCal`) y marca como explícitos los valores de la antigua semana 1 (ahora S27) para que sobrevivan la limpieza de herencia.

---

## Operación y mantenimiento

### Levantar el servidor

```bash
cd "C:\ruta\a\4dx-clickseguros"
python server.py
```

El servidor queda corriendo en la terminal. Cerrar la terminal detiene el servidor.

### Backup

```bash
copy 4dx.db  4dx-backup-YYYYMMDD.db
```

### Restaurar un backup

Detener el servidor, reemplazar `4dx.db` por el backup, reiniciar el servidor.

### Ver los datos en SQLite

Con cualquier cliente SQLite (DB Browser for SQLite, DBeaver, etc.):

```sql
SELECT updated_at, json_extract(data, '$.semanas') FROM app_state;
```

### Reset de fábrica

```bash
del 4dx.db
python server.py
```

Al primer `guardar()` desde la app se re-inicializa con los datos de fábrica de `data.js`.

---

## Despliegue en red local

1. Anotar la IP de la máquina servidora:
   ```bash
   ipconfig   # buscar IPv4 Address, ej. 192.168.1.50
   ```
2. Arrancar: `python server.py`
3. Compartir con el equipo: `http://192.168.1.50:8000`
4. Permitir el puerto en el firewall:
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

La sección muestra un bloque por cada líder con:

- **Encabezado:** nombre, área, score general de predictivas y semáforo
- **Banda MCI CONTRIBUTIVO:** texto del MCI al que contribuye
- **Tabla de predictivas:** con valor, meta, avance (%) y semáforo por fila

El score es el promedio acumulado de todas las semanas con datos (`predScoreAcum()`). Filas sin dato no afectan el promedio.

---

## Compromisos · Evidencia de cumplimiento

Al palomear un compromiso aparece un campo de evidencia con:

- **Guardar** — persiste en SQLite + localStorage y deshabilita el campo
- **Editar** — re-habilita el campo para corregir

Un usuario sin permisos ve la evidencia en modo solo lectura.

---

## Historial de cambios

### v2.8 — Diálogos de confirmación y toasts con variantes (jul 2026)

Pulido de avisos y feedback (verificación y mejora de animaciones/pop-ups):

- **Diálogo de confirmación con estilo** (`confirmar()` en `render-core.js`, promise-based): reemplaza los `confirm()` nativos y **añade aviso a acciones destructivas que no lo tenían** — eliminar elemento MCI (`delWig`), medida (`delPred`) y compromiso (`delComp`). Botón rojo en modo `peligro`, cierre por backdrop/Escape, reutiliza la animación de modales.
- **Toasts con variantes** `toast(msg, tipo)`: `ok` (verde), `error` (rojo, dura más), `warn` (ámbar), `info` (azul), con borde-acento y sombra. Los mensajes de error/validación/sesión ahora se distinguen visualmente en vez de verse todos iguales.
- Motion base revisado (ya cumplía Emil/impeccable: ease-out-expo, scale desde 0.96, `prefers-reduced-motion`); no requirió cambios.

---

### v2.7 — División de render-admin.js + fix de body no drenado (jul 2026)

Sugerencia #4 del plan (mantenibilidad):

- `render-admin.js` (474 líneas) se dividió por subdominio: `render-admin.js` (orquestador `renderAdmin()`), `render-admin-usuarios.js`, `render-admin-mcis.js`, `render-admin-contrib.js`. `renderAdmin()` ahora compone tres constructores (`adminUsuariosHTML`, `adminMCIsHTML`, `adminContribHTML`), cada uno junto a las mutaciones de su sección.
- **Fix de servidor (encontrado por las pruebas):** en un rechazo temprano (401/403/400) el servidor no leía el cuerpo de la petición, lo que rompía la conexión de forma intermitente (test flaky ~1/3, y potencialmente errores esporádicos en el navegador real). Ahora `do_POST` **drena el body siempre** antes de rutear. Suite estable 6/6.

---

### v2.6 — Sesiones persistentes (jul 2026)

Sugerencia #3 del plan:

- Las sesiones pasaron de un dict en memoria a la tabla **`sessions`** en SQLite. Ahora **sobreviven a reinicios del servidor**: tras actualizar la app o reiniciar la máquina, los usuarios siguen con sesión iniciada.
- `new_session`/`session_for`/`end_session` operan contra la tabla; las expiradas se barren al arrancar (`init_db`).
- Pruebas de sesión adaptadas a BD + nueva `test_end_session_elimina`. Verificado end-to-end: un token emitido por un proceso sigue válido en un proceso reiniciado.

---

### v2.5 — CORS restringido (jul 2026)

Sugerencia #2 del plan:

- El servidor ya **no emite `Access-Control-Allow-Origin: *`**. Por defecto no emite el header (solo mismo origen); cross-origin queda bloqueado por el navegador.
- Allowlist configurable vía `CORS_ORIGINS` (lista separada por comas) — solo esos orígenes reciben el header, reflejado con `Vary: Origin`.
- 3 pruebas nuevas en `test_server.py` (sin Origin, origen no listado, origen permitido).

---

### v2.4 — Pruebas automatizadas (jul 2026)

Primera capa de pruebas (sugerencia #1 del plan de mejoras), sin dependencias externas:

- **`tests/test_server.py`** (25 pruebas, `unittest`): hash/verificación PBKDF2, sesiones y expiración, login correcto/incorrecto, `POST /api/state` protegido, control de versión de `/api/doc` (200 y 409), permisos de `/api/users`, y migración blob→documentos. Levanta el servidor en un hilo con BD temporal.
- **`tests/test_client.mjs`** (8 pruebas, `node:test`): `esc()` (escapado anti-XSS) y `getWigVal()` (herencia entre semanas), cargando `state.js` en un sandbox `vm` sin modificar el código de producción.
- **`tests/run.py`**: runner unificado de ambas suites.
- `server.py`: parseo del puerto tolerante al importar el módulo (necesario para las pruebas).

---

### v2.3 — División de render.js por vista (jul 2026)

Paso 4 del plan (mantenibilidad):

- El monolito `render.js` (1,170 líneas) se dividió en **6 archivos por vista**: `render-core.js` (orquestador, sidebar, utilidades), `render-tablero.js`, `render-compromisos.js`, `render-scores.js`, `render-admin.js`, `render-perfil.js`.
- Refactor puramente mecánico: mismas 44 funciones globales, sin cambio de comportamiento. `index.html` carga los 6 en secuencia antes de `app.js`.
- Verificado: las 5 vistas renderizan sin error y sin cambios visuales; `node --check` OK en los 6 archivos.

---

### v2.2 — Persistencia normalizada por documento (jul 2026)

Paso 3 del plan (concurrencia):

- Nueva tabla **`state_docs`** (un documento por sección: `config` + `week:N`), reemplaza el blob único `app_state`.
- **Escritura granular con versión optimista:** `POST /api/doc` guarda un solo documento y rechaza con **409** si la versión está desactualizada. En el cliente, `guardarConfig()` / `guardarSemana(n)` sustituyen al `guardar()` de blob completo; en conflicto se recarga y avisa.
- Cada mutación en `render.js`/`app.js` llama al guardado de la sección que toca (config vs. semana) — editar config y una semana ya no colisionan.
- `GET /api/state` reensambla los documentos (forma `ST` + `_versions`); migración one-shot del blob a documentos en `_migrar_blob_a_docs`.
- Fix: `updWIG`/`updPred` ahora sí persisten (antes solo vivían en memoria).

---

### v2.1 — Escapado HTML / anti-XSS (jul 2026)

Paso 2 del plan de seguridad:

- Nuevo helper **`esc()`** en `state.js` que escapa `& < > " '`.
- Aplicado a **todas** las inserciones de texto editable en `render.js` (sidebar, tablero, contrib-cards, compromisos, scores, admin, perfil, modales y selectores).
- Reemplaza los `.replace(/"/g,'&quot;')` parciales que solo cubrían comillas en algunos inputs.
- Verificado: un payload `<img onerror>` en campos editables se renderiza como texto escapado y no se ejecuta.

---

### v2.0 — Autenticación en el servidor (jul 2026)

Endurecimiento de seguridad (paso 1 del plan de mejoras):

- **Contraseñas hasheadas** (PBKDF2-HMAC-SHA256, salt por usuario) en una tabla `users` del servidor; se acabó el texto plano.
- **Autenticación del lado del servidor:** nuevos endpoints `/api/login`, `/api/logout`, `/api/session`; tokens Bearer con TTL de 12 h.
- **Escritura protegida:** `POST /api/state` y el CRUD de usuarios (`/api/users*`) exigen token; el login client-side (`ST.usuarios.find`) fue eliminado.
- Usuarios y contraseñas **fuera del blob de estado**: `data.js` ya no trae `UB`; `state.js` quitó `ST.usuarios`; el cliente usa el cache `USERS` (vía `/api/users`, solo admin) y un `authToken`.
- Sesión persistente: `restoreSession()` reingresa con el token guardado al recargar.
- `.claude/launch.json` ahora arranca `python server.py` (antes `npx serve`, que no servía la API).

---

### v1.9 — Gráfico racetrack + semanas de calendario (jul 2026)

#### Semanas alineadas al calendario anual
- `SEMANAS` se genera automáticamente en `data.js`: S1 = 1–4 ene, S53 = 28–31 dic (lunes a domingo)
- `TOTAL_SEM` (53) reemplaza el 27 hardcodeado en navegación, metas semanales auto y gráficos
- `semanaActual()`: la app arranca en la semana de calendario en curso
- Migración one-shot en `_migrarST()`: semanas guardadas desplazadas +26 (el esquema viejo iniciaba el 29 jun); valores de la antigua S1 marcados explícitos
- Compromisos demo de fábrica sembrados en la S27 (su semana real de calendario)
- Botón **"Semana actual"** junto al navegador de semanas — salta a la semana de calendario en curso

#### Limpieza de elementos MCI
- Botón **Limpiar** por elemento en Administración: borra el registro del WIG **de la semana activa** (el elemento se conserva); el valor vuelve a heredarse de la semana anterior
- Elementos sin datos capturados quedan fuera de los semáforos: excluidos del promedio del bloque y tarjetas resumen, gráfico en gris neutro con leyenda "sin datos"
- Helpers `wigTieneDatos()` y `limpiarWig(id, n)` en `state.js`

#### Correcciones
- **Acceso a perfiles de integrantes:** una medida predictiva sin campo `mci` (agregada desde Admin) lanzaba una excepción en `renderPerfil()`, dejando el perfil anterior visible al hacer clic en un integrante (sidebar o contrib-card del Tablero). Se hace `renderPerfil` tolerante a `mci` vacío, el alta de medidas asigna `mci: 'Ambos MCIs'` por defecto, y `_migrarST()` repara las medidas ya guardadas sin MCI.


- **`wigTrackSVG()`** en `render.js`: cada elemento MCI sustituye la barra de progreso lineal por un gráfico de carriles (estilo 4DX) con dos trayectorias:
  - Meta ideal: línea punteada gris construida acumulando `metaSem` por semana, con tramo plano si alcanza la meta antes de la última semana (53)
  - Avance real: línea sólida del color del semáforo, trazada como rectas entre semanas con valor explícito; sin historial es una recta `inicio → actual`
- **Tira de avance semanal rediseñada** (`.wig-semline`): una sola línea discreta con etiqueta, valor, barra de 3px y meta — se eliminó el banner navy y el badge de semáforo semanal
- **Fondos alternados eliminados** de `.wig-pair` — el divisor navy de 2px es el único separador entre elementos
- Eje del gráfico: etiquetas `sem 1` / `sem 53` en el pie de cada elemento

---

### v1.8 — WIGs acumulativos + ajustes de semáforo + UI (jul 2026)

#### Acumulación de valores WIG

- **`getWigVal(n, wigId)`:** nueva función de lectura lazy — busca hacia atrás sin escribir en el estado. Reemplaza todos los accesos directos a `ST.semanas[n].wigs[id]` en cálculos de avance.
- **`getSem(n)`** simplificado: ya no inicializa valores WIG desde `w.inicio`; solo crea la estructura de la semana.
- **`wigsExplicit`:** nuevo mapa por semana que marca qué valores fueron guardados explícitamente desde Admin. `saveWigActual()` lo escribe; `getWigVal()` lo lee para filtrar herencia legítima.
- **`_migrarST()`** ampliado: limpia wigs no explícitos de semanas 2+ al cargar, eliminando valores residuales de la versión anterior que bloqueaban la herencia.

#### Semáforos

- Umbrales unificados en toda la app: **Verde ≥ 100%, Amarillo 50–99%, Rojo < 50%** (antes: 80/70/40).
- Tarjeta "Compromisos sem." en Tablero MCI ahora muestra `border-top` con color de semáforo.

#### Tablero MCI · Sección MCIs Generales

- **Porcentaje promedio por bloque MCI:** se eliminó el % por elemento individual; el encabezado del bloque muestra el promedio de avance de todos sus elementos (`.mci-avg`).
- **Tira de avance semanal** (`AVANCE SEM. N`): banner siempre en `--mid` (color fijo, no cambia con el semáforo).
- **Unidad de avance semanal (`uniSem`):** campo nuevo en cada WIG en Admin — permite definir una unidad diferente para el avance semanal vs. el acumulado.
- **Símbolo `%` omitido** en valor y meta del avance semanal cuando la unidad es `%`.
- **Fondos alternados** en elementos MCI: `nth-child(even)` con `rgba(5,23,46,.06)` + línea divisoria `2px solid --mid` entre pares de elementos.

#### Identidad visual

- **Logo versión negativa:** creado `assets/logo-click-neg.svg` (elementos navy → blanco, "C" roja conservada) para uso en el navbar oscuro, siguiendo el manual de marca (versión negativa, pág. 17).
- **CSS limpiado:** eliminado `filter: brightness(0) invert(1)` en `.brand-logo-img`; ahora se usa directamente el SVG correcto.

---

### v1.7 — Animaciones y polish (jul 2026)

#### Animaciones
- **Login box:** entrada con `translateY(22px) → 0` + opacidad, `.55s ease-out-expo`
- **Cambio de módulo:** `pageFadeIn` con 8px + opacidad, `.25s ease-out-expo`
- **Barras de progreso:** `@starting-style { scaleX(0) }` → crecen desde cero al renderizar con stagger (`.04s–.25s`), easing expo `.55s`
- **Modal:** backdrop con `transition-behavior: allow-discrete`; modal interior `scale(0.96 → 1)` `.28s ease-out-expo`
- **Tab activo:** `border-bottom-color .2s ease-out-quart`
- **Tokens de easing:** `--ease-out-expo` y `--ease-out-quart` en `:root`

#### Polish
- Emoji eliminados de todos los semáforos — el color lo dan exclusivamente las clases CSS
- Colores hardcodeados → tokens CSS: `#aaa`, `#bbb`, `#888` reemplazados por `var(--text-3/4)`
- Rojo unificado a `#E02500` (`var(--cta)`)

---

### v1.6 — Rediseño visual + accesibilidad (jul 2026)

- Reescritura completa de `styles.css` con design tokens en `:root`
- Tipografía Lato con `<link rel="preconnect">` (no `@import`)
- WCAG AA garantizado en todos los tokens de texto
- Focus ring global, roles ARIA en tabs y tarjetas
- Barras de progreso GPU-composited (`transform:scaleX` vs `width`)
- Side-stripes eliminados; responsive con breakpoints 900px y 768px

---

### v1.5 — Gestión de MCIs en Administración (jul 2026)

- Panel jerárquico de MCIs generales: campos editables inline (label, inicio, meta, unidad, actual, descripción)
- Título del MCI editable; `ST.mciTitulos` con migración automática
- MCIs contributivos por integrante: texto editable + CRUD de medidas predictivas
- `mciParaIntegrante()` y `_mciOpts()` completamente dinámicos

---

### v1.4 — Evidencia de compromisos + UX (jun 2026)
- Campo de evidencia al palomear un compromiso
- Cache-busting por timestamp de arranque del servidor
- Selector de MCI filtrado para integrantes

### v1.3 — Predictivas por integrante (jun 2026)
- Score general y semáforo por integrante en encabezado de bloque
- Banda MCI CONTRIBUTIVO + semáforo por fila de predictiva

### v1.2 — Backend SQLite (jun 2026)
- `server.py`: Python stdlib, API `/api/state`, persistencia compartida
- `loadState()` y `guardar()` migrados a `fetch` async con fallback a localStorage

### v1.1 — Módulos (jun 2026)
- Separado de archivo único a estructura modular
- Migrado `window.storage` a `localStorage`

### v1.0 — Archivo único (jun 2026)
- Versión inicial en `4dx-clickseguros-app.html`
- 8 líderes, 2 MCIs, 3 roles, persistencia localStorage
