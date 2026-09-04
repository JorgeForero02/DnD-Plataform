// Estrato: PERMANENTE (solo en la disposición del DM) — sus herramientas de
// narración: revelar, pedir tirada, avanzar el reloj, sacar una criatura, y el
// acceso al motor de reglas y a las tablas de la casa.
import { Button } from "../ui/Button";
import { TituloPanel } from "../ui/Panel";
import { IconMegafono, IconD20, IconReloj, IconGarra, IconRayo, IconLibro } from "../ui/icons";

export function HerramientasDeNarracion({
  onPedirTirada,
  onConsultar,
  onReglas,
  onTablas,
}: {
  onPedirTirada: () => void;
  onConsultar: () => void;
  onReglas: () => void;
  onTablas: () => void;
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
        <Button variante="fantasma" icono={<IconRayo />} onClick={onReglas}>
          Bloques de reglas
        </Button>
        <Button variante="fantasma" icono={<IconLibro />} onClick={onTablas}>
          Tablas
        </Button>
      </div>
      <p className="font-chrome text-chrome-xs text-muted">
        El sistema propone; tú decides. Nada llega a la mesa hasta que lo confirmas.
      </p>
    </div>
  );
}
