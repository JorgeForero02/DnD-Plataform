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
    tokenDM = (await request(s).post("/auth/register").send({ email: emailDM, password: "password123", displayName: "DM" })).body.token;
    tokenPL = (await request(s).post("/auth/register").send({ email: emailPL, password: "password123", displayName: "PL" })).body.token;
    campaignId = (await request(s).post("/campaigns").set("Authorization", `Bearer ${tokenDM}`).send({ name: "C" })).body.id;
    const invite = (await request(s).post(`/campaigns/${campaignId}/invites`).set("Authorization", `Bearer ${tokenDM}`)).body.token;
    await request(s).post(`/invites/${invite}/accept`).set("Authorization", `Bearer ${tokenPL}`);
  });

  afterAll(async () => {
    if (campaignId) await prisma.campaign.deleteMany({ where: { id: campaignId } });
    await prisma.user.deleteMany({ where: { email: { in: [emailDM, emailPL] } } });
    await app.close();
  });

  it("DM creates sessions; player cannot create (403)", async () => {
    const s = app.getHttpServer();
    const ok = await request(s).post(`/campaigns/${campaignId}/sessions`).set("Authorization", `Bearer ${tokenDM}`).send({ title: "Session 1", visibility: "PLAYERS" });
    expect(ok.status).toBe(201);
    await request(s).post(`/campaigns/${campaignId}/sessions`).set("Authorization", `Bearer ${tokenDM}`).send({ title: "Secret prep", visibility: "DM_ONLY" });
    const forbidden = await request(s).post(`/campaigns/${campaignId}/sessions`).set("Authorization", `Bearer ${tokenPL}`).send({ title: "nope", visibility: "PLAYERS" });
    expect(forbidden.status).toBe(403);
  });

  it("player lists only visible sessions; DM lists all", async () => {
    const s = app.getHttpServer();
    const dm = await request(s).get(`/campaigns/${campaignId}/sessions`).set("Authorization", `Bearer ${tokenDM}`);
    expect(dm.body.length).toBe(2);
    const pl = await request(s).get(`/campaigns/${campaignId}/sessions`).set("Authorization", `Bearer ${tokenPL}`);
    expect(pl.body.map((x: any) => x.title)).toEqual(["Session 1"]);
  });
});
