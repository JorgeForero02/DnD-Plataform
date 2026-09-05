import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

// Tarea 2.5.6 — **las dos puertas que la pantalla necesitaba**, contra Postgres real.
//
// `encounters.e2e-spec.ts` ya prueba empezar, agrupar y pasar turno. Aquí van las dos cosas sin
// las cuales la mesa de combate no puede existir, y que 2.5.2 no tenía:
//
//  - **`GET .../encounters/current`**, porque `get` exige un `encounterId` que solo conoce quien
//    acaba de llamar a `start`: recargar la mesa, abrirla en otro dispositivo o entrar un jugador
//    a mitad de combate dejaba el encuentro invisible aunque estuviera en curso.
//  - **`POST .../encounters/:id/end`**, porque sin él la tira de iniciativa no se va nunca.
//
// Y las dos con su regla de visibilidad puesta: `current` reutiliza `get` entero justo para que el
// filtrado por `canView` y la renumeración densa de posiciones vivan en un solo sitio.

describe("La capa de combate de la mesa (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const emailDM = `dm-capa${Date.now()}@b.com`;
  const emailPL = `pl-capa${Date.now()}@b.com`;
  let tokenDM = "";
  let tokenPL = "";
  let campaignId = "";
  let sessionId = "";
  let pcId = "";
  let goblinIds: string[] = [];

  const encUrl = (suffix = "") =>
    `/campaigns/${campaignId}/sessions/${sessionId}/encounters${suffix}`;
  const auth = (t: string) => `Bearer ${t}`;

  beforeAll(async () => {
    const ref = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = ref.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    prisma = app.get(PrismaService);
    const s = app.getHttpServer();

    tokenDM = (
      await request(s)
        .post("/auth/register")
        .send({ email: emailDM, password: "password123", displayName: "DM" })
    ).body.token;
    tokenPL = (
      await request(s)
        .post("/auth/register")
        .send({ email: emailPL, password: "password123", displayName: "PL" })
    ).body.token;
    campaignId = (
      await request(s)
        .post("/campaigns")
        .set("Authorization", auth(tokenDM))
        .send({ name: "La capa de combate" })
    ).body.id;
    const invite = (
      await request(s).post(`/campaigns/${campaignId}/invites`).set("Authorization", auth(tokenDM))
    ).body.token;
    await request(s).post(`/invites/${invite}/accept`).set("Authorization", auth(tokenPL));
    sessionId = (
      await request(s)
        .post(`/campaigns/${campaignId}/sessions`)
        .set("Authorization", auth(tokenDM))
        .send({ title: "Sesión con combate", visibility: "PLAYERS" })
    ).body.id;

    pcId = (
      await request(s)
        .post(`/campaigns/${campaignId}/characters`)
        .set("Authorization", auth(tokenPL))
        .send({ name: "Thora", level: 1 })
    ).body.id;
    await request(s)
      .patch(`/campaigns/${campaignId}/characters/${pcId}/sheet`)
      .set("Authorization", auth(tokenPL))
      .send({
        abilities: { str: 12, dex: 16, con: 14, int: 8, wis: 10, cha: 8 },
        race: { source: "SRD", key: "human" },
        class: { source: "SRD", key: "fighter" },
        choices: { "fighter-skills": ["athletics", "perception"] },
      });

    // Tres goblins idénticos, y **por defecto no los ve el jugador**: los PNJ del DM nacen
    // ocultos. Es lo que hace que este fichero pruebe la visibilidad y no solo el camino feliz.
    const goblins = await request(s)
      .post(`/campaigns/${campaignId}/npcs`)
      .set("Authorization", auth(tokenDM))
      .send({ ref: "SRD:goblin", count: 3, hp: "AVERAGE" });
    expect(goblins.status).toBe(201);
    goblinIds = goblins.body.map((g: { id: string }) => g.id);
    expect(goblinIds).toHaveLength(3);
  });

  afterAll(async () => {
    if (campaignId) await prisma.campaign.deleteMany({ where: { id: campaignId } });
    await prisma.user.deleteMany({ where: { email: { in: [emailDM, emailPL] } } });
    await app.close();
  });

  it("sin combate, `current` contesta null y no un 404: no estar en combate es lo normal", async () => {
    const r = await request(app.getHttpServer())
      .get(encUrl("/current"))
      .set("Authorization", auth(tokenPL));
    expect(r.status).toBe(200);
    expect(r.body).toBeNull();
  });

  it("empezado el combate, `current` lo encuentra sin conocer su id — que es para lo que existe", async () => {
    const s = app.getHttpServer();
    const creado = await request(s)
      .post(encUrl())
      .set("Authorization", auth(tokenDM))
      .send({ characterIds: [pcId, ...goblinIds] });
    expect(creado.status).toBe(201);

    // **Puente temporal hasta la tarea 3.** `pcId` es del jugador, no del DM que empieza el
    // combate: desde la tarea 2 (2026-09-05) `start()` ya no tira por él, le pide la iniciativa,
    // y el encuentro nace `PREPARING`. Responder esa petición y escribir la iniciativa es la
    // tarea siguiente, que todavía no existe, así que se hace aquí a mano lo que ella hará —
    // fijar una iniciativa real y subir el encuentro— para que el resto de este fichero (que
    // prueba `current` y `end`, no el reparto) siga probando lo que probaba antes.
    if (creado.body.status === "PREPARING") {
      const pendientes = await prisma.rollRequest.findMany({
        where: { encounterId: creado.body.id, resolvedAt: null },
      });
      for (const peticion of pendientes) {
        const combatiente = creado.body.combatants.find(
          (c: { characterId: string }) => c.characterId === peticion.characterId,
        );
        await request(s)
          .patch(encUrl(`/${creado.body.id}/combatants/${combatiente.id}`))
          .set("Authorization", auth(tokenDM))
          .send({ initiative: 10 });
      }
      await prisma.rollRequest.updateMany({
        where: { id: { in: pendientes.map((p) => p.id) } },
        data: { resolvedAt: new Date() },
      });
      await prisma.encounter.update({
        where: { id: creado.body.id },
        data: { status: "ACTIVE" },
      });
    }

    // **Nadie le pasa el id.** Es exactamente la situación de recargar la mesa.
    const actual = await request(s).get(encUrl("/current")).set("Authorization", auth(tokenDM));
    expect(actual.status).toBe(200);
    expect(actual.body.id).toBe(creado.body.id);
    expect(actual.body.status).toBe("ACTIVE");
    // Un personaje y **un** grupo de goblins: dos turnos, no cuatro.
    expect(new Set(actual.body.combatants.map((c: { position: number }) => c.position)).size).toBe(
      2,
    );
  });

  it("el jugador ve SU combate, y no cuántos enemigos escondidos hay", async () => {
    const s = app.getHttpServer();

    // **Se fuerza que el PJ vaya el ÚLTIMO, y sin esto la prueba no distinguía nada.** Lo midió
    // la revisión de cierre: con el PJ arriba por su Destreza, su posición cruda es 0, así que
    // `toBe(0)` se cumplía **con y sin renumerar** — cinco vueltas con la renumeración rota y las
    // seis pruebas en verde cada vez.
    //
    // Se baja SU iniciativa, no la de los goblins, y por dos razones: corregir la de un goblin lo
    // **separa del grupo** —es la puerta que el SRD deja para deshacer un empate— y entonces el
    // resultado depende de lo que sacaran los demás, que es un d20; y con −20 el PJ queda detrás
    // pase lo que pase, porque un goblin con +2 de Destreza no puede bajar de 3.
    const actual = (await request(s).get(encUrl("/current")).set("Authorization", auth(tokenDM)))
      .body;
    const pj = actual.combatants.find((c: { characterId: string }) => c.characterId === pcId);
    const corregida = await request(s)
      .patch(encUrl(`/${actual.id}/combatants/${pj.id}`))
      .set("Authorization", auth(tokenDM))
      .send({ initiative: -20 });
    expect(corregida.status).toBe(200);

    // El DM ve al PJ en la posición 1: delante va el grupo entero de goblins, que actúa a la vez.
    const comoDm = (await request(s).get(encUrl("/current")).set("Authorization", auth(tokenDM)))
      .body;
    const pjCrudo = comoDm.combatants.find((c: { characterId: string }) => c.characterId === pcId);
    expect(pjCrudo.position).toBe(1);

    const r = await request(s).get(encUrl("/current")).set("Authorization", auth(tokenPL));
    expect(r.status).toBe(200);
    // Solo su personaje: los tres goblins son PNJ ocultos.
    expect(r.body.combatants).toHaveLength(1);
    expect(r.body.combatants[0].characterId).toBe(pcId);
    // **Renumerada densa: un 0 y ningún hueco.** La cruda es 1, y ese 1 le diría que hay un
    // turno entero delante que no puede ver.
    expect(r.body.combatants[0].position).toBe(0);
    // Y `activePosition` es `null`, porque el turno lo tiene ahora el grupo escondido.
    expect(r.body.activePosition).toBeNull();
  });

  it("el registro del jugador no lleva NINGUNA posición: contarlas era contar enemigos", async () => {
    const s = app.getHttpServer();
    const actual = (await request(s).get(encUrl("/current")).set("Authorization", auth(tokenDM)))
      .body;

    // Se recorre el orden entero un par de veces, que es lo que pasa en un combate de verdad.
    for (let i = 0; i < 4; i++) {
      const r = await request(s)
        .post(encUrl(`/${actual.id}/advance-turn`))
        .set("Authorization", auth(tokenDM));
      expect(r.status).toBe(201);
    }

    const log = await request(s)
      .get(`/campaigns/${campaignId}/events?sessionId=${sessionId}`)
      .set("Authorization", auth(tokenPL));
    expect(log.status).toBe(200);
    const turnos = log.body.events.filter(
      (e: { payload: { type: string } }) => e.payload.type === "TURN_ADVANCED",
    );
    expect(turnos.length).toBeGreaterThan(0);

    // **Ninguna posición viaja.** `get` renumera denso justo para que un jugador no pueda contar
    // los huecos de lo que no ve; el `payload` de este suceso las llevaba crudas y
    // `GameEventsService.list` lo devuelve entero, así que el registro deshacía por la puerta de
    // atrás lo que la ficha del encuentro protegía. Lo midió la revisión de cierre con un PJ
    // visible y cuatro grupos ocultos: el registro le entregaba cinco posiciones distintas.
    for (const t of turnos) {
      expect(t.payload).not.toHaveProperty("fromPosition");
      expect(t.payload).not.toHaveProperty("toPosition");
      // Y lo que sí lleva sigue estando: el asalto es lo que la mesa apunta.
      expect(typeof t.payload.round).toBe("number");
    }

    // La comprobación que de verdad importa, dicha como se deduce: sobre el cuerpo serializado
    // entero no puede aparecer ningún número de posición mayor que el último visible.
    const visibles = (await request(s).get(encUrl("/current")).set("Authorization", auth(tokenPL)))
      .body.combatants.length;
    const posiciones = turnos.flatMap((t: { payload: Record<string, unknown> }) =>
      Object.entries(t.payload)
        .filter(([k]) => k.toLowerCase().includes("position"))
        .map(([, v]) => v),
    );
    expect(posiciones).toEqual([]);
    expect(visibles).toBe(1);
  });

  it("un jugador no puede terminar el combate (403)", async () => {
    const s = app.getHttpServer();
    const actual = (await request(s).get(encUrl("/current")).set("Authorization", auth(tokenDM)))
      .body;
    const r = await request(s)
      .post(encUrl(`/${actual.id}/end`))
      .set("Authorization", auth(tokenPL));
    expect(r.status).toBe(403);
    // Y sigue activo: el 403 no es cosmético.
    const sigue = await request(s).get(encUrl("/current")).set("Authorization", auth(tokenDM));
    expect(sigue.body.status).toBe("ACTIVE");
  });

  it("terminar el combate lo deja en ENDED, `current` vuelve a null y se puede empezar otro", async () => {
    const s = app.getHttpServer();
    const actual = (await request(s).get(encUrl("/current")).set("Authorization", auth(tokenDM)))
      .body;

    const fin = await request(s)
      .post(encUrl(`/${actual.id}/end`))
      .set("Authorization", auth(tokenDM));
    expect(fin.status).toBe(201);
    expect(fin.body.status).toBe("ENDED");

    const despues = await request(s).get(encUrl("/current")).set("Authorization", auth(tokenDM));
    expect(despues.body).toBeNull();

    // **No se borró nada**: el encuentro sigue consultable por su id, con su orden y sus asaltos.
    const viejo = await request(s)
      .get(encUrl(`/${actual.id}`))
      .set("Authorization", auth(tokenDM));
    expect(viejo.status).toBe(200);
    expect(viejo.body.status).toBe("ENDED");

    // Y el índice único es parcial sobre ACTIVE, así que el siguiente combate no choca con él.
    //
    // **Un goblin del DM, no `pcId`.** Con `pcId` —del jugador— este `start()` nacería
    // `PREPARING` desde la tarea 2 (2026-09-05), y la prueba siguiente necesita `current` en
    // `ACTIVE` sin más trámite: lo que se comprueba aquí es que el índice deja empezar otro
    // encuentro, no el reparto por dueño, que ya tiene su propio fichero.
    const otro = await request(s)
      .post(encUrl())
      .set("Authorization", auth(tokenDM))
      .send({ characterIds: [goblinIds[0]] });
    expect(otro.status).toBe(201);
    expect(otro.body.status).toBe("ACTIVE");
    expect(otro.body.id).not.toBe(actual.id);
  });

  it("terminar dos veces el mismo encuentro es 409, no un segundo suceso en el registro", async () => {
    const s = app.getHttpServer();
    const actual = (await request(s).get(encUrl("/current")).set("Authorization", auth(tokenDM)))
      .body;
    expect(
      (
        await request(s)
          .post(encUrl(`/${actual.id}/end`))
          .set("Authorization", auth(tokenDM))
      ).status,
    ).toBe(201);
    const repetido = await request(s)
      .post(encUrl(`/${actual.id}/end`))
      .set("Authorization", auth(tokenDM));
    expect(repetido.status).toBe(409);

    // El registro tiene UN final, no dos.
    const log = await request(s)
      .get(`/campaigns/${campaignId}/events?sessionId=${sessionId}`)
      .set("Authorization", auth(tokenDM));
    const finales = log.body.events.filter(
      (e: { payload: { type: string; encounterId?: string } }) =>
        e.payload.type === "ENCOUNTER_ENDED" && e.payload.encounterId === actual.id,
    );
    expect(finales).toHaveLength(1);
    expect(finales[0].payload.rounds).toBe(1);
  });
});
