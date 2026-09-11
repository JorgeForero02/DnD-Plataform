import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

// Las dos cosas que la pantalla de la hoja estaba resolviendo por su cuenta porque el servidor
// no las daba: el catálogo en español y la velocidad ya afectada por las condiciones.
//
// **Es e2e y no unitaria** porque lo que hay que demostrar es justamente el viaje: que la web
// puede dejar de calcular. Una unitaria del servicio ya existe; lo que faltaba era la prueba de
// que el dato sale por HTTP con la forma que el navegador consume.

describe("Catálogo SRD y velocidad efectiva (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const emailDM = `dm-cat${Date.now()}@b.com`;
  let tokenDM = "";
  let campaignId = "";
  let characterId = "";

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

    campaignId = (
      await request(s)
        .post("/campaigns")
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ name: "Campaña del catálogo" })
    ).body.id;

    characterId = (
      await request(s)
        .post(`/campaigns/${campaignId}/characters`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ name: "Enano de prueba", level: 1 })
    ).body.id;

    await request(s)
      .patch(`/campaigns/${campaignId}/characters/${characterId}/sheet`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({
        abilities: { str: 14, dex: 12, con: 14, int: 10, wis: 10, cha: 8 },
        race: { source: "SRD", key: "dwarf" },
        class: { source: "SRD", key: "fighter" },
        level: 1,
      })
      .expect(200);
  });

  afterAll(async () => {
    await prisma.campaign.deleteMany({ where: { id: campaignId } });
    await app.close();
  });

  it("GET /catalog/items sirve los objetos del SRD enteros, para poder meterlos en la mochila", async () => {
    const res = await request(app.getHttpServer())
      .get("/catalog/items")
      .set("Authorization", `Bearer ${tokenDM}`);

    expect(res.status).toBe(200);
    const espada = res.body.items.find((i: { ref: string }) => i.ref === "SRD:long-sword");
    // La lista de dónde se elige tiene que poder decir «1d8 cortante» sin pedir el objeto otra
    // vez: por eso estos van enteros y las razas y clases van recortadas.
    expect(espada).toMatchObject({
      name: "Espada larga",
      kind: "WEAPON",
      weapon: { damageDice: "1d8", damageType: "SLASHING" },
    });
    const cota = res.body.items.find((i: { ref: string }) => i.ref === "SRD:chain-mail");
    expect(cota.armor).toMatchObject({ baseAc: 16, dexCap: 0 });
  });

  it("GET /catalog/items sin sesión es 401, como el resto del catálogo", async () => {
    await request(app.getHttpServer()).get("/catalog/items").expect(401);
  });

  it("GET /catalog lista razas con sus subrazas, clases y armaduras, en español", async () => {
    const r = await request(app.getHttpServer())
      .get("/catalog")
      .set("Authorization", `Bearer ${tokenDM}`)
      .expect(200);

    // Nueve razas y doce clases: las del SRD 5.1, ni una inventada.
    expect(r.body.races).toHaveLength(9);
    expect(r.body.classes).toHaveLength(12);
    expect(r.body.races).toContainEqual(
      expect.objectContaining({
        key: "dwarf",
        name: "Enano",
        subraces: [{ key: "dwarf-hill", name: "Enano de las colinas" }],
      }),
    );
    // Una raza sin subrazas las lista vacías, no las omite: el selector no tiene que adivinar.
    expect(r.body.races.find((x: { key: string }) => x.key === "human").subraces).toEqual([]);
    expect(r.body.armor).toContainEqual(
      expect.objectContaining({ key: "chain-mail", category: "HEAVY" }),
    );
  });

  it("sin credenciales no se sirve, como todo lo demás de esta API", async () => {
    await request(app.getHttpServer()).get("/catalog").expect(401);
  });

  it("la hoja trae la velocidad ya afectada por las condiciones, con su traza", async () => {
    const s = app.getHttpServer();

    // Enano: 25 pies. Sin condiciones, la efectiva es la base.
    const antes = await request(s)
      .get(`/campaigns/${campaignId}/characters/${characterId}/sheet`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .expect(200);
    expect(antes.body.effectiveSpeeds.walk.total).toBe(25);

    // Apresado deja la velocidad en 0 — y la traza tiene que nombrar la causa, no solo dar el
    // número: un jugador que ve un 0 sin motivo no sabe si es un fallo o una regla.
    await request(s)
      .put(`/campaigns/${campaignId}/characters/${characterId}/conditions/restrained`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({})
      .expect(200);

    const despues = await request(s)
      .get(`/campaigns/${campaignId}/characters/${characterId}/sheet`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .expect(200);

    expect(despues.body.effectiveSpeeds.walk.total).toBe(0);
    expect(
      despues.body.effectiveSpeeds.walk.steps.some(
        (paso: { sourceKey: string }) => paso.sourceKey === "restrained",
      ),
    ).toBe(true);
    // Y la base sigue siendo la base: la efectiva no la sobrescribe.
    expect(despues.body.sheet.speeds.walk).toBe(25);
  });

  it("terminar la ficha siembra los dados de golpe de la clase", async () => {
    // El agujero que estuvo abierto desde 2A.8: `seedResourcesFor` no lo llamaba nadie, así que
    // ningún personaje tenía dados de golpe que gastar en un descanso corto.
    const r = await request(app.getHttpServer())
      .get(`/campaigns/${campaignId}/characters/${characterId}/resources`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .expect(200);

    expect(r.body).toContainEqual(
      expect.objectContaining({ key: "hit-dice-d10", current: 1, max: 1 }),
    );
  });

  // Migración 6 (D-CF-16, tickets I4/M2B-5) — SRD 5.1, Variant: Encumbrance, con interruptor por
  // campaña apagado por defecto. Personaje propio (no `characterId`, que ya lleva `restrained`
  // desde la prueba de más arriba y dejaría la velocidad en 0 pase lo que pase con el peso).
  describe("la variante de sobrecarga (SRD 5.1, Variant: Encumbrance)", () => {
    let cargadorId = "";

    beforeAll(async () => {
      const s = app.getHttpServer();
      cargadorId = (
        await request(s)
          .post(`/campaigns/${campaignId}/characters`)
          .set("Authorization", `Bearer ${tokenDM}`)
          .send({ name: "Mula de carga", level: 1 })
      ).body.id;
      await request(s)
        .patch(`/campaigns/${campaignId}/characters/${cargadorId}/sheet`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({
          abilities: { str: 14, dex: 12, con: 14, int: 10, wis: 10, cha: 8 },
          race: { source: "SRD", key: "human" },
          class: { source: "SRD", key: "fighter" },
          level: 1,
        })
        .expect(200);
    });

    // Fuerza 14: cargado a partir de 70 lb (1120 oz), muy cargado a partir de 140 lb (2240 oz).
    // La armadura de placas pesa 65 lb (SRD 5.1) — dos son 130 lb (cargado), tres son 195 lb
    // (muy cargado). Va a la mochila (`CARRIED`, el valor por defecto), nunca equipada: lo que
    // cuenta es lo que se lleva, no lo que da CA.
    async function llevarPlacas(cantidad: number) {
      await request(app.getHttpServer())
        .post(`/campaigns/${campaignId}/characters/${cargadorId}/inventory`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ ref: { source: "SRD", key: "plate" }, quantity: cantidad })
        .expect(201);
    }

    it("con la variante apagada (por defecto), tres placas de más de 10×Fuerza no tocan nada", async () => {
      await llevarPlacas(3);
      const hoja = await request(app.getHttpServer())
        .get(`/campaigns/${campaignId}/characters/${cargadorId}/sheet`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .expect(200);
      expect(hoja.body.effectiveSpeeds.walk.total).toBe(30);
      expect(hoja.body.rollSuggestions.attack.mode).toBe("NORMAL");
      expect(
        hoja.body.sheet.warnings.some((w: { code: string }) => w.code.startsWith("encumbrance")),
      ).toBe(false);
    });

    it("con la variante encendida y dos placas (130 lb): cargado, −10 pies, sin desventaja todavía", async () => {
      await request(app.getHttpServer())
        .patch(`/campaigns/${campaignId}`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ encumbranceVariant: true })
        .expect(200);
      // Quita una placa de las tres que dejó la prueba anterior: 2×65 = 130 lb.
      const filas = await request(app.getHttpServer())
        .get(`/campaigns/${campaignId}/characters/${cargadorId}/inventory`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .expect(200);
      const fila = filas.body.items.find(
        (i: { item: { ref: string } }) => i.item.ref === "SRD:plate",
      );
      await request(app.getHttpServer())
        .patch(`/campaigns/${campaignId}/characters/${cargadorId}/inventory/${fila.id}`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ quantity: 2 })
        .expect(200);

      const hoja = await request(app.getHttpServer())
        .get(`/campaigns/${campaignId}/characters/${cargadorId}/sheet`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .expect(200);
      expect(hoja.body.effectiveSpeeds.walk.total).toBe(20);
      expect(
        hoja.body.effectiveSpeeds.walk.steps.some(
          (p: { sourceKey: string; labelKey: string }) =>
            p.sourceKey === "encumbrance" && p.labelKey === "speed.encumbered",
        ),
      ).toBe(true);
      expect(hoja.body.rollSuggestions.attack.mode).toBe("NORMAL");
      expect(
        hoja.body.sheet.warnings.some((w: { code: string }) => w.code === "encumbrance.encumbered"),
      ).toBe(true);
    });

    it("con tres placas (195 lb): muy cargado, −20 pies y desventaja en ataques/pruebas/salvaciones de FUE/DES/CON", async () => {
      await llevarPlacas(1); // vuelve a las tres placas: 195 lb, sobre 140 lb (10×Fuerza)

      const hoja = await request(app.getHttpServer())
        .get(`/campaigns/${campaignId}/characters/${cargadorId}/sheet`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .expect(200);
      expect(hoja.body.effectiveSpeeds.walk.total).toBe(10);
      expect(
        hoja.body.effectiveSpeeds.walk.steps.some(
          (p: { sourceKey: string; labelKey: string }) =>
            p.sourceKey === "encumbrance" && p.labelKey === "speed.heavily-encumbered",
        ),
      ).toBe(true);
      expect(hoja.body.rollSuggestions.attack.mode).toBe("DISADVANTAGE");
      // Fix round 1 (ALTA-2) — el SRD solo nombra Fuerza, Destreza y Constitución: el genérico
      // `check` no distingue característica, así que no puede anotar esta causa (se queda
      // NORMAL); `checks.str` sí, porque `checks` es una entrada por característica.
      expect(hoja.body.rollSuggestions.check.mode).toBe("NORMAL");
      expect(hoja.body.rollSuggestions.checks.str.mode).toBe("DISADVANTAGE");
      expect(hoja.body.rollSuggestions.checks.cha.mode).toBe("NORMAL");
      expect(hoja.body.rollSuggestions.saves.str.mode).toBe("DISADVANTAGE");
      expect(hoja.body.rollSuggestions.saves.wis.mode).toBe("NORMAL");
      expect(
        hoja.body.sheet.warnings.some((w: { code: string }) => w.code === "encumbrance.heavily"),
      ).toBe(true);

      // Se apaga la variante para no afectar a ninguna prueba que corra después en este fichero.
      await request(app.getHttpServer())
        .patch(`/campaigns/${campaignId}`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ encumbranceVariant: false })
        .expect(200);
    });
  });

  // Fix round 1 (ALTA-1) — SRD 5.1, «Variant: Encumbrance»: *"When you use this variant, ignore
  // the Strength column of the Armor table in chapter 5."* Personaje propio, EQUIPADO con una
  // placa (requiere Fuerza 15, este personaje tiene 14): con la variante apagada, el motor sigue
  // restando los 10 pies de siempre; con ella encendida, el SRD manda ignorar esa columna y el
  // motor no debe restarlos — el peso de una sola placa (65 lb) tampoco activa el umbral de
  // sobrecarga (70 lb = 5×14), así que la única causa posible del cambio es esta.
  describe("con la variante encendida, el SRD manda ignorar la penalización de Fuerza de la armadura (ALTA-1)", () => {
    let armaduradoId = "";

    beforeAll(async () => {
      const s = app.getHttpServer();
      armaduradoId = (
        await request(s)
          .post(`/campaigns/${campaignId}/characters`)
          .set("Authorization", `Bearer ${tokenDM}`)
          .send({ name: "Con placa puesta", level: 1 })
      ).body.id;
      await request(s)
        .patch(`/campaigns/${campaignId}/characters/${armaduradoId}/sheet`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({
          abilities: { str: 14, dex: 12, con: 14, int: 10, wis: 10, cha: 8 },
          race: { source: "SRD", key: "human" },
          class: { source: "SRD", key: "fighter" },
          level: 1,
        })
        .expect(200);
      await request(s)
        .post(`/campaigns/${campaignId}/characters/${armaduradoId}/inventory`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ ref: { source: "SRD", key: "plate" }, quantity: 1, location: "EQUIPPED" })
        .expect(201);
    });

    it("variante apagada (por defecto): la placa sí resta 10 pies, como siempre", async () => {
      const hoja = await request(app.getHttpServer())
        .get(`/campaigns/${campaignId}/characters/${armaduradoId}/sheet`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .expect(200);
      expect(hoja.body.effectiveSpeeds.walk.total).toBe(20);
      expect(
        hoja.body.sheet.warnings.some(
          (w: { code: string }) => w.code === "armor_strength_requirement_unmet",
        ),
      ).toBe(true);
    });

    it("variante encendida: NINGÚN paso de `strengthPenalty`, la velocidad vuelve a 30 — Y SIN aviso (fix round 2, MEDIA-A)", async () => {
      await request(app.getHttpServer())
        .patch(`/campaigns/${campaignId}`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ encumbranceVariant: true })
        .expect(200);

      const hoja = await request(app.getHttpServer())
        .get(`/campaigns/${campaignId}/characters/${armaduradoId}/sheet`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .expect(200);
      // 30, no 20: si el motor siguiera restando los 10 pies de la Fuerza incumplida, esto
      // fallaría aquí — es la prueba más directa de que `strengthPenalty` no se emitió.
      expect(hoja.body.effectiveSpeeds.walk.total).toBe(30);
      expect(hoja.body.sheet.speeds.walk).toBe(30);
      // Fix round 2 (MEDIA-A) — el aviso YA NO SE QUEDA: con la columna de Fuerza ignorada del
      // todo, «la velocidad al caminar baja 10 pies» (`vocabulario.ts`) sería un texto mintiendo
      // sobre una regla del servidor que ya no aplica. Ignorar de verdad es ignorar el aviso
      // también, no solo el número.
      expect(
        hoja.body.sheet.warnings.some(
          (w: { code: string }) => w.code === "armor_strength_requirement_unmet",
        ),
      ).toBe(false);

      await request(app.getHttpServer())
        .patch(`/campaigns/${campaignId}`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ encumbranceVariant: false })
        .expect(200);
    });
  });
});
