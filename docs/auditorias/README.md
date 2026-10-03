# Registro de auditorías

**Para qué sirve:** comparar una auditoría con la anterior. Una auditoría aquí es una revisión a fondo de
**una** funcionalidad buscando fallos, con un segundo agente («refutador») que intenta desmentir cada
hallazgo. Una línea por auditoría. Lo que importa comparar entre auditorías no es el total de hallazgos, sino **la
tasa de refutados** (si sube, el encargo se degradó) y **los reaparecidos** (miden el sistema). Método:
skill `auditoria-por-funcionalidad`, § *El registro de auditorías*.

**Las cinco de antes de este registro se reconstruyen de sus informes**: donde el informe no da un campo,
dice «no consta». No se rellenan de memoria.

| Fecha | Funcionalidad | Pedida por | Frentes + refutadores | Modelo | CRÍT | ALTO | MEDIO | BAJO | Refutados | Con reservas | Citas inventadas | Reaparecidos | Tokens de subagente |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2026-09-02 | Interfaz | autor | no consta (método: capturas con Playwright de cada pantalla en producción; sin refutador citado) | no consta | no consta | no consta | no consta | no consta | no consta | no consta | no consta | — (primera) | no consta |
| 2026-09-02 | Mesa de agentes: un DM y un tramposo contra la API real | autor | 2 agentes (un DM que juega, un tramposo que ataca la autorización); refutadores: no consta | no consta | no consta | no consta | no consta | no consta | no consta | no consta | no consta | no consta | no consta |
| 2026-09-03 | Mecánica de 2B | autor | 2 frentes con 1 refutador cada uno | no consta | no consta | no consta | no consta | no consta | 0 | no consta | no consta | no consta | no consta |
| 2026-09-05 | Cola larga | autor | no consta (un solo lector; sin refutador citado) | no consta | no consta | no consta | no consta | no consta | no consta | no consta | no consta | no consta | no consta |
| 2026-09-19 | Interfaz sobre el prototipo navegable | autor | no consta | no consta | no consta | no consta | no consta | no consta | no consta | no consta | no consta | no consta | no consta |

**Qué dan y qué no dan los informes, campo a campo:**

- **Severidades.** Ningún informe usa la escala CRÍT/ALTO/MEDIO/BAJO ni da totales. La interfaz del
  2026-09-02 agrupa por tipo (A a E); la mecánica de 2B lista lo arreglado y las fichas abiertas
  M2B-1 a M2B-12 sin gravedad; la cola larga cuenta fichas (7 cerradas, 14 vivas confirmadas, 3 con la
  descripción caducada), no fallos; la interfaz del 2026-09-19 marca cada fila como Alta, Media o Baja
  pero **no suma**. Los totales no se calculan aquí: no son un dato del informe.
- **Refutados.** Solo la de 2B lo dice: «los refutadores no tumbaron ninguna afirmación» (0), pero
  corrigieron cuatro cosas: dos citas de fichero equivocadas, una regla del SRD mal citada y una conclusión
  más fuerte de lo que el código sostiene. No las clasifica como «con reservas» ni como «citas inventadas»,
  así que esas columnas siguen en «no consta».
- **Mesa de agentes.** El tramposo no encontró ningún hueco de seguridad; el DM encontró cuatro fallos de
  corrección, arreglados el mismo día. Su tabla de detalle ya no está en el `06` (se archivó); el resumen
  sí.
- **Modelo y tokens.** Ningún informe los menciona.

**Informes:** [interfaz 2026-09-02](../superpowers/specs/2026-09-02-auditoria-interfaz.md) ·
mesa de agentes: [06-pendientes.md](../06-pendientes.md), «Mesa de agentes del 2026-09-02» ·
[mecánica 2B](../superpowers/specs/2026-09-03-auditoria-de-mecanica-2B.md) ·
[cola larga](../superpowers/specs/2026-09-05-auditoria-cola-larga.md) ·
[interfaz 2026-09-19](../_archivo/auditoria-interfaz-2026-09-19.md).

La auditoría de adopción de la plantilla (2026-10-03) no es de una funcionalidad y no entra en la tabla;
su informe y su refutación están fuera del repositorio, en la carpeta «Auditoria plantilla 2026-10-03» del
autor (refutación P29).

**Los hallazgos viven en su informe** hasta que el autor decide cuáles entran al tablero (regla 7 de la
sección A.4 de [04-convenciones.md](../04-convenciones.md)).

## Lecciones de método

- 2026-09-02 — la mesa de agentes contra la API real encontró lo que las suites no veían (detalle en su sección del `06`).
- 2026-09-03 — sin refutador, tres de las nueve correcciones de 2B se habrían escrito como hallazgos y una como arreglo equivocado (lo dice el propio informe).
