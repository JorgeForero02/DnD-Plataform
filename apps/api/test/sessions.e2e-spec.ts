import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

describe("Sessions (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const emailDM = `dm${Date.now()}@b.com`;
  const emailPL = `pl${Date.now()}@b.com`;
  let tokenDM = "";
  let tokenPL = "";
  let campaignId = "";

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
        .send({ name: "C" })
    ).body.id;
    const invite = (
      await request(s)
        .post(`/campaigns/${campaignId}/invites`)
        .set("Authorization", `Bearer ${tokenDM}`)
    ).body.token;
    await request(s).post(`/invites/${invite}/accept`).set("Authorization", `Bearer ${tokenPL}`);
  });

  afterAll(async () => {
    if (campaignId) await prisma.campaign.deleteMany({ where: { id: campaignId } });
    await prisma.user.deleteMany({ where: { email: { in: [emailDM, emailPL] } } });
    await app.close();
  });

  it("DM creates sessions; player cannot create (403)", async () => {
    const s = app.getHttpServer();
    const ok = await request(s)
      .post(`/campaigns/${campaignId}/sessions`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ title: "Session 1", visibility: "PLAYERS" });
    expect(ok.status).toBe(201);
    await request(s)
      .post(`/campaigns/${campaignId}/sessions`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ title: "Secret prep", visibility: "DM_ONLY" });
    const forbidden = await request(s)
      .post(`/campaigns/${campaignId}/sessions`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({ title: "nope", visibility: "PLAYERS" });
    expect(forbidden.status).toBe(403);
  });

  it("player lists only visible sessions; DM lists all", async () => {
    const s = app.getHttpServer();
    const dm = await request(s)
      .get(`/campaigns/${campaignId}/sessions`)
      .set("Authorization", `Bearer ${tokenDM}`);
    expect(dm.body.length).toBe(2);
    const pl = await request(s)
      .get(`/campaigns/${campaignId}/sessions`)
      .set("Authorization", `Bearer ${tokenPL}`);
    expect(pl.body.map((x: any) => x.title)).toEqual(["Session 1"]);
  });

  describe("dónde abre la escena (plan 02)", () => {
    let santuarioId = "";
    let sesionId = "";

    it("el DM crea una sesión que abre en una ficha DM_ONLY", async () => {
      const s = app.getHttpServer();
      santuarioId = (
        await request(s)
          .post(`/campaigns/${campaignId}/entities`)
          .set("Authorization", `Bearer ${tokenDM}`)
          .send({ type: "LOCATION", name: "El Santuario Sellado", visibility: "DM_ONLY" })
      ).body.id;
      const r = await request(s)
        .post(`/campaigns/${campaignId}/sessions`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ title: "La bajada", visibility: "PLAYERS", openingEntityId: santuarioId });
      expect(r.status).toBe(201);
      sesionId = r.body.id;
    });

    it("el jugador NO recibe ni el nombre ni el id de la ficha de apertura", async () => {
      const r = await request(app.getHttpServer())
        .get(`/campaigns/${campaignId}/sessions/${sesionId}`)
        .set("Authorization", `Bearer ${tokenPL}`);
      expect(r.status).toBe(200);
      // La sesión sí la ve —es `PLAYERS`—; lo que no ve es dónde abre.
      expect(r.body.title).toBe("La bajada");
      expect(r.body).not.toHaveProperty("openingEntity");
      // **Ni el id.** Un identificador que no puede resolver seguiría confirmando que la sesión
      // abre en algo que no le enseñan.
      expect(r.body).not.toHaveProperty("openingEntityId");
    });

    it("y el DM la recibe con su nombre, sin haber guardado texto en ninguna parte", async () => {
      const r = await request(app.getHttpServer())
        .get(`/campaigns/${campaignId}/sessions/${sesionId}`)
        .set("Authorization", `Bearer ${tokenDM}`);
      expect(r.body.openingEntity).toMatchObject({
        id: santuarioId,
        name: "El Santuario Sellado",
        type: "LOCATION",
      });
    });

    it("apuntar a una ficha de OTRA campaña es 404", async () => {
      const s = app.getHttpServer();
      const otra = (
        await request(s)
          .post("/campaigns")
          .set("Authorization", `Bearer ${tokenDM}`)
          .send({ name: "Otra mesa" })
      ).body.id;
      const ajena = (
        await request(s)
          .post(`/campaigns/${otra}/entities`)
          .set("Authorization", `Bearer ${tokenDM}`)
          .send({ type: "LOCATION", name: "Otro sitio", visibility: "PUBLIC" })
      ).body.id;
      const r = await request(s)
        .post(`/campaigns/${campaignId}/sessions`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ title: "No", visibility: "PLAYERS", openingEntityId: ajena });
      expect(r.status).toBe(404);
      await prisma.campaign.deleteMany({ where: { id: otra } });
    });

    it("**borrar el lugar NO borra la sesión**: la clave es SET NULL, no CASCADE", async () => {
      const s = app.getHttpServer();
      const borrado = await request(s)
        .delete(`/campaigns/${campaignId}/entities/${santuarioId}`)
        .set("Authorization", `Bearer ${tokenDM}`);
      expect(borrado.status).toBe(200);

      // Se comprueba **borrando de verdad**, no leyendo el esquema: `ON DELETE CASCADE` aquí se
      // llevaría por delante la crónica de una partida que sí ocurrió.
      const r = await request(s)
        .get(`/campaigns/${campaignId}/sessions/${sesionId}`)
        .set("Authorization", `Bearer ${tokenDM}`);
      expect(r.status).toBe(200);
      expect(r.body.title).toBe("La bajada");
      expect(r.body.openingEntityId).toBeNull();
      expect(r.body).not.toHaveProperty("openingEntity");
    });
  });

  describe("la crónica tiene su propia visibilidad (plan 02)", () => {
    let sesionId = "";

    it("el DM cierra una sesión PLAYERS con la crónica en DM_ONLY", async () => {
      const s = app.getHttpServer();
      sesionId = (
        await request(s)
          .post(`/campaigns/${campaignId}/sessions`)
          .set("Authorization", `Bearer ${tokenDM}`)
          .send({ title: "La noche del puerto", visibility: "PLAYERS" })
      ).body.id;
      await request(s)
        .post(`/campaigns/${campaignId}/sessions/${sesionId}/start`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({});
      const cerrado = await request(s)
        .post(`/campaigns/${campaignId}/sessions/${sesionId}/close`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ recap: "Lo que el DM se guarda", recapVisibility: "DM_ONLY" });
      expect(cerrado.status).toBe(201);

      // **En la columna, no dentro de `notes`.** Se lee de la base, no de la respuesta.
      const fila = await prisma.session.findUnique({ where: { id: sesionId } });
      expect(fila?.recap).toBe("Lo que el DM se guarda");
      expect(fila?.recapVisibility).toBe("DM_ONLY");
    });

    it("el jugador ve la sesión y NO la crónica", async () => {
      const r = await request(app.getHttpServer())
        .get(`/campaigns/${campaignId}/sessions/${sesionId}`)
        .set("Authorization", `Bearer ${tokenPL}`);
      expect(r.status).toBe(200);
      expect(r.body.title).toBe("La noche del puerto");
      expect(r.body).not.toHaveProperty("recap");
      // Ni el nivel: dejarlo diría «hay una crónica y no te la enseño».
      expect(r.body).not.toHaveProperty("recapVisibility");
    });

    it("y el suceso de cierre se publica con la visibilidad de la CRÓNICA, no con la de la sesión", async () => {
      // La sesión es `PLAYERS`; con el defecto, el suceso salía `PLAYERS` y el jugador leía la
      // crónica en su registro aunque el DM la hubiera marcado `DM_ONLY`.
      const log = await request(app.getHttpServer())
        .get(`/campaigns/${campaignId}/events`)
        .set("Authorization", `Bearer ${tokenPL}`);
      const cierres = (
        log.body.events as { payload: { type: string; sessionTitle?: string } }[]
      ).filter(
        (e) =>
          e.payload.type === "SESSION_CLOSED" && e.payload.sessionTitle === "La noche del puerto",
      );
      expect(cierres).toHaveLength(0);

      const delDm = await request(app.getHttpServer())
        .get(`/campaigns/${campaignId}/events`)
        .set("Authorization", `Bearer ${tokenDM}`);
      const suyos = (
        delDm.body.events as { payload: { type: string; sessionTitle?: string } }[]
      ).filter(
        (e) =>
          e.payload.type === "SESSION_CLOSED" && e.payload.sessionTitle === "La noche del puerto",
      );
      expect(suyos).toHaveLength(1);
    });

    it("la migración movió las crónicas que vivían dentro de `notes`", async () => {
      // Se comprueba **sobre una fila escrita como se escribían antes**: `notes.recap` y la
      // columna vacía. Una base recién creada no prueba nada de una migración de datos, así que la
      // fila se fabrica aquí y se le aplica el mismo UPDATE que la migración.
      const vieja = await prisma.session.create({
        data: {
          campaignId,
          title: "Sesión de antes",
          visibility: "PLAYERS",
          status: "CLOSED",
          notes: { recap: "Crónica que vivía en el Json" },
        },
      });
      expect(vieja.recap).toBeNull();

      await prisma.$executeRawUnsafe(
        `UPDATE "Session" SET "recap" = "notes"->>'recap' WHERE "id" = $1 AND "notes" ? 'recap' AND "notes"->>'recap' IS NOT NULL`,
        vieja.id,
      );

      const migrada = await prisma.session.findUnique({ where: { id: vieja.id } });
      expect(migrada?.recap).toBe("Crónica que vivía en el Json");
      // **Y la clave sigue en `notes`**: la limpieza es otra migración, cuando conste que nadie la
      // lee. Dejarla hace la vuelta atrás trivial.
      expect((migrada?.notes as { recap?: string } | null)?.recap).toBe(
        "Crónica que vivía en el Json",
      );
    });
  });

  describe("el orden de la lista es cuándo se juega, no cuándo se creó (ficha D4)", () => {
    it("las sesiones con fecha van primero, de la más lejana a la más cercana; las sin fecha, detrás", async () => {
      // Hasta el 2026-09-10 `list` ordenaba por `createdAt`, así que la próxima sesión no estaba
      // donde la mesa la busca. Se crean en un orden a propósito distinto del que se espera leer.
      const s = app.getHttpServer();
      const crear = (title: string, scheduledAt?: string) =>
        request(s)
          .post(`/campaigns/${campaignId}/sessions`)
          .set("Authorization", `Bearer ${tokenDM}`)
          .send({ title, visibility: "DM_ONLY", ...(scheduledAt ? { scheduledAt } : {}) });
      await crear("D4 · sin fecha");
      await crear("D4 · dentro de una semana", "2030-01-08T20:00:00.000Z");
      await crear("D4 · mañana", "2030-01-02T20:00:00.000Z");

      const lista = await request(s)
        .get(`/campaigns/${campaignId}/sessions`)
        .set("Authorization", `Bearer ${tokenDM}`);
      const titulos = lista.body
        .map((x: { title: string }) => x.title)
        .filter((t: string) => t.startsWith("D4 · "));
      expect(titulos).toEqual(["D4 · dentro de una semana", "D4 · mañana", "D4 · sin fecha"]);
    });
  });

  describe("la fecha de una sesión se puede quitar (P3.5)", () => {
    it("PATCH { scheduledAt: null } vacía la fecha", async () => {
      const s = app.getHttpServer();
      const creada = await request(s)
        .post(`/campaigns/${campaignId}/sessions`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({
          title: "P3.5 · con fecha",
          visibility: "DM_ONLY",
          scheduledAt: "2030-01-01T20:00:00.000Z",
        });
      expect(creada.body.scheduledAt).not.toBeNull();

      const res = await request(s)
        .patch(`/campaigns/${campaignId}/sessions/${creada.body.id}`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ scheduledAt: null });
      expect(res.status).toBe(200);
      expect(res.body.scheduledAt).toBeNull();

      const en_bd = await prisma.session.findUnique({ where: { id: creada.body.id } });
      expect(en_bd?.scheduledAt).toBeNull();
    });

    // Revisión (ronda 1): un POST directo con `scheduledAt: null` no pasaba por el editor web
    // (que nunca lo manda al crear), así que llegaba crudo al esquema de creación. Antes de
    // este arreglo, `z.coerce.date().optional()` coaccionaba `null` a `new Date(null)` =
    // 1970-01-01, no a "sin fecha".
    it("POST con scheduledAt: null crea la sesión SIN fecha, no en 1970", async () => {
      const s = app.getHttpServer();
      const res = await request(s)
        .post(`/campaigns/${campaignId}/sessions`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ title: "P3.5 · null al crear", visibility: "DM_ONLY", scheduledAt: null });
      expect(res.status).toBe(201);
      expect(res.body.scheduledAt).toBeNull();

      const en_bd = await prisma.session.findUnique({ where: { id: res.body.id } });
      expect(en_bd?.scheduledAt).toBeNull();
    });
  });

  // Task 27 (P3) — `Session` no tiene `grants` ni un creador distinto del DM
  // (`sessions.service.ts` escribe `createdById: ""`), así que `SPECIFIC_PLAYERS` y `OWNER_DM`
  // son dos placebos: el primero no tiene a quién conceder, el segundo compara `""` contra
  // cualquier `userId` y da siempre `false`. Los dos quedan excluidos del contrato
  // (`sessionVisibilitySchema` en `@dnd/shared`), y el pipe los rechaza con 400 antes de que
  // lleguen al servicio.
  describe("la visibilidad de sesión excluye SPECIFIC_PLAYERS y OWNER_DM (Task 27)", () => {
    it("POST con SPECIFIC_PLAYERS es 400", async () => {
      const s = app.getHttpServer();
      const res = await request(s)
        .post(`/campaigns/${campaignId}/sessions`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ title: "Un secreto para nadie", visibility: "SPECIFIC_PLAYERS" });
      expect(res.status).toBe(400);
    });

    it("POST con OWNER_DM es 400", async () => {
      const s = app.getHttpServer();
      const res = await request(s)
        .post(`/campaigns/${campaignId}/sessions`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ title: "Tú y quien la creó", visibility: "OWNER_DM" });
      expect(res.status).toBe(400);
    });

    it("PATCH con SPECIFIC_PLAYERS u OWNER_DM también es 400, sin tocar la sesión", async () => {
      const s = app.getHttpServer();
      const creada = await request(s)
        .post(`/campaigns/${campaignId}/sessions`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ title: "Task 27 · PATCH", visibility: "PLAYERS" });
      expect(creada.status).toBe(201);

      const specific = await request(s)
        .patch(`/campaigns/${campaignId}/sessions/${creada.body.id}`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ visibility: "SPECIFIC_PLAYERS" });
      expect(specific.status).toBe(400);

      const owner = await request(s)
        .patch(`/campaigns/${campaignId}/sessions/${creada.body.id}`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ visibility: "OWNER_DM" });
      expect(owner.status).toBe(400);

      const en_bd = await prisma.session.findUnique({ where: { id: creada.body.id } });
      expect(en_bd?.visibility).toBe("PLAYERS");
    });

    it("PUBLIC, PLAYERS y DM_ONLY se siguen aceptando", async () => {
      const s = app.getHttpServer();
      for (const visibility of ["PUBLIC", "PLAYERS", "DM_ONLY"]) {
        const res = await request(s)
          .post(`/campaigns/${campaignId}/sessions`)
          .set("Authorization", `Bearer ${tokenDM}`)
          .send({ title: `Task 27 · ${visibility}`, visibility });
        expect(res.status).toBe(201);
      }
    });

    // La crónica de cierre lleva su PROPIA visibilidad (`recapVisibility`, plan 02) — un campo
    // distinto del de la sesión, con el mismo defecto exacto: `Session` no tiene grants ni un
    // creador aparte del DM, así que `SPECIFIC_PLAYERS` y `OWNER_DM` son igual de inertes ahí.
    it("cerrar con recapVisibility: OWNER_DM es 400", async () => {
      const s = app.getHttpServer();
      const creada = await request(s)
        .post(`/campaigns/${campaignId}/sessions`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ title: "Task 27 · recapVisibility", visibility: "PLAYERS" });
      expect(creada.status).toBe(201);
      await request(s)
        .post(`/campaigns/${campaignId}/sessions/${creada.body.id}/start`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({});

      const cerrado = await request(s)
        .post(`/campaigns/${campaignId}/sessions/${creada.body.id}/close`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ recap: "x", recapVisibility: "OWNER_DM" });
      expect(cerrado.status).toBe(400);

      // El rechazo no cierra la sesión a medias: sigue EN_CURSO, sin crónica.
      const fila = await prisma.session.findUnique({ where: { id: creada.body.id } });
      expect(fila?.status).toBe("IN_PROGRESS");
      expect(fila?.recap).toBeNull();
    });
  });
});
