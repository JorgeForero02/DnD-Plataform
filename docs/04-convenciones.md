# Convenciones

## Nivel de verificación: **N1 incompleto** (excepción declarada)

El comando que define el nivel es:

```
pnpm verify   =   pnpm build && pnpm test
```

`pnpm build` compila los tres paquetes con `tsc` / `nest build` / `vite build`, así que
**hace de type-check**; `pnpm test` corre las 54 unitarias. Medido el 2026-08-31: pasa.

**Lo que falta para ser N1 de verdad, según `~/.claude/dev-rules.md`: el linter y el
formateador.** ESLint **no está instalado** — los tres paquetes declaran un script `lint`
que falla con *"eslint no se reconoce"*, y el workflow de CI omite el lint con un comentario
explícito. Prettier está en las dependencias de la raíz pero **sin configuración y sin
script**, o sea que tampoco se aplica.

> Esto es una **excepción declarada, no un descuido**: el proyecto no puede exigir N1 hoy
> porque no tiene el comando que lo prueba, y `dev-rules` prohíbe declarar un nivel sin él.
> Cerrarla es la **P1** de [06-pendientes.md](./06-pendientes.md) y es **una tarea propia**,
> no un efecto colateral de la próxima funcionalidad. Cuando entre, `verify` pasa a ser
> `build && lint && test` y esta sección se reescribe.

Reglas que sí aplican desde ya, sin excepción:

- **Ninguna tarea se marca completa sin prueba real en verde.** API: unitaria + e2e. Web:
  RTL + `build` limpio. Ver [08-pruebas.md](./08-pruebas.md).
- **Nunca** desactivar una prueba, bajar un umbral ni silenciar un aviso para que pase el
  build.
- **Evidencia antes que afirmación:** no se dice "pasa" sin haber corrido el comando y
  mirado la salida. Si falla, se pega la salida.
- N2 (cobertura) y N3 (mutación) **no están declarados** y no se prometen.

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

## Precedencia

Instrucción del usuario en la sesión > este documento y el `CLAUDE.md` del repositorio >
`~/.claude/dev-rules.md` y `~/.claude/docs-protocol.md` > comportamiento por defecto.
Toda contradicción con las reglas globales se declara **aquí**, no se deja implícita. Hoy
hay exactamente una: el nivel N1 incompleto de arriba.
