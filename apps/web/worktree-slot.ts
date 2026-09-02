// Re-exporta la aritmética de slots desde scripts/worktree-slot.mjs, la fuente única — ver
// ese archivo y docs/02-entorno.md ("Trabajar en paralelo"). No reimplementar aquí: eso fue
// exactamente el bug de la ronda anterior (dos copias que podían divergir).
export * from "../../scripts/worktree-slot.mjs";
