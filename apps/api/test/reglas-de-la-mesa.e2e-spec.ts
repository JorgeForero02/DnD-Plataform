import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

// Reglas de la mesa (D-CF-53, Tarea 4) — contra Postgres real.
//
// **Por qué esto no puede ser solo una unitaria.** Las unitarias (`character-sheet.service.spec`,
// `characters.service.spec`) prueban las comprobaciones con Prisma simulado; esto prueba que el
// endpoint real, con la campaña y el personaje reales de la base, hace lo mismo — mismo patrón
// que `level-up.e2e-spec.ts`.
//
// **El `DICE_ROLLER` NO se fija aquí**: las pruebas de DADOS comprueban rangos (3..18) y conteos
// (seis valores, cuatro tiradas por dado), nunca un valor exacto — es la única forma honesta de
// probar «el servidor tira de verdad» sin fingir el azar.

describe("Reglas de la mesa (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const emailDM = `dm-rm${Date.now()}@b.com`;
  const emailPL = `pl-rm${Date.now()}@b.com`;
  let tokenDM = "";
  let tokenPL = "";
  let campaignId = "";

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

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
        .set(auth(tokenDM))
        .send({ name: "Campaña de reglas de la mesa" })
    ).body.id;
    const invite = (await request(s).post(`/campaigns/${campaignId}/invites`).set(auth(tokenDM)))
      .body.token;
    await request(s).post(`/invites/${invite}/accept`).set(auth(tokenPL));
  });

  afterAll(async () => {
    if (campaignId) await prisma.campaign.deleteMany({ where: { id: campaignId } });
    await prisma.user.deleteMany({ where: { email: { in: [emailDM, emailPL] } } });
    await app.close();
  });

  /** El DM fija las reglas de la mesa para el resto de la prueba. */
  const fijarReglas = async (tableRules: unknown) => {
    const s = app.getHttpServer();
    const r = await request(s).patch(`/campaigns/${campaignId}`).set(auth(tokenDM)).send({
      tableRules,
    });
    expect(r.status).toBe(200);
  };

  /** Un personaje nuevo del jugador, con solo el nombre — la mesa decide el resto. */
  const crearPersonaje = async (nombre: string): Promise<string> => {
    const s = app.getHttpServer();
    const r = await request(s)
      .post(`/campaigns/${campaignId}/characters`)
      .set(auth(tokenPL))
      .send({ name: nombre });
    expect(r.status).toBe(201);
    return r.body.id as string;
  };

  it("el nivel del cuerpo se ignora: nace con nivelInicial", async () => {
    const s = app.getHttpServer();
    await fijarReglas({ nivelInicial: 3 });
    const r = await request(s)
      .post(`/campaigns/${campaignId}/characters`)
      .set(auth(tokenPL))
      .send({ name: "N", level: 1 });
    expect(r.status).toBe(201);
    expect(r.body.level).toBe(3);
  });

  it("clase fuera de permitidos → 400 con el nombre aunque el cliente la mande; dentro → 200", async () => {
    const s = app.getHttpServer();
    await fijarReglas({ permitidos: { clases: ["fighter"] } });
    const id = await crearPersonaje("P");

    const mal = await request(s)
      .patch(`/campaigns/${campaignId}/characters/${id}/sheet`)
      .set(auth(tokenPL))
      .send({ class: { source: "SRD", key: "wizard" } });
    expect(mal.status).toBe(400);
    expect(mal.body.message).toMatch(/Mago/);

    const bien = await request(s)
      .patch(`/campaigns/${campaignId}/characters/${id}/sheet`)
      .set(auth(tokenPL))
      .send({ class: { source: "SRD", key: "fighter" } });
    expect(bien.status).toBe(200);
  });

  it("MATRIZ: cinco valores → 400; repetido → 400; permutación → 200", async () => {
    const s = app.getHttpServer();
    await fijarReglas({ abilities: { metodo: "MATRIZ" } });
    const id = await crearPersonaje("M");

    const cinco = await request(s)
      .patch(`/campaigns/${campaignId}/characters/${id}/sheet`)
      .set(auth(tokenPL))
      .send({ abilities: { str: 15, dex: 14, con: 13, int: 12, wis: 10 } });
    expect(cinco.status).toBe(400);

    const repetido = await request(s)
      .patch(`/campaigns/${campaignId}/characters/${id}/sheet`)
      .set(auth(tokenPL))
      .send({ abilities: { str: 15, dex: 15, con: 13, int: 12, wis: 10, cha: 8 } });
    expect(repetido.status).toBe(400);

    const permutacion = await request(s)
      .patch(`/campaigns/${campaignId}/characters/${id}/sheet`)
      .set(auth(tokenPL))
      .send({ abilities: { str: 8, dex: 10, con: 12, int: 13, wis: 14, cha: 15 } });
    expect(permutacion.status).toBe(200);
  });

  it("PUNTOS: 28 → 400 con el coste; 27 → 200", async () => {
    const s = app.getHttpServer();
    await fijarReglas({ abilities: { metodo: "PUNTOS", puntos: 27 } });
    const id = await crearPersonaje("Pt");

    const excede = await request(s)
      .patch(`/campaigns/${campaignId}/characters/${id}/sheet`)
      .set(auth(tokenPL))
      .send({ abilities: { str: 15, dex: 15, con: 15, int: 9, wis: 8, cha: 8 } });
    expect(excede.status).toBe(400);
    expect(excede.body.message).toMatch(/28/);

    const dentro = await request(s)
      .patch(`/campaigns/${campaignId}/characters/${id}/sheet`)
      .set(auth(tokenPL))
      .send({ abilities: { str: 15, dex: 14, con: 13, int: 9, wis: 8, cha: 8 } });
    expect(dentro.status).toBe(200);
  });

  it("DADOS 4d6kh3 con 2 intentos: dos intentos devuelven seis valores 3..18, el tercero 409, valores ajenos 400, fijar con el segundo y después PATCH abilities → 400", async () => {
    const s = app.getHttpServer();
    await fijarReglas({ abilities: { metodo: "DADOS", expresion: "4d6kh3", intentos: 2 } });
    const id = await crearPersonaje("D");

    const a1 = await request(s)
      .post(`/campaigns/${campaignId}/characters/${id}/ability-rolls`)
      .set(auth(tokenPL));
    expect(a1.status).toBe(201);
    expect(a1.body.values).toHaveLength(6);
    for (const v of a1.body.values) {
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(18);
    }
    expect(a1.body.rolls[0].rolls).toHaveLength(4);
    expect(a1.body.rolls[0].kept).toHaveLength(3);
    expect(a1.body).toMatchObject({ attempt: 1, of: 2 });

    const a2 = await request(s)
      .post(`/campaigns/${campaignId}/characters/${id}/ability-rolls`)
      .set(auth(tokenPL));
    expect(a2.status).toBe(201);
    expect(a2.body.attempt).toBe(2);

    const a3 = await request(s)
      .post(`/campaigns/${campaignId}/characters/${id}/ability-rolls`)
      .set(auth(tokenPL));
    expect(a3.status).toBe(409);
    expect(a3.body.code).toBe("NO_MORE_ATTEMPTS");

    const ajenos = await request(s)
      .patch(`/campaigns/${campaignId}/characters/${id}/sheet`)
      .set(auth(tokenPL))
      .send({
        attemptId: a2.body.id,
        abilities: { str: 18, dex: 18, con: 18, int: 18, wis: 18, cha: 18 },
      });
    expect(ajenos.status).toBe(400);

    const [str, dex, con, int, wis, cha] = [...a2.body.values].sort(
      (x: number, y: number) => y - x,
    );
    const fijar = await request(s)
      .patch(`/campaigns/${campaignId}/characters/${id}/sheet`)
      .set(auth(tokenPL))
      .send({ attemptId: a2.body.id, abilities: { str, dex, con, int, wis, cha } });
    expect(fijar.status).toBe(200);
    expect(fijar.body.character.str).toBe(str);

    const despues = await request(s)
      .patch(`/campaigns/${campaignId}/characters/${id}/sheet`)
      .set(auth(tokenPL))
      .send({ abilities: { str: 8, dex, con, int, wis, cha } });
    expect(despues.status).toBe(400);
    expect(despues.body.message).toMatch(/fijaron con dados/);

    // Ola de arreglos 1 (I-1): tampoco puede volver al PRIMER intento mandando su `attemptId` con
    // sus propios valores — hasta este arreglo la comprobación del elegido solo corría sin
    // `attemptId`, y el dueño alternaba entre sus dos intentos cuando quería.
    const [s1, d1, c1, i1, w1, ch1] = [...a1.body.values].sort((x: number, y: number) => y - x);
    const otroIntento = await request(s)
      .patch(`/campaigns/${campaignId}/characters/${id}/sheet`)
      .set(auth(tokenPL))
      .send({
        attemptId: a1.body.id,
        abilities: { str: s1, dex: d1, con: c1, int: i1, wis: w1, cha: ch1 },
      });
    expect(otroIntento.status).toBe(400);
    expect(otroIntento.body.message).toMatch(/fijaron con dados/);
    const trasElIntentoDeCambiar = await request(s)
      .get(`/campaigns/${campaignId}/characters/${id}/ability-rolls`)
      .set(auth(tokenPL));
    expect(trasElIntentoDeCambiar.body.map((a: { chosen: boolean }) => a.chosen)).toEqual([
      false,
      true,
    ]);
    const hojaIntacta = await request(s)
      .get(`/campaigns/${campaignId}/characters/${id}/sheet`)
      .set(auth(tokenPL));
    expect(hojaIntacta.body.character.str).toBe(str);

    // Reglas de la mesa (E-RM-13, ronda 1): `overrides` no cubre `ability.*` — `maxHp` sí está en
    // `OVERRIDABLE_KEYS`, pero ninguna clave de característica lo está —, así que «el DM arbitra
    // con overrides» era una puerta que no existía. La puerta real es esta misma ruta: el DM
    // manda las seis juntas, sin `attemptId`, y se guardan sin comprobarlas contra el intento.
    const arbitra = await request(s)
      .patch(`/campaigns/${campaignId}/characters/${id}/sheet`)
      .set(auth(tokenDM))
      .send({ abilities: { str: 20, dex, con, int, wis, cha } });
    expect(arbitra.status).toBe(200);
    expect(arbitra.body.character.str).toBe(20);

    // Y el dueño sigue sin poder, incluso después del arbitraje del DM.
    const siguesinpoder = await request(s)
      .patch(`/campaigns/${campaignId}/characters/${id}/sheet`)
      .set(auth(tokenPL))
      .send({ abilities: { str: 20, dex, con, int, wis, cha } });
    expect(siguesinpoder.status).toBe(400);
    expect(siguesinpoder.body.message).toMatch(/fijaron con dados/);

    // Los intentos se listan para dueño y DM, y el elegido va marcado.
    const lista = await request(s)
      .get(`/campaigns/${campaignId}/characters/${id}/ability-rolls`)
      .set(auth(tokenDM));
    expect(lista.status).toBe(200);
    expect(lista.body.map((a: { chosen: boolean }) => a.chosen)).toEqual([false, true]);

    // Y las seis tiradas del intento elegido quedaron en el registro, para DM y dueño.
    const registro = await request(s)
      .get(`/campaigns/${campaignId}/rolls?characterId=${id}`)
      .set(auth(tokenDM));
    expect(registro.status).toBe(200);
    expect(
      registro.body.events.filter(
        (e: { payload: { reason?: string } }) => e.payload.reason === "Característica",
      ).length,
    ).toBeGreaterThanOrEqual(12);
  });

  it("nivel 3 con TIRADA y ORO_TABLA: al fijar la clase, hitPointsPerLevel tiene 2 valores, la bolsa tiene oro y maxHp de la hoja lo refleja", async () => {
    const s = app.getHttpServer();
    await fijarReglas({
      nivelInicial: 3,
      pgNivelesSiguientes: "TIRADA",
      oroInicial: { modo: "ORO_TABLA" },
    });
    const id = await crearPersonaje("T");

    const r = await request(s)
      .patch(`/campaigns/${campaignId}/characters/${id}/sheet`)
      .set(auth(tokenPL))
      .send({
        abilities: { str: 15, dex: 12, con: 14, int: 8, wis: 10, cha: 8 },
        race: { source: "SRD", key: "human" },
        class: { source: "SRD", key: "fighter" },
      });
    expect(r.status).toBe(200);

    const fila = await prisma.character.findUnique({ where: { id } });
    expect((fila!.hitPointsPerLevel as number[]).length).toBe(2);
    expect(fila!.gp).toBeGreaterThanOrEqual(50); // 5d4×10, mínimo 50
    expect(fila!.gp).toBeLessThanOrEqual(200);

    const hoja = await request(s)
      .get(`/campaigns/${campaignId}/characters/${id}/sheet`)
      .set(auth(tokenPL));
    expect(hoja.status).toBe(200);
    const pasos = hoja.body.sheet.derived.maxHp.steps.map((p: { labelKey: string }) => p.labelKey);
    expect(pasos).toContain("maxHp.perLevelAtCreation");
  });

  it("DADOS con intentos: 1 — dos POST a la vez: exactamente un 201 y un 409 (cerrojo FOR UPDATE)", async () => {
    const s = app.getHttpServer();
    await fijarReglas({ abilities: { metodo: "DADOS", expresion: "4d6kh3", intentos: 1 } });
    const id = await crearPersonaje("Carrera");
    const url = `/campaigns/${campaignId}/characters/${id}/ability-rolls`;

    const [a, b] = await Promise.all([
      request(s).post(url).set(auth(tokenPL)),
      request(s).post(url).set(auth(tokenPL)),
    ]);

    const codigos = [a.status, b.status].sort();
    expect(codigos).toEqual([201, 409]);
    const lista = await request(s).get(url).set(auth(tokenPL));
    expect(lista.status).toBe(200);
    expect(lista.body).toHaveLength(1);
  });

  it("MATRIZ: mandar las seis con un `attemptId` → 400 con la frase, y ningún intento queda marcado", async () => {
    const s = app.getHttpServer();
    await fijarReglas({ abilities: { metodo: "MATRIZ" } });
    const id = await crearPersonaje("Sin dados");
    const res = await request(s)
      .patch(`/campaigns/${campaignId}/characters/${id}/sheet`)
      .set(auth(tokenPL))
      .send({
        attemptId: "cualquiera",
        abilities: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 },
      });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("no se tiran con dados");
  });
});
