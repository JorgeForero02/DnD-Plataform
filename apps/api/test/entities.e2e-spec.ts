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

  // Ficha P1 de docs/06-pendientes.md — hasta ahora el único sitio que emitía ENTITY_REVEALED
  // era el motor de reglas; un DM que sube a mano la visibilidad de una ficha no dejaba rastro,
  // y la cabecera de escena de la mesa (que lee este suceso) nunca se encendía sola.
  it("subir la visibilidad de una ficha a mano emite ENTITY_REVEALED y el jugador lo ve en su línea de tiempo", async () => {
    const s = app.getHttpServer();
    const created = await request(s)
      .post(`/campaigns/${campaignId}/entities`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ type: "LOCATION", name: "El Puerto Viejo", visibility: "DM_ONLY" });
    expect(created.status).toBe(201);
    const entityId = created.body.id;

    const raised = await request(s)
      .patch(`/campaigns/${campaignId}/entities/${entityId}`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ visibility: "PLAYERS" });
    expect(raised.status).toBe(200);

    const plEvents = await request(s)
      .get(`/campaigns/${campaignId}/events`)
      .set("Authorization", `Bearer ${tokenPL}`);
    expect(plEvents.status).toBe(200);
    const revealed = plEvents.body.events.find(
      (e: any) => e.type === "ENTITY_REVEALED" && e.subjectId === entityId,
    );
    expect(revealed).toBeDefined();
    expect(revealed.payload).toEqual({ type: "ENTITY_REVEALED", entityName: "El Puerto Viejo" });
  });

  it("bajar la visibilidad NO emite ENTITY_REVEALED", async () => {
    const s = app.getHttpServer();
    const created = await request(s)
      .post(`/campaigns/${campaignId}/entities`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ type: "LOCATION", name: "La Torre Caída", visibility: "PLAYERS" });
    const entityId = created.body.id;

    const lowered = await request(s)
      .patch(`/campaigns/${campaignId}/entities/${entityId}`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ visibility: "DM_ONLY" });
    expect(lowered.status).toBe(200);

    const dmEvents = await request(s)
      .get(`/campaigns/${campaignId}/events`)
      .set("Authorization", `Bearer ${tokenDM}`);
    const revealed = dmEvents.body.events.find(
      (e: any) => e.type === "ENTITY_REVEALED" && e.subjectId === entityId,
    );
    expect(revealed).toBeUndefined();
  });

  it("un jugador que no puede ver la ficha tampoco ve el suceso de su revelación", async () => {
    const s = app.getHttpServer();
    const created = await request(s)
      .post(`/campaigns/${campaignId}/entities`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ type: "LOCATION", name: "Secreto de otro jugador", visibility: "DM_ONLY" });
    const entityId = created.body.id;

    // Sube a OWNER_DM: solo la ve el DM y su creador, no el jugador de la prueba.
    const raised = await request(s)
      .patch(`/campaigns/${campaignId}/entities/${entityId}`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ visibility: "OWNER_DM" });
    expect(raised.status).toBe(200);

    const plEvents = await request(s)
      .get(`/campaigns/${campaignId}/events`)
      .set("Authorization", `Bearer ${tokenPL}`);
    const revealed = plEvents.body.events.find(
      (e: any) => e.type === "ENTITY_REVEALED" && e.subjectId === entityId,
    );
    expect(revealed).toBeUndefined();
  });

  it("**un suceso SPECIFIC_PLAYERS llega al jugador NOMBRADO, y a nadie más** (D-OP-12)", async () => {
    // Hasta el 2026-09-05 esto era imposible: `GameEventsService` evaluaba `canView` con
    // `grantedUserIds: []` siempre, así que un suceso `SPECIFIC_PLAYERS` no lo veía nadie salvo el
    // DM — ni siquiera el jugador al que se le acababa de conceder la ficha. `entities.service.ts`
    // lo sabía y guardaba `DM_ONLY` en su lugar. Ese parche está retirado.
    const s = app.getHttpServer();
    const tercero = await request(s)
      .post("/auth/register")
      .send({ email: `pl3-ent${Date.now()}@b.com`, password: "password123", displayName: "PL3" });
    const tokenPL3 = tercero.body.token;
    const invite = (
      await request(s)
        .post(`/campaigns/${campaignId}/invites`)
        .set("Authorization", `Bearer ${tokenDM}`)
    ).body.token;
    await request(s).post(`/invites/${invite}/accept`).set("Authorization", `Bearer ${tokenPL3}`);

    const created = await request(s)
      .post(`/campaigns/${campaignId}/entities`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ type: "NPC", name: "El confidente", visibility: "DM_ONLY" });
    const entityId = created.body.id;

    // Se concede **solo al primer jugador**. El tercero está en la campaña y no está nombrado.
    const raised = await request(s)
      .patch(`/campaigns/${campaignId}/entities/${entityId}`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ visibility: "SPECIFIC_PLAYERS", specificPlayerIds: [playerId] });
    expect(raised.status).toBe(200);

    // **La fila se guarda con su visibilidad de verdad**, no con el `DM_ONLY` del parche.
    const fila = await prisma.gameEvent.findFirst({
      where: { subjectId: entityId, type: "ENTITY_REVEALED" },
    });
    expect(fila?.visibility).toBe("SPECIFIC_PLAYERS");
    expect(fila?.grantedUserIds).toEqual([playerId]);

    const buscar = async (token: string) => {
      const r = await request(s)
        .get(`/campaigns/${campaignId}/events`)
        .set("Authorization", `Bearer ${token}`);
      return (r.body.events as { type: string; subjectId: string }[]).find(
        (e) => e.type === "ENTITY_REVEALED" && e.subjectId === entityId,
      );
    };

    // El nombrado sí. El de al lado, no. Y el DM siempre.
    expect(await buscar(tokenPL)).toBeDefined();
    expect(await buscar(tokenPL3)).toBeUndefined();
    expect(await buscar(tokenDM)).toBeDefined();
  });

  it("**reclasificar una ficha deja rastro en el registro** (I16)", async () => {
    // El registro es la auditoría de esta aplicación: un cambio de naturaleza que no aparece en él
    // no se puede deshacer, porque nadie sabe que pasó.
    const s = app.getHttpServer();
    const creada = await request(s)
      .post(`/campaigns/${campaignId}/entities`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ type: "NPC", name: "Maestre Kellan", visibility: "PLAYERS" });
    expect(creada.status).toBe(201);

    const cambiada = await request(s)
      .patch(`/campaigns/${campaignId}/entities/${creada.body.id}`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ type: "DOCUMENT" });
    expect(cambiada.status).toBe(200);

    const log = await request(s)
      .get(`/campaigns/${campaignId}/events`)
      .set("Authorization", `Bearer ${tokenPL}`);
    const suceso = (
      log.body.events as { type: string; subjectId: string; payload: Record<string, unknown> }[]
    ).find((e) => e.type === "ENTITY_RETYPED" && e.subjectId === creada.body.id);

    expect(suceso).toBeDefined();
    // **Los DOS tipos, no solo el nuevo**: «ahora es un Documento» no dice qué se perdió.
    expect(suceso!.payload).toMatchObject({
      type: "ENTITY_RETYPED",
      entityName: "Maestre Kellan",
      from: "NPC",
      to: "DOCUMENT",
    });
  });

  it("y guardar SIN cambiar el tipo no escribe ningún rastro", async () => {
    // Un suceso que se escribe en cada guardado es ruido, y el ruido hace que nadie lea el
    // registro — que es justo lo que esta ficha quería arreglar.
    const s = app.getHttpServer();
    const creada = await request(s)
      .post(`/campaigns/${campaignId}/entities`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ type: "NPC", name: "Sin reclasificar", visibility: "PLAYERS" });

    await request(s)
      .patch(`/campaigns/${campaignId}/entities/${creada.body.id}`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ type: "NPC", name: "Otro nombre" });

    const filas = await prisma.gameEvent.count({
      where: { subjectId: creada.body.id, type: "ENTITY_RETYPED" },
    });
    expect(filas).toBe(0);
  });
});
