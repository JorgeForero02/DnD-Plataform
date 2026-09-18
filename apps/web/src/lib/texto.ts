/**
 * «Poción» y «pocion» son la misma búsqueda: se quitan las marcas diacríticas y las mayúsculas.
 * Una sola copia (#9, 2026-09-17): antes vivía repetida en el inventario y dos veces en el árbol del
 * mundo. La de `wikilinks.ts` NO es esta — además pliega espacios — y se queda allí.
 */
export function normalizarTexto(texto: string): string {
  // El rango de marcas diacríticas se escribe escapado: los dos caracteres combinantes en crudo
  // eran invisibles en el editor y un formateador los podía «arreglar».
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
