import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

// Tarea 2C.4 contra Postgres real: **una condición que caduca sola, y el agotamiento que parte
// los PG máximos.**
//
// Lo unitario ya prueba las dos reglas puras. Esto prueba lo que aquel no puede: que la caducidad
// atraviesa de verdad las tres capas —la condición se guarda con su hora, el reloj la deja atrás,
// y la hoja **deja de aplicarla**— y que el jugador ve por qué en la línea de tiempo.

describe("Condiciones con duración (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const emailDM = `dm-cond${Date.now()}@b.com`;
  let tokenDM = "";
  let campaignId = "";
  let characterId = "";

  const sheetUrl = () => `/campaigns/${campaignId}/characters/${characterId}/sheet`;
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
    campaignId = (
      await request(s)
        .post("/campaigns")
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ name: "Campaña de las condiciones" })
    ).body.id;
    // E-RM-1: el POST ya no fija el nivel (nace con nivelInicial); se sube con el PATCH.
    characterId = (
      await request(s)
        .post(`/campaigns/${campaignId}/characters`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ name: "Brann", level: 3 })
    ).body.id;
    await request(s)
      .patch(sheetUrl())
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({
        level: 3,
        abilities: { str: 15, dex: 12, con: 14, int: 8, wis: 10, cha: 8 },
        race: { source: "SRD", key: "dwarf" },
        subrace: { source: "SRD", key: "dwarf-hill" },
        class: { source: "SRD", key: "fighter" },
        choices: { "fighter-skills": ["athletics", "perception"] },
      });
  });

  afterAll(async () => {
    if (campaignId) await prisma.campaign.deleteMany({ where: { id: campaignId } });
    await prisma.user.deleteMany({ where: { email: emailDM } });
    await app.close();
  });

  it("una condición con duración se guarda con **la hora en que vence**, no con su duración", async () => {
    const s = app.getHttpServer();
    const r = await request(s)
      .put(`${condUrl()}/prone`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ durationSeconds: 3600 });
    expect(r.status).toBe(200);

    const fila = await prisma.characterCondition.findFirstOrThrow({ where: { characterId } });
    expect(fila.expiresAtClock).toBe(3600); // el reloj estaba a cero
  });

  it("mientras está viva, **frena de verdad**: la velocidad efectiva de la hoja baja", async () => {
    const hoja = await request(app.getHttpServer())
      .get(sheetUrl())
      .set("Authorization", `Bearer ${tokenDM}`);
    // Un enano camina a 25 pies; derribado se arrastra a la mitad.
    expect(hoja.body.effectiveSpeeds.walk.total).toBeLessThan(hoja.body.sheet.speeds.walk);
  });

  it("**al pasar su hora deja de aplicarse, y el jugador ve por qué**", async () => {
    const s = app.getHttpServer();
    await request(s)
      .post(`/campaigns/${campaignId}/clock/advance`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ kind: "TIME", seconds: 3600 });

    // 1 · Ya no calcula.
    const hoja = await request(s).get(sheetUrl()).set("Authorization", `Bearer ${tokenDM}`);
    expect(hoja.body.effectiveSpeeds.walk.total).toBe(hoja.body.sheet.speeds.walk);

    // 2 · Pero **sigue en la hoja**, marcada como vencida: la quita el DM, no la máquina.
    const lista = await request(s).get(condUrl()).set("Authorization", `Bearer ${tokenDM}`);
    expect(lista.body).toHaveLength(1);
    expect(lista.body[0]).toMatchObject({ key: "prone", expired: true });

    // 3 · Y el porqué está escrito en la línea de tiempo.
    const log = await request(s)
      .get(`/campaigns/${campaignId}/events`)
      .set("Authorization", `Bearer ${tokenDM}`);
    const vencida = log.body.events.find((e: { type: string }) => e.type === "CONDITION_EXPIRED");
    expect(vencida.payload).toMatchObject({ key: "prone", expiredAtClock: 3600 });
  });

  it("avanzar el reloj otra vez **no vuelve a anunciar lo mismo**", async () => {
    const s = app.getHttpServer();
    await request(s)
      .post(`/campaigns/${campaignId}/clock/advance`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ kind: "TIME", seconds: 3600 });

    const log = await request(s)
      .get(`/campaigns/${campaignId}/events`)
      .set("Authorization", `Bearer ${tokenDM}`);
    const anuncios = log.body.events.filter(
      (e: { type: string }) => e.type === "CONDITION_EXPIRED",
    );
    expect(anuncios).toHaveLength(1);
  });

  it("**con agotamiento 4, los PG máximos de la hoja se parten por la mitad** (H-2C-5)", async () => {
    const s = app.getHttpServer();
    const sano = await request(s).get(sheetUrl()).set("Authorization", `Bearer ${tokenDM}`);
    const maximoSano = sano.body.hp.max;

    await request(s)
      .put(`${condUrl()}/exhaustion`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ level: 4 });

    const agotado = await request(s).get(sheetUrl()).set("Authorization", `Bearer ${tokenDM}`);
    expect(agotado.body.hp.max).toBe(Math.floor(maximoSano / 2));
    expect(
      agotado.body.sheet.derived.maxHp.steps.some(
        (p: { sourceKey: string }) => p.sourceKey === "exhaustion:4",
      ),
    ).toBe(true);
  });

  it("y **curar se topa contra ESE máximo**, no contra el entero", async () => {
    // **Esta prueba pasaba por casualidad.** Dejaba al personaje a 1 PG y curaba con dados de
    // golpe reales, así que el resultado casi nunca llegaba al tope: la aserción
    // `toBeLessThanOrEqual` se cumplía con el recorte roto. Lo cazó una revisión.
    //
    // Ahora el estado se fija —un punto por debajo del máximo partido— y se cura una barbaridad
    // por el camino que **no depende de dados**: `PATCH /hp` con un delta enorme. El recorte tiene
    // que dejarlo exactamente en el máximo partido, ni uno más.
    const s = app.getHttpServer();
    const hoja = await request(s).get(sheetUrl()).set("Authorization", `Bearer ${tokenDM}`);
    const maximoAgotado = hoja.body.hp.max;
    expect(maximoAgotado).toBeGreaterThan(1);

    await prisma.character.update({
      where: { id: characterId },
      data: { currentHp: maximoAgotado - 1 },
    });

    const curar = await request(s)
      // `POST /hp` es el delta —«recibo 5», «me curan 999»—; el `PATCH` fija un valor absoluto y
      // exige la versión, que es otra cosa.
      .post(`/campaigns/${campaignId}/characters/${characterId}/hp`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ delta: 999 });
    expect(curar.status).toBe(201);

    const tras = await request(s).get(sheetUrl()).set("Authorization", `Bearer ${tokenDM}`);
    expect(tras.body.hp.current).toBe(maximoAgotado);
    // Y **sin el aviso de «superan el máximo»**: si el recorte hubiera usado el máximo entero, los
    // PG guardados estarían por encima del que la hoja enseña y saldría `exceedsMax`.
    expect(tras.body.hp.exceedsMax).toBe(false);
  });
});
