# Avisos de terceros

## El catálogo generado (3A.1, 2026-09-14): dos licencias sobre los mismos ficheros

`apps/api/src/rules/catalog/generado/*.json` (`spells-srd.json`, `class-features-srd.json`,
`race-features-srd.json`, `class-scales-srd.json`) los produce
`scripts/convertir-catalogo.mjs` cruzando **dos fuentes**, cada una con su licencia, y las dos
se citan porque **el mismo fichero generado lleva contenido de las dos a la vez**: la
*estructura* (qué campos tiene un conjuro, cómo se listan las aptitudes por clase y nivel) viene
de Foundry; el *nombre y la prosa* —en inglés y en español— vienen del SRD 5.1.

### Estructura: el sistema `dnd5e` de Foundry Virtual Tabletop (MIT)

El conversor lee **solo como referencia de solo lectura, fuera de este repositorio**
(`C:\Users\gogam\Desktop\Trabajo\Mine\referencia-foundry-dnd5e\packs\_source`, **su código nunca
se ejecuta** — ver `constraints.md` de esta tarea) los ficheros YAML de `classes/`,
`classfeatures/`, `subclasses/`, `races/` y `spells/` del sistema `dnd5e`, para saber cómo se
organiza un conjuro o una aptitud (los campos que Foundry declara, el `advancement` de las
tablas de escala) — nunca su código JavaScript. Licencia MIT:

> Copyright 2021 Andrew Clayton
>
> Permission is hereby granted, free of charge, to any person obtaining a copy of this software
> and associated documentation files (the "Software"), to deal in the Software without
> restriction, including without limitation the rights to use, copy, modify, merge, publish,
> distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the
> Software is furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in all copies or
> substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING
> BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
> NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
> DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
> OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

### Contenido: el SRD 5.1, en inglés Y en español (CC-BY 4.0)

El nombre y el texto de cada conjuro y aptitud —`nameEn`/`textEn` **y** `nameEs`/`textEs`— salen
del propio System Reference Document 5.1 en sus dos ediciones: la inglesa (el mismo YAML de
Foundry cita su prosa oficial) y la española, extraída con `pymupdf` del PDF que publica Wizards
(`SRD_CC_v5.1_ES.pdf`, descargado el 2026-09-14 de
<https://media.wizards.com/2023/downloads/dnd/SRD_CC_v5.1_ES.pdf>, en
`C:\Users\gogam\Desktop\Trabajo\Mine\referencia-srd-es\`, fuera de este repositorio). Las dos
ediciones llevan la misma licencia, y por eso las dos frases de atribución que exige Wizards
—la inglesa y la española— van aquí completas, sin traducir la una a la otra:

> This work includes material taken from the System Reference Document 5.1 ("SRD 5.1") by
> Wizards of the Coast LLC and available at
> <https://dnd.wizards.com/resources/systems-reference-document>. The SRD 5.1 is licensed under
> the Creative Commons Attribution 4.0 International License available at
> <https://creativecommons.org/licenses/by/4.0/legalcode>.

> Esta obra incluye materiales extraídos del Documento de referencia del sistema 5.1 ("SRD 5.1")
> de Wizards of the Coast LLC, que está disponible en
> <https://dnd.wizards.com/es/resources/systems-reference-document>. El SRD 5.1 tiene la
> licencia Creative Commons Atribución/Reconocimiento 4.0 Licencia Pública Internacional, que
> está disponible en <https://creativecommons.org/licenses/by/4.0/legalcode.es>.

**Modificaciones (CC-BY 4.0 exige decir qué se cambió):** el conversor recorta cada conjuro y
cada aptitud de su bloque de página en el texto extraído, limpia el HTML de Foundry a texto
plano y separa «A niveles superiores» en su propio campo. **Lo que NO se hace nunca**: inventar
un nombre o una prosa que el SRD (inglés o español) no trae. Cuando el SRD español no nombra un
ítem, el catálogo lo marca `sinTraduccion: true` (queda en inglés) o, por decisión del autor
(2026-09-14, ver [decisiones.md](./docs/decisiones.md)), con una **traducción propia marcada**
(`traduccionPropia: true`) — nunca sin marca, y nunca haciéndola pasar por la del SRD.

**Dónde vive en el repositorio:** `apps/api/src/rules/catalog/generado/` (los cuatro JSON de
datos —sin cabecera: un JSON no admite comentarios—, `spells-srd.meta.json` con la marca
«GENERADO… no editar» y `rechazos.md` con esa misma cabecera y el motivo de todo lo que no
entró), leídos por
`apps/api/src/rules/catalog/generado/index.ts`; y el conversor mismo,
`scripts/convertir-catalogo.mjs` + `scripts/convertir-catalogo/`. Se suma a la lista de
`catalog.spec.ts` de la sección de abajo — el catálogo generado **es distinto** de los ficheros a
mano que esa prueba recorre (no lleva su misma cabecera de una línea, sino el bloque de arriba;
`rechazos.md` documenta qué se quedó fuera).

## System Reference Document 5.1

Esta obra incluye materiales extraídos del Documento de referencia del sistema 5.1 ("SRD 5.1")
de Wizards of the Coast LLC, que está disponible en
https://dnd.wizards.com/es/resources/systems-reference-document. El SRD 5.1 tiene la licencia
Creative Commons Atribución/Reconocimiento 4.0 Licencia Pública Internacional, que está
disponible en https://creativecommons.org/licenses/by/4.0/legalcode.es.

> Esta es la línea de atribución **tal y como la da Wizards en la edición española del SRD**, y
> se usa esa porque **es la edición española la que estamos usando**. El propio documento añade:
> «No incluyas ningún otro reconocimiento en relación con Wizards, excepto el facilitado
> anteriormente».

**Modificaciones:** el material se ha **reorganizado como datos estructurados**, se ha
seleccionado un subconjunto y, en el caso de las **condiciones**, se ha **resumido su efecto en
una línea funcional propia** — un resumen nuestro, no el texto del SRD ni la traducción oficial
de Wizards.

> **Aquí decía que los nombres «se han traducido al español», y desde el 2026-09-02 ya no es
> cierto.** Los nombres son los de la **traducción oficial al español que publica Wizards**,
> distribuida bajo la misma CC BY 4.0 — no una traducción nuestra. Reclamarla como modificación
> propia era lo peor de los dos mundos: sobreatribuía nuestro trabajo y subatribuía el suyo. Lo
> que sigue siendo modificación nuestra es reorganizar y seleccionar, y eso es lo que se declara.

### Qué entra y qué no

**Solo entra contenido del SRD 5.1.** Reglas y fórmulas no son de nadie; el texto, los nombres
de subclases que no están en el SRD, las dotes y los conjuros del manual **no se copian ni se
distribuyen**. Lo que un director de juego teclee en su mesa como contenido propio es uso
privado suyo; lo que **este producto trae de serie** es solo SRD.

### Dónde está ese material en el repositorio

- `apps/api/src/rules/catalog/` — razas, clases, armaduras, la tabla de competencia, los
  espacios de conjuro y, desde la fase 2B, **las armas (`weapons.ts`), el equipo de aventura
  (`gear.ts`) y la puerta que los une (`items-srd.ts`)**. Los nombres de todo ello son los de la
  **traducción oficial al español que publica Wizards**, no una traducción nuestra, y los pinta
  la aplicación: el catálogo de objetos y el selector del inventario los enseñan por su nombre.
  Cada
  fichero de datos lleva su cabecera de atribución apuntando aquí, y hay una prueba
  (`catalog.spec.ts`) que **falla si alguna la pierde**. La lista de ficheros que recorre esa
  prueba **se mantiene a mano**, y por eso hay que ampliarla al añadir datos nuevos: hasta el
  2026-09-02 cubría cinco y `spell-slots.ts` se había quedado fuera —llevaba su cabecera, pero
  perderla no ponía nada rojo—, o sea que esta frase prometía una garantía mecánica que cubría
  menos de lo que decía. Lo encontró una auditoría, no la prueba.
- `apps/web/src/features/character-sheet/Condiciones.tsx` — el **efecto de cada condición en una
  línea** (tarea F4). Son resúmenes propios derivados de las entradas de condiciones del SRD 5.1,
  y por eso siguen bajo CC BY: llevan la misma cabecera de atribución y **la misma clase de
  prueba mecánica** que la protege (`apps/web/src/features/character-sheet/__tests__/Condiciones.test.tsx`). Viven en la web y no en el
  catálogo de la API porque hoy **nada los transportaría**: `GET /catalog` no los devuelve, y
  llevarlos allí exige tocar el controlador y declarar la forma de la respuesta en
  `packages/shared`. Esa mudanza está **propuesta, no hecha**, y hasta que se haga el texto vive
  en un solo sitio en vez de en dos.

### Dónde se ve en la aplicación

CC BY 4.0 exige la atribución **en la obra distribuida**, no solo en el repositorio. La
pantalla que la cumple es la de «Acerca de» (`pages/AcercaDePage.tsx`) y el **pie de toda
pantalla con sesión** (`ui/LegalNotice.tsx`, montado por `ui/AppShell.tsx`). **Ya existen**, y
por eso este párrafo cambió el 2026-09-02: decía que no, y desde la tarea F4 la aplicación
publica en pantalla no solo nombres del catálogo sino también el efecto resumido de cada
condición, así que afirmar que no hay obra distribuida sería falso.
