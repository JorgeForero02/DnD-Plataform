// **El cubo. Y la regla que no es estética: el servidor decide el número, el dado LO REPRESENTA.**
//
// Copiado de `prototipo/src/features/DadoTridimensional.tsx`. El dado **no tira**: rueda hasta un
// resultado que ya está decidido. Por eso recibe `valor` por props y no lo calcula — un cliente
// que eligiera la cara estaría eligiendo la tirada, que es la misma familia de defecto que
// componer la expresión en el navegador (`character-sheet/api.ts:401-409`: *«un cliente que
// montara la expresión podría decir que ataca con una daga y tirar 1d12»*).
//
// El resto son cortesías: `sinAnimacion` respeta a quien ya lo ha visto cincuenta veces, y
// `oculto` es la tirada a ciegas —el jugador ve que tiró, pero no el número—.
//
// ## De dónde salen las clases
//
// `.escena-dado` (la perspectiva), `.cubo-dado` / `.cubo-dado.rodando` y `.cara-dado` ya están en
// `ui/tokens.css`, copiadas literales de la maqueta por la Ola 0, con `@keyframes tumbar` a 1.1s
// `cubic-bezier(0.3, 0.6, 0.3, 1)` y su respeto a `prefers-reduced-motion`. **No se redefinen
// aquí**: una segunda copia de una animación es una segunda verdad.
//
// La única diferencia con la maqueta es de vocabulario, no de píxeles: donde ella escribe
// `size-24` y `size-[88px]`, aquí se escribe `h-24 w-24` y `h-[88px] w-[88px]`, que es lo que usa
// el resto de esta aplicación y compila al mismo CSS.

/**
 * Las seis caras del cubo, empujadas hacia fuera media arista (88 / 2 = 44 px).
 *
 * Solo la primera lleva número, y es a propósito: es la que queda de frente cuando la animación
 * termina en `rotateX(720deg) rotateY(720deg)` —dos vueltas enteras—, así que el resultado
 * siempre acaba mirando al lector. Las otras cinco son la carcasa.
 */
const CARAS = [
  "translateZ(44px)",
  "rotateY(180deg) translateZ(44px)",
  "rotateY(90deg) translateZ(44px)",
  "rotateY(-90deg) translateZ(44px)",
  "rotateX(90deg) translateZ(44px)",
  "rotateX(-90deg) translateZ(44px)",
];

export function DadoTridimensional({
  valor,
  rodando,
  sinAnimacion,
  oculto,
  tono = "copper",
}: {
  /** **El número que dijo el servidor.** Este componente no lo calcula ni lo puede cambiar. */
  valor: number;
  rodando: boolean;
  sinAnimacion?: boolean;
  /** Tirada a ciegas: se ve que se tiró, no lo que salió. */
  oculto?: boolean;
  tono?: "copper" | "accent" | "danger";
}) {
  const color =
    tono === "accent"
      ? "text-accent-text"
      : tono === "danger"
        ? "text-danger-text"
        : "text-copper-text";

  return (
    <div className="escena-dado grid h-24 w-24 shrink-0 place-items-center">
      <div
        // `aria-live` no va aquí: quien lee con lector de pantalla necesita el total y su
        // desglose, que están al lado en texto, no un número girando.
        aria-hidden="true"
        data-dado-tridimensional={rodando ? "rodando" : "quieto"}
        className={`cubo-dado h-[88px] w-[88px] ${rodando && !sinAnimacion ? "rodando" : ""}`}
      >
        {CARAS.map((transform, i) => (
          <span key={i} className="cara-dado" style={{ transform }}>
            <span className={`font-data text-chrome-2xl ${color}`}>
              {i === 0 ? (oculto ? "?" : valor) : ""}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
