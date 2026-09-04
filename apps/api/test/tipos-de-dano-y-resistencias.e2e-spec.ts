import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

// Tarea 2.5.1 contra Postgres real.
//
// **Lo que solo puede vivir aquí**: que `GameEvent.damageType` de verdad se guarda como columna
// consultable (y no solo dentro del `payload` Json) y que reducir un daño por resistencia es la
// cadena completa HTTP → guardia → pipe → servicio → base, sobre un PNJ del catálogo real, no
// sobre un mock. Las unitarias ya cubren la aritmética (`apply-damage-modifiers.spec.ts`) y el
// cableado con Prisma simulado (`character-sheet.service.spec.ts`); esto comprueba que lo que se
// escribió de verdad es lo que sale por el cable.

describe("Tipos de daño y resistencias que reducen (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const emailDM = `dm-dmg${Date.now()}@b.com`;
  const emailPL = `pl-dmg${Date.now()}@b.com`;
  let tokenDM = "";
  let tokenPL = "";
  let campaignId = "";

  const auth = (t: string) => `Bearer ${t}`;
  const npcs = () => `/campaigns/${campaignId}/npcs`;
  const ficha = (id: string) => `/campaigns/${campaignId}/characters/${id}`;
  const eventos = () => `/campaigns/${campaignId}/events`;

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
        .set("Authorization", auth(tokenDM))
        .send({ name: "La cripta del tumulario" })
    ).body.id;
    const invite = (
      await request(s).post(`/campaigns/${campaignId}/invites`).set("Authorization", auth(tokenDM))
    ).body.token;
    await request(s).post(`/invites/${invite}/accept`).set("Authorization", auth(tokenPL));
  });

  afterAll(async () => {
    if (campaignId) await prisma.campaign.delete({ where: { id: campaignId } }).catch(() => {});
    await prisma.user.deleteMany({ where: { email: { in: [emailDM, emailPL] } } }).catch(() => {});
    await app.close();
  });

  let tumularioId = "";

  it("el DM baja un tumulario, con sus 45 PG del libro", async () => {
    const r = await request(app.getHttpServer())
      .post(npcs())
      .set("Authorization", auth(tokenDM))
      .send({ ref: "SRD:wight" });
    expect(r.status).toBe(201);
    expect(r.body[0].currentHp).toBe(45);
    tumularioId = r.body[0].id;
  });

  it("un ataque de 25 de necrótico le reduce solo a la mitad, y la traza sale en la respuesta", async () => {
    const r = await request(app.getHttpServer())
      .post(`${ficha(tumularioId)}/hp`)
      .set("Authorization", auth(tokenDM))
      .send({ delta: -25, damageType: "NECROTIC" });
    expect(r.status).toBe(201);
    // 25 de necrótico con resistencia: 12 de verdad, redondeado hacia abajo. 45 − 12 = 33.
    expect(r.body.hp.current).toBe(33);
    expect(r.body.damageTrace).toBeDefined();
    expect(r.body.damageTrace.total).toBe(12);
    expect(r.body.damageTrace.steps.length).toBeGreaterThanOrEqual(2);
  });

  it("un ataque de contundente no mágico se reduce igual, y la traza trae la nota que limita la regla", async () => {
    const r = await request(app.getHttpServer())
      .post(`${ficha(tumularioId)}/hp`)
      .set("Authorization", auth(tokenDM))
      .send({ delta: -10, damageType: "BLUDGEONING" });
    expect(r.status).toBe(201);
    // 10 de contundente con resistencia: 5. 33 − 5 = 28.
    expect(r.body.hp.current).toBe(28);
    expect(r.body.damageTrace.total).toBe(5);
    // La nota que LIMITA la regla — el servidor la enseña, no la interpreta.
    expect(r.body.damageTrace.notes).toContain(
      "de ataques no mágicos con armas que no sean de plata",
    );
  });

  it("un tipo de daño sin resistencia (psíquico) no se reduce nada", async () => {
    const r = await request(app.getHttpServer())
      .post(`${ficha(tumularioId)}/hp`)
      .set("Authorization", auth(tokenDM))
      .send({ delta: -8, damageType: "PSYCHIC" });
    expect(r.status).toBe(201);
    expect(r.body.hp.current).toBe(20);
  });

  it("un delta sin damageType no cambia de comportamiento: la reducción es reversible", async () => {
    const r = await request(app.getHttpServer())
      .post(`${ficha(tumularioId)}/hp`)
      .set("Authorization", auth(tokenDM))
      .send({ delta: -10 });
    expect(r.status).toBe(201);
    expect(r.body.hp.current).toBe(10);
    expect(r.body.damageTrace).toBeUndefined();
  });

  it("¿de qué murió? — el registro guarda el damageType como columna, no solo dentro del payload", async () => {
    const r = await request(app.getHttpServer()).get(eventos()).set("Authorization", auth(tokenDM));
    expect(r.status).toBe(200);
    const necrotico = r.body.events.find(
      (e: { subjectId: string; damageType: string | null }) =>
        e.subjectId === tumularioId && e.damageType === "NECROTIC",
    );
    expect(necrotico).toBeDefined();
    expect(necrotico.payload.damageType).toBe("NECROTIC");

    // Y la consulta que "¿de qué murió Elara?" pide de verdad: filtrar por columna, no leer todo
    // el Json entero. Prueba directa contra la base, con el mismo criterio que el resto de la
    // fase usa para las restricciones que Postgres puede garantizar.
    const porColumna = await prisma.gameEvent.findMany({
      where: { subjectId: tumularioId, damageType: "NECROTIC" },
    });
    expect(porColumna.length).toBeGreaterThanOrEqual(1);
  });

  it("un jugador que no es dueño ni DM no puede aplicar daño a este PNJ", async () => {
    const r = await request(app.getHttpServer())
      .post(`${ficha(tumularioId)}/hp`)
      .set("Authorization", auth(tokenPL))
      .send({ delta: -5, damageType: "FIRE" });
    expect(r.status).toBe(403);
  });

  it("un damageType fuera de la lista cerrada del SRD es 400, no 500", async () => {
    const r = await request(app.getHttpServer())
      .post(`${ficha(tumularioId)}/hp`)
      .set("Authorization", auth(tokenDM))
      .send({ delta: -5, damageType: "HOLY" });
    expect(r.status).toBe(400);
  });

  // ───────────────────────────────────────────────────────────────────────────────────────
  // **Los tres recorridos que la revision de cierre del 2026-09-04 exigio, y que faltaban.**
  // `docs/08-pruebas.md` pide de toda tarea de API que el e2e compruebe «que el jugador NO ve
  // lo que no», y este solo comprobaba un 403. El hueco tenia un defecto vivo dentro.

  it("el suceso registra el dano APLICADO, no el bruto: el registro no delata la resistencia", async () => {
    // 25 de necrotico contra el tumulario se quedan en 12. El suceso escribia `delta: -25`
    // mientras `from`/`to` decian 45 -> 33: un jugador que sabe restar deduce la resistencia,
    // y ademas la linea de la mesa se contradecia consigo misma («Pierde 25 PG (45 -> 33)»).
    const r = await request(app.getHttpServer()).get(eventos()).set("Authorization", auth(tokenDM));
    expect(r.status).toBe(200);
    const golpe = r.body.events.find(
      (e: { subjectId: string; damageType: string | null }) =>
        e.subjectId === tumularioId && e.damageType === "NECROTIC",
    );
    expect(golpe).toBeDefined();
    expect(golpe.payload.delta).toBe(-12);
    // Y la invariante que lo hace verificable sin conocer la resistencia: lo que dice que se
    // pierde es lo que se pierde.
    expect(golpe.payload.from - golpe.payload.to).toBe(-golpe.payload.delta);
  });

  it("una curacion no se puede etiquetar con un tipo de dano, ni siquiera pidiendolo", async () => {
    const s = app.getHttpServer();
    const r = await request(s)
      .post(`${ficha(tumularioId)}/hp`)
      .set("Authorization", auth(tokenDM))
      .send({ delta: +6, damageType: "FIRE" });
    expect(r.status).toBe(201);

    // La columna existe para UNA consulta: «de que murio». Si una curacion entra en ella, la
    // respuesta deja de valer. Se comprueba contra la base, que es donde vive la columna.
    const curacionesEtiquetadas = await prisma.gameEvent.findMany({
      where: { subjectId: tumularioId, damageType: "FIRE" },
    });
    expect(curacionesEtiquetadas).toHaveLength(0);
  });

  it("un statblock DM_ONLY no filtra su resistencia al jugador por el registro de la mesa", async () => {
    const s = app.getHttpServer();

    // El flujo real de 2D, y el que la revision de aquella fase dejo como leccion: el DM
    // prepara un statblock propio —que **nace escondido**—, instancia el PNJ y lo **sube a
    // PLAYERS** para que la mesa lo vea. La criatura es visible; su plantilla, no.
    const plantilla = await request(s)
      .post(`/campaigns/${campaignId}/statblocks`)
      .set("Authorization", auth(tokenDM))
      .send({
        name: "Cosa de la cripta",
        size: "MEDIUM",
        type: "UNDEAD",
        ac: 12,
        hitDiceCount: 8,
        abilities: { str: 14, dex: 10, con: 14, int: 6, wis: 10, cha: 5 },
        cr: 2,
        damageResistances: ["fuego, por algo que el DM no cuenta"],
        damageModifiers: [{ damageType: "FIRE", effect: "RESIST" }],
      });
    expect(plantilla.status).toBe(201);
    // «Lo que el DM prepara nace escondido» se comprueba **contra la fila**, no contra la
    // respuesta: el DTO de un statblock no publica su `visibility` —lo comprobé al escribir
    // esto, la primera versión afirmaba `plantilla.body.visibility` y leía `undefined`—, y una
    // aserción sobre un campo que no viaja es una prueba que no prueba nada.
    // Y el identificador se saca del `ref`, que es lo que el DTO sí publica (`CAMPAIGN:<cuid>`);
    // no hay ningún `body.id`.
    expect(plantilla.body.ref).toMatch(/^CAMPAIGN:/);
    const plantillaId = (plantilla.body.ref as string).replace("CAMPAIGN:", "");
    const fila = await prisma.campaignStatblock.findUniqueOrThrow({ where: { id: plantillaId } });
    expect(fila.visibility).toBe("DM_ONLY");

    const instancia = await request(s)
      .post(npcs())
      .set("Authorization", auth(tokenDM))
      .send({ ref: plantilla.body.ref });
    expect(instancia.status).toBe(201);
    const cosaId = instancia.body[0].id;

    await request(s)
      .patch(ficha(cosaId))
      .set("Authorization", auth(tokenDM))
      .send({ visibility: "PLAYERS" });

    const golpe = await request(s)
      .post(`${ficha(cosaId)}/hp`)
      .set("Authorization", auth(tokenDM))
      .send({ delta: -9, damageType: "FIRE" });
    expect(golpe.status).toBe(201);
    // 9 de fuego con resistencia: 4, redondeando hacia abajo.
    expect(golpe.body.damageTrace.total).toBe(4);

    // **Y ahora lo que ve el jugador, sobre el cuerpo HTTP y no sobre lo que el servicio cree
    // devolver.** Ve la criatura y ve que perdio PG; lo que no puede es reconstruir que hubo
    // una reduccion, porque el numero que se anuncia es el que de verdad se aplico.
    const suyo = await request(s).get(eventos()).set("Authorization", auth(tokenPL));
    expect(suyo.status).toBe(200);
    const visto = suyo.body.events.find(
      (e: { subjectId: string; damageType: string | null }) =>
        e.subjectId === cosaId && e.damageType === "FIRE",
    );
    expect(visto).toBeDefined();
    expect(visto.payload.delta).toBe(-4);
    expect(visto.payload.from - visto.payload.to).toBe(4);

    // Y la plantilla escondida sigue escondida: ni sus numeros ni su `ref` viajan.
    const serializado = JSON.stringify(suyo.body);
    expect(serializado).not.toContain("Cosa de la cripta");
    expect(serializado).not.toContain(plantillaId);

    const bestiarioDelJugador = await request(s)
      .get(`/campaigns/${campaignId}/statblocks`)
      .set("Authorization", auth(tokenPL));
    expect(JSON.stringify(bestiarioDelJugador.body)).not.toContain("Cosa de la cripta");
  });
});
