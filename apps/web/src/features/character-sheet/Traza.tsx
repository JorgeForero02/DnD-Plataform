import { useId, useState } from "react";
import type { ReactNode } from "react";
import type { AbilityKey, DerivedValue, TraceStep } from "@dnd/shared";
import { NOMBRE_CARACTERISTICA, NOMBRE_OPERACION_TRAZA, traducirLabelKey } from "./vocabulario";

// Tarea 2A.10 — la traza es la funcionalidad, no un adorno (docs/superpowers/specs/
// 2026-09-02-hoja-5e-design.md, §3). Cada valor calculado se pinta ya resuelto, con un
// desplegable que enseña de dónde sale cada punto: «CA 18 = 14 cota de malla + 2 escudo +
// 2 Destreza».

/**
 * El chevron del desplegable, **dibujado**. Era `▾`/`▸`, glifos de fuente: prohibidos por
 * `docs/04-convenciones.md` salvo los cinco declarados de `ui/Badge.tsx`. Un glifo se pinta a
 * todo color en unos sistemas y como un cuadrado vacío en otros.
 */
function Chevron({ abierta }: { abierta: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`h-3 w-3 shrink-0 transition-transform ${abierta ? "rotate-90" : ""}`}
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

/**
 * **La fórmula de una línea, siempre visible.** Bajo el número y en pequeño: «10 +2 destreza».
 *
 * Es el nivel que la hoja de papel nunca pudo dar y el que hace que la mayoría **no tenga que
 * desplegar nada**. Sale de la misma traza que el desglose largo, así que no puede discrepar de
 * él — que es justo el fallo que la investigación documentó en las hojas digitales: un número
 * calculado sin contexto se cree ciegamente aunque esté mal.
 *
 * **Se resume a partir de tres pasos.** Con doce sumandos esto ya no es una línea: es la traza
 * otra vez, peor maquetada y compitiendo con ella. Se enseñan la base y los dos que más pesan.
 */
function formulaDeUnaLinea(valor: DerivedValue): string {
  // Un paso que no mueve el total no explica nada. La excepción es `base`, que es de dónde parte.
  const pasos = valor.steps.filter((p) => p.op === "base" || p.amount !== 0);
  if (pasos.length === 0) return "";
  const nombrar = (p: TraceStep) => {
    const { texto } = traducirLabelKey(p.labelKey);
    const n = Math.abs(p.amount);
    if (p.op === "base") return `${n} ${texto.toLowerCase()}`;
    return `${p.amount >= 0 ? "+" : "−"}${n} ${texto.toLowerCase()}`;
  };
  if (pasos.length <= 3) return pasos.map(nombrar).join(" ");
  const [base, ...resto] = pasos;
  const mayores = [...resto].sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount)).slice(0, 2);
  return `${[base, ...mayores].map(nombrar).join(" ")} y ${pasos.length - 3} más`;
}

function signoDe(paso: TraceStep): string {
  if (paso.op === "base") return "";
  return paso.amount >= 0 ? "+" : "−";
}

/**
 * **Tarea H5 — la traza deja de ser solo explicación y pasa a ser la navegación de la edición.**
 *
 * Devuelve el rótulo del campo editable que *causa* este paso, o `null` si el paso no sale de
 * nada que se pueda tocar en esta pantalla (una armadura, por ejemplo: el inventario llega en la
 * fase 2B). Ese rótulo es el nombre accesible del control en `IdentidadEditable.tsx`, y **sale
 * del mismo diccionario que lo escribió allí** (`vocabulario.ts`) — no se copia el texto a mano,
 * porque entonces habría dos fuentes para el mismo nombre y una de las dos acabaría mintiendo.
 *
 * **Esto NO convierte el valor derivado en editable.** El total sigue sin subrayado de edición:
 * la afordancia es información de dominio, y su ausencia significa «esto lo calculo yo». Lo que
 * H5 añade es un camino hacia la causa, con la afordancia de un enlace, no la de un campo.
 */
function causaEditableDe(paso: TraceStep): string | null {
  const caracteristica = /^(?:ability\.([a-z]+)\.base|abilityMod\.([a-z]+))$/.exec(paso.labelKey);
  const clave = caracteristica?.[1] ?? caracteristica?.[2];
  if (clave && clave in NOMBRE_CARACTERISTICA) return NOMBRE_CARACTERISTICA[clave as AbilityKey];

  // El bonificador de competencia no se teclea: sale del nivel, que sí. Llevar el foco al propio
  // bonificador sería llevarlo a otro número derivado, y la traza dejaría de explicar nada.
  if (paso.labelKey === "proficiencyBonus") return "Nivel";

  // La subraza queda fuera a propósito: su selector solo existe cuando la raza tiene subrazas, y
  // un enlace que a veces no lleva a ninguna parte es peor que no tenerlo.
  if (/^race\./.test(paso.labelKey)) return "Raza";
  if (/^class\./.test(paso.labelKey)) return "Clase";

  return null;
}

/**
 * Lleva el foco al control cuyo nombre accesible es `etiqueta`.
 *
 * Se busca por `aria-label` porque es lo que hace que el control **se llame así** para un lector
 * de pantalla: si alguien lo renombra, el enlace deja de encontrarlo y la prueba se pone roja, en
 * vez de quedarse apuntando a un `id` que ya no significa nada.
 */
function enfocarCausa(etiqueta: string) {
  const destino = document.querySelector<HTMLElement>(`[aria-label="${etiqueta}"]`);
  if (!destino) return;
  // `scrollIntoView` no existe en jsdom; la llamada opcional deja que la prueba de componente
  // compruebe el foco sin fingir una maquetación que jsdom no tiene.
  destino.scrollIntoView?.({ block: "center" });
  destino.focus();
}

function PasoDeTraza({ paso }: { paso: TraceStep }) {
  const { texto, conocida } = traducirLabelKey(paso.labelKey);
  const causa = causaEditableDe(paso);
  const clase = ["font-chrome text-chrome-xs", conocida ? "text-muted" : "text-danger-text"].join(
    " ",
  );
  const contenido = (
    <>
      <span aria-hidden="true" className="mr-1 text-[0.85em] uppercase tracking-wide">
        {NOMBRE_OPERACION_TRAZA[paso.op]}
      </span>
      <span>{texto}</span>
    </>
  );

  return (
    <li className="flex items-baseline justify-between gap-s2 py-0.5">
      {causa ? (
        <button
          type="button"
          data-causa={causa}
          data-untranslated={conocida ? undefined : "true"}
          // El nombre accesible es el texto del paso: nada de `aria-label="Ir a Destreza"`, que
          // dejaría al lector de pantalla anunciando la acción en lugar del contenido — el mismo
          // fallo que ya se pagó una vez en `TextoEditable`.
          title={`Ir a ${causa}, que es de donde sale este paso`}
          onClick={() => enfocarCausa(causa)}
          className={`${clase} text-left underline decoration-dotted underline-offset-2 hover:text-accent-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent`}
        >
          {contenido}
        </button>
      ) : (
        <span className={clase} data-untranslated={conocida ? undefined : "true"}>
          {contenido}
        </span>
      )}
      <span className="font-data text-chrome-xs text-text">
        {signoDe(paso)}
        {Math.abs(paso.amount)}
      </span>
    </li>
  );
}

export interface ValorDerivadoProps {
  /** El rótulo en español que ve la mesa: «CA», «Salvación de Destreza». */
  etiqueta: string;
  valor: DerivedValue;
  /** Botón de acción extra (por ejemplo, "Tirar") pegado a la cabecera. */
  accion?: ReactNode;
  /** Compacto = una fila de lista (salvación/habilidad); si no, la casilla grande de combate. */
  variante?: "casilla" | "fila";
}

/**
 * Un valor derivado con su traza desplegable. **`ninguna clave de enumeración llega a
 * pantalla`**: `traducirLabelKey` decide el texto, nunca se imprime `paso.labelKey` a secas
 * fuera de esta función.
 */
export function ValorDerivado({
  etiqueta,
  valor,
  accion,
  variante = "casilla",
}: ValorDerivadoProps) {
  const [abierta, setAbierta] = useState(false);
  const listId = useId();

  if (variante === "fila") {
    return (
      <div className="border-b border-muted/25 py-s2">
        <div className="flex items-center justify-between gap-s2">
          <button
            type="button"
            onClick={() => setAbierta((v) => !v)}
            aria-expanded={abierta}
            aria-controls={listId}
            className="flex flex-1 items-center gap-s2 text-left font-chrome text-chrome-sm text-text hover:text-accent-text"
          >
            <Chevron abierta={abierta} />
            {etiqueta}
          </button>
          <span className="font-data text-chrome-md text-text">
            {valor.total >= 0 ? "+" : ""}
            {valor.total}
          </span>
          {accion}
        </div>
        <p className="ml-s5 font-chrome text-chrome-xs text-muted">{formulaDeUnaLinea(valor)}</p>
        {abierta && (
          <ul id={listId} className="ml-s5 mt-1 border-l border-muted/40 pl-s3">
            {valor.steps.map((paso, i) => (
              <PasoDeTraza key={i} paso={paso} />
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-radius-sm border border-muted/50 bg-surface px-s3 py-s3 text-center">
      <p className="font-chrome text-chrome-xs uppercase tracking-[0.14em] text-muted">
        {etiqueta}
      </p>
      <button
        type="button"
        onClick={() => setAbierta((v) => !v)}
        aria-expanded={abierta}
        aria-controls={listId}
        className="mt-1 w-full font-data text-chrome-xl leading-none text-text hover:text-accent-text"
      >
        {valor.total}
      </button>
      <p className="mt-0.5 font-chrome text-chrome-xs text-muted">{formulaDeUnaLinea(valor)}</p>
      {accion}
      {abierta && (
        <ul id={listId} className="mt-s2 border-t border-muted/40 pt-s2 text-left">
          {valor.steps.map((paso, i) => (
            <PasoDeTraza key={i} paso={paso} />
          ))}
        </ul>
      )}
    </div>
  );
}
