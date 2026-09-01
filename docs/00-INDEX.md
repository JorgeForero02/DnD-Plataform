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
| [09-primera-partida.md](./09-primera-partida.md) | **Cómo jugar la primera sesión, qué no se puede hacer todavía y qué anotar.** Es la puerta de salida de la fase 1 |
| [08-pruebas.md](./08-pruebas.md) | **Estrategia de pruebas completa.** Qué prueba cada capa, qué NO cubre, y la regla de Playwright. Léelo antes de dar una tarea por terminada |
| [plataforma-dnd-documentacion.md](./plataforma-dnd-documentacion.md) | Documento fuente original del producto (visión, alcance por fases) |

### Specs y planes

| Documento | Contenido |
|---|---|
| `superpowers/specs/2026-09-01-cierre-fase-1-congruencia-design.md` | **Lo que el sistema puede y la pantalla no ofrece.** Es la tarea 1.17 y **cierra la fase 1** |
| `superpowers/specs/2026-09-01-endurecimiento-seguridad-design.md` | **Auditoría de seguridad con evidencia y el orden de arreglo.** Es la tarea 1.18 |
| `superpowers/specs/2026-09-01-fase-2-alcance-design.md` | **Alcance de la fase 2**: objetos, dados, razas, clases, niveles y la línea de derechos. Manda sobre el plan maestro |
| `superpowers/specs/2026-09-01-fase-3-assets-y-editores-design.md` | **Alcance de la fase 3**: nada de editores de arte; subir, curar e importar |
| `superpowers/plans/2026-07-02-plataforma-dnd.md` | **Plan maestro.** Fase 0 y fase 1 a nivel de tarea; fases 2–5 solo alcance |
| `.superpowers/sdd/progress.md` | **Ledger de ejecución** (fuera de `docs/`): una línea por tarea con commit, tests y resultado de la revisión |

> El ledger y este `07-historial.md` cuentan lo mismo a distinta resolución: el ledger es
> el detalle por tarea que escribe el orquestador durante la ejecución; el 07 es el
> resumen por hito que sobrevive a la sesión.

## Estado actual (2026-09-01)

**Fase 0 completa. Fase 1 COMPLETA —construcción y deuda de interfaz—, en `main`, todo empujado
a GitHub**
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
  (type-check) + ESLint + Prettier + la suite unitaria, aplicado por `.githooks/pre-commit`.
  **Los conteos viven solo en [08-pruebas.md](./08-pruebas.md)** y no se repiten aquí.
  **Playwright (Chromium)** cubre los recorridos de navegador — incluida la
  invitación con dos sesiones de navegador y la comprobación de que un jugador no ve una
  entidad `DM_ONLY` sobre el DOM real —, fuera del gancho y en su propio trabajo de CI. Ver
  [08-pruebas.md](./08-pruebas.md) y [06-pendientes.md](./06-pendientes.md).
- **Sin desplegar.** No hay VPS asignado a este proyecto; el despliegue está diferido.

**Salida de la fase 1: la regla de fase queda SUSPENDIDA por decisión del autor (2026-09-01).**
El plan exige jugar una sesión real antes de empezar la fase N+1. El autor decide **no jugar
hasta tener al menos el tablero 2D (fase 3)**, y posiblemente esperar también a las reglas
(fase 2). Se sigue construyendo sin esa realimentación, **a conciencia y con su riesgo
declarado** en [06-pendientes.md](./06-pendientes.md).

**Cuando se juegue, el guion está escrito.** El guion, las carencias que se van a notar y qué
anotar durante la partida están en [09-primera-partida.md](./09-primera-partida.md). Lo que
conviene arreglar **antes** de sentarse está priorizado en
[06-pendientes.md](./06-pendientes.md), sección "Antes de la primera partida".
