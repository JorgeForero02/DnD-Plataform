import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

// Plan 09, fichas I19 y I20 — **la batuta, contra Postgres.**
//
// *«El DM lee el diálogo en voz alta, pulsa, y pasa lo que tenía que pasar.»*
//
// `DM_EXECUTED` estaba en el vocabulario del motor **desde el principio** y no existía el gesto en
// ninguna pantalla, así que nadie escribía el suceso: estaba retirado de la oferta. Lo que este
// fichero demuestra es **el camino entero** —crear la regla en frío, pulsar, y ver el efecto—, que
// es lo único que prueba que el cable está conectado de punta a punta.
//
// Y de paso `CHARACTER_ATTACKED` (I20), que es el disparador que `ENTITY_ATTACKED` prometía y no
// podía cumplir: se atacan criaturas, no fichas del mundo.

describe("La batuta (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const emailDM = `dm-batuta${Date.now()}@b.com`;
  const emailPL = `pl-batuta${Date.now()}@b.com`;
  let tokenDM = "";
  let tokenPL = "";
  let campaignId = "";
  let laCripta = "";
  let elSecreto = "";

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
        .send({ name: "Campaña de la batuta" })
    ).body.id;
    const invite = (
      await request(s)
        .post(`/campaigns/${campaignId}/invites`)
        .set("Authorization", `Bearer ${tokenDM}`)
    ).body.token;
    await request(s).post(`/invites/${invite}/accept`).set("Authorization", `Bearer ${tokenPL}`);

    laCripta = (
      await request(s)
        .post(`/campaigns/${campaignId}/entities`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ type: "LOCATION", name: "La cripta", visibility: "PLAYERS" })
    ).body.id;
    elSecreto = (
      await request(s)
        .post(`/campaigns/${campaignId}/entities`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ type: "LOCATION", name: "El pasadizo", visibility: "DM_ONLY" })
    ).body.id;
  });

  afterAll(async () => {
    if (campaignId) await prisma.campaign.deleteMany({ where: { id: campaignId } });
    await prisma.user.deleteMany({ where: { email: { in: [emailDM, emailPL] } } });
    await app.close();
  });

  it("**ejecutar es solo del DM**: un jugador recibe 403", async () => {
    // Esconder el botón no es control de acceso; esto es el control.
    await request(app.getHttpServer())
      .post(`/campaigns/${campaignId}/entities/${laCripta}/execute`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({})
      .expect(403);
  });

  it("una ficha de otra campaña es 404, no 403", async () => {
    const s = app.getHttpServer();
    const otra = (
      await request(s)
        .post("/campaigns")
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ name: "Otra mesa" })
    ).body.id;
    const ajena = (
      await request(s)
        .post(`/campaigns/${otra}/entities`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ type: "LOCATION", name: "Ajena", visibility: "PLAYERS" })
    ).body.id;
    await request(s)
      .post(`/campaigns/${campaignId}/entities/${ajena}/execute`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({})
      .expect(404);
    await prisma.campaign.deleteMany({ where: { id: otra } });
  });

  it("**el camino entero: se ata en frío, se pulsa, y el efecto ocurre**", async () => {
    const s = app.getHttpServer();

    // 1. El DM prepara: «cuando yo ejecute La cripta, revela El pasadizo». Esto se hace ANTES de
    //    la sesión, que es la razón de ser de la ficha: el motor deja de ser solo reactivo.
    const regla = await request(s)
      .post(`/campaigns/${campaignId}/rules`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({
        name: "Al leer la inscripción, se abre el pasadizo",
        trigger: { kind: "DM_EXECUTED", entityId: laCripta },
        effects: [{ kind: "REVEAL_ENTITY", entityId: elSecreto, visibility: "PLAYERS" }],
      });
    expect(regla.status).toBe(201);

    // El jugador todavía no ve el pasadizo.
    const antes = await request(s)
      .get(`/campaigns/${campaignId}/entities?type=LOCATION`)
      .set("Authorization", `Bearer ${tokenPL}`);
    expect((antes.body as { id: string }[]).some((e) => e.id === elSecreto)).toBe(false);

    // 2. En la mesa, el DM solo pulsa.
    const ejecutado = await request(s)
      .post(`/campaigns/${campaignId}/entities/${laCripta}/execute`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({});
    expect(ejecutado.status).toBe(201);

    // 3. Y pasa lo que tenía que pasar. **Esta es la prueba entera**: sin el `case` del motor, el
    //    suceso se escribiría igual y aquí no cambiaría nada.
    const despues = await request(s)
      .get(`/campaigns/${campaignId}/entities?type=LOCATION`)
      .set("Authorization", `Bearer ${tokenPL}`);
    expect((despues.body as { id: string }[]).some((e) => e.id === elSecreto)).toBe(true);
  });

  it("**ejecutar NO edita la ficha**: sigue igual que estaba", async () => {
    // Es la mitad que hace honesto al gesto: ejecutar ocurre, no escribe.
    const ficha = await request(app.getHttpServer())
      .get(`/campaigns/${campaignId}/entities/${laCripta}`)
      .set("Authorization", `Bearer ${tokenDM}`);
    expect(ficha.body).toMatchObject({ name: "La cripta", visibility: "PLAYERS" });
  });

  it("**el suceso es DM_ONLY**: el jugador no ve ni que se ejecutó ni el nombre de la ficha", async () => {
    const s = app.getHttpServer();
    const delDm = await request(s)
      .get(`/campaigns/${campaignId}/events`)
      .set("Authorization", `Bearer ${tokenDM}`);
    const suyo = (delDm.body.events as { type: string; payload: Record<string, unknown> }[]).find(
      (e) => e.type === "DM_EXECUTED",
    );
    // Con `entityId` en el PAYLOAD, no en el sujeto: es un gesto de dirección, no algo que le pase
    // a la ficha.
    expect(suyo?.payload).toMatchObject({ entityId: laCripta, entityName: "La cripta" });

    const delJugador = await request(s)
      .get(`/campaigns/${campaignId}/events`)
      .set("Authorization", `Bearer ${tokenPL}`);
    expect(
      (delJugador.body.events as { type: string }[]).some((e) => e.type === "DM_EXECUTED"),
    ).toBe(false);
  });

  it("I20 — **`CHARACTER_ATTACKED` se dispara con un ataque resuelto**", async () => {
    const s = app.getHttpServer();

    // Un atacante con hoja y espada, y un objetivo al que golpear.
    const atacante = (
      await request(s)
        .post(`/campaigns/${campaignId}/characters`)
        .set("Authorization", `Bearer ${tokenPL}`)
        .send({ name: "Thorin", level: 1, visibility: "PLAYERS" })
    ).body.id;
    await request(s)
      .patch(`/campaigns/${campaignId}/characters/${atacante}/sheet`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({
        abilities: { str: 15, dex: 12, con: 14, int: 8, wis: 10, cha: 8 },
        race: { source: "SRD", key: "dwarf" },
        class: { source: "SRD", key: "fighter" },
        choices: { "fighter-skills": ["athletics", "perception"] },
      });
    await request(s)
      .post(`/campaigns/${campaignId}/characters/${atacante}/inventory`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({ ref: { source: "SRD", key: "long-sword" }, location: "EQUIPPED", slot: "MAIN_HAND" });
    const objetivo = (
      await request(s)
        .post(`/campaigns/${campaignId}/characters`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ name: "El centinela", level: 1, visibility: "PLAYERS" })
    ).body.id;
    await request(s)
      .patch(`/campaigns/${campaignId}/characters/${objetivo}/sheet`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({
        abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
        race: { source: "SRD", key: "human" },
        class: { source: "SRD", key: "fighter" },
      });

    // La regla: «cuando ataquen al centinela, levanta una marca».
    await request(s)
      .post(`/campaigns/${campaignId}/rules`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({
        name: "Si atacan al centinela, suena la alarma",
        trigger: { kind: "CHARACTER_ATTACKED", characterId: objetivo },
        effects: [{ kind: "SET_FLAG", key: "alarma", value: true }],
      })
      .expect(201);

    const hoja = await request(s)
      .get(`/campaigns/${campaignId}/characters/${atacante}/sheet`)
      .set("Authorization", `Bearer ${tokenPL}`);
    const clave = (hoja.body.attacks as { key: string }[])[0].key;

    await request(s)
      .post(
        `/campaigns/${campaignId}/characters/${atacante}/sheet/attacks/${encodeURIComponent(clave)}/resolve`,
      )
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({ targetCharacterId: objetivo, mode: "NORMAL" })
      .expect(201);

    // **No hace falta un suceso nuevo**: `ATTACK_RESOLVED` ya se escribía desde 2.5.3, y su sujeto
    // es el objetivo. Lo único que faltaba era leerlo.
    const marcas = await request(s)
      .get(`/campaigns/${campaignId}/flags`)
      .set("Authorization", `Bearer ${tokenDM}`);
    expect(JSON.stringify(marcas.body)).toContain("alarma");
  });
});
