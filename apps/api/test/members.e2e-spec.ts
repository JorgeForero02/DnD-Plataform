import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

describe("Campaign members (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const emailDM = `dm${Date.now()}@b.com`;
  const emailPL = `pl${Date.now()}@b.com`;
  const emailOut = `out${Date.now()}@b.com`;
  let tokenDM = "";
  let tokenPL = "";
  let tokenOut = "";
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
        .send({ email: emailPL, password: "password123", displayName: "Player One" })
    ).body.token;
    tokenOut = (
      await request(s)
        .post("/auth/register")
        .send({ email: emailOut, password: "password123", displayName: "Outsider" })
    ).body.token;
    campaignId = (
      await request(s)
        .post("/campaigns")
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ name: "C" })
    ).body.id;
    const inv = (
      await request(s)
        .post(`/campaigns/${campaignId}/invites`)
        .set("Authorization", `Bearer ${tokenDM}`)
    ).body.token;
    await request(s).post(`/invites/${inv}/accept`).set("Authorization", `Bearer ${tokenPL}`);
  });

  afterAll(async () => {
    if (campaignId) await prisma.campaign.deleteMany({ where: { id: campaignId } });
    await prisma.user.deleteMany({ where: { email: { in: [emailDM, emailPL, emailOut] } } });
    await app.close();
  });

  it("member lists members with displayName + role; outsider gets 403", async () => {
    const s = app.getHttpServer();
    const res = await request(s)
      .get(`/campaigns/${campaignId}/members`)
      .set("Authorization", `Bearer ${tokenPL}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
    const dm = res.body.find((m: any) => m.role === "DM");
    const pl = res.body.find((m: any) => m.role === "PLAYER");
    expect(dm.displayName).toBe("DM");
    expect(pl.displayName).toBe("Player One");
    const forbidden = await request(s)
      .get(`/campaigns/${campaignId}/members`)
      .set("Authorization", `Bearer ${tokenOut}`);
    expect(forbidden.status).toBe(403);
  });
});
