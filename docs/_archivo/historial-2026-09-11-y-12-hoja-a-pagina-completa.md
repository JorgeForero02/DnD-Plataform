# Archivo — La hoja a página completa (2026-09-11 y 12)

Movida entera desde `docs/07-historial.md` el 2026-09-12, en la ronda de revisión de la
Tarea 5 del pulido (`Campaign.boardRoomUrl`, IMPORTANT #1 y #2): el fichero quedaba en 1013
de 1000 líneas y esta era la entrada completa más antigua tras archivar las tres anteriores.
Sin reescribir.

---

## La hoja a página completa (2026-09-11 y 12)

**Fusión a `main` (2026-09-12):** qué — merge `--no-ff` de `hoja/pagina-completa` en `main`,
`e43038f`, 38 commits; por qué — el autor ordenó pasar a `main` y empujar antes de desplegar;
revertir — `git revert -m 1 e43038f`.

**Despliegue (2026-09-12):** el autor desplegó `6d2b2ca` a mano; comprobado con `docker ps` en
`vps1new` (api y web `healthy`) y `curl` 200; revertir = redesplegar la imagen anterior
(`f9579b2`) desde Coolify.

Rama `hoja/pagina-completa` sobre `main` `80a9243`, **veintiséis commits** hasta `0d304ea`
—veinticuatro de código, pruebas y la fusión de la Task 1, dos de documentación; medido con
`git log --oneline 80a9243..HEAD | wc -l` el 2026-09-12; el de esta ronda de documentación de
cierre hace veintisiete—: las once tareas
del plan, la ola de arreglos de la revisión final de la rama, las dos rondas de cierre de las
fichas HP y los dos residuales. Cerrada en local el 2026-09-12, **fusionada a `main` el mismo
día** y **desplegada a producción también el 2026-09-12** (`6d2b2ca`, a mano por el autor). La
[spec](./superpowers/specs/2026-09-11-la-hoja-a-pagina-completa-design.md) y el
[plan](./superpowers/plans/2026-09-11-la-hoja-a-pagina-completa.md) mandan; las decisiones que la
ejecución obligó a tomar son D-CF-38..46 en [decisiones.md](./decisiones.md), y la que el autor
tomó al cerrar, D-CF-47 (HP-9 después del paso 3). **Revertir cualquier
tanda = `git revert` de sus commits; las tarjetas no cambiaron**: cada pestaña monta las mismas
tarjetas que antes vivían en `HojaCalculada.tsx`, movidas y no reescritas.

- **Task 2 — Las condiciones saben pintarse como chips de solo lectura** (`4c965ed`, `8aff6e6`).
  `Condiciones.tsx` gana una variante para la cabecera. La revisión cazó un chip vacío para la
  concentración (`NOMBRE_CONDICION` en vez de `tituloDe`) y dejó dicho que **una condición vencida
  no es chip**: arriba se enseña lo activo, lo vencido sigue tachado en Estado (D-CF-43).
- **Task 3 — La cabecera vive en `Cabecera.tsx`** (`ae98951`, `e9ed5a5`): retrato, identidad
  solo en la mesa (en la página ya la pinta `PageHeader`), cinco números, chips y avisos, con
  `PropsDePestana` en `features/character-sheet/pestanas/tipos.ts`. La revisión devolvió fuerza a la `it` movida de los PG
  (`puedeEditar` verdadero, el control de daño ausente para quien edita) y probó el gating de
  `BotonSubirNivel`.
- **Tasks 4 a 6 — Números, Ataques, Rasgos, Recursos, Estado y Conjuros son pestañas**
  (`742f7e1`..`212eb76`). Fixture compartido en
  `features/character-sheet/__tests__/fixtures/hoja.fixture.tsx`; `habilidades.ts` saca las
  veinticuatro líneas de la tarjeta. Conjuros existe solo para quien lanza (`lanzaConjuros.ts`)
  y la revisión de la 6 devolvió el guard `spellSlots > 0`: un alto elfo sin espacios veía una
  tarjeta vacía. **Ruling de la 4:** las tarjetas de identidad (Ficha/Características) **se
  remontan** cuando la hoja se vuelve derivable porque ahora viven en una pestaña; lo guardado en
  blur ya está guardado y solo se pierde el indicador transitorio «guardando» (D-CF-39).
- **Task 7 — `HojaCalculada` es cabecera + pestañas** (`b7a0987`, `a9f9bfd`): 149 líneas,
  `disposicion` decide lateral a página o tira en la mesa, la pestaña activa en `?pestana=`, y
  **una pestaña que la hoja no ofrece cae a Números** —`?pestana=conjuros` en un no lanzador
  dejaba el panel vacío— (D-CF-42). Diez `it` de `HojaCalculada.test.tsx` abren la pestaña antes
  de afirmar: solo aperturas de pestaña y un localizador reescrito con comentario; ninguna
  aserción cambió.
- **Task 8 — Las acciones de un objeto son una lista** (`0a3a31a`): `features/inventory/accionesDeObjeto.ts`
  alimenta la fila, que pinta desde ella.
- **Task 9 — Objetos a página filtra y enseña el detalle** (`f7e8b24`, `e11db5e`):
  `FiltrosDeObjetos`, `filtrarObjetos`, `DetalleDeObjeto`. El filtro «qué es» usa el `ItemKind`
  real —seis chips— y no el tipo ad hoc del brief (D-CF-41); los chips de zona hablan el
  vocabulario de zona (D-CF-40); y `inventory` declara su propia unión `disposicion` porque **no
  importa de `character-sheet`** (`features/inventory/hooks.ts:32`), frontera que la revisión vio romperse.
- **Task 10 — Medido en el navegador, fichero a fichero** (`65bb5c1`, `5158ad1`):
  `hoja-pestanas.spec.ts` nuevo y dieciséis e2e adaptados abriendo la pestaña que toque —solo
  aperturas y localizadores más específicos—. **Incidente:** `pnpm --filter @dnd/web e2e --
  <fichero>` **no filtra** —pnpm no pasa el argumento— y corrió la suite entera una vez, 18,7 min;
  el comando que sí filtra es `pnpm --filter @dnd/web exec playwright test e2e/<fichero>.spec.ts`
  (D-CF-44). Esa pasada midió la **banda fija en 412 px** con los avisos dentro, y de ahí el
  **ruling A**: el `sticky` lleva solo lo que cambia por turno —retrato, identidad en mesa, cinco
  números, chips—; los avisos van justo debajo, fuera del `sticky`; ≤ 96 px después
  (`hoja.spec.ts`, punto 5b) (D-CF-38).
- **Task 11 — La documentación alcanza a la rama** (`a58ae03`, `7591a9e`): 07, D-CF-38..44,
  HP-1..7 en 06, 08, 01, `00-INDEX` (producción `f9579b2`, no `6eb2590`), `como-seguir` §0 y las
  notas al pie de la spec del 09-06 y del plan del 09-11. La revisión devolvió D-CF-44 a lo que el
  autor decidió (la costumbre de 08 no era parte del ruling) y nombró los diecinueve ficheros de
  navegador. **Revertir:** `git revert`; nada de código dentro.
- **Revisión final de la rama — una sola ola de arreglos** (`75bab98`, sobre `7591a9e`, 2026-09-12).
  Cuatro Important: **`puedeEditar` llega al inventario** (spec §7: en un personaje ajeno ni las
  filas ni el detalle pintan botones; mirar no es editar); **las acciones del detalle contestan en
  el detalle** —`ElegirMano` se monta una sola vez, bajo la fila en la mesa y dentro de
  `DetalleDeObjeto` a página, y el error del servidor sale bajo sus botones— (cierra HP-2); la RTL
  «cada tarjeta en su pestaña» **recorre las siete** con la misma tabla que el e2e, 23 rótulos; y
  la spec lleva su nota al pie con las cuatro desviaciones (§4, §6, §4 chips, §10). Más nueve
  minors: el coste de 60 s del guard escrito junto al `Map`, títulos de prueba que prometían lo que
  no comprobaban, `data.rollSuggestions?.` sin el `?` de más, el rango de combinantes escapado en
  `filtrarObjetos.ts`. **Revertir:** `git revert` del commit; HP-2 volvería a 06.

- **Task 1 — El cubo por usuario no se clava a un token revocado (API).**
  `common/user-or-ip-throttler.guard.ts` compara `iat` con `passwordChangedAt` (misma regla de
  empate que `jwt.strategy.ts`), cacheado 60 s por usuario. Cierra la ficha P3 del
  2026-09-11 (D-CF-36), archivada en
  [`_archivo/pendientes-cerrados-2026-09-10.md`](./_archivo/pendientes-cerrados-2026-09-10.md).
  Pruebas: `user-or-ip-throttler.guard.spec.ts` (nueva) y el e2e existente
  `login-bucket-por-ip.e2e-spec.ts`. **Revertir:** `git revert` del commit; el guard vuelve a
  clavar el cubo solo por firma.
- **Ronda de cierre — HP-3 a HP-7 (2026-09-12).** Un commit que cierra las cinco fichas que
  las revisiones dejaron abiertas a propósito y no eran del autor: el e2e de Objetos deja el cuero
  sin equipar por la API al entrar y en un `finally` (HP-3); la fila seleccionada la anuncia el
  botón «Ver detalle de X» con `aria-pressed` y el `<li>` guarda solo la marca visual
  (`data-seleccionada`, HP-4); `renderHoja` sale del fixture y vuelve a `HojaCalculada.test.tsx`
  para que las pruebas de pestaña no carguen la hoja entera (HP-5); el guard de cuota separa el
  fallo de base del de firma y acota el caché de sellos a `TOPE_SELLOS` con barrido de vencidos
  (HP-6); y `Cabecera` calcula `hayAvisos` antes de montar la fila, con la condición del DM en
  `useEsVistaDeDm` compartido con el aviso, sin `empty:hidden` (HP-7). Las cinco, con su medición
  y su texto original, en
  [`_archivo/pendientes-cerrados-2026-09-10.md`](./_archivo/pendientes-cerrados-2026-09-10.md);
  HP-1 y HP-8 siguen en 06 porque las decide el autor. **Revertir:** `git revert` del commit.
- **Ronda de cierre 2 — HP-1 y HP-8, con la decisión del autor (2026-09-12).** El cajón de la
  hoja que abre el DM desde el elenco se llama **«Su hoja»** («Sin salir de la mesa.»), simétrico
  con el «Tu hoja» del jugador; el nombre y el descriptor los pinta una sola vez la `Cabecera`
  en disposición «mesa» (HP-1, D-CF-46). Y la sintonización se enseña como **estado junto al
  nombre** —distintivo «Sintonizado» en `FilaObjeto` y `DetalleDeObjeto`, mismo patrón que «Sin
  identificar»—, que es lo que la pantalla 20 del prototipo quería decir; la lista de acciones
  conserva su orden, principal primero, y el botón del objeto sintonizado dice lo que hace,
  «Desintonizar», para no repetir el estado (HP-8, D-CF-45; SRD 5.1 «Attunement»). Al medirlo se
  vio que la sintonización es hoy solo un marcador —el motor no lee `attuned`, no hay descanso
  corto, 0 objetos del SRD la piden— y quedó escrito como **HP-9** en 06, decisión del autor.
  Localizador e2e cambiado: `sesion.spec.ts`, el cajón por «Su hoja». Las dos fichas, con su texto
  original, en
  [`_archivo/pendientes-cerrados-2026-09-10.md`](./_archivo/pendientes-cerrados-2026-09-10.md).
  **Revertir:** `git revert` del commit.
- **Tres retoques de la revisión de la ronda 1 (2026-09-12).** `useEsVistaDeDm` se muda de
  `AvisoDeDm.tsx` a `features/character-sheet/hooks.ts` (un fichero de componente no exporta más que
  componentes; el aviso de `react-refresh` vuelve a su cifra anterior); los ayudantes del spec del
  guard de cuota viven una vez a nivel de fichero; y el recorrido de Objetos del e2e de pestañas
  deja de restaurar el cuero en un `finally` —captura, restaura y relanza el primer error— para
  que una vuelta por la API que falle no tape el fallo del recorrido. Sin cambio de aserciones.
  **Revertir:** `git revert` del commit.
- **El botón de sintonizar es una acción llana (2026-09-12, revisión de la ronda 2).** Pierde
  `aria-pressed`: el conmutador de la APG lleva rótulo fijo y el estado en `pressed`; el nuestro
  es el patrón contrario (rótulo «Sintonizar»/«Desintonizar», estado en el distintivo), y mezclar
  los dos anunciaba «Desintonizar, pulsado». `variant` y `aria-label` no cambian; el
  `aria-pressed` de «Ver detalle de X» (HP-4) tampoco. Y el índice de `_archivo/README.md` gana
  la fila del archivo del 2026-09-06 que le faltaba. **Revertir:** `git revert` del commit.
- **Dos residuales de la revisión final (2026-09-12).** A página, un rechazo del servidor sobre
  la fila SELECCIONADA ya no se anuncia dos veces: `PaginaDeInventario` deja de pasarle `error` a
  esa fila (`FilaObjeto`) porque el detalle (`DetalleDeObjeto`) ya lo enseña — un lector de
  pantalla oía el mismo mensaje por partida doble. Y seleccionar otra fila mientras `ElegirMano`
  está abierto para la anterior cancela esa pregunta pendiente (`setManoPara(null)` en
  `onSeleccionar`, solo cuando el id cambia): antes reaparecía sola al volver a la fila que la
  había abierto. **Revertir:** `git revert` del commit.
- **Ronda de documentación de cierre (2026-09-12, ciclo FIN del protocolo).** Lo que la rama dejó
  fuera de la documentación, puesto en su sitio: `02-entorno.md` decía que `check:historial` fallaba a
  las 400 líneas cuando el tope es 1000 desde el 2026-09-05, y enseña las formas que de verdad
  filtran un fichero (`exec playwright test`, `exec vitest run`; las dos medidas); `04-convenciones.md`
  gana la regla de `verify` en primer plano para los implementadores; `decisiones.md` D-CF-47 (HP-9
  después del paso 3) y la cláusula «sin `aria-pressed`» en D-CF-45; HP-9 reescrita en 06 con lo que
  se midió al estimarla —`CampaignItem.effects` e `itemEffectSchema` ya guardan el +N y el motor lo
  aplica sin mirar `attuned`, así que no hace falta migración—; 01, 08, `como-seguir` y `00-INDEX`
  al día. **Revertir:** `git revert` del commit; no toca código.
- **HP-9 se parte en dos, decisión del autor (2026-09-12).** Al releer HP-9 con «espera al paso 3»
  quedó claro que la mitad de lo que describía no es una funcionalidad futura sino un defecto ya
  vivo: un objeto del DM con `effects` y `requiresAttunement: true` aplica su bono sin estar
  sintonizado, porque el motor nunca lee `attuned`. **HP-9a** («sintonizar cuenta») se separa como
  ese defecto y no espera al paso 3 —sesión corta de 2–3 h, antes o justo después de fusionar la
  rama—; **HP-9b** (catálogo SRD +N estructurado y descanso corto) conserva el texto y el orden
  originales, después del paso 3. D-CF-47 enmendada, `06-pendientes.md` y `como-seguir.md`
  actualizados. **Revertir:** `git revert` del commit; HP-9 vuelve a su ficha única.
- **HP-9a · Task 1 — el servidor deja de contar lo mágico de un objeto sin sintonizar
  (2026-09-12)**, commit `fix(rules): an item that requires attunement gives its magical effects
  only when attuned`. `ResolvedItem` gana `attuned` (`z.boolean().default(false)`, estado de la
  fila como `identified`); `equipoEquipado` lo copia de la fila; `rules/items.ts` estrena
  `efectosActivos(item)` —`[]` si `requiresAttunement && !attuned`, la lista si no— y es la ÚNICA
  puerta por la que la CA (`equipmentToEngineInput`) y el +N al ataque y al daño (`attacks.ts`,
  `sumaDeEfecto`) leen `effects`; lo mundano (`armor.baseAc`, el dado del arma) no pasa por el
  filtro. La hoja emite `item_not_attuned` (`key: ref`, `data: { ref, name }`, con el nombre ya
  redactado) solo si el objeto tenía `effects`. Fuente: SRD 5.1 §Attunement — sin sintonizar, el
  objeto no da sus propiedades mágicas. Once pruebas nuevas (motor, ataques y costura del
  servicio); mutación «devolver `item.effects` siempre» tumbó cinco. **La pantalla es la Task 2**:
  `describirAviso` aún dice «Sin traducir: item_not_attuned». **Revertir:** `git revert` del commit.
- **HP-9a · Task 2 — la pantalla deja de mentir sobre el número (2026-09-12)**, commit `feat(web):
  an unattuned item shows its magical effect as inactive, and the sheet says why`. La hoja traduce
  `item_not_attuned` («"{nombre}" requiere sintonización: sus efectos no cuentan hasta
  sintonizarlo», con el `name` ya redactado por el servidor) y el código entra en
  `CODIGOS_QUE_EMITE_LA_API`. `datoDeObjeto` pasa de una cadena a `{ mundano, magico }` —antes la
  armadura +1 se quedaba en «CA base 16» y el anillo +1 decía «+1 CA» sin saber si contaba—; la
  fila y el detalle pintan la mitad mágica **tachada** (`<s data-efecto="inactivo">`) con la marca
  «Efecto inactivo: requiere sintonización» al lado (el detalle añade la frase entera) cuando
  `efectoInactivoPorSintonizacion(row)` (`features/inventory/sintonizacion.ts`, el único sitio del
  predicado en la web, sobre `row.attuned` y nunca `item.attuned`). En el servidor el aviso se
  decide con `sintonizacionPendiente(item)` junto a `efectosActivos` en vez de con una copia a mano
  del predicado. Diez pruebas nuevas (2 de vocabulario, 4 + 4 RTL); dos mutaciones —el predicado
  siempre falso tumbó dos, quitar el `case` tumbó dos—. Queda la Task 3 (Playwright).
  **Revertir:** `git revert` del commit; la pantalla vuelve a pintar el +1 como si contara.
- **Sintonizar cuenta (HP-9a, 2026-09-12) — cerrada en tres commits:** `11ea5d9` (Task 1, el
  servidor), `6d2fc9c` (Task 2, la pantalla) y `1373c56` (Task 3, `feat: attunement counts in the
  browser too, and HP-9a closes`). **Qué** cerró la Task 3: el `<s>` del bono tachado apunta con
  `aria-describedby` a su marca (`idDeEfectoInactivo(row.id)`, un `id` por fila; en el detalle con
  prefijo `detalle-` porque las dos cajas conviven en la página), porque un lector de pantalla no
  anuncia el tachado —dos aserciones RTL (`toHaveAccessibleDescription`), rojas antes—; y el
  recorrido de navegador que ninguna unitaria puede hacer, `apps/web/e2e/inventario.spec.ts` «un
  objeto que requiere sintonización no cuenta hasta sintonizarlo»: un anillo de protección de la
  campaña (`requiresAttunement`, `effects: [{ kind: "ac", amount: 1 }]`) se equipa por la pantalla
  y la CA de la tira fija **no se mueve**, la fila enseña `s[data-efecto="inactivo"]` con «+1 CA»
  y la marca, la cabecera avisa; a 390×844 la fila con la marca cabe (borde derecho ≤ 390, crece
  hacia abajo por `flex-wrap`); «Sintonizar» sube la CA en uno y se van el tachado, la marca y el
  aviso. **Por qué:** SRD 5.1 §Attunement — un objeto que requiere sintonización da sus propiedades
  mágicas solo a la criatura sintonizada; sin sintonizar es su versión mundana. La ficha entera va a
  [`_archivo/pendientes-cerrados-2026-09-10.md`](./_archivo/pendientes-cerrados-2026-09-10.md) y
  deja **HP-10** en 06 (la fila pone cifra solo al efecto `ac`; para los otros ocho tipos de
  `itemEffectSchema` la marca sale sin nada tachado). D-CF-48. **Revertir:** `git revert` de los tres commits, del
  más nuevo al más viejo; el motor vuelve a sumar el +1 sin mirar `attuned`.
- **HP-10 — la fila resume todos los tipos de efecto, y la espada +1 inactiva tacha su +1
  (2026-09-12)**, commit `feat(web): the item row summarises every effect kind, so an inactive
  sword strikes its +1 too`. **Qué:** `resumirEfecto(efecto)` junto a `describirEfecto` en
  `features/campaign-items/vocabulario.ts` (única casa del vocabulario de efectos: `inventory` ya
  importaba de ahí), `switch` exhaustivo con `never` sobre los nueve tipos de `itemEffectSchema`
  —«+1 CA», «+1 atq», «+1 dñ», «FUE 19», «+1 salv. SAB», «+5 PG máx.», «+10 pies», «pericia en
  Sigilo», «competencia en salv. CON»—; `datoDeObjeto.magico` compone la lista entera unida por
  « · » y `DatoEnCifras` la tacha igual que tachaba el «+N CA», así que el detalle hereda.
  **Por qué:** desde HP-9a una espada +1 o un cinturón de fuerza sin sintonizar enseñaban la marca
  «Efecto inactivo» sin ninguna cifra que tachar. 24 pruebas nuevas (18 de vocabulario, 3 + 3 RTL),
  rojas antes; mutación (`weaponDamage` sin su «dñ») tumbó 5. «+1 CA» del anillo no cambia, así
  que `inventario.spec.ts` sigue igual. La ficha entera va a
  [`_archivo/pendientes-cerrados-2026-09-10.md`](./_archivo/pendientes-cerrados-2026-09-10.md).
  **Revertir:** `git revert` del commit; la fila vuelve a poner cifra solo al `ac`.
- **Revisión de HP-10 — la mitad mágica envuelve, lista cada efecto y salta los ceros
  (2026-09-12)**, commit `fix(web): the magic half of an item's figures wraps, lists each effect and
  skips zeros`. **Qué:** el `whitespace-nowrap` sale del contenedor del dato (fila y detalle,
  ahora `flex-wrap min-w-0`) y `DatoEnCifras` lo pone solo en lo mundano; la mitad mágica, que
  desde HP-10 es una lista sin tope, envuelve (RTL: la clase no está en el `<s>`/`<span>` mágico ni
  en su padre). **Cambio semántico declarado:** el `datoDeObjeto` de antes SUMABA los `ac` («+2 CA»,
  `null` si 0); el de HP-10 los LISTA («+1 CA · +1 CA») porque cada efecto es una línea que
  escribió el DM, y esta revisión añade que una cantidad 0 no se resume (antes «+0 CA» se pintaba;
  el `set` de `abilityScore` no es una suma y su 0 sí cuenta). Dos `it` nuevos para las dos cosas y
  uno para el envoltorio; los fixtures `kind: "WONDROUS"` (inexistente, escondido por el `as`)
  pasan a `"OTHER"`; `describirEfecto` usa el mismo `conSigno`. **Revertir:** `git revert` del
  commit; la lista vuelve a poder pintar «+0 CA» y a no partir.

