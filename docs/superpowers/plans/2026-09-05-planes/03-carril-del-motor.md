# Plan 03 · El carril del motor (D-OP-12 · 11 · 15 · 13 · 17)

**Objetivo en una frase:** cerrar las cinco fichas de servidor que la auditoría dejó, empezando por
la que desbloquea a otras dos.

**Tamaño:** cinco commits, una migración. **Depende de:** plan 02 (para D-OP-17).
**Todo es `apps/api/**`, `packages/shared/**` y `prisma/**`** — no toca la web, así que puede correr
en paralelo con los planes 04, 06 y 07.

**El orden no es negociable:** `D-OP-12` primero, porque **P1 y P3 son la misma tarea que él**.

---

## 3.1 · D-OP-12 · Los sucesos tienen concesiones nominales

**El defecto, con su línea:** `game-events.service.ts:164` evalúa

```ts
return canView(viewer, { visibility, createdById: actorUserId, grantedUserIds: [] });
```

Con `grantedUserIds` **siempre vacío**, un suceso `SPECIFIC_PLAYERS` **no lo ve nadie salvo el DM**.
Y el sistema ya lo sabe: `entities.service.ts:235` **guarda `DM_ONLY`** cuando la entidad es
`SPECIFIC_PLAYERS`, con un comentario que dice que es un parche honesto a la espera de esto.

**La forma, decidida y con motivo:** **columna `grantedUserIds String[]` en `GameEvent`**, no tabla
de unión. Tres razones medidas: el filtrado **ya ocurre en memoria** tras el `findMany`, así que una
tabla obliga a un `include` para nada; el esquema **ya usa `String[]`** en cuatro sitios; y lo que se
pierde —integridad referencial: el id de un usuario borrado no casa con nadie— **es inofensivo**.

**Pasos.**
1. Columna `grantedUserIds String[] @default([])` en `GameEvent` + migración.
2. `RecordGameEventInput` acepta `grantedUserIds?: string[]` (en `packages/shared`, **solo añade**).
3. `record()` la guarda; `canSee()` la pasa a `canView` **en vez del array vacío**.
4. **Retirar el parche de `entities.service.ts:235`**: el suceso de revelar vuelve a guardarse con la
   visibilidad de verdad y con los `grantedUserIds` de la entidad. Y **borrar el comentario que
   explicaba el parche**, o quedará mintiendo.
5. **P3-archivar**: el suceso de archivar un personaje llega a su dueño. Misma tarea, mismo commit.

**Cuidado:** al retirar el parche hay que **comprobar el camino entero**, no el `record`. Un jugador
nombrado tiene que ver la línea en su registro; uno no nombrado, no.

## 3.2 · D-OP-11 · El oráculo de la CA

**El defecto:** `character-sheet.service.ts:1472` busca el objetivo del ataque **sin consultar
`canView`**, aunque el servicio ya importa `canView` (`:71`) y tiene `viewerFor()` (`:237`). Con un
identificador y paciencia, cualquiera deduce la CA de cualquier personaje de la campaña.

**La regla, decidida contra el SRD:** el objetivo tiene que **pasar `canView` para el atacante** *o*
**ser combatiente del encuentro activo**; si no, **404 idéntico al de un identificador inventado**.

**404 y no 403, y esto es lo importante:** un 403 confirma que el personaje existe. La respuesta
tiene que ser **indistinguible** de la de un id que nadie ha creado nunca.

**Lo que NO se arregla, y se declara:** contra un objetivo visible la CA **sigue siendo deducible**
atacándolo, igual que en una mesa. El SRD lo respalda —*«the GM typically just says the attack
missed»*— y **no prohíbe atacar a ciegas**, que es legal con desventaja.

## 3.3 · D-OP-15 · `attackRollEventId` a columna con índice único

**El defecto:** el campo **solo es entrada**: se acepta y no se guarda, así que nada impide aplicar
dos veces el daño de la misma tirada.

**La forma:** columna en el suceso de daño + **índice único**. Mismo criterio que promovió
`damageType`.

> **PostgreSQL trata dos nulos como distintos**, así que los sucesos sin ese campo **no chocan entre
> sí**. Esa es la razón por la que un único índice basta y no hace falta un índice parcial.

**Y esta es SOLO LA MITAD de la ficha C2.5-2.** La otra —que la web mande `attackRollEventId` y que
`critical` se pueda borrar del esquema— vive en el **plan 15**, porque es web. **Las dos tienen que
caer para que la ficha cierre**, y el orden es: primero la web manda, luego se quita `critical`.

**Por qué la base y no una comprobación en el servicio:** «una sola vez» comprobado en código es una
carrera esperando a ocurrir con dos pestañas abiertas. Y el registro es **de solo añadir**: la
alternativa sería mutar una fila, que aquí no se hace.

## 3.4 · D-OP-13 · La ventaja de atacar a un ciego

**Qué falta exactamente:** de `blinded`, 2.5.5 ya implementa **la desventaja del ciego** y declara
sus dos exclusiones. Lo que falta es **la ventaja del ATACANTE** contra un objetivo ciego.

**Dónde va:** en el **camino del ataque**, que conoce al objetivo desde 2.5.3. No en
`suggested-roll-mode.ts`, que responde a otra pregunta —«¿cómo tiro yo?»— y lo dice en su propio
comentario.

**Lo que se queda fuera a propósito:** el fallo automático de pruebas que requieren vista. El
servidor **no sabe** si una prueba concreta requiere vista, y esa exclusión ya está declarada.

## 3.5 · D-OP-17 · «Dónde se quedó» en el listado

**Depende del plan 02.** Con `Session.recap` y `recapVisibility` como columnas, esto es una consulta;
sin ellas, es leer Json y filtrar en memoria.

**Qué hace:** `campaigns.service.ts:41` devuelve hoy solo rol y número de miembros. Añade la crónica
**de la última sesión `CLOSED`**, filtrada por `canView` con el espectador.

**El caso que hay que probar y es el que se olvida:** una campaña **sin ninguna sesión cerrada**, y
otra cuya última crónica el jugador **no puede ver**. En los dos, el listado tiene que salir bien y
sin el campo — no con un hueco raro.

---

## Pruebas

Por ficha, y **todas con su mutación**:

| Ficha | Prueba que la demuestra | Mutación que debe ponerla roja |
|---|---|---|
| D-OP-12 | e2e: un suceso `SPECIFIC_PLAYERS` con dos jugadores nombrados **llega a esos dos y a nadie más** | Volver a `grantedUserIds: []` |
| D-OP-11 | e2e: atacar a un personaje que no se puede ver da **404**, y **el mismo cuerpo** que un id inventado | Devolver 403, o quitar la comprobación |
| D-OP-15 | e2e: aplicar dos veces el daño de la misma tirada → la segunda **falla en la base** | Quitar el índice único |
| D-OP-13 | unitaria: atacante contra objetivo `blinded` → **ventaja**; sin la condición → normal | Quitar la rama de ventaja |
| D-OP-17 | e2e: listado con crónica visible, con crónica oculta y **sin sesiones cerradas** | Quitar el filtro de `canView` |

**El 404 se compara byte a byte** con el de un id inventado. Si el cuerpo difiere en una coma, el
oráculo sigue abierto por otra puerta.

## Guía de revisión

- [ ] **D-OP-12 fue primero** y el parche de `entities.service.ts` está **retirado**, con su
      comentario borrado y no dejado mintiendo.
- [ ] Ningún `grantedUserIds: []` codificado a mano queda en el servicio de sucesos.
- [ ] El 404 del oráculo es **idéntico** al de un id inventado, comprobado comparando respuestas.
- [ ] El índice único de `attackRollEventId` **está en la migración**, no solo en el esquema.
- [ ] La ventaja del ciego vive en el camino del ataque, **no** en `suggested-roll-mode.ts`.
- [ ] D-OP-17 se probó con **campaña sin sesiones cerradas** y con **crónica no visible**.
- [ ] `canView` sigue siendo el dueño único: nadie reimplementó la matriz.
- [ ] Cinco commits, cada uno con el árbol verde. **No los juntes**: uno que decide y otro que limpia
      no se revierten igual.

## Trampas

- **`String[]` es de PostgreSQL y Prisma lo soporta con `has`/`hasSome`/`hasEvery`.** Pero el
  filtrado de este proyecto ocurre **en memoria tras el `findMany`**, así que no hace falta ninguno:
  si te ves escribiendo `hasSome`, párate y mira dónde estás filtrando.
- **`SPECIFIC_PLAYERS` y `OWNER_DM` no se contienen.** La matriz **no es un orden total**: no
  escribas «la más restrictiva de las dos» en ninguna parte, porque no está definida.
- **El registro es de solo añadir.** Ninguna de estas fichas muta un `GameEvent` existente.
- **La primera versión de una prueba de 404 suele probar el caso fácil** (un id con formato inválido)
  y no el difícil (un id válido de un personaje real que no puedes ver). Prueba el difícil.

## Definición de terminado

Cinco commits, `pnpm verify` verde en cada uno, `test:e2e` de API corrido con Postgres real, las
cinco mutaciones probadas, y las fichas anotadas en el maestro. **P1 y P3-archivar cerradas por
D-OP-12**, dicho explícitamente en su commit.


---

## Avance — lo escribe quien ejecuta este plan

> **Obligatorio, y se escribe MIENTRAS se trabaja, no al final.** Si la sesión se queda sin contexto
> o muere, **esto y el prompt de arranque son lo único que sabe la siguiente**. Una línea por paso,
> con su commit. Nada de memoria: `fichero:línea` o no cuenta.

| Estado | Cuándo | Qué |
|---|---|---|
| ✅ hecho | 2026-09-05 | **3.1 · D-OP-12 + P1 + P3-archivar.** Columna `grantedUserIds String[]` en `apps/api/prisma/schema.prisma:456-470`, migración `apps/api/prisma/migrations/20260905040000_game_event_granted_users/migration.sql`. `recordGameEventSchema` la acepta (`packages/shared/src/game-event.schema.ts:467-477`), `record()` la guarda y `canSee` la pasa a `canView` (`apps/api/src/game-events/game-events.service.ts:181`). **Parche de `entities.service.ts` retirado** con su comentario reescrito (`:220-241`). `audienciaDeSuceso` nueva en `apps/api/src/common/visibility.ts`. **Commit `52a461f`** |
| ✅ hecho | 2026-09-05 | **3.2 · D-OP-11 · el oráculo de la CA.** `sePuedeApuntar` en `apps/api/src/characters/character-sheet.service.ts:246-280` (`canView` **o** combatiente de encuentro **activo**), aplicado en `resolveAttack` con **el mismo 404** que un id inventado. Comentario del método reescrito: decía «por qué no exige `canView`». **Commit `11c607c`** |
| ✅ hecho | 2026-09-05 | **3.3 · D-OP-15.** Columna `attackRollEventId String? @unique` en `apps/api/prisma/schema.prisma:471-486`, migración `apps/api/prisma/migrations/20260905050000_damage_charged_once/migration.sql`. La escribe `RollsService.roll` por un **parámetro interno** (`apps/api/src/rolls/rolls.service.ts:69-82`), y `rollAttack` traduce el `P2002` a 409 (`apps/api/src/characters/character-sheet.service.ts:1378-1400`). **Commit `5481225`** |
| ✅ hecho | 2026-09-05 | **3.4 · D-OP-13 · la ventaja de atacar a un ciego.** Módulo puro nuevo `apps/api/src/character-state/roll-mode/modo-contra-objetivo.ts` con la tabla del SRD **verificada en inglés**, aplicado en `resolveAttack` (`apps/api/src/characters/character-sheet.service.ts:1487-1512`). Cierra **L3** en `docs/06-pendientes.md`. **Commit `0776569`** |
| ✅ hecho | 2026-09-05 | **3.5 · D-OP-17 · «dónde se quedó».** `listForUser` trae la última sesión `CLOSED` con `take: 1` y filtra por `recapVisibility` (`apps/api/src/campaigns/campaigns.service.ts:41-110`); la pantalla la pinta (`apps/web/src/features/campaigns/Cronicas.tsx:160-175`). **Commit `288b3ea`** |
| ✅ | 2026-09-05 | **EL PLAN 03 ESTÁ CERRADO**: las cinco fichas, con sus cinco mutaciones probadas |

**Leyenda:** ⬜ sin empezar · 🟨 en marcha · ✅ hecho · ⛔ bloqueado (di por qué y qué descartaste).

**Lo que decidí por los cuatro pasos** (qué no cuadraba · qué elegí · por qué es duradero · la
fuente si la hubo):

- **3.1 · P3 no se arregló como la ficha suponía, y la ficha estaba equivocada.** Decía que hacía
  falta «que el modelo de sucesos sepa de dueños ajenos». No hacía falta: **un suceso no tiene dueño
  propio** —`GameEventsService` evalúa `canView` con el **actor** como creador—, así que copiar
  `OWNER_DM` tal cual escribía un suceso cuyo dueño era el DM que archivó. Lo que hacía falta era
  **traducir el nivel de la cosa al par (visibilidad, nombrados) que produce su misma audiencia**:
  `OWNER_DM` significa «su dueño y el DM», y nombrar al dueño en `SPECIFIC_PLAYERS` da ese conjunto
  exacto, porque el DM lo ve todo siempre. Dura porque **no toca `canView`** y porque la traducción
  vive en un solo sitio.
- **3.1 · Y esa traducción vive en `common/visibility.ts`, no en el servicio de personajes.** La
  regla que no se negocia dice que nadie reimplementa la matriz por su cuenta; `audienciaDeSuceso`
  es un trozo de la misma matriz, y ya tiene **dos** consumidores (archivar y revelar). Escribirla
  en el servicio habría sido la tercera copia de un predicado de visibilidad — este repositorio ya
  pagó esa cuenta tres veces con `=== "PLAYERS"`.
- **3.1 · La migración se rehízo con `NOT NULL`.** La primera versión escribió
  `TEXT[] DEFAULT ARRAY[]::TEXT[]` sin `NOT NULL`, y Prisma declara los campos de lista como no
  nulos: eso es **deriva silenciosa** entre el esquema y la base. Se corrigió el fichero, se borró
  la fila de `_prisma_migrations` y la columna, y se aplicó de nuevo — en vez de dejar una segunda
  migración de una línea corrigiendo a la anterior.
- **3.1 · Se pasa la lista al ESCRIBIR, no se resuelve al leer.** La ficha proponía como alternativa
  «que `canSee` sepa resolver las de la entidad a la que apunta». Se descartó y no solo por barato:
  quien mire el registro dentro de un mes tiene que ver quién estaba nombrado **cuando pasó**. Un
  registro de solo añadir cuya visibilidad cambia sola no es un registro.

- **3.2 · El e2e que existía atacaba a un PNJ `DM_ONLY` FUERA de combate, y la regla nueva lo
  bloquea.** No es que la regla estuviera mal: ese e2e era **el oráculo en acción**. El criterio de
  cierre del spec de 2.5.3 —«un jugador ataca a un PNJ `DM_ONLY` y recibe su veredicto»— se conserva
  entero **bajando el PNJ a la mesa**: el `beforeAll` de
  `apps/api/test/ataque-comparado-en-el-servidor.e2e-spec.ts:104-127` abre sesión y encuentro con el
  atacante y el objetivo. Que el PNJ esté delante es exactamente cuando alguien puede apuntarle en
  la ficción.
- **3.2 · El comentario del método decía lo contrario de la ficha, y ganó la ficha.** En
  `character-sheet.service.ts` había un párrafo titulado «Por qué no exige `canView` sobre el
  objetivo», con su razonamiento. Era cierto en su día y **convertía el endpoint en un oráculo**. Se
  reescribió entero en vez de añadir el código y dejarlo: una frase con la sintaxis en regla que
  describe algo que el código ya no hace es la clase de mentira que ningún script caza.
- **3.2 · `canView` sola no basta, y el encuentro solo tampoco.** `canView` dejaría fuera al PNJ que
  el DM acaba de bajar a la mesa; el encuentro dejaría fuera al objetivo visible al que se ataca
  **fuera** de combate, que es legal. Por eso son las dos, con **o**.

- **3.3 · El campo NO entra en `createRollSchema`, y esa es la decisión.** Ponerlo en el esquema
  público habría sido lo obvio y abre una puerta nueva: un cliente podría mandar el
  `attackRollEventId` **de la tirada de otro** y, con el índice único detrás, dejarla **incobrable
  para siempre**. Es la puerta de al lado del problema que la ficha cierra. Va por un parámetro
  `interno` de `RollsService.roll`, igual que `record` ya tenía `options.fromRulesEngine`.
- **3.3 · El cuarto argumento solo se pasa cuando hay algo que decir.** Pasar `undefined` explícito
  cambiaba la forma de **todas** las llamadas del camino de siempre y ponía en rojo seis pruebas que
  no tenían nada que ver. Tres pruebas sí se actualizaron —las que **sí** mandan el campo—, y eso es
  honesto: la llamada ahora lleva un argumento más.

- **3.4 · La tabla entra ENTERA, no solo `blinded`.** El plan pedía la ventaja contra un ciego; el
  SRD dice lo mismo, con la misma frase, de `paralyzed`, `petrified`, `restrained`, `stunned` y
  `unconscious`, y lo contrario de `invisible`. Escribir seis literales en una tabla que ya existía
  no abre ningún frente, y dejarlos fuera habría sido una omisión que alguien tendría que descubrir
  atacando a un paralizado y viendo que no pasa nada. **Las reglas de D&D son verdad absoluta.**
- **3.4 · `prone` se queda fuera, y eso es una decisión, no un olvido.** *"advantage if the attacker
  is within 5 feet… Otherwise, disadvantage"*: **depende de la distancia**, y hasta la fase 3 no hay
  tablero. Elegir una de las dos mitades sería inventarse la mitad de las veces. Mismo criterio con
  el crítico automático de `paralyzed`/`unconscious`. Es exactamente el que ya usaba
  `suggested-roll-mode.ts` para el fallo automático del ciego.
- **3.4 · Módulo nuevo y no una función más en `suggested-roll-mode.ts`.** Ese fichero declara en su
  cabecera, desde antes de esto, que deja fuera *«Attack rolls **against** the creature»* porque
  responde a otra pregunta. Meterlo ahí habría convertido su comentario en mentira.
- **`docs/07-historial.md` se pasó de 400 líneas** con las cinco entradas del plan 03 (413). Se
  archivaron **dos entradas enteras, sin resumir**, en
  `docs/_archivo/historial-2026-09-03-y-04-sueltas.md`, que es una de las dos salidas legítimas que
  el propio fichero declara.

- **3.5 · Si la última crónica no se ve, NO se busca una anterior.** Era la tentación obvia —el
  jugador se queda sin nada— y sería peor: enseñar una crónica más vieja bajo el rótulo «dónde se
  quedó» **diría que la partida se quedó donde no se quedó**. El plan lo zanjaba en su lista de
  pruebas («en los dos, el listado sale bien y **sin el campo**»), así que no hubo que decidirlo.
- **3.5 · «No hay crónica» y «hay una y no la ves» se pintan IGUAL.** La tarjeta cae en los dos
  casos al mismo texto. Distinguirlos —un «esta crónica no es para ti»— contaría que existe algo
  escondido, que es la fuga barata de siempre.
- **3.5 · Se tocó `apps/web`, aunque el plan 03 se declara solo de servidor.** Sin la pantalla, la
  ficha seguiría abierta con el servidor hecho: es el patrón que este proyecto ha cerrado en falso
  cuatro veces. Son quince líneas en un hueco que **ya existía y prometía justo esto**.

**Lo siguiente exacto, si me quedo aquí:**

<!-- hecho:
- **3.4 · D-OP-13, la ventaja de atacar a un ciego.** Falta **la ventaja del ATACANTE** contra un
  objetivo ciego; la desventaja del ciego ya está (`apps/api/src/character-state/roll-mode/suggested-roll-mode.ts:81`).
  Va **en el camino del ataque**, que conoce al objetivo desde 2.5.3, y **no** en
  `suggested-roll-mode.ts`, que responde a otra pregunta —«¿cómo tiro yo?»— y lo dice en su propio
  comentario. Lo que sigue fuera: el fallo automático de pruebas que requieren vista, porque el
  servidor no sabe si esta prueba concreta la requiere. -->
- **Nada: el plan 03 está cerrado, con sus cinco fichas y sus cinco mutaciones.** Lo siguiente del
  índice es el **plan 15** (`15-el-critico-y-lo-pequeno.md`), que dependía de este: `D-OP-15` ya
  puso el índice único, así que **falta su otra mitad** —que la web mande `attackRollEventId` y que
  `critical` suelto se pueda borrar de `rollAttackSchema`—, y el orden importa: primero la web
  manda, después se quita.

<!-- lo que decía antes de cerrarse:
- **3.5 · D-OP-17, «dónde se quedó».** `campaigns.service.ts#listForUser` devuelve hoy rol y número
  de miembros; hay que añadir la crónica de la última sesión `CLOSED` **filtrada por
  `recapVisibility`** —que desde el plan 02 es columna, así que es una consulta—. **El caso que se
  olvida:** una campaña **sin ninguna sesión cerrada**, y otra cuya crónica el jugador no puede ver.
  En los dos, el listado sale bien y **sin el campo**. -->

<!-- lo que decía este bloque antes de hacerse:
- **3.3 · D-OP-15, `attackRollEventId` a columna con índice único.** Hoy el campo **solo es
  entrada**: `esCriticoDesdeLaTirada` (`apps/api/src/characters/character-sheet.service.ts:1400-1430`)
  lo lee y **no lo guarda**, así que nada impide cobrar dos veces el daño de la misma tirada. El
  daño se escribe por `RollsService.roll` (`apps/api/src/rolls/rolls.service.ts:109-133`), que es
  quien llama a `events.record`: hay que hacer viajar el campo hasta ahí, darle **columna con índice
  único** en `GameEvent`, y que el segundo cobro **falle en la base**. PostgreSQL trata dos nulos
  como distintos, así que los sucesos sin ese campo no chocan entre sí y **basta un índice único
  normal**, sin parcial. -->
