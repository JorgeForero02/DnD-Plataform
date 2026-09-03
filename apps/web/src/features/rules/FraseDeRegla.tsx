import type { Visibility } from "@dnd/shared";
import { Badge } from "../../ui";
import { segmentosDeFrase, type ReglaEnFrase } from "./frase";
import { CLASES_DE_PARTE } from "./partes";
import { visibilidadDeEfecto, type NombreDeFicha } from "./vocabulario";

// Tarea F1 — la frase pintada, siempre visible bajo los carriles.
//
// **Tres señales por conector, no una.** Cada «Cuando» / «si» / «entonces» lleva el color de su
// carril **y** va en negrita **y** está escrito con la misma palabra que rotula ese carril. El
// color no puede ser la única señal (docs/04-convenciones.md): quien no distinga el cobre del
// azul sigue leyendo la frase entera, y sigue viendo qué trozo pertenece a qué parte.
//
// **La caja que falta se dice.** La maqueta de Figma Make pintaba la frase solo cuando estaba
// completa; aquí el hueco es parte de la frase —«…, entonces — falta una acción»—, porque el
// momento en que el DM necesita que la regla se explique sola es justo cuando aún no lo está.
//
// **El nivel de visibilidad lo pone `ui/Badge.tsx`**, su único dueño en toda la aplicación
// (docs/04-convenciones.md: la forma legible se escribe una vez por dominio). Aquí se acompaña
// la frase con la insignia, como hace `ResumenDeEfectos`, en vez de copiar sus cinco etiquetas.

export function FraseDeRegla({
  regla,
  nombreFicha,
}: {
  regla: ReglaEnFrase;
  nombreFicha?: NombreDeFicha;
}) {
  const segmentos = segmentosDeFrase(regla, nombreFicha);

  return (
    <section
      aria-label="La regla, leída"
      data-frase-de-regla
      className="rounded-radius-sm border border-copper bg-surface p-s3"
    >
      <h3 className="font-chrome text-chrome-xs uppercase tracking-[0.14em] text-muted">
        Léela en voz alta
      </h3>
      {/*
        Un solo párrafo, no tres columnas: la prueba de que la regla se entiende es que se lee
        seguida. `aria-live` no va aquí — la frase cambia con cada tecla de cada campo y un
        lector de pantalla la repetiría sin parar; lo que se anuncia es la colocación, y eso ya
        lo hace el aviso del editor.
      */}
      <p className="mt-1 font-chrome text-chrome-sm leading-relaxed text-text" lang="es">
        {segmentos.map((segmento, i) => {
          if (segmento.tipo === "nexo") {
            return <span key={i}>{segmento.texto}</span>;
          }
          if (segmento.tipo === "conector") {
            return (
              <span
                key={i}
                data-frase="conector"
                data-parte={segmento.parte}
                // Negrita **y** color: dos señales, porque una sola sería el color.
                className={["font-semibold", CLASES_DE_PARTE[segmento.parte].texto].join(" ")}
              >
                {segmento.texto}
              </span>
            );
          }
          if (segmento.tipo === "hueco") {
            return (
              <span key={i} data-frase="hueco" data-parte={segmento.parte} className="text-muted">
                {segmento.texto}
              </span>
            );
          }
          const visibilidad = segmento.efecto ? visibilidadDeEfecto(segmento.efecto) : undefined;
          return (
            <span
              key={i}
              data-frase="pieza"
              data-parte={segmento.parte}
              data-clave={segmento.clave}
            >
              {segmento.texto}
              {visibilidad && (
                <>
                  {" "}
                  <Badge visibility={visibilidad as Visibility} />
                </>
              )}
            </span>
          );
        })}
      </p>
    </section>
  );
}
