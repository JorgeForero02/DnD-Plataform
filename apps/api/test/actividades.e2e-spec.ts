import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import type { Actividad } from "@dnd/shared";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { ACTIVITY_CATALOG, type ActivityCatalog } from "../src/activities/activities.service";

// Tarea A7 (paso 2) — el borde HTTP de `POST .../activities/:activityKey/use`, contra Postgres
// real. **Se escribe, no se corre**: lo corre el orquestador, uno a la vez (docs/08-pruebas.md).
//
// **Actualizado en la tarea A11: `ACTIVITY_CATALOG` ya tiene proveedor real en `AppModule`**
// (`activities.module.ts`), así que en producción "rage" —y cualquier otra clave que un rasgo de
// clase o de subclase conceda— ya resuelve a una `Actividad` de verdad. Este fichero sigue
// anulando el token con `catalogoDePrueba` (`overrideProvider`, el mismo patrón que ya usan otros
// e2e para inyectar un tirador determinista) porque quiere una actividad de SALVACIÓN aislada
// para su propia prueba —"rage" es `utilidad` y no sirve para eso—, y esa anulación tiene un
// efecto secundario que las pruebas de abajo dependen de él a propósito: con `catalogoDePrueba`,
// "rage" vuelve a no existir DENTRO de este fichero, así que el 404 de "el dueño puede
// intentarlo" sigue midiendo lo mismo que medía antes de A11 —la ruta entera sin una actividad
// real detrás—, y no dice nada sobre lo que corre en producción. El recorrido de "rage" de
// verdad, con el catálogo real, está en `furia.e2e-spec.ts`.
const actividadDeSalvacionDePrueba: Actividad = {
  tipo: "salvacion",
  activation: { coste: "ACTION" },
  consumption: [],
  duration: { unidad: "instantanea", concentracion: false },
  effects: [],
  description: "Actividad de prueba, solo para este e2e.",
  salvacion: { ability: "dex", cd: { tipo: "fijo", valor: 15 }, siSalva: "ninguno" },
};
const catalogoDePrueba: ActivityCatalog = {
  find: (key) => (key === "prueba-de-salvacion" ? actividadDeSalvacionDePrueba : undefined),
};

describe("Usar una actividad (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const emailDM = `dm-act${Date.now()}@b.com`;
  const emailPL = `pl-act${Date.now()}@b.com`;
  let tokenDM = "";
  let tokenPL = "";
  let campaignId = "";
  let personajeDelJugador = "";

  beforeAll(async () => {
    const ref = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ACTIVITY_CATALOG)
      .useValue(catalogoDePrueba)
      .compile();
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
        .send({ name: "Campaña de actividades" })
    ).body.id;
    const invite = (
      await request(s)
        .post(`/campaigns/${campaignId}/invites`)
        .set("Authorization", `Bearer ${tokenDM}`)
    ).body.token;
    await request(s).post(`/invites/${invite}/accept`).set("Authorization", `Bearer ${tokenPL}`);
    // E-RM-1: el POST ya no fija el nivel (nace con nivelInicial); se sube con el PATCH.
    personajeDelJugador = (
      await request(s)
        .post(`/campaigns/${campaignId}/characters`)
        .set("Authorization", `Bearer ${tokenPL}`)
        .send({ name: "Brann", level: 5 })
    ).body.id;
    await request(s)
      .patch(`/campaigns/${campaignId}/characters/${personajeDelJugador}`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({ level: 5 });
  });

  afterAll(async () => {
    if (campaignId) await prisma.campaign.deleteMany({ where: { id: campaignId } });
    await prisma.user.deleteMany({ where: { email: { in: [emailDM, emailPL] } } });
    await app.close();
  });

  it("sin token, 401", async () => {
    const r = await request(app.getHttpServer()).post(
      `/campaigns/${campaignId}/characters/${personajeDelJugador}/activities/rage/use`,
    );
    expect(r.status).toBe(401);
  });

  it("otro jugador no usa la actividad de un personaje ajeno: 403", async () => {
    // El DM sí podría (dueño-o-DM), pero aquí lo que se comprueba es que un compañero de mesa —
    // sin ser el dueño ni el DM— no puede, aunque el personaje se vea perfectamente en la mesa.
    const otroToken = (
      await request(app.getHttpServer())
        .post("/auth/register")
        .send({
          email: `pl2-act${Date.now()}@b.com`,
          password: "password123",
          displayName: "PL2",
        })
    ).body.token as string;
    const invite = (
      await request(app.getHttpServer())
        .post(`/campaigns/${campaignId}/invites`)
        .set("Authorization", `Bearer ${tokenDM}`)
    ).body.token;
    await request(app.getHttpServer())
      .post(`/invites/${invite}/accept`)
      .set("Authorization", `Bearer ${otroToken}`);

    const r = await request(app.getHttpServer())
      .post(`/campaigns/${campaignId}/characters/${personajeDelJugador}/activities/rage/use`)
      .set("Authorization", `Bearer ${otroToken}`)
      .send({});
    expect(r.status).toBe(403);
  });

  it("el dueño puede intentarlo, y con el catálogo de prueba de este fichero «rage» no existe: 404", async () => {
    const r = await request(app.getHttpServer())
      .post(`/campaigns/${campaignId}/characters/${personajeDelJugador}/activities/rage/use`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({});
    expect(r.status).toBe(404);
    expect(r.body.message).toMatch(/actividad/i);
  });

  it("un cuerpo con más de doce objetivos lo rechaza el validador, antes de llegar al servicio", async () => {
    const doceMasUno = Array.from({ length: 13 }, (_, i) => `c${i}`.padEnd(25, "0"));
    const r = await request(app.getHttpServer())
      .post(`/campaigns/${campaignId}/characters/${personajeDelJugador}/activities/rage/use`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({ objetivos: doceMasUno });
    expect(r.status).toBe(400);
    // **Menor (vuelta de arreglo 1).** No basta un 400 cualquiera: tiene que ser EL 400 del
    // `.max(12)` de `objetivos`, no el del formato de cada id (que también daría 400 y dejaría
    // pasar esta prueba con la aserción equivocada).
    expect(r.body.message).toMatch(/objetivos/i);
  });

  // **Vuelta de arreglo 2 — el `dc` de una salvación, de punta a punta contra Postgres real.**
  // `activities.service.spec.ts` solo comprueba lo que `ActivitiesService` MANDA a un
  // `RollRequestsService` mockeado; nunca ejecuta el `create()` real, que es donde el `dc` podía
  // perderse (medido por la re-revisión: `dc: null` fijo en `crearEnTransaccion` dejaba la suite
  // entera en verde). Esta prueba sí recorre el camino entero: HTTP → `ActivitiesService.usar()`
  // → `RollRequestsService.create(..., tx)` → la fila real en la base.
  //
  // El DM es quien actúa (`RollRequestsService.create` exige DM — ficha I6/(a), sin arreglar
  // todavía) y también el objetivo, por simplicidad: lo que se mide es que el `dc` viaja intacto,
  // no una regla de a quién se le puede pedir una salvación.
  it("una actividad de salvación crea la petición con el mismo dc que devolvió usar()", async () => {
    const r = await request(app.getHttpServer())
      .post(
        `/campaigns/${campaignId}/characters/${personajeDelJugador}/activities/prueba-de-salvacion/use`,
      )
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ objetivos: [personajeDelJugador] });

    expect(r.status).toBe(201);
    expect(r.body.cd).toBe(15);

    const peticiones = await prisma.rollRequest.findMany({
      where: { campaignId, characterId: personajeDelJugador, key: "save.dex" },
    });
    expect(peticiones).toHaveLength(1);
    expect(peticiones[0].dc).toBe(r.body.cd);
  });
});
