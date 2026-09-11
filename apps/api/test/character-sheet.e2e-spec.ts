import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

// Tareas 2A.6 y 2A.7 — la hoja persistida y los PG mutables, contra Postgres real.
//
// **Por qué esto no puede ser una unitaria.** Dos cosas concretas exigen la base real: que dos
// deltas de PG lanzados a la vez (`Promise.all`) aterricen los dos —el Prisma simulado no sabe
// bloquear una fila, así que una carrera ahí pasaría en verde aunque el `FOR UPDATE` desapareciera
// del servicio—, y que el filtro de autorización sobreviva al viaje completo HTTP → guardia →
// pipe → servicio → base con los códigos de estado reales.

describe("Hoja de personaje y PG (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const emailDM = `dm-sh${Date.now()}@b.com`;
  const emailA = `pa-sh${Date.now()}@b.com`;
  const emailB = `pb-sh${Date.now()}@b.com`;
  let tokenDM = "";
  let tokenA = "";
  let tokenB = "";
  let campaignId = "";
  let characterId = "";
  let maxHp = 0;

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
    tokenA = (
      await request(s)
        .post("/auth/register")
        .send({ email: emailA, password: "password123", displayName: "A" })
    ).body.token;
    tokenB = (
      await request(s)
        .post("/auth/register")
        .send({ email: emailB, password: "password123", displayName: "B" })
    ).body.token;

    campaignId = (
      await request(s)
        .post("/campaigns")
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ name: "Campaña de la hoja" })
    ).body.id;

    for (const token of [tokenA, tokenB]) {
      const invite = (
        await request(s)
          .post(`/campaigns/${campaignId}/invites`)
          .set("Authorization", `Bearer ${tokenDM}`)
      ).body.token;
      await request(s).post(`/invites/${invite}/accept`).set("Authorization", `Bearer ${token}`);
    }

    characterId = (
      await request(s)
        .post(`/campaigns/${campaignId}/characters`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ name: "Thorin", level: 1, visibility: "PLAYERS" })
    ).body.id;
  });

  afterAll(async () => {
    if (campaignId) await prisma.campaign.deleteMany({ where: { id: campaignId } });
    await prisma.user.deleteMany({ where: { email: { in: [emailDM, emailA, emailB] } } });
    await app.close();
  });

  const sheetUrl = () => `/campaigns/${campaignId}/characters/${characterId}/sheet`;
  const hpUrl = () => `/campaigns/${campaignId}/characters/${characterId}/hp`;
  const deathSavesUrl = () => `/campaigns/${campaignId}/characters/${characterId}/death-saves`;

  it("sin raza ni clase la hoja no se puede derivar: sheet null y un motivo, no un 500", async () => {
    const res = await request(app.getHttpServer())
      .get(sheetUrl())
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.sheet).toBeNull();
    expect(typeof res.body.reason).toBe("string");
    expect(res.body.hp.max).toBeNull();
  });

  it("el dueño rellena la hoja con PATCH, y GET la deriva con maxHp y CA calculados", async () => {
    const s = app.getHttpServer();
    const patch = await request(s)
      .patch(sheetUrl())
      .set("Authorization", `Bearer ${tokenA}`)
      .send({
        abilities: { str: 15, dex: 12, con: 14, int: 8, wis: 10, cha: 8 },
        race: { source: "SRD", key: "dwarf" },
        subrace: { source: "SRD", key: "dwarf-hill" },
        class: { source: "SRD", key: "fighter" },
        choices: { "fighter-skills": ["athletics", "perception"] },
      });
    expect(patch.status).toBe(200);
    expect(patch.body.sheet).not.toBeNull();

    const get = await request(s).get(sheetUrl()).set("Authorization", `Bearer ${tokenA}`);
    expect(get.status).toBe(200);
    expect(get.body.sheet).not.toBeNull();
    expect(get.body.hp.max).toBeGreaterThan(0);
    expect(get.body.character.str).toBe(15);
    maxHp = get.body.hp.max;
  });

  it("una clave de raza que el catálogo no reconoce es 400, no un 500", async () => {
    const res = await request(app.getHttpServer())
      .patch(sheetUrl())
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ race: { source: "SRD", key: "no-existe-esta-raza" } });
    expect(res.status).toBe(400);
  });

  // Encargo A8 (2026-09-07), vuelta de arreglo 1 — I2. Estas dos pruebas usan un personaje
  // APARTE (no `characterId`, el de la historia de arriba): las de más abajo dependen de que
  // siga siendo un guerrero con su cota de malla y su espada equipadas, y cambiar su clase a
  // mitad de la suite las rompería sin que tuviera nada que ver con lo que se está probando.
  //
  // Son la mitad que cierra el argumento con el que se borró el e2e de navegador del selector:
  // el estado «una subclase de otra clase, guardada de antes» no se puede alcanzar hoy por la
  // API pública, y estas dos pruebas son las que demuestran que **las guardas que lo impiden
  // siguen ahí** — contra Postgres real, no contra un Prisma simulado.
  it("una subclase que no es de la clase del personaje es 400, y no se guarda", async () => {
    const s = app.getHttpServer();
    const otroId = (
      await request(s)
        .post(`/campaigns/${campaignId}/characters`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ name: "Bruga Puñoduro", level: 3, visibility: "PLAYERS" })
    ).body.id;
    const otraSheetUrl = `/campaigns/${campaignId}/characters/${otroId}/sheet`;

    await request(s)
      .patch(otraSheetUrl)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({
        abilities: { str: 16, dex: 12, con: 14, int: 8, wis: 10, cha: 8 },
        race: { source: "SRD", key: "human" },
        class: { source: "SRD", key: "barbarian" },
      });

    // "champion" es la subclase del guerrero, no del bárbaro.
    const res = await request(s)
      .patch(otraSheetUrl)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ subclass: { source: "SRD", key: "champion" } });
    expect(res.status).toBe(400);

    const get = await request(s).get(otraSheetUrl).set("Authorization", `Bearer ${tokenA}`);
    expect(get.body.character.subclassKey).toBeNull();
  });

  it("cambiar de clase deja subclassKey en null, en la misma escritura", async () => {
    const s = app.getHttpServer();
    const otroId = (
      await request(s)
        .post(`/campaigns/${campaignId}/characters`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ name: "Devrik Cambiacamino", level: 3, visibility: "PLAYERS" })
    ).body.id;
    const otraSheetUrl = `/campaigns/${campaignId}/characters/${otroId}/sheet`;

    await request(s)
      .patch(otraSheetUrl)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({
        abilities: { str: 16, dex: 12, con: 14, int: 8, wis: 10, cha: 8 },
        race: { source: "SRD", key: "human" },
        class: { source: "SRD", key: "barbarian" },
        subclass: { source: "SRD", key: "berserker" },
      });
    const antes = await request(s).get(otraSheetUrl).set("Authorization", `Bearer ${tokenA}`);
    expect(antes.body.character.subclassKey).toBe("berserker");

    await request(s)
      .patch(otraSheetUrl)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ class: { source: "SRD", key: "fighter" } });

    const despues = await request(s).get(otraSheetUrl).set("Authorization", `Bearer ${tokenA}`);
    expect(despues.body.character.subclassKey).toBeNull();
  });

  it("un jugador que no es el dueño ni el DM no puede editar la hoja de otro (403)", async () => {
    const res = await request(app.getHttpServer())
      .patch(sheetUrl())
      .set("Authorization", `Bearer ${tokenB}`)
      .send({ level: 5 });
    expect(res.status).toBe(403);
  });

  it("un jugador que no es el dueño ni el DM no puede tocar sus PG (403)", async () => {
    const res = await request(app.getHttpServer())
      .post(hpUrl())
      .set("Authorization", `Bearer ${tokenB}`)
      .send({ delta: -1 });
    expect(res.status).toBe(403);
  });

  it("dos deltas de PG lanzados a la vez aterrizan los dos (−5 y −3)", async () => {
    const s = app.getHttpServer();
    const [r1, r2] = await Promise.all([
      request(s)
        .post(hpUrl())
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ delta: -5, reason: "Flecha" }),
      request(s)
        .post(hpUrl())
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ delta: -3, reason: "Mordisco" }),
    ]);
    expect(r1.status).toBe(201);
    expect(r2.status).toBe(201);

    const get = await request(s).get(sheetUrl()).set("Authorization", `Bearer ${tokenA}`);
    // Los dos deltas aterrizaron: no hay -5 XOR -3, están los dos.
    expect(get.body.hp.current).toBe(maxHp - 8);
    expect(get.body.hp.version).toBe(2);
  });

  it("un PATCH de PG absoluto exige ser DM (403 para el dueño)", async () => {
    const res = await request(app.getHttpServer())
      .patch(hpUrl())
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ expectedVersion: 2, currentHp: maxHp });
    expect(res.status).toBe(403);
  });

  it("un PATCH con expectedVersion viejo da 409 con el estado actual en el cuerpo", async () => {
    const res = await request(app.getHttpServer())
      .patch(hpUrl())
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ expectedVersion: 0, currentHp: maxHp });
    expect(res.status).toBe(409);
    expect(res.body.hp.version).toBe(2);
  });

  it("el DM corrige con la versión correcta, y deja al personaje a 0 PG", async () => {
    const s = app.getHttpServer();
    const antes = await request(s).get(sheetUrl()).set("Authorization", `Bearer ${tokenDM}`);
    const res = await request(s)
      .patch(hpUrl())
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ expectedVersion: antes.body.hp.version, currentHp: 0 });
    expect(res.status).toBe(200);
    expect(res.body.hp.current).toBe(0);
  });

  it("no se puede tirar salvación de muerte sin estar a 0 PG (400)", async () => {
    const s = app.getHttpServer();
    // Se cura a 1 antes de comprobarlo, para no depender del estado que dejó la prueba anterior.
    const actual = await request(s).get(sheetUrl()).set("Authorization", `Bearer ${tokenDM}`);
    await request(s)
      .patch(hpUrl())
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ expectedVersion: actual.body.hp.version, currentHp: 1 });

    const res = await request(s)
      .post(deathSavesUrl())
      .set("Authorization", `Bearer ${tokenA}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it("a 0 PG, el servidor tira y escribe un DEATH_SAVE con uno de los cuatro resultados", async () => {
    const s = app.getHttpServer();
    const actual = await request(s).get(sheetUrl()).set("Authorization", `Bearer ${tokenDM}`);
    await request(s)
      .patch(hpUrl())
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ expectedVersion: actual.body.hp.version, currentHp: 0 });

    const res = await request(s)
      .post(deathSavesUrl())
      .set("Authorization", `Bearer ${tokenA}`)
      .send({});
    expect(res.status).toBe(201);
    expect(["alive", "dying", "stable", "dead"]).toContain(res.body.deathSaves.status);

    const log = await request(s)
      .get(`/campaigns/${campaignId}/events`)
      .set("Authorization", `Bearer ${tokenA}`);
    expect(log.body.events[0].type).toBe("DEATH_SAVE");
  });

  // --- Tarea 16 (H1b) — «estable» sobrevive a la petición -------------------------------------
  //
  // SRD 5.1, «Stabilizing a Creature»: *«A stable creature doesn't make death saving throws, even
  // though it has 0 hit points, but it does remain unconscious. The creature stops being stable,
  // and must start making death saving throws again, if it takes any damage.»* Hasta esta tarea,
  // estabilizarse ponía los contadores a cero y un `GET` posterior no podía distinguir «está
  // estable» de «acaba de caer a 0 PG y todavía no ha tirado nada»: los dos casos tienen
  // `successes: 0, failures: 0`.
  describe("«estable» sobrevive a la petición", () => {
    const conditionsUrl = (key: string) =>
      `/campaigns/${campaignId}/characters/${characterId}/conditions/${key}`;

    it("un jugador no puede ponerse `stable` a mano por la puerta genérica de condiciones", async () => {
      const res = await request(app.getHttpServer())
        .put(conditionsUrl("stable"))
        .set("Authorization", `Bearer ${tokenA}`)
        .send({});
      // Misma regla que `raging` (`esClaveReservada`, `@dnd/shared`): una clave que el motor
      // interpreta la aplica el DM, nunca la puerta genérica que usa un jugador sobre sí mismo.
      expect(res.status).toBe(403);
    });

    it('tras tres éxitos seguidos, GET da `deathSaves.status === "stable"`, y persiste en una segunda lectura', async () => {
      const s = app.getHttpServer();
      // Estabilizar depende del dado real (no hay roller sembrado en este e2e): se deja al
      // personaje a un éxito de estabilizarse y se repite la tirada hasta que el dado real dé un
      // éxito (≥10, sin ser 1 ni 20) — acotado a un número de intentos generoso porque un éxito
      // simple sale más de la mitad de las veces.
      const actual = await request(s).get(sheetUrl()).set("Authorization", `Bearer ${tokenDM}`);
      await request(s)
        .patch(hpUrl())
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ expectedVersion: actual.body.hp.version, currentHp: 0 });
      await prisma.character.update({
        where: { id: characterId },
        data: { deathSaveSuccesses: 2, deathSaveFailures: 0 },
      });

      let estabilizado = false;
      for (let intento = 0; intento < 25 && !estabilizado; intento++) {
        const tirada = await request(s)
          .post(deathSavesUrl())
          .set("Authorization", `Bearer ${tokenA}`)
          .send({});
        if (tirada.body.deathSaves.status === "stable") {
          estabilizado = true;
          break;
        }
        // Cualquier otro resultado (fracaso, crítico, o un éxito que no llegó a tres porque el
        // dado real dio otra cosa de camino) deja el personaje a 0 PG a falta de un éxito, otra
        // vez, y se reintenta.
        await prisma.character.update({
          where: { id: characterId },
          data: { currentHp: 0, deathSaveSuccesses: 2, deathSaveFailures: 0 },
        });
      }
      expect(estabilizado).toBe(true);

      const get = await request(s).get(sheetUrl()).set("Authorization", `Bearer ${tokenA}`);
      expect(get.body.deathSaves).toEqual({ successes: 0, failures: 0, status: "stable" });
    });

    it("curar por encima de 0 quita «estable» y el estado vuelve a `alive`", async () => {
      const s = app.getHttpServer();
      // Se fuerza el estado «estable» directamente en la base — la condición ya se probó arriba
      // creándose por la tirada real; aquí interesa solo qué le hace curar a esa condición.
      await prisma.character.update({
        where: { id: characterId },
        data: { currentHp: 0, deathSaveSuccesses: 0, deathSaveFailures: 0 },
      });
      await prisma.characterCondition.upsert({
        where: { characterId_key: { characterId, key: "stable" } },
        create: {
          characterId,
          key: "stable",
          appliedById: (await prisma.user.findFirstOrThrow({ where: { email: emailA } })).id,
        },
        update: {},
      });
      const antes = await request(s).get(sheetUrl()).set("Authorization", `Bearer ${tokenDM}`);
      expect(antes.body.deathSaves.status).toBe("stable");

      await request(s).post(hpUrl()).set("Authorization", `Bearer ${tokenDM}`).send({ delta: 5 });

      const despues = await request(s).get(sheetUrl()).set("Authorization", `Bearer ${tokenA}`);
      expect(despues.body.deathSaves.status).toBe("alive");
      const condiciones = await prisma.characterCondition.findMany({ where: { characterId } });
      expect(condiciones.some((c) => c.key === "stable")).toBe(false);
    });

    it("recibir daño a 0 PG estando estable quita «estable»: vuelve a tirar salvaciones", async () => {
      const s = app.getHttpServer();
      await prisma.character.update({
        where: { id: characterId },
        data: { currentHp: 0, deathSaveSuccesses: 0, deathSaveFailures: 0 },
      });
      await prisma.characterCondition.upsert({
        where: { characterId_key: { characterId, key: "stable" } },
        create: {
          characterId,
          key: "stable",
          appliedById: (await prisma.user.findFirstOrThrow({ where: { email: emailA } })).id,
        },
        update: {},
      });
      const antes = await request(s).get(sheetUrl()).set("Authorization", `Bearer ${tokenDM}`);
      expect(antes.body.deathSaves.status).toBe("stable");

      await request(s).post(hpUrl()).set("Authorization", `Bearer ${tokenDM}`).send({ delta: -2 });

      const despues = await request(s).get(sheetUrl()).set("Authorization", `Bearer ${tokenA}`);
      expect(despues.body.deathSaves.status).not.toBe("stable");
      const condiciones = await prisma.characterCondition.findMany({ where: { characterId } });
      expect(condiciones.some((c) => c.key === "stable")).toBe(false);
    });
  });

  // --- Fase 2B/2C: equipar cambia el número, y el arma equipada se puede tirar ---------------

  it("equipar una cota de malla sube la CA de la hoja, y la traza gana un paso del objeto", async () => {
    const s = app.getHttpServer();
    const inventarioUrl = `/campaigns/${campaignId}/characters/${characterId}/inventory`;

    const antes = await request(s).get(sheetUrl()).set("Authorization", `Bearer ${tokenA}`);
    const caSinEquipo = antes.body.sheet.derived.ac.total;

    const fila = await request(s)
      .post(inventarioUrl)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ ref: { source: "SRD", key: "chain-mail" }, location: "EQUIPPED", slot: "ARMOR" });
    expect(fila.status).toBe(201);

    const despues = await request(s).get(sheetUrl()).set("Authorization", `Bearer ${tokenA}`);
    const ca = despues.body.sheet.derived.ac;
    expect(ca.total).toBeGreaterThan(caSinEquipo);
    expect(ca.steps.some((paso: { sourceType: string }) => paso.sourceType === "item")).toBe(true);
    // La explicación tiene que sumar el número que explica.
    expect(ca.steps.reduce((t: number, p: { amount: number }) => t + p.amount, 0)).toBe(ca.total);
  });

  it("un arma equipada sale en el cuadro de ataques y el servidor tira por ella", async () => {
    const s = app.getHttpServer();
    const inventarioUrl = `/campaigns/${campaignId}/characters/${characterId}/inventory`;

    await request(s)
      .post(inventarioUrl)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({
        ref: { source: "SRD", key: "long-sword" },
        location: "EQUIPPED",
        slot: "MAIN_HAND",
      });

    const hoja = await request(s).get(sheetUrl()).set("Authorization", `Bearer ${tokenA}`);
    const ataque = hoja.body.attacks.find((a: { name: string }) => a.name === "Espada larga");
    expect(ataque).toBeDefined();
    expect(ataque.damage.expression).toMatch(/^1d8/);

    const tirada = await request(s)
      .post(`${sheetUrl()}/attacks/${encodeURIComponent(ataque.key)}/roll`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ part: "ATTACK", mode: "ADVANTAGE" });

    expect(tirada.status).toBe(201);
    // La ventaja la compone el servidor: dos d20 tirados, uno conservado y el otro a la vista.
    expect(tirada.body.rolls).toHaveLength(2);
    expect(tirada.body.dropped).toHaveLength(1);
    // `RollResult` no lleva la etiqueta —vive en el suceso del log, que es donde se lee la
    // partida—, así que el motivo se comprueba ahí: una tirada sin motivo es una lista de
    // números al repasar la sesión.
    expect(tirada.body.expression).toBe("2d20kh1+4");
    const log = await request(s)
      .get(`/campaigns/${campaignId}/events`)
      .set("Authorization", `Bearer ${tokenA}`);
    expect(log.body.events[0]).toMatchObject({ type: "ABILITY_ROLL" });
    expect(log.body.events[0].payload.reason).toBe("Ataque con Espada larga");
  });

  it("**el daño de una tirada de ataque se cobra UNA vez, y lo impide la base** (D-OP-15)", async () => {
    const s = app.getHttpServer();
    const hoja = await request(s).get(sheetUrl()).set("Authorization", `Bearer ${tokenA}`);
    const ataque = hoja.body.attacks.find((a: { name: string }) => a.name === "Espada larga");
    expect(ataque).toBeDefined();
    const rollUrl = `${sheetUrl()}/attacks/${encodeURIComponent(ataque.key)}/roll`;

    const ataqueTirado = await request(s)
      .post(rollUrl)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ part: "ATTACK", mode: "NORMAL" });
    expect(ataqueTirado.status).toBe(201);
    const eventId = ataqueTirado.body.eventId as string;
    expect(typeof eventId).toBe("string");

    const primero = await request(s)
      .post(rollUrl)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ part: "DAMAGE", attackRollEventId: eventId });
    expect(primero.status).toBe(201);

    // **El segundo cobro lo rechaza el índice único, no un `if`.** Una comprobación en el
    // servicio sería una carrera esperando a ocurrir con dos pestañas abiertas.
    const segundo = await request(s)
      .post(rollUrl)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ part: "DAMAGE", attackRollEventId: eventId });
    expect(segundo.status).toBe(409);

    // Y **no quedó a medias**: hay exactamente un suceso cobrando esa tirada.
    const cobros = await prisma.gameEvent.count({ where: { attackRollEventId: eventId } });
    expect(cobros).toBe(1);
  });

  it("pedir la tirada de un arma que no se lleva equipada es 400, no 500", async () => {
    const res = await request(app.getHttpServer())
      .post(`${sheetUrl()}/attacks/SRD:greataxe/roll`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ part: "ATTACK" });
    expect(res.status).toBe(400);
  });

  it("un jugador que no es miembro no puede leer la hoja (403), aunque adivine el identificador", async () => {
    const email = `x-sh${Date.now()}@b.com`;
    const token = (
      await request(app.getHttpServer())
        .post("/auth/register")
        .send({ email, password: "password123", displayName: "X" })
    ).body.token;
    const res = await request(app.getHttpServer())
      .get(sheetUrl())
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
    await prisma.user.deleteMany({ where: { email } });
  });
});
