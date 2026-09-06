# Botín y reparto — plan de implementación

> **Para quien lo ejecute:** SUB-SKILL OBLIGATORIA: `superpowers:subagent-driven-development`
> (recomendada) o `superpowers:executing-plans`, tarea a tarea. Los pasos llevan casilla (`- [ ]`).

**Objetivo:** que el botín deje de repartirse a mano por cuatro pantallas — que **una tabla del DM
pueda entregar objetos y monedas**, y que **dar algo a alguien se haga desde la mesa**, con su rastro.

**Arquitectura:** no hay nada nuevo por debajo. `entrega` es **un campo opcional** en la fila de una
tabla, y dar un objeto es el `add` del inventario que ya existe llamado con otro `characterId`. Lo
que se construye es **el puente y la pantalla**, no la maquinaria.

**Stack:** NestJS + Prisma + Zod compartido · React + React Query + Vitest/RTL · Playwright.

**Spec:** `docs/superpowers/specs/2026-09-06-botin-y-reparto-design.md`
*(escrita fuera del repositorio y movida aquí el 2026-09-06, cuando el agente del paso 1 soltó el
árbol; el contenido no cambió al moverla).*

---

## Las tres decisiones del autor, tomadas el 2026-09-06

- **Corre EN PARALELO al paso 2.** No comparten un solo fichero, y se comprobó uno a uno:
  el paso 2 vive en `Combatant`, `shared/activity`, `shared/origen`, `src/activities`,
  `rules/catalog` y `web/character-sheet`; esto vive en `shared/dm-table`, `src/dm-tables`,
  `src/inventory`, `web/dm-tables` y `web/sessions`. **Worktree propio y ranura propia**
  (`WORKTREE_SLOT`), porque compartir directorio con otra sesión ya costó un `git stash` que se
  llevó el trabajo ajeno.
- **El reparto deja suceso SIEMPRE**, también cuando un jugador le pasa algo a otro.
- **Las monedas entran en los dos sitios**: las entrega una tabla y se dan a mano.

## Lo que este plan NO hace

- **No hay comercio.** Ni tiendas, ni compra, ni venta, ni regateo. El precio ya existe (`costCp`) y
  ya se ve (`ItemDetail.tsx:74`); lo demás son decisiones de mesa que se toman **el día que alguien
  intente vender algo jugando**.
- **No hay reparto automático.** El sistema entrega; **quién se queda qué lo decide la mesa**. Es la
  misma línea que el proyecto ya trazó con el bando y con el fin del combate.
- **No divide el oro a partes iguales.** En una mesa real el reparto desigual es la norma, y una
  división automática se deshace a mano la mitad de las veces.

---

## Restricciones globales

- **La autorización se comprueba en el servidor, siempre.** `canView` es el dueño único de «quién ve qué».
- **La validación es Zod desde `@dnd/shared`** vía `ZodValidationPipe`. Ningún DTO a mano.
- **La forma de los datos vive una sola vez**, en `packages/shared/src`.
- **Un catálogo compartido se referencia con una CADENA** (`ContentRef`: `SRD:longsword` o
  `CAMPAIGN:<id>`), **nunca con una clave foránea** (D-2B-3).
- **Dárselo a quien no puede verlo se rechaza con un 400 que explica cómo arreglarlo** (D-2B-7). Esa
  regla **ya existe**: se reutiliza, no se reescribe.
- **Ningún valor de enumeración llega a la pantalla.**
- **Un valor de enum de PostgreSQL se añade, nunca se edita ni se borra.**
- **Una transacción se abre con `PrismaService.transaction`, nunca con `$transaction`.**
- **Código en inglés; interfaz y documentación en español.**
- **Un commit por tarea**, mensaje en inglés (Conventional Commits).
- **Verificación por mutación obligatoria** en cada tarea.
- **Si tocas una pantalla, abres el navegador.** `jsdom` no maqueta.
- **Una sola tanda de Playwright en la máquina**, y no compiles la API mientras corre. **Si el paso 2
  corre a la vez, os turnáis**: avisa antes de lanzarla.
- **NO se abren fichas nuevas** sin recorrer los cuatro pasos —¿cambio rápido y duradero? → ¿cumple
  el SRD y el código que ya hay? → ¿lo contesta la fuente? → **solo entonces** ficha— y **no se
  pregunta al autor** lo que las reglas o el código ya contestan.

---

## Lo que compartes con la otra sesión, medido fichero a fichero

**El plan del paso 2 (`2026-09-06-paso-2-actividad.md`) corre a la vez que este.** Se comprobó
extrayendo las rutas de los dos planes y cruzándolas: **coincidís en exactamente dos ficheros de
código**, y en los tres documentos que se generan solos.

| Fichero | Tú escribes | La otra sesión escribe | Cómo se resuelve |
|---|---|---|---|
| `apps/api/prisma/schema.prisma` | un campo en `model DmTableEntry` | columnas en `model Combatant` | Modelos distintos y lejanos en el fichero: git los fusiona. **Cada uno crea SU migración**; el orden lo dan las marcas de tiempo y no chocan |
| `packages/shared/src/game-event.schema.ts` | el suceso del reparto | el de gastar | **Un enum solo CRECE: añade al final y no reordenes.** Si hay conflicto es de una línea |
| `docs/00-INDEX.md` · `docs/08-pruebas.md` | los genera `pnpm update:estado` | ídem | **Van a chocar seguro**: llevan el hash del commit dentro. **No se resuelven a mano**: al fusionar se acepta cualquiera de los dos y se ejecuta `pnpm update:estado` otra vez |
| `docs/06-pendientes.md` · `07-historial.md` · `decisiones.md` | añades al final | ídem | Conflicto de añadido, trivial |

**Lo que NO compartes**: `dm-tables`, `inventory`, `web/features/inventory` y
`web/sessions/elenco` son solo tuyos; `src/activities`, `rules/catalog`,
`origen`/`activity`/`action-economy`, `web/character-sheet` y `web/encounters` son solo suyos.

**Y dos cosas de máquina que sí os pisan aunque los ficheros no:**

- **Una sola tanda de Playwright en toda la máquina.** Avisa antes de lanzarla y espera si la otra
  sesión está corriendo. Dos a la vez dieron **82 fallos falsos**.
- **La memoria.** El gancho de pre-commit corre `pnpm verify` **entero** —compila los tres paquetes—
  y dos a la vez con sendos servidores de desarrollo levantados **han tumbado un commit por falta de
  memoria** en esta misma máquina, el 2026-09-06. Si vas a commitear y sabes que la otra sesión está
  compilando, **espera treinta segundos**; es más barato que repetir el commit.

## Los ficheros

| Fichero | Qué responde |
|---|---|
| `packages/shared/src/dm-table.schema.ts` | El campo `entrega` de una fila. Tarea 1 |
| `apps/api/prisma/schema.prisma` (`DmTableEntry`, línea 751) | Sus columnas. Tarea 1 |
| `apps/api/src/dm-tables/dm-tables.service.ts` | Resolver la entrega al tirar. Tarea 2 |
| `packages/shared/src/game-event.schema.ts` | El suceso del reparto. Tarea 3 |
| `apps/api/src/inventory/inventory.service.ts` | Dar objetos y monedas, con su rastro. Tarea 3 |
| `apps/web/src/features/sessions/` | El gesto «Dar…» en la mesa. Tarea 4 |
| `apps/web/src/features/dm-tables/` | Dar lo que la tabla acaba de entregar. Tarea 5 |

## Orden

```
1 → 2        el dato y su resolución   (servidor, sin pantalla)
3            dar deja rastro           (servidor)
4 → 5        las dos pantallas         (navegador, una sola tanda al final)
6            documentación y cierre
```

---

## Tarea 1 · Una fila de tabla puede entregar algo

Hoy una fila es `{ min, max, text }` — `schema.prisma:751`, `DmTableEntry`. **Un rango y una cadena.**
Por eso el DM lee «una espada corta y 15 mo» y lo mete a mano en la hoja de alguien.

**El campo es OPCIONAL, y eso es la mitad del diseño:** la misma tabla sirve para rumores y
encuentros, y una tabla de rumores no entrega nada. Sin `entrega`, el camino de hoy **no cambia en
absolutamente nada** y no hay una sola fila que migrar.

**Ficheros:**
- Modificar: `packages/shared/src/dm-table.schema.ts` (`dmTableEntrySchema`)
- Modificar: `apps/api/prisma/schema.prisma` (`DmTableEntry`)
- Crear: `apps/api/prisma/migrations/<timestamp>_dm_table_entry_loot/migration.sql`
- Prueba: `apps/api/src/dm-tables/dm-tables.service.spec.ts`

**Interfaces · produce:**
```ts
export const entregaSchema = z.object({
  objetos: z.array(z.object({ ref: contentRefSchema, cantidad: z.number().int().min(1).max(999) }))
    .max(20).optional(),
  monedas: z.object({
    cp: z.number().int().min(0).max(1_000_000).optional(),
    sp: z.number().int().min(0).max(1_000_000).optional(),
    ep: z.number().int().min(0).max(1_000_000).optional(),
    gp: z.number().int().min(0).max(1_000_000).optional(),
    pp: z.number().int().min(0).max(1_000_000).optional(),
  }).optional(),
});
// En la fila: `entrega: entregaSchema.optional()`
```

> **Las monedas son cinco enteros y no un total**, igual que en la bolsa de un personaje (D-2B-5).
> Normalizar aquí y desnormalizar allí sería inventarse una segunda verdad para el mismo dinero.

- [ ] **Paso 1 · Escribe las pruebas que fallan**

```ts
it("una fila sin `entrega` sigue siendo válida, y es el caso normal", () => {
  const fila = dmTableEntrySchema.parse({ min: 1, max: 3, text: "Un rumor sobre el molinero" });
  expect(fila.entrega).toBeUndefined();
});

it("una fila puede entregar objetos y monedas", () => {
  const fila = dmTableEntrySchema.parse({
    min: 4, max: 6,
    text: "Una espada corta y 15 mo",
    entrega: { objetos: [{ ref: "SRD:shortsword", cantidad: 1 }], monedas: { gp: 15 } },
  });
  expect(fila.entrega?.objetos?.[0].ref).toBe("SRD:shortsword");
});

it("una entrega vacía se rechaza: o entrega algo o no está", () => {
  expect(() =>
    dmTableEntrySchema.parse({ min: 1, max: 1, text: "Nada", entrega: {} }),
  ).toThrow();
});
```

**La tercera evita el estado tonto**: una `entrega` presente pero vacía es indistinguible de no
tenerla, y dos formas de decir lo mismo acaban con una pantalla mirando la equivocada.

- [ ] **Paso 2 · Córrelas** — fallan: el campo no existe.
- [ ] **Paso 3 · El esquema y la migración.** La columna es `Json?` en `DmTableEntry` — **es un
      `Json` que NO se consulta por dentro**, que es la única forma en que este proyecto los admite
      (`docs/04-convenciones.md`): se lee entero al tirar y nunca se filtra por su contenido.
- [ ] **Paso 4 · Córrelas** — pasan.
- [ ] **Paso 5 · Mutación** — haz `entrega` obligatoria: la primera prueba se pone **roja**. Deshaz.
- [ ] **Paso 6 · Commit**

```bash
git add packages/shared apps/api
git commit -m "feat: a table row can hand over items and coins, and most rows still do not"
```

---

## Tarea 2 · Tirar una tabla resuelve lo que entrega

`dm-tables.service.ts:143` (`roll`) devuelve la fila y escribe su suceso `TABLE_ROLLED`. Ahora tiene
que **resolver las referencias**: una `ref` es una cadena, y la pantalla necesita nombre, peso y
precio para enseñar qué ha salido.

**Ficheros:**
- Modificar: `apps/api/src/dm-tables/dm-tables.service.ts` (`roll` / `tirarSobre`)
- Modificar: `packages/shared/src/dm-table.schema.ts` (`dmTableRollSchema`, el resultado)
- Prueba: `apps/api/src/dm-tables/dm-tables.service.spec.ts` y su e2e

**Interfaces · consume:** el resolutor de objetos que ya usa el inventario
(`resolveContentRef` / `resolveInventoryRowItem`, `apps/api/src/inventory/common/resolve-item.ts`).
**No escribas un segundo resolutor.**

- [ ] **Paso 1 · Escribe las pruebas que fallan**

```ts
it("la tirada devuelve los objetos resueltos, no solo sus claves", async () => {
  const r = await service.roll(dmId, campaignId, tablaDeBotin.id);
  expect(r.entrega?.objetos?.[0]).toMatchObject({ ref: "SRD:shortsword", name: "Espada corta" });
});

it("una `ref` que ya no existe sale con su motivo, y NO rompe la tirada", async () => {
  const r = await service.roll(dmId, campaignId, tablaConRefCaduca.id);
  expect(r.text).toBeTruthy();
  expect(r.entrega?.objetos?.[0]).toMatchObject({ ausente: true });
});

it("una tabla de rumores tira exactamente como antes", async () => {
  const r = await service.roll(dmId, campaignId, tablaDeRumores.id);
  expect(r.text).toBeTruthy();
  expect(r.entrega).toBeUndefined();
});
```

**La segunda es la que importa:** el DM borró su objeto propio y la tabla lo sigue nombrando. **Eso
no puede tumbar la tirada** — se dice y se sigue, como ya hace el catálogo con una clase que no
existe.

- [ ] **Paso 2 · Córrelas** — fallan.
- [ ] **Paso 3 · La implementación.** El suceso `TABLE_ROLLED` **no cambia de forma**: sigue llevando
      su texto. Lo resuelto es de la respuesta, no del registro — el registro guarda lo que pasó, no
      un catálogo resuelto que mañana significará otra cosa.
- [ ] **Paso 4 · Córrelas** — pasan.
- [ ] **Paso 5 · Mutación** — devuelve las `ref` sin resolver: la primera se pone **roja**. Deshaz.
- [ ] **Paso 6 · Commit**

```bash
git add packages/shared apps/api
git commit -m "feat(api): rolling a table resolves what it hands over, and a stale ref says so"
```

---

## Tarea 3 · Dar algo a alguien deja rastro

Dar ya funciona: `inventory.service.ts:246` (`add`) autoriza con `requireOwnerOrDM`, y el dinero
tiene su `PATCH .../money`. **Lo que falta es el rastro**: hoy un objeto aparece en una bolsa y
nadie sabe de dónde salió.

**Ficheros:**
- Modificar: `packages/shared/src/game-event.schema.ts` (el tipo nuevo, junto a los que ya hay)
- Modificar: `apps/api/src/inventory/inventory.service.ts` (`add` y `changeMoney`)
- Prueba: `apps/api/src/inventory/inventory.service.spec.ts` y su e2e

- [ ] **Paso 1 · Escribe las pruebas que fallan**

```ts
it("dar un objeto deja un suceso que dice quién, qué y a quién", async () => {
  await service.add(dmId, campaignId, jugadoraPersonajeId, { ref: "SRD:shortsword", quantity: 1 });
  const [suceso] = await eventos.list(dmId, campaignId);
  expect(suceso.type).toBe("ITEM_GIVEN");
  expect(suceso.payload).toMatchObject({ ref: "SRD:shortsword", quantity: 1 });
});

it("un jugador NO puede meter un objeto en la bolsa del personaje de otro", async () => {
  await expect(
    service.add(jugadoraId, campaignId, personajeDeOtroId, { ref: "SRD:shortsword", quantity: 1 }),
  ).rejects.toThrow(ForbiddenException);
});

it("un objeto DM_ONLY dado a un jugador se rechaza con un 400 que explica cómo arreglarlo", async () => {
  await expect(
    service.add(dmId, campaignId, jugadoraPersonajeId, { ref: `CAMPAIGN:${objetoSecretoId}`, quantity: 1 }),
  ).rejects.toThrow(BadRequestException);
});
```

**La tercera ya pasa hoy** (D-2B-7). Se escribe igual: es la que impide que esta puerta nueva se
salte una regla que la vieja sí cumplía.

- [ ] **Paso 2 · Córrelas** — la primera falla; la segunda y la tercera deben pasar **antes y después**.
- [ ] **Paso 3 · La implementación.** El `record` va **dentro de la misma transacción** que la
      escritura: si el objeto no entra, el aviso no puede quedarse. Y su línea de registro se
      escribe en español en `linea-de-log.ts`, con el vocabulario que ya existe.
- [ ] **Paso 4 · Córrelas** — pasan.
- [ ] **Paso 5 · Mutación** — quita el `record`: la primera se pone **roja**. Deshaz.
- [ ] **Paso 6 · Commit**

```bash
git add packages/shared apps/api
git commit -m "feat: giving an item or coins says who gave what to whom"
```

---

## Tarea 4 · «Dar…» desde la mesa

**El problema, medido:** dar un objeto exige abrir la hoja de quien lo recibe. Con cuatro jugadores y
un cofre, son cuatro pantallas y una docena de clics.

**Ficheros:**
- Crear: `apps/web/src/features/sessions/elenco/DarObjeto.tsx`
- Modificar: `apps/web/src/features/sessions/elenco/MandosDeCombatiente.tsx`
- Prueba: `apps/web/src/features/sessions/elenco/__tests__/DarObjeto.test.tsx`
- Prueba de navegador: en la tanda del final

**Interfaces · consume:** el selector de objeto que ya existe
(`apps/web/src/features/inventory/SelectorDeObjeto.tsx`) y el hook de añadir del inventario.
**No escribas un segundo buscador de catálogo.**

- [ ] **Paso 1 · Escribe las pruebas que fallan**

```tsx
it("el DM elige objeto y destinatario sin salir de la mesa", async () => {
  render(<DarObjeto {...props} soyDm />);
  await userEvent.click(screen.getByRole("button", { name: /dar/i }));
  await userEvent.click(screen.getByRole("radio", { name: /Marta/i }));
  await userEvent.click(screen.getByRole("option", { name: /espada corta/i }));
  await userEvent.click(screen.getByRole("button", { name: /entregar/i }));
  expect(dar).toHaveBeenCalledWith(expect.objectContaining({ ref: "SRD:shortsword" }));
});

it("un jugador solo se ve a sí mismo como destinatario", () => {
  render(<DarObjeto {...props} soyDm={false} />);
  expect(screen.queryByRole("radio", { name: /Marta/i })).not.toBeInTheDocument();
});

it("no ofrece repartir entre todos", () => {
  render(<DarObjeto {...props} soyDm />);
  expect(screen.queryByRole("button", { name: /a todos|repartir/i })).not.toBeInTheDocument();
});
```

**La tercera es una decisión hecha prueba:** el reparto automático no existe, y que no exista tiene
que ser comprobable — si mañana alguien lo añade «por comodidad», esa prueba se pone roja y le
explica por qué.

- [ ] **Paso 2 · Córrelas** — fallan.
- [ ] **Paso 3 · La implementación.** El destinatario son **radios con el nombre del personaje**, no
      un desplegable: son pocas opciones con significado (`docs/04-convenciones.md`). **Esconder el
      botón no es control de acceso**: la puerta es `requireOwnerOrDM` en el servidor.
- [ ] **Paso 4 · Córrelas** — pasan.
- [ ] **Paso 5 · El navegador**, en la tanda del final: dar desde la mesa y **ver el objeto en la
      bolsa del jugador sin recargar**, con la línea en el hilo.
- [ ] **Paso 6 · Commit**

```bash
git add apps/web
git commit -m "feat(web): the DM hands something over without leaving the table"
```

---

## Tarea 5 · Dar lo que la tabla acaba de entregar

**Ficheros:**
- Modificar: `apps/web/src/features/dm-tables/` (la pantalla del resultado de una tirada)
- Prueba: su fichero de pruebas
- Prueba de navegador: en la misma tanda

- [ ] **Paso 1 · Escribe las pruebas que fallan**

```tsx
it("el resultado enseña lo que entrega, con nombre y no con clave", () => {
  render(<ResultadoDeTabla tirada={tiradaConBotin} />);
  expect(screen.getByText("Espada corta")).toBeInTheDocument();
  expect(screen.getByText(/15 mo/)).toBeInTheDocument();
});

it("y ofrece darlo, eligiendo a quién", async () => {
  render(<ResultadoDeTabla tirada={tiradaConBotin} soyDm />);
  await userEvent.click(screen.getByRole("button", { name: /dar/i }));
  expect(screen.getByRole("radio", { name: /Marta/i })).toBeInTheDocument();
});

it("una tirada de rumores no ofrece dar nada", () => {
  render(<ResultadoDeTabla tirada={tiradaDeRumor} soyDm />);
  expect(screen.queryByRole("button", { name: /dar/i })).not.toBeInTheDocument();
});

it("un objeto que ya no existe se dice, y no se puede dar", () => {
  render(<ResultadoDeTabla tirada={tiradaConRefCaduca} soyDm />);
  expect(screen.getByText(/ya no existe/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /dar/i })).toBeDisabled();
});
```

- [ ] **Paso 2 · Córrelas** — fallan.
- [ ] **Paso 3 · La implementación**, reutilizando el componente de la tarea 4. **Ninguna clave de
      catálogo llega a la pantalla**: se enseña el nombre resuelto.
- [ ] **Paso 4 · Córrelas** — pasan.
- [ ] **Paso 5 · El navegador:** tirar una tabla de botín y dar lo que sale, en dos clics.
- [ ] **Paso 6 · Commit**

```bash
git add apps/web
git commit -m "feat(web): what a table hands over can be given from the roll itself"
```

---

## Tarea 6 · Documentación y cierre

- [ ] **Paso 1** · `docs/05-datos.md`: la columna `entrega` y que **es un `Json` que no se consulta
      por dentro**.
- [ ] **Paso 2** · `docs/04-convenciones.md`: **el reparto automático no existe** —el sistema
      entrega, la mesa decide— y **el comercio queda fuera hasta que se pida jugando**.
- [ ] **Paso 3** · `docs/decisiones.md`: una línea por decisión, con enlace.
- [ ] **Paso 4** · `docs/06-pendientes.md`: abre ficha **solo** de lo que quedó fuera tras recorrer
      los cuatro pasos.
- [ ] **Paso 5** · `docs/07-historial.md`: la entrada. **Mira el tope de 1000 líneas antes.**
- [ ] **Paso 6** · `pnpm verify` en verde y el gancho corriendo.
- [ ] **Paso 7 · Commit**

```bash
git add docs
git commit -m "docs: a table can hand over loot, and the table decides who keeps it"
```

---

## Definición de terminado

`pnpm verify` en verde · **las dos pantallas abiertas en el navegador**, no solo en `jsdom` · **una
mutación por tarea**, probada y deshecha · las tablas de rumores existentes **tirando exactamente
igual que antes** · y **el botín de un combate repartido sin salir de la mesa**, que es la única
prueba que le importa al DM.
