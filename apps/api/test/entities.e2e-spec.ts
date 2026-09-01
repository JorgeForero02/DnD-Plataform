import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

describe("Entities visibility (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const emailDM = `dm${Date.now()}@b.com`;
  const emailPL = `pl${Date.now()}@b.com`;
  let tokenDM = "";
  let tokenPL = "";
  let playerId = "";
  let campaignId = "";

  beforeAll(async () => {
    const ref = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = ref.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    prisma = app.get(PrismaService);
    const s = app.getHttpServer();
    const regDM = await request(s)
      .post("/auth/register")
      .send({ email: emailDM, password: "password123", displayName: "DM" });
    tokenDM = regDM.body.token;
    const regPL = await request(s)
      .post("/auth/register")
      .send({ email: emailPL, password: "password123", displayName: "PL" });
    tokenPL = regPL.body.token;
    playerId = regPL.body.user.id;
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

  it("filters NPCs by visibility for the player", async () => {
    const s = app.getHttpServer();
    const mk = (name: string, visibility: string, extra: object = {}) =>
      request(s)
        .post(`/campaigns/${campaignId}/entities`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ type: "NPC", name, visibility, ...extra });

    await mk("Public NPC", "PUBLIC");
    await mk("Players NPC", "PLAYERS");
    await mk("Secret NPC", "DM_ONLY");
    await mk("Just You NPC", "SPECIFIC_PLAYERS", { specificPlayerIds: [playerId] });

    const dmList = await request(s)
      .get(`/campaigns/${campaignId}/entities?type=NPC`)
      .set("Authorization", `Bearer ${tokenDM}`);
    expect(dmList.status).toBe(200);
    expect(dmList.body.length).toBe(4); // DM sees all

    const plList = await request(s)
      .get(`/campaigns/${campaignId}/entities?type=NPC`)
      .set("Authorization", `Bearer ${tokenPL}`);
    expect(plList.status).toBe(200);
    const names = plList.body.map((e: any) => e.name).sort();
    expect(names).toEqual(["Just You NPC", "Players NPC", "Public NPC"]); // NOT "Secret NPC"
  });

  // Task 1.17b · A1: Entity.body, an explicit { format, text } shape (entity.schema.ts),
  // validated by the same ZodValidationPipe as the rest of the entity input.
  it("rejects a body whose format is not markdown", async () => {
    const s = app.getHttpServer();
    const res = await request(s)
      .post(`/campaigns/${campaignId}/entities`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({
        type: "NPC",
        name: "Formato inválido",
        body: { format: "html", text: "<p>hi</p>" },
      });
    expect(res.status).toBe(400);
  });

  it("rejects a body text over 50000 characters", async () => {
    const s = app.getHttpServer();
    const res = await request(s)
      .post(`/campaigns/${campaignId}/entities`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({
        type: "NPC",
        name: "Texto demasiado largo",
        body: { format: "markdown", text: "a".repeat(50001) },
      });
    expect(res.status).toBe(400);
  });

  it("saves a well-formed body and returns it identical on GET", async () => {
    const s = app.getHttpServer();
    const body = { format: "markdown", text: "## Título\n\nDescripción del NPC" };
    const created = await request(s)
      .post(`/campaigns/${campaignId}/entities`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ type: "NPC", name: "Con cuerpo", body });
    expect(created.status).toBe(201);
    expect(created.body.body).toEqual(body);

    const fetched = await request(s)
      .get(`/campaigns/${campaignId}/entities/${created.body.id}`)
      .set("Authorization", `Bearer ${tokenDM}`);
    expect(fetched.status).toBe(200);
    expect(fetched.body.body).toEqual(body);
  });
});
