# Plan 15 · El crítico, cerrado del todo (C2.5-2) y tres pequeñas (C6-2 · D3 · tags)

**Objetivo en una frase:** terminar la única ficha que quedó **explícitamente a medias** por una
frontera de trabajo, y cerrar tres cosas de una línea que llevan meses abiertas por no ser de nadie.

**Tamaño:** cuatro commits. **Depende del plan 03** (la mitad de servidor de C2.5-2 es D-OP-15).

---

## 15.1 · El crítico, la mitad que falta

**Lo que 2.5.4 dejó escrito, y sigue siendo verdad — medido el 2026-09-05: cero ficheros de
`apps/web` mandan `attackRollEventId`.**

La ficha declara **dos condiciones de cierre**, y hay que cumplir las dos:

1. **Que la web mande `attackRollEventId`** con el `roll.eventId` de **su propia tirada de ataque**,
   y que entonces **`critical` suelto se pueda borrar de `rollAttackSchema` sin romper nada**.
2. **Que una tirada de ataque ya cobrada no se pueda volver a cobrar.** Eso es **D-OP-15**, y es del
   plan 03: columna con índice único.

**Por qué quedó a medias, y no fue pereza:** quitar `critical` de raíz habría sido un cambio de
comportamiento silencioso para el carril que estaba rehaciendo `apps/web` en ese momento. **Decidir
por un carril que no puedes tocar ni probar es peor que dejar el hueco escrito.** Ahora ese carril ya
no existe y el hueco se puede cerrar.

**El orden importa:** primero la web manda el campo, **después** se quita `critical` del esquema. Al
revés, hay una ventana en la que el crítico no funciona.

> **Y `critical` sale de `packages/shared`, que es forma compartida.** Ese commit **toca los dos
> lados a la vez** y es la única excepción a la partición por ficheros. Está declarado desde el
> 2026-09-04.

**Lo que hay que comprobar de verdad**, y no es que el campo viaje: que **un 20 natural en la tirada
de ataque duplica los dados del daño**, y que **un 20 en otra tirada no**. La verificación ya se
estrechó una vez porque *«un 20 en una prueba de Sigilo valía como crítico de la espada»*.

## 15.2 · C6-2 · `GET statblocks` no devuelve `visibility`

**Medido:** `aStatblock()` (`statblocks.service.ts:185`) **no incluye el campo**, aunque el servicio
**sí filtra por él**. Consecuencia real: el editor de criaturas **no puede enseñar quién la ve al
editarla**, así que **omite el campo en el `PUT`** para no pisar una criatura ya enseñada a la mesa.
Lo dice en pantalla en vez de esconderlo, que es lo correcto — pero es un rodeo.

**Son dos líneas** y el formulario **ya tiene el selector escrito**. Añadir `visibility` a
`aStatblock`, y que el editor deje de omitirlo.

**Cuidado con una cosa:** hay una ficha hermana —**`OWNER_DM` en un statblock se comporta como
`DM_ONLY`**— que **no cierra con esto**. Si al enseñar el campo el editor ofrece `OWNER_DM`, estará
ofreciendo un nivel que **no hace lo que dice**. O se excluye ese valor con su motivo, o se arregla
antes. **Decídelo y escríbelo**; no lo dejes al azar.

## 15.3 · D3 · La API no tiene endpoint de salud

**Medido: cero controladores de salud.** `GET /` responde 404, y **la comprobación de salud del
compose de producción depende de eso**.

Un `GET /health` que devuelva `{ ok: true }` **y compruebe la base** — un `SELECT 1` —, porque una
API que responde con la base caída está mintiendo sobre su salud. **Sin autenticación** y **sin
filtrar nada**: no puede contar versiones ni conteos, que es información gratis para quien la pida.

**Y actualiza `docker-compose.prod.yml`** para que su `healthcheck` apunte ahí, o el endpoint es
decorativo.

## 15.4 · `tags` sin unicidad

**Medido:** `entity.schema.ts` es `z.array(z.string().min(1).max(40)).max(50)` **sin unicidad**, y
`parseTags` solo recorta espacios. Escribir «lich, lich» **persiste `["lich","lich"]`**. Las filas
dedupan **al pintar**, que tapa el síntoma.

**La decisión que la ficha dejó abierta**: si una etiqueta duplicada se rechaza al guardar. **Mi
recomendación: no se rechaza, se normaliza** —deduplicar al guardar, en el esquema compartido—.
Rechazar obliga al usuario a arreglar algo que la máquina puede arreglar sola, y **el duplicado no
significa nada**.

**Y de paso, lo que el plan de decisiones dejó pedido:** una prueba que mande un `PATCH` **sin
`tags`** y compruebe que **siguen ahí**. Hoy funciona —lo medí— **por la alineación de dos detalles**:
`.partial()` sobre `.default([])`, y la guarda `!== undefined` en el servicio. Quien quite cualquiera
de los dos **borra etiquetas en silencio**.

## Pruebas

**Crítico:** un 20 natural en la tirada de ataque **duplica los dados** · un 20 en **otra** tirada no
· sin `attackRollEventId` **no hay crítico** (una vez quitado `critical`) · **la misma tirada no se
cobra dos veces** (la protege el índice único del plan 03).

**C6-2:** el `GET` trae `visibility` · editar **sin tocarla no la cambia** — esta es la que protege
el rodeo que se está quitando.

**D3:** `GET /health` responde 200 · **con la base caída responde no-OK**. Si no pruebas esto, has
escrito un endpoint que siempre dice que sí.

**`tags`:** «lich, lich» guarda **una** · el `PATCH` sin `tags` **las conserva**.

**Mutación:** quita la guarda `!== undefined` de `tags` y comprueba que la prueba nueva se pone roja.

## Guía de revisión

- [ ] **La web manda el campo ANTES** de quitar `critical` del esquema.
- [ ] El commit que toca `packages/shared` está declarado como la excepción que es.
- [ ] Se comprueba que **un 20 de otra tirada no vale**.
- [ ] `visibility` en `aStatblock`, y **`OWNER_DM` resuelto o excluido con su motivo escrito**.
- [ ] `/health` **mira la base** y **no filtra información**.
- [ ] El `healthcheck` del compose **apunta al endpoint nuevo**.
- [ ] `tags` se **normaliza**, no se rechaza, y la prueba del `PATCH` sin `tags` existe.

## Trampas

- **Quitar `critical` es un cambio de forma compartida.** Si alguna otra pantalla lo manda, romperá
  en silencio: barre `apps/web` antes.
- **Un `/health` que solo devuelve `{ok:true}` sin mirar la base es peor que ninguno**: da falsa
  seguridad al orquestador, que dejará de reiniciar un contenedor roto.
- **`OWNER_DM` en statblocks es una ficha viva.** Enseñar el selector completo sin resolverla
  convierte un defecto silencioso en una promesa rota visible.

## Commits

```
feat(web): the attack sends the roll that earned the crit
refactor(api,shared): the loose `critical` flag goes, now that nothing needs it
feat(api,web): a statblock says who can see it, and the editor stops working around it
feat(api): the API can say whether it is healthy, and checks the database to answer
fix(shared): tags are normalised on save, and omitting them still leaves them alone
```

## Definición de terminado

`pnpm verify` verde, e2e corrido, la mutación de `tags` probada, **`/health` comprobado con la base
caída**, y C2.5-2, C6-2, D3 y la ficha de `tags` anotadas en el maestro.


---

## Avance — lo escribe quien ejecuta este plan

> **Obligatorio, y se escribe MIENTRAS se trabaja, no al final.** Si la sesión se queda sin contexto
> o muere, **esto y el prompt de arranque son lo único que sabe la siguiente**. Una línea por paso,
> con su commit. Nada de memoria: `fichero:línea` o no cuenta.

| Estado | Cuándo | Qué |
|---|---|---|
| ✅ hecho | 2026-09-05 | **15.1-A · la web manda el `eventId`.** `apps/web/src/features/character-sheet/TirarAtaqueBoton.tsx`: fuera la casilla «Crítico», el daño manda `attackRollEventId` del ataque tirado en el mismo panel, y el panel **dice** lo que pasó. Commit `ede50af` |
| ✅ hecho | 2026-09-05 | **15.1-B · fuera `critical` del esquema.** `packages/shared/src/inventory.schema.ts` ya no lo declara y `esCriticoDesdeLaTirada` devuelve `false` sin tirada citada (`apps/api/src/characters/character-sheet.service.ts:1465`). **C2.5-2 cierra entera.** Commit `<pendiente 15.1-B>` |
| ✅ hecho | 2026-09-05 | **15.2 · C6-2.** `aStatblock()` devuelve `visibility` (`apps/api/src/statblocks/statblocks.service.ts:185-196`) y el editor deja de borrarlo del cuerpo (`apps/web/src/features/bestiario/EditorDeStatblock.tsx:328-336`). **Commit `<pendiente 15.2>`** |
| ✅ hecho | 2026-09-05 | **15.3 · D3 · el endpoint de salud.** `apps/api/src/health/health.controller.ts` con su módulo, `SELECT 1` y **503** si la base no contesta; sin autenticación y sin contar nada. El `healthcheck` de `docker-compose.prod.yml:79-92` apunta ahí **y mira el código de estado**. **Commit `<pendiente 15.3>`** |
| ⬜ sin empezar | — | 15.4 · `tags` sin unicidad |

**Leyenda:** ⬜ sin empezar · 🟨 en marcha · ✅ hecho · ⛔ bloqueado (di por qué y qué descartaste).

**Lo que decidí por los cuatro pasos** (qué no cuadraba · qué elegí · por qué es duradero · la
fuente si la hubo):

- **15.1 · Se respetó el orden que el plan exige, y por eso son DOS commits.** Primero la web manda
  el campo, después se quita `critical`. En un solo commit no habría ventana, pero en dos se puede
  revertir el segundo sin dejar el crítico roto — que es de lo que hablaba el plan.
- **15.1 · La casilla no se sustituyó por otra casilla, sino por una frase.** «Fue un 20 natural»,
  «No fue un 20 natural», o «tira primero el ataque». Un control que enseña lo que ya pasó no es un
  control: es información, y ponerlo como casilla invitaría a volver a declararlo.
- **15.1 · Una prueba afirmaba justo lo contrario y se reescribió**, no se borró: decía «sin
  `attackRollEventId`, sigue mandando el `critical` del cuerpo — el camino de siempre no cambia», y
  ese camino **era el hueco**. Ahora afirma que sin tirada citada **no hay crítico**, y que ni
  siquiera se pregunta a la base.
- **15.1 · El e2e cubre además el cobro doble**, que es la mitad que puso el plan 03: el segundo
  intento sobre la misma tirada es un 409 y la pantalla lo dice en línea.
- **Fuera del plan, para el autor: `docs/07-historial.md` se archivó SEIS veces esta noche.** El
  tope de 400 líneas está pensado para un ritmo más lento; diez entradas en una madrugada lo hacen
  saltar cada dos commits. **No lo he cambiado** —subirlo es una decisión declarada y es suya—, pero
  conviene saberlo.

- **15.2 · La decisión que el plan pedía «decidir y escribir» YA estaba tomada, y medida.** Avisaba
  de que enseñar el campo podría hacer que el editor ofreciera `OWNER_DM`, un nivel que no hace lo
  que dice. **No pasa**: `EditorDeStatblock.tsx:50-75` ya lo excluye desde la Ola 2, junto con
  `SPECIFIC_PLAYERS`, con el motivo leído del servidor y no supuesto. Lo confirmé: `puedeVer` pasa
  `createdById: ""`, y **aunque pasara el real no cambiaría nada**, porque `create` exige DM — el
  creador de un statblock es siempre el DM, así que `OWNER_DM` y `DM_ONLY` producen el mismo
  conjunto. **No se toca.**
- **15.2 · La prueba que protege lo que protegía el rodeo.** Borrar `visibility` del cuerpo impedía
  que el editor volviera a esconder una criatura ya enseñada. Retirado el rodeo, lo que lo impide es
  que **manda el valor real**, y el e2e nuevo lo fija: editar la CA de una criatura `PLAYERS` la
  deja en `PLAYERS`.

- **15.3 · El sondeo del compose ahora MIRA el código de estado.** Antes era
  `fetch(...).then(()=>process.exit(0))`: cualquier respuesta valía, que es exactamente por qué un
  404 pasaba por sano. Ahora es `then(r=>process.exit(r.ok?0:1))`. Cambiar el endpoint sin cambiar
  esto habría dejado el 503 sin quien lo leyera.
- **15.3 · El endpoint no dice por qué está enfermo, y es deliberado.** Un cuerpo con el error de
  Prisma dentro cuenta el motor, la versión y a veces el nombre de la base a cualquiera que sondee.
  El detalle va a los registros del servidor.
- **15.4 · Se normaliza, no se rechaza — y la recomendación del plan era la buena.** Rechazar obliga
  a la persona a arreglar algo que la máquina arregla sola, y **un duplicado no expresa ninguna
  intención** que la lista sin él no exprese. Se conserva el orden de la **primera** aparición, que
  es el que tiene en la cabeza quien escribe.
- **15.4 · Vive en el esquema compartido y NO en `parseTags`.** La pantalla no es la única puerta:
  una normalización que solo hace el cliente es una que la API no tiene, y cualquiera que llame al
  endpoint a mano seguiría ensuciando la fila.
- **15.4 · La prueba del `PATCH` sin `tags` que el plan pedía ya existe.** Funciona por la
  alineación de dos detalles —`.partial()` sobre el `.default([])` y la guarda `!== undefined` del
  servicio— y quien quite cualquiera de los dos **borra etiquetas en silencio**. Ahora hay una
  prueba que se pondría roja.

**Lo siguiente exacto, si me quedo aquí:**

- **Nada: el plan 15 está cerrado, con sus cuatro fichas y sus mutaciones.** Lo siguiente del orden
  recomendado es el **plan 07** (consolidación: 76 iconos, el vocabulario del daño triplicado y
  `type: tipo`), que dependía del **06** — ya fusionado esta misma noche.
