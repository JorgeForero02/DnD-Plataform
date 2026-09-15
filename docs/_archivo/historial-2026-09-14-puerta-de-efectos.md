# Historial — La puerta de efectos (2026-09-13/14)

**Una entrada de `07-historial.md` movida entera el 2026-09-15**, al escribir la línea del
despliegue de `334912b`: el fichero se pasó a 1004 de sus 1000 líneas y esta era la entrada
completa más antigua. No se reescribe.

---

## La puerta de efectos (2026-09-13/14) — cerrada en rama, sin fusionar ni desplegar

Qué — rama `puerta-de-efectos/antes-del-paso-3` sobre `0ca530c` (`main` con reglas de la mesa y
desbordes), **14 commits**: spec con §5 bis XP y plan (`498a0b4`), nueve tareas (`3206331` la segunda
puerta · `fc8b369` el daño de la salvación · `b6fd7ef` la bandeja de daño en la API · `64a51c2` «hasta
el próximo descanso» · `ba2ca48` XP en el servidor · `6216d97`, `c803023`, `283b468` la web ·
`53e735e` el recorrido de navegador y los docs de datos), dos olas de arreglo (`5b71c07` API,
`54379a0` web, `49d6e46` Playwright) y esta documentación. Spec:
`superpowers/specs/2026-09-12-la-puerta-de-efectos-design.md`; plan:
`superpowers/plans/2026-09-13-puerta-de-efectos.md`; ledger:
`.superpowers/sdd/2026-09-13-puerta-de-efectos/progress.md`. Segunda tanda bajo D-CF-65.

Por qué — tres huecos que el paso 3 necesita cerrados (P2-4, P2-5 y la duración «hasta el descanso»
que el esquema declaraba pendiente), más la bandeja de daño pedida por el autor y la experiencia
(ficha «XP: no existe»), cuyas dos preguntas se contestaron con el SRD y Foundry sin preguntar al
autor: **D-CF-68** (el combate **propone** el reparto por VD y el DM confirma en «Dar XP»; SRD
*Monsters · Experience Points*, «typically…»; Foundry no lo automatiza) y **D-CF-69** (sin XP a un
PNJ de statblock: sus números salen del VD, no de un nivel; Foundry solo premia a `character`).

Lo que entra:

- **La segunda puerta** (§3): `changeHpFromEffect` y `createFromEffect`, con `tx` obligatorio y sin
  ruta (una prueba lo afirma sobre todos los controladores); `usar` las usa. Un clérigo cura a otro
  jugador y le pide una salvación.
- **El daño de la salvación** (§4): se tira una vez en `usar` (SRD *Damage Rolls*), viaja en
  `RollRequest.pendingEffect` y `answer` aplica entero / mitad (`floor`) / nada con `total >= dc`
  (SRD *Saving Throws*), en la misma transacción que cierra la petición; el `HP_CHANGED` lo firma
  quien lanzó. El aviso literal «A7 NO aplica solo» desapareció.
- **La bandeja de daño** (§4 bis): el daño de un ataque resuelto lleva `pendingDamage`; `GET
  …/rolls/:id/damage-preview` (404 a quien no puede aplicar) y `POST …/apply-damage` (dueño del
  objetivo o DM; el atacante nunca; idempotente con `jsonb_set … WHERE appliedEventId IS NULL`); en el
  hilo, la línea «Espectro: 11 cortante → 5 · resistencia» y el botón «Aplicar».
- **«Hasta el próximo descanso»** (§5): `CharacterCondition.expiresOnRest`, excluyente con
  `durationSeconds`; el descanso borra con `CONDITION_REMOVED` y su motivo; tres radios con frase en
  `Condiciones.tsx` (E-PE-7).
- **XP** (§5 bis): `Character.xp`, `XP_AWARDED`, `POST /campaigns/:id/xp` (DM; 400 a un statblock;
  nunca bajo 0; bajo cerrojo), la regla de la mesa `progresion: HITO | XP` (defecto `HITO`: ninguna
  campaña cambia), `end()` propone el reparto (`sinTabla` para VD fuera de la tabla), la hoja dice
  «1 250 / 2 700 PX» y avisa sin subir (D-CF-66), «Dar XP» como séptima herramienta del DM.
- Tres migraciones aditivas: `20260913200000_roll_request_pending_effect`,
  `20260913200100_condition_expires_on_rest`, `20260913200200_character_xp` (+ `XP_AWARDED` en el
  enum). Aplicadas en local con `migrate deploy`.

Cómo se verificó — por tarea, unitarias + mutación + `pnpm verify`. Al cierre: e2e de API
`puerta-de-efectos.e2e-spec.ts` **25/25** (empezó 18/22: el `DICE_ROLLER` no tenía proveedor y el
`overrideProvider` no ataba — ahora `DiceModule`; y `end()` sobre un `PREPARING`), suite e2e de API
entera 57/58 ficheros antes de la ola y sin regresiones; revisión Opus de la rama en dos mitades (API
3C/3I/14m, web 1C/10I/15m) → **ola 1 cerró los 17** (re-revisión 17/17, 0 nuevos); Playwright sobre
los spec tocados 21/21 tras la ola 2; **suite Playwright entera 203 pass / 1 skipped / 3 fail**, de
los que uno es el `test.fail` declarado de `mesa-en-estrecho`, uno es `sesion.spec.ts:827` **que pasa
solo** (flaky) y dos eran `iniciativa-en-vivo.spec.ts`, **rojo en `main` desde D-CF-66** (la jugadora
fijaba `level: 8` por el `PATCH`, ahora 403): se quitó el `level` del helper y pasa 3/3.

Lo que cazó la revisión que ninguna tarea vio — la segunda puerta derivaba la hoja del objetivo con
el actor como visor, así que un statblock de campaña (`DM_ONLY`) daba 400 al aplicar; el visor pasa a
ser del servidor y el actor solo firma. El `DICE_ROLLER` sin proveedor: todos los «dados fijos» del
e2e eran azar y pasaban por suerte. La propuesta de XP vivía en la tira de iniciativa, que se
desmonta al terminar el combate: `CapaDeCombate` es ahora componente propio y la conserva.

Revertir — `git revert` de la rama (o no fusionarla). Las tres migraciones tienen su `-- Revertir:`;
el valor `XP_AWARDED` del enum se queda (no se puede quitar sin reescribir el tipo).

Lo que deja abierto está en `06-pendientes.md`, «Dejado por puerta de efectos» (PE-1, PE-2).
**Sin fusionar ni desplegar: la fusión la decide el autor; el paso 3 no se arranca.**

---
