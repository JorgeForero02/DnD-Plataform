import { Link } from "react-router-dom";
import { useRules } from "../../rules/hooks";
import { useMyRole } from "../../campaigns/members";
import { useAllEntities } from "../../entities/hooks";
import { FraseDeRegla } from "../../rules/FraseDeRegla";
import { NOMBRE_ESTADO_REGLA, EXPLICACION_ESTADO_REGLA } from "../../rules/vocabulario";

// **«Bloques de reglas»: lo que se monta, y el dato que hay que volver a medir antes de montar
// más.**
//
// La maqueta pone un superpuesto con los tres carriles de arrastre (`BloquesDeReglas.tsx`), y
// aquí solo hay lectura. El motivo que se dio al escribir esto fue la medición de la cabecera de
// `features/rules/EditorDeRegla.tsx`: dentro de `ui/Dialog` **no se disparaba un solo
// `dragstart`**, y la causa no era el desplazamiento sino la altura —con `max-h-[85vh]` el panel
// medía 763 px para 1553 px de contenido y los carriles caían fuera de la ventana, así que una
// pieza y su ranura no estaban nunca en pantalla a la vez—.
//
// **Ese dato es de un contenedor que ya no existe, y está pendiente de remedir.** La Ola 0
// (2026-09-04) convirtió `ui/Dialog` en un **cajón lateral de altura completa** (`h-full`, sin
// `max-h-[85vh]`), que es exactamente la variable que aquella medición señalaba como culpable.
// Puede que hoy el arrastre funcione y puede que no: **nadie lo ha vuelto a medir en el
// navegador**, y eso lo hace el ensamblado (D-OP-19). Hasta que la medición se rehaga, aquí no se
// monta el editor — no porque conste que falla, sino porque **no consta que funcione**, y montar
// una pantalla sobre una premisa caducada es el vicio que esta sesión viene a corregir.
//
// Lo que sí se monta no depende de cómo salga esa medición, y tiene sentido por sí solo en mitad
// de una partida: **decir qué reglas están escuchando ahora mismo**, leídas en voz alta con la
// misma frase que compone el editor. Componer, ensayar y armar siguen en su pestaña, y el enlace
// de abajo lo dice sin rodeos en vez de fingir que caben aquí.
//
// La lista viene de `useRules`, el mismo hook de la pestaña: no hay un segundo camino de lectura.
// **El servidor es quien decide** — `requireDM` en `rules-engine.service.ts` responde 403 a
// cualquiera que no dirija; esto solo evita pedir algo que va a rechazarse.

export function ReglasEnLaMesa({ campaignId }: { campaignId: string }) {
  // El rol lo pregunta este componente, no se lo pasa nadie: `isError` de `useMyRole` significa
  // «todavía no lo sé», nunca «no tienes permiso», y con `enabled` en `false` la consulta
  // simplemente no sale — no se pinta una negativa que el servidor no ha dado.
  const { role } = useMyRole(campaignId);
  const esDm = role === "DM";
  const { data: reglas, isLoading } = useRules(campaignId, { enabled: esDm });
  const { data: entidades } = useAllEntities(campaignId);

  const nombrePorId = new Map((entidades ?? []).map((e) => [e.id, e.name]));
  const nombreFicha = (id: string) => nombrePorId.get(id) ?? `entrada ${id.slice(-6)}`;

  // Primero lo que está escuchando: es la pregunta que se hace en la mesa.
  const ordenadas = [...(reglas ?? [])].sort((a, b) =>
    a.status === b.status ? 0 : a.status === "ARMED" ? -1 : 1,
  );

  return (
    <div className="flex flex-col gap-s3">
      <p className="font-chrome text-chrome-sm leading-snug text-muted">
        Las reglas de esta campaña, tal y como el motor las va a leer.
      </p>

      {isLoading && <p className="font-chrome text-chrome-sm text-muted">Leyendo el motor…</p>}

      {!isLoading && ordenadas.length === 0 && (
        <p className="rounded-radius-sm border border-muted p-s3 font-chrome text-chrome-sm text-muted">
          Esta campaña no tiene reglas todavía. Una regla es una frase: cuando pase esto, si se
          cumple aquello, entonces haz esto otro.
        </p>
      )}

      <ul className="flex flex-col gap-s3">
        {ordenadas.map((regla) => (
          <li key={regla.id} className="flex flex-col gap-s2">
            <div className="flex flex-wrap items-baseline gap-s2">
              <span className="font-title text-chrome-md text-text">{regla.name}</span>
              <span
                title={EXPLICACION_ESTADO_REGLA[regla.status]}
                className={[
                  "rounded-radius-sm border px-s2 py-0.5 font-chrome text-chrome-xs",
                  regla.status === "ARMED"
                    ? "border-accent text-accent-text"
                    : regla.status === "BROKEN"
                      ? "border-danger text-danger-text"
                      : "border-muted text-muted",
                ].join(" ")}
              >
                {NOMBRE_ESTADO_REGLA[regla.status]}
              </span>
            </div>
            <FraseDeRegla regla={regla} nombreFicha={nombreFicha} />
          </li>
        ))}
      </ul>

      <p className="border-t border-muted pt-s2 font-chrome text-chrome-xs leading-snug text-muted">
        Componer, ensayar en seco y armar una regla siguen en la pestaña «Reglas», que es donde el
        editor tiene sitio para sus tres carriles.{" "}
        <Link
          to={`/campaigns/${campaignId}?seccion=rules`}
          className="text-accent-text hover:underline"
        >
          Abrir el motor de reglas
        </Link>
      </p>
    </div>
  );
}
