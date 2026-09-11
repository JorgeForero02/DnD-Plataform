import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

// D-CF-19 (ficha P3 «archivar») — el hilo de una sesión mezcla los sucesos de campaña
// posteriores a su inicio. Archivar un personaje es un acto de campaña (sin `sessionId`), así
// que sin este cambio «Se archiva a X» no aparece nunca en el hilo mientras se juega.
describe("El hilo de la sesión mezcla los sucesos de campaña posteriores a su inicio (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const emailDM = `dm${Date.now()}@b.com`;
  const emailPL = `pl${Date.now()}@b.com`;
  let tokenDM = "";
  let tokenPL = "";
  let campaignId = "";
  // Compartida entre pruebas: la sesión 2 queda IN_PROGRESS al final de la primera prueba, y hay
  // que cerrarla antes de abrir otra (una sola sesión en curso por campaña).
  let sesion2Id = "";

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
        .send({ name: "C" })
    ).body.id;
    // MEMBER_JOINED: suceso de campaña SIN sesión, escrito ANTES de que exista ninguna sesión
    // (y por tanto antes del `startedAt` de la que se crea después). Es la exclusión de "antes".
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

  it("incluye el suceso de campaña sin sesión posterior al inicio, y excluye el anterior y el de otra sesión", async () => {
    const s = app.getHttpServer();

    const sesion1Id = (
      await request(s)
        .post(`/campaigns/${campaignId}/sessions`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ title: "Sesión 1", visibility: "PLAYERS" })
    ).body.id;
    const inicio1 = await request(s)
      .post(`/campaigns/${campaignId}/sessions/${sesion1Id}/start`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({});
    expect(inicio1.status).toBe(201);

    // Personaje del jugador, para archivarlo mientras la sesión 1 está en curso: es un acto de
    // campaña (sin `sessionId`) posterior al `startedAt` de la sesión 1.
    const personaje = (
      await request(s)
        .post(`/campaigns/${campaignId}/characters`)
        .set("Authorization", `Bearer ${tokenPL}`)
        .send({ name: "Faramir", level: 3, visibility: "PLAYERS" })
    ).body;

    const archivado = await request(s)
      .post(`/campaigns/${campaignId}/characters/${personaje.id}/archive`)
      .set("Authorization", `Bearer ${tokenDM}`);
    expect(archivado.status).toBe(201);

    // Solo puede haber una sesión en curso por campaña (índice único parcial): se cierra la 1
    // antes de abrir la 2.
    const cierre1 = await request(s)
      .post(`/campaigns/${campaignId}/sessions/${sesion1Id}/close`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({});
    expect(cierre1.status).toBe(201);

    // Otra sesión, con un suceso propio (`SESSION_STARTED`, `sessionId` = sesión 2): no debe
    // colarse en el hilo de la sesión 1.
    sesion2Id = (
      await request(s)
        .post(`/campaigns/${campaignId}/sessions`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ title: "Sesión 2", visibility: "PLAYERS" })
    ).body.id;
    const inicio2 = await request(s)
      .post(`/campaigns/${campaignId}/sessions/${sesion2Id}/start`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({});
    expect(inicio2.status).toBe(201);

    const hilo = await request(s)
      .get(`/campaigns/${campaignId}/events`)
      .query({ sessionId: sesion1Id })
      .set("Authorization", `Bearer ${tokenDM}`);
    expect(hilo.status).toBe(200);
    const tipos = (hilo.body.events as { type: string; subjectId: string }[]).map((e) => e.type);

    // Aparece: el archivado, sin sesión, ocurrió después del inicio de la sesión 1.
    expect(tipos).toContain("CHARACTER_ARCHIVED");

    // No aparece: MEMBER_JOINED es anterior al `startedAt` de la sesión 1.
    expect(tipos).not.toContain("MEMBER_JOINED");

    // No aparece: SESSION_STARTED de la sesión 2 pertenece a otra sesión.
    const deOtraSesion = (hilo.body.events as { type: string; subjectId: string }[]).filter(
      (e) => e.type === "SESSION_STARTED" && e.subjectId === sesion2Id,
    );
    expect(deOtraSesion).toHaveLength(0);
  });

  it("una sesión CERRADA no sigue absorbiendo sucesos de campaña posteriores a su cierre", async () => {
    // Fix round 1, hallazgo 1: el `OR` de campaña-sin-sesión no tenía tope superior, así que el
    // hilo de una sesión ya cerrada seguía creciendo con cualquier suceso futuro de la campaña.
    const s = app.getHttpServer();

    // Cierra la sesión 2, que la prueba anterior dejó IN_PROGRESS.
    const cierre2 = await request(s)
      .post(`/campaigns/${campaignId}/sessions/${sesion2Id}/close`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({});
    expect(cierre2.status).toBe(201);

    const sesion3Id = (
      await request(s)
        .post(`/campaigns/${campaignId}/sessions`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ title: "Sesión 3", visibility: "PLAYERS" })
    ).body.id;
    const inicio3 = await request(s)
      .post(`/campaigns/${campaignId}/sessions/${sesion3Id}/start`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({});
    expect(inicio3.status).toBe(201);

    const cierre3 = await request(s)
      .post(`/campaigns/${campaignId}/sessions/${sesion3Id}/close`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ recap: "Fin de la sesión 3", recapVisibility: "PLAYERS" });
    expect(cierre3.status).toBe(201);

    // Un personaje nuevo, archivado DESPUÉS de cerrar la sesión 3: acto de campaña sin sesión,
    // pero fuera de la ventana [inicio, cierre] de la sesión 3.
    const otroPersonaje = (
      await request(s)
        .post(`/campaigns/${campaignId}/characters`)
        .set("Authorization", `Bearer ${tokenPL}`)
        .send({ name: "Éowyn", level: 3, visibility: "PLAYERS" })
    ).body;
    const archivadoTrasCierre = await request(s)
      .post(`/campaigns/${campaignId}/characters/${otroPersonaje.id}/archive`)
      .set("Authorization", `Bearer ${tokenDM}`);
    expect(archivadoTrasCierre.status).toBe(201);

    const hilo3 = await request(s)
      .get(`/campaigns/${campaignId}/events`)
      .query({ sessionId: sesion3Id })
      .set("Authorization", `Bearer ${tokenDM}`);
    expect(hilo3.status).toBe(200);
    const suceso = (hilo3.body.events as { type: string; subjectId: string }[]).find(
      (e) => e.type === "CHARACTER_ARCHIVED" && e.subjectId === otroPersonaje.id,
    );
    expect(suceso).toBeUndefined();
  });

  // Revisión final de `ficha/tanda-2-a-5`, Medium #4: una sesión PLANIFICADA (`startedAt` nulo,
  // `endedAt` nulo) no tiene "inicio" real todavía — `inicio = session.startedAt ?? createdAt`
  // hacía que la ventana fuera `[createdAt, ∞)`, absorbiendo CUALQUIER suceso de campaña sin
  // `sessionId` desde que se creó la fila, aunque la sesión nunca se haya jugado.
  it("una sesión PLANIFICADA (nunca empezada) no absorbe sucesos de campaña: solo los suyos propios", async () => {
    const s = app.getHttpServer();

    const planificada = (
      await request(s)
        .post(`/campaigns/${campaignId}/sessions`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ title: "Sesión planificada", visibility: "PLAYERS" })
    ).body.id;

    // Acto de campaña sin sesión, ocurrido DESPUÉS de crear la sesión planificada — con el bug,
    // este suceso caería dentro de `[createdAt, ∞)` y aparecería en su hilo.
    const otroPersonaje = (
      await request(s)
        .post(`/campaigns/${campaignId}/characters`)
        .set("Authorization", `Bearer ${tokenPL}`)
        .send({ name: "Éomer", level: 3, visibility: "PLAYERS" })
    ).body;
    const archivado = await request(s)
      .post(`/campaigns/${campaignId}/characters/${otroPersonaje.id}/archive`)
      .set("Authorization", `Bearer ${tokenDM}`);
    expect(archivado.status).toBe(201);

    const hilo = await request(s)
      .get(`/campaigns/${campaignId}/events`)
      .query({ sessionId: planificada })
      .set("Authorization", `Bearer ${tokenDM}`);
    expect(hilo.status).toBe(200);
    const suceso = (hilo.body.events as { type: string; subjectId: string }[]).find(
      (e) => e.type === "CHARACTER_ARCHIVED" && e.subjectId === otroPersonaje.id,
    );
    expect(suceso).toBeUndefined();
  });

  it("pedir el hilo de una sesión de OTRA campaña es 404", async () => {
    const s = app.getHttpServer();
    const otra = (
      await request(s)
        .post("/campaigns")
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ name: "Otra mesa" })
    ).body.id;
    const sesionAjena = (
      await request(s)
        .post(`/campaigns/${otra}/sessions`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ title: "Ajena", visibility: "DM_ONLY" })
    ).body.id;

    const r = await request(s)
      .get(`/campaigns/${campaignId}/events`)
      .query({ sessionId: sesionAjena })
      .set("Authorization", `Bearer ${tokenDM}`);
    expect(r.status).toBe(404);

    await prisma.campaign.deleteMany({ where: { id: otra } });
  });
});
