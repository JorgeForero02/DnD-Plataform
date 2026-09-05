import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

// Plan 11, fichas D2, D3b y A3 — **administrar una mesa de verdad, contra Postgres.**
//
// Lo que faltaba y hacía doler una mesa real:
//
//  · **El rol era inmutable de por vida.** Para ascender a alguien había que expulsarlo y
//    reinvitarlo, y eso **pierde su vínculo con sus personajes**.
//  · **Las invitaciones se generaban a ciegas y valían para siempre.** Nadie sabía cuántos enlaces
//    vivos había ni podía matar uno que se hubiera filtrado.
//
// **La prueba que de verdad demuestra D2 no es que la escritura ocurra**: es que **el permiso
// cambie**. Ascender y no comprobar que ahora puede hacer algo que antes le daba 403 sería probar
// un `UPDATE`, no una función.

describe("Administrar la mesa (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const emailDM = `dm-admin${Date.now()}@b.com`;
  const emailPL = `pl-admin${Date.now()}@b.com`;
  let tokenDM = "";
  let tokenPL = "";
  let idDM = "";
  let idPL = "";
  let campaignId = "";

  const invitar = async (body: Record<string, unknown> = {}) =>
    request(app.getHttpServer())
      .post(`/campaigns/${campaignId}/invites`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send(body);

  beforeAll(async () => {
    const ref = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = ref.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    prisma = app.get(PrismaService);
    const s = app.getHttpServer();
    const dm = await request(s)
      .post("/auth/register")
      .send({ email: emailDM, password: "password123", displayName: "La DM" });
    tokenDM = dm.body.token;
    idDM = dm.body.user.id;
    const pl = await request(s)
      .post("/auth/register")
      .send({ email: emailPL, password: "password123", displayName: "Marta" });
    tokenPL = pl.body.token;
    idPL = pl.body.user.id;
    campaignId = (
      await request(s)
        .post("/campaigns")
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ name: "Campaña que se administra" })
    ).body.id;
    const invite = (await invitar()).body.token;
    await request(s).post(`/invites/${invite}/accept`).set("Authorization", `Bearer ${tokenPL}`);
  });

  afterAll(async () => {
    if (campaignId) await prisma.campaign.deleteMany({ where: { id: campaignId } });
    await prisma.user.deleteMany({ where: { email: { in: [emailDM, emailPL] } } });
    await app.close();
  });

  // --- D2 · el papel de un miembro ---

  it("un jugador no cambia papeles: **403**", async () => {
    await request(app.getHttpServer())
      .patch(`/campaigns/${campaignId}/members/${idDM}`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({ role: "PLAYER" })
      .expect(403);
  });

  it("**degradar al último DM es 409 con su motivo**, no 403", async () => {
    // No es que no puedas: es que dejaría la mesa huérfana y nadie podría recuperarla.
    const r = await request(app.getHttpServer())
      .patch(`/campaigns/${campaignId}/members/${idDM}`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ role: "PLAYER" });
    expect(r.status).toBe(409);
    expect(JSON.stringify(r.body)).toContain("LAST_DM");
    // Y no ha cambiado nada.
    const miembros = await request(app.getHttpServer())
      .get(`/campaigns/${campaignId}/members`)
      .set("Authorization", `Bearer ${tokenDM}`);
    expect(
      (miembros.body as { userId: string; role: string }[]).find((m) => m.userId === idDM)?.role,
    ).toBe("DM");
  });

  it("**ascender cambia el PERMISO, no solo la fila**", async () => {
    const s = app.getHttpServer();
    // Antes: crear una ficha del mundo es del DM, y a Marta le da 403.
    await request(s)
      .post(`/campaigns/${campaignId}/entities`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({ type: "LOCATION", name: "Su torre", visibility: "PLAYERS" })
      .expect(403);

    const ascenso = await request(s)
      .patch(`/campaigns/${campaignId}/members/${idPL}`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ role: "DM" });
    expect(ascenso.status).toBe(200);
    expect(ascenso.body).toMatchObject({ from: "PLAYER", to: "DM" });

    // Después: la misma petición, la misma persona, y ahora sí.
    await request(s)
      .post(`/campaigns/${campaignId}/entities`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({ type: "LOCATION", name: "Su torre", visibility: "PLAYERS" })
      .expect(201);
  });

  it("y **queda en el registro**, con el nombre y los dos papeles", async () => {
    const log = await request(app.getHttpServer())
      .get(`/campaigns/${campaignId}/events`)
      .set("Authorization", `Bearer ${tokenDM}`);
    const suceso = (log.body.events as { type: string; payload: Record<string, unknown> }[]).find(
      (e) => e.type === "MEMBER_ROLE_CHANGED",
    );
    expect(suceso?.payload).toMatchObject({ displayName: "Marta", from: "PLAYER", to: "DM" });
  });

  it("con dos DM, ahora sí se puede bajar a uno", async () => {
    // Es la otra mitad de la regla del 409: lo que se comprueba es **cuántos quedarían**, no quién
    // eres — el creador puede haber ascendido a otro y querer bajarse, y eso es legítimo.
    const r = await request(app.getHttpServer())
      .patch(`/campaigns/${campaignId}/members/${idPL}`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ role: "PLAYER" });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ from: "DM", to: "PLAYER" });
  });

  // --- D3b y A3 · las invitaciones ---

  it("**el listado dice la verdad de cada enlace**, y solo lo ve el DM", async () => {
    const s = app.getHttpServer();
    await request(s)
      .get(`/campaigns/${campaignId}/invites`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .expect(403);

    const lista = await request(s)
      .get(`/campaigns/${campaignId}/invites`)
      .set("Authorization", `Bearer ${tokenDM}`);
    expect(lista.status).toBe(200);
    // La del principio: usada, y **por quién**. `usedAt` decía cuándo y no quién.
    const usada = (lista.body as { estado: string; usedByName: string | null }[]).find(
      (i) => i.estado === "USADA",
    );
    expect(usada?.usedByName).toBe("Marta");
    // **El token no viaja entero**: un listado se enseña, y con el token completo cualquiera que
    // mire por encima del hombro se lleva una invitación.
    expect(JSON.stringify(lista.body)).not.toContain('token":"');
  });

  it("**revocar mata el enlace, y aceptarlo después da el MISMO error que uno inventado**", async () => {
    const s = app.getHttpServer();
    const creada = await invitar();
    const token = creada.body.token;

    await request(s)
      .delete(`/invites/${creada.body.id}`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .expect(200);

    const revocado = await request(s)
      .post(`/invites/${token}/accept`)
      .set("Authorization", `Bearer ${tokenPL}`);
    const inventado = await request(s)
      .post(`/invites/estonoexistejamas/accept`)
      .set("Authorization", `Bearer ${tokenPL}`);
    // **Idénticos**: si difirieran, el mensaje diría si un token existió alguna vez y en qué estado
    // acabó, que es información que no le debemos a nadie.
    expect(revocado.status).toBe(inventado.status);
    expect(revocado.body.message).toBe(inventado.body.message);

    // Y en el listado sale como REVOCADA, no como usada: son dos hechos distintos.
    const lista = await request(s)
      .get(`/campaigns/${campaignId}/invites`)
      .set("Authorization", `Bearer ${tokenDM}`);
    const fila = (lista.body as { id: string; estado: string }[]).find(
      (i) => i.id === creada.body.id,
    );
    expect(fila?.estado).toBe("REVOCADA");
  });

  it("**un enlace caducado no se acepta**, y los viejos sin fecha siguen valiendo", async () => {
    const s = app.getHttpServer();
    const conFecha = await invitar({ expiresInDays: 7 });
    expect(conFecha.body.expiresAt).toBeTruthy();
    // Se le echa el tiempo encima por la base: el reloj del sistema no se toca en una prueba.
    await prisma.invite.update({
      where: { id: conFecha.body.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await request(s)
      .post(`/invites/${conFecha.body.token}/accept`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .expect(400);

    const lista = await request(s)
      .get(`/campaigns/${campaignId}/invites`)
      .set("Authorization", `Bearer ${tokenDM}`);
    expect(
      (lista.body as { id: string; estado: string }[]).find((i) => i.id === conFecha.body.id)
        ?.estado,
    ).toBe("CADUCADA");

    // **Sin `expiresInDays` no caduca**: los enlaces ya repartidos siguen comportándose como ayer.
    const sinFecha = await invitar();
    expect(sinFecha.body.expiresAt).toBeNull();
    expect(
      (
        await request(s)
          .get(`/campaigns/${campaignId}/invites`)
          .set("Authorization", `Bearer ${tokenDM}`)
      ).body.find((i: { id: string }) => i.id === sinFecha.body.id).estado,
    ).toBe("VIVA");
  });

  it("revocar un enlace de otra mesa es 404, no 403", async () => {
    const s = app.getHttpServer();
    const otra = (
      await request(s)
        .post("/campaigns")
        .set("Authorization", `Bearer ${tokenPL}`)
        .send({ name: "La mesa de Marta" })
    ).body.id;
    const ajena = (
      await request(s)
        .post(`/campaigns/${otra}/invites`)
        .set("Authorization", `Bearer ${tokenPL}`)
        .send({})
    ).body;
    // El DM de OTRA campaña no puede, y recibe 403 porque el enlace sí existe y él no dirige esa
    // mesa; lo que no puede pasar es que un id inventado lo distinga de uno real.
    await request(s)
      .delete(`/invites/${ajena.id}`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .expect(403);
    await request(s)
      .delete(`/invites/noexisteestainvitacion`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .expect(404);
    await prisma.campaign.deleteMany({ where: { id: otra } });
  });
});
