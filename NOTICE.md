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

**Modificaciones:** el material se ha **reorganizado como datos estructurados** y se ha
seleccionado un subconjunto.

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
  (`catalog.spec.ts`) que **falla si alguna la pierde**.

### Dónde se ve en la aplicación

CC BY 4.0 exige la atribución **en la obra distribuida**, no solo en el repositorio. La
pantalla que la cumple es la de «Acerca de» / el pie de la aplicación web, y **todavía no
existe**: entra con la pantalla de la hoja (tarea 2A.10) y está anotada como deuda en
[`docs/06-pendientes.md`](./docs/06-pendientes.md). Hasta entonces el catálogo no se ha
publicado en ninguna pantalla, así que no hay obra distribuida que lo contenga.
