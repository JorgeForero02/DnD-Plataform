import { useState } from "react";
import type { FormEvent } from "react";
import type { CreateDmTableInput, TableTrigger, Visibility } from "@dnd/shared";
import { Badge } from "../../ui/Badge";
import { Button } from "../../ui/Button";
import { Field, fieldControlClass } from "../../ui/Field";
import { IconoAviso, IconoQuitar } from "../../ui/Iconos";
import { VisibilityChooser } from "../entities/VisibilityChooser";
// El grupo de radios genérico de B2. Su propio comentario lo declara reutilizable, y duplicarlo
// aquí habría sido una segunda forma de pintar la misma decisión.
import { RadioGroup } from "../campaign-items/RadioGroup";
import { useMyRole } from "../campaigns/members";
import type { DmTable } from "./api";
import {
  useCreateDmTable,
  useDeleteDmTable,
  useDmTables,
  useRollDmTable,
  useSetHouseTables,
} from "./hooks";
import { IconoTabla, IconoTirar } from "./iconos";
import { DISPARADORES, POSICIONES_DE_LA_CASA, disparadorDeTabla } from "./vocabulario";

// Tarea 2C.6 — **las tablas del DM**.
//
// Lo primero que se lee en esta pantalla es qué son: **el SRD no trae ninguna tabla de críticos ni
// de pifias**, y lo único oficial es que un crítico duplica los dados y no los modificadores. Todo
// lo demás es una regla de la casa. No es un adorno de texto: una casa que cambia una regla lo
// hace a la vista, y una tabla que se dispara sin avisar convierte una partida de 5.ª edición en
// otra cosa sin que los jugadores se enteren (`packages/shared/src/dm-table.schema.ts`).
//
// La autorización la comprueba el servidor **siempre**. Que aquí no se pinte el interruptor a un
// jugador no es control de acceso: `requireDM` lo es. Y la lista llega ya filtrada por `canView`,
// así que esta pantalla no esconde ninguna fila — pinta lo que le mandan.

/** El rango de una fila, tal como se escribe una tabla: «01-20», o «7» si es un solo resultado. */
function rango(min: number, max: number): string {
  return min === max ? String(min) : `${min}–${max}`;
}

interface FilaEnEdicion {
  min: string;
  max: string;
  text: string;
}

export function PanelDeTablas({ campaignId }: { campaignId: string }) {
  const { role } = useMyRole(campaignId);
  const esDm = role === "DM";
  const tablas = useDmTables(campaignId);

  return (
    <section className="space-y-s5">
      <header>
        <p className="font-data text-chrome-xs uppercase tracking-[0.16em] text-copper-text">
          La mesa · Tablas del DM
        </p>
        <div className="mt-s2 flex items-center gap-s2">
          <IconoTabla className="h-6 w-6 text-copper-text" />
          <h2 className="font-title text-chrome-2xl leading-tight text-text">Tablas del DM</h2>
        </div>
        {/* La frase que no se negocia. Va arriba, sin adornos, y dice exactamente lo que hace el
            servidor. */}
        <p className="mt-s2 max-w-[70ch] font-chrome text-chrome-sm leading-snug text-muted">
          El SRD no trae ninguna tabla de críticos ni de pifias. Lo único oficial es que un crítico
          duplica los dados y no los modificadores. Estas tablas son una regla de la casa: las pone
          esta mesa, no el manual.
        </p>
      </header>

      {esDm && (
        <InterruptorDeLaCasa campaignId={campaignId} enabled={tablas.data?.houseTablesEnabled} />
      )}

      <ListaDeTablas
        campaignId={campaignId}
        tablas={tablas.data?.tables}
        esDm={esDm}
        cargando={tablas.isLoading}
      />

      {esDm && <FormularioDeTabla campaignId={campaignId} />}
    </section>
  );
}

/**
 * El interruptor de la casa, solo para el DM.
 *
 * **La posición la dice el servidor**, y llega con la lista de tablas. Hubo un rato en que este
 * carril solo podía escribirla —el `GET` no la devolvía—, y la pantalla lo decía en vez de marcar
 * una de las dos por defecto: pintar «Apagada» sin que conste es una interfaz afirmando algo del
 * servidor que no le consta. El hueco se cerró en la API en vez de dejar la frase.
 */
function InterruptorDeLaCasa({
  campaignId,
  enabled,
}: {
  campaignId: string;
  /** `undefined` solo mientras la lista carga. */
  enabled: boolean | undefined;
}) {
  const cambiar = useSetHouseTables(campaignId);
  // Lo que acaba de responder el `PUT` gana mientras la lista se revalida: si no, el radio
  // saltaría a la posición vieja durante un instante después de cambiarlo.
  const conocido = cambiar.data?.enabled ?? enabled;

  return (
    <fieldset className="rounded-radius-sm border border-muted bg-surface p-s3">
      <legend className="px-1 font-chrome text-chrome-sm text-text">
        La regla de la casa, en esta campaña
      </legend>
      <div className="space-y-1">
        {POSICIONES_DE_LA_CASA.map((posicion) => {
          const elegida = conocido === posicion.enabled;
          return (
            <label
              key={String(posicion.enabled)}
              className={[
                "flex cursor-pointer items-start gap-s2 rounded-radius-sm border px-s2 py-1.5 transition-colors",
                elegida
                  ? "border-accent bg-[color:var(--accent-tint)]"
                  : "border-transparent hover:bg-bg",
              ].join(" ")}
            >
              <input
                type="radio"
                name="house-tables"
                checked={elegida}
                disabled={cambiar.isPending}
                onChange={() => cambiar.mutate(posicion.enabled)}
                className="mt-1 accent-[var(--accent)]"
              />
              <span className="min-w-0">
                <span className="block font-chrome text-chrome-sm text-text">
                  {posicion.etiqueta}
                </span>
                <span className="mt-0.5 block font-chrome text-chrome-xs leading-snug text-muted">
                  {posicion.frase}
                </span>
              </span>
            </label>
          );
        })}
      </div>
      {conocido === undefined && (
        <p className="mt-s2 font-chrome text-chrome-xs leading-snug text-muted">
          Leyendo en qué posición está…
        </p>
      )}
      {cambiar.isError && (
        <p role="alert" className="mt-s2 font-chrome text-chrome-xs text-danger-text">
          <IconoAviso className="mr-1" />
          {(cambiar.error as Error).message}
        </p>
      )}
    </fieldset>
  );
}

function ListaDeTablas({
  campaignId,
  tablas,
  esDm,
  cargando,
}: {
  campaignId: string;
  tablas: DmTable[] | undefined;
  esDm: boolean;
  cargando: boolean;
}) {
  if (cargando) {
    return <p className="font-chrome text-chrome-sm text-muted">Cargando las tablas…</p>;
  }
  if (!tablas || tablas.length === 0) {
    return (
      <p className="font-chrome text-chrome-sm text-muted">
        No hay ninguna tabla que puedas ver en esta campaña.
      </p>
    );
  }
  return (
    <ul className="space-y-s3">
      {tablas.map((tabla) => (
        <li key={tabla.id}>
          <FichaDeTabla campaignId={campaignId} tabla={tabla} esDm={esDm} />
        </li>
      ))}
    </ul>
  );
}

function FichaDeTabla({
  campaignId,
  tabla,
  esDm,
}: {
  campaignId: string;
  tabla: DmTable;
  esDm: boolean;
}) {
  const tirar = useRollDmTable(campaignId);
  const borrar = useDeleteDmTable(campaignId);
  const disparador = disparadorDeTabla(tabla.trigger);

  return (
    <article className="rounded-radius-sm border border-muted bg-surface p-s3">
      <div className="flex flex-wrap items-start justify-between gap-s2">
        <div className="min-w-0">
          <h3 className="font-title text-chrome-lg leading-tight text-text">{tabla.name}</h3>
          {tabla.description && (
            <p className="mt-1 font-chrome text-chrome-sm leading-snug text-muted">
              {tabla.description}
            </p>
          )}
          <p className="mt-s2 flex flex-wrap items-center gap-s2">
            <span className="font-chrome text-chrome-xs text-muted">{disparador.etiqueta}</span>
            {/* La forma legible del nivel de visibilidad se escribe una sola vez, en `ui/Badge`.
                Aquí solo se usa. */}
            <Badge visibility={tabla.visibility} />
          </p>
        </div>
        <div className="flex shrink-0 gap-s2">
          <Button
            variant="secondary"
            onClick={() => tirar.mutate(tabla.id)}
            disabled={tirar.isPending}
          >
            <IconoTirar className="h-4 w-4" />
            Tirar
          </Button>
          {esDm && (
            <Button
              variant="danger"
              onClick={() => borrar.mutate(tabla.id)}
              disabled={borrar.isPending}
            >
              <IconoQuitar className="h-4 w-4" />
              Borrar
            </Button>
          )}
        </div>
      </div>

      <p className="mt-s2 font-chrome text-chrome-xs leading-snug text-muted">{disparador.frase}</p>

      <ul className="mt-s3 divide-y divide-[color:var(--copper-rule)] border-t border-muted">
        {tabla.entries.map((fila) => (
          <li key={fila.id} className="flex gap-s3 py-1.5">
            <span className="w-16 shrink-0 font-data text-chrome-sm text-copper-text">
              {rango(fila.min, fila.max)}
            </span>
            <span className="min-w-0 font-chrome text-chrome-sm text-text">{fila.text}</span>
          </li>
        ))}
      </ul>

      {tirar.data && tirar.data.tableId === tabla.id && (
        <p
          role="status"
          className="mt-s3 rounded-radius-sm border border-copper bg-bg p-s2 font-chrome text-chrome-sm text-text"
        >
          <span className="font-data text-copper-text">
            d{tirar.data.die} → {tirar.data.roll}
          </span>{" "}
          {tirar.data.text}
        </p>
      )}
      {tirar.isError && (
        <p role="alert" className="mt-s2 font-chrome text-chrome-xs text-danger-text">
          <IconoAviso className="mr-1" />
          {(tirar.error as Error).message}
        </p>
      )}
      {borrar.isError && (
        <p role="alert" className="mt-s2 font-chrome text-chrome-xs text-danger-text">
          <IconoAviso className="mr-1" />
          {(borrar.error as Error).message}
        </p>
      )}
    </article>
  );
}

const FILA_VACIA: FilaEnEdicion = { min: "1", max: "1", text: "" };

/**
 * Crear una tabla.
 *
 * Las filas son una lista dinámica, así que van con `useState` controlado y no con React Hook
 * Form (docs/04-convenciones.md, sección Web). **Los números se mandan tal como se escribieron**:
 * quien decide si los rangos se solapan, dejan huecos o no empiezan en 1 es el esquema del
 * servidor, y su frase se imprime tal cual — reescribirla aquí sería una segunda fuente de verdad
 * sobre una regla que no vive en esta capa.
 */
function FormularioDeTabla({ campaignId }: { campaignId: string }) {
  const [abierto, setAbierto] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("DM_ONLY");
  const [trigger, setTrigger] = useState<TableTrigger>("NONE");
  const [filas, setFilas] = useState<FilaEnEdicion[]>([{ ...FILA_VACIA }]);
  const crear = useCreateDmTable(campaignId);

  function cambiarFila(indice: number, campo: keyof FilaEnEdicion, valor: string) {
    setFilas((previas) =>
      previas.map((fila, i) => (i === indice ? { ...fila, [campo]: valor } : fila)),
    );
  }

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    const input: CreateDmTableInput = {
      name,
      // Una descripción vacía no se manda: el esquema la tiene opcional, y mandar `""` sería
      // guardar una cadena vacía que luego hay que distinguir de «no tiene».
      ...(description.trim() ? { description } : {}),
      visibility,
      trigger,
      entries: filas.map((fila) => ({
        min: Number(fila.min),
        max: Number(fila.max),
        text: fila.text,
      })),
    };
    crear.mutate(input, {
      onSuccess: () => {
        setAbierto(false);
        setName("");
        setDescription("");
        setVisibility("DM_ONLY");
        setTrigger("NONE");
        setFilas([{ ...FILA_VACIA }]);
      },
    });
  }

  if (!abierto) {
    return (
      <Button variant="primary" onClick={() => setAbierto(true)}>
        Crear tabla
      </Button>
    );
  }

  return (
    <form
      onSubmit={enviar}
      className="space-y-s3 rounded-radius-sm border border-muted bg-surface p-s3"
    >
      <h3 className="font-title text-chrome-lg text-text">Nueva tabla</h3>

      <Field label="Nombre">
        <input
          className={fieldControlClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>

      <Field label="Descripción" hint="Opcional. Para qué es esta tabla y cuándo la usas.">
        <textarea
          className={fieldControlClass}
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </Field>

      {/* Los cinco niveles como radios con su frase: la traducción y la explicación viven en
          features/entities, no se vuelven a escribir aquí. Por defecto, solo el DM. */}
      <VisibilityChooser value={visibility} onChange={setVisibility} />

      <RadioGroup
        name="trigger"
        legend="Cuándo se consulta"
        value={trigger}
        onChange={setTrigger}
        options={DISPARADORES.map((d) => ({
          value: d.trigger,
          label: d.etiqueta,
          hint: d.frase,
        }))}
      />

      <fieldset className="rounded-radius-sm border border-muted p-s2">
        <legend className="px-1 font-chrome text-chrome-xs uppercase tracking-[0.14em] text-muted">
          Filas
        </legend>
        <ul className="space-y-s2">
          {filas.map((fila, indice) => (
            <li key={indice} className="flex flex-wrap items-end gap-s2">
              <div className="w-20">
                <Field label="Desde">
                  <input
                    type="number"
                    className={fieldControlClass}
                    value={fila.min}
                    onChange={(e) => cambiarFila(indice, "min", e.target.value)}
                  />
                </Field>
              </div>
              <div className="w-20">
                <Field label="Hasta">
                  <input
                    type="number"
                    className={fieldControlClass}
                    value={fila.max}
                    onChange={(e) => cambiarFila(indice, "max", e.target.value)}
                  />
                </Field>
              </div>
              <div className="min-w-[12rem] flex-1">
                <Field label="Resultado">
                  <input
                    className={fieldControlClass}
                    value={fila.text}
                    onChange={(e) => cambiarFila(indice, "text", e.target.value)}
                  />
                </Field>
              </div>
              <Button
                type="button"
                variant="ghost"
                aria-label={`Quitar la fila ${indice + 1}`}
                onClick={() => setFilas((previas) => previas.filter((_, i) => i !== indice))}
              >
                <IconoQuitar className="h-4 w-4" />
                Quitar
              </Button>
            </li>
          ))}
        </ul>
        <Button
          type="button"
          variant="secondary"
          className="mt-s2"
          onClick={() => setFilas((previas) => [...previas, { ...FILA_VACIA }])}
        >
          Añadir fila
        </Button>
      </fieldset>

      {crear.isError && (
        // La frase del servidor, tal cual. `ZodValidationPipe` ya escribe un español legible
        // («Falta el resultado 6: la tabla no puede tener huecos.») y reescribirlo aquí lo
        // convertiría en un mensaje genérico que no dice qué arreglar.
        <p role="alert" className="font-chrome text-chrome-sm text-danger-text">
          <IconoAviso className="mr-1" />
          {(crear.error as Error).message}
        </p>
      )}

      <div className="flex gap-s2">
        {/* El botón de guardar nunca se deshabilita (docs/04-convenciones.md). */}
        <Button type="submit" variant="primary">
          Guardar tabla
        </Button>
        <Button type="button" variant="secondary" onClick={() => setAbierto(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
