# Prompt de arranque — la interfaz nueva y la fase 2.5, en paralelo

> Se copia y se pega entero al abrir la sesión. Hermano de los prompts de arranque de 2B y 2C.

---

Vas a trabajar en **Sala de Guerra**, la plataforma de D&D 5.ª edición que hay en este
repositorio. Está **en producción** en `dnd.supportive.pro` y la fase 2 está entera.

## Lee esto antes de tocar nada, en este orden

1. `CLAUDE.md` de la raíz.
2. `docs/00-INDEX.md` — el mapa. Empieza ahí.
3. `docs/superpowers/specs/2026-09-03-reseno-de-la-mesa-design.md` — **el más importante para esta
   sesión.** Por qué se rehace la interfaz, la arquitectura acordada, y **la frontera exacta de qué
   se sustituye y qué se conserva** (§9). Si solo lees uno, lee este.
4. `docs/superpowers/specs/2026-09-03-fase-2.5-alcance-design.md` — el alcance del otro carril, con
   las cuatro decisiones del autor ya contestadas.
5. `docs/04-convenciones.md` entero — es normativo, incluidas las reglas de interfaz vinculantes.
6. `docs/08-pruebas.md` — qué prueba cada capa, qué cubre cada recorrido, y qué **no** cubre nada.
7. `docs/06-pendientes.md`, las dos primeras secciones.

**No leas `docs/superpowers/` entero.** Son 13.662 líneas de registro fechado, fuera del camino de
lectura a propósito. Se entra por `docs/decisiones.md`, que tiene una línea por decisión con su
enlace.

## Dónde está el proyecto

- **Fase 2 completa**: motor de reglas con traza (2A), objetos e inventario (2B), dados, reloj,
  condiciones y tablas (2C), y PNJ con números (2D). Todo desplegado y verificado.
- **La interfaz es el problema, y está diagnosticado.** El autor entró en su propia aplicación y no
  supo qué hacer. Diecinueve destinos en una campaña, siete pestañas que son valores del enum de una
  tabla, y **la mesa ni siquiera está en la navegación**.
- **Hay una maqueta nueva**, en `prototipo/`: dos rondas de Figma Make, 4.513 líneas, con la
  arquitectura acordada y en el lenguaje de tokens de este proyecto. **Es la interfaz de destino.**
  Está fuera del workspace y fuera de lint a propósito.
- **La fase 2.5 tiene alcance escrito y no está empezada.**

## Los dos carriles

Trabajan **en paralelo** y la frontera de ficheros es limpia. **Esta línea no se cruza:**

```
Carril GRÁFICO   apps/web/src/**
Carril MOTOR     apps/api/src/**  ·  packages/shared/**  ·  apps/api/prisma/**
```

**Y una regla que la protege: el carril del motor solo AÑADE a `packages/shared`, nunca cambia lo
que ya exporta.** Añadir da más a la web; cambiar una forma existente rompe el otro carril.

**Si hay que elegir entre los dos, gana el gráfico.** El motor no decide si los amigos del autor
vuelven a una segunda partida; la pantalla sí.

### Carril gráfico — sustituir la interfaz

**Se sustituye, no se adapta.** Pero eso **no** es tirar `apps/web`:

| Se sustituye | Se conserva |
|---|---|
| Las **páginas** y la navegación | Los **hooks de datos** (`features/*/hooks.ts`) |
| Los **componentes de presentación** | Las **puertas de API** (`features/*/api.ts`) |
| La **composición** de la mesa | El **vocabulario del dominio** (`vocabulario.ts`) |

**Por qué se conserva esa columna:** ahí vive corrección que costó semanas —la concurrencia
optimista de los PG con su conflicto de versión, el filtrado por `canView`, los mensajes del
servidor pintados tal cual, el sondeo de quince segundos—. **La maqueta es presentación sin datos**,
así que el trabajo es **enchufarla a esa columna**, no reconstruirla.

**Los recorridos de navegador se ACTUALIZAN, no se borran.** Describen comportamiento, no
maquetación, y son la única red de seguridad de la migración. Las pruebas de componente de las
pantallas que desaparezcan mueren con ellas, y eso se acepta.

**Lo primero de este carril:** leer `prototipo/` por dentro —nadie lo ha hecho todavía— y proponer
el orden de migración pantalla a pantalla, empezando por **la mesa**, que es la que decide.

**Lo que la maqueta no cubre y hay que construir**: la **invitación** —que es un flujo, no una
pantalla, ya construido y ya cubierto por un recorrido con dos contextos— y el rodaje del taller
del DM.

### Carril motor — la fase 2.5

Seis bloques, **todos de servidor, ni una línea en `apps/web`**, y **2.5.1 va primero y no es orden
estético**: en cuanto se escriban sucesos de daño sin tipo, ese registro queda ciego para siempre.

1. **2.5.1** — tipos de daño (los trece del SRD, **como columna**) y resistencias que reducen de
   verdad. Ojo: la resistencia de un statblock **no es un tipo de daño** («contundente de ataques no
   mágicos con armas que no sean de plata»); se parte en parte estructurada y parte en prosa que el
   DM puede ignorar o degradar.
2. **2.5.2** — iniciativa y orden de turnos, sobre el reloj que ya existe. **Un asalto son seis
   segundos** y el reloj se hizo en segundos precisamente por eso. **Estará sin usar hasta que exista
   la pantalla, y se acepta**: es dependencia de la caducidad por asaltos.
3. **2.5.3** — el ataque comparado en el servidor. **La CA del monstruo no viaja al navegador.**
4. **2.5.4** — el daño con su traza, colgando de la tirada que lo causó. Lo aplican **el DM y el
   dueño** (decisión del autor). Con la salvación de concentración: **CD 10 o la mitad del daño, y
   una por cada fuente**.
5. **2.5.5** — las condiciones llegan a las tiradas: ventaja sugerida con traza, y el agotamiento
   entero.
6. **2.5.8** — archivar un personaje en vez de borrarlo. **Es lo único abierto que destruye datos
   mientras espera.**

**Fuera de esta tanda, con motivo escrito:** la pantalla del encuentro (**se construiría dos veces**;
es una capa sobre la mesa nueva) y los ataques de oportunidad (abren el concepto de «reacción»; el
autor aceptó posponerlos **hasta después de la partida de prueba**).

## Cómo se trabaja aquí — no negociable

- **Un commit por tarea.** Mensaje en inglés, Conventional Commits, con **por qué** y **cómo
  revertir**. Documentación en el mismo commit.
- **Nada se da por terminado sin prueba en verde y sin mirar la salida.** `pnpm verify` limpio,
  e2e de API, y **si tocas una pantalla, abres el navegador**.
- **Prueba de mutación obligatoria por comportamiento nuevo**: rompe el código a propósito y
  comprueba que la prueba se pone roja. **Restaura COPIANDO el fichero, nunca con `git checkout`.**
  Y si la mutación no compila, **no cuenta como medición**.
- **Revisión obligatoria al cerrar una tanda**, en dos frentes: seguridad y reglas contra la fuente.
  Las tres veces que se ha hecho encontró fugas reales; la de 2D encontró una que habría llegado a
  producción.
- **Cuando dudes de una regla, investiga.** El SRD 5.1 oficial en español se puede descargar de
  `https://media.wizards.com/2023/downloads/dnd/SRD_CC_v5.1_ES.pdf`, y `dnd5eapi.co` lo sirve en
  JSON. **La cita va en el commit.** Si la fuente contradice lo escrito, manda la fuente.
- **Evidencia antes que afirmación.** Si algo falla, se dice que falla y se pega la salida.
- **Nunca** desactives una prueba, bajes un umbral ni saltes el gancho de pre-commit.

## Agentes — leer esto antes de abrir uno

**No lances agentes que puedan lanzar agentes.** El 2026-09-03 tres investigadores abrieron los
suyos hasta pasar de veinte, agotaron el presupuesto de búsqueda de la sesión y el autor los mató a
mano. **Prohibir el anidamiento por escrito en el propio prompt del agente.**

Lo que sí funciona, probado el mismo día: **uno o dos agentes acotados**, con frontera de ficheros
escrita, **un commit por unidad de trabajo** para que un corte no pierda nada, y la instrucción
explícita de no abrir más agentes.

**Y no dos agentes escribiendo el mismo fichero.** Ese día uno se tragó una carpeta ajena en un
`git add -A`; lo cazó, pero pudo salir mal.

## Trampas que ya costaron horas

- **El límite de peticiones es de 100 por IP y minuto** en las suites. Si los fallos se mueven de
  sitio entre tandas, sospecha del limitador antes que del código.
- **`reuseExistingServer` de Playwright**: si cambias una variable de entorno del servidor, **mata
  el proceso viejo** o la tanda corre contra la configuración anterior sin decirlo.
- **Ninguna clase de opacidad de Tailwind compila sobre los tokens** (`bg-accent/10` se descarta en
  silencio). Y **una clase que no existe en la paleta compila a nada**: `text-ink` y `border-line`
  no existen — son `text-text` y `border-muted`.
- **`jsdom` no maqueta.** Lo que solo se ve maquetado se mide en el navegador, y **midiendo lo que
  importa**: una prueba de borde que solo exige «ancho > 0» no caza una clase inventada.
- **`prototipo/` está fuera de lint y de formato a propósito.** Si vuelve a entrar en el alcance,
  `pnpm verify` falla y **nadie puede commitear nada en el repositorio**.
- **El volcado previo de producción**: los contenedores de Coolify se llaman por el UUID de la
  aplicación —`--filter name=dnd` no encuentra nada— y el usuario de Postgres es `dnd`, no
  `postgres`. Un volcado de **20 bytes** es el síntoma.

## Lo que NO hay que hacer

- **No empezar la pantalla del encuentro** ni los ataques de oportunidad.
- **No tocar `apps/web` desde el carril del motor**, ni al revés.
- **No cambiar lo que `packages/shared` ya exporta.**
- **No desplegar** sin que el autor lo pida.
- **No crecer la documentación.** El camino de lectura son ~4.200 líneas y hay dos controles que lo
  vigilan (`check:historial` y el conteo de e2e generado). Si una decisión hace falta para trabajar,
  va a `04-convenciones.md` o a `01`/`05`; lo demás es arqueología.
- **No empezar nada nuevo antes de la partida de prueba.** Es lo único que falta para cerrar la fase
  2 y lleva pospuesta desde el principio.

## Lo que hay abierto y conviene saber

- **Siete tipos de suceso salen crudos en el registro de la mesa** —`MONEY_CHANGED`, `ITEM_ADDED`,
  `CLOCK_ADVANCED`, `CONDITION_EXPIRED`, `TABLE_ROLLED` y dos más—: o sea, **todo lo que 2B y 2C
  construyeron se anuncia con su código interno**. Ficha en `06-pendientes.md`.
- **La copia de seguridad de producción sigue rota**, y ya hay datos reales: una campaña, tres
  personajes y dos usuarios. Ficha con su arreglo de una línea.
- **`06-pendientes.md` tiene ~91 fichas abiertas** y una propuesta de poda que **exige decisiones del
  autor**. No podar por cuenta propia.
- **La partida de prueba con dos cuentas de jugador** sigue siendo lo único que le falta a la fase 2.
