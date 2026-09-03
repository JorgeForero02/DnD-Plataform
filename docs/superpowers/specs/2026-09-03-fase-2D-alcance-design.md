# Fase 2D — alcance: los PNJ tienen números, y bajan a la mesa

> Escrito el 2026-09-03, con 2A, 2B y 2C cerradas y desplegadas. **Manda sobre el plan maestro** en
> todo lo que se refiere a la fase 2D, igual que hicieron
> [el alcance de la fase 2](./2026-09-01-fase-2-alcance-design.md) y
> [el de 2C](./2026-09-03-fase-2C-alcance-design.md) con las suyas.

## 1 · Qué pedía el plan, y qué decidió el autor

El plan maestro deja 2D en una línea y la marca opcional:

> *(2D, opcional)* Statblocks de NPC reusando el mismo motor. Solo si 2A–2C salieron limpias.

**Salieron limpias**, así que entra. Y el 2026-09-03 el autor eligió el alcance **grande** de los
dos que se le pusieron delante: no solo la ficha del PNJ, sino **el PNJ jugable en la mesa** —que
recibe daño, coge condiciones y aparece en el registro de tiradas.

## 2 · La decisión que hace que el alcance grande no cueste el doble

**Un PNJ en la mesa es una fila de `Character`.**

No un modelo nuevo con su propio estado. `Character` ya tiene, probado y desplegado, exactamente lo
que un combatiente necesita: `currentHp`, `tempHp`, `version` (concurrencia optimista para las
correcciones del DM), las condiciones con vencimiento de 2C, el inventario de 2B, las tiradas de
salvación contra muerte, la visibilidad, y su sitio en el registro de tiradas y en las peticiones
de tirada. Reimplementar eso para PNJ sería escribir por segunda vez el sistema que más revisión ha
recibido, y **desincronizarlo el primer día que alguien arregle un fallo en uno solo de los dos**.

Lo que separa a un PNJ de un personaje jugador es de dónde salen sus **números derivados**, no qué
se le puede hacer. Así que:

| | Personaje jugador | PNJ instanciado |
|---|---|---|
| Dueño | El jugador | **El DM** |
| De dónde derivan CA, PG y competencia | Clase, nivel, raza y equipo | **Su plantilla de statblock** |
| `classKey`, `level`, `raceKey` | Con valor | **`null`** |
| `statblockRef` | `null` | **Con valor** |
| Estado, condiciones, daño, registro | Ya existe | **El mismo, sin tocar** |

`statblockRef` es una **cadena**, no una clave foránea, y sigue exactamente la forma que 2B eligió
para los objetos: `SRD:goblin` o `CAMPAIGN:<cuid>`. Es lo que permite que el catálogo del SRD viva
en código —donde se puede leer, revisar y probar— sin obligar a sembrar trescientas filas en la
base de cada campaña.

## 3 · Dónde vive un statblock: el mismo patrón que los objetos de 2B

Dos orígenes, una sola forma resuelta, y **una sola puerta** que los traduce:

- **Catálogo SRD 5.1 en código** (`apps/api/src/rules/catalog/monsters-srd.ts`), como
  `items-srd.ts`. Transcrito **con fuente**, no de memoria.
- **Statblocks propios del DM por campaña** (`CampaignStatblock` en la base), como `CampaignItem`.
  Es el camino general: la mesa del autor usa sus propios monstruos más que los del libro.
- **`ResolvedStatblock` en `packages/shared`**, la forma que consume todo lo demás. Nadie vuelve a
  decidir en dos sitios qué es un statblock.

**Cuántos monstruos del SRD se transcriben, dicho antes de empezar:** no los trescientos. Una
**tanda declarada** en la banda de VD que una mesa real usa —de 0 a 5—, cada uno verificado contra
la fuente. El resto llega cuando alguien lo pida, y el camino del DM cubre el hueco mientras tanto.
Transcribir trescientos a mano es donde esta fase se comería la semana sin que nadie juegue mejor.

## 4 · Lo que el motor NO sabe hacer todavía, que es el trabajo de verdad

`derive()` está escrito para una hoja de 5.ª edición: pide `level` y `hitDieSize` de clase, saca el
bonificador de competencia del nivel y arma la CA con fórmulas de armadura. Un monstruo contradice
las tres cosas:

1. **El bonificador de competencia sale del VD, no del nivel.** Un PNJ no tiene nivel.
2. **La CA es un número dicho**, con una nota de por qué (*«cuero tachonado, escudo»*). No se
   deriva de una fórmula de armadura, y forzarla a derivarse obligaría a inventarle equipo a cada
   monstruo para que cuadre el número — que es exactamente la mentira que las anulaciones de 2A
   existen para evitar.
3. **Los PG son una fórmula de dados** (`2d6`, `11d10+22`), y el tamaño del dado sale del **tamaño
   de la criatura**, no de una clase.

Y una que sí se conserva íntegra: **la traza**. Un PNJ derivado sin traza sería un paso atrás
respecto de todo lo que lleva hecha esta fase. `Sigilo +6 = +2 DES + 2 comp. + 2 pericia` tiene que
salir igual que sale en la hoja de un jugador.

## 5 · Qué trae 2D, bloque a bloque

| | Qué entra |
|---|---|
| **2D.1** | `ResolvedStatblock` en `@dnd/shared`, el bonificador de competencia por VD, y la tanda del SRD transcrita con fuente |
| **2D.2** | El camino de monstruo en el motor: CA dicha, PG por fórmula y tamaño, salvaciones y habilidades **con traza** |
| **2D.3** | `CampaignStatblock`: crear, editar y borrar los statblocks propios del DM, con visibilidad |
| **2D.4** | Instanciar: de una plantilla nacen N combatientes, que son `Character` del DM |
| **2D.5** | La pantalla del statblock en la ficha del PNJ, y el botón de bajarlo a la mesa |
| **2D.6** | La lista de PNJ de la campaña con sus PG y condiciones, reutilizando lo que ya pinta a un personaje |

## 6 · Las reglas que no se negocian en esta fase

- **El azar sigue fuera del motor.** Los PG de un PNJ instanciado se tiran con el tirador de 2C
  —semilla inyectable— o se toman por la media declarada del statblock. El motor dice `2d6`; no lo
  tira.
- **Instanciar no filtra.** Un PNJ instanciado nace **`DM_ONLY`**. El DM lo sube a `PLAYERS` cuando
  los jugadores lo ven. Es la misma regla que 2B eligió para los objetos propios, y por el mismo
  motivo: **preparar la mazmorra no puede ser filtrarla**.
- **`canView` sigue siendo el dueño único de quién ve qué.** Un statblock `DM_ONLY` no devuelve sus
  números, ni por la lista, ni en la respuesta de una mutación — que es el agujero que la revisión
  de 2C encontró **dos veces**.
- **La traza sale siempre**, y con los mismos pasos que la hoja de un jugador.

## 7 · Lo que 2D NO hace

- **Ni iniciativa, ni orden de turnos, ni aplicar daño en tanda.** Eso es **Encuentros**, un bloque
  que **sí está en el plan maestro** —decidido el 2026-09-01 y colocado **entre la fase 2 y la
  3**— pero que **no tiene plan escrito a nivel de tarea**. 2D deja al PNJ **en la mesa con sus
  números**; no arbitra el combate.

  > **Corrección del 2026-09-03 (noche).** Esta línea decía que «Encuentros no está en el plan
  > maestro», y era falsa: está, con alcance y con posición. Lo preguntó el autor.

  **Y conviene ver qué de Encuentros ha entregado ya esta fase**, porque cambia lo que cuesta el
  bloque: su primer punto —*«statblocks de PNJ con PG vivos»*— **es exactamente 2D**. Lo que le
  queda son la iniciativa y el orden de turnos, el ataque contra un objetivo **comparado en el
  servidor** (la CA nunca viaja al navegador del jugador) y **propuesto al DM para que confirme o
  corrija**, el daño aplicado por el DM, y **las condiciones con duración en turnos** — que nacen
  ahí porque un turno no existe en el sistema hasta que hay iniciativa.
- **Ni acciones legendarias, ni guaridas, ni reacciones con temporizador.** Se **guardan** como
  prosa del statblock y se pintan; no se ejecutan.
- **Ni conjuros de PNJ resueltos por el motor.** La lista de conjuros del statblock es texto. El
  motor de conjuros no existe en ninguna fase escrita.
- **Ni los trescientos monstruos del SRD.** Ver §3.
- **Ni PNJ en el mapa.** Eso es la fase 3, y la ficha de tablero de 3.C **ya está diseñada para
  enlazar opcionalmente a una entidad**, así que un PNJ instanciado encaja ahí sin cambiar nada.

## 8 · El riesgo

**El alcance grande roza Encuentros por todas partes.** En cuanto haya seis goblins en una lista
con sus PG, la siguiente frase que se dice en voz alta es «ya que estamos, la iniciativa». La lista
del §7 existe para eso y se lee entera cada vez.

Y un riesgo de datos: **`Character` pasa a tener dos formas** —la de clase y nivel, y la de
statblock— y toda derivación que asuma la primera es un fallo esperando. El motor tiene que
**rechazar** una entrada mixta en vez de elegir una rama en silencio, y eso se prueba.
