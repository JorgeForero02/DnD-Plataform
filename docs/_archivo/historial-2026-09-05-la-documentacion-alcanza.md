# Historial — la documentación alcanza a la noche del 2026-09-05

**Entrada de `07-historial.md` movida entera el 2026-09-11**, cuarto corte de la sesión de cerrar
fichas: el fichero estaba a 997 de sus 1000 líneas con la tanda por delante y esta era la entrada
completa más antigua. No se reescribe. Su hito se queda en el 07.

---

## La documentación alcanza a la noche del 2026-09-05

**Qué se entregó.** Cuatro unidades de documentación, en cuatro commits, para que el repositorio
deje de ir por detrás de lo que esa noche decidió y desplegó:

1. **Las decisiones de la ejecución** (`7423caf`). Los bloques «Avance» de los planes 05, 07, 08,
   09, 11, 12, 13, 14 y 15 se escribieron **después** de `docs/decisiones.md`, y varios deciden
   **contra su propio plan**: la inspiración no es `Character.inspired Boolean` sino un
   `CharacterResource` con `max: 1`; `ENTITY_ATTACKED` se retira del vocabulario y **se conserva en
   el esquema** —medido: 244 reglas guardadas, ninguna lo usa, pero quitarlo del Zod haría ilegible
   una regla vieja—; el aviso del comentario pasa por `canView`; **el orden de los dos filtros de la
   búsqueda es la seguridad**; el canal en vivo manda avisos y no datos; y `aria-disabled` va en
   botones pero no en campos de formulario. Van como sección propia `E-*`, una línea cada una, más
   la marca de qué `D-OP-*` e `I*` quedaron aplicadas y con qué commit.
2. **La prosa caducada de los dos ficheros que se mandan leer primero** (`c6c0ccb`). `CLAUDE.md` y
   `docs/00-INDEX.md` afirmaban que el reseño de la mesa **no** estaba desplegado y que «local va por
   delante de `dnd.supportive.pro`». **Las dos son falsas desde el 2026-09-05.**
3. **El índice de planes, que se contradecía** (`fc16abb`): daba el 10 y el 12 por sin empezar, y su
   regla 6 seguía prohibiendo tocar `docs/06-pendientes.md` después de que el autor levantara esa
   restricción.
4. **`Mine/pendientes-maestro-2026-09-04.md` pasa a ser resumen** y apunta a `docs/`. Era la <!-- docs-lint-ignore -->
   definición de terminado del plan 10. Vive fuera del repositorio, así que no lleva commit.

**La evidencia, que es el punto de esta entrada.** El estado de producción **se midió en el
servidor**, no se recordó: `docker ps` en `vps1new` sirve hoy
`5awvsn1dnkexhcjzg7kjwom6_api:6eb259008369192543f9323ca928ed252e10ca18`, o sea la etiqueta
**`6eb2590`** — un despliegue **más** de los que contaba el informe de la noche, que se quedó en
`cc64ed7`. Y `git diff --name-only 6eb2590..HEAD` no toca `apps/` ni `packages/`: **lo único que
separa `main` de producción es documentación.**

**Por qué importa.** Es el mismo defecto de siempre, y por tercera vez en el mismo fichero: prosa de
estado escrita a mano en el documento que todo el mundo lee primero. El bloque generado por
`pnpm update:estado` no puede mentir porque lo comprueba `check:estado`; el párrafo de encima, sí.

**Cómo revertirlo.** `git revert` de los cuatro commits, en orden inverso. No tocan código: no hay
migración, ni contrato, ni pantalla. La cabecera de `pendientes-maestro-2026-09-04.md` se revierte a
mano —está fuera del repositorio— y su cuerpo no se tocó.

---
