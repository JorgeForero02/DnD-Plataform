import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { CharacterStateModule } from "../src/character-state/character-state.module";
import { PrismaService } from "../src/prisma/prisma.service";

// Tareas 2A.8 y 2A.12 — recursos, descansos y condiciones, contra Postgres real.
//
// **Por qué esto no puede ser una unitaria.** El Prisma simulado de las unitarias no valida
// restricciones ni transacciones reales; y sobre todo, la pregunta que de verdad importa aquí
// —¿un descanso largo se lleva la mitad de los dados de golpe y no todos, en una fila que de
// verdad pasó por Postgres?— solo la responde una base real (`docs/08-pruebas.md`).
//
// `CharacterStateModule` se importa aparte de `AppModule` porque su cableado en
// `app.module.ts` lo hace el orquestador, no esta tarea (frontera declarada en el encargo).

describe("Estado de personaje: recursos, descansos y condiciones (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const emailDM = `dm-cs${Date.now()}@b.com`;
  const emailPL = `pl-cs${Date.now()}@b.com`;
  let tokenDM = "";
  let tokenPL = "";
  let campaignId = "";
  let characterId = "";

  beforeAll(async () => {
    const ref = await Test.createTestingModule({
      imports: [AppModule, CharacterStateModule],
    }).compile();
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
        .send({ name: "Campaña de estado de personaje" })
    ).body.id;
    const invite = (
      await request(s)
        .post(`/campaigns/${campaignId}/invites`)
        .set("Authorization", `Bearer ${tokenDM}`)
    ).body.token;
    await request(s).post(`/invites/${invite}/accept`).set("Authorization", `Bearer ${tokenPL}`);

    characterId = (
      await request(s)
        .post(`/campaigns/${campaignId}/characters`)
        .set("Authorization", `Bearer ${tokenPL}`)
        .send({ name: "Kelemvor", class: "warlock", level: 3, visibility: "PLAYERS" })
    ).body.id;
    // Constitución 14 (+2), para que la curación de los dados de golpe sea siempre positiva y
    // comprobable sin depender de la tirada.
    await prisma.character.update({ where: { id: characterId }, data: { con: 14 } });
  });

  afterAll(async () => {
    if (campaignId) await prisma.campaign.deleteMany({ where: { id: campaignId } });
    await prisma.user.deleteMany({ where: { email: { in: [emailDM, emailPL] } } });
    await app.close();
  });

  const s = () => app.getHttpServer();
  const base = () => `/campaigns/${campaignId}/characters/${characterId}`;

  it("el dueño crea un recurso propio, y listarlo lo devuelve", async () => {
    const put = await request(s())
      .put(`${base()}/resources/rage`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({ label: "Furia", current: 2, max: 3, resetOn: "LONG_REST", grantedBy: "OWNER" });
    expect(put.status).toBe(200);
    expect(put.body).toMatchObject({ key: "rage", current: 2, max: 3 });

    const list = await request(s())
      .get(`${base()}/resources`)
      .set("Authorization", `Bearer ${tokenPL}`);
    expect(list.status).toBe(200);
    expect(list.body.map((r: { key: string }) => r.key)).toContain("rage");
  });

  it("gastar un recurso baja el contador y escribe su evento", async () => {
    const spend = await request(s())
      .post(`${base()}/resources/rage/spend`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({ amount: 1 });
    expect(spend.status).toBe(201);
    expect(spend.body.current).toBe(1);

    const log = await request(s())
      .get(`/campaigns/${campaignId}/events`)
      .query({ limit: 50 })
      .set("Authorization", `Bearer ${tokenPL}`);
    const evento = log.body.events.find(
      (e: { type: string; payload: { key?: string } }) =>
        e.type === "RESOURCE_SPENT" && e.payload.key === "rage",
    );
    expect(evento).toBeDefined();
    expect(evento.payload).toMatchObject({ amount: 1, remaining: 1 });
  });

  it("MUTACIÓN CLAVE: un jugador no puede subir un recurso DM_ONLY (403)", async () => {
    const creado = await request(s())
      .put(`${base()}/resources/inspiration`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ label: "Inspiración", current: 0, max: 1, resetOn: "NONE", grantedBy: "DM_ONLY" });
    expect(creado.status).toBe(200);

    const intento = await request(s())
      .put(`${base()}/resources/inspiration`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({ label: "Inspiración", current: 1, max: 1, resetOn: "NONE", grantedBy: "OWNER" });
    expect(intento.status).toBe(403);

    // El dueño SÍ puede gastarla/reponerla una vez concedida: el candado es sobre crearla o
    // subirle el máximo, no sobre usar lo que ya tiene.
    const gasto = await request(s())
      .post(`${base()}/resources/inspiration/restore`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({ amount: 1 });
    expect(gasto.status).toBe(201);
    expect(gasto.body.current).toBe(1);
  });

  it("MUTACIÓN CLAVE: un descanso largo recupera la mitad de los dados de golpe, no todos", async () => {
    await request(s())
      .put(`${base()}/resources/hit-dice-d8`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({
        label: "Dados de golpe (d8)",
        current: 1,
        max: 5,
        resetOn: "NONE",
        grantedBy: "OWNER",
      });

    const rest = await request(s())
      .post(`${base()}/rest`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({ kind: "LONG" });
    expect(rest.status).toBe(201);

    const list = await request(s())
      .get(`${base()}/resources`)
      .set("Authorization", `Bearer ${tokenPL}`);
    const dados = list.body.find((r: { key: string }) => r.key === "hit-dice-d8");
    // Máximo 5, disponía 1: la mitad de 5 es 2.5 -> 3 hacia arriba. 1 + 3 = 4, nunca 5.
    expect(dados.current).toBe(4);
  });

  it("MUTACIÓN CLAVE: el brujo repone sus espacios de conjuro en un descanso CORTO", async () => {
    await request(s())
      .put(`${base()}/resources/spell-slot-1`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({
        label: "Espacios de conjuro de nivel 1",
        current: 0,
        max: 2,
        resetOn: "SHORT_REST",
        grantedBy: "OWNER",
      });

    const rest = await request(s())
      .post(`${base()}/rest`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({ kind: "SHORT" });
    expect(rest.status).toBe(201);

    const list = await request(s())
      .get(`${base()}/resources`)
      .set("Authorization", `Bearer ${tokenPL}`);
    const espacio = list.body.find((r: { key: string }) => r.key === "spell-slot-1");
    expect(espacio.current).toBe(2);
  });

  it("un descanso corto declarado escribe REST_DECLARED, visible para el jugador", async () => {
    const log = await request(s())
      .get(`/campaigns/${campaignId}/events`)
      .query({ limit: 50 })
      .set("Authorization", `Bearer ${tokenPL}`);
    const evento = log.body.events.find(
      (e: { type: string; payload: { rest?: string } }) =>
        e.type === "REST_DECLARED" && e.payload.rest === "SHORT",
    );
    expect(evento).toBeDefined();
  });

  it("el DM aplica una condición, el jugador la ve, y el DM la quita", async () => {
    const aplicar = await request(s())
      .put(`${base()}/conditions/prone`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({});
    expect(aplicar.status).toBe(200);

    const lista = await request(s())
      .get(`${base()}/conditions`)
      .set("Authorization", `Bearer ${tokenPL}`);
    expect(lista.body.map((c: { key: string }) => c.key)).toContain("prone");

    const quitar = await request(s())
      .delete(`${base()}/conditions/prone`)
      .set("Authorization", `Bearer ${tokenDM}`);
    expect(quitar.status).toBe(200);

    const trasQuitar = await request(s())
      .get(`${base()}/conditions`)
      .set("Authorization", `Bearer ${tokenPL}`);
    expect(trasQuitar.body.map((c: { key: string }) => c.key)).not.toContain("prone");
  });

  it("quien no es miembro no ve los recursos del personaje (403)", async () => {
    const email = `x-cs${Date.now()}@b.com`;
    const token = (
      await request(s())
        .post("/auth/register")
        .send({ email, password: "password123", displayName: "X" })
    ).body.token;
    const res = await request(s())
      .get(`${base()}/resources`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
    await prisma.user.deleteMany({ where: { email } });
  });
});
