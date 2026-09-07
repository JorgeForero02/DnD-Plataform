import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

// Tarea 2.5.2 contra Postgres real.
//
// Lo unitario (`encounters.service.spec.ts`) ya prueba el agrupamiento y el paso de turno con un
// Prisma simulado. Esto prueba lo que aquel no puede: que **la base garantiza de verdad** «una
// posición no se repite» y «como mucho un encuentro activo por sesión» (el Prisma simulado no
// valida SQL, convención de `docs/04-convenciones.md`), y que subir de asalto hace caducar una
// condición **de verdad**, atravesando las tres capas.

describe("Iniciativa y orden de turnos (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const emailDM = `dm-enc${Date.now()}@b.com`;
  const emailPL = `pl-enc${Date.now()}@b.com`;
  let tokenDM = "";
  let tokenPL = "";
  let campaignId = "";
  let sessionId = "";
  let pc1Id = "";
  let pc2Id = "";
  let goblinIds: string[] = [];
  let encounterId = "";

  const encUrl = (suffix = "") =>
    `/campaigns/${campaignId}/sessions/${sessionId}/encounters${suffix}`;

  beforeAll(async () => {
    const ref = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = ref.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    prisma = app.get(PrismaService);
    const s = app.getHttpServer();

    const dm = await request(s)
      .post("/auth/register")
      .send({ email: emailDM, password: "password123", displayName: "DM" });
    tokenDM = dm.body.token;
    tokenPL = (
      await request(s)
        .post("/auth/register")
        .send({ email: emailPL, password: "password123", displayName: "PL" })
    ).body.token;
    campaignId = (
      await request(s)
        .post("/campaigns")
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ name: "Campaña del combate" })
    ).body.id;
    const invite = (
      await request(s)
        .post(`/campaigns/${campaignId}/invites`)
        .set("Authorization", `Bearer ${tokenDM}`)
    ).body.token;
    await request(s).post(`/invites/${invite}/accept`).set("Authorization", `Bearer ${tokenPL}`);
    sessionId = (
      await request(s)
        .post(`/campaigns/${campaignId}/sessions`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ title: "Sesión de combate", visibility: "PLAYERS" })
    ).body.id;

    // Dos personajes del jugador, con una hoja completa: hace falta para que
    // `CharacterSheetService.getInitiativeModifier` pueda derivar (no basta con el nombre).
    for (const [nombre, dex] of [
      ["Thora", 16],
      ["Brann", 12],
    ] as const) {
      const id = (
        await request(s)
          .post(`/campaigns/${campaignId}/characters`)
          .set("Authorization", `Bearer ${tokenPL}`)
          .send({ name: nombre, level: 1 })
      ).body.id;
      await request(s)
        .patch(`/campaigns/${campaignId}/characters/${id}/sheet`)
        .set("Authorization", `Bearer ${tokenPL}`)
        .send({
          abilities: { str: 12, dex, con: 14, int: 8, wis: 10, cha: 8 },
          race: { source: "SRD", key: "human" },
          class: { source: "SRD", key: "fighter" },
          choices: { "fighter-skills": ["athletics", "perception"] },
        });
      if (nombre === "Thora") pc1Id = id;
      else pc2Id = id;
    }

    // Seis goblins idénticos (2D): el grupo del SRD.
    const goblins = await request(s)
      .post(`/campaigns/${campaignId}/npcs`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ ref: "SRD:goblin", count: 6, hp: "AVERAGE" });
    expect(goblins.status).toBe(201);
    goblinIds = goblins.body.map((g: { id: string }) => g.id);
    expect(goblinIds).toHaveLength(6);
  });

  afterAll(async () => {
    if (campaignId) await prisma.campaign.deleteMany({ where: { id: campaignId } });
    await prisma.user.deleteMany({ where: { email: { in: [emailDM, emailPL] } } });
    await app.close();
  });

  it("un jugador no puede empezar un encuentro (403)", async () => {
    const r = await request(app.getHttpServer())
      .post(encUrl())
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({ characterIds: [pc1Id, pc2Id, ...goblinIds] });
    expect(r.status).toBe(403);
  });

  // **El criterio de aceptación del spec dice «siete posiciones», y el número está mal.**
  //
  // El MODELO del spec es el correcto y manda la fuente: *«The DM makes one roll for an entire
  // group of identical creatures, so each member of the group acts at the same time»* (SRD 5.1,
  // «Initiative»). Actuar a la vez es ocupar UNA entrada del orden.
  //
  // Pero la cuenta no sale siete por ningún camino: dos personajes son **dos grupos de uno**
  // —ninguno tiene `statblockRef`— más **un** grupo de seis goblins. Tres entradas. Siete sería
  // la cuenta si los goblins ocuparan seis y aun así se hubiera restado uno, que no es ninguna
  // regla.
  //
  // La primera implementación dio ocho posiciones y declaró la discrepancia en vez de elegir un
  // número en silencio, que es lo correcto. Aquí se corrige entera: **el modelo del spec, y el
  // número que ese modelo produce**. Queda ficha para que el autor confirme el criterio.
  it("dos personajes y seis goblins: OCHO combatientes y TRES posiciones", async () => {
    const r = await request(app.getHttpServer())
      .post(encUrl())
      .set("Authorization", `Bearer ${tokenDM}`)
      // El DM clasifica a pc1 y a los goblins; **a pc2 lo deja sin decir nada a propósito**, que
      // es lo que prueba el valor por defecto de la columna contra Postgres real.
      .send({
        characterIds: [pc1Id, pc2Id, ...goblinIds],
        sides: {
          [pc1Id]: "ALLY",
          ...Object.fromEntries(goblinIds.map((id) => [id, "ENEMY"])),
        },
      });
    expect(r.status).toBe(201);
    encounterId = r.body.id;
    // **`PREPARING`, no `ACTIVE`, y desde la tarea 2 (2026-09-05).** pc1 y pc2 son del jugador,
    // no del DM que empieza el combate: `start()` ya no tira por ellos, les pide la iniciativa.
    // Ver el puente al final de esta prueba.
    expect(r.body.status).toBe("PREPARING");
    expect(r.body.round).toBe(1);
    expect(r.body.combatants).toHaveLength(8);

    const posiciones = r.body.combatants.map((c: { position: number }) => c.position);
    expect(new Set(posiciones).size).toBe(3);
    // Y son 0, 1 y 2 sin huecos: una posición es un sitio en la fila, no un identificador.
    expect([...new Set<number>(posiciones)].sort((a, b) => a - b)).toEqual([0, 1, 2]);

    // Los seis goblins comparten UNA tirada (se tira en grupo, SRD), y por tanto **la misma
    // iniciativa y la misma posición**.
    const goblinCombatants = r.body.combatants.filter((c: { characterId: string }) =>
      goblinIds.includes(c.characterId),
    );
    expect(goblinCombatants).toHaveLength(6);
    const iniciativas = new Set(goblinCombatants.map((c: { initiative: number }) => c.initiative));
    expect(iniciativas.size).toBe(1);
    const posicionesGoblin = new Set(goblinCombatants.map((c: { position: number }) => c.position));
    expect(posicionesGoblin.size).toBe(1);

    // Y los dos personajes NO comparten posición entre sí: agrupar por `statblockRef` no puede
    // meter en el mismo saco a dos jugadores que no tienen ninguno.
    const pjs = r.body.combatants.filter((c: { characterId: string }) =>
      [pc1Id, pc2Id].includes(c.characterId),
    );
    expect(new Set(pjs.map((c: { position: number }) => c.position)).size).toBe(2);

    // **El bando, contra Postgres real.** pc1 va como aliado, los seis goblins como enemigos, y
    // pc2 —del que nadie dijo nada— llega como `NEUTRAL`, que es literalmente «no se ha dicho».
    // Un valor por defecto que afirmara algo convertiría ese silencio en una afirmación.
    const bandoDe = new Map<string, string>(
      r.body.combatants.map((c: { characterId: string; side: string }) => [c.characterId, c.side]),
    );
    expect(bandoDe.get(pc1Id)).toBe("ALLY");
    expect(bandoDe.get(pc2Id)).toBe("NEUTRAL");
    expect(goblinIds.map((id) => bandoDe.get(id))).toEqual(Array(6).fill("ENEMY"));
  });

  // Responder la petición de iniciativa por el camino real (tarea 3, 2026-09-05): sin ella, el
  // resto de esta suite (turnos, condiciones) no tenía ninguna puerta de la API para pasar de
  // `PREPARING` a `ACTIVE`, y por eso vivía en su propia prueba con un puente a mano. Vive en su
  // propia prueba, no dentro de «OCHO combatientes y TRES posiciones»: mutar ahí dejaba CUATRO
  // posiciones (el número lo destapó la revisión — `setInitiative` separa a quien corrige de su
  // grupo, `groupKey: combatantId`), y el nombre de esa prueba dejaba de ser cierto.
  it("responder la iniciativa por HTTP arranca el combate", async () => {
    const r = await request(app.getHttpServer())
      .get(encUrl(`/${encounterId}`))
      .set("Authorization", `Bearer ${tokenDM}`);
    expect(r.body.status).toBe("PREPARING");

    // pc1 y pc2 son los dos del jugador — las dos peticiones pendientes de este encuentro son
    // suyas.
    const pendientes = await prisma.rollRequest.findMany({
      where: { encounterId, resolvedAt: null },
    });
    expect(pendientes.length).toBeGreaterThan(0);
    for (const peticion of pendientes) {
      const respuesta = await request(app.getHttpServer())
        .post(`/campaigns/${campaignId}/roll-requests/${peticion.id}/roll`)
        .set("Authorization", `Bearer ${tokenPL}`)
        .send({});
      expect(respuesta.status).toBe(201);
    }

    const despues = await request(app.getHttpServer())
      .get(encUrl(`/${encounterId}`))
      .set("Authorization", `Bearer ${tokenDM}`);
    expect(despues.body.status).toBe("ACTIVE");
  });

  it("un bando para alguien que no entra al combate es un 400 y NO crea el encuentro", async () => {
    // Va después del encuentro ya creado a propósito: si el 400 no saltara, lo siguiente que se
    // encontraría esta petición es el 409 de «ya hay un encuentro activo», y un 409 no distingue
    // «te he rechazado la petición mal construida» de «llegaste tarde». El 400 tiene que ganar.
    const r = await request(app.getHttpServer())
      .post(encUrl())
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ characterIds: [pc1Id], sides: { [pc2Id]: "ENEMY" } });
    expect(r.status).toBe(400);
  });

  it("y queda escrito en la línea de tiempo, visible para el jugador", async () => {
    const log = await request(app.getHttpServer())
      .get(`/campaigns/${campaignId}/events`)
      .set("Authorization", `Bearer ${tokenPL}`);
    const suceso = log.body.events.find((e: { type: string }) => e.type === "ENCOUNTER_STARTED");
    expect(suceso).toBeDefined();
    expect(suceso.payload).toMatchObject({ encounterId });

    // **Y NO lleva cuántos son.** La versión anterior de esta prueba afirmaba
    // `combatantCount: 8` con el token del JUGADOR, o sea que consagraba la fuga en vez de
    // cazarla: de «ocho» menos «los dos míos» salen seis enemigos escondidos que la ficha del
    // encuentro sí filtra.
    expect(suceso.payload.combatantCount).toBeUndefined();
    expect(suceso.payload.positionCount).toBeUndefined();
  });

  // La otra mitad de la misma fuga, y la que la revisión llamó crítica: **la tirada de
  // iniciativa de un PNJ escondido no puede salir en la línea de tiempo del jugador.** Iba con
  // `audience: "PUBLIC"` fija, así que el jugador veía una tirada de «Iniciativa» de un sujeto
  // que no conoce, con su total y su modificador dentro.
  it("la iniciativa de un PNJ que el jugador no ve NO aparece en su línea de tiempo", async () => {
    const log = await request(app.getHttpServer())
      .get(`/campaigns/${campaignId}/events`)
      .set("Authorization", `Bearer ${tokenPL}`);
    expect(log.status).toBe(200);

    const iniciativas = log.body.events.filter(
      (e: { type: string; payload: { label?: string } }) =>
        e.type === "ABILITY_ROLL" && e.payload.label === "Iniciativa",
    );
    // Ve las de los dos personajes de la mesa, y ninguna más: la del grupo de goblins no.
    const sujetos = new Set(iniciativas.map((e: { subjectId: string }) => e.subjectId));
    for (const goblinId of goblinIds) expect(sujetos.has(goblinId)).toBe(false);

    // Y se comprueba **sobre el cuerpo serializado**, no sobre los sujetos: un identificador de
    // goblin no puede aparecer por ningún otro camino.
    const serializado = JSON.stringify(log.body);
    for (const goblinId of goblinIds) expect(serializado).not.toContain(goblinId);
  });

  it("**la base, no el servicio, impide un segundo encuentro activo en la misma sesión**", async () => {
    // Se salta el servicio a propósito: es la única forma de comprobar que la garantía es de
    // Postgres (índice único parcial) y no solo la comprobación previa del servicio, que el
    // Prisma simulado de las unitarias no puede validar.
    await expect(
      prisma.encounter.create({ data: { sessionId, status: "ACTIVE" } }),
    ).rejects.toThrow();
  });

  it("y el servicio también lo rechaza, con un 409 legible", async () => {
    const r = await request(app.getHttpServer())
      .post(encUrl())
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ characterIds: [pc1Id] });
    expect(r.status).toBe(409);
  });

  // **La restricción cambió, y el motivo está en el mensaje del commit.** Aquí se probaba que
  // «dos combatientes no comparten posición», que es justo lo que el SRD SÍ quiere para un grupo
  // de criaturas idénticas. Lo que la base puede y debe garantizar es lo otro: que **un
  // personaje no aparece dos veces en el mismo encuentro**.
  it("**la base impide que un personaje entre dos veces en el mismo encuentro**", async () => {
    // Se salta el servicio a propósito: la garantía es de Postgres, y el Prisma simulado de las
    // unitarias no valida SQL.
    await expect(
      prisma.combatant.create({
        data: { encounterId, characterId: pc1Id, initiative: 1, groupKey: "otra", position: 99 },
      }),
    ).rejects.toThrow();
  });

  // Y la cara positiva de la misma restricción: compartir posición **sí** se puede, porque es lo
  // que hace que un grupo actúe a la vez.
  it("y en cambio SÍ deja a dos combatientes distintos compartir posición", async () => {
    const goblins = await prisma.combatant.findMany({
      where: { encounterId, characterId: { in: goblinIds } },
    });
    expect(goblins).toHaveLength(6);
    expect(new Set(goblins.map((g) => g.position)).size).toBe(1);
  });

  it("el DM corrige un número de iniciativa y el orden se recoloca con él", async () => {
    const combatiente = (
      await request(app.getHttpServer())
        .get(encUrl(`/${encounterId}`))
        .set("Authorization", `Bearer ${tokenDM}`)
    ).body.combatants.find((c: { characterId: string }) => c.characterId === pc1Id);

    // **30 y no 99.** La primera versión de esta prueba mandaba 99 y exigía un 200; el esquema
    // acota la iniciativa a `[-20, 60]`, así que el servidor contestaba **400 y tenía razón**.
    // Se le escapó por no correr los e2e: la unitaria no ve el pipe de validación. 30 está
    // dentro del rango y sigue siendo un número que ninguna tirada habría sacado sola, que es
    // lo que hace visible la corrección del DM.
    const r = await request(app.getHttpServer())
      .patch(encUrl(`/${encounterId}/combatants/${combatiente.id}`))
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ initiative: 30 });
    expect(r.status).toBe(200);
    expect(r.body.initiative).toBe(30);
    // **Y el orden se recoloca.** 30 es más que cualquier tirada de este encuentro, así que
    // quien lo recibe pasa al frente. La versión anterior exigía que la posición **no** se
    // tocara, y era cierto — pero `advanceTurn` ordena solo por `position`, así que corregir el
    // número no cambiaba nada del juego y la única razón por la que el SRD deja editarlo
    // —deshacer un empate— no se cumplía.
    expect(r.body.position).toBe(0);
  });

  // Y la mitad que faltaba, que es la que el fallo de arriba dejó al descubierto: **el límite
  // del esquema es de verdad**, y un número imposible no se guarda con un 500 ni en silencio.
  it("una iniciativa fuera del rango del esquema es 400, no un 500 ni un guardado callado", async () => {
    const combatiente = (
      await request(app.getHttpServer())
        .get(encUrl(`/${encounterId}`))
        .set("Authorization", `Bearer ${tokenDM}`)
    ).body.combatants.find((c: { characterId: string }) => c.characterId === pc1Id);

    const r = await request(app.getHttpServer())
      .patch(encUrl(`/${encounterId}/combatants/${combatiente.id}`))
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ initiative: 99 });
    expect(r.status).toBe(400);

    // Y no dejó rastro: el valor de antes sigue ahí.
    const despues = (
      await request(app.getHttpServer())
        .get(encUrl(`/${encounterId}`))
        .set("Authorization", `Bearer ${tokenDM}`)
    ).body.combatants.find((c: { id: string }) => c.id === combatiente.id);
    expect(despues.initiative).toBe(30);
  });

  // Tarea 5 (I-1 de la ronda de arreglo): la unitaria con Prisma simulado no puede cazar C-1
  // (`where` sin `sessionId`) porque su `findMany`/`updateMany` de mentira ignoran ese filtro —
  // solo Postgres real lo hace cumplir.
  it("el DM corrige el bando de un combatiente con el combate en marcha", async () => {
    const combatiente = (
      await request(app.getHttpServer())
        .get(encUrl(`/${encounterId}`))
        .set("Authorization", `Bearer ${tokenDM}`)
    ).body.combatants.find((c: { characterId: string }) => c.characterId === pc1Id);

    const r = await request(app.getHttpServer())
      .patch(encUrl(`/${encounterId}/combatants/${combatiente.id}/side`))
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ side: "ENEMY" });
    expect(r.status).toBe(200);
    const cambiado = r.body.combatants.find((c: { id: string }) => c.id === combatiente.id);
    expect(cambiado.side).toBe("ENEMY");
  });

  it("el bando de un combatiente de OTRA campaña es 404, y la fila ajena queda intacta (C-1 de la revisión)", async () => {
    const s = app.getHttpServer();
    const emailDM2 = `dm-enc-ajena${Date.now()}@b.com`;
    const tokenDM2 = (
      await request(s)
        .post("/auth/register")
        .send({ email: emailDM2, password: "password123", displayName: "DM ajeno" })
    ).body.token;
    const campaignId2 = (
      await request(s)
        .post("/campaigns")
        .set("Authorization", `Bearer ${tokenDM2}`)
        .send({ name: "Otra mesa" })
    ).body.id;
    const sessionId2 = (
      await request(s)
        .post(`/campaigns/${campaignId2}/sessions`)
        .set("Authorization", `Bearer ${tokenDM2}`)
        .send({ title: "Otra sesión", visibility: "PLAYERS" })
    ).body.id;
    const goblinAjeno = await request(s)
      .post(`/campaigns/${campaignId2}/npcs`)
      .set("Authorization", `Bearer ${tokenDM2}`)
      .send({ ref: "SRD:goblin", count: 1, hp: "AVERAGE" });
    expect(goblinAjeno.status).toBe(201);
    const encuentroAjeno = await request(s)
      .post(`/campaigns/${campaignId2}/sessions/${sessionId2}/encounters`)
      .set("Authorization", `Bearer ${tokenDM2}`)
      .send({ characterIds: [goblinAjeno.body[0].id] });
    expect(encuentroAjeno.status).toBe(201);
    const combatienteAjeno = encuentroAjeno.body.combatants[0];

    // El DM de la PRIMERA campaña, con SU PROPIA sesión válida en la URL (sessionId, campaignId),
    // manda el par encounterId/combatantId de la SEGUNDA. Con `sessionId` decorativo, esta
    // escritura se confirmaba antes de que `get()` devolviera el 404.
    const r = await request(s)
      .patch(encUrl(`/${encuentroAjeno.body.id}/combatants/${combatienteAjeno.id}/side`))
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ side: "ENEMY" });
    expect(r.status).toBe(404);

    // Y la fila ajena sigue intacta. **Sin esta relectura la prueba pasaría igual con el
    // fallo**: hoy también devuelve 404 — la diferencia es que antes del arreglo ya había
    // mutado antes de contestarlo.
    const filaAjena = await prisma.combatant.findUnique({ where: { id: combatienteAjeno.id } });
    expect(filaAjena?.side).toBe(combatienteAjeno.side);

    await prisma.campaign.deleteMany({ where: { id: campaignId2 } });
    await prisma.user.deleteMany({ where: { email: emailDM2 } });
  });

  it("un jugador ve la lista de combate, pero NO los goblins que el DM no ha revelado", async () => {
    const r = await request(app.getHttpServer())
      .get(encUrl(`/${encounterId}`))
      .set("Authorization", `Bearer ${tokenPL}`);
    expect(r.status).toBe(200);
    const ids = r.body.combatants.map((c: { characterId: string }) => c.characterId);
    expect(ids.sort()).toEqual([pc1Id, pc2Id].sort());
  });

  it("**pasar de turno recorre el orden y sube de asalto al llegar al final — y avanza el reloj seis segundos**", async () => {
    const s = app.getHttpServer();

    // El reloj de campaña empieza a cero.
    const relojInicial = await request(s)
      .get(`/campaigns/${campaignId}/clock`)
      .set("Authorization", `Bearer ${tokenDM}`);
    expect(relojInicial.body.seconds).toBe(0);

    // **TRES entradas de orden, sí — eso es estructural** (dos personajes son dos grupos de uno,
    // los seis goblins uno solo: SRD, «each member of the group acts at the same time»). **Los
    // pases hasta el fin de asalto NO son una constante de esta prueba**, y dejaron de serlo con
    // la tarea 5: `setInitiative`, con el combate `ACTIVE`, sigue el turno por IDENTIDAD cuando
    // recoloca (ronda de arreglo — un DM que corrige a otro combatiente que no tenía el turno
    // puede desplazar `activePosition` de la posición 0 a la 1 o a la 2, si a quien tenía el
    // turno le tocó otro puesto). De qué tirada real salió cada iniciativa decide DESDE dónde se
    // cuenta, así que se calcula, no se supone.
    const antes = await request(s)
      .get(encUrl(`/${encounterId}`))
      .set("Authorization", `Bearer ${tokenDM}`);
    const posicionesDistintas = [
      ...new Set(antes.body.combatants.map((c: { position: number }) => c.position)),
    ].sort((a, b) => (a as number) - (b as number)) as number[];
    expect(posicionesDistintas).toHaveLength(3);
    const indiceActual = posicionesDistintas.indexOf(antes.body.activePosition);
    const pasesHastaFinDeAsalto = posicionesDistintas.length - indiceActual;

    let ultimo: request.Response | null = null;
    for (let i = 0; i < pasesHastaFinDeAsalto; i++) {
      ultimo = await request(s)
        .post(encUrl(`/${encounterId}/advance-turn`))
        .set("Authorization", `Bearer ${tokenDM}`);
      expect(ultimo.status).toBe(201);
    }
    expect(ultimo!.body.round).toBe(2);
    expect(ultimo!.body.roundAdvanced).toBe(true);

    // Un asalto son seis segundos (D-2C-1), y es EXACTAMENTE ese contador el que sube.
    const relojTrasVuelta = await request(s)
      .get(`/campaigns/${campaignId}/clock`)
      .set("Authorization", `Bearer ${tokenDM}`);
    expect(relojTrasVuelta.body.seconds).toBe(6);

    const log = await request(s)
      .get(`/campaigns/${campaignId}/events`)
      .set("Authorization", `Bearer ${tokenPL}`);
    expect(
      log.body.events.filter((e: { type: string }) => e.type === "TURN_ADVANCED"),
    ).toHaveLength(pasesHastaFinDeAsalto);
    const subida = log.body.events.find((e: { type: string }) => e.type === "ROUND_ADVANCED");
    expect(subida).toBeDefined();
    expect(subida.payload).toMatchObject({ from: 1, to: 2, clockSeconds: 6 });
  });

  it(
    "**y una condición de un asalto, puesta antes de la vuelta, ya está caducada al terminarla — " +
      "sin que nadie la haya tocado**",
    async () => {
      const s = app.getHttpServer();
      // El reloj está a 6 tras la prueba anterior. Se aplica una condición que dura un asalto
      // más (6 segundos): vence exactamente cuando se complete la próxima vuelta.
      //
      // **La aplica el DM, y desde el 2026-09-06 no es indiferente quién** (paso 1, tarea 1): una
      // condición del SRD ya no la escribe un jugador sobre su propio personaje, porque el motor
      // las lee para decidir tiradas. Lo que esta prueba mide —que vence sola al pasar el reloj—
      // no depende de quién la puso, así que se cambia el token y nada más.
      await request(s)
        .put(`/campaigns/${campaignId}/characters/${pc1Id}/conditions/poisoned`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ durationSeconds: 6 });

      const antes = await request(s)
        .get(`/campaigns/${campaignId}/characters/${pc1Id}/conditions`)
        .set("Authorization", `Bearer ${tokenPL}`);
      const envenenadoAntes = antes.body.find((c: { key: string }) => c.key === "poisoned");
      expect(envenenadoAntes).toBeDefined();
      expect(envenenadoAntes.expired).toBe(false);

      for (let i = 0; i < 8; i++) {
        await request(s)
          .post(encUrl(`/${encounterId}/advance-turn`))
          .set("Authorization", `Bearer ${tokenDM}`);
      }

      const despues = await request(s)
        .get(`/campaigns/${campaignId}/characters/${pc1Id}/conditions`)
        .set("Authorization", `Bearer ${tokenPL}`);
      const envenenadoDespues = despues.body.find((c: { key: string }) => c.key === "poisoned");
      expect(envenenadoDespues).toBeDefined();
      // **No hay columna `expired`**: sigue siendo una resta contra el reloj (2C.4). Aquí lo
      // importante es que la resta ya la deja del lado de "vencida" — nadie la ha tocado.
      expect(envenenadoDespues.expired).toBe(true);

      const log = await request(s)
        .get(`/campaigns/${campaignId}/events`)
        .set("Authorization", `Bearer ${tokenPL}`);
      const vencida = log.body.events.find(
        (e: { type: string; payload: { key?: string } }) =>
          e.type === "CONDITION_EXPIRED" && e.payload.key === "poisoned",
      );
      expect(vencida).toBeDefined();
    },
  );

  it("un jugador no puede pasar turno (403)", async () => {
    const r = await request(app.getHttpServer())
      .post(encUrl(`/${encounterId}/advance-turn`))
      .set("Authorization", `Bearer ${tokenPL}`);
    expect(r.status).toBe(403);
  });

  it("corregir el bando deja suceso, y dice de qué lado a cuál (paso 1, tarea 16)", async () => {
    // **`setSide` no escribía nada**, así que una segunda pestaña no se enteraba hasta refrescar:
    // el canal en vivo se alimenta de sucesos, no de sondeo.
    const s = app.getHttpServer();
    const encuentro = await request(s)
      .get(encUrl(`/${encounterId}`))
      .set("Authorization", `Bearer ${tokenDM}`);
    const combatiente = encuentro.body.combatants.find(
      (c: { characterId: string }) => c.characterId === pc1Id,
    );
    const bandoAntes = combatiente.side;
    const bandoNuevo = bandoAntes === "ALLY" ? "ENEMY" : "ALLY";

    await request(s)
      .patch(encUrl(`/${encounterId}/combatants/${combatiente.id}/side`))
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ side: bandoNuevo })
      .expect(200);

    const log = await request(s)
      .get(`/campaigns/${campaignId}/events`)
      .query({ limit: 50 })
      .set("Authorization", `Bearer ${tokenPL}`);
    const suceso = log.body.events.find(
      (e: { type: string }) => e.type === "COMBATANT_SIDE_CHANGED",
    );
    expect(suceso).toBeDefined();
    expect(suceso.payload).toMatchObject({ from: bandoAntes, to: bandoNuevo });
    // **El jugador lo ve**: si el suceso fuera del DM, la segunda pestaña seguiría sin enterarse.
    expect(suceso.visibility).toBe("PLAYERS");
  });

  it("y corregirlo al MISMO bando no escribe un suceso de nada", async () => {
    const s = app.getHttpServer();
    const encuentro = await request(s)
      .get(encUrl(`/${encounterId}`))
      .set("Authorization", `Bearer ${tokenDM}`);
    const combatiente = encuentro.body.combatants.find(
      (c: { characterId: string }) => c.characterId === pc1Id,
    );

    const antes = (
      await request(s)
        .get(`/campaigns/${campaignId}/events`)
        .query({ limit: 50 })
        .set("Authorization", `Bearer ${tokenDM}`)
    ).body.events.filter((e: { type: string }) => e.type === "COMBATANT_SIDE_CHANGED").length;

    await request(s)
      .patch(encUrl(`/${encounterId}/combatants/${combatiente.id}/side`))
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ side: combatiente.side })
      .expect(200);

    const despues = (
      await request(s)
        .get(`/campaigns/${campaignId}/events`)
        .query({ limit: 50 })
        .set("Authorization", `Bearer ${tokenDM}`)
    ).body.events.filter((e: { type: string }) => e.type === "COMBATANT_SIDE_CHANGED").length;
    expect(despues).toBe(antes);
  });

  // Paso 2, tarea A2 — gastar la economía del turno. Lo unitario ya prueba el aviso y el 403 de
  // ownership con un Prisma simulado; esto prueba lo que aquel no puede: el pipe de Zod de
  // verdad (`cantidad` obligatoria con `MOVEMENT`), y que la escritura persiste en Postgres.
  describe("gastar() (paso 2, tarea A2)", () => {
    let combatantePc1Id = "";

    beforeAll(async () => {
      const encuentro = await request(app.getHttpServer())
        .get(encUrl(`/${encounterId}`))
        .set("Authorization", `Bearer ${tokenDM}`);
      combatantePc1Id = encuentro.body.combatants.find(
        (c: { characterId: string }) => c.characterId === pc1Id,
      ).id;
    });

    it("el dueño gasta su acción, y la segunda vez avisa en vez de rechazar (200, no 409)", async () => {
      const s = app.getHttpServer();
      const primero = await request(s)
        .patch(encUrl(`/${encounterId}/combatants/${combatantePc1Id}/spend`))
        .set("Authorization", `Bearer ${tokenPL}`)
        .send({ coste: "ACTION" });
      expect(primero.status).toBe(200);
      expect(primero.body).toMatchObject({ excedido: false });
      expect(primero.body.economia.actionUsed).toBe(true);

      // **La doctrina de verdad, contra Postgres.** Gastar dos veces no es un 409: se registra,
      // se avisa y se deja pasar — bloquear sería el servidor arbitrando la mesa.
      const segundo = await request(s)
        .patch(encUrl(`/${encounterId}/combatants/${combatantePc1Id}/spend`))
        .set("Authorization", `Bearer ${tokenPL}`)
        .send({ coste: "ACTION" });
      expect(segundo.status).toBe(200);
      expect(segundo.body.excedido).toBe(true);
      expect(segundo.body.economia.actionUsed).toBe(true);
    });

    it("MOVEMENT sin `cantidad` es 400: el pipe de Zod lo exige de verdad", async () => {
      const r = await request(app.getHttpServer())
        .patch(encUrl(`/${encounterId}/combatants/${combatantePc1Id}/spend`))
        .set("Authorization", `Bearer ${tokenPL}`)
        .send({ coste: "MOVEMENT" });
      expect(r.status).toBe(400);
    });

    it("un jugador no gasta por el combatiente de otro (403, contra Postgres real)", async () => {
      const encuentro = await request(app.getHttpServer())
        .get(encUrl(`/${encounterId}`))
        .set("Authorization", `Bearer ${tokenDM}`);
      const combatienteAjeno = encuentro.body.combatants.find(
        (c: { characterId: string }) => c.characterId === pc2Id,
      );

      // tokenPL es dueño de pc1 y pc2 en esta suite (los creó todos el mismo jugador), así que
      // para probar el 403 de verdad hace falta un TERCER usuario sin ningún personaje propio.
      const s = app.getHttpServer();
      const emailAjeno = `pl-enc-ajeno${Date.now()}@b.com`;
      const tokenAjeno = (
        await request(s)
          .post("/auth/register")
          .send({ email: emailAjeno, password: "password123", displayName: "Ajeno" })
      ).body.token;
      const invite = (
        await request(s)
          .post(`/campaigns/${campaignId}/invites`)
          .set("Authorization", `Bearer ${tokenDM}`)
      ).body.token;
      await request(s)
        .post(`/invites/${invite}/accept`)
        .set("Authorization", `Bearer ${tokenAjeno}`);

      const r = await request(s)
        .patch(encUrl(`/${encounterId}/combatants/${combatienteAjeno.id}/spend`))
        .set("Authorization", `Bearer ${tokenAjeno}`)
        .send({ coste: "ACTION" });
      expect(r.status).toBe(403);

      // Y no dejó rastro: la fila ajena sigue como estaba.
      const filaAjena = await prisma.combatant.findUnique({ where: { id: combatienteAjeno.id } });
      expect(filaAjena?.actionUsed).toBe(false);

      await prisma.user.deleteMany({ where: { email: emailAjeno } });
    });

    it("y queda escrito en la línea de tiempo, con el coste y si avisó", async () => {
      const log = await request(app.getHttpServer())
        .get(`/campaigns/${campaignId}/events`)
        .query({ limit: 50 })
        .set("Authorization", `Bearer ${tokenPL}`);
      const sucesos = log.body.events.filter((e: { type: string }) => e.type === "ACTION_SPENT");
      expect(sucesos.length).toBeGreaterThanOrEqual(2);
      expect(sucesos[0].payload).toMatchObject({ coste: "ACTION" });
      // Uno avisó y el otro no: es exactamente la doctrina «se registra, se avisa, se deja
      // pasar» — los dos sucesos existen, no solo el primero.
      const avisos = new Set(
        sucesos.map((e: { payload: { excedido: boolean } }) => e.payload.excedido),
      );
      expect(avisos.has(true)).toBe(true);
      expect(avisos.has(false)).toBe(true);
    });
  });
});
