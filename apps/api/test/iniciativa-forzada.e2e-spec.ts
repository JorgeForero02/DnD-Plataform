import { ConflictException, ForbiddenException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { EncountersService } from "../src/encounters/encounters.service";
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
