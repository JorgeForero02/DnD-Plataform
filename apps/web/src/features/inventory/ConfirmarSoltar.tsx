import { Button, Dialog } from "../../ui";

// Carril B1 — "lo irreversible detrás de un botón: soltar un objeto pide confirmación en
// pantalla, nunca window.confirm" (docs/04-convenciones.md).

export function ConfirmarSoltar({
  nombreObjeto,
  open,
  onCancelar,
  onConfirmar,
  confirmando,
  error,
}: {
  nombreObjeto: string;
  open: boolean;
  onCancelar: () => void;
  onConfirmar: () => void;
  confirmando: boolean;
  error?: string;
}) {
  return (
    <Dialog open={open} onClose={onCancelar} title="Soltar objeto">
      <p className="mb-s4 font-chrome text-chrome-sm text-text">
        ¿Soltar <strong>{nombreObjeto}</strong>? Sale del inventario y no se puede deshacer.
      </p>
      {error && (
        <p role="alert" className="mb-s3 font-chrome text-chrome-xs text-danger-text">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-s2">
        <Button type="button" variant="secondary" onClick={onCancelar} aria-busy={confirmando}>
          Cancelar
        </Button>
        <Button type="button" variant="danger" onClick={onConfirmar} aria-busy={confirmando}>
          Soltarlo
        </Button>
      </div>
    </Dialog>
  );
}
