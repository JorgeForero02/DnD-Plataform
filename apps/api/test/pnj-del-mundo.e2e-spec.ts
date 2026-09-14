import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

// PNJ del mundo y la mesa (2026-09-14, Task 0) contra Postgres real — el puente `entityId`: el
// DM enlaza un cuerpo con su ficha del mundo, el servidor valida (400 fuera de campaña o si no
// es NPC) y redacta (spec §4): quien no ve la ficha recibe `entityId: null` en las seis lecturas.

describe("PNJ del mundo y la mesa — Task 0 (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const emailDM = `dm-pdm${Date.now()}@b.com`;
  const emailPL = `pl-pdm${Date.now()}@b.com`;
  let tokenDM = "";
  let tokenPL = "";
  let campaignId = "";
  let otraCampanaId = "";
  let garrikId = "";
  let pasoId = "";
  let ajenoId = "";
  let goblinId = "";

  const auth = (t: string) => `Bearer ${t}`;
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
        .send({ name: "El puente" })
    ).body.id;
    const invite = (
      await request(s).post(`/campaigns/${campaignId}/invites`).set("Authorization", auth(tokenDM))
    ).body.token;
    await request(s).post(`/invites/${invite}/accept`).set("Authorization", auth(tokenPL));

    otraCampanaId = (
      await request(s)
        .post("/campaigns")
        .set("Authorization", auth(tokenDM))
        .send({ name: "Otra campaña" })
    ).body.id;

    garrikId = (
      await request(s)
        .post(`/campaigns/${campaignId}/entities`)
        .set("Authorization", auth(tokenDM))
        .send({ type: "NPC", name: "Garrik", visibility: "DM_ONLY" })
    ).body.id;
    pasoId = (
      await request(s)
        .post(`/campaigns/${campaignId}/entities`)
        .set("Authorization", auth(tokenDM))
        .send({ type: "LOCATION", name: "El paso", visibility: "PLAYERS" })
    ).body.id;
    ajenoId = (
      await request(s)
        .post(`/campaigns/${otraCampanaId}/entities`)
        .set("Authorization", auth(tokenDM))
        .send({ type: "NPC", name: "Ajeno", visibility: "DM_ONLY" })
    ).body.id;

    goblinId = (
      await request(s)
        .post(`/campaigns/${campaignId}/npcs`)
        .set("Authorization", auth(tokenDM))
        .send({ ref: "SRD:goblin" })
    ).body[0]?.id;
  });

  afterAll(async () => {
    if (campaignId) await prisma.campaign.delete({ where: { id: campaignId } }).catch(() => {});
    if (otraCampanaId)
      await prisma.campaign.delete({ where: { id: otraCampanaId } }).catch(() => {});
    await prisma.user.deleteMany({ where: { email: { in: [emailDM, emailPL] } } }).catch(() => {});
    await app.close();
  });

  describe("Task 0 — el puente entityId", () => {
    it("un jugador no puede enlazar: 403", async () => {
      const r = await request(app.getHttpServer())
        .patch(ficha(goblinId))
        .set("Authorization", auth(tokenPL))
        .send({ entityId: garrikId });
      expect(r.status).toBe(403);
    });

    it("entityId de otra campaña → 400; de una ficha que no es PNJ → 400", async () => {
      for (const id of [ajenoId, pasoId]) {
        const r = await request(app.getHttpServer())
          .patch(ficha(goblinId))
          .set("Authorization", auth(tokenDM))
          .send({ entityId: id });
        expect(r.status).toBe(400);
      }
    });

    it("el DM enlaza; el jugador no recibe el entityId de una ficha que no ve, y sí cuando la ficha es PLAYERS", async () => {
      const s = app.getHttpServer();
      await request(s)
        .patch(ficha(goblinId))
        .set("Authorization", auth(tokenDM))
        .send({ entityId: garrikId, visibility: "PLAYERS" })
        .expect(200);
      const dm = await request(s).get(ficha(goblinId)).set("Authorization", auth(tokenDM));
      expect(dm.body.entityId).toBe(garrikId);
      const pl = await request(s)
        .get(`/campaigns/${campaignId}/npcs`)
        .set("Authorization", auth(tokenPL));
      expect(pl.body.find((n: any) => n.id === goblinId).entityId).toBeNull();
      const hoja = await request(s)
        .get(`${ficha(goblinId)}/sheet`)
        .set("Authorization", auth(tokenPL));
      expect(hoja.body.character.entityId).toBeNull();
      await request(s)
        .patch(`/campaigns/${campaignId}/entities/${garrikId}`)
        .set("Authorization", auth(tokenDM))
        .send({ visibility: "PLAYERS" })
        .expect(200);
      const pl2 = await request(s)
        .get(`/campaigns/${campaignId}/npcs`)
        .set("Authorization", auth(tokenPL));
      expect(pl2.body.find((n: any) => n.id === goblinId).entityId).toBe(garrikId);
    });

    it("PM-1 (cierre, 2026-09-14): la respuesta de una mutación de estado no lleva entityId, ni siquiera para el DM", async () => {
      const s = app.getHttpServer();
      const r = await request(s)
        .post(`${ficha(goblinId)}/hp`)
        .set("Authorization", auth(tokenDM))
        .send({ delta: -1 })
        .expect(201);
      expect(r.body.character.entityId).toBeUndefined();
      expect("entityId" in r.body.character).toBe(false);
    });

    it("bajar una criatura con entityId la enlaza", async () => {
      const r = await request(app.getHttpServer())
        .post(`/campaigns/${campaignId}/npcs`)
        .set("Authorization", auth(tokenDM))
        .send({ ref: "SRD:goblin", count: 2, entityId: garrikId });
      expect(r.status).toBe(201);
      expect(r.body.map((c: any) => c.entityId)).toEqual([garrikId, garrikId]);
    });
  });

  describe("Task 1 — revelar y ocultar", () => {
    let velaEntityId = "";
    let plantillaRef = "";
    let velaCharacterId = "";

    beforeAll(async () => {
      const s = app.getHttpServer();
      // Una plantilla propia de campaña, oculta: la tercera columna que `reveal` puede subir.
      const plantilla = await request(s)
        .post(`/campaigns/${campaignId}/statblocks`)
        .set("Authorization", auth(tokenDM))
        .send({
          name: "Guardiana del faro",
          size: "MEDIUM",
          type: "HUMANOID",
          ac: 13,
          hitDiceCount: 4,
          abilities: { str: 12, dex: 14, con: 12, int: 10, wis: 11, cha: 10 },
          cr: 1,
          visibility: "DM_ONLY",
        });
      expect(plantilla.status).toBe(201);
      plantillaRef = plantilla.body.ref;

      velaEntityId = (
        await request(s)
          .post(`/campaigns/${campaignId}/entities`)
          .set("Authorization", auth(tokenDM))
          .send({ type: "NPC", name: "Vela", visibility: "DM_ONLY" })
      ).body.id;

      const instancia = await request(s)
        .post(`/campaigns/${campaignId}/npcs`)
        .set("Authorization", auth(tokenDM))
        .send({ ref: plantillaRef, count: 1, entityId: velaEntityId });
      expect(instancia.status).toBe(201);
      velaCharacterId = instancia.body[0].id;
    });

    it("antes de reveal: el jugador no la lista, y la ficha del mundo le da 404", async () => {
      const s = app.getHttpServer();
      const npcs = await request(s)
        .get(`/campaigns/${campaignId}/npcs`)
        .set("Authorization", auth(tokenPL));
      expect(npcs.body.some((n: any) => n.id === velaCharacterId)).toBe(false);
      const ficha = await request(s)
        .get(`/campaigns/${campaignId}/entities/${velaEntityId}`)
        .set("Authorization", auth(tokenPL));
      expect(ficha.status).toBe(404);
    });

    it("reveal: 403 al jugador, 200 al DM con las tres columnas subidas", async () => {
      const s = app.getHttpServer();
      const comoJugador = await request(s)
        .post(`/campaigns/${campaignId}/characters/${velaCharacterId}/reveal`)
        .set("Authorization", auth(tokenPL));
      expect(comoJugador.status).toBe(403);

      const comoDM = await request(s)
        .post(`/campaigns/${campaignId}/characters/${velaCharacterId}/reveal`)
        .set("Authorization", auth(tokenDM));
      expect(comoDM.status).toBe(201);
      expect(comoDM.body.revealed).toEqual({ character: true, entity: true, template: true });
    });

    it("después: el jugador ve la criatura con su statblockRef y entityId, la ficha y la plantilla", async () => {
      const s = app.getHttpServer();
      const npcs = await request(s)
        .get(`/campaigns/${campaignId}/npcs`)
        .set("Authorization", auth(tokenPL));
      const vela = npcs.body.find((n: any) => n.id === velaCharacterId);
      expect(vela.statblockRef).toBe(plantillaRef);
      expect(vela.entityId).toBe(velaEntityId);

      const ficha = await request(s)
        .get(`/campaigns/${campaignId}/entities/${velaEntityId}`)
        .set("Authorization", auth(tokenPL));
      expect(ficha.status).toBe(200);

      const statblocks = await request(s)
        .get(`/campaigns/${campaignId}/statblocks`)
        .set("Authorization", auth(tokenPL));
      expect(
        [...statblocks.body.srd, ...statblocks.body.campaign].some(
          (sb: any) => sb.ref === plantillaRef,
        ),
      ).toBe(true);
    });

    it("el registro tiene un NPC_REVEALED con entityName «Vela»", async () => {
      const s = app.getHttpServer();
      const eventos = await request(s)
        .get(`/campaigns/${campaignId}/events`)
        .set("Authorization", auth(tokenDM));
      const revelado = eventos.body.events.find(
        (e: any) => e.type === "NPC_REVEALED" && e.payload?.entityName === "Vela",
      );
      expect(revelado).toBeDefined();
    });

    it("hide: la criatura deja de listarse al jugador, pero la ficha y la plantilla siguen visibles", async () => {
      const s = app.getHttpServer();
      const oculta = await request(s)
        .post(`/campaigns/${campaignId}/characters/${velaCharacterId}/hide`)
        .set("Authorization", auth(tokenDM));
      expect(oculta.status).toBe(201);

      const npcs = await request(s)
        .get(`/campaigns/${campaignId}/npcs`)
        .set("Authorization", auth(tokenPL));
      expect(npcs.body.some((n: any) => n.id === velaCharacterId)).toBe(false);

      const ficha = await request(s)
        .get(`/campaigns/${campaignId}/entities/${velaEntityId}`)
        .set("Authorization", auth(tokenPL));
      expect(ficha.status).toBe(200);

      const statblocks = await request(s)
        .get(`/campaigns/${campaignId}/statblocks`)
        .set("Authorization", auth(tokenPL));
      expect(
        [...statblocks.body.srd, ...statblocks.body.campaign].some(
          (sb: any) => sb.ref === plantillaRef,
        ),
      ).toBe(true);
    });

    it("un segundo reveal: todo false y ningún suceso nuevo", async () => {
      const s = app.getHttpServer();
      // Vuelve a revelar la instancia (la ficha y la plantilla ya están arriba desde antes).
      await request(s)
        .post(`/campaigns/${campaignId}/characters/${velaCharacterId}/reveal`)
        .set("Authorization", auth(tokenDM))
        .expect(201);
      const antes = await request(s)
        .get(`/campaigns/${campaignId}/events`)
        .set("Authorization", auth(tokenDM));
      const segundo = await request(s)
        .post(`/campaigns/${campaignId}/characters/${velaCharacterId}/reveal`)
        .set("Authorization", auth(tokenDM));
      expect(segundo.status).toBe(201);
      expect(segundo.body.revealed).toEqual({ character: false, entity: false, template: false });
      const despues = await request(s)
        .get(`/campaigns/${campaignId}/events`)
        .set("Authorization", auth(tokenDM));
      expect(despues.body.events.length).toBe(antes.body.events.length);
    });
  });

  describe("Task 1 bis — revelar desde la ficha", () => {
    it("PATCH /entities/:id a PLAYERS sube a los goblins enlazados a esa ficha", async () => {
      const s = app.getHttpServer();
      const nidoEntityId = (
        await request(s)
          .post(`/campaigns/${campaignId}/entities`)
          .set("Authorization", auth(tokenDM))
          .send({ type: "NPC", name: "El nido", visibility: "DM_ONLY" })
      ).body.id;

      const instancia = await request(s)
        .post(`/campaigns/${campaignId}/npcs`)
        .set("Authorization", auth(tokenDM))
        .send({ ref: "SRD:goblin", count: 2, entityId: nidoEntityId });
      expect(instancia.status).toBe(201);
      const [g1, g2] = instancia.body.map((c: any) => c.id);

      const subida = await request(s)
        .patch(`/campaigns/${campaignId}/entities/${nidoEntityId}`)
        .set("Authorization", auth(tokenDM))
        .send({ visibility: "PLAYERS" });
      expect(subida.status).toBe(200);

      const npcs = await request(s)
        .get(`/campaigns/${campaignId}/npcs`)
        .set("Authorization", auth(tokenPL));
      const ids = npcs.body.map((n: any) => n.id);
      expect(ids).toEqual(expect.arrayContaining([g1, g2]));
    });
  });

  describe("Task 2 — sacar del combate", () => {
    let sessionId = "";
    let encounterId = "";
    let g1 = ""; // SRD:goblin
    let g2 = ""; // SRD:bandit
    let g3 = ""; // SRD:ogre — los tres distintos para que cada uno tenga SU propia posición.

    const encUrl = (suffix = "") =>
      `/campaigns/${campaignId}/sessions/${sessionId}/encounters${suffix}`;
    const combatantUrl = (cid: string) => encUrl(`/${encounterId}/combatants/${cid}`);

    beforeAll(async () => {
      const s = app.getHttpServer();
      sessionId = (
        await request(s)
          .post(`/campaigns/${campaignId}/sessions`)
          .set("Authorization", auth(tokenDM))
          .send({ title: "Sacar del combate", visibility: "PLAYERS" })
      ).body.id;

      g1 = (
        await request(s)
          .post(`/campaigns/${campaignId}/npcs`)
          .set("Authorization", auth(tokenDM))
          .send({ ref: "SRD:goblin", count: 1 })
      ).body[0].id;
      g2 = (
        await request(s)
          .post(`/campaigns/${campaignId}/npcs`)
          .set("Authorization", auth(tokenDM))
          .send({ ref: "SRD:bandit", count: 1 })
      ).body[0].id;
      g3 = (
        await request(s)
          .post(`/campaigns/${campaignId}/npcs`)
          .set("Authorization", auth(tokenDM))
          .send({ ref: "SRD:ogre", count: 1 })
      ).body[0].id;

      // Los tres son del DM: `start()` tira por ellos en el servidor y el encuentro nace ACTIVE
      // sin pedir ninguna iniciativa (ronda de arreglo P2, «con más de un DM»).
      const r = await request(s)
        .post(encUrl())
        .set("Authorization", auth(tokenDM))
        .send({ characterIds: [g1, g2, g3] });
      expect(r.status).toBe(201);
      expect(r.body.status).toBe("ACTIVE");
      expect(r.body.combatants).toHaveLength(3);
      const posiciones = [...new Set(r.body.combatants.map((c: any) => c.position))];
      expect(posiciones).toHaveLength(3);
      encounterId = r.body.id;
    });

    it("un jugador no puede sacar a nadie del combate: 403", async () => {
      const actual = await request(app.getHttpServer())
        .get(encUrl(`/${encounterId}`))
        .set("Authorization", auth(tokenDM));
      const cualquiera = actual.body.combatants[0].id;
      const r = await request(app.getHttpServer())
        .delete(combatantUrl(cualquiera))
        .set("Authorization", auth(tokenPL));
      expect(r.status).toBe(403);
    });

    it("sacar al que NO tiene el turno: baja a dos, sigue el mismo turno por identidad, el asalto no cambia", async () => {
      const s = app.getHttpServer();
      const antes = await request(s)
        .get(encUrl(`/${encounterId}`))
        .set("Authorization", auth(tokenDM));
      const activoAntes = antes.body.combatants.find(
        (c: any) => c.position === antes.body.activePosition,
      );
      const otro = antes.body.combatants.find((c: any) => c.id !== activoAntes.id);
      expect(otro).toBeDefined();

      const r = await request(s).delete(combatantUrl(otro.id)).set("Authorization", auth(tokenDM));
      expect(r.status).toBe(200);
      expect(r.body.combatants).toHaveLength(2);
      expect(r.body.round).toBe(antes.body.round);
      const activoDespues = r.body.combatants.find(
        (c: any) => c.position === r.body.activePosition,
      );
      expect(activoDespues.characterId).toBe(activoAntes.characterId);
    });

    it("sacar al que tiene el turno cuando es el ÚLTIMO de la vuelta: el asalto sube UNA vez y el reloj avanza seis segundos, no doce", async () => {
      const s = app.getHttpServer();

      const relojAntes = await request(s)
        .get(`/campaigns/${campaignId}/clock`)
        .set("Authorization", auth(tokenDM));

      // Quedan dos combatientes tras la prueba anterior: si el turno activo no está ya en la
      // última posición, se avanza hasta dejarlo ahí.
      let actual = await request(s)
        .get(encUrl(`/${encounterId}`))
        .set("Authorization", auth(tokenDM));
      const posiciones = (
        [...new Set(actual.body.combatants.map((c: any) => c.position))] as number[]
      ).sort((a, b) => a - b);
      expect(posiciones).toHaveLength(2);
      while (actual.body.activePosition !== posiciones[posiciones.length - 1]) {
        await request(s)
          .post(encUrl(`/${encounterId}/advance-turn`))
          .set("Authorization", auth(tokenDM))
          .expect(201);
        actual = await request(s)
          .get(encUrl(`/${encounterId}`))
          .set("Authorization", auth(tokenDM));
      }
      const rondaAntes = actual.body.round;
      const activo = actual.body.combatants.find(
        (c: any) => c.position === actual.body.activePosition,
      );

      const r = await request(s)
        .delete(combatantUrl(activo.id))
        .set("Authorization", auth(tokenDM));
      expect(r.status).toBe(200);
      expect(r.body.round).toBe(rondaAntes + 1);
      expect(r.body.activePosition).toBe(0);

      const relojDespues = await request(s)
        .get(`/campaigns/${campaignId}/clock`)
        .set("Authorization", auth(tokenDM));
      expect(relojDespues.body.seconds - relojAntes.body.seconds).toBe(6);
    });

    it("el registro tiene un COMBATANT_LEFT por cada sacado", async () => {
      const eventos = await request(app.getHttpServer())
        .get(`/campaigns/${campaignId}/events`)
        .set("Authorization", auth(tokenDM));
      const salidas = eventos.body.events.filter(
        (e: any) => e.type === "COMBATANT_LEFT" && e.payload?.encounterId === encounterId,
      );
      expect(salidas).toHaveLength(2);
    });

    it("sacar al último combatiente: 409, el combate no se vacía solo", async () => {
      const s = app.getHttpServer();
      const actual = await request(s)
        .get(encUrl(`/${encounterId}`))
        .set("Authorization", auth(tokenDM));
      expect(actual.body.combatants).toHaveLength(1);
      const r = await request(s)
        .delete(combatantUrl(actual.body.combatants[0].id))
        .set("Authorization", auth(tokenDM));
      expect(r.status).toBe(409);
    });

    it("los personajes sacados siguen en GET /npcs", async () => {
      const npcs = await request(app.getHttpServer())
        .get(`/campaigns/${campaignId}/npcs`)
        .set("Authorization", auth(tokenDM));
      const ids = npcs.body.map((n: any) => n.id);
      expect(ids).toEqual(expect.arrayContaining([g1, g2, g3]));
    });
  });
});
