# La hoja a página completa — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Una sola `HojaCalculada` con dos disposiciones —`"pagina"` (pestañas laterales a columnas, Objetos con panel de detalle) y `"mesa"` (tira de pestañas, una columna)—, cabecera fija con lo que cambia el turno, y **de paso** la ficha del token revocado que sigue gastando el cubo de su dueño.

**Architecture:** `HojaCalculada.tsx` (469 líneas) se parte en `Cabecera.tsx` + `pestanas/{Numeros,Objetos,Ataques,Recursos,Estado,Rasgos,Conjuros}.tsx`; las ~20 tarjetas existentes **se mueven, no se reescriben**. `PaginaDeInventario` gana un panel de detalle a la derecha que consume la misma lista de acciones que la fila (`accionesDeObjeto.ts`). El guard del límite por usuario cachea `passwordChangedAt` 60 s para no clavar el cubo a un token revocado.

**Tech Stack:** React 18 + TanStack Query + react-router (`useSearchParams`) + Tailwind con tokens propios; Vitest + RTL; Playwright; NestJS/Fastify + `@nestjs/throttler` + Jest.

**Spec:** [`docs/superpowers/specs/2026-09-11-la-hoja-a-pagina-completa-design.md`](../specs/2026-09-11-la-hoja-a-pagina-completa-design.md), que adapta [`2026-09-06-la-hoja-en-la-mesa-design.md`](../specs/2026-09-06-la-hoja-en-la-mesa-design.md). Ficha del token: `docs/06-pendientes.md` § «P3 · Un token robado y ya revocado sigue gastando el cubo de su dueño».

## Global Constraints

- **Código en inglés, interfaz y documentación en español.** Los componentes de la web llevan nombre en español como los que ya existen (`Cabecera`, `Numeros`), igual que `HojaCalculada`, `TarjetaDeHoja`.
- **Ningún valor de enumeración llega a pantalla**: todo pasa por `character-sheet/vocabulario.ts` o `inventory/vocabulario.ts`.
- **La autorización se comprueba en el servidor**; `puedeEditar` solo decide qué se pinta.
- **Los cinco números (CA, iniciativa, velocidad, PG, competencia) no entran en ninguna pestaña** — viven en la cabecera.
- **La cabecera no lleva controles de daño** (decisión del autor). El daño se aplica en Recursos.
- **Conjuros solo se pinta si el personaje lanza** (`spellSlots.length > 0` o rasgo racial de conjuro). Las demás pestañas se pintan siempre, con su `EmptyState`.
- **Pestaña activa en la URL** (`?pestana=objetos`) en `"pagina"`; en `"mesa"` siempre abre en Números. Sin `localStorage`.
- **Ninguna prueba se borra ni se afloja**: las de `HojaCalculada.test.tsx` se mueven con su tarjeta.
- **Lo que solo se ve maquetado se mide en el navegador** (`boundingBox`), y toda pantalla nueva pasa por `tokens-contrast.spec.ts` y `teclado.spec.ts`.
- **Sin imagen de objeto, sin maniquí, sin trueque, sin conjuros reales** (paso 3). **«Dar a…» queda fuera de este plan** (desviación declarada de la spec del 09-06): `DarObjeto.tsx` es un componente de la sesión (necesita `miPersonajeId` y contexto de mesa) y la hoja a página completa no tiene sesión; entra cuando el botín tenga entrega fuera de la mesa.
- **La fila de objeto NO pasa a un menú «…»**: ya enseña sus acciones en línea y funciona; el menú escondería lo que hoy se ve. La lista única de acciones (`accionesDeObjeto.ts`) alimenta la fila y el detalle.
- **Un implementador por árbol.** Tasks 2–11 tocan `character-sheet/` e `inventory/`: **nunca dos a la vez**. Task 1 (API) puede ir en paralelo con Task 2 si va en otro worktree.
- Comandos: `pnpm --filter @dnd/web test -- <ruta>` (Vitest), `pnpm --filter @dnd/api test -- <ruta>` (Jest), `pnpm --filter @dnd/web e2e -- e2e/<fichero>.spec.ts` (Playwright, con Docker `dd-plataform-db-1` arriba y **nada más en `:3000`**; si otro proyecto ocupa el puerto, `WORKTREE_SLOT=1`). `pnpm verify` antes de cada commit lo exige el pre-commit.
- Copias de seguridad con `cp`, **nunca `git checkout`/`git stash`** para deshacer una mutación.
- Commits en inglés, Conventional Commits, con las líneas de atribución de la sesión.

---

## Mapa de ficheros

| Fichero | Responsabilidad |
|---|---|
| `apps/api/src/common/user-or-ip-throttler.guard.ts` (mod) | además de la firma, comprueba `iat > passwordChangedAt` con caché de 60 s por usuario |
| `apps/api/src/common/user-or-ip-throttler.guard.spec.ts` (nuevo) | unitaria del guard: token revocado → cubo por IP |
| `apps/web/src/features/character-sheet/Condiciones.tsx` (mod) | variante `"chips"`: solo lectura, sin botones |
| `apps/web/src/features/character-sheet/Cabecera.tsx` (nuevo) | retrato · identidad (solo en mesa) · cinco números · chips de condiciones · avisos |
| `apps/web/src/features/character-sheet/pestanas/tipos.ts` (nuevo) | `Disposicion`, `PropsDePestana` |
| `apps/web/src/features/character-sheet/pestanas/Numeros.tsx` (nuevo) | Características · Salvaciones · Habilidades · pasivos |
| `apps/web/src/features/character-sheet/pestanas/Ataques.tsx` (nuevo) | `AtaquesYLanzamiento` · `CompetenciasConArmas` |
| `apps/web/src/features/character-sheet/pestanas/Rasgos.tsx` (nuevo) | `RasgosYAptitudes` · `FichaEditable` · `Personalidad` |
| `apps/web/src/features/character-sheet/pestanas/Recursos.tsx` (nuevo) | PG · dados · muerte · recursos · actividades |
| `apps/web/src/features/character-sheet/pestanas/Estado.tsx` (nuevo) | modificadores · condiciones (completa) · velocidad · anulaciones |
| `apps/web/src/features/character-sheet/pestanas/Conjuros.tsx` + `lanzaConjuros.ts` (nuevos) | espacios + hueco declarado; regla de «lanza» |
| `apps/web/src/features/character-sheet/pestanas/Objetos.tsx` (nuevo) | monta `PaginaDeInventario` con `disposicion` |
| `apps/web/src/features/character-sheet/HojaCalculada.tsx` (mod) | carga datos, cabecera, `Tabs`, pestaña activa (< 150 líneas) |
| `apps/web/src/features/inventory/accionesDeObjeto.ts` (nuevo) | lista única `{ id, rotulo, ariaLabel, variant, ejecutar }` por fila |
| `apps/web/src/features/inventory/FilaObjeto.tsx` (mod) | pinta las acciones desde la lista; `seleccionada` + `onSeleccionar` |
| `apps/web/src/features/inventory/DetalleDeObjeto.tsx` (nuevo) | el objeto seleccionado con todo su detalle y las mismas acciones como botones |
| `apps/web/src/features/inventory/FiltrosDeObjetos.tsx` (nuevo) | `FilterChip` × (dónde · qué · sintonizados) + buscar |
| `apps/web/src/features/inventory/PaginaDeInventario.tsx` (mod) | `disposicion`; en `"pagina"` dos columnas: lista con filtros \| detalle |
| `apps/web/src/pages/CharacterDetailPage.tsx`, `features/sessions/MesaDeSesion.tsx`, `features/sessions/elenco/MandosDeCombatiente.tsx` (mod) | pasan `disposicion` |
| `apps/web/e2e/hoja-pestanas.spec.ts` (nuevo), `e2e/tokens-contrast.spec.ts`, `e2e/teclado.spec.ts` (mod) | medición en navegador |
| `docs/01-arquitectura.md`, `05-datos.md`, `06-pendientes.md`, `07-historial.md`, `08-pruebas.md`, `decisiones.md` | documentación en el mismo commit |

---

### Task 1: El cubo por usuario no se clava a un token revocado (API)

**Files:**
- Modify: `apps/api/src/common/user-or-ip-throttler.guard.ts:47-75`
- Modify: `apps/api/src/app.module.ts:39` (añadir `UsersModule` a `imports`)
- Create: `apps/api/src/common/user-or-ip-throttler.guard.spec.ts`
- Modify: `docs/06-pendientes.md` (la ficha sale al archivo), `docs/_archivo/pendientes-cerrados-2026-09-10.md`, `docs/07-historial.md`

**Interfaces:**
- Consumes: `UsersService.findById(id): Promise<User | null>` (`apps/api/src/users/users.service.ts:19`), `JwtService.verifyAsync`.
- Produces: `UserOrIpThrottlerGuard` con constructor `(options, storage, reflector, jwt, users: UsersService)`; método privado `selloDeCambio(sub): Promise<number | null>` (segundos epoch de `passwordChangedAt`, o `null`), caché `Map<string, { sello: number | null; hasta: number }>` con TTL `60_000` ms.

- [ ] **Step 1: Escribir la prueba que falla**

```ts
// apps/api/src/common/user-or-ip-throttler.guard.spec.ts
import { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { GUARDS_METADATA } from "@nestjs/common/constants";
import { UserOrIpThrottlerGuard } from "./user-or-ip-throttler.guard";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

// La ficha P3 del 2026-09-11: el guard verificaba la FIRMA para clavar el cubo a `user:<sub>`,
// pero un token robado y revocado por cambio de contraseña sigue firmado. Ahora mira también
// `passwordChangedAt`, con caché de un minuto para no añadir una consulta a cada petición.
describe("UserOrIpThrottlerGuard — un token revocado no gasta el cubo de su dueño", () => {
  const jwt = new JwtService({ secret: "test-secret" });
  const ahora = Math.floor(Date.now() / 1000);

  function contextoConJwtGuard(): ExecutionContext {
    class Handler {}
    const handler = () => undefined;
    Reflect.defineMetadata(GUARDS_METADATA, [JwtAuthGuard], handler);
    return {
      getHandler: () => handler,
      getClass: () => Handler,
    } as unknown as ExecutionContext;
  }

  function guardCon(users: { findById: jest.Mock }) {
    // `options`, `storage` y `reflector` no se usan en `getTracker`: bastan dobles vacíos.
    return new UserOrIpThrottlerGuard(
      [] as never,
      {} as never,
      new Reflector(),
      jwt,
      users as never,
    );
  }

  async function tracker(guard: UserOrIpThrottlerGuard, token: string) {
    // `getTracker` es protected: se llama por índice, como hace @nestjs/throttler en runtime.
    return (guard as unknown as { getTracker: (r: unknown, c: ExecutionContext) => Promise<string> })
      .getTracker({ headers: { authorization: `Bearer ${token}` }, ip: "10.0.0.7" }, contextoConJwtGuard());
  }

  it("un token emitido ANTES del cambio de contraseña cuenta como su IP, no como el usuario", async () => {
    const token = jwt.sign({ sub: "u1" }, { issuedAt: ahora - 100 } as never);
    const users = { findById: jest.fn().mockResolvedValue({ id: "u1", passwordChangedAt: new Date((ahora - 10) * 1000) }) };
    await expect(tracker(guardCon(users), token)).resolves.toBe("10.0.0.7");
  });

  it("un token emitido DESPUÉS del cambio sigue clavado al usuario", async () => {
    const token = jwt.sign({ sub: "u1" }, { issuedAt: ahora } as never);
    const users = { findById: jest.fn().mockResolvedValue({ id: "u1", passwordChangedAt: new Date((ahora - 10) * 1000) }) };
    await expect(tracker(guardCon(users), token)).resolves.toBe("user:u1");
  });

  it("consulta la base UNA vez por usuario y minuto, no una por petición", async () => {
    const token = jwt.sign({ sub: "u1" }, { issuedAt: ahora } as never);
    const users = { findById: jest.fn().mockResolvedValue({ id: "u1", passwordChangedAt: null }) };
    const guard = guardCon(users);
    await tracker(guard, token);
    await tracker(guard, token);
    await tracker(guard, token);
    expect(users.findById).toHaveBeenCalledTimes(1);
  });
});
```

> Si `jwt.sign` con `issuedAt` no fija el `iat` en la versión instalada de `@nestjs/jwt`, firma el payload con `iat` explícito: `jwt.sign({ sub: "u1", iat: ahora - 100 })` — `jsonwebtoken` respeta un `iat` presente en el payload.

- [ ] **Step 2: Verla fallar**

Run: `pnpm --filter @dnd/api test -- src/common/user-or-ip-throttler.guard.spec.ts`
Expected: FAIL — el constructor no acepta `users` y el primer test devuelve `user:u1`.

- [ ] **Step 3: Implementar**

En `user-or-ip-throttler.guard.ts`, sustituir el constructor y `getTracker`:

```ts
import { UsersService } from "../users/users.service";

const TTL_SELLO_MS = 60_000;

@Injectable()
export class UserOrIpThrottlerGuard extends ThrottlerGuard {
  // Sello de cambio de contraseña por usuario, en segundos epoch (o `null` si nunca cambió),
  // cacheado un minuto. Es la salida medida en la ficha: una consulta por usuario y minuto en
  // vez de una por petición, y la ventana de un minuto es el mismo tamaño que el cubo.
  private readonly sellos = new Map<string, { sello: number | null; hasta: number }>();

  constructor(
    @InjectThrottlerOptions() options: ThrottlerModuleOptions,
    @InjectThrottlerStorage() storage: ThrottlerStorage,
    reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly users: UsersService,
  ) {
    super(options, storage, reflector);
  }

  protected async getTracker(
    req: Record<string, unknown>,
    context?: ExecutionContext,
  ): Promise<string> {
    if (!context || !this.rutaLlevaJwtAuthGuard(context)) return super.getTracker(req);

    const cabecera = req["headers"] as Record<string, string | undefined> | undefined;
    const auth = cabecera?.["authorization"];
    if (auth?.startsWith("Bearer ")) {
      try {
        const { sub, iat } = await this.jwt.verifyAsync<{ sub?: string; iat?: number }>(
          auth.slice("Bearer ".length),
        );
        if (typeof sub === "string" && sub) {
          // **Un token revocado por cambio de contraseña no es el usuario.** `JwtStrategy` lo
          // rechazará después con 401; si aquí contara contra `user:<sub>`, quien robó el
          // token podría agotar el cubo de la víctima con peticiones que nunca entran. La
          // regla del empate es la misma que en jwt.strategy.ts: `iat <= sello` es viejo.
          const sello = await this.selloDeCambio(sub);
          if (sello === null || iat === undefined || iat > sello) return `user:${sub}`;
        }
      } catch {
        // Firma inválida o caducado: es una petición anónima a efectos de cuota.
      }
    }
    return super.getTracker(req);
  }

  private async selloDeCambio(sub: string): Promise<number | null> {
    const ahora = Date.now();
    const cacheado = this.sellos.get(sub);
    if (cacheado && cacheado.hasta > ahora) return cacheado.sello;
    const user = await this.users.findById(sub);
    const sello = user?.passwordChangedAt ? Math.floor(user.passwordChangedAt.getTime() / 1000) : null;
    this.sellos.set(sub, { sello, hasta: ahora + TTL_SELLO_MS });
    return sello;
  }
```

En `app.module.ts`, añadir `UsersModule` a `imports` (junto a `AuthModule`), con `import { UsersModule } from "./users/users.module";`. Actualizar el comentario de cabecera del guard (L31-44): ya no dice solo «el token se verifica»; dice que además se compara `iat` con `passwordChangedAt`, con caché.

- [ ] **Step 4: Verla pasar y correr lo que toca**

Run: `pnpm --filter @dnd/api test -- src/common src/auth` → PASS. Después `pnpm --filter @dnd/api test:e2e -- login-bucket-por-ip` (Docker arriba) → PASS.

- [ ] **Step 5: Mutación**

Cambiar `iat > sello` por `iat >= sello` con `cp` de respaldo → el primer test **no** enrojece (la diferencia es el empate) — añade a la primera prueba un caso con `issuedAt: ahora - 10` (empate exacto) que espera `10.0.0.7`, y ahora sí enrojece. Restaurar.

- [ ] **Step 6: Docs y commit**

Mover la ficha «P3 · Un token robado…» de `06-pendientes.md` a `_archivo/pendientes-cerrados-2026-09-10.md` con «**Cerrada el 2026-09-1X (Task 1 del plan de la hoja).**» + texto original. Una viñeta en `07-historial.md` bajo una entrada nueva «La hoja a página completa (2026-09-1X)». `pnpm verify` → exit 0.

```bash
git add apps/api/src/common/user-or-ip-throttler.guard.ts apps/api/src/common/user-or-ip-throttler.guard.spec.ts apps/api/src/app.module.ts docs/
git commit -m "fix(api): a token revoked by a password change no longer spends its owner's rate-limit bucket"
```

---

### Task 2: `Condiciones` en modo chips

**Files:**
- Modify: `apps/web/src/features/character-sheet/Condiciones.tsx:160-200`
- Test: `apps/web/src/features/character-sheet/__tests__/Condiciones.test.tsx`

**Interfaces:**
- Produces: `Condiciones({ campaignId, characterId, puedeEditar, variante?: "tarjeta" | "chips" })`. Con `variante="chips"`: un `<ul aria-label="condiciones activas">` de `<li>` con el nombre legible (`NOMBRE_CONDICION[key]`, y `nivel N` para agotamiento), **sin botones**, y `null` si no hay ninguna. El comportamiento actual es `variante="tarjeta"` (por defecto).

- [ ] **Step 1: Prueba que falla** (añadir al `describe` existente de `Condiciones.test.tsx`, reutilizando su `render` y sus mocks de `useConditions`)

```tsx
it("variante chips: solo los nombres legibles, sin botones, y nada si no hay condiciones", async () => {
  mockConditions([{ id: "c1", key: "poisoned", level: null, note: null, appliedById: "dm1", expiresAt: null }]);
  renderCondiciones({ variante: "chips" });
  const lista = await screen.findByRole("list", { name: "condiciones activas" });
  expect(within(lista).getByText("Envenenado")).toBeInTheDocument();
  expect(within(lista).queryByRole("button")).toBeNull();
  expect(screen.queryByText("poisoned")).toBeNull();

  mockConditions([]);
  const { container } = renderCondiciones({ variante: "chips" });
  await waitFor(() => expect(container.querySelector("ul")).toBeNull());
});
```

Adapta `mockConditions`/`renderCondiciones` a los nombres que el fichero ya use (mira sus primeras 60 líneas); si no existen, créalos con la misma forma que el primer `it` del fichero.

- [ ] **Step 2: Verla fallar** — `pnpm --filter @dnd/web test -- Condiciones` → FAIL (`variante` desconocida, o aparecen botones).

- [ ] **Step 3: Implementar** — al principio del cuerpo de `Condiciones`, tras leer `condiciones`:

```tsx
if (variante === "chips") {
  if (!condiciones || condiciones.length === 0) return null;
  return (
    <ul aria-label="condiciones activas" className="flex flex-wrap gap-s1">
      {condiciones.map((c) => (
        <li
          key={c.id}
          className="rounded-radius-sm border border-warning-text px-s2 py-0.5 font-chrome text-chrome-xs text-warning-text"
        >
          {NOMBRE_CONDICION[c.key]}
          {c.key === "exhaustion" && c.level ? ` · nivel ${c.level}` : ""}
        </li>
      ))}
    </ul>
  );
}
```

`NOMBRE_CONDICION` es el diccionario que el fichero ya usa para la tarjeta (comprueba el nombre exacto en `vocabulario.ts`; si la tarjeta lo llama distinto, usa ese).

- [ ] **Step 4: Verla pasar** — `pnpm --filter @dnd/web test -- Condiciones` → PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/character-sheet/Condiciones.tsx apps/web/src/features/character-sheet/__tests__/Condiciones.test.tsx
git commit -m "feat(web): conditions can render as read-only chips"
```

---

### Task 3: `Cabecera.tsx` — retrato, cinco números, condiciones y avisos

**Files:**
- Create: `apps/web/src/features/character-sheet/pestanas/tipos.ts`
- Create: `apps/web/src/features/character-sheet/Cabecera.tsx`
- Create: `apps/web/src/features/character-sheet/__tests__/Cabecera.test.tsx`
- Modify: `apps/web/src/features/character-sheet/HojaCalculada.tsx` (la tira sale de aquí; monta `Cabecera`)
- Modify: `apps/web/src/features/character-sheet/__tests__/HojaCalculada.test.tsx:277-352` (el `describe` «H3 — la cabecera fija» se mueve a `Cabecera.test.tsx`)

**Interfaces:**
- Produces (`pestanas/tipos.ts`):

```ts
import type { SheetResponse } from "../api";

export type Disposicion = "mesa" | "pagina";

export interface PropsDePestana {
  campaignId: string;
  characterId: string;
  data: SheetResponse & { sheet: NonNullable<SheetResponse["sheet"]> };
  puedeEditar: boolean;
  disposicion: Disposicion;
}
```

- Produces: `Cabecera(props: PropsDePestana)`. Pinta `<section aria-label="resumen de combate">` con: `Retrato` (importado de `../sessions/elenco/FichaDeElenco`); **solo en `"mesa"`** el nombre y `descriptorDePersonaje(character)` (de `../characters/descriptor`) — en `"pagina"` el nombre lo pinta ya `PageHeader`; la tira de cinco números tal cual está hoy en `HojaCalculada.tsx` (CA, Inic., Vel., PG, Comp.); `<Condiciones variante="chips" />`; y los avisos `Avisos`, `EleccionesPendientes`, `AvisoDeDm`, y `BotonSubirNivel` si `puedeEditar`. Conserva el `sticky` con `--tira-fija-top` / `--tira-fija-pull` y el comentario que explica por qué es HERMANA del cuerpo.

- [ ] **Step 1: Prueba que falla** — `Cabecera.test.tsx`. Copia del `HojaCalculada.test.tsx` el fixture (`character`, `sheet`, `sheetResponse`) y el `render` con `QueryClientProvider` + `MemoryRouter`; mockea `../hooks` (`useConditions` → `[{ key: "poisoned", … }]`) y `../../campaigns/members` como hace ese fichero.

```tsx
describe("Cabecera — lo que cambia el turno, siempre a la vista", () => {
  it("reúne los cinco números, las condiciones como chips y el aviso de elección pendiente", async () => {
    renderCabecera({ disposicion: "pagina" });
    const resumen = await screen.findByRole("region", { name: "resumen de combate" });
    for (const etiqueta of ["CA", "Inic.", "Vel. (pies)", "PG", "Comp."]) {
      expect(within(resumen).getByText(etiqueta)).toBeInTheDocument();
    }
    expect(within(resumen).getByRole("list", { name: "condiciones activas" })).toHaveTextContent("Envenenado");
    expect(within(resumen).getByText(/elección pendiente/i)).toBeInTheDocument();
  });

  it("no trae control de daño: los PG son solo lectura", async () => {
    renderCabecera({ disposicion: "pagina" });
    const resumen = await screen.findByRole("region", { name: "resumen de combate" });
    expect(within(resumen).queryByRole("button", { name: /daño|curar|aplicar/i })).toBeNull();
  });

  it("en la mesa lleva el nombre y la clase; en la página no, porque ya los pinta la cabecera de la página", async () => {
    renderCabecera({ disposicion: "mesa" });
    expect(await screen.findByText("Elowen")).toBeInTheDocument();
    cleanup();
    renderCabecera({ disposicion: "pagina" });
    await screen.findByRole("region", { name: "resumen de combate" });
    expect(screen.queryByText("Elowen")).toBeNull();
  });
});
```

Mueve aquí los dos `it` de «H3 — la cabecera fija» (`HojaCalculada.test.tsx:286-316`) tal cual, adaptando solo el `render`.

- [ ] **Step 2: Verla fallar** — `pnpm --filter @dnd/web test -- Cabecera` → FAIL (módulo no existe).

- [ ] **Step 3: Implementar** — `Cabecera.tsx`:

```tsx
import { Retrato } from "../sessions/elenco/FichaDeElenco";
import { descriptorDePersonaje } from "../characters/descriptor";
import { ValorDerivado } from "./Traza";
import { Condiciones } from "./Condiciones";
import { Avisos } from "./Avisos";
import { EleccionesPendientes } from "./EleccionesPendientes";
import { AvisoDeDm } from "./AvisoDeDm";
import { BotonSubirNivel } from "../level-up/BotonSubirNivel";
import { ROTULO_DE_CASILLA } from "./Tarjeta";
import type { PropsDePestana } from "./pestanas/tipos";

// La cabecera fija de la hoja (spec 2026-09-11 §4): lo que cambia el turno, en cualquier
// disposición y fuera de todas las pestañas. Es HERMANA del cuerpo, nunca su padre: `sticky` se
// pega dentro de su padre, y envolverla soltaría la tira sin que ninguna unitaria se enterase
// (lo mide `e2e/hoja.spec.ts`, punto 7).
export function Cabecera({ campaignId, characterId, data, puedeEditar, disposicion }: PropsDePestana) {
  const { sheet, hp, character } = data;
  const velocidad = data.effectiveSpeeds?.walk ?? { total: sheet.speeds.walk ?? 0, steps: [] };
  const descripcion = descriptorDePersonaje(character);

  return (
    <section
      aria-label="resumen de combate"
      className="sticky top-[var(--tira-fija-top,0px)] z-20 -mx-s2 mt-[var(--tira-fija-pull,0px)] border-b border-muted bg-[color:var(--chrome-veil)] px-s2 py-s2 backdrop-blur"
    >
      <div className="flex flex-wrap items-start gap-s3">
        <Retrato personaje={character} />
        {disposicion === "mesa" && (
          <div className="min-w-0">
            <p className="truncate font-title text-chrome-md text-text">{character.name}</p>
            {descripcion && <p className="font-world text-chrome-sm text-muted">{descripcion}</p>}
          </div>
        )}
        <div className="ml-auto flex flex-wrap items-start justify-end gap-s2">
          {/* La tira de cinco números, movida entera desde HojaCalculada.tsx — mismos
              componentes, mismas etiquetas, misma traza. */}
          <ValorDerivado variante="compacta" etiqueta="CA" valor={sheet.derived.ac} />
          <ValorDerivado variante="compacta" etiqueta="Inic." etiquetaLarga="Iniciativa" valor={sheet.derived.initiative} />
          <ValorDerivado
            variante="compacta"
            etiqueta="Vel. (pies)"
            etiquetaLarga="Velocidad efectiva en pies"
            valor={{ key: "speed.walk", total: velocidad.total, steps: velocidad.steps }}
          />
          <div className="min-w-[4.75rem] rounded-radius-sm border border-muted bg-surface px-s2 py-1 text-center">
            <p className={`${ROTULO_DE_CASILLA} leading-tight`}>PG</p>
            <p className="font-data text-chrome-lg leading-none text-text">
              {hp.current ?? "—"} / {hp.max ?? "—"}
            </p>
            {hp.temp > 0 && <p className="font-chrome text-chrome-xs text-accent-text">+{hp.temp} temporales</p>}
          </div>
          {sheet.derived.proficiencyBonus && (
            <ValorDerivado variante="compacta" etiqueta="Comp." etiquetaLarga="Competencia" valor={sheet.derived.proficiencyBonus} />
          )}
        </div>
      </div>
      <div className="mt-s2 flex flex-col gap-s2">
        <Condiciones campaignId={campaignId} characterId={characterId} puedeEditar={false} variante="chips" />
        <Avisos warnings={sheet.warnings} />
        <EleccionesPendientes
          campaignId={campaignId}
          characterId={characterId}
          pendingChoices={sheet.pendingChoices}
          choicesActuales={character.choices ?? {}}
        />
        <AvisoDeDm campaignId={campaignId} />
        {puedeEditar && <BotonSubirNivel campaignId={campaignId} characterId={characterId} level={character.level} />}
      </div>
    </section>
  );
}
```

Copia también los comentarios de la tira original (por qué los PG de la cabecera son solo lectura; por qué el escalón lo declara `AppShell`). En `HojaCalculada.tsx`: quita la `<section aria-label="resumen de combate">` y los cuatro avisos de la columna derecha, y monta `<Cabecera … disposicion={disposicion} />` en su lugar; añade la prop `disposicion: Disposicion` a `HojaCalculada` (por ahora sin usarla en nada más). Los tres sitios que montan `HojaCalculada` pasan `disposicion="pagina"` (`CharacterDetailPage.tsx:144`) y `disposicion="mesa"` (`MesaDeSesion.tsx:462`, `MandosDeCombatiente.tsx:170`).

- [ ] **Step 4: Verla pasar** — `pnpm --filter @dnd/web test -- character-sheet` → PASS (incluido `HojaCalculada.test.tsx` sin el `describe` movido).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/character-sheet apps/web/src/pages/CharacterDetailPage.tsx apps/web/src/features/sessions
git commit -m "refactor(web): the sheet header lives in Cabecera, with portrait, condition chips and notices"
```

---

### Task 4: Pestañas de lectura — `Numeros`, `Ataques`, `Rasgos`

**Files:**
- Create: `pestanas/Numeros.tsx`, `pestanas/Ataques.tsx`, `pestanas/Rasgos.tsx` (en `apps/web/src/features/character-sheet/`)
- Create: `__tests__/pestanas/Numeros.test.tsx`, `Ataques.test.tsx`, `Rasgos.test.tsx`
- Modify: `HojaCalculada.tsx` (aún sin `Tabs`: monta las tres seguidas donde estaban sus tarjetas)
- Modify: `__tests__/HojaCalculada.test.tsx` (mueve «características → salvaciones → habilidades bajan seguidas» a `Numeros.test.tsx`; «Ataques y lanzamiento es una tabla…» y «…sin arma equipada» a `Ataques.test.tsx`; «el pie trae competencias…» a `Rasgos.test.tsx`)

**Interfaces:**
- Produces: `Numeros(props: PropsDePestana)`, `Ataques(props)`, `Rasgos(props)`. Cada una devuelve un `<div data-pestana="numeros|ataques|rasgos">` cuya rejilla es `grid gap-s4` + `lg:grid-cols-3` (Números) o `lg:grid-cols-2` (Ataques, Rasgos) **solo si `disposicion === "pagina"`**; en `"mesa"` una columna.

- [ ] **Step 1: Pruebas que fallan** (una por pestaña; misma armadura que `Cabecera.test.tsx`)

```tsx
// Numeros.test.tsx
it("a página: características, salvaciones+pasivos y habilidades en tres columnas; en mesa, una", async () => {
  const { container } = renderPestana(Numeros, { disposicion: "pagina" });
  const raiz = container.querySelector('[data-pestana="numeros"]')!;
  expect(raiz.className).toContain("lg:grid-cols-3");
  expect(within(raiz as HTMLElement).getByText("Características")).toBeInTheDocument();
  expect(within(raiz as HTMLElement).getByText("Salvaciones")).toBeInTheDocument();
  expect(within(raiz as HTMLElement).getByText("Habilidades")).toBeInTheDocument();
  expect(within(raiz as HTMLElement).getByText(/percepción pasiva/i)).toBeInTheDocument();
  cleanup();
  const mesa = renderPestana(Numeros, { disposicion: "mesa" }).container.querySelector('[data-pestana="numeros"]')!;
  expect(mesa.className).not.toContain("lg:grid-cols");
});
```

Para `Ataques`: comprueba que aparecen la tabla «Ataques y lanzamiento» y «Competencias con armas», y que NO aparece «Habilidades». Para `Rasgos`: «Rasgos y aptitudes», «Ficha» (la editable), «Personalidad», y NO «Salvaciones». Las pruebas movidas se pegan **sin cambiar sus aserciones**.

- [ ] **Step 2: Verlas fallar** — `pnpm --filter @dnd/web test -- pestanas` → FAIL.

- [ ] **Step 3: Implementar** — `Numeros.tsx`:

```tsx
import { ABILITY_KEYS } from "@dnd/shared";
import { TarjetaDeHoja } from "../Tarjeta";
import { ValorDerivado } from "../Traza";
import { TirarBoton } from "../TirarBoton";
import { Caracteristicas } from "../IdentidadEditable";
import { PercepcionPasiva } from "../TarjetasDeEstado";
import { ABREVIATURA_CARACTERISTICA, NOMBRE_CARACTERISTICA, NOMBRE_HABILIDAD } from "../vocabulario";
import { HABILIDADES_POR_CARACTERISTICA } from "../habilidades";
import type { PropsDePestana } from "./tipos";

export function Numeros({ campaignId, characterId, data, puedeEditar, disposicion }: PropsDePestana) {
  const { sheet, character } = data;
  const columnas = disposicion === "pagina" ? "lg:grid-cols-3" : "";
  return (
    <div data-pestana="numeros" className={`grid items-start gap-s4 ${columnas}`}>
      <TarjetaDeHoja titulo="Características" etiqueta="características">
        <Caracteristicas campaignId={campaignId} characterId={characterId} character={character} sheet={sheet} puedeEditar={puedeEditar} />
      </TarjetaDeHoja>
      <div className="flex min-w-0 flex-col gap-s4">
        <TarjetaDeHoja titulo="Salvaciones">{/* el bloque de salvaciones de HojaCalculada, tal cual */}</TarjetaDeHoja>
        <PercepcionPasiva valor={sheet.derived.passivePerception} />
      </div>
      <TarjetaDeHoja titulo="Habilidades">{/* el bloque de habilidades de HojaCalculada, tal cual, con su comentario del fix round ALTA-2 */}</TarjetaDeHoja>
    </div>
  );
}
```

Mueve `HABILIDADES_POR_CARACTERISTICA` de `HojaCalculada.tsx` a un fichero `habilidades.ts` exportado. `Ataques.tsx` monta `AtaquesYLanzamiento` (con `attacks={data.attacks ?? []}` y `visibilidadDelPersonaje={character.visibility}`) y `CompetenciasConArmas`. `Rasgos.tsx` monta `RasgosYAptitudes`, la `TarjetaDeHoja titulo="Ficha"` con `FichaEditable`, y `Personalidad`. **Las claves `key="…"` y el comentario de «el campo que se teclea sobrevive» se conservan** en la tarjeta Ficha.

- [ ] **Step 4: Verlas pasar** — `pnpm --filter @dnd/web test -- character-sheet` → PASS.

- [ ] **Step 5: Commit** — `git commit -m "refactor(web): Numeros, Ataques and Rasgos are tabs of the sheet"` (añade los ficheros nuevos y los modificados).

---

### Task 5: Pestañas con acción — `Recursos`, `Estado`

**Files:**
- Create: `pestanas/Recursos.tsx`, `pestanas/Estado.tsx`, sus tests en `__tests__/pestanas/`
- Modify: `HojaCalculada.tsx`, `__tests__/HojaCalculada.test.tsx` (mueve «la Clase de Armadura tiene su tarjeta», «la fila de tarjetas pequeñas», «salvaciones de muerte se ven con el personaje vivo», «los dados de golpe salen UNA vez»)

**Interfaces:**
- Produces: `Recursos(props: PropsDePestana)`: columna 1 = `Puntos de golpe` (con `maxHp={sheet.derived.maxHp}`), `DadosDeGolpe`, `SalvacionesDeMuerte`; columna 2 = `Recursos y descansos`, `Actividades` (solo si `sheet.activities.length > 0`). `Estado(props)`: columna 1 = `Modificadores temporales`, `Condiciones activas` (variante tarjeta); columna 2 = `Clase de armadura` (la tarjeta con fórmula), `Velocidad y sentidos`, `Anulaciones`.

- [ ] **Step 1: Pruebas que fallan**

```tsx
// Recursos.test.tsx
it("trae PG, dados de golpe, salvaciones de muerte, recursos y descansos, y a página en dos columnas", async () => {
  const { container } = renderPestana(Recursos, { disposicion: "pagina" }, { resources: recursosConDados });
  const raiz = container.querySelector('[data-pestana="recursos"]') as HTMLElement;
  expect(raiz.className).toContain("lg:grid-cols-2");
  for (const t of ["Puntos de golpe", "Dados de golpe", "Salvaciones de muerte", "Recursos y descansos"]) {
    expect(await within(raiz).findByText(t)).toBeInTheDocument();
  }
  expect(within(raiz).queryByText("Habilidades")).toBeNull();
});
// Estado.test.tsx
it("trae modificadores, condiciones con gestión, CA con fórmula, velocidad y anulaciones", async () => {
  const { container } = renderPestana(Estado, { disposicion: "pagina" });
  const raiz = container.querySelector('[data-pestana="estado"]') as HTMLElement;
  for (const t of ["Modificadores temporales", "Condiciones activas", "Clase de armadura", "Velocidad y sentidos"]) {
    expect(await within(raiz).findByText(t)).toBeInTheDocument();
  }
  expect(within(raiz).getByRole("button", { name: /aplicar condición|añadir condición/i })).toBeInTheDocument();
});
```

Ajusta el nombre del botón de condiciones al que `Condiciones.tsx` pinta de verdad (léelo).

- [ ] **Step 2: Verlas fallar.** — [ ] **Step 3: Implementar** moviendo las tarjetas, mismo patrón que Task 4 (`data-pestana`, `lg:grid-cols-2` solo a página). — [ ] **Step 4: Verlas pasar** con `character-sheet` entero. — [ ] **Step 5: Commit** — `"refactor(web): Recursos and Estado are tabs of the sheet"`.

---

### Task 6: `Conjuros` — solo para quien lanza

**Files:**
- Create: `pestanas/lanzaConjuros.ts`, `pestanas/Conjuros.tsx`, `__tests__/pestanas/lanzaConjuros.test.ts`, `__tests__/pestanas/Conjuros.test.tsx`
- Modify: `HojaCalculada.tsx` (la tarjeta «Espacios de conjuro» sale)

**Interfaces:**
- Produces: `lanzaConjuros(sheet: CalculatedSheet): boolean` — `true` si `sheet.spellSlots.length > 0` o algún `sheet.features[i].labelKey` termina en `.cantrip` o `.spell` (conjuros raciales: `subrace.elfHigh.cantrip` hoy; tiefling y gnomo cuando existan). `Conjuros(props: PropsDePestana)`: tarjeta «Espacios de conjuro (descanso corto|largo)» con la lista actual, y `<EmptyState title="Los conjuros llegan con el paso 3">Hoy la hoja sabe cuántos espacios tienes; la lista de conjuros y su lanzamiento están planificados.</EmptyState>`.

- [ ] **Step 1: Pruebas que fallan**

```ts
// lanzaConjuros.test.ts
import { lanzaConjuros } from "../../pestanas/lanzaConjuros";
const base = { spellSlots: [], features: [] } as unknown as CalculatedSheet;
it("un guerrero sin espacios ni truco racial no lanza", () => expect(lanzaConjuros(base)).toBe(false));
it("espacios de conjuro = lanza", () => expect(lanzaConjuros({ ...base, spellSlots: [{ spellLevel: 1, slots: 2 }] })).toBe(true));
it("un truco racial sin espacios = lanza (alto elfo guerrero)", () =>
  expect(lanzaConjuros({ ...base, features: [{ sourceKey: "high-elf", labelKey: "subrace.elfHigh.cantrip", name: "Truco" }] })).toBe(true));
```

```tsx
// Conjuros.test.tsx
it("enseña los espacios por nivel y dice que la lista llega con el paso 3, sin claves", async () => {
  renderPestana(Conjuros, { disposicion: "pagina" }, { sheet: { ...sheet, spellSlots: [{ spellLevel: 1, slots: 2 }], spellSlotResetOn: "LONG_REST" } });
  expect(await screen.findByText("Espacios de conjuro (descanso largo)")).toBeInTheDocument();
  expect(screen.getByText("Nivel 1: 2")).toBeInTheDocument();
  expect(screen.getByText("Los conjuros llegan con el paso 3")).toBeInTheDocument();
  expect(screen.queryByText("LONG_REST")).toBeNull();
});
```

- [ ] **Step 2: Verlas fallar.** — [ ] **Step 3: Implementar** (`lanzaConjuros` de 4 líneas; `Conjuros.tsx` con la tarjeta movida + `EmptyState`). — [ ] **Step 4: Verlas pasar.** — [ ] **Step 5: Commit** — `"feat(web): the Conjuros tab exists only for casters, and says what is missing"`.

---

### Task 7: `HojaCalculada` orquesta con `Tabs`, `disposicion` y `?pestana=`

**Files:**
- Create: `pestanas/Objetos.tsx` (por ahora monta `<PaginaDeInventario campaignId characterId />` sin más)
- Modify: `HojaCalculada.tsx` — queda: carga, rama «a medias», `Cabecera`, `Tabs`, pestaña activa
- Modify: `__tests__/HojaCalculada.test.tsx` (nuevas pruebas de reparto; «el inventario se monta dentro de la hoja» pasa a comprobar la pestaña Objetos)

**Interfaces:**
- Consumes: `Tabs({ items, active, onChange, layout })` de `ui/Tabs.tsx`; `useSearchParams` de react-router.
- Produces: `HojaCalculada({ campaignId, characterId, puedeEditar, disposicion })`. Ids de pestaña: `"numeros" | "objetos" | "ataques" | "recursos" | "estado" | "rasgos" | "conjuros"`, exportados como `PESTANAS_DE_LA_HOJA` desde `pestanas/tipos.ts` con su rótulo: `{ id: "numeros", label: "Números" }` … Orden = orden de la spec. En `"pagina"` la activa viene de `searchParams.get("pestana")` (desconocida → `"numeros"`) y `onChange` la escribe con `setSearchParams({ pestana: id }, { replace: true })`; en `"mesa"` es estado local que arranca en `"numeros"`.

- [ ] **Step 1: Pruebas que fallan**

```tsx
describe("La hoja en pestañas", () => {
  it("cada tarjeta está en su pestaña y en ninguna otra", async () => {
    renderHoja({ disposicion: "pagina" });
    const lista = await screen.findByRole("tablist");
    const nombres = within(lista).getAllByRole("tab").map((t) => t.textContent?.trim());
    expect(nombres).toEqual(["Números", "Objetos", "Ataques", "Recursos", "Estado", "Rasgos"]); // sin Conjuros: Elowen no tiene espacios en el fixture
    // Números abierta por defecto: Salvaciones sí, Puntos de golpe no.
    expect(screen.getByText("Salvaciones")).toBeInTheDocument();
    expect(screen.queryByText("Puntos de golpe")).toBeNull();
    fireEvent.click(within(lista).getByRole("tab", { name: "Recursos" }));
    expect(await screen.findByText("Puntos de golpe")).toBeInTheDocument();
    expect(screen.queryByText("Salvaciones")).toBeNull();
  });

  it("Conjuros aparece para quien lanza", async () => {
    renderHoja({ disposicion: "pagina" }, { sheet: { ...sheet, spellSlots: [{ spellLevel: 1, slots: 2 }] } });
    expect(await screen.findByRole("tab", { name: "Conjuros" })).toBeInTheDocument();
  });

  it("?pestana=objetos abre Objetos, y una desconocida cae en Números", async () => {
    renderHoja({ disposicion: "pagina" }, {}, "/campaigns/c1/characters/ch1?pestana=objetos");
    expect(await screen.findByRole("region", { name: "inventario" })).toBeInTheDocument();
    cleanup();
    renderHoja({ disposicion: "pagina" }, {}, "/campaigns/c1/characters/ch1?pestana=loquesea");
    expect(await screen.findByText("Salvaciones")).toBeInTheDocument();
  });

  it("en la mesa las pestañas son una tira y siempre arranca en Números aunque la URL diga otra cosa", async () => {
    renderHoja({ disposicion: "mesa" }, {}, "/sessions/s1?pestana=objetos");
    await screen.findByRole("tablist");
    expect(screen.getByText("Salvaciones")).toBeInTheDocument();
  });

  it("los cinco números siguen fuera de las pestañas, en cualquiera de ellas", async () => {
    renderHoja({ disposicion: "pagina" });
    const lista = await screen.findByRole("tablist");
    for (const tab of ["Rasgos", "Estado"]) {
      fireEvent.click(within(lista).getByRole("tab", { name: tab }));
      expect(screen.getByRole("region", { name: "resumen de combate" })).toBeInTheDocument();
    }
  });
});
```

`renderHoja(props, overrides?, ruta?)`: monta `HojaCalculada` dentro de `MemoryRouter initialEntries={[ruta]}` con el mock de `useCharacterSheet` devolviendo `{ ...sheetResponse, ...overrides }`. `Tabs` ya pone `role="tablist"`/`role="tab"` (compruébalo en `Tabs.tsx`; si no, es la ocasión de añadirlos — es accesibilidad, no cambio de comportamiento).

- [ ] **Step 2: Verlas fallar** — `pnpm --filter @dnd/web test -- HojaCalculada` → FAIL (no hay `tablist`).

- [ ] **Step 3: Implementar** — `HojaCalculada.tsx` entero (sin los comentarios largos, que se mueven con las tarjetas):

```tsx
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs } from "../../ui/Tabs";
import { EmptyState } from "../../ui/Collection";
import { useCharacterSheet } from "./hooks";
import { Cabecera } from "./Cabecera";
import { TarjetaDeHoja } from "./Tarjeta";
import { Caracteristicas, FichaEditable } from "./IdentidadEditable";
import { Numeros } from "./pestanas/Numeros";
import { Objetos } from "./pestanas/Objetos";
import { Ataques } from "./pestanas/Ataques";
import { Recursos } from "./pestanas/Recursos";
import { Estado } from "./pestanas/Estado";
import { Rasgos } from "./pestanas/Rasgos";
import { Conjuros } from "./pestanas/Conjuros";
import { lanzaConjuros } from "./pestanas/lanzaConjuros";
import { PESTANAS_DE_LA_HOJA, type Disposicion, type PestanaId, type PropsDePestana } from "./pestanas/tipos";

const COMPONENTE_DE_PESTANA: Record<PestanaId, (p: PropsDePestana) => JSX.Element> = {
  numeros: Numeros, objetos: Objetos, ataques: Ataques, recursos: Recursos, estado: Estado, rasgos: Rasgos, conjuros: Conjuros,
};

function esPestana(x: string | null): x is PestanaId {
  return PESTANAS_DE_LA_HOJA.some((p) => p.id === x);
}

export function HojaCalculada({ campaignId, characterId, puedeEditar, disposicion }: {
  campaignId: string; characterId: string; puedeEditar: boolean; disposicion: Disposicion;
}) {
  const { data, isLoading, isError } = useCharacterSheet(campaignId, characterId);
  // En la página la pestaña vive en la URL (enlazable, sin estado escondido); en la mesa es
  // local y arranca siempre en Números: un cajón que se abre no hereda la pestaña de otra vez.
  const [searchParams, setSearchParams] = useSearchParams();
  const [activaEnMesa, setActivaEnMesa] = useState<PestanaId>("numeros");
  const deUrl = searchParams.get("pestana");
  const activa: PestanaId = disposicion === "pagina" ? (esPestana(deUrl) ? deUrl : "numeros") : activaEnMesa;
  const cambiar = (id: string) => {
    if (!esPestana(id)) return;
    if (disposicion === "pagina") setSearchParams({ pestana: id }, { replace: true });
    else setActivaEnMesa(id);
  };

  if (isLoading) return <p className="font-chrome text-chrome-sm text-muted">Calculando la hoja…</p>;
  if (isError || !data) {
    return <EmptyState title="No se pudo cargar la hoja de 5.ª edición">Vuelve a intentarlo en un momento.</EmptyState>;
  }
  const { sheet, reason, character } = data;

  if (!sheet) {
    // La rama «a medias» se queda como estaba: Ficha + Características + el aviso. (Conserva el
    // comentario de las claves y del campo que se desprendía del DOM.)
    return (
      <div className="flex flex-col gap-s4">
        <TarjetaDeHoja titulo="Ficha" etiqueta="ficha del personaje">
          <FichaEditable campaignId={campaignId} characterId={characterId} character={character} puedeEditar={puedeEditar} />
        </TarjetaDeHoja>
        <TarjetaDeHoja titulo="Características" etiqueta="características">
          <Caracteristicas campaignId={campaignId} characterId={characterId} character={character} sheet={null} puedeEditar={puedeEditar} />
        </TarjetaDeHoja>
        <EmptyState title="La hoja de 5.ª edición está a medias">{reason ?? "Faltan datos para calcular la hoja."}</EmptyState>
      </div>
    );
  }

  const props: PropsDePestana = { campaignId, characterId, data: { ...data, sheet }, puedeEditar, disposicion };
  const items = PESTANAS_DE_LA_HOJA
    .filter((p) => p.id !== "conjuros" || lanzaConjuros(sheet))
    .map((p) => {
      const Pestana = COMPONENTE_DE_PESTANA[p.id];
      return { id: p.id, label: p.label, content: <Pestana {...props} /> };
    });

  return (
    <div className="flex flex-col gap-s4">
      <Cabecera {...props} />
      <div key="cuerpo" data-piel="cromado">
        <Tabs items={items} active={activa} onChange={cambiar} layout={disposicion === "pagina" ? "sidebar" : "strip"} />
      </div>
    </div>
  );
}
```

Comprueba que `Caracteristicas` acepte `sheet={null}` (hoy lo recibe `undefined` en la rama a medias; usa lo que ya acepte). Si `Tabs` monta solo el contenido activo (léelo), la prueba «cada tarjeta en su pestaña» vale tal cual; si monta todos ocultos, usa `toBeVisible()` en vez de `queryByText(...).toBeNull()`.

- [ ] **Step 4: Verlas pasar** — `pnpm --filter @dnd/web test -- character-sheet` → PASS, y `HojaCalculada.tsx` < 150 líneas (`wc -l`).

- [ ] **Step 5: Commit** — `"feat(web): the sheet is a header plus tabs, sidebar on the page and strip at the table"`.

---

### Task 8: `accionesDeObjeto.ts` — una lista, dos pintores

**Files:**
- Create: `apps/web/src/features/inventory/accionesDeObjeto.ts`, `__tests__/accionesDeObjeto.test.ts`
- Modify: `apps/web/src/features/inventory/FilaObjeto.tsx:36-180` (pinta desde la lista)
- Test: `__tests__/FilaObjeto.test.tsx` (existente; sus aserciones no cambian)

**Interfaces:**
- Produces:

```ts
import type { ItemLocation } from "@dnd/shared";
import type { InventoryRow } from "./api";

export interface AccionDeObjeto {
  id: "principal" | "sintonizar" | "gastar" | "soltar";
  rotulo: string;          // lo que se lee en el botón
  ariaLabel?: string;      // con el nombre del objeto, como hoy
  variant: "secondary" | "ghost";
  pressed?: boolean;       // sintonizado
  ejecutar: () => void;
}

export interface ManosDeObjeto {
  onAccionPrincipal: () => void;
  onSoltar: () => void;
  onGastar?: () => void;
  onSintonizar?: () => void;
}

/** La lista de acciones de una fila, en el orden en que se pintan. Un solo sitio: la fila y el
 *  panel de detalle la consumen, y una prueba afirma que ofrecen lo mismo. */
export function accionesDeObjeto(row: InventoryRow, manos: ManosDeObjeto): AccionDeObjeto[];
```

Orden y textos exactamente los de `FilaObjeto.tsx` hoy: principal (`NOMBRE_ACCION_ZONA[row.location]`, `secondary`), sintonizar (solo si `manos.onSintonizar`; rótulo `Sintonizado`/`Sintonizar`, `pressed: row.attuned`, ariaLabel `Desintonizar X`/`Sintonizar con X`), gastar (solo si `manos.onGastar`; ariaLabel `Gastar una unidad de X`), soltar (`ghost`, ariaLabel `Soltar X`).

- [ ] **Step 1: Prueba que falla**

```ts
const fila = (extra: Partial<InventoryRow> = {}): InventoryRow => ({
  id: "r1", quantity: 1, location: "CARRIED", slot: null, attuned: false, storedAt: null, note: null,
  item: { name: "Daga", requiresAttunement: false } as InventoryRow["item"], ...extra,
});
it("ofrece principal, sintonizar (si procede), gastar (si procede) y soltar, en ese orden y con los textos de siempre", () => {
  const manos = { onAccionPrincipal: vi.fn(), onSoltar: vi.fn(), onGastar: vi.fn(), onSintonizar: vi.fn() };
  const acciones = accionesDeObjeto(fila({ attuned: true }), manos);
  expect(acciones.map((a) => [a.id, a.rotulo])).toEqual([
    ["principal", "Equipar"], ["sintonizar", "Sintonizado"], ["gastar", "Gastar"], ["soltar", "Soltar"],
  ]);
  expect(acciones[1].pressed).toBe(true);
  expect(acciones[3].ariaLabel).toBe("Soltar Daga");
  acciones[0].ejecutar();
  expect(manos.onAccionPrincipal).toHaveBeenCalled();
});
it("sin manos opcionales, solo principal y soltar", () => {
  const acciones = accionesDeObjeto(fila({ location: "EQUIPPED" }), { onAccionPrincipal: vi.fn(), onSoltar: vi.fn() });
  expect(acciones.map((a) => a.id)).toEqual(["principal", "soltar"]);
  expect(acciones[0].rotulo).toBe("Quitar");
});
```

- [ ] **Step 2: Verla fallar.** — [ ] **Step 3: Implementar** `accionesDeObjeto` y en `FilaObjeto.tsx` sustituir los cuatro `<Button>` por:

```tsx
{accionesDeObjeto(row, { onAccionPrincipal, onSoltar, onGastar, onSintonizar }).map((a) => (
  <Button key={a.id} type="button" variant={a.variant} aria-busy={ocupado} aria-pressed={a.pressed} aria-label={a.ariaLabel} onClick={a.ejecutar}>
    {a.rotulo}
  </Button>
))}
```

- [ ] **Step 4: Verlas pasar** — `pnpm --filter @dnd/web test -- inventory` → PASS **sin tocar `FilaObjeto.test.tsx`** (si una aserción cambia, la lista no reproduce la fila: arregla la lista).

- [ ] **Step 5: Commit** — `"refactor(web): an item's actions are one list, and the row paints from it"`.

---

### Task 9: Objetos a página completa — filtros, lista y panel de detalle

**Files:**
- Create: `apps/web/src/features/inventory/FiltrosDeObjetos.tsx`, `DetalleDeObjeto.tsx`, `filtrarObjetos.ts`, y sus tests
- Modify: `PaginaDeInventario.tsx` (prop `disposicion`; en `"pagina"`: `grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]`, izquierda filtros + zonas, derecha `DetalleDeObjeto`; estado `seleccionadaId`), `FilaObjeto.tsx` (props `seleccionada?: boolean`, `onSeleccionar?: () => void` — la fila es un `<li>` con `aria-selected` y un botón invisible sobre el nombre)
- Modify: `pestanas/Objetos.tsx` (pasa `disposicion`)

**Interfaces:**
- Produces: `filtrarObjetos(items: InventoryRow[], f: FiltroDeObjetos): InventoryRow[]` con `FiltroDeObjetos = { donde: ItemLocation | null; que: "weapon" | "armor" | "consumable" | "otro" | null; sintonizados: boolean; texto: string }` (busca en `item.name`, sin acentos ni mayúsculas). `FiltrosDeObjetos({ filtro, onCambiar })` con `FilterChip` por opción y un `<input type="search" aria-label="Buscar objeto">`. `DetalleDeObjeto({ row, acciones, esDM, onIdentificar })`: `<aside aria-label="detalle del objeto">` con nombre, `subtituloDeObjeto`, daño/CA (`datoDeObjeto` — expórtalo de `FilaObjeto.tsx`), peso unitario y total (`formatearKg`), «Requiere sintonización» si procede, `item.description` en `<p className="font-world">`, y las `acciones` como `<Button>` (mismo mapa que la fila); si `row` es `null`, `<EmptyState title="Elige un objeto">La lista de la izquierda enseña su detalle aquí.</EmptyState>`.

- [ ] **Step 1: Pruebas que fallan**

```ts
// filtrarObjetos.test.ts
it("filtra por dónde, qué, sintonizados y texto sin acentos", () => {
  const items = [fila({ id: "a", location: "EQUIPPED", item: { ...arma, name: "Espada larga" } }), fila({ id: "b", item: { ...pocion, name: "Poción de curación" } }), fila({ id: "c", attuned: true, item: anillo })];
  expect(filtrarObjetos(items, { donde: "EQUIPPED", que: null, sintonizados: false, texto: "" }).map((r) => r.id)).toEqual(["a"]);
  expect(filtrarObjetos(items, { donde: null, que: "consumable", sintonizados: false, texto: "" }).map((r) => r.id)).toEqual(["b"]);
  expect(filtrarObjetos(items, { donde: null, que: null, sintonizados: true, texto: "" }).map((r) => r.id)).toEqual(["c"]);
  expect(filtrarObjetos(items, { donde: null, que: null, sintonizados: false, texto: "pocion" }).map((r) => r.id)).toEqual(["b"]);
});
```

```tsx
// DetalleDeObjeto.test.tsx
it("enseña nombre, tipo, daño, peso, sintonización y descripción, y las mismas acciones que la fila", () => {
  const manos = { onAccionPrincipal: vi.fn(), onSoltar: vi.fn(), onSintonizar: vi.fn() };
  const row = fila({ item: { ...espadaMagica, description: "Una hoja que zumba.", requiresAttunement: true } });
  render(<DetalleDeObjeto row={row} acciones={accionesDeObjeto(row, manos)} esDM={false} />);
  const panel = screen.getByRole("complementary", { name: "detalle del objeto" });
  expect(within(panel).getByText("Espada larga +1")).toBeInTheDocument();
  expect(within(panel).getByText("Una hoja que zumba.")).toBeInTheDocument();
  expect(within(panel).getByText(/requiere sintonización/i)).toBeInTheDocument();
  expect(within(panel).getAllByRole("button").map((b) => b.textContent)).toEqual(["Equipar", "Sintonizar", "Soltar"]);
  expect(within(panel).queryByText("CARRIED")).toBeNull();
});
```

```tsx
// PaginaDeInventario.test.tsx (añadir)
it("a página: dos columnas, la primera fila queda seleccionada y el detalle la enseña; en mesa no hay detalle", async () => {
  renderInventario({ disposicion: "pagina" });
  const detalle = await screen.findByRole("complementary", { name: "detalle del objeto" });
  expect(within(detalle).getByText("Daga")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /ver detalle de Poción/i }));
  expect(within(detalle).getByText("Poción de curación")).toBeInTheDocument();
  cleanup();
  renderInventario({ disposicion: "mesa" });
  await screen.findByRole("region", { name: "inventario" });
  expect(screen.queryByRole("complementary", { name: "detalle del objeto" })).toBeNull();
});
```

- [ ] **Step 2: Verlas fallar.** — [ ] **Step 3: Implementar.** En `PaginaDeInventario`: `const [filtro, setFiltro] = useState<FiltroDeObjetos>({ donde: null, que: null, sintonizados: false, texto: "" })`, `const visibles = filtrarObjetos(items, filtro)`, `const [seleccionadaId, setSeleccionadaId] = useState<string | null>(null)`, `const seleccionada = visibles.find((r) => r.id === seleccionadaId) ?? visibles[0] ?? null`. Las tres `ZonaDeObjetos` se alimentan de `visibles`. Cada `FilaObjeto` recibe `seleccionada={row.id === seleccionada?.id}` y `onSeleccionar={() => setSeleccionadaId(row.id)}` **solo en `"pagina"`**. El detalle recibe `acciones={accionesDeObjeto(seleccionada, manosDe(seleccionada))}` donde `manosDe(row)` construye las mismas cuatro funciones que la fila ya recibe (extráelas a una función local para no duplicarlas). **Un filtro es de cliente y nunca control de acceso**: escribe ese comentario junto a `filtrarObjetos`.

- [ ] **Step 4: Verlas pasar** — `pnpm --filter @dnd/web test -- inventory character-sheet` → PASS.

- [ ] **Step 5: Commit** — `"feat(web): the inventory on the page filters its list and shows the selected item's detail"`.

---

### Task 10: Medir en el navegador

**Files:**
- Create: `apps/web/e2e/hoja-pestanas.spec.ts`
- Modify: `apps/web/e2e/tokens-contrast.spec.ts` (la hoja con pestañas: visita `?pestana=objetos` y `?pestana=estado` además de la hoja por defecto, en los tres temas), `apps/web/e2e/teclado.spec.ts` (el recorrido pasa por las pestañas con `Tab`/`Enter`/flechas), `apps/web/e2e/hoja.spec.ts` (los recorridos existentes que buscan «Puntos de golpe» o el inventario abren antes su pestaña — **sin quitar ninguna aserción**)

**Interfaces:** ninguna nueva. Usa los helpers de arranque (`registrar`, `crearCampana`, `crearPersonaje`…) que `hoja.spec.ts` ya usa; léelos en `e2e/helpers/`.

- [ ] **Step 1: Escribir el spec**

```ts
import { expect, test } from "@playwright/test";
// helpers como en hoja.spec.ts

test("a 1280 las tres columnas de Números caben sin scroll horizontal y el detalle de Objetos queda a la derecha de la lista", async ({ page }) => {
  // arranque: usuario, campaña, personaje con clase y dos objetos (como hoja.spec.ts:127)
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`/campaigns/${campaignId}/characters/${characterId}`);
  const numeros = page.locator('[data-pestana="numeros"]');
  await expect(numeros).toBeVisible();
  const carac = numeros.getByText("Características").locator("xpath=ancestor::section[1]");
  const habil = numeros.getByText("Habilidades").locator("xpath=ancestor::section[1]");
  const a = await carac.boundingBox(); const b = await habil.boundingBox();
  expect(a && b && b.x > a.x + a.width - 1).toBeTruthy(); // lado a lado, no apiladas
  const anchoDoc = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(anchoDoc).toBeLessThanOrEqual(1280);

  await page.getByRole("tab", { name: "Objetos" }).click();
  await expect(page).toHaveURL(/pestana=objetos/);
  const lista = page.getByRole("region", { name: "inventario" });
  const detalle = page.getByRole("complementary", { name: "detalle del objeto" });
  const l = await lista.boundingBox(); const d = await detalle.boundingBox();
  expect(l && d && d.x >= l.x + l.width - 1).toBeTruthy();
});

test("en la mesa (390×844) la tira de pestañas y la fila de objeto no se cortan", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  // abrir la sesión y el cajón «Tu hoja» como hace mesa-mide / tirada.spec.ts
  const tablist = page.getByRole("tablist");
  const t = await tablist.boundingBox();
  expect(t && t.x + t.width <= 390).toBeTruthy();
  await page.getByRole("tab", { name: "Objetos" }).click();
  const fila = page.getByRole("region", { name: "inventario" }).locator("li").first();
  const f = await fila.boundingBox();
  expect(f && f.x + f.width <= 390).toBeTruthy();
  await expect(page.getByRole("complementary", { name: "detalle del objeto" })).toHaveCount(0);
});

test("recargar con ?pestana=rasgos abre Rasgos, y los cinco números siguen arriba", async ({ page }) => {
  await page.goto(`/campaigns/${campaignId}/characters/${characterId}?pestana=rasgos`);
  await expect(page.getByRole("tab", { name: "Rasgos", selected: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "resumen de combate" })).toBeVisible();
});
```

- [ ] **Step 2: Correr solo este fichero** — `pnpm --filter @dnd/web e2e -- e2e/hoja-pestanas.spec.ts` → 3 passed. Si falla por maquetación (las columnas se estrangulan a 1280), el arreglo es CSS (`minmax(0,1fr)` en las columnas), no aflojar la medida.

- [ ] **Step 3: Ajustar `hoja.spec.ts`, `tokens-contrast.spec.ts`, `teclado.spec.ts`** y correr los tres: `pnpm --filter @dnd/web e2e -- e2e/hoja.spec.ts e2e/tokens-contrast.spec.ts e2e/teclado.spec.ts` → todo passed, con las líneas de resumen pegadas en el informe.

- [ ] **Step 4: Suite entera** — `pnpm --filter @dnd/web e2e` (con `WORKTREE_SLOT=1` si `:3000` está ocupado) → resumen pegado. Los `test.fail` de `mesa-en-estrecho.spec.ts` siguen siendo `test.fail`.

- [ ] **Step 5: Commit** — `"test(web): the tabbed sheet measured in the browser at 1280 and 390, in three themes and by keyboard"`.

---

### Task 11: Documentación en el mismo hito

**Files:**
- Modify: `docs/01-arquitectura.md` (§ estructura de la web: `character-sheet/pestanas/`, `Cabecera`, `accionesDeObjeto`, `DetalleDeObjeto`), `docs/06-pendientes.md` (la pregunta del §10 de la spec del 09-06 queda contestada; nada nuevo salvo lo que salga), `docs/07-historial.md` (hito «La hoja a página completa» con qué/por qué/revertir: «revertir = `git revert` de la tanda; las tarjetas no cambiaron»), `docs/08-pruebas.md` (conteo e2e nuevo del `--list`), `docs/decisiones.md` (las seis de §11 de la spec + «Dar a…» fuera + la fila no pasa a menú), `docs/como-seguir.md` (enlace a la spec y a este plan), `docs/superpowers/specs/2026-09-06-la-hoja-en-la-mesa-design.md` (nota al pie: «implementada por el plan del 2026-09-11 junto con la página; §10 contestado»)
- Run: `pnpm update:estado` (regenera el bloque de `00-INDEX`)

- [ ] **Step 1: Escribir** las entradas. — [ ] **Step 2:** `pnpm check:docs && pnpm check:historial && pnpm verify` → exit 0. — [ ] **Step 3: Commit** — `"docs: the sheet on the page, what it decided and how it is measured"`.

---

## Self-review

- **Cobertura de la spec:** §3 enfoque → Tasks 3–7; §4 cabecera → Task 3 (con la desviación «nombre solo en mesa», justificada por `PageHeader`); §5 siete pestañas, Números por defecto, Conjuros condicional, URL → Tasks 4–7; §6 fila + detalle + lista única + filtros → Tasks 8–9 («Dar a…» y menú «…» fuera, declarado en Global Constraints); §7 permisos → nada nuevo, `puedeEditar` fluye por `PropsDePestana`; §8 pruebas → RTL en cada task, navegador en Task 10; ficha del token → Task 1; §11 decisiones → Task 11.
- **Placeholders:** los bloques «el bloque de salvaciones de HojaCalculada, tal cual» son mudanzas literales de código que ya existe en `HojaCalculada.tsx:200-260`, con su línea citada; no son huecos.
- **Tipos:** `PropsDePestana`, `Disposicion`, `PestanaId`, `PESTANAS_DE_LA_HOJA` definidos en Task 3/7 y usados igual en 4–9; `accionesDeObjeto`/`ManosDeObjeto`/`AccionDeObjeto` definidos en Task 8 y consumidos en 9; `datoDeObjeto` se exporta en Task 9 desde `FilaObjeto.tsx`.
