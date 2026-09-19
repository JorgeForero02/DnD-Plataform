> **Archivado el 2026-09-19.** Entrada de `07-historial.md` movida entera, sin reescribir, al pasarse el fichero de sus 1000 líneas con la entrada de las correcciones de interfaz. Su cabecera decía «pendiente de fusionar»: se fusionó a `main` en `c94fb90` esa misma noche (v0.1.0-beta). Su resumen se queda arriba.

## 3A.3 · La barra de acciones y la mesa converge al prototipo (2026-09-18), rama `3a3/la-barra-de-acciones` — cerrada, pendiente de fusionar

Qué — el cierre del bloque A del paso 3 ([plan](./superpowers/plans/2026-09-18-3a3-la-barra-de-acciones.md),
D-CF-70/71): la lista única de acciones del servidor, la economía del turno como estado, la banda
única, la barra de acciones bajo el marco y la mesa entera adaptada al HTML del prototipo del autor
(`prototipo/mesa/2026-09-18-prototipo-mesa.html`, D-CF-149). Siete tareas sobre `90e3c0b`, una
revisión Opus de la rama entera y UNA ola:

- **T1 — `GET …/characters/:id/actions`** (`c1fbd2e`, T21): `AccionesResponse` con cinco grupos
  (Ataques · Conjuros · Aptitudes · Objetos · Básicas) compuestos desde lo que `characters`,
  `spellbook` e `inventory` ya derivan, más las ocho básicas del SRD (`basic-actions.ts`, cableadas
  en `ActivitiesModule` como `basic:<key>`; Ayudar va por su propia puerta); `disponible`/`motivos`
  desde la economía del `Combatant`; solo dueño o DM (403). `acciones.e2e-spec.ts` contra combate real.
- **T2 — la economía del turno como estado** (`9cabf64`, D-CF-145): tres marcas (punto lleno /
  hueco tachado) y los pies en la franja; «Usar mi…» desaparece; el DM conserva «Corregir», que solo
  marca hacia adelante (no hay des-gasto en el servidor).
- **T3 — la banda única** (`1b9d9a0`): `BandaUnica.tsx` funde `BandaDeMesa` y `CabeceraDeEscena`
  (escena, lugar, reloj, duración, asistencia, conmutador «Con tablero / Sin tablero» persistido,
  atajos, «Ver como», tema).
- **T4 — la barra de acciones** (`3aa6c0d` + `9b48c5d` + `fbd60d1` + `bd9339d`, T22):
  `features/actions/BarraDeAcciones.tsx`, cinco menús en `PanelFlotante`, chip de objetivo
  (`objetivo.store.ts`), cada fila reutiliza la puerta de siempre (`useResolveAttack`,
  `LanzarConjuro`, `useUsarActividad`, `useConsumeInventoryItem`, `AyudarA`). Tres rondas sobre el
  Playwright del orquestador: un bug real (un panel anidado cerraba al padre) y dos localizadores.
- **T4b — atacar gasta la acción** (`47bc296`, D-CF-146): `resolveAttack` gasta `ACTION` por
  `gastarSiEnCombate` (`TurnEconomyGateModule`, `ModuleRef` sin ciclo `characters ↔ encounters`),
  probado en `AppModule` entero; Ataque Adicional queda como aviso hasta 3B.
- **T5 — la mesa se recompone** (`6cd63a1` + `cf68768`, D-CF-147/148): el cajón del registro
  desaparece; registro lateral (18rem) con filtros Todo · Relato · Números inline en su cabecera,
  herramientas del DM debajo, marco con cabecera y «abrir aparte», rejilla de tres columnas; atajo
  `/`; P-1 se cierra por absorción.
- **T5b/T6 — fidelidad al HTML del prototipo** (`eaf3c59` + `746e3dc` + `edc0a93` + `8b1ae58`,
  D-CF-149, decisión del autor: «aún no se ve como el prototipo»): franja de combate compacta con
  la economía inline y «Siguiente turno», elenco denso con la voz en el filete y mandos de 1.6 rem,
  registro en líneas compactas (`MensajeDelHilo variante="linea"`), sellos como iconos, rail sin
  bordes; `mesa-prototipo.spec.ts` mide DM y jugador a 1280 y 390 con ocho capturas commiteadas;
  tres rondas de arreglo (la de 390 eran los `sr-only` absolutos: la raíz pasa a `relative`).
- **Ola post-revisión** (`945b8fa`): ver abajo.

Revisión final de la rama (`90e3c0b..8b1ae58`, 14 commits, 97 ficheros): **1C · 5I · 11m**. El
crítico: **las Aptitudes de la barra no funcionaban nunca** — la fila viajaba como `feature:rage`,
el catálogo buscaba `rage`, 404, y la barra no pintaba ningún `isError`, así que «pulso y no pasa
nada»; ninguna prueba lo ejercitaba. La ola lo cierra por los dos lados (la web recorta el prefijo
como ya hacía con `attack:`; `parsearClaveDeActividad` acepta `feature:<key>`) con RTL, unitaria y
un e2e de API que reenvía la clave tal cual la lista `GET actions` (mutado: 404 sin el arreglo).
Los cinco importantes: errores del servidor en línea en cada control de la barra (`ErrorDeControl`);
la línea «En la escena» ya no rompe la fila única de la banda (inline truncada desde `lg`, medida
con asistencia declarada en `sesion.spec`); la tarjeta del elenco vuelve a ser contenido y apuntar
es un botón propio con `aria-pressed` (`BotonDeApuntar`, `IconoDiana`); `aria-disabled` con motivo
en sellos, ±5 y la casilla gastada (U9); y las docs que mentían (01, 08, 09, D-CF-148, tres
comentarios). Menores cerrados: M1 (atacar invalida encuentro y acciones), M2 (el chip se limpia al
terminar el combate o cambiar de campaña), M3, M4 (`useId`), M5 (`/` en «Atajos»), M8 (enlace al
SRD 5.1), M9 (`tablero-en-la-mesa` a 390 como `test.fail` con la medida buena), M10 (autor en
`sr-only`). Fichados: M6, M7, M11 y la mitad de M4 («Dejado por 3A.3», `06-pendientes.md`).

Playwright, corrido por el orquestador (el implementador no lo corre): `barra-de-acciones`,
`desbordes` (fallaba ya en `main`: el seed demo dejaba el encuentro en `PREPARING`; arreglado en
`8b1ae58`), `mesa-prototipo`, `mesa-mide`, `sesion`, `tablero-en-la-mesa`, `combate`,
`iniciativa-en-vivo`, `tokens-contrast`, `furia`, `campana`, `color-de-personaje`,
`arrastre-dentro-del-cajon` — todo verde salvo `mesa-en-estrecho`, que es `test.fail` a propósito
(D-CF-26). Los specs que la ola toca (`sesion` —prueba nueva—, `tablero-en-la-mesa` —`test.fail`
nuevo—, `barra-de-acciones`, `tokens-contrast` —solo un comentario—) los corre el orquestador antes
de fusionar. `pnpm verify` en verde en cada commit (pre-commit).

Por qué — «primero lo que hace jugable una partida» (D-CF-71): con el libro (3A.1) y lanzar
(3A.2), lo que faltaba era que quien juega no tuviera que decidir *dónde* está cada cosa, y que la
mesa se viera como el autor la dibujó. Proceso: rigor según pieza (T1/T2/T4 con TDD; T3/T5/T6
visuales sin unitarias ni mutación por tarea, medidas en navegador y capturas; una revisión Opus y
una ola). Decisiones D-CF-145..159 en [decisiones.md](./decisiones.md).

Revertir — `git revert -m 1 <hash del merge>` una vez fusionada a `main`; **sin migraciones**.
Sin desplegar: producción sigue en `334912b`. Siguiente: **Paso 4, la prueba de partida**, que
corre el autor ([como-seguir.md](./como-seguir.md) §0;
[guion](./superpowers/notes/2026-09-18-paso-4-la-partida.md)).

---

