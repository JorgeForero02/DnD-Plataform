# Pendientes cerrados — lo que la poda desbloqueó (2026-09-07)

**Nada de aquí se edita.** Son las fichas tal y como estaban al cerrarlas, con sus errores dentro:
es un registro de lo que se creía, no una descripción del sistema de hoy. Si alguna contradice a
`docs/01`–`08`, **manda `docs/`**.

Las tres salieron de `06-pendientes.md` el 2026-09-07 al ejecutar
[`2026-09-07-lo-que-la-poda-desbloqueo.md`](../superpowers/plans/2026-09-07-lo-que-la-poda-desbloqueo.md).

**Ninguna era nueva.** Las tres llevaban semanas en el tablero con una cláusula *«Cierra
cuando…»* que el paso 2 había cumplido la noche anterior sin que nadie lo notara — porque una
condición de cierre no se revisa sola. Ése fue el hallazgo de la poda: el tablero no estaba
caducado, estaba **desactualizado respecto a lo que se había construido**.

> ## Dos frases de la ficha del combate eran falsas, y se conservan aquí sin tocar
>
> La ficha «Nadie propone terminar el combate» dice que **«hoy todos los combatientes son
> `NEUTRAL`»** y da por hecho que **un jugador a 0 PG desaparece de la mesa**. Las dos eran falsas
> al ejecutarla, y se comprobó antes de escribir una línea de código:
>
> - El bando existe desde el paso 2 — `apps/api/prisma/schema.prisma:429`, `ALLY`/`ENEMY`/`NEUTRAL`.
> - **Nada** bajo `apps/api/src/encounters/` lee `currentHp`, así que no había nadie retirando a
>   nadie. Lo que de verdad faltaba era que la mesa **dijera en qué estado está** quien cayó.
>
> Se dejan escritas porque el valor de un registro fechado es decir qué se creía entonces. Lo que
> se corrigió fue **el trabajo**, no la ficha.

---

## P1 · Quedan dos puertas por las que un jugador se concede una mecánica, y las dos se dejan a propósito (2026-09-06, revisión del paso 1 · tarea 1)

**Esta ficha se abre después de recorrer los tres pasos anteriores, y dice qué se descartó en cada
uno** — que es lo que la hace útil dentro de tres meses. La tarea 1 cerró la puerta genérica de
condiciones; la revisión encontró que el resultado que el commit prometía —«un jugador no puede
concederse una mecánica»— **sigue siendo alcanzable por otras dos**.

**Puerta A · Ayudar con un segundo personaje propio.** `ConditionsService.help` exige dueño o DM
**del ayudante**, y del ayudado solo que esté en la campaña; crear personajes no tiene tope
(`apps/api/src/characters/characters.service.ts`). Así que un jugador con dos personajes se da
`helped` desde uno al otro. **No es teórico:** `apps/api/test/ayudar.e2e-spec.ts` crea los dos con
**el mismo token de jugadora** y espera 201, y `apps/web/src/features/sessions/elenco/AyudarA.tsx`
filtra los candidatos solo por «no soy yo», así que el desplegable ofrece tu otro personaje.

- **Paso 1 descartado** — el arreglo rápido sería prohibir que ayudante y ayudado compartan dueño.
- **Paso 2 lo tumba, y esta es la razón de peso:** el SRD **permite** que dos criaturas distintas se
  ayuden, y que las lleve la misma persona no las convierte en una. Prohibirlo sería inventarse una
  regla que el manual no tiene, y este proyecto tiene escrito que las reglas de D&D son verdad
  absoluta.
- **Paso 3:** lo que el SRD **sí** cobra es que Ayudar es una **acción**, y por tanto una por turno.
  Eso es la economía de acciones, que **es el paso 2 del plan maestro** y está explícitamente fuera
  del paso 1. Con ella, esta puerta se cierra sola y sin ninguna regla inventada.

**Cierra cuando** exista la economía de acciones y Ayudar cueste la acción del ayudante.

**Puerta B · Los modificadores temporales.** `TemporaryModifiersService.grant` pide solo
`requireOwnerOrDM`, y lo que concede entra en la derivación de la hoja: **un jugador puede darse
`+10` al ataque, sin caducidad y con el motivo que quiera**, que es estrictamente más que la ventaja
de `helped`.

- **Paso 1 descartado** — cerrarlo a DM son tres líneas.
- **Paso 2 lo frena:** es una **decisión escrita del autor** con un caso de uso real —beberse una
  poción que ya llevas encima no debería ser una petición al DM—. Lo que sí caducó es la mitad de su
  argumento: decía «es la misma autoridad que gobierna aplicarse una condición», y eso dejó de ser
  cierto el 2026-09-06. El docstring ya está corregido.
- **Paso 3:** la salida buena es que el camino legítimo deje de necesitar esta puerta — **la tarea 7
  de este mismo plan** hace que consumir un objeto aplique sus efectos. Con ella, la poción entra
  por su sitio y este `grant` puede cerrarse sin quitarle nada a nadie.

**Cierra cuando** la tarea 7 esté hecha y se decida si `grant` pasa a ser del DM. **Es una decisión
del autor**, no del agente: quita una capacidad que él concedió por escrito.

**Puerta C, y esta sí es media pieza que falta:** la hoja ofrece a un jugador las **quince**
condiciones del SRD sobre su propio personaje (`apps/web/src/features/character-sheet/Condiciones.tsx`),
y desde el 2026-09-06 las quince le dan 403. **Es un botón que el servidor rechaza**, que es
justamente lo que la revisión del prototipo dejó escrito como defecto. Se cierra en el mismo paso 1,
en el carril de pantalla.

---

## P2 · Nadie propone terminar el combate, y «derrotado» ya está decidido (2026-09-05)

**El autor decidió qué cuenta como derrotado**, que era lo único que faltaba para poder proponerlo.
Su decisión, con sus palabras:

> *«Cuando los enemigos —o en su defecto los jugadores— quedan sin vida. Los enemigos saldrán en
> gris hasta el final del combate, donde ya no les saldrá a los jugadores; al DM tal vez como
> historial, pero puede que tampoco, para no molestar. Si un jugador muere, este no desaparece: hay
> eventos que tal vez puedan revivirlo si el DM quiere o si las reglas lo dictan.»*

**Y resulta que la asimetría que describe ES la regla, no una preferencia.** El SRD 5.1, en
«Dropping to 0 Hit Points», trata distinto a los dos: un monstruo a 0 PG **muere en el acto** salvo
que el DM decida dejarlo inconsciente; un **personaje jugador cae inconsciente y empieza a tirar
salvaciones contra muerte** — no muere. **La cita exacta hay que verificarla en el SRD en inglés al
implementarlo**, que es la regla de este proyecto; aquí se resume, no se transcribe.

**Media pieza ya está construida:** `deathSaveSuccesses` y `deathSaveFailures` son columnas,
`deathSaveSchema` existe, hay ruta en `apps/api/src/characters/character-sheet.controller.ts:87`, y
un descanso largo las borra (`apps/api/src/character-state/rest/rest.service.ts:90`).

**Depende del bando**, que lo entrega el plan de la iniciativa
([`superpowers/plans/2026-09-05-iniciativa-y-bando.md`](./superpowers/plans/2026-09-05-iniciativa-y-bando.md)):
hoy todos los combatientes son `NEUTRAL`, así que «no queda ningún enemigo en pie» **no se puede ni
calcular**.

**Y no se termina solo, se PROPONE.** Es la doctrina que las Herramientas del DM ya llevan impresa:
*«El sistema propone; tú decides. Nada llega a la mesa hasta que lo confirmas.»* Un enemigo a 0 puede
estar inconsciente, los enemigos huyen, y un combate se acaba parlamentando con el jefe en pie.

**Cierra cuando** el combate proponga terminarse al quedar un solo bando en pie, los derrotados se
pinten en gris mientras dura, y **un personaje jugador a 0 PG siga en la mesa** con sus salvaciones
contra muerte a la vista. **No cierra** con un cierre automático: eso sería el servidor decidiendo
por el DM.

---

## P1 · El «500 intermitente» de `CharacterSheetService.updateSheet` era `supertest`, no el servicio (medido y descartado en `9ef7245`)

**Esta ficha acusaba al código equivocado.** Decía que varios `PATCH /campaigns/:id/characters/:id/sheet`
concurrentes de personajes DISTINTOS podían hacer que `this.prisma.character.update()`
(`apps/api/src/characters/character-sheet.service.ts`, dentro de `updateSheet`) fallara con
`PrismaClientKnownRequestError P2025` («Record to update not found»), y apuntaba como sospechosa a
«una condición de carrera en el pool de conexiones de Prisma». Se ha medido y **esa hipótesis está
descartada**: no hay ninguna carrera en `updateSheet` ni en el pool de Prisma.

**Lo que de verdad pasa: es `supertest` disparando `app.listen(0)` una vez por petición.**
`supertest` (`lib/test.js:63` dentro de su paquete, versión `7.2.2` <!-- docs-lint-ignore -->) hace
`if (!addr) this._server = app.listen(0)` cada vez que le pasan un servidor que todavía no está
escuchando. Si dos o más
`request(app.getHttpServer())` corren **a la vez** contra una app montada con
`Test.createTestingModule(...).init()` sin haber llamado nunca a `app.listen()` —que es la
convención de **toda** la suite `.e2e-spec.ts` de este repositorio—, varias llamadas a
`app.listen(0)` compiten sobre el mismo `http.Server`. Esa carrera es de la librería de test, no
del código de la API, y el P2025 que salía era uno de sus síntomas.

**Cómo se midió, con las cifras:**

1. El 500 se reproducía de forma fiable (en los primeros 1 a 10 intentos de tres `PATCH`
   concurrentes) dentro de un e2e con ese arranque sin `app.listen()`.
2. La misma lógica de negocio, sin tocar una línea, lanzada contra una app que sí llama a
   `app.listen(0)` antes de las peticiones concurrentes: **0 fallos en 150-200 intentos** con
   hasta 6-8 jugadores por intento, vía el propio arnés de test.
3. La prueba decisiva: la API real levantada con `pnpm --filter @dnd/api start:dev` (código sin
   ningún cambio) recibió **200 intentos × 4 jugadores** y luego **100 intentos × 8 jugadores**
   —hasta 900 peticiones HTTP reales concurrentes, por `fetch` de Node, sin `supertest` de por
   medio—: **cero 500, cero fallos**.

**Qué significa en la práctica.** Una prueba que lanza peticiones concurrentes con `supertest`
contra una app que nunca llamó a `app.listen()` puede fallar sin que haya nada roto en el
producto. Quien se encuentre esto tiene dos salidas: serializar el montaje de la prueba —que es
justo lo que ya hizo `apps/api/test/iniciativa-pedida.e2e-spec.ts`, sin saber entonces por qué
funcionaba— o hacer que esa suite concreta llame a `app.listen()` de verdad. Esta ficha no cambia
la convención del repo ni toca ningún e2e existente: solo deja escrito el porqué, para que el
siguiente que vea un P2025 en un e2e concurrente no vuelva a perseguir un fantasma en
`character-sheet.service.ts`.

**Cierra** con este mismo texto: no hay arreglo pendiente en `updateSheet`, y no se reabre salvo
que alguien reproduzca un 500 real **contra un servidor con `app.listen()`**, dentro o fuera de
un test — eso sí sería un caso nuevo, no este.
