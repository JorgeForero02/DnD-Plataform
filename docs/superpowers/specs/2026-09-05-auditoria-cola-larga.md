# Auditoría de la cola larga — 2026-09-05

> **Qué es esto.** `docs/06-pendientes.md` (1362 líneas, 55 secciones) leído entero y contrastado
> contra el código del árbol en `4c7c3a2`. **El fichero NO se ha tocado**, por instrucción del autor:
> esto es el informe, y las correcciones se aplicarán allí cuando él levante esa restricción.
>
> **Método y su límite, dicho por delante.** Una ficha se marca **cerrada** solo con un
> `fichero:línea` que lo pruebe. Una ficha que afirma algo **no comprobable con el código** —una
> decisión de alcance, una preferencia, un riesgo— **no se juzga aquí**: se clasifica como tal. Y una
> ficha que no he podido resolver **se dice**, en vez de adivinar.

---

## Resumen

| | Cuántas | Qué significa |
|---|---|---|
| **Cerradas y el documento no se ha enterado** | **7** | El código ya hace lo que la ficha pide |
| **Vivas, confirmadas midiendo** | **14** | Siguen siendo verdad hoy |
| **Vivas pero con la descripción caducada** | **3** | El problema existe; lo que dice de él ya no es exacto |
| **No son deuda: son decisión o alcance** | ~18 | No se cierran comprobando código |
| **Sin comprobar, y lo digo** | ~14 | Piden medición en navegador, en el servidor, o leer specs enteras |

**La conclusión que importa:** la cola larga **no está podrida**, pero **siete fichas mienten**, y
todas mienten en la misma dirección — dicen que falta algo que **ya está hecho**. Es el mismo patrón
que este documento ya se cazó a sí mismo dos veces.

---

## 1 · Cerradas: el código ya lo hace

| Ficha | Qué decía | La prueba de que ya no es verdad |
|---|---|---|
| **N2** | *«`recordEntityOpened` está implementado y NO está conectado al módulo de entidades»* | **Está conectado**: `entities.service.ts:131` lo llama. `ENTITY_OPENED` se escribe |
| **C6-5** | *«el ±5 del elenco sigue mandando `{ delta }`»*, así que las resistencias no se cobran desde la mesa | **Ya manda el tipo**: `sessions/elenco/PonerDano.tsx:125` — `...(tipoDeDano ? { damageType: tipoDeDano } : {})`. **La mecánica insignia de 2.5.1 ya ocurre en partida** |
| **C6-1** | *«los cuatro disparadores siguen sin `case`»* y *«la lista está duplicada»* | Cerrada hoy: dos disparadores existen y **la lista vive una sola vez** en `@dnd/shared`. Los otros dos están retirados con su motivo |
| **Barra de sesión** | *«`BarraDeSesion` y la cabecera se pelean por la misma banda; las dos son `sticky top-0`»* | **Arreglado**: `BarraDeSesion.tsx:45` define `PEGADA_BAJO_LA_CABECERA` y el `sticky` lo lleva el envoltorio. Además la mesa ya no vive dentro de `AppShell` |
| **Interfaz en inglés** | *«la pantalla de entrar dice Email, Password y Log in»* | **Cero coincidencias** en `pages/LoginPage.tsx`. Ya está en español |
| **`ui/Iconos.tsx` sin icono de inventario** | *«la hoja dibuja un `IconoArcon` local»* | Ya hay icono de bolsa/mochila en `ui/Iconos.tsx` — y lo que queda es el problema **contrario**: duplicados (plan 07) |

**Y una a medias, que es la más peligrosa de todas:** **M10** dice *«hoy `EntityVisibilityGrant` se
crea y no se quita»*. **Es falso**: `entities.service.ts:171` hace `deleteMany` y reescribe las
concesiones al editar, así que **revocar sí se puede**. Lo que sigue vivo de esa ficha es la otra
mitad —*el DM edita en silencio*, la hidra falsa—, que es un problema distinto. **La ficha hay que
partirla en dos**, no cerrarla ni dejarla como está.

## 2 · Vivas, confirmadas midiendo

| Ficha | Confirmado con |
|---|---|
| **C2.5-2** · el crítico atado a medias | **0 ficheros** de `apps/web` mandan `attackRollEventId`, y `critical` sigue en el esquema. Las dos mitades siguen abiertas |
| **C6-2** · `GET statblocks` sin `visibility` | `aStatblock()` (`statblocks.service.ts:185`) **no** incluye el campo; el servicio filtra por él pero no lo devuelve |
| **C6-3** · vocabulario del daño triplicado | **Tres** vocabularios con `NOMBRE_TIPO_DANO`. Plan 07 |
| **C6-4** · `tempHp` sin gesto que los conceda | Se pinta, nadie los da |
| **P3** · «dónde se quedó» | El listado sigue sin la crónica. Plan 02 + 03 |
| **P2** · el oráculo de la CA | Sin comprobación de `canView`. Plan 03 |
| **P2** · `GameEvent` sin concesiones | `grantedUserIds: []`. Plan 03 |
| **P3** · archivar no llega a su dueño | Misma raíz. Plan 03 |
| **M9** · archivar sin pantalla | **Cero** referencias en `apps/web`. Plan 06 |
| **N1** · dos avisos que nadie emite | `COMMENT_ADDED` y `SESSION_SCHEDULED`: **0 emisores** |
| **A1-avisos** · la bandeja no existe por fuera | **0 ficheros** de la web mencionan notificaciones |
| **D3** · sin endpoint de salud | **0** controladores de salud |
| **D2 / D3b** · rol inmutable, invitaciones sin listar ni revocar | El controlador de invitaciones **no tiene `GET` ni `DELETE`**; el de campañas no cambia roles |
| **TipTap en `devDependencies`** | Los seis siguen ahí. Plan 01 |

**Y tres más que confirmé de pasada:** `tags` **sigue sin unicidad** en el esquema · **la
sobrecarga no penaliza** (0 referencias) · **no existe el modificador temporal con caducidad** (M8,
0 referencias) — que es, recuerda, **una de las cosas que los jugadores pidieron por su nombre**.

## 3 · Vivas, pero su descripción ya no es exacta

- **R1 · el arrastre del editor de reglas.** El diagnóstico escrito culpa al contexto del diálogo…
  **y ese contexto ya no existe**: la Ola 0 convirtió `Dialog` de cuadro centrado con `max-h-[85vh]`
  a cajón a altura completa. **La ficha no está cerrada ni abierta: está sin medir.** Es D-OP-19 y
  vence ahora.
- ~~**I5 · equipar no deja rastro.**~~ **CERRADA, comprobada el 2026-09-05.** `ITEM_MOVED` lleva
  `from`/`to` con `EQUIPPED`/`CARRIED`/`STORED`, más `slot` y `attuned`
  (`game-event.schema.ts:350-357`), y lo escribe `inventory.service.ts:413`. Equipar **sí** deja
  rastro. Sube al §1: son **siete**, no seis.
- **I9 · el conteo de unitarias es una cota inferior.** Correcta, pero **no es deuda**: el propio
  `scripts/update-estado.mjs` lo declara en su cabecera y explica por qué se acepta. Es un
  compromiso escrito, y en la lista de pendientes se lee como un defecto.

## 4 · No son deuda: son decisión o alcance

No se cierran comprobando código, y **mezcladas con la deuda hacen que la lista parezca el doble de
larga de lo que es**. Deberían vivir en `docs/decisiones.md` o en el plan de su fase:

**La pantalla de juego con mapa** (es la fase 3, y el autor se la reserva) · **los cuatro huecos del
alcance de la fase 2** (H1–H4, **ya tachados como cerrados** en el propio documento) · **las
decisiones de 2C y 2D**, que la sección misma titula «cerradas» · **lo que dijeron los jugadores**,
que es material de origen, no deuda · **la iluminación y la visión** (L1–L4), colocadas en fase 3 ·
**los huecos de mecánica** M8/M10/M11 · **I1, I2, I7** (traducciones y armas que no caben en la
forma) · **las tres «deudas aceptadas» de 1.18a/1.18b**, que son compromisos declarados.

**Recomendación concreta: sacar estas de `06-pendientes.md`.** No borrarlas —moverlas—. Una lista de
pendientes en la que la mitad no son pendientes es una lista que nadie termina de leer.

## 5 · Sin comprobar, y lo digo

- **Todo lo del servidor**: `D5` (nadie ha restaurado nunca una copia de esta base), `D7`
  (`TRUST_PROXY`), `D8` (sin servicio de correo) y el bloque entero de la copia de seguridad. Se
  comprueban **en `vps1new`**, no aquí, y no he entrado.
- **`U2` (la columna de secciones bajo 768 px), `U6` (accesibilidad y móvil real), `U7` (apagar el
  ornamento)**: piden **navegador**, no `grep`. Y la mesa se ha rehecho entera desde que se
  escribieron, así que hay que **volver a mirarlas**, no leerlas.
- **`S2`, `S3`, `S4`, `S6`, `S10`** (catálogo SRD y elecciones): piden leer el plan de 2A y contar
  aptitudes. Es una tarde de trabajo, no un barrido.
- **`M2B-4`, `M2B-8`, `M2B-11`, `M2B-12`, `M2B-14`**: piden leer la auditoría de mecánica de 2B
  entera.
- **`U1`, `U3`, `U4`, `U8`, `U9`, `U10`**: comprobadas **a medias**. `U3` (buscar solo mira el
  nombre) y `U9` (**cero** usos de `aria-disabled`) parecen vivas; `U1` y `U8` piden mirar la
  pantalla.

---

## Lo que yo haría con esto

1. **Cerrar las seis del §1**, cada una con su `fichero:línea`. Es media hora y quita seis mentiras.
2. **Partir M10 en dos**: revocar (falsa) y editar en silencio (viva).
3. **Mover el §4 fuera del fichero.** Es lo que más reduce la lista, y no pierde nada.
4. **Medir R1**, que es una ficha bloqueando una decisión con un dato caducado.
5. **Dejar el §5 marcado como «sin comprobar»** con su fecha. Es peor fingir que están revisadas.

**Y una cosa que este ejercicio confirma**, y que ya sabíamos por otro camino: **las fichas con un
barrido citado dentro envejecen igual que el código**. Las seis del §1 tenían su evidencia escrita
—y era cierta el día que se escribió—. Por eso lo que se tache tiene que llevar **la prueba de
cuándo**, no solo la prueba de qué.
