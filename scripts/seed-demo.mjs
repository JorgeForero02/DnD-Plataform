#!/usr/bin/env node
// Siembra una campaña de demostración **completa y jugable**, para poder ver que todo funciona sin
// construirla a mano cada vez. Encargo del autor (2026-09-05).
//
// **Habla por HTTP, como una persona.** No toca la base de datos: se registra, inicia sesión y hace
// las mismas peticiones que hace la aplicación, con su cabecera y su `canView`. Eso tiene tres
// consecuencias buenas y una mala, y las cuatro son deliberadas:
//
//  · **Se puede correr contra producción** desde cualquier sitio, sin credenciales de Postgres.
//  · **Prueba de verdad**: si una ruta se rompe, la siembra falla en esa línea y lo dice. Un script
//    de Prisma habría escrito filas perfectas sobre una API rota.
//  · **No puede inventarse un permiso**: lo que el DM no puede hacer, aquí tampoco pasa.
//  · Lo malo: es más lenta y depende de que la API esté arriba. Merece la pena.
//
// **Es idempotente.** Correrlo dos veces no duplica nada: cada paso mira primero si su cosa ya
// existe, por nombre. Lo que ya está se reutiliza; lo que falta se crea.
//
// **Todo lo que siembra queda marcado como demostración** —los correos van a `@demo.invalid` y
// todos los nombres empiezan por `[demo]`—, así que se puede encontrar y borrar de un tirón:
// `node scripts/seed-demo.mjs --limpiar` borra las campañas de demostración de este servidor.
// Las cuentas no se borran: **la API no tiene ruta para borrar un usuario**, y no se le añade una
// por comodidad de un script.
//
// Uso:
//   node scripts/seed-demo.mjs                        # contra http://localhost:3000
//   node scripts/seed-demo.mjs --base https://dnd.supportive.pro/api
//   node scripts/seed-demo.mjs --limpiar
//
// La contraseña sale de `SEED_DEMO_PASSWORD`. **Contra producción, pónla**: la de por defecto está
// escrita en este fichero, y un fichero del repositorio no es un secreto.
//
// **Y cada cuenta puede traer la suya**, que es lo que permite sembrar con una cuenta de verdad
// como DM y las de demostración como jugadores:
//
//   SEED_DEMO_DM_EMAIL / SEED_DEMO_DM_PASSWORD, y lo mismo con JUGADORA y JUGADOR.
//
// Una cuenta que **no** sea de `@demo.invalid` no se crea nunca desde aquí: si el correo es real,
// lo que falta es su contraseña, no la cuenta.

const MARCA = "[demo]";
const DOMINIO = "demo.invalid";
const CLAVE = process.env.SEED_DEMO_PASSWORD ?? "demo-de-la-sala-2026";

/**
 * **Cada cuenta puede traer la suya, y eso no es un lujo.**
 *
 * Sembrar con **una cuenta de verdad como DM** —la del autor— y las de demostración como
 * jugadores es justo lo que se quiere para mirar la mesa desde dentro, y con una sola clave para
 * las tres no se puede: o entras con la real o entras con las de mentira. Cada variable es
 * opcional; sin ella se usa `SEED_DEMO_PASSWORD`, que es lo de siempre.
 *
 *   SEED_DEMO_DM_EMAIL / SEED_DEMO_DM_PASSWORD              — el DM
 *   SEED_DEMO_JUGADORA_EMAIL / SEED_DEMO_JUGADORA_PASSWORD  — la jugadora
 *   SEED_DEMO_JUGADOR_EMAIL / SEED_DEMO_JUGADOR_PASSWORD    — el jugador
 *
 * **Una cuenta real no se crea nunca desde aquí**: si el correo no es de `@demo.invalid` y no
 * existe, el script para en vez de registrar a nadie con una contraseña que él se ha inventado.
 */
const CUENTAS = {
  dm: {
    email: process.env.SEED_DEMO_DM_EMAIL ?? `demo-dm@${DOMINIO}`,
    password: process.env.SEED_DEMO_DM_PASSWORD ?? CLAVE,
    displayName: `${MARCA} Elena, la DM`,
  },
  jugadora: {
    email: process.env.SEED_DEMO_JUGADORA_EMAIL ?? `demo-jugadora@${DOMINIO}`,
    password: process.env.SEED_DEMO_JUGADORA_PASSWORD ?? CLAVE,
    displayName: `${MARCA} Marta`,
  },
  jugador: {
    email: process.env.SEED_DEMO_JUGADOR_EMAIL ?? `demo-jugador@${DOMINIO}`,
    password: process.env.SEED_DEMO_JUGADOR_PASSWORD ?? CLAVE,
    displayName: `${MARCA} Bruno`,
  },
};

const CAMPANA = `${MARCA} La mina perdida`;

// --- Los argumentos, sin librería: son dos ---
const args = process.argv.slice(2);
const BASE = (() => {
  const i = args.indexOf("--base");
  const valor = i >= 0 ? args[i + 1] : process.env.SEED_DEMO_BASE;
  return (valor ?? "http://localhost:3000").replace(/\/$/, "");
})();
const LIMPIAR = args.includes("--limpiar");

let pasos = 0;
function paso(texto) {
  pasos += 1;
  console.log(`${String(pasos).padStart(2, " ")}. ${texto}`);
}
function detalle(texto) {
  console.log(`    ${texto}`);
}

/**
 * Una petición. **Lanza con el cuerpo del error dentro**, porque el mensaje de la API es en
 * español y es el que hay que leer: «Falta el cuerpo», «Este recurso solo lo repone el DM».
 */
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * **El 429 se espera, no se sortea.** Las rutas de autenticación están limitadas a cinco intentos
 * por minuto y por IP (`AUTH_RATE_LIMIT`, `apps/api/src/common/rate-limit.constants.ts`) para
 * frenar la fuerza bruta contra login, registro e invitaciones. Esta siembra hace tres entradas
 * seguidas y, si se corre dos veces en el mismo minuto, se choca con su propio límite.
 *
 * Lo correcto es **esperar**: aflojar el límite en producción para que un script vaya más cómodo
 * sería cambiar una protección por una comodidad.
 */
async function api(metodo, ruta, opciones = {}) {
  for (let intento = 0; ; intento++) {
    try {
      return await peticion(metodo, ruta, opciones);
    } catch (error) {
      if (error.status !== 429 || intento >= 3) throw error;
      detalle(`El servidor pide calma (429). Espero 30 s y lo reintento.`);
      await dormir(30_000);
    }
  }
}

async function peticion(metodo, ruta, { token, body } = {}) {
  const res = await fetch(`${BASE}${ruta}`, {
    method: metodo,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const texto = await res.text();
  const datos = texto ? JSON.parse(texto) : null;
  if (!res.ok) {
    const error = new Error(`${metodo} ${ruta} → ${res.status}: ${texto.slice(0, 400)}`);
    error.status = res.status;
    error.datos = datos;
    throw error;
  }
  return datos;
}

/** Entra si la cuenta existe; la crea si no. Es la primera pieza de la idempotencia. */
async function entrarOCrear({ email, password, displayName }) {
  try {
    const { token, user } = await api("POST", "/auth/login", { body: { email, password } });
    return { token, user, nueva: false };
  } catch (error) {
    if (error.status !== 401 && error.status !== 400) throw error;

    // **Una cuenta que no es de demostración no se crea aquí.** Registrar `alguien@gmail.com` con
    // una contraseña inventada por un script es crear la cuenta de otra persona: si el correo es
    // real, lo que falta es la contraseña, no la cuenta.
    if (!email.endsWith(`@${DOMINIO}`)) {
      throw new Error(
        `No pude entrar como ${email} y **no es una cuenta de demostración**, así que no la creo. ` +
          `Si la cuenta existe, revisa su contraseña; si no existe, créala desde la aplicación.`,
      );
    }

    try {
      const { token, user } = await api("POST", "/auth/register", {
        body: { email, password, displayName },
      });
      return { token, user, nueva: true };
    } catch (fallo) {
      // **El 409 aquí significa una cosa concreta y hay que decirla.** «Email already registered»
      // después de un login fallido no es «ya está sembrado»: es **la cuenta existe con OTRA
      // contraseña**. El script se llama idempotente y solo lo es con la misma clave; sin esta
      // frase, quien lo corre con una contraseña nueva ve un error del servidor que no explica
      // nada. Lo encontró otra sesión usándolo, no una prueba.
      if (fallo.status === 409) {
        throw new Error(
          `La cuenta ${email} ya existe, pero la contraseña que le estoy dando no es la suya. ` +
            `Vuelve a correrlo con la contraseña con la que se sembró —o con otra cuenta— en ` +
            `SEED_DEMO_PASSWORD (o en la variable de esa cuenta).`,
        );
      }
      throw fallo;
    }
  }
}

/** Busca por nombre en una lista ya traída. Con eso basta: los nombres de la demo son únicos. */
function porNombre(lista, nombre) {
  return (lista ?? []).find((x) => x.name === nombre || x.title === nombre) ?? null;
}

async function limpiar(dm) {
  const campanas = await api("GET", "/campaigns", { token: dm.token });
  const suyas = (campanas ?? []).filter((c) => c.name.startsWith(MARCA));
  if (suyas.length === 0) {
    detalle("No había ninguna campaña de demostración que borrar.");
    return;
  }
  for (const campana of suyas) {
    await api("DELETE", `/campaigns/${campana.id}`, { token: dm.token });
    detalle(`Borrada «${campana.name}» (${campana.id}).`);
  }
  detalle(
    "Las cuentas de demostración NO se borran: la API no tiene ruta para ello, y no se le " +
      "añade una por comodidad de un script.",
  );
}

async function main() {
  console.log(`Sembrando la demostración contra ${BASE}\n`);

  paso("Las tres cuentas");
  const dm = await entrarOCrear(CUENTAS.dm);
  const jugadora = await entrarOCrear(CUENTAS.jugadora);
  const jugador = await entrarOCrear(CUENTAS.jugador);
  detalle(
    `DM ${dm.nueva ? "creada" : "ya existía"}, jugadora ${jugadora.nueva ? "creada" : "ya existía"}, ` +
      `jugador ${jugador.nueva ? "creado" : "ya existía"}.`,
  );

  if (LIMPIAR) {
    paso("Limpieza");
    await limpiar(dm);
    console.log("\nListo.");
    return;
  }

  paso("La campaña");
  const campanas = await api("GET", "/campaigns", { token: dm.token });
  let campana = porNombre(campanas, CAMPANA);
  if (!campana) {
    campana = await api("POST", "/campaigns", {
      token: dm.token,
      body: {
        name: CAMPANA,
        description:
          "Campaña de demostración, sembrada por scripts/seed-demo.mjs. Todo lo que lleva " +
          "«[demo]» delante se puede borrar sin pensarlo.",
      },
    });
    detalle(`Creada (${campana.id}).`);
  } else {
    detalle(`Ya existía (${campana.id}).`);
  }
  const C = campana.id;

  paso("Los dos jugadores se sientan a la mesa");
  const miembros = await api("GET", `/campaigns/${C}/members`, { token: dm.token });
  for (const [quien, cuenta] of [
    ["la jugadora", jugadora],
    ["el jugador", jugador],
  ]) {
    if (miembros.some((m) => m.userId === cuenta.user.id)) {
      detalle(`${quien} ya estaba dentro.`);
      continue;
    }
    const invitacion = await api("POST", `/campaigns/${C}/invites`, { token: dm.token, body: {} });
    await api("POST", `/invites/${invitacion.token}/accept`, { token: cuenta.token });
    detalle(`${quien} ha entrado por invitación.`);
  }

  paso("El mundo, con los CINCO niveles de visibilidad");
  const fichas = await api("GET", `/campaigns/${C}/entities`, { token: dm.token });
  const DEL_MUNDO = [
    {
      type: "LOCATION",
      name: `${MARCA} Phandalin`,
      visibility: "PUBLIC",
      body: "El pueblo. Lo conoce cualquiera que pase por el camino.",
    },
    {
      type: "NPC",
      name: `${MARCA} Gundren Piedrarroja`,
      visibility: "PLAYERS",
      body: "El enano que os contrató. Lleva tres días sin aparecer.",
    },
    {
      type: "NPC",
      name: `${MARCA} La carta de Iarno`,
      visibility: "SPECIFIC_PLAYERS",
      body: "Una carta que solo ha leído quien la encontró.",
    },
    {
      type: "LOCATION",
      name: `${MARCA} El escondite del jefe`,
      visibility: "OWNER_DM",
      body: "Nota del DM: aquí está el mapa de la mina.",
    },
    {
      type: "NPC",
      name: `${MARCA} El que mueve los hilos`,
      visibility: "DM_ONLY",
      body: "Aparece en el tercer acto. Nadie de la mesa lo sabe todavía.",
    },
  ];
  const creadas = {};
  for (const ficha of DEL_MUNDO) {
    const ya = porNombre(fichas, ficha.name);
    if (ya) {
      creadas[ficha.visibility] = ya;
      detalle(`«${ficha.name}» ya existía (${ficha.visibility}).`);
      continue;
    }
    const cuerpo = {
      type: ficha.type,
      name: ficha.name,
      visibility: ficha.visibility,
      body: { format: "markdown", text: ficha.body },
      tags: ["demo"],
      // `SPECIFIC_PLAYERS` sin nadie nombrado sería una ficha que no ve **ni quien la creó**.
      ...(ficha.visibility === "SPECIFIC_PLAYERS" ? { specificPlayerIds: [jugadora.user.id] } : {}),
    };
    creadas[ficha.visibility] = await api("POST", `/campaigns/${C}/entities`, {
      token: dm.token,
      body: cuerpo,
    });
    detalle(`«${ficha.name}» creada (${ficha.visibility}).`);
  }

  paso("Un enlace entre dos fichas, y un comentario que genera aviso");
  const desde = creadas.PLAYERS;
  const hacia = creadas.PUBLIC;
  const enlaces = await api("GET", `/entities/${desde.id}/links`, { token: dm.token });
  if (!enlaces.some((l) => l.toId === hacia.id || l.to?.id === hacia.id)) {
    await api("POST", `/entities/${desde.id}/links`, {
      token: dm.token,
      body: { toId: hacia.id, label: "vive en" },
    });
    detalle("Gundren enlazado con Phandalin.");
  } else {
    detalle("El enlace ya estaba.");
  }
  const comentarios = await api("GET", `/entities/${desde.id}/comments`, { token: jugadora.token });
  if (comentarios.length === 0) {
    // Lo comenta **la jugadora**, no el DM: así el aviso llega a alguien. Nadie se avisa de lo
    // que acaba de hacer (plan 12).
    await api("POST", `/entities/${desde.id}/comments`, {
      token: jugadora.token,
      body: { body: "¿No era este el que nos pagó por adelantado?" },
    });
    detalle("Comentario publicado por la jugadora → aviso al DM.");
  } else {
    detalle("Ya había comentarios.");
  }

  paso("Dos personajes, con su color y su hoja derivada");
  const personajes = await api("GET", `/campaigns/${C}/characters`, { token: dm.token });
  const FICHAS_DE_JUGADOR = [
    {
      nombre: `${MARCA} Brann`,
      color: "cobre",
      duena: jugadora,
      race: { source: "SRD", key: "dwarf" },
      class: { source: "SRD", key: "fighter" },
      abilities: { str: 16, dex: 12, con: 15, int: 10, wis: 13, cha: 8 },
    },
    {
      nombre: `${MARCA} Sylas`,
      color: "indigo",
      duena: jugador,
      race: { source: "SRD", key: "elf" },
      class: { source: "SRD", key: "wizard" },
      abilities: { str: 8, dex: 14, con: 13, int: 16, wis: 12, cha: 10 },
    },
  ];
  const suyos = {};
  for (const ficha of FICHAS_DE_JUGADOR) {
    let personaje = porNombre(personajes, ficha.nombre);
    if (!personaje) {
      // **Lo crea su dueño**, no el DM: el dueño de un personaje es quien lo crea, y sembrarlo
      // desde la cuenta del DM daría una mesa donde nadie tiene personaje propio.
      personaje = await api("POST", `/campaigns/${C}/characters`, {
        token: ficha.duena.token,
        body: { name: ficha.nombre, level: 3, visibility: "PLAYERS", color: ficha.color },
      });
      detalle(`«${ficha.nombre}» creado por su jugador (${ficha.color}).`);
    } else {
      detalle(`«${ficha.nombre}» ya existía.`);
    }
    suyos[ficha.nombre] = personaje;
    // La hoja se deriva del motor: raza, clase y las seis puntuaciones. Es idempotente por sí
    // misma —es un `PATCH` con los mismos valores—, así que no hace falta comprobar antes.
    // Con el token de la DM: desde D-CF-66 el nivel solo lo fija el DM, ni siquiera el dueño vía
    // PATCH de la hoja (`requireEditable` deja a la DM editar el resto de campos igual).
    await api("PATCH", `/campaigns/${C}/characters/${personaje.id}/sheet`, {
      token: dm.token,
      body: {
        race: ficha.race,
        class: ficha.class,
        level: 3,
        abilities: ficha.abilities,
      },
    });
  }
  const brann = suyos[`${MARCA} Brann`];
  const sylas = suyos[`${MARCA} Sylas`];

  paso("Un objeto propio del DM, inventario con ranuras y sintonización, y dinero");
  const objetos = await api("GET", `/campaigns/${C}/items`, { token: dm.token });
  const NOMBRE_OBJETO = `${MARCA} Hacha del primer turno`;
  let objeto = porNombre(objetos, NOMBRE_OBJETO);
  if (!objeto) {
    objeto = await api("POST", `/campaigns/${C}/items`, {
      token: dm.token,
      body: {
        name: NOMBRE_OBJETO,
        kind: "WEAPON",
        description: "Un hacha vieja que zumba cuando empieza el combate.",
        weightOz: 64,
        requiresAttunement: true,
        slot: "MAIN_HAND",
        visibility: "PLAYERS",
        weapon: {
          category: "MARTIAL",
          range: "MELEE",
          damageDice: "1d8",
          damageType: "SLASHING",
          properties: ["VERSATILE"],
          versatileDice: "1d10",
        },
      },
    });
    detalle(`Objeto propio creado (${objeto.id}).`);
  } else {
    detalle("El objeto propio ya existía.");
  }

  const inventario = await api("GET", `/campaigns/${C}/characters/${brann.id}/inventory`, {
    token: jugadora.token,
  });
  const filas = inventario.rows ?? inventario.items ?? inventario;
  if (!Array.isArray(filas) || filas.length === 0) {
    const fila = await api("POST", `/campaigns/${C}/characters/${brann.id}/inventory`, {
      token: jugadora.token,
      body: { ref: { source: "CAMPAIGN", id: objeto.id }, quantity: 1, location: "CARRIED" },
    });
    const filaId = fila.id ?? fila.row?.id;
    // Equipar **y** sintonizar: son dos hechos distintos y el SRD los cuenta aparte —tres
    // objetos sintonizados como máximo (`MAX_ATTUNED_ITEMS`).
    await api("PATCH", `/campaigns/${C}/characters/${brann.id}/inventory/${filaId}`, {
      token: jugadora.token,
      body: { location: "EQUIPPED", slot: "MAIN_HAND", attuned: true },
    });
    detalle("Hacha en la mano de Brann, equipada y sintonizada.");
  } else {
    detalle("Brann ya llevaba algo encima.");
  }
  await api("PATCH", `/campaigns/${C}/characters/${brann.id}/money`, {
    token: jugadora.token,
    body: { gp: 25, sp: 4 },
  }).catch((error) => detalle(`Dinero: ${error.message}`));

  paso("Un statblock del DM y un PNJ jugable en la mesa");
  // La lista trae **dos catálogos**: los del SRD y los de la campaña. Aquí solo interesan los
  // propios del DM, que son los que esta siembra crea.
  const catalogos = await api("GET", `/campaigns/${C}/statblocks`, { token: dm.token });
  const statblocks = catalogos.campaign ?? catalogos;
  const NOMBRE_BICHO = `${MARCA} Capataz goblin`;
  let bicho = porNombre(statblocks, NOMBRE_BICHO);
  if (!bicho) {
    bicho = await api("POST", `/campaigns/${C}/statblocks`, {
      token: dm.token,
      body: {
        name: NOMBRE_BICHO,
        size: "SMALL",
        type: "HUMANOID",
        alignment: "neutral maligno",
        ac: 15,
        hitDiceCount: 4,
        abilities: { str: 10, dex: 14, con: 12, int: 10, wis: 8, cha: 8 },
        saveProficiencies: [],
        skillProficiencies: {},
        damageResistances: [],
        damageImmunities: [],
        damageVulnerabilities: [],
        conditionImmunities: [],
        speeds: { walk: 30 },
        cr: 0.5,
        traits: [],
        actions: [
          { name: "Cimitarra", desc: "Ataque con arma cuerpo a cuerpo: 1d6+2 de daño cortante." },
        ],
        reactions: [],
        legendaryActions: [],
        visibility: "DM_ONLY",
      },
    });
    detalle(`Statblock propio creado (${bicho.id ?? bicho.ref}).`);
  } else {
    detalle("El statblock propio ya existía.");
  }

  const pnjs = await api("GET", `/campaigns/${C}/npcs`, { token: dm.token });
  const NOMBRE_PNJ = `${MARCA} Klarg`;
  let pnj = porNombre(pnjs, NOMBRE_PNJ);
  if (!pnj) {
    const creado = await api("POST", `/campaigns/${C}/npcs`, {
      token: dm.token,
      body: { ref: bicho.ref ?? `CAMPAIGN:${bicho.id}`, count: 1, name: NOMBRE_PNJ, hp: "AVERAGE" },
    });
    pnj = Array.isArray(creado) ? creado[0] : (creado.characters?.[0] ?? creado);
    detalle("PNJ jugable en la mesa: un capataz con sus puntos de golpe.");
  } else {
    detalle("El PNJ ya estaba en la mesa.");
  }

  paso("Una sesión con su crónica, un encuentro con iniciativa y el reloj");
  const sesiones = await api("GET", `/campaigns/${C}/sessions`, { token: dm.token });
  const TITULO = `${MARCA} La emboscada del camino`;
  let sesion = porNombre(sesiones, TITULO);
  if (!sesion) {
    sesion = await api("POST", `/campaigns/${C}/sessions`, {
      token: dm.token,
      body: {
        title: TITULO,
        scheduledAt: new Date(Date.now() + 7 * 24 * 3600_000).toISOString(),
        visibility: "PLAYERS",
      },
    });
    detalle("Sesión planificada → aviso a la mesa.");
  } else {
    detalle("La sesión ya existía.");
  }

  const enCurso = await api("GET", `/campaigns/${C}/sessions/current`, { token: dm.token }).catch(
    () => null,
  );
  // **Una sesión anterior, ya cerrada y CON su crónica**, que es lo que la mesa repasa entre
  // partidas y lo único que llena la página de lectura de una sesión (ficha U1). La crónica se
  // escribe al cerrar: es el resumen sobre las viñetas ya anotadas.
  const TITULO_ANTERIOR = `${MARCA} La noche del camino de Triboar`;
  // **Solo cabe una sesión en curso por campaña**, y lo garantiza un índice único de Postgres:
  // si ya hay una abierta —la de la vuelta anterior—, esto no se vuelve a sembrar.
  if (!enCurso && !porNombre(sesiones, TITULO_ANTERIOR)) {
    const anterior = await api("POST", `/campaigns/${C}/sessions`, {
      token: dm.token,
      body: {
        title: TITULO_ANTERIOR,
        scheduledAt: new Date(Date.now() - 7 * 24 * 3600_000).toISOString(),
        visibility: "PLAYERS",
      },
    });
    await api("POST", `/campaigns/${C}/sessions/${anterior.id}/start`, {
      token: dm.token,
      body: {},
    });
    await api("POST", `/campaigns/${C}/sessions/${anterior.id}/close`, {
      token: dm.token,
      body: {
        recap:
          "Los caballos de Gundren aparecieron muertos en el camino y de él no había rastro. " +
          "Brann encontró una carta con el sello de los Redbrand; Sylas la leyó dos veces y no " +
          "dijo lo que ponía. La mesa terminó a las puertas de Phandalin, de noche y sin dinero.",
        recapVisibility: "PLAYERS",
      },
    });
    detalle("Sesión anterior cerrada, con su crónica escrita.");
  } else {
    detalle("La sesión anterior ya estaba cerrada.");
  }

  if (!enCurso) {
    await api("POST", `/campaigns/${C}/sessions/${sesion.id}/start`, {
      token: dm.token,
      body: {},
    }).catch((error) => detalle(`Arrancar la sesión: ${error.message}`));
  }

  const encuentro = await api("GET", `/campaigns/${C}/sessions/${sesion.id}/encounters/current`, {
    token: dm.token,
  }).catch(() => null);
  if (!encuentro) {
    const nuevo = await api("POST", `/campaigns/${C}/sessions/${sesion.id}/encounters`, {
      token: dm.token,
      body: {
        characterIds: [brann.id, sylas.id, pnj.id].filter(Boolean),
        sides: { [brann.id]: "ALLY", [sylas.id]: "ALLY", ...(pnj.id ? { [pnj.id]: "ENEMY" } : {}) },
      },
    }).catch((error) => {
      detalle(`Encuentro: ${error.message}`);
      return null;
    });
    if (nuevo) {
      for (const combatiente of nuevo.combatants ?? []) {
        await api(
          "PATCH",
          `/campaigns/${C}/sessions/${sesion.id}/encounters/${nuevo.id}/combatants/${combatiente.id}`,
          { token: dm.token, body: { initiative: 10 + Math.floor(Math.random() * 10) } },
        ).catch(() => {});
      }
      // El encuentro nace `PREPARING` cuando combate alguien que no es el DM (los jugadores tiran
      // su iniciativa); con las iniciativas ya puestas a mano, se arranca sin esperar a nadie —
      // `POST …/force-start` (`EncountersController`), solo DM— para que la mesa de demostración
      // enseñe el orden de turnos y no la sala de espera (fix round 2 de la Task 5b, 3A.3).
      await api(
        "POST",
        `/campaigns/${C}/sessions/${sesion.id}/encounters/${nuevo.id}/force-start`,
        { token: dm.token },
      ).catch((error) => detalle(`Arrancar el encuentro: ${error.message}`));
      detalle("Encuentro empezado y en marcha, con iniciativa tirada para cada uno.");
    }
  } else {
    detalle("Ya había un encuentro en curso.");
  }

  await api("POST", `/campaigns/${C}/clock/advance`, {
    token: dm.token,
    // Un asalto: seis segundos (D-2C-1). `kind` distingue «pasa el tiempo» de «viajamos».
    body: { kind: "TIME", seconds: 6 },
  }).catch((error) => detalle(`Reloj: ${error.message}`));

  paso("Una regla del motor");
  const reglas = await api("GET", `/campaigns/${C}/rules`, { token: dm.token });
  const NOMBRE_REGLA = `${MARCA} Al entrar en Phandalin, se sabe`;
  if (!porNombre(reglas.rules ?? reglas, NOMBRE_REGLA)) {
    await api("POST", `/campaigns/${C}/rules`, {
      token: dm.token,
      body: {
        name: NOMBRE_REGLA,
        trigger: { kind: "ENTITY_REVEALED", entityId: creadas.PUBLIC.id },
        conditions: [],
        // **La visibilidad del efecto es obligatoria y no se adivina**: revelar es decidir a
        // quién, y un efecto sin ese dato sería el motor eligiendo por el DM.
        effects: [{ kind: "REVEAL_ENTITY", entityId: creadas.PLAYERS.id, visibility: "PLAYERS" }],
        mode: "AUTOMATIC",
      },
    })
      .then(() => detalle("Regla creada: revelar Phandalin revela a Gundren."))
      .catch((error) => detalle(`Regla: ${error.message}`));
  } else {
    detalle("La regla ya existía.");
  }

  console.log(`
Listo. Entra con cualquiera de estas tres cuentas, cada una con su contraseña:

  ${CUENTAS.dm.email} — la DM
  ${CUENTAS.jugadora.email} — jugadora, dueña de Brann
  ${CUENTAS.jugador.email} — jugador, dueño de Sylas

Y para borrarlo todo:  node scripts/seed-demo.mjs --base ${BASE} --limpiar
`);
}

main().catch((error) => {
  console.error(`\nLa siembra se ha parado: ${error.message}`);
  process.exit(1);
});
