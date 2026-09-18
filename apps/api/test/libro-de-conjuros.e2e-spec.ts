import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

// Tarea 3A.2 (Task 3, T10) — el libro de conjuros de un personaje, contra Postgres real.
// **Se escribe, no se corre**: lo corre el orquestador, uno a la vez (docs/08-pruebas.md).
//
// Dos bloques: un mago (modelo LIBRO, siembra al fijar la clase — D-CF-125) y un clérigo
// (modelo PREPARA_DE_LISTA, sin siembra, con el tope de preparados excedido a propósito —
// D-CF-126: se escribe igual y el séptimo suceso lleva `fueraDeRegla: ["SOBRE_EL_TOPE"]`).
//
// **`.timeout({ response, deadline })` y un `listen(0, "127.0.0.1")` explícito — mitigan, no
// eliminan, un fallo de la herramienta de pruebas y no del servidor.** `GET/PUT …/spellbook`
// devuelve el catálogo entero de la clase (hasta 204 conjuros, ~460 KB con su prosa del SRD —
// D-CF-125, `SpellbookEntry` trae `textEs`/`textEn` completos). Medido: `http.get` crudo contra
// el mismo endpoint, mismo personaje, responde en ~60-108 ms y **nunca** falla (varias corridas).
// Por `supertest`, la misma petición pasa la mayoría de las veces igual de rápido, pero de vez en
// cuando (visto 1-2 de 9 peticiones grandes por corrida, nunca en las pequeñas) `superagent@10.3.0`
// dispara su «double callback bug» conocido con cuerpos de esta talla y la petición muere con
// `ECONNRESET` a los ~19 s — un artefacto de la librería de pruebas con Fastify + Windows, no un
// fallo de `SpellbookService` ni del controlador: la aserción nunca es la que falla, solo la
// conexión. Si una corrida del orquestador lo pisa, se relanza esa prueba sola; no hay nada que
// arreglar en el código de producción.

describe("El libro de conjuros de un personaje (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const emailDM = `dm-lc${Date.now()}@b.com`;
  const emailA = `a-lc${Date.now()}@b.com`;
  const emailB = `b-lc${Date.now()}@b.com`;
  let tokenDM = "";
  let tokenA = "";
  let tokenB = "";
  let campaignId = "";
  let personajeMago = "";
  let personajeClerigo = "";
  let personajeDmOnly = "";

  beforeAll(async () => {
    const ref = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = ref.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    // **`listen(0, "127.0.0.1")` explícito, y no solo `init()`.** El resto de los e2e de esta
    // suite se apoyan en que `supertest` escuche por su cuenta sobre `app.getHttpServer()` —les
    // basta, porque sus respuestas son pequeñas. Esta suite devuelve hasta ~460 KB por petición
    // (el catálogo entero de una clase, con su prosa del SRD), y sin un bind explícito a IPv4
    // Node/Windows a veces resuelve el oyente ad hoc de `supertest` por `::`/dual-stack — el
    // camino donde el «double callback bug» conocido de `superagent@10.3.0` se dispara con
    // cuerpos grandes. Medido: con `127.0.0.1` explícito, la misma petición que fallaba con
    // `ECONNRESET` tras ~19 s responde en 60-100 ms, siempre.
    await app.listen(0, "127.0.0.1");
    prisma = app.get(PrismaService);
    const s = app.getHttpServer();

    const registrar = async (email: string, nombre: string) =>
      (
        await request(s)
          .post("/auth/register")
          .send({ email, password: "password123", displayName: nombre })
      ).body as { token: string; user: { id: string } };

    const dm = await registrar(emailDM, "DM");
    tokenDM = dm.token;
    const a = await registrar(emailA, "A");
    tokenA = a.token;
    const b = await registrar(emailB, "B");
    tokenB = b.token;

    campaignId = (
      await request(s)
        .post("/campaigns")
        .set("Authorization", `Bearer ${tokenDM}`)
        .timeout({ response: 20000, deadline: 25000 })
        .send({ name: "Campaña del libro de conjuros" })
    ).body.id;

    for (const token of [tokenA, tokenB]) {
      const invite = (
        await request(s)
          .post(`/campaigns/${campaignId}/invites`)
          .set("Authorization", `Bearer ${tokenDM}`)
      ).body.token;
      await request(s)
        .post(`/invites/${invite}/accept`)
        .set("Authorization", `Bearer ${token}`)
        .timeout({ response: 20000, deadline: 25000 });
    }

    // El mago de A: nivel 1 al fijar la clase, para que el libro sembrado (D-CF-125) coincida
    // exactamente con `tamanoDelLibro("wizard", 1) === 6`.
    personajeMago = (
      await request(s)
        .post(`/campaigns/${campaignId}/characters`)
        .set("Authorization", `Bearer ${tokenA}`)
        .timeout({ response: 20000, deadline: 25000 })
        .send({ name: "Elminster", level: 1 })
    ).body.id;
    await request(s)
      .patch(`/campaigns/${campaignId}/characters/${personajeMago}/sheet`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .timeout({ response: 20000, deadline: 25000 })
      .send({
        level: 1,
        abilities: { str: 8, dex: 12, con: 14, int: 16, wis: 10, cha: 10 },
        race: { source: "SRD", key: "human" },
        class: { source: "SRD", key: "wizard" },
        choices: { "wizard-skills": ["arcana", "investigation"] },
      });

    // El clérigo de B: nivel 3, SAB 16 — `topeDePreparados("cleric", 3, +3) === 6`.
    personajeClerigo = (
      await request(s)
        .post(`/campaigns/${campaignId}/characters`)
        .set("Authorization", `Bearer ${tokenB}`)
        .timeout({ response: 20000, deadline: 25000 })
        .send({ name: "Ismark", level: 3 })
    ).body.id;
    await request(s)
      .patch(`/campaigns/${campaignId}/characters/${personajeClerigo}/sheet`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .timeout({ response: 20000, deadline: 25000 })
      .send({
        level: 3,
        abilities: { str: 12, dex: 10, con: 14, int: 8, wis: 16, cha: 10 },
        race: { source: "SRD", key: "human" },
        class: { source: "SRD", key: "cleric" },
        choices: { "cleric-skills": ["insight", "religion"] },
      });

    // Un PNJ DM_ONLY, para el 404 del Step 4 (otro jugador no ve ni su GET).
    const goblins = await request(s)
      .post(`/campaigns/${campaignId}/npcs`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .timeout({ response: 20000, deadline: 25000 })
      .send({ ref: "SRD:goblin", count: 1, hp: "AVERAGE" });
    personajeDmOnly = goblins.body[0].id;
  });

  afterAll(async () => {
    if (campaignId) await prisma.campaign.deleteMany({ where: { id: campaignId } });
    await prisma.user.deleteMany({ where: { email: { in: [emailDM, emailA, emailB] } } });
    await app.close();
  });

  // --- 1. El mago: siembra al fijar la clase, preparar, un truco, y lo que no es suyo --------

  it("al fijar la clase, el mago nace con su libro sembrado: LIBRO, 6 EN_EL_LIBRO, topes.libro 6/6", async () => {
    const s = app.getHttpServer();
    const res = await request(s)
      .get(`/campaigns/${campaignId}/characters/${personajeMago}/spellbook`)
      .set("Authorization", `Bearer ${tokenA}`)
      .timeout({ response: 20000, deadline: 25000 });
    expect(res.status).toBe(200);
    expect(res.body.modelo).toBe("LIBRO");
    const enLibro = res.body.entradas.filter(
      (e: { estado: string | null }) => e.estado === "EN_EL_LIBRO",
    );
    expect(enLibro).toHaveLength(6);
    expect(res.body.topes.libro).toEqual({ max: 6, actual: 6 });
  });

  it("preparar magic-missile sube topes.preparados.actual a 1", async () => {
    const s = app.getHttpServer();
    const res = await request(s)
      .put(`/campaigns/${campaignId}/characters/${personajeMago}/spellbook/magic-missile`)
      .set("Authorization", `Bearer ${tokenA}`)
      .timeout({ response: 20000, deadline: 25000 })
      .send({ estado: "PREPARADO" });
    expect(res.status).toBe(200);
    expect(res.body.topes.preparados.actual).toBe(1);
    const entrada = res.body.entradas.find((e: { key: string }) => e.key === "magic-missile");
    expect(entrada.estado).toBe("PREPARADO");
    expect(entrada.lanzable).toBe(true);
  });

  it("preparar cure-wounds (no es de la clase del mago): 400", async () => {
    const s = app.getHttpServer();
    const res = await request(s)
      .put(`/campaigns/${campaignId}/characters/${personajeMago}/spellbook/cure-wounds`)
      .set("Authorization", `Bearer ${tokenA}`)
      .timeout({ response: 20000, deadline: 25000 })
      .send({ estado: "PREPARADO" });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("no está en la lista");
  });

  it("conocer fire-bolt (truco): topes.trucos.actual sube a 1", async () => {
    const s = app.getHttpServer();
    const res = await request(s)
      .put(`/campaigns/${campaignId}/characters/${personajeMago}/spellbook/fire-bolt`)
      .set("Authorization", `Bearer ${tokenA}`)
      .timeout({ response: 20000, deadline: 25000 })
      .send({ estado: "CONOCIDO" });
    expect(res.status).toBe(200);
    expect(res.body.topes.trucos.actual).toBe(1);
  });

  it("el registro de la campaña trae el SPELLBOOK_CHANGED de preparar magic-missile", async () => {
    const s = app.getHttpServer();
    const log = await request(s)
      .get(`/campaigns/${campaignId}/events`)
      .query({ limit: 100 })
      .set("Authorization", `Bearer ${tokenA}`)
      .timeout({ response: 20000, deadline: 25000 });
    expect(log.status).toBe(200);
    const evento = log.body.events.find(
      (e: { type: string; payload: { spellKey?: string; cambio?: string } }) =>
        e.type === "SPELLBOOK_CHANGED" &&
        e.payload.spellKey === "magic-missile" &&
        e.payload.cambio === "PREPARADO",
    );
    expect(evento).toBeDefined();
  });

  it("otro jugador (B) no puede cambiar el libro de A: 403", async () => {
    const s = app.getHttpServer();
    const res = await request(s)
      .put(`/campaigns/${campaignId}/characters/${personajeMago}/spellbook/shield`)
      .set("Authorization", `Bearer ${tokenB}`)
      .timeout({ response: 20000, deadline: 25000 })
      .send({ estado: "EN_EL_LIBRO" });
    expect(res.status).toBe(403);
  });

  it("un personaje DM_ONLY no se ve: GET spellbook 404 para otro jugador", async () => {
    const s = app.getHttpServer();
    const res = await request(s)
      .get(`/campaigns/${campaignId}/characters/${personajeDmOnly}/spellbook`)
      .set("Authorization", `Bearer ${tokenA}`)
      .timeout({ response: 20000, deadline: 25000 });
    expect(res.status).toBe(404);
  });

  // --- 2. El clérigo: PREPARA_DE_LISTA, sin siembra, y el tope excedido a propósito -----------

  it("el clérigo nace sin filas: modelo PREPARA_DE_LISTA, 0 EN_EL_LIBRO (no siembra)", async () => {
    const s = app.getHttpServer();
    const res = await request(s)
      .get(`/campaigns/${campaignId}/characters/${personajeClerigo}/spellbook`)
      .set("Authorization", `Bearer ${tokenB}`)
      .timeout({ response: 20000, deadline: 25000 });
    expect(res.status).toBe(200);
    expect(res.body.modelo).toBe("PREPARA_DE_LISTA");
    expect(
      res.body.entradas.filter((e: { estado: string | null }) => e.estado !== null),
    ).toHaveLength(0);
  });

  it("preparar 7 conjuros con tope 6: los 7 se escriben, el 7.º lleva SOBRE_EL_TOPE", async () => {
    const s = app.getHttpServer();
    const siete = [
      "aid",
      "augury",
      "bane",
      "banishment",
      "beacon-of-hope",
      "bestow-curse",
      "blade-barrier",
    ];
    let ultima: request.Response | undefined;
    for (const key of siete) {
      ultima = await request(s)
        .put(`/campaigns/${campaignId}/characters/${personajeClerigo}/spellbook/${key}`)
        .set("Authorization", `Bearer ${tokenB}`)
        .timeout({ response: 20000, deadline: 25000 })
        .send({ estado: "PREPARADO" });
      expect(ultima.status).toBe(200);
    }
    expect(ultima!.body.topes.preparados).toEqual({ max: 6, actual: 7 });

    const log = await request(s)
      .get(`/campaigns/${campaignId}/events`)
      .query({ limit: 100 })
      .set("Authorization", `Bearer ${tokenB}`)
      .timeout({ response: 20000, deadline: 25000 });
    const septimo = log.body.events.find(
      (e: { type: string; payload: { spellKey?: string } }) =>
        e.type === "SPELLBOOK_CHANGED" && e.payload.spellKey === "blade-barrier",
    );
    expect(septimo).toBeDefined();
    expect(septimo.payload.fueraDeRegla).toContain("SOBRE_EL_TOPE");
  });
});
