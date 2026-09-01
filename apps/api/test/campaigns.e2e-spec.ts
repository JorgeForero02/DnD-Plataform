import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

describe("Campaigns (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  // Date.now() alone (ms resolution) collides when two Jest workers start in the same
  // millisecond. See docs/06-pendientes.md (arreglo 5, tarea 1.15-fix).
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1e6)}`;
  const emailA = `dmA${suffix}@b.com`;
  const emailB = `plB${suffix}@b.com`;
  const emailC = `plC${suffix}@b.com`;
  let tokenA = "";
  let tokenB = "";
  let tokenC = "";
  let userIdC = "";
  let campaignId = "";
  let campaignId2 = "";

  beforeAll(async () => {
    const ref = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = ref.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    prisma = app.get(PrismaService);
    const server = app.getHttpServer();
    const regA = await request(server)
      .post("/auth/register")
      .send({ email: emailA, password: "password123", displayName: "DM" });
    tokenA = regA.body.token;
    const regB = await request(server)
      .post("/auth/register")
      .send({ email: emailB, password: "password123", displayName: "Player" });
    tokenB = regB.body.token;
    const regC = await request(server)
      .post("/auth/register")
      .send({ email: emailC, password: "password123", displayName: "Player C" });
    tokenC = regC.body.token;
    userIdC = regC.body.user.id;
  });

  afterAll(async () => {
    if (campaignId) await prisma.campaign.deleteMany({ where: { id: campaignId } });
    if (campaignId2) await prisma.campaign.deleteMany({ where: { id: campaignId2 } });
    await prisma.user.deleteMany({ where: { email: { in: [emailA, emailB, emailC] } } });
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
    const res = await request(server)
      .get(`/campaigns/${campaignId}`)
      .set("Authorization", `Bearer ${tokenB}`);
    expect(res.status).toBe(403);
  });

  it("the owner can read the campaign (200)", async () => {
    const server = app.getHttpServer();
    const res = await request(server)
      .get(`/campaigns/${campaignId}`)
      .set("Authorization", `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Curse of Strahd");
  });

  describe("PATCH /campaigns/:id", () => {
    it("as the DM: 200, and a later GET returns the new name", async () => {
      const server = app.getHttpServer();
      const res = await request(server)
        .patch(`/campaigns/${campaignId}`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ name: "Curse of Strahd (revised)" });
      expect(res.status).toBe(200);

      const read = await request(server)
        .get(`/campaigns/${campaignId}`)
        .set("Authorization", `Bearer ${tokenA}`);
      expect(read.status).toBe(200);
      expect(read.body.name).toBe("Curse of Strahd (revised)");
    });

    it("as a member player: 403", async () => {
      const server = app.getHttpServer();
      const invite = (
        await request(server)
          .post(`/campaigns/${campaignId}/invites`)
          .set("Authorization", `Bearer ${tokenA}`)
      ).body.token;
      const acceptRes = await request(server)
        .post(`/invites/${invite}/accept`)
        .set("Authorization", `Bearer ${tokenC}`);
      // Asserted, not just fired-and-forgotten: without this, a regressed accept (e.g. a
      // 400) would silently leave C a non-member, and this test would still pass with the
      // exact same 403 as "a non-member" below — proving nothing about membership at all.
      expect(acceptRes.status).toBe(201);

      const res = await request(server)
        .patch(`/campaigns/${campaignId}`)
        .set("Authorization", `Bearer ${tokenC}`)
        .send({ name: "Hijacked" });
      expect(res.status).toBe(403);
      // A member-but-not-DM 403 ("DM role required") is a genuinely different case from a
      // non-member 403 ("Not a member of this campaign") below — pinning the message is what
      // makes the two tests distinguishable instead of duplicates of the same assertion.
      expect(res.body.message).toBe("DM role required");
    });

    it("as a non-member: 403", async () => {
      const server = app.getHttpServer();
      const res = await request(server)
        .patch(`/campaigns/${campaignId}`)
        .set("Authorization", `Bearer ${tokenB}`)
        .send({ name: "Hijacked" });
      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Not a member of this campaign");
    });
  });

  describe("DELETE /campaigns/:id", () => {
    it("as a player: 403", async () => {
      // tokenC's membership (not DM) was established and asserted (201 on accept) in the
      // PATCH describe block above; this campaign is still alive at this point in the file.
      const server = app.getHttpServer();
      const res = await request(server)
        .delete(`/campaigns/${campaignId}`)
        .set("Authorization", `Bearer ${tokenC}`);
      expect(res.status).toBe(403);
      expect(res.body.message).toBe("DM role required");
    });

    it("as the DM: 200, and a later GET returns 403", async () => {
      const server = app.getHttpServer();
      const res = await request(server)
        .delete(`/campaigns/${campaignId}`)
        .set("Authorization", `Bearer ${tokenA}`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ deleted: true });

      const read = await request(server)
        .get(`/campaigns/${campaignId}`)
        .set("Authorization", `Bearer ${tokenA}`);
      expect(read.status).toBe(403); // no longer a member: the campaign is gone
      campaignId = ""; // already deleted, nothing left for afterAll to clean up
    });
  });

  describe("DELETE /campaigns/:id cascades to every table hanging off it", () => {
    it("deletes entities, links, comments, grants, sessions, characters and invites", async () => {
      const server = app.getHttpServer();
      const auth = (token: string) => `Bearer ${token}`;

      const created = await request(server)
        .post("/campaigns")
        .set("Authorization", auth(tokenA))
        .send({ name: "Cascade campaign" });
      campaignId2 = created.body.id;

      const invite = (
        await request(server)
          .post(`/campaigns/${campaignId2}/invites`)
          .set("Authorization", auth(tokenA))
      ).body.token;
      const acceptRes = await request(server)
        .post(`/invites/${invite}/accept`)
        .set("Authorization", auth(tokenC));
      expect(acceptRes.status).toBe(201);
      const playerId = userIdC;

      const entity1 = (
        await request(server)
          .post(`/campaigns/${campaignId2}/entities`)
          .set("Authorization", auth(tokenA))
          .send({
            type: "NPC",
            name: "Strahd",
            visibility: "SPECIFIC_PLAYERS",
            specificPlayerIds: [playerId],
          })
      ).body;
      const entity2 = (
        await request(server)
          .post(`/campaigns/${campaignId2}/entities`)
          .set("Authorization", auth(tokenA))
          .send({ type: "LOCATION", name: "Barovia", visibility: "PLAYERS" })
      ).body;

      const linkRes = await request(server)
        .post(`/entities/${entity1.id}/links`)
        .set("Authorization", auth(tokenA))
        .send({ toId: entity2.id, label: "lives in" });
      expect(linkRes.status).toBe(201);

      const commentRes = await request(server)
        .post(`/entities/${entity2.id}/comments`)
        .set("Authorization", auth(tokenA))
        .send({ body: "Watch out for wolves" });
      expect(commentRes.status).toBe(201);

      const sessionRes = await request(server)
        .post(`/campaigns/${campaignId2}/sessions`)
        .set("Authorization", auth(tokenA))
        .send({ title: "Session 1", visibility: "PLAYERS" });
      expect(sessionRes.status).toBe(201);

      const characterRes = await request(server)
        .post(`/campaigns/${campaignId2}/characters`)
        .set("Authorization", auth(tokenC))
        .send({ name: "Ireena", visibility: "PLAYERS" });
      expect(characterRes.status).toBe(201);

      const secondInviteRes = await request(server)
        .post(`/campaigns/${campaignId2}/invites`)
        .set("Authorization", auth(tokenA));
      expect(secondInviteRes.status).toBe(201);

      // Sanity check: everything is actually there before deleting.
      expect(await prisma.entity.count({ where: { campaignId: campaignId2 } })).toBe(2);
      expect(await prisma.entityLink.count({ where: { from: { campaignId: campaignId2 } } })).toBe(
        1,
      );
      expect(await prisma.comment.count({ where: { entity: { campaignId: campaignId2 } } })).toBe(
        1,
      );
      expect(
        await prisma.entityVisibilityGrant.count({
          where: { entity: { campaignId: campaignId2 } },
        }),
      ).toBe(1);
      expect(await prisma.session.count({ where: { campaignId: campaignId2 } })).toBe(1);
      expect(await prisma.character.count({ where: { campaignId: campaignId2 } })).toBe(1);
      expect(await prisma.invite.count({ where: { campaignId: campaignId2 } })).toBe(2);
      expect(await prisma.campaignMember.count({ where: { campaignId: campaignId2 } })).toBe(2);

      const del = await request(server)
        .delete(`/campaigns/${campaignId2}`)
        .set("Authorization", auth(tokenA));
      expect(del.status).toBe(200);

      expect(await prisma.entity.count({ where: { campaignId: campaignId2 } })).toBe(0);
      expect(await prisma.entityLink.count({ where: { from: { campaignId: campaignId2 } } })).toBe(
        0,
      );
      expect(await prisma.comment.count({ where: { entity: { campaignId: campaignId2 } } })).toBe(
        0,
      );
      expect(
        await prisma.entityVisibilityGrant.count({
          where: { entity: { campaignId: campaignId2 } },
        }),
      ).toBe(0);
      expect(await prisma.session.count({ where: { campaignId: campaignId2 } })).toBe(0);
      expect(await prisma.character.count({ where: { campaignId: campaignId2 } })).toBe(0);
      expect(await prisma.invite.count({ where: { campaignId: campaignId2 } })).toBe(0);
      expect(await prisma.campaignMember.count({ where: { campaignId: campaignId2 } })).toBe(0);
      campaignId2 = ""; // already deleted, nothing left for afterAll to clean up
    });
  });
});
