import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

// Tarea 2.5.3, contra Postgres real — el ataque, comparado en el servidor.
//
// **Por qué esto no puede ser una unitaria.** El criterio de cierre del spec (§2.5.3) pide algo
// que solo se puede comprobar sobre el CUERPO HTTP SERIALIZADO, no sobre lo que el servicio
// devuelve en memoria: que la CA del PNJ **no aparece en ningún JSON que cruce la red**, ni en
// la respuesta del ataque ni en el registro de la partida. Una unitaria con Prisma simulado
// nunca serializa nada — es exactamente el mismo argumento que ya usó 2C.1 para comprobar la
// tirada a ciegas por HTTP y no en el servicio.
//
// **Por qué el azar no se controla aquí.** La app real no tiene el tirador inyectable (es solo
// de pruebas, ver `rolls.service.ts`), así que el veredicto de un ataque concreto no se puede
// fijar. Se ataca varias veces — igual que la suite de `rolls.e2e-spec.ts` tira treinta veces
// para no medir la distribución, solo que ningún resultado se salga del dado — y de un objetivo
// con CA 10 contra un bono de +4 (75% de probabilidad de impactar por intento), lo que se mide
// es que en algún momento se vea «impacta» y que la CA nunca aparezca, salga lo que salga.

describe("El ataque, comparado en el servidor (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const emailDM = `dm-atk${Date.now()}@b.com`;
  const emailPL = `pl-atk${Date.now()}@b.com`;
  let tokenDM = "";
  let tokenPL = "";
  let campaignId = "";
  let characterId = "";
  let attackKey = "";
  let targetId = "";

  const auth = (t: string) => `Bearer ${t}`;
  const sheetUrl = () => `/campaigns/${campaignId}/characters/${characterId}/sheet`;
  const resolveUrl = () => `${sheetUrl()}/attacks/${encodeURIComponent(attackKey)}/resolve`;
  const eventsUrl = () => `/campaigns/${campaignId}/events`;

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
        .send({ name: "El duelo" })
    ).body.id;
    const invite = (
      await request(s).post(`/campaigns/${campaignId}/invites`).set("Authorization", auth(tokenDM))
    ).body.token;
    await request(s).post(`/invites/${invite}/accept`).set("Authorization", auth(tokenPL));

    // El atacante: guerrero enano de nivel 1 con Fuerza 15, igual que el resto de la suite de
    // ataques — su bono conocido (+4 con una espada larga) es lo que hace calculable la
    // probabilidad de impactar contra una CA 10.
    characterId = (
      await request(s)
        .post(`/campaigns/${campaignId}/characters`)
        .set("Authorization", auth(tokenPL))
        .send({ name: "Thorin", level: 1, visibility: "PLAYERS" })
    ).body.id;
    await request(s)
      .patch(`${sheetUrl()}`)
      .set("Authorization", auth(tokenPL))
      .send({
        abilities: { str: 15, dex: 12, con: 14, int: 8, wis: 10, cha: 8 },
        race: { source: "SRD", key: "dwarf" },
        class: { source: "SRD", key: "fighter" },
        choices: { "fighter-skills": ["athletics", "perception"] },
      });
    await request(s)
      .post(`/campaigns/${campaignId}/characters/${characterId}/inventory`)
      .set("Authorization", auth(tokenPL))
      .send({ ref: { source: "SRD", key: "long-sword" }, location: "EQUIPPED", slot: "MAIN_HAND" });

    const hoja = await request(s).get(sheetUrl()).set("Authorization", auth(tokenPL));
    const ataque = hoja.body.attacks.find((a: { name: string }) => a.name === "Espada larga");
    attackKey = ataque.key;

    // **El objetivo: un plebeyo del SRD (CA 10), bajado por el DM y `DM_ONLY` por defecto** —
    // es exactamente el escenario del criterio de cierre: «un jugador ataca a un PNJ `DM_ONLY`».
    const npc = await request(s)
      .post(`/campaigns/${campaignId}/npcs`)
      .set("Authorization", auth(tokenDM))
      .send({ ref: "SRD:commoner" });
    targetId = npc.body[0].id;
    expect(npc.body[0].visibility).toBe("DM_ONLY");

    // **Y se le baja a la mesa**, porque desde D-OP-11 (2026-09-05) no se puede apuntar a lo que
    // no se ve **ni se tiene delante**. El criterio de cierre del spec —«un jugador ataca a un PNJ
    // `DM_ONLY` y recibe su veredicto»— sigue vivo entero; lo que ya no se puede es atacar a un
    // identificador pescado al azar, que es lo que convertía este endpoint en un oráculo de la CA.
    const sesion = await request(s)
      .post(`/campaigns/${campaignId}/sessions`)
      .set("Authorization", auth(tokenDM))
      .send({ title: "La emboscada", visibility: "PLAYERS" });
    expect(sesion.status).toBe(201);
    await request(s)
      .post(`/campaigns/${campaignId}/sessions/${sesion.body.id}/start`)
      .set("Authorization", auth(tokenDM))
      .send({});
    const encuentro = await request(s)
      .post(`/campaigns/${campaignId}/sessions/${sesion.body.id}/encounters`)
      .set("Authorization", auth(tokenDM))
      .send({
        characterIds: [characterId, targetId],
        sides: { [characterId]: "ALLY", [targetId]: "ENEMY" },
      });
    expect(encuentro.status).toBe(201);
  });

  afterAll(async () => {
    if (campaignId) await prisma.campaign.delete({ where: { id: campaignId } }).catch(() => {});
    await prisma.user.deleteMany({ where: { email: { in: [emailDM, emailPL] } } }).catch(() => {});
    await app.close();
  });

  it("compara en el servidor: un jugador ataca a un PNJ DM_ONLY y recibe un veredicto — y en algún momento, «impacta»", async () => {
    const s = app.getHttpServer();
    const veredictos = new Set<string>();
    const cuerpos: unknown[] = [];

    // Hasta 20 intentos: con un 75% de probabilidad de impactar por tirada, la probabilidad de
    // no ver NUNCA un HIT en veinte intentos es 0.25^20 — indistinguible de cero. No se afirma
    // nada sobre CUÁNTOS impactan, solo que la mecánica entera funciona de punta a punta.
    for (let i = 0; i < 20 && !veredictos.has("HIT"); i++) {
      const r = await request(s)
        .post(resolveUrl())
        .set("Authorization", auth(tokenPL))
        .send({ targetCharacterId: targetId, mode: "NORMAL" });
      expect(r.status).toBe(201);
      expect(["HIT", "MISS", "CRITICAL"]).toContain(r.body.verdict);
      veredictos.add(r.body.verdict);
      cuerpos.push(r.body);
    }

    expect(veredictos.has("HIT")).toBe(true);

    // **Cierra con lo que pide el spec, literal**: en NINGÚN cuerpo HTTP serializado aparece la
    // CA del objetivo bajo ninguno de los nombres con los que podría redactarse. Se comprueba
    // sobre el JSON
    // ya serializado, no sobre lo que el servicio construyó en memoria.
    for (const cuerpo of cuerpos) {
      const json = JSON.stringify(cuerpo);
      expect(json).not.toMatch(/"ac"|"armorClass"|"targetAc"|"targetArmorClass"/i);
    }

    // Y el registro de la partida —lo único que el jugador puede releer después— tampoco la
    // lleva: ni en el suceso de su propia tirada, ni en ningún otro.
    const log = await request(s).get(eventsUrl()).set("Authorization", auth(tokenPL));
    expect(log.status).toBe(200);
    const json = JSON.stringify(log.body);
    expect(json).not.toMatch(/"ac"|"armorClass"|"targetAc"|"targetArmorClass"/i);
    // Y el nombre del PNJ tampoco: el atacante ve un suceso de SU tirada, no una revelación del
    // objetivo — es la misma fuga que ya se cerró en `character-sheet.service.ts`.
    expect(json).not.toContain("Plebeyo");
  });

  it("atacar a un objetivo que no existe en la campaña es 404, no una comparación silenciosa", async () => {
    const r = await request(app.getHttpServer())
      .post(resolveUrl())
      .set("Authorization", auth(tokenPL))
      .send({ targetCharacterId: "clx000000000000000000009", mode: "NORMAL" });
    expect(r.status).toBe(404);
  });

  it("**y un personaje que SÍ existe pero no puedes ver ni tener delante da el MISMO 404, byte a byte** (D-OP-11)", async () => {
    const s = app.getHttpServer();
    // Un segundo PNJ `DM_ONLY`, **fuera del encuentro**: existe, y el jugador no tiene ningún
    // derecho a saber que existe. Es el caso difícil — un id con formato inválido daría 404
    // aunque no hubiera ninguna comprobación.
    const escondido = await request(s)
      .post(`/campaigns/${campaignId}/npcs`)
      .set("Authorization", auth(tokenDM))
      .send({ ref: "SRD:commoner" });
    expect(escondido.status).toBe(201);
    const idEscondido = escondido.body[0].id;

    const contra = async (id: string) =>
      request(s)
        .post(resolveUrl())
        .set("Authorization", auth(tokenPL))
        .send({ targetCharacterId: id, mode: "NORMAL" });

    const real = await contra(idEscondido);
    const inventado = await contra("clx000000000000000000009");

    expect(real.status).toBe(404);
    // **Byte a byte.** Si los cuerpos difirieran en una coma, el oráculo seguiría abierto por otra
    // puerta: bastaría con distinguir «no existe» de «existe y no te lo enseño».
    expect(JSON.stringify(real.body)).toBe(JSON.stringify(inventado.body));
  });

  it("atacar sin ser miembro de la campaña es 403, y sin token 401", async () => {
    const sinToken = await request(app.getHttpServer())
      .post(resolveUrl())
      .send({ targetCharacterId: targetId, mode: "NORMAL" });
    expect(sinToken.status).toBe(401);

    const email = `x-atk${Date.now()}@b.com`;
    const token = (
      await request(app.getHttpServer())
        .post("/auth/register")
        .send({ email, password: "password123", displayName: "X" })
    ).body.token;
    const ajeno = await request(app.getHttpServer())
      .post(resolveUrl())
      .set("Authorization", auth(token))
      .send({ targetCharacterId: targetId, mode: "NORMAL" });
    expect(ajeno.status).toBe(403);
    await prisma.user.deleteMany({ where: { email } });
  });
});
