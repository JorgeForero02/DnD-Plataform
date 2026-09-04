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
    estados: [{ nombre: "concentrado", tono: "warning" }],
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
      { nombre: "envenenado", tono: "danger" },
      { nombre: "prisa", tono: "accent" },
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
