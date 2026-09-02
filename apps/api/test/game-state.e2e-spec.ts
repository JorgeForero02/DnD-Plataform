import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

// Tarea 2A.5 — estado de partida contra Postgres real.
//
// **Por qué esto no puede ser una unitaria.** La regla «como máximo una sesión en curso por
// campaña» la garantiza un índice único **parcial** de Postgres, y el Prisma simulado de las
// unitarias no valida SQL (`docs/08-pruebas.md`, «lo que las pruebas de hoy NO cubren»). Si
// esta prueba viviera con un doble, pasaría en verde con el índice borrado.

describe("Estado de partida (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const emailDM = `dm-gs${Date.now()}@b.com`;
  const emailPL = `pl-gs${Date.now()}@b.com`;
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
        .send({ name: "Campaña de estado" })
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

  const crearSesion = async (title: string, visibility = "PLAYERS") =>
    (
      await request(app.getHttpServer())
        .post(`/campaigns/${campaignId}/sessions`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ title, visibility })
    ).body.id as string;

  it("arrancar una SEGUNDA sesión en la misma campaña falla — lo impide el índice, no el servicio", async () => {
    const s = app.getHttpServer();
    const primera = await crearSesion("La primera");
    const segunda = await crearSesion("La segunda");

    const ok = await request(s)
      .post(`/campaigns/${campaignId}/sessions/${primera}/start`)
      .set("Authorization", `Bearer ${tokenDM}`);
    expect(ok.status).toBe(201);
    expect(ok.body.status).toBe("IN_PROGRESS");
    expect(ok.body.startedAt).toBeTruthy();

    const choque = await request(s)
      .post(`/campaigns/${campaignId}/sessions/${segunda}/start`)
      .set("Authorization", `Bearer ${tokenDM}`);
    expect(choque.status).toBe(409);

    // Y la segunda sigue planificada: el 409 no la dejó a medias.
    const estado = await prisma.session.findUnique({ where: { id: segunda } });
    expect(estado?.status).toBe("PLANNED");

    // Se cierra para no dejar la campaña con una sesión en curso en las pruebas siguientes.
    const cerrada = await request(s)
      .post(`/campaigns/${campaignId}/sessions/${primera}/close`)
      .set("Authorization", `Bearer ${tokenDM}`);
    expect(cerrada.status).toBe(201);
    expect(cerrada.body.status).toBe("CLOSED");
  });

  it("un jugador no puede arrancar una sesión (403)", async () => {
    const sesion = await crearSesion("La del jugador");
    const res = await request(app.getHttpServer())
      .post(`/campaigns/${campaignId}/sessions/${sesion}/start`)
      .set("Authorization", `Bearer ${tokenPL}`);
    expect(res.status).toBe(403);
  });

  it("arrancar escribe su evento, y el jugador lo ve en el log", async () => {
    const s = app.getHttpServer();
    const sesion = await crearSesion("La visible");
    await request(s)
      .post(`/campaigns/${campaignId}/sessions/${sesion}/start`)
      .set("Authorization", `Bearer ${tokenDM}`);

    const log = await request(s)
      .get(`/campaigns/${campaignId}/events`)
      .query({ sessionId: sesion })
      .set("Authorization", `Bearer ${tokenPL}`);
    expect(log.status).toBe(200);
    expect(log.body.events).toHaveLength(1);
    expect(log.body.events[0].type).toBe("SESSION_STARTED");
    expect(log.body.events[0].payload).toMatchObject({ sessionTitle: "La visible" });

    const cerrar = await request(s)
      .post(`/campaigns/${campaignId}/sessions/${sesion}/close`)
      .set("Authorization", `Bearer ${tokenDM}`);
    expect(cerrar.status).toBe(201);

    const tras = await request(s)
      .get(`/campaigns/${campaignId}/events`)
      .query({ sessionId: sesion })
      .set("Authorization", `Bearer ${tokenPL}`);
    expect(tras.body.events.map((e: { type: string }) => e.type)).toEqual([
      "SESSION_CLOSED",
      "SESSION_STARTED",
    ]);
    // Los minutos salen del propio par de fechas, no de un reloj de fuera.
    expect(tras.body.events[0].payload.durationMinutes).toBeGreaterThanOrEqual(0);
  });

  it("un evento DM_ONLY no aparece en el GET del jugador, y sí en el del DM", async () => {
    const s = app.getHttpServer();
    // El evento hereda la visibilidad de la sesión que lo produce.
    const secreta = await crearSesion("La secreta", "DM_ONLY");
    await request(s)
      .post(`/campaigns/${campaignId}/sessions/${secreta}/start`)
      .set("Authorization", `Bearer ${tokenDM}`);

    const delJugador = await request(s)
      .get(`/campaigns/${campaignId}/events`)
      .query({ sessionId: secreta })
      .set("Authorization", `Bearer ${tokenPL}`);
    expect(delJugador.status).toBe(200);
    expect(delJugador.body.events).toEqual([]);

    const delDM = await request(s)
      .get(`/campaigns/${campaignId}/events`)
      .query({ sessionId: secreta })
      .set("Authorization", `Bearer ${tokenDM}`);
    expect(delDM.body.events).toHaveLength(1);

    await request(s)
      .post(`/campaigns/${campaignId}/sessions/${secreta}/close`)
      .set("Authorization", `Bearer ${tokenDM}`);
  });

  it("quien no es miembro no lee el log (403), aunque adivine el identificador", async () => {
    const s = app.getHttpServer();
    const email = `x-gs${Date.now()}@b.com`;
    const token = (
      await request(s)
        .post("/auth/register")
        .send({ email, password: "password123", displayName: "X" })
    ).body.token;
    const res = await request(s)
      .get(`/campaigns/${campaignId}/events`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
    await prisma.user.deleteMany({ where: { email } });
  });

  it("un límite inválido es 400, no una consulta sin tope", async () => {
    const res = await request(app.getHttpServer())
      .get(`/campaigns/${campaignId}/events`)
      .query({ limit: 5000 })
      .set("Authorization", `Bearer ${tokenDM}`);
    expect(res.status).toBe(400);
  });
});
