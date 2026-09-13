# Historial archivado — Tarea 11 del pulido: el hilo habla de personajes (2026-09-13, C4: #15)

**Movida entera** el 2026-09-13, al escribir la entrada de hito «Pulido antes del paso 3» (Tarea
15, cierre de la tanda). Su resumen se queda en `07-historial.md`.

---

## Tarea 11 del pulido: el hilo habla de personajes (2026-09-13, C4: #15)

Qué — hasta esta tarea el hilo de sesión decía QUÉ pasó y nunca A QUIÉN ni DE QUIÉN: «Pierde 7 PG
(24 → 17)» y «Espadazo: impacta» no nombran a nadie, y el hueco #15 pedía justo esa mitad.
`changeHpSchema.sourceCharacterId` (`packages/shared/src/character-sheet.schema.ts`) y
`HP_CHANGED.sourceCharacterId` (`game-event.schema.ts`) son el nuevo campo opcional —«de quién
viene», cuando el DM pone daño a mano sin que cuelgue de ninguna tirada—; `changeHp`
(`character-sheet.service.ts`) lo valida con `requireVisibleCharacter`
(`apps/api/src/common/character-viewer.ts`, el mismo helper que ya usan `activities`,
`conditions`, `resources`, `rest`, `temporary-modifiers` e `inventory`) antes de escribirlo en el
suceso — 404 uniforme si el id no existe o no se ve, nunca una causa inventada.

En la web, `nombres-del-hilo.ts` (nuevo) resuelve un id a nombre contra `useCharacters` +
`useNpcs` —las mismas listas ya filtradas por `canView`—, con `null` como «este espectador no lo
ve»; `atacanteDeLaTirada` recorre la ventana de sucesos buscando el `ATTACK_RESOLVED` que citó esa
tirada. `lineaDeLog(p, ctx?)` (`linea-de-log.ts`) sigue con un solo argumento para las 33 frases
de siempre —`linea-de-log-sin-claves.test.ts` no se ha tocado—; con `ctx: { sujeto, nombres }`,
`HP_CHANGED` dice «Sylas pierde 7 PG (cortante) ← Klarg» (o «← ataque de Klarg» si el origen sale
de `rollEventId`) y `ATTACK_RESOLVED` dice «Klarg ataca a Sylas con Cimitarra: impacta» — **el
objetivo se nombra a propósito**: el suceso se escribe a la visibilidad del objetivo, así que
quien lo lee ya lo ve por definición, y el comentario que decía lo contrario en `linea-de-log.ts`
estaba caducado desde 2.5.3. `ACTIVITY_USED` no existe en el esquema — se buscó y se anotó, no se
inventó.

`HiloDeSesion.tsx` construye `nombres` con `personajes` + la nueva prop `pnjs` (que `MesaDeSesion`
ya tenía de `useNpcs`, pasada en vez de pedida dos veces) y compone `linea` para cada mensaje, que
`MensajeDelHilo.tsx` recibe ya hecha en vez de llamar a `lineaDeLog` por su cuenta. Su cabecera de
tipo «personaje» pinta el NOMBRE DEL PERSONAJE cuando `vozDe` resolvió uno real, y la persona baja
a una firma con su hora — sin personaje, la persona sigue en la cabecera, como siempre.
`PonerDano.tsx` gana un `<select>` «¿De quién viene?» con `<option value="">Sin decir</option>`:
es una lista de personajes y PNJ —datos, no una opción con significado—, así que un `<select>`
nativo es correcto y no una desviación de la regla de los radios con explicación; manda
`sourceCharacterId` solo si se elige.

Por qué — «¿de qué murió Elara?» (hueco M15, cerrado en 2.5.4) respondía el tipo de daño y la
tirada, pero el registro seguía sin decir QUIÉN. Con el objetivo ya protegido por `canView` desde
que el suceso nace, ocultar su nombre en la frase no protegía nada — protegía menos que decir
«Alguien pierde 7 PG» delante de quien ya lo está viendo.

Evidencia — e2e de API (`dano-con-su-traza.e2e-spec.ts`, 9/9): el DM cita el origen y
`HP_CHANGED.sourceCharacterId` lo lleva; un origen que no existe en la campaña es 404 y no escribe
nada (comprobado con el PG sin cambiar). Unitarias de servicio (`character-sheet.service.spec.ts`,
157/157) sin tocar. Unitarias web: `linea-de-log-con-nombres.test.ts` (nuevo, 6/6) —el daño con
origen directo, con origen de tirada, el ataque con y sin atacante visible, y que sin `ctx` las
frases de siempre no cambian—; el resto de `sessions` en verde (1542/1542 de la suite completa).
Mutación: quitar el `← ${origen}` de `HP_CHANGED` y el `${atacante} ataca a...` de `ATTACK_RESOLVED`
hace fallar las pruebas nuevas correspondientes (restaurado con `cp`); comentar la llamada a
`requireVisibleCharacter` en `changeHp` hace fallar el 404 del origen inexistente (restaurado con
`cp`). `combate.spec.ts` gana una comprobación de extremo a extremo: Thora ataca a Brann por API
(equipar, resolver el ataque, aplicar daño citando la tirada) y el hilo real muestra «Thora ataca
a Brann con … : impacta/falla» y «Brann pierde 3 PG ← ataque de Thora» — no ejecutado en esta
sesión (frontera: solo se corrió el e2e de API una vez), a correr por el orquestador.
`sesion.spec.ts` actualizado: el golpe real a Borin ahora se lee «Borin Barbaférrea pierde 5 PG»
en vez de «Pierde 5 PG (13 → 8)», porque su sujeto SÍ se resuelve en ese recorrido.

**Revertir:** quitar `sourceCharacterId` de los dos esquemas y de `changeHp`; borrar
`nombres-del-hilo.ts` y su prueba; devolver `lineaDeLog`, `HiloDeSesion.tsx` y `MensajeDelHilo.tsx`
a su forma de un argumento; quitar el `<select>` de `PonerDano.tsx`; deshacer las aserciones nuevas
de `combate.spec.ts` y la frase cambiada de `sesion.spec.ts`.

