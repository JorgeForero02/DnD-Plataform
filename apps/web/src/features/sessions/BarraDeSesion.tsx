import { useState } from "react";
import { Link } from "react-router-dom";
import type { SessionNoteKind } from "@dnd/shared";
import { useCurrentSession, useMinutoActual, useStampNote } from "./hooks";
import { ICONO_SELLO, NOMBRE_SELLO, SELLOS_EN_ORDEN, duracionDesde } from "./vocabulario";
import { IconoEnJuego } from "./iconos";
import { Button } from "../../ui/Button";
import { fieldControlClass } from "../../ui/Field";

// La barra de «en juego».
//
// **Por qué una barra global y no una pantalla.** La investigación de once VTT dejó un patrón sin
// excepciones: el estado «se está jugando» se comunica con **un solo elemento persistente**, no
// con un rediseño — la pausa de Foundry, el nombre de escena de Alchemy en la cabecera de todos.
// Y aquí resolvía además un fallo activo: la API distingue tres estados de sesión desde 2A.5 y
// **ninguna pantalla los enseñaba**, así que nadie empezaba una sesión y **todo el combate se
// grababa fuera de sesión** — `GET /events?sessionId=…` devolvía dos sucesos de diecinueve. Lo
// descubrió un DM dirigiendo una partida de prueba.
//
// **`AppShell` decide si montarla, mirando la ruta.** No basta con que se calle sola: consultar
// la sesión es una llamada de datos, y `/acerca-de` es una pantalla PÚBLICA que se monta sin
// cliente de consultas. Montarla siempre convertía el armazón en algo que exige ese cliente, y
// la suite lo cazó al instante. Vive bajo campaña, así que fuera de campaña ni se monta.
//
// **Adoptada de la maqueta (2026-09-02).** Una franja estrecha, de altura fija, con cuatro cosas
// en una sola línea: el punto, la frase «En juego · <sesión>», el tiempo transcurrido en cifras
// monoespaciadas, y a la derecha «Ir a la mesa». Antes eran seis piezas de anchura variable que
// se envolvían en dos filas en cuanto el título era largo. Lo que la maqueta **no** tiene y aquí
// se conserva es «Anotar»: sellar sin salir de donde estés es la razón por la que esta barra
// existe además de la mesa, y la maqueta lo resuelve mandándote a la mesa.

/**
 * Alto de la cabecera de la aplicación (`ui/AppShell.tsx`, `h-16`), que es a lo que esta barra
 * se tiene que pegar.
 *
 * **El defecto que esto arregla** (ficha en `docs/06-pendientes.md`): las dos eran
 * `sticky top-0`, así que al desplazar se **solapaban** — la barra quedaba tapada por la
 * cabecera, que además va en `z-30`. Aquí baja a `z-20` a propósito: si algún día vuelven a
 * cruzarse, gana la cabecera, que es el marco.
 *
 * Y **el `sticky` lo lleva el envoltorio, no la franja**: `sticky` se pega dentro de su padre, así
 * que el panel de sellos tiene que estar **dentro** del mismo elemento pegado. La versión anterior
 * le daba al panel su propio `sticky top-9`, un número escrito a mano que ya no cuadraba con nada.
 */
const PEGADA_BAJO_LA_CABECERA = "sticky top-16 z-20";

export function BarraDeSesion({ campaignId }: { campaignId: string }) {
  const { data: sesion } = useCurrentSession(campaignId);
  const [abierto, setAbierto] = useState(false);
  const ahora = useMinutoActual(Boolean(sesion));

  if (!sesion) return null;

  return (
    <div className={PEGADA_BAJO_LA_CABECERA}>
      <div role="status" aria-label="Sesión en curso" className="border-b border-copper bg-surface">
        <div className="mx-auto flex h-8 max-w-[1400px] items-center gap-s3 px-s5">
          <IconoEnJuego className="h-2 w-2 shrink-0 text-copper-text" />
          {/* `data-medida` existe para que la prueba de contraste del navegador NOMBRE lo que
              mide en vez de contar `span`s por su posición. Contarlos ya se rompió una vez: basta
              añadir un separador para que el «span número 1» pase a ser otra cosa. */}
          <span
            data-medida="en-juego"
            className="shrink-0 font-chrome text-chrome-xs font-semibold uppercase tracking-[0.14em] text-copper-text"
          >
            En juego
          </span>
          <span aria-hidden="true" className="shrink-0 font-chrome text-chrome-xs text-copper">
            ·
          </span>
          <span
            data-medida="titulo"
            className="min-w-0 flex-1 truncate font-chrome text-chrome-xs text-text"
          >
            {sesion.title}
          </span>
          <span data-medida="duracion" className="shrink-0 font-data text-chrome-xs text-muted">
            {duracionDesde(sesion.startedAt, ahora)}
          </span>
          <Button
            type="button"
            variant="ghost"
            className="shrink-0 px-2 py-0.5 text-chrome-xs"
            onClick={() => setAbierto((v) => !v)}
            aria-expanded={abierto}
          >
            Anotar
          </Button>
          <Link
            to={`/campaigns/${campaignId}/sesion`}
            data-medida="ir-a-la-mesa"
            className="shrink-0 font-chrome text-chrome-xs text-accent-text underline"
          >
            Ir a la mesa
          </Link>
        </div>
      </div>
      {abierto && <PanelDeSellos campaignId={campaignId} onCerrar={() => setAbierto(false)} />}
    </div>
  );
}

/**
 * Los sellos rápidos.
 *
 * **La idea entera es que escribir cuesta y pulsar no.** Un DM dirigiendo no va a redactar; sí
 * va a dar un golpe a un botón. Y como el sello lleva su clase, el resumen que se escribe al
 * cerrar sale **ya agrupado** en vez de ser un muro de texto que nadie relee.
 *
 * **Los pone cualquier miembro, no solo el DM.** La crítica más repetida a estas herramientas es
 * que un registro que solo escribe el DM se queda vacío: quien vio el detalle es quien lo anota.
 *
 * El texto es opcional a propósito: el sello solo ya cuenta algo.
 */
function PanelDeSellos({ campaignId, onCerrar }: { campaignId: string; onCerrar: () => void }) {
  const sellar = useStampNote(campaignId);
  const [texto, setTexto] = useState("");
  const [soloDm, setSoloDm] = useState(false);
  const [ultimo, setUltimo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // **El sello vacío no se manda, y este era el SEGUNDO sitio.**
  //
  // La auditoría del 2026-09-04 dio dos direcciones para el mismo defecto —«`MesaDeSesion.tsx`
  // :793-805 **y** :886-901»—: el compositor del hilo y este. El carril del hilo arregló el suyo y
  // declaró que «no queda ninguna ruta»; su revisión encontró que sí quedaba, y es esta, que
  // además **se pinta en toda pantalla de campaña** (`ui/AppShell.tsx`). Pulsar «Nota» aquí seguía
  // escribiendo en el registro una entrada que decía «Nota» y nada más.
  //
  // El texto va sin `|| undefined`: si llegamos aquí es porque hay texto, y mandar `undefined`
  // desde un botón que solo se habilita con texto sería dejar viva la misma puerta por detrás.
  //
  // **Y esto sigue siendo pantalla, no validación.** `stampSessionNoteSchema`
  // (`packages/shared/src/session.schema.ts`) declara `text` como `optional()` sin `min(1)`, así
  // que una llamada directa a la API sigue creando el sello vacío. El arreglo de verdad es ese
  // `.min(1)` en el esquema compartido; queda preguntado al autor porque toca el servidor.
  const poner = async (kind: SessionNoteKind) => {
    const anotado = texto.trim();
    if (anotado === "") return;
    setError(null);
    try {
      await sellar.mutateAsync({
        kind,
        text: anotado,
        visibility: soloDm ? "DM_ONLY" : "PLAYERS",
      });
      setUltimo(NOMBRE_SELLO[kind]);
      setTexto("");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    // Sin `sticky` propio: va dentro del envoltorio pegado de arriba.
    //
    // **Corrección de un comentario caducado, que era la tercera copia de la misma frase falsa.**
    // Aquí ponía que «ninguna clase de opacidad de Tailwind compila en este proyecto». Fue verdad
    // —y por eso esta línea llegó a no pintar ningún filete—, pero **dejó de serlo en B0**:
    // `tailwind.config.js` declara los canales como `rgb(var(--x-ch) / <alpha-value>)` y abre la
    // escala de opacidad de 0 a 100, porque la maqueta escribe `/15`, `/45` y `/62`. Hoy
    // `border-muted/20` se pintaría. La frase caducada llegó a copiarse a los encargos de dos
    // carriles como si fuera una restricción viva, y dos revisiones tuvieron que desmentirla
    // midiendo el CSS emitido: documentación que miente es peor que ausente.
    <div
      role="region"
      aria-label="Anotar en la sesión"
      className="border-b border-muted bg-surface"
    >
      <div className="mx-auto max-w-[1400px] px-s5 py-s2">
        <div className="flex flex-wrap items-center gap-s2">
          {SELLOS_EN_ORDEN.map((kind) => {
            const Icono = ICONO_SELLO[kind];
            return (
              <Button
                key={kind}
                type="button"
                variant="ghost"
                className="flex items-center gap-1.5 px-2 py-1 text-chrome-xs"
                disabled={sellar.isPending || texto.trim() === ""}
                onClick={() => void poner(kind)}
              >
                <Icono className="h-4 w-4" />
                {NOMBRE_SELLO[kind]}
              </Button>
            );
          })}
          <label className="ml-auto flex items-center gap-1.5 font-chrome text-chrome-xs text-muted">
            <input
              type="checkbox"
              checked={soloDm}
              onChange={(e) => setSoloDm(e.target.checked)}
              className="accent-[var(--accent)]"
            />
            Solo el DM lo ve
          </label>
          <Button
            type="button"
            variant="ghost"
            className="px-2 py-1 text-chrome-xs"
            onClick={onCerrar}
          >
            Cerrar
          </Button>
        </div>
        <input
          aria-label="Qué anotar"
          placeholder="…y si quieres, en dos palabras qué pasó"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          className={`${fieldControlClass} mt-s2`}
        />
        {/* El número que cambia ES la confirmación: aquí no cambia nada visible, así que hace
            falta decirlo. Una línea, no un aviso flotante — los flotantes se van antes de que
            un lector de pantalla llegue a él. */}
        {ultimo && !error && (
          <p role="status" className="mt-1 font-chrome text-chrome-xs text-muted">
            Anotado: {ultimo}.
          </p>
        )}
        {error && (
          <p role="alert" className="mt-1 font-chrome text-chrome-xs text-danger-text">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
