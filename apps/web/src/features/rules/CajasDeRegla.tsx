import { useState, type DragEvent, type ReactNode } from "react";
import { Button } from "../../ui";
import { IconoAccion, IconoAgarre, IconoEstado, IconoRanura, IconoSuceso } from "./iconos";
import { CLASES_DE_PARTE, SILUETA, tipoDeArrastre } from "./partes";
import {
  ARTICULO_PARTE,
  CARRIL_DE_PARTE,
  CONDICIONES,
  DISPARADORES,
  EFECTOS,
  NOMBRE_PARTE,
  QUE_ES_PARTE,
  QUE_PIDE_CARRIL,
  avisosDeConfusion,
  nombreDePieza,
  type ParteDeRegla,
} from "./vocabulario";

// Tarea R1 — cajas que se arrastran, pero que caen en carriles fijos.
//
// **La ranura *es* la conexión.** No hay cables y no hay posición libre, así que el «error
// invisible» de los editores de nodos —una caja que parece conectada y no lo está— aquí no
// puede existir: o una caja está dentro de un carril, y entonces forma parte de la regla, o
// está en la paleta, y entonces no. No hay tercer estado que dibujar mal.
//
// **Arrastrar tiene alternativa de teclado, y no como extra.** Cada pieza de la paleta es un
// `<button>` de verdad: pulsarla la coloca en su carril. Un editor que solo funciona con ratón
// excluye a quien no puede usarlo y, de paso, hace imposible una prueba honesta —`jsdom` no
// arrastra—. Con el botón, la colocación se prueba en RTL y el gesto de arrastre en el navegador.
//
// **Un carril rechaza lo que no es suyo mientras lo arrastras**, no al soltarlo. Por eso la
// parte viaja en el *tipo* del `DataTransfer` (ver `partes.ts`): es lo único que el navegador
// deja mirar durante `dragover`.

/** El dibujo de la parte. Redundante con la silueta y con la palabra, a propósito. */
export function IconoDeParte({ parte, className }: { parte: ParteDeRegla; className?: string }) {
  if (parte === "SUCESO") return <IconoSuceso className={className} />;
  if (parte === "ESTADO") return <IconoEstado className={className} />;
  return <IconoAccion className={className} />;
}

/**
 * La pieza de la paleta. Se arrastra **y** se pulsa: las dos rutas hacen exactamente lo mismo,
 * que es lo que permite probar el resultado sin un navegador y el gesto con uno.
 */
export function PiezaDePaleta({
  parte,
  clave,
  onColocar,
}: {
  parte: ParteDeRegla;
  clave: string;
  onColocar: (clave: string) => void;
}) {
  const nombre = nombreDePieza(clave);
  const clases = CLASES_DE_PARTE[parte];
  return (
    <button
      type="button"
      draggable
      data-parte={parte}
      data-clave={clave}
      // El nombre accesible empieza por el texto visible (WCAG 2.5.3) y sigue con lo que hace.
      aria-label={`${nombre} — poner en el carril ${CARRIL_DE_PARTE[parte]}`}
      onDragStart={(e: DragEvent<HTMLButtonElement>) => {
        e.dataTransfer.effectAllowed = "copy";
        e.dataTransfer.setData(tipoDeArrastre(parte), clave);
        e.dataTransfer.setData("text/plain", nombre);
      }}
      onClick={() => onColocar(clave)}
      style={{ clipPath: SILUETA[parte] }}
      className={[
        "flex w-full cursor-grab items-center gap-s2 border py-1.5 pl-s2 text-left active:cursor-grabbing",
        parte === "ACCION" ? "pb-s3 pr-s2" : "pr-s5",
        clases.borde,
        clases.silueta,
        "font-chrome text-chrome-xs text-text",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
      ].join(" ")}
    >
      <IconoAgarre className={clases.texto} />
      <span className="min-w-0 flex-1">{nombre}</span>
    </button>
  );
}

/** Un grupo de la paleta: todas las piezas de una parte, visibles a la vez. */
function GrupoDePaleta({
  parte,
  claves,
  tope,
  onColocar,
}: {
  parte: ParteDeRegla;
  claves: readonly string[];
  /** Si el carril ya no admite más, el motivo — se escribe, no se calla. */
  tope?: string;
  onColocar: (parte: ParteDeRegla, clave: string) => void;
}) {
  const clases = CLASES_DE_PARTE[parte];
  return (
    <section aria-label={`Piezas de tipo ${NOMBRE_PARTE[parte]}`} className="min-w-0">
      <h4
        className={[
          "flex items-center gap-s2 font-chrome text-chrome-xs uppercase tracking-[0.14em]",
          clases.texto,
        ].join(" ")}
      >
        <IconoDeParte parte={parte} />
        {NOMBRE_PARTE[parte]}
        <span className="font-chrome text-chrome-xs normal-case tracking-normal text-muted">
          → carril «{CARRIL_DE_PARTE[parte]}»
        </span>
      </h4>
      <p className="mb-s2 mt-1 font-chrome text-chrome-xs leading-snug text-muted">
        {QUE_ES_PARTE[parte]}
      </p>
      {tope ? (
        <p className="mb-s2 font-chrome text-chrome-xs text-warning-text">{tope}</p>
      ) : (
        <ul className="space-y-1">
          {claves.map((clave) => (
            <li key={clave}>
              <PiezaDePaleta parte={parte} clave={clave} onColocar={(k) => onColocar(parte, k)} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * La paleta entera. **Las 28 piezas del vocabulario cerrado, visibles a la vez** y agrupadas
 * por parte, en vez de escondidas en tres desplegables que se parecían entre sí. Que el
 * vocabulario sea cerrado es justo lo que hace esto viable.
 */
export function PaletaDeCajas({
  topes,
  onColocar,
}: {
  topes?: Partial<Record<ParteDeRegla, string>>;
  onColocar: (parte: ParteDeRegla, clave: string) => void;
}) {
  return (
    <div className="grid gap-s3 sm:grid-cols-3">
      <GrupoDePaleta
        parte="SUCESO"
        claves={DISPARADORES}
        tope={topes?.SUCESO}
        onColocar={onColocar}
      />
      <GrupoDePaleta
        parte="ESTADO"
        claves={CONDICIONES}
        tope={topes?.ESTADO}
        onColocar={onColocar}
      />
      <GrupoDePaleta parte="ACCION" claves={EFECTOS} tope={topes?.ACCION} onColocar={onColocar} />
    </div>
  );
}

/**
 * Un carril: la ranura fija de una parte. Acepta lo suyo y **rechaza lo demás mientras se
 * arrastra**, que es la diferencia entre enseñar la regla y castigarla.
 */
export function CarrilDeCajas({
  parte,
  vacio,
  children,
  onSoltar,
}: {
  parte: ParteDeRegla;
  vacio: boolean;
  children: ReactNode;
  onSoltar: (clave: string) => void;
}) {
  const [encima, setEncima] = useState(false);
  const clases = CLASES_DE_PARTE[parte];
  const tipo = tipoDeArrastre(parte);

  function admite(e: DragEvent<HTMLElement>) {
    return [...e.dataTransfer.types].includes(tipo);
  }

  return (
    <section
      aria-label={`Carril ${CARRIL_DE_PARTE[parte]}`}
      data-carril={parte}
      data-encima={encima ? "si" : "no"}
      onDragOver={(e) => {
        // Sin `preventDefault` el navegador no deja soltar: un carril rechaza lo ajeno solo.
        if (!admite(e)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
        setEncima(true);
      }}
      onDragLeave={() => setEncima(false)}
      onDrop={(e) => {
        setEncima(false);
        if (!admite(e)) return;
        e.preventDefault();
        const clave = e.dataTransfer.getData(tipo);
        if (clave) onSoltar(clave);
      }}
      className={[
        "rounded-radius-sm border-2 p-s3 transition-colors",
        encima ? `${clases.borde} ${clases.fondo}` : "border-dashed border-muted/60",
      ].join(" ")}
    >
      <h3 className="flex items-baseline gap-s2 font-title text-chrome-md text-text">
        {CARRIL_DE_PARTE[parte]}
        <span
          className={["font-chrome text-chrome-xs uppercase tracking-[0.14em]", clases.texto].join(
            " ",
          )}
        >
          {NOMBRE_PARTE[parte]}
        </span>
      </h3>
      <p className="mb-s2 mt-1 font-chrome text-chrome-xs leading-snug text-muted">
        {QUE_ES_PARTE[parte]}
      </p>
      {vacio ? (
        <p className="flex items-start gap-s2 font-chrome text-chrome-xs leading-snug text-muted">
          <IconoRanura className="mt-0.5" />
          <span>{QUE_PIDE_CARRIL[parte]}</span>
        </p>
      ) : (
        <ul className="space-y-s3">{children}</ul>
      )}
    </section>
  );
}

/**
 * Una caja ya colocada. Lleva escrito de qué parte es y **qué significa esa parte** —«ocurrió
 * algo» frente a «algo es verdad»—, más el aviso de la pieza con la que se confunde, si la hay.
 * Eso es R4: la distinción va en la caja, no en una ayuda que nadie abre.
 */
export function CajaColocada({
  parte,
  clave,
  onQuitar,
  motivoParaNoQuitar,
  children,
}: {
  parte: ParteDeRegla;
  clave: string;
  onQuitar?: () => void;
  /** Si no se puede quitar, el motivo — se enseña, no se esconde en silencio. */
  motivoParaNoQuitar?: string;
  children: ReactNode;
}) {
  const clases = CLASES_DE_PARTE[parte];
  const avisos = avisosDeConfusion(clave);
  return (
    <li
      data-parte={parte}
      data-clave={clave}
      className={[
        "rounded-radius-sm border-y border-r border-l-4 p-s2",
        clases.borde,
        clases.fondo,
      ].join(" ")}
    >
      <div className="mb-s2 flex items-start justify-between gap-s2">
        <div className="min-w-0">
          <p className="flex items-center gap-s2 font-chrome text-chrome-sm text-text">
            <IconoDeParte parte={parte} className={clases.texto} />
            <span className="min-w-0">{nombreDePieza(clave)}</span>
          </p>
          <p className={["mt-0.5 font-chrome text-chrome-xs", clases.texto].join(" ")}>
            Es {ARTICULO_PARTE[parte]}. {QUE_ES_PARTE[parte]}
          </p>
          {avisos.map((aviso) => (
            <p key={aviso} className="mt-0.5 font-chrome text-chrome-xs text-muted">
              {aviso}
            </p>
          ))}
        </div>
        {onQuitar ? (
          <Button variant="ghost" type="button" onClick={onQuitar}>
            Quitar
          </Button>
        ) : (
          motivoParaNoQuitar && (
            <p className="max-w-[14rem] shrink-0 text-right font-chrome text-chrome-xs text-muted">
              {motivoParaNoQuitar}
            </p>
          )
        )}
      </div>
      {children}
    </li>
  );
}
