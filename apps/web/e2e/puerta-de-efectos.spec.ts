import { test, expect, type Browser, type Page } from "@playwright/test";

// Tarea 9 de «la puerta de efectos» (spec 2026-09-12, §3/§4/§4 bis/§5/§5 bis/§7) — el recorrido
// de navegador de los tres bloques que quedaron sin medir en dos contextos reales: una condición
// «hasta el próximo descanso», la bandeja de daño de la tarjeta del hilo, y el marcador de XP con
// su aviso de subida.
//
// **NO se ejecuta en esta ficha** (regla del encargo, D-CF-65): lo corre el orquestador en la
// tanda de cierre, igual que `reglas-de-la-mesa.spec.ts` y `sobrecarga.spec.ts`. Escrito con los
// mismos ayudantes que `no-puedes-editar.spec.ts` (dos contextos, un DM y un jugador de verdad),
// `combate.spec.ts` (entrar en combate, resolver un ataque contra un objetivo) e
// `iniciativa-en-vivo.spec.ts` (la sala de espera de `PREPARING` cuando hay un «ajeno»).
//
// ## Los tres recorridos que SÍ se escriben, cada uno con un `expect` que mira el navegador del
// OTRO contexto (regla del brief):
//
//  1. **La condición «hasta el próximo descanso largo»** (§5.4, E-PE-7): el DM se la pone al
//     personaje de B con el radio nuevo; en el navegador de B la hoja dice «hasta descanso
//     largo» sin que B haya tocado nada — eso es lo que mira al otro contexto. Un descanso
//     corto la deja igual; uno largo la retira, y el hilo dice «Descanso largo».
//  2. **La bandeja de daño** (§4 bis, E-PE-2/E-PE-3/E-PE-5): A ataca a un goblin cuya CA se ha
//     anulado a 1 (para no depender de una tirada de ataque concreta) y tira el daño; en el hilo
//     del DM la tarjeta trae «Aplicar» y en el de A no —solo «Daño pendiente», porque A no es ni
//     el DM ni quien tiene el PNJ— y al aplicar, los dos ven «Aplicado» y los PG del goblin bajan
//     en el elenco.
//  3. **El XP** (§5 bis, E-PE-8/E-PE-9/E-PE-10): con la mesa en modo «Por experiencia», la hoja
//     de A dice «0 / 300 PX»; el DM da 300 desde «Dar XP» y, en el navegador de A —sin que A haya
//     pedido nada—, el marcador sube a «300 / 300 PX» con el aviso «Has alcanzado el XP del
//     nivel 2»; el nivel se queda en 1, porque solo el DM lo sube.
//
// ## El recorrido que el brief numera como (1) — «el clérigo cura al guerrero» — se OMITE, y esta
// es la razón, no una suposición:
//
// `apps/web/src/features/character-sheet/Actividades.tsx` es la ÚNICA pantalla que expone «usar
// una actividad del catálogo», y su botón manda `usar.mutate({ activityKey: actividad.key })` —
// **nunca `objetivos`** (grep de ese fichero: no hay ni un selector de objetivo, ni un solo sitio
// que arme el array `objetivos` de `@dnd/shared` `activity.schema.ts:566`). Da igual qué exponga
// el catálogo real (`apps/api/src/rules/catalog/`): si una actividad de curación admitiera
// `objetivos`, esta pantalla no tiene cómo elegir a quién apuntar — el campo simplemente no viaja
// desde el navegador. Sembrar el objetivo por la API en un `beforeAll` tampoco vale: el brief
// exige que el recorrido pase por la interfaz de verdad, y `overrideProvider` (el único atajo que
// sortearía esto) no existe en Playwright. Así que el recorrido 1 no es «no se encontró una
// actividad válida», es «la pantalla que la usaría no manda el campo que hace falta» — un límite
// de la interfaz de hoy, no del catálogo. Queda declarado también en `docs/08-pruebas.md`, junto
// a la fila de este mismo fichero: el camino con objetivo lo cubre
// `apps/api/test/puerta-de-efectos.e2e-spec.ts` contra la API real.

test.setTimeout(240_000);

function nuevaCuenta(prefijo: string) {
  const marca = `${Date.now()}${Math.floor(Math.random() * 1_000_000)}`;
  return {
    email: `pe-${prefijo}-${marca}@example.com`,
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

/** La cabecera de autorización de la sesión abierta en este navegador — para pedirle a la API
 *  directamente lo que la interfaz tardaría media suite en montar (mismo patrón que
 *  `combate.spec.ts` e `iniciativa-en-vivo.spec.ts`). */
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

async function abrirPestana(page: Page, nombre: string) {
  await page.getByRole("tab", { name: nombre }).click();
  await expect(page.getByRole("tab", { name: nombre, selected: true })).toBeVisible();
}

/**
 * Un personaje nuevo, con una hoja completa **por la API** (raza, clase, seis características):
 * lo único que hace falta de él es que derive, para que la pestaña que se necesite exista —
 * mismo atajo que `condiciones-con-duracion.spec.ts` e `iniciativa-en-vivo.spec.ts`.
 */
async function crearPersonajeConHoja(
  page: Page,
  campaignId: string,
  nombre: string,
): Promise<string> {
  await page.getByRole("button", { name: "Personajes" }).click();
  await page.getByRole("button", { name: "Nuevo personaje" }).click();
  await page.getByLabel("Nombre").fill(nombre);
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("button", { name: "Guardar" })).toBeHidden();
  await page.getByRole("link", { name: new RegExp(nombre) }).click();
  await expect(page.getByRole("heading", { name: nombre })).toBeVisible();
  const characterId = page.url().split("/personajes/")[1].split(/[/?]/)[0];

  const headers = await comoLaSesion(page);
  const hoja = await page.request.patch(
    `/api/campaigns/${campaignId}/characters/${characterId}/sheet`,
    {
      headers,
      data: {
        abilities: { str: 15, dex: 14, con: 14, int: 10, wis: 10, cha: 8 },
        race: { source: "SRD", key: "dwarf" },
        subrace: { source: "SRD", key: "dwarf-hill" },
        class: { source: "SRD", key: "fighter" },
        choices: { "fighter-skills": ["athletics", "perception"] },
      },
    },
  );
  expect(hoja.ok()).toBe(true);
  await page.reload();
  return characterId;
}

// ---------------------------------------------------------------------------------------------
// Recorrido 2 — la condición «hasta el próximo descanso largo»
// ---------------------------------------------------------------------------------------------

test("la condición «hasta el próximo descanso largo»: aguanta un descanso corto, cae con uno largo, y el hilo lo dice", async ({
  browser,
}: {
  browser: Browser;
}) => {
  const dmContext = await browser.newContext();
  const jugadorContext = await browser.newContext();
  const dm = await dmContext.newPage();
  const jugador = await jugadorContext.newPage();

  await registrarse(dm, "dm-descanso");
  const campaignId = await crearCampana(dm, "La condición que aguanta");

  const enlace = await generarInvitacion(dm);
  await unirseDesdeInvitacion(jugador, enlace, "jugador-descanso");
  await expect(jugador.getByRole("heading", { name: "La condición que aguanta" })).toBeVisible();

  await crearPersonajeConHoja(jugador, campaignId, "Doran");
  await abrirPestana(jugador, "Estado");
  await expect(jugador.getByLabel("Nueva condición")).toBeVisible();

  await empezarSesion(dm, "La noche que no cuenta");

  // El DM abre la ficha de Doran directamente (no la suya): puede editarla porque es el DM.
  await dm.getByRole("button", { name: "Personajes" }).click();
  await dm.getByRole("link", { name: /Doran/ }).click();
  await expect(dm.getByRole("heading", { name: "Doran" })).toBeVisible();
  await abrirPestana(dm, "Estado");

  const condicionesDm = dm.locator('section[aria-label="condiciones"]');
  // **La condición aplicada es un `<li>` de la lista; `getByText("Asustado")` a secas casa TAMBIÉN
  // con la `<option>` del `<select>` «Nueva condición»** (Playwright no excluye `<option>` del
  // motor de texto), así que aquí se busca la fila, no el texto — y `toHaveCount(0)` sobre la fila
  // sí puede llegar a cero, cosa que sobre el texto era imposible mientras la opción siguiera ahí.
  const asustadoDm = condicionesDm.getByRole("listitem").filter({ hasText: "Asustado" });
  await dm.getByLabel("Nueva condición").selectOption({ label: "Asustado" });
  await dm.getByRole("radio", { name: /Hasta el próximo descanso largo/ }).check();
  await condicionesDm.getByRole("button", { name: "Aplicar condición" }).click();
  await expect(asustadoDm).toBeVisible();
  await expect(asustadoDm).toContainText("hasta descanso largo");

  // --- El `expect` que mira al OTRO contexto: B no ha tocado nada y su hoja ya lo dice. ---
  await jugador.reload();
  await abrirPestana(jugador, "Estado");
  const condicionesJugador = jugador.locator('section[aria-label="condiciones"]');
  const asustadoJugador = condicionesJugador.getByRole("listitem").filter({ hasText: "Asustado" });
  await expect(asustadoJugador).toBeVisible({ timeout: 15_000 });
  await expect(asustadoJugador).toContainText("hasta descanso largo");

  // --- Un descanso corto no la toca: solo el largo mira `expiresOnRest === "SHORT"` en el
  //     servidor (`rest.service.ts`), y aquí se puso "hasta el próximo descanso LARGO". ---
  await abrirPestana(dm, "Recursos");
  await dm.getByRole("button", { name: "Descanso corto" }).click();
  await expect(dm.getByRole("alert")).toHaveCount(0);
  await abrirPestana(dm, "Estado");
  await expect(asustadoDm).toBeVisible();
  await expect(asustadoDm).toContainText("hasta descanso largo");

  // --- El descanso largo sí la retira. ---
  await abrirPestana(dm, "Recursos");
  await dm.getByRole("button", { name: "Descanso largo" }).click();
  await expect(dm.getByRole("alert")).toHaveCount(0);
  await abrirPestana(dm, "Estado");
  await expect(asustadoDm).toHaveCount(0);

  // --- Y otra vez el otro contexto: B, sin recargar a mano nada más que la propia página, ve lo
  //     mismo que acaba de pasar en la del DM. ---
  await jugador.reload();
  await abrirPestana(jugador, "Estado");
  await expect(asustadoJugador).toHaveCount(0);

  // --- El hilo de la sesión dice «Descanso largo», no la clave cruda `LONG` — y la retirada de
  //     la condición dice POR QUÉ (spec §5.3: «lo que retira lo dice la crónica»), que es lo que
  //     distingue esta retirada de una hecha a mano por el DM. ---
  await abrirLaMesa(dm, campaignId);
  const sucesos = dm.getByRole("list", { name: "Sucesos de la sesión" });
  await expect(sucesos.getByText("Descanso largo", { exact: true })).toBeVisible({
    timeout: 15_000,
  });
  await expect(
    sucesos.getByText("Se le quita la condición «Asustado» — Descanso largo"),
  ).toBeVisible();

  await dmContext.close();
  await jugadorContext.close();
});

// ---------------------------------------------------------------------------------------------
// Recorrido 3 — la bandeja de daño
// ---------------------------------------------------------------------------------------------

test("la bandeja de daño: el DM ve «Aplicar», A no; al aplicar, los dos ven «Aplicado» y el goblin baja de PG", async ({
  browser,
}: {
  browser: Browser;
}) => {
  const dmContext = await browser.newContext();
  const atacanteContext = await browser.newContext();
  const dm = await dmContext.newPage();
  const a = await atacanteContext.newPage();

  await registrarse(dm, "dm-bandeja");
  const campaignId = await crearCampana(dm, "La bandeja del hilo");

  const enlace = await generarInvitacion(dm);
  await unirseDesdeInvitacion(a, enlace, "atacante-bandeja");
  await expect(a.getByRole("heading", { name: "La bandeja del hilo" })).toBeVisible();

  const karaId = await crearPersonajeConHoja(a, campaignId, "Kara");
  // Sin arma equipada no hay fila que tirar (`AtaquesYLanzamiento.tsx`).
  const headersA = await comoLaSesion(a);
  const inventario = await a.request.post(
    `/api/campaigns/${campaignId}/characters/${karaId}/inventory`,
    {
      headers: headersA,
      data: { ref: { source: "SRD", key: "scimitar" }, location: "EQUIPPED", slot: "MAIN_HAND" },
    },
  );
  expect(inventario.ok()).toBe(true);

  // --- El DM saca un goblin, lo hace visible a la mesa y le anula la CA a 1: la prueba mide la
  //     bandeja, no la probabilidad de impactar, así que se quita el azar del golpe. ---
  await dm.getByRole("button", { name: "Bestiario" }).click();
  await expect(dm.getByRole("dialog", { name: "Bestiario" })).toBeVisible();
  await dm.getByPlaceholder("Buscar una criatura").fill("Goblin");
  const fichaGoblin = dm.getByTestId("ficha-de-criatura").filter({ hasText: "Goblin" }).first();
  await fichaGoblin.getByRole("button", { name: /Bajar a la mesa/i }).click();
  const enLaMesa = dm.getByTestId("pnj-en-la-mesa").filter({ hasText: "Goblin" });
  await expect(enLaMesa).toBeVisible({ timeout: 15_000 });
  await enLaMesa.getByRole("link", { name: "Goblin" }).click();
  await expect(dm.getByRole("heading", { name: "Goblin" })).toBeVisible();

  // Nace `DM_ONLY` («solo lo ves tú hasta que le subas la visibilidad», `PanelDeBestiario.tsx`):
  // sin subirla, A no vería ni el PNJ ni sus sucesos.
  await dm.getByRole("radio", { name: /Todos los que se sientan a esta mesa/ }).check();

  await abrirPestana(dm, "Estado");
  const anulaciones = dm.getByRole("region", { name: "anulaciones del DM" });
  await anulaciones.getByLabel("Valor a anular").selectOption({ label: "Clase de armadura" });
  await anulaciones.getByLabel("Nuevo valor").fill("1");
  await anulaciones.getByRole("button", { name: "Anular" }).click();
  await expect(anulaciones.getByText(/Clase de armadura: fijada a 1/)).toBeVisible();

  // --- Combate: Kara es «ajena» (de A, no del DM), así que nace `PREPARING` y hace falta que A
  //     tire su iniciativa — mismo patrón que `iniciativa-en-vivo.spec.ts`. ---
  // El DM sigue en la hoja del Goblin (pestaña «Estado») tras la anulación de arriba: «Sesiones»
  // vive en la página de la campaña, no ahí.
  await dm.goto(`/campaigns/${campaignId}`);
  await empezarSesion(dm, "La escaramuza de la bandeja");
  await abrirLaMesa(dm, campaignId);
  await abrirLaMesa(a, campaignId);

  await dm.getByRole("button", { name: "Entrar en combate" }).click();
  const dialogo = dm.getByRole("dialog", { name: "Entrar en combate" });
  await dialogo.getByRole("checkbox", { name: /Kara/ }).click();
  await dialogo.getByRole("checkbox", { name: /Goblin/ }).click();
  await dialogo.getByRole("button", { name: "Pedir iniciativa" }).click();

  await expect(a.getByText("EMPIEZA EL COMBATE")).toBeVisible({ timeout: 15_000 });
  await a.getByRole("button", { name: "Tirar iniciativa" }).click();
  await expect(dm.getByRole("region", { name: "Orden de turnos" })).toBeVisible({
    timeout: 15_000,
  });

  // --- A ataca al goblin desde su propia hoja. Con la CA anulada a 1 solo un 1 natural falla, así
  //     que se reintenta hasta impactar con un tope de diez tiradas (regla del brief). ---
  await a.goto(`/campaigns/${campaignId}/personajes/${karaId}`);
  await expect(a.getByRole("heading", { name: "Kara" })).toBeVisible();
  await abrirPestana(a, "Ataques");
  const tablaAtaques = a.getByRole("region", { name: "ataques y lanzamiento" });
  await expect(tablaAtaques.getByRole("table")).toBeVisible({ timeout: 15_000 });
  await tablaAtaques.getByRole("button", { name: "Tirada de Cimitarra" }).click();
  const panel = a.getByRole("group", { name: "Tirada de Cimitarra" });

  let impacto = false;
  for (let intento = 0; intento < 10 && !impacto; intento++) {
    await panel.getByRole("button", { name: "Atacar con Cimitarra" }).click();
    await panel.getByRole("option", { name: /Goblin/ }).click();
    // Menor 6 del barrido PE-1: se lee `data-veredicto` (HIT|MISS|CRITICAL, el valor del
    // servidor) en vez de adivinar por la frase traducida — el tope de diez sigue de red de
    // seguridad.
    const veredicto = panel.locator("[data-veredicto]");
    await expect(veredicto).toBeVisible({ timeout: 10_000 });
    impacto = (await veredicto.getAttribute("data-veredicto")) !== "MISS";
  }
  expect(impacto, "diez intentos con CA 1 y ninguno impactó").toBe(true);

  await panel.getByRole("button", { name: "Tirar daño de Cimitarra" }).click();
  await expect(panel.getByRole("status").last()).toBeVisible({ timeout: 10_000 });
  await panel.getByRole("button", { name: "Cerrar", exact: true }).click();

  // --- La bandeja, en el hilo de los dos: el DM ve «Aplicar», A no. ---
  await a.goto(`/campaigns/${campaignId}/sesion`);
  const botonAplicar = /Aplicar el daño a Goblin/;
  await expect(dm.getByRole("button", { name: botonAplicar })).toBeVisible({ timeout: 20_000 });
  await expect(a.getByRole("button", { name: botonAplicar })).toHaveCount(0);
  await expect(a.getByText("Daño pendiente")).toBeVisible({ timeout: 20_000 });

  const elencoDm = dm.getByRole("region", { name: "En la mesa" });
  const barraDeVida = elencoDm.getByRole("img", { name: /Goblin: \d+ de \d+ puntos de golpe/ });
  const etiquetaAntes = (await barraDeVida.getAttribute("aria-label")) ?? "";
  const pgAntes = Number(etiquetaAntes.match(/Goblin: (\d+) de/)?.[1]);
  expect(Number.isFinite(pgAntes)).toBe(true);

  await dm.getByRole("button", { name: botonAplicar }).click();
  // El DM lo ve por el preview releído (`useApplyDamage` lo invalida) y por `appliedEventId`.
  await expect(dm.getByText("Aplicado", { exact: true })).toBeVisible({ timeout: 10_000 });

  // --- Otra vez el `expect` que mira al otro contexto: A ve «Aplicado» sin haber pulsado nada. ---
  // A recibe 404 en el preview SIEMPRE (no es dueño del goblin ni DM), así que lo que le enseña
  // «Aplicado» no es el preview sino `pendingDamage.appliedEventId`, el candado que viaja en el
  // propio suceso del hilo y que el canal en vivo le trae al invalidar el registro.
  await expect(a.getByText("Aplicado", { exact: true })).toBeVisible({ timeout: 20_000 });

  await expect
    .poll(
      async () => {
        const etiqueta = (await barraDeVida.getAttribute("aria-label")) ?? "";
        return Number(etiqueta.match(/Goblin: (\d+) de/)?.[1]);
      },
      { timeout: 15_000 },
    )
    .toBeLessThan(pgAntes);

  await dmContext.close();
  await atacanteContext.close();
});

// ---------------------------------------------------------------------------------------------
// Recorrido 4 — el XP
// ---------------------------------------------------------------------------------------------

test("XP: la hoja dice «0 / 300 PX», el DM da 300 desde «Dar XP» y A ve «300 / 300 PX» con el aviso de nivel — sin subir el nivel", async ({
  browser,
}: {
  browser: Browser;
}) => {
  const dmContext = await browser.newContext();
  const jugadorContext = await browser.newContext();
  const dm = await dmContext.newPage();
  const jugador = await jugadorContext.newPage();

  await registrarse(dm, "dm-xp");
  const campaignId = await crearCampana(dm, "La mesa por experiencia");

  // Reglas de la mesa → «Por experiencia».
  await dm.getByRole("tab", { name: "Ajustes" }).click();
  const bloqueDeReglas = dm.getByRole("region", { name: "Reglas de la mesa" });
  await bloqueDeReglas.getByRole("radio", { name: /Por experiencia/ }).check();
  await bloqueDeReglas.getByRole("button", { name: "Guardar las reglas" }).click();
  await expect(bloqueDeReglas.getByRole("alert")).toHaveCount(0);

  const enlace = await generarInvitacion(dm);
  await unirseDesdeInvitacion(jugador, enlace, "jugador-xp");
  await expect(jugador.getByRole("heading", { name: "La mesa por experiencia" })).toBeVisible();

  const characterId = await crearPersonajeConHoja(jugador, campaignId, "Elora");

  const marcador = jugador.getByRole("region", { name: "experiencia" });
  await expect(marcador).toContainText("0 / 300 PX");

  // --- El DM da 300 PX desde «Dar XP», en las herramientas de la mesa. ---
  await empezarSesion(dm, "El primer encargo");
  await abrirLaMesa(dm, campaignId);
  await dm.getByRole("button", { name: "Dar XP" }).click();
  await expect(dm.getByRole("heading", { name: "Dar experiencia" })).toBeVisible();
  await dm.getByRole("checkbox", { name: "Elora" }).check();
  // `getByLabel("Cantidad")` casa TAMBIÉN con las frases de los dos radios de reparto (ambas
  // dicen «La cantidad es…»): hace falta el rol para llegar solo al campo numérico.
  await dm.getByRole("spinbutton", { name: "Cantidad" }).fill("300");
  await dm.getByRole("button", { name: "Dar experiencia" }).click();
  await expect(dm.getByRole("alert")).toHaveCount(0);

  // --- El `expect` que mira al otro contexto: A no pidió nada y su marcador ya cambió. ---
  await jugador.reload();
  const marcadorTrasDar = jugador.getByRole("region", { name: "experiencia" });
  await expect(marcadorTrasDar).toContainText("300 / 300 PX", { timeout: 20_000 });
  await expect(
    marcadorTrasDar.getByText("Has alcanzado el XP del nivel 2: el DM puede subirte"),
  ).toBeVisible();

  // El nivel sigue en 1: solo el DM lo sube (D-CF-66), y aquí nadie lo ha pulsado.
  const headersJugador = await comoLaSesion(jugador);
  const hoja = await jugador.request.get(
    `/api/campaigns/${campaignId}/characters/${characterId}/sheet`,
    { headers: headersJugador },
  );
  expect(hoja.ok()).toBe(true);
  const cuerpo = await hoja.json();
  expect(cuerpo.character.level).toBe(1);

  await dmContext.close();
  await jugadorContext.close();
});
