# Avisos de terceros

## System Reference Document 5.1

This work includes material taken from the System Reference Document 5.1 ("SRD 5.1") by
Wizards of the Coast LLC, available at
https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.1 is licensed under
the Creative Commons Attribution 4.0 International License,
https://creativecommons.org/licenses/by/4.0/legalcode.

**Modificaciones:** los nombres y textos de reglas se han traducido al español y reorganizado
como datos estructurados.

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
