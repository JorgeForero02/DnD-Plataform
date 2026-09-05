import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

describe("Invites (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  // Date.now() alone (ms resolution) collides when two Jest workers start in the same
  // millisecond — the second register() 400s and one worker's afterAll deletes the other's
  // user mid-run. See docs/06-pendientes.md (arreglo 5, tarea 1.15-fix).
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1e6)}`;
  const emailA = `dm${suffix}@b.com`;
  const emailB = `pl${suffix}@b.com`;
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

  // **Ola 3: sentarse a la mesa deja rastro.** Habia un emisor interno para `notifications`, que
  // el motor de reglas no oye —escucha `game_event.recorded`—, asi que `MEMBER_JOINED` se ofrecia
  // en el editor y no se disparaba nunca.
  it("accepting an invite writes MEMBER_JOINED, visible to the table", async () => {
    const s = app.getHttpServer();
    const log = await request(s)
      .get(`/campaigns/${campaignId}/events`)
      .set("Authorization", `Bearer ${tokenB}`);
    expect(log.status).toBe(200);
    const entradas = log.body.events.filter((e: any) => e.type === "MEMBER_JOINED");
    expect(entradas.length).toBe(1);
    // Lo ve quien acaba de entrar: es `PLAYERS`, no un secreto del DM.
    expect(entradas[0].payload.role).toBeDefined();
  });

  it("the same invite cannot be reused (400)", async () => {
    const s = app.getHttpServer();
    const res = await request(s)
      .post(`/invites/${inviteToken}/accept`)
      .set("Authorization", `Bearer ${tokenB}`);
    expect(res.status).toBe(400);
  });
});
