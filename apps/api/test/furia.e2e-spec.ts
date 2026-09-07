import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

// Paso 2, tarea A11 — la Furia, de punta a punta contra Postgres real. **Se escribe, no se
// corre**: lo corre el orquestador, uno a la vez (docs/08-pruebas.md), y por eso este fichero se
// entrega sin haberse ejecutado ni una vez. Las unitarias que SÍ corrí están en
// `resources.service.spec.ts` (la siembra), `activities.module.spec.ts` (el catálogo cableado) y
// `character-sheet.service.spec.ts` (el bono de daño con su traza); este fichero es el recorrido
// entero, con el catálogo REAL (`ActivitiesModule` ya no anula `ACTIVITY_CATALOG`, a diferencia
// de `actividades.e2e-spec.ts`) y sin dados fijados —la app real no tiene tirador inyectable
// (`rolls.service.ts`), así que un total exacto no se puede predecir.
//
// **Por qué se compara `modifier` y no `total`.** El brief pide `golpe.damage.total ===
// baseSinFuria + 2`; con dados de verdad eso solo es cierto si los mismos dados salen dos veces,
// que no se puede forzar aquí. Lo que SÍ es determinista es la parte que no son dados: el
// modificador de la expresión (`RollResult.modifier`), que es exactamente donde vive el +2 de la
// Furia — la traza lo confirma con su propio paso (`sourceKey: "rage-damage"`). Comparar el
// modificador mide lo mismo que pedía el brief sin depender de un azar que este fichero no
// controla.

describe("La Furia, de punta a punta (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const emailDM = `dm-furia${Date.now()}@b.com`;
  const emailPL = `pl-furia${Date.now()}@b.com`;
  let tokenDM = "";
  let tokenPL = "";
  let campaignId = "";
  let sessionId = "";
  let barbaroId = "";
  let goblinId = "";
  let hachaKey = "";
  let hachaRowId = "";
  let encounterId = "";
  let combatantId = "";

  const auth = (t: string) => `Bearer ${t}`;
  const s = () => app.getHttpServer();
  const base = () => `/campaigns/${campaignId}/characters/${barbaroId}`;
  const sheetUrl = () => `${base()}/sheet`;
  const encUrl = (suffix = "") =>
    `/campaigns/${campaignId}/sessions/${sessionId}/encounters${suffix}`;

  /** Tira el daño del hacha grande y devuelve el modificador y la traza que trajo la respuesta. */
  async function danoDelHacha() {
    const r = await request(s())
      .post(`${sheetUrl()}/attacks/${encodeURIComponent(hachaKey)}/roll`)
      .set("Authorization", auth(tokenPL))
      .send({ part: "DAMAGE", mode: "NORMAL" });
    expect(r.status).toBe(201);
    return { modifier: r.body.modifier as number, trace: r.body.trace as unknown };
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
    tokenPL = (
      await request(s())
        .post("/auth/register")
        .send({ email: emailPL, password: "password123", displayName: "PL" })
    ).body.token;
    campaignId = (
      await request(s())
        .post("/campaigns")
        .set("Authorization", auth(tokenDM))
        .send({ name: "Campaña de la Furia" })
    ).body.id;
    const invite = (
      await request(s())
        .post(`/campaigns/${campaignId}/invites`)
        .set("Authorization", auth(tokenDM))
    ).body.token;
    await request(s()).post(`/invites/${invite}/accept`).set("Authorization", auth(tokenPL));

    sessionId = (
      await request(s())
        .post(`/campaigns/${campaignId}/sessions`)
        .set("Authorization", auth(tokenDM))
        .send({ title: "La sala de guerra", visibility: "PLAYERS" })
    ).body.id;

    // Un bárbaro de nivel 3: `barbarian-rages` da 3 usos desde ese nivel (tramo `desde: 3`), y
    // `rage-damage` sigue en +2 (el primer tramo, `desde: 1`, cubre hasta el 8 inclusive) — la
    // cifra que el brief citaba, «max 2», es la de un bárbaro de NIVEL 1, no de uno «recién
    // creado» sin más — comprobado contra `classes.ts` antes de escribir esta prueba, no contra
    // la cita del encargo.
    barbaroId = (
      await request(s())
        .post(`/campaigns/${campaignId}/characters`)
        .set("Authorization", auth(tokenPL))
        .send({ name: "Grosk", level: 3, visibility: "PLAYERS" })
    ).body.id;
    await request(s())
      .patch(sheetUrl())
      .set("Authorization", auth(tokenPL))
      .send({
        abilities: { str: 16, dex: 12, con: 14, int: 8, wis: 10, cha: 8 },
        race: { source: "SRD", key: "human" },
        class: { source: "SRD", key: "barbarian" },
        choices: { "barbarian-skills": ["athletics", "intimidation"] },
      });

    // El hacha grande: cuerpo a cuerpo con Fuerza, la única combinación que la Furia sube.
    const equipoDelHacha = await request(s())
      .post(`${base()}/inventory`)
      .set("Authorization", auth(tokenPL))
      .send({ ref: { source: "SRD", key: "greataxe" }, location: "EQUIPPED", slot: "MAIN_HAND" });
    expect(equipoDelHacha.status).toBe(201);
    hachaRowId = equipoDelHacha.body.id;
    const hoja = await request(s()).get(sheetUrl()).set("Authorization", auth(tokenPL));
    // **Mensaje que dice la verdad si esto falla**, en vez de un `TypeError` sobre `undefined`
    // que no dice qué ataques SÍ había — la lección de la primera corrida real de este fichero.
    expect(hoja.body.attacks.map((a: { name: string }) => a.name)).toContain("Hacha grande");
    hachaKey = hoja.body.attacks.find((a: { name: string }) => a.name === "Hacha grande").key;

    // Un goblin del DM, para que el ataque tenga a quién apuntar (no se resuelve el impacto en
    // este fichero: solo se mide el DAÑO, que no depende de acertar).
    const goblins = await request(s())
      .post(`/campaigns/${campaignId}/npcs`)
      .set("Authorization", auth(tokenDM))
      .send({ ref: "SRD:goblin", count: 1, hp: "AVERAGE" });
    goblinId = goblins.body[0].id;

    // El combate: lo empieza el DM con el bárbaro (ajeno a él) y el goblin (suyo). Con un
    // personaje ajeno el encuentro nace `PREPARING` — `force-start` lo pasa a `ACTIVE` sin
    // esperar la iniciativa de nadie, que es lo único que hace falta aquí: la economía del turno,
    // no el orden.
    const encuentro = await request(s())
      .post(encUrl())
      .set("Authorization", auth(tokenDM))
      .send({ characterIds: [barbaroId, goblinId] });
    encounterId = encuentro.body.id;
    await request(s())
      .post(encUrl(`/${encounterId}/force-start`))
      .set("Authorization", auth(tokenDM));
    const activo = await request(s())
      .get(encUrl(`/${encounterId}`))
      .set("Authorization", auth(tokenPL));
    expect(activo.body.status).toBe("ACTIVE");
    combatantId = activo.body.combatants.find(
      (c: { characterId: string }) => c.characterId === barbaroId,
    ).id;
  });

  afterAll(async () => {
    if (campaignId) await prisma.campaign.deleteMany({ where: { id: campaignId } });
    await prisma.user.deleteMany({ where: { email: { in: [emailDM, emailPL] } } });
    await app.close();
  });

  it("la Furia: se usa, gasta la acción adicional y un uso, sube el daño con su traza, y se repone al descansar", async () => {
    // --- Antes de la Furia: el daño base del hacha grande, Fuerza 16 → +3 ---
    const { modifier: baseSinFuria } = await danoDelHacha();
    expect(baseSinFuria).toBe(3);

    // --- Se usa la Furia ---
    const usar = await request(s())
      .post(`${base()}/activities/rage/use`)
      .set("Authorization", auth(tokenPL))
      .send({});
    expect(usar.status).toBe(201);

    // Un uso gastado: de 3 (nivel 3) a 2.
    const recursos = await request(s())
      .get(`${base()}/resources`)
      .set("Authorization", auth(tokenPL));
    const rage = recursos.body.find((r: { key: string }) => r.key === "rage");
    expect(rage).toBeDefined();
    expect(rage.current).toBe(2);
    expect(rage.max).toBe(3);

    // La acción adicional del combatiente, gastada — `usar()` marca la economía del turno
    // (tarea A2) porque hay un encuentro `ACTIVE` con el bárbaro dentro.
    const encuentro = await request(s())
      .get(encUrl(`/${encounterId}`))
      .set("Authorization", auth(tokenDM));
    void encuentro; // El combatiente serializado por `get()` no lleva `bonusUsed` (tarea A3 lo
    // documenta como hueco conocido); se comprueba por el suceso que sí lo dice.
    const log = await request(s())
      .get(`/campaigns/${campaignId}/events`)
      .query({ limit: 50 })
      .set("Authorization", auth(tokenPL));
    const gastoDeAccion = log.body.events.find(
      (e: { type: string; payload: { coste?: string; combatantId?: string } }) =>
        e.type === "ACTION_SPENT" &&
        e.payload.combatantId === combatantId &&
        e.payload.coste === "BONUS",
    );
    expect(gastoDeAccion).toBeDefined();

    // El estado, visible en la hoja: la condición «raging» aparece, con su duración (2C.4 ya la
    // deja caducar sola contra el reloj de campaña, y aquí basta con que exista).
    const condiciones = await request(s())
      .get(`${base()}/conditions`)
      .set("Authorization", auth(tokenPL));
    expect(condiciones.body.some((c: { key: string }) => c.key === "raging")).toBe(true);

    // --- Con la Furia activa, el daño cuerpo a cuerpo sube +2, con su razón en la traza ---
    const { modifier: conFuria, trace } = await danoDelHacha();
    expect(conFuria).toBe(baseSinFuria + 2);
    // Aserción de identidad sobre el paso entero (menor de la ronda de arreglo 1): un
    // `.toMatch(/rage-damage/)` sobre la cadena seguiría en verde aunque `amount` o `sourceType`
    // cambiaran a cualquier cosa. Es el mismo paso que produce `resolverOrigen` para
    // `{ tipo: "escala", clave: "rage-damage" }` al nivel 3 (tramo `desde: 1`, valor 2) —
    // idéntico al que ya comprueba la unitaria de `character-sheet.service.spec.ts`.
    expect(trace).toEqual([
      {
        op: "base",
        amount: 2,
        sourceType: "class",
        sourceKey: "rage-damage",
        labelKey: "scale.rage-damage",
      },
    ]);

    // --- Un ataque a DISTANCIA no gana el bono, aunque la Furia SIGA activa ---
    //
    // **Tiene que comprobarse AQUÍ, con la Furia todavía viva, y no después del descanso.** El
    // descanso largo de más abajo avanza el reloj de campaña 8 horas (28800 s), muy por encima de
    // los 60 s que dura la condición — después de descansar, un ataque a distancia tampoco
    // llevaría bono, pero por la razón EQUIVOCADA (la Furia ya venció sola) y no por la que esta
    // prueba quiere medir (el SRD la restringe a cuerpo a cuerpo con Fuerza,
    // `bonoDeFuria`/`character-sheet.service.ts`, comprobado por `ataque.ability`). Una prueba
    // que pasa por el motivo equivocado es peor que no tenerla.
    //
    // **La honda ("sling"), no el arco largo — corregido tras la primera corrida real de este
    // fichero, y en DOS pasos, no uno.** El arco largo (`longbow`) es un arma A DOS MANOS
    // (`properties: ["AMMUNITION", "HEAVY", "TWO_HANDED"]`, `weapons.ts`); ni siquiera hacía
    // falta que LO fuera para que la primera versión de este fichero fallara, porque
    // `InventoryService.ensureSlotAllowed` bloquea la mano izquierda **mientras la mano
    // principal lleve cualquier arma a dos manos** (`inventory.service.ts`: "La mano principal
    // lleva … un arma a dos manos: no queda hueco para la mano izquierda") — el hacha grande YA
    // estaba puesta ahí. La primera corrida real lo confirmó: incluso cambiando el arco por la
    // honda (que no es a dos manos) equipar en `OFF_HAND` seguía devolviendo 409, porque el
    // problema nunca fue el arma nueva, fue la mano principal ocupada. Se desequipa el hacha
    // primero (`PATCH` a `CARRIED`, la mochila del esquema — no "BACKPACK", que no es un valor
    // de `itemLocationSchema`) y la honda entra en `MAIN_HAND`, libre — no hace falta
    // llevar las dos a la vez: el resto del fichero ya no vuelve a tirar con el hacha.
    const desequiparHacha = await request(s())
      .patch(`${base()}/inventory/${hachaRowId}`)
      .set("Authorization", auth(tokenPL))
      .send({ location: "CARRIED", slot: null });
    expect(desequiparHacha.status).toBe(200);
    const equipoDeLaHonda = await request(s())
      .post(`${base()}/inventory`)
      .set("Authorization", auth(tokenPL))
      .send({ ref: { source: "SRD", key: "sling" }, location: "EQUIPPED", slot: "MAIN_HAND" });
    expect(equipoDeLaHonda.status).toBe(201);
    const hojaConHonda = await request(s()).get(sheetUrl()).set("Authorization", auth(tokenPL));
    const nombresDeAtaques = hojaConHonda.body.attacks.map((a: { name: string }) => a.name);
    // **Un mensaje que dice la verdad si esto vuelve a fallar**, en vez de un `TypeError` sobre
    // `undefined` que no dice qué SÍ había en la hoja — la lección exacta de esta ronda.
    expect(nombresDeAtaques).toContain("Honda");
    const hondaKey = hojaConHonda.body.attacks.find(
      (a: { name: string }) => a.name === "Honda",
    ).key;
    const golpeADistancia = await request(s())
      .post(`${sheetUrl()}/attacks/${encodeURIComponent(hondaKey)}/roll`)
      .set("Authorization", auth(tokenPL))
      .send({ part: "DAMAGE", mode: "NORMAL" });
    expect(golpeADistancia.status).toBe(201);
    expect(golpeADistancia.body.trace).toBeUndefined();

    // --- Descanso largo: los usos se reponen ---
    const descanso = await request(s())
      .post(`${base()}/rest`)
      .set("Authorization", auth(tokenPL))
      .send({ kind: "LONG" });
    expect(descanso.status).toBe(201);

    const recursosTrasDescansar = await request(s())
      .get(`${base()}/resources`)
      .set("Authorization", auth(tokenPL));
    const rageRepuesta = recursosTrasDescansar.body.find((r: { key: string }) => r.key === "rage");
    expect(rageRepuesta.current).toBe(3);
  });
});
