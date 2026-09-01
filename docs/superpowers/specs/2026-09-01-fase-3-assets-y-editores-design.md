# Fase 3 — decisión de alcance: assets, editores y mapas

**Fecha:** 2026-09-01. **Estado:** decidido con el autor, pendiente de convertirse en plan.
**Manda sobre el plan maestro** en lo que se refiere a editores y contenido visual.

Surge de una pregunta del autor: *"¿se pueden hacer editores de tiles y de personajes 2D
dentro de esto, con sus efectos, terrenos y animaciones?"*. La respuesta técnica es que **no es
difícil**; la respuesta de producto es que **son otros productos**, y por eso queda escrito
aquí.

## La decisión

**No se construyen editores de arte.** Se **suben imágenes**, se **curan** en una biblioteca por
campaña, y **se importan formatos estándar** de las herramientas que la gente ya usa.

La puerta queda abierta a un editor **pequeño y específico** más adelante, si el uso real
señala una carencia concreta — no como ambición genérica.

## Por qué

- **Quien quiere dibujar ya tiene herramientas mucho mejores y gratis**: Aseprite, LibreSprite
  y **Piskel** (que además es web y libre). No se compite con eso, y no interesa intentarlo.
- **Quien no quiere dibujar no necesita un editor: necesita assets.** Su problema lo resuelve
  una biblioteca y un botón de subir, no un lienzo en blanco.
- **Las herramientas de arte se juegan la vida en micro-detalles** —tacto del pincel, deshacer,
  atajos, presión— que cuestan años. Fallar uno solo devuelve al usuario a Aseprite en cinco
  minutos.
- **Aseprite es el producto de una empresa y Tiled lleva más de una década** de desarrollo
  abierto. Construir el 20% de cualquiera de los dos dentro de un gestor de campañas hace que
  el gestor de campañas deje de ser lo que se está construyendo.
- **Importar en vez de editar da el 90% del valor por el 5% del trabajo**, y deja al usuario
  sus herramientas buenas: él dibuja donde sabe, la plataforma lo pinta y lo anima en la mesa.

Encaja además con el principio que gobierna la fase 2 (**la máquina ejecuta, el DM arbitra**):
una biblioteca curada **sí** le da poder de orquestación al DM; un lienzo de dibujo solo le da
trabajo.

## Orden de valor por hora, que es como se construirá

1. **Subir imágenes y organizarlas por campaña, con visibilidad.** Es lo que el plan maestro ya
   sitúa en la fase 3, porque es cuando entra el almacenamiento (MinIO o S3) y con él los
   adjuntos de entidades y los retratos, diferidos desde la fase 1.
2. **Pintar un spritesheet y reproducir su animación.** Días de trabajo. Permite ver un
   personaje moverse en el tablero **sin haber escrito ni un editor**.
3. **Importar un mapa de Tiled** (`.tmx` / JSON). Es la puerta barata a los tiles si algún día
   se quieren.
4. **Un editor propio, pequeño**, solo si tras usar lo anterior se echa de menos algo concreto.
   Entonces será un editor que resuelve *eso*, no un Tiled genérico.

## Herramientas que ayudan, para no investigar desde cero

- **Crear mapas por tiles:** Tiled (`.tmx`/JSON, el formato de facto) y LDtk.
- **Crear sprites y animaciones:** Aseprite, LibreSprite, Piskel (web).
- **Mapas de DM ya dibujados:** Dungeondraft, Inkarnate — exportan imagen, que es el caso 1.
- **Pintar en el navegador:** Canvas 2D basta para empezar; PixiJS o Konva si hace falta
  rendimiento o capas con interacción.
- **Formatos:** spritesheet = PNG + atlas JSON; mapa de tiles = JSON de Tiled.

Ninguna de estas entra como dependencia todavía: se anotan para que la decisión de la fase 3 se
tome sabiendo qué existe.

## El mismo criterio aplica a la fase 5

El plan maestro define la fase 5 como *"creador de avatares y miniaturas en Three.js"*. **Es la
misma ambición de herramienta de arte y merece el mismo examen** cuando se llegue: casi con
seguridad conviene importar modelos antes que construir un creador.

## El riesgo que esta decisión evita

La fase 1 está **construida y todavía sin usar** (el autor aplazó la partida hasta la fase 3), y
la fase 2 —ya la más arriesgada del plan— acaba de crecer con objetos, dados, condiciones,
razas, clases y subidas de nivel. **Añadir un editor de arte es el movimiento clásico que hace
que un proyecto no llegue nunca a jugarse.**

El gancho de este producto está en la wiki con visibilidad y en el motor de reglas, no en
dibujar píxeles.
