import { useId, useState } from "react";
import type { ReactNode } from "react";
import type { AbilityKey, DerivedValue, TraceStep } from "@dnd/shared";
import { NOMBRE_CARACTERISTICA, NOMBRE_OPERACION_TRAZA, traducirLabelKey } from "./vocabulario";
import { formulaDeUnaLinea } from "./formula";
import { conSigno } from "../../dominio/numeros";
import { CAJA_DE_HOJA, ROTULO_DE_CASILLA } from "./Tarjeta";
import { Casilla } from "./Casilla";

// **Ninguna clase de opacidad de Tailwind compila en este proyecto** (P1 de docs/06-pendientes.md):
// los colores se declaran como `var(--x)` sin `<alpha-value>`, así que Tailwind descarta la
// utilidad ENTERA y el elemento se queda con el `border-color` del preflight — `#e5e7eb` en
// los dos temas. Lo que había aquí, por tanto, no era un borde tenue: era un borde gris claro
// equivocado. Se pone el token entero, que es theme-aware, o se quita la clase cuando lo que
// pedía era un relleno translúcido que ningún token puede dar todavía.

// Tarea 2A.10 — la traza es la funcionalidad, no un adorno (docs/superpowers/specs/
// 2026-09-02-hoja-5e-design.md, §3). Cada valor calculado se pinta ya resuelto, con un
// desplegable que enseña de dónde sale cada punto: «CA 18 = 14 cota de malla + 2 escudo +
// 2 Destreza».

/**
 * El chevron del desplegable, **dibujado**. Era `▾`/`▸`, glifos de fuente: prohibidos por
 * `docs/04-convenciones.md` salvo los cinco declarados de `ui/Badge.tsx`. Un glifo se pinta a
 * todo color en unos sistemas y como un cuadrado vacío en otros.
 */
function Chevron({ abierta }: { abierta: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`h-3 w-3 shrink-0 transition-transform ${abierta ? "rotate-90" : ""}`}
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

function signoDe(paso: TraceStep): string {
  if (paso.op === "base") return "";
  return paso.amount >= 0 ? "+" : "−";
}

/**
 * **Tarea H5 — la traza deja de ser solo explicación y pasa a ser la navegación de la edición.**
 *
 * Devuelve el rótulo del campo editable que *causa* este paso, o `null` si el paso no sale de
 * nada que se pueda tocar en esta pantalla (una armadura, por ejemplo: el inventario llega en la
 * fase 2B). Ese rótulo es el nombre accesible del control en `IdentidadEditable.tsx`, y **sale
 * del mismo diccionario que lo escribió allí** (`vocabulario.ts`) — no se copia el texto a mano,
 * porque entonces habría dos fuentes para el mismo nombre y una de las dos acabaría mintiendo.
 *
 * **Esto NO convierte el valor derivado en editable.** El total sigue sin subrayado de edición:
 * la afordancia es información de dominio, y su ausencia significa «esto lo calculo yo». Lo que
 * H5 añade es un camino hacia la causa, con la afordancia de un enlace, no la de un campo.
 */
function causaEditableDe(paso: TraceStep): string | null {
  const caracteristica = /^(?:ability\.([a-z]+)\.base|abilityMod\.([a-z]+))$/.exec(paso.labelKey);
  const clave = caracteristica?.[1] ?? caracteristica?.[2];
  if (clave && clave in NOMBRE_CARACTERISTICA) return NOMBRE_CARACTERISTICA[clave as AbilityKey];

  // El bonificador de competencia no se teclea: sale del nivel, que sí. Llevar el foco al propio
  // bonificador sería llevarlo a otro número derivado, y la traza dejaría de explicar nada.
  if (paso.labelKey === "proficiencyBonus") return "Nivel";

  // La subraza queda fuera a propósito: su selector solo existe cuando la raza tiene subrazas, y
  // un enlace que a veces no lleva a ninguna parte es peor que no tenerlo.
  if (/^race\./.test(paso.labelKey)) return "Raza";
  if (/^class\./.test(paso.labelKey)) return "Clase";

  return null;
}

/**
 * Lleva el foco al control cuyo nombre accesible es `etiqueta`.
 *
 * Se busca por `aria-label` porque es lo que hace que el control **se llame así** para un lector
 * de pantalla: si alguien lo renombra, el enlace deja de encontrarlo y la prueba se pone roja, en
 * vez de quedarse apuntando a un `id` que ya no significa nada.
 */
function enfocarCausa(etiqueta: string) {
  const destino = document.querySelector<HTMLElement>(`[aria-label="${etiqueta}"]`);
  if (!destino) return;
  // `scrollIntoView` no existe en jsdom; la llamada opcional deja que la prueba de componente
  // compruebe el foco sin fingir una maquetación que jsdom no tiene.
  destino.scrollIntoView?.({ block: "center" });
  destino.focus();
}

/**
 * Ticket J7 (2026-09-11) — el texto de un paso `override`. **«fijada a N»**, con el motivo del
 * DM tras un guion largo cuando lo hay: eso es lo que anula de verdad significa, y es más claro
 * que el nombre genérico de `traducirLabelKey` («Anulación del DM»), que no dice a qué se fijó.
 *
 * `total` es la suma corriente hasta este paso INCLUIDO. El motor guarda el DELTA en `amount`
 * (`m.amount - corriendo`, `engine.ts`) precisamente para que la traza siga sumando, así que el
 * total corriente que `ListaDeTraza` ya lleva **es** el valor fijado — no hay que leerlo de
 * ningún otro sitio ni recalcularlo aquí.
 */
function textoDeAnulacion(total: number, reason?: string): string {
  return reason ? `fijada a ${total} — ${reason}` : `fijada a ${total}`;
}

/**
 * Ronda 1 de revisión (2026-09-11), hallazgo 2 — «fijada a N» es SOLO la anulación manual del
 * DM, no cualquier paso `op === "override"`. El motor emite `override` desde otros tres sitios
 * que no son una anulación de nadie: el suelo de 1 PG por nivel (`engine.ts`, `maxHp.minimum`),
 * un efecto `set` de un objeto (`items.ts`) y una condición que deja la velocidad en 0
 * (`effective-speed.ts`, `speed.condition.zero`) — más la inmunidad de daño
 * (`apply-damage-modifiers.ts`, `damage.modifier.immune`). Todos ellos tienen su propia frase en
 * `vocabulario.ts` y tienen que seguir saliendo tal cual; solo la anulación del DM cambia de
 * frase por «fijada a N».
 *
 * **`labelKey === "override.manual"` y no `sourceType === "manual"`**: `effective-speed.ts`
 * también marca sus pasos como `"manual"`, así que el `sourceType` no basta para distinguir una
 * anulación real de una condición que apaga la velocidad. `"override.manual"` es exactamente la
 * clave que escribe `modificadoresDeAnulacion` (`character-sheet.service.ts`) y ninguna otra
 * fuente la usa.
 */
function esAnulacionDelDm(paso: TraceStep): boolean {
  return paso.op === "override" && paso.labelKey === "override.manual";
}

function PasoDeTraza({ paso, total }: { paso: TraceStep; total: number }) {
  const { texto, conocida } = traducirLabelKey(paso.labelKey);
  const causa = causaEditableDe(paso);
  const esAnulacion = esAnulacionDelDm(paso);
  const clase = ["font-chrome text-chrome-xs", conocida ? "text-muted" : "text-danger-text"].join(
    " ",
  );
  const contenido = (
    <>
      <span aria-hidden="true" className="mr-1 text-[0.85em] uppercase tracking-wide">
        {NOMBRE_OPERACION_TRAZA[paso.op]}
      </span>
      <span>{esAnulacion ? textoDeAnulacion(total, paso.reason) : texto}</span>
    </>
  );

  return (
    // Desbordes, ronda 2 (2026-09-13): `items-baseline` alineaba la columna numérica con la
    // PRIMERA línea del rótulo cuando éste envuelve (el `min-w-0` de abajo), y en una casilla
    // estrecha esa primera línea es exactamente donde cae la cifra — «BASE Bonific2dor de
    // competencia», la cifra pintada ENCIMA de la letra en vez de al lado. `items-start` fija a
    // los dos arriba del todo en su lugar; la cifra ya no comparte renglón con ninguna línea del
    // rótulo mientras éste se reserve su propio ancho (`flex-1 min-w-0`, más abajo) y la cifra el
    // suyo (`shrink-0`, sin encoger nunca).
    <li className="flex items-start gap-s2 py-0.5">
      {causa ? (
        <button
          type="button"
          data-causa={causa}
          data-untranslated={conocida ? undefined : "true"}
          // El nombre accesible es el texto del paso: nada de `aria-label="Ir a Destreza"`, que
          // dejaría al lector de pantalla anunciando la acción en lugar del contenido — el mismo
          // fallo que ya se pagó una vez en `TextoEditable`.
          title={`Ir a ${causa}, que es de donde sale este paso`}
          onClick={() => enfocarCausa(causa)}
          // Desbordes (2026-09-13, E-DB-10): `flex-1 min-w-0` — sin `min-w-0`, este hijo de un
          // `flex` no encoge por debajo de su propio ancho de contenido (el mínimo por defecto
          // de un ítem flexible es `auto`, no `0`). `flex-1` le da el ancho que le sobra a la
          // cifra (`shrink-0` de abajo). **`break-normal`, no `break-words`** (ronda 3): partir
          // la palabra a mitad («Bonific/icador») cupo en 6rem pero no es "envolver", es
          // tipografía rota — ahora es la CASILLA la que crece cuando la traza está abierta
          // (`Casilla.tsx`, hasta `max-w-[14rem]`), así que el rótulo tiene sitio de sobra para
          // partir solo por espacios; si algún día un rótulo no cupiera ni así, se vería una
          // única palabra larga saliéndose en vez de partida — preferible, y no ha ocurrido con
          // ningún texto real de este dominio.
          className={`${clase} min-w-0 flex-1 break-normal text-left underline decoration-dotted underline-offset-2 hover:text-accent-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent`}
        >
          {contenido}
        </button>
      ) : (
        <span
          className={`${clase} min-w-0 flex-1 break-normal`}
          data-untranslated={conocida ? undefined : "true"}
        >
          {contenido}
        </span>
      )}
      <span className="shrink-0 font-data text-chrome-xs text-text">
        {/* La columna numérica sí se queda en «= N» para CUALQUIER `override`, DM o no: la
            revisión (hallazgo 2) confirma que esa mitad del cambio ya era correcta — un paso
            `override` sustituye el total, así que "=" describe mejor lo que pasó que "+"/"−". */}
        {paso.op === "override" ? (
          `= ${total}`
        ) : (
          <>
            {signoDe(paso)}
            {Math.abs(paso.amount)}
          </>
        )}
      </span>
    </li>
  );
}

/**
 * La lista de pasos de una traza, sola. **Exportada desde el carril B3** para que el cuadro de
 * ataques (`AtaquesYLanzamiento.tsx`) despliegue el bono de un arma con la misma traza —incluido
 * el enlace de `causaEditableDe` a la característica que lo alimenta— sin reimplementar
 * `PasoDeTraza` en otro fichero: dos copias de esta lista es como una de las dos acaba mintiendo.
 *
 * **El total corriente se calcula aquí**, sumando `amount` paso a paso, y se le pasa a
 * `PasoDeTraza` (ticket J7): es la lista quien tiene el índice, y es exactamente la suma que el
 * motor prometió que cuadraría con el valor fijado de una anulación.
 */
export function ListaDeTraza({ id, steps }: { id: string; steps: TraceStep[] }) {
  // `reduce` en vez de una variable reasignada en el cuerpo del `map`: el linter de reglas de
  // hooks prohíbe mutar una variable capturada durante el render (`react-hooks/immutability`),
  // aunque aquí no hubiera ningún hook de por medio — es la misma regla que evita un estado
  // que cambia entre renders sin que React se entere.
  const totales = steps.reduce<number[]>((acc, paso) => {
    const anterior = acc.length > 0 ? acc[acc.length - 1] : 0;
    acc.push(anterior + paso.amount);
    return acc;
  }, []);
  return (
    <ul id={id} className="mt-s2 border-t border-muted pt-s2 text-left">
      {steps.map((paso, i) => (
        <PasoDeTraza key={i} paso={paso} total={totales[i]} />
      ))}
    </ul>
  );
}

export interface ValorDerivadoProps {
  /** El rótulo en español que ve la mesa: «CA», «Salvación de Destreza». */
  etiqueta: string;
  valor: DerivedValue;
  /** Botón de acción extra (el dado de la tirada) pegado a la derecha de la cifra. */
  accion?: ReactNode;
  /**
   * Qué forma toma el valor.
   *
   *  · `"linea"` es **la fila de una salvación o de una habilidad**, y es el cambio grande de la
   *    adopción de la maqueta: nombre a la izquierda, bonificador a la derecha, el dado detrás, y
   *    **nada más**. Lo que ocupaba tres renglones por fila —fórmula, tres radios de ventaja con
   *    su frase, y un botón «Tirar»— por cada una de las veinticuatro filas ocupa ahora uno. La
   *    fórmula no se pierde: la cifra es el botón que despliega la traza, y la traza se abre con
   *    su fórmula de una línea delante.
   *  · `"compacta"` es una casilla de la **tira de la cabecera**: rótulo diminuto, cifra, y sin la
   *    fórmula de una línea.
   *  · `"tarjeta"` es la **Clase de Armadura**: rótulo a la izquierda, cifra grande a la derecha,
   *    y debajo la fórmula con su chevron.
   *  · `"casilla"` es la casilla cuadrada con el rótulo arriba (velocidad, sentidos).
   */
  variante?: "casilla" | "linea" | "compacta" | "tarjeta";
  /**
   * El nombre completo cuando el visible va abreviado («Inic.» → «Iniciativa»).
   *
   * Solo lo usa la variante compacta, y **no se pinta**: va en un `sr-only` y en el `title`. Un
   * lector de pantalla no puede adivinar que «Comp.» es el bonificador de competencia, y abreviar
   * en pantalla sin decir el nombre entero en alguna parte es cambiar densidad por accesibilidad
   * — que no es un cambio que este proyecto acepte.
   */
  etiquetaLarga?: string;
  /**
   * La tercera línea de la casilla compacta: la unidad de una cifra que no cabe en su rótulo
   * («pies» junto a «Vel.», en vez de metida en «Vel. (pies)», que partía línea a 4,75rem — el
   * ancho que se abandonó por eso, no el que trae este arreglo). **Solo la reenvía la variante
   * `"compacta"`**; las demás la ignoran porque no pasan por `Casilla`.
   */
  nota?: ReactNode;
  /**
   * Task 5 (2026-09-19) — este valor es un MODIFICADOR, no una cifra absoluta como la CA o la
   * velocidad: se pinta con `conSigno` en vez del `valor.total` desnudo. Solo lo mira la variante
   * `"compacta"`; las demás (`"linea"` incluida) ya llevan su propio signo a mano.
   */
  signo?: boolean;
}

/**
 * Un valor derivado con su traza desplegable. **Ninguna clave de enumeración llega a pantalla**:
 * `traducirLabelKey` decide el texto, nunca se imprime `paso.labelKey` a secas fuera de ella.
 */
export function ValorDerivado({
  etiqueta,
  etiquetaLarga,
  valor,
  accion,
  variante = "casilla",
  nota,
  signo = false,
}: ValorDerivadoProps) {
  const [abierta, setAbierta] = useState(false);
  const listId = useId();
  const claseProsa = "font-chrome text-chrome-xs text-muted";

  const listaDeTraza = <ListaDeTraza id={listId} steps={valor.steps} />;

  // --- La fila de una salvación o de una habilidad: UNA línea ---
  if (variante === "linea") {
    return (
      <div data-fila="valor" className="min-w-0">
        <div className="flex items-center justify-between gap-s2">
          <span className="min-w-0 flex-1 truncate font-chrome text-chrome-sm text-muted">
            {etiqueta}
          </span>
          {/* La cifra **es** el botón que abre la traza. Antes ese trabajo lo hacía un chevron con
              el nombre repetido al lado; el número es más grande, está donde mira el ojo y deja la
              fila en un solo renglón. Su nombre accesible dice las dos cosas —cuánto vale y qué
              pasa al pulsarlo—, porque «+5» a secas no es el nombre de nada. */}
          <button
            type="button"
            onClick={() => setAbierta((v) => !v)}
            aria-expanded={abierta}
            aria-controls={listId}
            aria-label={`${etiqueta}: ${valor.total >= 0 ? "+" : ""}${valor.total}. Ver de dónde sale`}
            className="shrink-0 font-data text-chrome-sm text-text hover:text-accent-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {valor.total >= 0 ? "+" : ""}
            {valor.total}
          </button>
          {accion}
        </div>
        {abierta && (
          <div className="mb-s2 mt-1 border-l border-muted pl-s3">
            <p className={claseProsa}>{formulaDeUnaLinea(valor)}</p>
            <ListaDeTraza id={listId} steps={valor.steps} />
          </div>
        )}
      </div>
    );
  }

  // --- La tira compacta de la cabecera ---
  if (variante === "compacta") {
    return (
      <Casilla
        rotulo={etiqueta}
        rotuloLargo={etiquetaLarga}
        nota={nota}
        desplegable={abierta ? listaDeTraza : undefined}
      >
        <button
          type="button"
          onClick={() => setAbierta((v) => !v)}
          aria-expanded={abierta}
          aria-controls={listId}
          className="w-full hover:text-accent-text"
        >
          {signo ? conSigno(valor.total) : valor.total}
        </button>
      </Casilla>
    );
  }

  // --- La tarjeta con la fórmula en línea: la Clase de Armadura de la maqueta ---
  if (variante === "tarjeta") {
    return (
      <div>
        <div className="flex items-baseline justify-between gap-s3">
          <p className={ROTULO_DE_CASILLA}>{etiqueta}</p>
          <span className="font-data text-chrome-2xl leading-none text-text">{valor.total}</span>
        </div>
        <button
          type="button"
          onClick={() => setAbierta((v) => !v)}
          aria-expanded={abierta}
          aria-controls={listId}
          className={`mt-1 flex w-full items-center gap-s2 text-left ${claseProsa} hover:text-accent-text`}
        >
          <Chevron abierta={abierta} />
          <span className="min-w-0 flex-1">{formulaDeUnaLinea(valor)}</span>
        </button>
        {abierta && listaDeTraza}
      </div>
    );
  }

  return (
    <div className={`${CAJA_DE_HOJA} text-center`}>
      <p className={ROTULO_DE_CASILLA}>{etiqueta}</p>
      <button
        type="button"
        onClick={() => setAbierta((v) => !v)}
        aria-expanded={abierta}
        aria-controls={listId}
        className="mt-1 w-full font-data text-chrome-xl leading-none text-text hover:text-accent-text"
      >
        {valor.total}
      </button>
      <p className={`mt-0.5 ${claseProsa}`}>{formulaDeUnaLinea(valor)}</p>
      {accion}
      {abierta && listaDeTraza}
    </div>
  );
}
