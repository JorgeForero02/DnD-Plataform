import { Test } from "@nestjs/testing";
import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { MembershipService } from "../../campaigns/membership.service";
import { GameEventsService } from "../../game-events/game-events.service";
import { PrismaService } from "../../prisma/prisma.service";
import { TemporaryModifiersService } from "./temporary-modifiers.service";

// **Quién puede escribir un modificador temporal a mano.**
//
// Puerta B de la ficha P1 «quedan dos puertas por las que un jugador se concede una mecánica».
// Hasta el 2026-09-07 `grant` pedía `requireOwnerOrDM`, así que un jugador podía darse **`+10` al
// ataque, sin caducidad y con el motivo que quisiera**, y eso entra en la derivación de la hoja.
//
// La puerta se concedió por escrito con un caso de uso real —«beberse una poción que ya llevas
// encima no debería ser una petición al DM»— y **ese caso dejó de necesitarla el 2026-09-06**:
// consumir un objeto aplica sus efectos por su cuenta. Se comprobó antes de cerrar nada, y es lo
// que la última prueba de este fichero defiende: `consume` **escribe directo con el `tx`**
// (`inventory.service.ts:546`), no pasa por aquí, así que cerrar esta puerta no toca la legítima.

describe("TemporaryModifiersService", () => {
  let service: TemporaryModifiersService;
  const prisma = {
    user: { findUnique: jest.fn() },
    character: { findFirst: jest.fn() },
    campaign: { findUniqueOrThrow: jest.fn() },
    temporaryModifier: { create: jest.fn(), findFirst: jest.fn(), delete: jest.fn() },
    transaction: jest.fn(),
  };
  const membership = { requireMember: jest.fn(), getMembership: jest.fn(), requireDM: jest.fn() };
  const events = { record: jest.fn() };

  /** El personaje del jugador: suyo, y visible para él. */
  const suPersonaje = {
    id: "pj1",
    campaignId: "c1",
    ownerId: "jugador",
    visibility: "PLAYERS",
  };

  beforeEach(async () => {
    const ref = await Test.createTestingModule({
      providers: [
        TemporaryModifiersService,
        { provide: PrismaService, useValue: prisma },
        { provide: MembershipService, useValue: membership },
        { provide: GameEventsService, useValue: events },
      ],
    }).compile();
    service = ref.get(TemporaryModifiersService);
    jest.resetAllMocks();

    membership.requireMember.mockResolvedValue(undefined);
    // Por defecto quien llama es **jugador y dueño**: el caso que esta ficha cierra.
    membership.getMembership.mockResolvedValue({ role: "PLAYER", userId: "jugador" });
    prisma.user.findUnique.mockResolvedValue({ id: "jugador", isAdmin: false });
    prisma.character.findFirst.mockResolvedValue(suPersonaje);
    prisma.campaign.findUniqueOrThrow.mockResolvedValue({ id: "c1", clockSeconds: 1000 });
    prisma.temporaryModifier.create.mockResolvedValue({
      id: "m1",
      target: "attack",
      amount: 10,
      reason: "porque sí",
    });
    prisma.transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(prisma));
    events.record.mockResolvedValue({ id: "e1" });
  });

  const unMasDiez = { target: "attack", amount: 10, reason: "porque sí" } as never;

  // **La prueba de la ficha.** Un jugador dueño de su personaje ya no puede escribirse un bonus.
  it("un jugador NO puede concederse un modificador, aunque el personaje sea suyo", async () => {
    membership.requireDM.mockRejectedValue(new ForbiddenException("DM role required"));

    await expect(service.grant("jugador", "c1", "pj1", unMasDiez)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    // Y no escribe nada: un 403 que ya hubiera creado la fila sería peor que no tener la guarda.
    expect(prisma.temporaryModifier.create).not.toHaveBeenCalled();
    expect(events.record).not.toHaveBeenCalled();
  });

  // El DM sí, que es de quien pasa a ser el gesto.
  it("el DM sí puede, y queda dicho en el registro", async () => {
    membership.getMembership.mockResolvedValue({ role: "DM", userId: "dm" });
    membership.requireDM.mockResolvedValue({ role: "DM", userId: "dm" });

    await service.grant("dm", "c1", "pj1", unMasDiez);

    expect(prisma.temporaryModifier.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ characterId: "pj1", amount: 10, grantedById: "dm" }),
      }),
    );
    expect(events.record).toHaveBeenCalled();
  });

  // **La visibilidad del suceso sigue siendo la del personaje**, y se fija aquí porque es una fuga
  // que ya volvió dos veces (2.5.2 y 2C): un PNJ `DM_ONLY` con un +2 no puede anunciar que existe.
  // Cambiar el permiso de `grant` no debía tocar esto, y esta prueba lo sostiene.
  it("el suceso hereda la visibilidad del personaje, no un PLAYERS fijo", async () => {
    membership.getMembership.mockResolvedValue({ role: "DM", userId: "dm" });
    membership.requireDM.mockResolvedValue({ role: "DM", userId: "dm" });
    prisma.character.findFirst.mockResolvedValue({ ...suPersonaje, visibility: "DM_ONLY" });

    await service.grant("dm", "c1", "pj1", unMasDiez);

    expect(events.record).toHaveBeenCalledWith(
      "dm",
      "c1",
      expect.objectContaining({ visibility: "DM_ONLY" }),
      expect.anything(),
    );
  });

  // T15 (3A.2) — un target de OBJETO exige un `inventoryItemId` que sea del personaje y sea un
  // arma. `long-sword` (arma) y `leather` (armadura) son objetos reales del catálogo SRD: probar
  // contra el catálogo real, no un doble, es lo que asegura que "es un arma" no se le pregunte a
  // un mock que siempre dice que sí.
  describe("un target de objeto (item.weaponAttack/item.weaponDamage)", () => {
    const filaConEspada = {
      id: "inv1",
      characterId: "pj1",
      srdKey: "long-sword",
      campaignItemId: null,
    };
    const filaConArmadura = {
      id: "inv2",
      characterId: "pj1",
      srdKey: "leather",
      campaignItemId: null,
    };
    const encantarEspada = {
      target: "item.weaponAttack" as const,
      amount: 1,
      reason: "Arma mágica",
      inventoryItemId: "inv1",
    };

    beforeEach(() => {
      membership.getMembership.mockResolvedValue({ role: "DM", userId: "dm" });
      membership.requireDM.mockResolvedValue({ role: "DM", userId: "dm" });
    });

    it("grant(): sobre un arma del propio personaje, escribe la fila con inventoryItemId", async () => {
      (prisma as unknown as { inventoryItem: { findFirst: jest.Mock } }).inventoryItem = {
        findFirst: jest.fn().mockResolvedValue(filaConEspada),
      };
      await service.grant("dm", "c1", "pj1", encantarEspada);
      expect(prisma.temporaryModifier.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ target: "item.weaponAttack", inventoryItemId: "inv1" }),
        }),
      );
    });

    it("grant(): sobre una fila que no es del personaje, 400 y no escribe", async () => {
      (prisma as unknown as { inventoryItem: { findFirst: jest.Mock } }).inventoryItem = {
        findFirst: jest.fn().mockResolvedValue(null),
      };
      await expect(service.grant("dm", "c1", "pj1", encantarEspada)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.temporaryModifier.create).not.toHaveBeenCalled();
    });

    it("grant(): sobre una armadura (no un arma), 400 y no escribe", async () => {
      (prisma as unknown as { inventoryItem: { findFirst: jest.Mock } }).inventoryItem = {
        findFirst: jest.fn().mockResolvedValue(filaConArmadura),
      };
      await expect(
        service.grant("dm", "c1", "pj1", { ...encantarEspada, inventoryItemId: "inv2" }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.temporaryModifier.create).not.toHaveBeenCalled();
    });

    it("grantFromActivity(): NO exige requireDM — la llama el propio lanzador vía usar()", async () => {
      const tx = {
        ...prisma,
        inventoryItem: { findFirst: jest.fn().mockResolvedValue(filaConEspada) },
      } as never;
      membership.requireDM.mockRejectedValue(new ForbiddenException("no llamado aquí"));

      await service.grantFromActivity(tx, "c1", "pj1", "mago1", encantarEspada);

      expect(membership.requireDM).not.toHaveBeenCalled();
      expect(prisma.temporaryModifier.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            characterId: "pj1",
            target: "item.weaponAttack",
            inventoryItemId: "inv1",
            grantedById: "mago1",
          }),
        }),
      );
    });

    it("grantFromActivity(): sobre un objeto que no es del personaje, 400", async () => {
      const tx = {
        ...prisma,
        inventoryItem: { findFirst: jest.fn().mockResolvedValue(null) },
      } as never;
      await expect(
        service.grantFromActivity(tx, "c1", "pj1", "mago1", encantarEspada),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
