# Paso 1 · Las goteras — plan de implementación

> **Para quien lo ejecute:** SUB-SKILL OBLIGATORIA: `superpowers:subagent-driven-development`
> (recomendada) o `superpowers:executing-plans`, tarea a tarea. Los pasos llevan casilla
> (`- [ ]`) para ir marcándolos.

**Objetivo:** cerrar los agujeros que hacen que hoy salgan **números falsos con traza convincente**,
y enchufar las tres pantallas que existen a medias — sin mecanizar ninguna aptitud ni añadir ningún
conjuro, que eso es el paso 2.

**Arquitectura:** no hay arquitectura nueva. Son arreglos independientes sobre módulos que ya
existen: condiciones, motor de reglas, inventario, recursos y tres pantallas. **Una sola tarea
cambia una interfaz** (la del motor, tarea 5) y va sola por eso.

**Stack:** NestJS + Prisma + Zod compartido (`@dnd/shared`) · React + React Query + Vitest/RTL ·
Playwright para lo que se maqueta.

**Spec:** [`docs/superpowers/specs/2026-09-05-paso-1-goteras-design.md`](../specs/2026-09-05-paso-1-goteras-design.md)

---

## Lo que cambió desde que se escribió la spec, y hay que saber antes de empezar

La spec es del 2026-09-05 por la tarde. **Esa noche entraron 37 commits** (`2e3563a`..`6f133dd`).
Las tres correcciones de abajo se comprobaron abriendo los ficheros el 2026-09-06, sobre `cfb580b`:

**1 · Su lista de «no toques esto, lo tiene otro agente» ya no aplica.** Las seis cosas que
apartaba están hechas. **Salvo una**, que vuelve aquí como **tarea 8**: la resistencia al daño de un
personaje jugador, que el agente dejó abierta a propósito con su ficha en
`docs/06-pendientes.md:244`.

**2 · B3 es más pequeño de lo que la spec dice.** El selector de visibilidad **ya existe** en el
editor de criaturas y **ya se pinta al crear** (`EditorDeStatblock.tsx:546`). Lo que falta es la otra
rama del ternario: **al editar** una criatura existente sigue mostrando un párrafo que dice que el
servidor no manda ese dato. Es la tarea 12, y es media hora.

**3 · La prueba que la spec propone para B1 pediría cambiar una regla, no arreglarla.** Dice
«un jugador **no** puede crearse un recurso a sí mismo», y el servidor **sí se lo permite a
propósito**: `resources.service.ts` solo rechaza si el recurso es `DM_ONLY` y quien llama no es DM.
La prueba correcta es esa, y está escrita en la tarea 10.

**Las demás citas de la spec se comprobaron una a una y siguen siendo exactas.** Las que la spec
daba sin línea van aquí con ella.

---

## Restricciones globales

- **La autorización se comprueba en el servidor, siempre.** Esconder un botón no es control de acceso.
- **`canView` (`apps/api/src/common/visibility.ts`) es el dueño único de «quién ve qué».**
- **La validación es Zod desde `@dnd/shared`**, vía `ZodValidationPipe`. Ningún DTO a mano.
- **La forma de los datos vive una sola vez**, en `packages/shared/src`.
- **Ningún valor de enumeración llega a la pantalla.**
- **Código en inglés; interfaz y documentación en español.**
- **Un commit por tarea**, mensaje en inglés (Conventional Commits).
- **La cita del SRD en inglés va en el commit** de las tareas 4, 5, 6 y 3 — y de la 9 si se hace.
  El SRD español pierde matices; manda el inglés.
- **Verificación por mutación obligatoria**: rompe a mano lo que acabas de proteger y comprueba que
  su prueba se pone **roja**. Si el arreglo se puede borrar sin que nada enrojezca, no está hecho.
- **Ninguna tarea se cierra sin prueba real en verde y sin mirar la salida.**
- **Las tareas 10, 11 y 12 se abren en el navegador.** `jsdom` no maqueta, y este proyecto ya dejó
  871 pruebas verdes con la mesa rota.
- **Una sola tanda de Playwright en esta máquina**, y no compiles la API mientras corre.
- **Nunca** desactives una prueba, bajes un umbral ni saltes el gancho de pre-commit.
- **Un enum de PostgreSQL se añade, nunca se edita ni se borra.**
- **NO se abren fichas nuevas** sin recorrer antes los cuatro pasos: ¿cambio rápido y duradero? →
  ¿cumple las reglas y el SRD? → ¿lo contesta la fuente en internet? → **solo entonces** ficha. Y
  no se pregunta al autor lo que las reglas o el código ya contestan.
- **`docs/07-historial.md` tiene tope de 1000 líneas.**

---

## Los ficheros, y de qué responde cada uno

| Fichero | Qué responde aquí |
|---|---|
| `packages/shared/src/character-state.schema.ts` | La forma de una condición y la lista `SRD_CONDITIONS`. Tareas 1 y 2 |
| `apps/api/src/character-state/conditions/conditions.service.ts` | Aplicar, retirar y caducar condiciones. Tareas 1, 2, 3 y 4 |
| `apps/api/src/rules/engine.ts` | La CA candidata y su traza. **Interfaz** — tarea 5, sola |
| `apps/api/src/rules/items.ts` | La fórmula de CA que sale de la armadura equipada. Tarea 5 |
| `apps/api/src/rules/catalog/index.ts` | `deriveNpc`. Tarea 6 |
| `apps/api/src/inventory/inventory.service.ts` | Consumir un objeto. Tarea 7 |
| `apps/api/src/rules/catalog/types.ts` y `races.ts` | Concesiones de raza. Tarea 8 |
| `apps/api/src/characters/character-sheet.service.ts` | `changeHp` y las dos rutas de ataque. Tareas 1, 3 y 8 |
| `apps/api/src/character-state/rest/rest.service.ts` | Descansos. Tarea 9, **solo si el autor lo declara** |
| `apps/web/src/features/character-sheet/RecursosYDescansos.tsx` | Crear un recurso. Tarea 10 |
| `apps/web/src/features/inventory/PaginaDeInventario.tsx` | Equipar con ranura. Tarea 11 |
| `apps/web/src/features/bestiario/EditorDeStatblock.tsx` | Visibilidad al editar. Tarea 12 |

## Orden y paralelismo

**La tarea 1 va primero de todo y sola**: es integridad, y las tareas 2, 3 y 4 tocan el mismo
fichero que ella.

Después, **dos carriles que no comparten ni un fichero**:

```
Carril servidor:  2 → 3 → 4 → 6 → 7 → 8      (y 5 sola, entre medias)
Carril pantalla:  10 → 11 → 12               (Playwright al final, una sola tanda)
```

**La tarea 5 (la CA) no se solapa con nadie**: cambia una interfaz del motor y toca la derivación
entera. **La tarea 2 lleva migración de datos** y no se junta con otra en el mismo commit.
**La tarea 9 no se toca** hasta que el autor lo declare en `docs/04-convenciones.md`.

---

## Tarea 1 · Un jugador no puede concederse una mecánica

**Lo más grave del informe.** Va primero.

Hoy `PUT /campaigns/:id/characters/:suyo/conditions/helped` sin duración da **ventaja permanente y
renovable en todos tus ataques**. La autorización es correcta —`requireOwnerOrDM`, y que alguien se
tumbe solo está bien—; el agujero es que **la clave es texto libre**
(`packages/shared/src/character-state.schema.ts:141`, `key: z.string().min(1).max(60)`) y sin
`durationSeconds` la condición es indefinida.

`helped` **no es una condición del SRD**: lo dice el propio código en
`apps/api/src/character-state/roll-mode/suggested-roll-mode.ts:89`. Es la marca que deja la acción
Ayudar, y `ayudaViva` la busca **solo por clave**
(`apps/api/src/characters/character-sheet.service.ts:760`, usada en `:1521` y `:1729`), sin mirar
quién la puso.

**El criterio:** un jugador puede seguir poniéndose una nota; **no puede concederse una mecánica.**

**Ficheros:**
- Modificar: `packages/shared/src/character-state.schema.ts` (exportar la lista de claves reservadas)
- Modificar: `apps/api/src/character-state/conditions/conditions.service.ts` (método `apply`)
- Prueba: `apps/api/src/character-state/conditions/conditions.service.spec.ts`
- Prueba e2e: `apps/api/test/condiciones.e2e-spec.ts` (si no existe, créalo)

**Interfaces · produce:**
```ts
/** Claves que el servidor INTERPRETA. No entran por la puerta genérica de condiciones. */
export const CLAVES_RESERVADAS = [...SRD_CONDITIONS, "helped"] as const;
export function esClaveReservada(key: string): boolean;
```
Las tareas 2 y 3 la consumen.

- [ ] **Paso 1 · Escribe las pruebas que fallan**

```ts
it("un jugador no puede aplicarse `helped` a sí mismo", async () => {
  await expect(
    service.apply(jugadoraId, campaignId, suPersonajeId, { key: "helped" }),
  ).rejects.toThrow(ForbiddenException);
});

it("el DM tampoco: la marca la pone la acción Ayudar, no una ruta genérica", async () => {
  await expect(
    service.apply(dmId, campaignId, suPersonajeId, { key: "helped" }),
  ).rejects.toThrow(ForbiddenException);
});

it("una condición del SRD tampoco entra a mano por esta puerta", async () => {
  await expect(
    service.apply(jugadoraId, campaignId, suPersonajeId, { key: "poisoned" }),
  ).rejects.toThrow(ForbiddenException);
});

it("una nota propia sin efecto mecánico sigue funcionando", async () => {
  const c = await service.apply(jugadoraId, campaignId, suPersonajeId, {
    key: "mojado",
    note: "Me caí al río",
  });
  expect(c.key).toBe("mojado");
});
```

> **Ojo con la tercera.** Hoy el DM aplica condiciones del SRD por esta ruta y **eso tiene que
> seguir funcionando**: es como se envenena a alguien en la mesa. Así que la regla NO es «las 15
> del SRD se prohíben»: es **el DM sí, el jugador sobre sí mismo no**, y `helped` **nadie**.
> Escribe las cuatro pruebas con esa forma:
> - jugador + clave reservada → 403 · DM + clave del SRD → **entra** · cualquiera + `helped` → 403 ·
>   jugador + clave libre → entra.

- [ ] **Paso 2 · Córrelas**

```bash
pnpm --filter @dnd/api test -- conditions.service
```
Esperado: **fallan** — hoy las cuatro pasan por la misma puerta.

- [ ] **Paso 3 · La implementación**

En `packages/shared/src/character-state.schema.ts`, junto a `SRD_CONDITIONS` (línea 88):

```ts
/**
 * **Las claves que el servidor interpreta.** Una condición del SRD cambia el modo de tirada
 * sugerido; `helped` concede ventaja en el ataque. Por eso no pueden escribirse por la puerta
 * genérica sin mirar quién llama: un jugador puede ponerse una nota, no una mecánica.
 */
export const CLAVE_DE_AYUDA = "helped";
export function esClaveReservada(key: string): boolean {
  return key === CLAVE_DE_AYUDA || (SRD_CONDITIONS as readonly string[]).includes(key);
}
```

En `ConditionsService.apply`, **después** de `requireOwnerOrDM` y antes de la transacción:

```ts
// **La marca de Ayudar la pone `help()`, y nadie más.** Por esta ruta no entra ni el DM:
// `ayudaViva` la busca solo por clave, así que escribirla a mano es concederse ventaja
// saltándose los tres controles de la acción.
if (input.key === CLAVE_DE_AYUDA) {
  throw new ForbiddenException("La ventaja de Ayudar la concede la acción Ayudar, no esta ruta.");
}
// **Una condición del SRD la pone el DM.** Un jugador puede anotarse lo que quiera sobre sí
// mismo, pero no darse un estado que el motor lee para decidir tiradas.
if (esClaveReservada(input.key) && !esDM) {
  throw new ForbiddenException("Esa condición la aplica el DM.");
}
```

`requireOwnerOrDM` ya devuelve si quien llama es DM —así lo usa
`resources.service.ts`—; recoge ese valor en `esDM` en vez de volver a preguntarlo.

- [ ] **Paso 4 · Córrelas** — pasan.

- [ ] **Paso 5 · Comprueba que la acción Ayudar de verdad sigue dando ventaja**

```bash
pnpm --filter @dnd/api test:e2e -- ayudar
```
Esperado: **verde**. Si esto se pone rojo, has cerrado la puerta buena.

- [ ] **Paso 6 · Mutación** — borra las dos comprobaciones nuevas: la primera prueba se pone
      **roja**. Deshaz.

- [ ] **Paso 7 · Commit**

```bash
git add packages/shared apps/api
git commit -m "fix(api): a player cannot grant themselves a mechanic through the conditions door"
```

---

## Tarea 2 · Las inmunidades a condición dejan de ser prosa

**El arreglo más barato de la spec.** Tres líneas consecutivas y la tercera desentona:

```
packages/shared/src/statblock.schema.ts:192   damageImmunities:      z.array(damageTagSchema)   ← tipado
                                       :193   damageVulnerabilities: z.array(damageTagSchema)   ← tipado
                                       :194   conditionImmunities:   z.array(z.string()...)      ← prosa
```

`SRD_CONDITIONS` vive en el mismo paquete (`character-state.schema.ts:88`) y el catálogo ya escribe
las claves buenas. **Nadie consume el campo**, así que hoy **se puede envenenar a un esqueleto**.

**Ficheros:**
- Modificar: `packages/shared/src/statblock.schema.ts:194`
- Modificar: `apps/api/src/character-state/conditions/conditions.service.ts` (método `apply`)
- Crear: `apps/api/prisma/migrations/<timestamp>_condition_immunities_typed/migration.sql`
- Prueba: `apps/api/src/character-state/conditions/conditions.service.spec.ts`

**Interfaces · consume:** `SRD_CONDITIONS` y `srdConditionSchema` de `@dnd/shared`.

- [ ] **Paso 1 · Mira qué hay guardado ANTES de tipar nada**

```bash
docker compose up -d
pnpm --filter @dnd/api exec prisma db execute --stdin <<'SQL'
SELECT DISTINCT jsonb_array_elements_text("conditionImmunities") AS valor
FROM "CampaignStatblock";
SQL
```

**Apunta la salida.** Es lo que hay que mapear, y lo que no se pueda mapear **se dice en el commit**,
no se descarta en silencio.

- [ ] **Paso 2 · Escribe las pruebas que fallan**

```ts
it("aplicar `poisoned` a un esqueleto se rechaza con motivo legible", async () => {
  await expect(
    service.apply(dmId, campaignId, esqueletoId, { key: "poisoned" }),
  ).rejects.toThrow(/inmune/i);
});

it("una condición a la que no es inmune sigue entrando", async () => {
  const c = await service.apply(dmId, campaignId, esqueletoId, { key: "prone" });
  expect(c.key).toBe("prone");
});
```

- [ ] **Paso 3 · Córrelas** — fallan: hoy nadie lee el campo.

- [ ] **Paso 4 · Tipa el esquema**

```ts
// **Tipado como sus dos vecinas, y por el mismo motivo.** Mientras fue texto libre nadie pudo
// consumirlo: un `"veneno"` escrito a mano no cruza con la clave `poisoned` que usa el motor.
conditionImmunities: z.array(srdConditionSchema).default([]),
```

- [ ] **Paso 5 · Migra los datos** con lo que viste en el paso 1. La migración mapea lo conocido
      y **deja fuera lo que no reconozca**, sin borrar la fila:

```sql
-- Ejemplo con lo que devolvió el paso 1. AJÚSTALO a la salida real; no copies esto a ciegas.
UPDATE "CampaignStatblock"
SET "conditionImmunities" = (
  SELECT COALESCE(jsonb_agg(DISTINCT mapeado), '[]'::jsonb)
  FROM jsonb_array_elements_text("conditionImmunities") AS crudo,
  LATERAL (SELECT CASE lower(crudo)
    WHEN 'envenenado' THEN 'poisoned'
    WHEN 'poisoned'   THEN 'poisoned'
    WHEN 'cegado'     THEN 'blinded'
    WHEN 'blinded'    THEN 'blinded'
    ELSE NULL END) AS m(mapeado)
  WHERE mapeado IS NOT NULL
);
```

- [ ] **Paso 6 · Rechaza en `apply`**, después de las comprobaciones de la tarea 1:

```ts
// **Una inmunidad que nadie consulta es prosa.** El statblock del que sale un PNJ ya declara a
// qué es inmune; aplicarle esa condición es un 400 con su motivo, no un silencio.
const inmunidades = await this.inmunidadesDe(tx, character);
if (inmunidades.includes(input.key)) {
  throw new BadRequestException(`${character.name} es inmune a esa condición.`);
}
```

`inmunidadesDe` resuelve el statblock del personaje —el mismo camino que ya usa `changeHp` para los
modificadores de daño, `character.statblockRef` + el resolutor de statblocks— y devuelve `[]` cuando
no hay ninguno. **Un personaje jugador no tiene statblock: para él la lista está vacía y no cambia
nada.**

- [ ] **Paso 7 · Córrelas** — pasan.
- [ ] **Paso 8 · Mutación** — devuelve `[]` siempre desde `inmunidadesDe`: la primera se pone
      **roja**. Deshaz.
- [ ] **Paso 9 · Commit** — y **di en el mensaje qué valores no se pudieron mapear**.

```bash
git add packages/shared apps/api
git commit -m "fix(api): condition immunities are typed, and applying one is refused"
```

---

## Tarea 3 · Una sola concentración, como dice el SRD

Cada conjuro genera su clave con el prefijo `CONCENTRATION_KEY_PREFIX = "concentrating"`
(`apps/api/src/character-state/concentration/concentration.ts:38`) y el `upsert` de condiciones es
**por clave exacta**. Dos conjuros distintos son dos filas y **conviven**.

Y hay un segundo defecto encima: `estaConcentrado` (`concentration.ts:41`) devuelve **booleano**, así
que con dos concentraciones vivas `changeHp` pide **una sola** salvación
(`apps/api/src/characters/character-sheet.service.ts:1206`).

**El SRD es tajante y la cita va en el commit:** *«you can't concentrate on two spells at once»*, y
empezar el segundo **termina el primero**.

**Ficheros:**
- Modificar: `apps/api/src/character-state/conditions/conditions.service.ts` (método `apply`)
- Prueba: `apps/api/src/character-state/concentration/concentration.spec.ts` (o el spec del servicio)

- [ ] **Paso 1 · Escribe las pruebas que fallan**

```ts
it("empezar una segunda concentración retira la primera", async () => {
  await service.apply(dmId, campaignId, magaId, { key: "concentrating:bless" });
  await service.apply(dmId, campaignId, magaId, { key: "concentrating:hold-person" });

  const vivas = await service.list(dmId, campaignId, magaId);
  const concentraciones = vivas.filter((c) => c.key.startsWith(CONCENTRATION_KEY_PREFIX));
  expect(concentraciones).toHaveLength(1);
  expect(concentraciones[0].key).toBe("concentrating:hold-person");
});

it("el registro dice cuál se perdió", async () => {
  await service.apply(dmId, campaignId, magaId, { key: "concentrating:bless" });
  await service.apply(dmId, campaignId, magaId, { key: "concentrating:hold-person" });

  const sucesos = await eventos.list(dmId, campaignId);
  expect(sucesos.some((e) => JSON.stringify(e.payload).includes("bless"))).toBe(true);
});

it("recibir daño con una sola concentración pide UNA salvación", async () => {
  await service.apply(dmId, campaignId, magaId, { key: "concentrating:bless" });
  const r = await sheets.changeHp(dmId, campaignId, magaId, { delta: -7 });
  expect(r.concentrationChecks ?? 1).toBe(1);
});
```

- [ ] **Paso 2 · Córrelas** — la primera y la segunda fallan.

- [ ] **Paso 3 · La implementación**, dentro de la transacción de `apply`, antes del `upsert`:

```ts
// **SRD 5.1, «Concentration»: "you can't concentrate on two spells at once"**, y empezar el
// segundo termina el primero. Se retiran aquí y no al leer, porque perder una concentración
// es un suceso de la mesa —alguien tiene que enterarse— y no una consecuencia silenciosa.
if (input.key.startsWith(CONCENTRATION_KEY_PREFIX)) {
  const previas = await tx.characterCondition.findMany({
    where: { characterId, key: { startsWith: CONCENTRATION_KEY_PREFIX, not: input.key } },
  });
  for (const previa of previas) {
    await tx.characterCondition.delete({ where: { id: previa.id } });
    await this.events.record(tx, { /* … el suceso de condición retirada que ya existe … */ });
  }
}
```

**Usa el mismo suceso que ya emite retirar una condición**, no inventes uno nuevo.

- [ ] **Paso 4 · Córrelas** — pasan.
- [ ] **Paso 5 · Mutación** — quita el borrado de las previas: la primera se pone **roja**. Deshaz.
- [ ] **Paso 6 · Commit** — con la cita del SRD en inglés dentro.

```bash
git add apps/api
git commit -m "fix(api): a second concentration ends the first, as the SRD says"
```

---

## Tarea 4 · La acción Ayudar caduca cuando el SRD dice

```
apps/api/src/character-state/conditions/conditions.service.ts:183 y :190
  expiresAtClock: campana.clockSeconds + SEGUNDOS_POR_ASALTO,
```

El reloj **solo avanza al cerrar un asalto**, así que esa marca vence al **empezar** el asalto
siguiente — antes del turno de nadie. El SRD la mantiene **hasta el turno del ayudante**.

**Consecuencia:** quien actúe **antes** que su ayudante en la iniciativa llega a su turno con la
ventaja ya vencida. **Determinista, la mitad de los órdenes de iniciativa.**

**El arreglo no es rehacer el reloj**, y eso es lo que ahorra la fase entera. Foundry separa dos
cosas que tenemos fundidas (`module/data/shared/duration-field.mjs:14-24` de
`Mine/referencia-foundry-dnd5e`): **cuánto dura** y **en qué borde de turno se corta**. El segundo es
un vocabulario cerrado de cuatro (`module/documents/active-effect.mjs:112`):

```
PSEUDO_EXPIRIES = ["sourceStart", "sourceEnd", "targetStart", "targetEnd"]
```

**No copies el resto de su mecanismo:** su vencimiento es un cálculo vivo en el cliente que ejecuta
el GM activo, y resuelve una concurrencia entre navegadores **que un servidor no tiene**. Nosotros lo
derivamos al leer, como ya hacemos.

**Ficheros:**
- Modificar: `packages/shared/src/character-state.schema.ts` (el vocabulario y el campo)
- Crear: `apps/api/prisma/migrations/<timestamp>_condition_expiry_edge/migration.sql`
- Modificar: `apps/api/src/character-state/conditions/conditions.service.ts:183,190`
- Modificar: donde se decide si una condición sigue viva (`condicionVencida`)
- Prueba e2e: `apps/api/test/ayudar.e2e-spec.ts`

**Interfaces · produce:**
```ts
export const BORDES_DE_CADUCIDAD = ["sourceStart", "sourceEnd", "targetStart", "targetEnd"] as const;
export type BordeDeCaducidad = (typeof BORDES_DE_CADUCIDAD)[number];
```

- [ ] **Paso 1 · Arregla primero la prueba que no lo detectaba**

`apps/api/test/ayudar.e2e-spec.ts` **avanza el reloj a mano y no tiene encuentro ni iniciativa**, así
que nunca ejercita este caso. Reescríbela con un combate de verdad:

```ts
it("el ayudado que actúa ANTES que su ayudante conserva la ventaja en su turno", async () => {
  // Ayudante en la posición 4, ayudado en la 2.
  await empezarCombate({ orden: [pnj1, ayudado, pnj2, ayudante] });
  await ayudar(ayudante, ayudado);
  await pasarTurnoHasta(ayudado); // asalto siguiente, turno del ayudado

  const modo = await modoSugerido(ayudado, "attack");
  expect(modo).toBe("ADVANTAGE");
});

it("y la pierde después del turno del ayudante", async () => {
  await empezarCombate({ orden: [pnj1, ayudado, pnj2, ayudante] });
  await ayudar(ayudante, ayudado);
  await pasarTurnoHasta(ayudante);
  await pasarTurno(); // termina el turno del ayudante

  const modo = await modoSugerido(ayudado, "attack");
  expect(modo).toBe("NORMAL");
});
```

- [ ] **Paso 2 · Córrela** — la primera **falla**: hoy la ventaja ya venció.

- [ ] **Paso 3 · Añade el campo**, con su vocabulario de cuatro y su migración. Por defecto `null`:
      una condición sin borde caduca por reloj como hasta ahora, **y ese es el camino de todas las
      que ya existen**.

- [ ] **Paso 4 · La acción Ayudar pasa a `sourceStart`** en las dos líneas (`:183` y `:190`), y
      `condicionVencida` aprende a mirar el borde: si lo hay, la condición vive hasta que el
      combatiente indicado cruce ese borde; si no, se compara contra el reloj como siempre.

- [ ] **Paso 5 · Córrelas** — pasan las dos.

- [ ] **Paso 6 · Mutación** — vuelve a poner `expiresAtClock` sin borde: la primera se pone
      **roja**. Deshaz.

- [ ] **Paso 7 · Las dos pantallas ya prometen lo correcto y NO se tocan:**
      `apps/web/src/features/character-sheet/Condiciones.tsx:71` y
      `apps/web/src/features/sessions/elenco/AyudarA.tsx:77-79` dicen que caduca «al empezar el turno
      de quien te ayudó». **Hoy mienten; con esto dicen la verdad.** Comprueba que siguen igual y
      dilo en el commit.

- [ ] **Paso 8 · Commit** — con la cita del SRD («Help» y «Duration») en inglés.

```bash
git add packages/shared apps/api
git commit -m "feat(api): a condition can expire on a turn edge, and Help finally lasts its turn"
```

---

## Tarea 5 · La CA sin armadura cabe en el modelo · VA SOLA

```
apps/api/src/rules/engine.ts:54
  /** Qué característica suma, si suma alguna. */
  addAbility?: AbilityKey;
```

**Una.** La Defensa sin armadura del bárbaro es 10 + Destreza **+ Constitución**; la del monje es
10 + Destreza **+ Sabiduría**. Ninguna es expresable, así que un bárbaro sale con **la CA más baja
de lo que le toca, y con traza convincente al lado**.

**Cuidado con el tope:** `abilityCap` existe porque la armadura media topa la Destreza en +2 y la
pesada en 0. Al pasar a varias, **el tope es por característica, no global**: la Defensa sin
armadura no topa ninguna de las dos.

**La superficie es pequeña y está medida:** solo hay **tres** sitios que construyan una fórmula —
`engine.ts:364` (sin armadura), `items.ts:78-79` (armadura equipada)— y dos specs que las leen
(`engine.spec.ts`, `items.spec.ts`).

**Ficheros:**
- Modificar: `apps/api/src/rules/engine.ts:48-62` (la interfaz), `:364`, `:376-396` (la evaluación)
- Modificar: `apps/api/src/rules/items.ts:78-79`
- Prueba: `apps/api/src/rules/engine.spec.ts`

**Interfaces · produce:**
```ts
export interface AcAbility {
  ability: AbilityKey;
  /** Tope **de esta** característica. `0` = no suma. `undefined` = sin tope. */
  cap?: number;
}
export interface AcFormula {
  key: string;
  labelKey: string;
  base: number;
  /** Vacío o ausente = la fórmula es un número pelado. */
  addAbilities?: AcAbility[];
  sourceType: TraceStep["sourceType"];
  sourceKey: string;
}
```
**`addAbility` y `abilityCap` desaparecen.** No se dejan como alias: dos formas de decir lo mismo es
cómo se cuela un tope aplicado dos veces.

- [ ] **Paso 1 · Escribe las pruebas que fallan**

```ts
it("un bárbaro con DES +2 y CON +3 sin armadura tiene CA 15, con los dos pasos en la traza", () => {
  const ca = evaluarCa([defensaSinArmaduraBarbaro], { dex: 2, con: 3 });
  expect(ca.total).toBe(15);
  expect(ca.steps.filter((s) => s.kind === "add")).toHaveLength(2);
});

it("la armadura media sigue topando la Destreza en +2", () => {
  const ca = evaluarCa([cotaDeEscamas], { dex: 4 });
  expect(ca.total).toBe(16); // 14 + min(4, 2)
});

it("la armadura pesada sigue sin sumar nada, ni siquiera negativo", () => {
  const ca = evaluarCa([placas], { dex: -1 });
  expect(ca.total).toBe(18);
});
```

**La tercera es una regresión que ya costó una vez**: `Math.min(−1, 0)` dejaba *restar*. Un tope de
`0` significa «no suma», no «suma como mucho cero».

- [ ] **Paso 2 · Córrelas** — la primera falla; las otras dos deben seguir en verde **antes y
      después**.

- [ ] **Paso 3 · La implementación.** El bucle de `:376` recorre `addAbilities` y empuja **un paso
      por característica**, con el modificador **bruto** en el paso y el recorte aparte — que es como
      está hoy y por un motivo escrito: si el paso lleva el ya recortado, la traza cuenta el tope dos
      veces.

- [ ] **Paso 4 · Córrelas** — las tres pasan.

- [ ] **Paso 5 · Comprueba la derivación entera**

```bash
pnpm --filter @dnd/api test -- rules
```

- [ ] **Paso 6 · Mutación** — haz que solo se sume la primera característica: la primera prueba se
      pone **roja**. Deshaz.

- [ ] **Paso 7 · Commit** — con la cita del SRD («Unarmored Defense») en inglés.

```bash
git add apps/api
git commit -m "feat(api): an AC formula can add more than one ability, with a cap per ability"
```

> **Esta tarea cambia una interfaz del motor: pide revisión aparte antes de seguir.**

---

## Tarea 6 · Un PNJ es competente con lo que su statblock describe

```
apps/api/src/rules/catalog/index.ts:115
  weaponProficiencies: [],
```

`deriveNpc` deja la lista vacía, así que si se le da una cimitarra del catálogo para que pueda
atacar, **tira a +2 donde el SRD da +4** — con el aviso `attack_not_proficient` encima, que es la
prueba de que el motor lo sabe y no puede hacer nada.

**Ficheros:**
- Modificar: `apps/api/src/rules/catalog/index.ts:115`
- Prueba: el spec del catálogo, y el de ataques si toca

- [ ] **Paso 1 · Escribe las pruebas que fallan**

```ts
it("un goblin con su cimitarra ataca a +4", () => {
  const hoja = deriveNpc(goblinSrd, { equipado: [cimitarra] });
  expect(hoja.attacks[0].toHit.total).toBe(4);
});

it("y sin el aviso de no-competencia", () => {
  const hoja = deriveNpc(goblinSrd, { equipado: [cimitarra] });
  expect(hoja.warnings.map((w) => w.code)).not.toContain("attack_not_proficient");
});

it("un PJ sin competencia SIGUE recibiendo el aviso y el −2", () => {
  const hoja = derivePersonaje(magaNivel3, { equipado: [espadaLarga] });
  expect(hoja.warnings.map((w) => w.code)).toContain("attack_not_proficient");
});
```

**La tercera es la que impide que el arreglo se lleve por delante la regla buena.**

- [ ] **Paso 2 · Córrelas** — las dos primeras fallan.
- [ ] **Paso 3 · La implementación:** un PNJ es competente con las armas que maneja. Un statblock del
      SRD ya trae su bono calculado, así que la vía barata y correcta es **declararlo competente con
      lo que lleve equipado**, no inventar una lista.
- [ ] **Paso 4 · Córrelas** — pasan.
- [ ] **Paso 5 · Mutación** — vuelve a `[]`: la primera se pone **roja**. Deshaz.
- [ ] **Paso 6 · Commit** — con la cita del SRD (la entrada del goblin y su *Scimitar +4*).

```bash
git add apps/api
git commit -m "fix(api): an NPC is proficient with the weapons its statblock describes"
```

---

## Tarea 7 · Consumir un objeto hace algo

```
apps/api/src/inventory/inventory.service.ts:457   async consume(...)
                                          :483   const itemDef = await resolveInventoryRowItem(...)
                                          :487   await tx.inventoryItem.delete(...)
                                          :489   await tx.inventoryItem.update(... quantity ...)
```

**`consume` resuelve la definición del objeto y nunca mira sus efectos.** Grep de `effects` en todo
`inventory.service.ts`: **cero**. Los efectos solo se leen al derivar la hoja, desde lo **equipado**
(`apps/api/src/rules/items.ts:154`, `apps/api/src/rules/attacks.ts:244`).

**Consecuencia:** beberse una poción **solo la borra del inventario**.

**Ojo con el alcance, y esto es lo importante:** los nueve efectos de objeto son **pasivos y
permanentes** —suman a una característica, a la CA—, no «cura 2d4+2». **Esta tarea no inventa un
efecto de curación**: eso es el paso 2, donde una poción será un objeto con una actividad.

**Si al hacerlo ves que ningún efecto actual tiene sentido al consumir, PARA y dilo**: entonces el
hallazgo es que **falta el tipo de efecto**, escríbelo en `docs/06-pendientes.md` con lo medido y
cierra la tarea ahí. **No fuerces una mecánica.**

**Ficheros:**
- Modificar: `apps/api/src/inventory/inventory.service.ts:457-490`
- Prueba: `apps/api/src/inventory/inventory.service.spec.ts`

- [ ] **Paso 1 · Mide primero qué efectos declaran los consumibles del catálogo**

```bash
pnpm --filter @dnd/api exec tsx -e "import {ITEMS} from './src/rules/catalog/items'; \
  console.log(ITEMS.filter(i => i.consumable).map(i => [i.key, i.effects?.length ?? 0]))"
```

**Apunta la salida y decide con ella.** Si sale todo a cero, ve al párrafo de arriba.

- [ ] **Paso 2 · Escribe la prueba que falla** (con un objeto que sí declare efecto):

```ts
it("consumir un objeto con efecto lo aplica, y el registro lo dice", async () => {
  await service.consume(jugadoraId, campaignId, personajeId, filaId);
  const hoja = await sheets.get(jugadoraId, campaignId, personajeId);
  expect(hoja.derived.ac.total).toBe(caAntes + 1);
  const suceso = (await eventos.list(dmId, campaignId))[0];
  expect(JSON.stringify(suceso.payload)).toMatch(/effect/i);
});
```

- [ ] **Paso 3 · Córrela** — falla.
- [ ] **Paso 4 · La implementación:** `consume` aplica los efectos que el objeto **ya declara** y lo
      escribe en el suceso. Nada más.
- [ ] **Paso 5 · Córrela** — pasa.
- [ ] **Paso 6 · Mutación** — quita la aplicación de efectos: se pone **roja**. Deshaz.
- [ ] **Paso 7 · Commit**

```bash
git add apps/api
git commit -m "feat(api): consuming an item applies the effects it declares"
```

---

## Tarea 8 · La resistencia al daño llega a un personaje jugador

**Vuelve del plan de la iniciativa**, que la dejó abierta a propósito porque es una funcionalidad y
no una gotera. Su ficha, con los cuatro pasos ya escritos, está en `docs/06-pendientes.md:244`.

Hoy los modificadores de daño solo se consultan si el personaje tiene statblock
(`apps/api/src/characters/character-sheet.service.ts:1138`), y **un PJ nunca lo tiene**
(`characters.service.ts:68` filtra `statblockRef: null` a propósito). Así que **un enano recibe el
veneno entero** y un tiefling **arde con el fuego entero**, con traza convincente al lado.

**La maquinaria ya existe y está probada** (`applyDamageModifiers`). **Lo que falta es de dónde salen
los modificadores de un PJ:** los rasgos de raza son puro texto (`rules/catalog/races.ts`,
`kind: "feature"` con `name` y `labelKey`), y **no existe ningún `kind` de concesión** para
resistencia en `rules/catalog/types.ts`.

**Ficheros:**
- Modificar: `apps/api/src/rules/catalog/types.ts` (el `kind` nuevo)
- Modificar: `apps/api/src/rules/catalog/races.ts` (enano y tiefling, del SRD)
- Modificar: `apps/api/src/rules/catalog/resolve.ts` (agregarlo a lo derivado, con su traza)
- Modificar: `apps/api/src/characters/character-sheet.service.ts` (`changeHp` lee la fuente nueva)
- Prueba: `apps/api/src/characters/character-sheet.service.spec.ts`

**Interfaces · produce:** `derived.damageModifiers`, con **la misma forma** que
`statblock.damageModifiers` de `@dnd/shared`. **No inventes un segundo esquema**: si acaban siendo
dos formas distintas de decir lo mismo, `changeHp` tendrá que saber de las dos.

- [ ] **Paso 1 · Escribe las pruebas que fallan**

```ts
it("un enano recibe la mitad del daño de veneno", async () => {
  const r = await sheets.changeHp(dmId, campaignId, enanoId, { delta: -10, damageType: "poison" });
  expect(r.hp.to).toBe(r.hp.from - 5);
});

it("y la traza dice por qué", async () => {
  const r = await sheets.changeHp(dmId, campaignId, enanoId, { delta: -10, damageType: "poison" });
  expect(JSON.stringify(r.damageTrace)).toMatch(/resist/i);
});

it("un humano recibe el daño entero", async () => {
  const r = await sheets.changeHp(dmId, campaignId, humanoId, { delta: -10, damageType: "poison" });
  expect(r.hp.to).toBe(r.hp.from - 10);
});
```

- [ ] **Paso 2 · Córrelas** — las dos primeras fallan.
- [ ] **Paso 3 · El `kind` nuevo en `types.ts`**, reutilizando el esquema de `damageModifiers`.
- [ ] **Paso 4 · Rellena `races.ts`** con los rasgos que el SRD 5.1 da estructurados —resistencia
      enana al veneno, resistencia del tiefling al fuego, y los demás que encuentres—. **Verifica
      cada uno en el SRD en inglés y pon la cita en el commit.**
- [ ] **Paso 5 · `resolve.ts` los agrega** en `derived.damageModifiers`, con su traza, igual que ya
      hace con velocidad o habilidades.
- [ ] **Paso 6 · `changeHp` lee esa fuente** cuando `statblockRef` es nulo. **Ojo:** la prueba
      `character-sheet.service.spec.ts:1364` afirma hoy lo contrario —«con `damageType` pero sin
      `statblockRef`, tampoco se reduce nada»—. **Esa prueba se corrige, no se borra**, y el commit
      dice por qué dejó de ser verdad.
- [ ] **Paso 7 · Córrelas** — pasan.
- [ ] **Paso 8 · Mutación** — quita el origen del modificador: la primera se pone **roja**. Deshaz.
- [ ] **Paso 9 · Tacha la ficha** de `docs/06-pendientes.md:244` con su fecha y su `fichero:línea`.
- [ ] **Paso 10 · Commit**

```bash
git add apps/api docs
git commit -m "feat(api): a player character's damage resistances finally apply"
```

---

## Tarea 9 · El descanso mueve el reloj · DESBLOQUEADA (D-A-1, 2026-09-06)

`apps/api/src/character-state/rest/rest.service.ts` **lee** el reloj (`:101`, `:153`, `:232`) y no lo
avanza nunca: `GameClockService.advance` tiene exactamente dos llamadores, el controlador del reloj y
`advanceTurn`.

**Consecuencia:** ocho horas de descanso no caducan nada, y la regla de «un descanso largo por 24 h»
bloquea de más hasta que el DM avance el reloj a mano.

**Es deliberado y está señalizado**: el 409 de `comprobarDescansoLargo` (`:141-158`) dice literalmente
«avanza el reloj de la campaña». **Así que esto es media decisión y media gotera, y no se arregla
solo.** Que un descanso mueva ocho horas **cambia el comportamiento de todo lo que caduca**.

**El autor lo decidió el 2026-09-06 y ya está escrito** en `docs/04-convenciones.md` y en
`docs/decisiones.md` como **D-A-1**: *«ya lo hace en combate; el descanso también. El DM programa el
descanso y decide, así se cierra entre sesión y sesión.»* **Largo 8 h, corto 1 h**, y la regla de un
descanso largo por 24 h sigue en pie — **y ahora se cumple sola**, sin que nadie avance el reloj a
mano.

- [ ] **Paso 0 · Lee la línea de `docs/04-convenciones.md`** antes de tocar nada, y comprueba que
      dice lo que este plan dice que dice. Si no está, **para**: alguien la borró.
- [ ] **Paso 1 · Pruebas:** un descanso largo avanza 8 h · uno corto, 1 h · las condiciones de
      minutos caducan solas al descansar · **dos descansos largos seguidos siguen dando 409** por
      las 24 h.
- [ ] **Paso 2 · Córrelas** — fallan.
- [ ] **Paso 3 · La implementación:** `rest.service` llama a `GameClockService.advance` dentro de su
      misma transacción, como hace `advanceTurn`.
- [ ] **Paso 4 · Córrelas** — pasan.
- [ ] **Paso 5 · Mutación** — quita la llamada a `advance`: la primera se pone **roja**. Deshaz.
- [ ] **Paso 6 · Commit**, con la línea de `04-convenciones.md` en el mismo commit.

```bash
git add apps/api docs
git commit -m "feat(api): a rest advances the campaign clock, as declared"
```

---

# GRUPO B · Las tres pantallas

**Las tres se abren en el navegador.** Una prueba unitaria en `jsdom` no demuestra que una pantalla
exista. **Playwright va en una sola tanda al final de las tres**, y no compiles la API mientras corre.

## Tarea 10 · Se puede crear un recurso desde la aplicación

```
apps/api/src/character-state/resources/resources.controller.ts:32   @Put(":key")
```

La ruta existe y funciona. La web llama a `/spend` (`api.ts:384`), `/give` (`:401`) y `/restore`
(`:425`) — **y nunca al `PUT`**. Así que se puede gastar, regalar y reponer un recurso, y **no
crearlo**; `seedResourcesFor` solo siembra dados de golpe y espacios de conjuro, o sea que **una fila
«Furia» no puede existir**.

**Esto importa más de lo que parece:** es la única puerta por la que una aptitud con usos entraría
hoy sin tocar el motor. **Enchufarla desbloquea trabajo del paso 2.**

**Ficheros:**
- Modificar: `apps/web/src/features/character-sheet/api.ts` (la función que falta)
- Modificar: `apps/web/src/features/character-sheet/hooks.ts` (su mutación + invalidación)
- Modificar: `apps/web/src/features/character-sheet/RecursosYDescansos.tsx` (el formulario)
- Prueba: `apps/web/src/features/character-sheet/__tests__/RecursosYDescansos.test.tsx`
- Prueba de navegador: `apps/web/e2e/recursos.spec.ts`

**Interfaces · consume:** `upsertResourceSchema` de `@dnd/shared`
(`key`, `label`, `current`, `max?`, `resetOn`, `grantedBy`) → `PUT /campaigns/:c/characters/:p/resources/:key`.

> **La regla de autorización, medida y no supuesta:** `resources.service.upsert` llama a
> `requireOwnerOrDM` y **solo rechaza** si el recurso es `DM_ONLY` y quien llama no es DM. O sea que
> **un jugador SÍ puede crearse un recurso `OWNER`**, y eso está bien. Lo que no puede es crearse uno
> `DM_ONLY`. La spec decía otra cosa; manda el código.

- [ ] **Paso 1 · Escribe las pruebas que fallan**

```tsx
it("el DM crea un recurso con nombre, actual y máximo", async () => {
  render(<RecursosYDescansos {...props} soyDm />);
  await userEvent.click(screen.getByRole("button", { name: /nuevo recurso/i }));
  await userEvent.type(screen.getByLabelText(/nombre/i), "Furia");
  await userEvent.type(screen.getByLabelText(/máximo/i), "2");
  await userEvent.click(screen.getByRole("button", { name: /crear/i }));

  expect(crearRecurso).toHaveBeenCalledWith(
    expect.objectContaining({ label: "Furia", max: 2, current: 2 }),
  );
});

it("un jugador puede crearse uno suyo, pero no uno que solo sube el DM", async () => {
  render(<RecursosYDescansos {...props} soyDm={false} />);
  await userEvent.click(screen.getByRole("button", { name: /nuevo recurso/i }));
  expect(screen.queryByRole("radio", { name: /solo el dm/i })).not.toBeInTheDocument();
});
```

- [ ] **Paso 2 · Córrelas** — fallan.
- [ ] **Paso 3 · La implementación.** El campo `resetOn` son **radios con explicación**, no un
      desplegable: son opciones con significado (`docs/04-convenciones.md`). Y **ningún valor de
      enum llega a la pantalla**: la forma legible se importa del vocabulario del dominio, no se
      escribe aquí.
- [ ] **Paso 4 · Córrelas** — pasan.
- [ ] **Paso 5 · El navegador**, en la tanda del final:

```ts
test("el DM crea «Furia 2/2», la jugadora la gasta y un descanso largo la repone", async ({ browser }) => {
  // … crear · gastar · descansar · comprobar 2/2 …
});
```

- [ ] **Paso 6 · Commit**

```bash
git add apps/web
git commit -m "feat(web): a resource can be created from the sheet, not only spent"
```

---

## Tarea 11 · Pelear con dos armas

`apps/web/src/features/inventory/PaginaDeInventario.tsx` **no manda `slot` al equipar**: grep de
`slot` en ese fichero, **cero apariciones**. El servidor lo acepta
(`updateInventoryItemSchema.slot`, `packages/shared/src/inventory.schema.ts:39`) y el motor lo usa —
`apps/api/src/rules/attacks.ts:72` mira `OFF_HAND` para la mano ocupada y `:163` para el arma ligera
en la izquierda—, pero **la pantalla no lo ofrece**.

**Consecuencia: un pícaro con dos dagas no existe.**

**Ficheros:**
- Modificar: `apps/web/src/features/inventory/PaginaDeInventario.tsx`
- Modificar: `apps/web/src/features/inventory/api.ts` (pasar `slot` en el `PATCH`)
- Prueba: `apps/web/src/features/inventory/__tests__/PaginaDeInventario.test.tsx`
- Prueba de navegador: `apps/web/e2e/dos-armas.spec.ts`

**Interfaces · consume:** `HAND_SLOTS = ["MAIN_HAND", "OFF_HAND"]` de
`packages/shared/src/item.schema.ts:210`.

- [ ] **Paso 1 · Escribe las pruebas que fallan**

```tsx
it("equipar un arma pide la mano y manda el slot", async () => {
  render(<PaginaDeInventario {...props} />);
  await userEvent.click(screen.getByRole("button", { name: /equipar daga/i }));
  await userEvent.click(screen.getByRole("radio", { name: /mano izquierda/i }));
  await userEvent.click(screen.getByRole("button", { name: /confirmar/i }));

  expect(actualizar).toHaveBeenCalledWith(
    expect.objectContaining({ location: "EQUIPPED", slot: "OFF_HAND" }),
  );
});

it("un arma a dos manos no ofrece la izquierda, y dice por qué", async () => {
  render(<PaginaDeInventario {...props} />);
  await userEvent.click(screen.getByRole("button", { name: /equipar espadón/i }));
  expect(screen.queryByRole("radio", { name: /mano izquierda/i })).not.toBeInTheDocument();
  expect(screen.getByText(/ocupa las dos manos/i)).toBeInTheDocument();
});
```

- [ ] **Paso 2 · Córrelas** — fallan.
- [ ] **Paso 3 · La implementación.** Las manos son **radios**, y el motivo por el que una no está
      disponible **se escribe**, no se deja adivinar.
- [ ] **Paso 4 · Córrelas** — pasan.
- [ ] **Paso 5 · El navegador:** equipar dos dagas y comprobar que **el cuadro de ataques muestra
      las dos**. Esa es la prueba de que el motor lo recibió, no la pantalla.
- [ ] **Paso 6 · Commit**

```bash
git add apps/web
git commit -m "feat(web): a weapon can be equipped in the off hand, so two-weapon fighting exists"
```

---

## Tarea 12 · El editor de criaturas deja de mentir al editar

**Más pequeño de lo que dice la spec, y esto se comprobó el 2026-09-06.** El selector **ya existe y
ya se pinta al crear**:

```
apps/web/src/features/bestiario/EditorDeStatblock.tsx:546   <VisibilityChooser … />
```

Lo que falla es **la otra rama del ternario** (`:525-530`): al **editar** una criatura existente se
pinta un párrafo que dice *«Quién la ve no se toca desde aquí: el servidor no manda ese dato al leer
la criatura»*. **El servidor sí lo manda** — `aStatblock` lo devuelve y `borradorDe` (`:125-126`) ya
lo recoge con `visibility: s.visibility ?? "DM_ONLY"`.

**Consecuencia: no hay forma de cambiar quién ve una criatura propia ya creada.** Y el texto incumple
la regla vinculante: *si el texto explica una regla del servidor y discrepan, miente el texto*.

**Ficheros:**
- Modificar: `apps/web/src/features/bestiario/EditorDeStatblock.tsx:524-550`
- Prueba: `apps/web/src/features/bestiario/__tests__/EditorDeStatblock.test.tsx`
- Prueba de navegador: en el spec de bestiario que ya exista, o `apps/web/e2e/bestiario.spec.ts`

- [ ] **Paso 1 · Escribe las pruebas que fallan**

```tsx
it("editar una criatura enseña su visibilidad actual", () => {
  render(<EditorDeStatblock statblock={{ ...ogro, visibility: "PUBLIC" }} />);
  expect(screen.getByRole("radio", { name: /toda la mesa/i })).toBeChecked();
});

it("y ya no dice que el servidor no manda ese dato", () => {
  render(<EditorDeStatblock statblock={ogro} />);
  expect(screen.queryByText(/no manda ese dato/i)).not.toBeInTheDocument();
});
```

- [ ] **Paso 2 · Córrelas** — fallan.
- [ ] **Paso 3 · La implementación:** borra el ternario y pinta `<VisibilityChooser>` en los dos
      casos, sembrado con `b.visibility`. **El comentario largo de `:532-544` se conserva** —explica
      por qué no se ofrecen `SPECIFIC_PLAYERS` ni `OWNER_DM`— y **el párrafo mentiroso se borra**.
- [ ] **Paso 4 · Córrelas** — pasan.
- [ ] **Paso 5 · El navegador:** cambiar la visibilidad de una criatura propia, recargar, y
      comprobar que **una cuenta de jugador no ve una `DM_ONLY`**. Esa segunda mitad es la que
      demuestra que el cambio llegó al servidor.
- [ ] **Paso 6 · Commit**

```bash
git add apps/web
git commit -m "fix(web): the creature editor lets you change who sees an existing creature"
```

---

## Tarea 13 · La cola larga · SOLO SI SOBRA TIEMPO

**Ninguna impide jugar. No las mezcles con las de arriba, y una por commit.**

| Qué | Dónde | Por qué duele |
|---|---|---|
| `hp: "ROLL"` inalcanzable | `apps/web/src/features/bestiario/PanelDeBestiario.tsx` (cero apariciones de `ROLL`) | Seis goblins salen con los mismos PG |
| El nombre de una tanda de PNJ | mismo fichero | Seis «Goblin» sin distinguir |
| Volver un objeto a «Guardado» | inventario | No se puede desequipar a la bolsa |
| `storedAt` se pinta y no se escribe | inventario | Promete un dato que nadie puede poner |
| `note` no existe en pantalla | inventario | — |
| `contra.reasons` se calcula y se tira | `character-sheet.service.ts` | Se pierde el porqué de una ventaja |
| `rollSuggestions.attack` sin lector | ídem | Trabajo hecho, sin usar |
| Diez campos del editor de criaturas | `EditorDeStatblock.tsx` | Reacciones, acciones legendarias, resistencias, sentidos, velocidades que no sean andar |

---

# Añadido tras releer el informe de la noche (2026-09-06)

**La spec del paso 1 se escribió el 2026-09-05 por la tarde, y esa noche pasaron cosas.** Al
repasar `Mine/informe-iniciativa-y-bando.md` y las fichas abiertas de `docs/06-pendientes.md`
aparecieron **cinco cosas que encajan aquí y no estaban en la spec**. Van con el mismo criterio: son
goteras o cosas construidas y no enchufadas, no funcionalidades nuevas.

## Tarea 0 · Tachar lo que anoche cerró y no tachó · VA ANTES QUE NADA

**Dos fichas describen como pendiente algo que ya está hecho**, y este documento no puede mentir en
las dos direcciones:

- `docs/06-pendientes.md:190` — «El ataque comparado contra la CA existe en el servidor y ninguna
  pantalla lo llama». **Comprobado el 2026-09-06:** `apps/web/src/features/character-sheet/api.ts:563`
  exporta `resolveAttack` y `hooks.ts:397` lo llama. La cerró la tarea 13.
- `docs/06-pendientes.md:286` — «Un cuadro de ataques vacío no dice por qué». **Comprobado:**
  `AtaquesYLanzamiento.tsx:157-164` ya lo explica y enlaza a la Bolsa. La cerró la tarea 15.

- [ ] **Paso 1** · Comprueba tú las dos citas antes de tachar. Si alguna no cuadra, **no taches**:
      busca el mecanismo.
- [ ] **Paso 2** · Táchalas con su fecha y su `fichero:línea`, y muévelas al archivo como se hace
      aquí.
- [ ] **Paso 3 · Commit**

```bash
git add docs
git commit -m "docs(pendientes): two fichas describe as missing what last night shipped"
```

---

## Tarea 14 · El panel de dados, montado

```
apps/web/src/features/rolls/panel/PanelDeDadosDeLaMesa.tsx
```

Está **construido, revisado y en `main`**, y `grep -rn "PanelDeDadosDeLaMesa" apps/web/src` devuelve
**solo su declaración**. La fila ALTA de la auditoría —«no hay dados en la mesa»— sigue igual que
antes de construirlo. **Es el caso número cinco de «una ficha no se cierra sin pantalla»**
(`docs/06-pendientes.md:1305`).

**Ficheros:**
- Modificar: el compositor de la mesa (el que monta `RailDePaneles`)
- Prueba: el test del compositor
- Prueba de navegador: en la tanda del final

- [ ] **Paso 1 · La prueba que falla**

```tsx
it("la mesa ofrece los dados, y el panel se monta fuera del <main>", async () => {
  render(<MesaDeSesion {...props} />);
  await userEvent.click(screen.getByRole("button", { name: /dados/i }));
  const panel = screen.getByTestId("panel-de-dados");
  expect(panel.closest("main")).toBeNull();
});
```

- [ ] **Paso 2 · Córrela** — falla.
- [ ] **Paso 3 · La implementación**, que la ficha ya deja escrita: una entrada `"dados"` en
      `RailDePaneles` y el panel montado **fuera del `<main>`**, con `campaignId`, `sessionId`,
      `characterId` y `onCerrar`. Va a **`z-30`** frente al `z-40` de los cajones, que es como la
      maqueta los hace convivir.
- [ ] **Paso 4 · Córrela** — pasa.
- [ ] **Paso 5 · El navegador**, en la tanda del final: abrir los dados, tirar, y ver la tirada en
      el hilo. **Y comprueba el apilamiento de verdad**, que `jsdom` no maqueta: el panel por
      encima de la mesa y por debajo de un cajón abierto.
- [ ] **Paso 6 · Tacha la ficha** y commit.

```bash
git add apps/web docs
git commit -m "feat(web): the table finally has dice — the built panel is mounted"
```

---

## Tarea 15 · Un PNJ cedido a un jugador se puede manejar desde su pantalla

El servidor **ya trata a un PNJ cedido por dueño**: `encounters.service.ts:244-245` separa las
peticiones de iniciativa por `ownerId` sin mirar `statblockRef`, y `requireEditable` le dejaría
cambiarle los PG y ponerle condiciones. **La pantalla es más restrictiva que el servidor**: solo da
mandos al DM, porque `NpcEnLaMesa` (`apps/web/src/features/bestiario/api.ts`) **no trae `ownerId`** —
no hay dato del que leer «es tuyo» (`docs/06-pendientes.md:1617`).

**No es un agujero de seguridad** —la pantalla nunca promete más de lo que da— pero sí una función
que el servidor permite y la interfaz no deja usar: un jugador con un PNJ cedido **no puede anotarle
el golpe que acaba de recibir** sin pedírselo al DM.

**Ficheros:**
- Modificar: `apps/api/src/statblocks/npcs.controller.ts` y su tipo de respuesta (`ownerId`)
- Modificar: `apps/web/src/features/bestiario/api.ts` (`NpcEnLaMesa`)
- Modificar: `apps/web/src/features/sessions/elenco/FichaDePnj.tsx`
- Prueba: el spec de `npcs` en API, y el de `FichaDePnj` en web

- [ ] **Paso 1 · Las pruebas que fallan**

```ts
it("GET /npcs devuelve el dueño de cada PNJ", async () => {
  const [pnj] = await controller.list(dmId, campaignId);
  expect(pnj).toHaveProperty("ownerId");
});
```

```tsx
it("el dueño de un PNJ cedido ve sus mandos; otro jugador no", () => {
  render(<FichaDePnj pnj={{ ...goblin, ownerId: miId }} miId={miId} soyDm={false} />);
  expect(screen.getByRole("button", { name: /daño/i })).toBeInTheDocument();

  render(<FichaDePnj pnj={{ ...goblin, ownerId: "otro" }} miId={miId} soyDm={false} />);
  expect(screen.queryByRole("button", { name: /daño/i })).not.toBeInTheDocument();
});
```

- [ ] **Paso 2 · Córrelas** — fallan.
- [ ] **Paso 3 · La implementación:** `ownerId: string | null` en la respuesta, y en la web
      condicionar los mandos a `pnj.ownerId === miId` **además de** al DM, igual que ya hace
      `FichaDeElenco` con `puedeCambiarPg`. **Esconder el botón no es control de acceso**: la puerta
      real sigue siendo `requireEditable` en el servidor, y esto es cortesía.
- [ ] **Paso 4 · Córrelas** — pasan.
- [ ] **Paso 5 · Mutación** — deja `ownerId` fuera de la respuesta: la primera se pone **roja**.
      Deshaz.
- [ ] **Paso 6 · Tacha la ficha** y commit.

```bash
git add apps/api apps/web docs
git commit -m "feat: a player who owns a lent NPC can finally manage it from the table"
```

---

## Tarea 16 · Corregir el bando viaja por el canal en vivo

`EncountersService.setSide` corrige el bando y **no llama a `GameEventsService.record`**, así que una
segunda pestaña **no se entera hasta que refresque**. Lo mismo con el reajuste de `activePosition`
que la tarea 5 de anoche añadió a `setInitiative`: el turno activo cambia de combatiente y **nadie
se entera** (`docs/06-pendientes.md:410`).

**La ficha decía «que lo decidan las tareas 8 y 10, que montan la pantalla». Ya están montadas**, así
que el vocabulario se puede decidir con la pantalla delante, que era la condición.

**Ficheros:**
- Modificar: `packages/shared/src/game-event.schema.ts` (los tipos nuevos)
- Modificar: `apps/api/src/encounters/encounters.service.ts` (`setSide`, `setInitiative`)
- Modificar: `apps/web/src/features/sessions/hilo/tipo-de-mensaje.ts` y `linea-de-log.ts`
- Prueba e2e: `apps/api/test/encounters.e2e-spec.ts`
- Prueba de navegador: la de dos navegadores que ya existe

- [ ] **Paso 1 · La prueba que falla**

```ts
it("corregir el bando deja suceso, y dice de qué lado a cuál", async () => {
  await service.setSide(dmId, campaignId, sessionId, encounterId, combatanteId, { side: "ALLY" });
  const [suceso] = await eventos.list(dmId, campaignId);
  expect(suceso.type).toBe("COMBATANT_SIDE_CHANGED");
  expect(suceso.payload).toMatchObject({ from: "ENEMY", to: "ALLY" });
});
```

- [ ] **Paso 2 · Córrela** — falla.
- [ ] **Paso 3 · La implementación.** Dos tipos nuevos en el vocabulario cerrado, su línea de
      registro en español, y el `record` dentro de **la misma transacción** que la escritura. **Un
      valor de enum de PostgreSQL se añade, nunca se edita.**
- [ ] **Paso 4 · Córrela** — pasa.
- [ ] **Paso 5 · Mutación** — quita el `record`: se pone **roja**. Deshaz.
- [ ] **Paso 6 · El navegador:** dos pestañas, el DM corrige el bando en una y **la otra lo ve sin
      recargar**. Esa es la prueba de que viaja por el canal y no por el sondeo.
- [ ] **Paso 7 · Tacha la ficha** y commit.

```bash
git add packages/shared apps/api apps/web docs
git commit -m "feat: correcting a side and a turn shift travel on the live channel"
```

---

## Tarea 17 · La sala de espera no puede leer «todos han tirado» por un corte de página

`apps/api/src/roll-requests/roll-requests.service.ts:97-107`: la lista pendiente sale con `take: 50`
por `createdAt desc` **sin filtro por `encounterId`**. Una campaña con más de 50 peticiones
pendientes de otro tipo empujaría fuera del corte las de iniciativa del combate recién abierto, y
`TiraDeIniciativa.tsx` leería **«todos han tirado»** sin que nadie hubiera tirado: el `[]` de la
página 50 es indistinguible de «cero pendientes de verdad» (`docs/06-pendientes.md:1606`).

**Ficheros:**
- Modificar: `apps/api/src/roll-requests/roll-requests.service.ts:97-107`
- Modificar: `packages/shared/src/roll-request.schema.ts` (el filtro, si hace falta)
- Prueba: `apps/api/src/roll-requests/roll-requests.service.spec.ts`

- [ ] **Paso 1 · La prueba que falla**

```ts
it("con 60 peticiones de otro tipo, las de un encuentro siguen saliendo", async () => {
  for (let i = 0; i < 60; i++) await crearPeticionSuelta();
  const { id: encounterId } = await empezarCombate();
  const pendientes = await service.list(dmId, campaignId, { encounterId });
  expect(pendientes).not.toHaveLength(0);
});
```

- [ ] **Paso 2 · Córrela** — falla.
- [ ] **Paso 3 · La implementación:** `list` acepta `encounterId` y filtra por él. **No subas el
      `take`**: un tope más alto solo mueve el problema más lejos.
- [ ] **Paso 4 · Córrela** — pasa.
- [ ] **Paso 5 · Mutación** — quita el filtro: se pone **roja**. Deshaz.
- [ ] **Paso 6 · Tacha la ficha** y commit.

```bash
git add apps/api packages/shared docs
git commit -m "fix(api): pending rolls can be asked for by encounter, not just the last fifty"
```

---

## Tarea 18 · La fuga del PNJ revelado · DESBLOQUEADA (D-A-2, 2026-09-06)

**Es lo más grave de lo que quedó fuera de la spec**, y no se arregla solo porque las dos salidas son
decisiones del autor y **no son equivalentes** (`docs/06-pendientes.md:1222`).

Sobre una corrida real, un jugador que pide la hoja de un PNJ revelado recibe:

```
"str":18,"dex":8,"con":18,"int":6,"wis":12,"cha":5      ← las del statblock DM_ONLY
"currentHp":85
"reason":"Los números de este PNJ no son públicos: su ficha es del DM."
```

**La misma respuesta dice que sus números no son públicos y trae seis de ellos.** Con las seis
características se reconstruyen los seis modificadores de salvación, los dieciocho de habilidad y la
iniciativa.

**Y no es un descuido:** `npcs.service.ts:69` copia las características a la fila de `Character` al
instanciar —decisión D-2D-2, «un PNJ en la mesa es una fila de `Character`»— y `getSheet` devuelve
esa fila a quien pasa `canSee`. **Las dos piezas son correctas por separado.**

**El autor eligió la salida (a) el 2026-09-06** —ocultar— **con una excepción nombrada: los PG
actuales sí se ven.** Está escrito en `docs/04-convenciones.md` y en `docs/decisiones.md` como
**D-A-2**. El motivo es de mesa y conviene tenerlo delante al implementar: **saber que un enemigo
está malherido se ve en la ficción y es información legítima; su hoja no lo es.**

Así que, para un PNJ `PUBLIC` visto por un jugador que no es su dueño:

```
currentHp        ← SÍ se ve
str dex con int wis cha · maxHp · AC · competencia · traza · nota del libro   ← NO
```

- [ ] **Paso 1 · La prueba que lo destapa es UNA LÍNEA**, y la ficha ya la deja escrita:
      `pnj-en-la-mesa.e2e-spec.ts` recorre **cada valor** del cuerpo desde el 2026-09-04, así que
      `expect(valores).not.toContain(18)` **se pondría roja hoy**. Escríbela primero.

- [ ] **Paso 2 · Y escribe la otra mitad, que es la que evita pasarse de celo:**

```ts
it("pero los PG actuales SÍ los ve: saber que está malherido es de la mesa", async () => {
  const cuerpo = await hojaComoJugador(pnjPublicoId);
  expect(cuerpo.currentHp).toBe(85);
  expect(cuerpo.hp.max).toBeNull();
});
```

- [ ] **Paso 3 · Implementa el ocultado** en el camino de lectura, **no en la pantalla**: quien
      responde es el servidor, y esconder un campo en el navegador no es esconderlo. Cuida que la
      frase que acompaña la respuesta **diga lo que ahora es verdad** — si sigue diciendo «sus
      números no son públicos» mientras manda los PG, vuelve a mentir, solo que menos.
- [ ] **Paso 4 · Mutación** — devuelve la fila entera: la prueba del paso 1 se pone **roja**.
      Deshaz. Y quita `currentHp`: la del paso 2 se pone roja. **Las dos direcciones, porque la
      decisión tiene dos mitades.**
- [ ] **Paso 5 · Tacha la ficha** y commit.

```bash
git add apps/api docs
git commit -m "fix(api): a revealed NPC shows its current hit points and nothing else"
```

---

## Tarea 19 · Cancelar un combate avisa a quien estaba esperando · DECIDIDA (D-A-3, 2026-09-06)

Hoy `EncountersService.cancel` borra el `Encounter` y sus `RollRequest` **sin escribir ningún
suceso**, a propósito: *«no es historia, es un clic deshecho»*. El coste quedó anotado y **el autor
lo revisó el 2026-09-06**: *«sí avisa al jugador; pese a que no queda trazabilidad, puede descolocar
a un jugador»*.

**Esto corrige la decisión anterior** (E-IB-4 en `docs/decisiones.md`), y el motivo del cambio es el
jugador, no el historial: a quien tenía una petición pendiente **le desaparece la entrada de la
bandeja sin explicación**.

**La trampa de diseño, que la ficha ya dejó resuelta:** el sujeto del suceso **no puede ser el
encuentro** —ya no existe para serlo—. Tiene que ser la **sesión** (`subjectType: "session"`), con un
tipo nuevo en `packages/shared/src/game-event.schema.ts`, **sin ligar a ningún `Encounter`** porque
para cuando alguien lo lea no habrá ninguno que enlazar.

**Ficheros:**
- Modificar: `packages/shared/src/game-event.schema.ts` (junto a `ENCOUNTER_STARTED`, línea 97)
- Modificar: `apps/api/src/encounters/encounters.service.ts` (`cancel`)
- Modificar: `apps/web/src/features/sessions/hilo/tipo-de-mensaje.ts` y `linea-de-log.ts`
- Prueba: el spec del servicio, y su e2e

- [ ] **Paso 1 · Escribe las pruebas que fallan**

```ts
it("cancelar deja un suceso de SESIÓN, no de encuentro", async () => {
  await service.cancel(dmId, campaignId, sessionId, encounterId);
  const [suceso] = await eventos.list(dmId, campaignId);
  expect(suceso.type).toBe("ENCOUNTER_CANCELLED");
  expect(suceso.subjectType).toBe("session");
  expect(suceso.subjectId).toBe(sessionId);
});

it("y el jugador que esperaba lo ve en su bandeja", async () => {
  await pedirIniciativa();
  await service.cancel(dmId, campaignId, sessionId, encounterId);
  const avisos = await avisosDe(jugadoraId);
  expect(avisos.some((a) => /combate.*cancelado/i.test(a.texto))).toBe(true);
});
```

- [ ] **Paso 2 · Córrelas** — fallan.
- [ ] **Paso 3 · La implementación.** El `record` va **dentro de la misma transacción** que el
      borrado: si el borrado se deshace, el aviso no puede quedarse. **Un valor de enum de
      PostgreSQL se añade, nunca se edita ni se borra.** Y su línea de registro se escribe en
      español en `linea-de-log.ts`, con el vocabulario que ya existe.
- [ ] **Paso 4 · Córrelas** — pasan.
- [ ] **Paso 5 · Mutación** — quita el `record`: la primera se pone **roja**. Deshaz.
- [ ] **Paso 6 · Tacha la ficha** (`docs/06-pendientes.md:145`) y **corrige E-IB-4 en
      `docs/decisiones.md`**, que decía lo contrario: no se borra, se dice que el autor la revisó y
      por qué.
- [ ] **Paso 7 · Commit**

```bash
git add packages/shared apps/api apps/web docs
git commit -m "feat: cancelling a fight tells the players who were waiting for it"
```

---

## Y esto va a la cola larga de la tarea 13

- **La mesa a 390 px reparte sus tres columnas a lo ancho** (`docs/06-pendientes.md:370`). Es
  posición y tamaño: **se mide en el navegador con números**, no en `jsdom`. Cabe en la misma tanda
  de Playwright que las tareas 10 a 12 y la 14.
- **`OWNER_DM` en un statblock se comporta como `DM_ONLY`** (`:1331`).

**Y esto NO entra en el paso 1, a propósito:** «nadie propone terminar el combate» (`:335`) es una
funcionalidad con su propia media pieza construida, no una gotera; la vitela de «Lectura» (`:429`) y
el tema Claro (`:448`) son del carril gráfico. Se quedan donde están.

---

## Definición de terminado

`pnpm verify` en verde · **las tres de B abiertas en el navegador**, no solo en `jsdom` · **las citas
del SRD en inglés** en los commits de las tareas 3, 4, 5, 6 y 8 · **una mutación por tarea**, probada
y deshecha · las fichas correspondientes **tachadas** en `docs/06-pendientes.md` con su fecha y su
`fichero:línea` · y `docs/07-historial.md` con su entrada.

## Lo que este plan NO hace

**No mecaniza ninguna aptitud, no añade ningún conjuro y no crea la economía de acciones.** Eso es el
paso 2, y meterlo aquí convertiría trece arreglos independientes en una fase con dependencias.

Lo que sí hace es **dejar de mentir**: hoy tres números salen mal con traza convincente, y construir
el paso 2 encima de una medición falsa es edificar sobre arena.

---

# Avance

**Se escribe al cerrar CADA tarea, no al final del día.** Es lo único que sobrevive a que se
compacte el contexto de quien ejecuta: si eso pasa, se relee el plan, este bloque y `git log`, y se
sigue **por donde diga este bloque**, no por donde se crea recordar.

**Correcciones al plan encontradas al ejecutarlo** (el plan es un encargo fechado: se corrige
encima, no se reescribe):

- **`conditionImmunities` es `text[]`, no `jsonb`.** La migración que el plan propone
  (`jsonb_array_elements_text`) falla con `function jsonb_array_elements_text(text[]) does not
  exist` — comprobado contra la base el 2026-09-06. La escrita usa `unnest` + `array_agg`. Y el
  paso 1 del plan («mira qué hay guardado antes de tipar nada») dio **una** fila de statblock
  propio con la lista **vacía**: no había nada que mapear en desarrollo, pero producción es otra
  base y por eso la migración se escribe igual.

- **El paso de traza se distingue por `op`, no por `kind`.** La prueba que el plan escribe
  (`ca.steps.filter((s) => s.kind === "add")`) no compila contra `TraceStep`. Con el campo
  corregido, `src/rules` pasa de «675» a **733**.

  > **Y aquí me equivoqué yo, y la revisión de la tarea 5 lo midió.** Escribí —aquí y en el commit
  > `f460ea0`— que `npx jest --silent` imprime un conteo verde para un fichero que no compila «sin
  > una sola línea de error», y **es falso**: jest imprime `FAIL`, el error de TypeScript entero,
  > `Test Suites: 1 failed` y **sale con código 1**, así que `pnpm verify` y el gancho lo cazan. Lo
  > que sí es cierto, y es la mitad útil, es que **la línea `Tests: N passed` sale verde y no
  > incluye el fichero**. Lo que me lo ocultó fue **mi propio `grep`**: filtraba por `Tests:` —que
  > no casa con `Test Suites:`— y por `error TS`, que tampoco casaba porque jest mete códigos ANSI
  > **entre** las dos palabras (`error[0m[90m TS2339`). La lección buena no es sobre jest:
  > **un `grep` sobre salida coloreada puede tragarse justo la línea que buscas.**

- **La constante se llama `CLAVE_AYUDA`, no `CLAVE_DE_AYUDA`.** Ya existía en
  `packages/shared/src/character-state.schema.ts` desde el plan 08; la tarea 1 solo le añade
  `esClaveReservada` al lado en vez de declararla otra vez.

- **La tarea 19 cita `E-IB-4` y la decisión que corrige es `E-IB-18`.** Comprobado el 2026-09-06
  sobre `52a9c5c`: `docs/decisiones.md:323` (E-IB-4) habla de la firma real de
  `GameEventsService.record`, y la de «`cancel()` no escribe suceso» es **E-IB-18**
  (`docs/decisiones.md:337`), con `E-IB-12` al lado nombrando la misma decisión del autor. Al
  ejecutar la tarea 19 se corrige **E-IB-18**.

- **De la partición en 4a/4b se conserva el ORDEN, no el commit aparte.** El aviso pedía commitear
  primero la prueba **roja**, y tiene razón en lo que importa: sin ese rojo el campo nuevo se
  añadiría por fe. La prueba se escribió primero y se midió roja —`Expected: "ADVANTAGE" /
  Received: "NORMAL"`, con el arreglo sin escribir— y eso queda en el mensaje del commit. Pero
  **dejarla roja en `main` choca con una regla que no se negocia** («ninguna tarea se cierra sin
  prueba real en verde»), y la precedencia dice que manda el `CLAUDE.md` del repositorio sobre una
  sugerencia de proceso. Así que van en un commit.

- **La tarea 4 se parte en 4a y 4b, y la 8 en 8a y 8b.** Aviso de la sesión de acompañamiento
  (`d-d-plataform-ea`) el 2026-09-06, comprobado antes de aceptarlo. **4a** es la prueba e2e
  reescrita con un combate real, sola y **roja** contra el código de hoy: sin ese rojo el campo
  nuevo se añadiría por fe. **4b** es el campo, la migración, el borde `sourceStart` y
  `condicionVencida`. **8a** es el `kind` nuevo, `races.ts` con las razas del SRD y `resolve.ts`
  agregando con traza —se prueba entero sin tocar un punto de golpe—, y **8b** es `changeHp`
  leyendo esa fuente, con la corrección de `character-sheet.service.spec.ts:1364`. La mutación de
  la 8 va en 8b, que es donde está lo que protege. **No es trabajo extra:** el mismo código con la
  mitad de superficie por revisión.

**Y una cosa que no estaba en el plan y bloqueaba el día entero:** `pnpm verify` salía **rojo sobre
el árbol limpio**, y verde en la pasada anterior sin ningún cambio de código en medio.
`EdicionEnSitio.test.tsx` hacía `await import()` **dentro** de tres pruebas, así que el coste de
transformar esos módulos contaba dentro de su presupuesto de 5 s; con la máquina cargada se agota,
la prueba muere por `Test timed out in 5000ms` **sin haber medido nada**, su DOM no se limpia, y la
siguiente cuenta doce «sin calcular» donde hay seis. Verde tres de tres en solitario y roja dentro
de la suite: esa asimetría es la firma. Arreglado subiendo los `import` arriba (`e926b91`).

**Y algo que hay que decir de `36ab260`, porque su mensaje no lo dice:** ese commit contiene además
**dos arreglos de maquetación que no escribió esta sesión** —la tira fija de `HojaCalculada` dentro
de un cajón, y el botón «Aplicar» de `PanelMonedas` saliéndose de su tarjeta—. Los hizo la sesión de
acompañamiento en el mismo árbol y mi `git add -A` los recogió. Son cuatro clases, dos `import type`
y dos objetos `style`: cero lógica, y `pnpm verify` pasó con ellos dentro. **No se reescribe el
commit** —ya está en la historia y rehacerla a mitad de plan es peor—, se dice aquí y en
`07-historial.md`. Es exactamente la trampa que `docs/04-convenciones.md` describe: **un
implementador por árbol**.

**Y una trampa de esta máquina que me costó dos veces: `git checkout -- <fichero>` para deshacer
una mutación se lleva por delante TODO lo no commiteado de ese fichero**, no solo la mutación. Pasó
con `conditions.service.ts` dos veces. Se deshace con la edición inversa, nunca con `checkout`.

**Lo que la revisión de 2 y 3 dejó pendiente y va a la tarea 12**, porque es su mismo fichero: el
editor de criaturas **no tiene ningún control para las inmunidades a condición**, así que un DM no
puede declarar ninguna, y al guardar reenvía la lista ya filtrada —o sea que la primera edición por
cualquier otro motivo **borraría** una etiqueta que la migración no supiera mapear. El comentario de
la migración que afirmaba lo contrario ya está corregido, y su mapa ampliado con las formas
femeninas y `veneno`, que son justo las que escribiría quien no las puede volver a escribir.

**Decisiones tomadas sin el autor, con lo que costarían si me equivoco:**

- **Tarea 9 · el avance del reloj por descanso NO exige ser DM.** `GameClockService.advance` pide
  `requireDM`, y declarar un descanso es de **dueño o DM**: con la comprobación puesta, un jugador
  que descansara recibiría un 403 en mitad de su propio descanso. Se parte en dos: `advance`
  —la puerta HTTP, que sigue siendo del DM— y `avanzar`, interna, para quien **ya comprobó su
  autoridad** y mueve el reloj como consecuencia de lo que acaba de autorizar. Lo que avanza no lo
  elige quien llama: son ocho horas o una, fijas por el tipo de descanso. **El coste aceptado:** un
  jugador puede mover el reloj descansando, y eso es visible —el avance escribe su suceso
  `PLAYERS`—. **Si me equivoco cuesta una línea**: exigir DM dentro de `declare` para el avance.

- **Tarea 7 · consumir aplica los efectos como modificadores temporales SIN duración.** El paso 1
  del plan pedía medir primero qué efectos declaran los consumibles del catálogo, y la medición
  dice que **el catálogo del SRD no tiene ni un solo objeto `CONSUMABLE`**: los únicos consumibles
  con efectos son los que escribe el DM. De los nueve efectos de objeto, **tres** caben en el
  vocabulario cerrado de los modificadores temporales (CA, característica, velocidad) y seis no.
  Se aplican los tres con `expiresAtClock: null` —«hasta que alguien lo quite», que es lo que ya
  significa ese `null`— y **los seis restantes se nombran en el suceso** en vez de descartarse en
  silencio. No se inventa ningún efecto de curación: eso es el paso 2. **Si me equivoco cuesta un
  `UPDATE`**: los modificadores son filas que el DM ya sabe quitar desde su pantalla.

- **Tarea 1 · un jugador deja de poder tumbarse solo.** La regla que el plan escribe es uniforme
  —clave del SRD ⇒ solo el DM— y `prone` es una de las quince, así que «me tumbo» pasa a
  pedírselo al DM. La alternativa era una lista de condiciones «que solo te perjudican», y eso es
  justo lo que el paso 1 de los cuatro llama abrir un frente nuevo: habría que revisarla cada vez
  que el motor lea una condición más. **Si me equivoco cuesta una línea**: sacar `prone` (y las
  que se decidan) de `esClaveReservada`, que vive en un solo sitio.

- **Tarea 5 · la Defensa sin armadura NO se añade al catálogo de clases.** El modelo ya puede
  decirla y las pruebas la usan como fixture, pero mecanizar la aptitud del bárbaro y la del monje
  es el paso 2 (*«no mecaniza ninguna aptitud»*). **Si me equivoco cuesta una fila de catálogo**,
  no un rediseño: la interfaz que hacía falta ya está.

| Tarea | Estado | Commit | Qué cerró |
|---|---|---|---|
| — · `EdicionEnSitio` inestable | ✅ | `e926b91` | Bloqueaba **todos** los commits del día |
| 0 · Tachar lo que anoche cerró | ✅ | `6f94334` | Las dos fichas comprobadas una a una antes de tachar; van al archivo, no tachadas en el documento vivo |
| — · Un e2e afirmaba lo contrario que su código | ✅ | `3ec2d76` | `character-state` esperaba **201** al reponer un `DM_ONLY` siendo el dueño; `1758c21` lo cerró a propósito y la prueba llevaba roja desde entonces **sin que nadie mirara**, porque los e2e no entran en `pnpm verify` |
| 1 · Un jugador no se concede una mecánica | ✅ | `62e3d7b` | `helped` no entra por la puerta genérica **para nadie**; una clave del SRD, solo el DM |
| 5 · La CA suma más de una característica | ✅ | `f460ea0` | `addAbilities` con **tope por característica**; `addAbility`/`abilityCap` desaparecen sin alias |
| — · Revisión de la tarea 1 (10 hallazgos) | ✅ | `5081c46` | `remove()` era la otra mitad de la puerta; una prueba había dejado de medir la propiedad; tres comentarios mentían |
| 2 · Las inmunidades a condición dejan de ser prosa | ✅ | `fc01106` | `srdConditionSchema`, migración de datos y `apply` rechaza con motivo |
| — · Revisión de la tarea 5 (6 hallazgos) | ✅ | `36ab260` | El recorte de la traza nombra la característica; una característica repetida lanza; **y una afirmación mía era falsa** |
| — · El historial no cabía | ✅ | `02c19d8` | Seis entradas por tarea al archivo, enteras |
| 3 · Una sola concentración | ✅ | `a812ae1` | La segunda retira la primera **con su suceso**; el segundo defecto (una salvación para dos) desaparece solo |
| 4 · Ayudar caduca cuando el SRD dice | ✅ | `7b2b8c2` | Borde de turno; **4a y 4b van juntas** (abajo el porqué) |
| — · Revisión de 2 y 3 (13 hallazgos) | ✅ | `b95635f` | Las unitarias de concentración **no medían el `where`**; el mapa de la migración perdía las formas femeninas; un `@Optional()` fallaba abierto |
| 6 · Un PNJ es competente con sus armas | ✅ | `5518aec` | Las dos categorías enteras, no una lista inventada; el PJ sin competencia **sigue** con su aviso |
| 7 · Consumir un objeto hace algo | ✅ | `ceecb64` | Aplica los efectos que **ya declara**, por la maquinaria de M8; los seis que no caben **se nombran** |
| 17 · La sala de espera no lee «todos han tirado» por un corte | ✅ | `99a1983` | Filtro por encuentro **y la pantalla lo manda**; ficha tachada y archivada |
| 18 · La fuga del PNJ revelado | ✅ | `6940265` | Las seis características fuera, **los PG dentro**; las dos mutaciones medidas |
| 8a · De dónde salen las resistencias de un PJ | ✅ | `4713c7c` | `kind: "damageModifier"`, enano y tiefling del SRD, y `resolve` las agrega — **sin tocar un punto de golpe** |
| 8b · `changeHp` las aplica | ✅ | `3bf2ed9` | Ficha tachada y archivada; la prueba que afirmaba lo contrario **se corrige, no se borra** |
| 9 · El descanso mueve el reloj | ✅ | `f38c8bb` | D-A-1 comprobada en `04-convenciones.md` antes de tocar nada; largo 8 h, corto 1 h |
| 16 · El bando corregido viaja por el canal | ✅ | el de abajo | Dos tipos nuevos, el `record` en la misma transacción, y su línea en español; ficha archivada |
