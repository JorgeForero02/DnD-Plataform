import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

// Tarea 9 (3A.2, T15) — encantar: *Arma mágica* como `TemporaryModifier` sobre un objeto del
// inventario, leído por `efectosActivos`. **Se escribe, no se corre**: lo corre el orquestador,
// uno a la vez (docs/08-pruebas.md).
//
// SRD 5.1, *Magic Weapon*: «You touch a nonmagical weapon. Until the spell ends, that weapon
// becomes a magic weapon with a +1 bonus to attack rolls and damage rolls» — 2.º nivel,
// concentración, 1 hora.
//
// Un mago (nivel 3, INT de lanzamiento) con `magic-weapon` PREPARADO encanta la espada larga que
// lleva EQUIPADA un guerrero — otro personaje, de otro jugador, visible en la mesa (`PLAYERS`):
// el caso real, «encanto el arma de mi compañero», no la mía propia.

describe("Encantar — Arma mágica como TemporaryModifier sobre un objeto (T15, 3A.2, e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const emailDM = `dm-enc${Date.now()}@b.com`;
  const emailMago = `mago-enc${Date.now()}@b.com`;
  const emailGuerrero = `guerrero-enc${Date.now()}@b.com`;
  let tokenDM = "";
  let tokenMago = "";
  let tokenGuerrero = "";
  let campaignId = "";
  let magoId = "";
  let guerreroId = "";
  let filaEspadaId = "";

  const s = () => app.getHttpServer();

  async function sheetDelGuerrero() {
    const res = await request(s())
      .get(`/campaigns/${campaignId}/characters/${guerreroId}/sheet`)
      .set("Authorization", `Bearer ${tokenGuerrero}`);
    return res.body;
  }

  async function ataqueDeLaEspada() {
    const sheet = await sheetDelGuerrero();
    const ataque = (sheet.attacks as { ref: string }[]).find((a) => a.ref === "SRD:long-sword");
    if (!ataque) throw new Error("El guerrero no tiene la espada larga en su cuadro de ataques.");
    return ataque as unknown as {
      ref: string;
      attackBonus: {
        total: number;
        steps: { sourceType: string; labelKey: string; amount: number }[];
      };
    };
  }

  async function espacioDeNivel(nivel: 1 | 2) {
    const res = await request(s())
      .get(`/campaigns/${campaignId}/characters/${magoId}/resources`)
      .set("Authorization", `Bearer ${tokenMago}`);
    const fila = (res.body as { key: string; current: number; max: number }[]).find(
      (r) => r.key === `spell-slot-${nivel}`,
    );
    if (!fila) throw new Error(`El mago no tiene espacios de nivel ${nivel} sembrados.`);
    return { current: fila.current, max: fila.max };
  }

  async function eventosDe(tipo: string) {
    const res = await request(s())
      .get(`/campaigns/${campaignId}/events`)
      .query({ limit: 100 })
      .set("Authorization", `Bearer ${tokenMago}`);
    return (res.body.events as { type: string; payload: Record<string, unknown> }[]).filter(
      (e) => e.type === tipo,
    );
  }

  async function condicionesDelMago() {
    const res = await request(s())
      .get(`/campaigns/${campaignId}/characters/${magoId}/conditions`)
      .set("Authorization", `Bearer ${tokenMago}`);
    return res.body as { key: string; expired: boolean }[];
  }

  const avanzar = (segundos: number) =>
    request(s())
      .post(`/campaigns/${campaignId}/clock/advance`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ kind: "TIME", seconds: segundos });

  beforeAll(async () => {
    const ref = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = ref.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    prisma = app.get(PrismaService);

    tokenDM = (
      await request(s())
        .post("/auth/register")
        .send({ email: emailDM, password: "password123", displayName: "DM" })
    ).body.token;
    tokenMago = (
      await request(s())
        .post("/auth/register")
        .send({ email: emailMago, password: "password123", displayName: "Mago" })
    ).body.token;
    tokenGuerrero = (
      await request(s())
        .post("/auth/register")
        .send({ email: emailGuerrero, password: "password123", displayName: "Guerrero" })
    ).body.token;

    campaignId = (
      await request(s())
        .post("/campaigns")
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ name: "Campaña de encantar" })
    ).body.id;

    for (const token of [tokenMago, tokenGuerrero]) {
      const invite = (
        await request(s())
          .post(`/campaigns/${campaignId}/invites`)
          .set("Authorization", `Bearer ${tokenDM}`)
      ).body.token;
      await request(s()).post(`/invites/${invite}/accept`).set("Authorization", `Bearer ${token}`);
    }

    // El mago: nivel 3 (2.º nivel de conjuro disponible), INT de lanzamiento.
    magoId = (
      await request(s())
        .post(`/campaigns/${campaignId}/characters`)
        .set("Authorization", `Bearer ${tokenMago}`)
        .send({ name: "Elminster", level: 3 })
    ).body.id;
    await request(s())
      .patch(`/campaigns/${campaignId}/characters/${magoId}/sheet`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({
        level: 3,
        abilities: { str: 8, dex: 12, con: 14, int: 16, wis: 10, cha: 10 },
        race: { source: "SRD", key: "human" },
        class: { source: "SRD", key: "wizard" },
        choices: { "wizard-skills": ["arcana", "investigation"] },
      });
    await request(s())
      .put(`/campaigns/${campaignId}/characters/${magoId}/spellbook/magic-weapon`)
      .set("Authorization", `Bearer ${tokenMago}`)
      .send({ estado: "PREPARADO" })
      .expect(200);

    // El guerrero: otro jugador, con una espada larga EQUIPADA en la mano principal.
    guerreroId = (
      await request(s())
        .post(`/campaigns/${campaignId}/characters`)
        .set("Authorization", `Bearer ${tokenGuerrero}`)
        .send({ name: "Garrik", level: 1 })
    ).body.id;
    await request(s())
      .patch(`/campaigns/${campaignId}/characters/${guerreroId}/sheet`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({
        level: 1,
        abilities: { str: 16, dex: 12, con: 14, int: 8, wis: 10, cha: 10 },
        race: { source: "SRD", key: "human" },
        class: { source: "SRD", key: "fighter" },
        choices: { "fighter-skills": ["athletics", "perception"] },
      });
    const add = await request(s())
      .post(`/campaigns/${campaignId}/characters/${guerreroId}/inventory`)
      .set("Authorization", `Bearer ${tokenGuerrero}`)
      .send({ ref: { source: "SRD", key: "long-sword" }, quantity: 1 });
    filaEspadaId = add.body.id;
    await request(s())
      .patch(`/campaigns/${campaignId}/characters/${guerreroId}/inventory/${filaEspadaId}`)
      .set("Authorization", `Bearer ${tokenGuerrero}`)
      .send({ location: "EQUIPPED", slot: "MAIN_HAND" })
      .expect(200);
  });

  afterAll(async () => {
    if (campaignId) await prisma.campaign.deleteMany({ where: { id: campaignId } });
    await prisma.user.deleteMany({
      where: { email: { in: [emailDM, emailMago, emailGuerrero] } },
    });
    await app.close();
  });

  it("preparación: el guerrero lleva la espada larga equipada, sin encantar todavía", async () => {
    const ataque = await ataqueDeLaEspada();
    expect(ataque.attackBonus.steps.some((p) => p.sourceType === "temporary")).toBe(false);
  });

  it("sin itemId, 400 — encantar necesita saber sobre qué objeto", async () => {
    await request(s())
      .post(`/campaigns/${campaignId}/characters/${magoId}/activities/spell:magic-weapon/use`)
      .set("Authorization", `Bearer ${tokenMago}`)
      .send({})
      .expect(400);
  });

  it("sobre un objeto que no existe, 404", async () => {
    await request(s())
      .post(`/campaigns/${campaignId}/characters/${magoId}/activities/spell:magic-weapon/use`)
      .set("Authorization", `Bearer ${tokenMago}`)
      .send({ itemId: "clx0000000000000000000000" })
      .expect(404);
  });

  it("el mago encanta la espada del guerrero: 201, gasta spell-slot-2, y el ataque sube +1 con traza", async () => {
    const antes = await ataqueDeLaEspada();
    const antesDeEspacio = await espacioDeNivel(2);

    const usar = await request(s())
      .post(`/campaigns/${campaignId}/characters/${magoId}/activities/spell:magic-weapon/use`)
      .set("Authorization", `Bearer ${tokenMago}`)
      .send({ itemId: filaEspadaId });
    expect(usar.status).toBe(201);

    const despuesDeEspacio = await espacioDeNivel(2);
    expect(despuesDeEspacio.current).toBe(antesDeEspacio.current - 1);

    const actividadUsada = (await eventosDe("ACTIVITY_USED")).find(
      (e) => e.payload.actividadKey === "spell:magic-weapon",
    );
    expect(actividadUsada).toBeDefined();
    expect(actividadUsada!.payload).toMatchObject({
      name: "Arma mágica",
      kind: "SPELL",
      spellLevel: 2,
      nivelDeEspacio: 2,
    });

    const despues = await ataqueDeLaEspada();
    expect(despues.attackBonus.total).toBe(antes.attackBonus.total + 1);
    const pasoTemporal = despues.attackBonus.steps.find((p) => p.sourceType === "temporary");
    expect(pasoTemporal).toMatchObject({ amount: 1 });
    expect(pasoTemporal?.labelKey).toContain("Arma mágica");

    // La concentración es de QUIEN LANZA (el mago), no de quien lleva el arma.
    const condiciones = await condicionesDelMago();
    expect(condiciones.some((c) => c.key === "concentrating-magic-weapon" && !c.expired)).toBe(
      true,
    );
  });

  it("avanzar el reloj 3601 s lo vence: el ataque vuelve al bono base", async () => {
    const conEncantamiento = await ataqueDeLaEspada();
    await avanzar(3601).expect(201);

    const despues = await ataqueDeLaEspada();
    expect(despues.attackBonus.total).toBe(conEncantamiento.attackBonus.total - 1);
    expect(despues.attackBonus.steps.some((p) => p.sourceType === "temporary")).toBe(false);

    const condiciones = await condicionesDelMago();
    const concentracion = condiciones.find((c) => c.key === "concentrating-magic-weapon");
    // D-CF-130: perder la concentración no borra el encantamiento (aquí ya venció por reloj),
    // pero la condición del lanzador SÍ vence a la vez — es la misma hora.
    expect(concentracion?.expired).toBe(true);
  });
});
