import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

describe("Campaigns (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const emailA = `dmA${Date.now()}@b.com`;
  const emailB = `plB${Date.now()}@b.com`;
  let tokenA = "";
  let tokenB = "";
  let campaignId = "";

  beforeAll(async () => {
    const ref = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = ref.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    prisma = app.get(PrismaService);
    const server = app.getHttpServer();
    const regA = await request(server).post("/auth/register").send({ email: emailA, password: "password123", displayName: "DM" });
    tokenA = regA.body.token;
    const regB = await request(server).post("/auth/register").send({ email: emailB, password: "password123", displayName: "Player" });
    tokenB = regB.body.token;
  });

  afterAll(async () => {
    if (campaignId) await prisma.campaign.deleteMany({ where: { id: campaignId } });
    await prisma.user.deleteMany({ where: { email: { in: [emailA, emailB] } } });
    await app.close();
  });

  it("owner creates a campaign and becomes a DM member", async () => {
    const server = app.getHttpServer();
    const res = await request(server)
      .post("/campaigns")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ name: "Curse of Strahd" });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    campaignId = res.body.id;

    const list = await request(server).get("/campaigns").set("Authorization", `Bearer ${tokenA}`);
    expect(list.status).toBe(200);
    expect(list.body.map((c: any) => c.id)).toContain(campaignId);
  });

  it("a non-member cannot read the campaign (403)", async () => {
    const server = app.getHttpServer();
    const res = await request(server).get(`/campaigns/${campaignId}`).set("Authorization", `Bearer ${tokenB}`);
    expect(res.status).toBe(403);
  });

  it("the owner can read the campaign (200)", async () => {
    const server = app.getHttpServer();
    const res = await request(server).get(`/campaigns/${campaignId}`).set("Authorization", `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Curse of Strahd");
  });
});
