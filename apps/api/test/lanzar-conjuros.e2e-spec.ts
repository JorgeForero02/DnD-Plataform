import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

// Tarea 4 (3A.2) — lanzar un conjuro por `usar()`, contra Postgres real. **Se escribe, no se
// corre**: lo corre el orquestador, uno a la vez (docs/08-pruebas.md).
//
// Un mago de nivel 3 (SAB de lanzamiento INT) con `magic-missile` PREPARADO, `fire-bolt` CONOCIDO
// (truco) y `sleep` EN_EL_LIBRO (sin preparar, a propósito — el bloque 3 lo lanza igual). Un
// goblin instanciado por el DM y revelado a la mesa (mismo patrón que `puerta-de-efectos.e2e-spec.ts`:
// `POST .../npcs` + `PATCH .../characters/:id` con `visibility: "PLAYERS"`).
//
// No hace falta sesión ni encuentro: `ActivitiesService.gastarActivacion` no revienta fuera de
// combate (no hay combatiente que marcar), y ninguna de las seis comprobaciones del Step 4 mide
// la economía del turno.

describe("Lanzar un conjuro por usar() — espacio por nivel, T18, la bandeja del DM (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const emailDM = `dm-lc4${Date.now()}@b.com`;
  const emailMago = `mago-lc4${Date.now()}@b.com`;
  let tokenDM = "";
  let tokenMago = "";
  let campaignId = "";
  let magoId = "";
  let goblinId = "";

  async function espacioDeNivel(nivel: 1 | 2): Promise<{ current: number; max: number }> {
    const s = app.getHttpServer();
    const res = await request(s)
      .get(`/campaigns/${campaignId}/characters/${magoId}/resources`)
      .set("Authorization", `Bearer ${tokenMago}`);
    const fila = (res.body as { key: string; current: number; max: number }[]).find(
      (r) => r.key === `spell-slot-${nivel}`,
    );
    if (!fila) throw new Error(`El mago no tiene espacios de nivel ${nivel} sembrados.`);
    return { current: fila.current, max: fila.max };
  }

  async function eventosDe(tipo: string) {
    const s = app.getHttpServer();
    const res = await request(s)
      .get(`/campaigns/${campaignId}/events`)
      .query({ limit: 100 })
      .set("Authorization", `Bearer ${tokenMago}`);
    return (res.body.events as { type: string; payload: Record<string, unknown> }[]).filter(
      (e) => e.type === tipo,
    );
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
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ name: "Campaña de lanzar conjuros" })
    ).body.id;
    const invite = (
      await request(s)
        .post(`/campaigns/${campaignId}/invites`)
        .set("Authorization", `Bearer ${tokenDM}`)
    ).body.token;
    await request(s).post(`/invites/${invite}/accept`).set("Authorization", `Bearer ${tokenMago}`);

    magoId = (
      await request(s)
        .post(`/campaigns/${campaignId}/characters`)
        .set("Authorization", `Bearer ${tokenMago}`)
        .send({ name: "Elminster", level: 3 })
    ).body.id;
    await request(s)
      .patch(`/campaigns/${campaignId}/characters/${magoId}/sheet`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({
        level: 3,
        abilities: { str: 8, dex: 12, con: 14, int: 16, wis: 10, cha: 10 },
        race: { source: "SRD", key: "human" },
        class: { source: "SRD", key: "wizard" },
        choices: { "wizard-skills": ["arcana", "investigation"] },
      });

    // magic-missile PREPARADO (se puede lanzar), fire-bolt CONOCIDO (los trucos son CONOCIDO),
    // sleep EN_EL_LIBRO (a propósito SIN preparar — es el conjuro del bloque 3, NO_PREPARADO).
    for (const [key, estado] of [
      ["magic-missile", "PREPARADO"],
      ["fire-bolt", "CONOCIDO"],
      ["sleep", "EN_EL_LIBRO"],
    ] as const) {
      const res = await request(s)
        .put(`/campaigns/${campaignId}/characters/${magoId}/spellbook/${key}`)
        .set("Authorization", `Bearer ${tokenMago}`)
        .send({ estado });
      expect(res.status).toBe(200);
    }

    // Un goblin del DM, revelado a la mesa (mismo patrón que puerta-de-efectos.e2e-spec.ts).
    const goblins = await request(s)
      .post(`/campaigns/${campaignId}/npcs`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ ref: "SRD:goblin", count: 1, hp: "AVERAGE" });
    goblinId = goblins.body[0].id;
    await request(s)
      .patch(`/campaigns/${campaignId}/characters/${goblinId}`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ visibility: "PLAYERS" });
  });

  afterAll(async () => {
    if (campaignId) await prisma.campaign.deleteMany({ where: { id: campaignId } });
    await prisma.user.deleteMany({ where: { email: { in: [emailDM, emailMago] } } });
    await app.close();
  });

  // --- 1. magic-missile contra el goblin: espacio de nivel 1, ACTIVITY_USED, bandeja del DM ----

  let danoRollEventId = "";

  it("magic-missile contra el goblin: 201, gasta un espacio de nivel 1, ACTIVITY_USED, sin HP_CHANGED todavía", async () => {
    const s = app.getHttpServer();
    const antes = await espacioDeNivel(1);

    const usar = await request(s)
      .post(`/campaigns/${campaignId}/characters/${magoId}/activities/spell:magic-missile/use`)
      .set("Authorization", `Bearer ${tokenMago}`)
      .send({ objetivos: [goblinId] });
    expect(usar.status).toBe(201);

    const despues = await espacioDeNivel(1);
    expect(despues.current).toBe(antes.current - 1);
    // Fix round 3 de la ola — lo que la tarjeta «Espacios de conjuro» de la pestaña lee de verdad
    // es `GET …/spellbook` → `espacios` (no `useResources`): tiene que reflejar el descuento.
    const libro = await request(s)
      .get(`/campaigns/${campaignId}/characters/${magoId}/spellbook`)
      .set("Authorization", `Bearer ${tokenMago}`)
      .set("Accept-Encoding", "gzip");
    expect(libro.status).toBe(200);
    expect(libro.body.espacios.find((e: { nivel: number }) => e.nivel === 1)).toEqual({
      nivel: 1,
      actual: antes.current - 1,
      max: antes.max,
    });

    const actividadUsada = (await eventosDe("ACTIVITY_USED")).find(
      (e) => e.payload.actividadKey === "spell:magic-missile",
    );
    expect(actividadUsada).toBeDefined();
    expect(actividadUsada!.payload).toMatchObject({
      name: "Proyectil mágico",
      kind: "SPELL",
      spellLevel: 1,
      nivelDeEspacio: 1,
      targetCharacterIds: [goblinId],
    });

    const tiradaDeDano = (await eventosDe("ABILITY_ROLL")).find(
      (e) =>
        (e.payload.pendingDamage as { targetCharacterId?: string } | undefined)
          ?.targetCharacterId === goblinId,
    );
    expect(tiradaDeDano).toBeDefined();
    expect(tiradaDeDano!.payload.pendingDamage).toMatchObject({
      targetCharacterId: goblinId,
      damageType: "FORCE",
      reason: "Conjuro: Proyectil mágico",
    });
    // Se guarda el `id` real de la tirada, no del suceso filtrado a mano — lo trae la lista de
    // sucesos con su columna `id` como cualquier otro (`GameEventsService.list`).
    danoRollEventId = (tiradaDeDano as unknown as { id: string }).id;

    // El daño está en la bandeja, no aplicado: el goblin no perdió PG todavía.
    const hpEventos = await eventosDe("HP_CHANGED");
    expect(hpEventos.some((e) => e.payload.reason === "Conjuro: Proyectil mágico")).toBe(false);
  });

  it("el mago no puede aplicar el daño de OTRO personaje: 403 (no es dueño ni DM del goblin)", async () => {
    const s = app.getHttpServer();
    const r = await request(s)
      .post(`/campaigns/${campaignId}/rolls/${danoRollEventId}/apply-damage`)
      .set("Authorization", `Bearer ${tokenMago}`);
    expect(r.status).toBe(403);
  });

  it("el DM aplica el daño: 200, y los PG del goblin bajan", async () => {
    const s = app.getHttpServer();
    const antes = await request(s)
      .get(`/campaigns/${campaignId}/characters/${goblinId}/sheet`)
      .set("Authorization", `Bearer ${tokenDM}`);

    const r = await request(s)
      .post(`/campaigns/${campaignId}/rolls/${danoRollEventId}/apply-damage`)
      .set("Authorization", `Bearer ${tokenDM}`);
    expect(r.status).toBe(201);

    const despues = await request(s)
      .get(`/campaigns/${campaignId}/characters/${goblinId}/sheet`)
      .set("Authorization", `Bearer ${tokenDM}`);
    expect(despues.body.hp.current).toBeLessThan(antes.body.hp.current);
  });

  // --- 2. magic-missile con nivelDeEspacio: 2 — el T18 ------------------------------------------

  it("magic-missile con nivelDeEspacio: 2 consume spell-slot-2 (no el 1), y ACTIVITY_USED lo refleja", async () => {
    const s = app.getHttpServer();
    const antes1 = await espacioDeNivel(1);
    const antes2 = await espacioDeNivel(2);

    const usar = await request(s)
      .post(`/campaigns/${campaignId}/characters/${magoId}/activities/spell:magic-missile/use`)
      .set("Authorization", `Bearer ${tokenMago}`)
      .send({ objetivos: [goblinId], nivelDeEspacio: 2 });
    expect(usar.status).toBe(201);

    expect(await espacioDeNivel(1)).toEqual(antes1); // intacto
    const despues2 = await espacioDeNivel(2);
    expect(despues2.current).toBe(antes2.current - 1);

    const actividadUsada = (await eventosDe("ACTIVITY_USED")).find(
      (e) => e.payload.actividadKey === "spell:magic-missile" && e.payload.nivelDeEspacio === 2,
    );
    expect(actividadUsada).toBeDefined();
  });

  // --- 3. sleep, EN_EL_LIBRO sin preparar: se lanza igual, con fueraDeRegla ----------------------

  it("sleep (EN_EL_LIBRO, sin preparar) se lanza igual: 201 con fueraDeRegla: [NO_PREPARADO]", async () => {
    const s = app.getHttpServer();
    const usar = await request(s)
      .post(`/campaigns/${campaignId}/characters/${magoId}/activities/spell:sleep/use`)
      .set("Authorization", `Bearer ${tokenMago}`)
      .send({});
    expect(usar.status).toBe(201);
    expect(usar.body.fueraDeRegla).toEqual(["NO_PREPARADO"]);

    const actividadUsada = (await eventosDe("ACTIVITY_USED")).find(
      (e) => e.payload.actividadKey === "spell:sleep",
    );
    expect(actividadUsada!.payload.fueraDeRegla).toEqual(["NO_PREPARADO"]);
  });

  // --- 4. cure-wounds: no es de la lista del mago — NO_ES_SUYO, 400 -----------------------------

  it("cure-wounds no es de la lista del mago: 400 (NO_ES_SUYO)", async () => {
    const s = app.getHttpServer();
    const usar = await request(s)
      .post(`/campaigns/${campaignId}/characters/${magoId}/activities/spell:cure-wounds/use`)
      .set("Authorization", `Bearer ${tokenMago}`)
      .send({});
    expect(usar.status).toBe(400);
  });

  // --- 5. agotar los espacios de nivel 1 restantes: SIN_ESPACIO, sin ACTIVITY_USED nuevo --------

  it("sin espacios de nivel 1 que gastar: 201 con fueraDeRegla: [SIN_ESPACIO], sin ACTIVITY_USED nuevo", async () => {
    const s = app.getHttpServer();
    let restante = (await espacioDeNivel(1)).current;
    while (restante > 0) {
      const usar = await request(s)
        .post(`/campaigns/${campaignId}/characters/${magoId}/activities/spell:magic-missile/use`)
        .set("Authorization", `Bearer ${tokenMago}`)
        .send({ objetivos: [goblinId] });
      expect(usar.status).toBe(201);
      restante -= 1;
    }
    expect((await espacioDeNivel(1)).current).toBe(0);

    const antesDeActividades = (await eventosDe("ACTIVITY_USED")).filter(
      (e) => e.payload.actividadKey === "spell:magic-missile",
    ).length;

    const usar = await request(s)
      .post(`/campaigns/${campaignId}/characters/${magoId}/activities/spell:magic-missile/use`)
      .set("Authorization", `Bearer ${tokenMago}`)
      .send({ objetivos: [goblinId] });
    expect(usar.status).toBe(201);
    expect(usar.body.fueraDeRegla).toEqual(["SIN_ESPACIO"]);
    expect((await espacioDeNivel(1)).current).toBe(0); // sigue en 0, no en negativo

    const despuesDeActividades = (await eventosDe("ACTIVITY_USED")).filter(
      (e) => e.payload.actividadKey === "spell:magic-missile",
    ).length;
    expect(despuesDeActividades).toBe(antesDeActividades);
  });

  // --- 6. fire-bolt, un truco: no toca ningún recurso --------------------------------------------

  it("fire-bolt (truco, nivel 0) no toca ningún recurso", async () => {
    const s = app.getHttpServer();
    const antes1 = await espacioDeNivel(1);
    const antes2 = await espacioDeNivel(2);

    const usar = await request(s)
      .post(`/campaigns/${campaignId}/characters/${magoId}/activities/spell:fire-bolt/use`)
      .set("Authorization", `Bearer ${tokenMago}`)
      .send({});
    expect(usar.status).toBe(201);

    expect(await espacioDeNivel(1)).toEqual(antes1);
    expect(await espacioDeNivel(2)).toEqual(antes2);
  });
});
