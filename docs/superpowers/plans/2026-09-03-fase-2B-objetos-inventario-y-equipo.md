# Fase 2B — objetos, inventario y equipar (plan de ejecución)

> Escrito el 2026-09-03, al arrancar la sesión de 2B. Manda sobre el orden de esta ronda.
> El alcance viene de `docs/superpowers/specs/2026-09-01-fase-2-alcance-design.md` (§2B) y de
> los huecos H1, H6, H7 y H9 de `docs/superpowers/specs/2026-09-01-huecos-fase-2-design.md`.
> Las pantallas nuevas se miran contra el prototipo **antes** de dibujarlas (regla vinculante de
> `docs/04-convenciones.md`): pantallas 20 (inventario), 21 (ficha de objeto) y 22 (catálogo).

## Lo que 2B entrega

1. **Datos estructurados de objeto**: tipo (arma / armadura / escudo / consumible / equipo /
   otro), peso, valor, prosa, y para las armas dado de daño, tipo de daño, propiedades y
   característica de ataque.
2. **Dos orígenes**: catálogo SRD 5.1 sembrado en código (como razas y clases) y **objetos
   propios de la campaña** que escribe el DM, en tabla.
3. **Inventario por personaje** con tres sitios —equipado, encima, guardado en otro sitio— más
   ranura, manos y sintonización.
4. **El equipo alimenta el motor**: la armadura sustituye la fórmula de CA, el escudo suma
   plano, y cada objeto equipado aparece **como un paso más de la traza**.
5. **Dinero** (cinco denominaciones) y **peso** transportado.
6. **Cierre de lo que 2C dependía de 2B**: el cuadro de ataques con su bono y su daño, y el
   botón que pide al servidor la tirada de ataque y la de daño.

## Decisiones tomadas en esta sesión (el autor está ausente y pidió resolver, no preguntar)

| | Decisión | Por qué |
|---|---|---|
| **D-2B-1** | El sitio del objeto es un enum de **tres**: `EQUIPPED`, `CARRIED`, `STORED` (+ texto libre de dónde está guardado). La **sintonización es un booleano aparte**, no un cuarto sitio | El informe de huecos proponía `CARRIED \| EQUIPPED \| ATTUNED`, pero el prototipo (pantalla 20) exige un tercer sitio —«guardado · en otro sitio»— y sintonizar no excluye equipar: un anillo sintonizado **está** equipado. Foundry los separa por lo mismo |
| **D-2B-2** | Ranura (`EquipSlot`) desde la primera migración, con **índice único parcial** `(characterId, slot)` y validación de manos en el servicio | H1. Dos escudos daban +4; el arma a dos manos no admite escudo, y eso no es aritmética |
| **D-2B-3** | Tope de **3 sintonizaciones**, comprobado en el servidor | SRD 5.1 |
| **D-2B-4** | El peso se guarda en **onzas** (`weightOz`, entero) y se enseña en kg; el valor en **cobres** (`costCp`) y se enseña en la moneda que toque | Mismo principio que los pies: unidad íntegra en la base, unidad legible en pantalla. Las fracciones del SRD (¼ de libra, ⅓ de onza de una moneda) son enteras en onzas y no lo son en libras |
| **D-2B-5** | Dinero: **cinco columnas** `Int` en `Character` (`cp`, `sp`, `ep`, `gp`, `pp`) | H6. Un total normalizado obliga a decidir qué hacer con 12,37 po ya escritos |
| **D-2B-6** | La **carga se calcula y se enseña**, y **no penaliza** todavía | H7: la variante de sobrecarga es opcional en el SRD. El dato entra ahora porque transcribirlo dos veces es tonto; la penalización necesita una decisión por campaña |
| **D-2B-7** | `CampaignItem` lleva `visibility` y nace **`PLAYERS`**. Dar a un personaje un objeto que su dueño **no puede ver** se rechaza con un 400 que explica cómo arreglarlo | H9. La alternativa —mandarlo igual— es un agujero de `canView`; la otra —una fila fantasma— es una pantalla que miente. Preparar la mazmorra sigue siendo posible: se crea `DM_ONLY` y se sube la visibilidad al entregarlo |
| **D-2B-8** | **No** se modela «lo tengo pero no sé qué hace» (identificado ≠ visible) | Es visibilidad **por campo**, que el modelo no hace en ningún sitio, y además la traza delataría el número igual («+1 anillo»). Queda como deuda con su motivo |
| **D-2B-9** | La lista de efectos es **cerrada** y vive en `packages/shared`: CA, puntuación de característica (sumar o fijar), salvaciones, PG máximos, velocidad y competencia (habilidad o salvación). Todo lo demás es prosa | Regla dura del alcance. El prototipo pinta «Ventaja en Engaño ante la Casa Vhael» como efecto numérico: **eso no entra**, y la discrepancia se declara aquí |
| **D-2B-10** | Las **velocidades pasan a derivarse en el motor**, con traza, en vez de salir planas del resolutor | Sin esto, un efecto de velocidad de un objeto sería un número sin origen — justo lo que la traza existe para evitar. `sheet.speeds` conserva su forma, así que nada de lo que hoy la consume cambia |
| **D-2B-11** | El ataque lo compone **el servidor** (expresión incluida), como la ventaja de 2A.13 | Un cliente que monta la expresión puede decir que tira 1d8 y mandar 1d12 |

## Fronteras de ficheros (trabajo en paralelo, techo de cinco)

**El orquestador y nadie más**: `packages/shared/src/**`, `apps/api/prisma/**`, `app.module.ts`,
`docs/**`, `NOTICE.md`, los commits, y **todas** las corridas de e2e (API y navegador).

| Carril | Puede tocar | No toca |
|---|---|---|
| **A1 · catálogo SRD** | `apps/api/src/rules/catalog/weapons.ts`, `gear.ts`, `armor.ts`, `catalog.spec.ts` | motor, resolutor, módulos |
| **A2 · efectos y motor** | `apps/api/src/rules/engine.ts`, `catalog/resolve.ts`, `catalog/items.ts` y sus `.spec.ts` | datos del catálogo, módulos Nest |
| **A3 · objetos de campaña** | `apps/api/src/campaign-items/**`, `apps/api/test/campaign-items.e2e-spec.ts` | todo lo demás |
| **A4 · inventario y bolsa** | `apps/api/src/inventory/**`, `apps/api/test/inventory.e2e-spec.ts` | todo lo demás |
| **A5 · ataques** | `apps/api/src/rules/attacks.ts` y su `.spec.ts` | todo lo demás |
| **B1 · pantalla de inventario** | `apps/web/src/features/inventory/**` | resto de la web |
| **B2 · catálogo y ficha de objeto** | `apps/web/src/features/campaign-items/**` | resto de la web |
| **B3 · hoja: inventario y ataques** | `apps/web/src/features/character-sheet/**` | resto de la web |

## Orden

0. **(orquestador)** contratos en `packages/shared` + migración de Prisma.
1. **A1–A5 en paralelo.**
2. **(orquestador)** cableado: `app.module.ts`, la hoja (`character-sheet.service.ts`) y el
   endpoint de tirada de ataque.
3. **B1–B3 en paralelo.**
4. **(orquestador)** e2e de API, Playwright, capturas contra el prototipo, documentación y
   commits.

## Cómo se da por terminada cada tarea

`pnpm verify` en verde y mirado · unitarias nuevas del comportamiento nuevo · **prueba de
mutación** por comportamiento nuevo (se rompe el código a propósito y la prueba tiene que
ponerse roja; se restaura **con una copia del fichero**, nunca con `git checkout`) · e2e de API
para todo endpoint · Playwright para toda pantalla · documentación en el mismo commit.
