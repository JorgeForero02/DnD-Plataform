# Archivo del historial — «Cerrar fichas, tanda de las decididas» (2026-09-11)

> Movida entera aquí el 2026-09-12 al llegar `07-historial.md` a 1014 líneas con la entrada de la
> revisión de producción del autor. Era la entrada completa más antigua de las que detallan tarea a
> tarea; su hito (la tanda de fichas 2–6 en `main`) se queda arriba. **No se reescribe.**


## Cerrar fichas, tanda de las decididas — con código (2026-09-11)

Las fichas que el autor decidió el 2026-09-10 y llevan código; una por commit, prueba roja antes y
mutación. Texto y medición en
[`_archivo/pendientes-cerrados-2026-09-10.md`](./_archivo/pendientes-cerrados-2026-09-10.md).

- **R1** — el límite global cuenta por usuario con sesión iniciada y por IP sin ella
  (`common/user-or-ip-throttler.guard.ts`, `AuthModule` exporta `JwtModule`). **Por qué:** cinco
  jugadores por una VPN eran una IP. **Revertir:** volver a `ThrottlerGuard` en `APP_GUARD`.
  **Lección:** la primera prueba de «token falso» no cazaba la mutación `verify → decode` porque
  todos los tokens llevaban el mismo `sub`; una prueba que no se ve fallar con el mutante no
  prueba nada.
- **P3 · archivar en la mesa** — el hilo de una sesión incluye los sucesos de campaña sin sesión
  entre su inicio y su cierre (`game-events.service.ts`, `list`; D-CF-19 con el tope que puso la
  revisión). `/rolls?sessionId=` se ensancha igual. **Revertir:** volver al filtro estricto por
  `sessionId`. Primera tarea ejecutada por subagente en esta sesión: implementador Sonnet, revisor
  Opus, una ronda de arreglo.
- **La revisión final de la rama, y su ola de arreglos** (2026-09-11, Opus sobre 17 commits):
  dos altos —el cubo por usuario se aplicaba también a login (N cuentas × 5/min contra una
  víctima) y `rollDeathSave` ignoraba `stable`—, tres medios —el flash sin productor, la sesión
  planificada absorbía todo suceso, `entityCount` sin invalidar— y siete bajos, todos cerrados con
  prueba roja en una sola ola. **Revertir:** cada punto es un commit-hijo de la ola; el guard
  vuelve a `getTracker(req)` sin mirar el `Reflector`.
- **La tanda única de Playwright** (2026-09-11): 151 recorridos en 42 ficheros, 9 rojos a la
  primera y los nueve cerrados —siete eran specs nuevos o desfasados, uno un texto duplicado, y
  uno producto: el filete del panel de vitela en Lectura se medía contra el fondo de la mesa y no
  contra el pliego, 2,78:1; ahora tiene canal propio, `--vellum-border`. Cifras y causas en
  `08-pruebas.md`. **Revertir:** `--vellum-border` vuelve a `--copper-rule` en `Panel.tsx`.
- **Tanda 6, las decisiones del autor del 2026-09-11** (tomadas con la otra sesión por los cuatro
  pasos, D-CF-23 a 28): la vitela de Lectura es el pliego claro del prototipo con su paleta de hoja
  entera; la anulación del DM guarda y enseña su motivo sin migración (J7), y de paso
  `passivePerception` deja de ignorar la anulación; `changeHp`/`rollEventId` se cierra sin código
  con la cita de Foundry y Roll20; la mesa a 390 px queda aplazada por el autor; `race`/`class` se
  borran sin medir en la tanda de migraciones; y D6/D7 se archivan como lo que ya eran, D-CF-6/7.
  **Revertir:** el bloque `[data-theme="reading"] [data-tone="vellum"]` de `tokens.css` y la unión
  de `overridesSchema`; las filas viejas nunca se tocaron.
- **Tanda 5 (d)** (un lote, tres fichas): las campañas dicen cuántas fichas ve quien mira (U4,
  contado con `canView`); las claves de traza del motor tienen una sola fuente y una prueba que
  caza una clave sin frase (S10-vocabulario); y el tema Claro es papel cálido como el prototipo
  (D-OP-10), con sus contrastes remedidos. Y las migas de pan ganan el anillo de foco de la casa.
  **Revertir:** una pieza cada uno; los canales del tema Claro vuelven al gris frío.
- **Tanda 5 (c), medir en el navegador** (un lote, cuatro fichas): fuera los 21
  `JSON.stringify({})`; el aviso «no puedes editar» medido en la pantalla de un jugador con dos
  navegadores; la subida de nivel en `tokens-contrast`; y un recorrido de teclado. **Revertir:**
  los e2e se pueden quitar; los 22 cuerpos vacíos no hacen falta volver a ponerlos.
- **Tanda 5 (b), pantalla** (un lote, dos fichas + una falsa): la tirada de ataque elige audiencia
  (I10); la sesión deja de ofrecer `SPECIFIC_PLAYERS`, que era inerte sin concesiones (P3); y
  «la petición de concentración no dice que lo es» resultó **falsa** al abrirla: el `label` ya lo
  dice y la bandeja lo pinta. **Revertir:** una pieza cada uno.
- **Tanda 5 (a), pantalla** (un lote, dos fichas): el diálogo de crear personaje usa el catálogo
  (raza, subraza, clase) y guarda claves —desbloquea la migración de `race`/`class`—, y
  `OWNER_DM` en un statblock vuelve a valer (el servidor pasaba `createdById: ""`). Sus recorridos
  de navegador se corren al final de la tanda. **Revertir:** una pieza cada uno.
- **Tanda 4 (e)**: los enlaces del taller se piden una vez por campaña (`GET /campaigns/:id/links`,
  filtrado por `canView` en los dos extremos) en vez de una consulta por ficha. **Revertir:** el
  taller vuelve a `useLinks` por ficha; la ruta puede quedarse.
- **Tanda 4 (d)** (un lote, tres fichas): `viewerFor` vive una sola vez en `common/` y una prueba
  barre las copias (P4); y las frases de visibilidad salen de una matriz declarada en
  `@dnd/shared` (`QUIEN_VE`) que una prueba de la API compara con `canView` caso a caso (U10 y
  H11). **Revertir:** las copias no vuelven solas — es un `git revert`; la matriz se puede quitar
  dejando las frases.
- **Tanda 4 (c)** (un lote, dos fichas): `NOTIFY` del motor llega a la bandeja como `RULE_NOTIFY`
  (N3-notify), y cambiar la contraseña devuelve un token fresco con `iat` = segundo del cambio + 1,
  que vale al instante sin aflojar la regla del empate (1.18a). **Revertir:** quitar el caso
  `NOTIFY`; volver a `{ success }` y al cierre de sesión en la pantalla.
- **Tanda 4 (b), inventario** (un lote, dos fichas): la cantidad se ajusta por delta con
  `increment` (M2B-8, la carrera de las flechas), y equipar devuelve la CA nueva en la misma
  respuesta (M2B-11, adiós a `fetchAc` antes y después). **Revertir:** quitar `quantityDelta`
  del esquema; volver a las tres peticiones en el hook.
- **Tanda 4 (a), motor** (un lote, dos fichas): aviso `armor_not_proficient` con su frase (I6,
  SRD 5.1 *Armor Proficiency*), y «estable» sobrevive a la petición como condición reservada
  `stable` que el daño o la curación retiran (H1b, SRD 5.1 *Stabilizing a Creature*).
  **Revertir:** quitar la emisión del aviso; quitar la condición y volver al `status` derivado.
- **Tanda 3, herramientas** (un lote, dos fichas): `ts-jest` deja de avisar por los `.js` de
  `shared/dist` y `postcss.config` pasa a `.mjs`; `pnpm db:slot` funciona en una ruta con `&`
  (sin `shell`, `execFileSync` sobre el CLI de Prisma). **Revertir:** una pieza cada uno.
- **Tanda 3, web sueltas** (un lote, seis fichas): el comentario de `posiciones.ts` señala el
  anillo; `resolverCitas` ordena por `createdAt` ella misma; la prueba de `SessionEditor` afirma
  la pérdida de segundos en vez de pasar por coincidencia; `CreateCampaignModal` pinta
  `mutation.error`; el flash de «se cerró tu sesión» se limpia al salir de la pantalla; un 500 en
  el detalle de campaña dice «no se pudo cargar» con «Reintentar»; y las etiquetas de nivel viven
  una vez en `visibilidad.ts` (U6-visibilidad). **Revertir:** cada una es un cambio de una pieza.
- **Tanda 2, contrato compartido** (un lote, cuatro fichas): el sello vacío se rechaza
  (`stampSessionNoteSchema`); la fecha de una sesión se puede quitar (`scheduledAt: null` en el
  `PATCH`, `SessionEditor` lo manda al vaciar); los dos esquemas de consulta viven en
  `@dnd/shared` (S12, sin excepción declarada); y **«Almádena» era «Mazo de guerra»** en el SRD
  5.1 en español (I1, Nosolorol/Ana Navalón; los otros tres nombres eran correctos). **De paso,
  la revisión encontró y se cerró en la misma ronda:** un `POST` de sesión con `scheduledAt:
  null` se guardaba como 1970 (`coerce` sobre `null`); ahora crear también admite `null` como
  «sin fecha». **Revertir:**
  cada uno es un cambio de una pieza; el de S12 es una mudanza inversa.
- **E0 · TipTap** — los seis paquetes `@tiptap/*`, el lock y el script E0 de ida y vuelta (`scripts/e0-tiptap-roundtrip.mjs`, borrado) <!-- docs-lint-ignore -->
  salen (D-CF-12); una prueba impide que vuelvan sin decisión. **Revertir:** `git revert`.
- **P6 · Node 22** — los cuatro pines a 22 y una prueba que los mantiene iguales (D-CF-13).
  **Revertir:** los cuatro pines a 20 (y la prueba). Las imágenes se reconstruyen en el siguiente
  despliegue, que lanza el autor.
- **H7** — rearmar una regla sin tocar sus efectos revalida los guardados: contra una ficha
  borrada es 400 (`rules-engine.service.ts`, `update`). **Revertir:** quitar la rama de
  `status === "ARMED"` sin `effects`.
- **M2B-14** — **no se cierra con código: se cierra como decisión** (D-CF-22). Un *Weapon +1* del
  SRD no es un objeto sino una plantilla sobre un arma base —encantar, paso 3—, y el DM ya crea
  «Espada larga +1» como objeto de campaña con `weaponAttack`/`weaponDamage`. La recomendación
  del día anterior («cinco filas») estaba mal medida.
- **D8** — la contraseña olvidada la reinicia un administrador con una temporal
  (`POST /admin/password-resets`, `AdminGuard`, bloque en «Cuenta» solo para `isAdmin`, que ahora
  viaja en `/auth/me`). Sin correo. Recorrido real con dos navegadores en `admin-reinicio.spec.ts`.
  **De paso, `09-jugar.md` mentía en tres sitios** —«no hay segundo DM», «no se puede revocar una
  invitación», «perder la cuenta del DM deja la campaña sin nadie»— desde el plan 11; corregidos.
  **Revertir:** quitar `AdminController` del módulo y el bloque de `AccountPage`; `isAdmin` en
  `AuthUser` puede quedarse.
