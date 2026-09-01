import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

describe("Invites (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const emailA = `dm${Date.now()}@b.com`;
  const emailB = `pl${Date.now()}@b.com`;
  let tokenA = "";
  let tokenB = "";
  let campaignId = "";
  let inviteToken = "";

  beforeAll(async () => {
    const ref = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = ref.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    prisma = app.get(PrismaService);
    const s = app.getHttpServer();
    tokenA = (
      await request(s)
        .post("/auth/register")
        .send({ email: emailA, password: "password123", displayName: "DM" })
    ).body.token;
    tokenB = (
      await request(s)
        .post("/auth/register")
        .send({ email: emailB, password: "password123", displayName: "Player" })
    ).body.token;
    campaignId = (
      await request(s)
        .post("/campaigns")
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ name: "C" })
    ).body.id;
  });

  afterAll(async () => {
    if (campaignId) await prisma.campaign.deleteMany({ where: { id: campaignId } });
    await prisma.user.deleteMany({ where: { email: { in: [emailA, emailB] } } });
    await app.close();
  });

  it("DM creates an invite", async () => {
    const s = app.getHttpServer();
    const res = await request(s)
      .post(`/campaigns/${campaignId}/invites`)
      .set("Authorization", `Bearer ${tokenA}`);
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    inviteToken = res.body.token;
  });

  it("a non-DM cannot create an invite (403)", async () => {
    const s = app.getHttpServer();
    const res = await request(s)
      .post(`/campaigns/${campaignId}/invites`)
      .set("Authorization", `Bearer ${tokenB}`);
    expect(res.status).toBe(403);
  });

  it("player accepts the invite and becomes a member", async () => {
    const s = app.getHttpServer();
    const accept = await request(s)
      .post(`/invites/${inviteToken}/accept`)
      .set("Authorization", `Bearer ${tokenB}`);
    expect(accept.status).toBe(201);
    const read = await request(s)
      .get(`/campaigns/${campaignId}`)
      .set("Authorization", `Bearer ${tokenB}`);
    expect(read.status).toBe(200);
  });

  it("the same invite cannot be reused (400)", async () => {
    const s = app.getHttpServer();
    const res = await request(s)
      .post(`/invites/${inviteToken}/accept`)
      .set("Authorization", `Bearer ${tokenB}`);
    expect(res.status).toBe(400);
  });
});
