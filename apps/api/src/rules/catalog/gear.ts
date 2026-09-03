// Tarea 2B — carril A1: una selección corta de equipo de aventura del SRD 5.1.
//
// **Atribución:** material del System Reference Document 5.1, © Wizards of the Coast LLC,
// CC BY 4.0. **Los nombres son los de la traducción oficial al español publicada por Wizards**
// (tabla «Equipo de aventura» del «Documento de referencia del sistema 5.1»), igual que hizo
// `armor.ts`. Ver `NOTICE.md` de la raíz.
//
// **Solo nombre, peso y precio.** El equipo de aventura del SRD no da CA ni daño ni ningún otro
// número que el motor sepa sumar; es inventario puro. **Unidades**: peso en **onzas** (16 oz =
// 1 lb) y precio en **piezas de cobre** (1 po = 100 pc, 1 pp = 10 pc).
//
// **Selección, no la tabla entera**: el SRD trae más de sesenta filas de equipo de aventura y
// el encargo pide una muestra corta y representativa (§A1 del carril), no la tabla completa —
// a diferencia de `weapons.ts`, que sí es la tabla íntegra.

export interface SrdGear {
  key: string;
  name: string;
  weightOz: number;
  costCp: number;
}

export const SRD_GEAR: SrdGear[] = [
  { key: "hempen-rope-50ft", name: "Cuerda de cáñamo (15 metros)", weightOz: 160, costCp: 100 },
  { key: "rations-1-day", name: "Raciones de viaje (un día)", weightOz: 32, costCp: 50 },
  { key: "torch", name: "Antorcha", weightOz: 16, costCp: 1 },
  { key: "bedroll", name: "Saco de dormir", weightOz: 112, costCp: 100 },
  { key: "thieves-tools", name: "Herramientas de ladrón", weightOz: 16, costCp: 2500 },
  { key: "backpack", name: "Mochila", weightOz: 80, costCp: 200 },
  { key: "waterskin", name: "Odre", weightOz: 80, costCp: 20 },
  { key: "flint-and-steel", name: "Pedernal y yesca", weightOz: 0, costCp: 50 },
  { key: "hooded-lantern", name: "Linterna sorda", weightOz: 32, costCp: 500 },
  { key: "oil-flask", name: "Aceite (frasco)", weightOz: 16, costCp: 10 },
  { key: "silk-rope-50ft", name: "Cuerda de seda (15 metros)", weightOz: 80, costCp: 1000 },
  { key: "piton", name: "Piqueta", weightOz: 4, costCp: 5 },
  { key: "hammer", name: "Martillo", weightOz: 48, costCp: 100 },
  { key: "bell", name: "Campana", weightOz: 0, costCp: 100 },
  { key: "ink-1oz-bottle", name: "Tinta (frasco de una onza)", weightOz: 0, costCp: 1000 },
  { key: "paper-1-sheet", name: "Papel (una hoja)", weightOz: 0, costCp: 20 },
  { key: "sack", name: "Saco", weightOz: 8, costCp: 1 },
  { key: "blanket", name: "Manta", weightOz: 48, costCp: 50 },
];
