# Prompt de arranque — fase 2B (y cierre de 2C)

> Copia y pega **todo lo que hay bajo la línea** en una sesión nueva. Está escrito para que
> Claude arranque sin preguntarte nada y trabaje solo toda la noche.

---

Vas a construir la **fase 2B** de esta plataforma de D&D, y si sale limpia, cerrar lo que falta
de **2C**. Trabaja de forma autónoma: no me esperes.

## Antes de tocar nada

Lee, por este orden:

1. `CLAUDE.md` de la raíz — las reglas que no se negocian.
2. `docs/00-INDEX.md` — el mapa, con el bloque de estado generado.
3. `docs/06-pendientes.md` — la deuda conocida y las decisiones abiertas.
4. `docs/04-convenciones.md` — **entera**, sobre todo «Reglas de interfaz … vinculantes» y la
   trampa de Tailwind.
5. `docs/08-pruebas.md` — qué prueba cada capa y qué no cubre.
6. `docs/superpowers/specs/2026-09-01-fase-2-alcance-design.md` — **el alcance de 2B y 2C, que
   manda sobre el plan maestro**.

## El encargo

**2B — objetos, inventario y equipar.** Un objeto que solo es texto no puede alimentar el motor
ni tirar dados, así que hacen falta datos estructurados: tipo (arma / armadura / escudo /
consumible / otro), sus efectos, y para las armas el dado de daño, el tipo y la característica
de ataque. Dos orígenes: **catálogo SRD 5.1 sembrado** y **objetos propios del DM por campaña**.

**La regla dura de 2B: la lista de efectos es cerrada.** Se automatiza lo que es un número
—bono a la CA, puntuación de característica, bono a salvaciones, PG máximos, velocidad,
competencia— y **todo lo demás se queda como texto** que lee la persona. Con eso quedan
cubiertos armadura, escudo, capa de protección, cinturón de fuerza y anillos de bonos, que es la
inmensa mayoría de lo que una mesa toca. Nada de interpretar dotes ni conjuros.

**Legal:** armaduras, escudos y armas del SRD 5.1 son OGL y se pueden sembrar. Los objetos
mágicos llamativos **no están en el SRD y no se copian**. `NOTICE.md` tiene una prueba que
protege la atribución de cada fichero de datos; **si añades uno, entra en esa lista**.

**Lo que ya existe y hay que enchufar, no rehacer:**

- La columna `equippedSlots Json?` del modelo `Character` **existe y está vacía a propósito**
  desde 2A, con un comentario que lo explica.
- La hoja tiene un **hueco de inventario rotulado** esperando (`HojaCalculada.tsx`), que dice que
  llega en 2B y que hasta entonces la CA se calcula sin equipo.
- El motor de derivación (`apps/api/src/rules/`) ya suma pasos con traza. Un objeto equipado
  tiene que **aparecer como un paso más de la traza** («+1 anillo de protección»), no como un
  número que sale de la nada.
- La tirada ya existe entera: evaluador de expresiones, ventaja y desventaja, el dado descartado
  a la vista y el desglose. **De 2C queda sobre todo lo que depende de 2B**: que «atacar con esta
  arma» produzca su `1d20 + bonificador` y su daño.

**2D (statblocks de PNJ) es opcional** y solo si 2B y 2C salen limpias y sobra noche. Prefiero
que no la empieces a que la dejes a medias.

## Cómo trabajar

- **Un commit por tarea**, mensaje en inglés (Conventional Commits), con el porqué y cómo
  revertir. Documentación en el mismo commit.
- **Varios agentes en paralelo, techo de cinco.** A cada uno se le escribe su **frontera de
  ficheros** en el encargo. **Playwright va serializado: lo corre el orquestador**, nunca los
  agentes. Las migraciones, los contratos de `packages/shared`, el cableado y la documentación
  los escribe el orquestador.
- **Prueba de mutación obligatoria** por comportamiento nuevo: rompe el código a propósito y
  comprueba que la prueba **se pone roja**. Si sigue verde, la prueba no vale. Esto ha cazado
  fallos reales cada vez que se ha hecho, incluidas pruebas que pasaban por el motivo equivocado.
- **Ninguna tarea se da por hecha sin salida en verde mirada**: `pnpm verify`, e2e de API y
  Playwright.
- **Nunca** desactives una prueba, bajes un umbral, silencies una regla ni uses `--no-verify`.
- **NUNCA `git checkout` sobre un fichero con cambios sin commitear** para deshacer una mutación:
  no revierte la mutación, revierte al último commit. Copia el fichero antes y restaura la copia.
- **Evidencia antes que afirmación.** Si algo falla, se dice que falla y se pega la salida.

## Trampas que ya nos costaron horas — no las repitas

- **Hay un tope global de 100 peticiones por IP y minuto.** La suite de navegador dispara
  cientos desde `127.0.0.1`, así que sin margen la API devuelve **429** y los recorridos fallan
  **en un sitio distinto cada vuelta**. Ya está resuelto (`RATE_LIMIT` en
  `apps/web/playwright.config.ts`), pero si vuelves a ver fallos que cambian de sitio, **sospecha
  del limitador antes que del código**.
- **`reuseExistingServer` reutiliza el servidor ya levantado.** Si tocas una variable de entorno
  del servidor de pruebas, **mata el proceso viejo** o tu cambio no llega y la medición miente.
  Casi nos hace descartar la hipótesis correcta.
- **Ninguna clase de opacidad de Tailwind compila** sobre los tokens del proyecto
  (`bg-accent/10`, `border-muted/60`…): se descarta la utilidad entera sin avisar. Clases enteras
  o tokens de tinte. Hay dos pruebas que lo vigilan.
- **`jsdom` no maqueta.** Todo lo que sea posición, tamaño, contraste, `sticky` o arrastre va a
  `apps/web/e2e`. Y **`sticky` se pega dentro de su padre**: envolver algo en un contenedor nuevo
  lo suelta sin que ninguna unitaria se entere.
- **Una prueba de contraste puede pasar midiendo un fondo que no existe.** Si una razón sale
  sospechosamente alta, comprueba **qué** estás midiendo.

## Reglas de dominio que no se re-litigan

- **`canView` es el dueño único de quién ve qué.** Una regla **escribe un dato, nunca decide
  permisos**. Lo que alguien no debe saber **no se le envía**, no se le esconde en el cliente.
- **Una regla fija su objetivo al armarse, nunca al dispararse.**
- **Se guarda lo decidido, se calcula lo derivado.** La CA y los PG máximos no son columnas.
- **La recuperación de contraseña sigue bloqueada**: no hay servicio de correo, y no se ofrece un
  enlace que no lleva a ninguna parte.
- **La máquina ejecuta, el DM arbitra.** Y **el azar vive fuera del motor**: el motor es puro y
  determinista.

## Estado al empezar

- `main` está limpio y por delante de producción a propósito. **Producción es `946e427`**; no
  despliegues salvo que te lo pida.
- **Todo en verde al cerrar**: unitarias, e2e de API contra Postgres real y la suite de
  navegador entera. **Las cifras no se copian aquí**: los recorridos de e2e viven **solo** en
  `docs/08-pruebas.md` y las unitarias las genera `scripts/update-estado.mjs` en el bloque de
  `docs/00-INDEX.md`. Si necesitas el número, míralo ahí — repetirlo en un tercer sitio es cómo
  empiezan a discrepar, y hay un control que lo impide.

## Lo que NO tienes que hacer

- **Nada de despliegue** salvo petición explícita.
- **No retoques el acabado visual de las pantallas que ya existen.** Que se parezcan más al
  prototipo es una ronda propia, anotada como P1 en `docs/06-pendientes.md`, y su primer paso es
  un inventario de diferencias, no arreglos a ojo.

  **Ojo, que no es lo mismo:** el prototipo **sí es revisión obligatoria de toda pantalla nueva y
  de la navegación** —`https://sunny-glaze-58905833.figma.site/`, regla vinculante en
  `docs/04-convenciones.md`—, y 2B trae pantallas nuevas: el inventario, la ficha de un objeto,
  el catálogo. **Míralo antes de dibujarlas**, no para copiarlo tal cual sino para no inventarte
  una forma distinta habiendo una decidida. Se abre con el Chromium de Playwright ya instalado, y
  `apps/web/e2e/capturas-comparacion.spec.ts` fotografía las nuestras para poder compararlas.
- **No abras las decisiones D1–D4** (contenido fuera del SRD, editor de documentos, alcance de la
  línea de tiempo, la mesa de juego con mapa): son del autor y siguen sin respuesta.

## Al terminar

Documentación al día siguiendo `~/.claude/docs-protocol.md`: estado en 01–05, una entrada en 07
con **qué, por qué y cómo revertir**, y la deuda nueva en 06 **con prioridad y evidencia**. Y un
resumen corto de qué quedó hecho, qué no, y qué decisión necesitas de mí.
