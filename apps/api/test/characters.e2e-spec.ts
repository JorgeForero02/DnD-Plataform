import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

describe("Characters (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const emailDM = `dm${Date.now()}@b.com`;
  const emailP1 = `p1${Date.now()}@b.com`;
  const emailP2 = `p2${Date.now()}@b.com`;
  let tokenDM = "";
  let tokenP1 = "";
  let tokenP2 = "";
  let campaignId = "";
  let aragornId = "";

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
    tokenP1 = (
      await request(s)
        .post("/auth/register")
        .send({ email: emailP1, password: "password123", displayName: "P1" })
    ).body.token;
    tokenP2 = (
      await request(s)
        .post("/auth/register")
        .send({ email: emailP2, password: "password123", displayName: "P2" })
    ).body.token;
    campaignId = (
      await request(s)
        .post("/campaigns")
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ name: "C" })
    ).body.id;
    const inv1 = (
      await request(s)
        .post(`/campaigns/${campaignId}/invites`)
        .set("Authorization", `Bearer ${tokenDM}`)
    ).body.token;
    await request(s).post(`/invites/${inv1}/accept`).set("Authorization", `Bearer ${tokenP1}`);
    const inv2 = (
      await request(s)
        .post(`/campaigns/${campaignId}/invites`)
        .set("Authorization", `Bearer ${tokenDM}`)
    ).body.token;
    await request(s).post(`/invites/${inv2}/accept`).set("Authorization", `Bearer ${tokenP2}`);
  });

  afterAll(async () => {
    if (campaignId) await prisma.campaign.deleteMany({ where: { id: campaignId } });
    await prisma.user.deleteMany({ where: { email: { in: [emailDM, emailP1, emailP2] } } });
    await app.close();
  });

  it("member creates own character; ownerId is the caller", async () => {
    const s = app.getHttpServer();
    const res = await request(s)
      .post(`/campaigns/${campaignId}/characters`)
      .set("Authorization", `Bearer ${tokenP1}`)
      .send({ name: "Aragorn", race: "Human", class: "Ranger", level: 3, visibility: "PLAYERS" });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Aragorn");
    aragornId = res.body.id;
    // seed more: P2 OWNER_DM, P1 DM_ONLY
    await request(s)
      .post(`/campaigns/${campaignId}/characters`)
      .set("Authorization", `Bearer ${tokenP2}`)
      .send({ name: "Legolas", visibility: "OWNER_DM" });
    await request(s)
      .post(`/campaigns/${campaignId}/characters`)
      .set("Authorization", `Bearer ${tokenP1}`)
      .send({ name: "Secret", visibility: "DM_ONLY" });
  });

  it("player list is canView-filtered; DM sees all", async () => {
    const s = app.getHttpServer();
    const p1 = await request(s)
      .get(`/campaigns/${campaignId}/characters`)
      .set("Authorization", `Bearer ${tokenP1}`);
    // P1 sees Aragorn (PLAYERS). Legolas is P2's OWNER_DM (hidden). Secret is P1's DM_ONLY (hidden even from owner).
    expect(p1.body.map((c: any) => c.name).sort()).toEqual(["Aragorn"]);
    const p2 = await request(s)
      .get(`/campaigns/${campaignId}/characters`)
      .set("Authorization", `Bearer ${tokenP2}`);
    // P2 sees Aragorn (PLAYERS) + own Legolas (OWNER_DM). Secret hidden.
    expect(p2.body.map((c: any) => c.name).sort()).toEqual(["Aragorn", "Legolas"]);
    const dm = await request(s)
      .get(`/campaigns/${campaignId}/characters`)
      .set("Authorization", `Bearer ${tokenDM}`);
    expect(dm.body.length).toBe(3);
  });

  it("only owner or DM can update; other player gets 403", async () => {
    const s = app.getHttpServer();
    const forbidden = await request(s)
      .patch(`/campaigns/${campaignId}/characters/${aragornId}`)
      .set("Authorization", `Bearer ${tokenP2}`)
      .send({ level: 20 });
    expect(forbidden.status).toBe(403);
    const owner = await request(s)
      .patch(`/campaigns/${campaignId}/characters/${aragornId}`)
      .set("Authorization", `Bearer ${tokenP1}`)
      .send({ level: 4 });
    expect(owner.status).toBe(200);
    expect(owner.body.level).toBe(4);
    const dm = await request(s)
      .patch(`/campaigns/${campaignId}/characters/${aragornId}`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ level: 5 });
    expect(dm.status).toBe(200);
  });
});
