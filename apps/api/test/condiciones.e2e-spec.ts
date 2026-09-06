import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

// **Paso 1, tarea 1 — la puerta genérica de condiciones, contra Postgres real.**
//
// Por qué no puede ser una unitaria: lo que hay que demostrar es que **la petición HTTP** de un
// jugador con su propio token se para, no que un método rechace un argumento. El agujero era
// exactamente esa petición —`PUT /campaigns/:c/characters/:suyo/conditions/helped` sin duración
// daba ventaja permanente y renovable en todos sus ataques— y la autorización de arriba
// (`requireOwnerOrDM`) la aprobaba con razón: el personaje es suyo. Una unitaria con el Prisma
// simulado no distingue las dos cosas porque nunca monta la cadena guardia → pipe → servicio.
//
// La regla, en una línea: **el DM sí, el jugador sobre sí mismo no, y `helped` nadie.**

describe("Condiciones: la puerta genérica (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const emailDM = `dm-cond1${Date.now()}@b.com`;
  const emailPL = `pl-cond1${Date.now()}@b.com`;
  let tokenDM = "";
  let tokenPL = "";
  let campaignId = "";
  let characterId = "";

  const condUrl = () => `/campaigns/${campaignId}/characters/${characterId}/conditions`;

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
        .send({ name: "Campaña de la puerta de condiciones" })
    ).body.id;
    const invite = (
      await request(s)
        .post(`/campaigns/${campaignId}/invites`)
        .set("Authorization", `Bearer ${tokenDM}`)
    ).body.token;
    await request(s).post(`/invites/${invite}/accept`).set("Authorization", `Bearer ${tokenPL}`);

    // **El personaje es de la jugadora**, que es lo que hace este caso interesante: la
    // autorización de escritura la aprueba y aun así la clave no entra.
    characterId = (
      await request(s)
        .post(`/campaigns/${campaignId}/characters`)
        .set("Authorization", `Bearer ${tokenPL}`)
        .send({ name: "Mira", level: 3, visibility: "PLAYERS" })
    ).body.id;
  });

  afterAll(async () => {
    if (campaignId) await prisma.campaign.deleteMany({ where: { id: campaignId } });
    await prisma.user.deleteMany({ where: { email: { in: [emailDM, emailPL] } } });
    await app.close();
  });

  it("una jugadora NO puede aplicarse `helped` sobre su propio personaje", async () => {
    const r = await request(app.getHttpServer())
      .put(`${condUrl()}/helped`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({});
    expect(r.status).toBe(403);

    // Y no se ha escrito nada: un 403 que además guarda la fila sería peor que ninguno.
    const fila = await prisma.characterCondition.findFirst({
      where: { characterId, key: "helped" },
    });
    expect(fila).toBeNull();
  });

  it("el DM tampoco: la marca la pone la acción Ayudar, no una ruta genérica", async () => {
    const r = await request(app.getHttpServer())
      .put(`${condUrl()}/helped`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({});
    expect(r.status).toBe(403);
  });

  it("una condición del SRD tampoco entra si quien la escribe es la jugadora", async () => {
    const r = await request(app.getHttpServer())
      .put(`${condUrl()}/poisoned`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({});
    expect(r.status).toBe(403);
  });

  it("pero el DM SÍ envenena a alguien: eso es jugar, y sigue funcionando", async () => {
    const r = await request(app.getHttpServer())
      .put(`${condUrl()}/poisoned`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({});
    expect(r.status).toBe(200);
    expect(r.body.key).toBe("poisoned");
  });

  it("y una nota propia sin efecto mecánico sigue siendo suya", async () => {
    const r = await request(app.getHttpServer())
      .put(`${condUrl()}/mojado`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({ note: "Me caí al río" });
    expect(r.status).toBe(200);
    expect(r.body.key).toBe("mojado");
    expect(r.body.note).toBe("Me caí al río");
  });
});
