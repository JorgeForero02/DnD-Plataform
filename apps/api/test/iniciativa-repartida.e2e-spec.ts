import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

// Tarea 2 (2026-09-05) contra Postgres real.
//
// **Por qué esto no es la unitaria.** `encounters.service.spec.ts` usa un Prisma simulado
// (`apps/api/src/encounters/encounters.service.spec.ts:13-21`) que no tiene fila real de
// `RollRequest` que leer: las cuatro pruebas del brief de la tarea 2 comprueban que `start()`
// **escribe filas** —una petición por ajeno, un combatiente en 0 sin tirar—, así que van aquí.
//
// Cada escenario usa **su propia sesión**: un encuentro `PREPARING` no se puede terminar con
// `end()` (exige `ACTIVE`), así que reutilizar sesión entre pruebas dejaría el índice único
// parcial de la base bloqueando el siguiente `start()` con un 409 que no es lo que se prueba.
describe("start() reparte por dueño: pide a quien no es el DM, tira por los suyos", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const emailDM = `dm-rep${Date.now()}@b.com`;
  const emailPL = `pl-rep${Date.now()}@b.com`;
  let tokenDM = "";
  let tokenPL = "";
  let campaignId = "";
  let pjId = "";
  let segundoPjId = "";
  let goblinId = "";
  let banditoId = "";
  let pnjCedidoId = "";
  let pjSinHojaId = "";

  const s = () => app.getHttpServer();

  async function nuevaSesion(titulo: string): Promise<string> {
    const r = await request(s())
      .post(`/campaigns/${campaignId}/sessions`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ title: titulo, visibility: "PLAYERS" });
    return r.body.id as string;
  }

  async function nuevoPersonajeDelJugador(nombre: string, dex: number): Promise<string> {
    const id = (
      await request(s())
        .post(`/campaigns/${campaignId}/characters`)
        .set("Authorization", `Bearer ${tokenPL}`)
        .send({ name: nombre, level: 1 })
    ).body.id;
    await request(s())
      .patch(`/campaigns/${campaignId}/characters/${id}/sheet`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({
        abilities: { str: 12, dex, con: 14, int: 8, wis: 10, cha: 8 },
        race: { source: "SRD", key: "human" },
        class: { source: "SRD", key: "fighter" },
        choices: { "fighter-skills": ["athletics", "perception"] },
      });
    return id;
  }

  async function nuevoPnjDelDm(ref: string): Promise<string> {
    const r = await request(s())
      .post(`/campaigns/${campaignId}/npcs`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ ref, count: 1, hp: "AVERAGE" });
    expect(r.status).toBe(201);
    return r.body[0].id as string;
  }

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
    tokenPL = (
      await request(s())
        .post("/auth/register")
        .send({ email: emailPL, password: "password123", displayName: "PL" })
    ).body.token;
    campaignId = (
      await request(s())
        .post("/campaigns")
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ name: "Campaña del reparto" })
    ).body.id;
    const invite = (
      await request(s())
        .post(`/campaigns/${campaignId}/invites`)
        .set("Authorization", `Bearer ${tokenDM}`)
    ).body.token;
    await request(s()).post(`/invites/${invite}/accept`).set("Authorization", `Bearer ${tokenPL}`);

    pjId = await nuevoPersonajeDelJugador("Thora", 16);
    segundoPjId = await nuevoPersonajeDelJugador("Brann", 12);
    goblinId = await nuevoPnjDelDm("SRD:goblin");
    banditoId = await nuevoPnjDelDm("SRD:bandit");

    // Un PNJ con el mismo statblock que el goblin, pero **cedido**: su dueño pasa a ser la
    // jugadora. No hay endpoint que ceda un PNJ todavía (es de otra tarea); se hace directo por
    // Prisma, que es legítimo para preparar el estado de un e2e cuando la API no lo expone aún.
    const pnjCedido = await nuevoPnjDelDm("SRD:goblin");
    await prisma.character.update({
      where: { id: pnjCedido },
      data: { ownerId: (await prisma.user.findUnique({ where: { email: emailPL } }))!.id },
    });
    pnjCedidoId = pnjCedido;

    // Un personaje del jugador **sin hoja completa** — nace del `POST` de arriba con solo
    // nombre y nivel, sin el `PATCH .../sheet` que le da características, raza y clase.
    pjSinHojaId = (
      await request(s())
        .post(`/campaigns/${campaignId}/characters`)
        .set("Authorization", `Bearer ${tokenPL}`)
        .send({ name: "Sin hoja", level: 1 })
    ).body.id;
  });

  afterAll(async () => {
    if (campaignId) await prisma.campaign.deleteMany({ where: { id: campaignId } });
    await prisma.user.deleteMany({ where: { email: { in: [emailDM, emailPL] } } });
    await app.close();
  });

  it("le pide la iniciativa a quien NO es el DM, y tira por los del DM", async () => {
    const sessionId = await nuevaSesion("Reparto 1");
    const r = await request(s())
      .post(`/campaigns/${campaignId}/sessions/${sessionId}/encounters`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ characterIds: [pjId, goblinId] });
    expect(r.status).toBe(201);
    expect(r.body.status).toBe("PREPARING");

    const peticiones = await prisma.rollRequest.findMany({
      where: { encounterId: r.body.id },
    });
    expect(peticiones).toHaveLength(1);
    expect(peticiones[0].characterId).toBe(pjId);
    expect(peticiones[0].key).toBe("initiative");

    const goblin = await prisma.combatant.findFirst({
      where: { encounterId: r.body.id, characterId: goblinId },
    });
    expect(goblin!.initiative).toBeGreaterThan(0);

    // Y el pjId, que sigue sin tirar, entra en 0 — no un número inventado.
    const pj = await prisma.combatant.findFirst({
      where: { encounterId: r.body.id, characterId: pjId },
    });
    expect(pj!.initiative).toBe(0);

    // M-7 de la ronda de arreglo 1: un encuentro que nace `PREPARING` **no** escribe
    // `ENCOUNTER_STARTED` — todavía no ha empezado, está esperando esta misma petición. Quien
    // lo suba a `ACTIVE` lo escribirá (hoy, el puente de la tarea 3 que no existe; mañana, esa
    // tarea de verdad), y escribirlo aquí también lo duplicaría en la línea de tiempo.
    const sucesos = await prisma.gameEvent.findMany({
      where: { subjectId: r.body.id, type: "ENCOUNTER_STARTED" },
    });
    expect(sucesos).toHaveLength(0);
  });

  it("un PNJ cedido a un jugador también recibe petición", async () => {
    const sessionId = await nuevaSesion("Reparto 2");
    const r = await request(s())
      .post(`/campaigns/${campaignId}/sessions/${sessionId}/encounters`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ characterIds: [pnjCedidoId] });
    expect(r.status).toBe(201);
    expect(r.body.status).toBe("PREPARING");

    const peticiones = await prisma.rollRequest.findMany({
      where: { encounterId: r.body.id },
    });
    expect(peticiones.map((p) => p.characterId)).toEqual([pnjCedidoId]);
  });

  it("un PNJ del OTRO DM es «suyo»: se tira por él y no se le pide iniciativa (ficha P2 · dos DM)", async () => {
    // Hasta el 2026-09-10 el reparto comparaba `ownerId` con quien pulsó el botón, así que con
    // dos DM el PNJ del otro caía en `ajenos` y recibía una petición que no tiene por qué: el
    // otro DM no es un jugador esperando su turno, es el otro árbitro. La ficha decía «no hay
    // forma de tener dos DM»; el plan 11 la dio (`PATCH /members/:userId`), y aquí se usa.
    const emailDM2 = `dm2-rep${Date.now()}@b.com`;
    const tokenDM2 = (
      await request(s())
        .post("/auth/register")
        .send({ email: emailDM2, password: "password123", displayName: "DM2" })
    ).body.token;
    const dm2Id = (await prisma.user.findUnique({ where: { email: emailDM2 } }))!.id;
    const invite = (
      await request(s())
        .post(`/campaigns/${campaignId}/invites`)
        .set("Authorization", `Bearer ${tokenDM}`)
    ).body.token;
    await request(s()).post(`/invites/${invite}/accept`).set("Authorization", `Bearer ${tokenDM2}`);
    const ascenso = await request(s())
      .patch(`/campaigns/${campaignId}/members/${dm2Id}`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ role: "DM" });
    expect(ascenso.status).toBe(200);
    const pnjDelOtroDm = (
      await request(s())
        .post(`/campaigns/${campaignId}/npcs`)
        .set("Authorization", `Bearer ${tokenDM2}`)
        .send({ ref: "SRD:bandit", count: 1, hp: "AVERAGE" })
    ).body[0].id as string;

    const sessionId = await nuevaSesion("Reparto con dos DM");
    const r = await request(s())
      .post(`/campaigns/${campaignId}/sessions/${sessionId}/encounters`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ characterIds: [goblinId, pnjDelOtroDm] });
    expect(r.status).toBe(201);
    // Nadie a quien pedir: los dos son de un DM, así que nace ACTIVE con las iniciativas puestas.
    expect(r.body.status).toBe("ACTIVE");
    const peticiones = await prisma.rollRequest.findMany({ where: { encounterId: r.body.id } });
    expect(peticiones).toEqual([]);
    const combatientes = await prisma.combatant.findMany({ where: { encounterId: r.body.id } });
    expect(combatientes.map((c) => c.initiative)).not.toContain(0);
    await prisma.user.deleteMany({ where: { email: emailDM2 } });
  });

  it("empieza ACTIVE directo si el DM combate solo contra los suyos", async () => {
    const sessionId = await nuevaSesion("Reparto 3");
    const r = await request(s())
      .post(`/campaigns/${campaignId}/sessions/${sessionId}/encounters`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ characterIds: [goblinId, banditoId] });
    expect(r.status).toBe(201);
    expect(r.body.status).toBe("ACTIVE");

    const peticiones = await prisma.rollRequest.findMany({
      where: { encounterId: r.body.id },
    });
    expect(peticiones).toHaveLength(0);

    // Y aquí SÍ, porque nace `ACTIVE`: el otro lado del mismo M-7.
    const sucesos = await prisma.gameEvent.findMany({
      where: { subjectId: r.body.id, type: "ENCOUNTER_STARTED" },
    });
    expect(sucesos).toHaveLength(1);
  });

  it("un jugador con dos personajes recibe dos peticiones", async () => {
    const sessionId = await nuevaSesion("Reparto 4");
    const r = await request(s())
      .post(`/campaigns/${campaignId}/sessions/${sessionId}/encounters`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ characterIds: [pjId, segundoPjId] });
    expect(r.status).toBe(201);
    expect(r.body.status).toBe("PREPARING");

    const peticiones = await prisma.rollRequest.findMany({
      where: { encounterId: r.body.id },
    });
    expect(peticiones).toHaveLength(2);
  });

  // El guardián de `start()` daba un 409 legible mirando solo `ACTIVE`; la tarea 1 recontó el
  // índice único parcial de la base a `IN ('ACTIVE','PREPARING')` y el guardián se quedó corto —
  // dejaba abrir un segundo encuentro mientras el primero seguía `PREPARING` esperando peticiones.
  it("un encuentro PREPARING también cuenta como activo para el 409 legible", async () => {
    const sessionId = await nuevaSesion("Reparto 5 (guardián)");
    const primero = await request(s())
      .post(`/campaigns/${campaignId}/sessions/${sessionId}/encounters`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ characterIds: [pjId, goblinId] });
    expect(primero.body.status).toBe("PREPARING");

    const segundo = await request(s())
      .post(`/campaigns/${campaignId}/sessions/${sessionId}/encounters`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ characterIds: [segundoPjId] });
    expect(segundo.status).toBe(409);
  });

  // I-2 de la ronda de arreglo 1 (2026-09-05). Antes de esta tarea, una hoja que no deriva daba
  // un 400 al intentar tirar por ella. Con el reparto por dueño, a un `ajeno` no se le tira —se
  // le pide—, así que sin esta validación el 400 solo llegaba al RESPONDER su petición
  // (`RollRequestsService.modificadorDeLaHoja`), y para entonces el encuentro ya existía,
  // `PREPARING`, sin ninguna forma de resolverse: la petición no se cierra nunca y el combate se
  // queda atascado. `start()` tiene que rechazar ANTES de crear nada.
  it("un ajeno con la hoja incompleta da 400 al empezar, no un PREPARING atascado", async () => {
    const sessionId = await nuevaSesion("Reparto 6 (hoja incompleta)");
    const r = await request(s())
      .post(`/campaigns/${campaignId}/sessions/${sessionId}/encounters`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ characterIds: [pjSinHojaId, goblinId] });
    expect(r.status).toBe(400);

    // Y no dejó nada a medias: ni encuentro, ni petición, ni combatiente.
    const encuentros = await prisma.encounter.findMany({ where: { sessionId } });
    expect(encuentros).toHaveLength(0);
    const peticiones = await prisma.rollRequest.findMany({
      where: { characterId: pjSinHojaId },
    });
    expect(peticiones).toHaveLength(0);
  });
});
