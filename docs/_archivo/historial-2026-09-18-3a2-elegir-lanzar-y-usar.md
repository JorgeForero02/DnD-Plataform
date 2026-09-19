# Historial — 3A.2 · Elegir, lanzar y usar (2026-09-18)

**Una entrada de `07-historial.md` movida entera el 2026-09-18**, al escribir la entrada de cierre
de 3A.3: el fichero seguía en 1014 de sus 1000 líneas tras tres archivados y esta era la siguiente
entrada completa más antigua. No se reescribe. (La cabecera dice «fusionada en `5cc14a2`» porque
se corrigió en este mismo cierre: hasta entonces decía «sin fusionar», y ya lo estaba.)

---

## 3A.2 · Elegir, lanzar y usar (2026-09-18), rama `3a2/elegir-lanzar-y-usar` — fusionada a `main` en `5cc14a2` el 2026-09-18, sin desplegar

Qué — spellbook, lanzar conjuros a través de `usar()`, ataque de conjuro, daño extra al impactar
y encantar; nueve tareas sobre `bcba19a`, revisión final de la rama, una ola de arreglos (cinco
rondas) y el cierre documental:

- **T1 — las tablas del SRD y el arranque por clase** (`831869d`): `spell-knowledge.ts`/
  `spell-starters.ts` (catálogo puro): topes de preparados/trucos por clase y nivel,
  `ARRANQUE_POR_CLASE` verificado contra las 319 claves generadas por 3A.1.
- **T2 — `CharacterSpell`, esquema compartido y dos sucesos** (`2314937`, `1188842`): el modelo
  (migración `character_spells`), `SpellbookEntry`/`SpellbookResponse` en `@dnd/shared`, y los
  sucesos `ACTIVITY_USED`/`SPELLBOOK_CHANGED` (migración `activity_events`) con su línea en el
  hilo.
- **T3 — `SpellbookService`: listar, cambiar estado y sembrar** (`cf9ed68` + `135f400`, T10,
  D-CF-125/126/127): `GET`/`PUT …/spellbook` (lista sin prosa; detalle por conjuro aparte, tras
  encontrar que la lista con prosa llegaba a ~460 KB), `sembrarLibro` al fijar la primera clase.
  Un defecto real arreglado en el camino: `getSheet` dentro de la transacción de `setEstado`
  interbloqueaba el pool pequeño de pruebas (~19 s de cuelgue); movido fuera, dentro solo queda
  aritmética.
- **T4 — lanzar entra en `usar()`** (`2702777`, T18): espacio por nivel (el elegido, no el propio),
  escalado por espacio, el daño directo sobre otro va a la bandeja del DM como `pendingDamage`
  (una tirada, N tarjetas con los mismos dados, D-CF-128), `ACTIVITY_USED` siempre.
- **T5 — ataque de conjuro contra la CA** (`d902e23`, T19): `resolverAtaqueContraCa` extraída de
  `resolveAttack`, misma mecánica para un arma y para un conjuro; la CA sigue sin viajar por
  ningún cuerpo.
- **T6 — la pestaña «Conjuros»: elegir** (`d72d6c8`, T11 parte 1): `LibroDeConjuros.tsx` («Listos
  para lanzar» + «Disponibles» con buscador y filtros), `FilaDeConjuro.tsx` compartida; ningún
  botón se apaga por tope, el servidor cuenta y avisa.
- **T7 — «Lanzar» y las aptitudes con nombre, texto y usos** (`b2256bb`+`0782ac3`+`417d3d5`+
  `9dc5e88`+`d04a23d`+`2a71e06`, T11 parte 2): `LanzarConjuro.tsx` (objetivos, nivel de espacio,
  avisos); `CharacterSheetActivity.name`/`textEs` para que las aptitudes dejen de llamarse por su
  clave interna. Cuatro rondas de arreglo sobre el Playwright del orquestador (localizadores
  exactos, fila que no envuelve su botón, nivel sembrado antes de fijar clase).
- **T8 — daño extra al impactar** (`7d22b71`): Ataque furtivo y Castigo divino, marcados por el
  jugador sobre su tirada pendiente y confirmados por el DM al aplicar (D-CF-129).
- **T9 — encantar** (`d943122`+`1c4d8bb`, T15, migración `temporary_modifier_item`): *Arma mágica*
  como `TemporaryModifier` con `inventoryItemId` sobre `item.weaponAttack`/`item.weaponDamage`,
  leído por `efectosActivos` (D-CF-130).

Revisión final (`bcba19a..1c4d8bb`): **0C/5I/13m** en API+shared, **0C/6I/11m** en web+docs. Ola
de arreglos, cinco commits (`170d8e5`, `155b432`, `fc4b1d9`, `ba21347`, `da9d17f`): los 11
importantes cerrados (tope de Castigo divino, la carrera aplicar↔marcar-extra, el espacio de
Castigo en la misma transacción que su tirada, tarjetas de daño dentro de la transacción de
`usar()`, `spell:<key>@N` rechazado hasta 3B, el nivel de espacio que se quedaba rancio, «Tú
mismo» en combate salvo para un ataque, la vista reducida de `damagePreview`, `GrupoDeRadios` en
vez de radios a mano, dos filas de `08-pruebas.md` que mentían), 12 menores cerrados y el resto
fichado (`06-pendientes.md`, «Dejado por 3A.2»); re-revisión: **11/11 addressed**. Las tres
últimas rondas achicaron la respuesta del `PUT …/spellbook/:key` (solo la entrada cambiada) y
añadieron gzip a la API (`@fastify/compress`, D-CF-131) tras medir que las respuestas > 64 KB se
cortaban intermitentemente en este PC (Norton sobre loopback, sospecha) — en producción nginx ya
comprimía.

Playwright del orquestador, todos verdes: `conjuros`, `lanzar` (×3 tras el gzip), `hoja-pestanas`,
`furia`, `combate`, `puerta-de-efectos`, `inventario`, `objeto-sin-identificar`, `tirada`.

Tres migraciones, aditivas: `character_spells`, `activity_events` (T2), `temporary_modifier_item`
(T9). Cierre documental (esta entrada): fusiona lo que T3 y T6 habían dejado suelto en este
fichero; cierra P1 a `_archivo/pendientes-cerrados-2026-09-18-3a2.md`; D-CF-131..144 en
`decisiones.md`; «Dejado por 3A.2» en `06-pendientes.md`.

Revertir — `git revert -m 1 <hash del merge>` una vez fusionada a `main`; las migraciones son
aditivas. **Sin desplegar.**

---
