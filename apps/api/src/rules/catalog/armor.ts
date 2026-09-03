// Tarea 2A.3 — armaduras y escudos del SRD 5.1, con su fórmula de CA.
//
// **Atribución:** material del System Reference Document 5.1, © Wizards of the Coast LLC,
// CC BY 4.0. **Los nombres son los de la traducción oficial al español publicada por Wizards**
// (tabla «Armaduras» del «Documento de referencia del sistema 5.1»), no una traducción nuestra.
// Ver `NOTICE.md` de la raíz.
//
// **Peso y precio se añadieron en la tarea 2B (carril A1)**: son inventario, y con el catálogo
// de objetos (`items-srd.ts`) ya hay algo que los consume y los comprueba
// (`resolvedItemSchema` en `@dnd/shared`). Peso en **onzas** (16 oz = 1 lb, el SRD lo da en
// libras) y precio en **piezas de cobre** (1 po = 100 pc).
//
// El tope de Destreza es lo que 2A.2 llama `abilityCap`, y la diferencia entre `0` y
// `undefined` no es cosmética: en armadura pesada la Destreza **se recorta a cero y el recorte
// se enseña en la traza**; en ligera no hay tope. Un `0` mal puesto da una CA silenciosamente
// baja y un `undefined` mal puesto la da silenciosamente alta.

import type { SrdArmor } from "./types";

export const SRD_ARMOR: SrdArmor[] = [
  // --- Ligera: sin tope de Destreza ---
  {
    key: "padded",
    name: "Acolchada",
    category: "LIGHT",
    baseAc: 11,
    strengthRequirement: 0,
    stealthDisadvantage: true,
    weightOz: 128,
    costCp: 500,
  },
  {
    key: "leather",
    name: "Cuero",
    category: "LIGHT",
    baseAc: 11,
    strengthRequirement: 0,
    stealthDisadvantage: false,
    weightOz: 160,
    costCp: 1000,
  },
  {
    key: "studded-leather",
    name: "Cuero tachonado",
    category: "LIGHT",
    baseAc: 12,
    strengthRequirement: 0,
    stealthDisadvantage: false,
    weightOz: 208,
    costCp: 4500,
  },

  // --- Media: la Destreza suma como mucho +2 ---
  {
    key: "hide",
    name: "Pieles",
    category: "MEDIUM",
    baseAc: 12,
    dexCap: 2,
    strengthRequirement: 0,
    stealthDisadvantage: false,
    weightOz: 192,
    costCp: 1000,
  },
  {
    key: "chain-shirt",
    name: "Camisa de malla",
    category: "MEDIUM",
    baseAc: 13,
    dexCap: 2,
    strengthRequirement: 0,
    stealthDisadvantage: false,
    weightOz: 320,
    costCp: 5000,
  },
  {
    key: "scale-mail",
    name: "Cota de escamas",
    category: "MEDIUM",
    baseAc: 14,
    dexCap: 2,
    strengthRequirement: 0,
    stealthDisadvantage: true,
    weightOz: 720,
    costCp: 5000,
  },
  {
    key: "breastplate",
    name: "Coraza",
    category: "MEDIUM",
    baseAc: 14,
    dexCap: 2,
    strengthRequirement: 0,
    stealthDisadvantage: false,
    weightOz: 320,
    costCp: 40000,
  },
  {
    key: "half-plate",
    name: "Media armadura",
    category: "MEDIUM",
    baseAc: 15,
    dexCap: 2,
    strengthRequirement: 0,
    stealthDisadvantage: true,
    weightOz: 640,
    costCp: 75000,
  },

  // --- Pesada: la Destreza no suma nada ---
  {
    key: "ring-mail",
    name: "Cota guarnecida",
    category: "HEAVY",
    baseAc: 14,
    dexCap: 0,
    strengthRequirement: 0,
    stealthDisadvantage: true,
    weightOz: 640,
    costCp: 3000,
  },
  {
    key: "chain-mail",
    name: "Cota de malla",
    category: "HEAVY",
    baseAc: 16,
    dexCap: 0,
    strengthRequirement: 13,
    stealthDisadvantage: true,
    weightOz: 880,
    costCp: 7500,
  },
  {
    key: "splint",
    name: "Armadura de bandas",
    category: "HEAVY",
    baseAc: 17,
    dexCap: 0,
    strengthRequirement: 15,
    stealthDisadvantage: true,
    weightOz: 960,
    costCp: 20000,
  },
  {
    key: "plate",
    name: "Armadura de placas",
    category: "HEAVY",
    baseAc: 18,
    dexCap: 0,
    strengthRequirement: 15,
    stealthDisadvantage: true,
    weightOz: 1040,
    costCp: 150000,
  },

  // --- Escudo: no es una fórmula, es una suma plana que va con cualquiera ---
  {
    key: "shield",
    name: "Escudo",
    category: "SHIELD",
    baseAc: 2,
    strengthRequirement: 0,
    stealthDisadvantage: false,
    weightOz: 96,
    costCp: 1000,
  },
];
