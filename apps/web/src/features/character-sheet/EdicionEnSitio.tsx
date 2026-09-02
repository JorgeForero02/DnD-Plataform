import { useId, useState } from "react";
import type { ReactNode } from "react";

// Editar en el sitio. **Los dos botones de «Editar» desaparecen y la hoja se toca directamente.**
//
// Las reglas de abajo no son gusto: salen de la investigación de patrones de guardado del
// 2026-09-02 (Primer de GitHub, sistema de diseño de GitLab) y de las críticas documentadas a
// las hojas digitales que existen.
//
// **R1 · Automático solo donde el gesto ES la acción completa.** Un desplegable, una casilla o
// un control segmentado se guardan solos: elegir «enano» ya es la decisión entera. Un campo de
// texto no: teclear es un proceso, y autoguardar a mitad manda basura al servidor y confunde a
// un lector de pantalla.
//
// **R2 · No se mezclan los dos patrones dentro de un mismo formulario.** Por eso cada zona de la
// hoja es su propia unidad, y no la hoja entera.
//
// **R3 · El botón de guardar va pegado al campo y NUNCA se deshabilita.** Un botón deshabilitado
// no recibe foco de teclado y tiene mal contraste; si no se puede guardar, se dice por qué al
// pulsarlo.
//
// **R4 · Si el número cambia en pantalla, el número ES la confirmación.** Cero cromo. Solo se
// anuncia cuando no hay nada visible que cambie.
//
// **R5 · Cuando el servidor rechaza, se conserva lo tecleado y el error va en línea, junto al
// campo.** Nada de avisos flotantes: se van antes de que un lector de pantalla los lea, y aquí
// los rechazos son de autorización —«no eres el dueño ni el DM»—, que es justo lo que hay que
// poder leer con calma.
//
// **R6 · La afordancia es información de dominio.** Lo editable lleva un subrayado tenue; lo
// **derivado no lleva ninguno**, y esa ausencia significa «esto lo calculo yo, edita su causa».

/** El estado de un guardado, para pintarlo sin inventar tres banderas en cada sitio. */
type Estado = "quieto" | "guardando" | "guardado" | "error";

const CLASE_EDITABLE =
  "border-b border-dashed border-muted/70 bg-transparent px-0.5 " +
  "hover:border-solid hover:border-accent focus:border-solid focus:border-accent " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-accent";

function Estadillo({ estado, error }: { estado: Estado; error: string | null }) {
  if (estado === "error" && error) {
    return (
      <p role="alert" className="mt-0.5 font-chrome text-chrome-xs text-danger-text">
        {error}
      </p>
    );
  }
  if (estado === "guardando") {
    return <span className="ml-1 font-chrome text-chrome-xs text-muted">guardando…</span>;
  }
  return null;
}

/**
 * Un número que se edita donde está.
 *
 * Guarda **al salir del campo o con Enter**, y `Escape` devuelve el valor anterior. No hay botón
 * porque un número es un gesto corto y el resultado se ve al momento en los valores que dependen
 * de él — que es la confirmación (R4). Si el servidor rechaza, **el número tecleado se queda**
 * para que se pueda corregir sin volver a escribirlo (R5).
 */
export function NumeroEditable({
  etiqueta,
  valor,
  onGuardar,
  min,
  max,
  ancho = "w-12",
  disabled,
  motivoDeshabilitado,
}: {
  etiqueta: string;
  valor: number;
  onGuardar: (nuevo: number) => Promise<unknown>;
  min?: number;
  max?: number;
  ancho?: string;
  disabled?: boolean;
  motivoDeshabilitado?: string;
}) {
  const [texto, setTexto] = useState(String(valor));
  const [estado, setEstado] = useState<Estado>("quieto");
  const [error, setError] = useState<string | null>(null);
  // Lo último que el servidor aceptó. **Estado y no `ref`**: una `ref` no se puede escribir
  // durante el render, y el ajuste de abajo ocurre justo ahí. Lo cazó el linter.
  const [guardado, setGuardado] = useState(String(valor));

  // Si el valor cambia por fuera (otra pantalla, una regla del motor), se refleja — **salvo que
  // se esté escribiendo**. Pisar lo que alguien está tecleando es imperdonable.
  //
  // **Ajuste durante el render, no en un efecto.** Es el patrón que React documenta para
  // «cambiar el estado cuando cambia una propiedad»: un efecto que llama a `setState` provoca
  // un render en cascada y una pintada intermedia con el valor viejo. Lo cazó el linter.
  const [ultimoVisto, setUltimoVisto] = useState(valor);
  if (valor !== ultimoVisto) {
    setUltimoVisto(valor);
    if (estado === "quieto") {
      setGuardado(String(valor));
      setTexto(String(valor));
    }
  }

  const confirmar = async () => {
    if (texto === guardado) return;
    const n = Number(texto);
    if (!Number.isFinite(n)) {
      setEstado("error");
      setError("Eso no es un número.");
      return;
    }
    setEstado("guardando");
    setError(null);
    try {
      await onGuardar(n);
      setGuardado(texto);
      setEstado("quieto");
    } catch (err) {
      setEstado("error");
      setError((err as Error).message);
    }
  };

  return (
    <span className="inline-flex flex-col">
      <input
        type="number"
        aria-label={etiqueta}
        value={texto}
        min={min}
        max={max}
        disabled={disabled}
        title={disabled ? motivoDeshabilitado : undefined}
        onChange={(e) => setTexto(e.target.value)}
        onBlur={() => void confirmar()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void confirmar();
          }
          if (e.key === "Escape") {
            setTexto(guardado);
            setEstado("quieto");
            setError(null);
          }
        }}
        className={`${ancho} ${CLASE_EDITABLE} font-data text-chrome-md text-text disabled:cursor-not-allowed disabled:border-none disabled:text-muted`}
      />
      <Estadillo estado={estado} error={error} />
    </span>
  );
}

/**
 * Un desplegable que se guarda solo al elegir. **Es el caso R1**: elegir «enano» ya es la
 * decisión completa, no hay nada más que confirmar.
 *
 * Un valor guardado que la lista no ofrece **se enseña, marcado y no seleccionable** — regla
 * vinculante del proyecto: una opción invisible es un dato que se pierde en el siguiente
 * guardado sin que nadie se entere.
 */
export function SelectorEditable({
  etiqueta,
  valor,
  opciones,
  onGuardar,
  vacio,
  disabled,
  motivoDeshabilitado,
}: {
  etiqueta: string;
  valor: string;
  opciones: { valor: string; texto: string }[];
  onGuardar: (nuevo: string) => Promise<unknown>;
  /** Qué dice la opción vacía. Si no se pasa, no hay opción vacía. */
  vacio?: string;
  disabled?: boolean;
  motivoDeshabilitado?: string;
}) {
  const [estado, setEstado] = useState<Estado>("quieto");
  const [error, setError] = useState<string | null>(null);
  const huerfano = valor && !opciones.some((o) => o.valor === valor) ? valor : null;

  return (
    <span className="inline-flex flex-col">
      <select
        aria-label={etiqueta}
        value={valor}
        disabled={disabled}
        title={disabled ? motivoDeshabilitado : undefined}
        onChange={async (e) => {
          setEstado("guardando");
          setError(null);
          try {
            await onGuardar(e.target.value);
            setEstado("quieto");
          } catch (err) {
            setEstado("error");
            setError((err as Error).message);
          }
        }}
        className={`${CLASE_EDITABLE} font-chrome text-chrome-sm text-text disabled:cursor-not-allowed disabled:border-none disabled:text-muted`}
      >
        {vacio !== undefined && <option value="">{vacio}</option>}
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.texto}
          </option>
        ))}
        {huerfano && (
          <option value={huerfano} disabled>
            Guardado y ya no disponible ({huerfano})
          </option>
        )}
      </select>
      <Estadillo estado={estado} error={error} />
    </span>
  );
}

/**
 * Texto libre con guardado **explícito** (R1): teclear es un proceso, no un gesto.
 *
 * El botón aparece solo cuando hay algo que guardar, y **nunca está deshabilitado** (R3).
 * `Escape` cancela.
 */
export function TextoEditable({
  etiqueta,
  valor,
  onGuardar,
  multilinea,
  placeholder,
  disabled,
  motivoDeshabilitado,
  children,
}: {
  etiqueta: string;
  valor: string;
  onGuardar: (nuevo: string) => Promise<unknown>;
  multilinea?: boolean;
  placeholder?: string;
  disabled?: boolean;
  motivoDeshabilitado?: string;
  /** Cómo se pinta cuando NO se está editando. Por defecto, el texto tal cual. */
  children?: (valor: string) => ReactNode;
}) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(valor);
  const [estado, setEstado] = useState<Estado>("quieto");
  const [error, setError] = useState<string | null>(null);
  const id = useId();

  // Sin efecto de sincronía: fuera del modo edición **no se pinta `texto`, se pinta `valor`**, y
  // al entrar a editar se siembra desde `valor`. Un efecto que copiara la propiedad al estado en
  // cada render sería el render en cascada que el linter prohíbe, y encima podría pisar lo que
  // alguien está escribiendo.
  if (!editando) {
    return (
      <button
        type="button"
        disabled={disabled}
        title={disabled ? motivoDeshabilitado : undefined}
        aria-label={`Editar ${etiqueta}`}
        onClick={() => {
          setTexto(valor);
          setEditando(true);
        }}
        className={`text-left ${disabled ? "cursor-not-allowed" : CLASE_EDITABLE} font-chrome text-chrome-sm text-text`}
      >
        {children ? children(valor) : valor || <span className="text-muted">{placeholder}</span>}
      </button>
    );
  }

  const guardar = async () => {
    setEstado("guardando");
    setError(null);
    try {
      await onGuardar(texto);
      setEstado("quieto");
      setEditando(false);
    } catch (err) {
      setEstado("error");
      setError((err as Error).message);
    }
  };

  const Campo = multilinea ? "textarea" : "input";
  return (
    <span className="flex flex-col gap-1">
      <Campo
        id={id}
        aria-label={etiqueta}
        value={texto}
        rows={multilinea ? 4 : undefined}
        autoFocus
        onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
          setTexto(e.target.value)
        }
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === "Escape") {
            setTexto(valor);
            setEditando(false);
            setError(null);
          }
          if (e.key === "Enter" && !multilinea) {
            e.preventDefault();
            void guardar();
          }
        }}
        className={`${CLASE_EDITABLE} w-full font-chrome text-chrome-sm text-text`}
      />
      <span className="flex items-center gap-s2">
        <button
          type="button"
          onClick={() => void guardar()}
          className="rounded-radius-sm border border-accent px-2 py-0.5 font-chrome text-chrome-xs text-accent-text"
        >
          {estado === "guardando" ? "Guardando…" : "Guardar"}
        </button>
        <button
          type="button"
          onClick={() => {
            setTexto(valor);
            setEditando(false);
            setError(null);
          }}
          className="font-chrome text-chrome-xs text-muted underline"
        >
          Cancelar
        </button>
      </span>
      <Estadillo estado={estado} error={error} />
    </span>
  );
}
