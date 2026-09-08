import type { CombatantSide } from "@dnd/shared";
import type { Character } from "../../characters/api";
import { descriptorDePersonaje } from "../../characters/descriptor";
import { vozDePersonaje } from "../../../dominio/voces";
import { AyudarA } from "./AyudarA";
import {
  useCharacterSheet,
  useChangeHp,
  useConditions,
  useGameClock,
} from "../../character-sheet/hooks";
import { nombreCondicion } from "../../character-sheet/vocabulario";
import { describirRestante } from "../../character-sheet/duraciones";
import { IconoEscudo } from "../../../ui/Iconos";
import { Button } from "../../../ui/Button";
import { MandosDeCombatiente } from "./MandosDeCombatiente";
import { CorregirBando } from "./CorregirBando";

/**
 * Un personaje en la mesa: retrato, quién lo lleva, puntos de golpe, condiciones y —solo para el
 * DM— sus mandos.
 *
 * **Cada ficha pide su hoja y sus condiciones por separado**, y eso es a propósito: son los dos
 * endpoints que ya existen, los dos filtran por `canView` en el servidor, y un personaje que un
 * jugador no puede ver ni siquiera llega a esta lista. Una consulta por personaje en una mesa de
 * cinco es barata; inventar un endpoint agregado sería tocar la API para ahorrar cuatro peticiones.
 *
 * **Los mandos son del DM y de nadie más** (maqueta: `FichaDeElenco.tsx:120-143`, prop
 * `conMandos`). El comentario que vivía aquí decía que «el DM abre las fichas ajenas desde el
 * elenco» y **no había ningún `onClick`**: era una promesa escrita en un comentario. Ahora el
 * ojo abre de verdad la hoja del personaje, en el mismo cajón lateral que usa el rail.
 *
 * **Sobre el retrato de otro jugador no van botones**, y la razón la dio el autor: *«en BG3 es un
 * jugador manejando varios; acá somos varios manejando uno propio»*. El personaje de otro no es
 * tuyo, así que su retrato es información, no un mando. El DM sí los tiene porque él sí maneja a
 * muchos. Esconderlos **no es control de acceso** —el servidor exige dueño o DM igual, y por eso
 * la regla se cumple aunque alguien fabrique la petición—: es no prometer lo que va a dar 403.
 *
 * **El bando se corrige aquí, junto a «Daño» y «Condición»** (tarea 10, 2026-09-05 — «un aliado
 * te traiciona en el segundo asalto»). El prototipo (`prototipo/src/features/FichaDeElenco.tsx`)
 * ya resolvía el bando en la ficha del elenco al EMPEZAR el combate —el `esEnemigo` de su
 * `variante` pinta el borde y el icono de garra una sola vez, sin mando para cambiarlo—, así que
 * no hay una segunda pantalla de la que copiar el gesto de CORREGIRLO; esto es la puerta que
 * faltaba, hermana de «Corregir» en la tira de iniciativa. Se aparta del prototipo en el color:
 * `border-danger/40` y `IconGarra` no pasan la regla vinculante del reseño (el bando se distingue
 * por palabra, y como mucho `--warning` para el enemigo) — así que la garra no se dibuja aquí y
 * el filete de la tarjeta no cambia con el bando.
 *
 * **Ojo: el bando no es «dueño o DM» como el resto** (I-menor, ronda de arreglo 1 sobre la tarea
 * 9b) — `EncountersController`/`setSide` exigen **DM y nada más**: un jugador no corrige el bando
 * ni siquiera del personaje que lleva él mismo, porque el bando es una decisión de mesa, no del
 * personaje. `conMandos` ya es «esDm» en el único sitio que lo enciende (`ColumnaElenco.tsx`), así
 * que en la práctica coincide, pero la puerta real es más estrecha que la del resto de esta ficha.
 *
 * **No son radios con su frase**, a diferencia de los de `EmpezarCombate.tsx`: allí se explica
 * una decisión que se toma una vez y con calma; aquí es una corrección rápida en la fila más
 * estrecha de la ficha, junto a dos botones más. Sigue siendo «elegir entre los tres bandos, y
 * visibles» —nada se esconde en un desplegable—, pero es el gesto «marcar como», y por eso el
 * bando actual tiene que verse: su botón queda desactivado y lo dice en su propio rótulo, no en
 * un color aparte.
 */
export function FichaDeElenco({
  campaignId,
  personaje,
  dueno,
  puedeCambiarPg,
  destacado = false,
  conMandos = false,
  turnoActual = false,
  enCombate = false,
  bando,
  sessionId,
  encounterId,
  combatanteId,
}: {
  campaignId: string;
  personaje: Character;
  dueno?: string;
  /** Los ±5 del jugador sobre SU personaje. El DM no los lleva: tiene el cajón de «Daño». */
  puedeCambiarPg: boolean;
  /** El tuyo, en la disposición del jugador: filete de acento y algo más de aire. */
  destacado?: boolean;
  /** La disposición del DM: «Daño», «Condición» y el ojo. */
  conMandos?: boolean;
  /** Hay encuentro y le toca a este personaje. */
  turnoActual?: boolean;
  /** Hay encuentro activo: la duración de una condición se puede contar en asaltos. */
  enCombate?: boolean;
  /**
   * El bando de este personaje EN EL ENCUENTRO en marcha (`Combatant.side`), no una propiedad
   * suya. `undefined` cuando no hay encuentro o este personaje no combate: entonces no hay nada
   * que corregir y el mando no se pinta.
   */
  bando?: CombatantSide;
  /** La sesión del encuentro — la ruta de `setSide` cuelga de ella, igual que la de iniciativa. */
  sessionId?: string;
  /** El encuentro en marcha. */
  encounterId?: string;
  /** El `Combatant.id` de este personaje en ese encuentro — no `personaje.id`. */
  combatanteId?: string;
}) {
  const { data: hoja } = useCharacterSheet(campaignId, personaje.id);
  const { data: condiciones } = useConditions(campaignId, personaje.id);
  const cambiarPg = useChangeHp(campaignId, personaje.id);

  const actual = hoja?.hp.current ?? null;
  // **Un personaje jugador a 0 PG no desaparece de la mesa: se queda tirando** (ficha P2,
  // 2026-09-07). SRD 5.1, «Falling Unconscious»: cae inconsciente y empieza a hacer salvaciones
  // contra muerte — al revés que un monstruo, que en «Monsters and Death» *«most DMs have die the
  // instant it drops to 0»*. La asimetría es del manual, no una preferencia de esta casa.
  //
  // Hasta hoy sus salvaciones solo se leían **abriendo su hoja**, que es justo lo que nadie hace
  // mientras se juega. Se enseñan **solo mientras está cayendo**: con las casillas a cero y en
  // pie serían información muerta ocupando la tarjeta.
  const salvaciones = hoja?.deathSaves?.status === "dying" ? hoja.deathSaves : null;
  const maximo = hoja?.hp.max ?? null;
  const ca = hoja?.sheet?.derived.ac?.total ?? null;
  const descriptor = descriptorDePersonaje(personaje);

  return (
    <li
      className={[
        // **Dos desviaciones declaradas de la maqueta, y son la misma decisión.** La maqueta
        // pone la tarjeta en `bg-surface` sobre el fondo de la página; aquí el elenco vive
        // DENTRO de `PanelDeMesa`, que ya es `bg-surface`, así que una tarjeta de ese color se
        // fundiría con su panel y dejaría de ser una tarjeta. Se invierte el par —tarjeta en
        // `bg-bg` dentro de un panel claro— y por lo mismo el filete se queda opaco en vez de
        // los `border-accent/60` y `border-muted/20` de la maqueta, que sobre este fondo
        // apenas se ven. **Está preguntado al autor**; el radio sí es el de la maqueta.
        "relative rounded-radius-md bg-bg",
        destacado ? "border border-accent p-s3" : "border border-muted p-s2",
        // El anillo del turno. **No es el único portador**: el rótulo «Su turno» de arriba dice
        // lo mismo con palabras, igual que la tira de iniciativa lleva su «Le toca».
        turnoActual ? "ring-2 ring-warning" : "",
      ].join(" ")}
    >
      {turnoActual && (
        <span className="absolute -top-2 left-s3 rounded-radius-sm bg-warning px-1.5 py-px font-chrome text-chrome-xs font-semibold text-bg">
          Su turno
        </span>
      )}
      <div className="flex items-center gap-s2">
        <Retrato personaje={personaje} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-title text-chrome-md leading-tight text-text">
            {personaje.name}
          </p>
          <p className="truncate font-data text-chrome-xs text-muted">
            {[descriptor, `Nivel ${personaje.level}`].filter(Boolean).join(" · ")}
          </p>
          {dueno && (
            <p className="truncate font-chrome text-chrome-xs text-muted">Lo lleva {dueno}</p>
          )}
        </div>
        {ca !== null && (
          <span className="flex shrink-0 items-center gap-1 font-data text-chrome-xs text-muted">
            <IconoEscudo className="h-3.5 w-3.5" />
            <span className="sr-only">Clase de armadura </span>
            {ca}
          </span>
        )}
      </div>

      <BarraDePuntosDeGolpe nombre={personaje.name} actual={actual} maximo={maximo} />

      {salvaciones && (
        <p
          aria-label="Salvaciones contra muerte"
          className="mt-s1 font-chrome text-chrome-xs text-muted"
        >
          <span className="uppercase tracking-wide">Salvaciones</span>{" "}
          {/* Con palabras además del número: «1 / 2» sin decir cuál es cuál obliga a recordar el
              orden, y esto se lee de reojo en mitad de un combate. */}
          <strong className="text-success-text">{salvaciones.successes} logradas</strong>
          {" · "}
          <strong className="text-danger-text">{salvaciones.failures} fallidas</strong>
        </p>
      )}

      {puedeCambiarPg && maximo !== null && (
        // Dos golpes, no un formulario. La corrección exacta se hace en la hoja, con su control
        // de concurrencia; aquí solo está el gesto que se repite treinta veces por sesión.
        //
        // **El DM no lleva esto**: lleva el cajón de «Daño», que admite el crítico y **el tipo
        // de daño**, y que enseña la traza del servidor. Los ±5 se quedan donde la maqueta no pone
        // mandos —el personaje propio de un jugador—, porque quitarlos sería dejarle sin la
        // única forma de anotar un golpe sin abrir la hoja entera.
        <div className="mt-s2 flex items-center gap-s2">
          {[-5, 5].map((delta) => (
            <Button
              key={delta}
              type="button"
              variant="ghost"
              className="px-2 py-0.5 font-data text-chrome-xs"
              disabled={cambiarPg.isPending}
              onClick={() => cambiarPg.mutate({ delta })}
              aria-label={`${delta < 0 ? "Quitar" : "Dar"} ${Math.abs(delta)} puntos de golpe a ${personaje.name}`}
            >
              {delta < 0 ? `−${Math.abs(delta)}` : `+${delta}`}
            </Button>
          ))}
          {cambiarPg.isError && (
            <span role="alert" className="font-chrome text-chrome-xs text-danger-text">
              {(cambiarPg.error as Error).message}
            </span>
          )}
        </div>
      )}

      {/* **Ayudar va en TU tarjeta, no en la del otro** (plan 08, I8): la regla de la mesa es que
          sobre el personaje de otro jugador no van mandos, y ayudar es una acción tuya — a quién
          ayudas es su parámetro. Misma condición que los ±5: esto es «lo controlo yo». */}
      {puedeCambiarPg && <AyudarA campaignId={campaignId} personaje={personaje} />}

      <Condiciones campaignId={campaignId} condiciones={condiciones ?? []} />

      {conMandos && (
        <MandosDeCombatiente
          campaignId={campaignId}
          characterId={personaje.id}
          nombre={personaje.name}
          enCombate={enCombate}
          // `conMandos` YA es «esDm» en el único sitio que lo enciende (`ColumnaElenco.tsx`, ver
          // el comentario de arriba sobre el mando de bando) — así que es el mismo valor, no uno
          // inventado para esta llamada.
          soyDm={conMandos}
        />
      )}

      {/* **Corregir el bando, solo con el combate en marcha.** Sin encuentro no hay de qué
          bando hablar —el bando vive en el `Combatant`, no en el personaje— y por eso, además
          de `conMandos`, hace falta `bando`/`sessionId`/`encounterId`/`combatanteId`: los cuatro
          juntos son «este personaje combate ahora mismo», lo mismo que ya exige `PonerCondicion`
          con su `enCombate` para contar asaltos. */}
      {conMandos && enCombate && bando && sessionId && encounterId && combatanteId && (
        <CorregirBando
          campaignId={campaignId}
          sessionId={sessionId}
          encounterId={encounterId}
          combatanteId={combatanteId}
          bando={bando}
          nombre={personaje.name}
        />
      )}
    </li>
  );
}

/**
 * Las condiciones del retrato, **con lo que les queda**.
 *
 * La maqueta pinta «envenenado · 2 asaltos» en el propio retrato, y ese dato existe: el servidor
 * manda `expiresAtClock` en segundos de SU reloj y marca `expired` él mismo. **Aquí no se calcula
 * nada con un temporizador local** —lo prohíbe la trampa 4 de la auditoría, y con la mesa en
 * cinco navegadores sería mentira en cuatro—: se resta contra el reloj de campaña que el servidor
 * devuelve, exactamente como hace `character-sheet/Condiciones.tsx`.
 *
 * **Una condición vencida se marca, no desaparece.** El servidor la deja en la lista a propósito
 * (decisión D-2C-2) para que nadie vea cambiar sus números sin saber por qué.
 *
 * **Exportada** (tarea 9b, 2026-09-06): `FichaDePnj.tsx` la reutiliza para los PNJ en combate —
 * no lee nada de `Character`, solo `campaignId` y la lista de condiciones, así que sirve igual
 * para un personaje que para un PNJ, que es la misma fila por debajo.
 */
export function Condiciones({
  campaignId,
  condiciones,
}: {
  campaignId: string;
  condiciones: {
    id: string;
    key: string;
    level: number | null;
    expiresAtClock?: number | null;
    expired?: boolean;
  }[];
}) {
  // El reloj solo se pide si hay algo que contar: una condición viva con caducidad.
  const hayCuentaAtras = condiciones.some((c) => c.expiresAtClock != null && c.expired !== true);
  const { data: reloj } = useGameClock(campaignId, { enabled: hayCuentaAtras });

  return (
    <ul className="mt-s2 flex flex-wrap gap-1.5 empty:mt-0">
      {
        // Sin condiciones **no se pinta nada**, como la maqueta: un chip que dice «Sin
        // condiciones» en cinco retratos es ruido en la única columna que se mira de reojo.
        condiciones.map((c) => {
          const vencida = c.expired === true;
          const restante =
            !vencida && c.expiresAtClock != null && reloj ? c.expiresAtClock - reloj.seconds : null;
          return (
            <li
              key={c.id}
              className={[
                "rounded-radius-sm border px-1.5 py-0.5 font-chrome text-chrome-xs",
                vencida ? "border-muted text-muted" : "border-warning text-warning-text",
              ].join(" ")}
            >
              <span className={vencida ? "line-through" : undefined}>
                {nombreCondicion(c.key)}
                {c.level !== null && ` ${c.level}`}
              </span>
              {vencida ? (
                <span className="ml-1">· vencida</span>
              ) : (
                restante != null && (
                  <span className="ml-1 text-muted">· {describirRestante(restante)}</span>
                )
              )}
            </li>
          );
        })
      }
    </ul>
  );
}

/**
 * El retrato.
 *
 * Todavía no hay imágenes en el modelo, así que la inicial hace de retrato — igual que en la
 * maqueta. **La inicial es texto, no un icono**: la regla que prohíbe los glifos prohíbe usarlos
 * *como dibujo*, y aquí la letra ES el dato. `aria-hidden` porque el nombre entero está al lado.
 *
 * **La forma es la de la maqueta** —cuadrado de esquina blanda, no un círculo—. El COLOR ya no es
 * cobre para todos: desde el plan 05 el personaje tiene el suyo (`Character.color`), y cuando no ha
 * elegido, la huella determinista de su `id`. **Lo decide `vozDePersonaje`, la misma función que
 * pinta su voz en el hilo** — un solo sitio decide el color de alguien, y hay una prueba de que el
 * retrato y la voz del mismo personaje coinciden.
 *
 * Hasta hoy esto decía «no hay ese dato en el modelo» y usaba el cobre de la identidad. Ya lo hay.
 */
export function Retrato({
  personaje,
}: {
  personaje: { id: string; name: string; color?: string | null };
}) {
  const voz = vozDePersonaje(personaje);
  return (
    <span
      aria-hidden="true"
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-radius-sm border border-current bg-surface font-title text-chrome-md ${voz}`}
    >
      {personaje.name.trim().charAt(0).toUpperCase()}
    </span>
  );
}

/**
 * Los puntos de golpe, con su barra.
 *
 * **El color no es el único portador**: la cifra «42/58» dice lo mismo que la barra, y el ancho
 * lo dice una tercera vez. Los tres tramos son los de la maqueta —hasta un cuarto de la vida en
 * rojo, hasta poco más de la mitad en ámbar, el resto en el acento—, porque en la mesa eso es lo
 * que se mira de reojo; quien no distinga los tonos lee la fracción igual.
 *
 * El ancho va en estilo en línea porque es un valor **calculado**, no una decisión de diseño: no
 * hay clase de Tailwind para «el 72,4 % de la vida que le queda a este personaje».
 */
export function BarraDePuntosDeGolpe({
  nombre,
  actual,
  maximo,
}: {
  nombre: string;
  actual: number | null;
  maximo: number | null;
}) {
  if (actual === null || maximo === null || maximo <= 0) {
    return (
      <p className="mt-s2 font-chrome text-chrome-xs text-muted">Sin puntos de golpe en la hoja.</p>
    );
  }
  const proporcion = Math.max(0, Math.min(1, actual / maximo));
  // Los tramos de la maqueta (`prototipo/src/features/FichaDeElenco.tsx`, `BarraVida`): 25 % y
  // 55 %. Un personaje a 0 entra en el primero por definición.
  const tono = proporcion <= 0.25 ? "bg-danger" : proporcion <= 0.55 ? "bg-warning" : "bg-accent";

  // La forma de la maqueta: la barra y la fracción **en la misma línea**, no un rótulo «PG»
  // encima. La cifra es lo que hace que el color no sea el único portador, y va pegada a la
  // barra para que se lean de un vistazo como una sola cosa.
  return (
    <div className="mt-s2 flex items-center gap-s2">
      <div
        role="img"
        aria-label={`${nombre}: ${actual} de ${maximo} puntos de golpe`}
        // `rounded-full` y sin borde, como la maqueta. El canal va en `bg-surface` y no en el
        // `bg-bg` de la maqueta por lo mismo que la tarjeta: aquí el fondo de la tarjeta ya es
        // `bg-bg`, y un canal de su mismo color no se vería.
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface"
      >
        <div className={`h-full ${tono}`} style={{ width: `${(proporcion * 100).toFixed(1)}%` }} />
      </div>
      <span className="shrink-0 font-data text-chrome-xs tabular-nums text-text">
        {actual}/{maximo}
      </span>
    </div>
  );
}
