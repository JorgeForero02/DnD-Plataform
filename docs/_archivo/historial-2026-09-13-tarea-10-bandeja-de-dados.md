# Archivo — Tarea 10 del pulido: la bandeja de dados, pulsar y no escribir (2026-09-13)

Movida entera desde `docs/07-historial.md` el 2026-09-13, al escribir la ronda 1 de la Task 14
bis (el mundo como árbol con detalle): el fichero quedaba en 1002 de 1000 y era la entrada
completa más antigua. Sus dos rondas de arreglo se quedan arriba.

---

## Tarea 10 del pulido: la bandeja de dados — pulsar, no escribir (2026-09-13, C5 web: #10, #11, #14, anexo #16)

Qué — `bandeja.ts` (nuevo, `apps/web/src/features/rolls/`): `Bandeja { dados: Caras[];
modificador: number }` y sus cuatro operaciones puras (`conDado`, `sinDado`, `conModificador`,
`expresionDeBandeja`, `admiteVentaja`), probadas solas. `BandejaDeDados.tsx` (nuevo): pinta los
siete dados como botones, la pila con un botón por dado (`aria-label="Quitar el d6 (posición
N)"`), el modificador con `−`/`+`, `SelectorDeVentaja` solo si `admiteVentaja`, y un `<details>`
«Modo avanzado» —controlado a mano, no nativo: jsdom no implementa el clic-para-abrir de
`<summary>`— con el campo «Qué se tira» de siempre; la expresión escrita manda mientras el modo
avanzado está abierto y alguien ha tecleado, y pulsar un dado siempre devuelve el control a la
bandeja. Un rechazo del servidor abre el modo avanzado solo (derivado, no con un efecto: el
`react-hooks/set-state-in-effect` del linter lo prohíbe). `desglose.ts`: `dadosDeLaTirada` acepta
`dice[]` (Tarea 9) y devuelve `caras` por dado (`null` sin él); `ResultadoDeTirada.tsx` dibuja
cada dado con `IconoDado caras={dado.caras ?? 20}` en vez de siempre el d20. `PanelDeDados.tsx` y
`PanelDeDadosDeLaMesa.tsx` sustituyen su bloque «Qué se tira» + «Atajos» + `SelectorDeVentaja` por
`<BandejaDeDados>`; en el cajón compacto de la mesa, audiencia y CD (con su guía del SRD) se
pliegan en un `<details>` «Audiencia y CD» cuyo `summary` dice lo elegido, y el botón pasa a decir
«Tirar» a secas.

Por qué — el autor quiere ver muchos dados a la vez (4, 6, 9, 10 mezclados) y pulsarlos, no
escribir `4d6+1d8+1d20-2` a mano; el anexo #16 dejaba pendiente justo esta pieza de la rejilla de
dos columnas de la Tarea 3. `conDadoAnadido`/`expresion.ts` dejan de usarse en los paneles y se
conservan con su prueba, declarados como tal.

Pruebas — `bandeja.test.ts` (6), `BandejaDeDados.test.tsx` (8, con `fireEvent` y no `userEvent`:
el proyecto no tiene esa dependencia), `desglose.test.ts` (+2 con `dice[]`),
`ResultadoDeTirada.test.tsx` (+1, dos formas distintas en el mismo resultado),
`PanelDeDados.test.tsx` (dos de los tres que escribían en «Qué se tira» abren «Modo avanzado»
primero —camino ajustado, aserción intacta—; el tercero, «un atajo de dado compone la
expresión», tenía la aserción sobre un camino que ya no existe —vaciar el campo a mano— y se
reescribió sobre el nuevo: la bandeja empieza con un d20 y un atajo la agranda). `pnpm --filter
@dnd/web test -- src/features/rolls`: 77/77.
Mutación: `expresionDeBandeja` sin agrupar por caras (`1d6+1d6` en vez de `2d6`) enrojece
`bandeja.test.ts` **y** `PanelDeDados.test.tsx` — restaurada con `cp`. E2E actualizados (no
corridos por el agente): `dados.spec.ts` (nueva prueba de la bandeja contra la API real, y los
seis recorridos que escribían en «Qué se tira» abren «Modo avanzado» antes), `tirada.spec.ts`
(nueva: el cajón compacto cabe en 17rem sin desbordar), `espacios.spec.ts` (las dos medidas de
altura abren «Modo avanzado» y, en el cajón, «Audiencia y CD», antes de medir), `tokens-contrast.spec.ts`
(nuevo bloque: el botón de un dado, la pila, el rótulo «Modo avanzado» y el borde del campo
abierto, en los tres temas).

Revertir — `git revert` del commit; ningún dato ni migración de por medio.
