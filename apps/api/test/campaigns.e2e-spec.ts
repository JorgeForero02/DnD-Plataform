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

  // Migración 6 (D-CF-16, tickets I4/M2B-5) — la variante de sobrecarga (SRD 5.1, Variant:
  // Encumbrance), interruptor por campaña, apagado por defecto.
  describe("PATCH /campaigns/:id — encumbranceVariant (migración 6)", () => {
    it("por defecto viaja apagada", async () => {
      const server = app.getHttpServer();
      const res = await request(server)
        .get(`/campaigns/${campaignId}`)
        .set("Authorization", `Bearer ${tokenA}`);
      expect(res.status).toBe(200);
      expect(res.body.encumbranceVariant).toBe(false);
    });

    it("un jugador (tokenC, ya miembro) no puede encenderla: 403", async () => {
      const server = app.getHttpServer();
      const res = await request(server)
        .patch(`/campaigns/${campaignId}`)
        .set("Authorization", `Bearer ${tokenC}`)
        .send({ encumbranceVariant: true });
      expect(res.status).toBe(403);
    });

    it("el DM la enciende: 200, y un GET posterior la lee en true", async () => {
      const server = app.getHttpServer();
      const res = await request(server)
        .patch(`/campaigns/${campaignId}`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ encumbranceVariant: true });
      expect(res.status).toBe(200);
      expect(res.body.encumbranceVariant).toBe(true);

      const read = await request(server)
        .get(`/campaigns/${campaignId}`)
        .set("Authorization", `Bearer ${tokenA}`);
      expect(read.status).toBe(200);
      expect(read.body.encumbranceVariant).toBe(true);

      // Se deja tal como estaba (apagada) para no afectar a las pruebas que corren después.
      await request(server)
        .patch(`/campaigns/${campaignId}`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ encumbranceVariant: false });
    });

    // MEDIA-2, fix round 1 — `createCampaignSchema` acepta `encumbranceVariant`, y hasta este
    // arreglo `CampaignsService.create()` la tiraba en silencio: un `POST` con `true` respondía
    // `false`, un contrato que miente.
    it("POST /campaigns con encumbranceVariant: true la escribe, no la tira", async () => {
      const server = app.getHttpServer();
      const res = await request(server)
        .post("/campaigns")
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ name: "Con la variante ya encendida", encumbranceVariant: true });
      expect(res.status).toBe(201);
      expect(res.body.encumbranceVariant).toBe(true);

      const read = await request(server)
        .get(`/campaigns/${res.body.id}`)
        .set("Authorization", `Bearer ${tokenA}`);
      expect(read.body.encumbranceVariant).toBe(true);

      await prisma.campaign.deleteMany({ where: { id: res.body.id } });
    });

    // Revisión de fichas, IMPORTANT #2: mismo defecto que MEDIA-2 pero con `boardRoomUrl` —
    // `createCampaignSchema` la acepta y el servicio la tiraba en silencio.
    it("POST /campaigns con boardRoomUrl válida la escribe, no la tira", async () => {
      const server = app.getHttpServer();
      const res = await request(server)
        .post("/campaigns")
        .set("Authorization", `Bearer ${tokenA}`)
        .send({
          name: "Con la sala ya puesta",
          boardRoomUrl: "https://tablero.supportive.pro/game/desde-el-alta",
        });
      expect(res.status).toBe(201);
      expect(res.body.boardRoomUrl).toBe("https://tablero.supportive.pro/game/desde-el-alta");

      const read = await request(server)
        .get(`/campaigns/${res.body.id}`)
        .set("Authorization", `Bearer ${tokenA}`);
      expect(read.body.boardRoomUrl).toBe("https://tablero.supportive.pro/game/desde-el-alta");

      await prisma.campaign.deleteMany({ where: { id: res.body.id } });
    });
  });

  // Pulido 2026-09-12, C1 bis (spec del tablero § 2 ter): la partida de PlanarAlly que la mesa
  // enmarca. Mismo endpoint que el nombre y la sobrecarga (`PATCH /campaigns/:id`); tokenA es el
  // DM, tokenC un jugador ya miembro de esta misma campaña (aceptó una invitación más arriba).
  describe("PATCH /campaigns/:id — boardRoomUrl (pulido, C1 bis)", () => {
    it("el DM guarda la partida del tablero y la ve al leer la campaña; un jugador no puede", async () => {
      const server = app.getHttpServer();
      const patch = await request(server)
        .patch(`/campaigns/${campaignId}`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ boardRoomUrl: "https://tablero.supportive.pro/game/abc" });
      expect(patch.status).toBe(200);

      const read = await request(server)
        .get(`/campaigns/${campaignId}`)
        .set("Authorization", `Bearer ${tokenA}`);
      expect(read.status).toBe(200);
      expect(read.body.boardRoomUrl).toBe("https://tablero.supportive.pro/game/abc");

      const asPlayer = await request(server)
        .patch(`/campaigns/${campaignId}`)
        .set("Authorization", `Bearer ${tokenC}`)
        .send({ boardRoomUrl: "https://x.example" });
      expect(asPlayer.status).toBe(403);
    });

    it("rechaza una URL que no sea http(s) y acepta null para quitarla", async () => {
      const server = app.getHttpServer();
      const rejected = await request(server)
        .patch(`/campaigns/${campaignId}`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ boardRoomUrl: "javascript:alert(1)" });
      expect(rejected.status).toBe(400);

      const cleared = await request(server)
        .patch(`/campaigns/${campaignId}`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ boardRoomUrl: null });
      expect(cleared.status).toBe(200);

      const read = await request(server)
        .get(`/campaigns/${campaignId}`)
        .set("Authorization", `Bearer ${tokenA}`);
      expect(read.status).toBe(200);
      expect(read.body.boardRoomUrl).toBeNull();
    });
  });

  // Reglas de la mesa (D-CF-53, 2026-09-13). tokenA es el DM, tokenC un jugador ya miembro de
  // esta misma campaña (aceptó una invitación más arriba).
  describe("PATCH /campaigns/:id — reglas de la mesa (D-CF-53)", () => {
    it("reglas de la mesa: el jugador no puede cambiarlas (403), el DM sí, y GET las devuelve con defaults rellenos", async () => {
      const s = app.getHttpServer();
      const comoJugador = await request(s)
        .patch(`/campaigns/${campaignId}`)
        .set("Authorization", `Bearer ${tokenC}`)
        .send({ tableRules: { nivelInicial: 3 } });
      expect(comoJugador.status).toBe(403);

      const comoDM = await request(s)
        .patch(`/campaigns/${campaignId}`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({
          tableRules: {
            abilities: { metodo: "DADOS", expresion: "3d6", intentos: 2 },
            nivelInicial: 3,
          },
        });
      expect(comoDM.status).toBe(200);
      expect(comoDM.body.tableRules.abilities).toEqual({
        metodo: "DADOS",
        expresion: "3d6",
        intentos: 2,
        asignacionLibre: true,
      });
      expect(comoDM.body.tableRules.pgNivelesSiguientes).toBe("MEDIA");

      const leida = await request(s)
        .get(`/campaigns/${campaignId}`)
        .set("Authorization", `Bearer ${tokenC}`);
      expect(leida.body.tableRules.nivelInicial).toBe(3);
    });

    it("reglas de la mesa: una expresión que el evaluador no acepta es 400 con su código", async () => {
      const s = app.getHttpServer();
      const r = await request(s)
        .patch(`/campaigns/${campaignId}`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ tableRules: { abilities: { metodo: "DADOS", expresion: "4d" } } });
      expect(r.status).toBe(400);
      expect(r.body.code).toBe("SINTAXIS");
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

  describe("el listado dice cuánto mundo hay dentro, contado con canView (U4)", () => {
    let mesaId = "";
    let tokenJugador = "";
    let userIdJugador = "";
    const emailJ = `pl-count${Date.now()}${Math.floor(Math.random() * 1e6)}@b.com`;

    beforeAll(async () => {
      const s = app.getHttpServer();
      const regJugador = await request(s)
        .post("/auth/register")
        .send({ email: emailJ, password: "password123", displayName: "Jugadora" });
      tokenJugador = regJugador.body.token;
      userIdJugador = regJugador.body.user.id;
      // Sin registrar un sexto usuario: `AUTH_RATE_LIMIT` es 5/minuto y este fichero ya registra
      // cinco (dmA, plB, plC, la jugadora de «dónde se quedó» y esta) — un sexto `POST
      // /auth/register` se lanzaría contra el límite y el fallo se leería como un test roto, no
      // como lo que sería: el mismo aviso que `rate-limit.constants.ts` deja escrito para
      // `auth.e2e-spec.ts`. `tokenB` (emailB) ya existe desde el principio del fichero y no se
      // ha unido a ninguna campaña que sobreviva hasta aquí: sirve de sobra como «jugador sin
      // concesión».
      mesaId = (
        await request(s)
          .post("/campaigns")
          .set("Authorization", `Bearer ${tokenA}`)
          .send({ name: "La mesa que se cuenta" })
      ).body.id;
      const invite = (
        await request(s)
          .post(`/campaigns/${mesaId}/invites`)
          .set("Authorization", `Bearer ${tokenA}`)
      ).body.token;
      await request(s)
        .post(`/invites/${invite}/accept`)
        .set("Authorization", `Bearer ${tokenJugador}`);
      const invite2 = (
        await request(s)
          .post(`/campaigns/${mesaId}/invites`)
          .set("Authorization", `Bearer ${tokenA}`)
      ).body.token;
      await request(s).post(`/invites/${invite2}/accept`).set("Authorization", `Bearer ${tokenB}`);

      // Cuatro fichas: dos que cualquier jugador ve, una DM_ONLY que nadie más ve, y una
      // SPECIFIC_PLAYERS que solo ve quien está en la lista de concesión (la jugadora, no el
      // jugador sin concesión) — el caso que la ficha U4 no cubría todavía.
      await request(s)
        .post(`/campaigns/${mesaId}/entities`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ type: "LOCATION", name: "Barovia", visibility: "PLAYERS" });
      await request(s)
        .post(`/campaigns/${mesaId}/entities`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ type: "LOCATION", name: "Vallaki", visibility: "PUBLIC" });
      await request(s)
        .post(`/campaigns/${mesaId}/entities`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ type: "NPC", name: "Strahd", visibility: "DM_ONLY" });
      await request(s)
        .post(`/campaigns/${mesaId}/entities`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({
          type: "NPC",
          name: "Un secreto de Ireena",
          visibility: "SPECIFIC_PLAYERS",
          specificPlayerIds: [userIdJugador],
        });
    });

    afterAll(async () => {
      if (mesaId) await prisma.campaign.deleteMany({ where: { id: mesaId } });
      await prisma.user.deleteMany({ where: { email: emailJ } });
    });

    const laMesaDeConteo = async (token: string) => {
      const r = await request(app.getHttpServer())
        .get("/campaigns")
        .set("Authorization", `Bearer ${token}`);
      expect(r.status).toBe(200);
      return (r.body as Record<string, unknown>[]).find((c) => c.id === mesaId)!;
    };

    it("el DM cuenta las cuatro fichas", async () => {
      const campana = await laMesaDeConteo(tokenA);
      expect(campana.entityCount).toBe(4);
    });

    it("la jugadora con concesión cuenta tres: PLAYERS + PUBLIC + su SPECIFIC_PLAYERS, la DM_ONLY no se le suma", async () => {
      const campana = await laMesaDeConteo(tokenJugador);
      expect(campana.entityCount).toBe(3);
    });

    it("el jugador SIN concesión (tokenB) cuenta dos: la SPECIFIC_PLAYERS ajena tampoco se le suma", async () => {
      const campana = await laMesaDeConteo(tokenB);
      expect(campana.entityCount).toBe(2);
    });
  });
});
