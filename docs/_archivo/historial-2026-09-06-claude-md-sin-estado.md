# Historial — `CLAUDE.md` deja de narrar el estado (2026-09-06)

**Una entrada de `07-historial.md` movida entera el 2026-09-12**, al escribir la línea de la ronda de
documentación de cierre de la hoja a página completa: el fichero iba a pasar de sus 1000 líneas y esta
era la entrada completa más antigua. No se reescribe.

---

## `CLAUDE.md` deja de narrar el estado (2026-09-06)

**Qué:** el fichero que se manda leer primero pierde sus ~40 líneas de prosa de estado —qué trae
cada fase, qué imagen sirve producción, qué separa `main` del despliegue— y las sustituye por una
tabla que dice **dónde vive cada dato de verdad**: el bloque generado de
[00-INDEX.md](./00-INDEX.md) para estado y conteos, este fichero para lo entregado,
[06-pendientes.md](./06-pendientes.md) para lo abierto, y **una medición** —`git diff` contra la
imagen desplegada— para saber qué falta por desplegar. Se queda lo que sigue siendo cierto
mañana: qué es el producto, qué no es, y las reglas.

**Por qué:** ese fichero **caducó tres veces en cinco días**, y las tres se anotaron dentro de él.
Una de ellas lo dice con todas las letras: *«es el mismo fallo de siempre: prosa de estado escrita
a mano en el fichero que se manda leer primero»*. El repositorio ya tenía la solución a medias
—`update-estado.mjs` genera el bloque de `00-INDEX` y `check:estado` falla si alguien lo edita—
pero `CLAUDE.md` estaba fuera de su alcance, así que ahí el estado se seguía tecleando.

**Los tres avisos no se borran.** Se mueven **enteros y sin reescribir** a una sección al final,
como justificación de la regla: un registro fechado no se resume. Y `D-OP-3` —la partida de
prueba que cierra la fase 2— no se pierde: vive en [00-INDEX.md](./00-INDEX.md) y en
[decisiones.md](./decisiones.md), que son sus sitios.

**Cómo revertir:** `git show` del commit anterior a este sobre `CLAUDE.md`. No toca código.
