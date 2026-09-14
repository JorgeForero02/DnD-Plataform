import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { DICE_ROLLER } from "../src/rolls/rolls.service";
import type { Roller } from "../src/dice/dice";

// PE-2 (cierre, 2026-09-14), contra Postgres real — **se escribe, no se corre**: lo corre el
// orquestador (docs/08-pruebas.md). Dos carriles de concurrencia que las unitarias no pueden
// medir porque mockean la base: dos peticiones a la vez, y quién gana la carrera de verdad.
//
// Arranque igual que `puerta-de-efectos.e2e-spec.ts` (equipar, resolver el ataque, tirar el daño
// citándolo) para llegar a un `ABILITY_ROLL` con `pendingDamage`, y a una campaña en modo XP para
// el segundo caso.
describe("Concurrencia real: dos peticiones a la vez sobre el mismo recurso (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const emailDM = `dm-cp${Date.now()}@b.com`;
  const emailA = `a-cp${Date.now()}@b.com`;
  let tokenDM = "";
  let tokenA = "";
  let campaignId = "";
  let personajeA = "";
  let personajeB = "";

  const cola: number[] = [];
  const roller: Roller = (caras) => cola.shift() ?? Math.ceil(caras / 2);

  beforeAll(async () => {
    const ref = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DICE_ROLLER)
      .useValue(roller)
      .compile();
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
    tokenA = (await registrar(emailA, "A")).token;

    campaignId = (
      await request(s)
        .post("/campaigns")
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ name: "Campaña de concurrencia" })
    ).body.id;

    const invite = (
      await request(s)
        .post(`/campaigns/${campaignId}/invites`)
        .set("Authorization", `Bearer ${tokenDM}`)
    ).body.token;
    await request(s).post(`/invites/${invite}/accept`).set("Authorization", `Bearer ${tokenA}`);

    personajeA = (
      await request(s)
        .post(`/campaigns/${campaignId}/characters`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ name: "Aria", level: 5 })
    ).body.id;
    await request(s)
      .patch(`/campaigns/${campaignId}/characters/${personajeA}/sheet`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({
        level: 5,
        abilities: { str: 16, dex: 14, con: 12, int: 10, wis: 10, cha: 8 },
        race: { source: "SRD", key: "human" },
        class: { source: "SRD", key: "fighter" },
        choices: { "fighter-skills": ["athletics", "perception"] },
      });

    personajeB = (
      await request(s)
        .post(`/campaigns/${campaignId}/characters`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ name: "Brann", level: 5 })
    ).body.id;
    await request(s)
      .patch(`/campaigns/${campaignId}/characters/${personajeB}/sheet`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({
        level: 5,
        abilities: { str: 10, dex: 10, con: 12, int: 10, wis: 10, cha: 8 },
        race: { source: "SRD", key: "human" },
        class: { source: "SRD", key: "fighter" },
        choices: { "fighter-skills": ["athletics", "perception"] },
      });
  });

  afterAll(async () => {
    if (campaignId) await prisma.campaign.deleteMany({ where: { id: campaignId } });
    await prisma.user.deleteMany({ where: { email: { in: [emailDM, emailA] } } });
    await app.close();
  });

  // --- 1. Dos apply-damage a la vez: exactamente un 2xx y un 409, un solo HP_CHANGED ----------

  describe("dos POST apply-damage en Promise.all sobre el mismo daño pendiente", () => {
    let danoRollEventId = "";
    let objetivoId = "";

    it("A equipa una espada larga, el DM sube un wight, y A resuelve+tira el daño citándolo", async () => {
      const s = app.getHttpServer();
      await request(s)
        .post(`/campaigns/${campaignId}/characters/${personajeA}/inventory`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({
          ref: { source: "SRD", key: "long-sword" },
          location: "EQUIPPED",
          slot: "MAIN_HAND",
        });

      const hoja = await request(s)
        .get(`/campaigns/${campaignId}/characters/${personajeA}/sheet`)
        .set("Authorization", `Bearer ${tokenA}`);
      const ataque = hoja.body.attacks.find((a: { name: string }) => a.name === "Espada larga");
      expect(ataque).toBeDefined();
      const attackKey = ataque.key;

      const npc = await request(s)
        .post(`/campaigns/${campaignId}/npcs`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ ref: "SRD:wight" });
      objetivoId = npc.body[0].id;
      await request(s)
        .patch(`/campaigns/${campaignId}/characters/${objetivoId}`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ visibility: "PLAYERS" });

      // Natural 20: impacta pase lo que pase (SRD 5.1), el veredicto no depende de la CA.
      cola.push(20);
      const resolve = await request(s)
        .post(
          `/campaigns/${campaignId}/characters/${personajeA}/sheet/attacks/${encodeURIComponent(attackKey)}/resolve`,
        )
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ targetCharacterId: objetivoId, mode: "NORMAL", spendInspiration: false });
      expect(resolve.status).toBe(201);
      expect(cola).toHaveLength(0);

      const dano = await request(s)
        .post(
          `/campaigns/${campaignId}/characters/${personajeA}/sheet/attacks/${encodeURIComponent(attackKey)}/roll`,
        )
        .set("Authorization", `Bearer ${tokenA}`)
        .send({
          part: "DAMAGE",
          spendInspiration: false,
          mode: "NORMAL",
          versatile: false,
          attackRollEventId: resolve.body.roll.eventId,
        });
      expect(dano.status).toBe(201);
      danoRollEventId = dano.body.eventId;

      const evento = await prisma.gameEvent.findFirst({ where: { id: danoRollEventId } });
      const pendingDamage = (evento!.payload as { pendingDamage?: { targetCharacterId: string } })
        .pendingDamage;
      expect(pendingDamage?.targetCharacterId).toBe(objetivoId);
    });

    it("dos apply-damage en Promise.all: exactamente un 2xx y un 409, y un solo HP_CHANGED con este rollEventId", async () => {
      const s = app.getHttpServer();
      const [r1, r2] = await Promise.all([
        request(s)
          .post(`/campaigns/${campaignId}/rolls/${danoRollEventId}/apply-damage`)
          .set("Authorization", `Bearer ${tokenDM}`)
          .send({}),
        request(s)
          .post(`/campaigns/${campaignId}/rolls/${danoRollEventId}/apply-damage`)
          .set("Authorization", `Bearer ${tokenDM}`)
          .send({}),
      ]);

      const estados = [r1.status, r2.status].sort();
      // Un 2xx (la que ganó la carrera) y un 409 (la que llegó tarde al `WHERE … IS NULL`).
      expect(estados[0]).toBeGreaterThanOrEqual(200);
      expect(estados[0]).toBeLessThan(300);
      expect(estados[1]).toBe(409);

      const hpChanged = await prisma.gameEvent.findMany({
        where: { campaignId, subjectId: objetivoId, type: "HP_CHANGED" },
      });
      const deEstaTirada = hpChanged.filter(
        (e) => (e.payload as { rollEventId?: string }).rollEventId === danoRollEventId,
      );
      expect(deEstaTirada).toHaveLength(1);
    });
  });

  // --- 2. Dos POST /xp iguales a la vez: los dos 2xx, y el XP es la suma (no se pierde ninguno) -

  describe("dos POST /xp iguales en Promise.all: award() bloquea filas, no se pierde ninguno", () => {
    it("el DM activa el modo XP en las reglas de la mesa", async () => {
      const s = app.getHttpServer();
      const r = await request(s)
        .patch(`/campaigns/${campaignId}`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ tableRules: { progresion: "XP" } });
      expect(r.status).toBe(200);
    });

    it("dos POST /xp de 50 en Promise.all: los dos 2xx, y xp.actual termina en 100", async () => {
      const s = app.getHttpServer();
      const antes = await request(s)
        .get(`/campaigns/${campaignId}/characters/${personajeB}/sheet`)
        .set("Authorization", `Bearer ${tokenA}`);
      expect(antes.body.xp.actual).toBe(0);

      const [r1, r2] = await Promise.all([
        request(s)
          .post(`/campaigns/${campaignId}/xp`)
          .set("Authorization", `Bearer ${tokenDM}`)
          .send({ characterIds: [personajeB], amount: 50 }),
        request(s)
          .post(`/campaigns/${campaignId}/xp`)
          .set("Authorization", `Bearer ${tokenDM}`)
          .send({ characterIds: [personajeB], amount: 50 }),
      ]);
      expect(r1.status).toBe(201);
      expect(r2.status).toBe(201);

      const despues = await request(s)
        .get(`/campaigns/${campaignId}/characters/${personajeB}/sheet`)
        .set("Authorization", `Bearer ${tokenA}`);
      // La suma de los dos premios, no uno pisando al otro: `award()` bloquea la fila
      // (`SELECT … FOR UPDATE` dentro del mismo `UPDATE`, ver `xp.service.ts`) antes de sumar.
      expect(despues.body.xp.actual).toBe(100);
    });
  });
});
