# Plan 02 · Las tres columnas (I10 · I11 · I14)

**Objetivo en una frase:** tres campos pequeños que arreglan una mentira y desbloquean dos funciones
ya decididas —«dónde se quedó» (D-OP-17) y la línea de tiempo (D4)—.

**Tamaño:** una migración y tres commits. **Dependencias:** ninguna. **Desbloquea:** plan 03 y la
línea de tiempo.

> **El principio que gobierna las tres, escrito una vez:** *lo que se filtra es columna; lo que solo
> se pinta puede ser Json.* Este proyecto ya lo decidió dos veces —`damageType` y
> `attackRollEventId`— y las dos veces acertó.

---

## 2.1 · `Combatant.side` — el bando vive en el encuentro

**La decisión, y por qué NO va en `Character`.** «Enemigo» no es una propiedad de una criatura: es
**una relación en un momento**. Un `Character.faction` habría que mantenerlo sincronizado con la
ficción y se pudre el día que el mercader se vuelve enemigo. En el combatiente es un dato de vida
corta que **muere con el encuentro**, que es lo correcto.

**Lo que gana con el tiempo:** en la fase 3, **el bando es lo que colorea las fichas del tablero y
alimenta la niebla**. Heredarlo de un campo podrido sería heredar una mentira.

**Esquema.** En `apps/api/prisma/schema.prisma`, modelo `Combatant` (línea ~349):

```prisma
enum CombatantSide {
  ALLY
  ENEMY
  NEUTRAL
}
```
y en `Combatant`: `side CombatantSide @default(NEUTRAL)`.

**Por qué `NEUTRAL` por defecto y no `ENEMY`:** los combatientes existentes se crearon sin bando, y
un valor por defecto que **afirme** algo convertiría filas viejas en una afirmación que nadie hizo.
`NEUTRAL` significa literalmente «no se ha dicho».

**Dónde se pone.** Al añadir combatientes al encuentro (el diálogo de «Entrar en combate» ya elige
personajes): el DM marca el bando. **El servidor no lo adivina** — no hay dato del que deducirlo.

**Lo que NO entra en este plan:** «lo que está haciendo». Se retira: su sitio es la línea de tiempo,
donde «qué pasó» está por diseño, y duplicarlo crearía una segunda versión de la historia.

## 2.2 · `Session.openingEntityId` — dónde abre la escena

**Esquema.** En `Session` (línea ~283):

```prisma
openingEntityId String?
openingEntity   Entity? @relation("SessionOpeningEntity", fields: [openingEntityId], references: [id], onDelete: SetNull)
```

**`onDelete: SetNull` y no `Cascade`**: borrar un lugar del mundo **no puede borrar la sesión**.

**La regla de visibilidad, que es la parte que importa.** Al devolver la sesión, la ficha de apertura
pasa por **`canView`** con el espectador: un jugador que no puede ver «El Santuario Sellado» **no
recibe ni su nombre**. No se filtra en el cliente. Si no puede verla, el campo llega **ausente**, no
`null` con nombre — ausente y presente-pero-vacío son cosas distintas para quien pinta.

**Nunca guardes el nombre del lugar como texto.** Se queda viejo, no enlaza y no respeta la
visibilidad.

**Lo que gana con el tiempo, y es lo que justifica la columna:** la cabecera de escena deja de
prometer sin datos · **la línea de tiempo la necesita** (cada sesión es un nodo, y un nodo sin lugar
es un punto sin mapa) · **la capa de ambiente** sabrá que la sesión abre en un pantano.

## 2.3 · `Session.recap` y `Session.recapVisibility` — la crónica sale del Json

**El defecto, verificado hoy:** `session.schema.ts:76` acepta `recapVisibility`, la web la manda
(`sessions/hooks.ts:81`, con `?? "PLAYERS"`), y `sessions.service.ts:186` usa `closed.visibility`.
**Elegir quién ve la crónica no hace absolutamente nada.** Y la crónica vive **dentro de `notes`
(Json)**, no en columna.

**El argumento que decide, y no es la limpieza: es D-OP-17.** «Dónde se quedó» en el listado de
campañas tiene que traer **la crónica de la última sesión cerrada, filtrada por visibilidad**. Eso es
una consulta con filtro, y filtrar por un campo dentro de un Json es exactamente lo que este proyecto
ya decidió no hacer. Si aplicas la visibilidad dejándola en el Json, **D-OP-17 nace con una consulta
que hay que rehacer**.

**Esquema.**

```prisma
recap           String?
recapVisibility Visibility @default(PLAYERS)
```

**La migración tiene que mover lo que ya hay.** `notes` es `Json?` y la crónica vive dentro como
`{ "recap": "..." }`. La migración copia ese valor a la columna nueva:

```sql
UPDATE "Session"
SET "recap" = "notes"->>'recap'
WHERE "notes" ? 'recap' AND "notes"->>'recap' IS NOT NULL;
```

**No borres la clave de `notes` en esta migración.** Dejarla es barato y hace la vuelta atrás
trivial; se limpia en otra, cuando conste que nadie la lee. Y **el servicio deja de escribirla**:
`close()` escribe `recap` y `recapVisibility`, no `notes`.

**Y `close()` tiene que usar de verdad `input.recapVisibility`** — ese es el arreglo, lo demás es
fontanería.

---

## Pruebas

**Unitarias (API):**
- `close()` guarda **la visibilidad que le pasan**, no la de la sesión. Dos casos: sesión `PLAYERS`
  con crónica `DM_ONLY`, y sesión `DM_ONLY` con crónica `PLAYERS`. **El segundo es el que importa**:
  demuestra que la crónica puede ser más visible que su sesión, que es la mitad del valor.
- La sesión con `openingEntityId` a una ficha `DM_ONLY` **no la devuelve** a un jugador.

**e2e contra Postgres (lo que de verdad lo demuestra):**
- Cerrar una sesión con `recapVisibility: "DM_ONLY"`, leerla **como jugador** y comprobar que la
  crónica **no está**; leerla como DM y comprobar que sí.
- Un combatiente creado sin bando llega como `NEUTRAL`.
- La migración: con una sesión antigua que tenga `notes.recap`, tras migrar **la columna trae ese
  mismo texto**. Se comprueba sobre la base de desarrollo, que ya tiene filas viejas.

**Mutación (obligatoria).** Devuelve `close()` a `closed.visibility` y comprueba que **la prueba de
la crónica más visible que su sesión se pone roja**. Si sigue verde, la prueba está mirando el caso
fácil.

## Guía de revisión

- [ ] `side` es un **enum**, no un `String`. Un texto libre aquí es un valor sin traducir esperando
      a llegar a la pantalla.
- [ ] El valor por defecto es **`NEUTRAL`**, y el commit dice por qué no es `ENEMY`.
- [ ] `openingEntity` es `onDelete: SetNull`. **Comprobado borrando una entidad enlazada**, no
      leyendo el esquema.
- [ ] Un jugador sin acceso a la ficha de apertura recibe el campo **ausente**, no `null` con nombre.
- [ ] `close()` **usa `input.recapVisibility`**; ninguna ruta sigue devolviendo `closed.visibility`
      para la crónica.
- [ ] La migración **copió** las crónicas viejas de `notes` y quedan legibles.
- [ ] `notes.recap` **sigue existiendo** tras migrar (la limpieza es otra migración).
- [ ] Ninguna de las tres columnas se filtra en el cliente: `canView` decide en el servidor.
- [ ] `pnpm --filter @dnd/api test:e2e` corrido de verdad, con Postgres levantado.

## Trampas

- **Los enums de Postgres se añaden, no se editan.** Un `CombatantSide` nuevo es `CREATE TYPE`; si
  algún día hay que añadirle un valor, es `ALTER TYPE ... ADD VALUE` en su propia migración.
- **`notes ? 'recap'` es el operador de existencia de clave de Postgres**, y en un fichero `.sql`
  dentro de Prisma **no hay que escaparlo**; en un `$queryRaw` con parámetros, sí daría guerra. Por
  eso va en la migración y no en código.
- **`prisma migrate deploy` no crea la base ni la resiembra.** Si la base local está vacía, la
  comprobación de que la migración copió las crónicas viejas **no prueba nada**: hazla contra una
  base que tenga filas.
- **El proyecto tiene una sola puerta a las transacciones**, `prisma.transaction`; `$transaction` a
  secas está prohibido fuera de `prisma.service.ts` y hay una prueba que barre el código.

## Commits

Tres, y en este orden — **cada uno deja el árbol verde**:

```
feat(api): a combatant has a side, and it lives where the fight does
feat(api): a session can say where its scene opens, filtered by canView
fix(api): the recap gets its own visibility, and leaves the Json it was hiding in
```

El tercero **es un `fix`, no un `feat`**: la elección ya se ofrecía en pantalla y no hacía nada.

## Definición de terminado

`pnpm verify` verde, e2e de API corridos con Postgres real, la mutación probada, y las tres fichas
anotadas en `Mine/pendientes-maestro-2026-09-04.md`. **Y D-OP-17 anotado como desbloqueado**, que es
la mitad del motivo de este plan.


---

## Avance — lo escribe quien ejecuta este plan

> **Obligatorio, y se escribe MIENTRAS se trabaja, no al final.** Si la sesión se queda sin contexto
> o muere, **esto y el prompt de arranque son lo único que sabe la siguiente**. Una línea por paso,
> con su commit. Nada de memoria: `fichero:línea` o no cuenta.

| Estado | Cuándo | Qué |
|---|---|---|
| ✅ hecho | 2026-09-05 | **2.1 · `Combatant.side`.** Enum `CombatantSide` y columna en `apps/api/prisma/schema.prisma:349-393`; migración `apps/api/prisma/migrations/20260905010000_combatant_side/migration.sql`, aplicada con `prisma migrate deploy`. `combatantSideSchema` y `sides` en `packages/shared/src/encounter.schema.ts`; el servicio lo escribe y lo devuelve en `apps/api/src/encounters/encounters.service.ts`. **Commit `41013cd`** |
| ✅ hecho | 2026-09-05 | **2.2 · `Session.openingEntityId`.** Columna y relación `SessionOpeningEntity` en `apps/api/prisma/schema.prisma:283-332`, lado inverso en `Entity`; migración `apps/api/prisma/migrations/20260905020000_session_opening_entity/migration.sql` con `ON DELETE SET NULL`. Filtrado en `SessionsService.conApertura` y `fichasDeApertura` (`apps/api/src/sessions/sessions.service.ts:40-113`). **Commit `<pendiente 2.2>`** |
| 🟨 en marcha | 2026-09-05 | **2.3 · `Session.recap` y `recapVisibility`** — sin empezar |

**Leyenda:** ⬜ sin empezar · 🟨 en marcha · ✅ hecho · ⛔ bloqueado (di por qué y qué descartaste).

**Lo que decidí por los cuatro pasos** (qué no cuadraba · qué elegí · por qué es duradero · la
fuente si la hubo):

- **2.1 · `prisma migrate dev` no se puede usar en esta máquina: es interactivo y la herramienta
  Bash no lo es** (`Error: Prisma Migrate has detected that the environment is non-interactive`).
  La migración se escribió **a mano** en
  `apps/api/prisma/migrations/20260905010000_combatant_side/migration.sql` y se aplicó con
  `prisma migrate deploy`, que sí es no interactivo. Es el mismo camino que siguieron las
  migraciones anteriores del repositorio (`20260905000000_commented_and_joined_events` es SQL
  escrito a mano). Dura porque no depende de una terminal.
- **2.1 · El 400 del bando estaba tapado por el 409, y lo destapó la prueba.** La comprobación de
  «me has dado el bando de alguien que no combate» la escribí primero en
  `EncountersService.start`, después del `ConflictException` de «ya hay un encuentro activo». El
  e2e que la probaba **recibió 409 y no 400**, porque la sesión ya tenía encuentro. Se movió al
  esquema (`startEncounterSchema.superRefine`, `packages/shared/src/encounter.schema.ts:76-99`),
  donde el `ZodValidationPipe` la aplica antes de mirar estado alguno. Dura porque es **donde la
  convención del proyecto dice que vive la validación** —«ninguna validación en el servicio que el
  esquema ya cubra», `docs/04-convenciones.md`— y porque el código de estado deja de depender de si
  hay pelea. La prueba unitaria del 400 se sustituyó por una del esquema, en
  `packages/shared/src/encounter.schema.test.ts`.
- **2.1 · `sides` es un mapa opcional y NO se cambió `characterIds` por un array de objetos.**
  Cambiar la forma habría roto el contrato que la mesa ya usa y obligado a tocar `apps/web`, que
  esta noche lleva otro carril. `characterIds` dice *quiénes combaten*; `sides` dice *de qué lado
  está cada uno*, que es otra pregunta.
- **Corregida de paso una errata en `docs/05-datos.md`**: decía «Queda declarado enQueda declarado
  en».

- **2.2 · Un jugador sin acceso NO recibe el id tampoco, y eso va más allá de lo que pedía el
  plan.** El plan decía «el campo llega ausente, no `null` con nombre». Devolver el id sin el
  nombre habría cumplido la letra y sería una fuga igual: un identificador que el jugador no puede
  resolver **confirma que la sesión abre en algo escondido**. Se quitan los dos. Dura porque es la
  misma regla que ya sigue el encuentro cuando renumera las posiciones densas —contar lo que falta
  es una forma de verlo—.
- **2.2 · El atajo de `canSee` no vale para una `Entity`, y eso es un fallo CONTRARIO a una fuga.**
  `SessionsService.canSee` (`apps/api/src/sessions/sessions.service.ts:31-37`) pasa
  `createdById: ""` y `grantedUserIds: []`, que para una `Session` está bien porque no tiene ni
  creador ni concesiones —lo dice `docs/05-datos.md`—. Aplicado a la ficha de apertura habría
  escondido una `OWNER_DM` o una `SPECIFIC_PLAYERS` **de quien sí tenía derecho a verla**. Ninguna
  prueba de fuga caza eso, así que hay una prueba explícita del caso `SPECIFIC_PLAYERS` con
  concesión.
- **2.2 · Apuntar a una ficha de otra campaña es 404 y no 400**, siguiendo la regla del
  403-que-va-404 de `docs/04-convenciones.md`: un «prohibido» ya confirma que la ficha existe.

**Lo siguiente exacto, si me quedo aquí:**

- **2.3 · `Session.recap` + `recapVisibility`.** El defecto está en
  `apps/api/src/sessions/sessions.service.ts:265` (escribe `notes: { recap }`) y en la línea 275
  (`visibility: closed.visibility`, cuando el esquema ya acepta `input.recapVisibility`,
  `packages/shared/src/session.schema.ts:73-77`). La migración tiene que **copiar** lo que ya hay:
  `UPDATE "Session" SET "recap" = "notes"->>'recap' WHERE "notes" ? 'recap' ...`, **sin borrar la
  clave de `notes`**.
