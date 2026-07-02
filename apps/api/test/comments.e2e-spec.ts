import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

describe("Comments (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const emailDM = `dm${Date.now()}@b.com`;
  const emailPL = `pl${Date.now()}@b.com`;
  let tokenDM = "";
  let tokenPL = "";
  let campaignId = "";
  let publicEntityId = "";
  let secretEntityId = "";

  beforeAll(async () => {
    const ref = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = ref.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    prisma = app.get(PrismaService);
    const s = app.getHttpServer();
    tokenDM = (await request(s).post("/auth/register").send({ email: emailDM, password: "password123", displayName: "DM" })).body.token;
    tokenPL = (await request(s).post("/auth/register").send({ email: emailPL, password: "password123", displayName: "PL" })).body.token;
    campaignId = (await request(s).post("/campaigns").set("Authorization", `Bearer ${tokenDM}`).send({ name: "C" })).body.id;
    const invite = (await request(s).post(`/campaigns/${campaignId}/invites`).set("Authorization", `Bearer ${tokenDM}`)).body.token;
    await request(s).post(`/invites/${invite}/accept`).set("Authorization", `Bearer ${tokenPL}`);
    publicEntityId = (await request(s).post(`/campaigns/${campaignId}/entities`).set("Authorization", `Bearer ${tokenDM}`).send({ type: "NPC", name: "Open", visibility: "PLAYERS" })).body.id;
    secretEntityId = (await request(s).post(`/campaigns/${campaignId}/entities`).set("Authorization", `Bearer ${tokenDM}`).send({ type: "NPC", name: "Secret", visibility: "DM_ONLY" })).body.id;
  });

  afterAll(async () => {
    if (campaignId) await prisma.campaign.deleteMany({ where: { id: campaignId } });
    await prisma.user.deleteMany({ where: { email: { in: [emailDM, emailPL] } } });
    await app.close();
  });

  it("player comments on a visible entity and reads it back", async () => {
    const s = app.getHttpServer();
    const post = await request(s).post(`/entities/${publicEntityId}/comments`).set("Authorization", `Bearer ${tokenPL}`).send({ body: "Nice NPC" });
    expect(post.status).toBe(201);
    const list = await request(s).get(`/entities/${publicEntityId}/comments`).set("Authorization", `Bearer ${tokenPL}`);
    expect(list.status).toBe(200);
    expect(list.body.map((c: any) => c.body)).toContain("Nice NPC");
  });

  it("player cannot comment on a DM_ONLY entity (403)", async () => {
    const s = app.getHttpServer();
    const res = await request(s).post(`/entities/${secretEntityId}/comments`).set("Authorization", `Bearer ${tokenPL}`).send({ body: "sneaky" });
    expect(res.status).toBe(403);
  });
});
