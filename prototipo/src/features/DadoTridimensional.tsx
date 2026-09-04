// Estrato: CONTEXTUAL (vive en el momento de la tirada).
// REGLA QUE NO SE PUEDE ROMPER: el servidor decide el número y el dado LO
// REPRESENTA. El dado no tira: rueda hasta un resultado ya decidido. Por eso
// recibe `valor` por props, no lo calcula. `sinAnimacion` respeta al que ya lo
// ha visto cincuenta veces. `oculto` es la tirada a ciegas: el jugador ve que
// tiró, pero no el número.
const caras = [
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
  valor: number;
  rodando: boolean;
  sinAnimacion?: boolean;
  oculto?: boolean;
  tono?: "copper" | "accent" | "danger";
}) {
  const color =
    tono === "accent" ? "text-accent-text" : tono === "danger" ? "text-danger-text" : "text-copper-text";

  return (
    <div className="escena-dado grid size-24 shrink-0 place-items-center">
      <div
        className={`cubo-dado size-[88px] ${rodando && !sinAnimacion ? "rodando" : ""}`}
      >
        {caras.map((t, i) => (
          <span key={i} className="cara-dado" style={{ transform: t }}>
            <span className={`font-data text-chrome-2xl ${color}`}>
              {i === 0 ? (oculto ? "?" : valor) : ""}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
