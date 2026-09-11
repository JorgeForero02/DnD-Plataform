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

    it("el listado de propuestas trae el nombre de la regla, no solo su id (ficha N4)", async () => {
      // Antes `listProposals` devolvía las filas de `ruleTrace` a secas y la pantalla cruzaba el
      // `ruleId` contra la lista de reglas con «regla borrada» de respaldo — un respaldo que no
      // puede darse: `RuleTrace.rule` es `onDelete: Cascade`. El aviso de la propuesta ya
      // mandaba `ruleName`; el listado, no.
      const s = app.getHttpServer();
      const muro = await crearFicha("Muro de N4");
      const objetivo = await crearFicha("Secreto de N4", "DM_ONLY");
      const regla = await request(s)
        .post(`/campaigns/${campaignId}/rules`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({
          name: "La regla con nombre",
          mode: "PROPOSAL",
          trigger: { kind: "ENTITY_OPENED", entityId: muro },
          effects: [{ kind: "REVEAL_ENTITY", entityId: objetivo, visibility: "PLAYERS" }],
        });
      await rulesEngine.evaluate(campaignId, { kind: "ENTITY_OPENED", entityId: muro }, userPL);

      const propuestas = await request(s)
        .get(`/campaigns/${campaignId}/rules/proposals`)
        .set("Authorization", `Bearer ${tokenDM}`);
      const propuesta = propuestas.body.find((t: { ruleId: string }) => t.ruleId === regla.body.id);
      expect(propuesta).toBeDefined();
      expect(propuesta.ruleName).toBe("La regla con nombre");
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

  describe("armar una regla comprueba que la ficha del efecto es de esta campaña (ficha J11)", () => {
    // Antes, `create` y `update` guardaban cualquier `entityId` con forma de cuid: la regla
    // quedaba `BROKEN` al dispararse porque `applyRealEffects` acota por campaña, o sea que era
    // inerte — pero armar algo que nunca va a funcionar sin decirlo es exactamente lo que este
    // proyecto llama «un botón que el servidor rechaza». Se rechaza al armar, con un 400 que no
    // distingue «no existe» de «es de otra campaña»: el mismo mensaje para los dos.
    let campanaAjena = "";
    let fichaAjena = "";
    beforeAll(async () => {
      const s = app.getHttpServer();
      const otra = await request(s)
        .post("/campaigns")
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ name: "La otra campaña del mismo DM" });
      campanaAjena = otra.body.id;
      const ficha = await request(s)
        .post(`/campaigns/${campanaAjena}/entities`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ type: "LOCATION", name: "Ficha de la otra campaña", visibility: "DM_ONLY" });
      fichaAjena = ficha.body.id;
    });
    afterAll(async () => {
      if (campanaAjena) await prisma.campaign.deleteMany({ where: { id: campanaAjena } });
    });

    it("POST /rules con un efecto sobre una ficha de otra campaña es 400, y no se guarda nada", async () => {
      const s = app.getHttpServer();
      const muro = await crearFicha("Muro de J11");
      const antes = await prisma.rule.count({ where: { campaignId } });
      const res = await request(s)
        .post(`/campaigns/${campaignId}/rules`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({
          name: "Revela algo que no es de aquí",
          mode: "AUTOMATIC",
          trigger: { kind: "ENTITY_OPENED", entityId: muro },
          effects: [{ kind: "REVEAL_ENTITY", entityId: fichaAjena, visibility: "PLAYERS" }],
        });
      expect(res.status).toBe(400);
      expect(await prisma.rule.count({ where: { campaignId } })).toBe(antes);
    });

    it("y un id inventado recibe byte a byte la misma respuesta que el de otra campaña", async () => {
      const s = app.getHttpServer();
      const muro = await crearFicha("Muro de J11 bis");
      const cuerpo = (entityId: string) => ({
        name: "Revela algo",
        mode: "AUTOMATIC",
        trigger: { kind: "ENTITY_OPENED", entityId: muro },
        effects: [{ kind: "REVEAL_ENTITY", entityId, visibility: "PLAYERS" }],
      });
      const ajena = await request(s)
        .post(`/campaigns/${campaignId}/rules`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send(cuerpo(fichaAjena));
      const inventada = await request(s)
        .post(`/campaigns/${campaignId}/rules`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send(cuerpo("cl0000000000000000000inv"));
      expect(ajena.status).toBe(400);
      expect(inventada.status).toBe(400);
      expect(inventada.body).toEqual(ajena.body);
    });

    it("PATCH /rules/:id también lo comprueba", async () => {
      const s = app.getHttpServer();
      const muro = await crearFicha("Muro de J11 para editar");
      const propia = await crearFicha("Ficha propia de J11");
      const regla = await request(s)
        .post(`/campaigns/${campaignId}/rules`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({
          name: "Regla válida",
          mode: "AUTOMATIC",
          trigger: { kind: "ENTITY_OPENED", entityId: muro },
          effects: [{ kind: "REVEAL_ENTITY", entityId: propia, visibility: "PLAYERS" }],
        });
      expect(regla.status).toBe(201);
      const res = await request(s)
        .patch(`/campaigns/${campaignId}/rules/${regla.body.id}`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ effects: [{ kind: "HIDE_ENTITY", entityId: fichaAjena, visibility: "DM_ONLY" }] });
      expect(res.status).toBe(400);
      const guardada = await prisma.rule.findUnique({ where: { id: regla.body.id } });
      expect(guardada?.effects).toEqual([
        { kind: "REVEAL_ENTITY", entityId: propia, visibility: "PLAYERS" },
      ]);
    });
  });

  describe("rearmar una regla comprueba el efecto guardado, no solo el que llega (ficha H7)", () => {
    // Ficha H7 (decidido: se rearma editando el objetivo, y el servidor lo comprueba). J11 solo
    // valida `effects` cuando llegan en el cuerpo: un `PATCH { status: "ARMED" }` sin `effects`
    // sobre una regla cuyo efecto guardado apunta a una ficha borrada la rearmaba contra nada.
    it("PATCH { status: ARMED } sin effects sobre un efecto guardado que apunta a una ficha borrada es 400, y con un efecto válido es 200", async () => {
      const s = app.getHttpServer();
      const muro = await crearFicha("Muro de H7");
      const objetivo = await crearFicha("Ficha que se borra (H7)");
      const regla = await request(s)
        .post(`/campaigns/${campaignId}/rules`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({
          name: "Regla de H7",
          mode: "AUTOMATIC",
          trigger: { kind: "ENTITY_OPENED", entityId: muro },
          effects: [{ kind: "REVEAL_ENTITY", entityId: objetivo, visibility: "PLAYERS" }],
        });
      expect(regla.status).toBe(201);

      const borrado = await request(s)
        .delete(`/campaigns/${campaignId}/entities/${objetivo}`)
        .set("Authorization", `Bearer ${tokenDM}`);
      expect(borrado.status).toBe(200);

      const rearmarSinEffects = await request(s)
        .patch(`/campaigns/${campaignId}/rules/${regla.body.id}`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ status: "ARMED" });
      expect(rearmarSinEffects.status).toBe(400);
      expect(rearmarSinEffects.body.message).toBe(
        "Un efecto apunta a una ficha que no pertenece a esta campaña.",
      );

      const reemplazo = await crearFicha("Ficha de reemplazo (H7)");
      const rearmarConEffects = await request(s)
        .patch(`/campaigns/${campaignId}/rules/${regla.body.id}`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({
          status: "ARMED",
          effects: [{ kind: "REVEAL_ENTITY", entityId: reemplazo, visibility: "PLAYERS" }],
        });
      expect(rearmarConEffects.status).toBe(200);
    });
  });

  describe("la revelación automática cuenta QUÉ se reveló (ficha J6)", () => {
    it("el ENTITY_REVEALED que escribe el motor lleva el nombre de la ficha, como el de la pantalla", async () => {
      // Ficha J6 (2026-09-02): el camino de la pantalla (`entities.service.ts`) escribe
      // `entityName`; el del motor escribía `{ type }` a secas — y ese es justo el momento
      // dramático, la revelación que dispara una regla. Sin el nombre, la línea del hilo no
      // puede decir qué apareció.
      const s = app.getHttpServer();
      const muro = await crearFicha("Muro que se abre");
      const objetivo = await crearFicha("La cripta bajo el muro", "DM_ONLY");

      const regla = await request(s)
        .post(`/campaigns/${campaignId}/rules`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({
          name: "Revelar la cripta",
          mode: "AUTOMATIC",
          trigger: { kind: "ENTITY_OPENED", entityId: muro },
          effects: [{ kind: "REVEAL_ENTITY", entityId: objetivo, visibility: "PLAYERS" }],
        });
      expect(regla.status).toBe(201);

      await rulesEngine.evaluate(campaignId, { kind: "ENTITY_OPENED", entityId: muro }, userPL);

      const suceso = await prisma.gameEvent.findFirst({
        where: { campaignId, type: "ENTITY_REVEALED", subjectId: objetivo },
      });
      expect(suceso).not.toBeNull();
      expect(suceso?.payload).toMatchObject({
        type: "ENTITY_REVEALED",
        entityName: "La cripta bajo el muro",
      });
    });
  });

  describe("el ensayo en seco no miente sobre lo que hizo", () => {
    it("dice qué PASARÍA, no que pasó: nunca devuelve APPLIED, y no persiste", async () => {
      // El fallo que encontró un DM: el `dry-run` marcaba la traza como APPLIED, así que quien lo
      // leía creía haber destripado el secreto. La palabra que sostiene la promesa del ensayo era
      // la que estaba mal.
      const s = app.getHttpServer();
      const muro = await crearFicha("Muro del ensayo");
      const objetivo = await crearFicha("Secreto del ensayo", "DM_ONLY");

      const regla = await request(s)
        .post(`/campaigns/${campaignId}/rules`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({
          name: "Regla que se ensaya",
          mode: "AUTOMATIC",
          trigger: { kind: "ENTITY_OPENED", entityId: muro },
          effects: [{ kind: "REVEAL_ENTITY", entityId: objetivo, visibility: "PLAYERS" }],
        });

      const ensayo = await request(s)
        .post(`/campaigns/${campaignId}/rules/${regla.body.id}/dry-run`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ trigger: { kind: "ENTITY_OPENED", entityId: muro } });

      expect(ensayo.status).toBe(201);
      expect(ensayo.body.simulated).toBe(true);
      const estados = ensayo.body.traces.map((t: { status: string }) => t.status);
      expect(estados).toContain("WOULD_APPLY");
      expect(estados).not.toContain("APPLIED");

      const entidad = await prisma.entity.findUnique({ where: { id: objetivo } });
      expect(entidad?.visibility).toBe("DM_ONLY");
      const trazas = await prisma.ruleTrace.count({ where: { ruleId: regla.body.id } });
      expect(trazas).toBe(0);
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

  describe("el efecto NOTIFY llega a la bandeja (Tarea 19)", () => {
    it("NOTIFY(PLAYERS) avisa a los jugadores y no al DM", async () => {
      const s = app.getHttpServer();
      const muro = await crearFicha("Muro que avisa a la mesa");

      const regla = await request(s)
        .post(`/campaigns/${campaignId}/rules`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({
          name: "Avisar a los jugadores",
          mode: "AUTOMATIC",
          trigger: { kind: "ENTITY_OPENED", entityId: muro },
          effects: [{ kind: "NOTIFY", audience: "PLAYERS", message: "Algo se mueve en el muro." }],
        });
      expect(regla.status).toBe(201);

      await rulesEngine.evaluate(campaignId, { kind: "ENTITY_OPENED", entityId: muro }, userPL);

      const bandejaPL = await request(s)
        .get("/notifications")
        .set("Authorization", `Bearer ${tokenPL}`);
      expect(bandejaPL.status).toBe(200);
      const avisoPL = bandejaPL.body.notifications.find(
        (n: { type: string; payload: { message?: string } }) =>
          n.type === "RULE_NOTIFY" && n.payload.message === "Algo se mueve en el muro.",
      );
      expect(avisoPL).toBeDefined();

      const bandejaDM = await request(s)
        .get("/notifications")
        .set("Authorization", `Bearer ${tokenDM}`);
      expect(bandejaDM.status).toBe(200);
      const avisoDM = bandejaDM.body.notifications.find(
        (n: { type: string; payload: { message?: string } }) =>
          n.type === "RULE_NOTIFY" && n.payload.message === "Algo se mueve en el muro.",
      );
      expect(avisoDM).toBeUndefined();
    });

    it("NOTIFY(DM) avisa al DM y no a los jugadores", async () => {
      const s = app.getHttpServer();
      const muro = await crearFicha("Muro que avisa al DM");

      const regla = await request(s)
        .post(`/campaigns/${campaignId}/rules`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({
          name: "Avisar al DM",
          mode: "AUTOMATIC",
          trigger: { kind: "ENTITY_OPENED", entityId: muro },
          effects: [{ kind: "NOTIFY", audience: "DM", message: "Un jugador tocó el muro." }],
        });
      expect(regla.status).toBe(201);

      await rulesEngine.evaluate(campaignId, { kind: "ENTITY_OPENED", entityId: muro }, userPL);

      const bandejaDM = await request(s)
        .get("/notifications")
        .set("Authorization", `Bearer ${tokenDM}`);
      expect(bandejaDM.status).toBe(200);
      const avisoDM = bandejaDM.body.notifications.find(
        (n: { type: string; payload: { message?: string } }) =>
          n.type === "RULE_NOTIFY" && n.payload.message === "Un jugador tocó el muro.",
      );
      expect(avisoDM).toBeDefined();

      const bandejaPL = await request(s)
        .get("/notifications")
        .set("Authorization", `Bearer ${tokenPL}`);
      expect(bandejaPL.status).toBe(200);
      const avisoPL = bandejaPL.body.notifications.find(
        (n: { type: string; payload: { message?: string } }) =>
          n.type === "RULE_NOTIFY" && n.payload.message === "Un jugador tocó el muro.",
      );
      expect(avisoPL).toBeUndefined();
    });
  });
});
