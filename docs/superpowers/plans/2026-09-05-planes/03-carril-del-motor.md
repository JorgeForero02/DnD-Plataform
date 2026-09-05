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
| ⬜ sin empezar | — | — |

**Leyenda:** ⬜ sin empezar · 🟨 en marcha · ✅ hecho · ⛔ bloqueado (di por qué y qué descartaste).

**Lo que decidí por los cuatro pasos** (qué no cuadraba · qué elegí · por qué es duradero · la
fuente si la hubo):

- _(nada todavía)_

**Lo siguiente exacto, si me quedo aquí:**

- _(nada todavía)_
