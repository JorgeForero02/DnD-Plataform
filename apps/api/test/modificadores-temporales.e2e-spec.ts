import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

// Plan 13, ficha M8 — **«+2 a Fuerza durante una hora», contra Postgres.**
//
// Lo pidieron **los jugadores por su nombre** —«subidas y bajadas de atributos temporales»— y no
// estaba en ningún plan: era un hueco de alcance, no una deuda de implementación.
//
// Lo que solo se ve aquí y no en una unitaria: que el número **suba de verdad en la hoja
// derivada**, que **la traza diga de dónde sale**, y que al pasar el reloj **deje de sumar sin
// desaparecer**. Las tres cosas cruzan tres capas —tabla, motor y reloj— y ninguna se puede
// simular sin mentir.

describe("Modificadores temporales (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const emailDM = `dm-temp${Date.now()}@b.com`;
  const emailPL = `pl-temp${Date.now()}@b.com`;
  let tokenDM = "";
  let tokenPL = "";
  let campaignId = "";
  let characterId = "";

  const hoja = async (token = tokenPL) =>
    (
      await request(app.getHttpServer())
        .get(`/campaigns/${campaignId}/characters/${characterId}/sheet`)
        .set("Authorization", `Bearer ${token}`)
    ).body;

  const fuerza = async () => (await hoja()).sheet.derived["ability.str"];

  const avanzar = (segundos: number) =>
    request(app.getHttpServer())
      .post(`/campaigns/${campaignId}/clock/advance`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ kind: "TIME", seconds: segundos });

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
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ name: "Campaña de las pociones" })
    ).body.id;
    const invite = (
      await request(s)
        .post(`/campaigns/${campaignId}/invites`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({})
    ).body.token;
    await request(s).post(`/invites/${invite}/accept`).set("Authorization", `Bearer ${tokenPL}`);
    characterId = (
      await request(s)
        .post(`/campaigns/${campaignId}/characters`)
        .set("Authorization", `Bearer ${tokenPL}`)
        .send({ name: "Thorin", level: 1, visibility: "PLAYERS" })
    ).body.id;
    await request(s)
      .patch(`/campaigns/${campaignId}/characters/${characterId}/sheet`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({
        abilities: { str: 15, dex: 12, con: 14, int: 8, wis: 10, cha: 8 },
        race: { source: "SRD", key: "dwarf" },
        class: { source: "SRD", key: "fighter" },
        choices: { "fighter-skills": ["athletics", "perception"] },
      });
  });

  afterAll(async () => {
    if (campaignId) await prisma.campaign.deleteMany({ where: { id: campaignId } });
    await prisma.user.deleteMany({ where: { email: { in: [emailDM, emailPL] } } });
    await app.close();
  });

  it("un `target` fuera del vocabulario cerrado es **400**", async () => {
    // Libre llegaría a la pantalla sin traducir y al motor sin significado.
    await request(app.getHttpServer())
      .post(`/campaigns/${campaignId}/characters/${characterId}/temporary-modifiers`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({ target: "carisma-de-verdad", amount: 2, reason: "x" })
      .expect(400);
  });

  it("**la Fuerza derivada sube, y la traza dice de dónde sale**", async () => {
    const antes = await fuerza();
    const r = await request(app.getHttpServer())
      .post(`/campaigns/${campaignId}/characters/${characterId}/temporary-modifiers`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({
        target: "ability.str",
        amount: 2,
        reason: "Poción de fuerza de gigante",
        durationSeconds: 3600,
      });
    expect(r.status).toBe(201);

    const despues = await fuerza();
    expect(despues.total).toBe(antes.total + 2);
    // **Un +2 sin origen es lo que la traza existe para impedir.** El paso lleva su tipo propio
    // —ni `item` ni `manual`— y el motivo dentro de la clave, porque el motor no devuelve prosa.
    const paso = (despues.steps as { sourceType: string; labelKey: string; amount: number }[]).find(
      (x) => x.sourceType === "temporary",
    );
    expect(paso).toMatchObject({ amount: 2 });
    expect(paso?.labelKey).toContain("Poción de fuerza de gigante");
  });

  it("y **la columna del personaje NO se ha tocado**", async () => {
    // Si mutara, al caducar habría que restar y cualquier fallo dejaría al personaje cambiado para
    // siempre. Se lee la fila cruda: la hoja ya dice 17, y lo que se comprueba es lo de debajo.
    const fila = await prisma.character.findUniqueOrThrow({ where: { id: characterId } });
    expect(fila.str).toBe(15);
  });

  it("**al pasar el reloj deja de sumar y NO desaparece**: queda marcado (D-2C-2)", async () => {
    const conBono = await fuerza();
    await avanzar(3600).expect(201);

    const sinBono = await fuerza();
    expect(sinBono.total).toBe(conBono.total - 2);
    expect(
      (sinBono.steps as { sourceType: string }[]).some((x) => x.sourceType === "temporary"),
    ).toBe(false);

    // Sigue en la lista, marcado: el jugador ve **por qué** perdió el +2.
    const lista = await request(app.getHttpServer())
      .get(`/campaigns/${campaignId}/characters/${characterId}/temporary-modifiers`)
      .set("Authorization", `Bearer ${tokenPL}`);
    expect(lista.body).toHaveLength(1);
    expect(lista.body[0]).toMatchObject({ expired: true, reason: "Poción de fuerza de gigante" });
  });

  it("y **el vencimiento se anuncia** en el registro, con su motivo", async () => {
    const log = await request(app.getHttpServer())
      .get(`/campaigns/${campaignId}/events`)
      .set("Authorization", `Bearer ${tokenDM}`);
    const eventos = log.body.events as { type: string; payload: Record<string, unknown> }[];
    expect(
      eventos.some(
        (e) =>
          e.type === "TEMP_MODIFIER_GRANTED" && e.payload.reason === "Poción de fuerza de gigante",
      ),
    ).toBe(true);
    expect(
      eventos.some(
        (e) =>
          e.type === "TEMP_MODIFIER_EXPIRED" && e.payload.reason === "Poción de fuerza de gigante",
      ),
    ).toBe(true);
  });

  it("**un negativo resta**, que es la otra mitad de lo que pidieron", async () => {
    const antes = await fuerza();
    await request(app.getHttpServer())
      .post(`/campaigns/${campaignId}/characters/${characterId}/temporary-modifiers`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({ target: "ability.str", amount: -3, reason: "Maldición del pantano" })
      .expect(201);
    expect((await fuerza()).total).toBe(antes.total - 3);
  });

  it("**sin duración no vence nunca**, por mucho reloj que pase", async () => {
    // Hay efectos que duran «hasta que el DM lo diga», y fingirles una duración sería inventarse
    // una regla. El de arriba se creó sin `durationSeconds`.
    const conMaldicion = await fuerza();
    await avanzar(86_400).expect(201);
    expect((await fuerza()).total).toBe(conMaldicion.total);
  });

  it("quitarlo a mano lo borra, y **no cuenta un vencimiento que no ocurrió**", async () => {
    const s = app.getHttpServer();
    const lista = await request(s)
      .get(`/campaigns/${campaignId}/characters/${characterId}/temporary-modifiers`)
      .set("Authorization", `Bearer ${tokenPL}`);
    const maldicion = (lista.body as { id: string; reason: string }[]).find(
      (m) => m.reason === "Maldición del pantano",
    )!;

    const antes = (
      await request(s)
        .get(`/campaigns/${campaignId}/events`)
        .set("Authorization", `Bearer ${tokenDM}`)
    ).body.events.filter((e: { type: string }) => e.type === "TEMP_MODIFIER_EXPIRED").length;

    await request(s)
      .delete(
        `/campaigns/${campaignId}/characters/${characterId}/temporary-modifiers/${maldicion.id}`,
      )
      .set("Authorization", `Bearer ${tokenPL}`)
      .expect(200);

    const despues = (
      await request(s)
        .get(`/campaigns/${campaignId}/events`)
        .set("Authorization", `Bearer ${tokenDM}`)
    ).body.events.filter((e: { type: string }) => e.type === "TEMP_MODIFIER_EXPIRED").length;
    // Quitarlo no es que venza: usar el mismo suceso habría hecho que el registro mintiera.
    expect(despues).toBe(antes);
  });

  it("otro jugador no puede ponerle un modificador a un personaje ajeno: **403**", async () => {
    const s = app.getHttpServer();
    const otroEmail = `otro-temp${Date.now()}@b.com`;
    const otro = (
      await request(s)
        .post("/auth/register")
        .send({ email: otroEmail, password: "password123", displayName: "Otro" })
    ).body.token;
    const invite = (
      await request(s)
        .post(`/campaigns/${campaignId}/invites`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({})
    ).body.token;
    await request(s).post(`/invites/${invite}/accept`).set("Authorization", `Bearer ${otro}`);

    await request(s)
      .post(`/campaigns/${campaignId}/characters/${characterId}/temporary-modifiers`)
      .set("Authorization", `Bearer ${otro}`)
      .send({ target: "ac", amount: 5, reason: "Yo me lo pongo" })
      .expect(403);

    await prisma.user.deleteMany({ where: { email: otroEmail } });
  });
});
