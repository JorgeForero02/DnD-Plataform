import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

// Tarea 2.5.2 contra Postgres real.
//
// Lo unitario (`encounters.service.spec.ts`) ya prueba el agrupamiento y el paso de turno con un
// Prisma simulado. Esto prueba lo que aquel no puede: que **la base garantiza de verdad** «una
// posición no se repite» y «como mucho un encuentro activo por sesión» (el Prisma simulado no
// valida SQL, convención de `docs/04-convenciones.md`), y que subir de asalto hace caducar una
// condición **de verdad**, atravesando las tres capas.

describe("Iniciativa y orden de turnos (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const emailDM = `dm-enc${Date.now()}@b.com`;
  const emailPL = `pl-enc${Date.now()}@b.com`;
  let tokenDM = "";
  let tokenPL = "";
  let campaignId = "";
  let sessionId = "";
  let pc1Id = "";
  let pc2Id = "";
  let goblinIds: string[] = [];
  let encounterId = "";

  const encUrl = (suffix = "") =>
    `/campaigns/${campaignId}/sessions/${sessionId}/encounters${suffix}`;

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
        .send({ email: emailPL, password: "password123", displayName: "PL" })
    ).body.token;
    campaignId = (
      await request(s)
        .post("/campaigns")
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ name: "Campaña del combate" })
    ).body.id;
    const invite = (
      await request(s)
        .post(`/campaigns/${campaignId}/invites`)
        .set("Authorization", `Bearer ${tokenDM}`)
    ).body.token;
    await request(s).post(`/invites/${invite}/accept`).set("Authorization", `Bearer ${tokenPL}`);
    sessionId = (
      await request(s)
        .post(`/campaigns/${campaignId}/sessions`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ title: "Sesión de combate", visibility: "PLAYERS" })
    ).body.id;

    // Dos personajes del jugador, con una hoja completa: hace falta para que
    // `CharacterSheetService.getInitiativeModifier` pueda derivar (no basta con el nombre).
    for (const [nombre, dex] of [
      ["Thora", 16],
      ["Brann", 12],
    ] as const) {
      const id = (
        await request(s)
          .post(`/campaigns/${campaignId}/characters`)
          .set("Authorization", `Bearer ${tokenPL}`)
          .send({ name: nombre, level: 1 })
      ).body.id;
      await request(s)
        .patch(`/campaigns/${campaignId}/characters/${id}/sheet`)
        .set("Authorization", `Bearer ${tokenPL}`)
        .send({
          abilities: { str: 12, dex, con: 14, int: 8, wis: 10, cha: 8 },
          race: { source: "SRD", key: "human" },
          class: { source: "SRD", key: "fighter" },
          choices: { "fighter-skills": ["athletics", "perception"] },
        });
      if (nombre === "Thora") pc1Id = id;
      else pc2Id = id;
    }

    // Seis goblins idénticos (2D): el grupo del SRD.
    const goblins = await request(s)
      .post(`/campaigns/${campaignId}/npcs`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ ref: "SRD:goblin", count: 6, hp: "AVERAGE" });
    expect(goblins.status).toBe(201);
    goblinIds = goblins.body.map((g: { id: string }) => g.id);
    expect(goblinIds).toHaveLength(6);
  });

  afterAll(async () => {
    if (campaignId) await prisma.campaign.deleteMany({ where: { id: campaignId } });
    await prisma.user.deleteMany({ where: { email: { in: [emailDM, emailPL] } } });
    await app.close();
  });

  it("un jugador no puede empezar un encuentro (403)", async () => {
    const r = await request(app.getHttpServer())
      .post(encUrl())
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({ characterIds: [pc1Id, pc2Id, ...goblinIds] });
    expect(r.status).toBe(403);
  });

  it("dos personajes y seis goblins: OCHO combatientes, y las posiciones no se repiten", async () => {
    const r = await request(app.getHttpServer())
      .post(encUrl())
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ characterIds: [pc1Id, pc2Id, ...goblinIds] });
    expect(r.status).toBe(201);
    encounterId = r.body.id;
    expect(r.body.status).toBe("ACTIVE");
    expect(r.body.round).toBe(1);
    expect(r.body.combatants).toHaveLength(8);

    const posiciones = r.body.combatants.map((c: { position: number }) => c.position);
    expect(new Set(posiciones).size).toBe(8); // ninguna se repite

    // Los seis goblins comparten UNA tirada (se tira en grupo, SRD) y por tanto la misma
    // iniciativa, y quedan en posiciones consecutivas porque el orden es estable.
    const goblinCombatants = r.body.combatants.filter((c: { characterId: string }) =>
      goblinIds.includes(c.characterId),
    );
    expect(goblinCombatants).toHaveLength(6);
    const iniciativas = new Set(goblinCombatants.map((c: { initiative: number }) => c.initiative));
    expect(iniciativas.size).toBe(1);
    const posicionesGoblin = goblinCombatants
      .map((c: { position: number }) => c.position)
      .sort((a: number, b: number) => a - b);
    for (let i = 1; i < posicionesGoblin.length; i++) {
      expect(posicionesGoblin[i]).toBe(posicionesGoblin[i - 1] + 1);
    }
  });

  it("y queda escrito en la línea de tiempo, visible para el jugador", async () => {
    const log = await request(app.getHttpServer())
      .get(`/campaigns/${campaignId}/events`)
      .set("Authorization", `Bearer ${tokenPL}`);
    const suceso = log.body.events.find((e: { type: string }) => e.type === "ENCOUNTER_STARTED");
    expect(suceso).toBeDefined();
    expect(suceso.payload).toMatchObject({ encounterId, combatantCount: 8 });
  });

  it("**la base, no el servicio, impide un segundo encuentro activo en la misma sesión**", async () => {
    // Se salta el servicio a propósito: es la única forma de comprobar que la garantía es de
    // Postgres (índice único parcial) y no solo la comprobación previa del servicio, que el
    // Prisma simulado de las unitarias no puede validar.
    await expect(
      prisma.encounter.create({ data: { sessionId, status: "ACTIVE" } }),
    ).rejects.toThrow();
  });

  it("y el servicio también lo rechaza, con un 409 legible", async () => {
    const r = await request(app.getHttpServer())
      .post(encUrl())
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ characterIds: [pc1Id] });
    expect(r.status).toBe(409);
  });

  it("**la base impide dos combatientes en la misma posición del mismo encuentro**", async () => {
    const combatientes = await prisma.combatant.findMany({ where: { encounterId } });
    await expect(
      prisma.combatant.create({
        data: {
          encounterId,
          characterId: pc1Id,
          initiative: 1,
          position: combatientes[0].position,
        },
      }),
    ).rejects.toThrow();
  });

  it("el DM corrige un número de iniciativa; el orden (la posición) no se toca", async () => {
    const combatiente = (
      await request(app.getHttpServer())
        .get(encUrl(`/${encounterId}`))
        .set("Authorization", `Bearer ${tokenDM}`)
    ).body.combatants.find((c: { characterId: string }) => c.characterId === pc1Id);

    const r = await request(app.getHttpServer())
      .patch(encUrl(`/${encounterId}/combatants/${combatiente.id}`))
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ initiative: 99 });
    expect(r.status).toBe(200);
    expect(r.body.initiative).toBe(99);
    expect(r.body.position).toBe(combatiente.position);
  });

  it("un jugador ve la lista de combate, pero NO los goblins que el DM no ha revelado", async () => {
    const r = await request(app.getHttpServer())
      .get(encUrl(`/${encounterId}`))
      .set("Authorization", `Bearer ${tokenPL}`);
    expect(r.status).toBe(200);
    const ids = r.body.combatants.map((c: { characterId: string }) => c.characterId);
    expect(ids.sort()).toEqual([pc1Id, pc2Id].sort());
  });

  it("**pasar de turno recorre el orden y sube de asalto al llegar al final — y avanza el reloj seis segundos**", async () => {
    const s = app.getHttpServer();

    // El reloj de campaña empieza a cero.
    const relojInicial = await request(s)
      .get(`/campaigns/${campaignId}/clock`)
      .set("Authorization", `Bearer ${tokenDM}`);
    expect(relojInicial.body.seconds).toBe(0);

    let ultimo: request.Response | null = null;
    for (let i = 0; i < 8; i++) {
      ultimo = await request(s)
        .post(encUrl(`/${encounterId}/advance-turn`))
        .set("Authorization", `Bearer ${tokenDM}`);
      expect(ultimo.status).toBe(201);
    }
    // Ocho combatientes: al octavo paso se completa la vuelta y sube el asalto.
    expect(ultimo!.body.round).toBe(2);
    expect(ultimo!.body.roundAdvanced).toBe(true);

    // Un asalto son seis segundos (D-2C-1), y es EXACTAMENTE ese contador el que sube.
    const relojTrasVuelta = await request(s)
      .get(`/campaigns/${campaignId}/clock`)
      .set("Authorization", `Bearer ${tokenDM}`);
    expect(relojTrasVuelta.body.seconds).toBe(6);

    const log = await request(s)
      .get(`/campaigns/${campaignId}/events`)
      .set("Authorization", `Bearer ${tokenPL}`);
    expect(
      log.body.events.filter((e: { type: string }) => e.type === "TURN_ADVANCED"),
    ).toHaveLength(8);
    const subida = log.body.events.find((e: { type: string }) => e.type === "ROUND_ADVANCED");
    expect(subida).toBeDefined();
    expect(subida.payload).toMatchObject({ from: 1, to: 2, clockSeconds: 6 });
  });

  it(
    "**y una condición de un asalto, puesta antes de la vuelta, ya está caducada al terminarla — " +
      "sin que nadie la haya tocado**",
    async () => {
      const s = app.getHttpServer();
      // El reloj está a 6 tras la prueba anterior. Se aplica una condición que dura un asalto
      // más (6 segundos): vence exactamente cuando se complete la próxima vuelta.
      await request(s)
        .put(`/campaigns/${campaignId}/characters/${pc1Id}/conditions/poisoned`)
        .set("Authorization", `Bearer ${tokenPL}`)
        .send({ durationSeconds: 6 });

      const antes = await request(s)
        .get(`/campaigns/${campaignId}/characters/${pc1Id}/conditions`)
        .set("Authorization", `Bearer ${tokenPL}`);
      const envenenadoAntes = antes.body.find((c: { key: string }) => c.key === "poisoned");
      expect(envenenadoAntes).toBeDefined();
      expect(envenenadoAntes.expired).toBe(false);

      for (let i = 0; i < 8; i++) {
        await request(s)
          .post(encUrl(`/${encounterId}/advance-turn`))
          .set("Authorization", `Bearer ${tokenDM}`);
      }

      const despues = await request(s)
        .get(`/campaigns/${campaignId}/characters/${pc1Id}/conditions`)
        .set("Authorization", `Bearer ${tokenPL}`);
      const envenenadoDespues = despues.body.find((c: { key: string }) => c.key === "poisoned");
      expect(envenenadoDespues).toBeDefined();
      // **No hay columna `expired`**: sigue siendo una resta contra el reloj (2C.4). Aquí lo
      // importante es que la resta ya la deja del lado de "vencida" — nadie la ha tocado.
      expect(envenenadoDespues.expired).toBe(true);

      const log = await request(s)
        .get(`/campaigns/${campaignId}/events`)
        .set("Authorization", `Bearer ${tokenPL}`);
      const vencida = log.body.events.find(
        (e: { type: string; payload: { key?: string } }) =>
          e.type === "CONDITION_EXPIRED" && e.payload.key === "poisoned",
      );
      expect(vencida).toBeDefined();
    },
  );

  it("un jugador no puede pasar turno (403)", async () => {
    const r = await request(app.getHttpServer())
      .post(encUrl(`/${encounterId}/advance-turn`))
      .set("Authorization", `Bearer ${tokenPL}`);
    expect(r.status).toBe(403);
  });
});
