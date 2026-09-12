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
