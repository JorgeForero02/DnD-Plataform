import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

// PNJ del mundo y la mesa (2026-09-14, Task 0) contra Postgres real — el puente `entityId`: el
// DM enlaza un cuerpo con su ficha del mundo, el servidor valida (400 fuera de campaña o si no
// es NPC) y redacta (spec §4): quien no ve la ficha recibe `entityId: null` en las seis lecturas.

describe("PNJ del mundo y la mesa — Task 0 (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const emailDM = `dm-pdm${Date.now()}@b.com`;
  const emailPL = `pl-pdm${Date.now()}@b.com`;
  let tokenDM = "";
  let tokenPL = "";
  let campaignId = "";
  let otraCampanaId = "";
  let garrikId = "";
  let pasoId = "";
  let ajenoId = "";
  let goblinId = "";

  const auth = (t: string) => `Bearer ${t}`;
  const ficha = (id: string) => `/campaigns/${campaignId}/characters/${id}`;

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
        .set("Authorization", auth(tokenDM))
        .send({ name: "El puente" })
    ).body.id;
    const invite = (
      await request(s).post(`/campaigns/${campaignId}/invites`).set("Authorization", auth(tokenDM))
    ).body.token;
    await request(s).post(`/invites/${invite}/accept`).set("Authorization", auth(tokenPL));

    otraCampanaId = (
      await request(s)
        .post("/campaigns")
        .set("Authorization", auth(tokenDM))
        .send({ name: "Otra campaña" })
    ).body.id;

    garrikId = (
      await request(s)
        .post(`/campaigns/${campaignId}/entities`)
        .set("Authorization", auth(tokenDM))
        .send({ type: "NPC", name: "Garrik", visibility: "DM_ONLY" })
    ).body.id;
    pasoId = (
      await request(s)
        .post(`/campaigns/${campaignId}/entities`)
        .set("Authorization", auth(tokenDM))
        .send({ type: "LOCATION", name: "El paso", visibility: "PLAYERS" })
    ).body.id;
    ajenoId = (
      await request(s)
        .post(`/campaigns/${otraCampanaId}/entities`)
        .set("Authorization", auth(tokenDM))
        .send({ type: "NPC", name: "Ajeno", visibility: "DM_ONLY" })
    ).body.id;

    goblinId = (
      await request(s)
        .post(`/campaigns/${campaignId}/npcs`)
        .set("Authorization", auth(tokenDM))
        .send({ ref: "SRD:goblin" })
    ).body[0]?.id;
  });

  afterAll(async () => {
    if (campaignId) await prisma.campaign.delete({ where: { id: campaignId } }).catch(() => {});
    if (otraCampanaId)
      await prisma.campaign.delete({ where: { id: otraCampanaId } }).catch(() => {});
    await prisma.user.deleteMany({ where: { email: { in: [emailDM, emailPL] } } }).catch(() => {});
    await app.close();
  });

  describe("Task 0 — el puente entityId", () => {
    it("un jugador no puede enlazar: 403", async () => {
      const r = await request(app.getHttpServer())
        .patch(ficha(goblinId))
        .set("Authorization", auth(tokenPL))
        .send({ entityId: garrikId });
      expect(r.status).toBe(403);
    });

    it("entityId de otra campaña → 400; de una ficha que no es PNJ → 400", async () => {
      for (const id of [ajenoId, pasoId]) {
        const r = await request(app.getHttpServer())
          .patch(ficha(goblinId))
          .set("Authorization", auth(tokenDM))
          .send({ entityId: id });
        expect(r.status).toBe(400);
      }
    });

    it("el DM enlaza; el jugador no recibe el entityId de una ficha que no ve, y sí cuando la ficha es PLAYERS", async () => {
      const s = app.getHttpServer();
      await request(s)
        .patch(ficha(goblinId))
        .set("Authorization", auth(tokenDM))
        .send({ entityId: garrikId, visibility: "PLAYERS" })
        .expect(200);
      const dm = await request(s).get(ficha(goblinId)).set("Authorization", auth(tokenDM));
      expect(dm.body.entityId).toBe(garrikId);
      const pl = await request(s)
        .get(`/campaigns/${campaignId}/npcs`)
        .set("Authorization", auth(tokenPL));
      expect(pl.body.find((n: any) => n.id === goblinId).entityId).toBeNull();
      const hoja = await request(s)
        .get(`${ficha(goblinId)}/sheet`)
        .set("Authorization", auth(tokenPL));
      expect(hoja.body.character.entityId).toBeNull();
      await request(s)
        .patch(`/campaigns/${campaignId}/entities/${garrikId}`)
        .set("Authorization", auth(tokenDM))
        .send({ visibility: "PLAYERS" })
        .expect(200);
      const pl2 = await request(s)
        .get(`/campaigns/${campaignId}/npcs`)
        .set("Authorization", auth(tokenPL));
      expect(pl2.body.find((n: any) => n.id === goblinId).entityId).toBe(garrikId);
    });

    it("bajar una criatura con entityId la enlaza", async () => {
      const r = await request(app.getHttpServer())
        .post(`/campaigns/${campaignId}/npcs`)
        .set("Authorization", auth(tokenDM))
        .send({ ref: "SRD:goblin", count: 2, entityId: garrikId });
      expect(r.status).toBe(201);
      expect(r.body.map((c: any) => c.entityId)).toEqual([garrikId, garrikId]);
    });
  });
});
