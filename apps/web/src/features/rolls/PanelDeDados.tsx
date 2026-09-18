import { useState } from "react";
import type { RollAudience, RollMode, RollResult } from "@dnd/shared";
import { Button, Field, fieldControlClass, Panel } from "../../ui";
import { CabeceraDeSeccion } from "../entities/CabeceraDeSeccion";
import { ApiError } from "../../lib/api";
import { IconoD20 } from "../../ui/Iconos";
import { ResultadoDeTirada } from "./ResultadoDeTirada";
import { TiradaACiegas } from "./TiradaACiegas";
import { SelectorDeAudiencia } from "./SelectorDeAudiencia";
import { RegistroDeTiradas } from "./RegistroDeTiradas";
import { RelojDeCampana } from "../game-clock/RelojDeCampana";
import { useCreateRoll } from "./hooks";
import { useMyRole } from "../campaigns/members";
import { PedirTirada } from "../roll-requests/PedirTirada";
import { TiradasPendientes } from "../roll-requests/TiradasPendientes";
import { BandejaDeDados } from "./BandejaDeDados";
import { BANDEJA_VACIA, conDado, type Bandeja } from "./bandeja";

// Tarea 2C.2 — **la pantalla de dados de la campaña: se tira desde donde estás.**
//
// ## De dónde sale la forma
//
// De la pantalla «Dados» del prototipo (revisión obligatoria por `docs/04-convenciones.md`):
// cabecera de sección con su frase de para-qué, una tarjeta centrada con el dado dibujado en
// cobre, el control de tres estados, los dados que salieron, el total en grande, la línea de
// desglose en fuente monoespaciada y los botones; y debajo, la nota plegable que dice dónde
// acaba el resultado.
//
// ## Las cuatro diferencias deliberadas, y por qué
//
//  1. **Campo de expresión libre.** El prototipo no lo tiene: enseña un d20 y tres estados. El
//     alcance de 2C sí lo exige, y con razón — «tira 2d6+3 porque lo digo yo» es la mitad de lo
//     que pasa en una mesa, y sin campo esa mitad se resuelve con dados de plástico al lado del
//     portátil, que es la imagen que esta herramienta existe para quitar.
//  2. **Los siete dados como atajos** (d4 … d100), pulsables en la bandeja (`BandejaDeDados.tsx`,
//     Task 10). Son la otra mitad: escribir `1d6` a mano para el daño de una daga, veinte veces
//     por combate, es exactamente el trabajo que un programa debería ahorrar. La composición
//     vive en `bandeja.ts` y se prueba sola.
//  3. **Audiencia de la tirada.** El prototipo no la tiene y el contrato de 2C.1 sí
//     (`rollAudienceSchema`). Va como **tres radios visibles con su frase**, nunca en un
//     desplegable: regla vinculante de `docs/04-convenciones.md`, y aquí pesa el doble porque
//     equivocarse en ese control enseña a los jugadores algo que no debían ver.
//  4. **Motivo y CD.** Dos campos opcionales del contrato que el prototipo se salta. El motivo
//     es lo que convierte una línea del registro en algo legible seis semanas después; la CD es
//     opcional a propósito, porque en la mesa se tira muchas veces sin ninguna.
//
// ## Lo que el prototipo enseña y aquí NO se construye
//
// «Tiradas propias guardadas» —las macros del jugador— **queda pendiente**: está fuera del
// alcance de 2C y necesita persistencia propia (una tabla, sus permisos y su pantalla de
// edición), no un rincón de esta. Se declara aquí para que la ausencia sea una decisión y no un
// olvido.
//
// ## Y lo que no se hace en ningún caso
//
// **Aquí no se genera azar.** El navegador pide la tirada; no la hace. Y pide ventaja **por
// nombre** (`mode`), nunca mandando `2d20kh1`: convertir el d20 es una regla del juego y vive en
// el servidor (`apps/api/src/rolls/rolls.service.ts`). Tampoco se valida la expresión: quien
// decide si una expresión es válida es el evaluador del servidor, y **su rechazo se pinta
// legible y en línea, junto al campo** —nunca en un aviso flotante, que se ha ido antes de que
// un lector de pantalla llegue a él (docs/04-convenciones.md)—, retirando el resultado anterior
// para que nadie lea un total viejo como si fuera el de la tirada que acaba de rechazarse.

function mensajeDeError(error: unknown): string {
  // `apiFetch` ya convierte el cuerpo del 400 del servidor —`{ code, message }`— en una frase
  // legible en español (`ApiError.message`). Aquí no se reescribe: se enseña.
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "No se pudo tirar.";
}

export function PanelDeDados({ campaignId }: { campaignId: string }) {
  // Task 10 — la bandeja empieza con un d20, como el «1d20» de siempre: es lo que hace que
  // «Ventaja» siga visible desde el primer render, igual que antes de esta tarea.
  const [bandeja, setBandeja] = useState<Bandeja>(() => conDado(BANDEJA_VACIA, 20));
  const [expresion, setExpresion] = useState("1d20");
  const [motivo, setMotivo] = useState("");
  const [cd, setCd] = useState("");
  const [modo, setModo] = useState<RollMode>("NORMAL");
  const [audiencia, setAudiencia] = useState<RollAudience>("PUBLIC");
  const [resultado, setResultado] = useState<RollResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tirar = useCreateRoll(campaignId);
  // Tarea 2C.5 — **el formulario de pedir solo se le ofrece al DM.** No es control de acceso:
  // quien lo impone es `requireDM` en `roll-requests.service.ts`, y un jugador que llegara al
  // endpoint recibiría un 403 igual. Lo que esto evita es ofrecer un botón que el servidor va a
  // rechazar, que es mentir (docs/04-convenciones.md). Mientras el rol no se sabe —`undefined`
  // por cualquiera de sus tres motivos— no se pinta: «no lo sé» nunca se trata como «sí».
  const { role } = useMyRole(campaignId);

  // La etiqueta con la que el desglose nombra el modificador. Sin motivo escrito, «modificador»
  // —que es cierto siempre— en vez del nombre de algo que nadie ha dicho que se esté tirando.
  const etiqueta = motivo.trim() || "modificador";

  function alTirar() {
    // Revisión final de la rama (2026-09-13). **«Tirar» no se apaga por bandeja vacía**
    // (docs/04-convenciones.md: «el botón de guardar nunca se deshabilita: deshabilitado no
    // recibe foco de teclado y tiene mal contraste»), igual que T5 resolvió «Guardar la sala»:
    // se pulsa, el rechazo se explica en línea junto a «Qué se tira» —`BandejaDeDados` abre el
    // modo avanzado sola cuando hay error— y no sale ninguna petición.
    if (expresion.trim() === "") {
      setResultado(null);
      setError("Añade un dado a la bandeja, o escribe una expresión en Modo avanzado.");
      return;
    }
    const cdNumero = cd.trim() === "" ? undefined : Number(cd);
    setError(null);
    tirar.mutate(
      {
        expression: expresion.trim(),
        // **Este panel no tiene personaje**, y la inspiración es de un personaje. El control vive
        // en el panel de la mesa (`panel/PanelDeDadosDeLaMesa.tsx`), que sí sabe por quién tira, y
        // en la hoja. Aquí sería una casilla que siempre da 400.
        spendInspiration: false,
        ...(motivo.trim() ? { label: motivo.trim() } : {}),
        ...(cdNumero !== undefined && Number.isFinite(cdNumero) ? { dc: cdNumero } : {}),
        audience: audiencia,
        mode: modo,
      },
      {
        onSuccess: (r) => {
          setError(null);
          setResultado(r);
        },
        onError: (e) => {
          // **El resultado anterior se retira.** Dejarlo puesto junto a un mensaje de error es
          // la forma más barata de que alguien cante un total que no salió de esta tirada.
          setResultado(null);
          setError(mensajeDeError(e));
        },
      },
    );
  }

  return (
    <div>
      <CabeceraDeSeccion
        grupo="La mesa"
        titulo="Dados"
        paraQue="Se tira desde donde estás. Ventaja y desventaja como decisión, no como sintaxis."
      />

      {/* **Arriba del todo**: lo que te han pedido va antes que lo que quieras tirar por tu
          cuenta. Si no hay ninguna petición pendiente no pinta nada — ni siquiera una caja
          vacía—, así que la pantalla de quien no tiene recados es la de antes de 2C.5. */}
      <TiradasPendientes campaignId={campaignId} />

      {/* **Dos columnas cuando hay sitio, y el motivo salió de mirar la pantalla montada.**
          Pedir una tirada y tirar una llevan cada uno su control de ventaja y su selector de
          audiencia, así que apilados en vertical la pantalla del DM enseñaba **dos veces
          seguidas el mismo par de bloques de radios** y se leía como una repetición, no como dos
          herramientas. En dos columnas se lee lo que son: a la izquierda lo que le pides a la
          mesa, a la derecha lo que tiras tú.
          No se escondió ninguna opción para arreglarlo —los radios con su frase son regla
          vinculante—: se cambió dónde caen. Y en una pantalla estrecha vuelven a apilarse, que
          es lo único que cabe. */}
      {/* **El reloj, en la misma rejilla que pedir y tirar, no encima de las dos** (anexo #16).
          Apilarlo aparte en `mb-s5` es lo que dejaba la mitad de la pantalla ocupada por una
          tarjeta y la otra mitad repartida en dos columnas desiguales — la misma queja que #14
          hace del cajón de la mesa. En rejilla, `xl:col-span-2` le deja las dos columnas cuando
          las hay (es la más ancha de las tres) y `items-stretch` iguala la altura de pedir y
          tirar, que es lo que #16 pide de la rejilla. Para quien no es DM no hay ni «pedir» ni
          dos columnas, pero SÍ sigue habiendo `gap-s5` de separación entre el reloj y la tirada:
          quitar la rejilla entera (el `undefined` de antes de la revisión) dejaba ambas tarjetas
          sin el hueco que traía el `mb-s5` que sustituyó. */}
      <div className={role === "DM" ? "grid items-stretch gap-s5 xl:grid-cols-2" : "grid gap-s5"}>
        <RelojDeCampana
          campaignId={campaignId}
          className={role === "DM" ? "xl:col-span-2" : undefined}
        />

        {role === "DM" && <PedirTirada campaignId={campaignId} />}

        {/* Una región con nombre, como ya lo era el registro de abajo: sin nombre, las dos zonas
            que enseñan un resultado son indistinguibles para quien navega por regiones — y
            también para una prueba de navegador, que fue como se notó. */}
        <section aria-label="Tirada nueva" className="min-w-0">
          {/* **Pegada a la izquierda, no centrada.** Se comprobó mirando las dos capturas al
            lado: en el prototipo la tarjeta arranca en el mismo filo que el título y la frase de
            para-qué, y centrarla abría un pasillo vacío a la izquierda que hacía que la cabecera
            y la tarjeta parecieran dos pantallas distintas. El ancho también sale de ahí. */}
          <Panel className={role === "DM" ? "h-full" : "max-w-[40rem]"}>
            <div className="flex flex-col items-center gap-s2">
              {/* El dado, dibujado y en cobre: el cobre significa «esto pertenece al mundo», y este
              dibujo enmarca la tarjeta sin pedir que se pulse. Nada de glifos de fuente. */}
              <span className="text-chrome-2xl text-copper-text">
                <IconoD20 />
              </span>
            </div>

            <div className="mt-s3 flex flex-col gap-s3">
              {/* Task 10 — pulsar un dado lo añade a la pila; pulsar uno de la pila lo quita.
                  «Qué se tira» sigue existiendo, y sigue siendo el campo que manda cuando alguien
                  escribe encima, pero ahora plegado bajo «Modo avanzado» — y ahí sigue viviendo
                  el error del servidor, junto al campo, con su `aria-invalid`/`aria-describedby`
                  de siempre (regla de docs/04-convenciones.md: nunca flotando). */}
              <BandejaDeDados
                valor={bandeja}
                onChange={({ bandeja: siguiente, expresion: siguienteExpresion }) => {
                  setBandeja(siguiente);
                  setExpresion(siguienteExpresion);
                }}
                modo={modo}
                onModoChange={setModo}
                error={error ?? undefined}
                disabled={tirar.isPending}
              />

              <SelectorDeAudiencia
                value={audiencia}
                onChange={setAudiencia}
                disabled={tirar.isPending}
              />

              <div className="grid gap-s3 sm:grid-cols-[2fr_1fr]">
                <Field label="Motivo (opcional)" hint="«Percepción», «Daño de la daga».">
                  <input
                    type="text"
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    maxLength={120}
                    className={fieldControlClass}
                  />
                </Field>
                <Field label="CD (opcional)" hint="En la mesa se tira muchas veces sin ninguna.">
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={cd}
                    onChange={(e) => setCd(e.target.value)}
                    className={`${fieldControlClass} font-data`}
                  />
                </Field>
              </div>

              <div className="flex items-center gap-s2">
                {/* **Solo `isPending` lo apaga.** Con la bandeja vacía sigue habilitado y es
                    `alTirar` quien explica en línea qué falta (ver arriba). */}
                <Button
                  type="button"
                  variant="primary"
                  onClick={alTirar}
                  disabled={tirar.isPending}
                >
                  Tirar
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setResultado(null);
                    setError(null);
                  }}
                >
                  Limpiar
                </Button>
              </div>
            </div>

            {resultado &&
              (resultado.revealed ? (
                <div className="mt-s3">
                  {/* El total en grande, como en la maqueta. La línea de desglose de abajo lo repite
                  a propósito: el número grande es lo que se canta en la mesa, y el desglose es
                  de dónde salió — nunca un número solo. */}
                  <p className="text-center font-data text-chrome-2xl text-text">
                    {resultado.total}
                  </p>
                  <ResultadoDeTirada resultado={resultado} etiqueta={etiqueta} />
                </div>
              ) : (
                <div className="mt-s3">
                  <TiradaACiegas etiqueta={etiqueta} expresion={resultado.expression} />
                </div>
              ))}

            {/* La nota plegable de la maqueta. Dice dónde acaba el resultado, que es la pregunta que
            se hace quien acaba de tirar y no ve nada guardado en la tarjeta. */}
            <details className="mt-s3">
              <summary className="cursor-pointer font-chrome text-chrome-xs text-muted">
                ¿Dónde queda el resultado?
              </summary>
              <p className="mt-1 font-chrome text-chrome-xs leading-snug text-muted">
                El resultado va al registro de la sesión, no se lo queda la pantalla.
              </p>
            </details>
          </Panel>
        </section>
      </div>

      <RegistroDeTiradas campaignId={campaignId} />
    </div>
  );
}
