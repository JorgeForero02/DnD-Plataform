# Historial archivado — Task 14 bis del pulido: el mundo como árbol con detalle — sustituye al tablero telaraña (2026-09-13, #23, D-CF-64)

**Movida entera** el 2026-09-13, al escribir la entrada de hito «Pulido antes del paso 3» (Tarea
15, cierre de la tanda): el fichero iba a superar 1000 con la entrada nueva y esta era la entrada
completa más reciente que ya estaba resumida en el hito. Su resumen se queda en `07-historial.md`.

---

## Task 14 bis del pulido: el mundo como árbol con detalle — sustituye al tablero telaraña (2026-09-13, #23, D-CF-64)

Qué — `features/sessions/taller/mundo/`: `arbolDelMundo.ts` (puro: cuelga cada ficha de su padre
por un rótulo de `ROTULOS_DE_JERARQUIA`, dos padres → «también en …», ciclos cortados y marcados,
`sinHilos`, y `vecinosDe` leído desde la ficha abierta), `DesgloseDelMundo.tsx` (`tree` WAI-ARIA
con tabindex rotatorio: flechas, → despliega, ← pliega, Enter elige; buscador sin tildes; chip
«Sin hilos»), `DetalleDeFicha.tsx` (cabecera · vitela recortada con «Leer más» · anillo · hilos),
`AnilloDeVecinos.tsx` (SVG propio, posiciones fijas `2π·i/n`, cada vecino un `<button>`),
`EditorDeHilos.tsx` (fila ficha · rótulo · cambiar · quitar; dos desplegables con buscador,
rótulo sugerido por `relacionesSugeridas` o libre; **cambiar = crear y luego quitar**, porque no
hay `PATCH` de enlaces) y `ElMundo.tsx` (las dos mitades, `lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]`).
`ROTULOS_DE_JERARQUIA` y `esRotuloDeJerarquia` en `apps/web/src/features/links/relaciones.ts`: los seis son `desde` de
`RELACIONES`, ninguno se descartó. `TallerDelDM.tsx` monta `ElMundo` donde iba el tablero, con la
cabecera «El mundo»; la selección sigue alimentando «Escribir ficha». **Se borran** `TableroTelarana.tsx`,
`posiciones.ts` y sus dos pruebas (**D4**, 2026-09-02: «el tablero telaraña se retira»); es la única
baja de pruebas de la tanda y va en el mismo commit. Desviación del brief: el componente del árbol
se llama `DesgloseDelMundo.tsx` y no `ArbolDelMundo.tsx` porque en Windows `./ArbolDelMundo` resolvía
al módulo puro `arbolDelMundo.ts` (`.ts` antes que `.tsx`, sin distinguir mayúsculas).

Por qué — el autor, tras cuatro maquetas (2026-09-12), aplazó el mapa de historia y cerró el #23
con desglose + detalle. La regla nueva de `04-convenciones.md`: *un árbol enseña un padre; los
demás hilos van en la ficha*.

Evidencia — unitarias nuevas: `arbolDelMundo.test.ts` (11), `DetalleDeFicha.test.tsx` (11),
`ElMundo.test.tsx` (7), y dos en `relaciones.test.ts`; `pnpm --filter @dnd/web test -- taller links`
en verde. Mutación: quitar la comprobación de `ROTULOS_DE_JERARQUIA` (todo rótulo cuelga) hace
fallar exactamente «un hilo lateral no mueve nada»; restaurado con `cp`. e2e nuevo
`mundo-arbol.spec.ts` (tender «vive en» desde los desplegables cuelga a Corvin de la Torre Gris,
persiste tras recargar; a 390 px el detalle va debajo y `scrollWidth <= 390`) y el mundo en
`tokens-contrast.spec.ts` en los tres temas — **no corridos en esta sesión, a cargo del orquestador**
junto a `mesa-mide.spec.ts`.

**Revertir:** `git revert` del commit devuelve el tablero, `posiciones.ts` y sus dos pruebas; no
hay migración ni dato que limpiar (los hilos ya existían tal cual).

**Ronda 1 (2026-09-13).** El orquestador corrió `mesa-mide` 3/3, `tokens-contrast` 37/37 y
`mundo-arbol` 1/2: a 390 px el detalle empezaba 64 px antes del final del árbol. Causa: la
rejilla de `ElMundo` llevaba `min-h-0` dentro de la columna de scroll del taller y el árbol tenía
scroll propio siempre, así que por debajo de `lg` las mitades no se apilaban como bloques. Ahora
`min-h-0` y `overflow-y-auto` solo en `lg:`; la aserción `detalle.y >= árbol.y + árbol.height - 1`
se queda tal cual y su comentario dice qué prueba y qué no (la rejilla exterior del taller a 390
sigue en D-CF-26). Revertir: quitar el prefijo `lg:` de esas clases.

**Ronda 1 de revisión (2026-09-13).** Cinco importantes: (1) un par con dos rótulos de jerarquía
daba dos nodos con el mismo id bajo el mismo padre —ahora cuelga una vez, por el primero de
`ROTULOS_DE_JERARQUIA`—; (2) una raíz cuyas fichas cuelgan todas de otra decía «Ninguna todavía»:
ahora «Todas cuelgan de otra ficha.», y la nota es `role="none"`; (3) de Aldea → Bosque ↔ Ciudad se
levantaba Aldea como raíz fantasma —se levanta una ficha DEL ciclo (la primera por nombre de las
que están en él), nunca una que cuelgue de él—; (4) **«custodia» sale de la jerarquía** (decisión
del orquestador: el árbol enseña contención; custodiar es lateral) — la frase «los seis, ninguno
se descartó» de arriba fue cierta hasta esta ronda; (5) `como-seguir.md` seguía poniendo el mapa
de historia como sustituto del tablero. Menores: `aria-selected` en las raíces, «Guardar el rótulo»
sin cambio no manda nada, una línea gris explica por qué los hilos que entran no tienen lápiz, el
comentario de `wikilinks.test.ts` ya no cita `posiciones.ts`, y si el `DELETE` falla tras el
`POST` el aviso dice que el nuevo existe y el viejo se quita a mano. Aplazado al ledger: solape
del anillo con 9+ vecinos, «Leer más» cuando el cuerpo cabe, el chip por encima del buscador,
rótulo libre >80 en cliente, invalidación de la otra ficha al quitar, raíces vacías plegadas, el
editor bajo el pliegue a 1280×800.

