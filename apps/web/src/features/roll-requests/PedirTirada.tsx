import { useId, useState } from "react";
import type { RollAudience, RollMode } from "@dnd/shared";
import { Button, Field, fieldControlClass, Panel } from "../../ui";
import { ApiError } from "../../lib/api";
import { SelectorDeAudiencia } from "../rolls/SelectorDeAudiencia";
import { SelectorDeVentaja } from "../rolls/SelectorDeVentaja";
import { useCharacters } from "../characters/hooks";
import { useCreateRollRequest, useGuiaDeCd } from "./hooks";
import { HABILIDADES, nombreDeCd, SALVACIONES } from "./vocabulario";

// Tarea 2C.5 — **el DM pide una tirada.**
//
// ## Se pide un VALOR de la hoja, no una expresión
//
// El DM pide «Percepción», no «1d20+5». El motivo entero está en
// `packages/shared/src/roll-request.schema.ts`, y el que lo hace obligatorio es el tercero:
// componer la tirada es una regla del juego, y las reglas viven en el servidor. Esta pantalla
// manda una **clave** (`skill.perception`) y el modificador lo pone la hoja **en el momento de
// tirar**, no en el de pedir.
//
// ## Por qué el «qué» sí es un desplegable
//
// `docs/04-convenciones.md` prohíbe esconder en un desplegable **una opción con significado**:
// pocas opciones, cada una queriendo decir algo distinto —los cinco niveles de visibilidad, las
// tres audiencias, los tres modos—. Aquí no es ese caso: son **veinticuatro nombres del mismo
// tipo de cosa**, una lista para buscar por su nombre, no una decisión entre significados. Las
// dos decisiones de verdad de este formulario —el modo y la audiencia— sí van como radios
// visibles con su frase, que es donde la regla muerde.
//
// ## Y no se pueden sumar ventajas
//
// El modo es **uno solo** (`SelectorDeVentaja`, tres estados excluyentes), porque ventaja y
// desventaja no se acumulan y se cancelan entre sí: «o tienes ventaja, o no la tienes». El
// contrato lo cumple por construcción —lleva un `mode`, no una lista de modificadores— y esta
// pantalla no puede romperlo.

/** Qué se puede pedir, agrupado como se lee: primero las habilidades, luego las salvaciones. */
const GRUPOS_DE_OPCIONES = [
  { titulo: "Habilidades", opciones: HABILIDADES },
  { titulo: "Salvaciones", opciones: SALVACIONES },
];

function mensajeDeError(error: unknown): string {
  // `apiFetch` ya convierte el cuerpo del error del servidor en una frase legible en español.
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "No se pudo pedir la tirada.";
}

export function PedirTirada({ campaignId }: { campaignId: string }) {
  const idGuia = useId();
  const [elegidos, setElegidos] = useState<string[]>([]);
  const [clave, setClave] = useState<string>("skill.perception");
  const [frase, setFrase] = useState("");
  const [cd, setCd] = useState("");
  const [modo, setModo] = useState<RollMode>("NORMAL");
  const [audiencia, setAudiencia] = useState<RollAudience>("PUBLIC");
  const [errorDePersonajes, setErrorDePersonajes] = useState<string | null>(null);
  const [errorDeFrase, setErrorDeFrase] = useState<string | null>(null);
  const [errorDelServidor, setErrorDelServidor] = useState<string | null>(null);

  const personajes = useCharacters(campaignId);
  const guia = useGuiaDeCd();
  const pedir = useCreateRollRequest(campaignId);

  function alternar(characterId: string) {
    setElegidos((actuales) =>
      actuales.includes(characterId)
        ? actuales.filter((id) => id !== characterId)
        : [...actuales, characterId],
    );
  }

  function alPedir() {
    const textoDeLaFrase = frase.trim();
    // **El botón nunca se deshabilita** (docs/04-convenciones.md): un botón deshabilitado no
    // recibe foco de teclado, así que quien no ve el formulario no se entera de que existe. Lo
    // que falta se dice **en línea, junto al campo**, y lo tecleado se conserva.
    setErrorDePersonajes(elegidos.length === 0 ? "Elige al menos un personaje." : null);
    setErrorDeFrase(textoDeLaFrase === "" ? "Escribe qué se pide y para qué." : null);
    if (elegidos.length === 0 || textoDeLaFrase === "") return;

    const cdNumero = cd.trim() === "" ? undefined : Number(cd);
    setErrorDelServidor(null);
    pedir.mutate(
      {
        characterIds: elegidos,
        key: clave,
        label: textoDeLaFrase,
        ...(cdNumero !== undefined && Number.isFinite(cdNumero) ? { dc: cdNumero } : {}),
        mode: modo,
        audience: audiencia,
      },
      {
        onSuccess: () => {
          setErrorDelServidor(null);
          // Se limpia lo que es de **esta** petición y se conserva lo que suele repetirse: a
          // quién se le pide y con qué audiencia. «Tirad todos percepción» y, acto seguido,
          // «tirad todos sigilo» es la secuencia normal de una mesa.
          setFrase("");
          setCd("");
          setModo("NORMAL");
        },
        onError: (e) => setErrorDelServidor(mensajeDeError(e)),
      },
    );
  }

  const filas = personajes.data ?? [];

  return (
    <Panel className="max-w-[40rem]">
      <div className="flex flex-col gap-s3">
        <div>
          <h3 className="font-title text-chrome-lg leading-tight text-text">Pedir una tirada</h3>
          <p className="mt-1 font-chrome text-chrome-xs leading-snug text-muted">
            Se pide un valor de la hoja, no una expresión: el modificador lo pone el servidor con la
            hoja de quien tira, en el momento de tirar.
          </p>
        </div>

        <fieldset className="min-w-0" disabled={pedir.isPending}>
          <legend className="mb-1 font-chrome text-chrome-xs uppercase tracking-[0.14em] text-muted">
            A quién se le pide
          </legend>
          {personajes.isLoading && (
            <p className="font-chrome text-chrome-xs text-muted">Cargando los personajes…</p>
          )}
          {!personajes.isLoading && filas.length === 0 && (
            <p className="font-chrome text-chrome-xs text-muted">
              Esta campaña todavía no tiene personajes a los que pedir nada.
            </p>
          )}
          <div className="flex flex-wrap gap-1.5">
            {filas.map((personaje) => {
              const marcado = elegidos.includes(personaje.id);
              return (
                <label
                  key={personaje.id}
                  className={[
                    "flex cursor-pointer items-baseline gap-s2 rounded-radius-sm border px-s2 py-1 transition-colors",
                    // Clase entera, nunca `bg-accent/10`: una utilidad de opacidad sobre un token
                    // de este proyecto se descarta entera y en silencio (docs/04-convenciones.md).
                    marcado ? "border-accent bg-[color:var(--accent-tint)]" : "border-muted",
                  ].join(" ")}
                >
                  <input
                    type="checkbox"
                    checked={marcado}
                    onChange={() => alternar(personaje.id)}
                    className="accent-[var(--accent)]"
                  />
                  <span className="font-chrome text-chrome-sm text-text">{personaje.name}</span>
                </label>
              );
            })}
          </div>
          {errorDePersonajes && (
            <p role="alert" className="mt-1 font-chrome text-chrome-xs text-danger-text">
              {errorDePersonajes}
            </p>
          )}
        </fieldset>

        {/* **«Qué le pides», no «qué se tira».** Las dos cosas conviven en la misma pantalla —esto
            y el campo de expresión libre de la tarjeta de dados— y con el mismo rótulo son dos
            controles distintos que se anuncian igual: quien navega con lector de pantalla oye dos
            veces lo mismo y no sabe cuál es cuál. Lo encontró el recorrido de navegador. */}
        <Field label="Qué le pides" hint="Una habilidad o una salvación de la hoja.">
          <select
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            className={fieldControlClass}
          >
            {GRUPOS_DE_OPCIONES.map((grupo) => (
              <optgroup key={grupo.titulo} label={grupo.titulo}>
                {grupo.opciones.map((opcion) => (
                  <option key={opcion.key} value={opcion.key}>
                    {opcion.etiqueta}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </Field>

        <Field
          label="Qué se le dice"
          hint="«Percepción para ver si oís al posadero»."
          error={errorDeFrase ?? undefined}
        >
          <input
            type="text"
            value={frase}
            onChange={(e) => setFrase(e.target.value)}
            maxLength={120}
            className={fieldControlClass}
          />
        </Field>

        <div>
          <Field label="CD (opcional)" hint="En la mesa se pide muchas veces sin ninguna.">
            <input
              type="number"
              min={1}
              max={50}
              value={cd}
              onChange={(e) => setCd(e.target.value)}
              aria-describedby={idGuia}
              className={`${fieldControlClass} font-data`}
            />
          </Field>

          {/* **La guía del SRD es una ayuda, no una jaula.**
              La tabla «Typical Difficulty Classes» del SRD 5.1 da seis escalones, pero el propio
              manual dice que *the DM sets the DC*: la escala orienta, no decide. Por eso las seis
              filas **rellenan** el campo y no lo sustituyen — el DM puede escribir cualquier
              número encima, incluido uno que no esté en la tabla. Obligar a elegir una de las
              seis convertiría una ayuda en una jaula, y además mentiría sobre lo que dice el
              manual (docs/04-convenciones.md: si el texto explica una regla y discrepan, miente
              el texto). */}
          <div id={idGuia} className="mt-1">
            <p className="mb-1 font-chrome text-chrome-xs text-muted">
              Guía del SRD; puedes escribir cualquier número.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(guia.data ?? []).map((fila) => (
                <Button
                  key={fila.key}
                  type="button"
                  variant="secondary"
                  onClick={() => setCd(String(fila.dc))}
                  aria-label={`${nombreDeCd(fila.key)}: CD ${fila.dc}`}
                >
                  <span>{nombreDeCd(fila.key)}</span>
                  <span className="font-data text-muted">{fila.dc}</span>
                </Button>
              ))}
            </div>
          </div>
        </div>

        <SelectorDeVentaja
          value={modo}
          onChange={setModo}
          etiqueta="lo que se pide"
          disabled={pedir.isPending}
        />

        <SelectorDeAudiencia value={audiencia} onChange={setAudiencia} disabled={pedir.isPending} />

        <div className="flex items-center gap-s2">
          <Button type="button" variant="primary" onClick={alPedir}>
            Pedir la tirada
          </Button>
        </div>

        {errorDelServidor && (
          <p role="alert" className="font-chrome text-chrome-xs text-danger-text">
            {errorDelServidor}
          </p>
        )}
      </div>
    </Panel>
  );
}
