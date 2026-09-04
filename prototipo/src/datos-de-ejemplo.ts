// Estrato: ninguno — datos de ejemplo, sin lógica de red.
// Una campaña de fantasía creíble para «Sala de Guerra».
// Todo en castellano y legible; nunca códigos internos ni «Lorem ipsum».

export type Visibilidad =
  | "publico"
  | "jugadores"
  | "dueno"
  | "dm"
  | "concretos";

export const etiquetaVisibilidad: Record<Visibilidad, string> = {
  publico: "Todos lo ven",
  jugadores: "Los jugadores",
  dueno: "Solo su dueño",
  dm: "Solo el DM",
  concretos: "Personas concretas",
};

export type Estado = {
  nombre: string; // legible: «envenenado», nunca «poisoned»
  tono: "danger" | "warning" | "accent" | "muted";
  // Temporizador: las condiciones con duración se guardan con la hora en que
  // VENCEN (contra el reloj de campaña). Al vencer no desaparecen: se marcan.
  restante?: string; // «2 asaltos», «hasta las 00:10»
  vencida?: boolean;
  efecto?: string; // qué le hace a los números, con su traza
};

export type Personaje = {
  id: string;
  nombre: string;
  jugador: string;
  clase: string;
  nivel: number;
  raza: string;
  pv: number;
  pvMax: number;
  ca: number;
  iniciativa: number;
  estados: Estado[];
  haciendo: string; // sacado del hilo
  retrato: string; // color de sello
  esYo?: boolean;
};

export type Enemigo = {
  id: string;
  nombre: string;
  pv: number;
  pvMax: number;
  ca: number;
  estados: Estado[];
  retrato: string;
};

export type Accion = {
  id: string;
  nombre: string;
  coste: string; // escrito bajo el nombre
  tipo: "ataque" | "conjuro" | "objeto" | "movimiento";
  detalle: string;
  usos?: string;
};

export type MensajeHilo = {
  id: string;
  tipo: "narracion" | "personaje" | "tirada" | "sello" | "sistema";
  autor?: string;
  color?: "text" | "copper" | "accent" | "danger";
  cuerpo: string;
  hora: string;
  // para tiradas incrustadas
  tirada?: {
    quien: string;
    prueba: string;
    dificultad?: number;
    resultado: number;
    exito: boolean;
    desglose: { origen: string; valor: string }[];
  };
};

export type EntradaMundo = {
  id: string;
  nombre: string;
  tipo: "Personaje" | "Lugar" | "Misión" | "Facción" | "Objeto" | "Suceso" | "Documento";
  resumen: string;
  visibilidad: Visibilidad;
  cuerpo: string;
  enlaces: string[];
};

export type Campana = {
  id: string;
  titulo: string;
  subtitulo: string;
  ultimaVez: string;
  dondeSeQuedo: string;
  sesion: number;
  grupo: string[];
  sello: string;
};

export const campanas: Campana[] = [
  {
    id: "c1",
    titulo: "Las Mareas de Vhalor",
    subtitulo: "Crónica de la Compañía del Ancla Rota",
    ultimaVez: "hace 3 días",
    dondeSeQuedo:
      "El grupo acaba de forzar la puerta del almacén cuatro del Puerto Viejo, buscando el manifiesto que incrimina al gremio de estibadores.",
    sesion: 14,
    grupo: ["Brann", "Sirella", "Kaeloth", "Mira", "Doran"],
    sello: "#c97d46",
  },
  {
    id: "c2",
    titulo: "El Invierno de Ashenmoor",
    subtitulo: "Cuando la nieve no se derritió",
    ultimaVez: "hace 2 semanas",
    dondeSeQuedo:
      "La caravana quedó varada en el paso de Hveldrún; algo aúlla más allá de la línea de árboles.",
    sesion: 6,
    grupo: ["Torvin", "Aelith", "Bram"],
    sello: "#4a9bb8",
  },
  {
    id: "c3",
    titulo: "Bajo la Ciudad de Latón",
    subtitulo: "Una deuda con los genios",
    ultimaVez: "hace 2 meses",
    dondeSeQuedo:
      "Firmasteis un contrato que ninguno leyó del todo. El sello aún arde en la mesa.",
    sesion: 22,
    grupo: ["Yusra", "Cassian", "Nima", "Roderick"],
    sello: "#e0a83c",
  },
];

export const grupo: Personaje[] = [
  {
    id: "p1",
    nombre: "Sirella Vane",
    jugador: "Tú",
    clase: "Pícara arcana",
    nivel: 6,
    raza: "Semielfa",
    pv: 31,
    pvMax: 44,
    ca: 16,
    iniciativa: 4,
    estados: [{ nombre: "escondida", tono: "accent" }],
    haciendo: "Fuerza la cerradura del arcón",
    retrato: "#4a9bb8",
    esYo: true,
  },
  {
    id: "p2",
    nombre: "Brann Piedrahonda",
    jugador: "Nacho",
    clase: "Paladín",
    nivel: 6,
    raza: "Enano de las colinas",
    pv: 22,
    pvMax: 58,
    ca: 19,
    iniciativa: 1,
    estados: [{ nombre: "herido", tono: "danger" }],
    haciendo: "Cubre la puerta con el escudo en alto",
    retrato: "#c97d46",
  },
  {
    id: "p3",
    nombre: "Kaeloth",
    jugador: "Vera",
    clase: "Brujo del Abismo",
    nivel: 6,
    raza: "Tiefling",
    pv: 38,
    pvMax: 40,
    ca: 13,
    iniciativa: 3,
    estados: [{ nombre: "concentrado en Bendición", tono: "warning", restante: "9 asaltos", efecto: "Si recibe daño, salvación de Constitución o pierde el conjuro" }],
    haciendo: "Sostiene una llama fría entre los dedos",
    retrato: "#c4564b",
  },
  {
    id: "p4",
    nombre: "Mira Alondra",
    jugador: "Luci",
    clase: "Clériga de la Luz",
    nivel: 6,
    raza: "Humana",
    pv: 45,
    pvMax: 45,
    ca: 18,
    iniciativa: 2,
    estados: [],
    haciendo: "Reza en voz baja, atenta al pasillo",
    retrato: "#e0a83c",
  },
  {
    id: "p5",
    nombre: "Doran Ferrán",
    jugador: "Sergio",
    clase: "Montaraz",
    nivel: 6,
    raza: "Mediano",
    pv: 12,
    pvMax: 49,
    ca: 15,
    iniciativa: 6,
    estados: [
      { nombre: "envenenado", tono: "danger", restante: "3 asaltos", efecto: "Desventaja en ataques y pruebas de característica" },
      { nombre: "prisa", tono: "accent", restante: "2 asaltos", efecto: "Velocidad ×2 y una acción extra" },
    ],
    haciendo: "Apunta con el arco desde las cajas",
    retrato: "#8b99a1",
  },
];

export const enemigos: Enemigo[] = [
  {
    id: "e1",
    nombre: "Capataz Grosk",
    pv: 34,
    pvMax: 52,
    ca: 15,
    estados: [{ nombre: "marcado", tono: "accent" }],
    retrato: "#c4564b",
  },
  {
    id: "e2",
    nombre: "Matón del gremio",
    pv: 11,
    pvMax: 22,
    ca: 13,
    estados: [],
    retrato: "#8b99a1",
  },
  {
    id: "e3",
    nombre: "Matón del gremio",
    pv: 22,
    pvMax: 22,
    ca: 13,
    estados: [{ nombre: "asustado", tono: "warning" }],
    retrato: "#8b99a1",
  },
  {
    id: "e4",
    nombre: "Sabueso de humo",
    pv: 0,
    pvMax: 18,
    ca: 14,
    estados: [{ nombre: "caído", tono: "muted" }],
    retrato: "#2a2419",
  },
];

// Orden de iniciativa (combate a medias)
export const iniciativa = [
  { id: "p5", nombre: "Doran", valor: 21, tipo: "aliado" as const },
  { id: "e1", nombre: "Grosk", valor: 18, tipo: "enemigo" as const },
  { id: "p1", nombre: "Sirella", valor: 16, tipo: "aliado" as const, actual: true },
  { id: "p3", nombre: "Kaeloth", valor: 14, tipo: "aliado" as const },
  { id: "e2", nombre: "Matón", valor: 11, tipo: "enemigo" as const },
  { id: "p2", nombre: "Brann", valor: 9, tipo: "aliado" as const },
  { id: "p4", nombre: "Mira", valor: 7, tipo: "aliado" as const },
  { id: "e3", nombre: "Matón", valor: 5, tipo: "enemigo" as const },
];

export const accionesSirella: Accion[] = [
  { id: "a1", nombre: "Estoque", coste: "Acción", tipo: "ataque", detalle: "+8 al ataque · 1d8+4 perforante" },
  { id: "a2", nombre: "Ataque furtivo", coste: "1 vez/turno", tipo: "ataque", detalle: "+3d6 si tienes ventaja", usos: "listo" },
  { id: "a3", nombre: "Destello arcano", coste: "Acción · truco", tipo: "conjuro", detalle: "+6 · 2d6 de fuego" },
  { id: "a4", nombre: "Escudo", coste: "Reacción · nivel 1", tipo: "conjuro", detalle: "+5 CA hasta tu turno", usos: "3/3" },
  { id: "a5", nombre: "Retirada rápida", coste: "Acción adicional", tipo: "movimiento", detalle: "Correr, retirarse o esconderte" },
  { id: "a6", nombre: "Poción de curación", coste: "Acción", tipo: "objeto", detalle: "Recupera 2d4+2 PV", usos: "×2" },
];

export const hilo: MensajeHilo[] = [
  { id: "m1", tipo: "sello", cuerpo: "Sesión 14 · El Puerto Viejo, almacén cuatro", hora: "18:02" },
  { id: "m2", tipo: "narracion", color: "copper", cuerpo: "La puerta cede con un crujido húmedo. Dentro, el aire huele a salitre y a brea. Hileras de cajas se pierden en la oscuridad, y en algún lugar del fondo gotea agua sobre piedra.", hora: "18:03" },
  { id: "m3", tipo: "personaje", autor: "Brann", color: "text", cuerpo: "—Que nadie toque nada hasta que yo lo diga. Esto huele a trampa.", hora: "18:04" },
  { id: "m4", tipo: "personaje", autor: "Sirella", color: "accent", cuerpo: "—Tú cubre la puerta, grandullón. Yo me encargo de lo que gotea.", hora: "18:05" },
  { id: "m5", tipo: "narracion", color: "copper", cuerpo: "Entre las cajas hay un arcón de hierro con dos cerraduras. Una es corriente. La otra tiene grabada una sirena mordiéndose la cola.", hora: "18:07" },
  {
    id: "m6", tipo: "tirada", hora: "18:08",
    cuerpo: "Sirella intenta forzar la cerradura corriente.",
    tirada: {
      quien: "Sirella", prueba: "Juego de manos", dificultad: 15, resultado: 22, exito: true,
      desglose: [
        { origen: "Dado (d20)", valor: "14" },
        { origen: "Destreza", valor: "+4" },
        { origen: "Competencia", valor: "+3" },
        { origen: "Herramientas de ladrón", valor: "+1" },
      ],
    },
  },
  { id: "m7", tipo: "narracion", color: "copper", cuerpo: "El pestillo cede con un chasquido limpio. La segunda cerradura, en cambio, emite un tenue resplandor verdemar cuando acercas la ganzúa.", hora: "18:09" },
  { id: "m8", tipo: "personaje", autor: "Kaeloth", color: "danger", cuerpo: "—Espera. Eso es un sello de convocación. Si lo fuerzas, no sacaremos oro: sacaremos algo con dientes.", hora: "18:10" },
  { id: "m9", tipo: "personaje", autor: "Mira", color: "text", cuerpo: "—¿Puedo intentar leer la inscripción? A lo mejor hay una palabra que lo abra sin romperlo.", hora: "18:11" },
  {
    id: "m10", tipo: "tirada", hora: "18:12",
    cuerpo: "Mira examina el grabado de la sirena.",
    tirada: {
      quien: "Mira", prueba: "Conocimiento arcano", dificultad: 17, resultado: 12, exito: false,
      desglose: [
        { origen: "Dado (d20)", valor: "7" },
        { origen: "Inteligencia", valor: "+2" },
        { origen: "Competencia", valor: "+3" },
      ],
    },
  },
  { id: "m11", tipo: "narracion", color: "copper", cuerpo: "Las runas se te resisten. Reconoces la forma de la orden, pero no el idioma en que está escrita. Y el resplandor, ahora, late más deprisa.", hora: "18:13" },
  { id: "m12", tipo: "sistema", cuerpo: "El DM ha revelado un lugar nuevo: «El Puerto Viejo, almacén cuatro».", hora: "18:13" },
  { id: "m13", tipo: "personaje", autor: "Doran", color: "text", cuerpo: "—Yo voto por cerrar el arcón y salir por donde hemos venido. Ya.", hora: "18:14" },
  { id: "m14", tipo: "personaje", autor: "Brann", color: "text", cuerpo: "—Demasiado tarde. Hay pasos en el muelle. Vienen hacia aquí.", hora: "18:15" },
  { id: "m15", tipo: "sello", cuerpo: "¡Combate! El capataz Grosk irrumpe con dos matones.", hora: "18:16" },
  { id: "m16", tipo: "narracion", color: "copper", cuerpo: "Grosk descorre el cerrojo de una patada. Es más ancho que la puerta y trae un gancho de estibador en la mano derecha.", hora: "18:16" },
  {
    id: "m17", tipo: "tirada", hora: "18:17",
    cuerpo: "Doran dispara al capataz desde las cajas.",
    tirada: {
      quien: "Doran", prueba: "Ataque con arco largo", resultado: 19, exito: true,
      desglose: [
        { origen: "Dado (d20)", valor: "13" },
        { origen: "Destreza", valor: "+4" },
        { origen: "Competencia", valor: "+3" },
        { origen: "Ventaja por prisa", valor: "—" },
      ],
    },
  },
  { id: "m18", tipo: "narracion", color: "copper", cuerpo: "La flecha se clava en el hombro de Grosk, que ruge más de rabia que de dolor y arranca hacia Brann.", hora: "18:17" },
  { id: "m19", tipo: "personaje", autor: "Kaeloth", color: "danger", cuerpo: "—Sirella, deja el arcón. Te necesito flanqueándolo por la izquierda.", hora: "18:18" },
  { id: "m20", tipo: "sistema", cuerpo: "Es tu turno. Te queda: acción, acción adicional y reacción.", hora: "18:19" },
];

export const mundo: EntradaMundo[] = [
  {
    id: "w1", nombre: "El Puerto Viejo", tipo: "Lugar", visibilidad: "jugadores",
    resumen: "El barrio más antiguo de Vhalor, ganado al mar a fuerza de escollera.",
    enlaces: ["Gremio de Estibadores", "Capataz Grosk"],
    cuerpo: "El Puerto Viejo es una lengua de muelles podridos y almacenes que ningún censo se ha molestado en contar dos veces. De día lo gobiernan los estibadores; de noche, cualquiera con un cuchillo y una razón. El almacén cuatro lleva tres años cerrado por orden del gremio, y nadie recuerda quién guardó la llave.",
  },
  {
    id: "w2", nombre: "Capataz Grosk", tipo: "Personaje", visibilidad: "publico",
    resumen: "Mano derecha del gremio en los muelles. Cobra deudas con un gancho.",
    enlaces: ["Gremio de Estibadores", "El Puerto Viejo"],
    cuerpo: "Grosk fue marinero antes que matón, y aún lleva el andar de cubierta. Le deben lealtad porque paga a tiempo y castiga despacio. No es cruel por gusto: es cruel porque le sale barato.",
  },
  {
    id: "w3", nombre: "Gremio de Estibadores", tipo: "Facción", visibilidad: "jugadores",
    resumen: "Controla qué entra y qué sale del puerto. Y a veces, quién.",
    enlaces: ["El Puerto Viejo", "El manifiesto del Ancla Rota"],
    cuerpo: "Oficialmente reparten el trabajo del muelle con justicia. Extraoficialmente deciden qué barcos descargan y cuáles esperan hasta pudrirse. El manifiesto que buscáis probaría lo segundo.",
  },
  {
    id: "w4", nombre: "El manifiesto del Ancla Rota", tipo: "Objeto", visibilidad: "dueno",
    resumen: "Un registro de carga que nunca debió existir por duplicado.",
    enlaces: ["Gremio de Estibadores", "Misión: La deuda de Sirella"],
    cuerpo: "Dos páginas de contabilidad apretada que enlazan tres cargamentos de contrabando con firmas del propio consejo portuario. Vale más que su peso en veneno.",
  },
  {
    id: "w5", nombre: "La deuda de Sirella", tipo: "Misión", visibilidad: "concretos",
    resumen: "Recuperar el manifiesto salda una deuda vieja. O crea una peor.",
    enlaces: ["El manifiesto del Ancla Rota", "El Puerto Viejo"],
    cuerpo: "Alguien del consejo prometió limpiar el nombre de la familia Vane a cambio del manifiesto. Sirella no ha dicho al grupo por qué le importa tanto.",
  },
  {
    id: "w6", nombre: "El sello de la sirena", tipo: "Suceso", visibilidad: "dm",
    resumen: "La segunda cerradura del arcón no es una cerradura.",
    enlaces: ["El manifiesto del Ancla Rota"],
    cuerpo: "Es un sello de convocación menor. Forzarlo libera un sabueso de humo ligado al arcón. El grupo aún no lo sabe con certeza; Kaeloth lo sospecha.",
  },
];

// ─────────────────────────────────────────────────────────────
// RONDA 2 · lo que el motor hace por debajo
// ─────────────────────────────────────────────────────────────

// La TRAZA: cada número guarda de dónde sale, paso a paso con su origen.
export type Paso = { origen: string; valor: string; nota?: string };
export type Traza = { formula: string; pasos: Paso[] };

export type CompetenciaHab = "ninguna" | "media" | "competente" | "pericia";

export type Habilidad = {
  nombre: string;
  caracteristica: string;
  competencia: CompetenciaHab;
  valor: string;
  traza: Traza;
};

export type HojaCompleta = {
  personajeId: string;
  competencia: number;
  caracteristicas: { nombre: string; abrev: string; valor: number; mod: string }[];
  ca: { valor: number; traza: Traza };
  pg: { actual: number; max: number; temporal: number; traza: Traza };
  iniciativa: { valor: string; traza: Traza };
  velocidades: { nombre: string; valor: string; traza?: Traza }[];
  percepcionPasiva: { valor: number; traza: Traza };
  visionOscuridad: string;
  salvaciones: { nombre: string; valor: string; competente: boolean; traza: Traza }[];
  habilidades: Habilidad[];
  ataques: {
    nombre: string;
    bono: string;
    dano: string;
    tipo: string;
    versatil?: string;
    alcance: string;
    traza: Traza;
  }[];
  monedas: { pp: number; po: number; pe: number; pa: number; pc: number };
  recursos: { nombre: string; actual: number; max: number; reposicion: string }[];
  salvacionesMuerte: { exitos: number; fracasos: number };
  sintonizacion: { usadas: number; tope: number; objetos: string[] };
  ranuras: { ranura: string; objeto: string | null }[];
  subidaNivel: { de: number; a: number; cambios: { que: string; detalle: string }[] } | null;
};

export const hojaSirella: HojaCompleta = {
  personajeId: "p1",
  competencia: 3,
  caracteristicas: [
    { nombre: "Fuerza", abrev: "FUE", valor: 10, mod: "+0" },
    { nombre: "Destreza", abrev: "DES", valor: 18, mod: "+4" },
    { nombre: "Constitución", abrev: "CON", valor: 14, mod: "+2" },
    { nombre: "Inteligencia", abrev: "INT", valor: 13, mod: "+1" },
    { nombre: "Sabiduría", abrev: "SAB", valor: 12, mod: "+1" },
    { nombre: "Carisma", abrev: "CAR", valor: 15, mod: "+2" },
  ],
  ca: {
    valor: 16,
    traza: {
      formula: "CA 16 = 12 cuero tachonado + 4 Destreza",
      pasos: [
        { origen: "Cuero tachonado", valor: "12", nota: "tope de Destreza: sin límite" },
        { origen: "Destreza", valor: "+4" },
      ],
    },
  },
  pg: {
    actual: 31,
    max: 44,
    temporal: 5,
    traza: {
      formula: "PG máx 44 = 8 (dado nivel 1) + 30 (niveles 2–6) + 6 Constitución",
      pasos: [
        { origen: "Dado de golpe nivel 1", valor: "8" },
        { origen: "Niveles 2–6 (5×5 medio del d8)", valor: "+30" },
        { origen: "Constitución (×6 niveles)", valor: "+6" },
      ],
    },
  },
  iniciativa: {
    valor: "+4",
    traza: { formula: "Iniciativa +4 = 4 Destreza", pasos: [{ origen: "Destreza", valor: "+4" }] },
  },
  velocidades: [
    { nombre: "Caminar", valor: "35 pies", traza: { formula: "35 pies = 30 base + 5 pies ligeros de mediano", pasos: [{ origen: "Base", valor: "30" }, { origen: "Pies ligeros", valor: "+5" }] } },
    { nombre: "Trepar", valor: "17 pies" },
    { nombre: "Nadar", valor: "17 pies" },
    { nombre: "Volar", valor: "—" },
    { nombre: "Excavar", valor: "—" },
  ],
  percepcionPasiva: {
    valor: 14,
    traza: {
      formula: "Percepción pasiva 14 = 10 + 1 Sabiduría + 3 competencia",
      pasos: [
        { origen: "Base", valor: "10" },
        { origen: "Sabiduría", valor: "+1" },
        { origen: "Competencia", valor: "+3" },
      ],
    },
  },
  visionOscuridad: "18 metros",
  salvaciones: [
    { nombre: "Fuerza", valor: "+0", competente: false, traza: { formula: "+0 = 0 Fuerza", pasos: [{ origen: "Fuerza", valor: "+0" }] } },
    { nombre: "Destreza", valor: "+7", competente: true, traza: { formula: "+7 = 4 Destreza + 3 competencia", pasos: [{ origen: "Destreza", valor: "+4" }, { origen: "Competencia", valor: "+3" }] } },
    { nombre: "Constitución", valor: "+2", competente: false, traza: { formula: "+2 = 2 Constitución", pasos: [{ origen: "Constitución", valor: "+2" }] } },
    { nombre: "Inteligencia", valor: "+4", competente: true, traza: { formula: "+4 = 1 Inteligencia + 3 competencia", pasos: [{ origen: "Inteligencia", valor: "+1" }, { origen: "Competencia", valor: "+3" }] } },
    { nombre: "Sabiduría", valor: "+1", competente: false, traza: { formula: "+1 = 1 Sabiduría", pasos: [{ origen: "Sabiduría", valor: "+1" }] } },
    { nombre: "Carisma", valor: "+2", competente: false, traza: { formula: "+2 = 2 Carisma", pasos: [{ origen: "Carisma", valor: "+2" }] } },
  ],
  habilidades: [
    { nombre: "Sigilo", caracteristica: "DES", competencia: "pericia", valor: "+10", traza: { formula: "+10 = 4 Destreza + 3 competencia + 3 pericia", pasos: [{ origen: "Destreza", valor: "+4" }, { origen: "Competencia", valor: "+3" }, { origen: "Pericia (duplica competencia)", valor: "+3" }] } },
    { nombre: "Juego de manos", caracteristica: "DES", competencia: "pericia", valor: "+10", traza: { formula: "+10 = 4 Destreza + 3 competencia + 3 pericia", pasos: [{ origen: "Destreza", valor: "+4" }, { origen: "Competencia", valor: "+3" }, { origen: "Pericia", valor: "+3" }] } },
    { nombre: "Percepción", caracteristica: "SAB", competencia: "competente", valor: "+4", traza: { formula: "+4 = 1 Sabiduría + 3 competencia", pasos: [{ origen: "Sabiduría", valor: "+1" }, { origen: "Competencia", valor: "+3" }] } },
    { nombre: "Engaño", caracteristica: "CAR", competencia: "competente", valor: "+5", traza: { formula: "+5 = 2 Carisma + 3 competencia", pasos: [{ origen: "Carisma", valor: "+2" }, { origen: "Competencia", valor: "+3" }] } },
    { nombre: "Investigación", caracteristica: "INT", competencia: "competente", valor: "+4", traza: { formula: "+4 = 1 Inteligencia + 3 competencia", pasos: [{ origen: "Inteligencia", valor: "+1" }, { origen: "Competencia", valor: "+3" }] } },
    { nombre: "Acrobacias", caracteristica: "DES", competencia: "media", valor: "+5", traza: { formula: "+5 = 4 Destreza + 1 (media competencia)", pasos: [{ origen: "Destreza", valor: "+4" }, { origen: "Media competencia", valor: "+1" }] } },
    { nombre: "Perspicacia", caracteristica: "SAB", competencia: "ninguna", valor: "+1", traza: { formula: "+1 = 1 Sabiduría", pasos: [{ origen: "Sabiduría", valor: "+1" }] } },
    { nombre: "Atletismo", caracteristica: "FUE", competencia: "ninguna", valor: "+0", traza: { formula: "+0 = 0 Fuerza", pasos: [{ origen: "Fuerza", valor: "+0" }] } },
  ],
  ataques: [
    { nombre: "Estoque élfico", bono: "+8", dano: "1d8+4", tipo: "perforante", versatil: "1d10+4", alcance: "cuerpo a cuerpo", traza: { formula: "+8 = 4 Destreza + 3 competencia + 1 arma élfica", pasos: [{ origen: "Destreza", valor: "+4" }, { origen: "Competencia", valor: "+3" }, { origen: "Arma élfica", valor: "+1" }] } },
    { nombre: "Ballesta de mano", bono: "+7", dano: "1d6+4", tipo: "perforante", alcance: "9/36 m", traza: { formula: "+7 = 4 Destreza + 3 competencia", pasos: [{ origen: "Destreza", valor: "+4" }, { origen: "Competencia", valor: "+3" }] } },
  ],
  monedas: { pp: 2, po: 143, pe: 0, pa: 27, pc: 88 },
  recursos: [
    { nombre: "Dados de golpe (d8)", actual: 4, max: 6, reposicion: "descanso largo" },
    { nombre: "Inspiración", actual: 1, max: 1, reposicion: "a criterio del DM" },
    { nombre: "Espacio de conjuro nivel 1", actual: 3, max: 4, reposicion: "descanso largo" },
    { nombre: "Retirada ingeniosa", actual: 1, max: 1, reposicion: "descanso corto" },
  ],
  salvacionesMuerte: { exitos: 0, fracasos: 0 },
  sintonizacion: { usadas: 1, tope: 3, objetos: ["Capa de la sombra menguante"] },
  ranuras: [
    { ranura: "Armadura", objeto: "Cuero tachonado" },
    { ranura: "Escudo", objeto: null },
    { ranura: "Mano principal", objeto: "Estoque élfico" },
    { ranura: "Mano secundaria", objeto: "Ballesta de mano" },
    { ranura: "Sintonizado", objeto: "Capa de la sombra menguante" },
  ],
  subidaNivel: {
    de: 6,
    a: 7,
    cambios: [
      { que: "Puntos de golpe", detalle: "+6 (5 del d8 + 1 Constitución) → 50 máx" },
      { que: "Evasión", detalle: "Nuevo rasgo: media daño en salvaciones de Destreza fallidas" },
      { que: "Competencia", detalle: "Sin cambios (+3)" },
    ],
  },
};

// BLOQUES DE REGLAS · vocabulario cerrado de tres carriles
export type PiezaCarril = "suceso" | "condicion" | "efecto";
export const vocabularioReglas: Record<PiezaCarril, string[]> = {
  suceso: [
    "empieza la sesión", "se cierra la sesión", "se abre una ficha", "se comenta una ficha",
    "se revela una ficha", "se pone una marca", "se levanta una señal", "el DM ejecuta algo",
    "se enlazan dos fichas", "una tirada de característica", "se ataca una ficha", "entra un miembro",
  ],
  condicion: [
    "una marca vale sí", "un conjunto tiene al menos N miembros", "alguien está en un conjunto",
    "están todos los jugadores presentes", "el sujeto lleva una etiqueta",
    "se han revelado al menos N fichas con una etiqueta", "vamos por la sesión N o más",
    "esta regla no ha disparado nunca",
  ],
  efecto: [
    "revelar una ficha", "ocultar una ficha", "poner una marca", "meter a alguien en un conjunto",
    "sacar a alguien de un conjunto", "levantar una señal", "avisar a alguien",
    "añadir una nota a la sesión", "armar otra regla", "desarmar otra regla",
  ],
};

export type Regla = {
  id: string;
  cuando: string;
  si: string;
  haz: string;
  armada: boolean;
  disparos: number;
  propuesta?: boolean;
};
export const reglas: Regla[] = [
  { id: "r1", cuando: "se revela una ficha", si: "el sujeto lleva una etiqueta", haz: "avisar a alguien", armada: true, disparos: 3 },
  { id: "r2", cuando: "están todos los jugadores presentes", si: "vamos por la sesión N o más", haz: "revelar una ficha", armada: true, disparos: 0 },
  { id: "r3", cuando: "se ataca una ficha", si: "una marca vale sí", haz: "levantar una señal", armada: false, disparos: 12 },
  { id: "r4", cuando: "se revela una ficha", si: "alguien está en un conjunto", haz: "avisar a alguien", armada: true, disparos: 0, propuesta: true },
];

// TABLAS DEL DM
export type FilaTabla = { rango: string; resultado: string };
export type TablaDM = {
  id: string;
  nombre: string;
  disparador: "ninguno" | "critico" | "pifia";
  visibilidad: Visibilidad;
  activa: boolean; // regla de la casa, nace apagada
  dado: string;
  filas: FilaTabla[];
};
export const tablasDM: TablaDM[] = [
  {
    id: "t1", nombre: "Pifias en combate", disparador: "pifia", visibilidad: "dm", activa: false, dado: "1d6",
    filas: [
      { rango: "1", resultado: "Se te cae el arma a tus pies." },
      { rango: "2", resultado: "Golpeas al aliado más cercano (mitad de daño)." },
      { rango: "3", resultado: "Resbalas: quedas derribado." },
      { rango: "4", resultado: "Tu arma se atasca; pierdes tu próxima acción para liberarla." },
      { rango: "5", resultado: "Pierdes el equilibrio: desventaja hasta tu próximo turno." },
      { rango: "6", resultado: "Cuerda de arco rota o filo mellado (−1 hasta reparar)." },
    ],
  },
  {
    id: "t2", nombre: "Botín de matón portuario", disparador: "ninguno", visibilidad: "dm", activa: true, dado: "1d8",
    filas: [
      { rango: "1–3", resultado: "1d10 piezas de plata y un dado cargado." },
      { rango: "4–5", resultado: "Un gancho de estibador (arma improvisada)." },
      { rango: "6–7", resultado: "Una llave de latón sin dueño conocido." },
      { rango: "8", resultado: "Un pagaré firmado por el consejo portuario." },
    ],
  },
];

// PREPARACIÓN DE LA PRÓXIMA SESIÓN (taller del DM)
export const prepSesion = {
  escenaAbre: "El almacén cuatro, con Grosk medio vencido y las sirenas del puerto sonando.",
  aRevelar: ["El manifiesto del Ancla Rota", "El sello de la sirena"],
  criaturas: ["Capataz Grosk", "Matón del gremio ×2", "Sabueso de humo"],
  tiradas: ["Percepción para oír la patrulla", "Salvación de Constitución contra el humo"],
};

// ESTADO DEL MUNDO (marcas, conjuntos, señales)
export const estadoMundo = {
  marcas: [
    { nombre: "el-puente-cayó", valor: true },
    { nombre: "grosk-sabe-tu-nombre", valor: true },
    { nombre: "manifiesto-en-manos-del-grupo", valor: false },
  ],
  conjuntos: [
    { nombre: "Los que saben lo de Sirella", miembros: ["Kaeloth"] },
    { nombre: "Deudores del gremio", miembros: ["Sirella", "Doran"] },
  ],
  senales: ["patrulla-en-camino"],
};
