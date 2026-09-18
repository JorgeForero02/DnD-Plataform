import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

// Task 5 (3A.2, T19) — el ataque de conjuro contra la CA, contra Postgres real. **Se escribe, no
// se corre**: lo corre el orquestador, uno a la vez (docs/08-pruebas.md).
//
// Un mago de nivel 3 (SAB de lanzamiento INT) con `fire-bolt` CONOCIDO (truco: no consume ningún
// recurso, así que reintentar una tirada desfavorable no tiene coste de estado) contra un goblin
// revelado a la mesa (mismo patrón que `lanzar-conjuros.e2e-spec.ts`). El DM anula la CA del
// goblin con `PUT .../overrides/ac` (mismo endpoint que `pnj-en-la-mesa.e2e-spec.ts`) para dejar
// el veredicto determinista sin tener que controlar el azar del servidor — la app real no tiene
// el tirador inyectable (ver `ataque-comparado-en-el-servidor.e2e-spec.ts`).
//
// **Por qué hace falta reintentar de todas formas.** El SRD manda el 20/1 natural POR ENCIMA de
// la CA: con CA 1, un natural 1 sigue siendo MISS (1/20 de las veces); con CA 30, un natural 20
// sigue siendo CRITICAL —e impacta— aunque la CA sea inalcanzable (1/20 de las veces). Los dos
// bucles reintentan hasta ver el veredicto que la CA elegida garantiza en el otro 95% de los
// casos; con `fire-bolt` sin coste, reintentar no deja huella de recursos gastados de más.

describe("El ataque de conjuro contra la CA — fire-bolt, T19 (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const emailDM = `dm-atc${Date.now()}@b.com`;
  const emailMago = `mago-atc${Date.now()}@b.com`;
  let tokenDM = "";
  let tokenMago = "";
  let campaignId = "";
  let magoId = "";
  let goblinId = "";

  const auth = (t: string) => `Bearer ${t}`;
  const ficha = (characterId: string) => `/campaigns/${campaignId}/characters/${characterId}`;
  const usarUrl = () => `${ficha(magoId)}/activities/spell:fire-bolt/use`;

  async function anularCA(valor: number) {
    const r = await request(app.getHttpServer())
      .put(`${ficha(goblinId)}/overrides/ac`)
      .set("Authorization", auth(tokenDM))
      .send({ value: valor });
    expect(r.status).toBe(200);
  }

  async function eventosDe(tipo: string) {
    const s = app.getHttpServer();
    const res = await request(s)
      .get(`/campaigns/${campaignId}/events`)
      .query({ limit: 100 })
      .set("Authorization", auth(tokenMago));
    return (
      res.body.events as { id: string; type: string; payload: Record<string, unknown> }[]
    ).filter((e) => e.type === tipo);
  }

  beforeAll(async () => {
    const ref = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = ref.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    prisma = app.get(PrismaService);
    const s = app.getHttpServer();

    const dm = await request(s)
      .post("/auth/register")
      .send({ email: emailDM, password: "password123", displayName: "DM" });
    tokenDM = dm.body.token;
    const mago = await request(s)
      .post("/auth/register")
      .send({ email: emailMago, password: "password123", displayName: "Mago" });
    tokenMago = mago.body.token;

    campaignId = (
      await request(s)
        .post("/campaigns")
        .set("Authorization", auth(tokenDM))
        .send({ name: "Campaña del ataque de conjuro" })
    ).body.id;
    const invite = (
      await request(s).post(`/campaigns/${campaignId}/invites`).set("Authorization", auth(tokenDM))
    ).body.token;
    await request(s).post(`/invites/${invite}/accept`).set("Authorization", auth(tokenMago));

    magoId = (
      await request(s)
        .post(`/campaigns/${campaignId}/characters`)
        .set("Authorization", auth(tokenMago))
        .send({ name: "Nyx", level: 3, visibility: "PLAYERS" })
    ).body.id;
    await request(s)
      .patch(`${ficha(magoId)}/sheet`)
      .set("Authorization", auth(tokenDM))
      .send({
        level: 3,
        abilities: { str: 8, dex: 12, con: 14, int: 16, wis: 10, cha: 10 },
        race: { source: "SRD", key: "human" },
        class: { source: "SRD", key: "wizard" },
        choices: { "wizard-skills": ["arcana", "investigation"] },
      });

    const fireBolt = await request(s)
      .put(`${ficha(magoId)}/spellbook/fire-bolt`)
      .set("Authorization", auth(tokenMago))
      .send({ estado: "CONOCIDO" });
    expect(fireBolt.status).toBe(200);

    // Un goblin del DM, revelado a la mesa — `PLAYERS` basta para pasar `canView`/`sePuedeApuntar`
    // sin necesitar sesión ni encuentro (mismo patrón que `lanzar-conjuros.e2e-spec.ts`).
    const goblins = await request(s)
      .post(`/campaigns/${campaignId}/npcs`)
      .set("Authorization", auth(tokenDM))
      .send({ ref: "SRD:goblin", count: 1, hp: "AVERAGE" });
    goblinId = goblins.body[0].id;
    await request(s)
      .patch(ficha(goblinId))
      .set("Authorization", auth(tokenDM))
      .send({ visibility: "PLAYERS" });
  });

  afterAll(async () => {
    if (campaignId) await prisma.campaign.deleteMany({ where: { id: campaignId } });
    await prisma.user.deleteMany({ where: { email: { in: [emailDM, emailMago] } } });
    await app.close();
  });

  // --- 1. CA anulada a 1 — impacta de sobra: HIT/CRITICAL, ATTACK_RESOLVED, daño a la bandeja ----

  let danoRollEventId = "";

  it("con la CA del goblin anulada a 1, fire-bolt impacta: 201, ATTACK_RESOLVED, ABILITY_ROLL.pendingDamage — y la CA no aparece en ningún cuerpo", async () => {
    const s = app.getHttpServer();
    await anularCA(1);

    let cuerpo: Record<string, unknown> | undefined;
    // Hasta 10 intentos: con CA 1, solo un natural 1 (1/20) da MISS. `fire-bolt` no gasta
    // recursos, así que reintentar no deja ningún estado a medias que limpiar.
    for (let i = 0; i < 10; i++) {
      const usar = await request(s)
        .post(usarUrl())
        .set("Authorization", auth(tokenMago))
        .send({ objetivos: [goblinId] });
      expect(usar.status).toBe(201);
      cuerpo = usar.body as Record<string, unknown>;
      if (cuerpo.verdict !== "MISS") break;
    }
    expect(["HIT", "CRITICAL"]).toContain(cuerpo!.verdict);

    // Ningún cuerpo — ni este ni el resto de la suite — deja ver la CA del goblin.
    expect(JSON.stringify(cuerpo)).not.toMatch(/"ac"|"armorClass"|"targetAc"|"targetArmorClass"/i);

    const ataqueResuelto = (await eventosDe("ATTACK_RESOLVED")).find(
      (e) => e.payload.attackName === "Descarga de fuego",
    );
    expect(ataqueResuelto).toBeDefined();

    const tiradaDeDano = (await eventosDe("ABILITY_ROLL")).find(
      (e) =>
        (e.payload.pendingDamage as { targetCharacterId?: string } | undefined)
          ?.targetCharacterId === goblinId,
    );
    expect(tiradaDeDano).toBeDefined();
    expect(tiradaDeDano!.payload.pendingDamage).toMatchObject({
      targetCharacterId: goblinId,
      damageType: "FIRE",
      reason: "Conjuro: Descarga de fuego",
    });
    expect(
      (tiradaDeDano!.payload.pendingDamage as { attackResolvedEventId?: string })
        .attackResolvedEventId,
    ).toBeTruthy();
    danoRollEventId = tiradaDeDano!.id;

    // El daño está en la bandeja, no aplicado todavía.
    const hpEventos = await eventosDe("HP_CHANGED");
    expect(hpEventos.some((e) => e.payload.reason === "Conjuro: Descarga de fuego")).toBe(false);

    // Y la CA tampoco aparece en el suceso del ataque ni en el de su daño — los dos que el mago
    // puede releer sobre ESTE ataque. (No se compara el registro entero: contiene también el
    // `MANUAL_OVERRIDE_SET` que el propio DM acaba de escribir con `target: "ac"`, que es su
    // propia acción, no una fuga de la CA calculada del objetivo — el mismo motivo por el que
    // `ataque-comparado-en-el-servidor.e2e-spec.ts` no anula ninguna CA en su montaje.)
    expect(JSON.stringify(ataqueResuelto)).not.toMatch(
      /"ac"|"armorClass"|"targetAc"|"targetArmorClass"/i,
    );
    expect(JSON.stringify(tiradaDeDano)).not.toMatch(
      /"ac"|"armorClass"|"targetAc"|"targetArmorClass"/i,
    );
  });

  it("el DM aplica el daño: 200/201, y los PG del goblin bajan", async () => {
    const s = app.getHttpServer();
    const antes = await request(s)
      .get(`${ficha(goblinId)}/sheet`)
      .set("Authorization", auth(tokenDM));

    const r = await request(s)
      .post(`/campaigns/${campaignId}/rolls/${danoRollEventId}/apply-damage`)
      .set("Authorization", auth(tokenDM));
    expect(r.status).toBe(201);

    const despues = await request(s)
      .get(`${ficha(goblinId)}/sheet`)
      .set("Authorization", auth(tokenDM));
    expect(despues.body.hp.current).toBeLessThan(antes.body.hp.current);
  });

  // --- 2. CA anulada a 30 — falla de sobra: MISS, sin pendingDamage ------------------------------

  it("con la CA del goblin anulada a 30, fire-bolt falla: MISS y ningún pendingDamage nuevo", async () => {
    const s = app.getHttpServer();
    await anularCA(30);

    let cuerpo: Record<string, unknown> | undefined;
    // Hasta 10 intentos: con CA 30, solo un natural 20 (1/20) impacta (CRITICAL) pase lo que
    // pase — y ese intento SÍ tira daño, como cualquier crítico. No se cuentan `ABILITY_ROLL`
    // antes/después (un CRITICAL de paso añadiría uno y el conteo daría un falso positivo); la
    // prueba es sobre la llamada que de verdad dio MISS, no sobre el registro entero.
    for (let i = 0; i < 10; i++) {
      const usar = await request(s)
        .post(usarUrl())
        .set("Authorization", auth(tokenMago))
        .send({ objetivos: [goblinId] });
      expect(usar.status).toBe(201);
      cuerpo = usar.body as Record<string, unknown>;
      if (cuerpo.verdict === "MISS") break;
    }
    expect(cuerpo!.verdict).toBe("MISS");
    // **La respuesta de ESTA llamada con MISS no trae `rollEventIds`**: un fallo no tira daño.
    expect(cuerpo!.rollEventIds).toBeUndefined();
  });

  // --- 3. sin objetivo, y con más de uno — la cardinalidad de un ataque ---------------------------

  it("sin objetivo, fire-bolt se lanza igual: 201, solo traza, sin verdict", async () => {
    const s = app.getHttpServer();
    const usar = await request(s).post(usarUrl()).set("Authorization", auth(tokenMago)).send({});
    expect(usar.status).toBe(201);
    expect(usar.body.verdict).toBeUndefined();
    expect(usar.body.traza).toBeDefined();
  });

  it("con más de un objetivo, es 400: un ataque tiene un objetivo", async () => {
    const s = app.getHttpServer();
    const segundo = await request(s)
      .post(`/campaigns/${campaignId}/npcs`)
      .set("Authorization", auth(tokenDM))
      .send({ ref: "SRD:goblin", count: 1, hp: "AVERAGE" });
    const segundoId = segundo.body[0].id;
    await request(s)
      .patch(ficha(segundoId))
      .set("Authorization", auth(tokenDM))
      .send({ visibility: "PLAYERS" });

    const usar = await request(s)
      .post(usarUrl())
      .set("Authorization", auth(tokenMago))
      .send({ objetivos: [goblinId, segundoId] });
    expect(usar.status).toBe(400);
  });

  it("un ataque contra uno mismo es 400", async () => {
    const s = app.getHttpServer();
    const usar = await request(s)
      .post(usarUrl())
      .set("Authorization", auth(tokenMago))
      .send({ objetivos: [magoId] });
    expect(usar.status).toBe(400);
  });
});
