# Historial archivado — Tarea 3 del pulido: Ajustes del personaje en una tarjeta con pie, y Dados en rejilla (2026-09-12)

**Movida entera** el 2026-09-13, al escribir la ronda de arreglo 2 de la Task 10 del pulido
(anexo #8, el radio de ventaja): el fichero seguía por encima de 1000 y era la entrada completa
más antigua. Su hito se queda en `07-historial.md`.

---

## Tarea 3 del pulido: Ajustes del personaje en una tarjeta con pie, y Dados en rejilla (2026-09-12)

Qué — anexo #9: `AjustesDePersonaje.tsx` pasa de una pila de `div` a una `TarjetaDeHoja` (Task 1)
con `etiqueta="ajustes del personaje"`; color y visibilidad se quedan en el cuerpo, y archivar +
borrar (con sus errores en línea) se mueven al `pie`, separados por su propio filete. Anexo #16:
`PanelDeDados.tsx` mete el reloj en la misma rejilla que pedir una tirada y tirar
(`grid items-stretch gap-s5 xl:grid-cols-2`, reloj con `xl:col-span-2`) en vez de apilarlo aparte
en `mb-s5`; `RelojDeCampana` gana `className?` que **sustituye** su `max-w-[40rem]` por defecto
(no lo añade), y sus dos bloques «Pasa el tiempo» / «O viajáis» pasan de apilados a
`md:grid md:grid-cols-2 md:gap-s4`, con el «Qué pasa (opcional)» debajo a todo lo ancho. **La
bandeja compacta de #16 no está aquí** — sigue en el formulario largo de siempre; llega en la
Task 10 (nota en `docs/06-pendientes.md`). Unitarias: una de orden en `archivar.test.tsx`
(`compareDocumentPosition` entre color, visibilidad y archivar, y `archivar.closest("footer")`
no nulo) y una en `PanelDeDados.test.tsx` («con rol DM, el reloj, pedir y tirar están los tres»).
Verificado por mutación: `cp AjustesDePersonaje.tsx …bak`, se sacó `BotonArchivar` del `pie` al
cuerpo → la unitaria de orden FAIL (el botón deja de estar bajo un `footer`), restaurado con
`cp`. (Sacar solo `DeleteButton`, como decía el brief al pie de la letra, no rompe esa unitaria
— la aserción mira `archivar`, no `borrar` — así que la mutación real se hizo sobre
`BotonArchivar`, que sí prueba el pie.) Por qué — Tarea 3 del
[plan de pulido](../superpowers/specs/2026-09-12-pulido-antes-del-paso-3-design.md), anexos #9 y
#16 de la lista del autor; revertir — `git revert` del commit de esta tarea. **Corrección (Tarea
15, 2026-09-13): esta línea no decía que `git revert` no deshace por sí solo el bloque de estado
de `docs/00-INDEX.md`** (se regenera aparte con `pnpm update:estado` en el siguiente commit) **ni
que, si algún punto del anexo que esta tarea cerraba ya se había archivado como cerrado en
`docs/_archivo/`, revertir el código no restaura esa nota**: haría falta deshacer también la
entrada de archivo a mano.
