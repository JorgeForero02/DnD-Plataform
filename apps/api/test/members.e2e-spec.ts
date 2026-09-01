import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

describe("Campaign members (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  // Date.now() alone (ms resolution) collides when two Jest workers start in the same
  // millisecond — the second register() 400s and one worker's afterAll deletes the other's
  // user mid-run. See docs/06-pendientes.md (arreglo 5, tarea 1.15-fix).
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1e6)}`;
  const emailDM = `dm${suffix}@b.com`;
  const emailPL = `pl${suffix}@b.com`;
  const emailOut = `out${suffix}@b.com`;
  let tokenDM = "";
  let tokenPL = "";
  let tokenOut = "";
  let userIdDM = "";
  let userIdPL = "";
  let campaignId = "";
  const extraCampaignIds: string[] = [];

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
    userIdDM = regDM.body.user.id;
    const regPL = await request(s)
      .post("/auth/register")
      .send({ email: emailPL, password: "password123", displayName: "Player One" });
    tokenPL = regPL.body.token;
    userIdPL = regPL.body.user.id;
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
    if (extraCampaignIds.length) {
      await prisma.campaign.deleteMany({ where: { id: { in: extraCampaignIds } } });
    }
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

  describe("DELETE /campaigns/:id/members/:userId — the DM leaving their own campaign", () => {
    it("is rejected, and the DM stays a member", async () => {
      const s = app.getHttpServer();
      const res = await request(s)
        .delete(`/campaigns/${campaignId}/members/${userIdDM}`)
        .set("Authorization", `Bearer ${tokenDM}`);
      expect(res.status).toBe(403);

      // Verified with a real GET, not just the status code.
      const read = await request(s)
        .get(`/campaigns/${campaignId}`)
        .set("Authorization", `Bearer ${tokenDM}`);
      expect(read.status).toBe(200);
    });
  });

  describe("DELETE /campaigns/:id/members/:userId — kicking a player", () => {
    it("removes them and they lose access to what was PLAYERS-visible", async () => {
      const s = app.getHttpServer();
      const auth = (token: string) => `Bearer ${token}`;

      const kickCampaignId = (
        await request(s)
          .post("/campaigns")
          .set("Authorization", auth(tokenDM))
          .send({ name: "Kick campaign" })
      ).body.id;
      extraCampaignIds.push(kickCampaignId);

      const invite = (
        await request(s)
          .post(`/campaigns/${kickCampaignId}/invites`)
          .set("Authorization", auth(tokenDM))
      ).body.token;
      await request(s).post(`/invites/${invite}/accept`).set("Authorization", auth(tokenPL));

      await request(s)
        .post(`/campaigns/${kickCampaignId}/entities`)
        .set("Authorization", auth(tokenDM))
        .send({ type: "NPC", name: "Ismark", visibility: "PLAYERS" });

      // A SPECIFIC_PLAYERS entity granting the player: PLAYERS-visibility alone would already
      // be denied by requireMember once kicked, so it can't tell "the grant row was deleted"
      // from "grants were left orphaned but membership blocks the read anyway". Only a grant
      // check against the database, not an HTTP status, proves the cleanup this endpoint
      // promises (docs/05-datos.md: retiring access is the central product argument).
      await request(s)
        .post(`/campaigns/${kickCampaignId}/entities`)
        .set("Authorization", auth(tokenDM))
        .send({
          type: "NPC",
          name: "A secret for you only",
          visibility: "SPECIFIC_PLAYERS",
          specificPlayerIds: [userIdPL],
        });

      const before = await request(s)
        .get(`/campaigns/${kickCampaignId}/entities?type=NPC`)
        .set("Authorization", auth(tokenPL));
      expect(before.status).toBe(200);
      expect(before.body.map((e: any) => e.name).sort()).toEqual([
        "A secret for you only",
        "Ismark",
      ]);

      // Sanity check: the grant actually exists before kicking.
      expect(
        await prisma.entityVisibilityGrant.count({
          where: { userId: userIdPL, entity: { campaignId: kickCampaignId } },
        }),
      ).toBe(1);

      const kick = await request(s)
        .delete(`/campaigns/${kickCampaignId}/members/${userIdPL}`)
        .set("Authorization", auth(tokenDM));
      expect(kick.status).toBe(200);
      expect(kick.body).toEqual({ removed: true });

      const after = await request(s)
        .get(`/campaigns/${kickCampaignId}/entities?type=NPC`)
        .set("Authorization", auth(tokenPL));
      expect(after.status).toBe(403);

      // The actual assertion: the grant row is gone from the database, not just unreachable
      // because membership already blocks the read.
      expect(
        await prisma.entityVisibilityGrant.count({
          where: { userId: userIdPL, entity: { campaignId: kickCampaignId } },
        }),
      ).toBe(0);
    });
  });

  describe("DELETE /campaigns/:id/members/:userId — leaving on your own", () => {
    it("removes the caller and they lose access to what was PLAYERS-visible", async () => {
      const s = app.getHttpServer();
      const auth = (token: string) => `Bearer ${token}`;

      const leaveCampaignId = (
        await request(s)
          .post("/campaigns")
          .set("Authorization", auth(tokenDM))
          .send({ name: "Leave campaign" })
      ).body.id;
      extraCampaignIds.push(leaveCampaignId);

      const invite = (
        await request(s)
          .post(`/campaigns/${leaveCampaignId}/invites`)
          .set("Authorization", auth(tokenDM))
      ).body.token;
      await request(s).post(`/invites/${invite}/accept`).set("Authorization", auth(tokenPL));

      await request(s)
        .post(`/campaigns/${leaveCampaignId}/entities`)
        .set("Authorization", auth(tokenDM))
        .send({ type: "NPC", name: "Ireena", visibility: "PLAYERS" });

      const before = await request(s)
        .get(`/campaigns/${leaveCampaignId}/entities?type=NPC`)
        .set("Authorization", auth(tokenPL));
      expect(before.status).toBe(200);
      expect(before.body.map((e: any) => e.name)).toEqual(["Ireena"]);

      const leave = await request(s)
        .delete(`/campaigns/${leaveCampaignId}/members/${userIdPL}`)
        .set("Authorization", auth(tokenPL));
      expect(leave.status).toBe(200);
      expect(leave.body).toEqual({ removed: true });

      const after = await request(s)
        .get(`/campaigns/${leaveCampaignId}/entities?type=NPC`)
        .set("Authorization", auth(tokenPL));
      expect(after.status).toBe(403);
    });
  });
});
