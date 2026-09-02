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

  it("sin token, 401", async () => {
    const res = await request(app.getHttpServer()).get("/notifications");
    expect(res.status).toBe(401);
  });
});
