import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

describe("Entity links (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const emailDM = `dm${Date.now()}@b.com`;
  const emailPL = `pl${Date.now()}@b.com`;
  let tokenDM = "";
  let tokenPL = "";
  let campaignId = "";
  let npcId = "";
  let pubLocId = "";
  let secretLocId = "";

  const mkEntity = (token: string, name: string, type: string, visibility: string) =>
    request(app.getHttpServer())
      .post(`/campaigns/${campaignId}/entities`)
      .set("Authorization", `Bearer ${token}`)
      .send({ type, name, visibility });

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
    const regPL = await request(s)
      .post("/auth/register")
      .send({ email: emailPL, password: "password123", displayName: "PL" });
    tokenPL = regPL.body.token;
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
    npcId = (await mkEntity(tokenDM, "Strahd", "NPC", "PLAYERS")).body.id;
    pubLocId = (await mkEntity(tokenDM, "Village", "LOCATION", "PLAYERS")).body.id;
    secretLocId = (await mkEntity(tokenDM, "Secret Lair", "LOCATION", "DM_ONLY")).body.id;
  });

  afterAll(async () => {
    if (campaignId) await prisma.campaign.deleteMany({ where: { id: campaignId } });
    await prisma.user.deleteMany({ where: { email: { in: [emailDM, emailPL] } } });
    await app.close();
  });

  it("DM links the NPC to both locations; self-link is rejected", async () => {
    const s = app.getHttpServer();
    const l1 = await request(s)
      .post(`/entities/${npcId}/links`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ toId: pubLocId, label: "lives in" });
    expect(l1.status).toBe(201);
    const l2 = await request(s)
      .post(`/entities/${npcId}/links`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ toId: secretLocId });
    expect(l2.status).toBe(201);
    const self = await request(s)
      .post(`/entities/${npcId}/links`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ toId: npcId });
    expect(self.status).toBe(400);
  });

  it("DM sees both links, player sees only the public-target link", async () => {
    const s = app.getHttpServer();
    const dm = await request(s)
      .get(`/entities/${npcId}/links`)
      .set("Authorization", `Bearer ${tokenDM}`);
    expect(dm.body.length).toBe(2);
    const pl = await request(s)
      .get(`/entities/${npcId}/links`)
      .set("Authorization", `Bearer ${tokenPL}`);
    expect(pl.body.map((l: any) => l.to.id)).toEqual([pubLocId]); // secret lair hidden
  });
});
