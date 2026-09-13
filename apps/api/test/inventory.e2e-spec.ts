import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { InventoryModule } from "../src/inventory/inventory.module";
import { CampaignItemsModule } from "../src/campaign-items/campaign-items.module";
import { PrismaService } from "../src/prisma/prisma.service";

// Carril A4 — el inventario, el equipo y la bolsa, contra Postgres real.
//
// **Por qué esto no puede ser una unitaria, en concreto.** El índice único parcial de
// `20260903063419_inventory_one_item_per_slot` (`(characterId, slot) WHERE slot IS NOT NULL AND
// location = 'EQUIPPED'`) es la red de seguridad para la carrera entre dos "equipar"
// simultáneos; el Prisma simulado de `inventory.service.spec.ts` no valida restricciones SQL,
// así que la única forma honesta de comprobar que la segunda petición choca de verdad es
// lanzar las dos contra la base real (`docs/08-pruebas.md`).
//
// `InventoryModule` y `CampaignItemsModule` se importan aparte de `AppModule` porque cablearlos
// en `app.module.ts` es tarea del orquestador (frontera declarada en el encargo). Este fichero
// SE ESCRIBE pero no se ejecuta como parte de esta tarea.

describe("Inventario, equipo y bolsa (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const emailDM = `dm-inv${Date.now()}@b.com`;
  const emailPL = `pl-inv${Date.now()}@b.com`;
  const emailPL2 = `pl2-inv${Date.now()}@b.com`;
  const emailX = `x-inv${Date.now()}@b.com`;
  let tokenDM = "";
  let tokenPL = "";
  let tokenPL2 = "";
  let tokenX = "";
  let userIdPL = "";
  let userIdPL2 = "";
  let campaignId = "";
  let characterId = "";

  beforeAll(async () => {
    const ref = await Test.createTestingModule({
      imports: [AppModule, InventoryModule, CampaignItemsModule],
    }).compile();
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
    const regPL = await request(s)
      .post("/auth/register")
      .send({ email: emailPL, password: "password123", displayName: "PL" });
    tokenPL = regPL.body.token;
    userIdPL = regPL.body.user.id;
    const regPL2 = await request(s)
      .post("/auth/register")
      .send({ email: emailPL2, password: "password123", displayName: "PL2" });
    tokenPL2 = regPL2.body.token;
    userIdPL2 = regPL2.body.user.id;
    tokenX = (
      await request(s)
        .post("/auth/register")
        .send({ email: emailX, password: "password123", displayName: "X" })
    ).body.token;

    campaignId = (
      await request(s)
        .post("/campaigns")
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ name: "Campaña de inventario" })
    ).body.id;

    for (const token of [tokenPL, tokenPL2]) {
      const invite = (
        await request(s)
          .post(`/campaigns/${campaignId}/invites`)
          .set("Authorization", `Bearer ${tokenDM}`)
      ).body.token;
      await request(s).post(`/invites/${invite}/accept`).set("Authorization", `Bearer ${token}`);
    }

    // E-RM-1: el POST ya no fija el nivel (nace con nivelInicial); se sube con el PATCH.
    characterId = (
      await request(s)
        .post(`/campaigns/${campaignId}/characters`)
        .set("Authorization", `Bearer ${tokenPL}`)
        .send({ name: "Duernor", level: 3, visibility: "PLAYERS" })
    ).body.id;
    await request(s)
      .patch(`/campaigns/${campaignId}/characters/${characterId}`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({ level: 3 });
    await prisma.character.update({ where: { id: characterId }, data: { str: 14 } });
  });

  afterAll(async () => {
    if (campaignId) await prisma.campaign.deleteMany({ where: { id: campaignId } });
    await prisma.user.deleteMany({
      where: { email: { in: [emailDM, emailPL, emailPL2, emailX] } },
    });
    await app.close();
  });

  const s = () => app.getHttpServer();
  const base = () => `/campaigns/${campaignId}/characters/${characterId}/inventory`;

  it("el dueño mete una daga del SRD en la mochila, y GET la devuelve resuelta con el peso", async () => {
    const add = await request(s())
      .post(base())
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({ ref: { source: "SRD", key: "dagger" }, quantity: 1 });
    expect(add.status).toBe(201);
    expect(add.body.srdKey).toBe("dagger");

    const list = await request(s()).get(base()).set("Authorization", `Bearer ${tokenPL}`);
    expect(list.status).toBe(200);
    const fila = list.body.items.find((i: { id: string }) => i.id === add.body.id);
    expect(fila).toBeDefined();
    expect(fila.item).toMatchObject({ name: "Daga", kind: "WEAPON" });
    expect(list.body.totalWeightOz).toBeGreaterThan(0);
    // Fuerza 14 × 15 lb, en onzas.
    expect(list.body.carryCapacityOz).toBe(14 * 15 * 16);
  });

  it("equipar la daga en la mano principal funciona, y la ficha lo refleja", async () => {
    const add = await request(s())
      .post(base())
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({ ref: { source: "SRD", key: "mace" }, quantity: 1 });
    const rowId = add.body.id;

    const equip = await request(s())
      .patch(`${base()}/${rowId}`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({ location: "EQUIPPED", slot: "MAIN_HAND" });
    expect(equip.status).toBe(200);
    // M2B-11: la respuesta es `{ item, ac }`, no la fila cruda — la pantalla ya no necesita
    // pedir la CA aparte.
    expect(equip.body.item).toMatchObject({ location: "EQUIPPED", slot: "MAIN_HAND" });

    const list = await request(s()).get(base()).set("Authorization", `Bearer ${tokenPL}`);
    const fila = list.body.items.find((i: { id: string }) => i.id === rowId);
    expect(fila.location).toBe("EQUIPPED");
  });

  it("el PATCH de equipar devuelve `{ item, ac }`, y la CA es la de la hoja de verdad (M2B-11)", async () => {
    // Personaje aparte, con hoja completa desde ya: el compartido de esta suite «nace sin
    // hoja» a propósito (se rellena en la última prueba del fichero), y sin raza ni clase
    // `construirODenegar` no tiene CA que calcular.
    const nuevo = await request(s())
      .post(`/campaigns/${campaignId}/characters`)
      .set("Authorization", `Bearer ${tokenPL2}`)
      .send({ name: "Con hoja", level: 1, visibility: "PLAYERS" });
    expect(nuevo.status).toBe(201);
    const idConHoja = nuevo.body.id as string;
    const baseConHoja = `/campaigns/${campaignId}/characters/${idConHoja}/inventory`;

    const build = await request(s())
      .patch(`/campaigns/${campaignId}/characters/${idConHoja}/sheet`)
      .set("Authorization", `Bearer ${tokenPL2}`)
      .send({
        abilities: { str: 15, dex: 12, con: 14, int: 8, wis: 10, cha: 8 },
        race: { source: "SRD", key: "dwarf" },
        subrace: { source: "SRD", key: "dwarf-hill" },
        class: { source: "SRD", key: "fighter" },
        choices: { "fighter-skills": ["athletics", "perception"] },
      });
    expect(build.status).toBe(200);

    const add = await request(s())
      .post(baseConHoja)
      .set("Authorization", `Bearer ${tokenPL2}`)
      .send({ ref: { source: "SRD", key: "shield" }, quantity: 1 });
    expect(add.status).toBe(201);
    const rowId = add.body.id as string;

    // La CA de antes de equipar, para comparar contra `acBefore` (fix de ronda 1, Q-2).
    const sheetAntes = await request(s())
      .get(`/campaigns/${campaignId}/characters/${idConHoja}/sheet`)
      .set("Authorization", `Bearer ${tokenPL2}`);
    const caAntesDeEquipar = sheetAntes.body.sheet.derived.ac.total as number;

    const equip = await request(s())
      .patch(`${baseConHoja}/${rowId}`)
      .set("Authorization", `Bearer ${tokenPL2}`)
      .send({ location: "EQUIPPED", slot: "OFF_HAND" });
    expect(equip.status).toBe(200);
    expect(typeof equip.body.ac).toBe("number");
    // La respuesta ya no es la fila cruda: va envuelta en `{ item, acBefore, ac }`.
    expect(equip.body.item).toMatchObject({ location: "EQUIPPED", slot: "OFF_HAND" });
    // **`acBefore` viaja en la misma respuesta** (fix de ronda 1, Q-2): la pantalla que abre el
    // diálogo de la bolsa desde la mesa no siempre tiene la hoja en caché para leer "el antes"
    // por su cuenta, así que el servidor lo manda ya calculado.
    expect(equip.body.acBefore).toBe(caAntesDeEquipar);

    const sheet = await request(s())
      .get(`/campaigns/${campaignId}/characters/${idConHoja}/sheet`)
      .set("Authorization", `Bearer ${tokenPL2}`);
    expect(equip.body.ac).toBe(sheet.body.sheet.derived.ac.total);

    // Desequipar también devuelve la CA que resulta, no la de antes: el escudo da +2.
    const unequip = await request(s())
      .patch(`${baseConHoja}/${rowId}`)
      .set("Authorization", `Bearer ${tokenPL2}`)
      .send({ location: "CARRIED", slot: null });
    expect(unequip.status).toBe(200);
    expect(unequip.body.acBefore).toBe(equip.body.ac);
    expect(unequip.body.ac).toBe(equip.body.ac - 2);
  });

  it("equipar otro objeto en MAIN_HAND, que ya está ocupada, es 409 (por la comprobación previa)", async () => {
    const add = await request(s())
      .post(base())
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({ ref: { source: "SRD", key: "handaxe" }, quantity: 1 });

    const equip = await request(s())
      .patch(`${base()}/${add.body.id}`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({ location: "EQUIPPED", slot: "MAIN_HAND" });
    expect(equip.status).toBe(409);

    await request(s()).delete(`${base()}/${add.body.id}`).set("Authorization", `Bearer ${tokenPL}`);
  });

  it("MUTACIÓN CLAVE contra Postgres real: dos peticiones simultáneas de equipar en la misma ranura vacía — una gana, la otra choca con 409", async () => {
    // Se libera MAIN_HAND primero, para que las dos peticiones compitan por una ranura vacía de
    // verdad (y no por una ya ocupada, que ya se prueba arriba y no ejercita el índice).
    const list0 = await request(s()).get(base()).set("Authorization", `Bearer ${tokenPL}`);
    const maceRow = list0.body.items.find(
      (i: { item: { name: string } }) => i.item.name === "Maza",
    );
    await request(s())
      .patch(`${base()}/${maceRow.id}`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({ location: "CARRIED", slot: null });

    const [a, b] = await Promise.all([
      request(s())
        .patch(`${base()}/${maceRow.id}`)
        .set("Authorization", `Bearer ${tokenPL}`)
        .send({ location: "EQUIPPED", slot: "MAIN_HAND" }),
      request(s())
        .post(base())
        .set("Authorization", `Bearer ${tokenPL}`)
        .send({ ref: { source: "SRD", key: "sickle" }, location: "EQUIPPED", slot: "MAIN_HAND" }),
    ]);

    const statuses = [a.status, b.status].sort();
    // Exactamente una gana (200 o 201, según si fue el `PATCH` o el `POST` el que llegó
    // primero) y la otra choca con el 409 que traduce el índice único parcial — la comprobación
    // previa del servicio no ve a la otra petición, así que sin la restricción real de la base
    // las dos podrían colar.
    expect(statuses).toContain(409);
    expect(statuses.some((code) => code === 200 || code === 201)).toBe(true);
  });

  it("MUTACIÓN CLAVE contra Postgres real: dos PATCH concurrentes con quantityDelta sobre 20 dejan 18, no 19 (M2B-8)", async () => {
    // Con `quantity` absoluto (19 y 19, cada petición leyendo 20 por su cuenta) las dos
    // peticiones pisarían el mismo número y la pila quedaría en 19 tras dos descuentos — el
    // mismo fallo que la bolsa ya resuelve con un delta. El candado de la fila (`FOR UPDATE`,
    // el mismo que ya usa `update`) serializa los dos `increment` y la resta de verdad ocurre.
    const add = await request(s())
      .post(base())
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({ ref: { source: "SRD", key: "dagger" }, quantity: 20, location: "CARRIED" });
    expect(add.status).toBe(201);
    const rowId = add.body.id as string;

    const [a, b] = await Promise.all([
      request(s())
        .patch(`${base()}/${rowId}`)
        .set("Authorization", `Bearer ${tokenPL}`)
        .send({ quantityDelta: -1 }),
      request(s())
        .patch(`${base()}/${rowId}`)
        .set("Authorization", `Bearer ${tokenPL}`)
        .send({ quantityDelta: -1 }),
    ]);
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);

    const list = await request(s()).get(base()).set("Authorization", `Bearer ${tokenPL}`);
    const fila = list.body.items.find((i: { id: string }) => i.id === rowId);
    expect(fila.quantity).toBe(18);
  });

  it("un delta que dejaría la cantidad por debajo de 1 se rechaza con 409, sin borrar la fila (borrar es cosa de `consume`)", async () => {
    const add = await request(s())
      .post(base())
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({ ref: { source: "SRD", key: "dagger" }, quantity: 1, location: "CARRIED" });
    expect(add.status).toBe(201);
    const rowId = add.body.id as string;

    const patch = await request(s())
      .patch(`${base()}/${rowId}`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({ quantityDelta: -1 });
    expect(patch.status).toBe(409);

    const list = await request(s()).get(base()).set("Authorization", `Bearer ${tokenPL}`);
    expect(list.body.items.some((i: { id: string }) => i.id === rowId)).toBe(true);
  });

  it("un jugador ajeno (miembro, pero ni DM ni dueño) no puede escribir en el inventario (403)", async () => {
    const add = await request(s())
      .post(base())
      .set("Authorization", `Bearer ${tokenPL2}`)
      .send({ ref: { source: "SRD", key: "dagger" }, quantity: 1 });
    expect(add.status).toBe(403);
  });

  it("quien no es miembro de la campaña no ve el inventario (403 al listar)", async () => {
    const list = await request(s()).get(base()).set("Authorization", `Bearer ${tokenX}`);
    expect(list.status).toBe(403);
  });

  it("un objeto DM_ONLY de la campaña no se le puede dar a un personaje cuyo dueño no lo ve (400)", async () => {
    const item = await request(s())
      .post(`/campaigns/${campaignId}/items`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ name: "Reliquia secreta", kind: "OTHER", visibility: "DM_ONLY" });
    expect(item.status).toBe(201);

    const add = await request(s())
      .post(base())
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ ref: { source: "CAMPAIGN", id: item.body.id }, quantity: 1 });
    expect(add.status).toBe(400);
  });

  // Fix round 4 (D-CF-15) — la regla 6 de arriba bloqueaba SIEMPRE que el dueño no pueda ver el
  // catálogo, incluso cuando el `POST` pide `identified: false`: exactamente el flujo
  // RECOMENDADO por M4b para esconder un objeto de campaña del todo (catálogo `DM_ONLY` + fila
  // sin identificar) quedaba cortado en el primer paso, antes de que la fila pudiera nacer. La
  // regla real es "no le des un objeto que se vería con su nombre REAL y no puede verlo" — una
  // fila que nace sin identificar no dice ningún nombre real, así que el 400 solo tiene sentido
  // cuando `identified` es `true` o se omite (nace identificada por defecto).
  describe("fix round 4 — dar un objeto DM_ONLY SIN IDENTIFICAR sí funciona (M4b, el flujo recomendado)", () => {
    let reliquiaId = "";
    let idPropio = "";
    let basePropia: () => string;

    beforeAll(async () => {
      reliquiaId = (
        await request(s())
          .post(`/campaigns/${campaignId}/items`)
          .set("Authorization", `Bearer ${tokenDM}`)
          .send({ name: "Reliquia del sello roto", kind: "OTHER", visibility: "DM_ONLY" })
      ).body.id;
      const nuevo = await request(s())
        .post(`/campaigns/${campaignId}/characters`)
        .set("Authorization", `Bearer ${tokenPL}`)
        .send({ name: "Fix round 4", level: 1, visibility: "PLAYERS" });
      idPropio = nuevo.body.id as string;
      basePropia = () => `/campaigns/${campaignId}/characters/${idPropio}/inventory`;
    });

    it("con `identified: false`, el DM SÍ puede dar el objeto DM_ONLY: 201, y el jugador lo ve con el alias, nunca el nombre real (ni en la lista ni en /events)", async () => {
      const add = await request(s())
        .post(basePropia())
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({
          ref: { source: "CAMPAIGN", id: reliquiaId },
          quantity: 1,
          identified: false,
          unidentifiedName: "Un sello frío al tacto",
        });
      expect(add.status).toBe(201);

      const list = await request(s()).get(basePropia()).set("Authorization", `Bearer ${tokenPL}`);
      expect(list.status).toBe(200);
      expect(list.body.items).toHaveLength(1);
      expect(list.body.items[0].item).toMatchObject({
        name: "Un sello frío al tacto",
        identified: false,
      });
      expect(JSON.stringify(list.body)).not.toContain("Reliquia del sello roto");

      const log = await request(s())
        .get(`/campaigns/${campaignId}/events`)
        .set("Authorization", `Bearer ${tokenPL}`);
      const suceso = log.body.events.find(
        (e: { type: string; payload: { item?: string } }) => e.type === "ITEM_ADDED",
      );
      expect(suceso.payload.item).toBe("Un sello frío al tacto");
      expect(JSON.stringify(log.body)).not.toContain("Reliquia del sello roto");
    });

    it("con `identified` omitido (nace identificada), el mismo `POST` sigue siendo 400", async () => {
      const add = await request(s())
        .post(basePropia())
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ ref: { source: "CAMPAIGN", id: reliquiaId }, quantity: 1 });
      expect(add.status).toBe(400);
      expect(add.body.message).toContain("Objeto oculto");
    });
  });

  it("un objeto de OTRA campaña del mismo DM no se puede meter en este inventario (400), y no aparece en la lista (aislamiento por campaña, ficha S8 de docs/06-pendientes.md)", async () => {
    // `resolveContentRef` (`apps/api/src/inventory/common/resolve-item.ts`) filtra por
    // `campaignId` al resolver un `CAMPAIGN:<id>`, y nada lo comprobaba: la unitaria no puede
    // (el Prisma simulado ignora el `where`) y no había e2e que lo intentase. Sin ese filtro,
    // el DM de la segunda campaña podría inyectar un objeto propio en el inventario de un
    // personaje de una campaña ajena (IDOR entre campañas).
    const otraCampania = await request(s())
      .post("/campaigns")
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ name: "Otra campaña del mismo DM" });
    expect(otraCampania.status).toBe(201);
    const otraCampaniaId = otraCampania.body.id as string;

    // Visibilidad normal (PLAYERS, el valor por defecto): así el 400 solo puede venir del
    // aislamiento por campaña, no de la comprobación de visibilidad que ya cubre otro caso.
    const itemAjeno = await request(s())
      .post(`/campaigns/${otraCampaniaId}/items`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ name: "Objeto de la otra campaña", kind: "OTHER" });
    expect(itemAjeno.status).toBe(201);

    const add = await request(s())
      .post(base())
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ ref: { source: "CAMPAIGN", id: itemAjeno.body.id }, quantity: 1 });
    expect(add.status).toBe(400);

    const list = await request(s()).get(base()).set("Authorization", `Bearer ${tokenPL}`);
    expect(
      list.body.items.some((i: { item: { ref: string } }) =>
        i.item.ref.endsWith(itemAjeno.body.id),
      ),
    ).toBe(false);

    await prisma.campaign.deleteMany({ where: { id: otraCampaniaId } });
  });

  it("la bolsa: un delta positivo la sube, y un delta que la dejaría en negativo se rechaza sin tocar nada", async () => {
    const money = () => `/campaigns/${campaignId}/characters/${characterId}/money`;

    const subida = await request(s())
      .patch(money())
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({ gp: 10, reason: "botín del cofre" });
    expect(subida.status).toBe(200);
    expect(subida.body.gp).toBe(10);

    const negativo = await request(s())
      .patch(money())
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({ gp: -100 });
    expect(negativo.status).toBe(400);

    const list = await request(s()).get(base()).set("Authorization", `Bearer ${tokenPL}`);
    // Sigue en 10: el intento rechazado no dejó ningún cambio a medias.
    expect(list.body.purse.gp).toBe(10);
  });

  it("el inventario deja rastro en la línea de tiempo: quién metió qué y quién lo movió", async () => {
    const fila = (
      await request(s())
        .post(base())
        .set("Authorization", `Bearer ${tokenPL}`)
        .send({ ref: { source: "SRD", key: "torch" }, quantity: 2 })
    ).body;

    await request(s())
      .patch(`${base()}/${fila.id}`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({ location: "STORED", storedAt: "en la posada" })
      .expect(200);

    const log = await request(s())
      .get(`/campaigns/${campaignId}/events`)
      .set("Authorization", `Bearer ${tokenPL}`);

    const tipos = log.body.events.map((e: { type: string }) => e.type);
    // Hasta la auditoría de mecánica de 2B solo el dinero dejaba rastro, y con una semana entre
    // sesiones eso significa que nadie puede responder «¿quién cogió la gema?».
    expect(tipos).toEqual(expect.arrayContaining(["ITEM_ADDED", "ITEM_MOVED"]));
    const anadido = log.body.events.find((e: { type: string }) => e.type === "ITEM_ADDED");
    expect(anadido.payload).toMatchObject({ item: "Antorcha", quantity: 2 });
  });

  // B3 — dar algo a alguien dice quién lo dio. El rastro (quién, qué y a quién) ya existía;
  // lo que faltaba era el nombre legible en el `payload` para que la frase del registro lo diga.
  it("el DM le da un objeto al personaje de otro y el suceso dice quién lo dio, con su nombre", async () => {
    const add = await request(s())
      .post(base())
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ ref: { source: "SRD", key: "short-sword" }, quantity: 1 });
    expect(add.status).toBe(201);

    const log = await request(s())
      .get(`/campaigns/${campaignId}/events`)
      .set("Authorization", `Bearer ${tokenPL}`);
    const suceso = log.body.events.find(
      (e: { type: string; payload: { ref?: string } }) =>
        e.type === "ITEM_ADDED" && e.payload.ref === "SRD:short-sword",
    );
    expect(suceso).toBeDefined();
    // El nombre legible del DM, no su `id`: ningún valor de enumeración ni clave llega a la
    // pantalla, y un `cuid` en el registro es exactamente eso.
    expect(suceso.payload.de).toBe("DM");
  });

  it("el dueño se añade algo a su propia bolsa, y el suceso no dice «de» nadie", async () => {
    const add = await request(s())
      .post(base())
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({ ref: { source: "SRD", key: "club" }, quantity: 1 });
    expect(add.status).toBe(201);

    const log = await request(s())
      .get(`/campaigns/${campaignId}/events`)
      .set("Authorization", `Bearer ${tokenPL}`);
    const suceso = log.body.events.find(
      (e: { type: string; payload: { ref?: string } }) =>
        e.type === "ITEM_ADDED" && e.payload.ref === "SRD:club",
    );
    expect(suceso).toBeDefined();
    expect(suceso.payload.de).toBeUndefined();
  });

  it("el DM cambia el dinero del personaje de otro y el suceso dice quién lo dio", async () => {
    const money = () => `/campaigns/${campaignId}/characters/${characterId}/money`;

    const cambio = await request(s())
      .patch(money())
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ gp: 3, reason: "recompensa de la posada" });
    expect(cambio.status).toBe(200);

    const log = await request(s())
      .get(`/campaigns/${campaignId}/events`)
      .set("Authorization", `Bearer ${tokenPL}`);
    const suceso = log.body.events.find(
      (e: { type: string; payload: { reason?: string } }) =>
        e.type === "MONEY_CHANGED" && e.payload.reason === "recompensa de la posada",
    );
    expect(suceso).toBeDefined();
    expect(suceso.payload.de).toBe("DM");
  });

  it("gastar un consumible descuenta unidades, y la última se lleva la fila", async () => {
    const fila = (
      await request(s())
        .post(base())
        .set("Authorization", `Bearer ${tokenPL}`)
        .send({ ref: { source: "SRD", key: "arrows-20" }, quantity: 2 })
    ).body;

    const primera = await request(s())
      .post(`${base()}/${fila.id}/consume`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({ amount: 1 });
    expect(primera.status).toBe(201);
    expect(primera.body).toMatchObject({ remaining: 1, deleted: false });

    const segunda = await request(s())
      .post(`${base()}/${fila.id}/consume`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({ amount: 1 });
    expect(segunda.body).toMatchObject({ remaining: 0, deleted: true });

    // Y la fila se ha ido de verdad: una pila de cero no es información.
    const lista = await request(s()).get(base()).set("Authorization", `Bearer ${tokenPL}`);
    expect(lista.body.items.find((i: { id: string }) => i.id === fila.id)).toBeUndefined();
  });

  it("consumir un objeto con efecto lo aplica, y el registro dice cuál y cuál no", async () => {
    const s = app.getHttpServer();
    // **Un objeto del DM con dos efectos: uno que el servidor sabe colgar y otro que no.** Los
    // nueve efectos de objeto son pasivos y permanentes; solo la CA, las características y las
    // velocidades caben en el vocabulario de los modificadores temporales, que es la única
    // maquinaria que hay hoy para colgarle un número a un personaje.
    const pocion = (
      await request(s)
        .post(`/campaigns/${campaignId}/items`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({
          name: "Poción de piel de corteza",
          kind: "CONSUMABLE",
          visibility: "PLAYERS",
          effects: [
            { kind: "ac", amount: 1 },
            { kind: "saveProficiency", ability: "con" },
          ],
        })
    ).body;
    expect(pocion.id).toBeDefined();

    // El personaje de esta suite nace sin hoja, y sin ella no hay CA que mirar. Se rellena aquí
    // —es la última prueba del fichero— porque **el número de la hoja es la única evidencia de
    // que el efecto llegó al motor**: contar filas de `TemporaryModifier` probaría la escritura,
    // no la derivación.
    await request(s)
      .patch(`/campaigns/${campaignId}/characters/${characterId}/sheet`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({
        abilities: { str: 15, dex: 12, con: 14, int: 8, wis: 10, cha: 8 },
        race: { source: "SRD", key: "dwarf" },
        subrace: { source: "SRD", key: "dwarf-hill" },
        class: { source: "SRD", key: "fighter" },
        choices: { "fighter-skills": ["athletics", "perception"] },
      })
      .expect(200);

    const caAntes = (
      await request(s)
        .get(`/campaigns/${campaignId}/characters/${characterId}/sheet`)
        .set("Authorization", `Bearer ${tokenPL}`)
    ).body.sheet.derived.ac.total;

    const fila = (
      await request(s)
        .post(base())
        .set("Authorization", `Bearer ${tokenPL}`)
        .send({ ref: { source: "CAMPAIGN", id: pocion.id }, quantity: 1 })
    ).body;

    await request(s)
      .post(`${base()}/${fila.id}/consume`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({ amount: 1 })
      .expect(201);

    // **El número de la hoja cambia**, que es lo único que demuestra que el efecto llegó al motor.
    const caDespues = (
      await request(s)
        .get(`/campaigns/${campaignId}/characters/${characterId}/sheet`)
        .set("Authorization", `Bearer ${tokenPL}`)
    ).body.sheet.derived.ac.total;
    expect(caDespues).toBe(caAntes + 1);

    const log = await request(s)
      .get(`/campaigns/${campaignId}/events`)
      .set("Authorization", `Bearer ${tokenPL}`);
    const suceso = log.body.events.find(
      (e: { type: string; payload: { item?: string } }) =>
        e.type === "ITEM_REMOVED" && e.payload.item === "Poción de piel de corteza",
    );
    expect(suceso.payload.effectsApplied).toEqual(["ac"]);
    // **Y el que no se pudo aplicar se NOMBRA, en vez de descartarse en silencio.**
    expect(suceso.payload.effectsNotApplied).toEqual(["saveProficiency"]);
  });

  // Migración 6, fix round 1 (BAJA-1) — el estado de sobrecarga lo calcula el servidor con el
  // peso REAL (sin filtrar por `canView`), y solo enseña el ESTADO — nunca el peso de un objeto
  // que el visor no puede ver. Personaje de PL2 (Fuerza 14: cargado por encima de 70 lb =
  // 1120 oz) con un objeto `SPECIFIC_PLAYERS` concedido SOLO a su dueño; PL (compañero de mesa,
  // sin concesión) lo mira y no puede ver ni la fila ni su peso — el mismo `canView` que ya
  // filtra `items`/`totalWeightOz`. (No se usa el camino de "esconder un objeto que ya llevaba
  // puesto": `campaign-items.service.ts` lo rechaza a propósito, D-2B-7 — "no se le puede quitar
  // de la vista a quien ya lo lleva". Este objeto nace ya restringido, y su dueño SÍ lo ve desde
  // el principio, así que esa regla no aplica aquí.)
  describe("el estado de sobrecarga no revela lo que un compañero de mesa no puede ver", () => {
    let cargadaId = "";

    beforeAll(async () => {
      cargadaId = (
        await request(s())
          .post(`/campaigns/${campaignId}/characters`)
          .set("Authorization", `Bearer ${tokenPL2}`)
          .send({ name: "Con algo escondido", level: 1, visibility: "PLAYERS" })
      ).body.id;
      await prisma.character.update({ where: { id: cargadaId }, data: { str: 14 } });
      await request(s())
        .patch(`/campaigns/${campaignId}`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ encumbranceVariant: true })
        .expect(200);

      // Concedido solo a PL2 (el dueño): PL2 lo puede recibir (regla 6 de `add()`) y PL no lo verá.
      const objetoId = (
        await request(s())
          .post(`/campaigns/${campaignId}/items`)
          .set("Authorization", `Bearer ${tokenDM}`)
          .send({
            name: "Yunque portátil",
            kind: "OTHER",
            weightOz: 1600,
            visibility: "SPECIFIC_PLAYERS",
            specificPlayerIds: [userIdPL2],
          })
      ).body.id;
      await request(s())
        .post(`/campaigns/${campaignId}/characters/${cargadaId}/inventory`)
        .set("Authorization", `Bearer ${tokenPL2}`)
        .send({ ref: { source: "CAMPAIGN", id: objetoId }, quantity: 1 })
        .expect(201);
    });

    afterAll(async () => {
      await request(s())
        .patch(`/campaigns/${campaignId}`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ encumbranceVariant: false });
    });

    it("un compañero de mesa (PL) sin concesión no ve ni la fila ni su peso, pero el estado dice «cargado» igual", async () => {
      const res = await request(s())
        .get(`/campaigns/${campaignId}/characters/${cargadaId}/inventory`)
        .set("Authorization", `Bearer ${tokenPL}`)
        .expect(200);

      expect(res.body.items).toHaveLength(0);
      expect(res.body.totalWeightOz).toBe(0);
      // El estado es del peso REAL (1600 oz > 1120 oz de umbral): «cargado», aunque PL vea
      // 0 onzas y ninguna fila.
      expect(res.body.encumbrance).toMatchObject({ state: "encumbered" });
    });

    it("el dueño (PL2), que sí lo ve, coincide en el estado — y ve también el peso y la fila", async () => {
      const res = await request(s())
        .get(`/campaigns/${campaignId}/characters/${cargadaId}/inventory`)
        .set("Authorization", `Bearer ${tokenPL2}`)
        .expect(200);

      expect(res.body.items).toHaveLength(1);
      expect(res.body.totalWeightOz).toBe(1600);
      expect(res.body.encumbrance).toMatchObject({ state: "encumbered" });
    });
  });

  // D-CF-15 (migración 7, tickets I3 / M2B-15) — «lo tengo pero no sé qué es». Vuelve a un
  // objeto por lo que hace el juego con él (Foundry): un interruptor de identificación y un
  // alias, por fila. Reutiliza `redactado()` (`character-sheet.service.ts`): la identidad se
  // sustituye, nunca el número.
  describe("D-CF-15 — identificar un objeto", () => {
    let anilloId = "";
    let filaAnilloId = "";

    beforeAll(async () => {
      anilloId = (
        await request(s())
          .post(`/campaigns/${campaignId}/items`)
          .set("Authorization", `Bearer ${tokenDM}`)
          .send({
            name: "Anillo de protección",
            kind: "OTHER",
            weightOz: 1,
            requiresAttunement: true,
            slot: "RING_1",
            effects: [{ kind: "ac", amount: 1 }],
            visibility: "PLAYERS",
          })
      ).body.id;
      filaAnilloId = (
        await request(s())
          .post(base())
          .set("Authorization", `Bearer ${tokenPL}`)
          .send({ ref: { source: "CAMPAIGN", id: anilloId }, quantity: 1 })
      ).body.id;
    });

    afterAll(async () => {
      await request(s())
        .delete(`${base()}/${filaAnilloId}`)
        .set("Authorization", `Bearer ${tokenPL}`);
    });

    it("nace identificado: el jugador ya ve el nombre real", async () => {
      const list = await request(s()).get(base()).set("Authorization", `Bearer ${tokenPL}`);
      const fila = list.body.items.find((i: { id: string }) => i.id === filaAnilloId);
      expect(fila.item).toMatchObject({ name: "Anillo de protección", identified: true });
    });

    it("RED/autorización — el dueño (que no es DM) no puede marcarlo sin identificar: 403", async () => {
      const res = await request(s())
        .patch(`${base()}/${filaAnilloId}`)
        .set("Authorization", `Bearer ${tokenPL}`)
        .send({ identified: false, unidentifiedName: "Anillo de aspecto extraño" });
      expect(res.status).toBe(403);

      // Esconder el control en la pantalla no basta: el servidor lo rechaza aunque sea SU
      // objeto. La fila sigue identificada.
      const list = await request(s()).get(base()).set("Authorization", `Bearer ${tokenPL}`);
      const fila = list.body.items.find((i: { id: string }) => i.id === filaAnilloId);
      expect(fila.item.identified).toBe(true);
    });

    it("el DM lo marca sin identificar con un alias, y el jugador deja de ver el nombre real", async () => {
      const patch = await request(s())
        .patch(`${base()}/${filaAnilloId}`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ identified: false, unidentifiedName: "Anillo de aspecto extraño" });
      expect(patch.status).toBe(200);
      // La fila cruda del `PATCH` nunca lleva el nombre real (no lo tiene: eso vive en el
      // listado), así que el DM la recibe con el alias suelto para poder seguir editándolo.
      expect(patch.body.item.unidentifiedName).toBe("Anillo de aspecto extraño");

      const listaJugador = await request(s()).get(base()).set("Authorization", `Bearer ${tokenPL}`);
      const filaJugador = listaJugador.body.items.find(
        (i: { id: string }) => i.id === filaAnilloId,
      );
      expect(filaJugador.item).toMatchObject({
        name: "Anillo de aspecto extraño",
        identified: false,
      });
      const json = JSON.stringify(listaJugador.body);
      expect(json).not.toContain("Anillo de protección");

      const listaDM = await request(s()).get(base()).set("Authorization", `Bearer ${tokenDM}`);
      const filaDM = listaDM.body.items.find((i: { id: string }) => i.id === filaAnilloId);
      // El DM ve el nombre real Y el alias — es quien decide si lo revela en la mesa.
      expect(filaDM.item).toMatchObject({
        name: "Anillo de protección",
        identified: false,
        unidentifiedName: "Anillo de aspecto extraño",
      });
    });

    it("el dueño sigue pudiendo cambiar la cantidad de un objeto sin identificar", async () => {
      const res = await request(s())
        .patch(`${base()}/${filaAnilloId}`)
        .set("Authorization", `Bearer ${tokenPL}`)
        .send({ quantity: 2, storedAt: "en el dedo" });
      expect(res.status).toBe(200);
      // Fix round 1 (B9) — la prueba original mandaba `quantity: 1` sobre una fila que YA
      // tenía 1: no cambiaba nada, y por tanto no registraba ITEM_QUANTITY_CHANGED. Con un
      // valor que sí cambia, esta es la prueba RED de H1 en `update()`.
      expect(res.body.item.quantity).toBe(2);
      // Y su respuesta cruda no lleva el alias: quien no es DM no lo necesita dos veces.
      expect(res.body.item.unidentifiedName).toBeNull();

      // Fix round 1 (H1) — el suceso `ITEM_QUANTITY_CHANGED` que este `PATCH` acaba de
      // escribir, leído por el propio JUGADOR: nunca dice «Anillo de protección».
      const log = await request(s())
        .get(`/campaigns/${campaignId}/events`)
        .set("Authorization", `Bearer ${tokenPL}`);
      const suceso = log.body.events.find(
        (e: { type: string }) => e.type === "ITEM_QUANTITY_CHANGED",
      );
      expect(suceso).toBeDefined();
      expect(suceso.payload.item).toBe("Anillo de aspecto extraño");
      // Solo este suceso, no el registro entero: el `ITEM_ADDED` original (de cuando el
      // anillo todavía estaba identificado, antes de que el DM lo escondiera) sí dice el
      // nombre real, y es correcto que lo diga — es la foto de lo que pasó EN ESE MOMENTO.
      expect(JSON.stringify(suceso)).not.toContain("Anillo de protección");
    });

    it("fix round 1 (H1) — equipar el objeto sin identificar tampoco delata el nombre real en el registro", async () => {
      const patch = await request(s())
        .patch(`${base()}/${filaAnilloId}`)
        .set("Authorization", `Bearer ${tokenPL}`)
        .send({ location: "EQUIPPED", slot: "RING_1" });
      expect(patch.status).toBe(200);

      const log = await request(s())
        .get(`/campaigns/${campaignId}/events`)
        .set("Authorization", `Bearer ${tokenPL}`);
      const suceso = log.body.events.find((e: { type: string }) => e.type === "ITEM_MOVED");
      expect(suceso).toBeDefined();
      expect(suceso.payload.item).toBe("Anillo de aspecto extraño");
      expect(JSON.stringify(suceso)).not.toContain("Anillo de protección");
    });

    it("identificarlo de vuelta hace que el jugador vea el nombre real otra vez, sin suceso en el registro", async () => {
      const antes = await request(s())
        .get(`/campaigns/${campaignId}/events`)
        .set("Authorization", `Bearer ${tokenDM}`);
      const totalAntes = antes.body.events.length;

      const patch = await request(s())
        .patch(`${base()}/${filaAnilloId}`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ identified: true });
      expect(patch.status).toBe(200);

      const listaJugador = await request(s()).get(base()).set("Authorization", `Bearer ${tokenPL}`);
      const filaJugador = listaJugador.body.items.find(
        (i: { id: string }) => i.id === filaAnilloId,
      );
      expect(filaJugador.item).toMatchObject({ name: "Anillo de protección", identified: true });

      // Ningún suceso nuevo: identificar es un momento de mesa, no un dato del registro.
      const despues = await request(s())
        .get(`/campaigns/${campaignId}/events`)
        .set("Authorization", `Bearer ${tokenDM}`);
      expect(despues.body.events.length).toBe(totalAntes);
    });
  });

  // Fix round 1 de la revisión de la migración 7 — los caminos de ESCRITURA que la primera
  // vuelta dejó sin cubrir: el registro (H1), consumir (H2), nacer sin identificar (M3), el
  // catálogo (M4) y los mensajes de error de equipar (M5).
  describe("D-CF-15, fix round 1 — H2, M3, M4, M5", () => {
    let pocionId = "";
    let filaPocionId = "";

    beforeAll(async () => {
      // Una campaign item CONSUMABLE con un efecto real (`ac`), para que `consume()` cree un
      // `TemporaryModifier` cuyo `reason` H2 pide comprobar.
      pocionId = (
        await request(s())
          .post(`/campaigns/${campaignId}/items`)
          .set("Authorization", `Bearer ${tokenDM}`)
          .send({
            name: "Poción de resistencia pétrea",
            kind: "CONSUMABLE",
            weightOz: 8,
            effects: [{ kind: "ac", amount: 1 }],
            visibility: "PLAYERS",
          })
      ).body.id;
    });

    // M3 — nace sin identificar directamente, con el nombre visible ya en el `ITEM_ADDED`.
    it("M3: el DM entrega el botín ya sin identificar, y ITEM_ADDED nunca dice el nombre real", async () => {
      const add = await request(s())
        .post(base())
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({
          ref: { source: "CAMPAIGN", id: pocionId },
          quantity: 1,
          identified: false,
          unidentifiedName: "Bebida misteriosa",
        });
      expect(add.status).toBe(201);
      filaPocionId = add.body.id;

      const list = await request(s()).get(base()).set("Authorization", `Bearer ${tokenPL}`);
      const fila = list.body.items.find((i: { id: string }) => i.id === filaPocionId);
      expect(fila.item).toMatchObject({ name: "Bebida misteriosa", identified: false });

      const log = await request(s())
        .get(`/campaigns/${campaignId}/events`)
        .set("Authorization", `Bearer ${tokenPL}`);
      const suceso = log.body.events.find(
        (e: { type: string; payload: { ref?: string } }) =>
          e.type === "ITEM_ADDED" && e.payload.ref === `CAMPAIGN:${pocionId}`,
      );
      expect(suceso).toBeDefined();
      expect(suceso.payload.item).toBe("Bebida misteriosa");
      expect(JSON.stringify(suceso)).not.toContain("Poción de resistencia pétrea");
    });

    it("M3: el dueño (que no es DM) no puede añadir un objeto ya sin identificar: 403", async () => {
      const res = await request(s())
        .post(base())
        .set("Authorization", `Bearer ${tokenPL}`)
        .send({
          ref: { source: "CAMPAIGN", id: pocionId },
          quantity: 1,
          identified: false,
        });
      expect(res.status).toBe(403);
    });

    // H2 — consumirla aplica su efecto, y ni el motivo del modificador temporal ni el suceso
    // de consumo dicen el nombre real.
    it("H2: consumir la poción sin identificar no delata su nombre real en la traza del jugador", async () => {
      const consume = await request(s())
        .post(`${base()}/${filaPocionId}/consume`)
        .set("Authorization", `Bearer ${tokenPL}`)
        .send({ amount: 1 });
      expect(consume.status).toBe(201);
      expect(consume.body.deleted).toBe(true);

      // El efecto se aplicó: la CA sube +1, con el modificador temporal detrás.
      const sheet = await request(s())
        .get(`/campaigns/${campaignId}/characters/${characterId}/sheet`)
        .set("Authorization", `Bearer ${tokenPL}`);
      const json = JSON.stringify(sheet.body);
      expect(json).toContain("Bebida misteriosa");
      expect(json).not.toContain("Poción de resistencia pétrea");

      const log = await request(s())
        .get(`/campaigns/${campaignId}/events`)
        .set("Authorization", `Bearer ${tokenPL}`);
      const suceso = log.body.events.find(
        (e: { type: string; payload: { ref?: string } }) =>
          e.type === "ITEM_REMOVED" && e.payload.ref === `CAMPAIGN:${pocionId}`,
      );
      expect(suceso).toBeDefined();
      expect(suceso.payload.item).toBe("Bebida misteriosa");
      expect(JSON.stringify(suceso)).not.toContain("Poción de resistencia pétrea");
    });

    // M5 — un 409 de ranura ocupada, contra un objeto sin identificar, nombra el alias.
    describe("M5 — los mensajes de error de equipar usan el nombre visible", () => {
      let anilloOcupanteId = "";
      let filaOcupanteId = "";
      let filaSegundaId = "";

      beforeAll(async () => {
        anilloOcupanteId = (
          await request(s())
            .post(`/campaigns/${campaignId}/items`)
            .set("Authorization", `Bearer ${tokenDM}`)
            .send({
              name: "Anillo de telepatía",
              kind: "OTHER",
              weightOz: 1,
              slot: "RING_1",
              visibility: "PLAYERS",
            })
        ).body.id;
        const add = await request(s())
          .post(base())
          .set("Authorization", `Bearer ${tokenDM}`)
          .send({
            ref: { source: "CAMPAIGN", id: anilloOcupanteId },
            quantity: 1,
            identified: false,
            unidentifiedName: "Anillo tibio al tacto",
          });
        filaOcupanteId = add.body.id;
        await request(s())
          .patch(`${base()}/${filaOcupanteId}`)
          .set("Authorization", `Bearer ${tokenPL}`)
          .send({ location: "EQUIPPED", slot: "RING_1" })
          .expect(200);

        // Kind OTHER y no un arma: `RANURAS_POR_TIPO` no restringe RING_1 para armas y el
        // 400 de "no se puede llevar en esa ranura" llegaría antes que el 409 que esta
        // prueba quiere ejercitar.
        const segundoId = (
          await request(s())
            .post(`/campaigns/${campaignId}/items`)
            .set("Authorization", `Bearer ${tokenDM}`)
            .send({
              name: "Anillo de sabiduría",
              kind: "OTHER",
              weightOz: 1,
              slot: "RING_1",
              visibility: "PLAYERS",
            })
        ).body.id;
        const segundo = await request(s())
          .post(base())
          .set("Authorization", `Bearer ${tokenPL}`)
          .send({ ref: { source: "CAMPAIGN", id: segundoId }, quantity: 1 });
        filaSegundaId = segundo.body.id;
      });

      afterAll(async () => {
        await request(s())
          .delete(`${base()}/${filaOcupanteId}`)
          .set("Authorization", `Bearer ${tokenPL}`);
        await request(s())
          .delete(`${base()}/${filaSegundaId}`)
          .set("Authorization", `Bearer ${tokenPL}`);
      });

      it("«la ranura ya la ocupa» dice el alias, nunca «Anillo de telepatía»", async () => {
        const res = await request(s())
          .patch(`${base()}/${filaSegundaId}`)
          .set("Authorization", `Bearer ${tokenPL}`)
          .send({ location: "EQUIPPED", slot: "RING_1" });
        expect(res.status).toBe(409);
        expect(res.body.message).toContain("Anillo tibio al tacto");
        expect(res.body.message).not.toContain("Anillo de telepatía");
      });
    });

    // M4 — la identificación es de la FILA y ortogonal a la visibilidad del CATÁLOGO.
    describe("M4 — identificación y visibilidad del catálogo son dos preguntas distintas", () => {
      let anilloCatalogoId = "";
      let filaCatalogoId = "";

      beforeAll(async () => {
        anilloCatalogoId = (
          await request(s())
            .post(`/campaigns/${campaignId}/items`)
            .set("Authorization", `Bearer ${tokenDM}`)
            .send({
              name: "Vara de detección",
              kind: "OTHER",
              weightOz: 1,
              visibility: "PLAYERS",
            })
        ).body.id;
        const add = await request(s())
          .post(base())
          .set("Authorization", `Bearer ${tokenPL}`)
          .send({ ref: { source: "CAMPAIGN", id: anilloCatalogoId }, quantity: 1 });
        filaCatalogoId = add.body.id;
      });

      afterAll(async () => {
        await request(s())
          .delete(`${base()}/${filaCatalogoId}`)
          .set("Authorization", `Bearer ${tokenPL}`);
        await request(s())
          .patch(`/campaigns/${campaignId}/items/${anilloCatalogoId}`)
          .set("Authorization", `Bearer ${tokenDM}`)
          .send({ visibility: "PLAYERS" });
      });

      it("M4b: bajar la visibilidad a DM_ONLY se rechaza mientras la fila siga identificada", async () => {
        const res = await request(s())
          .patch(`/campaigns/${campaignId}/items/${anilloCatalogoId}`)
          .set("Authorization", `Bearer ${tokenDM}`)
          .send({ visibility: "DM_ONLY" });
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/identificad/i);
      });

      it("M4b: una vez sin identificar, SÍ se puede bajar a DM_ONLY", async () => {
        await request(s())
          .patch(`${base()}/${filaCatalogoId}`)
          .set("Authorization", `Bearer ${tokenDM}`)
          .send({ identified: false, unidentifiedName: "Vara de aspecto extraño" })
          .expect(200);

        const res = await request(s())
          .patch(`/campaigns/${campaignId}/items/${anilloCatalogoId}`)
          .set("Authorization", `Bearer ${tokenDM}`)
          .send({ visibility: "DM_ONLY" });
        expect(res.status).toBe(200);
      });

      it("M4a: el DUEÑO sigue viendo su fila, REDACTADA — no desaparece del inventario", async () => {
        const list = await request(s()).get(base()).set("Authorization", `Bearer ${tokenPL}`);
        const fila = list.body.items.find((i: { id: string }) => i.id === filaCatalogoId);
        expect(fila).toBeDefined();
        expect(fila.item).toMatchObject({
          name: "Vara de aspecto extraño",
          identified: false,
        });
        expect(JSON.stringify(list.body)).not.toContain("Vara de detección");
        // El peso sigue contando: se redacta la identidad, nunca el número.
        expect(list.body.totalWeightOz).toBeGreaterThanOrEqual(1);
      });

      it("M4c: un compañero de mesa sin concesión SÍ deja de verla — el catálogo oculto la quita, no la redacta", async () => {
        const list = await request(s()).get(base()).set("Authorization", `Bearer ${tokenPL2}`);
        const fila = list.body.items.find((i: { id: string }) => i.id === filaCatalogoId);
        expect(fila).toBeUndefined();
      });
    });

    // Fix round 3 (R8) — el mismo candado de `rechazarSiSeLoQuitaDeLaVista` que ya bloquea
    // BAJAR la visibilidad de un objeto con alguien identificado dentro tiene que saltar
    // también cuando lo que cambia es la lista de `specificPlayerIds` SIN tocar `visibility`:
    // quitarle la concesión nominal a quien ya lleva la fila identificada es exactamente el
    // mismo "desaparece de su mochila sin avisar" que ya rechaza el PATCH de visibilidad.
    describe("R8 — revocar una concesión nominal sin tocar `visibility` pasa por el mismo candado", () => {
      let objetoNominalId = "";
      let filaNominalId = "";

      afterAll(async () => {
        await request(s())
          .delete(`${base()}/${filaNominalId}`)
          .set("Authorization", `Bearer ${tokenPL}`);
        await request(s())
          .delete(`/campaigns/${campaignId}/items/${objetoNominalId}`)
          .set("Authorization", `Bearer ${tokenDM}`);
      });

      it("preparación: objeto SPECIFIC_PLAYERS concedido a PL, identificado, en su mochila", async () => {
        objetoNominalId = (
          await request(s())
            .post(`/campaigns/${campaignId}/items`)
            .set("Authorization", `Bearer ${tokenDM}`)
            .send({
              name: "Amuleto nominal",
              kind: "OTHER",
              weightOz: 1,
              visibility: "SPECIFIC_PLAYERS",
              specificPlayerIds: [userIdPL],
            })
        ).body.id;
        const add = await request(s())
          .post(base())
          .set("Authorization", `Bearer ${tokenPL}`)
          .send({ ref: { source: "CAMPAIGN", id: objetoNominalId }, quantity: 1 })
          .expect(201);
        filaNominalId = add.body.id;
        expect(add.body.identified).toBe(true);
      });

      it("quitar a PL de `specificPlayerIds`, con `visibility` intacta en SPECIFIC_PLAYERS, se rechaza igual que bajar la visibilidad (400, mismo mensaje)", async () => {
        const res = await request(s())
          .patch(`/campaigns/${campaignId}/items/${objetoNominalId}`)
          .set("Authorization", `Bearer ${tokenDM}`)
          .send({ specificPlayerIds: [] });
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/identificad/i);

        // No se tocó nada: PL lo sigue viendo, con su concesión intacta.
        const list = await request(s()).get(base()).set("Authorization", `Bearer ${tokenPL}`);
        const fila = list.body.items.find((i: { id: string }) => i.id === filaNominalId);
        expect(fila).toBeDefined();
      });
    });
  });

  // Re-revisión r1 de la migración 7 (D-CF-15) — R1, R2, R5.
  describe("D-CF-15, fix round 2 — R1, R2, R5", () => {
    // Personaje PROPIO para este bloque, con hoja completa: `characterId` (el compartido del
    // fichero) lleva encima el equipo que dejaron las pruebas de arriba (manos ocupadas), y R2
    // necesita `sheet.attacks` de verdad —que exige raza y clase ya elegidas.
    let idPropio = "";
    let basePropia: () => string;

    beforeAll(async () => {
      const nuevo = await request(s())
        .post(`/campaigns/${campaignId}/characters`)
        .set("Authorization", `Bearer ${tokenPL}`)
        .send({ name: "Fix round 2", level: 1, visibility: "PLAYERS" });
      idPropio = nuevo.body.id as string;
      basePropia = () => `/campaigns/${campaignId}/characters/${idPropio}/inventory`;
      await request(s())
        .patch(`/campaigns/${campaignId}/characters/${idPropio}/sheet`)
        .set("Authorization", `Bearer ${tokenPL}`)
        .send({
          abilities: { str: 12, dex: 12, con: 12, int: 10, wis: 10, cha: 8 },
          race: { source: "SRD", key: "human" },
          class: { source: "SRD", key: "fighter" },
          choices: { "fighter-skills": ["athletics", "perception"] },
        })
        .expect(200);
    });

    // R1 — el dueño no puede sacar el nombre real de un catálogo `DM_ONLY` con un `POST`,
    // aunque tenga el `cuid` de su propia fila ya redactada (M4a deja el `ref` intacto).
    describe("R1 — el POST del cuid de una fila redactada no delata el nombre real", () => {
      let varaId = "";
      let filaVaraId = "";

      afterAll(async () => {
        await request(s())
          .delete(`${basePropia()}/${filaVaraId}`)
          .set("Authorization", `Bearer ${tokenPL}`);
      });

      it("preparación: el DM entrega el objeto, lo esconde y baja el catálogo a DM_ONLY", async () => {
        varaId = (
          await request(s())
            .post(`/campaigns/${campaignId}/items`)
            .set("Authorization", `Bearer ${tokenDM}`)
            .send({ name: "Vara de detección arcana", kind: "OTHER", visibility: "PLAYERS" })
        ).body.id;
        const add = await request(s())
          .post(basePropia())
          .set("Authorization", `Bearer ${tokenPL}`)
          .send({ ref: { source: "CAMPAIGN", id: varaId }, quantity: 1 });
        filaVaraId = add.body.id;

        await request(s())
          .patch(`${basePropia()}/${filaVaraId}`)
          .set("Authorization", `Bearer ${tokenDM}`)
          .send({ identified: false, unidentifiedName: "Vara templada" })
          .expect(200);

        await request(s())
          .patch(`/campaigns/${campaignId}/items/${varaId}`)
          .set("Authorization", `Bearer ${tokenDM}`)
          .send({ visibility: "DM_ONLY" })
          .expect(200);
      });

      it("el jugador lee el cuid en su propia lista (M4a lo deja intacto) e intenta usarlo con un segundo POST: 400 sin el nombre real", async () => {
        const list = await request(s()).get(basePropia()).set("Authorization", `Bearer ${tokenPL}`);
        const fila = list.body.items.find((i: { id: string }) => i.id === filaVaraId);
        expect(fila.item.ref).toBe(`CAMPAIGN:${varaId}`);

        const res = await request(s())
          .post(basePropia())
          .set("Authorization", `Bearer ${tokenPL}`)
          .send({ ref: { source: "CAMPAIGN", id: varaId }, quantity: 1 });
        expect(res.status).toBe(400);
        expect(JSON.stringify(res.body)).not.toContain("Vara de detección arcana");
        expect(res.body.message).toContain("Objeto oculto");
      });

      // Fix round 3 (R8) — la regla 6 de `add()` también se aplica en sentido contrario: el DM
      // no puede marcar `identified: true` una fila cuyo catálogo el dueño ya no puede ver.
      it("R8: el DM NO puede marcar `identified: true` mientras el catálogo siga DM_ONLY: 400, sin escribir", async () => {
        const res = await request(s())
          .patch(`${basePropia()}/${filaVaraId}`)
          .set("Authorization", `Bearer ${tokenDM}`)
          .send({ identified: true });
        expect(res.status).toBe(400);
        expect(res.body.message).toContain("Objeto oculto");

        const list = await request(s()).get(basePropia()).set("Authorization", `Bearer ${tokenPL}`);
        const fila = list.body.items.find((i: { id: string }) => i.id === filaVaraId);
        expect(fila.item.identified).toBe(false);
      });

      // Fix round 3 (R8) — aunque `row.identified` quedara en `true` en la base (un estado
      // heredado, imposible de alcanzar ya por la API tras el fix de arriba), un evento escrito
      // mientras el catálogo sigue invisible para el dueño sigue llevando el alias: la
      // identificación EFECTIVA (no la cruda) es lo único que alimenta el registro.
      it("R8: un suceso escrito con `identified: true` en crudo pero catálogo invisible para el dueño sigue llevando el alias", async () => {
        await prisma.inventoryItem.update({
          where: { id: filaVaraId },
          data: { identified: true },
        });

        // `item` de la respuesta de `PATCH` es la fila CRUDA filtrada por DM/no-DM
        // (`filaCrudaVisible`) — no recalcula la identificación efectiva, así que aquí sigue
        // reflejando el `true` forzado a mano; lo que R8 exige es que el REGISTRO (evento
        // compartido) nunca hable con la voz de esa mentira.
        await request(s())
          .patch(`${basePropia()}/${filaVaraId}`)
          .set("Authorization", `Bearer ${tokenPL}`)
          .send({ quantityDelta: 1 })
          .expect(200);

        const log = await request(s())
          .get(`/campaigns/${campaignId}/events`)
          .set("Authorization", `Bearer ${tokenPL}`);
        const suceso = log.body.events.find(
          (e: { type: string; payload: { item?: string; to?: number } }) =>
            e.type === "ITEM_QUANTITY_CHANGED" && e.payload.to === 2,
        );
        expect(suceso).toBeDefined();
        expect(suceso.payload.item).toBe("Vara templada");
        expect(JSON.stringify(suceso.payload)).not.toContain("Vara de detección arcana");

        // Deja la fila como la encontró (sin identificar) para no afectar el resto del bloque.
        await prisma.inventoryItem.update({
          where: { id: filaVaraId },
          data: { identified: false, quantity: 1 },
        });
      });
    });

    // R2 — la hoja del DUEÑO usa el mismo camino que el listado: ni «Objeto oculto» para su
    // propia fila, ni el nombre real.
    it("R2: la hoja del dueño enseña el alias en el cuadro de ataques, no «Objeto oculto» ni el nombre real", async () => {
      const espadaId = (
        await request(s())
          .post(`/campaigns/${campaignId}/items`)
          .set("Authorization", `Bearer ${tokenDM}`)
          .send({
            name: "Espada del Vacío",
            kind: "WEAPON",
            weightOz: 48,
            slot: "MAIN_HAND",
            weapon: {
              category: "MARTIAL",
              range: "MELEE",
              damageDice: "1d8",
              damageType: "SLASHING",
            },
            visibility: "PLAYERS",
          })
      ).body.id;
      const add = await request(s())
        .post(basePropia())
        .set("Authorization", `Bearer ${tokenPL}`)
        .send({
          ref: { source: "CAMPAIGN", id: espadaId },
          quantity: 1,
          location: "EQUIPPED",
          slot: "MAIN_HAND",
        });
      const filaEspadaId = add.body.id;

      await request(s())
        .patch(`${basePropia()}/${filaEspadaId}`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ identified: false, unidentifiedName: "Espada oxidada" })
        .expect(200);
      await request(s())
        .patch(`/campaigns/${campaignId}/items/${espadaId}`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ visibility: "DM_ONLY" })
        .expect(200);

      const sheet = await request(s())
        .get(`/campaigns/${campaignId}/characters/${idPropio}/sheet`)
        .set("Authorization", `Bearer ${tokenPL}`);
      const json = JSON.stringify(sheet.body);
      expect(json).toContain("Espada oxidada");
      expect(json).not.toContain("Objeto oculto");
      expect(json).not.toContain("Espada del Vacío");
      const ataque = sheet.body.attacks.find((a: { name: string }) => a.name === "Espada oxidada");
      expect(ataque).toBeDefined();

      await request(s())
        .delete(`${basePropia()}/${filaEspadaId}`)
        .set("Authorization", `Bearer ${tokenPL}`);
    });

    // R5 — el `ref` real de un objeto del SRD sin identificar (su clave ES su nombre) tampoco
    // sale: ni en los sucesos, ni en la fila cruda, para quien no es el DM.
    describe("R5 — un objeto del SRD sin identificar no delata su `ref` real", () => {
      let filaDagaId = "";

      afterAll(async () => {
        await request(s())
          .delete(`${basePropia()}/${filaDagaId}`)
          .set("Authorization", `Bearer ${tokenPL}`);
      });

      it("preparación: una daga del SRD, marcada sin identificar", async () => {
        const add = await request(s())
          .post(basePropia())
          .set("Authorization", `Bearer ${tokenPL}`)
          .send({ ref: { source: "SRD", key: "dagger" }, quantity: 1 });
        filaDagaId = add.body.id;

        const patch = await request(s())
          .patch(`${basePropia()}/${filaDagaId}`)
          .set("Authorization", `Bearer ${tokenDM}`)
          .send({ identified: false, unidentifiedName: "Daga de aspecto extraño" });
        expect(patch.status).toBe(200);
        // La fila cruda del DM sí lleva `srdKey`, para poder seguir editándola.
        expect(patch.body.item.srdKey).toBe("dagger");
      });

      it("la fila cruda de un PATCH posterior no lleva `srdKey` para el dueño (no DM)", async () => {
        const patch = await request(s())
          .patch(`${basePropia()}/${filaDagaId}`)
          .set("Authorization", `Bearer ${tokenPL}`)
          .send({ storedAt: "en la bota" });
        expect(patch.status).toBe(200);
        expect(patch.body.item.srdKey).toBeNull();
      });

      it("el `ref` de los sucesos de esta daga nunca es «SRD:dagger», ni para el jugador ni para el DM", async () => {
        // Un suceso con el ALIAS hace falta para esta comprobación: el `ITEM_ADDED` original es
        // de cuando la daga todavía estaba identificada. Equiparla ahora, YA sin identificar,
        // genera un `ITEM_MOVED` con el nombre visible.
        await request(s())
          .patch(`${basePropia()}/${filaDagaId}`)
          .set("Authorization", `Bearer ${tokenPL}`)
          .send({ location: "EQUIPPED", slot: "MAIN_HAND" })
          .expect(200);

        const logPL = await request(s())
          .get(`/campaigns/${campaignId}/events`)
          .set("Authorization", `Bearer ${tokenPL}`);
        const sucesos = logPL.body.events.filter(
          (e: { payload: { item?: string } }) => e.payload.item === "Daga de aspecto extraño",
        );
        expect(sucesos.length).toBeGreaterThan(0);
        for (const suceso of sucesos) {
          expect(suceso.payload.ref).toBe("SRD:objeto-sin-identificar");
        }

        // El DM lee el MISMO registro —ya escrito con el `ref` de mesa—: tampoco ve «SRD:dagger»
        // ahí, aunque sepa perfectamente qué es por su propio panel.
        const logDM = await request(s())
          .get(`/campaigns/${campaignId}/events`)
          .set("Authorization", `Bearer ${tokenDM}`);
        const sucesoDM = logDM.body.events.find(
          (e: { payload: { item?: string } }) => e.payload.item === "Daga de aspecto extraño",
        );
        expect(sucesoDM.payload.ref).toBe("SRD:objeto-sin-identificar");
      });

      it("R3/R5: `attackRef` no sale en `GET /events` para el jugador, sí para el DM", async () => {
        // Ya equipada (por la prueba anterior). **La `key` que se pide es la del propio visor
        // del jugador** —`SRD:objeto-sin-identificar:MAIN_HAND`, no `SRD:dagger:MAIN_HAND`—:
        // el `ref` de la daga en SU cuadro de ataques ya sale redactado (B8), y `rollAttack`
        // busca la `key` en el cuadro de QUIEN LLAMA.
        const roll = await request(s())
          .post(
            `/campaigns/${campaignId}/characters/${idPropio}/sheet/attacks/SRD:objeto-sin-identificar:MAIN_HAND/roll`,
          )
          .set("Authorization", `Bearer ${tokenPL}`)
          .send({ part: "ATTACK", spendInspiration: false, mode: "NORMAL", versatile: false });
        expect(roll.status).toBe(201);

        const logPL = await request(s())
          .get(`/campaigns/${campaignId}/events`)
          .set("Authorization", `Bearer ${tokenPL}`);
        const eventoPL = logPL.body.events.find((e: { id: string }) => e.id === roll.body.eventId);
        expect(eventoPL).toBeDefined();
        expect(eventoPL.attackRef).toBeUndefined();

        const logDM = await request(s())
          .get(`/campaigns/${campaignId}/events`)
          .set("Authorization", `Bearer ${tokenDM}`);
        const eventoDM = logDM.body.events.find((e: { id: string }) => e.id === roll.body.eventId);
        expect(eventoDM).toBeDefined();
        // El `ref` REAL (no redactado): es una columna interna, nunca viaja en el `payload`.
        expect(eventoDM.attackRef).toBe("SRD:dagger");

        await request(s())
          .patch(`${basePropia()}/${filaDagaId}`)
          .set("Authorization", `Bearer ${tokenPL}`)
          .send({ location: "CARRIED", slot: null });
      });
    });
  });
});
