import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { SEGUNDOS_POR_ASALTO } from "@dnd/shared";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

// Plan 08, ficha I8 — **la acción Ayudar, contra Postgres.**
//
// SRD 5.1: *«you can aid a friendly creature in attacking a creature within 5 feet of you… the
// first attack roll is made with advantage»*. Tres límites, y este fichero prueba los dos que se
// pueden cumplir:
//
//  1. **Una sola tirada** — la marca la consume el PRIMER ataque, y el segundo ya no la tiene.
//  2. **Caduca al principio de tu siguiente turno** — un asalto son seis segundos del reloj de
//     campaña (D-2C-1), así que «mi siguiente turno» es exactamente un asalto más tarde.
//
// El tercero —el enemigo a cinco pies de quien ayuda— **no se comprueba, y no se finge**: son
// distancias y este producto no tiene tablero. Lo dice la pantalla.
//
// **El +1d4 de la maqueta no existe en ninguna parte de esto**: es `Bless`, un conjuro. Ayudar da
// ventaja.

describe("Ayudar (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const emailDM = `dm-ayuda${Date.now()}@b.com`;
  const emailPL = `pl-ayuda${Date.now()}@b.com`;
  let tokenDM = "";
  let tokenPL = "";
  let campaignId = "";
  let ayudante = "";
  let ayudado = "";

  const condicionesDe = async (characterId: string) =>
    (
      await request(app.getHttpServer())
        .get(`/campaigns/${campaignId}/characters/${characterId}/conditions`)
        .set("Authorization", `Bearer ${tokenDM}`)
    ).body as {
      key: string;
      note: string | null;
      expiresAtClock: number | null;
      expired: boolean;
    }[];

  const laAyudaDe = async (characterId: string) =>
    (await condicionesDe(characterId)).find((c) => c.key === "helped");

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
        .send({ name: "Campaña de la ayuda" })
    ).body.id;
    const invite = (
      await request(s)
        .post(`/campaigns/${campaignId}/invites`)
        .set("Authorization", `Bearer ${tokenDM}`)
    ).body.token;
    await request(s).post(`/invites/${invite}/accept`).set("Authorization", `Bearer ${tokenPL}`);
    ayudante = (
      await request(s)
        .post(`/campaigns/${campaignId}/characters`)
        .set("Authorization", `Bearer ${tokenPL}`)
        .send({ name: "Mira", level: 1 })
    ).body.id;
    ayudado = (
      await request(s)
        .post(`/campaigns/${campaignId}/characters`)
        .set("Authorization", `Bearer ${tokenPL}`)
        .send({ name: "Brann", level: 1 })
    ).body.id;
  });

  afterAll(async () => {
    if (campaignId) await prisma.campaign.deleteMany({ where: { id: campaignId } });
    await prisma.user.deleteMany({ where: { email: { in: [emailDM, emailPL] } } });
    await app.close();
  });

  it("**la marca la recibe el AYUDADO**, con el nombre de quien ayuda y su vencimiento", async () => {
    const s = app.getHttpServer();
    const r = await request(s)
      .post(`/campaigns/${campaignId}/characters/${ayudante}/help`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({ targetCharacterId: ayudado });
    expect(r.status).toBe(201);

    // Sobre el otro, no sobre quien ayuda: es él quien tira con ventaja.
    expect(await laAyudaDe(ayudante)).toBeUndefined();
    const marca = await laAyudaDe(ayudado);
    // **Ningún valor de enumeración llega a la pantalla**: el nombre va en la nota, y la pantalla
    // lee eso. `appliedById` es el USUARIO, y un jugador puede llevar dos personajes.
    expect(marca?.note).toBe("Te ayuda Mira");
    // Un asalto, ni más ni menos: «al principio de tu siguiente turno».
    expect(marca?.expiresAtClock).toBe(SEGUNDOS_POR_ASALTO);
    expect(marca?.expired).toBe(false);
  });

  it("**la sugerencia de la hoja dice que el ataque va con ventaja**, y por qué", async () => {
    // Es la tubería de 2.5.5, la que ya existía: propone y no impone. Lo que aporta la ficha es que
    // la ayuda entre en ella, para que nadie tenga que acordarse.
    const hoja = await request(app.getHttpServer())
      .get(`/campaigns/${campaignId}/characters/${ayudado}/sheet`)
      .set("Authorization", `Bearer ${tokenPL}`);
    const ataque = hoja.body.rollSuggestions?.attack;
    expect(ataque?.mode).toBe("ADVANTAGE");
    expect(ataque?.reasons?.map((x: { sourceKey: string }) => x.sourceKey)).toContain("helped");
  });

  it("**vence al pasar un asalto**, y NO desaparece: queda marcada (D-2C-2)", async () => {
    const s = app.getHttpServer();
    // El reloj avanza; la caducidad se deriva de él y no de un barrido que puede no correr.
    await request(s)
      .post(`/campaigns/${campaignId}/clock/advance`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ kind: "TIME", seconds: SEGUNDOS_POR_ASALTO });

    const marca = await laAyudaDe(ayudado);
    expect(marca).toBeDefined();
    expect(marca?.expired).toBe(true);

    // Y deja de calcular: la sugerencia del ataque vuelve a normal.
    const hoja = await request(s)
      .get(`/campaigns/${campaignId}/characters/${ayudado}/sheet`)
      .set("Authorization", `Bearer ${tokenPL}`);
    expect(hoja.body.rollSuggestions?.attack?.mode).toBe("NORMAL");
  });

  it("ayudarse a sí mismo es 400, y a alguien de otra campaña es 404", async () => {
    const s = app.getHttpServer();
    await request(s)
      .post(`/campaigns/${campaignId}/characters/${ayudante}/help`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({ targetCharacterId: ayudante })
      .expect(400);

    const otra = (
      await request(s)
        .post("/campaigns")
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ name: "Otra mesa" })
    ).body.id;
    const ajeno = (
      await request(s)
        .post(`/campaigns/${otra}/characters`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ name: "Ajeno", level: 1 })
    ).body.id;
    // 404, no 403: un 403 confirmaría que ese personaje existe en algún sitio.
    await request(s)
      .post(`/campaigns/${campaignId}/characters/${ayudante}/help`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({ targetCharacterId: ajeno })
      .expect(404);
    await prisma.campaign.deleteMany({ where: { id: otra } });
  });

  it("**se consume con el PRIMER ataque, y el segundo ya no la tiene**", async () => {
    const s = app.getHttpServer();
    // Una hoja de verdad para que haya un ataque que tirar: enano guerrero con espada.
    await request(s)
      .patch(`/campaigns/${campaignId}/characters/${ayudado}/sheet`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({
        abilities: { str: 15, dex: 12, con: 14, int: 8, wis: 10, cha: 8 },
        race: { source: "SRD", key: "dwarf" },
        class: { source: "SRD", key: "fighter" },
        choices: { "fighter-skills": ["athletics", "perception"] },
      });
    const equipar = await request(s)
      .post(`/campaigns/${campaignId}/characters/${ayudado}/inventory`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({ ref: { source: "SRD", key: "long-sword" }, location: "EQUIPPED", slot: "MAIN_HAND" });
    expect([200, 201]).toContain(equipar.status);

    const ataques = (
      await request(s)
        .get(`/campaigns/${campaignId}/characters/${ayudado}/sheet`)
        .set("Authorization", `Bearer ${tokenPL}`)
    ).body.attacks;
    expect(ataques.length).toBeGreaterThan(0);
    const clave = ataques[0].key;

    // Se ayuda otra vez: la anterior ya venció.
    await request(s)
      .post(`/campaigns/${campaignId}/characters/${ayudante}/help`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({ targetCharacterId: ayudado })
      .expect(201);
    expect((await laAyudaDe(ayudado))?.expired).toBe(false);

    const primero = await request(s)
      .post(
        `/campaigns/${campaignId}/characters/${ayudado}/sheet/attacks/${encodeURIComponent(clave)}/roll`,
      )
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({ part: "ATTACK", mode: "NORMAL" });
    expect(primero.status).toBe(201);
    // **Dos dados**: la ventaja la compuso el servidor a partir de la ayuda, sin que nadie la
    // pidiera en el cuerpo de la petición.
    expect(primero.body.rolls).toHaveLength(2);

    // Y la marca ya no está: una sola tirada, aunque tenga varios ataques.
    expect(await laAyudaDe(ayudado)).toBeUndefined();

    const segundo = await request(s)
      .post(
        `/campaigns/${campaignId}/characters/${ayudado}/sheet/attacks/${encodeURIComponent(clave)}/roll`,
      )
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({ part: "ATTACK", mode: "NORMAL" });
    expect(segundo.status).toBe(201);
    expect(segundo.body.rolls).toHaveLength(1);
  });

  it("y el registro cuenta las dos mitades: quién ayudó y que se usó", async () => {
    const log = await request(app.getHttpServer())
      .get(`/campaigns/${campaignId}/events`)
      .set("Authorization", `Bearer ${tokenDM}`);
    const eventos = log.body.events as { type: string; payload: Record<string, unknown> }[];
    expect(eventos.some((e) => e.type === "CONDITION_APPLIED" && e.payload.key === "helped")).toBe(
      true,
    );
    expect(
      eventos.some(
        (e) =>
          e.type === "CONDITION_REMOVED" &&
          e.payload.key === "helped" &&
          e.payload.reason === "Se usó en el ataque",
      ),
    ).toBe(true);
  });
});
