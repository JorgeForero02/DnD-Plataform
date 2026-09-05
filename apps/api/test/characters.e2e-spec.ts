import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

describe("Characters (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const emailDM = `dm${Date.now()}@b.com`;
  const emailP1 = `p1${Date.now()}@b.com`;
  const emailP2 = `p2${Date.now()}@b.com`;
  let tokenDM = "";
  let tokenP1 = "";
  let tokenP2 = "";
  let campaignId = "";
  let aragornId = "";

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
    tokenP1 = (
      await request(s)
        .post("/auth/register")
        .send({ email: emailP1, password: "password123", displayName: "P1" })
    ).body.token;
    tokenP2 = (
      await request(s)
        .post("/auth/register")
        .send({ email: emailP2, password: "password123", displayName: "P2" })
    ).body.token;
    campaignId = (
      await request(s)
        .post("/campaigns")
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ name: "C" })
    ).body.id;
    const inv1 = (
      await request(s)
        .post(`/campaigns/${campaignId}/invites`)
        .set("Authorization", `Bearer ${tokenDM}`)
    ).body.token;
    await request(s).post(`/invites/${inv1}/accept`).set("Authorization", `Bearer ${tokenP1}`);
    const inv2 = (
      await request(s)
        .post(`/campaigns/${campaignId}/invites`)
        .set("Authorization", `Bearer ${tokenDM}`)
    ).body.token;
    await request(s).post(`/invites/${inv2}/accept`).set("Authorization", `Bearer ${tokenP2}`);
  });

  afterAll(async () => {
    if (campaignId) await prisma.campaign.deleteMany({ where: { id: campaignId } });
    await prisma.user.deleteMany({ where: { email: { in: [emailDM, emailP1, emailP2] } } });
    await app.close();
  });

  it("member creates own character; ownerId is the caller", async () => {
    const s = app.getHttpServer();
    const res = await request(s)
      .post(`/campaigns/${campaignId}/characters`)
      .set("Authorization", `Bearer ${tokenP1}`)
      .send({ name: "Aragorn", race: "Human", class: "Ranger", level: 3, visibility: "PLAYERS" });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Aragorn");
    aragornId = res.body.id;
    // seed more: P2 OWNER_DM, P1 DM_ONLY
    await request(s)
      .post(`/campaigns/${campaignId}/characters`)
      .set("Authorization", `Bearer ${tokenP2}`)
      .send({ name: "Legolas", visibility: "OWNER_DM" });
    await request(s)
      .post(`/campaigns/${campaignId}/characters`)
      .set("Authorization", `Bearer ${tokenP1}`)
      .send({ name: "Secret", visibility: "DM_ONLY" });
  });

  it("player list is canView-filtered; DM sees all", async () => {
    const s = app.getHttpServer();
    const p1 = await request(s)
      .get(`/campaigns/${campaignId}/characters`)
      .set("Authorization", `Bearer ${tokenP1}`);
    // P1 sees Aragorn (PLAYERS). Legolas is P2's OWNER_DM (hidden). Secret is P1's DM_ONLY (hidden even from owner).
    expect(p1.body.map((c: any) => c.name).sort()).toEqual(["Aragorn"]);
    const p2 = await request(s)
      .get(`/campaigns/${campaignId}/characters`)
      .set("Authorization", `Bearer ${tokenP2}`);
    // P2 sees Aragorn (PLAYERS) + own Legolas (OWNER_DM). Secret hidden.
    expect(p2.body.map((c: any) => c.name).sort()).toEqual(["Aragorn", "Legolas"]);
    const dm = await request(s)
      .get(`/campaigns/${campaignId}/characters`)
      .set("Authorization", `Bearer ${tokenDM}`);
    expect(dm.body.length).toBe(3);
  });

  it("only owner or DM can update; other player gets 403", async () => {
    const s = app.getHttpServer();
    const forbidden = await request(s)
      .patch(`/campaigns/${campaignId}/characters/${aragornId}`)
      .set("Authorization", `Bearer ${tokenP2}`)
      .send({ level: 20 });
    expect(forbidden.status).toBe(403);
    const owner = await request(s)
      .patch(`/campaigns/${campaignId}/characters/${aragornId}`)
      .set("Authorization", `Bearer ${tokenP1}`)
      .send({ level: 4 });
    expect(owner.status).toBe(200);
    expect(owner.body.level).toBe(4);
    const dm = await request(s)
      .patch(`/campaigns/${campaignId}/characters/${aragornId}`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ level: 5 });
    expect(dm.status).toBe(200);
  });

  // 2.5.8 (ficha M9) — archivar en vez de borrar. «Cierra con: un personaje archivado
  // desaparece del listado, sus filas siguen en la base —contado, no fiado del 200—, se
  // recupera entero (hoja, inventario y dinero) y su rastro en la línea de tiempo nunca se
  // rompió.»
  describe("archive() / unarchive()", () => {
    let boromirId = "";

    it("sale del listado, sus filas siguen en la base, y el rastro llega a la línea de tiempo", async () => {
      const s = app.getHttpServer();
      const created = await request(s)
        .post(`/campaigns/${campaignId}/characters`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ name: "Boromir", level: 5, visibility: "PLAYERS" });
      expect(created.status).toBe(201);
      boromirId = created.body.id;

      // Se le da inventario y dinero antes de archivar, para comprobar que archivar no los toca.
      //
      // **Y se comprueba que las dos peticiones funcionaron.** La primera versión mandaba
      // `ref: "SRD:long-sword"` —una cadena— cuando el esquema pide un objeto
      // `{ source, key }`: el servidor contestaba 400, el inventario quedaba vacío y la
      // aserción de más abajo fallaba señalando a archivar, que no tenía la culpa. Una
      // preparación que no se comprueba convierte cualquier fallo suyo en un fallo de lo que
      // se quería medir.
      const metido = await request(s)
        .post(`/campaigns/${campaignId}/characters/${boromirId}/inventory`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ ref: { source: "SRD", key: "long-sword" }, quantity: 1 });
      expect(metido.status).toBe(201);
      const conDinero = await request(s)
        .patch(`/campaigns/${campaignId}/characters/${boromirId}/money`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ gp: 50 });
      expect(conDinero.status).toBe(200);

      const archived = await request(s)
        .post(`/campaigns/${campaignId}/characters/${boromirId}/archive`)
        .set("Authorization", `Bearer ${tokenDM}`);
      expect(archived.status).toBe(201);
      expect(archived.body.archivedAt).not.toBeNull();

      // Desaparece del listado normal.
      const list = await request(s)
        .get(`/campaigns/${campaignId}/characters`)
        .set("Authorization", `Bearer ${tokenDM}`);
      expect(list.body.map((c: any) => c.id)).not.toContain(boromirId);

      // Sus filas siguen en la base — se cuenta, no se confía en el 200.
      const filas = await prisma.character.count({ where: { id: boromirId } });
      expect(filas).toBe(1);
      const inventario = await prisma.inventoryItem.count({ where: { characterId: boromirId } });
      expect(inventario).toBe(1);

      // El rastro llega a la línea de tiempo, con la visibilidad del personaje.
      const events = await request(s)
        .get(`/campaigns/${campaignId}/events`)
        .set("Authorization", `Bearer ${tokenDM}`);
      const suceso = events.body.events.find(
        (e: any) => e.type === "CHARACTER_ARCHIVED" && e.subjectId === boromirId,
      );
      expect(suceso).toBeDefined();
      expect(suceso.payload).toEqual({ type: "CHARACTER_ARCHIVED", characterName: "Boromir" });
    });

    it("**el aviso de que archivan TU personaje te llega, aunque sea OWNER_DM** (P3)", async () => {
      // El defecto que esto cierra: un suceso **no tiene dueño propio** — `GameEventsService`
      // evalúa `canView` con el ACTOR como creador—, así que copiar `OWNER_DM` tal cual escribía
      // un suceso cuyo «dueño» era **el DM que archivó**. Al jugador al que acababan de llevarse
      // el personaje no le llegaba nada. `audienciaDeSuceso` lo traduce a nombrar al dueño.
      const s = app.getHttpServer();
      const mio = await request(s)
        .post(`/campaigns/${campaignId}/characters`)
        .set("Authorization", `Bearer ${tokenP1}`)
        .send({ name: "Faramir", level: 3, visibility: "OWNER_DM" });
      expect(mio.status).toBe(201);

      const archivado = await request(s)
        .post(`/campaigns/${campaignId}/characters/${mio.body.id}/archive`)
        .set("Authorization", `Bearer ${tokenDM}`);
      expect(archivado.status).toBe(201);

      const buscar = async (token: string) => {
        const r = await request(s)
          .get(`/campaigns/${campaignId}/events`)
          .set("Authorization", `Bearer ${token}`);
        return (r.body.events as { type: string; subjectId: string }[]).find(
          (e) => e.type === "CHARACTER_ARCHIVED" && e.subjectId === mio.body.id,
        );
      };

      // Su dueño sí. Otro jugador de la misma mesa, no. El DM siempre.
      expect(await buscar(tokenP1)).toBeDefined();
      expect(await buscar(tokenP2)).toBeUndefined();
      expect(await buscar(tokenDM)).toBeDefined();
    });

    it("se recupera entero — hoja, inventario y dinero — y vuelve a aparecer en el listado", async () => {
      const s = app.getHttpServer();
      const restored = await request(s)
        .post(`/campaigns/${campaignId}/characters/${boromirId}/unarchive`)
        .set("Authorization", `Bearer ${tokenDM}`);
      expect(restored.status).toBe(201);
      expect(restored.body.archivedAt).toBeNull();
      expect(restored.body.level).toBe(5);
      expect(restored.body.gp).toBe(50);

      const list = await request(s)
        .get(`/campaigns/${campaignId}/characters`)
        .set("Authorization", `Bearer ${tokenDM}`);
      expect(list.body.map((c: any) => c.id)).toContain(boromirId);

      const inventario = await request(s)
        .get(`/campaigns/${campaignId}/characters/${boromirId}/inventory`)
        .set("Authorization", `Bearer ${tokenDM}`);
      // La forma real de la respuesta: `{ items: [{ item: { ref } }] }`, y el `ref` viene con su
      // prefijo de origen. Se comprueba **contra la forma que devuelve el servidor**, no contra
      // la que se supuso al escribir la prueba — que es lo que la hacía fallar señalando a
      // archivar, que no tenía la culpa.
      expect(
        inventario.body.items.some((fila: { item: { ref: string } }) =>
          fila.item.ref.endsWith("long-sword"),
        ),
      ).toBe(true);

      const events = await request(s)
        .get(`/campaigns/${campaignId}/events`)
        .set("Authorization", `Bearer ${tokenDM}`);
      const suceso = events.body.events.find(
        (e: any) => e.type === "CHARACTER_RESTORED" && e.subjectId === boromirId,
      );
      expect(suceso).toBeDefined();
    });

    it("solo el dueño o el DM pueden archivar — misma regla que editar", async () => {
      const s = app.getHttpServer();
      const created = await request(s)
        .post(`/campaigns/${campaignId}/characters`)
        .set("Authorization", `Bearer ${tokenP1}`)
        .send({ name: "De P1", visibility: "PLAYERS" });
      const res = await request(s)
        .post(`/campaigns/${campaignId}/characters/${created.body.id}/archive`)
        .set("Authorization", `Bearer ${tokenP2}`);
      expect(res.status).toBe(403);
    });
  });
});
