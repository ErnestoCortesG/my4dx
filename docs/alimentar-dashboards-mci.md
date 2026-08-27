# Alimentar los dashboards de MCI contributivos (my4DX)

Cómo cargar/actualizar los datos de los tableros del **perfil de integrante** desde los Excel de insumo.
Existe un skill que automatiza esto: **`alimentar-mci-4dx`** (`~/.claude/skills/alimentar-mci-4dx`).

## Dónde viven los datos
- **NO en git.** Viven en el servidor: `4dx.db` (SQLite), tabla `state_docs`, doc `key='config'`.
- Cada integrante: `config.miembros[].contributivos[]`. Los docs `week:N` guardan valores semanales (conservación).

## Tipos de contributivo dashboard
| Tipo | Campo | Métrica / semáforo |
|---|---|---|
| `renovacion` | `dash.meses[]` (base, pct1er, ger[]) | % 1er recibo; barras por gerencia; línea acumulada; meta 75% |
| `clavesagente` | `claves.meses[]` (total, segs[{estado,n}]) | conteo apilado por estado; semáforo sobre **acumulado** (rojo ≤100 · amarillo 101–199 · verde ≥200); meta mes 50, año 250 |
| Conservación | `wigs` fr/pr (meta 100 %, `metaMensual:'rampa'`) | `% = conservados ÷ (0.7 × activos a la fecha)` por semana |

## Insumos Excel
- Renovación: `.../Insumos MCI/MCI_Contributivo/<Integrante>/Renovacion/Tablero Renovacion Click<Linea> Final.xlsx` → hoja **"Detalle por Mes"** (usar **% CON 1ER RECIBO** ÷ base, no la tarjeta ÷ renovadas). Franquicias: acrónimos en hoja `Gerencias`.
- Claves de agente: `.../Archivos de Victoria Martínez - Ernesto/REVISION 2.xlsx` → hoja **"LAURA"** (filtrar C="Agente Click", agrupar por D=mes y G=estado; unificar Querétaro/Queretaro, Estado de México/EDO MEXICO; vacío→"Sin estado").

## Procedimiento
1. **Respaldar** `4dx.db` (`.bak_<tag>`).
2. Copiar el Excel a scratchpad (OneDrive bloquea los abiertos) y extraer con `openpyxl`.
3. Escribir la estructura en el contributivo del integrante dentro de `config`, y **subir `version`** del doc.
4. Verificar en el navegador (`Ctrl+F5` por el cache del JS).

Ver el skill para el detalle de la extracción, el patrón de escritura en la base y los gotchas.
