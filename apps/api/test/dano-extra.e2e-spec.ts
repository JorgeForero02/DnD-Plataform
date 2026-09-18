import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

// Task 8 (3A.2), contra Postgres real — **se escribe, no se corre**: lo corre el orquestador,
// uno a la vez (docs/08-pruebas.md).
//
// El camino entero: un ataque de arma que impacta de sobra (CA del goblin anulada a 1, mismo
// patrón que `ataque-de-conjuro.e2e-spec.ts`/`concurrencia-puerta.e2e-spec.ts`), la tirada de
// daño (`DAMAGE`, con `attackRollEventId`) que deja `pendingDamage`, y sobre ESA tirada el
// jugador marca su extra — Ataque furtivo (pícaro) o Castigo divino (paladín) — antes de que el
// DM aplique la bandeja.
//
// **El nivel se fija ANTES que la clase**: la siembra de `CharacterResource` (dados de golpe,
// espacios de conjuro) ocurre al fijar la clase (`sembrarRecursos`, dentro de `PATCH .../sheet`),
// así que si la clase llegara antes que el nivel, los espacios de Castigo divino se sembrarían
// para el nivel 1 (el PATCH que sube a 3 no vuelve a sembrar nada retroactivamente aquí porque sí
// lo hace — `seedResourcesFor` es idempotente y sube el tope con cada edición de la ficha —, pero
// fijar el orden real de la mesa es lo que este fichero reproduce).
describe("El daño extra al impactar — Ataque furtivo y Castigo divino en la bandeja (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const emailDM = `dm-de${Date.now()}@b.com`;
  const emailPicaro = `picaro-de${Date.now()}@b.com`;
  const emailPaladin = `paladin-de${Date.now()}@b.com`;
  let tokenDM = "";
  let tokenPicaro = "";
  let tokenPaladin = "";
  let campaignId = "";

  const auth = (t: string) => `Bearer ${t}`;
  const ficha = (characterId: string) => `/campaigns/${campaignId}/characters/${characterId}`;

  async function anularCA(objetivoId: string, valor: number) {
    const r = await request(app.getHttpServer())
      .put(`${ficha(objetivoId)}/overrides/ac`)
      .set("Authorization", auth(tokenDM))
      .send({ value: valor });
    expect(r.status).toBe(200);
  }

  /** Un goblin del DM, revelado a la mesa y con la CA anulada a 1: impacta de sobra. */
  async function goblinFacil(): Promise<string> {
    const s = app.getHttpServer();
    const goblins = await request(s)
      .post(`/campaigns/${campaignId}/npcs`)
      .set("Authorization", auth(tokenDM))
      .send({ ref: "SRD:goblin", count: 1, hp: "AVERAGE" });
    const id = goblins.body[0].id as string;
    await request(s)
      .patch(ficha(id))
      .set("Authorization", auth(tokenDM))
      .send({ visibility: "PLAYERS" });
    await anularCA(id, 1);
    return id;
  }

  /**
   * Equipa el arma, resuelve el ataque hasta impactar (hasta 20 intentos: con CA 1, solo un
   * natural 1 falla, 1/20) y tira el daño citando esa resolución. Devuelve el `rollEventId` del
   * `ABILITY_ROLL` con `pendingDamage`.
   */
  async function atacarHastaImpactar(
    token: string,
    characterId: string,
    armaKey: string,
    nombreArma: string,
    objetivoId: string,
  ): Promise<string> {
    const s = app.getHttpServer();
    await request(s)
      .post(`${ficha(characterId)}/inventory`)
      .set("Authorization", auth(token))
      .send({ ref: { source: "SRD", key: armaKey }, location: "EQUIPPED", slot: "MAIN_HAND" });

    const hoja = await request(s)
      .get(`${ficha(characterId)}/sheet`)
      .set("Authorization", auth(token));
    const ataque = (hoja.body.attacks as { key: string; name: string }[]).find(
      (a) => a.name === nombreArma,
    );
    expect(ataque).toBeDefined();
    const attackKey = ataque!.key;

    let resolve: request.Response | undefined;
    for (let i = 0; i < 20; i++) {
      resolve = await request(s)
        .post(`${ficha(characterId)}/sheet/attacks/${encodeURIComponent(attackKey)}/resolve`)
        .set("Authorization", auth(token))
        .send({ targetCharacterId: objetivoId, mode: "NORMAL", spendInspiration: false });
      expect(resolve.status).toBe(201);
      if (["HIT", "CRITICAL"].includes(resolve.body.verdict)) break;
    }
    expect(["HIT", "CRITICAL"]).toContain(resolve!.body.verdict);

    const dano = await request(s)
      .post(`${ficha(characterId)}/sheet/attacks/${encodeURIComponent(attackKey)}/roll`)
      .set("Authorization", auth(token))
      .send({
        part: "DAMAGE",
        spendInspiration: false,
        mode: "NORMAL",
        versatile: false,
        attackRollEventId: resolve!.body.roll.eventId,
      });
    expect(dano.status).toBe(201);
    return dano.body.eventId as string;
  }

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
      ).body as { token: string };

    tokenDM = (await registrar(emailDM, "DM")).token;
    tokenPicaro = (await registrar(emailPicaro, "Pícaro")).token;
    tokenPaladin = (await registrar(emailPaladin, "Paladín")).token;

    campaignId = (
      await request(s)
        .post("/campaigns")
        .set("Authorization", auth(tokenDM))
        .send({ name: "Campaña del daño extra" })
    ).body.id;
    const invite = (
      await request(s).post(`/campaigns/${campaignId}/invites`).set("Authorization", auth(tokenDM))
    ).body.token;
    await request(s).post(`/invites/${invite}/accept`).set("Authorization", auth(tokenPicaro));
    const invite2 = (
      await request(s).post(`/campaigns/${campaignId}/invites`).set("Authorization", auth(tokenDM))
    ).body.token;
    await request(s).post(`/invites/${invite2}/accept`).set("Authorization", auth(tokenPaladin));
  });

  afterAll(async () => {
    if (campaignId) await prisma.campaign.deleteMany({ where: { id: campaignId } });
    await prisma.user.deleteMany({
      where: { email: { in: [emailDM, emailPicaro, emailPaladin] } },
    });
    await app.close();
  });

  // --- Ataque furtivo — el pícaro ---------------------------------------------------------

  let picaroId = "";
  let danoRollEventIdPicaro = "";

  it("un pícaro nivel 3 equipa una daga y ataca al goblin hasta impactar", async () => {
    const s = app.getHttpServer();
    picaroId = (
      await request(s)
        .post(`/campaigns/${campaignId}/characters`)
        .set("Authorization", auth(tokenPicaro))
        .send({ name: "Nix", visibility: "PLAYERS" })
    ).body.id;
    // El nivel se fija ANTES que la clase — el orden importa (ver el comentario del fichero).
    await request(s).patch(ficha(picaroId)).set("Authorization", auth(tokenDM)).send({ level: 3 });
    await request(s)
      .patch(`${ficha(picaroId)}/sheet`)
      .set("Authorization", auth(tokenPicaro))
      .send({
        abilities: { str: 8, dex: 16, con: 12, int: 10, wis: 10, cha: 12 },
        race: { source: "SRD", key: "human" },
        class: { source: "SRD", key: "rogue" },
        choices: {
          "rogue-skills": ["stealth", "perception", "acrobatics", "deception"],
        },
      });

    const goblin = await goblinFacil();
    danoRollEventIdPicaro = await atacarHastaImpactar(
      tokenPicaro,
      picaroId,
      "dagger",
      "Daga",
      goblin,
    );
    expect(danoRollEventIdPicaro).toBeTruthy();
  });

  it("el pícaro ve extrasDisponibles con «Ataque furtivo (2d6)», sin `resulting` ni el nombre del goblin", async () => {
    const s = app.getHttpServer();
    const preview = await request(s)
      .get(`/campaigns/${campaignId}/rolls/${danoRollEventIdPicaro}/damage-preview`)
      .set("Authorization", auth(tokenPicaro));

    expect(preview.status).toBe(200);
    expect(preview.body.extrasDisponibles).toEqual([
      { key: "sneak-attack", label: "Ataque furtivo (2d6)" },
    ]);
    expect(preview.body.extras).toEqual([]);
    expect(preview.body).not.toHaveProperty("target");
    expect(preview.body).not.toHaveProperty("resulting");
    expect(JSON.stringify(preview.body)).not.toMatch(/goblin/i);
  });

  it("el pícaro marca el furtivo: 201, la tirada del extra existe y el preview del DM la trae", async () => {
    const s = app.getHttpServer();
    const marcar = await request(s)
      .post(`/campaigns/${campaignId}/rolls/${danoRollEventIdPicaro}/damage-extra`)
      .set("Authorization", auth(tokenPicaro))
      .send({ key: "sneak-attack" });

    expect(marcar.status).toBe(201);
    expect(marcar.body).toMatchObject({ key: "sneak-attack", label: "Ataque furtivo (2d6)" });
    expect(typeof marcar.body.amount).toBe("number");
    expect(marcar.body.amount).toBeGreaterThanOrEqual(2);
    expect(marcar.body.amount).toBeLessThanOrEqual(12);

    const previewDM = await request(s)
      .get(`/campaigns/${campaignId}/rolls/${danoRollEventIdPicaro}/damage-preview`)
      .set("Authorization", auth(tokenDM));
    expect(previewDM.status).toBe(200);
    expect(previewDM.body.extras).toEqual([
      expect.objectContaining({ key: "sneak-attack", label: "Ataque furtivo (2d6)" }),
    ]);
    expect(previewDM.body.extrasDisponibles).toEqual([]);
  });

  it("marcarlo una segunda vez es 409", async () => {
    const s = app.getHttpServer();
    const r = await request(s)
      .post(`/campaigns/${campaignId}/rolls/${danoRollEventIdPicaro}/damage-extra`)
      .set("Authorization", auth(tokenPicaro))
      .send({ key: "sneak-attack" });
    expect(r.status).toBe(409);
  });

  it("el DM aplica: el HP_CHANGED.delta es la suma del daño base y el furtivo", async () => {
    const s = app.getHttpServer();
    const previewDM = await request(s)
      .get(`/campaigns/${campaignId}/rolls/${danoRollEventIdPicaro}/damage-preview`)
      .set("Authorization", auth(tokenDM));
    const base = previewDM.body.amount as number;
    const extra = (previewDM.body.extras as { amount: number }[])[0].amount;

    const r = await request(s)
      .post(`/campaigns/${campaignId}/rolls/${danoRollEventIdPicaro}/apply-damage`)
      .set("Authorization", auth(tokenDM));
    expect(r.status).toBe(201);

    const hpChanged = await prisma.gameEvent.findFirst({
      where: { campaignId, type: "HP_CHANGED" },
      orderBy: { createdAt: "desc" },
    });
    expect((hpChanged!.payload as { delta: number }).delta).toBe(-(base + extra));
  });

  // --- Castigo divino — el paladín ----------------------------------------------------------

  let paladinId = "";
  let danoRollEventIdPaladin = "";

  it("un paladín nivel 3 equipa una espada larga y ataca a otro goblin hasta impactar", async () => {
    const s = app.getHttpServer();
    paladinId = (
      await request(s)
        .post(`/campaigns/${campaignId}/characters`)
        .set("Authorization", auth(tokenPaladin))
        .send({ name: "Galahad", visibility: "PLAYERS" })
    ).body.id;
    await request(s).patch(ficha(paladinId)).set("Authorization", auth(tokenDM)).send({ level: 3 });
    await request(s)
      .patch(`${ficha(paladinId)}/sheet`)
      .set("Authorization", auth(tokenPaladin))
      .send({
        abilities: { str: 16, dex: 10, con: 14, int: 8, wis: 10, cha: 14 },
        race: { source: "SRD", key: "human" },
        class: { source: "SRD", key: "paladin" },
        choices: {
          "paladin-skills": ["athletics", "religion"],
        },
      });

    const goblin = await goblinFacil();
    danoRollEventIdPaladin = await atacarHastaImpactar(
      tokenPaladin,
      paladinId,
      "long-sword",
      "Espada larga",
      goblin,
    );
    expect(danoRollEventIdPaladin).toBeTruthy();
  });

  it("el paladín ve «Castigo divino (2d8)» disponible (nivel 3: solo espacios de nivel 1)", async () => {
    const s = app.getHttpServer();
    const preview = await request(s)
      .get(`/campaigns/${campaignId}/rolls/${danoRollEventIdPaladin}/damage-preview`)
      .set("Authorization", auth(tokenPaladin));

    expect(preview.status).toBe(200);
    expect(preview.body.extrasDisponibles).toEqual([
      { key: "divine-smite", label: "Castigo divino (2d8)" },
    ]);
  });

  it("el paladín marca Castigo divino: 201, gasta spell-slot-1 (RESOURCE_SPENT) y el DM aplica el total", async () => {
    const s = app.getHttpServer();
    const antes = await prisma.characterResource.findFirst({
      where: { characterId: paladinId, key: "spell-slot-1" },
    });
    expect(antes).not.toBeNull();

    const marcar = await request(s)
      .post(`/campaigns/${campaignId}/rolls/${danoRollEventIdPaladin}/damage-extra`)
      .set("Authorization", auth(tokenPaladin))
      .send({ key: "divine-smite" });
    expect(marcar.status).toBe(201);
    expect(marcar.body).toMatchObject({ key: "divine-smite", label: "Castigo divino (2d8)" });

    const despues = await prisma.characterResource.findFirst({
      where: { characterId: paladinId, key: "spell-slot-1" },
    });
    expect(despues!.current).toBe(antes!.current - 1);

    const gastoEvento = await prisma.gameEvent.findFirst({
      where: { campaignId, subjectId: paladinId, type: "RESOURCE_SPENT" },
      orderBy: { createdAt: "desc" },
    });
    expect(gastoEvento).not.toBeNull();
    expect((gastoEvento!.payload as { key: string; reason: string }).key).toBe("spell-slot-1");
    expect((gastoEvento!.payload as { key: string; reason: string }).reason).toBe(
      "Castigo divino (2d8)",
    );

    const previewDM = await request(s)
      .get(`/campaigns/${campaignId}/rolls/${danoRollEventIdPaladin}/damage-preview`)
      .set("Authorization", auth(tokenDM));
    const base = previewDM.body.amount as number;
    const extra = (previewDM.body.extras as { amount: number }[])[0].amount;

    const r = await request(s)
      .post(`/campaigns/${campaignId}/rolls/${danoRollEventIdPaladin}/apply-damage`)
      .set("Authorization", auth(tokenDM));
    expect(r.status).toBe(201);

    const hpChanged = await prisma.gameEvent.findFirst({
      where: { campaignId, type: "HP_CHANGED", subjectId: r.body.character?.id ?? undefined },
      orderBy: { createdAt: "desc" },
    });
    // Sin depender de `subjectId` si la respuesta no lo trae: se relee el último HP_CHANGED de la
    // campaña, que es el que este `apply-damage` acaba de escribir.
    const ultimo =
      hpChanged ??
      (await prisma.gameEvent.findFirst({
        where: { campaignId, type: "HP_CHANGED" },
        orderBy: { createdAt: "desc" },
      }));
    expect((ultimo!.payload as { delta: number }).delta).toBe(-(base + extra));
  });

  // --- Reglas de permiso y de vocabulario cerrado -------------------------------------------

  it("un guerrero sin el rasgo recibe 400 con su nombre", async () => {
    const s = app.getHttpServer();
    const guerreroId = (
      await request(s)
        .post(`/campaigns/${campaignId}/characters`)
        .set("Authorization", auth(tokenDM))
        .send({ name: "Thorin el guerrero", visibility: "PLAYERS" })
    ).body.id;
    await request(s)
      .patch(ficha(guerreroId))
      .set("Authorization", auth(tokenDM))
      .send({ level: 3 });
    await request(s)
      .patch(`${ficha(guerreroId)}/sheet`)
      .set("Authorization", auth(tokenDM))
      .send({
        abilities: { str: 16, dex: 12, con: 14, int: 8, wis: 10, cha: 8 },
        race: { source: "SRD", key: "human" },
        class: { source: "SRD", key: "fighter" },
        choices: { "fighter-skills": ["athletics", "perception"] },
      });
    const goblin = await goblinFacil();
    const danoRollEventId = await atacarHastaImpactar(
      tokenDM,
      guerreroId,
      "long-sword",
      "Espada larga",
      goblin,
    );

    const r = await request(s)
      .post(`/campaigns/${campaignId}/rolls/${danoRollEventId}/damage-extra`)
      .set("Authorization", auth(tokenDM))
      .send({ key: "sneak-attack" });
    expect(r.status).toBe(400);
    expect(r.body.message).toContain("Thorin el guerrero no tiene Ataque furtivo");
  });

  it("un jugador que no es dueño del atacante ni DM recibe 403", async () => {
    // `tokenPaladin` no es dueño del pícaro ni DM, e intenta marcar sobre SU tirada ya aplicada
    // reutilizando el escenario de un ataque nuevo del pícaro para no depender de la aplicada.
    const s = app.getHttpServer();
    const goblin = await goblinFacil();
    const danoRollEventId = await atacarHastaImpactar(
      tokenPicaro,
      picaroId,
      "dagger",
      "Daga",
      goblin,
    );

    const r = await request(s)
      .post(`/campaigns/${campaignId}/rolls/${danoRollEventId}/damage-extra`)
      .set("Authorization", auth(tokenPaladin))
      .send({ key: "sneak-attack" });
    expect(r.status).toBe(403);
  });

  // --- Ola de arreglos (I-2/I-3): aplicar y marcar a la vez ----------------------------------
  //
  // La carrera de verdad, contra Postgres: el DM pulsa «Aplicar» y el paladín marca «Castigo
  // divino» en el mismo instante. Las dos peticiones pueden salir 2xx (si el extra llegó antes,
  // `applyPendingDamage` lo lee bajo candado y lo suma) — lo INVARIANTE es lo que se comprueba:
  // si el extra respondió 2xx, el `HP_CHANGED` de esta tirada incluye su cantidad; si respondió
  // 409, no gastó el espacio (la transacción entera se deshizo). Nunca «marcado en la tarjeta y
  // sin llegar a los PG», ni «espacio gastado sin extra».
  it("I-2/I-3: apply-damage y damage-extra en Promise.all — o el extra entra en la suma, o no gasta el espacio", async () => {
    const s = app.getHttpServer();
    const goblin = await goblinFacil();
    const danoRollEventId = await atacarHastaImpactar(
      tokenPaladin,
      paladinId,
      "long-sword",
      "Espada larga",
      goblin,
    );
    const previewDM = await request(s)
      .get(`/campaigns/${campaignId}/rolls/${danoRollEventId}/damage-preview`)
      .set("Authorization", auth(tokenDM));
    const base = previewDM.body.amount as number;
    const espacioAntes = await prisma.characterResource.findFirst({
      where: { characterId: paladinId, key: "spell-slot-1" },
    });
    expect(espacioAntes!.current).toBeGreaterThan(0);
    const tiradasDeCastigo = () =>
      prisma.gameEvent.count({
        where: {
          campaignId,
          subjectId: paladinId,
          type: "ABILITY_ROLL",
          payload: { path: ["reason"], equals: "Castigo divino (2d8)" },
        },
      });
    const castigosAntes = await tiradasDeCastigo();

    const [aplicar, marcar] = await Promise.all([
      request(s)
        .post(`/campaigns/${campaignId}/rolls/${danoRollEventId}/apply-damage`)
        .set("Authorization", auth(tokenDM)),
      request(s)
        .post(`/campaigns/${campaignId}/rolls/${danoRollEventId}/damage-extra`)
        .set("Authorization", auth(tokenPaladin))
        .send({ key: "divine-smite" }),
    ]);

    // Aplicar siempre gana: o no había extra todavía, o lo lee bajo candado y lo suma.
    expect(aplicar.status).toBe(201);
    expect([201, 409]).toContain(marcar.status);

    const hpChanged = (
      await prisma.gameEvent.findMany({
        where: { campaignId, subjectId: goblin, type: "HP_CHANGED" },
      })
    ).filter((e) => (e.payload as { rollEventId?: string }).rollEventId === danoRollEventId);
    expect(hpChanged).toHaveLength(1);
    const delta = (hpChanged[0].payload as { delta: number }).delta;

    const espacioDespues = await prisma.characterResource.findFirst({
      where: { characterId: paladinId, key: "spell-slot-1" },
    });
    if (marcar.status === 201) {
      expect(delta).toBe(-(base + (marcar.body.amount as number)));
      expect(espacioDespues!.current).toBe(espacioAntes!.current - 1);
    } else {
      expect(delta).toBe(-base);
      expect(espacioDespues!.current).toBe(espacioAntes!.current);
      // Y la tirada del extra se deshizo con la transacción: ninguna ABILITY_ROLL nueva.
      expect(await tiradasDeCastigo()).toBe(castigosAntes);
    }
  });
});
