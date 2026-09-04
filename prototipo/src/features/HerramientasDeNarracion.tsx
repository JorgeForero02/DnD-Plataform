// Estrato: PERMANENTE (solo en la disposición del DM) — sus herramientas de
// narración: revelar, pedir tirada, avanzar el reloj, sacar una criatura.
import { Button } from "../ui/Button";
import { TituloPanel } from "../ui/Panel";
import { IconMegafono, IconD20, IconReloj, IconGarra } from "../ui/icons";

export function HerramientasDeNarracion({
  onPedirTirada,
  onConsultar,
}: {
  onPedirTirada: () => void;
  onConsultar: () => void;
}) {
  return (
    <div className="space-y-s2">
      <TituloPanel>Herramientas del DM</TituloPanel>
      <div className="grid grid-cols-2 gap-s2">
        <Button variante="copper" icono={<IconMegafono />} onClick={onConsultar}>
          Revelar algo
        </Button>
        <Button variante="accent" icono={<IconD20 />} onClick={onPedirTirada}>
          Pedir tirada
        </Button>
        <Button variante="fantasma" icono={<IconReloj />}>
          Avanzar el reloj
        </Button>
        <Button variante="danger" icono={<IconGarra />}>
          Sacar criatura
        </Button>
      </div>
      <p className="font-chrome text-chrome-xs text-muted">
        El sistema propone; tú decides. Nada llega a la mesa hasta que lo confirmas.
      </p>
    </div>
  );
}
