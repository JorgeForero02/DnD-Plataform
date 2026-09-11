# Convenciones

## Nivel de verificación: **N1**

El comando que define el nivel es:

```
pnpm verify   =   pnpm build && pnpm lint && pnpm format:check && pnpm check:docs
                  && pnpm check:estado && pnpm check:historial && pnpm test
```

- `pnpm build` compila los tres paquetes (`tsc` / `nest build` / `vite build`) y hace de
  **type-check**.
- `pnpm lint` es **ESLint 9 con configuración plana única en la raíz** (`eslint.config.mjs`):
  recomendadas de JS y de typescript-eslint, más `react-hooks` y `react-refresh` en la web.
  `eslint-config-prettier` va **el último** para que el formato no lo discutan dos
  herramientas.
- **Los tipos comodín son error en el código de aplicación, y el techo es cero.** Medido el
  2026-09-06 sobre todo el repositorio: `no-explicit-any` daba **cero hallazgos** fuera de las
  pruebas. Venía heredado como **aviso** de la configuración recomendada, y un aviso que nadie
  ha tenido que atender nunca no dice nada sobre si entra el siguiente — `pnpm verify` pasa con
  avisos. En error no cuesta nada hoy y hace que sostenga la máquina lo que hasta ahora
  sostenía la costumbre. **Los ficheros de prueba siguen exentos** y con su motivo escrito: las
  aserciones sobre dobles piden tipado laxo. Si una frontera de verdad no se puede tipar, el
  camino es `unknown` con su comprobación, o un `eslint-disable-next-line` con la razón — nunca
  un comodín en silencio.
- `pnpm format:check` es **Prettier** (`.prettierrc.json`: 100 columnas, comillas dobles,
  comas finales). `pnpm format` lo aplica.
  **El Markdown está excluido a propósito** (`.prettierignore`): la documentación se escribe a
  mano y sus saltos de línea y tablas son deliberados.
- `pnpm check:docs` (`scripts/check-docs.mjs`) comprueba mecánicamente tres reglas de
  documentación: rutas citadas entre comillas invertidas que no existen, `fichero:NN` con la
  línea fuera de rango, y conteos de pruebas escritos fuera de su fuente única. Antes de
  `test` a propósito: falla rápido y barato.
- `pnpm check:estado` (`scripts/update-estado.mjs --check`) comprueba **los dos bloques que
  ese script genera** y falla si alguien editó cualquiera a mano: los **conteos de unitarias**
  del bloque de estado de [00-INDEX.md](./00-INDEX.md), y desde el 2026-09-03 los **ficheros de
  e2e** contados del disco, en el bloque de [08-pruebas.md](./08-pruebas.md). El segundo se
  añadió porque el 08 llegó a declarar una especificación de navegador de más, y antes una
  suite de API de menos: `check:docs` no puede cazar ninguna de las dos —la frase está bien
  escrita, solo es falsa—, pero contar ficheros sí sabe hacerlo una máquina. **Lo que sigue a
  mano, y a propósito, es el número de casos**: un bloque declarado dentro de un bucle ejecuta
  más pruebas de las que se leen en el fichero, así que esa cifra es la que imprime el corredor
  y su sitio es [08-pruebas.md](./08-pruebas.md). **El commit y la rama del bloque NO se comprueban nunca**, así que pueden quedarse
  varios commits atrás sin que nada avise; el script lo explica en un comentario, y el propio
  bloque lo declara. Escribir aquí que el hash está verificado era una promesa que nadie cumple.
  `pnpm update:estado` lo regenera todo.
- `pnpm check:historial` (`scripts/check-historial.mjs`) **falla si
  [07-historial.md](./07-historial.md) pasa de 1000 líneas.**

  > **El tope subió de 400 a 1000 el 2026-09-05, y es una decisión del autor declarada aquí**, que
  > es la segunda de las dos salidas legítimas que el propio control nombra. **Qué la forzó:** una
  > sola noche cerró seis planes y escribió trece entradas, y `check:historial` saltó **siete
  > veces** — el archivo se estaba usando como válvula de presión y no como archivo, que es
  > justo lo que la regla quería evitar. 400 estaba dimensionado para un ritmo más lento.
  >
  > **Lo que NO cambia con el número:** el motivo de tener tope —un registro que no cabe en
  > contexto se hojea, y hojear un registro es peor que no tenerlo—, ni el procedimiento cuando
  > salte: las entradas **se mueven enteras**, nunca se resumen. El protocolo ya pedía archivarlo
  al llegar a ~600 y el fichero acabó en **2192**: un umbral que no comprueba nadie es un
  deseo. No es pulcritud — el consumidor principal de esta documentación es un agente sin
  memoria que la relee entera cada sesión, y **lo que no le cabe en contexto lo rellena
  inventando**, con la autoridad prestada de un registro fechado.
  **Cuando se pone rojo hay exactamente dos salidas legítimas**: mover entradas a
  `docs/_archivo/` —**enteras y sin reescribir**, porque un registro fechado no se resume— o
  cambiar el tope como decisión declarada aquí. Subirlo en silencio para que pase es
  precisamente lo que la regla de abajo prohíbe.
- `pnpm test` corre la suite unitaria. **El conteo de unitarias lo genera
  `scripts/update-estado.mjs`** en el bloque de estado de [00-INDEX.md](./00-INDEX.md) — esa
  es ahora su fuente única, no escrita a mano. **Los conteos de e2e siguen viviendo en
  [08-pruebas.md](./08-pruebas.md)**, que enlaza al bloque de arriba en vez de repetir las
  unitarias.

**Lo aplica `.githooks/pre-commit`, que bloquea el commit si `pnpm verify` falla.** El gancho
se conecta solo en el `prepare` de la raíz (`scripts/install-git-hooks.mjs`), que **nunca
falla si no hay repositorio git** porque las imágenes Docker se construyen sin `.git`. **CI no
corre exactamente lo mismo**: repite `build`, `lint`, `format:check`, `check:docs`, `check:estado`,
`check:historial` y `test` paso a paso y añade los e2e. **`pnpm build` entró el 2026-09-05**
(`.github/workflows/ci.yml:47`) y va **antes de `lint`**: `packages/shared` tiene que estar
construido para que la API compile contra él, y un error de tipos es más barato de leer que
novecientas pruebas rojas con una sola causa. Hasta ese día no corría, y un fallo de compilación que
las pruebas no tocaran llegaba a `main` en verde.

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

**Excepción declarada (2026-09-07): el vocabulario de dominio de D&D se escribe en español,
también en identificadores.** La regla de arriba llevaba tiempo incumplida sin que nadie lo
dijera —el repositorio ya tenía `recolocar`, `sesion`, `comprobarPersonaje`, `excedido`,
`cantidad`— y el paso 2 añadió `gastar`, `Origen`, `Coste`, `nivelDeEspacio` y `actividad` al
mismo montón. **Una regla que nadie cumple y que nadie ha declarado rota es peor que una
excepción escrita**: la primera dice una cosa y el código dice otra sin que se note; la segunda
es verdad. Lo que sigue en inglés es todo lo que no es vocabulario de la mesa: nombres de
patrón (`resolver`, `service`, `schema`), infraestructura y las claves de traza (`sourceType`,
`abilityMod.str`), que son código y conviven con las del motor.

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

- **Un 403 sobre algo que no deberías saber que existe es una filtración: va 404.** Un
  «prohibido» ya confirma la existencia. Se aplica a la petición de tirada de otro, a un
  statblock de otra campaña y a una tabla del DM que no ves. La excepción es cuando **quien
  pregunta ya sabe que existe**: la hoja de un PNJ que el DM ya reveló contesta «sus números no
  son públicos», porque colapsarlo en «no existe» sería mentir sobre algo que se está viendo.

- **Un catálogo compartido se referencia con una CADENA, no con una clave foránea.** `SRD:goblin`
  o `CAMPAIGN:<cuid>`, y quien la resuelve es una sola puerta por dominio. Lo eligió 2B para los
  objetos y 2D lo repitió para los statblocks, por el mismo motivo: el catálogo del SRD vive en
  **código** —donde se lee, se revisa y se prueba— y no tiene fila a la que apuntar. **El prefijo
  lo pone el servidor, nunca el cliente**: elegirlo sería poder apuntar a otra campaña.

- **Lo que el DM prepara nace escondido.** Un objeto propio, un statblock, un PNJ instanciado y
  una tabla de la casa nacen `DM_ONLY`, y el DM los sube cuando la mesa se topa con ellos.
  Preparar la mazmorra no puede ser filtrarla.

- **La visibilidad de una cosa y la de su plantilla son dos cosas distintas** (2D, y costó una
  fuga aprenderlo). Revelar el PNJ no revela su statblock: hay que comprobar **las dos**, y quien
  derive algo a partir de una plantilla tiene que preguntar por la plantilla.

- **Un descanso avanza el reloj de campaña: largo 8 h, corto 1 h** (D-A-1, decisión del autor del
  2026-09-06). Hasta entonces `rest.service.ts` **leía** el reloj y no lo movía nunca, y su propio
  409 mandaba «avanza el reloj de la campaña» a mano. **Se declara aquí porque cambia el
  comportamiento de todo lo que caduca** —condiciones, concentración, la ventaja de Ayudar—, y eso
  es lo que se quiere: *«ya lo hace en combate; el descanso también. El DM programa el descanso y
  decide, así se cierra entre sesión y sesión.»* La regla de **un descanso largo por 24 h sigue en
  pie**, y ahora se cumple sola.

- **Revelar un PNJ revela sus PG actuales y NADA MÁS de sus números** (D-A-2, decisión del autor
  del 2026-09-06). Sus seis características, su CA, sus PG máximos, su competencia y su traza
  siguen siendo del DM aunque el PNJ esté `PUBLIC`. **El motivo es de mesa, no técnico:** saber
  que un enemigo está malherido se ve en la ficción y es información legítima; su hoja no lo es.
  > Lo que había antes no era una decisión, era una fuga: `npcs.service.ts` copia las
  > características del statblock a la fila de `Character` al instanciar —D-2D-2, «un PNJ en la
  > mesa es una fila de `Character`»— y `getSheet` devolvía esa fila entera, **en la misma
  > respuesta que decía «los números de este PNJ no son públicos»**. Las dos piezas eran correctas
  > por separado.

- **Un 400 de validación se escribe para que una persona lo lea y sepa qué arreglar**
  (`apps/api/src/common/validation-errors.ts`, desde el 2026-09-02). Sale una frase en español
  que la interfaz imprime tal cual, más una lista `errores` con el campo culpable, su ruta y el
  código de Zod para quien depure. Tres reglas que lo gobiernan:
  - **El nombre del campo se cita literal y en su idioma original** —«Falta el campo
    obligatorio «kind»»—, nunca traducido a una etiqueta bonita. Quien lee ese mensaje está
    arreglando una petición HTTP, y una etiqueta que no aparece en ninguna parte de la API lo
    manda a buscar un campo que no existe. **No hay diccionario campo → etiqueta en esta
    capa**: sería una segunda fuente de verdad sobre la forma de los datos, que vive una sola
    vez en `@dnd/shared`.
  - **Nunca devuelve el valor recibido.** Una contraseña o un token no pueden acabar
    reflejados en la pantalla ni en los registros.
  - **Nunca puede decir si algo existe.** Solo ve forma, jamás la base: dos identificadores
    inexistentes distintos dan exactamente la misma respuesta.

- **Un `Json` en la base no se consulta nunca por dentro.** El `payload` de `GameEvent` lleva
  solo el detalle que se pinta en una línea de la línea de tiempo; **todo lo que haga falta
  consultar o filtrar es una columna real** (campaña, sesión, actor, tipo, sujeto, fecha,
  visibilidad). **Si algún día hace falta consultar por un campo del `payload`, ese campo se
  promociona a columna** — no se escribe una consulta dentro del JSON. El proyecto ya pisó esa
  trampa con `Entity.body`, que era `z.unknown()` y hubo que darle forma explícita en 1.17b
  (ver [05-datos.md](./05-datos.md)); la regla existe para no pisarla dos veces. Y el `Json`
  que sí se guarda va **validado al escribir** por una unión discriminada de Zod en
  `packages/shared`, no por confianza en quien llama.

- **Una restricción que la base puede garantizar, la garantiza la base.** «Como máximo una
  sesión en curso por campaña» es un índice único parcial de Postgres, no un `if` en el
  servicio: la comprobación en el servicio es una carrera esperando a ocurrir en cuanto alguien
  tenga dos pestañas abiertas. El servicio traduce el choque a un 409 legible, y **la prueba de
  esa restricción es e2e**, porque el Prisma simulado de las unitarias no valida SQL.

- **Una transacción se abre con `PrismaService.transaction`, nunca con `$transaction`.** Lo
  segundo está prohibido fuera del módulo de Prisma y lo comprueba un barrido del código
  (`apps/api/src/prisma/no-transaction-suelta.spec.ts`). El motivo es la ficha **M2B-3**: los
  sucesos que se registran dentro de una transacción tienen que emitirse **después** del
  *commit*, porque el motor de reglas los escucha y trabaja **por otra conexión** — emitir con la
  transacción abierta le hace leer el mundo anterior al suceso y dejar sus efectos fuera de la
  transacción, donde sobreviven a un cambio deshecho. `transaction` abre ese buzón
  (`apps/api/src/common/after-commit.ts`); `$transaction` no. **La regla es estructural a
  propósito**: una que dependa de acordarse se paga otra vez con la siguiente transacción que
  alguien escriba, y ninguna prueba de comportamiento puede fallar por código que aún no existe.

- **Un número derivado nunca es una cadena evaluable.** `Origen` (`packages/shared/src/origen.schema.ts`)
  tiene siete variantes cerradas —fijo, modificador de característica, competencia, tabla de
  escala, modificador de lanzamiento, nivel de espacio, CD de conjuro— y `resolverOrigen` las
  convierte en un valor **y** su paso de traza; nunca en un número suelto. Es la frontera
  deliberada con Foundry: su `simplifyBonus` (fichero `utils.mjs`, fuera de este repositorio)
  evalúa una cadena como `"@mod + 2"`
  y devuelve **0 en silencio** si la evaluación falla — un fallo convertido en un número creíble,
  que es lo único que este proyecto no se puede permitir teniendo una traza que promete explicar
  cada cifra. Por eso cada variante de `Origen` **lanza** cuando le falta el dato que necesita
  (una puntuación ausente entra como `NaN`, que `Number.isFinite` rechaza) en vez de devolver
  cero. Que no se reabra: hay una prueba que rechaza explícitamente una cadena con forma de
  fórmula en el lugar de un `Origen`.

- **Dos decisiones del autor sobre el paso 2 de la actividad (2026-09-06).** *Cinco actividades
  separadas* (`ataque`, `salvacion`, `dados`, `utilidad`, `prueba`), discriminadas por `tipo`:
  el SRD distingue una salvación de una prueba de característica, y fusionar un vocabulario
  cerrado es fácil de hacer y caro de deshacer con datos ya escritos. Y **el servidor cuenta y
  avisa, pero no impide** gastar de más: spend una acción de más y el servidor lo registra con un
  aviso (`ACTION_SPENT`) en vez de rechazarlo, porque hay decenas de aptitudes que conceden
  acciones extra y ninguna se modela el primer día — impedirlo sería el servidor arbitrando la
  mesa, que este proyecto ya declinó hacer con los bandos y con terminar un combate.

- **El reparto de botín no es automático, y el comercio queda fuera hasta que se pida jugando.**
  «Dar…» (paso botín) pone el objeto o el dinero en manos de un destinatario concreto que la mesa
  elige; no hay «dar a todos», no hay repartir oro a partes iguales y no hay intercambio entre
  personajes. Hay una prueba (`DarObjeto.test.tsx`) que afirma la ausencia de las dos primeras en
  un mismo `expect`; **el comercio no tiene prueba propia** —no hay nada que montar, así que no
  hay ausencia que medir en la pantalla—, y una decisión que no se puede medir vuelve como
  funcionalidad de conveniencia la siguiente vez que alguien la pida. **El sistema entrega; la
  mesa decide** cómo se reparte lo entregado.

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

- **La densidad base es 14 px, y los controles de formulario llevan suelo de 16 px en pantallas
  táctiles** (`@media (pointer: coarse)`, `ui/tokens.css`). Decidida con las pantallas delante en
  1.19b (2026-09-01) y declarada aquí el 2026-09-10 (D-POD-9), que es donde faltaba: vivía como
  «deuda» en `06-pendientes.md` sin que hubiera nada que hacer. Por debajo de 16 px iOS Safari hace
  zoom al enfocar, y lo que dispara el zoom es el tamaño **calculado**, no la clase escrita.

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

  > **Resuelto el 2026-09-05: manda este documento.** La maqueta de `prototipo/` pinta el
  > `FilterChip` activo **en cobre** —`border-copper bg-copper/15 text-copper-text`— y un chip de
  > filtro es literalmente un `<button>`. **Dos carriles chocaron con esto por separado y los dos
  > siguieron esta regla contra la maqueta**: la capa visual dejó el chip en `--accent`, y el taller
  > eligió radios con explicación. Los dos lo declararon en vez de decidirlo en silencio, y **los
  > dos acertaron**. El chip activo se queda en `--accent` y **la maqueta se corrige**.
  >
  > El motivo, para que no se reabra: el cobre está usado en toda la aplicación para **el mundo**
  > —capitulares, filetes, marcas de tipo, la cuadrícula—, y si además selecciona, **deja de
  > significar nada**. Corregir la maqueta es cambiar un color en un componente; cambiar esta regla
  > es repintar el criterio entero.

- **`--warning` existe; `--success` NO existe y no se añade.** Decisión cerrada (D-OP-7, y su
  medición está en `ui/tokens.css`): `--warning` y `--warning-text` están en los cuatro temas con
  sus contrastes medidos. El verde de éxito **se resuelve reutilizando `--accent-text` con un
  glifo de comprobación y una palabra explícita**, porque **un segundo verde serían dos verdes que
  aprender**. Está escrito aquí y no solo en un comentario del código a propósito: **una decisión
  de no-hacer que solo vive en el código se revierte por buena fe** dentro de seis meses.

- **Un gesto que reclasifica, esconde o retira algo dice su CONSECUENCIA y deja RASTRO.** Las dos
  cosas, y ninguna es «¿estás seguro?» — un «¿seguro?» se pulsa sin leer y encima tranquiliza. La
  confirmación nombra **dónde deja de aparecer** lo afectado y **qué deja de encontrarlo**, con los
  nombres reales; y el cambio **escribe su suceso**, porque el registro es la auditoría de esta
  aplicación. Con las dos, el gesto se vuelve **reversible en la práctica**. Vale igual para
  cambiar el tipo de una ficha, archivar, borrar y despromover.

- **Las reglas de D&D son verdad absoluta, y la maqueta NO es fuente de reglas.** Regla del autor
  del 2026-09-05. Si el SRD contesta una duda, **se aplica**: no se convierte en una pregunta más.
  Y donde el rótulo de la maqueta discrepe del SRD, **gana el SRD y el rótulo se corrige sin
  consultar**. El caso que la motivó: la maqueta pintaba «Ventaja por flanqueo **+3**» y «Ayuda
  **+1d4**», y **las dos son falsas** — el flanqueo es regla **opcional del DMG** y da **ventaja**
  (el +2 es de 3.ª edición), y Ayudar da **ventaja**, no +1d4, que es el conjuro `Bless`. Lo que sí
  se le pregunta al autor es lo que las reglas **no** contestan: forma, alcance y prioridad.
  Fundamento y fuentes en
  [la investigación del 2026-09-05](./superpowers/specs/2026-09-05-investigacion-decisiones.md).

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

> ## El prototipo es revisión obligatoria de toda pantalla nueva y de la navegación
>
> **`https://sunny-glaze-58905833.figma.site/`** — decisión del autor, 2026-09-03.
>
> **Antes de dibujar una pantalla que no existe, o de tocar cómo se navega entre ellas, hay que
> mirar el prototipo.** No para copiarlo tal cual: para no inventarse una forma distinta cuando
> ya hay una decidida. La aplicación tiene hoy carril agrupado, tarjetas con banda de cabecera,
> cabecera de sección con su frase de para-qué, filas de una línea y densidad de instrumento —
> y una pantalla nueva que no siga eso desentona aunque por sí sola esté bien.
>
> **Cómo se mira**, porque es una aplicación de cliente y un descargador de páginas solo ve el
> cascarón: con el Chromium de Playwright que ya está instalado, y leyendo la captura. Hay un
> guion escrito para fotografiar **las nuestras** en las mismas condiciones,
> `apps/web/e2e/capturas-comparacion.spec.ts`, para poder ponerlas al lado. Escribe en
> `apps/web/capturas-salida/`, que git ignora; para refrescar el juego de referencia del
> repositorio hay que pedirlo: `SALIDA_CAPTURAS=capturas`.
>
> **Y lo que el prototipo NO decide**, porque ya se comprobó copiándolo y salió mal: su
> conmutador DM/Jugador cambia lo que se pinta donde aquí `canView` decide lo que se **envía**;
> su aviso de DM es falso tres veces; ofrece a un jugador un botón que el servidor rechaza; y se
> inventa una tarjeta sin dato detrás. **Si el prototipo y una regla de este documento discrepan,
> manda este documento**, y la discrepancia se declara aquí en vez de dejarla implícita. Las
> siete diferencias deliberadas están enumeradas en
> [la revisión de lo que volvió](./superpowers/specs/2026-09-02-figma-make-revision.md).

- **Ningún valor de enumeración llega nunca a la pantalla.** Ocurrió **tres veces en la misma
  mañana**: el panel de enlaces pintaba `Ciudad Ceniza (LOCATION)`, el selector de visibilidad
  ofrecía `PUBLIC`/`DM_ONLY`, y el título de un diálogo componía `Nuevo LOCATION`. La forma
  legible se escribe **una sola vez por dominio** —`features/entities/resumen.ts` para los
  tipos de ficha, `features/entities/visibilidad.ts` para los niveles— y todo lo demás la
  importa. Si hace falta concordar en género («Nueva misión», no «Nuevo misión»), se escribe
  la frase entera en la tabla en vez de concatenarla en la pantalla.

- **Los iconos se dibujan.** Nada de `☾`, `☀`, `✓` ni emoji como icono: un glifo de fuente se
  pinta a todo color en unos sistemas, como un cuadrado vacío en otros, y nunca se parece al
  resto de la interfaz. SVG en trazo, heredando `currentColor`. `ui/Iconos.tsx` es
  la casa **común**, y `ui/Logo.tsx` / `ui/Ornament.tsx` la marca y el ornamento; además **cada
  módulo grande dibuja los suyos** cuando solo los usa él (`features/rules/iconos.tsx`,
  `features/sessions/iconos.tsx`, `features/level-up/IconoAscenso.tsx`,
  `features/rolls/DadoDibujado.tsx`). Lo que la regla exige es que sean **dibujados**, no que
  vivan en un único fichero; enumerar tres sitios cuando había siete fue una lista que caducó. Un icono que vive
  **dentro de una línea de texto** se dimensiona en `1em`, no en píxeles, para que escale con
  ella. Una auditoría del 2026-09-02 encontró **seis infracciones**, y una de ellas era el
  `✓` que esta misma regla nombra como prohibido: escribir la regla no la aplica, hace falta
  la prueba. La hay, y echa dos redes — un barrido del **código fuente** de esos ficheros
  contra la lista de glifos prohibidos, que caza uno reintroducido donde ninguna prueba monta
  el componente, y el **DOM pintado**, que comprueba que el dibujo se pinta de verdad y
  conserva su `role`. Por eso los comentarios de esos ficheros nombran los glifos **con
  palabras** en vez de escribirlos. **Excepción declarada:** los cinco glifos de `ui/Badge.tsx` (`○ ◐ ◈ ◆ ●`),
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

- **Se toca donde se lee. (Corrige la regla anterior, 2026-09-02 noche.)** Hasta esta fecha
  aquí ponía *«leer y editar son pantallas distintas: una fila lleva a una página de lectura y
  el editor se abre desde ella»*. **Esa regla ya no rige, y se declara aquí en vez de dejar la
  contradicción implícita.** Lo que la tumbó fue la hoja de personaje: tenía **dos** botones de
  «Editar», y el autor pidió que fuera dinámica. La parte de la regla vieja que sí era cierta
  se conserva: el fallo original era **meter el cuerpo de una ficha en un `<textarea>` para
  poder leerlo**, y eso sigue prohibido. Lo que no era cierto es la conclusión que se sacó de
  él. La regla buena es más fina:

  - **Un valor se edita en su sitio**, con la forma que tiene al leerse. Sacar la causa a un
    diálogo rompe justo lo que explica el número: en la hoja de papel, característica →
    modificador → salvación bajan por la misma columna **porque una alimenta a la siguiente**,
    y esa contigüidad *es* la explicación.
  - **Lo irreversible sigue detrás de un botón.** Borrar no se pone a un clic de lo que se
    lee.
  - **La afordancia es información de dominio, no decoración.** Un valor editable lleva un
    subrayado tenue; **un valor derivado no lleva ninguno**, y esa ausencia significa «esto lo
    calculo yo, edita su causa».
  - **Y puede ir cruzada con el tamaño, que es lo que trajo la maqueta el 2026-09-03.** En la
    casilla de característica **lo grande es el modificador —derivado, sin subrayado— y lo
    pequeño la puntuación —editable, subrayada—**, porque en la mesa se usa el modificador y la
    puntuación es solo su causa. La regla nunca dijo que lo editable fuera lo prominente: dice
    que se distinga. Cuando el tamaño y la afordancia apunten a sitios distintos, manda la
    afordancia.
  - **Cómo se guarda depende del gesto, y no se mezclan dos patrones en un mismo formulario.**
    Automático donde el gesto **es** la acción entera (un desplegable, una casilla); explícito
    donde escribir es un proceso (un texto, con Guardar y Cancelar).
  - **El botón de guardar nunca se deshabilita**: deshabilitado no recibe foco de teclado y
    tiene mal contraste, así que quien no ve el formulario no se entera de que existe.
  - **Un rechazo conserva lo tecleado y explica el motivo en línea, nunca en un aviso
    flotante.** Nuestros rechazos son de autorización, y un aviso flotante se ha ido antes de
    que un lector de pantalla llegue a él.

- **Un filtro o una búsqueda en pantalla es de cliente, nunca control de acceso** (tarea
  1.17c · A2/C1, `features/entities/filter.ts`). Opera sobre una lista que el servidor **ya**
  filtró por `canView`; solo puede **quitar de la vista** filas que la persona ya tenía
  derecho a ver — nunca puede añadir ni decidir qué entra en esa lista. Confundir "el
  servidor no lo mandó" con "el cliente lo escondió" es el error exacto que `canView` existe
  para no cometer. Si una tarea futura necesitase filtrar algo que el servidor no manda hoy
  (p. ej. buscar por texto dentro del cuerpo), la búsqueda tiene que hacerse **en el
  servidor**, no ampliando este filtro de cliente para que reciba más de lo que debería.

## Los tokens de color se declaran por CANALES (B0, 2026-09-04)

**La causa de los 49 defectos invisibles está arreglada, y la prohibición que la tapaba se
levanta con su medición de sustituta.** `tailwind.config.js` declaraba los colores como
`var(--muted)`, sin `<alpha-value>`, así que Tailwind no podía construir la variante con
opacidad y **descartaba la utilidad entera, sin avisar**: el elemento se quedaba con el color
del preflight, `#e5e7eb`. La defensa era prohibir `/NN`; dejó de valer el día que la interfaz
de destino llegó escrita con **174** de esas clases.

- **El canal es la fuente**: `--copper-ch: 201 125 70` en `ui/tokens.css`, y
  `tailwind.config.js` compone `rgb(var(--copper-ch) / <alpha-value>)`.
- **El nombre sin sufijo sigue siendo el color pintable** (`--copper: rgb(var(--copper-ch))`),
  derivado una sola vez. Es lo que usan los ~35 `var(--accent)` que viven dentro de un `style`
  o de un SVG. **Un canal NO es un color**: `color: var(--copper-ch)` produce `color: 201 125
  70` y el navegador lo descarta sin decir nada — la trampa nueva, de la misma familia.
- **Un tema redefine solo los canales.** Los derivados se recalculan solos.
- **La escala de opacidad va de 0 a 100 entera**, porque la de Tailwind por defecto tiene
  huecos (`/15`, `/45` y `/62` no existen en ella) y un `/NN` fuera de la escala se descarta
  igual de callado.
- **`/NN` y los tintes NO son lo mismo, y la frontera es el tema.** Un `/NN` vale igual en los
  tres temas; `--accent-tint` y familia valen 14% sobre pizarra y 10% sobre papel, y esa
  diferencia es una decisión. Lo que dependa del tema, tinte; lo demás, `/NN`.

Lo hacen cumplir **dos redes que no se sustituyen**:
`apps/web/src/ui/__tests__/canales-de-color.test.ts` barre el código fuente buscando un canal
usado fuera de un `rgb()` —caza el fallo donde ninguna prueba monta el componente—, y
`apps/web/e2e/clases-que-si-pintan.spec.ts` **mide en el navegador** que un `/NN` compone un
color de verdad, con las clases escritas en `/design-tokens` para que Tailwind las emita.
Comprobado por mutación: al devolver `copper` a `var(--copper)`, la medición devuelve
`rgb(229, 231, 235)` —el gris del preflight— y se pone roja.

## Tres temas, y sus nombres dicen lo que son (B0, 2026-09-04)

**Oscuro** (el instrumento), **Claro** (papel de día — **papel cálido desde el 2026-09-11**, D-OP-10, con las mediciones de contraste calculadas y remedidas en el navegador al cerrar la tanda) y **Lectura** (vitela cálida). Hasta hoy
eran dos y la interfaz llamaba «Lectura (vitela)» al claro, que es gris frío: el rótulo mentía,
y lo arrastraba desde que existe la capa de tokens. Los rótulos viven **una sola vez** en
`ETIQUETA_DE_TEMA` (`ui/theme.ts`), y el conmutador pasó de alternador a **grupo de tres
opciones visibles con su frase**, que es lo que esta misma página exige cuando cada opción
quiere decir algo distinto.

**Divergencia declarada con el prototipo:** su tema de lectura pone un pliego de vitela **claro**
sobre mesa oscura. Se probó y midió **1.02:1** en el texto del panel y **1.51:1** en un enlace,
porque sobre ese pliego todo lo que la aplicación imprime sigue siendo del color del chrome. Un
pliego claro no necesita una tinta: necesita una paleta de hoja entera. Aquí la vitela de
Lectura es oscura y queda ficha en [06-pendientes.md](./06-pendientes.md). Los tokens
`--vellum-ink` / `--vellum-muted` existen ya —hoy alias de `--text`/`--muted` en los tres
temas— porque son la costura por la que entraría ese pliego el día que se decida.

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


**El mismo trato para el límite global (2026-09-03).** `RATE_LIMIT` sube el tope de **todas** las
rutas —100 por IP y minuto— y existe por la misma razón y con la misma regla: la suite de
navegador dispara cientos de peticiones legítimas desde `127.0.0.1`, y con el valor de producción
la API empezaba a devolver **429** a mitad de recorrido. El síntoma engaña: **el fallo cambia de
sitio en cada vuelta**, así que parece código frágil y no lo es. Se fija **solo** en
`apps/web/playwright.config.ts`; un valor vacío o mal escrito cae al de producción, nunca a «sin
límite», y hay pruebas que lo fijan.

**Y desde el 2026-09-11 el cubo del límite global es por USUARIO cuando hay sesión iniciada**
(ficha R1, D-CF-17; `apps/api/src/common/user-or-ip-throttler.guard.ts`). Una mesa juega por una
sola IP —la casa de alguien, una VPN— y con el cubo por IP el sondeo de un jugador gastaba el
presupuesto de los cinco. El guard **verifica** el JWT (no lo decodifica: un `sub` inventado por
petición sería un cubo nuevo por petición) y clava el cubo a `user:<sub>`; sin token válido, la IP.
Las rutas sin sesión —login, registro, aceptar invitación— siguen por IP con su límite estrecho,
que es donde el control protege de verdad. El número no cambia: 100 por minuto.

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

**Playwright y los e2e de API los corre el orquestador, nunca los agentes.** Dos corridas a la
vez dan fallos falsos — ya costó una tanda de cuatro.

**La ranura por worktree ya existe** desde el 2026-09-01 (`scripts/worktree-slot.mjs`,
`pnpm db:slot`, sección «Trabajar en paralelo» de [02-entorno.md](./02-entorno.md)): cada carril
puede tener sus puertos y su base. Aquí ponía «cuando exista la ranura, esta regla se sustituye
por *cada carril, su ranura*», y la condición se cumplió hace días sin que nadie actualizara la
frase. **Aun así la serialización se mantiene**, y por un motivo distinto del original: con
varios agentes trabajando el mismo árbol, quien corre la suite tiene que ver el árbol **entero**
para que un fallo signifique algo. Cuando cada carril viva en su propio worktree, entonces sí:
cada uno su ranura.

**Techo de cinco agentes.** Por encima, las compilaciones se comen la máquina y el cuello deja de
ser el modelo. La recomendación general es 3-5; cinco es sostenible en un equipo con 32 GB.

**El paralelismo mueve el cuello de generar a revisar, y esa es la parte que no se recorta.**
Toda rama pasa por revisión antes de commitear. En la sesión que originó esta sección, los tres
hallazgos críticos los encontró la revisión y ninguno el implementador — y dos de ellos anulaban
justo la protección que su propia tarea añadía.

**Las revisiones sí se paralelizan**, porque son de solo lectura: varias dimensiones a la vez
(seguridad, calidad de pruebas, cascada y accesibilidad) sobre el mismo diff, y el orquestador
junta los hallazgos.

### La frontera del encargo es de ficheros **y** de herramientas

La frontera de rutas de arriba es necesaria y **no basta**: un implementador acotado a `apps/api`
sigue pudiendo desplegar, empujar a `main`, tocar la base o lanzar Playwright encima de la tanda
de otro. La protección era la prosa del encargo, no el sistema.

**Bloque obligatorio en todo encargo, además de la frontera de rutas:**

```text
Y esto es lo que NO haces, pase lo que pase:
- No despliegas. El despliegue lo lanza el autor a mano.
- No corres Playwright ni los e2e de API: los corre el orquestador, y uno a la vez.
- No dejas un `dev:api` arrancado a mano cuando termines, ni compilas la API mientras
  corre una tanda.
- No commiteas: la revisión va antes. No empujas. No lanzas más agentes.
- No desactivas una prueba, ni bajas un umbral, ni silencias una regla, ni saltas el gancho.
- No rediseñas lo ya decidido: si una decisión te parece mala, la cumples y la anotas.
Si crees que necesitas salirte de esta frontera: repórtalo y para.
```

**Por rol, lo que de verdad necesita:**

| Rol | Superficie mínima |
|---|---|
| **Implementador** | Leer · escribir dentro de su frontera · `pnpm verify` y las unitarias de su paquete |
| **Revisor** | **Solo lectura** y compilar para diagnosticar — y **limpiar lo que compile**: un revisor dejó un `dist/` sin rastrear |
| **Explorador / localizador** | Solo lectura |
| **Orquestador** | Todo, porque es quien responde. Y es el único que corre Playwright |

**Y lo que el encargo prohíbe también se comprueba al cerrar la tanda**, no se da por hecho:
`git log` sin commits del implementador, árbol sin ficheros fuera de la frontera, y ningún proceso
suelto — `Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*worktrees*' }`.
Una prohibición que nadie verifica es una sugerencia.

### Observabilidad de la tanda

Cuando algo sale mal en una tanda se reconstruye a mano desde `git log` y desde informes que este
mismo documento declara que **no son evidencia**. Los patrones caros —un agente dando vueltas, dos
suites chocando, una tanda que se comió el contexto sin producir— se detectan a ojo y tarde.

**Quien orquesta escribe esta tabla en el ledger de la tanda**, una fila por tarea:

| Tarea | Vueltas hasta cerrar | Qué encontró la revisión | Tiempo perdido y en qué |
|---|---|---|---|
| T1 | 1 | | |

**Cómo se lee:**

- **Dos vueltas o más señalan un encargo malo, no un agente malo.** Se corrige el brief siguiente.
- **Lo que encuentra la revisión es la métrica del proceso.** Esta sección ya dice que los tres
  hallazgos críticos de aquella sesión los encontró la revisión y ninguno el implementador: eso es
  exactamente lo que esta tabla mide sesión a sesión, en vez de recordarlo una vez.
- Lo que aparezca en «tiempo perdido» —los 82 fallos falsos de dos tandas de Playwright, el
  `dev:api` compartido que costó un diagnóstico entero— es candidato a regla o a tarea del banco
  ([10-banco-de-tareas.md](./10-banco-de-tareas.md)).

## Una duda de reglas se resuelve con la fuente, no con criterio (2026-09-03)

**Regla del autor, y no es opcional:** *«si tienes una duda de reglas o de sistemas o de cómo
funciona algo, investiga con documentos oficiales… tú tienes un montón de herramientas para
resolver, pero eso sí, debes hacerlo»*.

Aplica a las reglas de 5.ª edición, a cómo resuelven un problema las mesas virtuales conocidas, y
a cualquier «yo creo que funciona así». **La cita va en el mismo commit que el código**, y si la
fuente contradice lo que estaba escrito, manda la fuente.

Nació de un caso concreto: en la fase 2B once decisiones de mecánica se **interpretaron** y se
comprobaron después. El contraste salió bien —ninguna regla estaba mal— pero **encontró tres cosas
que no sabíamos**, una de ellas un defecto que ya estaba en pantalla, y la comprobación costó
media hora. Interpretar salía más caro que buscar.

Y en el contraste siguiente, sobre 2C y 2D, la búsqueda **cambió el plan**: el reloj pasa a
guardarse en segundos y no en minutos, la caducidad de una condición pasa a ser automática, la
tabla de dificultades resultó estar en el SRD, y el statblock de un PNJ dejó de ser «transcribir
334 criaturas» porque el SRD ya existe en JSON bajo la misma licencia. Cuatro decisiones que
habrían salido peor a ojo. Ver
[el contraste de 2B](./superpowers/specs/2026-09-03-contraste-de-reglas-2B.md) y
[el alcance de 2C](./superpowers/specs/2026-09-03-fase-2C-alcance-design.md).

## Antes de abrir una ficha: cuatro pasos, y solo el cuarto la abre

**No se abren fichas a la ligera.** Una ficha nueva es una pieza que falta con una nota encima, y
este tablero ya pasa de mil líneas: cada ficha que sobra compite con las que duelen.

Regla del autor, hasta hoy solo escrita en los prompts de arranque. **Es del repositorio**, no de
una sesión concreta.

1. **¿Hay un cambio rápido y duradero** que se alinee con el código que ya existe? Si la solución
   obliga a rehacerla en dos semanas, no es esta.
2. **¿Cumple las reglas?** El SRD y el código que ya existe son verdades probadas. Alterar una
   pide razón de peso, **escrita**.
3. **¿Lo contesta la fuente?** Aquí la fuente es literal y está a mano: **el SRD 5.1** manda, en
   inglés, y después cómo lo resuelve una mesa virtual conocida. La cita va en el mismo commit
   (§ *Una duda de reglas se resuelve con la fuente*). **La maqueta no es fuente de reglas.**
4. **Solo aquí** se abre ficha en [06-pendientes.md](./06-pendientes.md), con lo que se midió y lo
   que se descartó.

**Y no se espera al autor:** si hay solución viable, se aplica.

### Los cuatro casos en los que el paso 1 NO aplica

Sin esta frontera, «si hay solución viable la aplicas» empuja a arreglar en caliente justo lo que
había que preguntar. En estos cuatro casos **se abre ficha directamente y no se toca**:

| Caso | Por qué |
|---|---|
| **Una decisión que ya tomó el autor** | Cumplirla y anotar el desacuerdo, nunca rediseñarla por cuenta propia |
| **Migración o cambio de datos** | Va sola, con su nombre, y no colgada de otro arreglo |
| **Cambio de comportamiento sin una prueba que se le vea fallar antes** | Sin esa prueba no se sabe si el arreglo arregla |
| **Lo que solo se juzga usándolo** | Una pantalla que no se explica no la caza ninguna suite: se anota y se mira con el navegador delante |

**La evidencia de que hace falta**, medida en otro repositorio de este PC el 2026-09-06: aplicados
a siete fichas recién abiertas, **tres se cerraron arreglándolas y dos estaban mal planteadas** —
cinco de siete no debían existir.

## Precedencia

Instrucción del usuario en la sesión > este documento y el `CLAUDE.md` del repositorio >
`~/.claude/dev-rules.md` y `~/.claude/docs-protocol.md` > comportamiento por defecto.
Toda contradicción con las reglas globales se declara **aquí**, no se deja implícita. Hoy **no hay ninguna**: el nivel N1 quedó completo el 2026-08-31.
