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
| [03-despliegue.md](./03-despliegue.md) | Coolify + Docker en **vps1new**, dominio `dnd.supportive.pro`. **En producción desde el 2026-09-02** |
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
| `superpowers/specs/2026-09-02-respuestas-jugadores-design.md` | **Lo que contestaron los jugadores a las ocho preguntas, y qué cambia.** Tres cambian el diseño y una contradice una exclusión declarada de la fase 2 (los conjuros). **Se lee con el informe de huecos** |
| `superpowers/specs/2026-09-01-huecos-fase-2-design.md` | **Lo que una mesa real necesita y el alcance de la fase 2 no modela.** Doce huecos con su coste de construir ahora y de añadir después, más 16 preguntas para el autor. **Se lee antes de ejecutar 2A**, porque cuatro de ellos cambian la forma de una tabla |
| `superpowers/specs/2026-09-01-fase-3-assets-y-editores-design.md` | **Alcance de la fase 3**: nada de editores de arte; subir, curar e importar |
| `superpowers/specs/2026-09-02-auditoria-interfaz.md` | **Por qué la interfaz se rehízo**, medido sobre capturas de producción con datos reales. Registro fechado |
| `superpowers/specs/2026-09-02-identidad-visual-design.md` | **La identidad «Sala de guerra»** y su porqué. Manda sobre color, tipografía y ornamento |
| `superpowers/specs/2026-09-02-hoja-5e-design.md` | **La hoja de 5.ª edición**: anatomía, todas las fórmulas del SRD 5.1 y los cuatro huecos. **La lee la fase 2A antes de tocar el esquema** |
| `superpowers/specs/2026-09-02-ux-herramientas-estudio.md` | Cómo lo resuelven World Anvil, Kanka, Foundry, Linear y compañía. Material del reseño |
| `superpowers/specs/2026-09-02-identidad-direcciones-estudio.md` | Las tres direcciones visuales estudiadas, **incluidas las dos descartadas** |
| `superpowers/specs/2026-09-02-formularios-estudio.md` | Diseño de formularios y diálogos (NN/g, GOV.UK, Adam Silver). De aquí salieron los radios de visibilidad |
| `superpowers/specs/2026-09-02-seis-peticiones-analisis.md` | **Qué se hace con las seis peticiones del autor y dónde va cada una.** Incluye el diseño del **sistema de eventos suceso–condición–efecto** y por qué el lienzo de cajas va después |
| `superpowers/plans/2026-09-02-reseno-interfaz.md` | **Plan del reseño de interfaz**: las seis tandas y sus dos fronteras |
| `superpowers/plans/2026-07-02-plataforma-dnd.md` | **Plan maestro.** Fase 0 y fase 1 a nivel de tarea; fases 2–5 solo alcance |
| `superpowers/plans/2026-09-01-tarea-1.17-cierre-fase-1.md` | Plan de la tarea 1.17: las cuatro subtareas que cerraron las incongruencias de la fase 1 |
| `superpowers/plans/2026-09-01-fase-2A-motor-y-hoja-de-personaje.md` | **Plan de la fase 2A** (borrador): motor de reglas determinista, hoja de personaje y once tareas. **Contiene una decisión de arquitectura que espera firma del autor (§1, el estado de la partida) y ocho preguntas que hay que contestar antes de empezar (§8)** |
| `.superpowers/sdd/progress.md` | **Ledger de ejecución** (fuera de `docs/`): una línea por tarea con commit, tests y resultado de la revisión. **Está en `.gitignore`: es local a esta máquina y no viaja con el clon** |

> El ledger y este `07-historial.md` cuentan lo mismo a distinta resolución: el ledger es
> el detalle por tarea que escribe el orquestador durante la ejecución; el 07 es el
> resumen por hito que sobrevive a la sesión.

## Dónde está el estado actual

Este documento es un mapa: enlaza y explica para qué sirve cada cosa, y no afirma nada sobre
en qué punto está el código. Esa separación es deliberada — en una sola sesión este fichero
mintió tres veces porque mezclaba el mapa con estado escrito a mano, y un documento que solo
apunta no puede contradecir nada. Para saber qué es cierto **hoy**:

- **Qué se ha entregado, cuándo y por qué** (tarea a tarea, con cómo revertir cada una):
  [07-historial.md](./07-historial.md), entrada más reciente primero.
- **Qué queda abierto, con prioridad y motivo**: [06-pendientes.md](./06-pendientes.md).
- **Qué prueba cada capa y los conteos de pruebas**: [08-pruebas.md](./08-pruebas.md).
- **El guion de la primera partida y qué falta antes de jugarla**:
  [09-primera-partida.md](./09-primera-partida.md).

Lo único que sí vive aquí es el bloque de abajo, y no lo escribe una persona:

<!-- estado:inicio -->
> **Este bloque lo escribe una máquina (`pnpm update:estado`) y no se edita a mano.**
> `pnpm verify` falla si no coincide con lo que el script generaría — ver
> `scripts/update-estado.mjs`.
>
> - **Generado sobre el commit** `2dd16e0` **(rama `main`)** — instantánea de la
>   última vez que alguien ejecutó `pnpm update:estado`, no un valor comprobado:
>   `pnpm verify` solo vuelve a calcular las pruebas unitarias de abajo, nunca este
>   commit ni esta rama, así que pueden quedar desactualizados varios commits — no
>   necesariamente solo uno — sin que `check:estado` lo detecte.
> - **Pruebas unitarias:** 347 (shared 20, api 92, web 235). Recuento por declaración, no por
>   ejecución — ver el comentario al principio del script que lo genera. Los conteos de
>   e2e, que esto no genera, están en [08-pruebas.md](./08-pruebas.md).
<!-- estado:fin -->
