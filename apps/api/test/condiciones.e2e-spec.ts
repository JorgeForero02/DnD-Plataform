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
    // E-RM-1: el POST ya no fija el nivel (nace con nivelInicial); se sube con el PATCH.
    characterId = (
      await request(s)
        .post(`/campaigns/${campaignId}/characters`)
        .set("Authorization", `Bearer ${tokenPL}`)
        .send({ name: "Mira", level: 3, visibility: "PLAYERS" })
    ).body.id;
    // D-CF-66: el nivel lo fija el DM, no el dueño.
    await request(s)
      .patch(`/campaigns/${campaignId}/characters/${characterId}`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ level: 3 });
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
    // **Se afirma la CAUSA y no solo el número.** Los tres 403 de esta suite podrían venir de la
    // autorización si alguien cambiara de dueño el personaje del `beforeAll`, y entonces medirían
    // la propiedad sin avisar de que han dejado de medir esto.
    expect(r.body.message).toMatch(/Ayudar/);

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
    expect(r.body.message).toMatch(/Ayudar/);
  });

  it("una condición del SRD tampoco entra si quien la escribe es la jugadora", async () => {
    const r = await request(app.getHttpServer())
      .put(`${condUrl()}/poisoned`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({});
    expect(r.status).toBe(403);
    expect(r.body.message).toMatch(/la aplica el DM/);
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

  it("y quitar una del SRD también es del DM: si no, la desventaja dura lo que tarde en pulsar", async () => {
    const s = app.getHttpServer();
    // El DM se la pone (la prueba de arriba ya dejó `poisoned` puesta).
    const quita = await request(s)
      .delete(`${condUrl()}/poisoned`)
      .set("Authorization", `Bearer ${tokenPL}`);
    expect(quita.status).toBe(403);
    expect(quita.body.message).toMatch(/la quita el DM/);

    // Sigue puesta: un 403 que además borrara la fila sería peor que ninguno.
    const fila = await prisma.characterCondition.findFirst({
      where: { characterId, key: "poisoned" },
    });
    expect(fila).not.toBeNull();
  });

  it("pero la nota suya se la quita ella", async () => {
    const s = app.getHttpServer();
    const quita = await request(s)
      .delete(`${condUrl()}/mojado`)
      .set("Authorization", `Bearer ${tokenPL}`);
    expect(quita.status).toBe(200);
  });

  // **Contra Postgres, y por eso existen estas cuatro.** Las unitarias usan un Prisma simulado que
  // devuelve lo que se le ponga sin mirar el `where`: pasan igual con `startsWith` borrado, con el
  // `not:` borrado, y hasta si el código borrara TODAS las condiciones del personaje. Lo midió la
  // revisión del 2026-09-06.

  it("empezar una segunda concentración retira la primera, y solo esa", async () => {
    const s = app.getHttpServer();
    // Una condición que NO es de concentración, para comprobar que el borrado no se la lleva.
    await request(s)
      .put(`${condUrl()}/mojado`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({ note: "Sigo mojada" })
      .expect(200);

    await request(s)
      .put(`${condUrl()}/concentrating-on-bless`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({})
      .expect(200);
    await request(s)
      .put(`${condUrl()}/concentrating-on-haste`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({})
      .expect(200);

    const filas = await prisma.characterCondition.findMany({ where: { characterId } });
    const claves = filas.map((f) => f.key).sort();
    expect(claves).toContain("concentrating-on-haste");
    expect(claves).not.toContain("concentrating-on-bless");
    // La que no era concentración sigue ahí: el `startsWith` del `where` hace falta de verdad.
    expect(claves).toContain("mojado");
  });

  it("renovar LA MISMA concentración no la retira a sí misma", async () => {
    const s = app.getHttpServer();
    await request(s)
      .put(`${condUrl()}/concentrating-on-haste`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({ note: "renovada" })
      .expect(200);

    const fila = await prisma.characterCondition.findFirst({
      where: { characterId, key: "concentrating-on-haste" },
    });
    expect(fila).not.toBeNull();
    expect(fila?.note).toBe("renovada");
  });

  it("una clave que solo EMPIEZA por las letras del prefijo no es una concentración", async () => {
    const s = app.getHttpServer();
    // Sin separador no es concentración: si lo fuera, se llevaría por delante la de arriba.
    await request(s)
      .put(`${condUrl()}/concentrating`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({})
      .expect(200);

    const fila = await prisma.characterCondition.findFirst({
      where: { characterId, key: "concentrating-on-haste" },
    });
    expect(fila).not.toBeNull();
  });

  it("un jugador recibe 403 y NO el 400 de inmunidad: el oráculo no se abre por ahí", async () => {
    // Las quince inmunidades posibles son exactamente las claves reservadas, así que el 403 llega
    // primero. Si algún día una inmunidad dejara de serlo, esta prueba se pondría roja y habría
    // que rehacer el orden — que es justo lo que se quiere que pase.
    const r = await request(app.getHttpServer())
      .put(`${condUrl()}/stunned`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({});
    expect(r.status).toBe(403);
    expect(r.body.message).not.toMatch(/inmune/i);
  });
});
