# Avisos de terceros

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

- `apps/api/src/rules/catalog/` — razas, clases, armaduras y la tabla de competencia. Cada
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
