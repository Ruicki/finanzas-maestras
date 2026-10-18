---
tags: [finanzas-maestras, scrum, panorama]
seccion: "Panorama (Regla de Presupuesto · Categorías · Análisis)"
sprint: "Sprint 1 — Panorama"
estado: en-definicion
actualizado: 2026-10-18
---

# 🗂️ Tablero Scrum — Panorama

**Roles:** Rick = Product Owner (prioriza, aprueba, decide negocio) · Claude = Dev Senior (full-stack + DevOps + UX, propone y ejecuta con mejores prácticas).

**Flujo:** `Backlog` → `Sprint Actual` → `En Revisión` → `Hecho`. Vos movés prioridad marcando/comentando; yo muevo de columna cuando ejecuto y actualizo este archivo (no hace falta que me lo pidas cada vez, lo hago al cerrar cada item).

**Regla de oro de este tablero:** cada card es un hallazgo **verificado en código** (archivo + línea), no una opinión ni una sospecha. Si algo no se puede verificar, no entra aquí — entra como pregunta en `## ❓ Preguntas abiertas`.

**Severidad:** 🔴 Crítico (dinero/cálculo mal) · 🟠 Alto (datos que confunden) · 🟡 Medio (naming/consistencia) · ⚪ Bajo (cosmético)

**Checkboxes:** son para marcar en Obsidian qué ya revisaste/aprobaste vos como PO — no implican que ya esté corregido (eso lo dice la columna).

---

## 📋 Backlog (sin priorizar — a la espera de tu OK)

- [ ] **PANO-01** 🟠 "Ahorro" y "Disponible" son la misma cifra con dos nombres, en la misma pantalla
- [ ] **PANO-02** "Gasto Fijo/Variable" y "Necesidades/Deseos" son la misma cifra con dos nombres
- [ ] **PANO-03** 🔴 Fondo de Emergencia: el "gasto fijo mensual" puede desplomarse a casi $0 por un detalle de la fórmula
- [ ] **PANO-04** 🟠 Reabrir item 1 del backlog original: el desglose clickeable sigue en el lugar que dijiste que NO era
- [ ] **PANO-05** 🟡 "Top 1/2/3 Gasto" en realidad muestra una categoría, no un gasto
- [ ] **PANO-06** 🟡 Dos formatos de moneda distintos convivendo en la misma sección
- [ ] **PANO-07** ⚪ El Score Financiero no toma en cuenta el Ahorro, aunque se muestra justo al lado

## 🏃 Sprint Actual
_(vacío — decime cuáles de arriba entran y en qué orden)_

## 👀 En Revisión
_(vacío)_

## ✅ Hecho
_(vacío)_

---

## Detalle de cada hallazgo

### PANO-01 — "Ahorro" vs "Disponible" 🟠
- **Pantalla:** Panorama → *Regla de Presupuesto*
- **Archivo:** `components/dashboard/widgets/FinancialRules.tsx:207,220,267-269`
- **Qué pasa:** `savings = Math.max(0, income - needs - wants)` es UNA sola variable. Se muestra como **"Disponible"** en la tarjeta *Resumen Ejecutivo* y, dos tarjetas más abajo, como **"Ahorro"** en la leyenda de la Regla 50/30/20. Mismo número, dos nombres, misma pantalla.
- **Por qué importa:** es literalmente lo que reportaste ("Ahorro sale 0% pero yo tengo ahorro acumulado") — el cálculo en sí es correcto y es la definición estándar de "tasa de ahorro mensual" (flujo, no acumulado), pero el etiquetado hace parecer que son dos cosas distintas.
- **No es:** un bug de cálculo.
- **Propuesta (sin ejecutar, a la espera de tu OK):** un solo nombre en toda la pantalla + una segunda línea "Acumulado hasta hoy: $X" debajo (mismo dato que ya usa Fondo de Emergencia: `totalCash + totalSavings`) para separar visualmente flujo del mes vs. lo que ya tenés guardado.

### PANO-02 — "Gasto Fijo/Variable" vs "Necesidades/Deseos" 🟠
- **Pantalla:** misma que PANO-01
- **Archivo:** `components/dashboard/widgets/FinancialRules.tsx:257-264` (Resumen Ejecutivo) vs `:217-220` (Regla 50/30/20)
- **Qué pasa:** `needs`/`wants` se calculan una vez y se muestran con cuatro nombres distintos según la tarjeta: "Gasto Fijo"/"Gasto Variable" arriba, "Necesidades"/"Deseos" abajo.
- **Propuesta:** elegir un único vocabulario (sugiero Necesidades/Deseos, es el que ya usa el resto de la regla) y aplicarlo en las dos tarjetas.

### PANO-03 — Fondo de Emergencia: fórmula del "gasto fijo mensual" 🔴
- **Pantalla:** Panorama → *Regla de Presupuesto*, tarjeta "Fondo Emergencia" (visible siempre, con o sin ingreso)
- **Archivo:** `components/dashboard/widgets/FinancialRules.tsx:177`
- **Código exacto:** `const monthlyBurn = needs > 0 ? needs : (needs + wants);`
- **Qué pasa:** si `needs` (Necesidades) es mayor que $0 — aunque sea $0.50 por un gasto mal categorizado — el "gasto fijo mensual" se vuelve exactamente ese valor e **ignora `wants` por completo**, sin importar cuánto sea. Solo cuando `needs` es exactamente $0 se usa `needs + wants`. Es un salto brusco (discontinuidad), no una regla financiera deliberada.
- **Impacto real:** "meses cubiertos" (`liquidFunds / monthlyBurn`) puede salir artificialmente altísimo — el fondo de emergencia parecería mucho más sólido de lo que es en la práctica.
- **Necesito tu decisión, no es solo un fix mecánico:** ¿el "gasto fijo mensual" del Fondo de Emergencia debería ser solo Necesidades (metodología clásica: en una emergencia se cortan los Deseos) o Necesidades + Deseos (más conservador)? Hoy el código hace ambas cosas según un detalle de si `needs` es cero o no, lo cual no es ninguna de las dos a propósito.

### PANO-04 — Reabre item 1 del backlog original (`.specs/backlog.md`) 🟠
- **Pantalla:** Panorama → *Análisis*
- **Archivo:** `components/dashboard/tabs/InsightsTab.tsx:293-351` (lista clickeable) vs `:399-412` (tarjetas "Top 1/2/3")
- **Qué pasa:** el backlog original marca el item 1 ("Gastos Más Altos del Mes — hacerlos clickeables") como HECHO (Fase 21), pero el desglose interactivo quedó en la lista de gastos **individuales**. Las tarjetas "Top 1/2/3 Gasto" — que es donde dijiste que debía ir — siguen siendo estáticas, sin click, sin desglose.
- **Esto ya lo reconocí mal entendido en la sesión anterior; queda formalizado aquí para no perderlo.**

### PANO-05 — "Top 1/2/3 Gasto" muestra una categoría, no un gasto 🟡
- **Archivo:** `components/dashboard/tabs/InsightsTab.tsx:406`
- **Qué pasa:** el título dice "Top 1 Gasto" pero el dato (`cat.name`, `cat.spent`) es la suma de TODOS los gastos de una categoría, no un gasto individual. La sección de arriba ("Gastos Más Altos del Mes") ya usa la palabra "gasto" para movimientos individuales — mismo término, dos significados, misma pantalla.
- **Se resuelve junto con PANO-04:** si el desglose se mueve a estas tarjetas, tiene más sentido además renombrarlas a "Top Categoría".

### PANO-06 — Dos formatos de moneda en la misma sección 🟡
- **Archivo:** `lib/utils.ts:8-15` (`formatMoney`, usado en `FinancialRules.tsx` y `BudgetCard.tsx`) vs `InsightsTab.tsx` (usa `{currency}{valor.toLocaleString()}` en ~15 sitios)
- **Qué pasa:** `formatMoney()` siempre fuerza 2 decimales ("$108.83", "$108.00"). `toLocaleString()` sin argumentos no fuerza nada — un número entero sale "$108" y uno con un decimal sale "$108.8". Dentro de la misma sección Panorama, un monto puede verse con distinta cantidad de decimales según en qué sub-pestaña estés, aunque sea el mismo dato.
- **Propuesta:** migrar `InsightsTab.tsx` a `formatMoney()` para que todo Panorama use un solo formato.

### PANO-07 — Score Financiero no incluye el Ahorro ⚪
- **Archivo:** `components/dashboard/widgets/FinancialRules.tsx:234-240`
- **Qué pasa:** el Score (0-100) pondera Necesidades (33) + Deseos (33) + Endeudamiento (34) — el Ahorro, que es el tercer segmento del mismo gráfico de al lado, no influye en el score para nada.
- **Pregunta para vos:** ¿es intencional (el score mide disciplina de gasto + deuda, no ahorro) o debería ser un cuarto factor? Lo dejo en Backlog hasta que decidas, no lo toco solo.

---

## ❓ Preguntas abiertas (no son hallazgos de código, son decisiones de negocio)
- PANO-03: ¿Fondo de Emergencia debe cubrir solo Necesidades, o Necesidades + Deseos?
- PANO-07: ¿el Score Financiero debería incluir el Ahorro como cuarto factor?

## 🔜 Siguiente sección (cuando termine Panorama)
A definir juntos — candidatos por orden de aparición en el dashboard: Cuentas, Ingresos, Gastos, Metas, Deudas. Decime el orden cuando cerremos Panorama.
