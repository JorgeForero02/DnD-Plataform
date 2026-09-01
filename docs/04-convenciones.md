# Convenciones

## Nivel de verificación: **N1**

El comando que define el nivel es:

```
pnpm verify   =   pnpm build && pnpm lint && pnpm format:check && pnpm test
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
- `pnpm test` corre las 54 unitarias.

**Lo aplica `.githooks/pre-commit`, que bloquea el commit si `pnpm verify` falla.** El gancho
se conecta solo en el `prepare` de la raíz (`scripts/install-git-hooks.mjs`), que **nunca
falla si no hay repositorio git** porque las imágenes Docker se construyen sin `.git`. CI
corre lo mismo, más los e2e.

**No se desactiva el gancho para saltárselo.** Si el control molesta, se arregla el código o
se cambia el control como decisión declarada aquí.

Medido el 2026-08-31 tras instalar la herramienta: `pnpm verify` pasa, 54 unitarias y 19 e2e
verdes.

**Fuera de N1, a propósito:** los e2e de API (necesitan Docker) y los de navegador (cuando
existan: necesitan Docker y dos servidores vivos). Encadenarlos al gancho lo haría
inservible. **No por eso son opcionales** — ver [08-pruebas.md](./08-pruebas.md).

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
  invalida lo de dentro.
- Formularios: React Hook Form + `zodResolver` para los simples; `useState` controlado para
  los dinámicos (listas de etiquetas, selección de jugadores).
- Estilo: Tailwind, oscuro (`bg-slate-900/800/700`, `indigo-600` para acción, `red-400` para
  error), textos en español.
- **Sin sistema de diseño para el MVP.** Decisión explícita: interfaz funcional y limpia,
  YAGNI. Cuando haga falta, será una tarea con su ficha.

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

## Precedencia

Instrucción del usuario en la sesión > este documento y el `CLAUDE.md` del repositorio >
`~/.claude/dev-rules.md` y `~/.claude/docs-protocol.md` > comportamiento por defecto.
Toda contradicción con las reglas globales se declara **aquí**, no se deja implícita. Hoy **no hay ninguna**: el nivel N1 quedó completo el 2026-08-31.
