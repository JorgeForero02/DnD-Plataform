import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

// Tarea 2D.4 contra Postgres real — **el bucle entero de un PNJ en la mesa**.
//
// Esta especificación es la que justifica la decisión de diseño de toda la fase: si un PNJ
// instanciado es una fila de `Character`, entonces **todo lo que ya sabía hacer una hoja tiene
// que funcionar sin tocarlo**. Recibir daño, coger una condición, que el agotamiento le parta los
// PG máximos, que una anulación del DM salga en la traza. Si algo de eso no funcionara, la
// decisión de reutilizar `Character` estaría mal y habría que saberlo aquí y no en la mesa.

describe("Un PNJ en la mesa (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const emailDM = `dm-npc${Date.now()}@b.com`;
  const emailPL = `pl-npc${Date.now()}@b.com`;
  let tokenDM = "";
  let tokenPL = "";
  let campaignId = "";

  const auth = (t: string) => `Bearer ${t}`;
  const npcs = () => `/campaigns/${campaignId}/npcs`;
  const ficha = (id: string) => `/campaigns/${campaignId}/characters/${id}`;

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
        .send({ name: "La cripta" })
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

  let goblinId = "";

  it("un jugador no puede bajar monstruos a la mesa", async () => {
    const r = await request(app.getHttpServer())
      .post(npcs())
      .set("Authorization", auth(tokenPL))
      .send({ ref: "SRD:goblin" });
    expect(r.status).toBe(403);
  });

  it("un ref que no existe se rechaza con un motivo que se lee", async () => {
    const r = await request(app.getHttpServer())
      .post(npcs())
      .set("Authorization", auth(tokenDM))
      .send({ ref: "SRD:dragon-inventado" });
    expect(r.status).toBe(400);
    expect(JSON.stringify(r.body)).toContain("dragon-inventado");
  });

  it("el DM baja un goblin, y nace con los PG del libro y DM_ONLY", async () => {
    const r = await request(app.getHttpServer())
      .post(npcs())
      .set("Authorization", auth(tokenDM))
      .send({ ref: "SRD:goblin" });
    expect(r.status).toBe(201);
    expect(r.body).toHaveLength(1);
    // Uno solo NO se numera: la mesa dice «un goblin», no «Goblin 1».
    expect(r.body[0].name).toBe("Goblin");
    expect(r.body[0].currentHp).toBe(7);
    expect(r.body[0].visibility).toBe("DM_ONLY");
    goblinId = r.body[0].id;
  });

  it("**el PNJ preparado no viaja al jugador**", async () => {
    const r = await request(app.getHttpServer()).get(npcs()).set("Authorization", auth(tokenPL));
    expect(r.status).toBe(200);
    expect(r.body).toEqual([]);
  });

  it("seis goblins salen numerados, y entran los seis", async () => {
    const r = await request(app.getHttpServer())
      .post(npcs())
      .set("Authorization", auth(tokenDM))
      .send({ ref: "SRD:goblin", count: 6, name: "Emboscada" });
    expect(r.status).toBe(201);
    expect(r.body).toHaveLength(6);
    expect(r.body.map((n: { name: string }) => n.name)).toEqual([
      "Emboscada 1",
      "Emboscada 2",
      "Emboscada 3",
      "Emboscada 4",
      "Emboscada 5",
      "Emboscada 6",
    ]);
    expect(
      await prisma.character.count({ where: { campaignId, statblockRef: "SRD:goblin" } }),
    ).toBe(7);
  });

  it("más de diez a la vez se rechaza: es un encuentro que esta fase no arbitra", async () => {
    const r = await request(app.getHttpServer())
      .post(npcs())
      .set("Authorization", auth(tokenDM))
      .send({ ref: "SRD:goblin", count: 11 });
    expect(r.status).toBe(400);
  });

  describe("la hoja de un PNJ es una hoja", () => {
    it("se deriva del statblock, con los números del libro y su traza", async () => {
      const r = await request(app.getHttpServer())
        .get(`${ficha(goblinId)}/sheet`)
        .set("Authorization", auth(tokenDM));
      expect(r.status).toBe(200);
      expect(r.body.sheet.derived.ac.total).toBe(15);
      expect(r.body.sheet.derived.maxHp.total).toBe(7);
      expect(r.body.hp.max).toBe(7);
      expect(r.body.sheet.derived.proficiencyBonus.total).toBe(2);
      expect(r.body.sheet.derived["skill.stealth"].total).toBe(6);
      expect(r.body.sheet.statblockRef).toBe("SRD:goblin");
      // Sin raza ni clase inventadas: un monstruo no las tiene.
      expect(r.body.sheet.raceKey).toBeUndefined();
      expect(r.body.sheet.classKey).toBeUndefined();
      // Y la traza dice de dónde sale la CA.
      expect(r.body.sheet.derived.ac.steps[0].sourceType).toBe("statblock");
      expect(r.body.sheet.derived.proficiencyBonus.steps[0].sourceType).toBe("challenge");
    });

    it("recibe daño como cualquiera", async () => {
      const r = await request(app.getHttpServer())
        .post(`${ficha(goblinId)}/hp`)
        .set("Authorization", auth(tokenDM))
        .send({ delta: -3 });
      expect(r.status).toBe(201);
      expect(r.body.hp.current).toBe(4);
    });

    it("una anulación del DM sobre su CA sale en la traza con su delta", async () => {
      const r = await request(app.getHttpServer())
        .put(`${ficha(goblinId)}/overrides/ac`)
        .set("Authorization", auth(tokenDM))
        .send({ value: 18 });
      expect(r.status).toBe(200);

      const hoja = await request(app.getHttpServer())
        .get(`${ficha(goblinId)}/sheet`)
        .set("Authorization", auth(tokenDM));
      expect(hoja.body.sheet.derived.ac.total).toBe(18);
      const ultimo = hoja.body.sheet.derived.ac.steps.at(-1);
      expect(ultimo.op).toBe("override");
      expect(ultimo.amount).toBe(3);
    });
  });

  describe("el agotamiento le parte los PG máximos, igual que a un jugador", () => {
    let ogroId = "";

    it("baja un ogro", async () => {
      const r = await request(app.getHttpServer())
        .post(npcs())
        .set("Authorization", auth(tokenDM))
        .send({ ref: "SRD:ogre" });
      expect(r.status).toBe(201);
      ogroId = r.body[0].id;
      expect(r.body[0].currentHp).toBe(59);
    });

    it("con agotamiento 4, sus PG máximos son la mitad hacia abajo", async () => {
      const c = await request(app.getHttpServer())
        .put(`${ficha(ogroId)}/conditions/exhaustion`)
        .set("Authorization", auth(tokenDM))
        .send({ level: 4 });
      expect(c.status).toBe(200);

      const hoja = await request(app.getHttpServer())
        .get(`${ficha(ogroId)}/sheet`)
        .set("Authorization", auth(tokenDM));
      // 59 partido por dos, hacia abajo: 29. **Esta es la prueba que justifica la fase entera**:
      // no se escribió una línea de agotamiento para PNJ, y funciona porque un PNJ es un
      // `Character`.
      expect(hoja.body.sheet.derived.maxHp.total).toBe(29);
    });
  });

  it("los PG tirados salen distintos del promedio, y nunca por debajo de uno", async () => {
    const r = await request(app.getHttpServer())
      .post(npcs())
      .set("Authorization", auth(tokenDM))
      .send({ ref: "SRD:troll", count: 5, hp: "ROLL" });
    expect(r.status).toBe(201);
    for (const t of r.body) {
      expect(t.currentHp).toBeGreaterThanOrEqual(1);
      // 8d10+40: entre 48 y 120. Un valor fuera de ese rango significaría que la Constitución
      // no entró en la expresión, que es el fallo que 2D.1 midió con trece pruebas en rojo.
      expect(t.currentHp).toBeGreaterThanOrEqual(48);
      expect(t.currentHp).toBeLessThanOrEqual(120);
    }
  });

  it("un PNJ cuyo statblock ya no existe lo dice, en vez de dar un 500", async () => {
    const creado = await request(app.getHttpServer())
      .post(`/campaigns/${campaignId}/statblocks`)
      .set("Authorization", auth(tokenDM))
      .send({
        name: "Sombra pasajera",
        size: "MEDIUM",
        type: "UNDEAD",
        ac: 12,
        hitDiceCount: 3,
        abilities: { str: 6, dex: 14, con: 13, int: 6, wis: 10, cha: 8 },
        cr: 1,
      });
    expect(creado.status).toBe(201);
    const refPropio = creado.body.ref;

    const instancia = await request(app.getHttpServer())
      .post(npcs())
      .set("Authorization", auth(tokenDM))
      .send({ ref: refPropio });
    expect(instancia.status).toBe(201);
    const sombraId = instancia.body[0].id;

    // El DM borra la plantilla con la instancia todavía en la mesa.
    const borrado = await request(app.getHttpServer())
      .delete(`/campaigns/${campaignId}/statblocks/${refPropio.replace("CAMPAIGN:", "")}`)
      .set("Authorization", auth(tokenDM));
    expect(borrado.status).toBe(200);

    const hoja = await request(app.getHttpServer())
      .get(`${ficha(sombraId)}/sheet`)
      .set("Authorization", auth(tokenDM));
    // Un dato caduco, no un fallo del servidor. **Al LEER** se responde 200 con la hoja a null y
    // un `reason` que se puede pintar, igual que hace el catálogo con una clase que ya no existe;
    // lo que lanza es mutar, porque ahí no hay dónde enseñar el motivo.
    expect(hoja.status).toBe(200);
    expect(hoja.body.sheet).toBeNull();
    expect(hoja.body.reason).toContain("ya no existe");

    const danio = await request(app.getHttpServer())
      .post(`${ficha(sombraId)}/hp`)
      .set("Authorization", auth(tokenDM))
      .send({ delta: -1 });
    expect(danio.status).toBe(400);
    expect(JSON.stringify(danio.body)).toContain("ya no existe");
  });

  it("el DM sube un PNJ a PLAYERS y entonces el jugador lo ve", async () => {
    const up = await request(app.getHttpServer())
      .patch(ficha(goblinId))
      .set("Authorization", auth(tokenDM))
      .send({ visibility: "PLAYERS" });
    expect([200, 204]).toContain(up.status);

    const r = await request(app.getHttpServer()).get(npcs()).set("Authorization", auth(tokenPL));
    expect(r.body).toHaveLength(1);
    expect(r.body[0].id).toBe(goblinId);
  });
});
