# Plan 09 · La batuta (I19) y la retirada de `ENTITY_ATTACKED` (I20)

**Objetivo en una frase:** dar al DM el botón que convierte el motor de reglas en una herramienta de
**preparación** —prepara en frío, pulsa en la mesa— y retirar el disparador que apunta a un objetivo
que no se puede atacar.

**Tamaño:** dos commits. **Toca `packages/shared`**: no en paralelo con 03, 05 ni 08.

---

## 9.1 · `DM_EXECUTED` — «la batuta»

**Qué es, en las palabras del propio vocabulario:** *«la batuta literal: el DM lee el diálogo en voz
alta, pulsa, y pasa lo que tenía que pasar»*. Apunta a una ficha del mundo.

**Por qué importa más de lo que parece.** Hoy el motor de reglas reacciona a cosas que **ocurren
solas** —se abre una ficha, se pone una marca, se tira—. Con la batuta, el DM puede **atar por
adelantado** lo que pasa al abrir el cofre, al leer la inscripción, al entrar en la cripta, y en la
mesa **solo pulsa**. Es lo que convierte el motor en algo que se usa **preparando la sesión**, no
solo reaccionando.

**El estado real, medido:** el disparador está en el vocabulario, **no existe el gesto en ninguna
pantalla**, y por eso está retirado de la oferta y marcado como no seleccionable.

**Pasos.**
1. **Suceso nuevo** `DM_EXECUTED` en `game-event.schema.ts` con `entityId` y `entityName?`, valor en
   el enum de Prisma y **su migración** (`ALTER TYPE "GameEventType" ADD VALUE`).
2. **`case` en `game-event-triggers.ts`**, devolviendo `{ kind: "DM_EXECUTED", entityId: p.entityId }`.
   Fíjate en que el `entityId` sale **del payload**, no del sujeto: ese patrón ya lo sigue
   `ENTITY_COMMENTED`.
3. **Ruta**: `POST /campaigns/:campaignId/entities/:entityId/execute`, **solo DM**, que graba el
   suceso. No cambia la ficha: **ejecutar no es editar**.
4. **Visibilidad**: `DM_ONLY`. Ejecutar es un gesto de dirección; lo que la mesa ve son **los efectos**
   que las reglas produzcan, cada uno con su propia visibilidad.
5. **Botón «Ejecutar»** en la ficha del mundo, solo para el DM, **junto a revelar y no dentro de un
   menú**. Con una frase que diga qué hace: *«dispara las reglas que esperan a esta ficha»*.
6. **Y lo que lo hace honesto: decir cuántas esperan.** Si ninguna regla escucha a esa ficha, el
   botón debe decirlo —o estar apagado con su motivo— en vez de fingir que hizo algo.
7. **Sacarlo de `DISPARADORES_SIN_MOTOR`** en `packages/shared/src/rules-engine.schema.ts`, **en el
   mismo commit**. Si no, el motor lo soportará y **ninguna pantalla dejará elegirlo**: la mentira
   simétrica de la que arreglas.

## 9.2 · `ENTITY_ATTACKED` — se retira

**El argumento, y viene de las reglas:** se atacan **criaturas**. Un lugar o un documento no se
atacan. Y en esta aplicación **se ataca a un `Character`** —un PNJ es una fila de `Character` desde
2D—, mientras que el disparador apunta a una **`Entity`**. **No hay forma honesta de conectarlo.**

**Y lo que la mesa quiere de verdad ya existe:** *«cuando ataquen a este PNJ, dispara esto»* — eso es
`ATTACK_RESOLVED`, **que se escribe desde 2.5.3**.

**Pasos.**
1. **Quitar `ENTITY_ATTACKED` de `ruleTriggerSchema`**, y con cuidado: hay reglas guardadas que
   podrían usarlo.
2. **Antes de quitarlo, mira si alguna lo usa.** Si hay filas, **no se rompen**: la regla vinculante
   de interfaz dice que un valor guardado que el selector no ofrece **se muestra marcado y no
   seleccionable**. Igual que hoy. Puede que la salida honesta sea **dejarlo en el esquema y solo en
   `DISPARADORES_SIN_MOTOR` para siempre**, con su motivo escrito — decídelo mirando los datos, y
   **dilo en el commit**.
3. **Añadir el disparador que sí sirve:** `CHARACTER_ATTACKED` con `characterId`, alimentado por
   `ATTACK_RESOLVED`, que ya se registra. Eso **no necesita suceso nuevo**: solo un `case`.

---

## Pruebas

**Batuta:** ejecutar como DM ✅ · como jugador **403** · el suceso llega con `entityId` · **una regla
armada sobre «cuando el DM ejecute esta ficha» se dispara** (e2e contra Postgres: crea la regla,
pulsa, comprueba el efecto) · el botón **dice cuántas reglas escuchan** y no miente cuando son cero.

**`ENTITY_ATTACKED`:** una regla guardada con él **sigue leyéndose** y **no es seleccionable** · el
disparador nuevo `CHARACTER_ATTACKED` **se dispara con un ataque resuelto**.

**Mutación:** quita el `case` de `DM_EXECUTED` y comprueba que el e2e de la regla armada se pone
rojo. Es la única prueba que demuestra el camino entero.

## Guía de revisión

- [ ] `DM_EXECUTED` sale de `DISPARADORES_SIN_MOTOR` **en el mismo commit** que lo implementa.
- [ ] Ejecutar **no modifica la ficha**.
- [ ] El botón **no finge**: con cero reglas escuchando, lo dice.
- [ ] El suceso es `DM_ONLY`; los efectos llevan **su propia** visibilidad.
- [ ] Sobre `ENTITY_ATTACKED`, el commit dice **qué se encontró en los datos** y qué se decidió.
- [ ] Ninguna regla guardada dejó de poder leerse.
- [ ] La migración del enum va en su propio fichero y **no se editó ninguna migración existente**.

## Trampas

- **Los valores de un enum de Postgres se añaden, nunca se editan ni se borran.** Si `ENTITY_ATTACKED`
  llegara a ser un valor del enum de sucesos, quitarlo del esquema Zod **no lo quita de la base**.
- **`ALTER TYPE ... ADD VALUE` no puede ejecutarse dentro de una transacción** en versiones viejas de
  PostgreSQL. Si la migración falla por eso, va **sola en su fichero**.
- **Cuidado con el bucle**: los efectos del motor escriben sucesos. `record` ya lleva la bandera
  `fromRulesEngine` para que un efecto no arranque una cascada nueva. **No la toques** y no llames al
  motor directamente desde la ruta nueva.
- **«Ejecutar» y «Revelar» son gestos distintos** y van juntos en la pantalla: revisa que no se
  confundan visualmente, porque revelar **sí** cambia permisos y ejecutar no.

## Commits

```
feat(api,web): the DM gets a baton — press an entry and its rules fire
chore(shared): retire the trigger that pointed at something you cannot attack
```

## Definición de terminado

`pnpm verify` verde, e2e del camino entero corrido, la mutación probada, y **el vocabulario en un
solo estado coherente**: lo que el motor dispara es exactamente lo que el editor ofrece.


---

## Avance — lo escribe quien ejecuta este plan

> **Obligatorio, y se escribe MIENTRAS se trabaja, no al final.** Si la sesión se queda sin contexto
> o muere, **esto y el prompt de arranque son lo único que sabe la siguiente**. Una línea por paso,
> con su commit. Nada de memoria: `fichero:línea` o no cuenta.

| Estado | Cuándo | Qué |
|---|---|---|
| ✅ hecho | 2026-09-05 | **9.1 · La batuta.** Suceso `DM_EXECUTED` (`packages/shared/src/game-event.schema.ts`) + migración `apps/api/prisma/migrations/20260906040000_dm_executed_event/`. `case` en `apps/api/src/rules-engine/game-event-triggers.ts:45`. Ruta `EntitiesService.execute` (`apps/api/src/entities/entities.service.ts:288`) y su `@Post(":entityId/execute")`. Fuera de `DISPARADORES_SIN_MOTOR` en `packages/shared/src/rules-engine.schema.ts:88`, **en el mismo commit**. Botón en `apps/web/src/features/entities/BotonEjecutar.tsx`, montado en `apps/web/src/pages/EntityDetailPage.tsx:139`. **Commit `d48f268`** |
| ✅ hecho | 2026-09-05 | **9.2 · `ENTITY_ATTACKED`.** **Se conserva** en el esquema y se queda en `DISPARADORES_SIN_MOTOR` para siempre, con su motivo escrito. Entra `CHARACTER_ATTACKED` (`rules-engine.schema.ts`), alimentado por `ATTACK_RESOLVED` en `game-event-triggers.ts:53` y comparado en `apps/api/src/rules-engine/engine/matching.ts:47`. **Commit `d48f268`** |
| ✅ | 2026-09-05 | **EL PLAN 09 ESTÁ CERRADO**, con su e2e (`apps/api/test/batuta.e2e-spec.ts`, 6 verdes) y su mutación. |

**Leyenda:** ⬜ sin empezar · 🟨 en marcha · ✅ hecho · ⛔ bloqueado (di por qué y qué descartaste).

**Lo que decidí por los cuatro pasos** (qué no cuadraba · qué elegí · por qué es duradero · la
fuente si la hubo):

- **9.2 · MEDÍ LOS DATOS ANTES DE DECIDIR, como pedía el plan: 244 reglas guardadas y NINGUNA usa
  `ENTITY_ATTACKED`** (ni `DM_EXECUTED`). Aun así **se conserva en el esquema**, que es la otra
  salida que el propio plan ofrecía: quitarlo del Zod haría que una regla guardada con él **dejara
  de poder leerse**, y la regla de interfaz vinculante dice lo contrario. Cero filas hoy en la base
  de desarrollo no es cero filas nunca, y un esquema que se rompe con un dato viejo se rompe **una
  sola vez** y ya es tarde. Queda en `DISPARADORES_SIN_MOTOR` **para siempre**, con su motivo.
- **EL FALLO QUE ESTO DESTAPÓ, Y NO ERA DE ESTE PLAN.** `matchesTrigger`
  (`apps/api/src/rules-engine/engine/matching.ts`) tenía un `default: return false`: **un disparador
  nuevo sin su `case` no coincide nunca, y en silencio**. Le pasó a `CHARACTER_ATTACKED` en la
  primera pasada —vocabulario, editor y puente todos correctos, y no ocurría nada—, y solo lo vio el
  e2e. Ese `default` lleva ahora un `never`: el olvido es un error de compilación. **Sin el e2e
  contra Postgres esto habría llegado a la mesa del autor como «el motor no funciona a veces».**
- **9.1 · `entityId` va en el PAYLOAD y el sujeto es la campaña.** Ejecutar **no es algo que le pase
  a la ficha**, es algo que hace el DM. Mismo patrón que `ENTITY_COMMENTED`, y por eso el motor lo
  lee del payload.
- **9.1 · `DM_ONLY` siempre, y no la visibilidad de la ficha.** Heredarla habría hecho que la mesa
  leyera «el DM ejecutó *La cripta*» y con ello el nombre de una ficha que quizá no debía conocer.
  Lo que la mesa ve son los EFECTOS, cada uno con la suya.
- **9.1 · El botón cuenta en la PANTALLA, no en un endpoint nuevo.** La lista de reglas ya está
  pedida en la sesión del DM (`useRules`); un endpoint para contar sería una segunda verdad sobre lo
  mismo, con las dos pudiendo discrepar.
- **9.1 · Y no cuenta de más:** solo las **armadas**, solo las de **esta** ficha y solo las de
  `DM_EXECUTED`. Contar de más es la misma mentira al revés — prometer que va a pasar algo que no
  pasa—, y hay una prueba de las tres exclusiones.
- **9.2 · `CHARACTER_ATTACKED` sale del SUJETO de `ATTACK_RESOLVED`**, no de su payload: el payload
  lleva el **atacante** (`attackerId`) y el sujeto es **el objetivo**, que es de quien habla el
  disparador. Leer el payload habría dado la regla al revés.
- **Un ejemplo de prueba tuvo que cambiar, y se declara.** «Una regla guardada con un suceso retirado
  se enseña marcada» usaba `DM_EXECUTED`; ahora usa `ENTITY_ATTACKED`, que es el caso **permanente**.
  La prueba no se debilitó: cambió de sujeto porque su sujeto dejó de estar retirado.

**Lo siguiente exacto, si me quedo aquí:**

- **Nada. El plan 09 está cerrado.** Lo siguiente es el plan 11.
