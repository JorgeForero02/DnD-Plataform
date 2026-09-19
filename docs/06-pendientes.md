# Pendientes

**Solo fichas abiertas.** Las cerradas se archivan: las de antes del 2026-09-02 en
[`_archivo/pendientes-cerrados-hasta-2026-09-02.md`](./_archivo/pendientes-cerrados-hasta-2026-09-02.md)
las que este documento seguía arrastrando tachadas en
[`_archivo/pendientes-cerrados-hasta-2026-09-03.md`](./_archivo/pendientes-cerrados-hasta-2026-09-03.md),
las **37** que cerraron los quince planes de la noche del 2026-09-05 en
[`_archivo/pendientes-cerrados-hasta-2026-09-05.md`](./_archivo/pendientes-cerrados-hasta-2026-09-05.md),
y las que cierra el paso 1 «las goteras» del 2026-09-06 en
[`_archivo/pendientes-cerrados-2026-09-06-paso-1.md`](./_archivo/pendientes-cerrados-2026-09-06-paso-1.md).
y las **tres que llevaban «Cerrado» en su propio título** en
[`_archivo/pendientes-cerrados-2026-09-06-poda.md`](./_archivo/pendientes-cerrados-2026-09-06-poda.md),
y las **seis de la tanda corta del 2026-09-08** en
[`_archivo/pendientes-cerrados-2026-09-07-tanda-corta.md`](./_archivo/pendientes-cerrados-2026-09-07-tanda-corta.md),
y las **tres de la tanda B, el mismo día**, en
[`_archivo/pendientes-cerrados-2026-09-07-tanda-b.md`](./_archivo/pendientes-cerrados-2026-09-07-tanda-b.md),
y **P2-2, el formulario de entrega**, en
[`_archivo/pendientes-cerrados-2026-09-07-formulario-de-entrega.md`](./_archivo/pendientes-cerrados-2026-09-07-formulario-de-entrega.md),
y las **dieciocho que el reconocimiento del 2026-09-08 encontró falsas** —cuatro de ellas P1, y
diez con un barrido o una cita de línea dentro— en
[`_archivo/pendientes-cerrados-2026-09-08-reconocimiento.md`](./_archivo/pendientes-cerrados-2026-09-08-reconocimiento.md),
y los **39 bloques de la poda del 2026-09-10** —falsas, tachadas y decididas— en
[`_archivo/pendientes-cerrados-2026-09-10-poda.md`](./_archivo/pendientes-cerrados-2026-09-10-poda.md),
y **el anexo #16 de la bandeja compacta**, cerrado por la Task 10 del pulido, en
[`_archivo/pendientes-cerrados-2026-09-12-bandeja-de-dados.md`](./_archivo/pendientes-cerrados-2026-09-12-bandeja-de-dados.md),
y las fichas de la tanda «cierre antes de 3A.2» del 2026-09-17, en
[`_archivo/pendientes-cerrados-2026-09-17-cierre-antes-de-3a2.md`](./_archivo/pendientes-cerrados-2026-09-17-cierre-antes-de-3a2.md).
**La regla es mecánica y no la decide nadie: lo tachado sale, lo abierto se queda.** Se archivan
en vez de borrarse porque varias explican una afirmación que resultó ser falsa, y ese registro
es lo que evita volver a creérsela.

## Dejado por la auditoría de interfaz (2026-09-19)

La auditoría ([archivada](./_archivo/auditoria-interfaz-2026-09-19.md), ~95 hallazgos sobre el
prototipo navegable de 120 estados) se cruzó contra `decisiones.md` y `04-convenciones.md` el mismo
día. Salen cuatro cubos. **Solo el primero tiene plan**:
[`superpowers/plans/2026-09-19-correcciones-de-interfaz.md`](./superpowers/plans/2026-09-19-correcciones-de-interfaz.md)
— correcciones menores y gráficas, sin funcionalidad nueva, para estos días (modo «solo errores»,
D-CF-161). Los números son los de la auditoría.

### A · Fichas abiertas — en el plan (correcciones menores y gráficas) — **hechas el 2026-09-19, fusionadas a `main` en `894f2ad`** (9 commits de código, `e84f2b2..b092882`; sin desplegar); quedan cinco menores aplazados: `EscribirFicha.tsx:83` JSDoc «statblock», `PanelCarga.tsx:55,70,71` `toFixed(0)`, `Traza.tsx:314,317` menos ASCII, `fechaCorta` sin consumidor, «Tu iniciativa» cuando el DM tira por otro desde la caja compacta

- **Textos que mienten o se repiten** (plan, Tasks 1–4): 3.1 «y» repetida · 3.4 tres números en la
  iniciativa tirada · 3.6 «Su turno» en preparación
  (`ColumnaElenco.tsx:99`) · 5.1 «sus 1 asalto» (`TiraDeIniciativa.tsx:338`) · 5.3/16.3 statblock →
  criatura del bestiario, XP/experiencia → **PX** · 6.2 «Recibo daño»/«Me curo» en la hoja que el DM
  también abre (`PuntosDeGolpe.tsx:222`) · 10.1/10.2 «tú» en las audiencias de tirada
  (`rolls/vocabulario.ts:119,127`) · 2.5 «Solo el DM» → «Solo lo ve el DM» · 10.5 «Dice» → «Resultado»
  (`features/sessions/hilo/tirada.ts:93`) · 2.3 «Texto» / «Daño o curación» en las filas de la barra (tipo de mecánica
  del motor, `dominio/acciones.ts:102`) · 4.1 **solo el texto**: «Sin puntos de golpe en la hoja» al
  jugador sobre un PNJ con PG ocultos (`FichaDePnj.tsx:49`) · 17.4 «· Nota:» huérfano — es la viñeta
  del borrador de la crónica (`ControlesDeSesion.tsx:221`), no un separador.
- **Hoja** (Task 5): 8.1 el avatar toma «[» de «[demo]» (`FichaDeElenco.tsx:484`) · 8.2 Iniciativa y
  Competencia sin signo (`Cabecera.tsx:118,142`) · 8.6 el párrafo que explica dónde está
  «Anulaciones del DM» (`AvisoDeDm.tsx:49`) pasa a ser el botón.
- **Condiciones** (Task 6): 12.1 «Las quince del manual» con 17 (Te ayudan y En furia son de la mesa)
  · 12.2 `<p>` haciendo de leyenda.
- **Números y fechas** (Task 7): 17.2/9.4/8.7 «3.5 kg» con punto (`PanelCarga.tsx:50`) — ojo, el
  espacio fino de miles («2 700 PX») **es la convención** (04) y no se toca; 17.3 fechas con y sin año.
- **Cajones con dos cabeceras** (Task 8): 21.10 = 10.3 Pedir tirada · 13.1 Consulta del mundo · 15.1
  Sacar criatura · 15.2 Tablas · 15.3 Tu bolsa. Regla nueva: **un `Dialog`, un `h2`**.
- **Reordenes** (Task 9): 15.4 «PG temporales» fuera de «Sacar criatura», al menú de la criatura ·
  16.1 «Qué pasa» del reloj antes de los botones · 13.4 la nota del motor de reglas a la cabecera ·
  13.3 `title` duplicado en «Ejecutar».
- **Lo que la regla de casa ya exigía** (Tasks 10–11): 1.5 los seis sellos van `aria-disabled` sin
  texto — viola «el botón de enviar nunca se deshabilita» (04, E-PL-8); se arregla por la regla, **no
  con el rediseño que propone la auditoría** · 4.4 «Goblin 3 · Goblin 2 · Goblin 1» → «Goblins (3)»
  (sin «×», glifo prohibido) · 4.3 chip de empate (el lápiz ya desempata, E-IB-14) · 3.2 el DM ve un
  cartel de iniciativa por cada PJ ausente (`TiradasPendientes.tsx:145`; el servidor le lista todas
  las peticiones, `roll-requests.service.ts:list`) → una caja compacta, y «Empezar igualmente» dice
  que tira por los que faltan (D-OP-23).
- **Accesibilidad y comodidad** (Tasks 12–13): 18.2 bordes `muted/30` a 1,5–1,8:1 → token `--borde`
  ≥ 3:1 medido por `tokens-contrast.spec.ts` · 18.3 anillo de foco en la capa base (11 de 52
  controles de la mesa lo llevan) · 10.6 `radiogroup` + `fieldset` duplicados · 19.1 el destello a
  pantalla completa sobrevive a `prefers-reduced-motion` (`efectos.css:588`; mirar antes por qué
  D-CF-116 lo dejó) · 4.5 «no es tu turno» se lee antes de abrir un menú · 4.9 botones −5/−10 de
  movimiento · 9.3 chip «Todo» en los filtros de la bolsa · 11.3 filtros del registro a 28 px.
- **Prototipo** (Task 14, fuera del repo): §20 — hecho el 2026-09-19 (133 estados: asalto 2, PJ a 0 PG,
  condiciones, 390/768 px) **salvo 20.1, el ataque resuelto**: queda para la próxima pasada, tras desplegar.

### B · Fichas abiertas de tamaño medio — después de la tanda, sin plan todavía

- **12.3/12.4** Un solo componente de condición (rejilla) y una sola lista de duraciones (la del
  reloj) para la mesa y la hoja (`PonerCondicion.tsx` vs `features/character-sheet/Condiciones.tsx:416`).
- **6.1/2.1/21.2** Un solo componente de cambio de PG: los ±5 de la tarjeta del jugador, el diálogo
  del DM y el panel de seis controles de la hoja. Lo básico visible, lo avanzado plegado. No choca con
  nada (D-POD-5 sigue: el absoluto no se recorta, el delta sí).
- **6.3** «De qué tirada sale» lista ~20 tiradas sin quién ni cuándo → últimos 5 minutos de la mesa,
  «11:14 · Sylas · Daño de la daga · 1d4+1 = 5», y sin campo si no hay ninguna.
- **6.4** Dados de golpe desde dos sitios de Recursos · **6.5** PG como botón en la banda de la hoja.
- **9.1** Cinco monedas con cinco «Aplicar» → lectura + un control (cantidad, moneda, signo).
- **16.1 (segunda mitad)** «Pasa el tiempo» y «Viajáis» como dos solapas del cajón del reloj.
- **1.6** Avisos «Alguien se ha sentado a tu mesa» ×4 sin nombre → agrupar y nombrar (el nombre tiene
  que viajar en el aviso: toca API).
- **18.6** Tema y ornamento en la cuenta, `localStorage` solo como caché.
- **3.7/11.1** Dos sucesos por iniciativa tirada por el sistema → uno con sujeto y autor separados
  (toca el `payload`; E-IB-17 solo aceptaba la línea de más en la carrera perdida).
- **3.8/11.2** Bloque plegable «Iniciativa del asalto 1 — 6 tiradas» y separador entre encuentros en
  el registro.
- **8.4/21.9** La hoja de otro jugador como vista de lectura (20 campos apagados + el mismo aviso
  cinco veces). No esconde nada —lo pinta como texto—, pero cambia el patrón: **que lo vea el autor**.
- **4.11** Distintivo de concentración en la tira de turnos y aviso de salvación al recibir daño.

### C · Chocan con una decisión tomada — para el autor, con lo que sí se podría mejorar

| # | Propone | Choca con | Lo que sí cabe |
|---|---|---|---|
| 3.5 | Contador «N de M» al jugador | **E-N-5** (autor, 2026-09-06): el jugador solo ve sus propias peticiones y el número saldría falso. Se aplicó y se revirtió el mismo día (`e84f2b2`) | Nada |
| 1.4 | Esconder Hoja/Bolsa al DM | D-CF-66, E-PL-7, rail permanente | La lista de Atajos podría decir «(sin personaje)» junto a N e I |
| 1.5 | Un «Anotar» + chips | D-CF-149 (los seis sellos son el prototipo) | Ya en el plan por la regla: no apagarlos |
| 2.2 | Quitar Ayudar de la tarjeta | E-08-8 (autor: en tu tarjeta) — pero la barra lo duplica desde 3A.3 | **Re-decidir**: uno de los dos sobra; D-CF-50 (las acciones son menús) apunta a dejar el de la barra |
| 2.4 | Celda fija para la barra | D-CF-156: ya está en la fila `auto` del centro en los dos modos | Nada — falso positivo |
| 4.2/21.5 | Economía = turno activo, y una línea «Tú» | D-CF-145 (el jugador ve la suya) | La línea del turno activo **además** es aditiva; el coste es una fila más en la franja |
| 4.6/8.5 | Unificar a `disabled` | D-CF-121, E-14-4 | Nada |
| 5.2/16.2 | No listar PNJ en Dar PX | «Nunca se esconde» (E-PE-12) | Ya en el plan: una nota, no cuatro |
| 7.2/21.8 | Selector de objetivo en el popover | D-CF-155 («deliberadamente más simple»); la lista ya aparece al pulsar Atacar sin chip | Precargar el chip en un `<select>` visible es opcional; **decisión del autor** |
| 7.5 | Ventaja/desventaja en la barra | D-CF-155 la quitó a propósito; D-2.5-6 la sugiere, no la impone | Reusar `SelectorDeVentaja` en `ControlDeAtaque` cuesta poco; **decisión del autor** |
| 7.4 | «No permite tirar el daño» | Ya existe la bandeja (E-PE-3, D-CF-129) | Nada |
| 7.6 | «Nada conecta con la CA» | Ya existe (E-PL-9, D-2.5-5) | Nada |
| 11.4 | «Ir a lo último» | Ya existe («Hay algo nuevo abajo») | Nada |
| 13.2 | Tres niveles de visibilidad | Modelo de datos, `canView`, D-2B-8, D-CF-10; los cinco glifos son excepción declarada en 04 | El `Badge` siempre con su palabra al lado — comprobar que ya lo hace |
| 17.1/21.12 | Una sola política de unidades | D-2B-4 (kg en pantalla, pies para distancia, a propósito); alcances en metros por el SRD español (D-CF-92/115) | Un interruptor en Ajustes (imperial/métrico) formateando al vuelo — **decisión del autor** |
| 18.4 | 15 px en la mesa | D-POD-9 | Nada sin el autor |
| 18.5 | Cuadrados a 32 px | D-CF-149 (1,6 rem es el prototipo) | Nada sin el autor |
| 1.1/1.2/7.3/21.1 | PNJ en la mesa fuera de combate | E-IB-9 los cruza con el encuentro a propósito; «nacen escondidos»; Revelar/Ocultar ya existe (D-CF-82) | Es 3B: pintar «En escena» con los PNJ bajados aunque no haya combate, respetando `canView`. **Sin** el interruptor nuevo |
| 4.1/21.4 | PG del enemigo como estado (Herido…) | Revela información que `canView` niega (D-2B-8) | Ajuste por campaña «PG de los enemigos: ocultos / como estado / visibles» — **decisión del autor** |

### D · Funcionalidad nueva — 3B (aplazada por el autor, D-CF-161)

4.7/21.6 daño en área con salvación a mitad · 4.8 resistencias y vulnerabilidades al elegir tipo ·
4.10/21.7 deshacer (choca además con el registro de solo añadir, D-OP-15: el inverso se anota, no se
borra) · 5.4 aviso de fin de combate al jugador con resumen y PX · 9.2 conversión de monedas y
total · 14.1/14.4/21.11 URL para los tres cajones (compatible con D-R-8/9) y reagrupar diez destinos
en tres grupos · 19.2/19.3 pantalla de prueba de las 33 animaciones y preferencia global de efectos
(Completos / Discretos / Ninguno).

## Dejado por 3A.3 (2026-09-18)

Lo que la tanda de la barra de acciones y la convergencia al prototipo dejó fuera a propósito —
plan (§ self-review), ledger y revisión final de `.superpowers/sdd/2026-09-18-3a3-la-barra-de-acciones/`—
más los menores de la revisión que la ola (`945b8fa`) no cerró. **P-1 (el cajón del registro) ya no
está aquí**: la cerró la Task 5 por absorción (D-CF-147), comprobado en este cierre.

### Del prototipo, sin entrar

- **Tiradores redimensionables** entre las tres columnas de la mesa — el HTML los tiene; la rejilla
  es `grid-cols-[17rem_minmax(0,1fr)_18rem]` fija (`MesaDeSesion.tsx`).
- **Atajos 1–5 (los cinco menús de la barra), R, Z y Espacio** — los `<kbd>` del HTML no se pintan
  (D-CF-149) porque prometerían teclas que no existen; existen N · I · M · D · `/` · Esc
  (`MesaDeSesion.tsx`, «Atajos» de `BandaUnica.tsx`).
- **«Repetir» y «Deshacer»** en la barra — el servidor no tiene deshacer (fuera del alcance de la
  primera parte, `decisiones.md`).
- **La barra a 390 px como hoja inferior** — hoy los menús son `PanelFlotante` anclados al botón;
  en estrecho no entran (pre-flight del ledger, «T4 a 390»). Va con P2 (la mesa a 390).
- **«Lo que el motor está siguiendo»** (la caja del prototipo con concentración, condiciones con
  duración, temporales) — no hay componente; las condiciones se ven en cada tarjeta.
- **Bandeja lateral del DM** para el daño pendiente — la tarjeta/línea del hilo con «Aplicar» hace
  de bandeja (self-review del plan); rehacerla como panel lateral es tanda propia.
- **La tarjeta del DM mide 148 px frente a los 92 del prototipo** (medido en `mesa-prototipo`): los
  mandos «Daño · Curar · …» y las condiciones ocupan una fila más que en el HTML.
- **El PNJ del jugador dice «Sin puntos de golpe en la hoja»** en el elenco: `FichaDePnj` solo
  lee la hoja para el DM (I-2, como la CA) y un jugador no ve sus PG. Decidir si el PNJ jugable de
  un jugador (`Character` con `statblockRef`) los enseña a su dueño.

### Del servidor

- **Ataque Adicional marca `excedido`** (D-CF-146, revisión M11): el segundo ataque legal de un
  guerrero de nivel 5+ cuenta como acción de más; el aviso es honesto pero ruidoso. Modelar «ataques
  por acción» es 3B/T23.
- **`usar()` no expone `excedido`**: gasta por `gastarSiEnCombate` y descarta el resultado desde la
  tarea A2 (`activities.service.ts`); `resolveAttack` sí lo devuelve.
- **`GET …/actions` deriva la hoja dos veces por llamada** (revisión M6): `getSheet` en `list()` y
  otra vez dentro de `SpellbookService.modificadorDeLanzamiento` (`spellbook.service.ts:~506`), más
  cinco `requireVisibleCharacter` repetidos — ~30-40 consultas por jugador y suceso en vivo (el canal
  invalida todo). Aceptable para cinco jugadores; medir antes de tocar.
- **`mecanica` de conjuros y aptitudes solo trae `{ tipo }`** (D-CF-152): la fila no enseña los
  dados. Si hace falta, derivar la actividad con contexto al listar.
- **Un ataque desde la barra es una reacción a veces** (ataque de oportunidad fuera de turno) y
  `resolveAttack` gasta `ACTION` igual (M11, ya declarado ruido en D-CF-146).

### Del tablero

- **Integración fina con Just Another VTT** (D-CF-150): ficha ↔ token, PG del token que respeten
  `canView`, y la sesión compartida entre la mesa y el VTT. Hoy `boardRoomUrl` solo enmarca la
  sala. (La ficha del 3A.2 «El tablero: Just Another VTT», arriba, es la misma; se cierra allí
  cuando se cierre aquí.)

### Menores de la revisión final que la ola no cerró (con fichero:línea)

- **M4b — la franja «desde aquí te perdiste» no se pinta si el primer suceso no visto cae fuera del
  filtro** — `HiloDeSesion.tsx`, se recorre `enOrdenFiltrado`; con «Números» elegido y un sello sin
  leer, la franja no aparece. (La otra mitad, el id estático, se cerró con `useId`.)
- **M7 — sin unitaria para `fraseDeMotivos`/`fraseDeRecurso`/`fraseDeMecanica`**
  (`apps/web/src/dominio/acciones.ts`, lógica pura) ni para `packages/shared/src/actions.schema.ts`;
  el plan (§File Structure) las prometía. Hoy las cubren las RTL de `BarraDeAcciones` de rebote.
- **I2, mitad no medida** — la banda con asistencia declarada se mide a 1280 (`sesion.spec.ts`);
  entre `lg` (1024) y 1280 los presentes truncan a `max-w-[10rem]` y el título puede quedarse sin
  ancho en la fila del DM. Medir en captura si alguien juega a 1024.
- **`FichaDeElenco`/`FichaDePnj` conservan el clic de superficie para apuntar** (D-CF-155): es
  comodidad de ratón sin anuncio en el DOM; si molesta (apuntar sin querer al leer la tarjeta), es
  quitar el `onClick` del `<li>` y dejar solo `BotonDeApuntar`.

## Dejado por 3A.2 (2026-09-18)

Fichas que dejaron la revisión final de la rama (`review-final-api.md`, `review-final-web.md`) y
la ola de arreglos (`wave-1-report.md`) de `.superpowers/sdd/2026-09-18-3a2-elegir-lanzar-y-usar/`,
no cerradas por decisión explícita del cierre — cada una con su fichero y su porqué.

### API

- **`damageType ?? "FORCE"` inventa un tipo** (API m-4) — `activities.service.ts`, dos sitios:
  `hunters-mark@0`, `acid-arrow@1`, `wall-of-ice@1` no traen `tipoDeDano` en el catálogo y las
  resistencias del objetivo se evalúan contra «FORCE» sin que el conjuro lo diga. Pide `damageType`
  opcional en `pendingDamage` y un valor neutro en `applyDamageModifiers`.
- **Arma mágica sin dos guardas del SRD** (API m-6) — `usar()` caso `encantar`: no comprueba que el
  arma sea «nonmagical» ni evita apilar dos `TemporaryModifier` (+1 +1) si se relanza sobre la misma
  arma. Mínimo: `fueraDeRegla` en la respuesta.
- **La concentración solo se registra al encantar** (API m-7) — `concentrating-<key>` se escribe en
  `caso "encantar"` y en ningún otro `usar(spell:…)`; 126 conjuros de concentración del catálogo
  (`bless`, `hunters-mark`, `hold-person`) no dejan condición al lanzarse. Es mover el bloque fuera
  de `if (esEncantamiento)` y condicionarlo a `spell.duration.concentracion`.
- **`contarTope` y `list()` cuentan poblaciones distintas** (API m-9) — `contarTope` cuenta todas
  las filas `CharacterSpell`; `list()` solo las de la clase actual. Divergen si el DM cambia
  `classKey`.
- **`addDamageExtra` responde 403 donde `damagePreview` responde 404** (API m-10) — mismo lector
  ajeno, dos códigos distintos sobre la misma tirada. Decidir si se unifica (cambia
  `dano-extra.e2e-spec.ts` y `08-pruebas.md`).
- **`damagePreviewSchema` con todo opcional, sin discriminante** (API m-11, D-CF-143) —
  recomendado: unión discriminada `vista: "completa" | "atacante"` en una limpieza aparte (afecta
  `BandejaDeDano.tsx:81`, `p.resulting!`).
- **`upsert` sin candado en `setEstado`** (API m-12) — dos `PUT` concurrentes sobre la misma clave
  nueva pueden chocar en `P2002` → 500 en vez de 409. Riesgo bajo; si se toca, `SELECT … FOR UPDATE`
  sobre `Character` como en `updateSheet`.
- **Explorador sembrado a nivel 1, y `PATCH characters/:id { level }` del DM no re-siembra
  recursos** (API m-13 + informe Task 7) — `arranqueDe("ranger", 1) = []`, y la siembra de
  libro/espacios/dados de golpe solo corre la primera vez que hay clase o al pasar por «Subir de
  nivel» (`useUpdateSheet`); un `PATCH` directo del DM sobre el nivel deja los recursos del nivel
  viejo. No se comprobó si la interfaz ofrece hoy otro camino para subir el nivel sin pasar por
  «Subir de nivel».
- **Semántica de `spell:<key>@N`** (API I-5, D-CF-141) — hoy `usar()` rechaza `N > 0` con 400 hasta
  3B; con `@0` = «la de lanzamiento», la actividad real en la posición 0 del catálogo es
  inalcanzable cuando no es la de lanzar (`hunters-mark`, su `dados` FREE está en `[0]`). 3B (Marca
  del cazador, reacciones) tiene que decidir la semántica real con un test que alcance ese `dados`.
- **Castigo divino sin selector de nivel en la web** (Task 8, Ruling 3) — la API acepta
  `nivelDeEspacio`, pero la pantalla nunca lo manda: siempre gasta `spell-slot-1`. Un paladín de
  nivel 5+ con solo espacios de nivel 2+ no puede elegirlo desde la pantalla hoy.
- **El preview de la bandeja reduce solo el daño base** (Task 8, Ruling 6) — la resistencia que
  `damagePreview.resulting` muestra antes de aplicar no incluye los extras marcados (Furtivo,
  Castigo divino); el total aplicado sí es correcto (`amount + Σ extras`, reducido junto en
  `changeHpEnTransaccion`), solo el número que se ve antes de pulsar «Aplicar» podría discrepar.
- **Marca del cazador, *Shillelagh* y Arma elemental quedan en 3B** (D-CF-130, Task 9 Ruling 1) —
  mismo mecanismo que *Arma mágica* (`ENCANTAMIENTOS`), fuera de alcance a propósito.
- **Perder la concentración no borra el encantamiento** (D-CF-130) — decisión declarada, no un
  defecto: hoy el DM lo quita a mano desde `ModificadoresTemporales`; sigue como límite conocido de
  la mecánica de concentración en general (no solo de encantar).
- **El chip de encantamiento no dice «hasta las…»** (Task 9, Ruling 3) — `ResolvedItem.temporales`
  no lleva `expiresAtClock`; añadirlo exige decidir en qué reloj mostrarlo.
- **Encantar solo ofrece las armas del propio personaje** (Task 9, Ruling 4) — no hay hoy un hook
  que traiga el inventario de un aliado sin pedirlo personaje por personaje; el servidor sí acepta
  encantar el arma de otro (probado por e2e), la limitación es solo de esta pantalla.
- **El corte de respuestas > 64 KB en este PC** (ola de arreglos, fix rounds 2/3/5) — medido:
  `PUT`/`GET …/spellbook` de un mago (~67 KB sin comprimir) se corta intermitentemente con `read
  ECONNRESET` en `supertest`/superagent y en el proxy de Vite, nunca en el navegador (sospecha:
  Norton sobre loopback). El fix round 5 añadió gzip (`@fastify/compress`, D-CF-131) para el
  navegador; **los e2e de API con `supertest` siguen expuestos** porque no mandan
  `Accept-Encoding` — esta tarea lo cierra para `libro-de-conjuros`/`lanzar-conjuros`, pero
  cualquier otro e2e con una respuesta grande puede repetir el síntoma. Medir en el servidor
  (`responseTime` de Fastify + `pg_stat_activity`) si vuelve a aparecer fuera de este PC.

### Web

- **`role="listbox"` con botones** (web m-3) — `LanzarConjuro.tsx` (listas `uno` y encantar) y
  `TirarAtaqueBoton.tsx:342-358`: cada opción es un `<button role="option">` sin gestión de foco por
  flechas. Deuda compartida entre los dos ficheros; arreglar los dos juntos o ninguno.
- **`<summary>` sin marcador visible** (web m-7) — `FilaDeConjuro.tsx:82`, `BloquesDelPie.tsx`: solo
  el anillo de foco delata que el nombre se despliega. Un chevron dibujado de `ui/Iconos.tsx`
  (girado con `[details[open]>&]`) lo resuelve.
- **RTL que faltan** (web m-8, c/d/e) — `objetivos: "uno"` (un clic manda `{ objetivos: [id] }`,
  hoy solo lo cubre Playwright); «Dejar de preparar»/«Quitar» mandan `estado: null` con el rótulo
  del modelo (`rotuloDeQuitar` sin prueba propia); `puedeEditar: false` no pinta ninguna acción ni
  «Lanzar».
- **La captura `conjuros-1280.png` lleva la cabecera pegajosa superpuesta** (web m-11) — artefacto
  de `fullPage: true` con `sticky`; `page.addStyleTag(...)` antes de fotografiar, o capturar solo la
  pestaña.

### Las dos capturas de `e2e-resultados/`

`apps/web/e2e-resultados/conjuros-1280.png` y `conjuros-390.png` seguían sin trackear al llegar a
esta tarea (decisión explícita de la ola: «se limpia o se trackea en el cierre»). **Se añaden con
el commit de este cierre**, como reconocimiento visual — mismo criterio que ya usan
`desbordes`/`color-de-personaje`.

### El tablero: Just Another VTT

Decisión del autor de la madrugada del 2026-09-18: **el tablero oficial es Just Another VTT**
(`~/Desktop/Trabajo/Mine/mini-vtt`), no el `<iframe>` de PlanarAlly que este documento seguía
considerando (ficha «Tablero: sandbox del iframe», arriba). Queda pendiente la integración fina:
ficha ↔ token, y que los PG del token respeten `canView` igual que el resto de la mesa.

## Modo de trabajo desde el 2026-09-18: solo errores (decisión del autor, D-CF-161)

Con la beta 0.1.0 en producción (`a0020a6`, demo sembrada), **3B queda aplazada sin fecha** y
este documento pasa a recibir **fallos vistos jugando**, uno por ficha, con lo que se vio, dónde
y cómo reproducirlo. Lo funcional que 3A dejó fuera está en «Dejado por 3A.2» y «Dejado por
3A.3» y en la Parte B del plan del 14; no se retoma hasta que el autor lo pida.

## Menores dejados por la revisión final de `cierre/antes-de-3a2` (revisión final 2026-09-18)

La ola de arreglos tras `review-final.md` cerró los tres importantes y cuatro menores baratos con
ruling del controlador; estos cuatro se quedan como ficha, tal como dice el veredicto de la
revisión («el resto son menores que pueden quedarse como ficha»).

| Área | Qué | Dónde |
|---|---|---|
| Catálogo | `Collection.tsx` pasa `role="toolbar"` con `ariaLabel`, pero no implementa la navegación por flechas ni el tabstop único del patrón *Toolbar* de WAI-ARIA APG — cada `FilterChip` sigue siendo su propio tabstop. `role="group"` describiría lo que hay sin prometer lo que falta (revisión final 2026-09-18, menor) | `apps/web/src/ui/Collection.tsx:80` |
| Mundo (árbol) | Las raíces plegadas/desplegadas de `DesgloseDelMundo` se calculan una sola vez, en el `useState` inicial (al montar); una raíz que nace vacía y recibe su primera ficha después se queda plegada con el contador en 1 hasta que alguien la pulsa a mano (revisión final 2026-09-18, menor) | `apps/web/src/features/sessions/taller/mundo/DesgloseDelMundo.tsx:497-500` |
| Dados | `id="ventaja-motivo"` está escrito literal en `BandejaDeDados`; hoy no colisiona porque el componente se monta una sola vez por pantalla, pero un `useId` lo haría robusto a un segundo montaje futuro (revisión final 2026-09-18, menor) | `apps/web/src/features/rolls/BandejaDeDados.tsx:289` |
| API / reglas de la mesa | El e2e de concurrencia de `ability-rolls` (`reglas-de-la-mesa.e2e-spec.ts`) prueba el RESULTADO (`[201, 409]` de dos `POST` en `Promise.all`), no el cerrojo: si alguien quitara el `FOR UPDATE`, las dos transacciones podrían serializarse por azar y el test seguiría en verde — falso negativo probabilístico, nunca falso positivo. Decidido en el plan tal cual; se anota para que nadie lo lea como prueba determinista del candado (revisión final 2026-09-18, menor) | `apps/api/test/reglas-de-la-mesa.e2e-spec.ts:307-319` |

> **Cómo se nombra una ficha, y por qué algunas llevan sufijo.** Este documento fue creciendo
> por tandas, y cada tanda repartió identificadores de una letra y un número (`S7`, `U6`, `A1`)
> **sin mirar los que ya existían**. El 2026-09-03 había **siete colisiones** —`A1`, `A3`, `N3`,
> `S10`, `U6`, `U7` y `U8`, cada uno usado dos veces en mitades distintas del fichero—, así que
> «la ficha U6» no señalaba a nada: nombraba dos problemas sin relación. El criterio que las
> deshace, y que se aplica a cualquier colisión futura:
>
> - **Manda la aparición más temprana**, que se queda con el identificador desnudo. No por
>   mérito, sino porque es a la que ya apuntan los enlaces escritos: `07-historial.md` cita
>   `S10` y hay que respetarlo.
> - **La segunda toma un sufijo que dice de qué va**, no un número: `U6-visibilidad`,
>   `A1-avisos`, `N3-notify`. Un `U6b` habría resuelto la ambigüedad para el script y no para
>   quien lee.
> - **Un identificador no se recicla** cuando su ficha se cierra o se archiva. Reutilizarlo
>   rompe las citas de los documentos que ya lo nombraban.
>
> **Y una colisión que NO se deshace, porque deshacerla haría más daño: `D3`.** Nombra **cinco**
> cosas distintas, repartidas por documentos fechados que no se reescriben. Lo que significa, según
> dónde lo leas:
>
> | Dónde | Qué es |
> |---|---|
> | `docs/decisiones.md` y el plan 05 | **El color de cada personaje** — decisión del autor, aplicada |
> | El plan 15 y la auditoría de la cola larga | **La API no tiene endpoint de salud** — cerrada |
> | Este documento, hasta el 2026-09-08 | **Una invitación no se puede listar ni revocar** — la cerró el plan 11, que la llamó `D3b`, y este documento la siguió listando como P1 abierta hasta que el reconocimiento del 2026-09-08 la archivó. **La contradicción vivía entre esta tabla y el cuerpo**, que es la razón por la que esta fila se conserva |
> | `superpowers/plans/2026-09-02-plan-interfaz-y-contenido.md` | **El alcance de la línea de tiempo** |
> | `superpowers/specs/2026-09-02-auditoria-interfaz.md` | **«Ningún elemento memorable»** |
>
> **Se declara en vez de renumerarse** porque cuatro de las cinco viven en registros fechados, y
> reescribir una cita de un documento fechado rompe justo lo que el criterio de arriba protege. Si
> hace falta nombrar una sin ambigüedad, se dice **con su documento delante**: «la D3 del plan 15»,
> no «D3».

> ## La copia de seguridad de esta base: DECIDIDO QUE NO, y no se vuelve a plantear
>
> **Decisión del autor, reafirmada el 2026-09-05, y SIN fecha de caducidad.** Sus palabras: *«no
> quiero copia de seguridad de la base de datos de este proyecto. Sé que es importante, pero
> estamos en una etapa muy verde de pruebas; las pruebas las hacen agentes y yo moviendo una o dos
> cosas. **No hay usuarios, no hay campañas**, esto ni siquiera es para vender a corto plazo»*.
>
> **No se propone, no se arregla y no se menciona** — ni antes de desplegar, ni antes de una
> migración, ni como nota al margen de otra cosa. La premisa que hace importante una copia —que
> haya algo que perder— **no se cumple**, y está evaluada, no ignorada.
>
> **Esta ficha llevaba escrita su propia caducidad** —*«antes de la primera partida real, esto tiene
> que estar hecho y probado»*— y era ella la que resucitaba el asunto en cada lectura: el 2026-09-05
> lo sacaron tres veces en una sola conversación, citándola. **La caducidad se retira**: quien lea
> esto no tiene que avisar de nada. Cambia el día que haya usuarios o campañas de verdad, **y ese
> día lo dice el autor**.
>
> Lo medido en su momento sobre el script roto —`$POSTGRES_PASSWORD` sin comillas simples, 20 bytes
> contra 6305— se conserva en
> [`_archivo/pendientes-cerrados-hasta-2026-09-05.md`](./_archivo/pendientes-cerrados-hasta-2026-09-05.md).
> Aquí no.

> ## Alineado con el código el 2026-09-05, y lo que eso enseñó
>
> Las 55 secciones se leyeron y se contrastaron **contra el árbol**, no de memoria
> ([la auditoría entera](./superpowers/specs/2026-09-05-auditoria-cola-larga.md)). **Siete fichas
> afirmaban que faltaba algo que ya estaba hecho**, y una —M10— era falsa en su primera mitad y
> cierta en la segunda, así que se ha partido en dos.
>
> **Y todas tenían su evidencia escrita, que era cierta el día que se escribió.** Esa es la lección
> que se lleva a la forma de este documento: **una ficha con un barrido citado dentro envejece igual
> que el código**. Desde ahora, lo que se tacha lleva **la prueba de cuándo** —fecha y
> `fichero:línea`—, no solo la prueba de qué.
>
> **Lo que queda vivo está planificado**, uno por fichero y con su trazabilidad ficha → plan, en
> [`superpowers/plans/2026-09-05-planes/`](./superpowers/plans/2026-09-05-planes/00-INDICE.md).
> Lo que **ningún plan cubre y por qué** también está dicho allí.

Deuda conocida y decisiones abiertas. Cada línea: qué, por qué importa, y la evidencia de
que existe. **Subir de nivel de verificación o pagar deuda es una tarea con su ficha, nunca
un efecto colateral de la siguiente funcionalidad.**

Última revisión: **2026-09-13, noche** (la ficha «Desbordes» se cerró en la rama `desbordes/antes-del-paso-3`
y está archivada en `_archivo/pendientes-cerrados-2026-09-13-desbordes.md`; queda la de la experiencia, que va
a puerta de efectos). Antes, el mismo día (cierre de la tanda del pulido — Tarea 15: los 24 puntos del
anexo del autor pasados uno a uno, las fichas menores que la revisión final dejó abiertas, y una
regla candidata de proceso, todo en la sección de abajo). Antes, el mismo día, la ronda de
revisión de la tarea 11 del pulido (C4 #15: un follow-up de e2e, más abajo). Antes, **2026-09-12** (la hoja a página completa dejó ocho fichas menores, en su sección de abajo — eran HP-1..8; la revisión final del plan cerró HP-2 con código, la ronda de cierre del mismo día cerró HP-3 a HP-7 y la ronda de cierre 2 cerró HP-1 y HP-8 con la decisión del autor, las ocho enteras en [`_archivo/pendientes-cerrados-2026-09-10.md`](./_archivo/pendientes-cerrados-2026-09-10.md); HP-9 —objetos mágicos con efecto— se partió en dos: HP-9a «sintonizar cuenta» **se cerró el 2026-09-12 en tres tareas** (D-CF-48, entera en el mismo archivo) y HP-9b espera **después del paso 3** (D-CF-47); al cerrar HP-9a se abrió HP-10 (la fila solo ponía cifra al efecto `ac`; los otros ocho tipos llevaban la marca sin nada tachado) y **se cerró el mismo 2026-09-12 en una tarea** (entera en el mismo archivo); antes, el 2026-09-11, la sesión de cerrar fichas: cada ficha cerrada con código va entera a [`_archivo/pendientes-cerrados-2026-09-10.md`](./_archivo/pendientes-cerrados-2026-09-10.md) con su medición; y el día anterior, la **poda**: 39 bloques fuera —dieciséis fichas o mitades que el
código desmentía, doce tachadas que seguían aquí contra la regla de la cabecera, y once que los
cuatro pasos de `04-convenciones.md` convirtieron en decisión declarada o en «no es ficha»—, todo
entero en
[`_archivo/pendientes-cerrados-2026-09-10-poda.md`](./_archivo/pendientes-cerrados-2026-09-10-poda.md);
y tres fichas que salen de «decide el autor» porque los cuatro pasos las contestan: `start()` con
dos DM, `U10` y `M2B-14`. Antes, el 2026-09-08, el **reconocimiento**: unas cincuenta y cinco fichas leídas contra
el árbol, **dieciocho archivadas por falsas** —cuatro de ellas P1— y el resto de las tocadas
corregidas en sitio: **ocho citas de línea desplazadas**, dos enunciados que iban al revés (`J6` y
`N4`), la lista de `viewerFor` que había crecido de cinco servicios a trece, y varias mitades
falsas retiradas de fichas que siguen abiertas por la otra mitad; antes, el mismo día, el resto de
la ficha P3, que se
archivó creyendo cerrada una deuda que sigue viva en `advanceTurn()` y `setInitiative()`; y antes,
los quince planes de
[`superpowers/plans/2026-09-05-planes/`](./superpowers/plans/2026-09-05-planes/00-INDICE.md),
que cerraron catorce y dejaron el 12 en marcha; y el saneamiento del mismo día: 37 fichas tachadas
archivadas, 59 fechas corregidas y la ficha de la copia de seguridad cerrada como decisión). **La
fecha de esta línea se actualiza al añadir una sección** — se quedó en el 2026-09-02 con tres
secciones del día siguiente ya escritas debajo, y otra vez en el 2026-09-04 con las del 05 ya
dentro. Las dos las cazó una auditoría, no una revisión.

## Dejado por «efectos de mesa» (2026-09-15) — fusionada y desplegada (`334912b`)

**EM-1 cerrada el 2026-09-17 (archivo):** ver
[`_archivo/pendientes-cerrados-2026-09-17-cierre-antes-de-3a2.md`](./_archivo/pendientes-cerrados-2026-09-17-cierre-antes-de-3a2.md).

### EM-2 · Crítico, bloqueo y esquiva no tienen efecto

El crítico vive en el registro (`HP_CHANGED.critical`), no en la hoja, y el detector solo compara
hojas: hoy un golpe «fuerte» es ≥ 25 % del máximo, sin decir «crítico». Bloquear y esquivar no
tienen suceso propio. Si se quieren, la ficha tendría que leer también el hilo de sucesos del
personaje.

## Lo que 3A.1 dejó como texto (2026-09-14; conteos regenerados en la ola de arreglos)

**«El libro entra»** convirtió 319 conjuros, 234 aptitudes de clase/subclase y los rasgos de raza
del SRD 5.1 a `Actividad`, con nombre y prosa del SRD español oficial. Lo que sigue son los
conteos de lo que **se quedó como texto** —sin esa actividad, prosa completa en
`textEn`/`textEs`— y de las traducciones propias, **copiados de
`apps/api/src/rules/catalog/generado/rechazos.md`** (GENERADO, no se edita a mano; es la fuente,
y cada línea de allí lleva su motivo). Ver [decisiones.md](./decisiones.md), sección «Ejecución de
3A.1», D-CF-92 a D-CF-107, y la ola de arreglos D-CF-108 a D-CF-115.

> Hasta la ola de arreglos este bloque decía «0 aptitudes de clase y 0 rasgos de raza cayeron
> aquí» y `rechazos.md` decía «_ninguno_» para aptitudes: era falso (la revisión final contó 14
> aptitudes fuera y 4 con `usos` descartados sin rastro, C5). El informe tira ahora el motivo de
> TODO lo que no entra, en dos tablas —«fuera de A por decisión de autor» y «hueco de esquema o
> fórmula rechazada»— y este bloque se copia de él, no al revés.

**Fuera de A por decisión de autor** (tipos de Foundry que no se automatizan, D-CF-103/constraints
«No entra»): **47 actividades de conjuro** —`summon` 29, `enchant` 11, `transform` 6,
`teleport` 1— en 45 conjuros distintos, y **1 aptitud** (`druid:wild-shape`, `transform`).
Invocar, transformar y encantar como mecánica es trabajo de B.

**Hueco de esquema o fórmula rechazada** (`Origen`/`Actividad` no tienen forma para esto; cada
línea de `rechazos.md` dice cuál): **19 actividades de conjuro** en 18 conjuros, **31 de aptitud**
en 29 aptitudes y **13 de rasgo de raza**. Por causa:

| Causa | Conjuros | Aptitudes | Razas | Ejemplo |
|---|---|---|---|---|
| `check.ability` vacío (una prueba sin característica) | 8 | 1 | 3 | `minor-illusion`, `dwarf:stonecunning` |
| Daño en varias partes — `expresionDeDados` es UNA expresión con UN tipo (I1: antes se recortaba a la primera parte en silencio) | 3 | — | — | `ice-storm` 2d8 + 4d6, `meteor-swarm`, `flame-strike` |
| `duration.units` sin equivalente (`turn`) o `duration.value` por fórmula (hueco B-bis) | 5 | — | — | `blink`, `magic-circle` |
| `onSave: full` — el daño entra entero aunque se salve, y `siSalva` solo dice ninguno/mitad (I5) | 1 | — | — | `feeblemind` |
| `save.ability` vacío / expresión sin dados ni bonus | 2 | — | — | `delayed-blast-fireball`, `spare-the-dying` |
| Consumo con destino a un **UUID de compendio** (Ki, Puntos de hechicería) — sin un recurso que el personaje tenga, el botón daría 409 (C3) | — | 15 | — | los cinco rasgos de ki del monje, Palma Vibrante, las ocho metamagias |
| Consumo variable = efecto (hueco C, D-CF-105) | — | 5 | — | `paladin:lay-on-hands`, `sorcerer:font-of-magic`, `cleric/life-domain:blessed-healer` |
| Fórmula fuera de las nueve formas de `Origen` (`5*nivel`, `3*nivel`, `5 + @mod`, `max(…)`) | — | 5 | — | `channel-divinity-preserve-life`, `wholeness-of-body`, `survivor`, `dark-ones-blessing`, `song-of-rest` |
| CD de característica de una clase que no lanza (8 + competencia + mod de X) — `Origen` no tiene esa forma (I6) | — | 2 | 10 | `monk/open-hand:tranquility`, `berserker:intimidating-presence`, los diez Ataques de Aliento (CD de Constitución) |
| Dados por tabla de escala entera (hueco A, D-CF-104) | — | 2 | — | `rogue:sneak-attack`, `life-domain:divine-strike` |
| Consumo negativo (reposición, no gasto) | — | 1 | — | `bard:superior-inspiration` |

**Cuatro aptitudes con `uses.max` que no cabe en `Origen`** (I2: el rasgo se queda sin `usos`, y
por tanto sin fila de recurso ni `grant`; antes se descartaba en silencio): `bard:bardic-inspiration`
y `paladin:cleansing-touch` (`max(1, @abilities.cha.mod)`), `paladin:divine-sense`
(`1 + @abilities.cha.mod`) y `paladin:lay-on-hands` (`5 * @classes.paladin.levels` — D-CF-105
pedía «usos a mano si cabe»: no cabe, `Origen` no multiplica, así que solo texto).

**Nueve concesiones que `enriquecerClases` NO construye** (C3, `CONCESIONES_SIN_RECURSO` en
`apps/api/src/rules/catalog/generado/index.ts`, comprobadas por `generado.spec.ts`): las cuatro Inspiraciones Bárdicas
(d6–d12), Palabras Cortantes y Habilidad Sin Parangón (consumen esa Inspiración), Sentidos Divinos
y Toque Purificador (sus `usos` no caben) y Canalizar Divinidad del Juramento de Devoción (consume
la de paladín, que `classes.ts` no declara como rasgo base). Reglas de la ola: un `grant` solo se
construye si cada recurso que consume lo siembra un rasgo con `usos` de la misma clase, y solo
una `ClassFeature` por aptitud de Foundry lo lleva (`channel-divinity-1`, no `-2`/`-3`).
**Fuente de Magia** (`nivelDeClase(sorcerer)` en sus usos) tampoco llega a la hoja: sus dos
actividades son hueco C.

**Cinco aptitudes con nombre oficial pero sin prosa en español** (T3b, corte por nombre sin
coincidencia en `srd-5.1-es.txt` — se quedan con `textEn` y sin `textEs`, 228/233 de las que sí
tienen nombre oficial):

- `bard/lore:additional-magical-secrets` → «Secretos mágicos adicionales»
- `cleric:channel-divinity-turn-undead` → «Canalizar Divinidad: Expulsar Muertos Vivientes»
- `druid/circle-of-the-land:circle-spells` → «Conjuros de círculo»
- `warlock/the-fiend:expanded-spell-list` → «Lista de conjuros ampliada»
- `wizard:signature-spells` → «Conjuros característicos»

**Cinco `ClassFeature` de `classes.ts` sin fila en el generado** (menor 6 de la revisión; llevan
su propio nombre como texto y `sinTraduccion: true`, y `generado.spec.ts` fija la lista):
`paladin:aura-improvements`, `paladin/oath-of-devotion:oath-spells`,
`ranger:favored-enemy-improvement`, `ranger:favored-enemy-improvement-2`,
`ranger:natural-explorer-improvement` — rasgos sintéticos de `classes.ts` que Foundry no modela
como fichero propio.

**Once traducciones propias** (D-CF-106: el SRD español no nombra estos ítems, y en vez de
dejarlos en inglés marcado llevan un nombre nuestro, marcado `traduccionPropia: true`): la dote
`feat:grappler` («Presa», un FEAT del manual del jugador sin equivalente en el SRD 5.1; desde la
ola de arreglos con `class: "feat"`, no «fighter nivel 1») y los diez colores del rasgo racial
«Ataque de Aliento» del dracónido (`dragonborn`), que en el SRD es una sola tabla genérica
color→tipo de daño sin nombre propio por color.

**Cero conjuros o aptitudes sin ningún nombre** (`sinTraduccion` en el JSON): el ruling de
traducción propia cerró los últimos huecos de nombre.

**Lo que esta ola dejó para después, dicho aquí:** (1) resolver los UUID de compendio a la clave
de la aptitud que consumen (índice `_id → key`) devolvería a A los cinco rasgos de ki y las ocho
metamagias, pero exige que 3A.2 cablee un recurso compartido entre rasgos — hoy se rechazan con
motivo; (2) una forma `cdDeCaracteristica(ability)` en `Origen` daría CD a Golpe Aturdidor,
Presencia Intimidante y los Ataques de Aliento; (3) `activacion.type` `special` y `""` caen los
dos en `FREE` (menor 10) porque `Coste` no distingue «parte de otra acción» de «sin
activación»; (4) los cuatro nombres corregidos al SRD (Mejora de Característica, Duelo, Combate
con Armas a Dos Manos, Aguante Enano) viven en el JSON generado — `classes.ts`/`races.ts`
conservan los de 2A.3 como rótulo de la hoja, y cambiarlos barre e2e (no en esta ola);
(5) `mezclarScales` expone tablas de escala que no son «un número que se suma» (Ataque Furtivo
como número de dados) — hoy ninguna actividad las usa.

## Dejado por «puerta de efectos» (2026-09-14) — cerrada en rama, sin fusionar ni desplegar

Rama `puerta-de-efectos/antes-del-paso-3`; revisión Opus de la rama entera en dos mitades
(`.superpowers/sdd/2026-09-13-puerta-de-efectos/review-api-final.md`: 3 críticos, 3 importantes,
14 menores; `review-web-final.md`: 1 crítico, 10 importantes, 15 menores) — **los 17 críticos e
importantes cerrados en la ola 1** (`5b71c07`, `54379a0`; re-revisión `re-review-wave-1.md`: 17/17,
0 nuevos) y tres fallos de Playwright en la ola 2 (`49d6e46`). P2-4, P2-5 y «XP: no existe» están
archivadas en [`_archivo/pendientes-cerrados-2026-09-14-puerta-de-efectos.md`](./_archivo/pendientes-cerrados-2026-09-14-puerta-de-efectos.md).
Lo que queda:

### PE-1 · Menores aplazados de las dos revisiones y de la re-revisión (con su línea en los informes) — cerrada el 2026-09-14

| | Qué | Coste |
|---|---|---|
| API | ~~`rollAttack` (DAMAGE) acepta un `attackRollEventId` de **otro** ataque del mismo personaje para colgar `pendingDamage`; casar también por `attackRef` — toca el camino M6/R3, muy probado~~ — **cerrada (2026-09-14, `pe-1/cierre`)** | cerrada |
| API | ~~`pendingDamage.targetCharacterId` viaja en el `ABILITY_ROLL` del daño con la visibilidad del **atacante**~~ — **aceptado, D-CF-89 (2026-09-14)** | cerrada |
| API | ~~El dueño de un PNJ jugable con plantilla `DM_ONLY` puede cambiarle los PG~~ — **aceptado, D-CF-90 (2026-09-14)** | cerrada |
| API | ~~`answer()` no reintenta al fallar la aplicación del efecto~~ — **se deja, D-CF-91 (2026-09-14)** | cerrada |
| API | ~~`XpService.award` bloquea las filas en el orden de entrada (interbloqueo teórico si dos DM premian a la vez en orden cruzado); ordenar por `id` como `destinatariosOrdenados`~~ — **cerrada (2026-09-14, `pe-1/cierre`)** | cerrada |
| Web | El espacio fino de miles (U+202F) en `frasesDeXp` rompería los `getByText` de e2e/RTL si se cambiara; queda el espacio normal | — |
| Web | ~~Con la tirada a ciegas, «salvó/falló» de `effectApplied` revela el resultado al que responde~~ — **decidido, D-CF-88: se oculta el veredicto; cerrada (2026-09-14, `pe-1/cierre`)** | cerrada |
| Web | La bandeja pide el preview también en tarjetas ya aplicadas (quitarlo perdería la línea del daño reducido para el DM) | — |
| Web | ~~`GrupoDeRadios` existe tres veces (`ReglasDeLaMesa`, `Condiciones`, `DarXp`): subir a `ui/`~~ — **cerrada (2026-09-14, `pe-1/cierre`)** | cerrada |
| Web | ~~`DarXp` dentro de `CapaDeCombate` no va con `key` por propuesta: dos combates seguidos reutilizan el estado del formulario~~ — **cerrada (2026-09-14, `pe-1/cierre`)** | cerrada |
| e2e | ~~El bucle «hasta impactar» de `puerta-de-efectos.spec.ts` es probabilístico (CA 1, tope 10); un `data-*` en `TirarAtaqueBoton` lo haría determinista~~ — **cerrada (2026-09-14, `pe-1/cierre`)** | cerrada |
| e2e | `iniciativa-en-vivo.spec.ts` estaba **rojo en `main` desde D-CF-66** (`4ea688c`): la jugadora fijaba `level: 8` por el `PATCH` y ahora es 403; se quitó el `level` del helper en esta rama (`8b6…`, ver historial) | hecho |

### PE-2 · Un e2e de concurrencia real para `apply-damage` y `POST /xp` — **cerrada el 2026-09-14 en `pnj-del-mundo/cierre`**

Las unitarias prueban el orden de las sentencias (`jsonb_set … WHERE appliedEventId IS NULL`,
`FOR UPDATE`), no el bloqueo de Postgres. Un e2e con dos `POST …/apply-damage` en paralelo (uno
201, uno 409) y dos `POST /xp` cruzados cerraría la duda. 40 min. Misma deuda que la de
`ability-rolls` en RM-2.

**Cerrada:** `apps/api/test/concurrencia-puerta.e2e-spec.ts` — dos `apply-damage` en `Promise.all`
(exactamente un 2xx y un 409, un solo `HP_CHANGED`) y dos `POST /xp` iguales en `Promise.all` (los
dos 2xx, XP final es la suma). Escrita, no corrida (la corre el orquestador).

## Desplegar `main` (`84ed965`): reglas de la mesa + desbordes — **hecho el 2026-09-14 (`b6bbeb0` en producción, comprobado en el contenedor)**

**Abierta, del autor.** `main` lleva dos tandas fusionadas el 2026-09-13 que producción (`6d2b2ca`) no
tiene. Qué trae el despliegue: **una migración aditiva** (`20260913100000_table_rules`: tres columnas/
tabla nuevas con defaults; la API la aplica sola al arrancar con `prisma migrate deploy`), **ninguna
variable de entorno nueva**, y ningún cambio de topología (`TRUST_PROXY` sigue en 2). Comprobar
después: `docker ps` con API y web `healthy`, `curl` 200, el bloque «Reglas de la mesa» en Ajustes de
una campaña, y el panel de ataque entero sobre un PNJ con encuentro activo (el caso que abrió la
tanda de desbordes). Cierra cuando `docs/00-INDEX.md` y esta ficha digan el commit que sirve el
servidor, medido allí y no de memoria.

## Dejado por «reglas de la mesa» (2026-09-13) — fusionada a `main` el mismo día, sin desplegar

Rama `reglas-de-la-mesa/antes-del-paso-3`; revisión Opus de la rama entera en
`.superpowers/sdd/2026-09-13-reglas-de-la-mesa/final-review.md` (0 críticos, 4 importantes —los
cuatro cerrados en dos olas—, 14 menores). RM-1 (¿pierde el dueño el nivel a mano?) **la decidió el autor el mismo día**: el
nivel es del DM (D-CF-66, hecha en la ola 3).

RM-2 cerrada el 2026-09-17, en el archivo.

## Cierre de la tanda del pulido antes del paso 3 (2026-09-13, Tarea 15)

Rama `pulido/antes-del-paso-3`, 43 commits sobre `0ebdd9f`, sin fusionar todavía. Lo que sigue son
los 24 puntos del anexo del autor uno a uno, las fichas menores que la revisión final dejó
abiertas a propósito, y una regla candidata de proceso.

### Los 24 puntos del anexo (`superpowers/specs/2026-09-12-pulido-anexo-lista-del-autor.md`), uno a uno

| # | Qué pedía | Estado |
|---|---|---|
| 1 | Acciones de la fila del elenco se salen de la tarjeta | **Cerrado** — `ui/MenuDeAcciones.tsx`, Tarea 8 (`e61b865`…`6b54aa4`, cuatro rondas) |
| 2 | Hoja como «tablas y tarjetas», poco legible | **Parcial.** C1 (Tareas 1–4) rehizo casillas, espacios y rejillas; **si tras esto el autor la sigue viendo como tablas, lo mide el autor en producción** — no hay más maquetación a ciegas sin su lectura sobre el resultado desplegado |
| 3 | Casillas de los cinco números no simétricas | **Cerrado** — `Casilla` a `6rem` con `nowrap`, Tarea 1 (`cae172f`…`2bce0e0`, cinco rondas) |
| 4 | PG con «+5 temporales» más ancho que las demás | **Cerrado** — misma `Casilla`, Tarea 1 |
| 5 | Falta reparto/tirada de características al crear personaje | **En otra spec** — `superpowers/specs/2026-09-12-reglas-de-la-mesa-design.md`, respuesta del autor bajo la lista del anexo; segunda tanda tras esta (D-CF-52) |
| 6 | Sticky del detalle de Objetos se corta bajo la banda fija | **Cerrado** — `--banda-fija-alto` vía `ResizeObserver`, Tarea 4 (`a3ec1bf`…`ee4eaa6`) |
| 7 | Huecos en Ficha/Rasgos y aptitudes/Personalidad | **Cerrado** — sub-rejilla en `Rasgos.tsx` (Tarea 2, `6253b2f`) + medida de toda tarjeta en `espacios.spec.ts` (Tarea 4) |
| 8 | *Tearing* al escribir (la tarjeta cambia de tamaño) | **Cerrado** — `Field.reservaEspacio` (Tarea 2) + `SelectorDeVentaja` siempre montado (Tarea 10, ronda 2, `fb72ed0`) + guía de CD de `PedirTirada` esperada en la medida (Tarea 8, rondas 4–5) |
| 9 | «Su color»/visibilidad/Archivar-Borrar desordenados | **Cerrado** — `AjustesDePersonaje` a `TarjetaDeHoja` con pie, Tarea 3 (`9933b5e`, `2bf1a85`) |
| 10 | Formulario de dados poco intuitivo | **Cerrado** — bandeja de dados, Tarea 10 (`430e703`…`fb72ed0`, dos rondas) |
| 11 | El resultado de varios dados da un solo valor | **Cerrado** — `dice[]` por dado, Tarea 9 (`12af590`) + pintado por dado en `ResultadoDeTirada`, Tarea 10 |
| 12 | Los atajos de dado comparten el mismo glifo | **Cerrado** — `IconoDado({caras})`, seis siluetas, Tarea 7 (`c1677f3`) |
| 13 | Dados 3D con física de verdad | **Aplazado por el autor** — ficha con referencia (`dice-box`) en la sección «#13 · Dados en 3D…» de este documento |
| 14 | Cajón «La mesa tira» mal distribuido | **Cerrado** — rejilla del reloj, Tarea 3 (`9933b5e`) + bandeja compacta, Tarea 10 |
| 15 | El hilo no nombra sujeto ni objetivo | **Cerrado** — `sourceCharacterId` + `nombres-del-hilo.ts`, Tarea 11 (`64330ac`, `cdf8d00`) |
| 16 | «Dados» de campaña: reloj y formularios mal repartidos | **Cerrado** — misma rejilla de la 14, Tareas 3 y 10 |
| 17 | «Espacios perdidos» en varias pantallas | **Cerrado** — `medirHermanas` audita toda tarjeta de cada pestaña, Tarea 4 (`a3ec1bf`…`ee4eaa6`) |
| 18 | Salir de la mesa lleva a todas las campañas | **Cerrado** — `BandaDeMesa.tsx`, Tarea 12 (`aabd016`) |
| 19 | Faltan ajustes del DM antes de la hoja de cada jugador | **En otra spec** — `reglas-de-la-mesa-design.md`, bloque completo por la respuesta del autor bajo el anexo |
| 20 | Botones de PG temporales del bestiario parecen no hacer nada | **Cerrado** — `preguntando` explícito, Tarea 13 (`28e4afb`, `3dd2786`) |
| 21 | Catálogo de objetos sin filtros | **Cerrado** — `FilterChip` por tipo y origen, Tarea 14 (`df15c30`) |
| 22 | Botones primarios sin icono | **Cerrado** — barrido de botones, Tarea 7 (`c1677f3`…`1c30fe8`) |
| 23 | El grafo del mundo poco intuitivo | **Cerrado** — el mundo como árbol + detalle sustituye al tablero telaraña, Tarea 14 bis (`f38823b`…`a69d069`, D-CF-64) |
| 24 | Falta la línea de tiempo comentada | **En otra spec, y aplazada** — no era la crónica: es el mapa de historia del DM (`mapa-de-historia-del-dm-design.md`), y el autor lo aplazó el 2026-09-12 tras ver cuatro maquetas (D-CF-64) |

Ninguno de los 24 queda sin fila. Los tres que no cierran en esta rama (#5, #19, #24) tienen su
spec ya escrita; el pulido no los toca porque cambiarían de tanda a mitad de ejecución.

### Fichas menores dejadas por la revisión final de la rama (2026-09-13)

La revisión final (`0ebdd9f..a69d069`) y las revisiones de cada tarea diferieron minors «al cierre
de la tanda» en vez de abrir una ficha por cada uno a mitad de una tarea ajena (regla de los
cuatro pasos, `04-convenciones.md`). Los que siguen sin código son estos, agrupados por área; los
ya corregidos en la ola de arreglo final (`0a8689e`) no están aquí. Lo descartado como ruido —
citas de una nota fechada, con coste nulo si envejecen mal— se dice con su motivo al final.

| Área | Qué | Dónde |
|---|---|---|
| Hoja | El desnivel de Rasgos, Recursos y Estado queda sin ejercitar por construcción: con el contenido de hoy (guerrero nivel 1, sin conjuros) esas pestañas casi nunca tienen dos tarjetas comparables en la misma columna — `espacios.spec.ts` lo declara como cláusula honesta, no lo mide | `apps/web/e2e/espacios.spec.ts` (leer la cláusula antes de tocar) |
| Mundo (árbol) | El anillo de vecinos se solapa con 9 o más vecinos a la vez — **P-2 (2026-09-17)**: se juzga usándolo; se mira cuando el árbol se vuelva a tocar | `apps/web/src/features/sessions/taller/mundo/AnilloDeVecinos.tsx` |
| Mundo (árbol) | «Leer más» se muestra siempre, incluso cuando el cuerpo ya cabe sin recortar — **P-2 (2026-09-17)**: se juzga usándolo; se mira cuando el árbol se vuelva a tocar | `apps/web/src/features/sessions/taller/mundo/DetalleDeFicha.tsx` |
| Mundo (árbol) | El chip «Sin hilos» se solapa con el buscador en pantallas estrechas — **P-2 (2026-09-17)**: se juzga usándolo; se mira cuando el árbol se vuelva a tocar | `apps/web/src/features/sessions/taller/mundo/DesgloseDelMundo.tsx` |
| Mundo (árbol) | El editor de hilos queda bajo el pliegue a 1280×800 — **P-2 (2026-09-17)**: se juzga usándolo; se mira cuando el árbol se vuelva a tocar | `apps/web/src/features/sessions/taller/mundo/EditorDeHilos.tsx` |

**Descartado como ruido, con motivo** (no entra como ficha): la cita de Epip «resolver functions»
en la nota de diseño y el hilo de Steam sin etiquetar como fuente débil (Tarea 0) — son citas de
una nota fechada que no se reescribe, sin efecto sobre código ni interfaz; la asimetría de
`docs-lint-ignore` entre D-CF-58 y D-CF-59 (Tarea 0) — cosmético del propio control de estilo de
los documentos; el «+» semánticamente raro en «Crear cuenta» (Tarea 7) — nomenclatura preexistente
fuera del alcance del barrido de iconos; `PonerDano` consultando personajes por su cuenta en vez
de recibirlos por prop (Tarea 11) — TanStack Query los deduplica, así que no hay petición de más
en la red, y forzar la prop sería refactor sin beneficio medible; `DieRolled` definido dos veces
(evaluador y `@dnd/shared`, Tarea 9) — frontera consciente, declarada en el propio código; y el
**#12 de la revisión final** —«Dárselos»/«Quedarse con los N nuevos» de `DarTemporales` parecían
poder deshabilitarse— **ya está cerrado**: la ola de arreglo final (`0a8689e`) los dejó siempre
habilitados con error en línea, la misma regla que el resto de botones de esta tanda; no abre
ficha.

> ## Decidido el 2026-09-10 y todavía abierto — el trabajo que queda, con su decisión tomada
>
> El autor aprobó las recomendaciones de la sesión de cerrar fichas (`D-CF-2` a `D-CF-21` en
> [decisiones.md](./decisiones.md)). Lo que ya no espera decisión, solo manos:
>
> | Ficha | Qué se decidió | Dónde se hace |
> |---|---|---|
> | ~~X1 `RestKind`~~ · ~~enlaces sin rótulo~~ · ~~J5 muerte~~ · ~~I4/M2B-5 sobrecarga~~ · ~~I3/M2B-15 identificado~~ · ~~`race`/`class`~~ · ~~suceso de cambio de cantidad~~ (hechas) | D-CF-14 a 16: una migración cada una | **Tanda de migraciones** al cerrar la fase 2; `race`/`class` **se borran sin medir** (D-CF-27, 2026-09-11: el diálogo ya usa el catálogo). J7 salió de la tanda: es unión sin migración, D-CF-24 |
> | S4 rasgos raciales · M2B-4 cargas | D-CF-20/21: por el conversor de Foundry | **Paso 3**, tareas 2b y `uses` de objeto |
> | R1 límite por IP · D8 correo · P3 archivar en la mesa · H7 rearmar · E0 TipTap · P6 Node | D-CF-12, 13, 17, 18, 19 y H7 «se rearma editando» | **Esta sesión**, con código |
> | P2 mesa a 390 px | **Aplazada por el autor el 2026-09-11** (D-CF-26): quiere un diseño responsive nuevo y busca referencias él | Cuando el autor traiga el diseño; ninguna de las tres salidas de abajo se toca |
>
> Las fichas siguen en su sitio de abajo hasta que su commit las archive; esta tabla dice que
> ya no son «decide el autor».

> **El orden de las secciones NO es fiable.** Este documento dijo durante meses que iban «de lo más
> reciente a lo más viejo» y no es cierto: hay bloques del 2026-09-04 y del 05 incrustados en medio
> del sedimento de la fase 1. **Busca por identificador o por texto, nunca por posición.**
> Reordenarlo mueve 1200 líneas y no se ha hecho a propósito: el riesgo supera al beneficio.

## Dejado por la tarea 11 del pulido (C4, #15), ronda de revisión (2026-09-13) — **cerrada el 2026-09-14 en `pnj-del-mundo/cierre`**

**Cerrada.** `dano-con-su-traza.e2e-spec.ts` gana «un origen que SÍ existe pero este actor no ve es
404, y no se escribe nada (tarea 11)»: el DM baja un PNJ `DM_ONLY` y el jugador dueño de su propio
personaje lo cita como `sourceCharacterId` al cambiarse sus PG → 404, sin `HP_CHANGED` nuevo.
Escrita, no corrida (la corre el orquestador).

**e2e: un dueño citando un PNJ `DM_ONLY` como `sourceCharacterId` es 404.** `changeHp`
(`apps/api/src/characters/character-sheet.service.ts`) valida el origen con
`requireVisibleCharacter`, y `dano-con-su-traza.e2e-spec.ts` cubre el caso «no existe en la
campaña» — falta el caso «existe, pero este actor concreto no lo ve» (un PNJ que el DM bajó
`DM_ONLY`, citado por un jugador que no es su dueño ni el DM). El mismo 404 uniforme que ya
prueba `ataque-comparado-en-el-servidor` para `sePuedeApuntar`; se deja anotado y no se añadió
en la ronda de revisión por no ensuciar un fix con un caso nuevo — Después de esta rama, con
código.

## Dejado por la hoja a página completa (2026-09-12)

Lo que las revisiones de las diez tareas de la rama `hoja/pagina-completa` dejaron abierto **a
propósito**: nada de esto bloqueaba una tarea y todo se anotó en el ledger para llegar aquí. La
pregunta 1 del §10 de la spec del 2026-09-06 —qué pestaña abre por defecto— **no estaba aquí**:
vivía solo en la spec, y la contesta D-CF-32 (Números); la spec lleva su nota al pie.

> **HP-3 a HP-7 se cerraron el 2026-09-12 en la ronda de cierre del plan, y HP-1 y HP-8 en la
> ronda de cierre 2 del mismo día**, con la decisión del autor (D-CF-45, D-CF-46). Las siete,
> enteras, en
> [`_archivo/pendientes-cerrados-2026-09-10.md`](./_archivo/pendientes-cerrados-2026-09-10.md).
> Queda aquí la que abrió HP-8 al mirar qué hace hoy la sintonización: HP-9, que el autor decidió el
> mismo día —**se hace después del paso 3** (D-CF-47)— y que **el 2026-09-12, más tarde, el autor
> partió en dos** (D-CF-47 enmendada): la mitad que es un defecto (HP-9a) no esperó al paso 3 y **se
> cerró ese mismo día en tres tareas** (D-CF-48; entera en el mismo archivo). HP-10, que salió al
> cerrar HP-9a, **se cerró también el 2026-09-12** (una tarea; entera en el mismo archivo). Queda HP-9b.

| | Qué | Dónde y qué costaría |
|---|---|---|
| **HP-9b** | **Catálogo SRD +N y descanso corto — pendiente, espera al paso 3** (decisión del autor, 2026-09-12; D-CF-47). La forma del +N ya existe en `effects`; falta el catálogo estructurado y el gancho al descanso corto. Medición, estimación y alcance en la subsección de abajo | Después del paso 3: 3–4 días de agente (HP-9a, **cerrada el 2026-09-12**, ya puso la puerta `efectosActivos` y `ResolvedItem.attuned`), plan de 6–8 tareas, precedido de una spec con dos preguntas. **La abre el autor**: ningún agente la coge por su cuenta |

### HP-9b · Catálogo SRD +N y descanso corto — medición, estimación y alcance (2026-09-12)

**Medido.** La sintonización es hoy **solo un marcador de estado**:
`apps/api/src/inventory/inventory.service.ts:158` la acepta solo sobre un objeto equipado, `:172` la
quita al desequipar y `:1081-1096` aplica `MAX_ATTUNED_ITEMS` (tres) con el mensaje que nombra los
tres. No hay requisito de descanso corto (el cambio es instantáneo); no hay ruptura a las 24 h ni a
los 100 pies; y el catálogo del SRD tiene **0 objetos con `requiresAttunement: true`**
(`rules/catalog/items-srd.ts`): solo los objetos que crea el DM lo llevan.

**La forma del +N ya existe.** `CampaignItem.effects` (`Json?`, en `apps/api/prisma/schema.prisma`)
guarda la lista que valida `itemEffectSchema` en `packages/shared/src/item.schema.ts` —`ac`,
`weaponAttack`, `weaponDamage`, entre otros— y el motor ya la aplica (`rules/items.ts` a la CA,
`rules/attacks.ts` al ataque y al daño). Comprobado: **no hace falta migración** para el +N; la
habría solo si se añade una columna nueva (rareza, cargas), y eso queda fuera.

**Estimación dada al autor (controlador, 2026-09-12): 3–4 días de agente menos HP-9a —cerrada el
2026-09-12, entera en [`_archivo/pendientes-cerrados-2026-09-10.md`](./_archivo/pendientes-cerrados-2026-09-10.md)—,
plan de 6–8 tareas.** Catálogo SRD 5.1: solo los +N son estructurables (~12: arma, armadura, escudo), el resto
es prosa; sintonizar pasa por el descanso corto (el flujo de descansos de 2C). **Fuera:** cargas,
rarezas, objetos que conceden conjuros (dependen del paso 3) y romperse a las 24 h o a los 100 pies.

**Orden: después del paso 3** (D-CF-37 → D-CF-47): la mitad del catálogo mágico concede conjuros y
sin ellos se modela a medias. **Antes de abrir el plan, una spec con dos preguntas:** ¿solo +N o
también resistencias y ventajas? ¿descanso corto real (el de 2C, con su hora de reloj) o un clic?

## El mapa de historia del DM — aplazado por el autor (2026-09-12); el #23 se cerró con el árbol

**El #23 del anexo («grafo del mundo poco intuitivo») está cerrado** por la Task 14 bis del pulido
(D-CF-64): el tablero telaraña se retiró (D4) y en su sitio va el mundo como **desglose + detalle**
(`apps/web/src/features/sessions/taller/mundo/`). Lo que queda abierto es **el mapa de historia**
—D-CF-52 lo ponía como cuarta tanda, D-CF-54 fijó su forma— que **el autor aplazó el 2026-09-12**
tras ver cuatro maquetas. Su spec, [`superpowers/specs/2026-09-12-mapa-de-historia-del-dm-design.md`](./superpowers/specs/2026-09-12-mapa-de-historia-del-dm-design.md),
**se queda tal cual, sin fecha**: no se reescribe ni se borra, y no se abre plan hasta que el autor
lo pida. Si se retoma, el árbol no lo estorba: el mapa lo dibuja el DM (D-CF-54) y no se genera de
los hilos, así que los dos pueden convivir.

## #13 · Dados en 3D con física de verdad (aplazado, de la nota de Task 0)

**Coste investigado, no se hace.** La nota de diseño del pulido
(`docs/superpowers/notes/2026-09-12-nota-de-diseno-ui-de-juegos.md` § 6) mira `dice-box`
(MIT, BabylonJS + AmmoJS, acepta notación simple y devuelve el resultado por dado:
<https://github.com/3d-dice/dice-box>) y `dddice-js` (SDK de un servicio en la nube, no
autoalojable, coste de integración mayor). Lo que hoy pinta el dado en la mesa es
`DadoTridimensional.tsx` — un cubo CSS que rueda hacia el total, no una física de dados de
verdad — y Task 10 no lo toca: pinta la bandeja de composición (`BandejaDeDados.tsx`), no la
animación del resultado. Si algún día se retoma: `dice-box` es la opción autoalojable y la que
no ata la mesa a un servicio de terceros; el coste es el peso de BabylonJS/AmmoJS y reescribir
`DadoTridimensional.tsx` sobre su API en vez del CSS actual.

## Tablero: sandbox del iframe (2026-09-12, ronda de revisión de la Tarea 6)

`MarcoDelTablero.tsx` monta el `<iframe>` de PlanarAlly sin `sandbox` (solo `referrerPolicy` y
`allow`). Aplazado a propósito, no un olvido: hay que medir contra `tablero.supportive.pro` de
verdad —qué necesita el `sandbox` de PlanarAlly (popups de su propio login, almacenamiento,
formularios) antes de escribirlo a ciegas y romper la sesión del jugador dentro del marco.

## P1 · Un mago no tiene conjuros — **cerrada el 2026-09-18 por 3A.2**

Movida entera a
[`_archivo/pendientes-cerrados-2026-09-18-3a2.md`](./_archivo/pendientes-cerrados-2026-09-18-3a2.md):
319 conjuros elegibles y lanzables desde la pestaña Conjuros, probado en verde por
`apps/web/e2e/conjuros.spec.ts` y `apps/web/e2e/lanzar.spec.ts`.

## P2 · La mesa a 390 px reparte sus tres columnas a lo ancho (2026-09-05, paseo de uso)

> **Aplazada por el autor el 2026-09-11** (D-CF-26): quiere un diseño responsive nuevo para la mesa
> y va a buscar referencias él. Hasta entonces **no se toca ninguna de las tres salidas** de abajo,
> ni el `minmax(0,1fr)` del elenco, para no mezclar un parche con el diseño que viene.

**Lo vio el paseo de uso con dos anchos** —1280 y 390— la noche del 2026-09-05, y **no se arregló a
propósito**: es trabajo de maquetación, no un fallo suelto que se cierre con una línea.

A 390 px la mesa reparte sus **tres columnas a lo ancho** y las **«Herramientas del DM» quedan
cortadas**. **No hay desbordamiento de la página** —la barra horizontal no aparece—, así que no lo
caza ninguna prueba de las que hay: es contenido que no cabe dentro de su columna, no una página que
se sale.

**Y no lo puede cazar `jsdom`.** Esto es posición y tamaño, o sea Playwright con medidas numéricas,
que es la regla que este proyecto ya tiene escrita después de que un borde partido sobreviviera a la
suite entera en verde.

**Cierra cuando** la mesa apile sus columnas por debajo de un umbral medido en el navegador y las
herramientas del DM se alcancen enteras a 390 px. Va con U2, que es su vecina: la navegación
estrecha ya se remidió en el plan 14 y **pasó**, así que lo que queda es la mesa, no el armazón.

### Ya no es una sospecha: está medida (2026-09-07)

`apps/web/e2e/mesa-en-estrecho.spec.ts` la fija con números en un navegador de verdad, y trae dos
pruebas a propósito: una **en verde** que deja escrito que la página no delata nada —ni barra
horizontal ni vertical, con el panel fuera— y otra con **`test.fail()`** que es el defecto, con sus
cinco aserciones en modo blando para que **todas se evalúen en cada pasada** en vez de abortar en la
primera. `test.fail()` y no un `skip`: se ejecuta, y **se pondrá roja el día que alguien lo
arregle**. Ocho medidas en rojo el 2026-09-07:

- el **borde derecho del panel en 550 px** dentro de una ventana de 390;
- **los seis botones** de la maqueta fuera, entre 426 y 537;
- y **el hilo estrangulado a 48 px de ancho**, que no estaba en el enunciado de esta ficha y es
  igual de grave: no es solo que las herramientas no se vean, es que **el centro tampoco se lee**.

**Aviso para quien la arregle**: además del `test.fail`, la prueba **en verde** lleva una aserción
que fija el defecto (`el panel acaba fuera`), así que **también se pondrá roja**. Su mensaje dice
qué hacer. Es deliberado: lo que la rodea sí es invariante.

**Y se intentó el arreglo evidente, que no vale.** Apilar en una columna hasta `lg`
(`grid-cols-1 lg:grid-cols-[17rem_1fr_15rem]`) mete las herramientas dentro de la ventana y
**gira el corte 90°**: a 390×844 el `main` tiene **466 px de alto**, y repartidos entre tres
regiones el elenco se queda en **16 px de alto con una cabecera de 36**. Se revirtió. Las guardas
**C, D y E** de esa prueba existen para que ese arreglo falso no pase por bueno otra vez, y la **D**
—ninguna región por debajo de 120 px de alto— se escribió **en altura a propósito**: la E depende de
que la envoltura aplastada conserve `overflow` visible para delatarse, y eso es una condición
prestada, no la propiedad que se quiere medir.

De paso quedó localizada una trampa real e independiente: la columna del elenco usa
`grid-rows-[1fr_auto]`, y un `1fr` de rejilla es `minmax(auto,1fr)` que **no encoge por debajo de
su contenido**, así que su `overflow-y-auto` no llega a activarse. A 1280 sobra alto y no se nota.
`minmax(0,1fr)` lo arregla; **no se ha aplicado** porque sin apilado no cambia nada visible y
mezclarlo aquí escondería a cuál de los dos cambios responde la medida.

**Lo que falta es una decisión del autor, no más maquetación a ciegas.** La salida que haría la
casa —llevar el elenco y las herramientas a **cajones del rail**— pide dos cajones que hoy no
existen: el rail tiene hoja, bolsa, mundo y dados, y ninguno de esos dos. Eso es navegación nueva
con sus iconos dibujados y su tecla, y las reglas de interfaz de este proyecto no dejan
improvisarlo. Las tres salidas, para elegir:

| Salida | Qué cuesta |
|---|---|
| Elenco y herramientas a **cajones del rail** | Dos cajones nuevos, dos iconos, dos teclas. Es lo coherente con «un panel tiene tecla porque se quita» |
| La mesa **scrollea como una página** solo en estrecho | Una línea, pero **contradice el reseño**: «la pantalla donde se juega no es un artículo» fue el defecto que `mesa-mide` nació para impedir |
| **Pestañas** entre las tres regiones a 390 | Ni cajón ni columna: un cuarto patrón de navegación en una casa que ya tiene tres |

## La pantalla de juego con mapa — alcance nuevo, sin decidir (2026-09-02)

**Lo que el autor quiere, en sus palabras:** *«yo no quiero un juego plano; quiero que los
jugadores tengan una interfaz donde vean el mapa, su hoja, sus tiradas y demás dentro de una
misma pantalla, con objetos interactivos renderizados y tiles, como las plataformas clásicas de
D&D»*.

**Por qué esto es una decisión y no una tarea.** El plan maestro dice hoy «Mapas 2D: imagen
subida, pines que enlazan a fichas, interruptor de niebla, capa del DM y capa del jugador». Eso
es un **documento con chinchetas**. Lo que se pide es otra cosa: un **tablero** con rejilla,
fichas que se mueven, objetos con los que se interactúa, y la hoja y las tiradas **en la misma
pantalla**. Es una mesa virtual, y arrastra tres cosas que hoy están en fases distintas o en
ninguna:

- **Tiempo real (fase 4).** Una ficha que se mueve y solo la ve quien la movió no sirve de nada.
- **Almacenamiento de objetos (fase 3).** Tiles, sprites y mapas son ficheros.
- **Posiciones**, que hoy **no existen en el modelo**. Un personaje no tiene coordenadas, y la
  fase 2A dejó las distancias resueltas «sin posiciones» a propósito.

**Lo que hay que decidir antes de dibujar nada:** si esto sustituye a la fase 3 o va después de
ella; si el tablero es rejilla cuadrada o libre; y **qué pasa con la visibilidad**, que es la
pregunta grande — la niebla de guerra es `canView` aplicado a coordenadas, y hoy `canView` no
sabe nada de coordenadas. **La posición de una ficha enemiga es información igual que su CA:
si no se debe saber, no se envía.**

Mientras tanto: **no se dibuja la pantalla de juego a ciegas**. La maqueta de Figma Make no la
trae, y el hueco está declarado en
[la revisión de lo que volvió](./superpowers/specs/2026-09-02-figma-make-revision.md).

## Dejado por la segunda tanda de la ronda de interfaz (2026-09-02, madrugada)

## Huecos abiertos de la fase 2A (2026-09-02)

Aparecieron al completar el plan y **no están resueltos**. Los cinco que sí lo están viven en
[la parte 2 del plan, §4](./superpowers/plans/2026-09-02-fase-2A-parte-2-eventos-distancias-y-cierre.md).

| | Qué | Por qué importa |
|---|---|---|
| **H10** | Las formas de área (cono, esfera, línea, cubo, cilindro) las necesitan el motor (2A) y los conjuros (2B) | Propuesta: viven en `@dnd/shared` desde 2A, aunque en 2A todavía no alcancen a nadie |

## Deuda de las tareas 2A.3 y 2A.4 (catálogo SRD y elecciones) — 2026-09-02

Revisado por dos agentes el mismo día. Las fichas marcadas **[revisión]** las encontró la
revisión, no quien implementó, y varias de ellas son cosas que se **arreglaron** ahí mismo: se
quedan aquí para que no se deshagan sin darse cuenta.

| | Qué | Por qué importa, y qué cuesta cambiarlo |
|---|---|---|
| **S2** | **De cada aptitud de clase se transcribió el nombre y el nivel, no su texto de reglas** | El plan (§4.3) pedía «aptitudes por nivel como texto». La hoja puede decir «al nivel 5 ganas Ataque adicional» —desde el arreglo de la revisión, que metió las aptitudes de clase y subclase en `features`; antes esta ficha **afirmaba que ya lo hacía y era falso**—, pero no puede explicar qué hace cada una. Traducir a mano el texto completo de unas doscientas aptitudes es donde una transcripción se llena de errores que **ningún invariante puede cazar**. Añadirlo después es rellenar un campo, no cambiar una forma |
| **S4** | **Los rasgos raciales sin efecto numérico se listan, pero no hacen nada** (Suertudo, Astucia gnoma, Aguante implacable…) | Salen por `features` para que la hoja los enseñe. Automatizarlos es 2C, igual que las condiciones. Está dicho aquí para que nadie los lea en la hoja y suponga que el motor los aplica |
| **S6** | **La mejora de característica de los niveles de `asiLevels` no se modela todavía como elección** (2A.4) | Es el mismo mecanismo que el «+1 a dos» del semielfo, y el plan (§3) las nombra juntas. No entra aún porque «+2 a una **o** +1 a dos» es una concesión con **dos modos**, y quien decide la forma de la subida de nivel es 2A.9. **Ojo: no son solo 4/8/12/16/19** — el guerrero tiene 4/6/8/12/14/16/19 y el pícaro 4/8/10/12/16/19, y están en `asiLevels`; quien implemente 2A.9 leyendo solo esta línea se dejaría tres niveles. Añadirlo es un `kind` nuevo en `Grant` |
| **S10** | **[revisión] El nivel y el nombre de las ~203 aptitudes de clase no están fijados por ninguna prueba** | `reference.spec.ts` fija dado de golpe, salvaciones, `asiLevels`, número de habilidades, lanzamiento, subclase y su nivel, y todas las cifras de razas y armaduras — **mover una aptitud de nivel, en cambio, no pone nada en rojo** (comprobado: la mutación «evasión del pícaro del 7 al 4» sigue pasando). Fijarlas sería transcribir los mismos datos **dos veces**, y dos copias derivan. Lo que protege esas filas es que el diff se entregó legible y se revisó con el SRD delante |

## Deuda de la fase 2B — objetos, inventario y equipo (2026-09-03)

Lo que quedó abierto al cerrar 2B, con su prioridad y lo que costaría cerrarlo. Las tres primeras
son decisiones tomadas a conciencia, no olvidos.

| | Qué | Por qué importa, y qué cuesta cambiarlo |
|---|---|---|
| **I7** | **El tabú del druida se perdió al pasar las competencias a claves** | El SRD dice «ligera, media y escudos, **no metálicos**». Eso no es una competencia menos —un druida *sabe* usar una cota de escamas, pero no quiere— y modelarlo como competencia le negaría una armadura que la regla sí permite. Hoy vive en un comentario de `classes.ts`; su sitio es el texto de la aptitud, cuando exista dónde ponerlo |

**Lo que la revisión de 2B encontró y se arregló el mismo día** (no queda deuda, se anota porque
la lección sí): la hoja leía el equipo **sin pasar por `canView`**, así que el nombre y el
identificador de un objeto que el inventario escondía salían igual por el cuadro de ataques y por
la traza; la bolsa comprobaba el saldo **fuera** de la transacción y podía quedar en negativo con
dos peticiones a la vez; el tope de sintonizaciones tenía la misma carrera; y dos pruebas de la
regla de manos pasaban **por el motivo equivocado** —el 409 que asertaban lo producía también la
comprobación genérica de ranura ocupada, así que se podía borrar la regla entera sin poner nada
rojo—. Las cuatro tienen ahora su prueba con mutación comprobada.

**Y una deuda que 2B pagó en vez de heredar:** el visor de un personaje (¿puede verlo?, ¿puede
escribir en él?) estaba escrito dos veces y 2B iba a escribir la tercera. Vive ahora en
`apps/api/src/common/character-viewer.ts`. Siguen con su copia propia `entities`, `characters`,
`character-sheet`, `comments`, `links`, `sessions`, `game-events`, `rules-engine` y
`campaign-items` — **y cuatro más que esta lista no nombraba, remedido el 2026-09-08**:
`dm-tables`, `encounters`, `npcs` y `statblocks`. **Trece en total, y solo tres servicios
importan el común**, así que la casa se pagó y casi nadie se ha mudado. La deuda viva es la línea
de `viewerFor` en **P4 — Limpieza**, que es donde se mide.

## Lo que dejó abierto la auditoría de mecánica de 2B (2026-09-03, noche)

> **Un intermitente que no era una prueba frágil, y merece constar.** Después de serializar el
> camino de equipar, el e2e de la carrera empezó a fallar **una vez de cada cuatro** con un 500
> en vez del 409 esperado. La tentación era llamarlo flaky y repetir. Medido con el error real
> impreso, era un **abrazo mortal de Postgres (40P01)**: meter un objeto ya equipado y equipar
> otro tomaban los recursos **en orden inverso** —uno el índice único de la ranura, otro la fila
> del personaje—. Se arregló haciendo que todos los escritores del inventario tomen el mismo
> candado primero, y el propio abrazo mortal se traduce ahora a un 409 legible por si alguna vez
> vuelve por un camino nuevo. Seis corridas seguidas en verde después del arreglo.

Dos frentes con su refutador, sobre el camino de una mesa real. El informe entero, con lo que se
arregló el mismo día y lo que el refutador corrigió, está en
[la auditoría de mecánica](./superpowers/specs/2026-09-03-auditoria-de-mecanica-2B.md).

| | Qué falta | Qué cuesta, y qué pasa mientras tanto |
|---|---|---|
| **M2B-4** | **Quedan las cargas** (una varita de siete usos que se repone en el descanso) | La munición del SRD ya está sembrada (flechas, virotes, balas, agujas) y **gastar un consumible existe** (`POST .../inventory/:rowId/consume`, con su rastro en la línea de tiempo y la fila que desaparece al llegar a cero). Lo que falta son las **cargas**: columnas `chargesCurrent`/`chargesMax`/`rechargeOn` en `InventoryItem` y reponerlas dentro de la transacción del descanso. Es una migración, y por eso no entró de madrugada |

## Iluminación y visión (pregunta del autor, 2026-09-02)

Razonado en [distancias y movimiento, §12 bis](./superpowers/specs/2026-09-02-distancias-y-movimiento-design.md).
**Cerrado hoy:** los sentidos llegan a la hoja (`senses.darkvision` en pies, derivado y con
traza). Lo demás queda colocado, no olvidado.

| | Qué | Dónde va |
|---|---|---|
| **L1** | **Niveles de luz** (brillante / tenue / oscuridad) y fuentes de luz | **Fase 3**: sin posiciones no hay «qué hay iluminado desde aquí». Se puede escribir la regla, no resolverla |
| **L2** | **Arco y radio de visión**, y que el DM restrinja la visión de alguien | **Fase 3**, por lo mismo: un arco necesita origen y dirección |
| **L4** | **La visión NO es `canView`, y esto es una invariante** | `canView` responde «¿este **jugador** puede leer este registro?»; la visión, «¿qué percibe este **personaje** en la ficción?». Confundirlas deja a un personaje cegado sin acceso a sus propias notas, o convierte una ceguera de ficción en un permiso que filtra por el camino que protege los secretos. **Cuando llegue el tablero**, «el jugador no ve esta ficha en el mapa» sí es autorización y va por `canView` sobre la ficha o la escena — un motor de iluminación que solo oscurezca en el navegador algo que el servidor ya mandó **no es niebla de guerra, es un filtro de CSS sobre un secreto** |

## Encontrado al escribir 2A.13 (2026-09-02)

| | Qué | Por qué importa |
|---|---|---|

## Huecos de mecánica declarados a mitad de 2A (2026-09-02)

Salieron de un repaso pedido por el autor con 2A.1-2A.5 ya en producción, razonado en
[huecos de mecánica](./superpowers/specs/2026-09-02-huecos-de-mecanica-2A.md). **Cuatro se
cerraron ese mismo día** (media competencia, Ataque Extra, espacios de conjuro e iniciativa) y
**tres están colocados** en 2A.6, 2A.7 y 2A.12. Estos cuatro quedan abiertos.

| | Qué | Dónde va, y por qué no ahora |
|---|---|---|

## Pedido por el autor el 2026-09-02, colocado — antes de 2A

Razonado en [el análisis de las seis peticiones](./superpowers/specs/2026-09-02-seis-peticiones-analisis.md).
Los puntos 4 (modales) y 5 (líneas del acceso) ya están hechos; el 6 entró en el plan de 2A.

| | Qué | Por qué aquí y no después |
|---|---|---|
| **A2** | **Invitar por correo a un usuario que ya tiene cuenta** — **aplazada por el autor el 2026-09-11 (D-CF-37): «no viene al caso ahora»**, sin pegar enlaces. **La respuesta del servidor debe ser idéntica exista o no la cuenta**, o se convierte en un comprobador de padrón | Es lo que el autor pedía de verdad al hablar de «amigos», por una fracción del coste. Un grafo social duplica la pertenencia a campaña, que es la unidad real del producto |

## Despliegue — abierto tras escribir la pila (2026-09-02)

Hay servidor (`vps1new`), dominio (`dnd.supportive.pro`) y autorización, y existe
`docker-compose.prod.yml` con su procedimiento en [03-despliegue.md](./03-despliegue.md).
**Ejecutado contra el servidor el 2026-09-02**: la plataforma está en producción en
`dnd.supportive.pro`. Con ello se cierran **D1, D2, D4 y D6** (ver
[07-historial.md](./07-historial.md)). Lo que sigue abierto:

| | Qué | Por qué importa |
|---|---|---|

## Segunda pasada del contraste modelo/API ↔ pantalla (2026-09-01)

**Contraste hecho a mano sobre el commit `70b353c` de `main`**: los 10 modelos de
`apps/api/prisma/schema.prisma` campo a campo, las 35 rutas de la API una a una, y por cada
una la pregunta *"¿quién la usa desde la pantalla?"*. Es la repetición del contraste de 1.17
—que **se repite al cerrar cada fase**— y encontró doce cosas nuevas, con identificadores que
empiezan en **D** para no chocar con los de la pasada anterior (A1–C1, arriba).

**El informe completo no vive en el repositorio**: se escribió fuera, en el directorio de
trabajo de la sesión que lo produjo, así que **lo que hay que conservar está aquí**. Cada línea
lleva su evidencia comprobada contra el código de este árbol, no contra el del día del
contraste — ver la nota sobre líneas desplazadas al final de la sección.

Lo que **sí** quedó comprobado como congruente, para que la próxima pasada no lo recorra otra
vez: comentarios, campañas (desde 1.17d), miembros, los siete campos de `Entity`, y la matriz
de visibilidad entera —los recortes de `features/sessions/SessionEditor.tsx` y
`features/characters/CharacterEditor.tsx` corresponden con los límites reales del modelo
descritos en [05-datos.md](./05-datos.md), y ninguno de los dos editores miente al usuario.
**El núcleo de la promesa —quién ve qué— está entero.** Y la frase con la que esta sección cerraba
—*«lo que falta es casi todo movimiento: navegar, buscar, ordenar y administrar la mesa»*— **ya solo
es cierta en dos de sus cuatro tercios, remedido el 2026-09-08**: navegar se puede (los enlaces
llevan a su ficha, y hay página de detalle con URL propia) y administrar la mesa también (cambiar
el rol de un miembro, listar y revocar invitaciones). **Buscar y ordenar siguen abiertos**, en `E1`
y `D4`. Se conserva citada porque era el resumen de la pasada, y su caducidad es el hallazgo.

| | Hallazgo | Prioridad | Evidencia |
|---|---|---|---|
| E1 | **Sesiones y Personajes siguen sin buscador ni filtro**, y **no hay búsqueda que cruce pestañas** — ya declarado bajo la tabla de 1.17, confirmado abierto | P2 — ya declarado | `features/entities/EntityFilterBar.tsx` se monta solo en `EntityTab` de `pages/CampaignDetailPage.tsx` y filtra la lista ya cargada de **un solo tipo**; `fetchAllEntities` (`features/entities/api.ts`) ya trae todos los tipos y solo lo consume el selector de destino de enlaces |

> **Siete de las doce filas de esta tabla se archivaron el 2026-09-08 por falsas** —`D1`, `D2`,
> `D3`, `D5`, `D8`, `D9` y `E2`—, y `D4` se quedó con la mitad que sigue siendo verdad. Están en
> [`_archivo/pendientes-cerrados-2026-09-08-reconocimiento.md`](./_archivo/pendientes-cerrados-2026-09-08-reconocimiento.md)
> con la medición de cada una. **Esta sección era la más falsa del documento**, y no por azar:
> es la que más citas de línea llevaba dentro, y una cita de línea se pudre en la siguiente
> edición del fichero que cita.

**Lo que queda de estas líneas en una mesa real**, ordenado por cuándo duele y no por
dificultad, porque es la pregunta que hizo el autor:

- **Buscar sigue siendo de un solo tipo** (E1). La búsqueda por texto ya la hace el servidor y ya
  pasa por `canView` antes que por el texto, pero solo desde la pestaña del mundo: no hay una que
  cruce sesiones y personajes.
- D6 y D7 **ya no son decisión pendiente**: son `D-CF-6` y `D-CF-7` en
  [decisiones.md](./decisiones.md) desde el 2026-09-10: `ownerId` es quién la creó y la
  autoridad es el rol; `isAdmin` se concede a mano en Postgres y su primer oficio es el reinicio
  de contraseña (`POST /admin/password-resets`, D-CF-18).

> **Lo que este bloque decía y ya no dice.** Sus cuatro afirmaciones más duras —el DM no puede
> tener un co-DM, no sabe qué invitaciones ha mandado, no puede recorrer los enlaces que acaba de
> crear, y «la campaña queda huérfana para siempre» si se pierde la cuenta del DM— **eran las
> cuatro falsas**, y la última era un modo de fallo construido sumando dos fichas que ya estaban
> cerradas. Se conservan enteras en el archivo, porque una consecuencia razonada a partir de dos
> premisas falsas es más instructiva que las premisas solas.

**La recuperación de contraseña no es un hueco simple y no se cuenta como tal.** Está
**bloqueada por un servicio de correo que no existe**, y así está declarado en el propio código
(`packages/shared/src/auth.schema.ts:18-20`: *"Password RECOVERY (forgotten password) is out of
scope — it needs an email service that doesn't exist"*). Es una **decisión de despliegue**, se
toma junto con el VPS (ver [03-despliegue.md](./03-despliegue.md)) y su ficha viva es **D8** del
bloque de despliegue, más abajo. **Hasta el 2026-09-08 esta frase decía que «agrava a D2»**, y
D2 —no se puede ascender a nadie— llevaba cerrada desde el plan 11: la recuperación sigue
bloqueada, pero ya no convierte una cuenta perdida en una campaña huérfana, porque otro DM puede
existir.

**Coste declarado, para poder decidir sin volver a mirar el código:** D4 se cerró el 2026-09-10 con
ese `orderBy`; E1 es medio, porque una búsqueda que cruce pestañas necesita decidir qué devuelve el
servidor cuando los tipos son distintos. D6 y D7 se decidieron el 2026-09-10 (`D-CF-6`, `D-CF-7`).

**Tres cosas que conviene no leer mal:**

- **Ninguna prueba iba a encontrar nada de esto.** La suite (unitarias: bloque generado de
  [00-INDEX.md](./00-INDEX.md); navegador: [08-pruebas.md](./08-pruebas.md)) verifica que **lo
  que existe** funciona. Nada puede ponerse rojo porque un campo del esquema no tenga escritor.
  Es el mismo punto ciego estructural que motivó el contraste de 1.17.
- **Y ninguna prueba iba a encontrar que estas fichas habían caducado, que es el problema
  simétrico y el que de verdad pasó.** Siete de las doce se arreglaron sin que nadie volviera a
  esta tabla, en la semana siguiente a escribirla. Lo único que las cazó fue leer el texto contra
  el código — no un control. `pnpm check:docs` sí habría cazado las citas de línea desplazadas **si
  hubieran apuntado más allá del final del fichero**; apuntaban dentro, a código de otra cosa, y
  eso ninguna expresión regular lo ve.
- **Las citas del informe original apuntaban al commit `70b353c`.** Las de esta tabla se
  reescribieron contra el árbol del 2026-09-01, y **se volvieron a reescribir el 2026-09-08**
  porque se habían desplazado otra vez. Si alguien recupera el informe original, sus números de
  línea de web hay que leerlos sobre `70b353c`, no sobre `main`.

## El despliegue de la fase 2, y cómo se verifica (decidido 2026-09-03)

**No se despliega por bloques.** Se despliega **al cerrar la fase 2 entera**, y la verificación
final no es una suite: es **una partida de prueba real**, decidida por el autor.

- Dos cuentas de jugador — **dos, no más** — y la cuenta del autor **como DM**.
- Una campaña de verdad, jugada por agentes: crear personajes, repartir equipo, equipar, atacar,
  tirar, aplicar una condición, descansar, avanzar el reloj.
- **Es integración, no demostración**: lo que se rompa se anota como ficha con su evidencia, y lo
  que no se pueda hacer se anota igual.
- Hay **permiso expreso del autor** para desplegar en esa prueba; hasta entonces, nada sube.

**Y no bloquea nada de datos, por decisión del autor (2026-09-03).** Se le planteó que la partida
de prueba convertiría el despliegue en «datos que perder» —las cuatro migraciones sin revisar y la
copia de seguridad rota— y contestó que no:

> *«Estamos en un despliegue de desarrollo; lo máximo de datos que hay que perder está en GitHub.
> No debes preocuparte por datos que al final del día vamos a eliminar para la versión final, que
> posiblemente reciban cambios de estructura, o que se puedan corromper durante el desarrollo. De
> momento el único usuario soy yo.»*

Así que **la prueba con agentes es una prueba de campo, no la primera partida de la mesa**: los
jugadores de verdad no entran hasta que haya una versión jugable **con tiempo real**, porque
recargar la página para cada acción es incómodo y eso es la fase 4. Lo que esta prueba busca es
que la base aguante.

**Lo que sigue siendo cierto:** la copia de seguridad rota (el bloque que abre este documento)
tiene su fecha de caducidad en el día que existan datos que a alguien le dolería perder, y ese día
llegará con el tiempo real, no con esta prueba.

## P2 — Ruta de mejora del nivel

**Linting sin información de tipos.** `typescript-eslint` corre en modo básico; el modo
*type-checked* (que ve los tipos y caza promesas sin esperar, comparaciones imposibles y
`any` implícitos que hoy pasan) exige apuntar cada paquete a su `tsconfig` y cuesta tiempo de
CI. Decisión: se activa como tarea propia, no de rebote.

**Sin umbral de cobertura (N2) ni mutación (N3).** No declarados y no prometidos. Ruta de
mejora, no compromiso.

> **La tercera línea de esta sección se archivó el 2026-09-08.** Decía *«no hay prueba de rechazo
> por validación en personajes (`level > 20` devuelve 400 y nadie lo comprueba)»*, y
> `level-up.service.spec.ts` lo comprueba dos veces desde entonces. La medición está en
> [`_archivo/pendientes-cerrados-2026-09-08-reconocimiento.md`](./_archivo/pendientes-cerrados-2026-09-08-reconocimiento.md).
> **Lo que sigue siendo cierto de esta sección son sus dos primeras líneas**: el lint sin tipos y
> la ausencia de umbral de cobertura y de mutación.

## P3 — Correcciones funcionales conocidas

Ninguna es un agujero de lectura —nadie ve contenido ajeno—, pero todas degradan el
comportamiento:

## P4 — Limpieza

## Decisiones abiertas

> **Las tres que había aquí eran falsas y se corrigieron el 2026-09-03.** Decían «sin VPS
> asignado / despliegue diferido», «sin sistema de diseño para el MVP» y «las fases 2–5 solo
> tienen alcance, no plan». Se quedaron escritas mientras el mundo alrededor cambiaba, que es
> exactamente cómo una sección de decisiones se convierte en una trampa: quien la lee cree que
> sigue habiendo una decisión que tomar. Lo cierto hoy:
>
> - **Hay despliegue**, en `vps1new` con Coolify + Traefik y dominio `dnd.supportive.pro`,
>   desde el 2026-09-02. Ver [03-despliegue.md](./03-despliegue.md).
> - **Hay sistema de diseño**, desde el 2026-09-02: la capa de tokens y las primitivas de
>   `apps/web/src/ui/`. [04-convenciones.md](./04-convenciones.md) ya lo decía —con esa misma
>   corrección escrita al lado— mientras este documento afirmaba lo contrario.
> - **La fase 2 tiene cuatro planes y está entera** (2A, 2B, 2C y 2D), y las fases 2.5 y 3
>   tienen alcance escrito. Lo que sigue siendo cierto de la frase vieja es su última mitad,
>   y se conserva abajo porque es una regla, no un estado.

- **No se empieza la fase siguiente hasta usar la anterior en una sesión real.** Es la única
  parte de esta sección que nunca dejó de ser verdad, y la que decide cuándo arranca 2.5:
  falta la partida de prueba con jugadores de verdad.
  > **Y conste que la regla se ha incumplido dos veces.** 2A se ejecutó entera entre el 1 y el 2
  > de septiembre sin que ninguna sesión ocurriera, y detrás fueron 2B, 2C y 2D. El riesgo que la
  > regla protegía —construir el motor sin realimentación de mesa— **ya se materializó**, así que
  > la prueba de campo no valida una fase: valida cuatro a la vez. Esto vivía en la guía de juego,
  > donde nadie que buscara el estado del proyecto iba a mirarlo.
- **La mesa de verdad no juega hasta que haya tiempo real (fase 4), por decisión del autor
  (2026-09-03).** En sus palabras, *«es incómodo tener que recargar la página para cada acción»*.
  Lo que sí ocurre antes es la **prueba de campo con agentes** que cierra la fase 2 —dos cuentas
  de jugador y el autor como DM—, y **no la sustituye**: es integración, no una partida. Su ficha
  entera está más arriba, en «El despliegue de la fase 2, y cómo se verifica».
- **Las fases 4 y 5** (tiempo real, 3D/IA) siguen sin plan, solo con el alcance del plan
  maestro. Cada una recibe el suyo al llegar.

## Cierre de la fase 2A — lo que las auditorías del 2026-09-02 encontraron

Tres auditorías cruzaron **toda** la documentación contra el código el día del cierre. Lo que
sigue es lo que **no** se arregló en el mismo commit; lo arreglado está tachado arriba.

Tres patrones se repitieron, y merece la pena nombrarlos porque van a volver:

1. **Función con prueba y sin llamador.** `seedResourcesFor`, `assertNoUnknownChoices` y
   `recordEntityOpened`: las tres existían, las tres tenían prueba unitaria en verde, y a las
   tres **no las llamaba nadie**. Una prueba unitaria verde no dice que la función se use.
2. **Un comentario que afirma una igualdad y nada la comprueba.** El previo de subida de nivel
   decía «se toma de `sheetTo` para no calcular dos veces el mismo número por dos caminos que
   podrían discrepar» — y discrepaban: el destino salía de la hoja derivada y el delta de la
   columna en bruto, así que el enano leía «13 → 22 (+8)». Lo cazó un recorrido de navegador.
3. **La regla del juego copiada en el navegador** porque el servidor no la exponía: la velocidad
   efectiva, y el catálogo de razas y clases.

> **Dos filas de esta tabla se archivaron el 2026-09-08 por falsas**, y una tercera se precisó:
> `U8-glifos` (los seis glifos de fuente se dibujaron, y `04-convenciones.md` declaró además la
> excepción de `ui/Badge.tsx` que la propia ficha exigía) y `D9` (los cinco módulos sin pantalla
> las tienen). La precisada es `N4`, que **sigue abierta**: el nombre de la regla viaja en el
> aviso de la propuesta y no en su listado, así que el arreglo es un `include`, no inventar el
> dato. **Y añade un cuarto patrón a los tres de arriba, el que este documento sufre de
> verdad:** una ficha que describe con precisión el arreglo que le falta **no se vuelve a leer el
> día que ese arreglo se entrega**. `U8-glifos` pedía la prueba que hoy existe y `D9` pedía la
> pantalla que hoy existe; las dos siguieron abiertas.

| # | Qué falta | Por qué importa |
|---|---|---|
| **S11** | **Los tipos de respuesta del motor y del previo de nivel viven dos veces**: en `apps/api/src/rules-engine/engine/types.ts` y `level-up.service.ts`, y calcados a mano en `apps/web/src/features/rules/api.ts` y `features/level-up/api.ts`. **Tercer caso medido (2026-09-06):** `CharacterSheet`, `PendingChoice` y `ResolvedFeature` (`apps/api/src/rules/catalog/index.ts`) y `Attack` (`apps/api/src/rules/attacks.ts`) se calcan a mano en `apps/web/src/features/character-sheet/api.ts:24-28` (`CalculatedSheet`, `PendingChoiceDto`, `ResolvedFeatureDto`, líneas 74-100) y `:131-143` (`AttackDto`), con el mismo comentario que ya anticipaba el problema («la web no puede — ni debe — importar de `apps/api`») | Si el servidor cambia esa forma, **nada lo detecta**. Es el mismo patrón que ya se aceptó para la hoja, y ahora hay tres capas midiéndolo por separado en vez de una. Candidato claro a `@dnd/shared` |

### Huecos de mecánica — lo que falta para jugar de verdad

Ordenados por lo que duele en la mesa. **Ninguno es de la fase 3**: todos caben en lo que ya
existe, y por eso están aquí y no en un plan futuro.

| # | Mecánica | Qué se rompe hoy | Dónde encaja |
|---|---|---|---|
| **L5** | **El DM no puede declarar «este personaje no ve»** | Es la mitad barata del hueco de iluminación, y **no necesita mapa**: declarar la restricción cabe en las condiciones de clave libre que ya existen; lo que necesita posiciones es *resolver* el arco. Hoy la única herramienta del DM es cambiar la visibilidad de las fichas a mano, una a una, sin dejar dicho por qué | Vocabulario, chip en la hoja, y —crítico— que quede claro en pantalla que es **ficción, no permiso** |

> **Y el límite que conviene escribir en voz alta, porque no es un hueco sino una frontera:**
> la aplicación **no modela qué ve un personaje; modela qué le está permitido leer.** Son cosas
> distintas, y la matriz de visibilidad solo sabe de la segunda. Confundirlas es cómo se acaba
> metiendo ficción dentro del control de acceso.

### Mesa de agentes del 2026-09-02 — un DM y un tramposo contra la API real

Un agente jugó una partida entera de prueba contra la API y otro intentó romper la
autorización. **El tramposo no encontró ni un hueco de seguridad**: lectura, escritura,
escalada por regla con entidad ajena, tirada por personaje ajeno y superficie de cuenta, todo
403/404. `canView` + `requireMember`/`requireDM` aguantan. El DM, en cambio, encontró cuatro
fallos de corrección que **se arreglaron el mismo día**, y una lista de lo que le impediría
dirigir tres horas de verdad.

| # | Qué encontró el DM | Estado |
|---|---|---|

**El veredicto del DM, sin diplomacia:** la fase de **preparación** (wiki, cinco visibilidades,
enlaces, comentarios, y el motor de reglas con su ensayo, propuestas y traza) la usaría el
martes para preparar la partida del sábado. Lo que **no** aguanta el sábado es el combate, y por
tres cosas que ya están fichadas arriba como huecos de mecánica: **no puede llevar los PG de un
monstruo (M13), no hay iniciativa (M14), y el registro no reconstruye la sesión (J4/J5, en
parte cerrado)**. Son la misma lista que las auditorías, vista desde la silla del director.

> **Este veredicto caducó, y su remisión ya no lleva a ninguna parte. Medido el 2026-09-08.** Se
> conserva porque es lo que dijo un agente jugando el 2026-09-02, y un veredicto fechado no se
> reescribe — pero **dos de sus tres motivos están cerrados** y el tercero solo a medias:
>
> - **Los PG de un monstruo sí se llevan**, desde la mesa: `features/sessions/elenco/FichaDePnj.tsx`
>   los pinta y da los mandos **solo al DM**, con los PG máximos y la CA exacta escondidos al
>   jugador.
> - **Hay iniciativa**: `features/encounters/TiraDeIniciativa.tsx` y `EmpezarCombate.tsx`, con
>   corrección de la tirada, y sus recorridos de navegador en `apps/web/e2e/combate.spec.ts` y
>   `apps/web/e2e/iniciativa-en-vivo.spec.ts`.
> - **Del registro sigue faltando el suceso de muerte**, que es la ficha `J5` de arriba y sigue
>   abierta.
>
> **Y los tres identificadores que cita no existen en este documento**: `M13`, `M14` y `J4`
> aparecen **solo aquí**, así que «ya están fichadas arriba» es falso desde que se podaron. Es el
> coste de remitir por identificador a una ficha que otro puede archivar: la remisión sobrevive a
> su destino.

> **`L2-traza-daño` se archivó el 2026-09-08, cerrada por las dos mitades.** Las cuatro claves
> del daño tienen traducción en `features/character-sheet/vocabulario.ts` (líneas 504 a 507), y
> `NOMBRE_TIPO_DANO` ya no existe tres veces sino una, en `dominio/dano.ts`. **Era la ficha con
> más citas de línea de todas, y las tres estaban obsoletas**: razonaba bien, medía bien y citaba
> bien el día que se escribió, y nada de eso la salvó. Su texto entero, con la medición que la
> cierra, en
> [`_archivo/pendientes-cerrados-2026-09-08-reconocimiento.md`](./_archivo/pendientes-cerrados-2026-09-08-reconocimiento.md).
> **El identificador no se recicla**, como manda la regla de nombres de la cabecera.

> **La sala de espera (tarea 8, 2026-09-05) abrió aquí dos fichas que la ronda de arreglo 1
> (2026-09-06) cerró, y no como deuda.** El canal en vivo ya invalida `useCurrentEncounter`
> (`apps/web/src/features/live/canal.ts`, con `encountersKey(campaignId)` — un predicado a mano
> resultó no hacer falta, ver `docs/decisiones.md` E-N-6); y que un jugador no vea la cuenta ni
> los nombres de quién falta es una decisión confirmada, no un hueco (E-N-5). La lección, no la
> deuda: **no se abre ficha por algo que se sabe arreglar** — se intenta el cambio pequeño
> primero, y solo si no lo hay se anota.

### A11-lanzado-cuenta-como-cuerpo-a-cuerpo — el bono de daño de la Furia se cuela en un arma arrojada (2026-09-07)

**Abierto, menor, fuera de la frontera de A11.** `bonoDeFuria`
(`apps/api/src/characters/character-sheet.service.ts`) sube el daño cuando `ataque.ability ===
"str"`, que es lo que devuelve `decidirCaracteristica` (`rules/attacks.ts`) para cualquier arma sin
`FINESSE` a cuerpo a cuerpo — **y también para una jabalina o un hacha de mano (`THROWN`)
LANZADAS**, porque esa función no distingue «empuñar» de «lanzar»: solo mira si el arma tiene
`FINESSE`, no con qué mano llega el golpe. El SRD 5.1 solo da el bono en un ataque cuerpo a cuerpo
(*"When you make a melee weapon attack using Strength"*), así que lanzar un hacha de mano en
furia se lleva el +2 sin merecerlo. No es arreglable dentro de `character-sheet.service.ts`:
`rollAttack` no tiene un modo «arrojado» del que depender — hace falta que `rules/attacks.ts`
distinga las dos formas del mismo arma, que es un cambio de forma, no de un `if`.

### P2-9 · No hay ninguna puerta para ceder un PNJ a un jugador (2026-09-07)

**DECIDIDO por el autor el 2026-09-07: sí se quiere, pero se diseña DENTRO del paso 3**, no como
endpoint suelto. El motivo salió de ir al manual en vez de decidirlo a ojo, y cambia la forma del
arreglo: **el SRD parte el permiso en dos, y ceder el `ownerId` daría las dos mitades a la vez.**

> *«It acts on each of your turns. **You decide what action it takes and how it moves. The DM has
> the creature's Statistics and resolves all of its Actions and Movement.**»* — Polimorfar
> verdadero, SRD 5.1, leído en la copia de Foundry que vive **fuera del repositorio**
> (`referencia-foundry-dnd5e`, carpeta `spells` sin sufijo `24`). Igual en Insecto
> gigante (*«The DM has the Statistics for these creatures and resolves their Actions and
> Movement»*) y en Animar muertos (*«the DM has the creature's game statistics»*).
>
> Y donde no hay statblock ajeno, el verbo sigue siendo **obedecer**, no controlar: *«always obeys
> your commands. In combat, it rolls its own initiative and acts on its own turn»* (Encontrar
> familiar) · *«They obey any verbal commands that you issue… If you don't issue any commands, they
> defend themselves»* (Convocar animales). **La única vez que el SRD dice «you control it» es en
> posesión** (*Magic Jar*), donde el jugador **es** la criatura.

**Lo que eso implica para el modelo, y por eso no es un endpoint de una línea:** el jugador
**decide** la acción; el DM **tiene los números y los resuelve**. Nuestro permiso de hoy es
dueño-o-DM, que no sabe expresar esa mitad — hace falta un tercer modo, y es la misma pieza que
`invocar` necesita en el paso 3 (un PNJ con `ownerId` del invocador, ver
[2026-09-07-paso-3-lo-que-cabe-medido.md](./superpowers/specs/2026-09-07-paso-3-lo-que-cabe-medido.md)).
**Se diseña una vez, allí, en vez de dos veces mal.** Emparenta con `D-P2-11` (la segunda puerta de
P2-4): las dos son «un permiso que no es *puedes editar esta ficha*».


**Abierto, encontrado al escribir el e2e de P2-3.** Varias fichas y comentarios de este proyecto
hablan de «un PNJ cedido» —P2-3 lo pone en su título, y la nota de `NpcsService.list` explica que
`ownerId` viaja para que la pantalla pueda leer «es tuyo»—, pero **ese estado no se puede alcanzar
usando el producto**: `NpcsService.instanciar` escribe `ownerId: userId` (el DM),
`updateCharacterSchema` no tiene `ownerId`, y ningún endpoint de `npcs` ni de `characters` lo
cambia. Hoy la única forma de tener un PNJ de un jugador es escribir la fila a mano en la base.

Consecuencia práctica, y por eso se anota en vez de dejarlo implícito: **el caso que P2-3 nombra
solo se puede probar con la API simulada**, y su recorrido de navegador mide la otra mitad del
mismo carril de datos (que la lista de PNJ llega al selector). Decidir si ceder un PNJ es una
funcionalidad que se quiere —y con qué permiso— es del autor, no de un agente.

### PM-1 · `entityId` en respuestas de mutación no pasa por la redacción (2026-09-14) — **cerrada el 2026-09-14 en `pnj-del-mundo/cierre`**

**Cerrada.** Decisión del autor: no redactar las quince respuestas de mutación — **quitar el
campo**. `sinEntityId`/`sinEntityIdEnRespuesta` en `apps/api/src/common/entity-link.ts`, aplicado
en `character-sheet.service.ts` (`updateSheet`, `setOverride`, `clearOverride`, `changeHp`,
`changeHpFromEffect`, `applyPendingDamage`, `setHp` —incluido el cuerpo del 409—, `rollDeathSave`),
`level-up.service.ts` (`apply`), `character-state/rest/rest.service.ts` (`requestRest`) y
`characters.service.ts` (`create`, `archive`, `unarchive`; `update` sigue redactando, es una de las
seis lecturas). Las seis lecturas (`characters.service` list/listArchived/get/update,
`character-sheet.service.getSheet`, `npcs.service.list`) no se tocaron. Prueba: aserción en
`apps/api/test/pnj-del-mundo.e2e-spec.ts` (Task 0) tras `POST …/hp`, y unitaria de `sinEntityId` en
`entity-link.spec.ts`.

**Abierto, declarado al escribir el plan (E-PM-10), no encontrado tarde.** Las seis rutas de
LECTURA de `Character` redactan `entityId` con `entityIdsVisibleFor` (`apps/api/src/common/entity-link.ts`,
ver [05-datos.md](./05-datos.md)): quien no puede ver la ficha del mundo recibe `null`. Las
respuestas de MUTACIÓN de estado —`PATCH hp`, condiciones, descanso, y cualquier otra que devuelva
la fila del personaje tras cambiarla— siguen devolviendo la fila cruda a quien ya tiene permiso de
ESCRITURA (DM o dueño), sin pasar por el mismo helper. La fuga concreta: el dueño de un PNJ cedido
con una ficha del mundo que él no puede ver (`DM_ONLY`, por ejemplo) podría leer su `entityId` real
en el cuerpo de una de esas respuestas, aunque las seis lecturas se lo den como `null`. Son quince
lecturas de `Character` repartidas en cinco servicios; cubrirlas todas en esta tanda era perseguir
la completitud (memoria del autor: «el riesgo es perseguir la completitud»). Decisión:
[D-CF-81](./decisiones.md) en [decisiones.md](./decisiones.md).

### PM-2 · El nombre de un PNJ en el hilo no enlaza a su ficha del mundo (2026-09-14)

**Abierto, declarado al escribir el plan (E-PM-12).** Desde esta tanda, el nombre de un PNJ en el
**elenco** enlaza a `/campaigns/:id/entidades/:entityId` cuando llega `entityId` (spec §3.4). En el
**hilo de la sesión** no: `apps/web/src/features/sessions/nombres-del-hilo.ts` resuelve nombres
para las tarjetas de suceso, no rutas, y darle un enlace es tocar el renderizado de mensajes — una
tanda con su propia ficha de diseño, no un añadido de esta. Decisión: [D-CF-83](./decisiones.md)
en [decisiones.md](./decisiones.md).

### T3 · Revelar un grupo entero desde el orden de turnos, de un solo clic (2026-09-14) — **cerrada el 2026-09-14 en `pnj-del-mundo/cierre`**

**Cerrada.** Decisión del autor: «Revelar» junto a «oculto» en `TiraDeIniciativa` revela el GRUPO
entero de esa casilla — una casilla de la tira es un turno, y un turno es un grupo. El menú «…»
del elenco sigue revelando uno solo. `POST /campaigns/:id/characters/reveal-many`
(`revealManySchema`, `packages/shared/src/statblock.schema.ts`) en `NpcBulkVisibilityController`
(nuevo, `campaigns/:campaignId/characters`, declarado antes que `NpcVisibilityController` en
`StatblocksModule`) → `NpcsService.revealMany`: una sola transacción, `revealInTx` (extraído de
`reveal()`) por fila, un `NPC_REVEALED` por criatura. Web: `revealNpcs` + `useRevealNpcs` en
`features/bestiario`. Decisión: [D-CF-87](./decisiones.md).

**Abierto, sin decisión de producto** (histórico, ya resuelto arriba). `TiraDeIniciativa` revela un
PNJ oculto a la vez —«oculto · Revelar» junto al primero del grupo—, aunque el grupo entero
comparta posición (varios goblins idénticos, por ejemplo): el siguiente clic revela al siguiente,
hasta que el grupo entero deja de tener «oculto». Revelar el grupo con un solo botón —seis goblins
con un solo clic— es una decisión de interfaz que la spec de PNJ del mundo y la mesa (§3.2) dejaba
sin cerrar.
