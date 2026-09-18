import { test, expect, type Browser, type Locator, type Page } from "@playwright/test";

// Task 7 de 3A.2 («elegir, lanzar y usar») — «Lanzar» desde la pestaña Conjuros, medido en un
// navegador de verdad, con dos contextos reales (DM y jugadora): objetivos, espacio superior, y
// que el resultado (aviso, veredicto, tarjeta de daño pendiente) llega al hilo de los dos.
//
// **NO se ejecuta en esta ficha** (regla del encargo, D-CF-65): lo corre el orquestador. Copia
// los mismos ayudantes que `puerta-de-efectos.spec.ts` (dos contextos, goblin instanciado y
// revelado por la API, CA anulada a 1 por la UI de «Anulaciones») y `combate.spec.ts` (entrar en
// combate) y `furia.spec.ts` (abrir «Tu hoja» desde la mesa).
//
// **Ruling: «Descarga de fuego» (`fire-bolt`), no «Rayo de fuego».** Mismo motivo que ya dejó
// escrito `conjuros.spec.ts` (Task 6): el catálogo sembrado sirve «Descarga de fuego», nunca
// «Rayo de fuego» — comprobado contra `apps/api/src/rules/catalog/spell-activities.ts`.

test.setTimeout(240_000);

function nuevaCuenta(prefijo: string) {
  const marca = `${Date.now()}${Math.floor(Math.random() * 1_000_000)}`;
  return {
    email: `lanzar-${prefijo}-${marca}@example.com`,
    password: "password123",
    displayName: `${prefijo} ${marca}`,
  };
}

async function registrarse(page: Page, prefijo: string) {
  const cuenta = nuevaCuenta(prefijo);
  await page.goto("/register");
  await page.getByLabel("Nombre").fill(cuenta.displayName);
  await page.getByLabel("Correo").fill(cuenta.email);
  await page.getByLabel("Contraseña").fill(cuenta.password);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByRole("heading", { name: "Tus crónicas" })).toBeVisible();
  return cuenta;
}

/** Mismo patrón que `puerta-de-efectos.spec.ts` e `combate.spec.ts`: pedirle a la API
 *  directamente lo que la interfaz tardaría media suite en montar. */
async function comoLaSesion(page: Page) {
  const token = await page.evaluate(() => window.localStorage.getItem("dnd_token"));
  return { Authorization: `Bearer ${token}` };
}

async function crearCampana(page: Page, nombre: string) {
  await page.getByRole("button", { name: "Nueva campaña" }).first().click();
  await page.getByLabel("Nombre").fill(nombre);
  await page.getByRole("button", { name: "Crear" }).click();
  await page.getByRole("link", { name: nombre }).click();
  await expect(page.getByRole("heading", { name: nombre })).toBeVisible();
  return page.url().split("/campaigns/")[1].split(/[/?]/)[0];
}

async function generarInvitacion(page: Page): Promise<string> {
  await page.getByRole("tab", { name: "Ajustes" }).click();
  await page.getByRole("button", { name: "Generar invitación" }).click();
  return page.getByLabel("Enlace de invitación").inputValue();
}

async function unirseDesdeInvitacion(page: Page, enlace: string, prefijo: string) {
  await page.goto(enlace);
  await page.getByRole("link", { name: "Crear cuenta" }).click();
  const cuenta = nuevaCuenta(prefijo);
  await page.getByLabel("Nombre").fill(cuenta.displayName);
  await page.getByLabel("Correo").fill(cuenta.email);
  await page.getByLabel("Contraseña").fill(cuenta.password);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await page.getByRole("button", { name: "Unirse a la campaña" }).click();
}

async function empezarSesion(page: Page, titulo: string) {
  await page.getByRole("tab", { name: "Sesiones" }).click();
  await page.getByRole("button", { name: "Nueva sesión" }).click();
  await page.getByLabel("Título").fill(titulo);
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("button", { name: "Guardar" })).toBeHidden();
  await page.getByRole("button", { name: "Empezar" }).click();
  await page.getByRole("button", { name: "Empezar la sesión" }).click();
  await expect(page.getByRole("status", { name: "Sesión en curso" })).toBeVisible({
    timeout: 10_000,
  });
}

async function abrirLaMesa(page: Page, campaignId: string) {
  await page.goto(`/campaigns/${campaignId}/sesion`);
  await expect(page.getByRole("banner", { name: "Estado de la mesa" })).toBeVisible({
    timeout: 10_000,
  });
}

async function abrirPestana(donde: Page | Locator, nombre: string) {
  await donde.getByRole("tab", { name: nombre }).click();
  await expect(donde.getByRole("tab", { name: nombre, selected: true })).toBeVisible();
}

/**
 * La maga, montada por la API hasta donde la interfaz no aporta nada nuevo a esta prueba (mismo
 * atajo que `conjuros.spec.ts`, Task 6): una hoja de nivel 1 (INT 16, mod +3) con `class: wizard`
 * — eso dispara `sembrarLibro` (D-CF-125) y deja los seis conjuros de nivel 1 `EN_EL_LIBRO`, entre
 * ellos «Proyectil mágico» — y luego el DM la sube a **nivel 3** (D-CF-66: el nivel lo fija el DM,
 * `PATCH characters/:id`, nunca `/sheet`). A nivel 3 hay espacios de nivel 1 Y de nivel 2, así que
 * el selector de espacio de `LanzarConjuro` tiene algo que ofrecer. Por último, «Proyectil mágico»
 * se prepara y «Descarga de fuego» (un truco, se conoce sin más) se aprende — los dos por
 * `PUT …/spellbook/:key`, la misma puerta que usa la pantalla.
 */
async function montarMaga(dm: Page, jugadora: Page, campaignId: string, nombre: string) {
  await jugadora.getByRole("button", { name: "Personajes" }).click();
  await jugadora.getByRole("button", { name: "Nuevo personaje" }).click();
  await jugadora.getByLabel("Nombre").fill(nombre);
  await jugadora.getByRole("button", { name: "Guardar" }).click();
  await expect(jugadora.getByRole("button", { name: "Guardar" })).toBeHidden();
  await jugadora.getByRole("link", { name: new RegExp(nombre) }).click();
  await expect(jugadora.getByRole("heading", { name: nombre })).toBeVisible();
  const characterId = jugadora.url().split("/personajes/")[1].split(/[/?]/)[0];

  // **Fix round 3: el nivel se fija ANTES que la clase.** `sembrarRecursos` (espacios de
  // conjuro, dados de golpe) se llama al final de `PATCH .../sheet` con el nivel del personaje
  // EN ESE MOMENTO (`character-sheet.service.ts`) — si la clase se fija primero (nivel 1) y el
  // nivel sube después con un `PATCH characters/:id` suelto, ese segundo `PATCH` no vuelve a
  // sembrar nada (solo lo hacen `PATCH .../sheet` y «Subir de nivel»), y el personaje se queda
  // con los espacios de un mago de nivel 1 —dos de nivel 1, ninguno de nivel 2— aunque su hoja
  // diga nivel 3. El orquestador lo cazó en una captura: «Espacios de conjuro: Nivel 1: 2/2 ·
  // Nivel 2: 2» (el «2» de nivel 2 sin «/2» detrás es `sheet.spellSlots` cayendo a `s.slots`, el
  // tope del catálogo, porque no hay fila `CharacterResource` real que leer —
  // `pestanas/Conjuros.tsx`). Fijando el nivel primero, `sembrarLibro`/`sembrarRecursos` ven
  // nivel 3 desde el principio. **Nota para el cierre**: esto es un fallo real del producto
  // (`PATCH characters/:id` del DM no re-siembra recursos), anotado en el informe de esta tarea
  // para que pase a `docs/06-pendientes.md` — no se arregla en esta ficha.
  const headersDm = await comoLaSesion(dm);
  const subida = await dm.request.patch(`/api/campaigns/${campaignId}/characters/${characterId}`, {
    headers: headersDm,
    data: { level: 3 },
  });
  expect(subida.ok()).toBe(true);

  const headersJugadora = await comoLaSesion(jugadora);
  const hoja = await jugadora.request.patch(
    `/api/campaigns/${campaignId}/characters/${characterId}/sheet`,
    {
      headers: headersJugadora,
      data: {
        abilities: { str: 8, dex: 14, con: 12, int: 16, wis: 12, cha: 10 },
        race: { source: "SRD", key: "human" },
        class: { source: "SRD", key: "wizard" },
        choices: { "wizard-skills": ["arcana", "history"] },
      },
    },
  );
  expect(hoja.ok()).toBe(true);

  const preparar = await jugadora.request.put(
    `/api/campaigns/${campaignId}/characters/${characterId}/spellbook/magic-missile`,
    { headers: headersJugadora, data: { estado: "PREPARADO" } },
  );
  expect(preparar.ok()).toBe(true);

  const conocer = await jugadora.request.put(
    `/api/campaigns/${campaignId}/characters/${characterId}/spellbook/fire-bolt`,
    { headers: headersJugadora, data: { estado: "CONOCIDO" } },
  );
  expect(conocer.ok()).toBe(true);

  await jugadora.reload();
  return characterId;
}

/**
 * El goblin, instanciado y revelado por la API (mismo endpoint que la pantalla del bestiario
 * llama) — la CA anulada a 1 se hace por la interfaz, exactamente como `puerta-de-efectos.spec.ts`
 * (§4 bis): la prueba mide el lanzamiento, no la probabilidad de impactar.
 *
 * **Fix round 1: también se le anulan los PG máximos, y se cura hasta ahí.** Los 7 PG medios del
 * goblin no sobreviven al Proyectil mágico (3 dardos de 1d4+1, ~10,5 de media) que este mismo
 * fichero le tira antes del segundo lanzamiento — y el propio recorrido pide aplicar ESE daño
 * («el DM aplica y los PG bajan») antes de lanzar Descarga de fuego. Overriding solo
 * `maxHp` no basta (`changeHpEnTransaccion` fija el candado en `character.currentHp`, que sigue
 * en 7; el override solo sube el TECHO): hace falta además un `changeHp` (delta positivo, la
 * misma ruta que usa «Recibo daño»/«Curar») que se aplica DESPUÉS de la anulación y clampa contra
 * el `maxHp` ya anulado — mismo criterio que ya deja escrito `character-sheet.service.ts` sobre
 * por qué una anulación de `maxHp` tiene que gobernar también la curación.
 *
 * **Fix round 1, segundo motivo del mismo cambio**: `empezarSesion` esperaba la pestaña
 * «Sesiones» de la página de la CAMPAÑA, pero esta función dejaba al DM en la página del
 * PERSONAJE Goblin (`/personajes/:goblinId`, pestaña «Estado») — esa página tiene sus propias
 * pestañas (Números/Objetos/Ataques/…) y ninguna «Sesiones». Por eso el test se quedaba
 * esperando 240 s un tab que nunca iba a aparecer ahí. `montarGoblin` ahora deja al DM otra vez
 * en `/campaigns/:id` antes de devolver el control — mismo patrón que
 * `puerta-de-efectos.spec.ts:318` hace justo después de la misma anulación.
 */
async function montarGoblin(dm: Page, campaignId: string) {
  const headersDm = await comoLaSesion(dm);
  const instanciado = await dm.request.post(`/api/campaigns/${campaignId}/npcs`, {
    headers: headersDm,
    data: { ref: "SRD:goblin", count: 1, hp: "AVERAGE" },
  });
  expect(instanciado.ok()).toBe(true);
  const [goblin] = await instanciado.json();
  const goblinId: string = goblin.id;

  const revelado = await dm.request.post(
    `/api/campaigns/${campaignId}/characters/${goblinId}/reveal`,
    { headers: headersDm },
  );
  expect(revelado.ok()).toBe(true);

  await dm.goto(`/campaigns/${campaignId}/personajes/${goblinId}`);
  await expect(dm.getByRole("heading", { name: "Goblin" })).toBeVisible();
  await abrirPestana(dm, "Estado");
  const anulaciones = dm.getByRole("region", { name: "anulaciones del DM" });
  await anulaciones.getByLabel("Valor a anular").selectOption({ label: "Clase de armadura" });
  await anulaciones.getByLabel("Nuevo valor").fill("1");
  await anulaciones.getByRole("button", { name: "Anular" }).click();
  await expect(anulaciones.getByText(/Clase de armadura: fijada a 1/)).toBeVisible();

  await anulaciones.getByLabel("Valor a anular").selectOption({ label: "Puntos de golpe máximos" });
  await anulaciones.getByLabel("Nuevo valor").fill("60");
  await anulaciones.getByRole("button", { name: "Anular" }).click();
  await expect(anulaciones.getByText(/Puntos de golpe máximos: fijada a 60/)).toBeVisible();

  const curado = await dm.request.post(`/api/campaigns/${campaignId}/characters/${goblinId}/hp`, {
    headers: headersDm,
    data: { delta: 9999, reason: "Fix round 1: aguanta los dos hechizos" },
  });
  expect(curado.ok()).toBe(true);

  await dm.goto(`/campaigns/${campaignId}`);
  await expect(dm.getByRole("heading", { name: "La torre bajo asedio" })).toBeVisible();

  return goblinId;
}

test("lanzar desde la pestaña Conjuros: objetivos, espacio superior y avisos, con el DM aplicando el daño", async ({
  browser,
}: {
  browser: Browser;
}) => {
  const dmContext = await browser.newContext();
  const magaContext = await browser.newContext();
  const dm = await dmContext.newPage();
  const maga = await magaContext.newPage();

  await registrarse(dm, "dm");
  const campaignId = await crearCampana(dm, "La torre bajo asedio");

  const enlace = await generarInvitacion(dm);
  await unirseDesdeInvitacion(maga, enlace, "maga");
  await expect(maga.getByRole("heading", { name: "La torre bajo asedio" })).toBeVisible();

  await montarMaga(dm, maga, campaignId, "Seraphine Tintanoche");
  await montarGoblin(dm, campaignId);

  await empezarSesion(dm, "El asedio empieza");
  await abrirLaMesa(dm, campaignId);
  await abrirLaMesa(maga, campaignId);

  // --- Entrar en combate: la maga y el goblin ---
  //
  // Fix round 2: la maga es «ajena» al DM (de la jugadora, no del DM que pulsa el diálogo), así
  // que el encuentro nace `PREPARING` (`encounters.service.ts`, `ajenos.length > 0 ?
  // "PREPARING" : "ACTIVE"`) — no `ACTIVE` directo como en `combate.spec.ts`, donde el mismo DM
  // es dueño de los dos combatientes. Hace falta que la maga tire su propia iniciativa desde su
  // navegador para que el encuentro pase a `ACTIVE` — mismo camino que
  // `iniciativa-en-vivo.spec.ts` y `puerta-de-efectos.spec.ts` (Kara, también «ajena»).
  await dm.getByRole("button", { name: "Entrar en combate" }).click();
  const dialogoDeCombate = dm.getByRole("dialog", { name: "Entrar en combate" });
  await dialogoDeCombate.getByRole("checkbox", { name: /Seraphine/ }).click();
  await dialogoDeCombate.getByRole("checkbox", { name: /Goblin/ }).click();
  await dialogoDeCombate.getByRole("button", { name: "Pedir iniciativa" }).click();

  await expect(maga.getByText("EMPIEZA EL COMBATE")).toBeVisible({ timeout: 15_000 });
  await maga.getByRole("button", { name: "Tirar iniciativa" }).click();

  await expect(dm.getByRole("region", { name: "Orden de turnos" })).toBeVisible({
    timeout: 15_000,
  });
  await expect(maga.getByRole("region", { name: "Orden de turnos" })).toBeVisible({
    timeout: 15_000,
  });

  // --- La maga abre «Tu hoja» desde la mesa, pestaña Conjuros ---
  await maga.getByRole("button", { name: /^Hoja/ }).click();
  const cajon = maga.getByRole("dialog", { name: "Tu hoja" });
  await expect(cajon).toBeVisible();
  await abrirPestana(cajon, "Conjuros");

  const listos = cajon.getByRole("region", { name: "listos para lanzar" });
  // Fix round 4 de la ola — el `<span>` del nombre, exacto, igual que `filaDeConjuro` en
  // `conjuros.spec.ts`. Un `<details>` sin `aria-label` NO tiene nombre accesible (lo que el
  // snapshot enseña tras los dos puntos es su contenido), así que `getByRole("group", { name })`
  // no casa nunca — el fix round 3 lo aprendió a la mala. 15 s como el resto de esperas de red de
  // este fichero: la lista del mago ronda los 67 KB.
  await expect(listos.getByText("Proyectil mágico", { exact: true })).toBeVisible({
    timeout: 15_000,
  });

  // --- «Lanzar» Proyectil mágico: elige espacio de nivel 1 (el propio) y «Goblin» ---
  await listos.getByRole("button", { name: "Lanzar Proyectil mágico" }).click();
  await maga.getByRole("radio", { name: /^Nivel 1/ }).click();
  await maga.getByRole("checkbox", { name: "Goblin" }).click();
  await maga.getByRole("button", { name: "Lanzar sobre 1" }).click();

  // --- En el hilo de la maga: la línea de «lanza» y una tarjeta de daño pendiente ---
  const hiloMaga = maga.getByRole("list", { name: "Sucesos de la sesión" });
  await expect(hiloMaga.getByText(/lanza Proyectil mágico/)).toBeVisible({ timeout: 15_000 });
  await expect(hiloMaga.getByText("Daño pendiente")).toBeVisible({ timeout: 15_000 });

  // --- Los espacios de nivel 1 bajan de 4 a 3 en la tarjeta de la pestaña ---
  const espacios = cajon.getByRole("region", { name: "espacios de conjuro" });
  await expect(espacios.getByText("Nivel 1: 3 / 4")).toBeVisible({ timeout: 15_000 });

  // --- En el navegador del DM la misma tarjeta trae «Aplicar»; la maga no la tiene ---
  const botonAplicar = /Aplicar el daño a Goblin/;
  await expect(dm.getByRole("button", { name: botonAplicar })).toBeVisible({ timeout: 20_000 });
  await expect(maga.getByRole("button", { name: botonAplicar })).toHaveCount(0);

  const elencoDm = dm.getByRole("region", { name: "En la mesa" });
  const barraDeVida = elencoDm.getByRole("img", { name: /Goblin: \d+ de \d+ puntos de golpe/ });
  const etiquetaAntes = (await barraDeVida.getAttribute("aria-label")) ?? "";
  const pgAntes = Number(etiquetaAntes.match(/Goblin: (\d+) de/)?.[1]);
  expect(Number.isFinite(pgAntes)).toBe(true);

  // **Ruling: el Goblin puede quedar a 0 PG aquí y se lanza igual.** Tres dardos de Proyectil
  // mágico (1d4+1 cada uno) rondan las 6-15 de daño contra sus 7 PG medios; nada en este
  // recorrido depende de que siga «vivo» para el segundo lanzamiento — `changeHp` no deja bajar
  // de 0, el objetivo sigue en la lista de combatientes (`useCombatientesDelEncuentro` no filtra
  // por derrotado) y el ataque contra su CA se resuelve igual. Coste si está mal: ninguno de
  // fondo, solo narrativamente raro.
  await dm.getByRole("button", { name: botonAplicar }).click();
  await expect(dm.getByText("Aplicado", { exact: true })).toBeVisible({ timeout: 10_000 });

  await expect
    .poll(
      async () => {
        const etiqueta = (await barraDeVida.getAttribute("aria-label")) ?? "";
        return Number(etiqueta.match(/Goblin: (\d+) de/)?.[1]);
      },
      { timeout: 15_000 },
    )
    .toBeLessThan(pgAntes);

  // --- La maga lanza «Descarga de fuego»: es una actividad de ATAQUE (`objetivos: "uno"`), así
  //     que un solo clic sobre «Goblin» elige Y lanza a la vez — sin lista de casillas ni botón
  //     de envío aparte, a diferencia de Proyectil mágico. ---
  //
  // Con la CA anulada a 1 casi cualquier tirada impacta, pero un 1 natural en el d20 de ataque
  // siempre falla (SRD 5.1) — un truco no gasta ningún recurso al repetirse, así que se reintenta
  // hasta impactar, con un tope de diez tiradas, igual que `puerta-de-efectos.spec.ts` hace con
  // el mismo motivo para un ataque con arma.
  await abrirPestana(cajon, "Conjuros");
  let impacto = false;
  for (let intento = 0; intento < 10 && !impacto; intento++) {
    const listosOtraVez = cajon.getByRole("region", { name: "listos para lanzar" });
    await listosOtraVez.getByRole("button", { name: "Lanzar Descarga de fuego" }).click();
    await maga.getByRole("option", { name: "Goblin" }).click();
    // Fix round 4: `getByText(/impacta|falla/)` casa con MÁS de la línea del veredicto («Daño
    // de Descarga de fuego: 1d10 = 8» no la contiene, pero cada reintento fallido deja su
    // propia línea «ataca a Goblin…: falla» en el hilo) — `.last()` ya se quedaba con la más
    // reciente, y sigue siendo la lectura correcta aquí.
    const veredicto = hiloMaga.getByText(/impacta|falla/).last();
    await expect(veredicto).toBeVisible({ timeout: 15_000 });
    impacto = !(await veredicto.textContent())?.includes("falla");
  }
  expect(impacto, "diez intentos con CA 1 y ninguno impactó").toBe(true);

  // **Fix round 4 — localizadores exactos, no `/Descarga de fuego/` a secas.** Ese regex
  // resolvía en modo estricto a SIETE elementos: la línea «lanza Descarga de fuego»
  // (`ACTIVITY_USED`), la tirada de ataque, la línea «ataca a Goblin con Descarga de fuego:
  // impacta» (`ATTACK_RESOLVED`, `linea-de-log.ts`), la tarjeta «Daño de Descarga de fuego: 1d10
  // = 8»… — todas comparten la subcadena. Cada reintento del bucle de arriba deja su propia
  // línea «lanza…»/«ataca…», así que las dos siguientes usan `.last()` (la del intento que
  // impactó, el último del bucle) en vez de asumir que solo hay una.
  await expect(hiloMaga.getByText("lanza Descarga de fuego").last()).toBeVisible({
    timeout: 15_000,
  });
  // El veredicto de ESTE intento ya se sabe «impacta» (o «impacta con un crítico» — las dos
  // empiezan por «impacta», nunca «falla»: el bucle no habría salido con `impacto: true` si no).
  await expect(
    hiloMaga.getByText(/ataca a Goblin con Descarga de fuego: impacta/).last(),
  ).toBeVisible({ timeout: 15_000 });
  // Solo un HIT/CRITICAL tira daño (`activities.service.ts`): puede haber más de una tarjeta
  // «Daño pendiente» si Proyectil mágico dejó la suya sin aplicar en algún punto — no es el caso
  // aquí (se aplicó más arriba), pero `.first()` es la lectura robusta de todos modos.
  await expect(hiloMaga.getByText("Daño pendiente").first()).toBeVisible({ timeout: 15_000 });
});
