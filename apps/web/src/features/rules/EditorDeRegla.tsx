import { useState } from "react";
import type { CreateRuleInput, RuleCondition, RuleEffect, RuleTrigger } from "@dnd/shared";
import { Button, Field, fieldControlClass } from "../../ui";
import type { Entity } from "../entities/api";
import type { RuleRow } from "./api";
import { avisosDelBorrador, type AccionDeArreglo } from "./avisos";
import { AvisosDeRegla } from "./AvisosDeRegla";
import { CajaColocada, CarrilDeCajas, PaletaDeCajas } from "./CajasDeRegla";
import { FraseDeRegla } from "./FraseDeRegla";
import {
  borradorDesde,
  condicionPorDefecto,
  disparadorPorDefecto,
  efectoPorDefecto,
  revisarBorrador,
  type BorradorDeRegla,
} from "./formularios";
import { pasoDeGuia } from "./guia";
import { ModoDeRegla } from "./ModoDeRegla";
import { PieDeGuia } from "./PieDeGuia";
import { CamposDeCondicion, CamposDeDisparador, CamposDeEfecto } from "./PiezasDeRegla";
import {
  CARRIL_DE_PARTE,
  nombreDePieza,
  type NombreDeFicha,
  type ParteDeRegla,
} from "./vocabulario";

// Tareas R1 y R4 — crear y editar una regla arrastrando cajas a carriles fijos.
//
// **Qué se tiró y por qué.** Los tres desplegables («Cuando», «Condición», «Efecto») se han
// ido. No estaban mal escritos: estaban mal planteados. Los tres se veían iguales, así que la
// pantalla no decía en ninguna parte que un suceso y una condición son cosas distintas —el
// malentendido número uno de este tipo de editores— y elegir una clase era un gesto invisible
// que no dejaba rastro en pantalla. El DM del autor lo probó y no entendió nada.
//
// **Qué se conservó.** Todo lo que ya era correcto: los campos de cada clase
// (`PiezasDeRegla.tsx`, ahora partidos en `CamposDe…`), el vocabulario en español
// (`vocabulario.ts`), el modo propuesta (`ModoDeRegla.tsx`) y la validación con el mismo
// esquema que corre en la API. Lo que cambió es cómo se elige una pieza, no qué se puede
// elegir: el vocabulario sigue siendo exactamente el cerrado de `@dnd/shared`.
//
// **La validación sigue siendo Zod desde `@dnd/shared`** (docs/04-convenciones.md), y sigue sin
// ser control de acceso: quien decide de verdad es la API.
//
// ---------------------------------------------------------------------------------------------
// Tarea R1-fix — **por qué esto ya no es un diálogo, y por qué eso es lo que arregla el
// arrastre.**
//
// Hasta hoy el editor vivía dentro de `ui/Dialog.tsx`, y **no se podía arrastrar ni una pieza**:
// en esa pantalla no se disparaba un solo `dragstart`. La causa se midió, no se supuso, montando
// este mismo componente con su CSS real en una página estática y arrastrando con Chromium:
//
//   panel del diálogo tal cual .............. sin `dragstart`, sin `drop`
//   quitándole el `overflow-y-auto` ......... **sigue sin arrancar**
//   quitándole el `max-h-[85vh]` ............ arrastra y coloca
//   quitándole el `backdrop-blur` del velo .. sigue sin arrancar
//   sacando el panel fuera del velo ......... sigue sin arrancar
//
// Es decir: **no era el desplazamiento, era la altura**. Con `max-h-[85vh]` el panel medía 763 px
// de alto para 1553 px de contenido, y los carriles caían en `y ≈ 995`, **fuera de la ventana**.
// Una pieza y su ranura no estaban nunca en pantalla a la vez, así que el gesto era imposible:
// arrastrando a mano el `dragstart` sí sale, pero no hay adónde soltar, y cualquier intento de
// desplazar el panel para ver el carril mueve la pieza de debajo del puntero. No era un defecto
// de código; era un defecto de sitio. Un editor con 28 piezas, tres carriles, la frase, los
// avisos y la guía **no cabe en una ventana modal**, y esa estrechez era además parte de por qué
// se veía confuso. Un modal atrapa el foco, encima, que es lo último que quieres mientras
// compones algo largo.
//
// Así que el editor pasa a ser **una pantalla dentro de la pestaña «Reglas»** (lo monta
// `PanelDeReglas.tsx`, que enseña esto en lugar de la lista mientras dura la edición).
// `ui/Dialog.tsx` **no se ha tocado**: lo usa media aplicación y no tenía la culpa de nada.
//
// Y la disposición hace la otra mitad del trabajo: **cada grupo de la paleta va justo encima del
// carril al que pertenece**, en una rejilla de tres columnas y dos filas. Una pieza y su ranura
// quedan a un palmo, siempre visibles juntas, y de paso la correspondencia grupo → carril deja
// de ser algo que hay que leer y pasa a ser algo que se ve. Las tres columnas comparten fila, así
// que los tres carriles siguen empezando exactamente a la misma altura — que es lo que mide
// `apps/web/e2e/reglas-arrastrar.spec.ts`.

/** Los topes que el propio esquema declara — se citan en pantalla, no se reimplementan. */
const MAX_CONDICIONES = 10;
const MAX_EFECTOS = 10;

export function EditorDeRegla({
  abierto,
  regla,
  borradorInicial,
  entities,
  reglas,
  guardando,
  aplicandoArreglo,
  error,
  onGuardar,
  onCrearReversion,
  onCerrar,
}: {
  abierto: boolean;
  /** Sin regla: se crea una nueva. Con regla: se edita ésa. */
  regla?: RuleRow;
  /** Tarea F6 — el borrador con el que arranca una plantilla clonada. No se guarda nada aún. */
  borradorInicial?: BorradorDeRegla;
  entities: Entity[];
  reglas: RuleRow[];
  guardando: boolean;
  /** Mientras el arreglo de un aviso viaja al servidor. */
  aplicandoArreglo?: boolean;
  error?: string;
  onGuardar: (input: CreateRuleInput) => void;
  /** Tarea F5 — el enlace del aviso **hace** la regla; crearla es de quien tiene la API. */
  onCrearReversion?: (nombre: string, key: string) => void;
  onCerrar: () => void;
}) {
  const [borrador, setBorrador] = useState<BorradorDeRegla>(
    () => borradorInicial ?? borradorDesde(regla),
  );
  const [intentado, setIntentado] = useState(false);
  // Colocar con el teclado no mueve nada por la pantalla, así que hay que decir lo que pasó.
  const [aviso, setAviso] = useState("");

  // Remontar el diálogo con una regla distinta tiene que recargar el borrador. `key` en el sitio
  // de uso es lo que lo garantiza; aquí solo se guarda el valor inicial.
  const revision = revisarBorrador(borrador);

  function enviar() {
    setIntentado(true);
    if (!revision.entrada) return;
    onGuardar(revision.entrada);
  }

  /**
   * La única puerta por la que entra una caja al carril, la use el ratón o el teclado. Que las
   * dos rutas compartan esta función es lo que hace que probar una pruebe la otra.
   */
  function colocar(parte: ParteDeRegla, clave: string) {
    if (parte === "SUCESO") {
      const anterior = borrador.trigger;
      setBorrador({ ...borrador, trigger: disparadorPorDefecto(clave as RuleTrigger["kind"]) });
      setAviso(
        anterior
          ? `«${nombreDePieza(clave)}» sustituye a «${nombreDePieza(anterior.kind)}» en el carril «${CARRIL_DE_PARTE.SUCESO}». Un suceso por regla.`
          : `«${nombreDePieza(clave)}» colocado en el carril «${CARRIL_DE_PARTE.SUCESO}».`,
      );
      return;
    }
    if (parte === "ESTADO") {
      if (borrador.conditions.length >= MAX_CONDICIONES) return;
      setBorrador({
        ...borrador,
        conditions: [...borrador.conditions, condicionPorDefecto(clave as RuleCondition["kind"])],
      });
      setAviso(`«${nombreDePieza(clave)}» colocado en el carril «${CARRIL_DE_PARTE.ESTADO}».`);
      return;
    }
    if (borrador.effects.length >= MAX_EFECTOS) return;
    setBorrador({
      ...borrador,
      effects: [...borrador.effects, efectoPorDefecto(clave as RuleEffect["kind"])],
    });
    setAviso(`«${nombreDePieza(clave)}» colocado en el carril «${CARRIL_DE_PARTE.ACCION}».`);
  }

  const otrasReglas = reglas.filter((r) => r.id !== regla?.id);

  /**
   * Tarea F5 — el arreglo que ofrece un aviso, ejecutado. Uno se resuelve aquí dentro (meter una
   * condición en el carril) y el otro necesita la API, así que sube a quien la tiene: este
   * componente no habla HTTP.
   */
  function aplicarArreglo(accion: AccionDeArreglo) {
    if (accion.tipo === "AGREGAR_CONDICION") {
      colocar("ESTADO", accion.kind);
      return;
    }
    onCrearReversion?.(accion.nombre, accion.key);
  }

  const avisos = avisosDelBorrador(borrador, otrasReglas);
  const paso = pasoDeGuia(borrador, revision.problemas);

  /**
   * El nombre de una ficha para la frase. Cuando el hueco todavía está vacío **se dice que lo
   * está** en vez de dejar un «entrada » a medias: la frase tiene que ser legible mientras se
   * escribe, que es justo cuando hace falta.
   */
  const nombreFicha: NombreDeFicha = (id) =>
    entities.find((e) => e.id === id)?.name ?? (id ? `entrada ${id.slice(-6)}` : "sin elegir");

  if (!abierto) return null;

  const topes: Partial<Record<ParteDeRegla, string>> = {
    ESTADO:
      borrador.conditions.length >= MAX_CONDICIONES
        ? "Diez condiciones es el tope que admite el servidor. Quita una para poder poner otra."
        : undefined,
    ACCION:
      borrador.effects.length >= MAX_EFECTOS
        ? "Diez acciones es el tope que admite el servidor. Quita una para poder poner otra."
        : undefined,
  };

  return (
    <section aria-label="Editor de regla" className="space-y-s4">
      <h2 className="font-title text-chrome-lg text-text">
        {regla ? `Editar «${regla.name}»` : "Nueva regla"}
      </h2>

      <p className="font-chrome text-chrome-sm leading-snug text-muted">
        Una regla es una frase de tres partes. Arrastra una caja al carril que tiene debajo, o
        púlsala y cae sola. <strong className="text-text">La ranura es la conexión</strong>: lo que
        está dentro de un carril forma parte de la regla, y lo que está fuera, no.
      </p>

      <Field label="Nombre de la regla">
        <input
          className={fieldControlClass}
          value={borrador.name}
          maxLength={160}
          onChange={(e) => setBorrador({ ...borrador, name: e.target.value })}
        />
      </Field>

      {/* Lo que se coloca con el teclado no se ve moverse: se dice. */}
      <p aria-live="polite" className="font-chrome text-chrome-xs text-muted">
        {aviso}
      </p>

      {/*
        Reseño 2026-09-03 — **la disposición de la maqueta: paleta a la izquierda, tablero a la
        derecha.** Antes cada grupo de piezas iba justo encima de su carril, en tres columnas y
        dos filas; funcionaba, pero partía la pantalla en seis bloques sueltos y ninguno se leía
        como una cosa. Ahora hay dos objetos: el cajón de las piezas y el tablero donde se arma
        la regla, con los tres carriles y la frase dentro del mismo marco — porque la frase **es**
        lo que dicen los carriles, no un panel aparte.

        **Y esto no puede romper el arrastre, que es lo que costó sacar el editor del diálogo.**
        La exigencia medida es que la pieza y su ranura estén en pantalla a la vez. Se cumple por
        dos vías, no por una: la paleta se ha compactado (fuera el párrafo por grupo, que sumaba
        tres veces la misma explicación) y **el tablero es pegajoso** a partir de la anchura en la
        que hay dos columnas, así que los carriles siguen visibles por muy abajo que se baje a
        buscar una pieza. En pantalla estrecha la rejilla se deshace y el orden del documento
        —paleta, luego carriles en el orden de la frase— sigue siendo el de la lectura.
      */}
      <div className="grid gap-s4 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
        <PaletaDeCajas topes={topes} onColocar={colocar} />

        <div className="min-w-0 space-y-s4">
          {/* `lg:top-20` y no `lg:top-s4`: la cabecera de la aplicación es **fija y ocupa 64 px**,
              así que pegarse a 16 del borde mete el tablero DEBAJO de ella. Se veía al arrastrar:
              el carril quedaba en `y = 29` y el punto de soltado caía sobre la cabecera, no sobre
              la ranura — medido con `elementFromPoint`. Es el mismo fallo que tuvo la barra de
              sesión, y por eso ahora hay un recorrido que lo comprueba. */}
          <div className="space-y-s3 rounded-radius-sm border border-muted bg-surface p-s3 lg:sticky lg:top-20">
            <div className="grid gap-s3 md:grid-cols-3">
              <CarrilDeCajas
                parte="SUCESO"
                vacio={borrador.trigger === null}
                onSoltar={(clave) => colocar("SUCESO", clave)}
              >
                {borrador.trigger && (
                  <CajaColocada
                    parte="SUCESO"
                    clave={borrador.trigger.kind}
                    onQuitar={() => {
                      setAviso(
                        `Carril «${CARRIL_DE_PARTE.SUCESO}» vacío otra vez. Sin suceso, la regla no se despierta.`,
                      );
                      setBorrador({ ...borrador, trigger: null });
                    }}
                  >
                    <CamposDeDisparador
                      value={borrador.trigger}
                      entities={entities}
                      onChange={(trigger) => setBorrador({ ...borrador, trigger })}
                    />
                  </CajaColocada>
                )}
              </CarrilDeCajas>

              <CarrilDeCajas
                parte="ESTADO"
                vacio={borrador.conditions.length === 0}
                onSoltar={(clave) => colocar("ESTADO", clave)}
              >
                {borrador.conditions.map((condicion, i) => (
                  <CajaColocada
                    key={`${condicion.kind}-${i}`}
                    parte="ESTADO"
                    clave={condicion.kind}
                    onQuitar={() =>
                      setBorrador({
                        ...borrador,
                        conditions: borrador.conditions.filter((_, j) => j !== i),
                      })
                    }
                  >
                    <CamposDeCondicion
                      value={condicion}
                      onChange={(nueva) =>
                        setBorrador({
                          ...borrador,
                          conditions: borrador.conditions.map((c, j) => (j === i ? nueva : c)),
                        })
                      }
                    />
                  </CajaColocada>
                ))}
              </CarrilDeCajas>

              <CarrilDeCajas
                parte="ACCION"
                vacio={borrador.effects.length === 0}
                onSoltar={(clave) => colocar("ACCION", clave)}
              >
                {borrador.effects.map((efecto, i) => (
                  <CajaColocada
                    key={`${efecto.kind}-${i}`}
                    parte="ACCION"
                    clave={efecto.kind}
                    onQuitar={() =>
                      setBorrador({
                        ...borrador,
                        effects: borrador.effects.filter((_, j) => j !== i),
                      })
                    }
                  >
                    <CamposDeEfecto
                      value={efecto}
                      entities={entities}
                      reglas={otrasReglas}
                      onChange={(nuevo) =>
                        setBorrador({
                          ...borrador,
                          effects: borrador.effects.map((e, j) => (j === i ? nuevo : e)),
                        })
                      }
                    />
                  </CajaColocada>
                ))}
              </CarrilDeCajas>
            </div>

            {/*
              Tarea F1 — la frase, siempre visible y debajo de los carriles. Debajo y no encima
              porque es el resultado de lo que hay arriba: se coloca una caja y la frase cambia.
              Dentro del mismo marco desde el reseño: los carriles y la frase son la misma regla
              contada dos veces, y en la maqueta comparten tarjeta por eso.
            */}
            <FraseDeRegla regla={borrador} nombreFicha={nombreFicha} />

            {/*
              Tarea F5 — lo que se puede guardar pero conviene mirar, con su arreglo al lado.

              **Va DENTRO del bloque pegajoso, y eso lo decidió un fallo medido.** Estaba justo
              debajo, como hermano, y un elemento pegajoso no se aparta: sus hermanos posteriores
              se deslizan por debajo. Resultado, dicho por el propio navegador: «el carril
              intercepta los eventos de puntero» y **el botón «Añadir reversión» no se podía
              pulsar**. Además de arreglarlo, encaja mejor: el aviso es de la regla que se está
              componiendo, no de la pantalla.
            */}
            <AvisosDeRegla
              avisos={avisos}
              aplicando={aplicandoArreglo}
              onAplicarArreglo={aplicarArreglo}
            />
          </div>

          <ModoDeRegla
            value={borrador.mode}
            onChange={(mode) => setBorrador({ ...borrador, mode })}
          />

          <Field
            label="Tope de disparos (opcional)"
            hint="En blanco, sin tope. Existe como contención, no como regla del juego."
          >
            <input
              type="number"
              min={1}
              max={9999}
              className={fieldControlClass}
              value={borrador.maxFires ?? ""}
              onChange={(e) =>
                setBorrador({
                  ...borrador,
                  maxFires: e.target.value === "" ? null : Number(e.target.value),
                })
              }
            />
          </Field>

          {intentado && revision.problemas.length > 0 && (
            <div role="alert" className="rounded-radius-sm border border-danger p-s2">
              <p className="font-chrome text-chrome-sm text-danger-text">
                La regla todavía no está completa:
              </p>
              <ul className="mt-1 list-disc pl-s5 font-chrome text-chrome-xs text-danger-text">
                {revision.problemas.map((problema) => (
                  <li key={problema}>{problema}</li>
                ))}
              </ul>
            </div>
          )}

          {error && (
            <p role="alert" className="font-chrome text-chrome-sm text-danger-text">
              {error}
            </p>
          )}
        </div>
      </div>

      {/* Tarea F6 — la guía. Va al pie, no tapa nada, y no se puede cerrar: se cierra sola.
          Al pie de las DOS columnas desde el reseño, como en la maqueta: la instrucción de lo
          siguiente que hacer habla de la pantalla entera, no de la mitad derecha. */}
      <PieDeGuia paso={paso} />

      <div className="flex justify-end gap-s2">
        <Button variant="secondary" type="button" onClick={onCerrar}>
          Cancelar
        </Button>
        {/* El botón de guardar nunca se deshabilita: deshabilitado no recibe foco de teclado. */}
        <Button type="button" disabled={guardando} onClick={enviar}>
          {guardando ? "Guardando…" : "Guardar regla"}
        </Button>
      </div>
    </section>
  );
}
