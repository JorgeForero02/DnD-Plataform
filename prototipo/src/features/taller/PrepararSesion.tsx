// Estrato: PERMANENTE (parte del taller del DM). Preparar la próxima sesión:
// qué escena abre, qué tengo a mano para revelar, qué criaturas, qué tiradas.
import { Button } from "../../ui/Button";
import { IconMundo, IconGarra, IconD20, IconMegafono } from "../../ui/icons";
import { prepSesion } from "../../datos-de-ejemplo";

function Bloque({
  titulo,
  icono,
  children,
}: {
  titulo: string;
  icono: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-radius-md border border-muted/25 bg-bg p-s3">
      <h4 className="mb-s2 flex items-center gap-s2 font-chrome text-chrome-xs uppercase tracking-wide text-copper-text">
        {icono} {titulo}
      </h4>
      {children}
    </div>
  );
}

export function PrepararSesion() {
  return (
    <div className="space-y-s3">
      <Bloque titulo="La escena abre en" icono={<IconMundo className="size-4" />}>
        <p className="font-world text-world-base text-text">{prepSesion.escenaAbre}</p>
      </Bloque>

      <Bloque titulo="A mano para revelar" icono={<IconMegafono className="size-4" />}>
        <ul className="space-y-s1">
          {prepSesion.aRevelar.map((r) => (
            <li key={r} className="flex items-center justify-between gap-s2">
              <span className="font-world text-world-base text-text">{r}</span>
              <Button variante="accent" tamano="sm">Revelar</Button>
            </li>
          ))}
        </ul>
      </Bloque>

      <div className="grid grid-cols-2 gap-s3">
        <Bloque titulo="Criaturas a mano" icono={<IconGarra className="size-4" />}>
          <ul className="space-y-s1 font-world text-world-base text-text">
            {prepSesion.criaturas.map((c) => (
              <li key={c}>· {c}</li>
            ))}
          </ul>
        </Bloque>
        <Bloque titulo="Tiradas que pediré" icono={<IconD20 className="size-4" />}>
          <ul className="space-y-s1 font-world text-world-base text-text">
            {prepSesion.tiradas.map((t) => (
              <li key={t}>· {t}</li>
            ))}
          </ul>
        </Bloque>
      </div>
    </div>
  );
}
