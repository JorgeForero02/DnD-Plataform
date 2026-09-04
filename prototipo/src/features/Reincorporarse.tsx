// Estrato: CONTEXTUAL — aparece cuando alguien vuelve a mitad de sesión y ve
// qué se perdió. Reincorporarse tiene que ser gratis (§1).
import { Dialog } from "../ui/Dialog";
import { Button } from "../ui/Button";
import { IconD20 } from "../ui/icons";

const resumen = [
  "Forzasteis la puerta del almacén cuatro del Puerto Viejo.",
  "Sirella abrió la cerradura corriente del arcón de hierro.",
  "La segunda cerradura resultó ser un sello de convocación; Mira no logró descifrarlo.",
  "El capataz Grosk irrumpió con dos matones. Empezó el combate.",
  "Doran acertó un flechazo a Grosk. Es tu turno.",
];

export function Reincorporarse({ onClose }: { onClose: () => void }) {
  return (
    <Dialog
      titulo="Bienvenida de nuevo, Vera"
      subtitulo="Te fuiste hace 40 minutos. Esto es lo que te perdiste."
      onClose={onClose}
      anchura="media"
      acciones={
        <>
          <Button variante="silencio" onClick={onClose}>
            Leer el hilo entero
          </Button>
          <Button variante="accent" onClick={onClose} icono={<IconD20 />}>
            Volver a la mesa
          </Button>
        </>
      }
    >
      <ol className="space-y-s3">
        {resumen.map((r, i) => (
          <li key={i} className="flex gap-s3">
            <span className="grid size-6 shrink-0 place-items-center rounded-full border border-copper/40 font-data text-chrome-xs text-copper-text">
              {i + 1}
            </span>
            <p className="font-world text-world-base text-text">{r}</p>
          </li>
        ))}
      </ol>
      <p className="mt-s4 rounded-radius-sm border border-accent/30 bg-accent/10 px-s3 py-s2 font-chrome text-chrome-sm text-accent-text">
        Tu personaje, Kaeloth, sigue concentrado y con 38 de 40 puntos de vida.
      </p>
    </Dialog>
  );
}
