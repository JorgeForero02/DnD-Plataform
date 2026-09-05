import { Injectable, Logger } from "@nestjs/common";

// Plan 12 · 12.3 (D-OP-22) — **el bus del nervio en vivo.**
//
// **Un aviso, no un dato.** Por aquí viaja «algo ha cambiado en esta campaña», y el navegador
// recarga por el endpoint autorizado de siempre. Es la razón de diseño entera: un canal tonto no
// filtra, y por lo tanto **no puede filtrar mal**. Mandar el dato ahorraría una petición y metería
// la matriz de visibilidad en un segundo sitio — el fallo que este proyecto ya declaró que no
// repite (`apps/api/src/common/visibility.ts` es el dueño único).
//
// **El mensaje es agnóstico del transporte**, y eso no es purismo: la fase 3.C trae fichas que se
// arrastran y llega **antes** que la fase 4, así que sobre este mismo bus se enchufará un
// WebSocket. Si aquí apareciera la sintaxis de SSE —`event:`, `data:`— el día del WebSocket habría
// que rehacerlo. Ver `docs/superpowers/specs/2026-09-05-nervio-en-vivo-transporte-design.md`.
//
// **LIMITACIÓN CONOCIDA, ESCRITA A PROPÓSITO: esto reparte EN MEMORIA, dentro de un proceso.**
// Con **varias réplicas de la API**, un aviso publicado en la réplica A no llega a quien está
// suscrito en la B, y el sondeo de red de seguridad es lo único que salva esa mesa. Hoy hay **un
// solo contenedor** (`docs/03-despliegue.md`), así que la limitación no muerde. El día que haya
// réplicas —o presencia, que es estado efímero con caducidad— entra Redis **detrás de esta misma
// interfaz**, sin tocar ni el emisor ni el controlador.

/**
 * Lo único que viaja por el canal. **Nada que haya que filtrar**: si algún día hace falta meter
 * aquí un campo que dependa de quién mira, está mal por diseño — ese campo se pide por su ruta.
 */
export interface AvisoEnVivo {
  /** Qué clase de cosa ha pasado. Es el `type` del suceso, que la pantalla usa para decidir qué recargar. */
  type: string;
  campaignId: string;
  /** A qué se refiere, si se refiere a algo. Un identificador opaco: leerlo sigue pasando por `canView`. */
  subjectType?: string;
  subjectId?: string;
}

export type OyenteEnVivo = (aviso: AvisoEnVivo) => void;

@Injectable()
export class LiveBus {
  private readonly logger = new Logger(LiveBus.name);
  private readonly oyentes = new Map<string, Set<OyenteEnVivo>>();

  /** Se suscribe a una campaña y devuelve **la función de cancelar**, que hay que llamar al cerrar. */
  subscribe(campaignId: string, oyente: OyenteEnVivo): () => void {
    const suyos = this.oyentes.get(campaignId) ?? new Set<OyenteEnVivo>();
    suyos.add(oyente);
    this.oyentes.set(campaignId, suyos);
    return () => {
      suyos.delete(oyente);
      // Un `Set` vacío por campaña sería una fuga pequeña y perpetua: una mesa que se abrió una
      // vez deja su hueco para siempre.
      if (suyos.size === 0) this.oyentes.delete(campaignId);
    };
  }

  /**
   * Publica un aviso. **Nunca lanza**: un oyente roto —una conexión que se cerró entre medias—
   * no puede tumbar la petición que estaba escribiendo en la base.
   */
  publish(aviso: AvisoEnVivo): void {
    const suyos = this.oyentes.get(aviso.campaignId);
    if (!suyos) return;
    for (const oyente of suyos) {
      try {
        oyente(aviso);
      } catch (error) {
        this.logger.warn(`Un oyente del canal falló y se ignora: ${String(error)}`);
      }
    }
  }

  /** Cuántas conexiones hay abiertas para esa campaña. Solo para pruebas y diagnóstico. */
  cuantosEscuchan(campaignId: string): number {
    return this.oyentes.get(campaignId)?.size ?? 0;
  }
}
