# Informe de la noche del 2026-09-18 — paso 3A cerrado (3A.2 + 3A.3), beta 0.1.0

> Escrito por el controlador al amanecer. Todo lo de abajo está en `main` y empujado; **nada
> desplegado**: producción sigue en `334912b`. El Paso 4 (la prueba de partida) lo corre el autor
> — guion en `docs/superpowers/notes/2026-09-18-paso-4-la-partida.md` — y el autor lo decidió así
> de madrugada («detente terminando 3A; paso 4 lo correré después»).

## Qué se fusionó

| Qué | Merge en `main` | Commits | Revertir |
|---|---|---|---|
| Decisiones D-CF-125..127 + plan 3A.2 | `2414743`, `bcba19a` (directos) | 2 | `git revert <hash>` |
| **3A.2 · Elegir, lanzar y usar** (rama `3a2/elegir-lanzar-y-usar`, 23 commits) | **`5cc14a2`** | T1 `831869d` · T2 `2314937`+`1188842` · T3 `cf9ed68`+`135f400` · T4 `2702777` · T5 `d902e23` · T6 `d72d6c8` · T7 `b2256bb`…`2a71e06` · T8 `7d22b71` · T9 `d943122`+`1c4d8bb` · ola `170d8e5`,`155b432`,`fc4b1d9`,`ba21347`,`da9d17f` · cierre `24c4f92` | `git revert -m 1 5cc14a2` (tres migraciones aditivas: `character_spells`, `activity_events`, `temporary_modifier_item` — quedan en la base, inofensivas) |
| Plan 3A.3 | `90e3c0b` (directo) | 1 | `git revert 90e3c0b` |
| **3A.3 · La barra de acciones y la mesa del prototipo** (rama `3a3/la-barra-de-acciones`, 18 commits) | **`c94fb90`** | T1 `c1fbd2e` · T2 `9cabf64` · T3 `1b9d9a0` · T4 `3aa6c0d`,`9b48c5d`,`fbd60d1`,`bd9339d` · T4b `47bc296` · T5 `6cd63a1`,`cf68768` · T5b/T6 `eaf3c59`,`746e3dc`,`edc0a93`,`8b1ae58` · ola `945b8fa` · cierre `7631659` · `6ab6988` | `git revert -m 1 c94fb90` (sin migraciones) |
| Beta 0.1.0 (D-CF-160) | `d99b131` + etiqueta `v0.1.0-beta` sobre `c94fb90` | 1 | `git tag -d v0.1.0-beta && git push origin :v0.1.0-beta` |

`main` = `d99b131`. Producción = `334912b`. Qué separa una de otra: `git diff --name-only 334912b..d99b131 -- apps packages`.

## Qué NO se hizo, y por qué

- **Paso 4** (`partida.spec.ts`, suites enteras una vez, informe de totales): el autor lo paró para
  reservar cuota; queda escrito como siguiente paso con su guion.
- Tiradores redimensionables, atajos 1–5/R/Z/Espacio, «Repetir», «Deshacer», la hoja inferior de
  la barra a 390, «Lo que el motor está siguiendo», bandeja lateral propia del DM: **fichas en
  06** («Dejado por 3A.3»), como preveía el prompt.
- Marca del cazador, *Shillelagh*, *Arma elemental*, conjuros de invocar/transformar/condiciones: 3B.

## Revisiones y pruebas

- 3A.2: dos revisores Opus (API 0C/5I/13m; web+docs 0C/6I/11m) → una ola en cinco rondas (11/11
  importantes, 12 menores) → re-revisión acotada: 11/11, sin rotura nueva.
- 3A.3: un revisor Opus (1C/5I/11m; el crítico: las aptitudes de la barra morían en 404) → una ola
  (C1 + 5I + 8m) → dos rondas de e2e.
- Playwright corrido por el controlador, por fichero: `conjuros`, `lanzar` (3/3 con gzip),
  `hoja-pestanas`, `furia`, `combate`, `puerta-de-efectos`, `inventario`,
  `objeto-sin-identificar`, `tirada`, `barra-de-acciones`, `sesion`, `mesa-mide`,
  `tablero-en-la-mesa`, `mesa-prototipo`, `iniciativa-en-vivo`, `tokens-contrast`, `desbordes`,
  `efectos-de-mesa`, `condiciones-en-la-mesa`, `pnj-del-mundo-en-vivo`, `dar-a-un-pnj`,
  `teclado`, `leer-una-sesion`, `final-propuesto` — **todos en verde**; `mesa-en-estrecho` y
  `tablero-en-la-mesa` a 390 son los `test.fail` declarados (D-CF-26).
- `pnpm verify` en `main` tras cada merge: verde (shared 232 · api 2329 + 1 skip · web 1910).
- **No corrido:** la suite Playwright entera de una vez ni `pnpm --filter @dnd/api test:e2e`
  completo (son del Paso 4).

## Rulings del controlador (todas; el coste si están mal, al lado)

1. `objetivosDe` se deriva del tipo de la actividad de lanzamiento (ataque→uno, salvación/dados→varios, resto→ninguno) — coste: un conjuro de utilidad con objetivo no ofrece selector.
2. El daño directo de una actividad sobre otro va a la **bandeja del DM** (D-CF-128), no a `changeHpFromEffect` — coste: un clic más del DM por conjuro de daño.
3. Toda actividad usada escribe `ACTIVITY_USED` (D-CF-132) — coste: una línea más por uso.
4. La lista del libro va sin prosa; el texto por `GET …/spellbook/:key` — coste: una petición al abrir el detalle.
5. Umbral «una línea» de la fila de conjuro = 56 px — coste: ninguno medible.
6. Radios de espacio siempre que haya uno superior, escale o no — coste: un radio de más.
7. `RollsService.roll(tx?)`: tarjetas y ataque de conjuro dentro de la transacción de `usar` (D-CF-140) — coste: más código en la tx.
8. `spell:<key>@N` (N>0) → 400 hasta 3B (D-CF-141) — coste: 3B decide la semántica.
9. `PUT spellbook` devuelve solo la entrada (D-CF-142) — coste: refetch de la lista (ya se hacía).
10. **La API comprime > 1 KB** (D-CF-131): respuestas locales > 64 KB se cortaban en este PC (Norton sobre loopback, sospecha) — coste: una dependencia; se quita si molesta.
11. `GET actions` solo dueño o DM (403) — coste: un aliado no ve las acciones de otro (no las necesita).
12. `motivos` con `disponible: true` son avisos (NO_PREPARADO) — coste: una fila gris que se puede pulsar.
13. El jugador con tablero mantiene lateral de registro — coste: 18rem menos de marco para el jugador.
14. **Un ataque con objetivo gasta la acción** (D-CF-146); Ataque Adicional marca «de más» hasta 3B — coste: un aviso ruidoso al guerrero de nivel 5.
15. El seed demo fuerza el arranque del encuentro — coste: ninguno en producto.
16. Filtros del registro como segmento inline con explicación en `title`/`aria-describedby` (D-CF-148) — coste: menos texto visible.
17. La banda es una fila a ≥ 1024 (título truncado) — coste: título cortado en escenas largas.
18. La mesa se ve como el HTML en todo (D-CF-149, palabras del autor); el hilo en líneas compactas entró — coste: las tarjetas del hilo ya no existen en la mesa (sí en la página de lectura).
19. Beta 0.1.0 etiquetada `v0.1.0-beta` (D-CF-160, decisión del autor).

Los rulings de los implementadores (D-CF-133..139, 143..145, 147, 150..159) están en
`docs/decisiones.md` con su razón.

## Fichas abiertas (todas en `docs/06-pendientes.md`)

«Dejado por 3A.2» y «Dejado por 3A.3»: menores de las revisiones, `PATCH level` del DM no
re-siembra recursos, castigo divino sin selector de nivel en la web, preview de la bandeja
reduce solo el daño base, concentración que no borra el encantamiento, semántica de `@N`, el
corte de respuestas > 64 KB en este PC, Ataque Adicional, tarjeta del DM 148 px vs 92, PNJ del
jugador «Sin puntos de golpe», integración fina con **Just Another VTT** (tablero oficial,
D-CF-150), `mecanica` de conjuros en `GET actions` solo `{tipo}`, y lo visual que no entró.

## Cómo desplegar cuando quieras (no ejecutado)

Según `docs/03-despliegue.md` (Coolify, manual): en `coolify.supportive.pro` → aplicación
`dnd` → **Deploy** sobre `main` (`d99b131`). La API aplica sola las tres migraciones al
arrancar (`prisma migrate deploy`; aditivas). Sin variables nuevas. Comprobar después:
`ssh vps1new "docker ps --format '{{.Names}} {{.Status}}' | grep dnd"` (API y web `healthy`),
`curl -sI https://dnd.supportive.pro | head -1` (200), y en la mesa: pestaña Conjuros de un mago,
la barra de acciones, el registro lateral.

```
3A.1  [##########]  fusionada (2026-09-14)
3A.2  [##########]  fusionada 5cc14a2
3A.3  [##########]  fusionada c94fb90 · v0.1.0-beta
Paso4 [----------]  del autor (guion listo)
```
