import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

// Plan 14, ficha U3 — **buscar mira dentro del cuerpo, y pasa por `canView` primero.**
//
// El filtro era del navegador y solo miraba el **nombre**: una ficha que dice «la puerta de sal» en
// su tercer párrafo era inencontrable, y el navegador no puede arreglarlo porque el cuerpo hay que
// buscarlo donde está.
//
// **Y la prueba importante no es que encuentre: es que NO encuentre lo que no se puede ver.** Sin
// `canView` delante, buscar se convierte en un oráculo — un jugador escribe una palabra que solo
// aparece en una ficha `DM_ONLY` y el resultado le confirma que existe. Es el mismo defecto que el
// plan 03 cerró en el ataque.

describe("Buscar en el cuerpo (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const emailDM = `dm-busca${Date.now()}@b.com`;
  const emailPL = `pl-busca${Date.now()}@b.com`;
  let tokenDM = "";
  let tokenPL = "";
  let campaignId = "";

  const buscar = async (q: string, token: string) =>
    (
      await request(app.getHttpServer())
        .get(`/campaigns/${campaignId}/entities?type=LOCATION&q=${encodeURIComponent(q)}`)
        .set("Authorization", `Bearer ${token}`)
    ).body as { id: string; name: string }[];

  const crear = (nombre: string, texto: string, visibility: string) =>
    request(app.getHttpServer())
      .post(`/campaigns/${campaignId}/entities`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({
        type: "LOCATION",
        name: nombre,
        visibility,
        body: { format: "markdown", text: texto },
      });

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
        .send({ name: "Campaña que se busca" })
    ).body.id;
    const invite = (
      await request(s)
        .post(`/campaigns/${campaignId}/invites`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({})
    ).body.token;
    await request(s).post(`/invites/${invite}/accept`).set("Authorization", `Bearer ${tokenPL}`);

    // La que el jugador puede ver, con la palabra **solo en el cuerpo**.
    await crear(
      "El puerto",
      "Al fondo del muelle está la puerta de sal, cerrada con tres vueltas.",
      "PLAYERS",
    );
    // La que NO puede ver, con **la misma palabra** dentro. Es la trampa entera.
    await crear(
      "La cripta del sur",
      "Detrás hay otra puerta de sal, y nadie debería saberlo.",
      "DM_ONLY",
    );
    // Una que no dice la palabra en ninguna parte, para que «encuentra algo» no sea trivial.
    await crear("La posada", "Un sitio caliente y ruidoso.", "PLAYERS");
  });

  afterAll(async () => {
    if (campaignId) await prisma.campaign.deleteMany({ where: { id: campaignId } });
    await prisma.user.deleteMany({ where: { email: { in: [emailDM, emailPL] } } });
    await app.close();
  });

  it("**una palabra que solo está en el cuerpo la encuentra**", async () => {
    const resultado = await buscar("puerta de sal", tokenPL);
    expect(resultado.map((e) => e.name)).toEqual(["El puerto"]);
  });

  it("y sigue encontrando por el nombre, que es lo que ya hacía", async () => {
    expect((await buscar("posada", tokenPL)).map((e) => e.name)).toEqual(["La posada"]);
  });

  it("**no distingue mayúsculas**: se busca como se escribe en la mesa", async () => {
    expect((await buscar("PUERTA DE SAL", tokenPL)).map((e) => e.name)).toEqual(["El puerto"]);
  });

  it("**LA PRUEBA IMPORTANTE: no encuentra la ficha que no puede ver**", async () => {
    // La cripta dice «puerta de sal» en su cuerpo y es `DM_ONLY`. Si apareciera —o si el conteo
    // delatara que hay una más—, buscar sería un oráculo sobre el mundo del DM.
    const delJugador = await buscar("puerta de sal", tokenPL);
    expect(delJugador.map((e) => e.name)).not.toContain("La cripta del sur");
    expect(delJugador).toHaveLength(1);

    // Y el DM sí las ve las dos: lo que cambia es quién mira, no la búsqueda.
    const delDm = await buscar("puerta de sal", tokenDM);
    expect(delDm.map((e) => e.name).sort()).toEqual(["El puerto", "La cripta del sur"]);
  });

  it("sin `q` devuelve todo lo visible, como siempre", async () => {
    // La búsqueda es opcional: quitar el texto no puede dejar la sección vacía.
    expect((await buscar("", tokenPL)).length).toBe(2);
  });

  it("una `q` que no casa con nada devuelve una lista vacía, no un error", async () => {
    expect(await buscar("no existe esta palabra", tokenPL)).toEqual([]);
  });
});
