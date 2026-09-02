# Convenciones

## Nivel de verificación: **N1**

El comando que define el nivel es:

```
pnpm verify   =   pnpm build && pnpm lint && pnpm format:check && pnpm check:docs
                  && pnpm check:estado && pnpm test
```

- `pnpm build` compila los tres paquetes (`tsc` / `nest build` / `vite build`) y hace de
  **type-check**.
- `pnpm lint` es **ESLint 9 con configuración plana única en la raíz** (`eslint.config.mjs`):
  recomendadas de JS y de typescript-eslint, más `react-hooks` y `react-refresh` en la web.
  `eslint-config-prettier` va **el último** para que el formato no lo discutan dos
  herramientas.
- `pnpm format:check` es **Prettier** (`.prettierrc.json`: 100 columnas, comillas dobles,
  comas finales). `pnpm format` lo aplica.
  **El Markdown está excluido a propósito** (`.prettierignore`): la documentación se escribe a
  mano y sus saltos de línea y tablas son deliberados.
- `pnpm check:docs` (`scripts/check-docs.mjs`) comprueba mecánicamente tres reglas de
  documentación: rutas citadas entre comillas invertidas que no existen, `fichero:NN` con la
  línea fuera de rango, y conteos de pruebas escritos fuera de su fuente única. Antes de
  `test` a propósito: falla rápido y barato.
- `pnpm check:estado` (`scripts/update-estado.mjs --check`) comprueba que el bloque de estado
  de [00-INDEX.md](./00-INDEX.md) (commit, rama y conteo de unitarias) coincide con lo que el
  script generaría; falla si alguien lo editó a mano. `pnpm update:estado` lo regenera.
- `pnpm test` corre la suite unitaria. **El conteo de unitarias lo genera
  `scripts/update-estado.mjs`** en el bloque de estado de [00-INDEX.md](./00-INDEX.md) — esa
  es ahora su fuente única, no escrita a mano. **Los conteos de e2e siguen viviendo en
  [08-pruebas.md](./08-pruebas.md)**, que enlaza al bloque de arriba en vez de repetir las
  unitarias.

**Lo aplica `.githooks/pre-commit`, que bloquea el commit si `pnpm verify` falla.** El gancho
se conecta solo en el `prepare` de la raíz (`scripts/install-git-hooks.mjs`), que **nunca
falla si no hay repositorio git** porque las imágenes Docker se construyen sin `.git`. **CI no
corre exactamente lo mismo**: repite `lint`, `format:check`, `check:docs`, `check:estado` y
`test` paso a paso y añade los e2e, pero **no llama a `pnpm build`** — hueco real, sin ficha
todavía, ver [06-pendientes.md](./06-pendientes.md).

**No se desactiva el gancho para saltárselo.** Si el control molesta, se arregla el código o
se cambia el control como decisión declarada aquí.

Medido tras cada tarea: `pnpm verify` pasa. Cifras de unitarias al día en el bloque generado
de [00-INDEX.md](./00-INDEX.md); de e2e, en [08-pruebas.md](./08-pruebas.md).

**Fuera de N1, a propósito:** los e2e de API y los de navegador (ambos existen desde
`c6fa899`; ambos necesitan Docker, y los de navegador además dos servidores vivos).
Encadenarlos al gancho lo haría inservible. **No por eso son opcionales** — corren en su
propio trabajo de CI y no son menos exigibles; ver [08-pruebas.md](./08-pruebas.md).

N2 (cobertura) y N3 (mutación) **no están declarados** y no se prometen. Tampoco está
activado el linting con información de tipos (`typescript-eslint` en modo *type-checked*):
es la ruta de mejora, con su ficha en [06-pendientes.md](./06-pendientes.md).

Reglas que aplican sin excepción:

- **Ninguna tarea se marca completa sin prueba real en verde.** API: unitaria + e2e. Web:
  RTL + `pnpm verify` limpio. Ver [08-pruebas.md](./08-pruebas.md).
- **Nunca** desactivar una prueba, bajar un umbral ni silenciar un aviso para que pase el
  build.
- **Evidencia antes que afirmación:** no se dice "pasa" sin haber corrido el comando y
  mirado la salida. Si falla, se pega la salida.

## Idioma

**Código en inglés** (identificadores, nombres de fichero, mensajes de commit).
**Interfaz y documentación en español.** Los textos que ve el usuario son españoles; los
nombres de las cosas del código, no.

## API

- Un módulo por concepto: `servicio` + `servicio.spec.ts`, `controlador`, `módulo`, e2e.
  El módulo importa `CampaignsModule` cuando necesita `MembershipService`, y se conecta en
  `app.module.ts`.
- **La validación de entrada es `ZodValidationPipe` con un esquema de `@dnd/shared`.**
  Ningún DTO a mano, ninguna validación en el servicio que el esquema ya cubra.
- **Las mutaciones exigen DM, creador o dueño. Los listados filtran por `canView`.**
  Esas dos frases describen todos los módulos; si una tarea necesita romperlas, se discute
  antes de escribirla.
- La autorización se comprueba **en el servidor, siempre**. Que la interfaz esconda un botón
  no cuenta como control de acceso.
- Códigos de estado correctos: 401 sin token, 403 sin permiso, 404 si no existe, 400 si el
  cuerpo no valida.

## Web

- `apiFetch<T>` de `src/lib/api.ts` es **el único** que habla HTTP. Ningún componente hace
  `fetch`.
- Un feature = carpeta con `api.ts` (fetchers) + `hooks.ts` (TanStack Query) + componentes +
  `__tests__`. Las páginas componen features.
- **Claves de consulta jerárquicas**: `["campaigns", id, "entities"]`. Invalidar el prefijo
  invalida lo de dentro. **Ojo: hay dos raíces, no una.** Entidades, sesiones, personajes y
  miembros cuelgan de `["campaigns", id, ...]`; enlaces y comentarios cuelgan de una raíz
  aparte, `["entities", entityId, ...]` (`linksKey`/`commentsKey`), que invalidar el prefijo
  de `campaigns` **no toca**. Fue el fallo real de la tarea 1.16 (ver
  [06-pendientes.md](./06-pendientes.md)): borrar una entidad tenía que invalidar por
  predicado sobre la raíz `"entities"` aparte, porque no hay un solo prefijo común.
- Formularios: React Hook Form + `zodResolver` para los simples; `useState` controlado para
  los dinámicos (listas de etiquetas, selección de jugadores).
- Estilo: Tailwind **a través de tokens**, nunca colores literales. Todo utilitario de color
  resuelve una propiedad personalizada de `src/ui/tokens.css` (`bg-surface`, `text-accent`,
  `border-copper`…), que es lo que hace que el tema cambie solo. **No se añaden `slate`, `gray`
  ni `indigo`.** Textos en español.

- **Sí hay sistema de diseño, desde el 2026-09-02.** Esta línea decía «sin sistema de diseño
  para el MVP» y describía el estilo como `bg-slate-900` + `indigo-600`; llevaba desfasada
  desde la tarea 1.19, que introdujo la capa de tokens y las primitivas. **Documentación que
  miente es peor que ausente**, así que se corrige aquí, no se deja como anécdota.
  La identidad es [«Sala de guerra»](./superpowers/specs/2026-09-02-identidad-visual-design.md):
  cromado digital sobrio para lo que se opera, superficie de vitela para lo que se lee.

- **Tres acentos, tres oficios, y no se mezclan.** `--accent` (azul señal) significa *esto se
  puede pulsar*; `--copper` significa *esto pertenece al mundo* (filetes, capitulares, marcas
  de tipo, la cuadrícula cartográfica); `--warning` avisa. Un cobre nunca es un botón. Tres
  tonos distintos para tres trabajos distintos, para que ninguno se distinga de otro solo por
  dónde está colocado.

- **Las tipografías se cargan de Google Fonts**, y eso revierte a propósito el «no network
  fonts» de 1.19. Son cuatro voces con un trabajo cada una: **Marcellus** en títulos,
  **Public Sans** en la interfaz, **EB Garamond** en el texto del mundo, **IBM Plex Mono** en
  las cifras. Cada pila conserva su reserva local completa y el enlace lleva `display=swap`,
  así que una red de tipografías lenta o bloqueada cambia **cómo se ve** la página y nunca
  **si funciona** — Playwright sigue midiendo una página que pintó.
- **Una regla del motor de eventos fija su objetivo al armarse, nunca al dispararse**, y se
  ejecuta con la autoridad del DM que la delegó, siempre a través de `canView`. Es un
  **diputado confundido** de manual: un jugador dispara una escritura que él no podía hacer.
  Objetivos dinámicos que un jugador pueda influir: **prohibidos**. Razonamiento completo y las
  siete reglas en
  [autoridad de las reglas](./superpowers/specs/2026-09-02-autoridad-de-las-reglas-design.md).

### Reglas de interfaz que salieron del reseño (2026-09-02) — vinculantes

Cada una nació de un defecto real, encontrado en producción o señalado por el autor. Se
escriben aquí porque **volvieron a aparecer más de una vez**: una regla que solo vive en la
cabeza de quien arregló el fallo se paga otra vez al mes siguiente.

- **Ningún valor de enumeración llega nunca a la pantalla.** Ocurrió **tres veces en la misma
  mañana**: el panel de enlaces pintaba `Ciudad Ceniza (LOCATION)`, el selector de visibilidad
  ofrecía `PUBLIC`/`DM_ONLY`, y el título de un diálogo componía `Nuevo LOCATION`. La forma
  legible se escribe **una sola vez por dominio** —`features/entities/resumen.ts` para los
  tipos de ficha, `features/entities/visibilidad.ts` para los niveles— y todo lo demás la
  importa. Si hace falta concordar en género («Nueva misión», no «Nuevo misión»), se escribe
  la frase entera en la tabla en vez de concatenarla en la pantalla.

- **Los iconos se dibujan.** Nada de `☾`, `☀`, `✓` ni emoji como icono: un glifo de fuente se
  pinta a todo color en unos sistemas, como un cuadrado vacío en otros, y nunca se parece al
  resto de la interfaz. SVG en trazo, heredando `currentColor`, en `ui/Logo.tsx` o
  `ui/Ornament.tsx`. **Excepción declarada:** los cinco glifos de `ui/Badge.tsx` (`○ ◐ ◈ ◆ ●`),
  que son geometría pura, se alinean con el texto y son la señal que distingue los niveles de
  visibilidad **sin depender del color** — sustituirlos por SVG costaría esa alineación sin
  ganar nada.

- **Una opción con significado no se esconde en un desplegable.** Cuando las opciones son
  pocas y **cada una quiere decir algo distinto** —los cinco niveles de visibilidad—, van como
  radios, visibles a la vez, y **cada una lleva la frase que explica qué hace**. Práctica
  establecida (GOV.UK, Adam Silver, NN/g) y aquí además necesaria: equivocarse en ese control
  enseña a los jugadores algo que no debían ver.

- **Si la interfaz explica una regla del servidor, el servidor manda.** Las frases de
  `visibilidad.ts` describen lo que hace `canView`; **no lo definen**. Ya pasó: la primera
  versión prometía que «público» dejaba ver a quien no estuviera en la campaña, y era falso
  —`canView` rechaza al no miembro **antes** de mirar el nivel, y
  [05-datos.md](./05-datos.md) ya lo decía—. Cuando el texto y el código discrepen, **el que
  miente es el texto**.

- **Un valor guardado que un selector no ofrece se muestra, marcado y no seleccionable.**
  Nunca desaparece. Una opción invisible es un dato que se pierde en el siguiente guardado sin
  que nadie se entere.

- **Un defecto de maquetación exige una prueba de navegador.** `jsdom` no maqueta: no hay
  ancho, ni alto, ni `display` calculado. Cuando las filas pasaron de `<button>` a `<a>`
  heredaron `display: inline` y dibujaron **el borde partido**, con la suite entera en verde y
  un despliegue de por medio. Lo que se mide se escribe en `apps/web/e2e`, leyendo el estilo
  **calculado** — igual que el contraste, que lleva haciéndolo desde 1.19.

- **El ornamento informa o enmarca; nunca compite.** Se permite lo que haría un grabado y
  puede imprimirse: filete, versalita, capitular, cuadrícula, dibujo a medio trazo. Se prohíbe
  la textura que estorba a la lectura y el adorno que no dice nada. Y **nada de esto puede
  romper el contraste**: la cuadrícula pinta al 5 % por eso mismo.

- **La cabecera es el marco, no una tarjeta más.** Va sobre un fondo **más oscuro** que las
  superficies que enmarca. La primera versión era del mismo color y del mismo grosor de filete
  que las tarjetas, y el autor lo describió exactamente así: «casi no se nota».

- **Leer y editar son pantallas distintas.** Una fila lleva a una página de lectura; el editor
  se abre desde ella. Meter el cuerpo de una ficha en un `<textarea>` para poder leerlo es lo
  que hacía esta aplicación, y es lo que la hacía incómoda en la mesa.

- **Un filtro o una búsqueda en pantalla es de cliente, nunca control de acceso** (tarea
  1.17c · A2/C1, `features/entities/filter.ts`). Opera sobre una lista que el servidor **ya**
  filtró por `canView`; solo puede **quitar de la vista** filas que la persona ya tenía
  derecho a ver — nunca puede añadir ni decidir qué entra en esa lista. Confundir "el
  servidor no lo mandó" con "el cliente lo escondió" es el error exacto que `canView` existe
  para no cometer. Si una tarea futura necesitase filtrar algo que el servidor no manda hoy
  (p. ej. buscar por texto dentro del cuerpo), la búsqueda tiene que hacerse **en el
  servidor**, no ampliando este filtro de cliente para que reciba más de lo que debería.

## Trampa de vitest que ya nos mordió

**Un espía sobre un espacio de nombres no intercepta una llamada interna al propio módulo.**
Si `hooks.ts` define `fetchX` y otro código del mismo fichero lo llama directamente, el
`vi.spyOn(api, "fetchX")` de la prueba no ve nada. La solución en uso: el módulo **se
importa a sí mismo** por su espacio de nombres y llama `moduloApi.fetchX()`. En tiempo de
ejecución es idéntico. Ejemplo vivo: `src/features/campaigns/members.ts`.

## Git

- **Un commit por tarea**, en `main`, con su prueba en verde antes de commitear.
- Mensajes en formato Conventional Commits, en inglés: `feat(web):`, `fix(api):`.
- Tras cada tarea: ledger (`.superpowers/sdd/progress.md`) + memoria + push.
- **Al terminar un cambio relevante, la documentación se actualiza en el mismo commit**:
  estado en 01–05, deuda nueva en 06, una línea en 07. Una funcionalidad sin su
  documentación al día no está terminada.

## Revisión

**Cada tarea se revisa antes de darse por cerrada.** La revisión la hace un agente distinto
del que implementó, con contexto limpio y el paquete de revisión delante (rango de commits,
`diff --stat` y el diff completo).

- **Modelo del revisor: Opus.** No se revisa con un modelo más barato que el que implementó:
  la revisión es donde se decide si el trabajo entra, y es el único punto del proceso que
  sustituye a leer el código a mano. Implementadores: Sonnet.
- **Skill:** `superpowers:requesting-code-review` (y `receiving-code-review` para procesar la
  respuesta: se verifica antes de aceptar, no se implementa por complacencia).
- **Auditoría de funcionalidad completa:** al cerrar una fase, o antes de dar por terminada
  una funcionalidad grande, se usa `auditoria-por-funcionalidad`. Sus dos reglas mandan:
  el encargo va **por camino concreto, nunca "recorre esta superficie"** (un encargo de
  superficie produce citas inventadas), y **cada frente lleva su refutador adversario**, cuyo
  trabajo es tumbar el hallazgo, no confirmarlo. Sin `archivo:línea` abierto no hay hallazgo.

**Cuando el revisor y quien implementó no se ponen de acuerdo, las dos posturas se anotan en
`06-pendientes.md`** —con el argumento de cada uno— y se dice cuál se aplicó. Una objeción
razonada que se descarta sin dejar rastro vuelve a aparecer dentro de tres meses sin su
contexto. Práctica tomada del proyecto de grado, donde una ficha diferida conserva la
propuesta del revisor y la razón de no aplicarla.

**Toda revisión de un cambio comprueba cada afirmación de la documentación de ese cambio
contra el código que describe.** `pnpm check:docs` solo pilla mentiras mecánicas: una ruta que
no existe, una línea fuera de rango, un conteo copiado. De los siete casos que motivaron esta
tarea (`.superpowers/sdd/2026-09-01-tarea-1.17-cierre-fase-1/task-antideriva-brief.md`), seis
eran **mentiras semánticas** — una frase que describe un comportamiento que el código no
tiene, con toda la sintaxis en regla — y ningún script las detecta; salieron por esta misma
línea en el prompt del revisor. No se borra pensando que el lint ya lo cubre: el lint cubre
la forma, esta regla cubre el contenido.

**Un fichero no mezcla tipos de documento.** Si un documento explica, guía, sirve de
referencia **y** declara estado actual a la vez, se parte. Es la causa raíz de por qué
`00-INDEX.md` fue el fichero que más mintió: mezclaba el mapa de documentos (punteros, que no
afirman nada) con estado escrito a mano, y las afirmaciones se fueron acumulando entre los
enlaces sin que nadie las revisara como tal. La distinción viene de Diátaxis (tutorial / guía
práctica / referencia / explicación) — se adopta la regla, no el framework completo: `01` a
`05` ya están razonablemente bien formados y no se migran solo por esto.

## Un control de seguridad que depende del entorno declara aquí por qué

**El límite de intentos por IP en `/auth/login`, `/auth/register`, `/invites/:token/accept` y
`PATCH /auth/password` (`AUTH_RATE_LIMIT_DEFAULT`, `apps/api/src/common/rate-limit.constants.ts`)
es ahora configurable por variable de entorno (`AUTH_RATE_LIMIT`), en vez de una constante fija.**
Motivo: la suite de Playwright (`apps/web/e2e`) registra e inicia sesión con un usuario nuevo en
casi cada prueba, y todas comparten `127.0.0.1` — un único cubo del limitador. Con el límite real
de 5/min, la sexta prueba en adelante recibía 429 en vez de sesión, y `campana.spec.ts` e
`invitacion.spec.ts` fallaban sin que el código de la aplicación tuviera ningún defecto.

La regla que esto respeta: no se sube el umbral para que pase una suite — se hace el control
dependiente del entorno, con el valor real intacto en todo entorno que importa:

- **El valor por defecto no cambia**: `AUTH_RATE_LIMIT_DEFAULT` sigue en 5/min, y es lo que corre
  en producción (variable sin fijar) y en la suite e2e de la API (`test` job de CI,
  `apps/api/test/rate-limit.e2e-spec.ts`), que sigue afirmando un 429 real al límite real.
- **La variable se fija alta en exactamente dos sitios**, los dos entornos de prueba de
  navegador y ninguno de producción: el `webServer` de la API en
  `apps/web/playwright.config.ts` (`env: { AUTH_RATE_LIMIT: "1000" }`) y el job `e2e-browser`
  de `.github/workflows/ci.yml`.
- **Un valor inválido nunca desactiva el control**: `parseAuthRateLimit` (mismo fichero) cae al
  valor por defecto ante cualquier entrada no numérica, no entera o no positiva — probado en
  `rate-limit.constants.spec.ts`. Una variable mal escrita se comporta como si no existiera, no
  como "sin límite".
- **Documentado en `.env.example`**, dejando explícito que existe solo para el problema de IP
  compartida de la suite de navegador y que nunca debe subirse en producción.

## Trabajo con varios agentes a la vez

Escrito el 2026-09-01, después de una sesión con hasta cinco agentes en paralelo sobre este
repositorio. Nadie perdió trabajo, pero hubo tres roces y uno de ellos fue del orquestador. Las
reglas de abajo son lo que evitó los demás, no teoría.

**Un worktree por rama, y una frontera de ficheros escrita en el encargo.** El encargo dice qué
rutas puede tocar el agente (`solo apps/api` + `packages/shared`, `solo apps/web`) y qué pasa si
cree que necesita salirse: **lo reporta, no lo hace**. Esa línea es la que impidió que las dos
ramas paralelas de 1.18a y 1.19 se pisaran, tocando ambas el mismo monorepo a la vez.

**El `pnpm-lock.yaml` es único del monorepo y va a chocar.** Es esperado: la segunda rama que
integre lo regenera con `pnpm install`. No se intenta evitar el choque no instalando.

**La documentación la escribe el orquestador cuando el implementador ha terminado**, nunca
mientras trabaja en ese mismo árbol. Si se hace a la vez, el agente ve ficheros modificados que
no escribió y tiene que decidir si son suyos — en esta sesión lo reportó como sospecha, y con
mala suerte habría sido una edición perdida.

**Un revisor de solo lectura también escribe.** Uno compiló (`vite build`) para inspeccionar el
CSS y dejó un `dist/` sin rastrear. El encargo de revisión dice explícitamente: no commitear, no
editar, y si se compila para diagnosticar, limpiar después.

**Playwright y los e2e de API se serializan mientras los puertos y la base sean globales.** Dos
corridas a la vez dan fallos falsos — ya costó una tanda de cuatro. Cuando exista la ranura por
worktree (puertos y base de datos propios), esta regla se sustituye por "cada carril, su ranura".

**Techo de cinco agentes.** Por encima, las compilaciones se comen la máquina y el cuello deja de
ser el modelo. La recomendación general es 3-5; cinco es sostenible en un equipo con 32 GB.

**El paralelismo mueve el cuello de generar a revisar, y esa es la parte que no se recorta.**
Toda rama pasa por revisión antes de commitear. En la sesión que originó esta sección, los tres
hallazgos críticos los encontró la revisión y ninguno el implementador — y dos de ellos anulaban
justo la protección que su propia tarea añadía.

**Las revisiones sí se paralelizan**, porque son de solo lectura: varias dimensiones a la vez
(seguridad, calidad de pruebas, cascada y accesibilidad) sobre el mismo diff, y el orquestador
junta los hallazgos.

## Precedencia

Instrucción del usuario en la sesión > este documento y el `CLAUDE.md` del repositorio >
`~/.claude/dev-rules.md` y `~/.claude/docs-protocol.md` > comportamiento por defecto.
Toda contradicción con las reglas globales se declara **aquí**, no se deja implícita. Hoy **no hay ninguna**: el nivel N1 quedó completo el 2026-08-31.
