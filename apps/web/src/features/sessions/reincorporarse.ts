import type { GameEventRow } from "./log-api";

// B1.2 — **«desde aquí te lo perdiste».**
//
// Sale del §6 del reseño de la mesa, y de un matiz del autor que una partida solo en directo no
// tendría: *«sesiones largas y del tirón, **pero alguien puede irse a la mitad y volver**»*. De
// ahí el requisito, textual: **reincorporarse tiene que ser gratis** — marca de por dónde ibas,
// «desde aquí te lo perdiste», y el estado además de la historia.
//
// **Se guarda en el navegador y no en el servidor, y es una decisión, no una comodidad.** Por
// dónde iba leyendo es un dato del lector, no de la partida: no lo comparte nadie, no se audita,
// y guardarlo en el servidor significaría una tabla, un endpoint y una escritura por cada vez que
// alguien mira la pantalla. `localStorage` es exactamente su sitio, y falla bien: si no hay nada
// guardado —ventana privada, otro dispositivo, datos borrados— no se marca nada y la mesa se lee
// como siempre. **Ninguna decisión de partida depende de esto.**

const CLAVE = "dnd-mesa-visto";

/** Por campaña: dos campañas abiertas no se pisan la marca. */
function claveDe(campaignId: string): string {
  return `${CLAVE}:${campaignId}`;
}

/**
 * El último suceso que este navegador dio por leído. `null` si no hay nada guardado, y eso NO es
 * un error: es la primera vez.
 *
 * Todo va en `try/catch` porque `localStorage` no solo puede venir vacío — en una ventana privada
 * o con las cookies bloqueadas, **el acceso mismo lanza**. Es la misma envoltura que usa
 * `ui/theme.ts` desde 1.19, y por el mismo motivo.
 */
export function ultimoVisto(campaignId: string): string | null {
  try {
    return localStorage.getItem(claveDe(campaignId));
  } catch {
    return null;
  }
}

export function marcarVisto(campaignId: string, eventId: string): void {
  try {
    localStorage.setItem(claveDe(campaignId), eventId);
  } catch {
    // Sin almacenamiento no hay marca, y la mesa se lee entera. Es el peor caso y es inofensivo.
  }
}

/**
 * Cuántos sucesos hay **más nuevos** que la marca, y cuál es el primero que no se vio.
 *
 * `eventos` llega como lo manda el servidor: **lo más reciente primero**. Esta función no se fía
 * de ese orden para decidir qué es nuevo —lo comprueba por fecha—, pero sí devuelve el resultado
 * en los mismos términos que la lista que se va a pintar, para que quien la use no tenga que
 * reordenar nada.
 *
 * Devuelve `desde: null` cuando no hay marca o cuando no hay nada nuevo. **Los dos casos se
 * pintan igual —sin franja— y eso es correcto**: a quien entra por primera vez no se le puede
 * decir «esto te lo perdiste», porque no se perdió nada; simplemente no estaba.
 */
export function loQueTePerdiste(
  eventos: readonly GameEventRow[],
  marca: string | null,
): { cuantos: number; desde: string | null } {
  if (!marca) return { cuantos: 0, desde: null };

  const visto = eventos.find((e) => e.id === marca);
  // La marca puede apuntar a un suceso que ya no está en la ventana que se pidió —el registro
  // llega paginado— o a uno borrado con su campaña. **No se marca nada** en ese caso: decir «te
  // perdiste 50» cuando en realidad no se sabe es peor que no decir nada.
  if (!visto) return { cuantos: 0, desde: null };

  const corte = Date.parse(visto.createdAt);
  if (Number.isNaN(corte)) return { cuantos: 0, desde: null };

  const nuevos = eventos.filter((e) => {
    const fecha = Date.parse(e.createdAt);
    return !Number.isNaN(fecha) && fecha > corte;
  });
  if (nuevos.length === 0) return { cuantos: 0, desde: null };

  // El más ANTIGUO de los nuevos: es donde va la franja, porque es por donde hay que seguir
  // leyendo. Poner la franja en el más reciente la dejaría arriba del todo, sin nada debajo.
  const primero = nuevos.reduce((viejo, e) =>
    Date.parse(e.createdAt) < Date.parse(viejo.createdAt) ? e : viejo,
  );
  return { cuantos: nuevos.length, desde: primero.id };
}

/** «3 cosas» / «1 cosa». La forma legible se escribe una vez, aquí. */
export function fraseDeLoPerdido(cuantos: number): string {
  return cuantos === 1
    ? "Desde aquí te perdiste 1 suceso"
    : `Desde aquí te perdiste ${cuantos} sucesos`;
}
