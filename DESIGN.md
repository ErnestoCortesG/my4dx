# DESIGN.md · my4DX · ClickSeguros 2026

Sistema de diseño del tablero de ejecución 4DX. Fuente de verdad para estilos, tokens y convenciones.

---

## Paleta de colores

Todos los colores están definidos como custom properties en `:root` dentro de `css/styles.css`. **Nunca usar valores hexadecimales hardcodeados** — siempre referenciar un token.

### Tokens de marca

| Token | Valor | Uso |
|-------|-------|-----|
| `--navy` | `#05172E` | Fondo del topnav, sidebar, login; textos de encabezado de card |
| `--mid` | `#1B3A6B` | Encabezados de bloques MCI, banners de avance semanal, focus ring |
| `--cta` | `#E02500` | Botón primario, semáforo rojo, tab activo, fill de barra roja |
| `--cta-hov` | `#c42000` | Hover de `--cta` |

### Superficies

| Token | Valor | Uso |
|-------|-------|-----|
| `--bg` | `#E5E7E9` | Fondo de página, track de barras de progreso |
| `--surface` | `#fff` | Tarjetas, modales, inputs |
| `--surf2` | `#f7f7f5` | Encabezados de sección dentro de cards |
| `--surf3` | `#f0f0ee` | Separadores de filas, hover de tabla |
| `--border` | `#CCD1D3` | Bordes de inputs, separadores |
| `--border2` | `rgba(0,0,0,.08)` | Bordes de cards (sutil) |

### Texto

Todos pasan WCAG AA (≥ 4.5:1) sobre superficies blancas.

| Token | Valor | Ratio sobre blanco | Uso |
|-------|-------|--------------------|-----|
| `--ink` | `#1a1a18` | ~18:1 | Cuerpo principal |
| `--text-2` | `#444` | 9.0:1 | Énfasis medio |
| `--text-3` | `#666` | 5.74:1 | Sublabels, metadatos, metas |
| `--text-4` | `#6f6f6f` | 4.57:1 | Apoyo tenue (unidades, secundarios) |

### Semáforos

| Token | Valor | Rol |
|-------|-------|-----|
| `--green` | `#4CAF50` | Fill de barra verde |
| `--green-dk` | `#2d7a2d` | Texto verde sobre fondo blanco (WCAG AA) |
| `--green-bg` | `#e8f5e9` | Fondo de badge verde |
| `--yellow` | `#FFC107` | Fill de barra amarilla |
| `--yellow-dk` | `#b87900` | Texto amarillo sobre blanco (WCAG AA) |
| `--yellow-bg` | `#fff8e1` | Fondo de badge amarillo |
| `--red-dk` | `#c62828` | Texto rojo sobre blanco (WCAG AA) |
| `--red-bg` | `#ffebee` | Fondo de badge rojo |

> El rojo de fill de barra es `var(--cta)` (#E02500), no `--red-dk`. `--red-dk` es solo para texto.

### Umbrales de semáforo

Aplican a **todos** los semáforos de la app — bloques MCI, predictivas, compromisos:

| Color | Condición |
|-------|-----------|
| Verde | Avance ≥ 100% |
| Amarillo | Avance 50–99% |
| Rojo | Avance < 50% |

### Clases de semáforo (CSS)

```css
/* Badge de estado */
.badge { padding:3px 8px; border-radius:12px; font-size:10px; font-weight:700 }
.bg { background:var(--green-bg); color:var(--green-dk) }
.by { background:var(--yellow-bg); color:var(--yellow-dk) }
.br { background:var(--red-bg); color:var(--red-dk) }

/* Dot de semáforo (sidebar) */
.dg { background:#4CAF50 }
.dy { background:#FFC107 }
.dr { background:var(--cta) }
```

**Regla:** los emoji (🔴🟡🟢) **nunca se usan** en los semáforos. El color lo comunican las clases CSS.

---

## Tipografía

**Fuente:** Lato (Google Fonts). Pesos: 300, 400, 700, 900. Cargada en `index.html` con `<link rel="preconnect">` + `<link rel="stylesheet">` (no `@import` en CSS).

```css
* { font-family: 'Lato', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif }
body { font-size: 13px; color: var(--ink) }
```

### Escala tipográfica

| Rol | Tamaño | Peso | Clase o contexto |
|-----|--------|------|-----------------|
| Nombre en perfil | 20px | 900 | `.perf-hero-name` |
| Score grande | 42px | 800 | `.snum` |
| Promedio MCI (encabezado bloque) | 24px | 900 | `.mci-avg` |
| Score de chip | 22–24px | 900 | `.sval`, `.perf-score-num` |
| Valor WIG acumulado | 17px | 800 | `.wactual` |
| Valor avance semanal WIG | 14px | 800 | `.wig-sem-val` |
| Valor predictiva | 13–15px | 800 | `.perf-wig-val`, `.contrib-score-num` |
| Encabezado de módulo | 14px | 700 | `.wbar h2` |
| Encabezado de card | 13px | 700 | `.mci-tit`, `.watit` |
| Cuerpo | 12–13px | 400–500 | general |
| Sublabel / kicker | 9–11px | 600–700 | `.slabel`, `.clider`, `.sb-hdr` |

---

## Espaciado y layout

```
#app-shell (flex-column, 100vh)
├── .topnav (46px, flex-shrink:0)
└── .app-body (flex-row, flex:1, overflow:hidden)
    ├── .sidebar (186px, overflow-y:auto)
    └── .content (flex:1, overflow-y:auto, padding:14px, gap:14px)
        └── .page.active (flex-column, gap:14px)
```

### Grids responsivos

| Grid | Columnas desktop | Columnas ≤900px |
|------|-----------------|-----------------|
| `.tgrid` | `1fr 1fr` | `1fr` |
| `.agrid` | `1fr 1fr` | `1fr` |
| `.sgrid` | `repeat(auto-fit, minmax(180px, 1fr))` | — |
| `.contrib-grid` | `repeat(auto-fill, minmax(240px, 1fr))` | — |

### Breakpoints

```css
@media (max-width: 900px) { .tgrid, .agrid → 1 columna }
@media (max-width: 768px) { sidebar 160px; tablas scroll horizontal; touch targets 44px }
```

---

## Identidad visual · Logo

El logo se sirve como SVG desde la carpeta `assets/`. Existen dos versiones:

| Archivo | Uso | Colores |
|---------|-----|---------|
| `logo-click.svg` | Fondos claros (modal de login) | Navy `#041224` + rojo `#E62800` |
| `logo-click-neg.svg` | Fondos oscuros (topnav `--navy`) | Blanco `#ffffff` + rojo `#E62800` |

El selector `.brand-logo-img` **no aplica ningún filtro CSS** — el SVG correcto ya tiene los colores apropiados para cada contexto. El login usa `logo-click.svg` sin filtro.

Esta convención sigue la **versión negativa** del Manual de Imagen Click Seguros (pág. 17), que especifica blanco para los elementos navy cuando el logo va sobre fondo oscuro, conservando el rojo corporativo `#E62800` (PANTONE 296 C / color principal del logotipo).

---

## Componentes

### Topnav (`.topnav`)

```
.topnav  background: --navy  height: 46px
├── .brand
│   ├── .brand-logo-img  → assets/logo-click-neg.svg  height:22px
│   └── .brand-app       color:#fff; font-size:13px; font-weight:700
├── .nav-tab × 4 (Tablero, Compromisos, Scores, Admin)
└── .nav-right (semana, guardar, user-pill)
```

Tab activo: `border-bottom: 3px solid var(--cta)`. Transición: `border-bottom-color .2s ease-out-quart`.

### Sidebar (`.sidebar`)

- Fondo `--navy`, ancho `186px`
- Cards de miembro: `.mcard` con `tabindex="0" role="button"`
- Estado activo: `background: rgba(255,255,255,.18)` + `.mname { font-weight:700 }`
- **Sin** `border-left` de color

### Cards de estadística (`.scard`)

```css
.scard { background:--surface; border:1px solid --border2; border-radius:8px; padding:12px 14px }
```

Hover: `translateY(-1px)` + shadow. Las tarjetas con semáforo llevan `border-top: 4px solid <color>`.

### Bloques MCI (`.mci-block`)

```
.mci-block
├── .mci-hdr  background: --mid
│   ├── .mci-num    número del MCI
│   ├── .mci-tit    título editable
│   ├── .mci-avg    promedio % de todos los elementos (24px, font-weight:900)
│   └── .badge      semáforo del bloque
└── [.wig-pair × N]
    ├── .wrow                  nombre + valor→meta + gráfico + pie
    │   ├── .wnombre           nombre del elemento
    │   ├── .wig-val-row       valor actual (17px, 800) → meta
    │   ├── .wig-track         gráfico racetrack (SVG, 56px alto)
    │   └── .wfoot             inicio · sem 1 | sub | sem 53
    └── .wig-semline           avance semanal discreto (una línea)
        ├── .wig-semline-lbl   "AVANCE SEM. N" (9px, uppercase, --text-3)
        ├── .wig-sem-val       valor semanal (13px, 800)
        ├── .wig-sem-bwrap     barra fina (3px height)
        └── .wmeta             meta semanal
```

**Gráfico racetrack** (`wigTrackSVG()` en `render-tablero.js`): SVG `viewBox 0 0 560 56` con `preserveAspectRatio="none"`. Carriles alternados `rgba(5,23,46,.05)`; línea de meta ideal punteada (`#999`, dasharray 4 3) construida por acumulación de `metaSem` (solo si comparte unidad con el acumulado — con `uniSem` distinta se usa `(meta − inicio) / TOTAL_SEM`); línea de avance real (2.2px, color del semáforo — `--green`/`--yellow`/`--cta`) con `vector-effect: non-scaling-stroke` y punto final (r 4.5, borde blanco). Sin historial intermedio la línea real es una recta `inicio → actual`.

**Separación entre elementos:** `.wig-pair + .wig-pair { border-top: 2px solid var(--mid) }` — sin fondos alternados; la tira semanal se separa de su gráfico con `border-top: 1px dashed var(--border)`.

**Sin badge en la tira semanal:** el semáforo del elemento lo comunica el color de la curva del gráfico; repetirlo abajo era redundante.

### Tarjetas contributivas (`.contrib-card`)

Fondo dinámico basado en el score. Badge y borde del color del score. SVG circular 68×68 px para el score. Hover: `translateY(-2px)` + shadow.

### Modales (`.mov` + `.modal`)

```
.mov  position:fixed; inset:0; z-index:400; display:none
.mov.open  display:flex
@starting-style { .mov.open { opacity:0 } }       ← backdrop fade-in

.modal  transform:scale(0.96); opacity:0
.mov.open .modal  transform:scale(1); opacity:1
@starting-style { .mov.open .modal { scale(0.96); opacity:0 } }
```

### Diálogo de confirmación (`confirmar()`)

Reemplaza al `confirm()` nativo del navegador. Función promise-based en `render-core.js` que **construye el modal dinámicamente** y reutiliza la animación de `.mov`/`.modal`. Se usa con `await` en toda acción destructiva (eliminar usuario, elemento MCI, medida, compromiso; limpiar datos).

```js
const ok = await confirmar({ titulo, mensaje, ok:'Eliminar', peligro:true });
if (!ok) return;
```

- `peligro:true` → botón de acción rojo `.bdanger` (`--cta`); si no, `.bconfirm`.
- Cierra con click en el botón, click en el backdrop, o `Escape`. Enfoca el botón de acción al abrir.
- `.confirm-msg` usa `white-space:pre-line` (respeta saltos de línea del mensaje).

**Regla:** toda acción irreversible pasa por `confirmar()` con `peligro:true`. Nunca usar `confirm()`/`alert()` nativos.

Cierre animado: `transition: display .22s allow-discrete` en `.mov`.

### Toast (`.toast`)

```css
.toast { opacity:0; transform:translateY(8px); transition: opacity .25s, transform .25s }
.toast.show { opacity:1; transform:translateY(0) }
```

Fondo `--navy`, radio `7px`, posición `bottom:18px right:18px`, borde-izquierdo de acento según tipo.

**Variantes** — `toast(msg, tipo)`:

| tipo | Uso | Acento / fondo |
|------|-----|----------------|
| `ok` (default) | Éxito, guardado | borde `--green` |
| `error` | Fallo de operación/conexión | fondo rojo oscuro + borde `--cta`; dura más (3.2 s) |
| `warn` | Validación, permisos, sesión, conflicto | fondo ámbar oscuro + borde `--yellow` |
| `info` | Neutro informativo | borde azul |

**Regla:** los mensajes de error usan `'error'`, los de validación/permiso/sesión usan `'warn'`, las confirmaciones de éxito `'ok'`. El texto no debe repetir el color (sin "Error:" al inicio).

---

## Barras de progreso

Todas usan `transform:scaleX()` — corren en el compositor GPU sin layout reflow.

```css
.pfill, .mfill, .perf-wig-fill {
  width: 100%;
  transform-origin: left center;
  transition: transform .55s var(--ease-out-expo);
}
/* Contenedor siempre necesita overflow:hidden */
.pbg, .mbar, .perf-wig-bar { overflow: hidden }
```

En JS:
```js
style="transform:scaleX(${(pct/100).toFixed(3)});background:${fc}"
```

**Entrada animada:** `@starting-style { transform: scaleX(0) !important }` — la barra crece desde cero al insertarse en el DOM.

**Stagger:** delay escalonado por fila vía `nth-child`: `.04s → .22s`.

---

## Motion

### Tokens

```css
--ease-out-expo:  cubic-bezier(0.16, 1, 0.3, 1);   /* UI principal */
--ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);   /* Indicadores, tabs */
```

### Catálogo de transiciones

| Elemento | Propiedad | Duración | Easing |
|----------|-----------|----------|--------|
| Login box | `translateY` + opacity | 0.55s | expo |
| Cambio de módulo | `translateY(8px)` + opacity | 0.25s | expo |
| Barras de progreso | `scaleX` | 0.55s | expo |
| Modal backdrop | opacity | 0.22s | ease-out |
| Modal contenido | scale + opacity | 0.28s | expo |
| Tab activo | `border-bottom-color` | 0.2s | quart |
| Hover de card | `translateY(-1px)` + shadow | 0.2s | ease-out |
| Hover de contrib-card | `translateY(-2px)` + shadow | 0.15s | ease-out |
| Botón `:active` | `scale(0.97)` | 0.1s | ease-out |
| Toast show/hide | opacity + `translateY` | 0.25s | ease-out |
| Input focus | `border-color` + `box-shadow` | 0.15s | ease-out |

### Reglas

- **Nunca** `transition: all` — siempre propiedades específicas
- **Nunca** bounce ni elastic
- **Sin animación** en acciones de teclado frecuentes (navegación de semanas ◀▶)
- `@media (prefers-reduced-motion: reduce)` en la primera línea del CSS, desactiva todo

---

## Accesibilidad

- **WCAG AA:** ≥ 4.5:1 texto normal, ≥ 3:1 texto grande (≥18px o bold ≥14px)
- **Focus ring:** `:focus-visible { outline: 2px solid var(--mid); outline-offset: 2px }`
- **Elementos no-`<button>`:** `tabindex="0" role="button"` + `onkeydown` Enter/Space
- **Tabs:** `role="tab" aria-selected="true/false"`
- **Dots de semáforo:** `aria-label` + `title` con nombre del color

### Z-index scale

| Capa | Valor | Elemento |
|------|-------|---------|
| Modal backdrop | 400 | `.mov` |
| Toast | 999 | `.toast` |

---

## Bans absolutos

- **Side-stripe borders:** no `border-left > 1px` como acento. Usar fondo tintado o nada.
- **Gradient text:** no `background-clip:text` con gradiente.
- **Emoji de semáforo** en la UI: solo clases CSS.
- **Colores hex hardcodeados en los `render-*.js`** para texto: siempre `var(--token)`. Los hex dinámicos en SVG/inline son la excepción aceptada.
- **`transition: all`**: siempre propiedades explícitas.
- **`width:X%` en barras de progreso**: siempre `transform:scaleX(X/100)`.
- **`confirm()` / `alert()` nativos del navegador**: usar siempre `confirmar()` (diálogo con estilo) y `toast()`.
- **`filter:` en el logo del navbar**: usar directamente `logo-click-neg.svg`; no forzar blanco con CSS.
