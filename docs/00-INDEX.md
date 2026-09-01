# D&D Platform — índice de documentación

Plataforma web para gestionar campañas de D&D: mundo (NPCs, lugares, misiones,
facciones, objetos, eventos, documentos enlazados entre sí tipo wiki), sesiones y
personajes, con **cinco niveles de visibilidad** por objeto para que el DM decida qué
ve cada jugador. Herramienta propia para la mesa del autor primero; SaaS después si
funciona.

**No es** (todavía) un motor de reglas, ni mapas, ni tiempo real, ni 3D, ni IA: eso son
las fases 2–5 y cada una recibe su propio plan cuando se llega. Contenido legal
limitado a SRD 5.1 / OGL.

## Mapa de documentos

| Documento | Contenido |
|---|---|
| [01-arquitectura.md](./01-arquitectura.md) | Monorepo, capas, módulos, dirección de dependencias |
| [02-entorno.md](./02-entorno.md) | Levantar el proyecto en local, variables de entorno, gotchas de Windows |
| [03-despliegue.md](./03-despliegue.md) | Coolify + Docker. **No desplegado: no hay VPS asignado** |
| [04-convenciones.md](./04-convenciones.md) | Nivel de verificación declarado, convenciones de API y de web |
| [05-datos.md](./05-datos.md) | Esquema Prisma, migraciones, el modelo de visibilidad |
| [06-pendientes.md](./06-pendientes.md) | Deuda técnica y decisiones abiertas, con prioridad |
| [07-historial.md](./07-historial.md) | Qué se entregó, por qué y cómo revertirlo |
| [08-pruebas.md](./08-pruebas.md) | **Estrategia de pruebas completa.** Qué prueba cada capa, qué NO cubre, y la regla de Playwright. Léelo antes de dar una tarea por terminada |
| [plataforma-dnd-documentacion.md](./plataforma-dnd-documentacion.md) | Documento fuente original del producto (visión, alcance por fases) |

### Specs y planes

| Documento | Contenido |
|---|---|
| `superpowers/plans/2026-07-02-plataforma-dnd.md` | **Plan maestro.** Fase 0 y fase 1 a nivel de tarea; fases 2–5 solo alcance |
| `.superpowers/sdd/progress.md` | **Ledger de ejecución** (fuera de `docs/`): una línea por tarea con commit, tests y resultado de la revisión |

> El ledger y este `07-historial.md` cuentan lo mismo a distinta resolución: el ledger es
> el detalle por tarea que escribe el orquestador durante la ejecución; el 07 es el
> resumen por hito que sobrevive a la sesión.

## Estado actual (2026-09-01)

**Fase 0 completa. Fase 1 — construcción COMPLETA, en `main`, todo empujado a GitHub**
(`JorgeForero02/DnD-Plataform`). Falta usarla en una mesa real antes de dar la fase por
cerrada (ver la regla de fase abajo).

- **API de la fase 1: completa.** Campañas, membresías, invitaciones, entidades,
  enlaces, comentarios, sesiones, personajes y listado de miembros.
- **Web de la fase 1: completa.** Login/registro, lista de campañas, detalle con pestañas,
  editor de entidades con panel de enlaces y comentarios (1.12b), editores de sesión y
  personaje (1.13), y flujo de invitación de punta a punta (1.14, endurecido en 1.14-fix): el
  DM genera y copia un enlace de un solo uso, y `/join/:token` lo acepta cubriendo los tres
  casos — sin sesión, confirmación con clic explícito antes de aceptar, token inválido o ya
  usado.
- **Verificación: nivel N1, con el comando que lo prueba.** `pnpm verify` = build
  (type-check) + ESLint + Prettier + 106 unitarias, aplicado por `.githooks/pre-commit`.
  Medido el 2026-09-01: ✅, más 19 e2e de API contra Postgres real ✅.
  **Playwright (Chromium)** cubre cinco recorridos de navegador en dos suites — incluida la
  invitación con dos sesiones de navegador y la comprobación de que un jugador no ve una
  entidad `DM_ONLY` sobre el DOM real —, fuera del gancho y en su propio trabajo de CI. Ver
  [08-pruebas.md](./08-pruebas.md) y [06-pendientes.md](./06-pendientes.md).
- **Sin desplegar.** No hay VPS asignado a este proyecto; el despliegue está diferido.

**Salida de la fase 1:** jugar una sesión real en la mesa. Regla de fase: no se empieza la
fase N+1 hasta que la fase N se haya usado de verdad.
