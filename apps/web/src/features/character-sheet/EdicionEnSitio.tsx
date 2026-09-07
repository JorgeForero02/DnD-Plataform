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

// **El subrayado de lo editable era invisible, y no por su diseno.** Se escribia
// `border-muted/70`, y en Tailwind 3 un modificador de opacidad sobre un color declarado
// como `var(--muted)` a secas **no compila a nada**: la utilidad no se emite y el elemento
// se queda con el `border-color` del preflight, `#e5e7eb`, en los dos temas. Sobre la vitela
// clara (`#f4efe2`) eso es un gris casi del color del papel. Comprobado sobre el CSS
// compilado, no deducido. Se pone el token entero: la linea sigue siendo tenue porque es de
// trazos y de un pixel, no porque su color estuviera descolorido por accidente.
const CLASE_EDITABLE =
  "border-b border-dashed border-muted bg-transparent px-0.5 " +
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
  placeholder,
}: {
  etiqueta: string;
  /**
   * `null` cuando **todavía no hay valor**, y entonces el campo sale vacío.
   *
   * No se finge un 10 por defecto. La primera versión lo hacía y era un fallo silencioso: la
   * casilla enseñaba «10», el dato guardado era nulo, y teclear 10 no contaba como cambio — así
   * que no se guardaba nada y la hoja seguía diciendo «faltan datos» delante de un campo que
   * parecía relleno. Lo cazó el recorrido de navegador; ninguna unitaria lo veía.
   */
  valor: number | null;
  onGuardar: (nuevo: number) => Promise<unknown>;
  min?: number;
  max?: number;
  ancho?: string;
  disabled?: boolean;
  motivoDeshabilitado?: string;
  placeholder?: string;
}) {
  const [texto, setTexto] = useState(valor === null ? "" : String(valor));
  const [estado, setEstado] = useState<Estado>("quieto");
  const [error, setError] = useState<string | null>(null);
  // Lo último que el servidor aceptó. **Estado y no `ref`**: una `ref` no se puede escribir
  // durante el render, y el ajuste de abajo ocurre justo ahí. Lo cazó el linter.
  const [guardado, setGuardado] = useState(valor === null ? "" : String(valor));

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
      const texto = valor === null ? "" : String(valor);
      setGuardado(texto);
      setTexto(texto);
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
        placeholder={placeholder}
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
  nombrarHuerfano,
  disabled,
  motivoDeshabilitado,
}: {
  etiqueta: string;
  valor: string;
  opciones: { valor: string; texto: string }[];
  onGuardar: (nuevo: string) => Promise<unknown>;
  /** Qué dice la opción vacía. Si no se pasa, no hay opción vacía. */
  vacio?: string;
  /**
   * Cómo se llama, en español, un valor guardado que la lista ya no ofrece.
   *
   * Hace falta porque **la clave cruda no puede llegar a la pantalla**: la primera versión
   * pintaba «(half-elf)» y lo cazó la prueba que vigila justo eso. Los diccionarios de
   * `vocabulario.ts` existen precisamente para este caso — una clave guardada que hay que
   * nombrar sin tener el catálogo delante.
   */
  nombrarHuerfano?: (clave: string) => string;
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
            {nombrarHuerfano ? nombrarHuerfano(huerfano) : huerfano} — guardado, ya no disponible
          </option>
        )}
      </select>
      <Estadillo estado={estado} error={error} />
    </span>
  );
}

/**
 * Radios que se guardan solos al elegir. **También es el caso R1**: elegir un camino ya es la
 * decisión completa.
 *
 * **Radios y no un desplegable** (`docs/04-convenciones.md`): elegir camino es una opción con
 * significado, y son pocas — cada una lleva la frase que explica qué es, visible a la vez que
 * las demás y no escondida detrás de un clic.
 *
 * Mismo trato que `SelectorEditable` para un valor guardado que la lista ya no ofrece: se enseña,
 * marcado y no seleccionable, nunca desaparece.
 */
export function RadiosEditables({
  etiqueta,
  valor,
  opciones,
  onGuardar,
  nombrarHuerfano,
  disabled,
  motivoDeshabilitado,
}: {
  /** Da nombre al grupo de radios (para el lector de pantalla, no visible). */
  etiqueta: string;
  valor: string;
  opciones: { valor: string; texto: string; explicacion: string }[];
  onGuardar: (nuevo: string) => Promise<unknown>;
  /** Mismo motivo que en `SelectorEditable`: la clave cruda no puede llegar a la pantalla. */
  nombrarHuerfano?: (clave: string) => string;
  disabled?: boolean;
  motivoDeshabilitado?: string;
}) {
  const grupo = useId();
  const [estado, setEstado] = useState<Estado>("quieto");
  const [error, setError] = useState<string | null>(null);
  const huerfano = valor && !opciones.some((o) => o.valor === valor) ? valor : null;

  const elegir = async (nuevo: string) => {
    if (nuevo === valor) return;
    setEstado("guardando");
    setError(null);
    try {
      await onGuardar(nuevo);
      setEstado("quieto");
    } catch (err) {
      setEstado("error");
      setError((err as Error).message);
    }
  };

  return (
    <fieldset
      className="min-w-0"
      disabled={disabled}
      title={disabled ? motivoDeshabilitado : undefined}
    >
      <legend className="sr-only">{etiqueta}</legend>
      <div className="flex flex-col gap-1">
        {opciones.map((o) => {
          const elegido = o.valor === valor;
          const idRadio = `${grupo}-${o.valor}-radio`;
          const idFrase = `${grupo}-${o.valor}-frase`;
          return (
            <div
              key={o.valor}
              className={[
                "flex items-baseline gap-s2 rounded-radius-sm border px-s2 py-1 transition-colors",
                elegido ? "border-accent bg-[color:var(--accent-tint)]" : "border-muted",
              ].join(" ")}
            >
              <input
                id={idRadio}
                type="radio"
                name={grupo}
                value={o.valor}
                checked={elegido}
                disabled={disabled}
                onChange={() => void elegir(o.valor)}
                aria-describedby={idFrase}
                className="accent-[var(--accent)]"
              />
              {/* La frase va FUERA del `<label>`: dentro pasaría a formar parte del NOMBRE del
                  control, y es su descripción, no su nombre (mismo motivo que
                  `SelectorDeVentaja.tsx`). */}
              <label
                htmlFor={idRadio}
                className={`shrink-0 font-chrome text-chrome-sm text-text ${
                  disabled ? "cursor-not-allowed" : "cursor-pointer"
                }`}
              >
                {o.texto}
              </label>
              <span id={idFrase} className="font-chrome text-chrome-xs leading-snug text-muted">
                {o.explicacion}
              </span>
            </div>
          );
        })}
        {huerfano &&
          (() => {
            // Vuelta de arreglo 1 (revisión) — menor: este radio no llevaba `<label htmlFor>` ni
            // `aria-label`, así que un lector de pantalla anunciaba «radio, marcado,
            // deshabilitado» sin decir de qué. Mismo patrón que los radios normales de arriba:
            // el nombre accesible viene de una etiqueta asociada, y la frase va aparte, como su
            // descripción.
            const idRadio = `${grupo}-huerfano-radio`;
            const idFrase = `${grupo}-huerfano-frase`;
            const nombre = nombrarHuerfano ? nombrarHuerfano(huerfano) : huerfano;
            return (
              <div className="flex items-baseline gap-s2 rounded-radius-sm border border-muted px-s2 py-1">
                <input
                  id={idRadio}
                  type="radio"
                  name={grupo}
                  checked
                  disabled
                  readOnly
                  aria-describedby={idFrase}
                  className="accent-[var(--muted)]"
                />
                <label
                  htmlFor={idRadio}
                  className="shrink-0 cursor-not-allowed font-chrome text-chrome-sm text-muted"
                >
                  {nombre}
                </label>
                <span id={idFrase} className="font-chrome text-chrome-xs leading-snug text-muted">
                  guardado, ya no disponible
                </span>
              </div>
            );
          })()}
      </div>
      <Estadillo estado={estado} error={error} />
    </fieldset>
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
        /**
         * **El nombre accesible es el VALOR, no «Editar X».**
         *
         * Con `aria-label="Editar Nombre del personaje"` el `<h1>` de la página pasaba a
         * llamarse así y **el nombre del personaje desaparecía del encabezado**: un lector de
         * pantalla anunciaba la acción en vez del contenido, y el recorrido de navegador dejó de
         * encontrar el título. Lo cazó Playwright, no `jsdom`.
         *
         * Que se puede pulsar ya lo dice el papel de botón; para qué sirve, el `title`.
         */
        title={disabled ? motivoDeshabilitado : `Editar ${etiqueta}`}
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
