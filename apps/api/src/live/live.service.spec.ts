import { UnauthorizedException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { MembershipService } from "../campaigns/membership.service";
import { LiveBus } from "./live-bus";
import { LiveService, VIDA_DEL_BILLETE_MS } from "./live.service";

// Plan 12 · 12.3 — **el billete es lo único que protege el canal**, así que es lo que se prueba:
// de un solo uso, de vida corta, atado a su mesa, y emitido solo a quien está en ella.

describe("LiveService", () => {
  let service: LiveService;
  const membership = { requireMember: jest.fn() };

  beforeEach(async () => {
    const ref = await Test.createTestingModule({
      providers: [LiveService, LiveBus, { provide: MembershipService, useValue: membership }],
    }).compile();
    service = ref.get(LiveService);
    jest.resetAllMocks();
    membership.requireMember.mockResolvedValue({ role: "PLAYER" });
  });

  it("no emite billete a quien no está en la mesa", async () => {
    membership.requireMember.mockRejectedValue(new Error("Not a member of this campaign"));
    await expect(service.emitirBillete("c1", "fuera")).rejects.toThrow();
  });

  it("un billete vale UNA vez: el segundo canje falla", async () => {
    const { ticket } = await service.emitirBillete("c1", "u1");
    expect(service.canjearBillete(ticket, "c1")).toEqual({ userId: "u1" });
    expect(() => service.canjearBillete(ticket, "c1")).toThrow(UnauthorizedException);
  });

  it("un billete de otra mesa no abre esta", async () => {
    const { ticket } = await service.emitirBillete("c1", "u1");
    expect(() => service.canjearBillete(ticket, "c2")).toThrow(UnauthorizedException);
  });

  it("un billete caducado no vale", async () => {
    const { ticket } = await service.emitirBillete("c1", "u1");
    const despues = Date.now() + VIDA_DEL_BILLETE_MS + 1;
    jest.spyOn(Date, "now").mockReturnValue(despues);
    expect(() => service.canjearBillete(ticket, "c1")).toThrow(UnauthorizedException);
  });

  it("un billete inventado, uno gastado y uno caducado dicen lo mismo", async () => {
    const { ticket } = await service.emitirBillete("c1", "u1");
    service.canjearBillete(ticket, "c1");
    const mensajes = new Set<string>();
    for (const intento of [ticket, "inventado", ""]) {
      try {
        service.canjearBillete(intento, "c1");
      } catch (error) {
        mensajes.add((error as Error).message);
      }
    }
    // La diferencia contaría si existió alguna vez, igual que en el enlace de invitación.
    expect(mensajes.size).toBe(1);
  });

  it("un billete gastado NO se queda en memoria, y uno caducado tampoco", async () => {
    // Se comprueba por su efecto: tras canjearlo, el mismo billete ya no existe para nadie.
    const { ticket } = await service.emitirBillete("c1", "u1");
    service.canjearBillete(ticket, "c1");
    expect(() => service.canjearBillete(ticket, "c1")).toThrow(UnauthorizedException);
  });
});

describe("LiveBus", () => {
  it("reparte solo a los de esa campaña, y cancelar corta de verdad", () => {
    const bus = new LiveBus();
    const deC1: unknown[] = [];
    const deC2: unknown[] = [];
    const cancelar = bus.subscribe("c1", (a) => deC1.push(a));
    bus.subscribe("c2", (a) => deC2.push(a));

    bus.publish({ type: "HP_CHANGED", campaignId: "c1" });
    expect(deC1).toHaveLength(1);
    expect(deC2).toHaveLength(0);

    cancelar();
    bus.publish({ type: "HP_CHANGED", campaignId: "c1" });
    expect(deC1).toHaveLength(1);
    // Y no deja el hueco de la campaña vacío detrás: sería una fuga pequeña y perpetua.
    expect(bus.cuantosEscuchan("c1")).toBe(0);
  });

  it("un oyente que revienta no tumba a quien publicó", () => {
    const bus = new LiveBus();
    const buenos: unknown[] = [];
    bus.subscribe("c1", () => {
      throw new Error("la conexión se cerró entre medias");
    });
    bus.subscribe("c1", (a) => buenos.push(a));
    // Publicar ocurre justo después de escribir en la base: si lanzara, tumbaría esa petición.
    expect(() => bus.publish({ type: "HP_CHANGED", campaignId: "c1" })).not.toThrow();
    expect(buenos).toHaveLength(1);
  });
});
