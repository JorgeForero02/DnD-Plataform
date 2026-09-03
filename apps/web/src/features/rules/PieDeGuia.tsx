import type { PasoDeGuia } from "./guia";
import { CLASES_DE_PARTE } from "./partes";
import { IconoGuia } from "./iconos";

// Tarea F6 — la burbuja contextual, que aquí es una línea de pie.
//
// **No lleva aspa.** No es un descuido: una ayuda con botón de cerrar se cierra por reflejo,
// antes de leerla, y entonces ya no vuelve. Ésta se va sola cuando la acción está hecha, porque
// el texto **se deriva del borrador** (`guia.ts`) en vez de guardarse en ningún sitio.
//
// **Y no tapa nada.** Un globo anclado al control del que habla se pone justo encima del sitio
// donde hay que trabajar; esto ocupa una franja propia al pie del editor y no se mueve.
//
// `aria-live="polite"` porque el texto cambia solo, sin que nadie enfoque nada: quien usa un
// lector de pantalla tiene que enterarse de que el paso avanzó igual que quien lo ve.

export function PieDeGuia({ paso }: { paso: PasoDeGuia }) {
  const clases = paso.parte ? CLASES_DE_PARTE[paso.parte] : undefined;
  return (
    <p
      aria-live="polite"
      data-guia={paso.id}
      className={[
        "flex items-start gap-s2 rounded-radius-sm border p-s2 font-chrome text-chrome-sm leading-snug",
        paso.completo ? "border-muted text-muted" : "border-copper text-text",
      ].join(" ")}
    >
      <IconoGuia className={["mt-0.5", clases?.texto ?? "text-copper-text"].join(" ")} />
      <span>{paso.texto}</span>
    </p>
  );
}
