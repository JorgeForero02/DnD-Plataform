# Paso 1 · Las goteras — números que mienten y piezas sin enchufar

> Escrito el 2026-09-05 después de una auditoría de seis agentes contra Foundry VTT. **El informe
> vive FUERA del repositorio** —en `Mine/auditoria-2026-09-05/CONTRA-FOUNDRY.md`, con sus seis
> informes de detalle al lado— porque contiene lecturas de código ajeno y no es material del
> proyecto. No se enlaza desde aquí a propósito: un enlace que el comprobador no puede seguir es un
> enlace que envejece sin que nadie se entere.
>
> **Es el primero de tres pasos** que el autor definió el 2026-09-05: (1) estas goteras, (2) la
> economía de acciones y el modelo de actividad, (3) el catálogo. Este paso **no necesita diseño
> nuevo**: cada punto es una condición mal puesta, un tipo equivocado o una pantalla que falta.
>
> **Ancla: `276d59c`.** Toda cita de este documento se abrió en esa versión.

---

## Antes de nada: lo que NO va aquí

**Hay otra sesión ejecutando el plan de la iniciativa** y ya tiene asignadas seis cosas de la
auditoría. **No las toques**, o dos sesiones editarán el mismo método:

| Ya asignado | A qué tarea |
|---|---|
| El PNJ entra en la columna del elenco | 9b |
| El bando (`sides`) y el salto de asalto de `setInitiative` | 5 |
| El ataque elige objetivo | 13 |
| Curar, **y la resistencia al daño de un PJ** | 14 |
| `weaponProficiencies` en el DTO del navegador | 15 |

**Y una advertencia que se ha cumplido cuatro veces hoy:** `apps/api/src/encounters/encounters.service.ts`
y `apps/api/src/characters/character-sheet.service.ts` **se están reescribiendo mientras lees esto**.
Las citas a esos dos ficheros pueden haberse movido. **Los hallazgos aguantan; las líneas, no.** Si
una no cuadra, busca el mecanismo y corrige la cita — no supongas que el hallazgo es falso.

---

## Cómo se verifica cada cosa, que no es igual para todas

**Esta spec mezcla dos clases de trabajo a propósito** —el autor lo pidió así y tiene razón: ninguna
necesita diseño—. Pero **no se comprueban igual**, y confundirlo es cómo se da por buena una pantalla
mirando una prueba unitaria:

- **Los números (grupo A)** se comprueban **contra el SRD en inglés**, y la cita va en el commit.
  Una prueba que confirme el número equivocado es peor que ninguna.
- **Las pantallas (grupo B)** se comprueban **abriendo el navegador**. `jsdom` no maqueta, y este
  proyecto ya dejó 871 pruebas verdes con la mesa rota.

---

# GRUPO A · Números y agujeros

## A1 · Un jugador puede darse ventaja permanente

**Lo más grave del informe.** Va primero.

`ConditionsService.apply` autoriza con `requireOwnerOrDM` —el dueño puede aplicarse condiciones a sí
mismo, y eso es correcto para «me tumbo»— pero **la clave es texto libre**:

```
packages/shared/src/character-state.schema.ts:141
  key: z.string().min(1).max(60),
```

Y sin `durationSeconds` la condición es **indefinida**, escrito así a propósito para «envenenado
hasta que alguien te cure» (mismo fichero, comentario de `applyConditionSchema`).

**`helped` no es una condición del SRD.** Lo dice el propio código:

```
apps/api/src/character-state/roll-mode/suggested-roll-mode.ts:89
  `invisible` es del SRD. **`helped` no es una condición del SRD**: es la marca que deja la acción
```

`ayudaViva` la busca **solo por clave** —no mira quién la puso ni si hubo ayudante— y la convierte en
ventaja en las dos rutas de ataque (`apps/api/src/characters/character-sheet.service.ts:760`, usada
en `:1521` y `:1729`).

**Resultado:** `PUT /campaigns/:id/characters/:suyo/conditions/helped` sin duración da **ventaja
permanente y renovable en todos tus ataques**, saltándose los tres controles de `help()`.

**Por dónde va el arreglo:** las claves que el servidor interpreta —`helped` y las 27 del SRD— no
pueden escribirse por la puerta genérica. Un jugador puede seguir poniéndose una nota; no puede
concederse una mecánica.

**Pruebas:**
- Un jugador aplica `helped` a su propio personaje → **rechazado**.
- El DM aplica `helped` a mano → **también rechazado**: la marca la pone `help()`, no una ruta genérica.
- Un jugador aplica una condición **suya, inventada, sin efecto mecánico** → sigue funcionando.
- La acción Ayudar de verdad **sigue dando ventaja**.

**Mutación:** quita la comprobación y comprueba que la primera se pone roja.

## A2 · La CA sin armadura no cabe en el modelo

```
apps/api/src/rules/engine.ts:54
  /** Qué característica suma, si suma alguna. */
  addAbility?: AbilityKey;
```

**Una.** La Defensa sin armadura del bárbaro es 10 + Destreza **+ Constitución**; la del monje es
10 + Destreza **+ Sabiduría**. Ninguna de las dos es expresable, así que un bárbaro sale con **la CA
más baja de lo que le toca, y con traza convincente al lado**.

**Por dónde va el arreglo:** `addAbility` pasa a admitir varias características. **Es un cambio de
interfaz del motor** —el único de esta spec—, así que va en su propio commit y su propia revisión.

**Cuidado con el tope:** `abilityCap` existe porque la armadura media topa la Destreza en +2 y la
pesada en 0. Al pasar a varias, **el tope es por característica, no global**: la Defensa sin armadura
no topa ninguna de las dos.

**Pruebas:** un bárbaro con DES +2 y CON +3 sin armadura da **CA 15**, con los dos pasos en la traza ·
la armadura media sigue topando la Destreza en +2 · una armadura pesada sigue sin sumar nada.

**Verifica la regla en el SRD en inglés** («Unarmored Defense») **y pon la cita en el commit.**

## A3 · Un PNJ no es competente ni con sus propias garras

```
apps/api/src/rules/catalog/index.ts:115
  weaponProficiencies: [],
```

`deriveNpc` deja la lista vacía, así que si se le da una cimitarra del catálogo para que pueda
atacar, **tira a +2 donde el SRD da +4** — y con el aviso `attack_not_proficient` encima, que es la
prueba de que el motor lo sabe y no puede hacer nada.

**Por dónde va el arreglo:** un statblock del SRD ya trae su bono de ataque calculado; un PNJ es
competente con lo que su statblock describe.

**Pruebas:** un goblin con su cimitarra ataca a **+4** · sin aviso de no-competencia · un PJ sin
competencia **sigue** recibiendo el aviso y el −2.

## A4 · La acción Ayudar caduca antes de tiempo para media mesa

```
apps/api/src/character-state/conditions/conditions.service.ts:183 y :190
  expiresAtClock: campana.clockSeconds + SEGUNDOS_POR_ASALTO,
```

El reloj **solo avanza al cerrar un asalto**, así que esa marca vence al **empezar** el asalto
siguiente — antes del turno de nadie. El SRD la mantiene **hasta el turno del ayudante**.

**Consecuencia:** quien actúe **antes** que su ayudante en la iniciativa llega a su turno con la
ventaja ya vencida y ataca sin ella. **Determinista, la mitad de los órdenes de iniciativa.**

**El arreglo NO es rehacer el reloj**, y esto es lo que ahorra la fase entera. Foundry separa dos
cosas que nosotros tenemos fundidas (`module/data/shared/duration-field.mjs:14-24` de
`Mine/referencia-foundry-dnd5e`): **cuánto dura** y **en qué borde de turno se corta**. El segundo es
un vocabulario cerrado de cuatro, cruce de quién × qué borde
(`module/documents/active-effect.mjs:112`):

```
PSEUDO_EXPIRIES = ["sourceStart", "sourceEnd", "targetStart", "targetEnd"]
```

**Un campo con cuatro valores**, y la acción Ayudar pasa a ser `sourceStart`.

**No copies el resto de su mecanismo:** su vencimiento es un cálculo vivo en el cliente que ejecuta
el GM activo. Resuelve la concurrencia entre navegadores — **un problema que un servidor no tiene**.
Nosotros lo derivamos al leer, como ya hacemos.

**Pruebas:** con el ayudante en la posición 4 y el ayudado en la 2, el ayudado **conserva la ventaja**
en su turno del asalto siguiente · y la pierde después del turno del ayudante.

**Y arregla la prueba que no lo detectaba:** `apps/api/test/ayudar.e2e-spec.ts` avanza el reloj a mano
y no tiene encuentro ni iniciativa, así que **nunca ejercita este caso**.

**Y las dos pantallas que ya prometen lo correcto:** `apps/web/src/features/character-sheet/Condiciones.tsx:71`
y `apps/web/src/features/sessions/elenco/AyudarA.tsx:77-79` dicen que caduca «al empezar el turno de
quien te ayudó». **Hoy mienten; con este arreglo dicen la verdad y no hay que tocarlas.**

## A5 · Las inmunidades a condición son prosa con el enum al lado

```
packages/shared/src/statblock.schema.ts
  damageImmunities:     z.array(damageTagSchema).default([]),      ← tipado
  damageVulnerabilities: z.array(damageTagSchema).default([]),     ← tipado
  conditionImmunities:  z.array(z.string().min(1).max(60)).default([]),   ← prosa
```

**Tres líneas consecutivas y la tercera desentona.** `SRD_CONDITIONS` está en el mismo paquete
(`packages/shared/src/character-state.schema.ts:88`) y el catálogo ya escribe las claves buenas.

**Nadie consume el campo**, así que **se puede envenenar a un esqueleto**.

**Es el arreglo más barato de toda la spec.**

**Por dónde va:** el campo pasa a `z.array(conditionKeySchema)`, y `apply` rechaza una condición a la
que el objetivo es inmune. **Migración de datos:** los statblocks existentes lo tienen como texto
libre; hay que mapear lo que se pueda y **decir en el commit qué no se pudo**, no descartarlo en
silencio.

**Pruebas:** aplicar `poisoned` a un esqueleto → rechazado, con motivo legible · una condición a la
que no es inmune sigue entrando.

## A6 · Un consumible solo surte efecto si no te lo bebes

```
apps/api/src/inventory/inventory.service.ts:457   async consume(...)
                                          :483   const itemDef = await resolveInventoryRowItem(...)
                                          :487   await tx.inventoryItem.delete(...)
                                          :489   await tx.inventoryItem.update(... quantity ...)
```

**`consume` resuelve la definición del objeto y nunca mira sus efectos.** Grep de `effects` en todo
`inventory.service.ts`: **cero**. Los efectos solo se leen al derivar la hoja, desde lo **equipado**
(`apps/api/src/rules/items.ts:154` y `apps/api/src/rules/attacks.ts:244`).

**Consecuencia:** beberse una poción **solo la borra del inventario**.

**Ojo con el alcance, y esto es una decisión:** los nueve efectos de objeto son **pasivos y
permanentes** —suman a una característica, a la CA—, no «cura 2d4+2». **Este arreglo no inventa un
efecto de curación**: eso pertenece al paso 2, donde una poción será un objeto con una actividad
`efectoDeDados`. Lo que hay que arreglar aquí es lo que sí se puede: **que consumir aplique los
efectos que el objeto ya declara**, y que el registro lo diga.

**Si al hacerlo ves que ningún efecto actual tiene sentido al consumir, dilo y no fuerces nada**:
entonces el hallazgo es que **falta el tipo de efecto**, y eso es el paso 2. Escríbelo en
`docs/06-pendientes.md` en vez de inventar una mecánica.

## A7 · Dos concentraciones a la vez, y una sola salvación

Cada conjuro genera su propia clave con el prefijo
`apps/api/src/character-state/concentration/concentration.ts:38` (`CONCENTRATION_KEY_PREFIX =
"concentrating"`), y el `upsert` de condiciones es **por clave exacta**
(`apps/api/src/character-state/conditions/conditions.service.ts:82`). Dos conjuros distintos son dos
filas y **conviven**.

**Y hay un segundo defecto encima:** `estaConcentrado` (`concentration.ts:41`) devuelve **booleano**,
así que con dos concentraciones vivas `changeHp` pide **una sola** salvación
(`apps/api/src/characters/character-sheet.service.ts:1206`).

**El SRD es tajante y hay que citarlo en el commit:** *«you can't concentrate on two spells at
once»*, y empezar el segundo **termina el primero**.

**Por dónde va:** al aplicar una condición de concentración se retiran las demás del mismo personaje.
Con eso el segundo defecto desaparece solo — que es la señal de que el arreglo va en el sitio bueno.

**Pruebas:** aplicar una segunda concentración **retira la primera**, con su suceso · recibir daño
con una sola pide **una** salvación · el registro dice cuál se perdió.

## A8 · El descanso no mueve el reloj

`apps/api/src/character-state/rest/rest.service.ts` **lee** el reloj (`:101`, `:153`, `:232`) y no lo
avanza nunca: `GameClockService.advance` tiene exactamente dos llamadores, el controlador del reloj y
`advanceTurn`.

**Consecuencia:** ocho horas de descanso no caducan nada, y la regla de «un descanso largo por 24 h»
bloquea de más hasta que el DM avance el reloj a mano.

**Es deliberado y está señalizado** —el 409 de `comprobarDescansoLargo` (`:141-158`) dice literalmente
«avanza el reloj de la campaña»—, **así que esto es media decisión y media gotera.**

**Y por eso NO lo arregles sin declararlo.** Que un descanso mueva ocho horas de reloj **cambia el
comportamiento de todo lo que caduca**, y eso es exactamente lo que quieres que pase — pero se
escribe como decisión en `docs/04-convenciones.md`, no se cuela en un arreglo.

**Pruebas si se hace:** un descanso largo avanza 8 h · uno corto, 1 h · las condiciones de minutos
caducan solas al descansar · dos descansos largos seguidos siguen dando 409 por las 24 h.

---

# GRUPO B · Construido y no enchufado

**Todas se comprueban abriendo el navegador.** Una prueba unitaria en `jsdom` no demuestra que una
pantalla exista.

## B1 · No se puede crear un recurso desde la aplicación

```
apps/api/src/character-state/resources/resources.controller.ts:32   @Put(":key")
```

La ruta existe. La web llama a `/spend` (`api.ts:374`), `/give` (`:391`) y `/restore` (`:415`) — **y
nunca al `PUT`**.

**Consecuencia:** se puede gastar, regalar y reponer un recurso, y **no crearlo**. `seedResourcesFor`
solo siembra dados de golpe y espacios de conjuro, así que **una fila «Furia» no puede existir**.

**Y esto importa más de lo que parece:** es la única puerta por la que una aptitud con usos entraría
hoy sin tocar el motor. **Enchufarla desbloquea trabajo del paso 2.**

**Pruebas en navegador:** el DM crea un recurso «Furia 2/2» en la hoja de un personaje · el jugador
lo gasta · un descanso largo lo repone · un jugador **no** puede crearse un recurso a sí mismo.

## B2 · Pelear con dos armas es imposible

`apps/web/src/features/inventory/PaginaDeInventario.tsx` **no manda `slot` al equipar**: grep de
`slot`, **cero apariciones**. El servidor lo acepta y el motor lo usa —`buildAttacks` mira
`OFF_HAND` para decidir si un arma versátil va a dos manos
(`apps/api/src/rules/attacks.ts`)—, pero la pantalla no lo ofrece.

**Consecuencia:** no se puede poner nada en la mano izquierda. **Un pícaro con dos dagas no existe.**

**Pruebas en navegador:** equipar un arma en la mano izquierda · el cuadro de ataques muestra las dos ·
un arma a dos manos **impide** la izquierda, con motivo visible.

## B3 · El editor de criaturas miente sobre la visibilidad

```
apps/web/src/features/bestiario/EditorDeStatblock.tsx  (≈527)
  «Quién la ve no se toca desde aquí: el servidor no manda ese dato al leer la criatura…»
```

**El servidor sí lo manda.** `aStatblock` lo declara en su tipo de retorno
(`apps/api/src/statblocks/statblocks.service.ts:188`) y lo escribe (`:199`), desde la ficha C6-2.

**Consecuencia:** **no hay forma de cambiar quién ve una criatura propia ya creada.** Y el texto
incumple la regla vinculante: *si el texto explica una regla del servidor y discrepan, miente el
texto*.

**El componente que hace falta ya existe** — el propio comentario del fichero lo dice:
`apps/web/src/features/entities/VisibilityChooser.tsx`.

**Pruebas en navegador:** editar una criatura propia enseña su visibilidad actual · cambiarla la
guarda · un jugador no ve una criatura `DM_ONLY`.

## B4 · Lo demás, por orden de cuánto duele

Ninguna impide jugar; **hazlas si sobra tiempo, y no las mezcles con las de arriba.**

| Qué | Dónde | Por qué duele |
|---|---|---|
| `hp: "ROLL"` inalcanzable | `apps/web/src/features/bestiario/PanelDeBestiario.tsx` (cero apariciones de `ROLL`) | Seis goblins salen con los mismos PG |
| El nombre de una tanda de PNJ | mismo fichero | Seis «Goblin» sin distinguir |
| Volver un objeto a «Guardado» | inventario | No se puede desequipar a la bolsa |
| `storedAt` se pinta y no se escribe | inventario | Promete un dato que nadie puede poner |
| `note` no existe en pantalla | inventario | — |
| `contra.reasons` se calcula y se tira | `character-sheet.service.ts` | Se pierde el porqué de una ventaja |
| `rollSuggestions.attack` sin lector | ídem | Trabajo hecho, sin usar |
| El editor de criaturas sin diez campos | `EditorDeStatblock.tsx` | Reacciones, acciones legendarias, resistencias, sentidos, velocidades que no sean andar |

---

# Cómo se reparte

**Los grupos A y B no se tocan entre sí**, así que se pueden hacer en paralelo por ficheros. Pero:

- **A2 (la CA) va sola.** Cambia una interfaz del motor y toca la derivación entera.
- **A1 (la ventaja) va primero de todo.** Es integridad, y lo demás puede esperar a que esté.
- **A5 (las inmunidades) lleva migración de datos** — no la juntes con otra en el mismo commit.
- **A8 (el descanso) necesita que el autor lo declare** antes de tocarse.

# Definición de terminado

`pnpm verify` verde · **las de B abiertas en el navegador**, no solo en `jsdom` · **las citas del SRD
en inglés en los commits de A2, A3, A4 y A7** · una mutación por arreglo · y las fichas
correspondientes tachadas en `docs/06-pendientes.md` con su fecha y su `fichero:línea`.

# Lo que este paso NO hace

**No mecaniza ninguna aptitud, ni añade un conjuro, ni crea la economía de acciones.** Eso es el paso
2, y meterlo aquí convertiría veinte arreglos independientes en una fase con dependencias.

Lo que sí hace es **dejar de mentir**: hoy tres números salen mal con traza convincente, y construir
el paso 2 encima de eso sería edificar sobre una medición falsa.
