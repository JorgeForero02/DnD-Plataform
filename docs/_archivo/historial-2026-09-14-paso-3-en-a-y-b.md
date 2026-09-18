# Historial — El paso 3 se parte en A (jugable) y B (completo); puerta de efectos fusionada (2026-09-14)

**Una entrada de `07-historial.md` movida entera el 2026-09-18**, al insertar la entrada de la
Task 3 de 3A.2 (`SpellbookService`): el fichero quedó en 1012 de sus 1000 líneas y esta era la
entrada completa más antigua. No se reescribe.

---

## El paso 3 se parte en A (jugable) y B (completo); puerta de efectos fusionada (2026-09-14)

Qué — `main` recibe la puerta de efectos en `7688b44` (merge `--no-ff` de `4e17a69`; `pnpm verify`
entero en verde). Y el paso 3 deja de ser un plan de 26 tareas por orden de aparición:
[Paso 3 en cinco tandas](../superpowers/plans/2026-09-14-paso-3-en-cinco-tandas.md) manda el orden
—el libro → el mago → la mesa en combate → lo temporal → deuda— y el
[plan del 8](../superpowers/plans/2026-09-08-paso-3-el-catalogo-y-los-conjuros-del-personaje.md)
conserva el contenido de cada tarea (D-CF-70). T5/T6/T9 salen por hechas. **Por la tarde, el autor
lo partió en A y B (D-CF-71)**: A = conjuros y aptitudes por el conversor con texto, usos y solo
daño/curación, elegir/lanzar/usar (espacio superior, encantar, daño extra al impactar) y la barra
de acciones — «jugable aunque sea de voz», como Foundry sin módulos; B = el resto tras jugar.
Por qué — el autor: «hay muchas cosas dispersas; lo único bien cuadrado es el catálogo». El mago
estaba en cuatro bloques y la mesa en dos, por haber crecido por acumulación.
Revertir — borrar el índice del 14, la nota de cabecera del plan del 8 y la fila D-CF-70; la fusión
se deshace con `git revert -m 1 7688b44`.
