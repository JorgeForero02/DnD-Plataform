import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

// Tarea 2.5.4, contra Postgres real — el daño aplicado desde la tirada, con su traza.
//
// **Lo que solo puede vivir aquí.** Las unitarias (`character-sheet.service.spec.ts`) ya cubren
// la aritmética y el cableado con Prisma simulado; esto comprueba la cadena HTTP → guardia →
// pipe → servicio → base sobre un `GameEvent` y un `RollRequest` reales: que `rollEventId`
// sobrevive el viaje de ida y vuelta por la columna `Json`, que un identificador inventado se
// rechaza contra la base de verdad (un mock nunca lo haría — siempre "existe" lo que el test le
// diga), y que la petición de salvación de concentración aparece donde la pantalla del jugador
// la sondea de verdad: `GET /campaigns/:id/roll-requests`.

describe("El daño, con su traza (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const emailDM = `dm-dmg2${Date.now()}@b.com`;
  const emailPL = `pl-dmg2${Date.now()}@b.com`;
  let tokenDM = "";
  let tokenPL = "";
  let campaignId = "";
  let tumularioId = "";

  const auth = (t: string) => `Bearer ${t}`;
  const npcs = () => `/campaigns/${campaignId}/npcs`;
  const ficha = (id: string) => `/campaigns/${campaignId}/characters/${id}`;
  const eventos = () => `/campaigns/${campaignId}/events`;
  const rolls = () => `/campaigns/${campaignId}/rolls`;
  const rollRequests = () => `/campaigns/${campaignId}/roll-requests`;
  const condiciones = (id: string, key: string) => `${ficha(id)}/conditions/${key}`;

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
        .set("Authorization", auth(tokenDM))
        .send({ name: "El cadáver que concentraba" })
    ).body.id;
    const invite = (
      await request(s).post(`/campaigns/${campaignId}/invites`).set("Authorization", auth(tokenDM))
    ).body.token;
    await request(s).post(`/invites/${invite}/accept`).set("Authorization", auth(tokenPL));

    const npc = await request(s)
      .post(npcs())
      .set("Authorization", auth(tokenDM))
      .send({ ref: "SRD:wight" });
    tumularioId = npc.body[0].id;
  });

  afterAll(async () => {
    if (campaignId) await prisma.campaign.delete({ where: { id: campaignId } }).catch(() => {});
    await prisma.user.deleteMany({ where: { email: { in: [emailDM, emailPL] } } }).catch(() => {});
    await app.close();
  });

  it("el suceso del registro dice de qué tirada salió el daño, y sobrevive el viaje por la base", async () => {
    const s = app.getHttpServer();
    // Una tirada de daño real, con su propio eventId — el mismo patrón que usaría la DAMAGE de
    // `rollAttack`.
    const tirada = await request(s)
      .post(rolls())
      .set("Authorization", auth(tokenDM))
      .send({ expression: "2d8+3", label: "Daño de mandoble" });
    expect(tirada.status).toBe(201);
    const rollEventId = tirada.body.eventId;
    expect(rollEventId).toBeTruthy();

    const golpe = await request(s)
      .post(`${ficha(tumularioId)}/hp`)
      .set("Authorization", auth(tokenDM))
      .send({ delta: -10, damageType: "BLUDGEONING", rollEventId });
    expect(golpe.status).toBe(201);

    const log = await request(s).get(eventos()).set("Authorization", auth(tokenDM));
    const hpChanged = log.body.events.find(
      (e: { subjectId: string; payload: { type: string } }) =>
        e.subjectId === tumularioId && e.payload.type === "HP_CHANGED",
    );
    expect(hpChanged).toBeDefined();
    expect(hpChanged.payload.rollEventId).toBe(rollEventId);
  });

  it("un rollEventId que no existe en esta campaña es 400, no una causa inventada", async () => {
    const r = await request(app.getHttpServer())
      .post(`${ficha(tumularioId)}/hp`)
      .set("Authorization", auth(tokenDM))
      .send({ delta: -3, rollEventId: "clx000000000000000000009" });
    expect(r.status).toBe(400);
  });

  it("un personaje concentrado que recibe daño real hace que el sistema PIDA una salvación de Constitución, con CD 10 o la mitad del daño", async () => {
    const s = app.getHttpServer();
    // Un jugador con su propio personaje, concentrándose — el ejemplo que trae el propio spec.
    const jugador = await request(s)
      .post(`/campaigns/${campaignId}/characters`)
      .set("Authorization", auth(tokenPL))
      // **Nivel 8, y el nivel es lo que hace alcanzable este caso.** A nivel 1 una guerrera con
      // Constitución 14 tiene 12 PG máximos, así que los 25 de daño del ejemplo del spec la
      // matan de golpe —sobrante ≥ máximos: muerte masiva— y la salvación no se pide nunca. El
      // ejemplo de cierre del propio spec («25 de daño … CD 12») era **irrealizable a nivel 1**,
      // y esta prueba se escribió sin ejecutarse. Con 68 PG el golpe la deja viva, que es la
      // situación que la regla describe.
      // E-RM-1: el POST ya no fija el nivel (nace con nivelInicial); se sube con el PATCH.
      .send({ name: "Elara", level: 8, visibility: "PLAYERS" });
    const elaraId = jugador.body.id;
    await request(s)
      .patch(`${ficha(elaraId)}/sheet`)
      .set("Authorization", auth(tokenPL))
      .send({
        level: 8,
        abilities: { str: 10, dex: 12, con: 14, int: 15, wis: 10, cha: 8 },
        race: { source: "SRD", key: "human" },
        class: { source: "SRD", key: "fighter" },
        choices: { "fighter-skills": ["athletics", "perception"] },
      });
    await request(s)
      .put(condiciones(elaraId, "concentrating-on-bless"))
      .set("Authorization", auth(tokenDM))
      .send({ note: "Concentrándose en Bendición" });

    // 25 de daño, sin resistencia: la mitad (12) supera el suelo de 10 — el ejemplo del propio
    // spec ("si estaba concentrado, el sistema pide una salvación con CD 12").
    const golpe = await request(s)
      .post(`${ficha(elaraId)}/hp`)
      .set("Authorization", auth(tokenDM))
      .send({ delta: -25 });
    expect(golpe.status).toBe(201);
    expect(golpe.body.concentrationSave).toBeDefined();
    expect(golpe.body.concentrationSave.dc).toBe(12);

    // Y la pide de VERDAD: donde la pantalla del jugador sondea, no solo en la respuesta HTTP
    // del golpe.
    const pendientes = await request(s).get(rollRequests()).set("Authorization", auth(tokenPL));
    expect(pendientes.status).toBe(200);
    const peticion = pendientes.body.find(
      (p: { characterId: string; key: string }) =>
        p.characterId === elaraId && p.key === "save.con",
    );
    expect(peticion).toBeDefined();
    expect(peticion.dc).toBe(12);
    expect(peticion.resolvedAt).toBeNull();

    // **El sistema no decide si se pierde.** Responderla es tirar, como cualquier petición de
    // 2C.5 — se comprueba que el camino de siempre sigue abierto, no que la tirada salga bien.
    const respuesta = await request(s)
      .post(`${rollRequests()}/${peticion.id}/roll`)
      .set("Authorization", auth(tokenPL));
    expect(respuesta.status).toBe(201);
  });

  it("una salvación por cada fuente de daño: dos golpes concentrados piden dos peticiones, no una", async () => {
    const s = app.getHttpServer();
    const jugador = await request(s)
      .post(`/campaigns/${campaignId}/characters`)
      .set("Authorization", auth(tokenPL))
      .send({ name: "Bram", level: 1, visibility: "PLAYERS" });
    const bramId = jugador.body.id;
    await request(s)
      .patch(`${ficha(bramId)}/sheet`)
      .set("Authorization", auth(tokenPL))
      .send({
        abilities: { str: 10, dex: 12, con: 16, int: 15, wis: 10, cha: 8 },
        race: { source: "SRD", key: "human" },
        class: { source: "SRD", key: "fighter" },
        choices: { "fighter-skills": ["athletics", "perception"] },
      });
    await request(s)
      .put(condiciones(bramId, "concentrating-on-haste"))
      .set("Authorization", auth(tokenDM))
      .send({});

    await request(s)
      .post(`${ficha(bramId)}/hp`)
      .set("Authorization", auth(tokenDM))
      .send({ delta: -6 });
    await request(s)
      .post(`${ficha(bramId)}/hp`)
      .set("Authorization", auth(tokenDM))
      .send({ delta: -6 });

    const pendientes = await request(s)
      .get(`${rollRequests()}?includeResolved=true`)
      .set("Authorization", auth(tokenPL));
    const deBram = pendientes.body.filter(
      (p: { characterId: string; key: string }) => p.characterId === bramId && p.key === "save.con",
    );
    expect(deBram.length).toBe(2);
  });

  it("el DM pone daño a mano citando de quién viene, y el HP_CHANGED lo lleva", async () => {
    const s = app.getHttpServer();
    // Un segundo PNJ, el origen del golpe: el hilo dirá «← Klarg» sin que haya tirada de por
    // medio — el mismo dato que trae `ATTACK_RESOLVED.attackerId`, pero puesto a mano.
    const klarg = await request(s)
      .post(npcs())
      .set("Authorization", auth(tokenDM))
      .send({ ref: "SRD:goblin" });
    const klargId = klarg.body[0].id;

    const golpe = await request(s)
      .post(`${ficha(tumularioId)}/hp`)
      .set("Authorization", auth(tokenDM))
      .send({ delta: -7, damageType: "SLASHING", sourceCharacterId: klargId });
    expect(golpe.status).toBe(201);

    const log = await request(s).get(eventos()).set("Authorization", auth(tokenDM));
    const hp = log.body.events.find(
      (e: { subjectId: string; payload: { type: string } }) =>
        e.subjectId === tumularioId && e.payload.type === "HP_CHANGED",
    );
    expect(hp).toBeDefined();
    expect(hp.payload.sourceCharacterId).toBe(klargId);
  });

  it("un origen que no existe en la campaña es 404, y no se escribe nada", async () => {
    const s = app.getHttpServer();
    const antes = (
      await request(s)
        .get(`${ficha(tumularioId)}/sheet`)
        .set("Authorization", auth(tokenDM))
    ).body.hp.current;

    const r = await request(s)
      .post(`${ficha(tumularioId)}/hp`)
      .set("Authorization", auth(tokenDM))
      .send({ delta: -1, sourceCharacterId: "no-existe" });
    expect(r.status).toBe(404);

    const despues = (
      await request(s)
        .get(`${ficha(tumularioId)}/sheet`)
        .set("Authorization", auth(tokenDM))
    ).body.hp.current;
    expect(despues).toBe(antes);
  });

  it("un jugador que no es dueño ni DM no puede aplicar daño con un rollEventId ajeno", async () => {
    const r = await request(app.getHttpServer())
      .post(`${ficha(tumularioId)}/hp`)
      .set("Authorization", auth(tokenPL))
      .send({ delta: -5, rollEventId: "clx000000000000000000009" });
    expect(r.status).toBe(403);
  });

  it("un enano recibe la MITAD del daño de veneno, y la traza dice por qué", async () => {
    // **Paso 1, tarea 8b.** Los modificadores de daño solo se consultaban si el personaje tenía
    // statblock, y **un PJ nunca lo tiene** (`characters.service.ts` filtra `statblockRef: null`
    // a propósito), así que un enano recibía el veneno entero con la traza convincente al lado.
    //
    // SRD 5.1, Dwarven Resilience: «You have advantage on saving throws against poison, and you
    // have resistance against poison damage.»
    const s = app.getHttpServer();
    const enano = (
      await request(s)
        .post(`/campaigns/${campaignId}/characters`)
        .set("Authorization", auth(tokenPL))
        .send({ name: "Brann", level: 8, visibility: "PLAYERS" })
    ).body.id;
    await request(s)
      .patch(`${ficha(enano)}/sheet`)
      .set("Authorization", auth(tokenPL))
      .send({
        level: 8,
        abilities: { str: 15, dex: 12, con: 14, int: 8, wis: 10, cha: 8 },
        race: { source: "SRD", key: "dwarf" },
        subrace: { source: "SRD", key: "dwarf-hill" },
        class: { source: "SRD", key: "fighter" },
        choices: { "fighter-skills": ["athletics", "perception"] },
      })
      .expect(200);

    const antes = (
      await request(s)
        .get(`${ficha(enano)}/sheet`)
        .set("Authorization", auth(tokenPL))
    ).body.hp.current;

    const veneno = await request(s)
      .post(`${ficha(enano)}/hp`)
      .set("Authorization", auth(tokenDM))
      .send({ delta: -10, damageType: "POISON" });
    expect(veneno.status).toBe(201);

    const despues = (
      await request(s)
        .get(`${ficha(enano)}/sheet`)
        .set("Authorization", auth(tokenPL))
    ).body.hp.current;
    expect(despues).toBe(antes - 5);

    // **Y la traza dice por qué**, con el nombre del rasgo: una resta sin origen es justo lo que
    // esta plataforma existe para no tener.
    expect(JSON.stringify(veneno.body.damageTrace)).toMatch(/resist/i);
    expect(JSON.stringify(veneno.body.damageTrace)).toMatch(/Resistencia enana/);
  });

  it("y el mismo enano recibe entero un daño al que no es resistente", async () => {
    // El contrapunto: sin él, «la mitad» podría estar aplicándose a todo.
    const s = app.getHttpServer();
    const enano = (
      await request(s)
        .post(`/campaigns/${campaignId}/characters`)
        .set("Authorization", auth(tokenPL))
        .send({ name: "Brann II", level: 8, visibility: "PLAYERS" })
    ).body.id;
    await request(s)
      .patch(`${ficha(enano)}/sheet`)
      .set("Authorization", auth(tokenPL))
      .send({
        level: 8,
        abilities: { str: 15, dex: 12, con: 14, int: 8, wis: 10, cha: 8 },
        race: { source: "SRD", key: "dwarf" },
        subrace: { source: "SRD", key: "dwarf-hill" },
        class: { source: "SRD", key: "fighter" },
        choices: { "fighter-skills": ["athletics", "perception"] },
      })
      .expect(200);

    const antes = (
      await request(s)
        .get(`${ficha(enano)}/sheet`)
        .set("Authorization", auth(tokenPL))
    ).body.hp.current;
    await request(s)
      .post(`${ficha(enano)}/hp`)
      .set("Authorization", auth(tokenDM))
      .send({ delta: -10, damageType: "SLASHING" })
      .expect(201);
    const despues = (
      await request(s)
        .get(`${ficha(enano)}/sheet`)
        .set("Authorization", auth(tokenPL))
    ).body.hp.current;
    expect(despues).toBe(antes - 10);
  });
});
