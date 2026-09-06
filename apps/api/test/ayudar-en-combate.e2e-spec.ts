import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

// **Paso 1, tarea 4 — la acción Ayudar dentro de un combate de verdad.**
//
// **Por qué hace falta otra suite y no valía la que había.** `ayudar.e2e-spec.ts` avanza el reloj
// **a mano** y no tiene ni encuentro ni iniciativa, así que nunca ejercita el caso que rompe:
// pasa sin probar lo que dice probar. El reloj de campaña solo sube al **cerrar un asalto**, y la
// marca de Ayudar vence a `reloj + 6s`, o sea justo al **empezar** el asalto siguiente — antes del
// turno de nadie. Consecuencia: **quien actúa antes que su ayudante llega a su turno con la
// ventaja ya vencida**, y eso es determinista en la mitad de los órdenes de iniciativa.
//
// SRD 5.1, «Help»: *«you can aid a friendly creature in attacking a creature within 5 feet of
// you… the first attack roll is made with advantage»*, y la ayuda dura *«until the start of your
// next turn»* — el turno de **quien ayuda**, no el reloj.
//
// Los dos personajes son **del DM** a propósito: así el encuentro nace `ACTIVE` sin repartir
// peticiones de iniciativa (`iniciativa-repartida.e2e-spec.ts` lo declara), y el orden se fija con
// el `PATCH` de iniciativa en vez de depender de una tirada.

describe("Ayudar dentro de un combate (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const emailDM = `dm-ayucomb${Date.now()}@b.com`;
  let tokenDM = "";
  let campaignId = "";
  let sessionId = "";
  let ayudanteId = "";
  let ayudadoId = "";
  let encounterId = "";

  const s = () => app.getHttpServer();
  const encUrl = (suffix = "") =>
    `/campaigns/${campaignId}/sessions/${sessionId}/encounters${suffix}`;

  /** El modo que la hoja sugiere para el ataque de un personaje. */
  async function modoSugerido(characterId: string): Promise<string | undefined> {
    const hoja = await request(s())
      .get(`/campaigns/${campaignId}/characters/${characterId}/sheet`)
      .set("Authorization", `Bearer ${tokenDM}`);
    return hoja.body.rollSuggestions?.attack?.mode;
  }

  /** Quién tiene el turno ahora mismo, por identidad y no por posición. */
  async function deQuienEsElTurno(): Promise<string | undefined> {
    const r = await request(s())
      .get(encUrl(`/${encounterId}`))
      .set("Authorization", `Bearer ${tokenDM}`);
    const activo = r.body.combatants.find(
      (c: { position: number }) => c.position === r.body.activePosition,
    );
    return activo?.characterId;
  }

  async function pasarTurno(): Promise<void> {
    await request(s())
      .post(encUrl(`/${encounterId}/advance-turn`))
      .set("Authorization", `Bearer ${tokenDM}`)
      .expect(201);
  }

  /** Pasa turnos hasta que le toque a quien se diga. Tope alto para que un bucle roto falle. */
  async function pasarTurnoHasta(characterId: string): Promise<void> {
    for (let i = 0; i < 12; i++) {
      if ((await deQuienEsElTurno()) === characterId) return;
      await pasarTurno();
    }
    throw new Error("Nunca le tocó el turno: el orden de iniciativa no es el que cree la prueba.");
  }

  beforeAll(async () => {
    const ref = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = ref.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    prisma = app.get(PrismaService);

    tokenDM = (
      await request(s())
        .post("/auth/register")
        .send({ email: emailDM, password: "password123", displayName: "DM" })
    ).body.token;
    campaignId = (
      await request(s())
        .post("/campaigns")
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ name: "Campaña de Ayudar en combate" })
    ).body.id;
    sessionId = (
      await request(s())
        .post(`/campaigns/${campaignId}/sessions`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ title: "La emboscada", visibility: "PLAYERS" })
    ).body.id;

    // La hoja completa no es adorno: empezar un encuentro gestiona los PG, y sin características
    // ni clase el servidor contesta 400 —«Faltan datos para calcular la hoja»— en vez de crear el
    // encuentro. Es el mismo bloque que usan las demás suites.
    const nuevo = async (name: string) => {
      const id = (
        await request(s())
          .post(`/campaigns/${campaignId}/characters`)
          .set("Authorization", `Bearer ${tokenDM}`)
          .send({ name, level: 1, visibility: "PLAYERS" })
      ).body.id as string;
      await request(s())
        .patch(`/campaigns/${campaignId}/characters/${id}/sheet`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({
          abilities: { str: 15, dex: 12, con: 14, int: 8, wis: 10, cha: 8 },
          race: { source: "SRD", key: "dwarf" },
          subrace: { source: "SRD", key: "dwarf-hill" },
          class: { source: "SRD", key: "fighter" },
          choices: { "fighter-skills": ["athletics", "perception"] },
        })
        .expect(200);
      return id;
    };
    ayudanteId = await nuevo("Mira");
    ayudadoId = await nuevo("Brann");

    const creado = await request(s())
      .post(encUrl())
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ characterIds: [ayudanteId, ayudadoId] });
    expect(creado.status).toBe(201);
    // Nace ACTIVE porque los dos son del DM: no hay a quién pedirle la iniciativa.
    expect(creado.body.status).toBe("ACTIVE");
    encounterId = creado.body.id;

    // **El ayudado actúa ANTES que su ayudante**, que es el orden en el que hoy se pierde la
    // ventaja. Se fija a mano en vez de confiar en una tirada: de qué número salga cada
    // iniciativa no puede decidir si la prueba mide lo que dice medir.
    const encuentro = await request(s())
      .get(encUrl(`/${encounterId}`))
      .set("Authorization", `Bearer ${tokenDM}`);
    for (const c of encuentro.body.combatants as { id: string; characterId: string }[]) {
      await request(s())
        .patch(encUrl(`/${encounterId}/combatants/${c.id}`))
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ initiative: c.characterId === ayudadoId ? 20 : 5 });
    }
  });

  afterAll(async () => {
    if (campaignId) await prisma.campaign.deleteMany({ where: { id: campaignId } });
    await prisma.user.deleteMany({ where: { email: emailDM } });
    await app.close();
  });

  it("el ayudado que actúa ANTES que su ayudante conserva la ventaja en su turno", async () => {
    // Turno del ayudante (iniciativa 5, va el último del asalto): ahí es donde se ayuda.
    await pasarTurnoHasta(ayudanteId);
    await request(s())
      .post(`/campaigns/${campaignId}/characters/${ayudanteId}/help`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ targetCharacterId: ayudadoId })
      .expect(201);

    // Cerrar el asalto sube el reloj seis segundos, y con él vencía la marca **antes** de que el
    // ayudado llegara a actuar. El SRD la mantiene hasta el turno de QUIEN AYUDÓ.
    await pasarTurnoHasta(ayudadoId);

    expect(await modoSugerido(ayudadoId)).toBe("ADVANTAGE");
  });

  it("y la pierde cuando vuelve a tocarle a quien le ayudó", async () => {
    await pasarTurnoHasta(ayudanteId);
    await pasarTurno();

    expect(await modoSugerido(ayudadoId)).toBe("NORMAL");
  });
});
