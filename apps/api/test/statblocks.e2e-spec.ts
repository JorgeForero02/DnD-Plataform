import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

// Tarea 2D.3 contra Postgres real.
//
// **Lo que solo puede vivir aquí**: que un statblock `DM_ONLY` no viaja al jugador por HTTP —ni en
// la lista ni en la respuesta de una mutación—, que las columnas de tipo lista y los campos Json
// van y vuelven intactos por Postgres, y que un statblock de otra campaña da 404 y no 403.
//
// Las unitarias ya cubren la matriz de visibilidad con mocks; esto comprueba que lo que se
// escribió de verdad es lo que sale por el cable.

describe("Statblocks de PNJ (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const emailDM = `dm-sb${Date.now()}@b.com`;
  const emailPL = `pl-sb${Date.now()}@b.com`;
  let tokenDM = "";
  let tokenPL = "";
  let campaignId = "";
  let otraCampana = "";

  const url = () => `/campaigns/${campaignId}/statblocks`;
  const auth = (t: string) => `Bearer ${t}`;

  const dragoncillo = {
    name: "Dragoncillo de la cripta",
    size: "MEDIUM",
    type: "DRAGON",
    alignment: "neutral malvado",
    ac: 16,
    acNote: "armadura natural",
    hitDiceCount: 6,
    abilities: { str: 16, dex: 12, con: 14, int: 10, wis: 11, cha: 13 },
    saveProficiencies: ["con"],
    skillProficiencies: { perception: "proficient" },
    damageResistances: ["fuego de fuentes no mágicas"],
    conditionImmunities: ["frightened"],
    darkvisionFeet: 60,
    speeds: { walk: 30, fly: 60 },
    languages: "dracónico",
    cr: 3,
    traits: [{ name: "Aliento cálido", desc: "Prosa del rasgo." }],
    actions: [{ name: "Mordisco", desc: "Prosa de la acción." }],
  };

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
        .send({ name: "Campaña con bestiario" })
    ).body.id;
    otraCampana = (
      await request(s)
        .post("/campaigns")
        .set("Authorization", auth(tokenDM))
        .send({ name: "Otra campaña" })
    ).body.id;
    const invite = (
      await request(s).post(`/campaigns/${campaignId}/invites`).set("Authorization", auth(tokenDM))
    ).body.token;
    await request(s).post(`/invites/${invite}/accept`).set("Authorization", auth(tokenPL));
  });

  afterAll(async () => {
    if (campaignId) await prisma.campaign.delete({ where: { id: campaignId } }).catch(() => {});
    if (otraCampana) await prisma.campaign.delete({ where: { id: otraCampana } }).catch(() => {});
    await prisma.user.deleteMany({ where: { email: { in: [emailDM, emailPL] } } }).catch(() => {});
    await app.close();
  });

  it("el catálogo del SRD llega entero, y lo ve también el jugador", async () => {
    const r = await request(app.getHttpServer()).get(url()).set("Authorization", auth(tokenPL));
    expect(r.status).toBe(200);
    expect(r.body.srd).toHaveLength(15);
    const goblin = r.body.srd.find((s: { ref: string }) => s.ref === "SRD:goblin");
    expect(goblin.name).toBe("Goblin");
    expect(goblin.ac).toBe(15);
    expect(goblin.skillProficiencies.stealth).toBe("expertise");
  });

  it("un jugador no puede crear un statblock", async () => {
    const r = await request(app.getHttpServer())
      .post(url())
      .set("Authorization", auth(tokenPL))
      .send(dragoncillo);
    expect(r.status).toBe(403);
  });

  let statblockId = "";

  it("el DM crea uno y vuelve entero: listas, Json y todo", async () => {
    const r = await request(app.getHttpServer())
      .post(url())
      .set("Authorization", auth(tokenDM))
      .send(dragoncillo);
    expect(r.status).toBe(201);
    // El viaje de ida y vuelta por Postgres: las columnas de lista y los Json intactos.
    expect(r.body.ref).toMatch(/^CAMPAIGN:/);
    expect(r.body.source).toBe("CAMPAIGN");
    expect(r.body.saveProficiencies).toEqual(["con"]);
    expect(r.body.skillProficiencies).toEqual({ perception: "proficient" });
    expect(r.body.damageResistances).toEqual(["fuego de fuentes no mágicas"]);
    expect(r.body.conditionImmunities).toEqual(["frightened"]);
    expect(r.body.speeds).toEqual({ walk: 30, fly: 60 });
    expect(r.body.traits).toEqual([{ name: "Aliento cálido", desc: "Prosa del rasgo." }]);
    expect(r.body.actions).toHaveLength(1);
    // Nace DM_ONLY aunque no se pidiera.
    expect(r.body.cr).toBe(3);
    statblockId = r.body.ref.replace("CAMPAIGN:", "");
  });

  it("**el statblock del DM no viaja al jugador**", async () => {
    const r = await request(app.getHttpServer()).get(url()).set("Authorization", auth(tokenPL));
    expect(r.status).toBe(200);
    expect(r.body.campaign).toEqual([]);
    // Y no está escondido en ningún rincón de la respuesta.
    expect(JSON.stringify(r.body)).not.toContain("Dragoncillo");
    expect(JSON.stringify(r.body)).not.toContain("Aliento cálido");
  });

  it("el DM sí lo ve en su lista, **y con su visibilidad dentro** (C6-2)", async () => {
    const r = await request(app.getHttpServer()).get(url()).set("Authorization", auth(tokenDM));
    expect(r.body.campaign).toHaveLength(1);
    expect(r.body.campaign[0].name).toBe("Dragoncillo de la cripta");
    // Faltaba, aunque el servicio SÍ filtraba por este campo: el editor no podía enseñar quién la
    // ve al editarla, así que **omitía el campo al guardar** para no volver a esconder una criatura
    // ya enseñada. Con el campo en la lectura, ese rodeo se retira.
    expect(r.body.campaign[0].visibility).toBe("DM_ONLY");
  });

  it("el DM lo sube a PLAYERS y entonces el jugador lo ve", async () => {
    const up = await request(app.getHttpServer())
      .put(`${url()}/${statblockId}`)
      .set("Authorization", auth(tokenDM))
      .send({ visibility: "PLAYERS" });
    expect(up.status).toBe(200);

    const r = await request(app.getHttpServer()).get(url()).set("Authorization", auth(tokenPL));
    expect(r.body.campaign).toHaveLength(1);
    // Y sigue teniendo todo lo suyo: subirle la visibilidad no le quita datos.
    expect(r.body.campaign[0].speeds).toEqual({ walk: 30, fly: 60 });
    // El nivel nuevo viaja, y también al jugador: saber el nivel de algo que ya estás viendo no
    // revela nada — es el mismo criterio que el bando de un combatiente.
    expect(r.body.campaign[0].visibility).toBe("PLAYERS");
  });

  it("**editar otro campo NO vuelve a esconder la criatura**: el rodeo se retiró y sigue en PLAYERS", async () => {
    // Esta es la prueba que protege lo que el rodeo protegía. El editor ya no borra `visibility`
    // del cuerpo; lo que impide el pisotón ahora es que **manda el valor real**, que llega en la
    // lectura. Si algún día volviera a mandar el valor por defecto, esto se pondría rojo.
    const up = await request(app.getHttpServer())
      .put(`${url()}/${statblockId}`)
      .set("Authorization", auth(tokenDM))
      .send({ ac: 15, visibility: "PLAYERS" });
    expect(up.status).toBe(200);
    expect(up.body.visibility).toBe("PLAYERS");

    const r = await request(app.getHttpServer()).get(url()).set("Authorization", auth(tokenPL));
    expect(r.body.campaign).toHaveLength(1);
  });

  it("editar un campo no borra los demás, comprobado contra la fila real", async () => {
    const up = await request(app.getHttpServer())
      .put(`${url()}/${statblockId}`)
      .set("Authorization", auth(tokenDM))
      .send({ ac: 18 });
    expect(up.status).toBe(200);
    expect(up.body.ac).toBe(18);
    expect(up.body.name).toBe("Dragoncillo de la cripta");
    expect(up.body.traits).toHaveLength(1);
    const fila = await prisma.campaignStatblock.findUniqueOrThrow({ where: { id: statblockId } });
    expect(fila.ac).toBe(18);
    expect(fila.languages).toBe("dracónico");
  });

  it("un statblock de otra campaña da 404, no 403", async () => {
    const r = await request(app.getHttpServer())
      .put(`/campaigns/${otraCampana}/statblocks/${statblockId}`)
      .set("Authorization", auth(tokenDM))
      .send({ ac: 20 });
    expect(r.status).toBe(404);
  });

  it("una entrada inválida se rechaza con un mensaje que se lee", async () => {
    const r = await request(app.getHttpServer())
      .post(url())
      .set("Authorization", auth(tokenDM))
      .send({ ...dragoncillo, size: "ENORME" });
    expect(r.status).toBe(400);
    expect(JSON.stringify(r.body)).toMatch(/size/i);
  });

  it("un update vacío se rechaza en vez de escribir nada", async () => {
    const r = await request(app.getHttpServer())
      .put(`${url()}/${statblockId}`)
      .set("Authorization", auth(tokenDM))
      .send({});
    expect(r.status).toBe(400);
  });

  it("el DM lo borra y desaparece de la base", async () => {
    const r = await request(app.getHttpServer())
      .delete(`${url()}/${statblockId}`)
      .set("Authorization", auth(tokenDM));
    expect(r.status).toBe(200);
    expect(await prisma.campaignStatblock.count({ where: { id: statblockId } })).toBe(0);
  });

  it("cambiar la visibilidad de una criatura propia PERSISTE (paso 1, tarea 12)", async () => {
    // La prueba de navegador de la tarea 12 llegaba hasta aquí y decía que el radio volvía sin
    // marcar. Esto separa las dos mitades: si el servidor guarda y devuelve el nivel nuevo, lo que
    // falla es la pantalla; si no, es el servidor.
    const s = app.getHttpServer();
    const creada = await request(s)
      .post(`/campaigns/${campaignId}/statblocks`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({
        name: "Cosa que se revela",
        size: "LARGE",
        type: "ABERRATION",
        ac: 13,
        hitDiceCount: 5,
        abilities: { str: 12, dex: 12, con: 12, int: 6, wis: 10, cha: 5 },
        cr: 1,
      });
    expect(creada.status).toBe(201);
    // **El identificador viaja dentro del `ref`**: `aStatblock` devuelve la forma común, que lleva
    // `CAMPAIGN:<id>` y no una columna `id` — el prefijo lo pone el servidor a propósito.
    const id = String(creada.body.ref).split(":")[1];
    // **Nace escondida**: preparar la mazmorra no puede ser filtrarla.
    expect(creada.body.visibility).toBe("DM_ONLY");

    const editada = await request(s)
      .put(`/campaigns/${campaignId}/statblocks/${id}`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ visibility: "PUBLIC" });
    expect(editada.status).toBe(200);
    expect(editada.body.visibility).toBe("PUBLIC");

    // Y al volver a leerla, sigue siendo la nueva.
    const lista = await request(s)
      .get(`/campaigns/${campaignId}/statblocks`)
      .set("Authorization", `Bearer ${tokenDM}`);
    const vuelta = lista.body.campaign.find((c: { ref: string }) => c.ref === creada.body.ref);
    expect(vuelta.visibility).toBe("PUBLIC");
  });
});

// Tarea 25 (cerrar fichas, tanda 2026-09-11) — **`OWNER_DM` vuelve a valer.**
//
// `statblocks.service.ts:181` mandaba `createdById: ""` a `canView`, así que `OWNER_DM` se
// comportaba como `DM_ONLY`: ni siquiera quien lo había creado lo veía. La prueba que distingue
// esto de «el DM lo ve porque es DM» necesita un statblock cuyo `createdById` sea un JUGADOR, no
// el DM — y el editor de la web solo deja crear al DM, así que esta fila se escribe por Prisma
// directamente, como el encargo pide.
describe("OWNER_DM en un statblock (tarea 25)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const marca = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const emailDM = `dm-owner${marca}@b.com`;
  const emailP = `jug-p${marca}@b.com`;
  const emailQ = `jug-q${marca}@b.com`;
  let tokenDM = "";
  let tokenP = "";
  let tokenQ = "";
  let userIdP = "";
  let campaignId = "";
  let statblockId = "";

  const auth = (t: string) => `Bearer ${t}`;
  const url = () => `/campaigns/${campaignId}/statblocks`;

  beforeAll(async () => {
    const ref = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = ref.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    prisma = app.get(PrismaService);
    const s = app.getHttpServer();

    const dm = await request(s)
      .post("/auth/register")
      .send({ email: emailDM, password: "password123", displayName: "DM Owner" });
    tokenDM = dm.body.token;

    const p = await request(s)
      .post("/auth/register")
      .send({ email: emailP, password: "password123", displayName: "Jugadora P" });
    tokenP = p.body.token;
    userIdP = p.body.user.id;

    const q = await request(s)
      .post("/auth/register")
      .send({ email: emailQ, password: "password123", displayName: "Jugador Q" });
    tokenQ = q.body.token;

    campaignId = (
      await request(s)
        .post("/campaigns")
        .set("Authorization", auth(tokenDM))
        .send({ name: "Campaña OWNER_DM" })
    ).body.id;

    for (const token of [tokenP, tokenQ]) {
      const invite = (
        await request(s)
          .post(`/campaigns/${campaignId}/invites`)
          .set("Authorization", auth(tokenDM))
      ).body.token;
      await request(s).post(`/invites/${invite}/accept`).set("Authorization", auth(token));
    }

    // Creado por Prisma directamente: `createdById` es el de la jugadora P, no el del DM, que es
    // justo lo que distingue «lo ve porque es DM» de «lo ve porque es su creador».
    const fila = await prisma.campaignStatblock.create({
      data: {
        campaignId,
        createdById: userIdP,
        name: "Familiar de P",
        size: "SMALL",
        type: "FEY",
        ac: 12,
        hitDiceCount: 2,
        str: 6,
        dex: 15,
        con: 10,
        int: 10,
        wis: 12,
        cha: 8,
        saveProficiencies: [],
        skillProficiencies: {},
        damageResistances: [],
        damageImmunities: [],
        damageVulnerabilities: [],
        conditionImmunities: [],
        otherSenses: [],
        speeds: { walk: 20 },
        cr: 0.125,
        traits: [],
        actions: [],
        reactions: [],
        legendaryActions: [],
        visibility: "OWNER_DM",
      },
    });
    statblockId = fila.id;
  });

  afterAll(async () => {
    if (campaignId) await prisma.campaign.delete({ where: { id: campaignId } }).catch(() => {});
    await prisma.user
      .deleteMany({ where: { email: { in: [emailDM, emailP, emailQ] } } })
      .catch(() => {});
    await app.close();
  });

  it("lo ve la jugadora P, que lo creó", async () => {
    const r = await request(app.getHttpServer()).get(url()).set("Authorization", auth(tokenP));
    expect(r.status).toBe(200);
    const visto = r.body.campaign.find((c: { ref: string }) => c.ref === `CAMPAIGN:${statblockId}`);
    expect(visto).toBeDefined();
    expect(visto.name).toBe("Familiar de P");
  });

  it("no lo ve el jugador Q, que no lo creó y no es DM", async () => {
    const r = await request(app.getHttpServer()).get(url()).set("Authorization", auth(tokenQ));
    expect(r.status).toBe(200);
    const visto = r.body.campaign.find((c: { ref: string }) => c.ref === `CAMPAIGN:${statblockId}`);
    expect(visto).toBeUndefined();
  });

  it("lo ve el DM, aunque no sea quien lo creó", async () => {
    const r = await request(app.getHttpServer()).get(url()).set("Authorization", auth(tokenDM));
    expect(r.status).toBe(200);
    const visto = r.body.campaign.find((c: { ref: string }) => c.ref === `CAMPAIGN:${statblockId}`);
    expect(visto).toBeDefined();
  });
});
