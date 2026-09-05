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
    it("deletes entities, links, comments, grants, sessions, characters, invites, the game log, the world state, the rules, the items, the conditions, the roll requests and the DM tables", async () => {
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

      // --- Ficha A1: las tablas que la prueba NO contaba, y las que 2C anadio despues.
      //
      // Borrar una campana es la operacion mas destructiva del producto, y esta prueba **cuenta
      // filas de verdad** en vez de fiarse del codigo de estado. Cada tabla que cuelga de una
      // campana y no se cuenta aqui es por donde se cuela un huerfano sin que nada avise.
      const characterId = characterRes.body.id;

      // Un suceso en el log: cualquier tirada lo escribe.
      const tirada = await request(server)
        .post(`/campaigns/${campaignId2}/rolls`)
        .set("Authorization", auth(tokenA))
        .send({ expression: "1d20", audience: "PUBLIC" });
      expect(tirada.status).toBe(201);

      // Una marca y un conjunto del mundo.
      const marca = await request(server)
        .put(`/campaigns/${campaignId2}/flags/el-puente-cayo`)
        .set("Authorization", auth(tokenA))
        .send({ key: "el-puente-cayo", value: true });
      expect(marca.status).toBe(200);
      const conjunto = await request(server)
        .post(`/campaigns/${campaignId2}/sets`)
        .set("Authorization", auth(tokenA))
        .send({ key: "los-que-saben", label: "Los que saben" });
      expect(conjunto.status).toBe(201);

      // Una regla del motor.
      const regla = await request(server)
        .post(`/campaigns/${campaignId2}/rules`)
        .set("Authorization", auth(tokenA))
        .send({
          name: "Al caer el puente",
          trigger: { kind: "FLAG_SET", key: "el-puente-cayo", value: true },
          effects: [{ kind: "SET_FLAG", key: "todos-lo-saben", value: true }],
        });
      expect(regla.status).toBe(201);

      // Un objeto propio de la campana.
      const objeto = await request(server)
        .post(`/campaigns/${campaignId2}/items`)
        .set("Authorization", auth(tokenA))
        .send({ name: "Daga del posadero", kind: "OTHER" });
      expect(objeto.status).toBe(201);

      // Una condicion sobre el personaje.
      const condicion = await request(server)
        .put(`/campaigns/${campaignId2}/characters/${characterId}/conditions/prone`)
        .set("Authorization", auth(tokenA))
        .send({});
      expect(condicion.status).toBe(200);

      // Una peticion de tirada y una tabla del DM (2C).
      const peticion = await request(server)
        .post(`/campaigns/${campaignId2}/roll-requests`)
        .set("Authorization", auth(tokenA))
        .send({ characterIds: [characterId], key: "skill.perception", label: "Percepcion" });
      expect(peticion.status).toBe(201);
      const tabla = await request(server)
        .post(`/campaigns/${campaignId2}/tables`)
        .set("Authorization", auth(tokenA))
        .send({ name: "Rumores", entries: [{ min: 1, max: 4, text: "Algo" }] });
      expect(tabla.status).toBe(201);

      // Un statblock propio del DM (2D). La tabla es nueva, y **una tabla nueva que no se cuente
      // aqui es exactamente el hueco que 2C dejo documentado**: un huerfano no avisa, la
      // operacion devuelve 200 igual.
      const statblock = await request(server)
        .post(`/campaigns/${campaignId2}/statblocks`)
        .set("Authorization", auth(tokenA))
        .send({
          name: "Dragoncillo de la cripta",
          size: "MEDIUM",
          type: "DRAGON",
          ac: 16,
          hitDiceCount: 6,
          abilities: { str: 16, dex: 12, con: 14, int: 10, wis: 11, cha: 13 },
          cr: 3,
        });
      expect(statblock.status).toBe(201);

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
      expect(await prisma.gameEvent.count({ where: { campaignId: campaignId2 } })).toBeGreaterThan(
        0,
      );
      expect(await prisma.campaignFlag.count({ where: { campaignId: campaignId2 } })).toBe(1);
      expect(await prisma.campaignSet.count({ where: { campaignId: campaignId2 } })).toBe(1);
      expect(await prisma.rule.count({ where: { campaignId: campaignId2 } })).toBe(1);
      expect(await prisma.campaignItem.count({ where: { campaignId: campaignId2 } })).toBe(1);
      expect(await prisma.characterCondition.count({ where: { characterId } })).toBe(1);
      expect(await prisma.rollRequest.count({ where: { campaignId: campaignId2 } })).toBe(1);
      expect(await prisma.dmTable.count({ where: { campaignId: campaignId2 } })).toBe(1);
      expect(
        await prisma.dmTableEntry.count({ where: { table: { campaignId: campaignId2 } } }),
      ).toBe(1);
      expect(await prisma.campaignStatblock.count({ where: { campaignId: campaignId2 } })).toBe(1);

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
      // Las de la ficha A1 y las de 2C: **cero filas, contadas de verdad**.
      expect(await prisma.gameEvent.count({ where: { campaignId: campaignId2 } })).toBe(0);
      expect(await prisma.campaignFlag.count({ where: { campaignId: campaignId2 } })).toBe(0);
      expect(await prisma.campaignSet.count({ where: { campaignId: campaignId2 } })).toBe(0);
      expect(await prisma.rule.count({ where: { campaignId: campaignId2 } })).toBe(0);
      expect(await prisma.campaignItem.count({ where: { campaignId: campaignId2 } })).toBe(0);
      expect(await prisma.characterCondition.count({ where: { characterId } })).toBe(0);
      expect(await prisma.rollRequest.count({ where: { campaignId: campaignId2 } })).toBe(0);
      expect(await prisma.dmTable.count({ where: { campaignId: campaignId2 } })).toBe(0);
      expect(
        await prisma.dmTableEntry.count({ where: { table: { campaignId: campaignId2 } } }),
      ).toBe(0);
      expect(await prisma.campaignStatblock.count({ where: { campaignId: campaignId2 } })).toBe(0);
      campaignId2 = ""; // already deleted, nothing left for afterAll to clean up
    });
  });

  describe("«dónde se quedó» viaja en el listado (D-OP-17)", () => {
    let mesaId = "";
    let tokenJugador = "";
    const emailJ = `pl-dnd${Date.now()}@b.com`;

    beforeAll(async () => {
      const s = app.getHttpServer();
      tokenJugador = (
        await request(s)
          .post("/auth/register")
          .send({ email: emailJ, password: "password123", displayName: "Jugador" })
      ).body.token;
      mesaId = (
        await request(s)
          .post("/campaigns")
          .set("Authorization", `Bearer ${tokenA}`)
          .send({ name: "La mesa de la crónica" })
      ).body.id;
      const invite = (
        await request(s)
          .post(`/campaigns/${mesaId}/invites`)
          .set("Authorization", `Bearer ${tokenA}`)
      ).body.token;
      await request(s)
        .post(`/invites/${invite}/accept`)
        .set("Authorization", `Bearer ${tokenJugador}`);
    });

    afterAll(async () => {
      if (mesaId) await prisma.campaign.deleteMany({ where: { id: mesaId } });
      await prisma.user.deleteMany({ where: { email: emailJ } });
    });

    const laMesa = async (token: string) => {
      const r = await request(app.getHttpServer())
        .get("/campaigns")
        .set("Authorization", `Bearer ${token}`);
      expect(r.status).toBe(200);
      return (r.body as Record<string, unknown>[]).find((c) => c.id === mesaId)!;
    };

    const cerrarSesionCon = async (titulo: string, recap: string, visibilidad: string) => {
      const s = app.getHttpServer();
      const sesion = (
        await request(s)
          .post(`/campaigns/${mesaId}/sessions`)
          .set("Authorization", `Bearer ${tokenA}`)
          .send({ title: titulo, visibility: "PLAYERS" })
      ).body.id;
      await request(s)
        .post(`/campaigns/${mesaId}/sessions/${sesion}/start`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({});
      const cerrado = await request(s)
        .post(`/campaigns/${mesaId}/sessions/${sesion}/close`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ recap, recapVisibility: visibilidad });
      expect(cerrado.status).toBe(201);
    };

    it("**sin ninguna sesión cerrada, la campaña sale bien y sin el campo** — el caso que se olvida", async () => {
      const campana = await laMesa(tokenJugador);
      expect(campana.name).toBe("La mesa de la crónica");
      expect("lastRecap" in campana).toBe(false);
    });

    it("cerrada una sesión con crónica PLAYERS, el jugador la lee en el listado", async () => {
      await cerrarSesionCon("La noche del puerto", "Huyeron del puerto", "PLAYERS");
      const campana = (await laMesa(tokenJugador)) as { lastRecap?: Record<string, unknown> };
      expect(campana.lastRecap).toMatchObject({
        text: "Huyeron del puerto",
        sessionTitle: "La noche del puerto",
      });
    });

    it("**y si la última crónica es DM_ONLY, al jugador NO le viaja nada** — ni la anterior", async () => {
      // No se busca una crónica más vieja a propósito: enseñarla bajo el rótulo «dónde se quedó»
      // diría que la partida se quedó donde no se quedó.
      await cerrarSesionCon("Preparación", "Lo que el DM se guarda", "DM_ONLY");
      const delJugador = await laMesa(tokenJugador);
      expect("lastRecap" in delJugador).toBe(false);
      // El DM sí la ve, que es la prueba de que la fila existe y lo que falla es el filtro.
      const delDm = (await laMesa(tokenA)) as { lastRecap?: Record<string, unknown> };
      expect(delDm.lastRecap).toMatchObject({ text: "Lo que el DM se guarda" });
    });
  });
});
