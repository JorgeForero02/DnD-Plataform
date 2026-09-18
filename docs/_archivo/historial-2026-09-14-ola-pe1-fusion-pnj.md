# Historial — la ola de arreglos de 3A.1, PE-1 y la fusión de «PNJ del mundo y la mesa» (2026-09-14)

**Tres entradas de `07-historial.md` movidas enteras el 2026-09-18**, al insertar la entrada de la
Task 6 de 3A.2 (la pestaña «Conjuros»): el fichero quedó en 1027 de sus 1000 líneas y estas eran
las tres entradas completas más antiguas — de detalle por tarea, no hitos de fase o despliegue, así
que se archivan y no se quedan arriba. No se reescriben.

---

## 3A.1 «El libro entra» — ola de arreglos tras la revisión final (2026-09-14)

Qué — la rama `paso-3a/3a1-el-libro-entra` (319 conjuros, 234 aptitudes, 26 rasgos de raza del SRD 5.1
convertidos a `Actividad` con nombre y prosa del SRD español) pasó por una revisión Opus de la rama
entera (`.superpowers/sdd/2026-09-14-3a1-el-libro-entra/review-final.md`: 5 críticos, 13 importantes,
12 menores; muestreo 14 ok / 24 desajustes de 38, todos estructurales) y una única ola acotada (D-CF-65)
los cierra: `override: false` manda al ítem (Escudo vuelve a ser reacción; 0 actividades «instantánea +
concentración»), `classKey` en los dos contextos (un monje de nivel 5 tiene 5 ki, no 0), los `grant`
solo con recursos que la clase siembra y uno por aptitud, pie de página del PDF fuera de 115 textos y
Zona de la verdad sin el capítulo de trampas, `rechazos.md` con el motivo de todo (49 huecos de esquema
y 48 fuera de A por autor, con causa), claves de 2014, `shared`/`feat` en vez de «fighter 1», nada
recortado (topes a 8000), CD/daño/onSave que no caben rechazados enteros. Decisiones D-CF-108 a D-CF-115;
06-pendientes se copia ahora del informe. Pruebas: 58 unitarias del conversor (+11), `generado.spec.ts`
con los invariantes nuevos (por actividad, recursos de los grants, sin pie, claves 2014, LABEL_KEYS),
`resolve.spec.ts` con Ki/Acción Súbita/Tomar Aliento sembrados.
Por qué — la mitad mecánica del dorado estaba mal en el 40–75 % de las actividades y el informe callaba.
Revertir — `git revert` del commit de la ola; el catálogo generado vuelve solo con `pnpm catalogo:convertir`.

---

## PE-1 cerrada y fusionada (2026-09-14, noche) — desplegada esa misma noche

Qué — `pe-1/cierre` → `main` en `baea692`: los seis menores de código de «puerta de efectos» (a ciegas
el veredicto no viaja, D-CF-88; el daño solo cobra la tirada de SU ataque, por `GameEvent.attackRef`;
`XpService` bloquea por `id`; `GrupoDeRadios` una sola vez en `ui/`; `DarXp` con `key` por propuesta;
el bucle «hasta impactar» del e2e lee `data-veredicto`), y las cuatro de producto decididas por el
autor sin código (D-CF-89..91). Rigor bajo a propósito: un brief, un implementador, pruebas solo donde
cambió comportamiento; e2e de API 33/33 en los tres ficheros tocados, Playwright 7/7 en tres spec.
Por qué — el autor: «es pequeño, debería salir rápido» — y salió en 2 h.
Revertir — `git revert -m 1 baea692`.

---

## Fusión a `main` de «PNJ del mundo y la mesa» + su cierre (2026-09-14, tarde) — sin desplegar

Qué — `main` recibe las dos ramas apiladas en `07c9a9d` (merge `--no-ff`; `pnpm verify` entero en
verde sobre `main`: 219 + 2102 + 1715 unitarias). La segunda, `pnj-del-mundo/cierre` (`94a4755`),
cerró en una sola pasada de rigor bajo —decisión del autor: «pruebas no tan rigurosas si es solo mover
cosas de lugar»— los pendientes que dejó la primera: PM-1 (`entityId` no viaja en respuestas de
mutación), T3 (la tira revela el grupo entero, `POST …/characters/reveal-many`, D-CF-87), PE-2 (e2e
de concurrencia de `apply-damage` y `POST /xp`), el caso de la tarea 11 (origen oculto → 404) y la
cabecera huérfana del 13-09 en 06. e2e de API 32/32 en los tres ficheros; Playwright
`pnj-del-mundo-en-vivo` + `combate` 2/2.
Por qué — el autor dio permiso de fusionar al cerrar; el despliegue sigue siendo suyo.
Revertir — `git revert -m 1 07c9a9d`. **Producción sigue en `4830b8a`.**
