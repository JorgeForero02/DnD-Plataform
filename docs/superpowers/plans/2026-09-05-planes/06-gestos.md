# Plan 06 · Un gesto, un dueño (I17 · D-OP-8)

**Objetivo en una frase:** que **archivar** exista en la web, con el gesto fácil del lado correcto.

**Tamaño:** un commit. **Dependencias:** ninguna. **Solo `apps/web/src`.**

---

## Antes de empezar: la mitad ya está hecha

**Los tres sitios que revelan YA están consolidados**, y hay que decirlo antes de que alguien
duplique trabajo. Medido el 2026-09-05:

```
features/entities/BotonRevelar.tsx:54   export function sePuedeRevelar(...)   ← el dueño
features/sessions/dm/RevelarAlgo.tsx:4        import { BotonRevelar, sePuedeRevelar }
features/sessions/taller/PrepararSesion.tsx:8 import { BotonRevelar, sePuedeRevelar }
```

Un dueño, dos consumidores, **cero copias del predicado**. La Ola 2 lo cerró. **No lo toques**, y
corrige el maestro si aún lo da por abierto.

## Lo que sí falta: archivar (M9)

**El servidor lo sabe hacer desde 2.5.8** — `characters.controller.ts:66` `POST :characterId/archive`,
`:75` `unarchive`, y `GET archived` para el listado. **La web no lo dispara desde ningún sitio**: el
único `archiv` que aparece en `apps/web/src` es la traducción de la línea del registro.

Es literalmente el patrón que este proyecto ya ha cerrado en falso cuatro veces: **servidor hecho,
nadie que lo use = la ficha sigue abierta**.

## Pasos

1. **El gesto vive en la ficha del personaje, junto a borrar.** No en la mesa: archivar es una
   decisión sobre el personaje, no sobre la sesión.
2. **Archivar es el gesto fácil; borrar es el caro.** Archivar se pulsa y se confirma con una frase
   corta que dice **que se puede recuperar**. Borrar mantiene la fricción que ya tiene. Si los dos
   cuestan lo mismo, la gente borra.
3. **La confirmación dice la consecuencia, no el riesgo**: dónde deja de aparecer el personaje, que
   **no se pierde nada**, y cómo vuelve.
4. **El archivo tiene que verse.** `GET archived` existe: hace falta un sitio donde mirar lo
   archivado y **devolverlo** (`unarchive`). Un archivo sin puerta de salida es un borrado lento.
5. **La lista normal no los enseña** — ya los excluye desde 2D.6 — y el vacío lo dice: si hay
   archivados, el estado vacío debe mencionarlos, o parecerá que se perdieron.

## Pruebas

**RTL:** el botón aparece para quien puede (dueño o DM) y no para el resto · confirmar llama a la
mutación · **el listado de archivados pinta lo que devuelve `archived` y ofrece devolverlo**.

**Navegador (`apps/web/e2e/`):** archivar un personaje → **desaparece de la lista** → aparece en el
archivo → se devuelve → **vuelve a la lista**. El camino entero, que es lo único que demuestra que la
ficha está cerrada de verdad.

**Y el registro:** la línea del suceso ya está traducida (`linea-de-log.ts:221`, «Se archiva a X»).
Comprueba que **aparece**, porque ese suceso es el que P3 arregla en el plan 03.

**Mutación:** quita la exclusión de archivados del listado normal y comprueba que la prueba del
camino se pone roja.

## Guía de revisión

- [ ] **No se tocó nada de «Revelar»**: ya estaba consolidado.
- [ ] Archivar cuesta **menos** que borrar, y se ve que cuesta menos.
- [ ] La confirmación dice **que se recupera**, no «¿estás seguro?».
- [ ] Hay **puerta de salida**: se puede ver el archivo y devolver.
- [ ] La autorización la impone el servidor; esconder el botón no es control de acceso.
- [ ] El suceso sale en el registro con su frase en español.
- [ ] Playwright corrido, una sola tanda.

## Trampas

- **Un archivo sin listado es un borrado con otro nombre.** Si no da tiempo a las dos mitades, hazlas
  igualmente: media función aquí es peor que ninguna, porque parece que perdiste el personaje.
- **`GET archived` es una ruta aparte**: no filtres en el cliente la lista normal.
- El personaje archivado **puede seguir en un encuentro pasado**. No rompas esas vistas: archivar no
  es borrar y el histórico tiene que seguir leyéndose.

## Commit

```
feat(web): a character can be archived, and come back

The server has known how to archive since 2.5.8 — POST /archive, /unarchive and
GET /archived — and nothing in the web ever called any of them. That is the
pattern this project has closed falsely four times: server done, nobody to fire
it, ficha still open.

Archiving is the cheap gesture and deleting stays the expensive one, on purpose:
when both cost the same, people delete. The confirmation says what happens and
that it can be undone, rather than asking whether you are sure.

And the archive has a way out. A shelf you cannot take things off is a slow
delete.
```

## Definición de terminado

`pnpm verify` verde, Playwright corrido, la mutación probada, **M9 anotada como cerrada** en el
maestro — y con ella **el último de los tres gestos de D-OP-8**.
