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
// **Ronda de arreglo 1 (revisión del orquestador) — `GET .../spellbook` ya no lleva la prosa
// del SRD de cada conjuro.** Hasta esta ronda, la lista del mago (204 conjuros) pesaba ~460 KB
// por petición y `supertest`/`superagent@10.3.0` disparaba de vez en cuando su «double callback
// bug» con cuerpos de esa talla — de ahí las mitigaciones (`.timeout()`, `listen(0,
// "127.0.0.1")`) que llevaba esta suite. Con `list()` sin `textEs`/`textEn`/`higherLevels*`
// (ver `spellbook.service.ts`, `entradaBase`) la respuesta más grande de esta suite baja a
// unos pocos KB, y las mitigaciones ya no hacen falta: esta suite usa el mismo patrón que el
// resto de e2e de API (`app.init()` a secas, sin `.timeout()`).

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
        .send({ name: "Campaña del libro de conjuros" })
    ).body.id;

    for (const token of [tokenA, tokenB]) {
      const invite = (
        await request(s)
          .post(`/campaigns/${campaignId}/invites`)
          .set("Authorization", `Bearer ${tokenDM}`)
      ).body.token;
      await request(s).post(`/invites/${invite}/accept`).set("Authorization", `Bearer ${token}`);
    }

    // El mago de A: nivel 1 al fijar la clase, para que el libro sembrado (D-CF-125) coincida
    // exactamente con `tamanoDelLibro("wizard", 1) === 6`.
    personajeMago = (
      await request(s)
        .post(`/campaigns/${campaignId}/characters`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ name: "Elminster", level: 1 })
    ).body.id;
    await request(s)
      .patch(`/campaigns/${campaignId}/characters/${personajeMago}/sheet`)
      .set("Authorization", `Bearer ${tokenDM}`)
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
        .send({ name: "Ismark", level: 3 })
    ).body.id;
    await request(s)
      .patch(`/campaigns/${campaignId}/characters/${personajeClerigo}/sheet`)
      .set("Authorization", `Bearer ${tokenDM}`)
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
      .set("Authorization", `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(res.body.modelo).toBe("LIBRO");
    const enLibro = res.body.entradas.filter(
      (e: { estado: string | null }) => e.estado === "EN_EL_LIBRO",
    );
    expect(enLibro).toHaveLength(6);
    expect(res.body.topes.libro).toEqual({ max: 6, actual: 6 });
  });

  it("ronda de arreglo 1 — la lista NO trae la prosa del SRD de cada conjuro", async () => {
    const s = app.getHttpServer();
    const res = await request(s)
      .get(`/campaigns/${campaignId}/characters/${personajeMago}/spellbook`)
      .set("Authorization", `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(res.body.entradas.length).toBeGreaterThan(0);
    for (const entrada of res.body.entradas) {
      expect(entrada.textEs).toBeUndefined();
      expect(entrada.textEn).toBeUndefined();
      expect(entrada.higherLevelsEs).toBeUndefined();
      expect(entrada.higherLevelsEn).toBeUndefined();
    }
  });

  it("preparar magic-missile sube topes.preparados.actual a 1", async () => {
    const s = app.getHttpServer();
    const res = await request(s)
      .put(`/campaigns/${campaignId}/characters/${personajeMago}/spellbook/magic-missile`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ estado: "PREPARADO" });
    expect(res.status).toBe(200);
    expect(res.body.topes.preparados.actual).toBe(1);
    const entrada = res.body.entradas.find((e: { key: string }) => e.key === "magic-missile");
    expect(entrada.estado).toBe("PREPARADO");
    expect(entrada.lanzable).toBe(true);
  });

  it("ronda de arreglo 1 — GET spellbook/magic-missile trae el detalle con su prosa y el estado", async () => {
    const s = app.getHttpServer();
    const res = await request(s)
      .get(`/campaigns/${campaignId}/characters/${personajeMago}/spellbook/magic-missile`)
      .set("Authorization", `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(res.body.estado).toBe("PREPARADO");
    expect(typeof res.body.textEs === "string" || res.body.textEs === null).toBe(true);
    expect(res.body.textEs).not.toBe("");
    expect(res.body.textEn).toEqual(expect.any(String));
    expect(res.body.textEn.length).toBeGreaterThan(0);
  });

  it("GET spellbook/:spellKey con una clave que no existe en el catálogo es 404", async () => {
    const s = app.getHttpServer();
    const res = await request(s)
      .get(`/campaigns/${campaignId}/characters/${personajeMago}/spellbook/no-existe`)
      .set("Authorization", `Bearer ${tokenA}`);
    expect(res.status).toBe(404);
  });

  it("preparar cure-wounds (no es de la clase del mago): 400", async () => {
    const s = app.getHttpServer();
    const res = await request(s)
      .put(`/campaigns/${campaignId}/characters/${personajeMago}/spellbook/cure-wounds`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ estado: "PREPARADO" });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("no está en la lista");
  });

  it("conocer fire-bolt (truco): topes.trucos.actual sube a 1", async () => {
    const s = app.getHttpServer();
    const res = await request(s)
      .put(`/campaigns/${campaignId}/characters/${personajeMago}/spellbook/fire-bolt`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ estado: "CONOCIDO" });
    expect(res.status).toBe(200);
    expect(res.body.topes.trucos.actual).toBe(1);
  });

  it("el registro de la campaña trae el SPELLBOOK_CHANGED de preparar magic-missile", async () => {
    const s = app.getHttpServer();
    const log = await request(s)
      .get(`/campaigns/${campaignId}/events`)
      .query({ limit: 100 })
      .set("Authorization", `Bearer ${tokenA}`);
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
      .send({ estado: "EN_EL_LIBRO" });
    expect(res.status).toBe(403);
  });

  it("un personaje DM_ONLY no se ve: GET spellbook 404 para otro jugador", async () => {
    const s = app.getHttpServer();
    const res = await request(s)
      .get(`/campaigns/${campaignId}/characters/${personajeDmOnly}/spellbook`)
      .set("Authorization", `Bearer ${tokenA}`);
    expect(res.status).toBe(404);
  });

  // --- 2. El clérigo: PREPARA_DE_LISTA, sin siembra, y el tope excedido a propósito -----------

  it("el clérigo nace sin filas: modelo PREPARA_DE_LISTA, 0 EN_EL_LIBRO (no siembra)", async () => {
    const s = app.getHttpServer();
    const res = await request(s)
      .get(`/campaigns/${campaignId}/characters/${personajeClerigo}/spellbook`)
      .set("Authorization", `Bearer ${tokenB}`);
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
        .send({ estado: "PREPARADO" });
      expect(ultima.status).toBe(200);
    }
    expect(ultima!.body.topes.preparados).toEqual({ max: 6, actual: 7 });

    const log = await request(s)
      .get(`/campaigns/${campaignId}/events`)
      .query({ limit: 100 })
      .set("Authorization", `Bearer ${tokenB}`);
    const septimo = log.body.events.find(
      (e: { type: string; payload: { spellKey?: string } }) =>
        e.type === "SPELLBOOK_CHANGED" && e.payload.spellKey === "blade-barrier",
    );
    expect(septimo).toBeDefined();
    expect(septimo.payload.fueraDeRegla).toContain("SOBRE_EL_TOPE");
  });
});
