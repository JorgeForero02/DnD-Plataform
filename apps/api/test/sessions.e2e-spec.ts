import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

describe("Sessions (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const emailDM = `dm${Date.now()}@b.com`;
  const emailPL = `pl${Date.now()}@b.com`;
  let tokenDM = "";
  let tokenPL = "";
  let campaignId = "";

  beforeAll(async () => {
    const ref = await Test.createTestingModule({ imports: [AppModule] }).compile();
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

  it("DM creates sessions; player cannot create (403)", async () => {
    const s = app.getHttpServer();
    const ok = await request(s)
      .post(`/campaigns/${campaignId}/sessions`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ title: "Session 1", visibility: "PLAYERS" });
    expect(ok.status).toBe(201);
    await request(s)
      .post(`/campaigns/${campaignId}/sessions`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ title: "Secret prep", visibility: "DM_ONLY" });
    const forbidden = await request(s)
      .post(`/campaigns/${campaignId}/sessions`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({ title: "nope", visibility: "PLAYERS" });
    expect(forbidden.status).toBe(403);
  });

  it("player lists only visible sessions; DM lists all", async () => {
    const s = app.getHttpServer();
    const dm = await request(s)
      .get(`/campaigns/${campaignId}/sessions`)
      .set("Authorization", `Bearer ${tokenDM}`);
    expect(dm.body.length).toBe(2);
    const pl = await request(s)
      .get(`/campaigns/${campaignId}/sessions`)
      .set("Authorization", `Bearer ${tokenPL}`);
    expect(pl.body.map((x: any) => x.title)).toEqual(["Session 1"]);
  });

  describe("dónde abre la escena (plan 02)", () => {
    let santuarioId = "";
    let sesionId = "";

    it("el DM crea una sesión que abre en una ficha DM_ONLY", async () => {
      const s = app.getHttpServer();
      santuarioId = (
        await request(s)
          .post(`/campaigns/${campaignId}/entities`)
          .set("Authorization", `Bearer ${tokenDM}`)
          .send({ type: "LOCATION", name: "El Santuario Sellado", visibility: "DM_ONLY" })
      ).body.id;
      const r = await request(s)
        .post(`/campaigns/${campaignId}/sessions`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ title: "La bajada", visibility: "PLAYERS", openingEntityId: santuarioId });
      expect(r.status).toBe(201);
      sesionId = r.body.id;
    });

    it("el jugador NO recibe ni el nombre ni el id de la ficha de apertura", async () => {
      const r = await request(app.getHttpServer())
        .get(`/campaigns/${campaignId}/sessions/${sesionId}`)
        .set("Authorization", `Bearer ${tokenPL}`);
      expect(r.status).toBe(200);
      // La sesión sí la ve —es `PLAYERS`—; lo que no ve es dónde abre.
      expect(r.body.title).toBe("La bajada");
      expect(r.body).not.toHaveProperty("openingEntity");
      // **Ni el id.** Un identificador que no puede resolver seguiría confirmando que la sesión
      // abre en algo que no le enseñan.
      expect(r.body).not.toHaveProperty("openingEntityId");
    });

    it("y el DM la recibe con su nombre, sin haber guardado texto en ninguna parte", async () => {
      const r = await request(app.getHttpServer())
        .get(`/campaigns/${campaignId}/sessions/${sesionId}`)
        .set("Authorization", `Bearer ${tokenDM}`);
      expect(r.body.openingEntity).toMatchObject({
        id: santuarioId,
        name: "El Santuario Sellado",
        type: "LOCATION",
      });
    });

    it("apuntar a una ficha de OTRA campaña es 404", async () => {
      const s = app.getHttpServer();
      const otra = (
        await request(s)
          .post("/campaigns")
          .set("Authorization", `Bearer ${tokenDM}`)
          .send({ name: "Otra mesa" })
      ).body.id;
      const ajena = (
        await request(s)
          .post(`/campaigns/${otra}/entities`)
          .set("Authorization", `Bearer ${tokenDM}`)
          .send({ type: "LOCATION", name: "Otro sitio", visibility: "PUBLIC" })
      ).body.id;
      const r = await request(s)
        .post(`/campaigns/${campaignId}/sessions`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ title: "No", visibility: "PLAYERS", openingEntityId: ajena });
      expect(r.status).toBe(404);
      await prisma.campaign.deleteMany({ where: { id: otra } });
    });

    it("**borrar el lugar NO borra la sesión**: la clave es SET NULL, no CASCADE", async () => {
      const s = app.getHttpServer();
      const borrado = await request(s)
        .delete(`/campaigns/${campaignId}/entities/${santuarioId}`)
        .set("Authorization", `Bearer ${tokenDM}`);
      expect(borrado.status).toBe(200);

      // Se comprueba **borrando de verdad**, no leyendo el esquema: `ON DELETE CASCADE` aquí se
      // llevaría por delante la crónica de una partida que sí ocurrió.
      const r = await request(s)
        .get(`/campaigns/${campaignId}/sessions/${sesionId}`)
        .set("Authorization", `Bearer ${tokenDM}`);
      expect(r.status).toBe(200);
      expect(r.body.title).toBe("La bajada");
      expect(r.body.openingEntityId).toBeNull();
      expect(r.body).not.toHaveProperty("openingEntity");
    });
  });
});
