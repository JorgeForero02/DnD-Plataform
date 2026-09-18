# Pendientes cerrados el 2026-09-17 — tanda «cierre antes de 3A.2»

Movidas enteras desde `06-pendientes.md` al cerrarlas en la rama `cierre/antes-de-3a2`. Plan y
triaje en `superpowers/plans/2026-09-17-cierre-antes-de-3a2.md` (§0 dice qué se midió en cada una
y por qué las marcadas **F**/**D** se cierran sin código). Ver `07-historial.md`, «Cierre antes de 3A.2».

### Dados — empate y tope de dice (cerradas en T2)

Cerradas con código en la Tarea 2: `MAX_DADOS_POR_TIRADA` (`packages/shared/src/dice-limits.ts`)
sustituye el `.max(100)` suelto en `roll.schema.ts` y `game-event.schema.ts` por el producto real
del evaluador (10 términos × 100 dados × 2 por relanzar = 2000).

El empate en `kh`/`kl` queda resuelto, no solo declarado, y en dos rondas: la primera
(`02dc6ad`) hizo que `dadosTirados` emparejara `dropped` contra `rolled` **desde el final** en
vez de desde el principio, lo que arreglaba el empate pero rompía `1d20r1` — con relanzar, el
físico descartado es el *primero* en caer, justo el orden contrario al que pide el empate, y un
emparejado por *valor* no puede acertar los dos a la vez porque `dropped` no lleva posición. La
segunda ronda quita la reconstrucción por completo: `evaluarTermino` (`apps/api/src/dice/dice.ts`)
ya sabe, dado por dado, cuál físico cuenta —tanto el que pierde por relanzar como el que pierde
por `kh`/`kl`— y lo deja en el nuevo campo `DiceTermResult.dice`, por posición; `dadosTirados` pasa
a ser una simple concatenación (`terms.flatMap((t) => t.dice)`). Pruebas:
`apps/api/src/dice/dice.spec.ts`, describe `contrato de "dice" (2026-09-17)` (empate, relanzar
solo, y relanzar+kh combinados en la misma tirada).

| Área | Qué | Dónde |
|---|---|---|
| Dados | Con dos dados de igual valor, el evaluador puede resolver «cuál se descarta» por posición en vez de por una regla explícita — ambigüedad, no bug observado | `apps/api/src/rules-engine/` (leer antes de tocar el evaluador) |
| Dados | `100d6r1` supera `rolls.max(100)` — preexistente a esta rama, no la introdujo, pero sigue sin fila propia | `apps/api/src/rules-engine/` (leer antes de tocar el evaluador) |

### Mover código (cerradas en T3)

Cerradas sin cambiar comportamiento en la Tarea 3, moviendo código: #6 (el resumen de audiencia
pasa a `vocabulario.ts`), #8 (`DadoDibujado` se funde en `IconoD20`), #9 (`normalizarTexto` sale a
`apps/web/src/lib/texto.ts`, una sola copia para inventario y árbol del mundo), #10
(`conDadoAnadido` se retira, sin consumidores) y #11 (`CorregirBando.tsx` se renombra a
`accionesDeBando.ts`); y se declara `CharacterRow.entityId`, que el servidor ya mandaba.

| Área | Qué | Dónde |
|---|---|---|
| Dados | **Revisión final, #6**: `resumenAudienciaYCd` es una tercera traducción de `RollAudience` fuera de `apps/web/src/features/rolls/vocabulario.ts` — mover como campo `resumen` del vocabulario en vez de reescribirla en el componente | `apps/web/src/features/rolls/panel/PanelDeDadosDeLaMesa.tsx:85-98` |
| Dados | **Revisión final, #8**: `DadoDibujado.tsx` e `IconoD20` son dos envoltorios idénticos de `IconoDado caras={20}` — unificar en uno | `apps/web/src/features/rolls/DadoDibujado.tsx`; `apps/web/src/ui/Iconos.tsx` (líneas de `IconoD20`) |
| Dados | **Revisión final, #10**: `conDadoAnadido` (`apps/web/src/features/rolls/expresion.ts`) no tiene ningún consumidor en `src/` — retirarla cuando se confirme que el modo avanzado no la echa de menos | `apps/web/src/features/rolls/expresion.ts` |
| Elenco / menú | **Revisión final, #11**: `apps/web/src/features/sessions/elenco/CorregirBando.tsx` ya no tiene componente de fila (se borró en la Tarea 8) y solo exporta `useAccionesDeBando` — renombrar el fichero a `accionesDeBando.ts` la próxima vez que se toque | `apps/web/src/features/sessions/elenco/CorregirBando.tsx` |
| Mundo (árbol) | **Revisión final, #9**: `normalizar()` (pliega tildes para comparar) está copiada una sexta vez entre `DesgloseDelMundo.tsx` y `EditorDeHilos.tsx` — extraer a una lib compartida | `apps/web/src/features/sessions/taller/mundo/DesgloseDelMundo.tsx:42`; `apps/web/src/features/sessions/taller/mundo/EditorDeHilos.tsx:50` |

### RM-2 · Menores aplazados de la revisión final (con su línea en `final-review.md`) — cerrada el 2026-09-17

M-4, M-5, `attemptId` y concurrencia: cerradas en T1 de la tanda «cierre antes de 3A.2» (rama
`cierre/antes-de-3a2`). M-6, M-7, M-8, M-12: cerradas en T3. M-9, M-14: cerradas en T4 (esta
tarea) — `Number("")` en `ReglasDeLaMesa` ya no se manda (rango explicado en español antes del
`PATCH`) y el borrador se re-siembra desde fuera solo cuando el DM no está editando.

| | Qué | Coste |
|---|---|---|
| M-4 | `AbilityRollsService.list` moldea el `payload` releído a mano; pasar la respuesta por `abilityRollAttemptSchema.parse` | 20 min |
| M-5 | `of = 0` cuando la regla no es `DADOS` viola `abilityRollAttemptSchema.of.min(1)`; hacer `of` opcional o `Math.max(1, …)` | 10 min |
| M-6 | La invalidación de `abilityRollsKey` en `useUpdateSheet` es redundante (prefijo ya invalidado) — quitar o corregir el comentario | 5 min |
| M-7 | `as CreateCharacterInput` en `CharacterEditor`: exportar `z.input<typeof createCharacterSchema>` en shared y usarlo | 10 min |
| M-8 | `r as DesgloseDeTirada` en `AsignarCaracteristicas`: probar sin moldear; si no compila, `dc?` en el DTO | 10 min |
| M-9 | `Number("")` = 0 en los campos numéricos de `ReglasDeLaMesa` se manda y vuelve un 400 técnico de Zod; comprobar rango en `onGuardar` y escribir la frase en español | 20 min |
| M-12 | `CARACTERISTICAS` en `IdentidadEditable.tsx` duplica `ORDEN_DE_CARACTERISTICAS` de shared | 5 min |
| M-14 | `borrador` de `ReglasDeLaMesa` se siembra una vez por campaña; re-sembrar cuando cambie la campaña y no haya edición en curso | 15 min |
| — | Sin e2e de concurrencia real para los cerrojos `FOR UPDATE` (M-1/M-2): las unitarias prueban el orden de las sentencias, no el bloqueo de Postgres. Un e2e con dos `POST …/ability-rolls` en `Promise.all` y `intentos: 1` → exactamente un 201 y un 409 | 30 min |
| — | `attemptId` bajo `MATRIZ`/`PUNTOS` se acepta y marca un intento caduco; rechazarlo con 400 cuando la regla no es `DADOS` | 10 min |

Y dos menores de «Mundo (árbol)» de la tabla de fichas menores de la revisión final (2026-09-13),
cerradas también en esta tarea:

| Área | Qué | Dónde |
|---|---|---|
| Mundo (árbol) | Borrar un hilo no invalida la consulta del otro extremo del enlace, así que su ficha puede quedar con el hilo fantasma hasta recargar | `apps/web/src/features/sessions/taller/mundo/EditorDeHilos.tsx` |
| Mundo (árbol) | Las raíces sin hijos se abren desplegadas por defecto en vez de plegadas | `apps/web/src/features/sessions/taller/mundo/DesgloseDelMundo.tsx` |

### Sin ficha propia · `CharacterRow` no declara `entityId` (2026-09-14)

**Abierto, menor, encontrado en la Task 4.** `CharacterRow` (`apps/web/src/features/character-sheet/api.ts`)
no declara `entityId` en su tipo, aunque el servidor ya lo manda desde `GET
.../characters/:id/sheet` (redactado por `entityIdsVisibleFor`, como el resto de lecturas). No
rompe nada hoy —nada de la hoja lee ese campo—, pero una pantalla de la hoja que quisiera enlazar
«Ficha del mundo» desde ahí tendría que ensanchar el tipo primero.

### Interfaz que se mide — menú, ventaja, temporales, hilo, catálogo, 80 caracteres, `sm` (cerradas en T5)

Diecisiete filas de la revisión final del pulido (2026-09-13), triadas por el plan de esta tanda
(§0) y cerradas en la Tarea 5. Cada una lleva su veredicto y su motivo:

- **Elenco / menú** (una fila, dos veredictos): **A** — Espacio se resuelve en `keyup`
  (`alSoltar`), no en `keydown` con un `click()` a mano: el nativo dispara su propio `click` al
  SOLTAR Espacio (Enter lo dispara al pulsar), y manejarlo en `keydown` abría la puerta al doble
  disparo. **D** — Tab sigue sin `preventDefault`: es el patrón *Menu Button* de WAI-ARIA APG
  («Tab: closes the menu and moves focus to the next element in the tab sequence»), no un olvido.
- **Dados · `SelectorDeVentaja`**: **A** — de `disabled` nativo a `aria-disabled` (con el
  `onChange` cortado a mano) en el radio, y `aria-disabled` en vez de `disabled` en el `fieldset`;
  un fieldset nativo apagado saca a TODOS sus hijos de la secuencia de tabulación por debajo de
  cualquier `aria-disabled` que se les ponga. `BandejaDeDados.tsx` enlaza el motivo con
  `aria-describedby="ventaja-motivo"` en el `radiogroup`.
- **Dados · `<details>` con el error plegado**: **D** — a propósito (comentario ya en el código):
  el error abre el modo avanzado para no esconderlo; es la regla de interfaz, no un descuido.
- **Bestiario · `DarTemporales.preguntando`**: **A** — `onSuccess` pasa a `onSettled`: un fallo
  también cierra la pregunta, así que el siguiente «Dárselos» vuelve a preguntar en vez de
  arrancar con el diálogo de una petición vieja ya abierto.
- **Hilo · frase con sujeto (#5)**: **A** — `HP_CHANGED` con `ctx.sujeto` vuelve a llevar el
  `(from → to)`: «Sylas pierde 7 PG (20 → 13) ← Klarg», la misma verdad que la frase sin sujeto,
  con el número dentro.
- **Catálogo de objetos** (dos filas): **F** — los `FilterChip` de tipo y origen YA llevan
  `aria-pressed` (`FilterChip.tsx:33`); no había nada que cerrar. **A** — las dos `Toolbar`
  (tipo y origen) se envuelven en un `<div className="flex flex-col gap-s2">` y cada una lleva su
  `aria-label` (`Toolbar` ahora acepta `ariaLabel` y pinta `role="toolbar"` cuando se lo dan).
  Medido en Playwright a 1280×800 y 390 px (`.superpowers/sdd/2026-09-17-cierre-antes-de-3a2/
  catalogo-1280x800.png`, `catalogo-390px.png`): separación clara entre las dos barras en los dos
  anchos, sin solape.
- **Mundo (árbol) · rótulo libre > 80 caracteres**: **A** — el campo de rótulo de
  `EditorDeHilos.tsx` topa a 80 (`maxLength` + recorte en el propio `onChange`, por si algo
  escribe el valor a mano) y explica «Como mucho 80 caracteres; el servidor corta ahí.» al llegar
  al límite.
- **Ajustes del personaje · `sm`/`xs`**: **A** — los dos errores del bloque archivado
  (`AjustesDePersonaje.tsx:179,184`) pasan de `text-chrome-xs` a `text-chrome-sm`, igual que el
  resto de errores de la pantalla: el error se lee, no es una nota al pie.
- **Ajustes del personaje · `PanelDeDados.test` y la rejilla del reloj**: **D** — fijar las clases
  de una rejilla es probar Tailwind, no comportamiento; `jsdom` no maqueta.
- **Hoja · `Field.reservaEspacio` sin `line-height` explícito**: **D** — el *preflight* de
  Tailwind es dependencia declarada del proyecto; fijar un alto en `rem` duplicaría el token
  tipográfico que ya existe.
- **Hoja · regex `/^\d+px$/` de `HojaCalculada.test`**: **D** — `jsdom` no tiene `ResizeObserver`
  real; lo que de verdad mide altura se mide en Playwright (`espacios.spec.ts`), regla de
  `08-pruebas.md`.
- **Hoja · comentario «ancho mínimo» caducado**: **F** — la línea 92 de `hoja.spec.ts` no lo dice;
  los comentarios de «ancho mínimo» viven en `:337` y `:766` y son verdaderos (hablan del
  `w-[6rem]` compartido y de la tabla de ataques).
- **Hoja · `Dialog` fija `--tira-fija-bg` sin consumidor**: **F** — sí tiene consumidor:
  `Cabecera.tsx:100` lo lee cuando la hoja se abre dentro de un diálogo (el editor de personaje).
- **Hoja · `campaignId` parseado dos veces**: **F** — `CampaignDetailPage.tsx:610` hace un solo
  `useParams`; el resto son props.
- **Elenco / menú · `FichaDeElenco.test` sin `queryByRole` de «enemigo»**: **F** —
  `FichaDeElenco.test.tsx:175` ya lo tiene.
- **e2e · timeouts desiguales `hoja`/`sesion`**: **F** — los dos usan 15 000 para la primera
  pintura y 10 000 para el resto; no hay desigualdad que corregir.

| Área | Qué | Dónde |
|---|---|---|
| Hoja / Casilla | Comentario «ancho mínimo» caducado (la anchura ya es fija) | `apps/web/e2e/hoja.spec.ts:92` |
| Hoja | `Dialog` fija `--tira-fija-bg=surface` también sobre pergamino, sin que nada lo consuma hoy | `apps/web/src/ui/Dialog.tsx` |
| Hoja | `Field.reservaEspacio` reserva el alto con el `line-height` por defecto del navegador, no un valor explícito — depende del *preflight* de Tailwind | `apps/web/src/ui/Field.tsx` |
| Hoja | `campaignId` se parsea dos veces en la misma pantalla | `apps/web/src/pages/CampaignDetailPage.tsx` (leer antes de tocar) |
| Hoja | `HojaCalculada.test` fija la variable `--banda-fija-alto` con una regex de «0px» que no prueba que el `ResizeObserver` esté enlazado de verdad | `apps/web/src/features/character-sheet/__tests__/HojaCalculada.test.tsx` |
| Ajustes del personaje | El tamaño del texto de error difiere entre el bloque archivado (`sm`) y el pie (`xs`) | `apps/web/src/features/characters/AjustesDePersonaje.tsx` |
| Ajustes del personaje | `PanelDeDados.test.tsx` no fija las clases de la rejilla del reloj, así que un cambio de rejilla no lo detecta | `apps/web/src/features/rolls/__tests__/PanelDeDados.test.tsx` |
| Elenco / menú | Sin `preventDefault` en Tab dentro del menú de acciones; Espacio activa por `keydown` y por `click` a la vez (doble disparo posible) | `apps/web/src/ui/MenuDeAcciones.tsx` |
| Elenco / menú | `FichaDeElenco.test.tsx` perdió su `queryByRole` de «enemigo» al reescribir el test de la fila | `apps/web/src/features/sessions/elenco/__tests__/FichaDeElenco.test.tsx` |
| Elenco / menú | `hoja.spec.ts` y `sesion.spec.ts` usan timeouts desiguales para el mismo tipo de espera | `apps/web/e2e/hoja.spec.ts`, `apps/web/e2e/sesion.spec.ts` |
| Dados | `SelectorDeVentaja` usa `disabled` nativo: los radios apagados no son alcanzables por teclado, y la línea de motivo no está enlazada por `aria-describedby` — candidato ya señalado por la propia revisión de la Tarea 10 | `apps/web/src/features/rolls/BandejaDeDados.tsx` |
| Dados | El `<details>`/`<summary>` de «Modo avanzado» muestra el error de la expresión aunque esté plegado | `apps/web/src/features/rolls/PanelDeDados.tsx` |
| Hilo | **Revisión final, #5**: la frase con sujeto resuelto (`HP_CHANGED` con `ctx.sujeto`) pierde el `(from → to)` que sí lleva la frase sin sujeto — considerar «Sylas pierde 7 PG (20 → 13) ← Klarg» | `apps/web/src/features/sessions/linea-de-log.ts:196-201` |
| Bestiario | `DarTemporales`: `preguntando` no se resetea si la petición falla, así que un reintento tras error puede arrancar con el diálogo ya abierto | `apps/web/src/features/bestiario/DarTemporales.tsx` |
| Catálogo de objetos | Los `FilterChip` de tipo y origen no llevan `aria-pressed` | `apps/web/src/features/campaign-items/CampaignItemsCatalogPage.tsx` |
| Catálogo de objetos | Dos `Toolbar` de filtros apilados sin separación visual entre tipo y origen | `apps/web/src/features/campaign-items/CampaignItemsCatalogPage.tsx` |
| Mundo (árbol) | Un rótulo libre de más de 80 caracteres no se valida en el cliente (el servidor sí lo corta) | `apps/web/src/features/sessions/taller/mundo/EditorDeHilos.tsx` |

### EM-1 · Cubrir los efectos de mesa con pruebas (cerrada en T8)

Cerrada con dos ficheros de prueba, sin tocar `detectarEfectos.ts` (el detector ya cumplía lo
descrito):

- `apps/web/src/features/sessions/elenco/efectos/__tests__/detectarEfectos.test.ts` — unitarias
  puras del detector: primera lectura sin efectos, daño (delta negativo, fuerte a partir del 25 %
  del máximo), cura y en pie, temporales solo al subir, caer a 0 sin morir frente a morir, nivel
  solo al subir, y condición puesta/terminada (una caducada no cuenta como activa). Las siete
  pasan contra el código real sin ajustes: `nombreCondicion("poisoned")` ya devuelve «Envenenado»
  en `character-sheet/vocabulario.ts`.
- `apps/web/e2e/efectos-de-mesa.spec.ts` — el recorrido que `jsdom` no puede medir: con dos
  contextos (DM y jugador, arranque copiado de `puerta-de-efectos.spec.ts`), el DM abre la hoja
  del personaje del jugador y le pone 7 de daño con «Recibo daño» (`PuntosDeGolpe.tsx`); en la
  tarjeta del elenco («En la mesa») del jugador —que no ha tocado nada— aparece el texto flotante
  «−7» y, tras los 2,6 s de la animación de `efectos.css`, el nodo `.fx-flotante` se retira del
  DOM (`onAnimationEnd` en `useEfectosDeFicha.tsx`). Verde a la primera.

### Higiene del e2e de la hoja — `data-casilla`, `toBe(5)`, comentario «Vel.» (cerradas en T7)

Cerradas con código en la Tarea 7. `Casilla.tsx` lleva ahora `data-casilla="derivada"` en su
`<div>` raíz — las cinco casillas de la tira compacta pasan por ella (PG desde `Cabecera.tsx` y
las otras cuatro desde `ValorDerivado` variante `"compacta"`, en `Traza.tsx`), así que el dato no
varía por instancia. `hoja.spec.ts:339` y `:1013` seleccionan por `[data-casilla="derivada"]` en
vez de por clase, con el comentario de motivo pedido; `:1014` pasa de `toBeGreaterThanOrEqual(4)`
a `toBe(5)`, exacto porque `:339` ya afirmaba `toHaveCount(5)`. `hoja.spec.ts:318` y
`Cabecera.test.tsx:90` llevan la misma línea de comentario citando el motivo de `Cabecera.tsx`
(ronda 2026-09-12) para «Vel.» sin «(pies)».

| Área | Qué | Dónde |
|---|---|---|
| Hoja / Casilla | El rótulo «Vel.» se repite en varios test como literal, sin motivo en el fichero de por qué es ese y no «Vel. (pies)» | `hoja.spec.ts:72,87`; `Cabecera.test.tsx:73,96` |
| Hoja / Casilla | Aserción `>= 4` en vez de `toBe(5)` para el número de casillas | `hoja.spec.ts:160` |
| Hoja / Casilla | Selector de Playwright `[class*='w-[6rem]']` es frágil a un cambio de clase; un `data-casilla` sería estable | `hoja.spec.ts` |

### Cajón del registro — `IconoPunta` único y contador honesto (cerradas en T6)

Cerradas con código en la Tarea 6. `IconoPunta` (`apps/web/src/ui/Iconos.tsx`, junto a las
flechas) sustituye a las dos implementaciones del mismo chevron: `Punta.tsx` (borrado; sus dos
importadores, `DesgloseDelMundo.tsx` y `EditorDeHilos.tsx`, pasan a `<IconoPunta hacia={... ?
"abajo" : "derecha"} />`) e `IconoFlechaIzquierda` rotada en `CajonDelRegistro.tsx`, que pasa a
`<IconoPunta hacia={plegado ? "arriba" : "abajo"} className="h-4 w-4" />`. El contador de líneas
nuevas ya no se apaga si el cajón se pliega antes de que el registro haya cargado ninguna línea
(`idAlPlegar === null`): ese caso ahora cuenta `eventos.length`, no 0. De paso, la etiqueta del
botón deja de decir «Plegar»/«Desplegar el registro» — la punta que apunta y `aria-expanded` ya
dicen el estado, y el nombre accesible es «Registro» a secas (más el contador si hay líneas
nuevas). P-1 (bajar `min-h-[14rem]` del cajón) **no entró**: se queda en `06-pendientes.md`
pendiente de que lo decida el autor.

| Área | Qué | Dónde |
|---|---|---|
| Mesa / tablero | **Revisión final, #7**: dos implementaciones del mismo *chevron* — `Punta.tsx` (privado del árbol) e `IconoFlechaIzquierda` rotada en el cajón del registro, que además queda invertido al plegarse hacia abajo. Un `IconoPunta` único en `ui/Iconos.tsx` cierra las dos | `apps/web/src/features/sessions/taller/mundo/Punta.tsx`; `apps/web/src/features/sessions/tablero/CajonDelRegistro.tsx:78-82` |
| Mesa / tablero | Plegar el cajón antes de que cargue el registro deja el contador de líneas nuevas en 0 | `apps/web/src/features/sessions/tablero/CajonDelRegistro.tsx` |

### Regla candidata `timeout` — cerrada en T9

**De la tabla de observabilidad de esta tanda** (`.superpowers/sdd/2026-09-12-pulido-antes-del-paso-3/progress.md`,
lectura 3): el harness manda al fondo cualquier `Bash` de más de 120 segundos si el agente no pasa
`timeout: 600000` como **parámetro de la herramienta** — no es desobediencia del agente, es un
límite del arnés que ningún brief mencionaba hasta que costó **~40 minutos** repartidos en
esperas ciegas a lo largo de la tanda (Tareas 1, 4, 8 y 9). Ya se añadió la regla a
`04-convenciones.md` § *Trabajo con varios agentes a la vez* en este mismo commit; esta ficha
queda como recordatorio de que **la regla nueva no se ha probado en una tanda completa todavía** —
cierra sola cuando la siguiente tanda (reglas de la mesa) no repita el patrón.

**Medido en «reglas de la mesa» (2026-09-13):** seis implementadores y dos revisores llevaron la
frase en el brief; **uno repitió el patrón** (Tarea 6: lanzó el `git commit` en segundo plano y se
quedó esperando; ~5 min, informe pedido a posteriori). De ~40 min a ~5: la regla funciona pero no
cierra sola. **Siguiente ajuste al brief**: la frase «INCLUIDO `git commit`» en mayúsculas al
principio, no al final; se comprueba en la puerta de efectos.

**Medido en «cierre antes de 3A.2» (2026-09-17/18):** ocho implementadores; ninguno dejó un `Bash`
en fondo esperando, pero **dos tuvieron timeouts falsos en tests web** por tener otro proceso (un
Monitor, un log) leyendo en paralelo mientras corría `pnpm verify`. La frase del brief pasa a ser
«NADA en fondo mientras corre verify», no solo «timeout explícito». **La regla cierra.**
