// Declaraciones para worktree-slot.mjs (JS plano) — permite importarlo desde .ts sin
// activar allowJs para todo el paquete. Mantener en sync con las firmas del .mjs.
export function getWorktreeSlot(): number;
export function apiPortForSlot(slot?: number): number;
export function webPortForSlot(slot?: number): number;
export function databaseNameForSlot(slot?: number): string;
export function databaseUrlForSlot(baseUrl: string, slot?: number): string;
export function readEnvValue(filePath: string, key: string): string | undefined;
