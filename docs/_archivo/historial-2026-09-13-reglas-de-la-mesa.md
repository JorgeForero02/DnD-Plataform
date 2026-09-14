# Historial — Reglas de la mesa (2026-09-13)

Movida entera y sin editar desde `docs/07-historial.md` el 2026-09-14, al llegar ese fichero a sus 1000 líneas con la entrada de PE-1.

## Reglas de la mesa (2026-09-13) — cerrada en rama, sin fusionar ni desplegar

Qué — rama `reglas-de-la-mesa/antes-del-paso-3`, base `main` `27304e1`, **16 commits** hasta el
cierre (D-CF-65 en `16446d8`, plan en `f632dd9`, siete tareas, tres olas de arreglo, dos commits de
spec de navegador y este de documentación). Spec: `docs/superpowers/specs/2026-09-12-reglas-de-la-mesa-design.md`
(D-CF-53); plan: `docs/superpowers/plans/2026-09-13-reglas-de-la-mesa.md`. **Primera tanda bajo
D-CF-65**: por tarea solo unitarias + mutación + `pnpm verify` y un commit del propio implementador
(Sonnet); al cerrar, revisión Opus de la rama entera, Playwright en los spec tocados y la suite
entera una vez, y olas de arreglo hasta limpio.

- **El dato** (T1): `Campaign.tableRules Json` con `{}` por defecto —libre, nivel 1, media, todo
  permitido, equipo: ninguna campaña existente cambia—, `Character.hitPointsPerLevel Json?` y la
  tabla `AbilityRollAttempt`; migración a mano `20260913100000_table_rules`, aplicada con
  `migrate deploy`. `tableRulesSchema` en `@dnd/shared`; `PATCH /campaigns/:id` la acepta (DM) y
  valida la expresión de dados con el evaluador (400).
- **Catálogo y motor** (T2): `startingGold { dice, times }` en las doce clases (SRD 5.1, *Starting
  Wealth by Class*); `EngineInput.hitPointsPerLevel` sustituye a la media en los niveles con los
  que se nació, trazado como `maxHp.perLevelAtCreation`; las tres construcciones del build desde la
  fila lo pasan. Puras en `rules/table-rules.ts`.
- **El servidor tira** (T3): `POST/GET …/ability-rolls` — seis `ABILITY_ROLL` `OWNER_DM` y la fila
  del intento en una transacción; 409 al intento N+1 y tras elegir.
- **La hoja obedece** (T4): en `PATCH …/sheet` —donde de verdad llegan las seis, la raza y la clase
  (E-RM-1)— las seis juntas bajo matriz/puntos/dados, permutación exacta, coste de puntos,
  `attemptId` que fija; permitidos con nombre legible; `POST /characters` nace con `nivelInicial`;
  PG de los niveles 2..N y oro inicial al fijar la clase por primera vez (E-RM-2), una vez.
- **Pantalla** (T5–T6): bloque «Reglas de la mesa» en Ajustes (radios con su frase, listas con
  nombres legibles, guardado explícito); el diálogo de crear pierde el campo de nivel y filtra el
  catálogo; la hoja apaga las seis casillas bajo regla y monta `AsignarCaracteristicas` (seis
  desplegables que se agotan, compra por puntos con coste y contador, «Tirar características» con
  los seis dados y «Quedarme con este»).
- **Pruebas** (T7 y cierre): `reglas-de-la-mesa.e2e-spec.ts` (403/409/400, fijación, permitidos,
  «4d6kh3 con 2 intentos», PG y oro al nacer) y `reglas-de-la-mesa.spec.ts` (DM fija «dados, 3d6, 2
  intentos» → el jugador tira, ve seis dados con sus caras, elige el segundo, la hoja deriva y no
  deja editarlas; clase fuera de permitidos no se ofrece y la guardada se ve marcada).

Por qué — pedido explícito y repetido del autor al revisar producción: «faltan ajustes del DM antes
de que cada jugador haga su hoja», y «todo lo que se puede decidir con dados, el DM puede dar esa
opción, escoger qué dados y cuánto, o dejarlo fijo».

Lo que la ejecución decidió contra el texto (E-RM-1..16, en `docs/decisiones.md`): la regla vive en
el `PATCH` y no en el `POST`; PG y oro al fijar la clase; `hitPointsPerLevel` porque `maxHp` no se
guarda; **«el DM arbitra con `overrides`» era falso** —`OVERRIDABLE_KEYS` no tiene características—
y el DM corrige las seis por `PATCH` directo (E-RM-13); un PNJ instanciado queda fuera de la regla
(E-RM-16).

Lo que cazó el cierre y no la tarea — la revisión Opus de la rama: 0 críticos, 4 importantes (un
jugador podía re-elegir OTRO intento tras fijar; el DM se quedaba sin camino en pantalla bajo regla
no libre; un spec que afirmaba lo contrario de la regla de casa; docs que contradecían el código) y
14 menores; la suite e2e de API entera (521) tras arreglar veinte specs que creaban personajes a
nivel > 1 por el `POST`; y seis localizadores del spec de navegador corregidos contra el DOM real.
La suite de navegador **entera** corrió una vez: 200 en verde, 1 saltada, 1 fallo esperado
(`mesa-en-estrecho`, ROTO con ficha previa). **Y la ola 3 no la cazó la revisión: la decidió el autor**
al leer la ficha RM-1 — **D-CF-66, solo el DM controla cuándo se sube de nivel**: nivel a mano y
`level-up` pasan a ser del DM (403 al dueño; casilla y botón apagados con su motivo), catorce e2e de
API cambian de token y añaden el caso del 403; e2e API entera 523 y los ocho spec de navegador
tocados en verde después. Detalle en `.superpowers/sdd/2026-09-13-reglas-de-la-mesa/` (ledger,
informes, `final-review.md`, `re-review-1.md`, `re-review-3.md`).

Revertir — `git revert` de los commits de la rama; la migración se deshace con el «Revertir:» de su
cabecera. **No se ha fusionado ni desplegado**: producción sigue en `6d2b2ca`; la fusión la decide
el autor.
