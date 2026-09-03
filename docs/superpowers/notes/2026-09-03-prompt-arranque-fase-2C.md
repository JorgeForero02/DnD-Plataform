# Prompt de arranque de la fase 2C

> Se copia y se pega tal cual al abrir la sesión. Mismo formato que el de 2B
> (`2026-09-03-prompt-arranque-fase-2B.md`), corregido con lo que esa jornada enseñó.

---

Vas a construir la fase 2C de esta plataforma de D&D, y si sale limpia, cerrar la fase 2 entera.
Trabaja de forma autónoma: **no me esperes**. Estoy en clase y llegaré tarde; te daré órdenes
remotas cortas, y entre una y otra decides tú.

## Antes de tocar nada

Lee, por este orden:

1. `CLAUDE.md` de la raíz — las reglas que no se negocian.
2. `docs/00-INDEX.md` — el mapa, con el bloque de estado generado.
3. `docs/06-pendientes.md` — la deuda y las decisiones; **empieza por las dos primeras secciones**,
   que son las de ayer.
4. `docs/04-convenciones.md` entera. Especialmente «Reglas de interfaz … vinculantes», la trampa de
   Tailwind, y **«Una duda de reglas se resuelve con la fuente»**.
5. `docs/08-pruebas.md` — qué prueba cada capa y qué no cubre.
6. `docs/superpowers/specs/2026-09-03-fase-2C-alcance-design.md` — el alcance, con mis decisiones
   ya contestadas y las fuentes de cada una.
7. `docs/superpowers/plans/2026-09-03-fase-2C-plan.md` — **el orden de los seis bloques y qué
   cierra cada uno.** Es tu guion.

## La regla que quiero que apliques sin que te la recuerde

**Cuando dudes de una regla, de cómo funciona algo, o veas un hueco: investiga.** No lo resuelvas
con criterio. Busca **cómo lo hace la comunidad** y **qué dicen las reglas** —el SRD 5.1 primero, y
después cómo lo resuelven las mesas virtuales conocidas (Foundry, Roll20, Fantasy Grounds)— y
**pega la cita en el mismo commit**. Si la fuente contradice lo que hay escrito, manda la fuente y
lo escrito se corrige.

Esto no es un consejo. En 2B interpreté once decisiones y las comprobé después: ninguna estaba mal,
pero la comprobación encontró tres cosas que no sabíamos y **una era un defecto ya visible en
pantalla**. Y el contraste siguiente **cambió cuatro decisiones** que iban a salir peor a ojo (el
reloj pasó de minutos a segundos, la caducidad a automática, la tabla de dificultades resultó estar
en el SRD, y los statblocks dejaron de ser «transcribir 334 criaturas» porque el SRD ya existe en
JSON con la misma licencia).

**Lo mismo vale para los huecos**: si al construir un bloque ves que una mesa real necesita algo
que no está modelado, investígalo y **resuélvelo o anótalo con su ficha**; no lo dejes pasar en
silencio.

## El encargo

**2C, bloque a bloque, en el orden del plan.** Antes del bloque del reloj, arregla **M2B-3** —el
motor de reglas se dispara dentro de la transacción de quien lo llama y escribe fuera de ella—,
porque 2C mete más sucesos por ese mismo camino.

Los seis bloques, con lo que cierra cada uno, están en el plan. Resumen: registro de tiradas con
los cuatro modos (y el agujero de la tirada ciega, que hoy existe) · pantalla de dados ·
reloj de campaña en segundos, con ritmo de viaje y el descanso de una vez cada 24 horas ·
condiciones con duración que caducan solas sin borrarse, y el agotamiento llegando al motor ·
la tabla de CD del SRD y la petición de tirada · y las tablas del DM, opcionales y apagadas por
defecto.

**Ya está decidido** —no lo vuelvas a preguntar—: segundos, caduca sola sin borrarse, CD del SRD,
la petición de tirada entra, los cuatro modos, y las tablas de críticos como regla de la casa
apagada por defecto.

## Cómo trabajar

- **Un commit por tarea**, mensaje en inglés (Conventional Commits), con el porqué y cómo revertir.
  Documentación en el mismo commit.
- **Varios agentes en paralelo, techo de cinco.** A cada uno se le escribe su frontera de ficheros.
  **Playwright y los e2e de API los corre el orquestador, nunca los agentes.** Las migraciones, los
  contratos de `packages/shared`, el cableado y la documentación, también el orquestador.
- **Prueba de mutación obligatoria por comportamiento nuevo.** Rompe el código a propósito y
  comprueba que la prueba se pone roja. **Restaura copiando el fichero**, nunca con `git checkout`.
- **Ninguna tarea se da por hecha sin salida en verde mirada**: `pnpm verify`, e2e de API y
  Playwright.
- **Si tocas una pantalla, abres el navegador.** Y si la pantalla es nueva, **mírala antes contra el
  prototipo** (`https://sunny-glaze-58905833.figma.site/`, regla vinculante); hay guion de capturas
  en `apps/web/e2e/capturas-comparacion.spec.ts`.
- **Al integrar carriles paralelos, la integración es donde salen los fallos.** Ayer los tres
  defectos reales aparecieron al juntar cosas que estaban verdes por separado: busca claves
  compartidas, unidades, claves de caché, y **mira una captura de la pantalla montada**.

## Trampas que ya costaron horas — no las repitas

- **Tope global de 100 peticiones por IP y minuto.** La suite de navegador lo desborda sin margen
  (`RATE_LIMIT` en `apps/web/playwright.config.ts`). Si ves fallos que **cambian de sitio** en cada
  vuelta, sospecha del limitador antes que del código.
- **`reuseExistingServer`**: si tocas una variable del servidor de pruebas, mata el proceso viejo o
  la medición miente.
- **Ninguna clase de opacidad de Tailwind compila** sobre los tokens (`bg-accent/10`): se descarta
  la utilidad entera sin avisar. Clases enteras o tokens de tinte.
- **`jsdom` no maqueta**: posición, tamaño, contraste, desbordamiento y arrastre van a
  `apps/web/e2e`.
- **Dos escrituras que toman sus candados en orden inverso dan un abrazo mortal de Postgres
  (40P01)**, y sale como 500. Un intermitente en este proyecto ha sido **dos veces** una causa real
  y ninguna una prueba mala: mide antes de llamarlo *flaky*.
- **La suite de navegador reescribe nueve capturas** y nunca deja el árbol limpio (ficha M2B-13).

## Lo que NO tienes que hacer

- **Nada de despliegue todavía.** Se despliega **al cerrar la fase 2 entera**, y entonces sí, con
  la prueba de campo que ya está acordada: dos cuentas de jugador —dos, no más—, mi cuenta como DM,
  una campaña y jugarla con agentes. Tienes permiso para ese despliegue y esas pruebas.
- **No cuides los datos.** Es un despliegue de desarrollo, el único usuario soy yo, y lo que hay que
  conservar está en GitHub. Si hay que borrar la base y repetir, se borra.
- **No abras las decisiones D1–D4** (contenido fuera del SRD, editor de documentos, alcance de la
  línea de tiempo, la mesa de juego con mapa): son mías y siguen sin respuesta.
- **No retoques el acabado visual de las pantallas que ya existen.** Es una ronda propia, anotada
  como P1 en `docs/06-pendientes.md`, y empieza por un inventario de diferencias.
- **2D solo si sobra el día**, y con lo que ya está decidido: importar el JSON del SRD y publicar el
  subconjunto revisado. Prefiero que no la empieces a que la dejes a medias.

## Al terminar

Documentación al día siguiendo `~/.claude/docs-protocol.md`: estado en 01–05, una entrada en 07 con
qué, por qué y cómo revertir, y la deuda nueva en 06 con prioridad y evidencia. Y un resumen corto
de **qué quedó hecho, qué no, y qué decisión necesitas de mí**.
