# El PNJ del mundo y la criatura en la mesa son la misma persona — y la mesa lo sabe

> Escrito el 2026-09-13 por el controlador con el autor, tras su primera partida de prueba en
> producción con un jugador real («Zero» contra un «Bandido»): el jugador no veía al enemigo en el
> orden de turnos, «Revelar algo» revelaba la ficha del wiki y no al bicho del combate, y no había
> forma de sacar a nadie del combate. Pedido del autor, literal: revelar y ocultar **PNJ, bestias
> del libro y bestias creadas** desde la mesa, **sacar del combate**, y que el PNJ del mundo «con
> hilos atados a zonas» y la criatura que pelea **sean del mismo par**.
>
> Lo que dice «hoy» se comprobó abriendo los ficheros sobre `main` (`0ca530c`) y en producción.

---

## 1 · Qué se pide, en una frase

Que un PNJ tenga **una sola identidad** —la ficha del mundo, con sus hilos— y que su cuerpo en la
mesa (la fila de `Character` con statblock) **cuelgue de ella**: revelar en un sitio revela en el
otro, desde el elenco se llega a la ficha y desde la ficha a la mesa; y que el DM pueda **revelar,
ocultar y sacar del combate** a cualquier criatura sin salir de la pantalla de la mesa.

## 2 · Lo que hay hoy, medido: cuatro cosas con dos nombres

| Cosa | Qué es | Dónde vive | Visibilidad propia | Cómo se revela hoy |
|---|---|---|---|---|
| **Ficha del mundo tipo PNJ** | «Garrik, jefe del paso», con hilos a lugares, misiones, facciones | `Entity` (`type: NPC`, `body`, `tags`, `links`) | La de la ficha | «Revelar algo» (`RevelarAlgo.tsx`), `PATCH /entities/:id` |
| **Plantilla** (statblock) | «Bandido» del libro (SRD) o creado en el Bestiario | SRD en código / `CampaignStatblock` en la base | Sí; las del libro públicas, **las creadas nacen `DM_ONLY`** (`EditorDeStatblock.tsx:103`) | Editor del statblock, radios `VisibilityChooser` |
| **Criatura en la mesa** | *ese* bandido, con PG y condiciones | `Character` con `statblockRef` (D-2D-2/3) | Sí, otra; **nace `DM_ONLY` siempre** (`npcs.service.ts:65`) | Hoja completa del PNJ → «Quién lo ve y qué se hace con él» (`AjustesDePersonaje`) |
| **PNJ jugable** | Con clase y nivel | `Character` sin `statblockRef` | La del personaje | Ídem |

**No existe ninguna columna que una `Entity` con `Character`** (comprobado en `schema.prisma`:
`Entity` solo se relaciona con `EntityLink`, `Comment`, `EntityVisibilityGrant`, `Session`;
`Character` no tiene `entityId`). Que Garrik y el Bandido sean la misma persona solo lo sabe el DM.

**Mandos que faltan en la mesa** (medido en `MenuDeAcciones.tsx`, `TiraDeIniciativa.tsx`,
`encounters.controller.ts`):
- El menú «…» del elenco tiene Condición · Dar… · Su hoja · bando. **No** revelar ni ocultar.
- «Revelar algo» **solo lista fichas del mundo** (`Entity`), no PNJ ni criaturas.
- «Sacar criatura» instancia sin preguntar visibilidad; añadir al combate tampoco avisa de que el
  bicho está oculto. El jugador ve «Le toca a alguien que no ves».
- **No hay `DELETE` de un combatiente**: el encuentro tiene añadir, corregir iniciativa, bando,
  gastar, pasar turno, terminar y `force-start`. Un caído se queda en el orden como «derrotado»;
  quien huye, o quien el DM decide que no entra (un aliado con poca vida), no se puede quitar.
- **Dos visibilidades con el mismo nombre**: para que un jugador vea una criatura de plantilla
  creada hace falta que **la plantilla** y **la instancia** sean visibles (`npcs.service.list`:
  `puedeVerStatblock` + `canView` de la fila). Con una del libro basta la instancia. La pantalla
  no lo dice.

Lo que ya funciona y no se toca: `canView` como única puerta; el PNJ oculto no filtra su
iniciativa ni su nombre («Alguien ataca a Zero»); la tirada de un PNJ oculto nace «privada del DM»
(I10). **El SRD (*Unseen Attackers and Targets*) permite no saber quién te ataca; no permite no
saber que te han pegado**: el daño aplicado se anuncia igual (ya lo hace `HP_CHANGED`).

## 3 · Lo que se decide aquí

### 3.1 · El puente: `Character.entityId`

Columna **opcional** `Character.entityId → Entity.id` (`onDelete: SetNull`; migración aditiva).
Semántica: «este cuerpo en la mesa es esta ficha del mundo». Una ficha puede tener varios cuerpos
(seis goblins de la misma ficha «Goblins del paso»); un cuerpo tiene como mucho una ficha. Solo
fichas `type: NPC` de la misma campaña (validación en el servidor, 400 si no).

Se enlaza en tres sitios: al **sacar una criatura** («¿de qué ficha del mundo es?», selector
opcional con buscador de PNJ del mundo); en la **hoja del PNJ/criatura** («Ficha del mundo:
Garrik · cambiar · quitar»); y desde la **ficha del mundo** con «A la mesa» (elige plantilla,
instancia, enlaza). `PATCH /characters/:id` gana `entityId` (DM only).

### 3.2 · Revelar es una sola acción

**`POST /campaigns/:id/characters/:characterId/reveal`** (DM only) sube la instancia a `PLAYERS`,
y **si tiene `entityId` y la ficha está por debajo, la ficha también**; y **si la plantilla es
creada y está oculta, la plantilla también** — un solo botón, tres columnas, una transacción, un
suceso `NPC_REVEALED` en el hilo («Garrik entra en escena»). Revelar desde la ficha del mundo
(«Revelar algo», `BotonRevelar`) hace lo simétrico: sube la ficha y todos sus cuerpos vivos en la
campaña. **Ocultar** (`/hide`) baja solo la instancia a `DM_ONLY` (la ficha del wiki no se
des-revela: lo que la mesa ya leyó, leído está — se declara).

`RevelarAlgo.tsx` lista también **PNJ y criaturas en escena que la mesa no ve** (misma fila, con
«criatura» como tipo), y el menú «…» del elenco gana **Revelar a la mesa** / **Ocultar** según el
estado. Al añadir un combatiente oculto a un encuentro, el orden de turnos del DM pinta junto a él
**«oculto · Revelar»**.

### 3.3 · Sacar del combate

**`DELETE /campaigns/:id/sessions/:sid/encounters/:eid/combatants/:cid`** (DM only): quita la
fila, renumera posiciones densas, y **si era su turno, avanza al siguiente** con la misma lógica
de `advance-turn` (sin subir asalto dos veces). Suceso `COMBATANT_LEFT` («Garrik sale del
combate», o «Alguien sale del combate» si está oculto y el espectador no lo ve). El personaje
sigue en la campaña con sus PG y condiciones; solo sale del encuentro. Si queda un solo bando, el
combate **no** termina solo: sigue siendo decisión del DM («Terminar el combate»). Menú «…» del
elenco: **Sacar del combate** (solo con encuentro activo). Un combatiente derrotado se puede sacar
igual.

### 3.4 · Rótulos

En Bestiario y hoja: **«Plantilla»** para el statblock y **«En la mesa»** para la instancia, con
la frase de cada visibilidad diciendo a cuál de las dos afecta. En el elenco y el hilo, si hay
`entityId`, el nombre enlaza a la ficha del mundo.

## 4 · Seguridad

Todo DM only en el servidor (`requireDM`); `canView` sigue decidiendo qué ve cada uno de cada
columna por separado. Revelar no crea concesiones nuevas (`EntityVisibilityGrant` no se toca).
El `entityId` viaja al cliente **solo si el espectador puede ver la ficha** (si no, `null`): la
existencia del enlace no puede filtrar que «Alguien» es Garrik.

## 5 · Pruebas (D-CF-65, con el cierre acotado que pide el autor el 2026-09-14)

Por tarea unitarias + mutación + `verify`; sin Playwright ni revisión por tarea. e2e de API (se
escriben por tarea, se corren al cierre): revelar sube las tres columnas en una transacción y un
jugador ve al bicho **después** y no antes; ocultar baja solo la instancia; `entityId` de otra
campaña → 400; sacar en su turno avanza sin duplicar asalto; el jugador no recibe `entityId` de una
ficha que no ve. **Cierre acotado** («ya perdimos mucho tiempo»): una revisión Opus de la rama
entera y **una** ola de arreglo; Playwright solo en los spec tocados más **una** prueba nueva con dos
navegadores: el DM revela desde el elenco y **el jugador ve aparecer al Bandido en el orden de
turnos sin recargar** (como `iniciativa-en-vivo`), y sacar del combate lo quita del orden en las dos
pantallas. **Sin suite Playwright entera**: la corre la CI en el push.

## 6 · Lo que NO entra

Multi-DM, revelar por sesión (la visibilidad sigue siendo por campaña), des-revelar fichas del
wiki, que la ficha del mundo tenga statblock propio (sigue siendo plantilla + cuerpo), tokens en
el tablero externo.

## 7 · Tareas (5–6)

0 · Migración `entityId` + esquema compartido + `PATCH` · 1 · `reveal`/`hide` en servidor con el
suceso y la transacción · 2 · `DELETE` combatiente con avance de turno · 3 · Mesa: menú «…»,
aviso en el orden de turnos, «Revelar algo» con criaturas · 4 · Enlazar desde sacar criatura,
hoja y ficha del mundo («A la mesa») · 5 · Rótulos plantilla/en la mesa, docs, cierre.

## 8 · Cuándo

Después de **puerta de efectos** y antes del paso 3 (D-CF-52 enmendada). No comparte ficheros con
el catálogo; sí con la mesa y los encuentros, por eso no va dentro de puerta de efectos.
