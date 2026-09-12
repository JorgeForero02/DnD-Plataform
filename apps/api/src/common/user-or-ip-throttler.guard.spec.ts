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
    return (
      guard as unknown as { getTracker: (r: unknown, c: ExecutionContext) => Promise<string> }
    ).getTracker(
      { headers: { authorization: `Bearer ${token}` }, ip: "10.0.0.7" },
      contextoConJwtGuard(),
    );
  }

  it("un token emitido ANTES del cambio de contraseña cuenta como su IP, no como el usuario", async () => {
    const token = jwt.sign({ sub: "u1", iat: ahora - 100 });
    const users = {
      findById: jest
        .fn()
        .mockResolvedValue({ id: "u1", passwordChangedAt: new Date((ahora - 10) * 1000) }),
    };
    await expect(tracker(guardCon(users), token)).resolves.toBe("10.0.0.7");
  });

  it("un token emitido en el MISMO segundo del cambio (empate) cuenta como su IP", async () => {
    const token = jwt.sign({ sub: "u1", iat: ahora - 10 });
    const users = {
      findById: jest
        .fn()
        .mockResolvedValue({ id: "u1", passwordChangedAt: new Date((ahora - 10) * 1000) }),
    };
    await expect(tracker(guardCon(users), token)).resolves.toBe("10.0.0.7");
  });

  it("un token emitido DESPUÉS del cambio sigue clavado al usuario", async () => {
    const token = jwt.sign({ sub: "u1", iat: ahora });
    const users = {
      findById: jest
        .fn()
        .mockResolvedValue({ id: "u1", passwordChangedAt: new Date((ahora - 10) * 1000) }),
    };
    await expect(tracker(guardCon(users), token)).resolves.toBe("user:u1");
  });

  it("consulta la base UNA vez por usuario y minuto, no una por petición", async () => {
    const token = jwt.sign({ sub: "u1", iat: ahora });
    const users = { findById: jest.fn().mockResolvedValue({ id: "u1", passwordChangedAt: null }) };
    const guard = guardCon(users);
    await tracker(guard, token);
    await tracker(guard, token);
    await tracker(guard, token);
    expect(users.findById).toHaveBeenCalledTimes(1);
  });
});

// Ronda de cierre del plan de la hoja (HP-6, 2026-09-12): los caminos que la suite de arriba no
// pisaba. Un usuario que ya no existe, un token sin `iat`, una firma que no verifica y —el que
// importa— una base de datos caída, que antes caía en el `catch` de «firma inválida» y contaba
// por IP sin decirlo. La conducta es la misma; ahora cada salida tiene su motivo y su prueba.
describe("UserOrIpThrottlerGuard — las salidas que no son el camino feliz", () => {
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
    return new UserOrIpThrottlerGuard(
      [] as never,
      {} as never,
      new Reflector(),
      jwt,
      users as never,
    );
  }

  async function tracker(guard: UserOrIpThrottlerGuard, token: string) {
    return (
      guard as unknown as { getTracker: (r: unknown, c: ExecutionContext) => Promise<string> }
    ).getTracker(
      { headers: { authorization: `Bearer ${token}` }, ip: "10.0.0.7" },
      contextoConJwtGuard(),
    );
  }

  it("un usuario que ya no existe cuenta como el `sub` del token, y se consulta UNA vez", async () => {
    // `JwtStrategy` lo rechazará con 401; aquí no hay sello contra el que comparar, así que el
    // token firmado cuenta contra su `sub` (nunca contra la IP compartida de una mesa) y el
    // `null` se cachea como cualquier otro sello: la segunda petición no vuelve a preguntar.
    const token = jwt.sign({ sub: "fantasma", iat: ahora });
    const users = { findById: jest.fn().mockResolvedValue(null) };
    const guard = guardCon(users);
    await expect(tracker(guard, token)).resolves.toBe("user:fantasma");
    await expect(tracker(guard, token)).resolves.toBe("user:fantasma");
    expect(users.findById).toHaveBeenCalledTimes(1);
  });

  it("un token sin `iat` cuenta como el usuario aunque haya cambiado la contraseña", async () => {
    // Sin fecha de emisión no se puede decir que sea viejo; la misma regla que `jwt.strategy.ts`.
    const token = jwt.sign({ sub: "u1" }, { noTimestamp: true });
    expect(jwt.decode(token)).not.toHaveProperty("iat");
    const users = {
      findById: jest
        .fn()
        .mockResolvedValue({ id: "u1", passwordChangedAt: new Date((ahora - 10) * 1000) }),
    };
    await expect(tracker(guardCon(users), token)).resolves.toBe("user:u1");
  });

  it("una firma que no verifica cuenta como su IP y no toca la base", async () => {
    const token = new JwtService({ secret: "otro-secreto" }).sign({ sub: "u1", iat: ahora });
    const users = { findById: jest.fn() };
    await expect(tracker(guardCon(users), token)).resolves.toBe("10.0.0.7");
    expect(users.findById).not.toHaveBeenCalled();
  });

  it("si la base falla al leer el sello, cuenta como su IP y NO lanza", async () => {
    // Antes este fallo caía en el `catch` de «firma inválida»: la salida era la misma, pero el
    // motivo escrito era falso. Ahora tiene su propio `catch` y esta prueba lo clava.
    const token = jwt.sign({ sub: "u1", iat: ahora });
    const users = { findById: jest.fn().mockRejectedValue(new Error("la base no responde")) };
    await expect(tracker(guardCon(users), token)).resolves.toBe("10.0.0.7");
    expect(users.findById).toHaveBeenCalledTimes(1);
  });

  it("el caché de sellos tiene tope: al llegar a él barre los vencidos en vez de crecer sin fin", async () => {
    const users = { findById: jest.fn().mockResolvedValue({ id: "x", passwordChangedAt: null }) };
    const guard = guardCon(users);
    const interno = guard as unknown as {
      selloDeCambio: (sub: string) => Promise<number | null>;
      sellos: Map<string, unknown>;
    };
    const t0 = 1_700_000_000_000;
    const reloj = jest.spyOn(Date, "now").mockReturnValue(t0);
    try {
      for (let i = 0; i < 10_000; i++) await interno.selloDeCambio(`u${i}`);
      expect(interno.sellos.size).toBe(10_000);
      // Todavía dentro de la ventana: el tope no borra nada vigente, así que sigue creciendo.
      await interno.selloDeCambio("u10000");
      expect(interno.sellos.size).toBe(10_001);
      // Pasada la ventana, la siguiente entrada barre las vencidas y solo queda ella.
      reloj.mockReturnValue(t0 + 60_001);
      await interno.selloDeCambio("nuevo");
      expect(interno.sellos.size).toBe(1);
      expect(interno.sellos.has("nuevo")).toBe(true);
    } finally {
      reloj.mockRestore();
    }
  });
});
