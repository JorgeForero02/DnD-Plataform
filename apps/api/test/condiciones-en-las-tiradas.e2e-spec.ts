import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { SEGUNDOS_POR_ASALTO } from "@dnd/shared";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

// Tarea 2.5.5 contra Postgres real: **las condiciones llegando a las tiradas**.
//
// Lo unitario ya prueba la tabla del SRD condición a condición. Esto prueba lo que aquel no
// puede, que son tres cosas distintas:
//
//  1. que la sugerencia **atraviesa las tres capas** —la condición se guarda, la hoja la lee y
//     la publica con su porqué—, y que **desaparece sola** cuando la condición vence;
//  2. que **un asalto son seis segundos del mismo reloj**, así que una condición de dos asaltos
//     se apaga al segundo avance de turno y no hace falta ningún mecanismo nuevo para ello;
//  3. que **el agotamiento 6 mata** aunque los Puntos de Golpe estén intactos (ficha C2C-9).
//
// Y una cuarta que no es de reglas sino de fugas: **la hoja que no se puede ver no llega**, así
// que la sugerencia tampoco puede contar la condición oculta de un PNJ del DM.

describe("Condiciones en las tiradas (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const emailDM = `dm-sug${Date.now()}@b.com`;
  const emailJugador = `pj-sug${Date.now()}@b.com`;
  let tokenDM = "";
  let tokenJugador = "";
  let campaignId = "";
  let characterId = "";
  let pnjOcultoId = "";

  const sheetUrl = (id = characterId) => `/campaigns/${campaignId}/characters/${id}/sheet`;
  const condUrl = (id = characterId) => `/campaigns/${campaignId}/characters/${id}/conditions`;
  const hoja = (token = tokenDM, id = characterId) =>
    request(app.getHttpServer()).get(sheetUrl(id)).set("Authorization", `Bearer ${token}`);

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
    tokenJugador = (
      await request(s)
        .post("/auth/register")
        .send({ email: emailJugador, password: "password123", displayName: "Jugadora" })
    ).body.token;
    campaignId = (
      await request(s)
        .post("/campaigns")
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ name: "Campaña de las sugerencias" })
    ).body.id;
    const invite = (
      await request(s)
        .post(`/campaigns/${campaignId}/invites`)
        .set("Authorization", `Bearer ${tokenDM}`)
    ).body.token;
    await request(s)
      .post(`/invites/${invite}/accept`)
      .set("Authorization", `Bearer ${tokenJugador}`);
    characterId = (
      await request(s)
        .post(`/campaigns/${campaignId}/characters`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ name: "Yrsa", level: 3 })
    ).body.id;
    await request(s)
      .patch(sheetUrl())
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({
        abilities: { str: 15, dex: 12, con: 14, int: 8, wis: 10, cha: 8 },
        race: { source: "SRD", key: "dwarf" },
        subrace: { source: "SRD", key: "dwarf-hill" },
        class: { source: "SRD", key: "fighter" },
        choices: { "fighter-skills": ["athletics", "perception"] },
      });
    pnjOcultoId = (
      await request(s)
        .post(`/campaigns/${campaignId}/characters`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ name: "El que acecha", visibility: "DM_ONLY" })
    ).body.id;
    await request(s)
      .put(`${condUrl(pnjOcultoId)}/poisoned`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({});
  });

  afterAll(async () => {
    if (campaignId) await prisma.campaign.deleteMany({ where: { id: campaignId } });
    await prisma.user.deleteMany({ where: { email: { in: [emailDM, emailJugador] } } });
    await app.close();
  });

  it("sin condiciones, la hoja publica las ocho sugerencias y ninguna sugiere nada", async () => {
    const r = await hoja();
    expect(r.status).toBe(200);
    expect(r.body.rollSuggestions.attack).toMatchObject({ mode: "NORMAL", reasons: [] });
    expect(Object.keys(r.body.rollSuggestions.saves)).toHaveLength(6);
  });

  it("**envenenado: «desventaja: envenenado»** en el ataque y en las pruebas, no en las salvaciones", async () => {
    await request(app.getHttpServer())
      .put(`${condUrl()}/poisoned`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({});

    const r = await hoja();
    expect(r.body.rollSuggestions.attack.mode).toBe("DISADVANTAGE");
    expect(r.body.rollSuggestions.attack.reasons).toEqual([
      {
        effect: "DISADVANTAGE",
        sourceKey: "poisoned",
        labelKey: "rollMode.condition.disadvantage",
      },
    ]);
    expect(r.body.rollSuggestions.check.mode).toBe("DISADVANTAGE");
    // Envenenado no toca las salvaciones: si esto sugiriera algo, la tabla estaría de más.
    expect(r.body.rollSuggestions.saves.dex.mode).toBe("NORMAL");
    expect(r.body.rollSuggestions.saves.con.mode).toBe("NORMAL");

    await request(app.getHttpServer())
      .delete(`${condUrl()}/poisoned`)
      .set("Authorization", `Bearer ${tokenDM}`);
  });

  it("**una condición de dos asaltos se apaga al segundo**, contra el mismo reloj y sin mecanismo nuevo", async () => {
    const s = app.getHttpServer();
    // Apresado dura dos asaltos: doce segundos del mismo contador que ya existe.
    await request(s)
      .put(`${condUrl()}/restrained`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ durationSeconds: 2 * SEGUNDOS_POR_ASALTO });

    const enPie = await hoja();
    expect(enPie.body.rollSuggestions.attack.mode).toBe("DISADVANTAGE");
    expect(enPie.body.rollSuggestions.saves.dex.mode).toBe("DISADVANTAGE");
    // Y solo la de Destreza: apresado no toca la de Fuerza.
    expect(enPie.body.rollSuggestions.saves.str.mode).toBe("NORMAL");

    // Primer asalto: **sigue puesta**. Es la mitad que distingue — un vencimiento que se
    // disparase con cualquier avance pasaría igual sin esta comprobación.
    await request(s)
      .post(`/campaigns/${campaignId}/clock/advance`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ kind: "TIME", seconds: SEGUNDOS_POR_ASALTO });
    const trasUno = await hoja();
    expect(trasUno.body.rollSuggestions.attack.mode).toBe("DISADVANTAGE");

    // Segundo asalto: vence.
    await request(s)
      .post(`/campaigns/${campaignId}/clock/advance`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ kind: "TIME", seconds: SEGUNDOS_POR_ASALTO });
    const trasDos = await hoja();
    expect(trasDos.body.rollSuggestions.attack).toMatchObject({ mode: "NORMAL", reasons: [] });
    expect(trasDos.body.rollSuggestions.saves.dex.mode).toBe("NORMAL");

    // Y el jugador ve **por qué**, con la hora exacta: dos asaltos son doce segundos.
    const log = await request(s)
      .get(`/campaigns/${campaignId}/events`)
      .set("Authorization", `Bearer ${tokenDM}`);
    const vencida = log.body.events.find(
      (e: { type: string; payload: { key?: string } }) =>
        e.type === "CONDITION_EXPIRED" && e.payload.key === "restrained",
    );
    expect(vencida.payload.expiredAtClock).toBe(2 * SEGUNDOS_POR_ASALTO);
  });

  it("**agotamiento 3: ataques y salvaciones con desventaja**, y las pruebas también (los niveles se acumulan)", async () => {
    await request(app.getHttpServer())
      .put(`${condUrl()}/exhaustion`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ level: 3 });

    const r = await hoja();
    expect(r.body.rollSuggestions.attack.mode).toBe("DISADVANTAGE");
    expect(r.body.rollSuggestions.attack.reasons[0].sourceKey).toBe("exhaustion:3");
    expect(r.body.rollSuggestions.check.mode).toBe("DISADVANTAGE");
    // **Todas** las salvaciones, no solo las de Fuerza y Destreza.
    expect(Object.values(r.body.rollSuggestions.saves).map((x) => (x as { mode: string }).mode)) //
      .toEqual(Array(6).fill("DISADVANTAGE"));
    // Y sigue vivo: el 3 no mata.
    expect(r.body.deathSaves.status).toBe("alive");
  });

  it("**agotamiento 6 mata, con los Puntos de Golpe intactos** (C2C-9)", async () => {
    const antes = await hoja();
    expect(antes.body.hp.current).toBeGreaterThan(0);

    await request(app.getHttpServer())
      .put(`${condUrl()}/exhaustion`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ level: 6 });

    const r = await hoja();
    expect(r.body.deathSaves.status).toBe("dead");
    // **La distinción que importa**: no está muerto por haber llegado a 0 PG. Sigue teniendo
    // PG y sigue sin fracasos de salvación de muerte anotados.
    expect(r.body.hp.current).toBeGreaterThan(0);
    expect(r.body.deathSaves.failures).toBe(0);
  });

  it("y **quitar el agotamiento lo devuelve**: la muerte se deriva, no se guarda", async () => {
    await request(app.getHttpServer())
      .delete(`${condUrl()}/exhaustion`)
      .set("Authorization", `Bearer ${tokenDM}`);
    const r = await hoja();
    expect(r.body.deathSaves.status).toBe("alive");
  });

  it("**la condición de un PNJ oculto no se filtra por la sugerencia**: la hoja entera es un 404", async () => {
    const r = await hoja(tokenJugador, pnjOcultoId);
    expect(r.status).toBe(404);
    expect(JSON.stringify(r.body)).not.toContain("poisoned");
  });
});
