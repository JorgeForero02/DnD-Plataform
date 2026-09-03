import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

describe("Campaign items (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const emailDM = `dm${Date.now()}@b.com`;
  const emailPL = `pl${Date.now()}@b.com`;
  let tokenDM = "";
  let tokenPL = "";
  let playerId = "";
  let campaignId = "";

  beforeAll(async () => {
    const ref = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = ref.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    prisma = app.get(PrismaService);
    const s = app.getHttpServer();
    const regDM = await request(s)
      .post("/auth/register")
      .send({ email: emailDM, password: "password123", displayName: "DM" });
    tokenDM = regDM.body.token;
    const regPL = await request(s)
      .post("/auth/register")
      .send({ email: emailPL, password: "password123", displayName: "PL" });
    tokenPL = regPL.body.token;
    playerId = regPL.body.user.id;
    campaignId = (
      await request(s)
        .post("/campaigns")
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ name: "C" })
    ).body.id;
    const invite = (
      await request(s)
        .post(`/campaigns/${campaignId}/invites`)
        .set("Authorization", `Bearer ${tokenDM}`)
    ).body.token;
    await request(s).post(`/invites/${invite}/accept`).set("Authorization", `Bearer ${tokenPL}`);
  });

  afterAll(async () => {
    if (campaignId) await prisma.campaign.deleteMany({ where: { id: campaignId } });
    await prisma.user.deleteMany({ where: { email: { in: [emailDM, emailPL] } } });
    await app.close();
  });

  const espadaLarga = {
    name: "Espada larga +1",
    kind: "WEAPON",
    weightOz: 48,
    weapon: {
      category: "MARTIAL",
      range: "MELEE",
      damageDice: "1d8",
      damageType: "SLASHING",
      properties: ["VERSATILE"],
      versatileDice: "1d10",
    },
  };

  it("requiere token (401)", async () => {
    const res = await request(app.getHttpServer()).get(`/campaigns/${campaignId}/items`);
    expect(res.status).toBe(401);
  });

  it("un jugador no puede crear objetos (403)", async () => {
    const res = await request(app.getHttpServer())
      .post(`/campaigns/${campaignId}/items`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send(espadaLarga);
    expect(res.status).toBe(403);
  });

  it("un cuerpo que no valida responde 400", async () => {
    const res = await request(app.getHttpServer())
      .post(`/campaigns/${campaignId}/items`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ name: "Arma incompleta", kind: "WEAPON" }); // sin bloque `weapon`
    expect(res.status).toBe(400);
  });

  it("el DM crea, y filtra por visibilidad al listar y leer", async () => {
    const s = app.getHttpServer();
    const mk = (name: string, visibility: string, extra: object = {}) =>
      request(s)
        .post(`/campaigns/${campaignId}/items`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ ...espadaLarga, name, visibility, ...extra });

    const pub = await mk("Objeto público", "PUBLIC");
    const mesa = await mk("Objeto de la mesa", "PLAYERS");
    const secreto = await mk("Objeto secreto", "DM_ONLY");
    const paraTi = await mk("Solo para ti", "SPECIFIC_PLAYERS", { specificPlayerIds: [playerId] });
    expect([pub.status, mesa.status, secreto.status, paraTi.status]).toEqual([201, 201, 201, 201]);

    const dmList = await request(s)
      .get(`/campaigns/${campaignId}/items`)
      .set("Authorization", `Bearer ${tokenDM}`);
    expect(dmList.status).toBe(200);
    expect(dmList.body.length).toBe(4);

    const plList = await request(s)
      .get(`/campaigns/${campaignId}/items`)
      .set("Authorization", `Bearer ${tokenPL}`);
    expect(plList.status).toBe(200);
    const names = plList.body.map((i: any) => i.name).sort();
    expect(names).toEqual(["Objeto de la mesa", "Objeto público", "Solo para ti"]);

    // GET :id — 404 y no 403 para el que no puede ver, y también para el que no existe.
    const getSecretAsPlayer = await request(s)
      .get(`/campaigns/${campaignId}/items/${secreto.body.id}`)
      .set("Authorization", `Bearer ${tokenPL}`);
    expect(getSecretAsPlayer.status).toBe(404);

    const getMissing = await request(s)
      .get(`/campaigns/${campaignId}/items/no-existe`)
      .set("Authorization", `Bearer ${tokenDM}`);
    expect(getMissing.status).toBe(404);

    const getSecretAsDM = await request(s)
      .get(`/campaigns/${campaignId}/items/${secreto.body.id}`)
      .set("Authorization", `Bearer ${tokenDM}`);
    expect(getSecretAsDM.status).toBe(200);
  });

  it("PATCH: un jugador no puede editar (403); el DM sí", async () => {
    const s = app.getHttpServer();
    const created = await request(s)
      .post(`/campaigns/${campaignId}/items`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ ...espadaLarga, name: "Objeto editable" });

    const asPlayer = await request(s)
      .patch(`/campaigns/${campaignId}/items/${created.body.id}`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({ name: "Robado" });
    expect(asPlayer.status).toBe(403);

    const asDM = await request(s)
      .patch(`/campaigns/${campaignId}/items/${created.body.id}`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ name: "Renombrada por el DM" });
    expect(asDM.status).toBe(200);
    expect(asDM.body.name).toBe("Renombrada por el DM");
  });

  it("DELETE: 403 para un jugador, 409 si está en un inventario, 200 tras vaciarlo", async () => {
    const s = app.getHttpServer();
    const created = await request(s)
      .post(`/campaigns/${campaignId}/items`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ ...espadaLarga, name: "Objeto a borrar" });
    const itemId = created.body.id;

    const asPlayer = await request(s)
      .delete(`/campaigns/${campaignId}/items/${itemId}`)
      .set("Authorization", `Bearer ${tokenPL}`);
    expect(asPlayer.status).toBe(403);

    const character = await request(s)
      .post(`/campaigns/${campaignId}/characters`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({ name: "Portador" });
    const inventoryRow = await prisma.inventoryItem.create({
      data: { characterId: character.body.id, campaignItemId: itemId },
    });

    const blocked = await request(s)
      .delete(`/campaigns/${campaignId}/items/${itemId}`)
      .set("Authorization", `Bearer ${tokenDM}`);
    expect(blocked.status).toBe(409);
    expect(blocked.body.message).toMatch(/1/);

    await prisma.inventoryItem.delete({ where: { id: inventoryRow.id } });

    const ok = await request(s)
      .delete(`/campaigns/${campaignId}/items/${itemId}`)
      .set("Authorization", `Bearer ${tokenDM}`);
    expect(ok.status).toBe(200);
  });
});
