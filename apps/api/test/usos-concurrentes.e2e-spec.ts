import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

// **Ficha P2-6 — dos usos a la vez de la misma actividad no pueden perder un descuento.**
//
// **Por qué esto NO puede ser una unitaria, que es lo que `docs/08-pruebas.md` exige declarar en
// la cabecera de cada e2e:** lo que se mide aquí es un candado de fila de Postgres. El Prisma
// simulado de las unitarias no bloquea nada, no serializa nada y no tiene transacciones de
// verdad — con él, la versión rota y la arreglada dan exactamente el mismo resultado. La única
// forma de que la prueba distinga las dos es una base real con dos peticiones vivas a la vez.
//
// **El defecto, exacto.** `ActivitiesService.consumir` leía el `CharacterResource` con
// `findUnique` y lo escribía con `update`. Tres usos simultáneos leían los mismos 3 usos
// disponibles y los tres escribían 2: dos furias gratis. `changeHp` ya tomaba
// `SELECT … FOR UPDATE` sobre `Character` a un metro de distancia, en el mismo flujo.
//
// **Tres a la vez y no dos**, a propósito: con dos, la diferencia entre roto y arreglado es
// 2 frente a 1, y un fallo de montaje que no gastara nada daría 3 y también pasaría por «roto».
// Con tres, el arreglado deja **0** —el recurso agotado— y ningún accidente de montaje cae ahí.
describe("Usos concurrentes de una actividad (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const emailDM = `dm-conc${Date.now()}@b.com`;
  const emailPL = `pl-conc${Date.now()}@b.com`;
  let tokenDM = "";
  let tokenPL = "";
  let campaignId = "";
  let barbaroId = "";

  const auth = (t: string) => `Bearer ${t}`;
  const s = () => app.getHttpServer();
  const base = () => `/campaigns/${campaignId}/characters/${barbaroId}`;

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
    tokenPL = (
      await request(s())
        .post("/auth/register")
        .send({ email: emailPL, password: "password123", displayName: "PL" })
    ).body.token;
    campaignId = (
      await request(s())
        .post("/campaigns")
        .set("Authorization", auth(tokenDM))
        .send({ name: "Campaña de concurrencia" })
    ).body.id;
    const invite = (
      await request(s())
        .post(`/campaigns/${campaignId}/invites`)
        .set("Authorization", auth(tokenDM))
    ).body.token;
    await request(s()).post(`/invites/${invite}/accept`).set("Authorization", auth(tokenPL));

    // Un bárbaro de nivel 3: `barbarian-rages` le da **3** usos (tramo `desde: 3` de
    // `classes.ts`), que es el número que hace legible el resultado de abajo.
    // E-RM-1: el POST ya no fija el nivel (nace con nivelInicial); se sube con el PATCH.
    barbaroId = (
      await request(s())
        .post(`/campaigns/${campaignId}/characters`)
        .set("Authorization", auth(tokenPL))
        .send({ name: "Grosk el Concurrente", level: 3, visibility: "PLAYERS" })
    ).body.id;
    // D-CF-66: el nivel lo fija el DM, no el dueño.
    await request(s())
      .patch(`${base()}/sheet`)
      .set("Authorization", auth(tokenDM))
      .send({
        level: 3,
        abilities: { str: 16, dex: 12, con: 14, int: 8, wis: 10, cha: 8 },
        race: { source: "SRD", key: "human" },
        class: { source: "SRD", key: "barbarian" },
        choices: { "barbarian-skills": ["athletics", "intimidation"] },
      });

    const recursos = await request(s())
      .get(`${base()}/resources`)
      .set("Authorization", auth(tokenPL));
    const rage = recursos.body.find((r: { key: string }) => r.key === "rage");
    // Si esto falla, la prueba de abajo no significa nada: se dice aquí en vez de leerlo como
    // un fallo de concurrencia que no ocurrió.
    expect(rage).toMatchObject({ current: 3, max: 3 });
  });

  afterAll(async () => {
    if (campaignId) await prisma.campaign.deleteMany({ where: { id: campaignId } });
    await prisma.user.deleteMany({ where: { email: { in: [emailDM, emailPL] } } });
    await app.close();
  });

  it("tres usos a la vez gastan tres usos, no uno", async () => {
    const usar = () =>
      request(s())
        .post(`${base()}/activities/rage/use`)
        .set("Authorization", auth(tokenPL))
        .send({});

    // **Las tres se lanzan sin esperar a la anterior**: es la única forma de que sus
    // transacciones se solapen. Con `await` entre medias, el defecto no aparece nunca.
    const respuestas = await Promise.all([usar(), usar(), usar()]);
    for (const r of respuestas) expect(r.status).toBe(201);

    // **Se lee de la base, no de la respuesta.** Cada respuesta trae el `remaining` que calculó
    // SU transacción, y con el defecto las tres traían 2 tan felices: lo que dice la verdad es
    // la fila.
    const fila = await prisma.characterResource.findUniqueOrThrow({
      where: { characterId_key: { characterId: barbaroId, key: "rage" } },
    });
    expect(fila.current).toBe(0);
  });
});
