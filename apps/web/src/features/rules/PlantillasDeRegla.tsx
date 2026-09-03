import { Button } from "../../ui";
import { FraseDeRegla } from "./FraseDeRegla";
import { IconoPlantilla } from "./iconos";
import { PLANTILLAS, type PlantillaDeRegla } from "./plantillas";

// Tarea F6 — las plantillas del estado vacío.
//
// **Cada plantilla se enseña dicha, no descrita.** Debajo del título va la misma frase que
// pintará el editor (`FraseDeRegla`), con las mismas palabras y los mismos colores: lo que se ve
// aquí es literalmente lo que se va a abrir. Una tarjeta que resumiera la plantilla con un texto
// propio sería un segundo vocabulario que se puede desincronizar del primero.
//
// Los huecos que la plantilla no puede rellenar —qué ficha, qué marca— salen dichos («falta…»,
// «sin elegir») en vez de callados, que es la misma regla que sigue la frase del editor.

export function PlantillasDeRegla({ onUsar }: { onUsar: (plantilla: PlantillaDeRegla) => void }) {
  return (
    <section
      aria-label="Plantillas de regla"
      className="space-y-s3 rounded-radius-sm border border-copper/40 p-s3"
    >
      <div>
        <h3 className="flex items-center gap-s2 font-title text-chrome-md text-text">
          <IconoPlantilla className="text-copper-text" />
          Empieza copiando una
        </h3>
        <p className="mt-1 font-chrome text-chrome-sm leading-snug text-muted">
          Se abre el editor con las cajas ya puestas y nada guardado todavía: cambias lo que quieras
          y guardas tú. Es más fácil retocar una regla que escribirla desde cero.
        </p>
      </div>

      <ul className="grid gap-s3 md:grid-cols-2">
        {PLANTILLAS.map((plantilla) => (
          <li
            key={plantilla.id}
            data-plantilla={plantilla.id}
            className="flex flex-col gap-s2 rounded-radius-sm border border-muted/60 p-s3"
          >
            <h4 className="font-chrome text-chrome-sm font-semibold text-text">
              {plantilla.titulo}
            </h4>
            <p className="font-chrome text-chrome-xs leading-snug text-muted">
              {plantilla.paraQue}
            </p>
            <FraseDeRegla regla={plantilla.borrador} />
            <div className="mt-auto flex justify-end">
              <Button variant="secondary" type="button" onClick={() => onUsar(plantilla)}>
                Usar esta plantilla
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
