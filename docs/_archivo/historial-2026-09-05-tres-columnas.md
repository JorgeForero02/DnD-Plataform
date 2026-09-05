# Historial archivado — las tres columnas (2026-09-05, plan 02)

> **Movida entera el 2026-09-05, sin reescribir ni resumir una línea.** Séptimo corte de esa noche:
> los planes 01–06 y el 15 escribieron **trece** entradas, y `07-historial.md` se vacía por orden de
> antigüedad para no pasar de sus 400 líneas.
>
> Lleva dentro las tres columnas de las que dependen varias cosas de esa misma noche: el **bando**
> de un combatiente, **dónde abre la escena** una sesión, y la **crónica con visibilidad propia**
> —que es lo que hizo posible «dónde se quedó»—.

## Las tres columnas: el bando, dónde abre la escena y la crónica fuera del Json (2026-09-05)

**Qué.** Plan 02 de [los planes del 2026-09-05](./superpowers/plans/2026-09-05-planes/02-tres-columnas.md).
Tres campos pequeños que arreglan una mentira y desbloquean «dónde se quedó» y la línea de tiempo.
El principio que gobierna las tres: **lo que se filtra es columna; lo que solo se pinta puede ser
Json**.

**`Combatant.side`, el bando (migración `20260905010000_combatant_side`).** `CombatantSide` con
`ALLY`, `ENEMY` y `NEUTRAL`, en el **encuentro** y no en `Character`: «enemigo» es una relación en
un momento, no una propiedad de una criatura. Por defecto `NEUTRAL` —«no se ha dicho»—, lo dice el
DM al empezar (`startEncounterSchema.sides`) y el servidor no lo adivina.

**Un hallazgo real de la prueba, y cambió dónde vive el código.** La comprobación de «me has dado el
bando de alguien que no combate» estaba en `EncountersService.start`, **después** del 409 de «ya hay
un encuentro activo»: contra una sesión que ya combatía, la misma petición mal construida devolvía
409 en vez de 400. Se movió al esquema de `@dnd/shared` (`superRefine`), donde el `ZodValidationPipe`
la aplica antes de que el servicio mire ningún estado — que además es lo que la convención del
proyecto manda.

**Cómo se comprobó.** Dos mutaciones. Con el valor por defecto en `ENEMY`, el e2e contra Postgres
que afirma que el personaje sin clasificar llega `NEUTRAL` se pone rojo (`Expected: "NEUTRAL" ·
Received: "ENEMY"`). Con el `superRefine` anulado, la prueba del esquema que rechaza un bando
sobrante se pone roja. Las dos deshechas.

**`Session.openingEntityId`, dónde abre la escena (migración
`20260905020000_session_opening_entity`).** `ON DELETE SET NULL` y no `CASCADE` —borrar un lugar no
borra la sesión que pasó allí, comprobado borrando la entidad de verdad—, y **lo que se devuelve
pasa por `canView`**: si el espectador no puede ver la ficha, el campo llega **ausente**, ni con
nombre ni con id. Dejar el id sería confirmar que la sesión abre en algo escondido. Apuntar a una
ficha de otra campaña es **404**, no 400.

**Y aquí salió el fallo contrario a una fuga.** `SessionsService.canSee` pasa `createdById: ""` y
`grantedUserIds: []`, que para una `Session` vale porque no tiene ni creador ni concesiones — para
una `Entity` **no**. Con ese atajo, una ficha de apertura `OWNER_DM` o `SPECIFIC_PLAYERS` se habría
escondido de quien **sí** tenía derecho a verla, y ninguna prueba de fuga caza eso. La ficha se lee
con sus `grants` y su `createdById` de verdad, y hay una prueba por cada lado.

**Mutación del bando y de la apertura.** Al devolver `openingEntityId` cuando la ficha no es
visible, el e2e se pone rojo con el id filtrado en la salida.

**`Session.recap` y `Session.recapVisibility`, la crónica fuera del Json (migración
`20260905030000_session_recap_column`).** La pantalla ya ofrecía elegir quién ve la crónica, el
esquema ya la aceptaba, y el servicio **publicaba el suceso con la visibilidad de la sesión**: elegir
no hacía absolutamente nada. Ahora son columnas —porque se filtran— y el suceso sale con la
visibilidad de **la crónica**.

**Y salió un segundo fallo que nadie buscaba: `notes` tenía otro dueño.** El motor de reglas escribe
ahí un array de cadenas (`ADD_SESSION_NOTE`), así que una nota puesta por una regla **borraba la
crónica** en silencio — el `Array.isArray` fallaba sobre `{ recap: ... }` y empezaba un array nuevo.
Sacar la crónica del Json no es orden: es dejar de perder datos.

**La pantalla también, porque si no la ficha no cierra.** El diálogo de cierre estrena el selector de
visibilidad que ya existía (`VisibilityChooser`), con los tres niveles que una sesión admite —
`OWNER_DM` y `SPECIFIC_PLAYERS` sobre una crónica no seleccionan a nadie, porque una `Session` no
tiene ni creador ni concesiones—. Servidor arreglado y nadie que lo use es una ficha abierta.

**Cómo revertirlo.** `git revert` de los commits del plan y una migración que haga
`ALTER TABLE "Combatant" DROP COLUMN "side"` + `DROP TYPE "CombatantSide"` y
`ALTER TABLE "Session" DROP COLUMN "openingEntityId"`, `"recap"` y `"recapVisibility"`. **Las
crónicas viejas siguen dentro de `notes`**, que esta migración no tocó, así que revertir no pierde
ninguna.

---
