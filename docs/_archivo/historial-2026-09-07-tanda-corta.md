# Historial — Tanda corta: los seis arreglos que dejó abiertos el paso 2 (2026-09-07)

**Una entrada de `07-historial.md` movida entera el 2026-09-12**, al escribir la línea de la
revisión de HP-10 (la mitad mágica envuelve, lista y salta los ceros): el fichero quedaba en 1002
de sus 1000 líneas y esta era la entrada completa más antigua. No se reescribe.

---

## Tanda corta — los seis arreglos que dejó abiertos el paso 2 (2026-09-07)

**Qué.** Seis fichas de [06-pendientes.md](./06-pendientes.md) cerradas en seis commits, cada una
con su prueba escrita **antes** del arreglo, corrida en rojo, y **verificada por mutación**:
revirtiendo el arreglo pieza a pieza y comprobando que la prueba enrojece **por la aserción que
tenía que enrojecer**, no solo que enrojece. Nueve mutaciones en total sobre las seis tareas.

| Ficha | Qué se arregló |
|---|---|
| **P2-0** | `ConditionsService.apply` recibía un `tx` y lo usaba solo para escribir: `requireVisibleCharacter` e `inmunidadesDe` iban por el pool. `viewerFor` / `requireVisibleCharacter(WithViewer)` (`common/character-viewer.ts`) y `StatblocksService.resolver` aceptan ahora el mismo cliente opcional |
| **P2-0b** | Lo mismo un piso más abajo: `construirODenegar` reenviaba el `tx` solo a `hojaOMotivo`. `equipoEquipado` y `viewerFor` no declaraban siquiera el parámetro; ahora lo declaran, y los tres llamadores que ya corrían dentro de una transacción le pasan el suyo |
| **P2-6** | `ActivitiesService.consumir` leía con `findUnique` y escribía con `update`: tres usos simultáneos de la Furia leían los mismos 3 y escribían los mismos 2. Ahora toma `SELECT … FOR UPDATE`, el mismo candado que `changeHp` ya usaba a un metro |
| **A11-usos-sin-tope** | `max: null` («Unlimited» en el SRD) no significaba nada: `RestService` no reponía esas filas y `consumir` las gastaba de un contador finito. Las dos miran ahora `max === null` **antes** que `current`. El marcador se queda —`ResourcesService.adjust` sigue moviendo `current` a mano— y su nota lo dice en vez de afirmar que nadie lee el `null` |
| **P2-7** | Los dos guardianes que no sujetaba nadie: que un `entrega` malformado no rompa la tirada (era `entregaSchema.safeParse`, verificado solo por ejecución), y que `record()` **rechace** una clave que su esquema no conoce en vez de descartarla en silencio, que es lo que hace `.parse()` de Zod |
| **P2-3** | «Dar…» abría el cajón sin destinatarios para quien maneja un PNJ: el selector se construía solo con `fetchCharacters`, que filtra `statblockRef: null` a propósito. Ahora suma la lista de PNJ (`GET /npcs`, filtrada por `canView` en el servidor), con **el mismo filtro para las dos** |

**Cómo se verificó.** `pnpm verify` en verde en cada commit (lo exige el gancho). Además: **toda la suite de e2e de API** entera para el guardián estricto de `record()` —era el cambio que podía
romper a cualquier llamador, y no rompió a ninguno— y **una sola tanda de Playwright**, la de
P2-3, con la API precompilada antes de lanzarla.

**Lo que NO entró, y está anotado en vez de arreglado.** Cuatro fichas nuevas en
[06-pendientes.md](./06-pendientes.md): **P2-8** (`buildResponse` sigue leyendo por el pool dentro
de la transacción de `changeHp` — el mismo defecto que P2-0b, un tramo más abajo), **P2-9** (**no
existe ninguna puerta para ceder un PNJ a un jugador**, así que el caso que P2-3 nombra no se puede
montar usando el producto y su recorrido de navegador mide la otra mitad del mismo carril) y
**P2-10** (dos pruebas que se pasan del tiempo por defecto solo cuando la suite entera corre junta,
y cuyo rojo parece un defecto del cambio recién hecho). La cuarta es la medición que faltaba en el
cuerpo de **P2-0**: tres de las seis consultas de `apply` siguen yendo por el pool porque
`MembershipService` no acepta un cliente.

**Cómo revertir.** Los seis commits son independientes entre sí salvo P2-0b, que se apoya en el
`tx?` que P2-0 añadió a `character-viewer.ts`. Revertir uno solo no deja el árbol roto; revertir
P2-0 sin revertir P2-0b, sí.

---
