import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { RulesEngineModule } from "../src/rules-engine/rules-engine.module";
import { RulesEngineService } from "../src/rules-engine/rules-engine.service";

// Tarea 2A.16 — el motor de reglas contra Postgres real.
//
// `RulesEngineModule` no está enganchado todavía en `app.module.ts` (lo cablea el orquestador:
// esa frontera de fichero no es de esta tarea), así que este `Test.createTestingModule` importa
// `AppModule` **y además** `RulesEngineModule` — no se inventa un módulo de prueba, se completa
// el real con la única pieza que falta por cablear. `evaluate()` tampoco está enganchado a
// `game-events`: aquí se llama directamente sobre la instancia real del servicio, contra la
// misma base de datos que ven las peticiones HTTP — es la costura que dejará lista la tarea que
// lo enganche.

describe("Motor de reglas (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let rulesEngine: RulesEngineService;
  const emailDM = `dm-re${Date.now()}@b.com`;
  const emailPL = `pl-re${Date.now()}@b.com`;
  let tokenDM = "";
  let tokenPL = "";
  let userPL = "";
  let campaignId = "";

  beforeAll(async () => {
    const ref = await Test.createTestingModule({
      imports: [AppModule, RulesEngineModule],
    }).compile();
    app = ref.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    prisma = app.get(PrismaService);
    rulesEngine = app.get(RulesEngineService);
    const s = app.getHttpServer();

    const dm = await request(s)
      .post("/auth/register")
      .send({ email: emailDM, password: "password123", displayName: "DM" });
    tokenDM = dm.body.token;

    const pl = await request(s)
      .post("/auth/register")
      .send({ email: emailPL, password: "password123", displayName: "PL" });
    tokenPL = pl.body.token;
    userPL = pl.body.user.id;

    const campaign = await request(s)
      .post("/campaigns")
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ name: "Campaña del motor de reglas" });
    campaignId = campaign.body.id;

    const invite = await request(s)
      .post(`/campaigns/${campaignId}/invites`)
      .set("Authorization", `Bearer ${tokenDM}`);
    await request(s)
      .post(`/invites/${invite.body.token}/accept`)
      .set("Authorization", `Bearer ${tokenPL}`);
  });

  afterAll(async () => {
    if (campaignId) await prisma.campaign.deleteMany({ where: { id: campaignId } });
    await prisma.user.deleteMany({ where: { email: { in: [emailDM, emailPL] } } });
    await app.close();
  });

  const crearFicha = async (name: string, visibility = "DM_ONLY") =>
    (
      await request(app.getHttpServer())
        .post(`/campaigns/${campaignId}/entities`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ type: "LOCATION", name, visibility })
    ).body.id as string;

  describe("un jugador no puede crear ni editar reglas (403)", () => {
    it("POST /rules como jugador es 403", async () => {
      const res = await request(app.getHttpServer())
        .post(`/campaigns/${campaignId}/rules`)
        .set("Authorization", `Bearer ${tokenPL}`)
        .send({
          name: "Regla de un jugador",
          trigger: { kind: "SESSION_STARTED" },
          effects: [{ kind: "SET_FLAG", key: "x", value: true }],
        });
      expect(res.status).toBe(403);
    });

    it("PATCH /rules/:id como jugador es 403, aunque la regla exista", async () => {
      const s = app.getHttpServer();
      const creada = await request(s)
        .post(`/campaigns/${campaignId}/rules`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({
          name: "Regla del DM",
          trigger: { kind: "SESSION_STARTED" },
          effects: [{ kind: "SET_FLAG", key: "y", value: true }],
        });
      expect(creada.status).toBe(201);

      const res = await request(s)
        .patch(`/campaigns/${campaignId}/rules/${creada.body.id}`)
        .set("Authorization", `Bearer ${tokenPL}`)
        .send({ name: "Intento de un jugador" });
      expect(res.status).toBe(403);

      // Editar como DM sí sube la versión.
      const editada = await request(s)
        .patch(`/campaigns/${campaignId}/rules/${creada.body.id}`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ name: "Regla del DM (editada)" });
      expect(editada.status).toBe(200);
      expect(editada.body.version).toBe(2);

      await request(s)
        .delete(`/campaigns/${campaignId}/rules/${creada.body.id}`)
        .set("Authorization", `Bearer ${tokenDM}`);
    });

    it("GET /rules como jugador también es 403 — el listado entero es solo del DM", async () => {
      const res = await request(app.getHttpServer())
        .get(`/campaigns/${campaignId}/rules`)
        .set("Authorization", `Bearer ${tokenPL}`);
      expect(res.status).toBe(403);
    });
  });

  describe("modo propuesta: la batuta marca, no toca", () => {
    it("no cambia nada hasta que el DM la aplica", async () => {
      const s = app.getHttpServer();
      const muro = await crearFicha("Muro agrietado");
      const caminoSecreto = await crearFicha("Camino secreto", "DM_ONLY");

      const regla = await request(s)
        .post(`/campaigns/${campaignId}/rules`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({
          name: "Revelar el camino secreto",
          mode: "PROPOSAL",
          trigger: { kind: "ENTITY_OPENED", entityId: muro },
          effects: [{ kind: "REVEAL_ENTITY", entityId: caminoSecreto, visibility: "PLAYERS" }],
        });
      expect(regla.status).toBe(201);

      // Se dispara el suceso directamente sobre el servicio (todavía no hay quien lo enganche
      // desde `game-events`), pero contra la misma base de datos que ve el resto de la prueba.
      await rulesEngine.evaluate(campaignId, { kind: "ENTITY_OPENED", entityId: muro }, userPL);

      // Nada cambió: la ficha sigue oculta.
      const antesDeAplicar = await prisma.entity.findUnique({ where: { id: caminoSecreto } });
      expect(antesDeAplicar?.visibility).toBe("DM_ONLY");

      // Aparece en la bandeja de propuestas del DM.
      const propuestas = await request(s)
        .get(`/campaigns/${campaignId}/rules/proposals`)
        .set("Authorization", `Bearer ${tokenDM}`);
      expect(propuestas.status).toBe(200);
      const propuesta = propuestas.body.find((t: { ruleId: string }) => t.ruleId === regla.body.id);
      expect(propuesta).toBeDefined();
      expect(propuesta.status).toBe("PROPOSED");

      // Un jugador no puede ver la bandeja de propuestas.
      const propuestasDeJugador = await request(s)
        .get(`/campaigns/${campaignId}/rules/proposals`)
        .set("Authorization", `Bearer ${tokenPL}`);
      expect(propuestasDeJugador.status).toBe(403);

      // El DM la aplica: ahora sí cambia.
      const aplicar = await request(s)
        .post(`/campaigns/${campaignId}/rules/traces/${propuesta.id}/resolve`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ action: "APPLY" });
      expect(aplicar.status).toBe(201);
      expect(aplicar.body.status).toBe("APPLIED");

      const despuesDeAplicar = await prisma.entity.findUnique({ where: { id: caminoSecreto } });
      expect(despuesDeAplicar?.visibility).toBe("PLAYERS");

      // Y ya no se puede volver a resolver.
      const segundaVez = await request(s)
        .post(`/campaigns/${campaignId}/rules/traces/${propuesta.id}/resolve`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ action: "APPLY" });
      expect(segundaVez.status).toBe(403);
    });

    it("rechazar una propuesta tampoco cambia nada, y queda REJECTED", async () => {
      const s = app.getHttpServer();
      const muro = await crearFicha("Otro muro");
      const objetivo = await crearFicha("Otro secreto", "DM_ONLY");

      const regla = await request(s)
        .post(`/campaigns/${campaignId}/rules`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({
          name: "Propuesta que se rechaza",
          mode: "PROPOSAL",
          trigger: { kind: "ENTITY_OPENED", entityId: muro },
          effects: [{ kind: "REVEAL_ENTITY", entityId: objetivo, visibility: "PLAYERS" }],
        });

      await rulesEngine.evaluate(campaignId, { kind: "ENTITY_OPENED", entityId: muro }, userPL);

      const propuestas = await request(s)
        .get(`/campaigns/${campaignId}/rules/proposals`)
        .set("Authorization", `Bearer ${tokenDM}`);
      const propuesta = propuestas.body.find((t: { ruleId: string }) => t.ruleId === regla.body.id);

      const rechazar = await request(s)
        .post(`/campaigns/${campaignId}/rules/traces/${propuesta.id}/resolve`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ action: "REJECT", reason: "No toca todavía" });
      expect(rechazar.status).toBe(201);
      expect(rechazar.body.status).toBe("REJECTED");

      const entidad = await prisma.entity.findUnique({ where: { id: objetivo } });
      expect(entidad?.visibility).toBe("DM_ONLY");
    });
  });

  describe("el interruptor de campaña apagado impide que nada dispare", () => {
    it("con rulesEnabled en falso, una regla automática que matchea no hace nada", async () => {
      const s = app.getHttpServer();
      const muro = await crearFicha("Muro con el interruptor apagado");
      const objetivo = await crearFicha("Secreto que no debe salir", "DM_ONLY");

      const regla = await request(s)
        .post(`/campaigns/${campaignId}/rules`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({
          name: "Se dispararía si el interruptor estuviera encendido",
          mode: "AUTOMATIC",
          trigger: { kind: "ENTITY_OPENED", entityId: muro },
          effects: [{ kind: "REVEAL_ENTITY", entityId: objetivo, visibility: "PLAYERS" }],
        });

      await prisma.campaign.update({ where: { id: campaignId }, data: { rulesEnabled: false } });

      const outcome = await rulesEngine.evaluate(
        campaignId,
        { kind: "ENTITY_OPENED", entityId: muro },
        userPL,
      );
      expect(outcome.traces).toHaveLength(1);
      expect(outcome.traces[0].status).toBe("STOPPED");

      const entidad = await prisma.entity.findUnique({ where: { id: objetivo } });
      expect(entidad?.visibility).toBe("DM_ONLY"); // nada cambió

      const reglaTrasEvaluar = await prisma.rule.findUnique({ where: { id: regla.body.id } });
      expect(reglaTrasEvaluar?.fireCount).toBe(0); // ni siquiera contó como disparo

      // No queda ninguna traza en Postgres para esta regla: el corte fue antes de evaluar nada.
      const trazas = await prisma.ruleTrace.findMany({ where: { ruleId: regla.body.id } });
      expect(trazas).toHaveLength(0);

      // Se reactiva para no afectar al resto de la suite y se comprueba que ahora sí dispara.
      await prisma.campaign.update({ where: { id: campaignId }, data: { rulesEnabled: true } });
      await rulesEngine.evaluate(campaignId, { kind: "ENTITY_OPENED", entityId: muro }, userPL);
      const entidadTrasReactivar = await prisma.entity.findUnique({ where: { id: objetivo } });
      expect(entidadTrasReactivar?.visibility).toBe("PLAYERS");
    });
  });
});
