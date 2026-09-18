import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

// Tarea 1 del plan 3A.3 («la barra de acciones», T21) — `GET …/actions` contra Postgres real.
// **Se escribe, no se corre**: lo corre el orquestador, uno a la vez (docs/08-pruebas.md).
//
// Un mago de nivel 3 (mismo personaje que `lanzar-conjuros.e2e-spec.ts`) con `magic-missile`
// PREPARADO, y un goblin revelado a la mesa. El combate SÍ hace falta aquí (a diferencia de
// `lanzar-conjuros.e2e-spec.ts`): la barra depende de la economía del turno, que solo existe
// dentro de un encuentro `ACTIVE`.

describe("La barra de acciones — GET …/actions (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const emailDM = `dm-acc${Date.now()}@b.com`;
  const emailMago = `mago-acc${Date.now()}@b.com`;
  const emailAjeno = `ajeno-acc${Date.now()}@b.com`;
  let tokenDM = "";
  let tokenMago = "";
  let tokenAjeno = "";
  let campaignId = "";
  let sessionId = "";
  let magoId = "";
  let goblinId = "";
  let encounterId = "";

  const auth = (t: string) => `Bearer ${t}`;
  const s = () => app.getHttpServer();
  const actionsUrl = () => `/campaigns/${campaignId}/characters/${magoId}/actions`;
  const encUrl = (suffix = "") =>
    `/campaigns/${campaignId}/sessions/${sessionId}/encounters${suffix}`;

  beforeAll(async () => {
    const ref = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = ref.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    prisma = app.get(PrismaService);

    tokenDM = (
      await request(s())
        .post("/auth/register")
        .send({ email: emailDM, password: "password123", displayName: "DM" })
    ).body.token;
    tokenMago = (
      await request(s())
        .post("/auth/register")
        .send({ email: emailMago, password: "password123", displayName: "Mago" })
    ).body.token;
    tokenAjeno = (
      await request(s())
        .post("/auth/register")
        .send({ email: emailAjeno, password: "password123", displayName: "Ajeno" })
    ).body.token;

    campaignId = (
      await request(s())
        .post("/campaigns")
        .set("Authorization", auth(tokenDM))
        .send({ name: "Campaña de la barra de acciones" })
    ).body.id;
    const invite = (
      await request(s())
        .post(`/campaigns/${campaignId}/invites`)
        .set("Authorization", auth(tokenDM))
    ).body.token;
    await request(s()).post(`/invites/${invite}/accept`).set("Authorization", auth(tokenMago));
    const inviteAjeno = (
      await request(s())
        .post(`/campaigns/${campaignId}/invites`)
        .set("Authorization", auth(tokenDM))
    ).body.token;
    await request(s())
      .post(`/invites/${inviteAjeno}/accept`)
      .set("Authorization", auth(tokenAjeno));

    magoId = (
      await request(s())
        .post(`/campaigns/${campaignId}/characters`)
        .set("Authorization", auth(tokenMago))
        .send({ name: "Elminster", level: 3 })
    ).body.id;
    await request(s())
      .patch(`/campaigns/${campaignId}/characters/${magoId}/sheet`)
      .set("Authorization", auth(tokenDM))
      .send({
        level: 3,
        abilities: { str: 8, dex: 12, con: 14, int: 16, wis: 10, cha: 10 },
        race: { source: "SRD", key: "human" },
        class: { source: "SRD", key: "wizard" },
        choices: { "wizard-skills": ["arcana", "investigation"] },
      });
    const magicMissile = await request(s())
      .put(`/campaigns/${campaignId}/characters/${magoId}/spellbook/magic-missile`)
      .set("Authorization", auth(tokenMago))
      .send({ estado: "PREPARADO" });
    expect(magicMissile.status).toBe(200);

    const goblins = await request(s())
      .post(`/campaigns/${campaignId}/npcs`)
      .set("Authorization", auth(tokenDM))
      .send({ ref: "SRD:goblin", count: 1, hp: "AVERAGE" });
    goblinId = goblins.body[0].id;
    await request(s())
      .patch(`/campaigns/${campaignId}/characters/${goblinId}`)
      .set("Authorization", auth(tokenDM))
      .send({ visibility: "PLAYERS" });

    sessionId = (
      await request(s())
        .post(`/campaigns/${campaignId}/sessions`)
        .set("Authorization", auth(tokenDM))
        .send({ title: "La sala de guerra", visibility: "PLAYERS" })
    ).body.id;

    // El mago es ajeno al DM: el encuentro nace `PREPARING` y `force-start` lo pasa a `ACTIVE`
    // sin esperar la iniciativa de nadie — el mismo patrón que `furia.e2e-spec.ts`.
    const encuentro = await request(s())
      .post(encUrl())
      .set("Authorization", auth(tokenDM))
      .send({ characterIds: [magoId, goblinId] });
    encounterId = encuentro.body.id;
    await request(s())
      .post(encUrl(`/${encounterId}/force-start`))
      .set("Authorization", auth(tokenDM));

    // El orden de posiciones lo decide la iniciativa (aquí, ninguna tirada real: `force-start`
    // no espera a nadie), así que no se asume quién sale primero — se avanza el turno hasta que
    // le toque al mago, para que el resto del fichero empiece en un estado conocido.
    for (let vueltas = 0; vueltas < 3; vueltas += 1) {
      const enc = await request(s())
        .get(encUrl(`/${encounterId}`))
        .set("Authorization", auth(tokenDM));
      const combatiente = enc.body.combatants.find(
        (c: { characterId: string; position: number }) => c.characterId === magoId,
      );
      if (combatiente.position === enc.body.activePosition) break;
      await request(s())
        .post(encUrl(`/${encounterId}/advance-turn`))
        .set("Authorization", auth(tokenDM));
    }
  });

  afterAll(async () => {
    if (campaignId) await prisma.campaign.deleteMany({ where: { id: campaignId } });
    await prisma.user.deleteMany({ where: { email: { in: [emailDM, emailMago, emailAjeno] } } });
    await app.close();
  });

  it("un jugador ajeno (ni dueño ni DM del mago): 403", async () => {
    const r = await request(s()).get(actionsUrl()).set("Authorization", auth(tokenAjeno));
    expect(r.status).toBe(403);
  });

  it("200, con los cinco grupos y magic-missile disponible en combate, en su turno", async () => {
    const r = await request(s()).get(actionsUrl()).set("Authorization", auth(tokenMago));
    expect(r.status).toBe(200);
    expect(r.body.characterId).toBe(magoId);
    expect(r.body.enCombate).toBe(true);
    expect(r.body.esMiTurno).toBe(true);
    expect(r.body.economia).toEqual({
      actionUsed: false,
      bonusUsed: false,
      reactionUsed: false,
      movementUsed: 0,
    });
    expect(Object.keys(r.body.grupos).sort()).toEqual(
      ["APTITUDES", "ATAQUES", "BASICAS", "CONJUROS", "OBJETOS"].sort(),
    );
    expect(r.body.grupos.BASICAS).toHaveLength(8);
    expect(r.body.grupos.BASICAS.map((a: { key: string }) => a.key)).toContain("basic:dodge");

    const mm = r.body.grupos.CONJUROS.find((a: { key: string }) => a.key === "spell:magic-missile");
    expect(mm).toBeDefined();
    expect(mm.disponible).toBe(true);
    expect(mm.motivos).toEqual([]);
  });

  it("tras usar magic-missile: la siguiente GET marca ACCION_GASTADA", async () => {
    const usar = await request(s())
      .post(`/campaigns/${campaignId}/characters/${magoId}/activities/spell:magic-missile/use`)
      .set("Authorization", auth(tokenMago))
      .send({ objetivos: [goblinId] });
    expect(usar.status).toBe(201);

    const r = await request(s()).get(actionsUrl()).set("Authorization", auth(tokenMago));
    expect(r.status).toBe(200);
    expect(r.body.esMiTurno).toBe(true); // sigue siendo su turno: solo gastó la acción
    expect(r.body.economia.actionUsed).toBe(true);
    const mm = r.body.grupos.CONJUROS.find((a: { key: string }) => a.key === "spell:magic-missile");
    expect(mm.disponible).toBe(false);
    expect(mm.motivos).toEqual(["ACCION_GASTADA"]);
  });

  it("el DM avanza el turno: la GET del mago marca NO_ES_TU_TURNO", async () => {
    const avanzar = await request(s())
      .post(encUrl(`/${encounterId}/advance-turn`))
      .set("Authorization", auth(tokenDM));
    expect(avanzar.status).toBe(201);

    const r = await request(s()).get(actionsUrl()).set("Authorization", auth(tokenMago));
    expect(r.status).toBe(200);
    expect(r.body.esMiTurno).toBe(false);
    const mm = r.body.grupos.CONJUROS.find((a: { key: string }) => a.key === "spell:magic-missile");
    expect(mm.motivos).toContain("NO_ES_TU_TURNO");
    const dodge = r.body.grupos.BASICAS.find((a: { key: string }) => a.key === "basic:dodge");
    expect(dodge.motivos).toContain("NO_ES_TU_TURNO");
  });
});
