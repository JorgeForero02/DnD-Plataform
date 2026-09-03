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
});
