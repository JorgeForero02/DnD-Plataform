import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import type { GameEventType } from "@prisma/client";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { RollRequestsService } from "../src/roll-requests/roll-requests.service";

// Tarea 3 (2026-09-05) contra Postgres real.
//
// Responder la petición de iniciativa de un `ajeno` escribe su número en el `Combatant`,
// recoloca el orden y, si esa petición era la última que faltaba, sube el encuentro de
// `PREPARING` a `ACTIVE` y escribe `ENCOUNTER_STARTED`. Esto no lo puede probar la unitaria
// (`encounters.service.spec.ts`) porque necesita filas reales de `RollRequest` y `Combatant`, y
// sobre todo porque la segunda prueba de aquí abajo es una carrera real entre tres respuestas
// simultáneas — eso solo existe contra Postgres de verdad, no contra un Prisma simulado.
describe("Responder la petición de iniciativa coloca al combatiente y arranca el combate (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let rollRequests: RollRequestsService;
  const emailDM = `dm-ipe${Date.now()}@b.com`;
  let tokenDM = "";
  let campaignId = "";

  const s = () => app.getHttpServer();

  async function nuevoJugador(sufijo: string): Promise<{ token: string; userId: string }> {
    const email = `pl-ipe-${sufijo}-${Date.now()}@b.com`;
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

  async function recargar(encounterId: string) {
    return prisma.encounter.findUniqueOrThrow({ where: { id: encounterId } });
  }

  async function contarSucesos(encounterId: string, type: GameEventType): Promise<number> {
    return prisma.gameEvent.count({ where: { subjectId: encounterId, type } });
  }

  let jugadoraId = "";
  let jugadorId = "";
  let jugadora: { token: string; userId: string };
  let jugador: { token: string; userId: string };
  let tercero: { token: string; userId: string };

  /**
   * Un encuentro `PREPARING` con dos personajes de dos jugadores distintos.
   *
   * **Reutiliza cuentas ya registradas en `beforeAll`, no crea las suyas.** `AUTH_RATE_LIMIT`
   * es 5 registros por IP y por minuto (`rate-limit.constants.ts`), y este fichero comparte un
   * único contador de `ThrottlerStorage` — cinco registros justos (DM + tres jugadores) caben;
   * seis no.
   */
  async function empezarConDosJugadores() {
    const sessionId = await nuevaSesion(`Con dos ${Date.now()}`);
    const pjJugadora = await nuevoPersonajeDelJugador(jugadora.token, "Jugadora", 16);
    const pjJugador = await nuevoPersonajeDelJugador(jugador.token, "Jugador", 12);

    const r = await request(s())
      .post(`/campaigns/${campaignId}/sessions/${sessionId}/encounters`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ characterIds: [pjJugadora, pjJugador] });
    expect(r.status).toBe(201);
    expect(r.body.status).toBe("PREPARING");

    const filas = await prisma.rollRequest.findMany({ where: { encounterId: r.body.id } });
    // Ordenadas para que `peticiones[0]` sea SIEMPRE la de la jugadora y `peticiones[1]` la del
    // jugador — `findMany` no promete el orden de creación, así que el orden se fija a mano.
    const peticiones = [pjJugadora, pjJugador].map((characterId) =>
      filas.find((f) => f.characterId === characterId)!,
    );
    return { encuentro: r.body as { id: string; status: string }, peticiones };
  }

  let duenos: string[] = [];

  /** Un encuentro `PREPARING` con tres personajes de tres jugadores distintos. */
  async function empezarConTresJugadores() {
    const jugadores = [jugadora, jugador, tercero];
    duenos = jugadores.map((j) => j.userId);

    const sessionId = await nuevaSesion(`Con tres ${Date.now()}`);
    const personajes = await Promise.all(
      jugadores.map((j, i) => nuevoPersonajeDelJugador(j.token, `PJ${i}${Date.now()}`, 12 + i)),
    );

    const r = await request(s())
      .post(`/campaigns/${campaignId}/sessions/${sessionId}/encounters`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ characterIds: personajes });
    expect(r.status).toBe(201);
    expect(r.body.status).toBe("PREPARING");

    const filas = await prisma.rollRequest.findMany({ where: { encounterId: r.body.id } });
    // Ordenadas para que `peticiones[i]` sea siempre la del jugador `duenos[i]`.
    const peticiones = personajes.map((characterId) =>
      filas.find((f) => f.characterId === characterId)!,
    );
    return { encuentro: r.body as { id: string; status: string }, peticiones };
  }

  beforeAll(async () => {
    const ref = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = ref.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    prisma = app.get(PrismaService);
    rollRequests = app.get(RollRequestsService);

    tokenDM = (
      await request(s())
        .post("/auth/register")
        .send({ email: emailDM, password: "password123", displayName: "DM" })
    ).body.token;
    campaignId = (
      await request(s())
        .post("/campaigns")
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ name: "Campaña de la iniciativa pedida" })
    ).body.id;

    // Los tres jugadores de toda la suite, registrados una sola vez (ver el comentario de
    // `empezarConDosJugadores` sobre `AUTH_RATE_LIMIT`).
    jugadora = await nuevoJugador("a");
    jugador = await nuevoJugador("b");
    tercero = await nuevoJugador("c");
    jugadoraId = jugadora.userId;
    jugadorId = jugador.userId;
  });

  afterAll(async () => {
    if (campaignId) await prisma.campaign.deleteMany({ where: { id: campaignId } });
    await app.close();
  });

  it("responder la petición coloca al personaje y, si era la última, empieza el combate", async () => {
    const { encuentro, peticiones } = await empezarConDosJugadores();
    expect(encuentro.status).toBe("PREPARING");

    await rollRequests.answer(jugadoraId, campaignId, peticiones[0].id, {
      spendInspiration: false,
    });
    expect((await recargar(encuentro.id)).status).toBe("PREPARING");

    await rollRequests.answer(jugadorId, campaignId, peticiones[1].id, {
      spendInspiration: false,
    });
    const final = await recargar(encuentro.id);
    expect(final.status).toBe("ACTIVE");

    const filas = await prisma.combatant.findMany({ where: { encounterId: encuentro.id } });
    expect(filas.every((f) => f.initiative !== 0)).toBe(true);
    expect(new Set(filas.map((f) => f.position)).size).toBe(filas.length);

    expect(await contarSucesos(encuentro.id, "ENCOUNTER_STARTED")).toBe(1);
  });

  it("tres respuestas simultáneas dan UN solo orden y empiezan el combate UNA vez", async () => {
    const { encuentro, peticiones } = await empezarConTresJugadores();
    const sucesosAntes = await contarSucesos(encuentro.id, "ENCOUNTER_STARTED");

    await Promise.all(
      peticiones.map((p, i) =>
        rollRequests.answer(duenos[i], campaignId, p.id, { spendInspiration: false }),
      ),
    );

    const filas = await prisma.combatant.findMany({ where: { encounterId: encuentro.id } });
    expect(new Set(filas.map((f) => f.position)).size).toBe(filas.length);
    expect(await contarSucesos(encuentro.id, "ENCOUNTER_STARTED")).toBe(sucesosAntes + 1);

    expect((await recargar(encuentro.id)).status).toBe("ACTIVE");
  });
});
