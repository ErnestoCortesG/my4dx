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
    ├── data.js         # Datos base: SEMANAS, MB (miembros), WB (WIGs), UB (usuarios)
    ├── state.js        # Estado global ST, getSem(), getWigVal(), guardar(), loadState()
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
```

El frontend siempre trabaja contra el objeto `ST` en memoria. `guardar()` persiste ese objeto completo como JSON en SQLite y localStorage. Si el servidor no está disponible, la app sigue funcionando en modo offline.

### API del servidor

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/state` | Devuelve el estado completo como JSON |
| `POST` | `/api/state` | Guarda el estado completo (upsert) |
| `GET` | `/*` | Sirve archivos estáticos (index.html, css/, js/, assets/) |

### Esquema SQLite

```sql
CREATE TABLE app_state (
    id         INTEGER PRIMARY KEY CHECK (id = 1),  -- fila única
    data       TEXT    NOT NULL,                     -- ST completo en JSON
    updated_at TEXT    DEFAULT (datetime('now'))
);
```

Una sola fila con el estado completo. Backup = copiar `4dx.db`.

### Pantallas y control de visibilidad

El sistema tiene dos pantallas: `#login-screen` y `#app-shell`. La visibilidad se controla **exclusivamente desde JS** con `element.style.cssText` — no con `.classList`. Esto supera la especificidad de los selectores de ID en el CSS.

---

## Modelo de estado

```js
ST = {
  usuarios:   [...],            // copia mutable de UB
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
| `metaSem` | number? | Meta de avance semanal (si null se calcula como `(meta - inicio) / 27`) |
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
  - Valor acumulado actual → meta (con barra de progreso)
  - Tira de avance semanal: valor de esa semana, barra de progreso semanal, meta semanal y badge de semáforo
  - Fondo alternado entre elementos consecutivos para facilitar lectura
  - Banner "AVANCE SEM. N" siempre en `--mid` (no cambia de color con el semáforo)

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

Las semanas van de **S1 (29 jun 2026) a S27 (31 dic 2026)**. El array `SEMANAS` en `data.js` indexa en base 1; el índice 0 es un string vacío.

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
