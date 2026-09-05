import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

// **Se importa `AppModule`, no una copia suya.** La primera version declaraba aqui un
// `TestAppModule` que reproducia su composicion, porque la tarea que escribio esta suite tenia
// prohibido tocar `app.module.ts`. Eso dejaba **dos copias del mismo hecho**, y dos copias
// derivan: el dia que la aplicacion real gane un guardia global, esta suite seguiria pasando sin
// el. Cableados ya los modulos, se usa el de verdad.

describe("Notificaciones (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const emailDM = `dm-notif${Date.now()}@b.com`;
  const emailPL = `pl-notif${Date.now()}@b.com`;
  let tokenDM = "";
  let tokenPL = "";
  let campaignId = "";

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
        .send({ name: "Campaña de notificaciones" })
    ).body.id;
  });

  afterAll(async () => {
    if (campaignId) await prisma.campaign.deleteMany({ where: { id: campaignId } });
    await prisma.user.deleteMany({ where: { email: { in: [emailDM, emailPL] } } });
    await app.close();
  });

  it("el DM invita, el jugador acepta, y al DM le llega una notificación", async () => {
    const s = app.getHttpServer();
    const invite = (
      await request(s)
        .post(`/campaigns/${campaignId}/invites`)
        .set("Authorization", `Bearer ${tokenDM}`)
    ).body.token;
    await request(s).post(`/invites/${invite}/accept`).set("Authorization", `Bearer ${tokenPL}`);

    const bandeja = await request(s)
      .get("/notifications")
      .set("Authorization", `Bearer ${tokenDM}`);
    expect(bandeja.status).toBe(200);
    const notif = bandeja.body.notifications.find(
      (n: { type: string }) => n.type === "CAMPAIGN_MEMBER_JOINED",
    );
    expect(notif).toBeDefined();
    // El payload lleva datos, nunca la frase: el userId del que se unió, no una frase en español.
    expect(notif.payload).toEqual({ userId: expect.any(String) });
    expect(bandeja.body.unreadCount).toBeGreaterThanOrEqual(1);
  });

  it("un jugador no ve las notificaciones de otro", async () => {
    const s = app.getHttpServer();
    const bandejaJugador = await request(s)
      .get("/notifications")
      .set("Authorization", `Bearer ${tokenPL}`);
    expect(bandejaJugador.status).toBe(200);
    // El jugador no creó ninguna campaña ni recibió invitaciones de otros: su bandeja está
    // vacía aunque el DM sí tenga notificaciones en la suya.
    expect(bandejaJugador.body.notifications).toEqual([]);
  });

  it("marcar leídas solo afecta a las propias, y no avisa a nadie más", async () => {
    const s = app.getHttpServer();
    const antes = await request(s).get("/notifications").set("Authorization", `Bearer ${tokenDM}`);
    expect(antes.body.unreadCount).toBeGreaterThanOrEqual(1);

    const marcar = await request(s)
      .post("/notifications/read")
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({});
    expect(marcar.status).toBe(201);

    const despues = await request(s)
      .get("/notifications")
      .set("Authorization", `Bearer ${tokenDM}`);
    expect(despues.body.unreadCount).toBe(0);

    // Marcar las del DM no toca ni crea nada en la bandeja del jugador.
    const jugador = await request(s)
      .get("/notifications")
      .set("Authorization", `Bearer ${tokenPL}`);
    expect(jugador.body.notifications).toEqual([]);
  });

  // --- Plan 12 · los dos avisos que nadie emitia ---
  //
  // Los oyentes son **asincronos y nadie espera su promesa**: `emit()` reparte y la peticion HTTP
  // ya ha contestado. Por eso se sondea en vez de leer una vez — un `expect` inmediato aqui seria
  // una prueba intermitente, no una prueba.

  async function esperarAviso(token: string, tipo: string, intentos = 20) {
    const s = app.getHttpServer();
    for (let i = 0; i < intentos; i++) {
      const bandeja = await request(s)
        .get("/notifications")
        .set("Authorization", `Bearer ${token}`);
      const aviso = bandeja.body.notifications.find((n: { type: string }) => n.type === tipo);
      if (aviso) return aviso;
      await new Promise((r) => setTimeout(r, 50));
    }
    return null;
  }

  it("comentar una ficha avisa al DM, y NO a quien comento", async () => {
    const s = app.getHttpServer();
    const ficha = (
      await request(s)
        .post(`/campaigns/${campaignId}/entities`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ type: "NPC", name: "Gundren", visibility: "PLAYERS" })
    ).body;
    expect(ficha.id).toBeDefined();

    await request(s)
      .post(`/entities/${ficha.id}/comments`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({ body: "Este me da mala espina." });

    const alDM = await esperarAviso(tokenDM, "COMMENT_ADDED");
    expect(alDM).not.toBeNull();
    // **El cuerpo del comentario no viaja en el aviso**: el hilo tiene su propia puerta.
    expect(alDM.payload).toEqual({
      entityId: ficha.id,
      entityType: "NPC",
      entityName: "Gundren",
    });

    // Y quien comento no se avisa a si mismo.
    const alJugador = await esperarAviso(tokenPL, "COMMENT_ADDED", 3);
    expect(alJugador).toBeNull();
  });

  it("el aviso de un comentario NO llega a quien no puede ver la ficha", async () => {
    const s = app.getHttpServer();
    // La ficha es `DM_ONLY`: el jugador no la ve, y **tampoco puede enterarse de que existe**
    // porque alguien la haya comentado. Es la fuga que protege esta suite.
    const secreta = (
      await request(s)
        .post(`/campaigns/${campaignId}/entities`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ type: "NPC", name: "El que mueve los hilos", visibility: "DM_ONLY" })
    ).body;

    await request(s)
      .post(`/entities/${secreta.id}/comments`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ body: "Aparece en el tercer acto." });

    const bandeja = await request(s)
      .get("/notifications")
      .set("Authorization", `Bearer ${tokenPL}`);
    const sobreLaSecreta = bandeja.body.notifications.filter(
      (n: { subjectId: string }) => n.subjectId === secreta.id,
    );
    expect(sobreLaSecreta).toEqual([]);
  });

  it("planificar una sesion con fecha avisa a la mesa, menos a quien la planifico", async () => {
    const s = app.getHttpServer();
    const creada = await request(s)
      .post(`/campaigns/${campaignId}/sessions`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({
        title: "La noche del puerto",
        scheduledAt: "2026-09-20T20:00:00.000Z",
        visibility: "PLAYERS",
      });
    expect(creada.status).toBe(201);

    const alJugador = await esperarAviso(tokenPL, "SESSION_SCHEDULED");
    expect(alJugador).not.toBeNull();
    expect(alJugador.payload).toEqual({
      sessionId: creada.body.id,
      sessionTitle: "La noche del puerto",
      scheduledAt: "2026-09-20T20:00:00.000Z",
    });

    const alDM = await esperarAviso(tokenDM, "SESSION_SCHEDULED", 3);
    expect(alDM).toBeNull();
  });

  it("sin token, 401", async () => {
    const res = await request(app.getHttpServer()).get("/notifications");
    expect(res.status).toBe(401);
  });
});
