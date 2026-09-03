import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { InventoryModule } from "../src/inventory/inventory.module";
import { CampaignItemsModule } from "../src/campaign-items/campaign-items.module";
import { PrismaService } from "../src/prisma/prisma.service";

// Carril A4 — el inventario, el equipo y la bolsa, contra Postgres real.
//
// **Por qué esto no puede ser una unitaria, en concreto.** El índice único parcial de
// `20260903063419_inventory_one_item_per_slot` (`(characterId, slot) WHERE slot IS NOT NULL AND
// location = 'EQUIPPED'`) es la red de seguridad para la carrera entre dos "equipar"
// simultáneos; el Prisma simulado de `inventory.service.spec.ts` no valida restricciones SQL,
// así que la única forma honesta de comprobar que la segunda petición choca de verdad es
// lanzar las dos contra la base real (`docs/08-pruebas.md`).
//
// `InventoryModule` y `CampaignItemsModule` se importan aparte de `AppModule` porque cablearlos
// en `app.module.ts` es tarea del orquestador (frontera declarada en el encargo). Este fichero
// SE ESCRIBE pero no se ejecuta como parte de esta tarea.

describe("Inventario, equipo y bolsa (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const emailDM = `dm-inv${Date.now()}@b.com`;
  const emailPL = `pl-inv${Date.now()}@b.com`;
  const emailPL2 = `pl2-inv${Date.now()}@b.com`;
  const emailX = `x-inv${Date.now()}@b.com`;
  let tokenDM = "";
  let tokenPL = "";
  let tokenPL2 = "";
  let tokenX = "";
  let campaignId = "";
  let characterId = "";

  beforeAll(async () => {
    const ref = await Test.createTestingModule({
      imports: [AppModule, InventoryModule, CampaignItemsModule],
    }).compile();
    app = ref.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    prisma = app.get(PrismaService);
    const s = app.getHttpServer();

    tokenDM = (
      await request(s)
        .post("/auth/register")
        .send({ email: emailDM, password: "password123", displayName: "DM" })
    ).body.token;
    tokenPL = (
      await request(s)
        .post("/auth/register")
        .send({ email: emailPL, password: "password123", displayName: "PL" })
    ).body.token;
    tokenPL2 = (
      await request(s)
        .post("/auth/register")
        .send({ email: emailPL2, password: "password123", displayName: "PL2" })
    ).body.token;
    tokenX = (
      await request(s)
        .post("/auth/register")
        .send({ email: emailX, password: "password123", displayName: "X" })
    ).body.token;

    campaignId = (
      await request(s)
        .post("/campaigns")
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ name: "Campaña de inventario" })
    ).body.id;

    for (const token of [tokenPL, tokenPL2]) {
      const invite = (
        await request(s)
          .post(`/campaigns/${campaignId}/invites`)
          .set("Authorization", `Bearer ${tokenDM}`)
      ).body.token;
      await request(s).post(`/invites/${invite}/accept`).set("Authorization", `Bearer ${token}`);
    }

    characterId = (
      await request(s)
        .post(`/campaigns/${campaignId}/characters`)
        .set("Authorization", `Bearer ${tokenPL}`)
        .send({ name: "Duernor", class: "fighter", level: 3, visibility: "PLAYERS" })
    ).body.id;
    await prisma.character.update({ where: { id: characterId }, data: { str: 14 } });
  });

  afterAll(async () => {
    if (campaignId) await prisma.campaign.deleteMany({ where: { id: campaignId } });
    await prisma.user.deleteMany({
      where: { email: { in: [emailDM, emailPL, emailPL2, emailX] } },
    });
    await app.close();
  });

  const s = () => app.getHttpServer();
  const base = () => `/campaigns/${campaignId}/characters/${characterId}/inventory`;

  it("el dueño mete una daga del SRD en la mochila, y GET la devuelve resuelta con el peso", async () => {
    const add = await request(s())
      .post(base())
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({ ref: { source: "SRD", key: "dagger" }, quantity: 1 });
    expect(add.status).toBe(201);
    expect(add.body.srdKey).toBe("dagger");

    const list = await request(s()).get(base()).set("Authorization", `Bearer ${tokenPL}`);
    expect(list.status).toBe(200);
    const fila = list.body.items.find((i: { id: string }) => i.id === add.body.id);
    expect(fila).toBeDefined();
    expect(fila.item).toMatchObject({ name: "Daga", kind: "WEAPON" });
    expect(list.body.totalWeightOz).toBeGreaterThan(0);
    // Fuerza 14 × 15 lb, en onzas.
    expect(list.body.carryCapacityOz).toBe(14 * 15 * 16);
  });

  it("equipar la daga en la mano principal funciona, y la ficha lo refleja", async () => {
    const add = await request(s())
      .post(base())
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({ ref: { source: "SRD", key: "mace" }, quantity: 1 });
    const rowId = add.body.id;

    const equip = await request(s())
      .patch(`${base()}/${rowId}`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({ location: "EQUIPPED", slot: "MAIN_HAND" });
    expect(equip.status).toBe(200);
    expect(equip.body).toMatchObject({ location: "EQUIPPED", slot: "MAIN_HAND" });

    const list = await request(s()).get(base()).set("Authorization", `Bearer ${tokenPL}`);
    const fila = list.body.items.find((i: { id: string }) => i.id === rowId);
    expect(fila.location).toBe("EQUIPPED");
  });

  it("equipar otro objeto en MAIN_HAND, que ya está ocupada, es 409 (por la comprobación previa)", async () => {
    const add = await request(s())
      .post(base())
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({ ref: { source: "SRD", key: "handaxe" }, quantity: 1 });

    const equip = await request(s())
      .patch(`${base()}/${add.body.id}`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({ location: "EQUIPPED", slot: "MAIN_HAND" });
    expect(equip.status).toBe(409);

    await request(s()).delete(`${base()}/${add.body.id}`).set("Authorization", `Bearer ${tokenPL}`);
  });

  it("MUTACIÓN CLAVE contra Postgres real: dos peticiones simultáneas de equipar en la misma ranura vacía — una gana, la otra choca con 409", async () => {
    // Se libera MAIN_HAND primero, para que las dos peticiones compitan por una ranura vacía de
    // verdad (y no por una ya ocupada, que ya se prueba arriba y no ejercita el índice).
    const list0 = await request(s()).get(base()).set("Authorization", `Bearer ${tokenPL}`);
    const maceRow = list0.body.items.find(
      (i: { item: { name: string } }) => i.item.name === "Maza",
    );
    await request(s())
      .patch(`${base()}/${maceRow.id}`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({ location: "CARRIED", slot: null });

    const [a, b] = await Promise.all([
      request(s())
        .patch(`${base()}/${maceRow.id}`)
        .set("Authorization", `Bearer ${tokenPL}`)
        .send({ location: "EQUIPPED", slot: "MAIN_HAND" }),
      request(s())
        .post(base())
        .set("Authorization", `Bearer ${tokenPL}`)
        .send({ ref: { source: "SRD", key: "sickle" }, location: "EQUIPPED", slot: "MAIN_HAND" }),
    ]);

    const statuses = [a.status, b.status].sort();
    // Exactamente una gana (200 o 201, según si fue el `PATCH` o el `POST` el que llegó
    // primero) y la otra choca con el 409 que traduce el índice único parcial — la comprobación
    // previa del servicio no ve a la otra petición, así que sin la restricción real de la base
    // las dos podrían colar.
    expect(statuses).toContain(409);
    expect(statuses.some((code) => code === 200 || code === 201)).toBe(true);
  });

  it("un jugador ajeno (miembro, pero ni DM ni dueño) no puede escribir en el inventario (403)", async () => {
    const add = await request(s())
      .post(base())
      .set("Authorization", `Bearer ${tokenPL2}`)
      .send({ ref: { source: "SRD", key: "dagger" }, quantity: 1 });
    expect(add.status).toBe(403);
  });

  it("quien no es miembro de la campaña no ve el inventario (403 al listar)", async () => {
    const list = await request(s()).get(base()).set("Authorization", `Bearer ${tokenX}`);
    expect(list.status).toBe(403);
  });

  it("un objeto DM_ONLY de la campaña no se le puede dar a un personaje cuyo dueño no lo ve (400)", async () => {
    const item = await request(s())
      .post(`/campaigns/${campaignId}/items`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ name: "Reliquia secreta", kind: "OTHER", visibility: "DM_ONLY" });
    expect(item.status).toBe(201);

    const add = await request(s())
      .post(base())
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ ref: { source: "CAMPAIGN", id: item.body.id }, quantity: 1 });
    expect(add.status).toBe(400);
  });

  it("la bolsa: un delta positivo la sube, y un delta que la dejaría en negativo se rechaza sin tocar nada", async () => {
    const money = () => `/campaigns/${campaignId}/characters/${characterId}/money`;

    const subida = await request(s())
      .patch(money())
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({ gp: 10, reason: "botín del cofre" });
    expect(subida.status).toBe(200);
    expect(subida.body.gp).toBe(10);

    const negativo = await request(s())
      .patch(money())
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({ gp: -100 });
    expect(negativo.status).toBe(400);

    const list = await request(s()).get(base()).set("Authorization", `Bearer ${tokenPL}`);
    // Sigue en 10: el intento rechazado no dejó ningún cambio a medias.
    expect(list.body.purse.gp).toBe(10);
  });
});
