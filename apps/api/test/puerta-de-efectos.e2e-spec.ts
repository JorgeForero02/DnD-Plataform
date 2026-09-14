import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import type { Actividad } from "@dnd/shared";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { ACTIVITY_CATALOG, type ActivityCatalog } from "../src/activities/activities.service";
import { DICE_ROLLER } from "../src/rolls/rolls.service";
import type { Roller } from "../src/dice/dice";

// Puerta de efectos §4 (tarea 2), contra Postgres real. **Se escribe, no se corre**: lo corre el
// orquestador, uno a la vez (docs/08-pruebas.md).
//
// Lo que las unitarias no pueden medir es el recorrido completo: que el daño de una salvación se
// tira UNA vez en `usar()`, que las DOS peticiones de tirada que salen de ahí cargan el MISMO
// `pendingEffect`, y que responder cada una — quizá minutos después, quizá el DM respondiendo por
// un PNJ — aplica entero, mitad o nada según esa tirada concreta, dentro de la transacción que
// cierra la petición.
//
// **`cura-de-prueba`** (tipo `dados`, sin salvación) comprueba que el I5 cerrado en esta tarea no
// tocó el camino de daño/curación directo, que ya pasaba por `changeHpFromEffect` desde la tarea 1.
//
// **`bola-de-prueba`** (tipo `salvacion`, CD 15, `siSalva: "mitad"`, `8d6` de fuego) es la que
// ejercita la puerta nueva: SRD 5.1, *Fireball*, es la actividad de la que este caso de prueba
// toma su forma casi al pie de la letra.
const curaDePrueba: Actividad = {
  tipo: "dados",
  activation: { coste: "ACTION" },
  consumption: [],
  duration: { unidad: "instantanea", concentracion: false },
  effects: [],
  description: "Actividad de prueba: cura sin salvación de por medio.",
  dados: { n: 2, caras: 8, bonus: { tipo: "fijo", valor: 3 }, signo: 1 },
};

const bolaDePrueba: Actividad = {
  tipo: "salvacion",
  activation: { coste: "ACTION" },
  consumption: [],
  duration: { unidad: "instantanea", concentracion: false },
  effects: [],
  description: "Actividad de prueba: una bola de fuego en miniatura, para probar la puerta.",
  salvacion: { ability: "dex", cd: { tipo: "fijo", valor: 15 }, siSalva: "mitad" },
  dados: { n: 8, caras: 6, signo: -1, tipoDeDano: "FIRE" },
};

// Solo para el Step 6 — comprobar que un objetivo invisible corta ANTES de gastar nada. Con un
// recurso propio y seguido de cerca, y no de uno de los dos de arriba: así la prueba no depende de
// que ninguna otra deje el consumo en un estado concreto.
const pruebaConRecurso: Actividad = {
  tipo: "utilidad",
  activation: { coste: "ACTION" },
  consumption: [{ recurso: "test-slot", cantidad: 1 }],
  duration: { unidad: "instantanea", concentracion: false },
  effects: [],
  description: "Actividad de prueba: solo para comprobar que un objetivo DM_ONLY no gasta nada.",
};

const catalogoDePrueba: ActivityCatalog = {
  find: (key) =>
    ({
      "cura-de-prueba": curaDePrueba,
      "bola-de-prueba": bolaDePrueba,
      "prueba-con-recurso": pruebaConRecurso,
    })[key],
};

describe("La puerta de efectos: el daño de una salvación se tira una vez y se aplica al responder (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const emailDM = `dm-pe${Date.now()}@b.com`;
  const emailA = `a-pe${Date.now()}@b.com`;
  const emailB = `b-pe${Date.now()}@b.com`;
  let tokenDM = "";
  let tokenA = "";
  let tokenB = "";
  let userIdA = "";
  let campaignId = "";
  let personajeA = "";
  let personajeB = "";
  let personajeC = ""; // PNJ del DM, visible: responde el DM en su lugar.
  let personajeD = ""; // PNJ del DM, DM_ONLY: para el Step 6.

  // **La cola del tirador fijo.** `roller` no es aleatorio: saca de `cola` en el mismo orden en
  // que el motor pide sus dados, y si `cola` está vacía cae en `Math.ceil(caras / 2)` — un valor
  // fijo y no un azar de verdad, para que cualquier tirada que esta prueba no controle a propósito
  // (el daño en dados de las dos actividades) siga siendo determinista sin que haga falta encolar
  // nada para ella.
  const cola: number[] = [];
  const roller: Roller = (caras) => cola.shift() ?? Math.ceil(caras / 2);

  beforeAll(async () => {
    const ref = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ACTIVITY_CATALOG)
      .useValue(catalogoDePrueba)
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
      ).body as { token: string; user: { id: string } };

    const dm = await registrar(emailDM, "DM");
    tokenDM = dm.token;
    const a = await registrar(emailA, "A");
    tokenA = a.token;
    userIdA = a.user.id;
    const b = await registrar(emailB, "B");
    tokenB = b.token;

    campaignId = (
      await request(s)
        .post("/campaigns")
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ name: "Campaña de la puerta de efectos" })
    ).body.id;

    for (const token of [tokenA, tokenB]) {
      const invite = (
        await request(s)
          .post(`/campaigns/${campaignId}/invites`)
          .set("Authorization", `Bearer ${tokenDM}`)
      ).body.token;
      await request(s).post(`/invites/${invite}/accept`).set("Authorization", `Bearer ${token}`);
    }

    // Un personaje por jugador, con hoja derivable — mismo payload que `furia.e2e-spec.ts`, salvo
    // por la característica que aquí importa (Destreza), para que `save.dex` derive de verdad.
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
        abilities: { str: 10, dex: 14, con: 12, int: 16, wis: 10, cha: 8 },
        race: { source: "SRD", key: "human" },
        class: { source: "SRD", key: "wizard" },
        choices: { "wizard-skills": ["arcana", "investigation"] },
      });

    personajeB = (
      await request(s)
        .post(`/campaigns/${campaignId}/characters`)
        .set("Authorization", `Bearer ${tokenB}`)
        .send({ name: "Brann", level: 5 })
    ).body.id;
    await request(s)
      .patch(`/campaigns/${campaignId}/characters/${personajeB}/sheet`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({
        level: 5,
        abilities: { str: 16, dex: 10, con: 14, int: 8, wis: 10, cha: 8 },
        race: { source: "SRD", key: "human" },
        class: { source: "SRD", key: "fighter" },
        choices: { "fighter-skills": ["athletics", "perception"] },
      });

    // Dos goblins del DM: uno visible (C, el que responde el DM en su lugar) y otro que se queda
    // `DM_ONLY` (D, el del Step 6) — es el visibility con el que nace todo PNJ instanciado
    // (`NpcsService.instanciar`), y aquí no se toca a propósito.
    const goblins = await request(s)
      .post(`/campaigns/${campaignId}/npcs`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ ref: "SRD:goblin", count: 2, hp: "AVERAGE" });
    personajeC = goblins.body[0].id;
    personajeD = goblins.body[1].id;
    await request(s)
      .patch(`/campaigns/${campaignId}/characters/${personajeC}`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ visibility: "PLAYERS" });

    // El recurso del Step 6, seguido de cerca: 1 de 1, propio de A.
    await prisma.characterResource.create({
      data: {
        characterId: personajeA,
        key: "test-slot",
        label: "Ranura de prueba",
        current: 1,
        max: 1,
      },
    });
  });

  afterAll(async () => {
    if (campaignId) await prisma.campaign.deleteMany({ where: { id: campaignId } });
    await prisma.user.deleteMany({ where: { email: { in: [emailDM, emailA, emailB] } } });
    await app.close();
  });

  // --- 1. A cura a B con cura-de-prueba: el I5 cerrado no tocó el camino directo ---------------

  it("A cura a B con cura-de-prueba, y el HP_CHANGED de B lo firma A con su razón", async () => {
    const s = app.getHttpServer();

    const usar = await request(s)
      .post(`/campaigns/${campaignId}/characters/${personajeA}/activities/cura-de-prueba/use`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ objetivos: [personajeB] });
    expect(usar.status).toBe(201);

    const ultimo = await prisma.gameEvent.findFirst({
      where: { campaignId, subjectId: personajeB, type: "HP_CHANGED" },
      orderBy: { createdAt: "desc" },
    });
    expect(ultimo).not.toBeNull();
    expect(ultimo!.actorUserId).toBe(userIdA);
    expect((ultimo!.payload as { reason?: string }).reason).toBe("Actividad: cura-de-prueba");
  });

  // --- 2. A no puede cambiar los PG de B directamente: eso no cambió con esta tarea -----------

  it("A no puede cambiar los PG de B a mano (403, sin cambios)", async () => {
    const s = app.getHttpServer();
    const antes = await request(s)
      .get(`/campaigns/${campaignId}/characters/${personajeB}/sheet`)
      .set("Authorization", `Bearer ${tokenB}`);

    const r = await request(s)
      .post(`/campaigns/${campaignId}/characters/${personajeB}/hp`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ delta: -1, reason: "no debería poder" });
    expect(r.status).toBe(403);

    const despues = await request(s)
      .get(`/campaigns/${campaignId}/characters/${personajeB}/sheet`)
      .set("Authorization", `Bearer ${tokenB}`);
    expect(despues.body.hp.current).toBe(antes.body.hp.current);
  });

  // --- 3. A lanza bola-de-prueba a [B, C]: el daño se tira UNA vez, y viaja igual a los dos ---

  let amount = 0;

  it("A lanza bola-de-prueba a B y C: la traza trae los dados, y las dos peticiones cargan el mismo pendingEffect.amount", async () => {
    const s = app.getHttpServer();

    const usar = await request(s)
      .post(`/campaigns/${campaignId}/characters/${personajeA}/activities/bola-de-prueba/use`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ objetivos: [personajeB, personajeC] });
    expect(usar.status).toBe(201);
    expect(usar.body.cd).toBe(15);
    expect(usar.body.traza).toBeDefined();
    expect(usar.body.traza.length).toBeGreaterThan(0);

    const peticiones = await prisma.rollRequest.findMany({
      where: { campaignId, key: "save.dex", characterId: { in: [personajeB, personajeC] } },
      orderBy: { createdAt: "desc" },
      take: 2,
    });
    expect(peticiones).toHaveLength(2);
    expect(peticiones.every((p) => p.requestedById === userIdA)).toBe(true);
    const amounts = peticiones.map((p) => (p.pendingEffect as { amount: number } | null)?.amount);
    expect(amounts[0]).toBeDefined();
    expect(amounts[0]).toBe(amounts[1]);
    amount = amounts[0]!;
  });

  // --- 4. B falla su salvación (daño entero) y C, el DM, empata la CD (mitad) -----------------

  it("B responde con un d20 que falla: pierde `amount` de PG, entero", async () => {
    const s = app.getHttpServer();

    const pendientesDeB = await request(s)
      .get(`/campaigns/${campaignId}/roll-requests`)
      .set("Authorization", `Bearer ${tokenB}`);
    const peticionDeB = pendientesDeB.body.find(
      (p: { characterId: string; key: string }) =>
        p.characterId === personajeB && p.key === "save.dex",
    );
    expect(peticionDeB).toBeDefined();

    const antes = await request(s)
      .get(`/campaigns/${campaignId}/characters/${personajeB}/sheet`)
      .set("Authorization", `Bearer ${tokenB}`);

    // Un `1` natural falla salvo un modificador de Destreza descomunal — nada que un personaje de
    // nivel 5 con Destreza 10 (el que se le dio arriba) vaya a tener.
    cola.push(1);
    const r = await request(s)
      .post(`/campaigns/${campaignId}/roll-requests/${peticionDeB.id}/roll`)
      .set("Authorization", `Bearer ${tokenB}`)
      .send({});
    expect(r.status).toBe(201);
    expect(r.body.effectApplied).toEqual({ delta: -amount, saved: false });

    const despues = await request(s)
      .get(`/campaigns/${campaignId}/characters/${personajeB}/sheet`)
      .set("Authorization", `Bearer ${tokenB}`);
    expect(despues.body.hp.current).toBe(antes.body.hp.current - amount);
  });

  it("el DM responde por C con un d20 que empata la CD: mitad, redondeada abajo", async () => {
    const s = app.getHttpServer();

    const pendientesDelDM = await request(s)
      .get(`/campaigns/${campaignId}/roll-requests`)
      .set("Authorization", `Bearer ${tokenDM}`);
    const peticionDeC = pendientesDelDM.body.find(
      (p: { characterId: string; key: string; resolvedAt: string | null }) =>
        p.characterId === personajeC && p.key === "save.dex" && p.resolvedAt === null,
    );
    expect(peticionDeC).toBeDefined();
    // El mismo modificador que `answer()` va a usar para tirar — `list()` lo calcula con la misma
    // hoja (`RollRequestsService.modificadorDeLaHoja`), así que empatar la CD con él es exacto y
    // no una aproximación.
    const modificadorDeC = peticionDeC.modifier as number;
    const d20ParaEmpatar = 15 - modificadorDeC;
    expect(d20ParaEmpatar).toBeGreaterThanOrEqual(1);
    expect(d20ParaEmpatar).toBeLessThanOrEqual(20);

    cola.push(d20ParaEmpatar);
    const r = await request(s)
      .post(`/campaigns/${campaignId}/roll-requests/${peticionDeC.id}/roll`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({});
    expect(r.status).toBe(201);
    expect(r.body.effectApplied).toEqual({ delta: -Math.floor(amount / 2), saved: true });
  });

  // --- 5. A sigue sin poder pedir tiradas directamente: `create()` sigue exigiendo DM ----------

  it("A no puede pedir una tirada directamente (403, sin cambios)", async () => {
    const r = await request(app.getHttpServer())
      .post(`/campaigns/${campaignId}/roll-requests`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ characterIds: [personajeB], key: "save.dex", label: "Intento directo" });
    expect(r.status).toBe(403);
  });

  // --- 6. Un objetivo DM_ONLY corta antes de gastar nada: la garantía ya existía ---------------

  it("A usa una actividad sobre un PNJ DM_ONLY: 404, y su recurso no se gastó", async () => {
    const s = app.getHttpServer();

    const r = await request(s)
      .post(`/campaigns/${campaignId}/characters/${personajeA}/activities/prueba-con-recurso/use`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ objetivos: [personajeD] });
    expect(r.status).toBe(404);

    const recurso = await prisma.characterResource.findFirst({
      where: { characterId: personajeA, key: "test-slot" },
    });
    expect(recurso?.current).toBe(1);
  });

  // --- 7. La bandeja de daño (tarea 3, spec §4b.4-§4b.7) ---------------------------------------
  //
  // El daño de un ataque RESUELTO sabe a quién le toca sin que nadie lo declare, la mesa lo ve
  // antes de aplicarlo —y solo dueño o DM del objetivo, o es filtrar por otra puerta—, y aplicarlo
  // es un botón de un solo uso: el segundo clic es un 409, no un segundo golpe.
  //
  // El catálogo SRD no trae un «fantasma»: el brief acepta cualquier statblock con `RESISTANT` a
  // `SLASHING`, y `SRD:wight` lo es —«de ataques no mágicos con armas que no sean de plata»—, así
  // que hace de sustituto. A no necesita ser un guerrero de verdad para este bloque: solo necesita
  // llevar la espada larga equipada, que es lo único de lo que depende el tipo de daño.
  describe("la bandeja de daño (tarea 3, spec §4b.4-§4b.7)", () => {
    let attackKey = "";
    let fantasmaId = "";
    let danoRollEventId = "";
    let amountBandeja = 0;

    it("A equipa una espada larga y el DM sube un SRD:wight (resistente a cortante) a la mesa", async () => {
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
      attackKey = ataque.key;

      const npc = await request(s)
        .post(`/campaigns/${campaignId}/npcs`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ ref: "SRD:wight" });
      fantasmaId = npc.body[0].id;
      // `PLAYERS`: A tiene que poder verlo (y por tanto atacarlo, D-OP-11) sin montar un
      // encuentro — este bloque no necesita esa maquinaria, solo el veredicto y el daño.
      await request(s)
        .patch(`/campaigns/${campaignId}/characters/${fantasmaId}`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ visibility: "PLAYERS" });
    });

    it("A resuelve el ataque (impacta) y tira el daño citándolo: el ABILITY_ROLL trae pendingDamage con el wight como objetivo", async () => {
      const s = app.getHttpServer();
      // Natural 20: SRD 5.1, «impacta pase lo que pase» — así el veredicto nunca depende de la CA.
      cola.push(20);
      const resolve = await request(s)
        .post(
          `/campaigns/${campaignId}/characters/${personajeA}/sheet/attacks/${encodeURIComponent(attackKey)}/resolve`,
        )
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ targetCharacterId: fantasmaId, mode: "NORMAL", spendInspiration: false });
      expect(resolve.status).toBe(201);
      expect(["HIT", "CRITICAL"]).toContain(resolve.body.verdict);

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
      amountBandeja = dano.body.total;

      const evento = await prisma.gameEvent.findFirst({ where: { id: danoRollEventId } });
      const pendingDamage = (evento!.payload as { pendingDamage?: { targetCharacterId: string } })
        .pendingDamage;
      expect(pendingDamage?.targetCharacterId).toBe(fantasmaId);
    });

    it("A pide el preview de su propio daño: 404. El DM: 200, con la mitad exacta y el modificador", async () => {
      const s = app.getHttpServer();
      const comoA = await request(s)
        .get(`/campaigns/${campaignId}/rolls/${danoRollEventId}/damage-preview`)
        .set("Authorization", `Bearer ${tokenA}`);
      expect(comoA.status).toBe(404);

      const comoDM = await request(s)
        .get(`/campaigns/${campaignId}/rolls/${danoRollEventId}/damage-preview`)
        .set("Authorization", `Bearer ${tokenDM}`);
      expect(comoDM.status).toBe(200);
      expect(comoDM.body.resulting.taken).toBe(Math.floor(amountBandeja / 2));
      expect(comoDM.body.resulting.modifier).toBe("resistant");
    });

    it("A no puede aplicar (403); el DM sí (200), y el HP_CHANGED del wight lo firma A con esta tirada; el segundo clic del DM es 409", async () => {
      const s = app.getHttpServer();
      const comoA = await request(s)
        .post(`/campaigns/${campaignId}/rolls/${danoRollEventId}/apply-damage`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({});
      expect(comoA.status).toBe(403);

      const comoDM = await request(s)
        .post(`/campaigns/${campaignId}/rolls/${danoRollEventId}/apply-damage`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({});
      expect(comoDM.status).toBe(201);

      const hpChanged = await prisma.gameEvent.findFirst({
        where: { campaignId, subjectId: fantasmaId, type: "HP_CHANGED" },
        orderBy: { createdAt: "desc" },
      });
      expect(hpChanged).not.toBeNull();
      expect(hpChanged!.actorUserId).toBe(userIdA);
      expect((hpChanged!.payload as { rollEventId?: string }).rollEventId).toBe(danoRollEventId);

      const segundoClic = await request(s)
        .post(`/campaigns/${campaignId}/rolls/${danoRollEventId}/apply-damage`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({});
      expect(segundoClic.status).toBe(409);
    });

    it("un daño tirado sin attackRollEventId no lleva pendingDamage: su preview es 404 hasta para el DM", async () => {
      const s = app.getHttpServer();
      const dano = await request(s)
        .post(
          `/campaigns/${campaignId}/characters/${personajeA}/sheet/attacks/${encodeURIComponent(attackKey)}/roll`,
        )
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ part: "DAMAGE", spendInspiration: false, mode: "NORMAL", versatile: false });
      expect(dano.status).toBe(201);

      const preview = await request(s)
        .get(`/campaigns/${campaignId}/rolls/${dano.body.eventId}/damage-preview`)
        .set("Authorization", `Bearer ${tokenDM}`);
      expect(preview.status).toBe(404);
    });
  });

  // --- 8. «Hasta el próximo descanso» (tarea 4, spec §5) ---------------------------------------
  //
  // El DM aplica a B dos condiciones con la misma llamada que ya existía, cada una con su
  // duración: `poisoned` hasta el próximo descanso CORTO, `frightened` hasta el próximo LARGO. Un
  // descanso corto solo tiene que llevarse la primera. Y `durationSeconds` con `expiresOnRest` a
  // la vez tiene que ser un 400, aquí y no solo en la unitaria del esquema.
  describe("hasta el próximo descanso", () => {
    it("el DM aplica poisoned (hasta un descanso corto) y frightened (hasta uno largo) a B", async () => {
      const s = app.getHttpServer();

      const poisoned = await request(s)
        .put(`/campaigns/${campaignId}/characters/${personajeB}/conditions/poisoned`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ expiresOnRest: "SHORT" });
      expect(poisoned.status).toBe(200);

      const frightened = await request(s)
        .put(`/campaigns/${campaignId}/characters/${personajeB}/conditions/frightened`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ expiresOnRest: "LONG" });
      expect(frightened.status).toBe(200);
    });

    it("aplicar poisoned con durationSeconds Y expiresOnRest a la vez es 400", async () => {
      const s = app.getHttpServer();
      const r = await request(s)
        .put(`/campaigns/${campaignId}/characters/${personajeB}/conditions/poisoned`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ durationSeconds: 60, expiresOnRest: "LONG" });
      expect(r.status).toBe(400);
    });

    it('un descanso corto de B retira poisoned y deja frightened; el último CONDITION_REMOVED dice "Descanso corto"', async () => {
      const s = app.getHttpServer();

      const descanso = await request(s)
        .post(`/campaigns/${campaignId}/characters/${personajeB}/rest`)
        .set("Authorization", `Bearer ${tokenB}`)
        .send({ kind: "SHORT" });
      expect(descanso.status).toBe(201);

      const condiciones = await request(s)
        .get(`/campaigns/${campaignId}/characters/${personajeB}/conditions`)
        .set("Authorization", `Bearer ${tokenB}`);
      const claves = (condiciones.body as { key: string }[]).map((c) => c.key);
      expect(claves).not.toContain("poisoned");
      expect(claves).toContain("frightened");

      const ultimoRemoved = await prisma.gameEvent.findFirst({
        where: { campaignId, subjectId: personajeB, type: "CONDITION_REMOVED" },
        orderBy: { createdAt: "desc" },
      });
      expect(ultimoRemoved).not.toBeNull();
      expect((ultimoRemoved!.payload as { key?: string; reason?: string }).key).toBe("poisoned");
      expect((ultimoRemoved!.payload as { key?: string; reason?: string }).reason).toBe(
        "Descanso corto",
      );
    });
  });

  // --- 9. XP (tarea 5, spec §5 bis) ----------------------------------------------------------
  //
  // Solo el DM da XP, nunca a un PNJ de statblock, y `end()` propone (no aplica) el reparto de
  // la suma de VD entre quienes pueden recibirlo — el DM confirma en «Dar XP».
  describe("XP (tarea 5, spec §5 bis)", () => {
    let sessionXpId = "";

    it("el DM activa el modo XP en las reglas de la mesa", async () => {
      const s = app.getHttpServer();
      const r = await request(s)
        .patch(`/campaigns/${campaignId}`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ tableRules: { progresion: "XP" } });
      expect(r.status).toBe(200);
    });

    it("un jugador no puede dar XP (403)", async () => {
      const s = app.getHttpServer();
      const r = await request(s)
        .post(`/campaigns/${campaignId}/xp`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ characterIds: [personajeB], amount: 50 });
      expect(r.status).toBe(403);
    });

    it("el DM da XP a un PNJ de statblock: 400", async () => {
      const s = app.getHttpServer();
      const r = await request(s)
        .post(`/campaigns/${campaignId}/xp`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ characterIds: [personajeC], amount: 50 });
      expect(r.status).toBe(400);
    });

    it("el DM da 450 PX a A y B: 200, y la hoja de A trae xp.actual === 450", async () => {
      const s = app.getHttpServer();
      const r = await request(s)
        .post(`/campaigns/${campaignId}/xp`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ characterIds: [personajeA, personajeB], amount: 450 });
      expect(r.status).toBe(201);

      const hoja = await request(s)
        .get(`/campaigns/${campaignId}/characters/${personajeA}/sheet`)
        .set("Authorization", `Bearer ${tokenA}`);
      expect(hoja.body.xp.actual).toBe(450);
    });

    it("en modo HITO la hoja no trae xp", async () => {
      const s = app.getHttpServer();
      await request(s)
        .patch(`/campaigns/${campaignId}`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ tableRules: { progresion: "HITO" } });

      const hoja = await request(s)
        .get(`/campaigns/${campaignId}/characters/${personajeA}/sheet`)
        .set("Authorization", `Bearer ${tokenA}`);
      expect(hoja.body.xp).toBeUndefined();

      // Se deja en XP otra vez: el resto de este bloque lo necesita.
      await request(s)
        .patch(`/campaigns/${campaignId}`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ tableRules: { progresion: "XP" } });
    });

    // Dos goblins contra A y B: al terminar el combate, `end()` propone 50 por cabeza.
    it("dos goblins contra A y B: end() propone xpPropuesto.total 100, porCabeza 50", async () => {
      const s = app.getHttpServer();
      sessionXpId = (
        await request(s)
          .post(`/campaigns/${campaignId}/sessions`)
          .set("Authorization", `Bearer ${tokenDM}`)
          .send({ title: "Sesión de XP", visibility: "PLAYERS" })
      ).body.id;

      // Dos goblins nuevos y propios de este bloque, para no interferir con `personajeC`/`D` del
      // bloque de la bandeja de daño.
      const goblins = await request(s)
        .post(`/campaigns/${campaignId}/npcs`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ ref: "SRD:goblin", count: 2, hp: "AVERAGE" });
      const [goblin1, goblin2] = goblins.body.map((g: { id: string }) => g.id);

      const creado = await request(s)
        .post(`/campaigns/${campaignId}/sessions/${sessionXpId}/encounters`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ characterIds: [personajeA, personajeB, goblin1, goblin2] });
      expect(creado.status).toBe(201);
      const encounterId = creado.body.id;

      const ponerBando = async (characterId: string, side: "ALLY" | "ENEMY") => {
        const combatiente = creado.body.combatants.find(
          (c: { characterId: string }) => c.characterId === characterId,
        );
        const r = await request(s)
          .patch(
            `/campaigns/${campaignId}/sessions/${sessionXpId}/encounters/${encounterId}/combatants/${combatiente.id}/side`,
          )
          .set("Authorization", `Bearer ${tokenDM}`)
          .send({ side });
        expect(r.status).toBe(200);
      };
      await ponerBando(personajeA, "ALLY");
      await ponerBando(personajeB, "ALLY");
      await ponerBando(goblin1, "ENEMY");
      await ponerBando(goblin2, "ENEMY");

      const fin = await request(s)
        .post(`/campaigns/${campaignId}/sessions/${sessionXpId}/encounters/${encounterId}/end`)
        .set("Authorization", `Bearer ${tokenDM}`);
      expect(fin.status).toBe(201);
      expect(fin.body.xpPropuesto.total).toBe(100);
      expect(fin.body.xpPropuesto.porCabeza).toBe(50);

      const antesA = await request(s)
        .get(`/campaigns/${campaignId}/characters/${personajeA}/sheet`)
        .set("Authorization", `Bearer ${tokenA}`);
      const antesB = await request(s)
        .get(`/campaigns/${campaignId}/characters/${personajeB}/sheet`)
        .set("Authorization", `Bearer ${tokenB}`);

      const confirmar = await request(s)
        .post(`/campaigns/${campaignId}/xp`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ characterIds: [personajeA, personajeB], amount: fin.body.xpPropuesto.porCabeza });
      expect(confirmar.status).toBe(201);

      const despuesA = await request(s)
        .get(`/campaigns/${campaignId}/characters/${personajeA}/sheet`)
        .set("Authorization", `Bearer ${tokenA}`);
      const despuesB = await request(s)
        .get(`/campaigns/${campaignId}/characters/${personajeB}/sheet`)
        .set("Authorization", `Bearer ${tokenB}`);
      expect(despuesA.body.xp.actual).toBe(antesA.body.xp.actual + 50);
      expect(despuesB.body.xp.actual).toBe(antesB.body.xp.actual + 50);
    });

    it("un jugador no puede terminar el combate (403, ya era así)", async () => {
      const s = app.getHttpServer();
      const otro = await request(s)
        .post(`/campaigns/${campaignId}/sessions/${sessionXpId}/encounters`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ characterIds: [personajeA] });
      const r = await request(s)
        .post(`/campaigns/${campaignId}/sessions/${sessionXpId}/encounters/${otro.body.id}/end`)
        .set("Authorization", `Bearer ${tokenA}`);
      expect(r.status).toBe(403);
    });
  });
});
