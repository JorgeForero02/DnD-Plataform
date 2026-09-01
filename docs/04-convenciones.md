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
- Estilo: Tailwind, oscuro (`bg-slate-900/800/700`, `indigo-600` para acción, `red-400` para
  error), textos en español.
- **Sin sistema de diseño para el MVP.** Decisión explícita: interfaz funcional y limpia,
  YAGNI. Cuando haga falta, será una tarea con su ficha.
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

## Precedencia

Instrucción del usuario en la sesión > este documento y el `CLAUDE.md` del repositorio >
`~/.claude/dev-rules.md` y `~/.claude/docs-protocol.md` > comportamiento por defecto.
Toda contradicción con las reglas globales se declara **aquí**, no se deja implícita. Hoy **no hay ninguna**: el nivel N1 quedó completo el 2026-08-31.
