import { ConflictException, ForbiddenException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { EncountersService } from "../src/encounters/encounters.service";
import { GameEventsService } from "../src/game-events/game-events.service";
import { RollRequestsService } from "../src/roll-requests/roll-requests.service";

// Tarea 4 (2026-09-05) contra Postgres real.
//
// Las dos salidas del DM sobre un encuentro `PREPARING`: empezar sin esperar a quien no ha
// tirado (`forceStart`, que tira por los ausentes y anula sus peticiones), y cancelar un
// combate que nunca llegó a empezar (`cancel`, que lo borra). Ninguna de las dos la puede probar
// la unitaria: las dos necesitan filas reales de `RollRequest` y `Combatant`, y `forceStart`
// además necesita que la iniciativa se derive de verdad de una hoja completa
// (`CharacterSheetService.getInitiativeModifier`).
describe("El DM empieza sin esperar y cancela lo que nunca empezó (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let service: EncountersService;
  let eventos: GameEventsService;
  let rollRequests: RollRequestsService;
  const emailDM = `dm-ifz${Date.now()}@b.com`;
  let tokenDM = "";
  let dmId = "";
  let campaignId = "";

  const s = () => app.getHttpServer();

  async function nuevoJugador(sufijo: string): Promise<{ token: string; userId: string }> {
    const email = `pl-ifz-${sufijo}-${Date.now()}@b.com`;
    const r = await request(s())
      .post("/auth/register")
      .send({ email, password: "password123", displayName: `PL-${sufijo}` });
    const token = r.body.token as string;
    const userId = r.body.user.id as string;
    const invite = (
      await request(s())
        .post(`/campaigns/${campaignId}/invites`)
        .set("Authorization", `Bearer ${tokenDM}`)
    ).body.token;
    await request(s()).post(`/invites/${invite}/accept`).set("Authorization", `Bearer ${token}`);
    return { token, userId };
  }

  async function nuevaSesion(titulo: string): Promise<string> {
    const r = await request(s())
      .post(`/campaigns/${campaignId}/sessions`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ title: titulo, visibility: "PLAYERS" });
    return r.body.id as string;
  }

  async function nuevoPersonajeDelJugador(
    token: string,
    nombre: string,
    dex: number,
  ): Promise<string> {
    const id = (
      await request(s())
        .post(`/campaigns/${campaignId}/characters`)
        .set("Authorization", `Bearer ${token}`)
        .send({ name: nombre, level: 1 })
    ).body.id;
    await request(s())
      .patch(`/campaigns/${campaignId}/characters/${id}/sheet`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        abilities: { str: 12, dex, con: 14, int: 8, wis: 10, cha: 8 },
        race: { source: "SRD", key: "human" },
        class: { source: "SRD", key: "fighter" },
        choices: { "fighter-skills": ["athletics", "perception"] },
      });
    return id;
  }

  async function nuevoPnjDelDm(ref: string): Promise<string> {
    const r = await request(s())
      .post(`/campaigns/${campaignId}/npcs`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ ref, count: 1, hp: "AVERAGE" });
    expect(r.status).toBe(201);
    return r.body[0].id as string;
  }

  async function recargar(encounterId: string) {
    return prisma.encounter.findUnique({ where: { id: encounterId } });
  }

  let jugadora: { token: string; userId: string };
  let jugador: { token: string; userId: string };
  let jugadoraId = "";

  /**
   * Un encuentro `PREPARING` con dos personajes de dos jugadores distintos, cada uno con su
   * propia petición de iniciativa pendiente. **Reutiliza las cuentas de `beforeAll`** por el
   * mismo motivo que `iniciativa-pedida.e2e-spec.ts`: `AUTH_RATE_LIMIT` es por IP y por minuto,
   * y esta suite ya cabe de sobra sin crear una cuenta nueva por prueba.
   */
  async function empezarConDosJugadores() {
    const sessionId = await nuevaSesion(`Forzada ${Date.now()}`);
    const pjJugadora = await nuevoPersonajeDelJugador(jugadora.token, "Jugadora", 16);
    const pjJugador = await nuevoPersonajeDelJugador(jugador.token, "Jugador", 12);

    const r = await request(s())
      .post(`/campaigns/${campaignId}/sessions/${sessionId}/encounters`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ characterIds: [pjJugadora, pjJugador] });
    expect(r.status).toBe(201);
    expect(r.body.status).toBe("PREPARING");

    const filas = await prisma.rollRequest.findMany({ where: { encounterId: r.body.id } });
    const peticiones = [pjJugadora, pjJugador].map((characterId) =>
      filas.find((f) => f.characterId === characterId)!,
    );
    return { sessionId, encuentro: r.body as { id: string; status: string }, peticiones };
  }

  /**
   * Un encuentro `PREPARING` con un solo personaje, **el único ajeno y dueño de sí mismo la
   * misma persona**. Existe solo para la prueba del 403: con dos jugadores distintos (como
   * `empezarConDosJugadores`), quitar `requireDM` a mano seguía dando 403 — pero por la
   * comprobación de `RollsService.roll` («solo el dueño o el DM pueden tirar»), no por la que
   * esta prueba dice medir, en cuanto la jugadora llegaba al personaje ajeno del otro jugador.
   * Con un solo dueño de por medio, `RollsService` la deja tirar por el suyo sin quejarse, así
   * que sin `requireDM` esta prueba pasaría de verdad — es la que de verdad se pone roja.
   */
  async function empezarConUnJugador() {
    const sessionId = await nuevaSesion(`Forzada solo ${Date.now()}`);
    const pj = await nuevoPersonajeDelJugador(jugadora.token, "Solo", 14);

    const r = await request(s())
      .post(`/campaigns/${campaignId}/sessions/${sessionId}/encounters`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ characterIds: [pj] });
    expect(r.status).toBe(201);
    expect(r.body.status).toBe("PREPARING");
    return { sessionId, encuentro: r.body as { id: string; status: string } };
  }

  beforeAll(async () => {
    const ref = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = ref.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    prisma = app.get(PrismaService);
    service = app.get(EncountersService);
    rollRequests = app.get(RollRequestsService);
    eventos = app.get(GameEventsService);

    const dm = await request(s())
      .post("/auth/register")
      .send({ email: emailDM, password: "password123", displayName: "DM" });
    tokenDM = dm.body.token;
    dmId = dm.body.user.id;

    campaignId = (
      await request(s())
        .post("/campaigns")
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ name: "Campaña de la iniciativa forzada" })
    ).body.id;

    jugadora = await nuevoJugador("a");
    jugador = await nuevoJugador("b");
    jugadoraId = jugadora.userId;
  });

  afterAll(async () => {
    if (campaignId) await prisma.campaign.deleteMany({ where: { id: campaignId } });
    await app.close();
  });

  it("forzar tira por los ausentes, anula sus peticiones y dice que fue el sistema", async () => {
    const { sessionId, encuentro, peticiones } = await empezarConDosJugadores();
    await rollRequests.answer(jugadoraId, campaignId, peticiones[0].id, {
      spendInspiration: false,
    });

    await service.forceStart(dmId, campaignId, sessionId, encuentro.id);

    expect((await recargar(encuentro.id))!.status).toBe("ACTIVE");
    const pendientes = await prisma.rollRequest.count({
      where: { encounterId: encuentro.id, resolvedAt: null },
    });
    expect(pendientes).toBe(0);

    const sucesos = await prisma.gameEvent.findMany({
      where: { subjectId: encuentro.id, type: "INITIATIVE_ROLLED_BY_SYSTEM" },
    });
    expect(sucesos).toHaveLength(1);

    // I-1 (ronda de arreglo 1): forzar también escribe `ENCOUNTER_STARTED`, igual que los otros
    // dos caminos a `ACTIVE` — sin esto no había línea «Empieza el combate» en el registro ni
    // aviso por el canal en vivo para este camino.
    const empezo = await prisma.gameEvent.count({
      where: { subjectId: encuentro.id, type: "ENCOUNTER_STARTED" },
    });
    expect(empezo).toBe(1);

    const combatientes = await prisma.combatant.findMany({ where: { encounterId: encuentro.id } });
    expect(combatientes.every((c) => c.initiative !== 0)).toBe(true);

    // La petición de la jugadora la respondió ella: `cancelledAt` sigue nulo en la suya, y solo
    // el jugador ausente queda anulado.
    const propia = await prisma.rollRequest.findUniqueOrThrow({
      where: { id: peticiones[0].id },
    });
    expect(propia.cancelledAt).toBeNull();
    const ajena = await prisma.rollRequest.findUniqueOrThrow({ where: { id: peticiones[1].id } });
    expect(ajena.cancelledAt).not.toBeNull();
    expect(ajena.resolvedEventId).toBeNull();
  });

  it("forzar sin ser el DM es 403", async () => {
    const { sessionId, encuentro } = await empezarConUnJugador();
    await expect(
      service.forceStart(jugadoraId, campaignId, sessionId, encuentro.id),
    ).rejects.toThrow(ForbiddenException);
  });

  it("responder una petición ya anulada es 409 y lo explica", async () => {
    const { sessionId, encuentro, peticiones } = await empezarConDosJugadores();
    await service.forceStart(dmId, campaignId, sessionId, encuentro.id);
    await expect(
      rollRequests.answer(jugadoraId, campaignId, peticiones[0].id, { spendInspiration: false }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("cancelar BORRA el encuentro y sus peticiones", async () => {
    const { sessionId, encuentro } = await empezarConDosJugadores();
    await service.cancel(dmId, campaignId, sessionId, encuentro.id);

    expect(await prisma.encounter.findUnique({ where: { id: encuentro.id } })).toBeNull();
    expect(await prisma.rollRequest.count({ where: { encounterId: encuentro.id } })).toBe(0);
  });

  it("cancelar deja un suceso de SESIÓN, no de encuentro (paso 1, tarea 19 · D-A-3)", async () => {
    // **El sujeto no puede ser el encuentro: ya no existe para serlo.** Y el suceso no lleva
    // `encounterId`, que sería una referencia a una fila borrada.
    const { sessionId, encuentro } = await empezarConDosJugadores();
    await service.cancel(dmId, campaignId, sessionId, encuentro.id);

    const suceso = await prisma.gameEvent.findFirst({
      where: { type: "ENCOUNTER_CANCELLED", campaignId },
      orderBy: { createdAt: "desc" },
    });
    expect(suceso).not.toBeNull();
    expect(suceso!.subjectType).toBe("session");
    expect(suceso!.subjectId).toBe(sessionId);
    // **`PLAYERS`**: si fuera del DM, el aviso no llegaría a quien esperaba, que es todo el
    // motivo por el que el autor corrigió E-IB-18.
    expect(suceso!.visibility).toBe("PLAYERS");
  });

  it("y el jugador que esperaba lo VE en su registro", async () => {
    // La otra mitad: que el suceso exista no sirve si quien tenía la petición pendiente no lo ve.
    const { sessionId, encuentro } = await empezarConDosJugadores();
    const antes = await eventos.list(jugadoraId, campaignId, { limit: 50 });
    await service.cancel(dmId, campaignId, sessionId, encuentro.id);
    const despues = await eventos.list(jugadoraId, campaignId, { limit: 50 });

    const nuevos = despues.events.length - antes.events.length;
    expect(nuevos).toBeGreaterThan(0);
    expect(despues.events.some((e) => e.type === "ENCOUNTER_CANCELLED")).toBe(true);
  });

  /**
   * I-2 (ronda de arreglo 1) — la carrera REAL, no la secuencial de la prueba de arriba.
   *
   * La jugadora pulsa «Tirar» sobre su propia petición **en el mismo instante** en que el DM
   * fuerza el encuentro. Antes de esa ronda, si `forceStart` ganaba la carrera de cerrar la
   * petición, `aplicarIniciativaDePeticion` (llamado desde dentro de `answer`) veía
   * `cerrada: false` y `answer` lo traducía SIEMPRE en `BadRequestException("Esa petición ya se
   * respondió.")` — un 400 que le decía a la jugadora que ella ya había tirado, cuando en
   * realidad tiró de verdad (gastó un d20 real) y el sistema decidió sin ella.
   *
   * **Ronda de arreglo 2 — la prueba tiene que EXIGIR el reparto, no solo tolerarlo.** La primera
   * versión metía la comprobación del 409 dentro de un `if (respuesta.status === "rejected")`:
   * si en una tanda ninguna vuelta perdía la carrera, esa rama no se ejecutaba nunca y la prueba
   * pasaba igual con el arreglo de I-2 deshecho — medía «no revienta pase lo que pase», no «quien
   * pierde recibe 409». Ahora se acumulan los resultados de las **quince** vueltas y se exige, al
   * final, que **al menos una** haya perdido la carrera (`rejected`) y que **todas** las que la
   * perdieron traigan el 409 con su motivo — nunca el 400 genérico ni un 500. Con la frecuencia
   * medida en la ronda anterior (4 de 6, ~66% por vuelta), la probabilidad de que las quince
   * vueltas ganen todas la jugadora es `0.34^15 ≈ 3×10⁻⁷`: no es una garantía matemática, pero es
   * la misma clase de margen con la que la tarea 3 aceptó su propia carrera de tres respuestas.
   */
  it("responder y forzar a la vez: quien pierde la carrera real recibe 409, no 400 (I-2)", async () => {
    const resultados: PromiseSettledResult<unknown>[] = [];

    for (let intento = 0; intento < 15; intento++) {
      const { sessionId, encuentro, peticiones } = await empezarConDosJugadores();

      const [respuesta, forzado] = await Promise.allSettled([
        rollRequests.answer(jugadoraId, campaignId, peticiones[0].id, { spendInspiration: false }),
        service.forceStart(dmId, campaignId, sessionId, encuentro.id),
      ]);
      resultados.push(respuesta);

      // `forceStart` nunca revienta por esta carrera: si pierde la petición de la jugadora, la
      // salta en silencio (`cerrada.count === 0`) y sigue con el resto.
      expect(forzado.status).toBe("fulfilled");

      // Gane quien gane, el encuentro termina `ACTIVE`, sin peticiones pendientes y con
      // exactamente un `INITIATIVE_ROLLED_BY_SYSTEM` como mucho (el del jugador ausente; el de
      // la jugadora solo existe si perdió su propia carrera).
      expect((await recargar(encuentro.id))!.status).toBe("ACTIVE");
      const pendientes = await prisma.rollRequest.count({
        where: { encounterId: encuentro.id, resolvedAt: null },
      });
      expect(pendientes).toBe(0);
      const sucesosDeSistema = await prisma.gameEvent.count({
        where: { subjectId: encuentro.id, type: "INITIATIVE_ROLLED_BY_SYSTEM" },
      });
      expect(sucesosDeSistema).toBeGreaterThanOrEqual(1);
      expect(sucesosDeSistema).toBeLessThanOrEqual(2);
      const empezo = await prisma.gameEvent.count({
        where: { subjectId: encuentro.id, type: "ENCOUNTER_STARTED" },
      });
      expect(empezo).toBe(1);
    }

    // **Aquí es donde la prueba deja de ser tolerante y pasa a exigir.** Sin esto, deshacer el
    // arreglo de I-2 (volver al `BadRequestException` genérico) no movía ni una sola aserción de
    // las de arriba: todas viven dentro del bucle y ninguna mira el contenido de un rechazo que
    // podría no haber ocurrido nunca en esta tanda.
    const rechazos = resultados.filter((r): r is PromiseRejectedResult => r.status === "rejected");
    expect(rechazos.length).toBeGreaterThan(0);
    for (const rechazo of rechazos) {
      expect(rechazo.reason).toMatchObject({ status: 409 });
      expect((rechazo.reason as Error).message).toContain("tiró el sistema");
    }
  }, 30000);

  /**
   * M-8 (ronda de arreglo 1) — un fallo a mitad del bucle deja el encuentro a medias, y el
   * docstring de `forceStart` dice que retomar es tan simple como llamarlo otra vez. Se comprueba
   * forjando a mano el estado que un fallo a mitad de camino habría dejado —una petición ya
   * anulada por una iteración anterior, el resto todavía pendiente, el encuentro seguía
   * `PREPARING`— y llamando a `forceStart` una segunda vez sobre ese estado, sin pasar por la
   * primera iteración real.
   */
  it("una llamada repetida retoma desde donde se quedó (M-8)", async () => {
    const { sessionId, encuentro, peticiones } = await empezarConDosJugadores();

    // Forjado a mano: lo que la iteración de `peticiones[0]` habría dejado si `forceStart` hubiera
    // corrido hasta ahí y fallado justo después.
    await prisma.rollRequest.update({
      where: { id: peticiones[0].id },
      data: { resolvedAt: new Date(), cancelledAt: new Date() },
    });
    await prisma.combatant.updateMany({
      where: { encounterId: encuentro.id, characterId: peticiones[0].characterId },
      data: { initiative: 7 },
    });
    expect((await recargar(encuentro.id))!.status).toBe("PREPARING");

    await service.forceStart(dmId, campaignId, sessionId, encuentro.id);

    expect((await recargar(encuentro.id))!.status).toBe("ACTIVE");
    const pendientes = await prisma.rollRequest.count({
      where: { encounterId: encuentro.id, resolvedAt: null },
    });
    expect(pendientes).toBe(0);
    const combatientes = await prisma.combatant.findMany({ where: { encounterId: encuentro.id } });
    expect(combatientes.every((c) => c.initiative !== 0)).toBe(true);
    // Solo UN suceso de sistema: el de `peticiones[1]`, la única que esta segunda llamada
    // procesó de verdad. La de `peticiones[0]` ya estaba anulada antes de que `forceStart`
    // volviera a correr, así que no genera una segunda.
    const sucesos = await prisma.gameEvent.count({
      where: { subjectId: encuentro.id, type: "INITIATIVE_ROLLED_BY_SYSTEM" },
    });
    expect(sucesos).toBe(1);
  });

  it("cancelar un combate YA empezado no se puede", async () => {
    const sessionId = await nuevaSesion(`Ya activo ${Date.now()}`);
    const goblinId = await nuevoPnjDelDm("SRD:goblin");

    const r = await request(s())
      .post(`/campaigns/${campaignId}/sessions/${sessionId}/encounters`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ characterIds: [goblinId] });
    expect(r.status).toBe(201);
    expect(r.body.status).toBe("ACTIVE");

    await expect(service.cancel(dmId, campaignId, sessionId, r.body.id)).rejects.toThrow(
      ConflictException,
    );
  });
});
