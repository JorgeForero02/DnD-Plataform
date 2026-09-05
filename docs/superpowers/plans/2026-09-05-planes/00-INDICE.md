# Planes de implementación — índice

> **Cómo se usa esto.** Un fichero por plan. Cada uno es autosuficiente: se puede dar entero a una
> sesión limpia sin más contexto. Todos tienen la misma estructura, y las dos secciones que hay que
> leer sí o sí son **«Guía de revisión»** (lo que se comprueba antes de dar nada por hecho) y
> **«Trampas»** (lo que ya mordió una vez).
>
> **Dónde vive esto y qué manda.** Copia de trabajo en `Mine/planes/`; **la del repositorio es la
> que manda**. Los planes son un **encargo fechado**, como cualquier documento de `superpowers/`:
> no se reescriben cuando el código cambia — se marcan como hechos y se anota qué se desvió.
>
> **Estado del árbol al escribir esto:** `main` en `4c7c3a2`, limpio, `pnpm verify` en verde, y sin
> ramas ni worktrees de trabajo abiertos.

## Las reglas que valen para todos los planes

1. **Ninguna tarea se cierra sin prueba real en verde y sin mirar la salida.** Si toca una pantalla,
   se abre el navegador.
2. **Verificación por mutación**: rompe a mano lo que acabas de proteger y comprueba que su prueba
   se pone **roja**. Una prueba que pasa con el código roto no prueba nada — pasó hoy dos veces.
3. **Nunca** desactives una prueba, bajes un umbral ni saltes el gancho de pre-commit.
4. **Un commit por unidad**, mensaje en inglés (Conventional Commits); interfaz y documentación en
   español; **ningún valor de enumeración llega a la pantalla**.
5. **Una sola tanda de Playwright a la vez en esta máquina**, y no compiles la API mientras corre.
6. **`docs/06-pendientes.md` no se toca** mientras el autor mantenga esa instrucción del 2026-09-04.
   Lo que cierres se anota en el commit y en `Mine/pendientes-maestro-2026-09-04.md`. **La auditoría
   que dice qué hay que corregir allí ya está hecha**:
   [`2026-09-05-auditoria-cola-larga.md`](../../specs/2026-09-05-auditoria-cola-larga.md) — le
   faltan **siete fichas por tachar** y una por partir en dos, y **es lo primero que hay que aplicar
   el día que el autor levante la restricción**.
7. **Si algo no se puede hacer como está escrito, se dice y se pregunta.** No se decide por cuenta
   propia y se documenta en un comentario como si fuera un acuerdo — ese fue el fallo que obligó a
   rehacer la mesa entera.
8. **Las reglas de D&D son verdad absoluta** (decisión del autor, 2026-09-05). Si el SRD contesta,
   se aplica; la maqueta **no** es fuente de reglas.

## El avance se anota EN EL PLAN, y no es opcional

**Cada plan tiene al final un bloque «Avance», y quien lo ejecuta lo va rellenando mientras
trabaja.** No al terminar: mientras.

**Por qué, y es la razón de que exista esta sección:** una sesión que se queda sin contexto **no
avisa — empieza a alucinar**. Cuando eso pasa, la siguiente sesión arranca con **el prompt y estos
ficheros**, y nada más. Si el avance vive en la cabeza de la sesión muerta, se ha perdido; si vive
aquí, la siguiente sabe **en qué paso estaba, qué se decidió y qué toca ahora** sin auditar el
repositorio entero para averiguarlo.

Cada bloque pide cuatro cosas: **el estado paso a paso con su commit**, **lo decidido por los cuatro
pasos** —qué no cuadraba, qué se eligió, por qué dura y con qué fuente—, **lo siguiente exacto**, y
lo que quedó **bloqueado** con lo que se descartó antes de bloquearlo.

**Regla que gobierna todo lo que se escriba ahí: `fichero:línea` o no cuenta.** Nada de memoria — es
justo el error que dejó siete fichas afirmando que faltaba algo ya hecho.

## El orden, y por qué

| # | Plan | Depende de | Toca | Por qué va ahí |
|---|---|---|---|---|
| **01** | [Las tres baratas](01-tres-baratas.md) | — | build, CI | **El fallo de TipTap solo aparece en producción.** Cuanto antes, menos riesgo, y es un commit |
| **02** | [Las tres columnas](02-tres-columnas.md) | — | `prisma`, API | Tres migraciones pequeñas juntas. **Desbloquea el 03 y la línea de tiempo** |
| **03** | [El carril del motor](03-carril-del-motor.md) | 02 | API | Cinco fichas de servidor. `D-OP-12` primero: **desbloquea otras dos** |
| **04** | [El hilo como conversación](04-hilo-conversacion.md) | — | web | Decisión D1. Independiente de todo lo demás |
| **05** | [El color de cada personaje](05-color-por-personaje.md) | — | `prisma`, API, web | Decisión D3. Arregla dos fichas con un campo |
| **06** | [Un gesto, un dueño](06-gestos.md) | — | web | Archivar (M9) y **un solo** «Revelar». Cierra la última de D-OP-8 |
| **07** | [Consolidación](07-consolidacion.md) | 06 | web | 76 iconos, vocabulario del daño, `type: tipo`. **Ningún carril podía hacerlo** |
| **08** | [Inspiración y Ayudar](08-inspiracion-y-ayudar.md) | — | API, web, shared | Las dos del SRD que la maqueta pintaba mal |
| **09** | [La batuta](09-la-batuta.md) | — | API, web | `DM_EXECUTED` y retirar `ENTITY_ATTACKED`. **Hace útil el motor para preparar** |
| **10** | [La documentación](10-documentacion.md) | los demás | `docs/` | Va **al final**: escribe lo decidido y lo hecho, de una vez |
| **11** | [La administración de la mesa](11-administracion-de-la-mesa.md) | — | API, web | El rol es **inmutable de por vida** y las invitaciones **no se pueden listar ni revocar** |
| **12** | [El aviso](12-el-aviso.md) | — | API, web | Las notificaciones existen por dentro y **nadie las ve**. Va junto al nervio en vivo, o se hace dos veces |
| **13** | [Modificadores temporales](13-modificadores-temporales.md) | — | shared, API, web | **Lo pidieron los jugadores** y no está en ningún plan |
| **14** | [Pulido y mediciones](14-pulido-y-mediciones.md) | — | web (+U3 API) | Fichas de interfaz de septiembre, y **volver a medir las que hablan de una pantalla que ya no existe** |
| **15** | [El crítico y lo pequeño](15-el-critico-y-lo-pequeno.md) | 03 | shared, API, web | La única ficha que quedó **declaradamente a medias**, y tres de una línea |

## De qué ficha sale cada plan

**Trazabilidad de la auditoría de la cola larga** ([la auditoría](../../specs/2026-09-05-auditoria-cola-larga.md)), para
que nadie trabaje dos veces ni deje una fuera:

| Ficha viva | Plan que la cierra |
|---|---|
| TipTap en `devDependencies` | **01** |
| P3 «dónde se quedó» | **02** + **03** |
| P2 oráculo de la CA · P2 `GameEvent` sin concesiones · P3 archivar no llega a su dueño | **03** |
| C6-3 vocabulario del daño triplicado | **07** |
| M9 archivar sin pantalla | **06** |
| D2 rol inmutable · D3b invitaciones · A3 caducidad | **11** |
| N1 los dos avisos sin emisor · A1-avisos la bandeja | **12** |
| M8 modificadores temporales | **13** |
| U1 · U3 · U8 · U9 · U2 · U7 · R1 · C6-4 | **14** |
| C2.5-2 (mitad web) · C6-2 · D3 salud · `tags` sin unicidad | **15** |
| C2.5-2 (mitad servidor, D-OP-15) | **03** |

**Las que NINGÚN plan cubre, y es a propósito:**
- **Las siete cerradas** y la mitad falsa de **M10**: son trabajo de `docs/`, plan **10**.
- **La sobrecarga** (I4 / M2B-5): es una **regla variante del SRD** y pide decisión del autor —
  interruptor por campaña— antes que código.
- **Lo del servidor** (D5 restauración probada, D7 `TRUST_PROXY`, D8 correo, la copia de seguridad):
  se hace **en `vps1new`**, no aquí, y va en el bloque G del maestro.
- **S2–S10** (catálogo SRD) y **M2B-4/8/11/12/14**: piden leer specs enteras. **Una tarde propia**,
  no un plan de una noche.

**Los dos grandes, que piden diseño antes que código y NO entran en una noche:** la **línea de
tiempo** (D4) y la **barra de acciones con su economía de turno** (I21). Tienen su nota al final.

**La auditoría de la cola larga ya está hecha** (2026-09-05): las 55 secciones contrastadas contra el
código, en [la auditoría](../../specs/2026-09-05-auditoria-cola-larga.md). Lo que queda de ella es **escribirla en
`docs/`**, y eso es el plan 10.

## Si trabajas en paralelo

**Partición por ficheros, sin excepciones.** Estos tres grupos no se tocan entre sí:

```
SERVIDOR   01 · 02 · 03                   apps/api/**  packages/shared/**  prisma/**
WEB        04 · 06 · 07 · 14              apps/web/src/**
MIXTO      05 · 08 · 09 · 11 · 12 · 13 · 15   tocan los dos lados: van SOLOS
```

**Worktrees con su slot**: `WORKTREE_SLOT=1..5` da puertos y base propios
(`scripts/worktree-slot.mjs`). Sin eso se pelean por el 3000 y el 5173.

> **Y una que pasó hoy y costó un diagnóstico entero:** al terminar, **mata tus procesos**. Cuatro
> `dev:api` huérfanos de un worktree quedaron vivos nueve horas, ocuparon el puerto 3000 y sus
> timeouts se le achacaron a otra sesión. `Get-CimInstance Win32_Process | Where-Object
> { $_.CommandLine -like '*worktrees*' }` los encuentra.

## Los dos grandes

**Línea de tiempo de la campaña (D4).** Sustituye al tablero telaraña. Encargo del autor con su
dibujo delante, en `docs/superpowers/specs/2026-09-02-prompt-figma-make.md:501`: **cuadrados la
misión principal, círculos las secundarias**, mapa de rutas y no lista con fechas, **rutas
alternativas** que se bifurcan y vuelven, y **lo que no pasó** como camino sin recorrer. Se genera
sola de lo ocurrido, **se edita y se coloca a mano**, y **respeta la visibilidad: el jugador ve su
versión de la historia**. Necesita el `openingEntityId` del plan 02. **Pide una sesión de diseño
propia.**

**Barra de acciones y economía de turno (I21).** Tres piezas y en este orden: la barra con lo que ya
existe (ataques, objetos, recursos, espacios de conjuro); **la economía de turno del SRD** —
movimiento + una acción + **como mucho una adicional** + **una reacción** + una interacción gratuita
— y las **diez acciones** como vocabulario cerrado; y los conjuros, que son fase propia. **Sin la
economía, la barra no impide nada.**

**Nota histórica — la cola larga.** 55 secciones de `docs/06-pendientes.md` de fase 1, 2A y 2B que **nadie ha
contrastado contra el código**. El único día que se miraron, **cuatro fichas se cerraron solas**.
Es una auditoría ficha por ficha, y va en un commit aparte de cualquier decisión.
