import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

// Tarea 2C.6 contra Postgres real.
//
// **Lo que NO se prueba aquí, y conviene decirlo:** el disparo automático de un crítico o una
// pifia. Necesita que el d20 saque un 20 o un 1 a voluntad, y el tirador solo se puede fijar
// inyectándolo —lo hacen las unitarias, que ya cubren las cuatro ramas—. Un recorrido que tirara
// cuarenta veces esperando un natural sería una prueba que a veces no prueba nada y que además
// desbordaría el limitador de peticiones.
//
// Lo que sí solo puede vivir aquí: que **el índice único parcial de Postgres** impide una segunda
// tabla de pifias, y que una tabla `DM_ONLY` **no viaja** al jugador.

describe("Tablas del DM (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const emailDM = `dm-tbl${Date.now()}@b.com`;
  const emailPL = `pl-tbl${Date.now()}@b.com`;
  let tokenDM = "";
  let tokenPL = "";
  let campaignId = "";

  const url = () => `/campaigns/${campaignId}/tables`;

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
        .send({ name: "Campaña con reglas de la casa" })
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

  it("**las tablas de la casa nacen apagadas**", async () => {
    const campana = await prisma.campaign.findUniqueOrThrow({ where: { id: campaignId } });
    expect(campana.houseTablesEnabled).toBe(false);
  });

  it("un jugador no puede crear tablas (403)", async () => {
    const r = await request(app.getHttpServer())
      .post(url())
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({ name: "Mía", entries: [{ min: 1, max: 6, text: "Algo" }] });
    expect(r.status).toBe(403);
  });

  it("una tabla con un hueco se rechaza con un 400 legible", async () => {
    const r = await request(app.getHttpServer())
      .post(url())
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({
        name: "Con hueco",
        entries: [
          { min: 1, max: 3, text: "A" },
          { min: 7, max: 10, text: "B" },
        ],
      });
    expect(r.status).toBe(400);
    expect(JSON.stringify(r.body)).toMatch(/hueco|falta/i);
  });

  it("el DM crea su tabla de pifias, y por defecto **solo la ve él**", async () => {
    const s = app.getHttpServer();
    const crear = await request(s)
      .post(url())
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({
        name: "Pifias de la casa",
        trigger: "FUMBLE",
        entries: [
          { min: 1, max: 5, text: "Se te cae el arma." },
          { min: 6, max: 10, text: "Pierdes el equilibrio." },
        ],
      });
    expect(crear.status).toBe(201);
    expect(crear.body.visibility).toBe("DM_ONLY");

    const delDM = await request(s).get(url()).set("Authorization", `Bearer ${tokenDM}`);
    expect(delDM.body).toHaveLength(1);

    // **No viaja**: no se esconde en el cliente.
    const delJugador = await request(s).get(url()).set("Authorization", `Bearer ${tokenPL}`);
    expect(delJugador.body).toHaveLength(0);
  });

  it("**una segunda tabla de pifias se rechaza, y lo impide la base** (409)", async () => {
    const r = await request(app.getHttpServer())
      .post(url())
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({
        name: "Otras pifias",
        trigger: "FUMBLE",
        entries: [{ min: 1, max: 6, text: "Otra cosa" }],
      });
    expect(r.status).toBe(409);
  });

  it("pero **varias tablas sin disparador conviven**: botín, rumores, encuentros", async () => {
    const s = app.getHttpServer();
    for (const nombre of ["Botín", "Rumores"]) {
      const r = await request(s)
        .post(url())
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({
          name: nombre,
          visibility: "PLAYERS",
          entries: [{ min: 1, max: 4, text: `Algo de ${nombre}` }],
        });
      expect(r.status).toBe(201);
    }
    const delJugador = await request(s).get(url()).set("Authorization", `Bearer ${tokenPL}`);
    expect(delJugador.body.map((t: { name: string }) => t.name).sort()).toEqual([
      "Botín",
      "Rumores",
    ]);
  });

  it("tirarla a mano da un resultado de la tabla y **deja rastro con su visibilidad**", async () => {
    const s = app.getHttpServer();
    const tablas = await request(s).get(url()).set("Authorization", `Bearer ${tokenDM}`);
    const pifias = tablas.body.find((t: { name: string }) => t.name === "Pifias de la casa");

    const tirada = await request(s)
      .post(`${url()}/${pifias.id}/roll`)
      .set("Authorization", `Bearer ${tokenDM}`);

    expect(tirada.status).toBe(201);
    expect(tirada.body.die).toBe(10);
    expect(["Se te cae el arma.", "Pierdes el equilibrio."]).toContain(tirada.body.text);

    // El rastro es `DM_ONLY`, como la tabla: no se canta en el registro de la mesa.
    const delJugador = await request(s)
      .get(`/campaigns/${campaignId}/events`)
      .set("Authorization", `Bearer ${tokenPL}`);
    expect(delJugador.body.events.some((e: { id: string }) => e.id === tirada.body.eventId)).toBe(
      false,
    );
  });

  it("**un jugador no puede tirar una tabla que no ve, y recibe 404, no 403**", async () => {
    const s = app.getHttpServer();
    const tablas = await request(s).get(url()).set("Authorization", `Bearer ${tokenDM}`);
    const pifias = tablas.body.find((t: { name: string }) => t.name === "Pifias de la casa");

    const r = await request(s)
      .post(`${url()}/${pifias.id}/roll`)
      .set("Authorization", `Bearer ${tokenPL}`);
    // Un 403 confirmaría que existe, que es lo que una tabla del DM no quiere confirmar.
    expect(r.status).toBe(404);
  });

  it("el interruptor se enciende y se apaga, y solo el DM", async () => {
    const s = app.getHttpServer();
    const prohibido = await request(s)
      .put(`${url()}/house-rule`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({ enabled: true });
    expect(prohibido.status).toBe(403);

    const encender = await request(s)
      .put(`${url()}/house-rule`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ enabled: true });
    expect(encender.status).toBe(200);
    expect(encender.body).toEqual({ enabled: true });

    const campana = await prisma.campaign.findUniqueOrThrow({ where: { id: campaignId } });
    expect(campana.houseTablesEnabled).toBe(true);
  });
});
