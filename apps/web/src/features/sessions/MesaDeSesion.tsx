import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useCurrentSession, useGameLog, useSessions } from "./hooks";
import { DialogoDeInicio } from "./ControlesDeSesion";
import { BandaUnica, guardarModoDeLaMesa, leerModoDeLaMesa, type ModoDeLaMesa } from "./BandaUnica";
import { RailDePaneles, type PanelAbierto } from "./RailDePaneles";
import { ColumnaElenco } from "./elenco/ColumnaElenco";
import { EfectosDePantalla } from "./elenco/efectos/EfectosDePantalla";
import { useClaseDePantalla } from "./elenco/efectos/pantalla.store";
import { ColumnaDelRegistro } from "./registro/ColumnaDelRegistro";
import { MarcoDelTablero } from "./tablero/MarcoDelTablero";
import { HerramientasDeNarracion } from "./dm/HerramientasDeNarracion";
import { ConsultaDelMundo } from "./dm/ConsultaDelMundo";
import { TallerDelDM } from "./taller/TallerDelDM";
import { PanelDeDadosDeLaMesa } from "../rolls/panel/PanelDeDadosDeLaMesa";
import { CapaDeCombate } from "../encounters/CapaDeCombate";
import { HojaCalculada } from "../character-sheet/HojaCalculada";
import { PaginaDeInventario } from "../inventory/PaginaDeInventario";
import { Dialog } from "../../ui/Dialog";
import { useMyRole } from "../campaigns/members";
import { useCampaign } from "../campaigns/hooks";
import { useCharacters } from "../characters/hooks";
import { useNpcs } from "../bestiario/hooks";
import type { Character } from "../characters/api";
import { TiradasPendientes } from "../roll-requests/TiradasPendientes";
import { useAuthStore } from "../../store/auth.store";
import { Button } from "../../ui/Button";
import { BarraDeAcciones } from "../actions/BarraDeAcciones";

// **La mesa. Un compositor, y nada más.**
//
// Hasta la Ola 0 (2026-09-04) este fichero medía **992 líneas** y traía dentro el elenco, la ficha
// de cada personaje, la barra de puntos de golpe, el registro, el compositor de notas y la
// consulta del mundo. Eso lo convertía en el cuello de botella de cualquier trabajo sobre la
// mesa: seis carriles distintos tenían que tocar el mismo archivo.
//
// Ahora solo **coloca ranuras**. Cada pieza vive en su carpeta —`elenco/`, `hilo/`, `dm/`,
// `taller/`— y este fichero decide dónde va cada una y con qué medidas.
//
// ## Las cuatro reglas de armazón que sostienen todo lo demás
//
//  1. **La mesa ocupa la ventana.** `flex h-screen flex-col overflow-hidden` en la raíz, y el
//     `AppShell` fuera: la mesa no lleva migas de pan, ni subtítulo, ni pie legal. Se está en ella
//     durante horas; una cabecera de artículo encima de un juego es lo que el autor describió como
//     *«una fábrica de recursos más que un juego»*.
//  2. **Scroll por panel, nunca de página.** Cada columna trae su `overflow-y-auto` con
//     `.scroll-quiet`.
//  3. **`min-h-0` en TODOS los ancestros de un panel que scrollee.** Sin él un hijo de flex/grid
//     se niega a encoger por debajo de su contenido, el `overflow-y-auto` **no se activa jamás** y
//     la página vuelve a crecer. Es literalmente el defecto que la auditoría del 2026-09-04
//     encontró: cinco paneles con scroll interno escrito y ninguno funcionando.
//  4. **Los superpuestos son cajones laterales, uno a la vez.** `ui/Dialog` los da; Escape cierra
//     y el foco vuelve al control que lo abrió.
//
// ## Las disposiciones, con sus anchos literales
//
// **Task 5 (3A.3) — las tres columnas del prototipo, y por qué ya no hay una tabla fija de tres
// filas.** Hasta esta tarea el ancho dependía solo del rol (jugador/DM); ahora depende TAMBIÉN de
// si el centro enseña el tablero o el registro, así que la tabla de antes —correcta cuando el
// centro era siempre el mismo— se queda corta. Las reglas completas:
//
// ```
// taller                          grid min-h-0 flex-1 gap-s3 grid-cols-[1.15fr_1fr]      (DM en reposo)
// jugador, «Sin tablero»          grid min-h-0 flex-1 gap-s3 grid-cols-[17rem_minmax(0,1fr)]
// jugador, «Con tablero»          grid min-h-0 flex-1 gap-s3 grid-cols-[17rem_minmax(0,1fr)_18rem]
// DM (cualquier modo)             grid min-h-0 flex-1 gap-s3 grid-cols-[17rem_minmax(0,1fr)_18rem]
// ```
//
// Y qué va en cada columna, que es la parte que de verdad decide esta tarea:
//
//  - **Centro** = el marco del tablero (con su cabecera y la barra de acciones debajo) si el modo
//    es «Con tablero» **y** la campaña tiene `boardRoomUrl`; si no, el registro (con sus filtros)
//    y la barra debajo — «Sin tablero», o sin sala guardada, es la misma rama.
//  - **Lateral** (18rem, solo si hay algo que poner) = el registro **cuando el centro es el
//    marco** —para que no desaparezca al mirar el mapa— más las herramientas del DM si lo es.
//    **Ruling**: un jugador con tablero SÍ conserva su columna de registro; el prototipo «pierde
//    la lateral» solo en «Sin tablero», donde el registro ya vive en el centro y no hay nada más
//    que ofrecerle a un jugador sin herramientas de DM.
//
// **El rol lo dice el servidor.** No hay conmutador «ver como DM/jugador» que cambie lo pintado:
// `useMyRole` pregunta, y `canView` filtra lo que llega. Y ojo con `isError` de `useMyRole`, que
// significa «todavía no lo sé», nunca «no tienes permiso».

export function MesaDeSesion({ campaignId }: { campaignId: string }) {
  const { data: sesion, isLoading } = useCurrentSession(campaignId);
  const { data: campana } = useCampaign(campaignId);
  const { role } = useMyRole(campaignId);
  const esDm = role === "DM";
  const claseDePantalla = useClaseDePantalla();
  // «Ver como»: el DM elige por los ojos de quién mira. El servidor sigue filtrando por canView.
  const [comoUsuario, setComoUsuario] = useState<string>("");
  // Task 3 (3A.3) — el modo del centro de la mesa: con tablero o sin él. Se lee de `localStorage`
  // UNA vez al montar (inicializador perezoso: no hay nada asíncrono que sincronizar) y se
  // reescribe cada vez que cambia.
  const [modoDeLaMesa, setModoDeLaMesa] = useState<ModoDeLaMesa>(() =>
    leerModoDeLaMesa(campaignId),
  );
  function cambiarModoDeLaMesa(siguiente: ModoDeLaMesa) {
    setModoDeLaMesa(siguiente);
    guardarModoDeLaMesa(campaignId, siguiente);
  }

  // Task 5 (3A.3) — **qué pinta el centro, y qué hay en la lateral.** `conTablero` es el modo
  // guardado, PERO solo cuenta si de verdad hay una sala: sin `boardRoomUrl`, `BandaUnica` ni
  // siquiera ofrece el conmutador (`hayTablero`, más abajo), así que el modo puede seguir diciendo
  // «tablero» de una campaña anterior y aquí no hay que hacerle caso. `conLateral` es quien decide
  // si existe la tercera columna: la del DM siempre la tiene (registro o herramientas, o las dos),
  // la de un jugador solo cuando el marco le quitó el centro al registro.
  const conTablero = Boolean(campana?.boardRoomUrl) && modoDeLaMesa === "tablero";
  const conLateral = esDm || conTablero;

  const { data: log } = useGameLog(campaignId, {
    sessionId: sesion?.id,
    as: esDm && comoUsuario ? comoUsuario : undefined,
  });
  const { data: personajes } = useCharacters(campaignId);
  // **Los PNJ también combaten**, y `useCharacters` no los trae: esa lista es «quién se sienta a
  // la mesa». Sin esta, el orden de turnos llamaba «Alguien» a un PNJ, el diálogo de combate no
  // lo ofrecía siquiera, y el elenco no tenía manera de dañarlo ni ponerle una condición (tarea
  // 9b, 2026-09-06) — tres pantallas comparten esta única consulta, ninguna pide la suya.
  const { data: pnjs } = useNpcs(campaignId);
  const miId = useAuthStore((st) => st.user?.id);
  // **Uno a la vez**: el estrato superpuesto del reseño. Abrir la bolsa cierra la hoja.
  const [panel, setPanel] = useState<PanelAbierto | null>(null);
  // **Y los dados aparte, que es lo que hace verdad el `z-30` frente al `z-40`.** Si compartieran
  // estado con los cajones, abrir la hoja cerraría los dados y las dos capas nunca coincidirían
  // en pantalla — con lo cual la maqueta no tendría por qué haberlas separado. Se tira mirando la
  // hoja; Escape sobre un cajón no se lleva el panel de dados.
  const [dadosPuestos, setDadosPuestos] = useState(false);

  const eventos = log?.events ?? [];
  const presentes = nombresPresentes(sesion?.attendance ?? null, personajes ?? []);
  // El personaje sobre el que abren «Hoja» y «Bolsa». **El tuyo**, no el que esté seleccionado:
  // el rail es del jugador.
  const miPersonaje = (personajes ?? []).find((c) => c.ownerId === miId);

  // **El taller es el sitio del DM cuando la mesa está en reposo**, y ocupa la mesa entera. Un DM
  // sin sesión abierta no está mirando un elenco: está preparando.
  // **Los aceleradores, que llevaban desde B1.3 impresos y sin cablear.**
  //
  // El rail escribe `N`, `I` y `M` debajo de cada rótulo desde que existe, y la §5 de la auditoría
  // del 2026-09-04 los declara — pero **no había un solo manejador de teclado en toda la
  // aplicación** para ellos: `grep` de `keydown` devolvía el Escape de `ui/Dialog`, las flechas de
  // `ui/Tabs` y tres manejadores locales. La pantalla prometía un atajo que no existía, que es la
  // regla vinculante de `docs/04-convenciones.md` al revés: si el texto promete algo que el código
  // no cumple, miente el texto.
  //
  // **Siempre ADEMÁS del rail, nunca en su lugar** (§5): quien no sepa que existen llega igual
  // pulsando. Y `D` es de los dados, que no es un cajón: alterna, no abre.
  //
  // Tres guardas, y dos no están en la maqueta:
  //
  //  1. **Se ignoran mientras se escribe.** La maqueta mira `INPUT` y `TEXTAREA`; aquí hace falta
  //     además `isContentEditable` como guarda defensiva: el editor del mundo de hoy
  //     (`EscribirFicha.tsx`) es un `<textarea>` y ya cubre ese caso, pero si algún día llega un
  //     editor enriquecido su cuerpo no será ninguno de los dos elementos y esta guarda evita que
  //     escribir «nombre» en él abra la hoja tres veces.
  //  2. **Con un modificador pulsado, no.** `Ctrl+N` abre una ventana del navegador y `Cmd+I` es
  //     del sistema; robarlos sería peor que no tener atajo.
  //  3. **No hacen lo que el botón se niega a hacer.** Sin personaje en la mesa, «Hoja» y «Bolsa»
  //     están deshabilitados con su motivo, así que sus teclas tampoco abren nada. Un atajo que
  //     esquiva la condición del botón es una segunda regla que acabaría discrepando.
  //
  // **Task 5 (3A.3) añade `/`, para enfocar la caja de anotar del registro** —el mismo gesto que
  // Slack, GitHub o el propio prototipo del autor usan para «ir a escribir»—. Con las mismas dos
  // primeras guardas de arriba (nada de modificador, nada mientras ya se escribe), pero SIN la
  // tercera: a diferencia de «Hoja»/«Bolsa», anotar no depende de tener personaje propio —el DM
  // sin ficha también sella notas—, así que no hay condición de botón que replicar. Se busca el
  // campo por su `aria-label` («Qué anotar», el mismo nombre accesible en `HiloDeSesion.tsx`) en
  // vez de guardar una referencia: el registro vive en sitios distintos de la rejilla según el
  // modo (centro o lateral), y perseguir esa condición con un `ref` habría acoplado el atajo a
  // CUÁL de las dos ramas está montada. Si no hay registro montado (el DM en su taller, sin
  // sesión), `campo` es `null` y no pasa nada — ni error, ni atajo a medias.
  const tienePersonaje = Boolean(miPersonaje);
  useEffect(() => {
    function alPulsar(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const donde = e.target as HTMLElement | null;
      if (
        donde &&
        (donde.tagName === "INPUT" || donde.tagName === "TEXTAREA" || donde.isContentEditable)
      ) {
        return;
      }
      const tecla = e.key.toLowerCase();
      if (tecla === "n" && tienePersonaje) setPanel("hoja");
      else if (tecla === "i" && tienePersonaje) setPanel("bolsa");
      else if (tecla === "m") setPanel("mundo");
      else if (tecla === "d") setDadosPuestos((puestos) => !puestos);
      else if (e.key === "/") {
        const campo = document.querySelector<HTMLTextAreaElement>('[aria-label="Qué anotar"]');
        if (campo) {
          e.preventDefault();
          campo.focus();
        }
      }
    }
    document.addEventListener("keydown", alPulsar);
    return () => document.removeEventListener("keydown", alPulsar);
  }, [tienePersonaje]);

  const enTaller = esDm && !sesion;

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg text-text">
        <p className="font-chrome text-chrome-sm text-muted">Buscando la sesión…</p>
      </div>
    );
  }

  return (
    // **Efectos de mesa** (2026-09-15): la clase sacude o apaga la raíz entera cuando le pegan a
    // MI personaje (`elenco/efectos/pantalla.store.ts`); el destello va encima de todo. Solo lo
    // recibe el jugador afectado — al DM no le dispara nada.
    <div className={`flex h-screen flex-col overflow-hidden bg-bg text-text ${claseDePantalla}`}>
      <EfectosDePantalla />
      <BandaUnica
        campaignId={campaignId}
        nombreDeCampana={campana?.name}
        sesion={sesion ?? null}
        esDm={esDm}
        comoUsuario={comoUsuario}
        onComoUsuario={setComoUsuario}
        presentes={presentes}
        hayTablero={Boolean(campana?.boardRoomUrl)}
        modo={modoDeLaMesa}
        onModo={cambiarModoDeLaMesa}
      />

      {/* **La capa de combate** (2.5.6). No es una pantalla a la que se navega: es una tira que
          aparece encima del elenco mientras dura el encuentro y se va cuando termina. Solo
          existe con sesión en curso — un encuentro cuelga de la sesión, no de la campaña.
          **D-CF-149 (Task 5b de 3A.3): va FUERA del contenedor con relleno**, pegada a la banda y
          a lo ancho, que es donde el prototipo pone su franja (`.franja`: entre `header.banda`
          y `main.rejilla`, con su filete inferior y sin caja). */}
      {sesion && (
        <div className="shrink-0">
          <CapaDeCombate
            campaignId={campaignId}
            sessionId={sesion.id}
            personajes={personajes ?? []}
            pnjs={pnjs ?? []}
            esDm={esDm}
          />
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col gap-s3 p-s3">
        {/* **PROVISIONAL, y a propósito.** «Te han pedido tirar» solo se montaba dentro de la
            pestaña «Dados»: sondeaba cada quince segundos impecablemente y no lo miraba nadie.
            El carril de dados lo va a colocar como capa contextual y entonces esta línea sobra.
            No pinta nada cuando no hay peticiones pendientes, así que no ocupa sitio en balde. */}
        <div className="shrink-0 empty:hidden">
          <TiradasPendientes campaignId={campaignId} />
        </div>

        {enTaller ? (
          <TallerDelDM campaignId={campaignId} />
        ) : (
          <main
            className={[
              "grid min-h-0 flex-1 gap-s3",
              // Task 5 (3A.3) — hay lateral (18rem) siempre que sea el DM, o cuando el centro
              // enseña el marco (el registro se muda ahí para no perderse). Sin ninguna de las
              // dos cosas —un jugador en «Sin tablero»— el registro ya está en el centro y no
              // queda nada que poner en una tercera columna: ver el comentario de cabecera del
              // fichero para el porqué completo de cada rama.
              conLateral
                ? "grid-cols-[17rem_minmax(0,1fr)_18rem]"
                : "grid-cols-[17rem_minmax(0,1fr)]",
            ].join(" ")}
          >
            {/* **El rail vive al pie de la columna del elenco, y no en una fila propia.**
                La maqueta lo pone en una fila a lo ancho, debajo de la rejilla — pero esa fila
                lleva además `BarraDeAcciones`, **que en esta aplicación no existe** (la auditoría
                del 2026-09-04 la marca ALTA: «ni el fichero»). Sin ella la fila es hueco muerto a
                lo ancho de la pantalla, y el hilo se corta por encima de ella.
                `grid-rows-[1fr_auto]`: el elenco ocupa lo que hay y el rail se apoya abajo, así
                que el hilo y las herramientas llegan al borde inferior. **Cuando exista
                `BarraDeAcciones`, esto hay que volver a mirarlo**: con contenido, la fila de la
                maqueta deja de ser hueco y vuelve a tener sentido. */}
            <div className="grid min-h-0 grid-rows-[1fr_auto] gap-s3">
              <ColumnaElenco
                campaignId={campaignId}
                asistencia={sesion?.attendance ?? null}
                esDm={esDm}
                pnjs={pnjs ?? []}
              />
              <RailDePaneles
                onAbrir={setPanel}
                onAlternarDados={() => setDadosPuestos((puestos) => !puestos)}
                dadosPuestos={dadosPuestos}
                tienePersonaje={Boolean(miPersonaje)}
              />
            </div>

            {/* **El centro: el marco del tablero, o el registro — nunca los dos.** Hasta la Task 5
                el registro vivía siempre en esta columna, con o sin tablero (plegado en un cajón
                inferior si había sala). El prototipo lo cambia: con el modo «Con tablero» puesto
                y `boardRoomUrl` guardada, el centro es el mapa —con su cabecera de escena— y el
                registro se muda a la columna lateral (o desaparece, para un jugador sin tablero
                que ya no lo tiene ahí porque lo tiene aquí mismo). Sin eso, el centro sigue siendo
                el registro de siempre, con sus filtros. `campana?.boardRoomUrl` se repite en la
                condición (y no solo `conTablero`) para que TypeScript estreche el tipo dentro de
                la rama: sin esto, `campana.boardRoomUrl` seguiría siendo `string | null` para
                `MarcoDelTablero`, que exige `string`. */}
            {/* **La barra de acciones sigue debajo del centro** (Task 4, T22), en su propia fila
                `auto` de esta misma columna — eso no cambia con esta tarea, solo cambia qué hay
                en la fila de arriba. */}
            <div className="grid min-h-0 min-w-0 grid-rows-[minmax(0,1fr)_auto] gap-s3">
              {conTablero && campana?.boardRoomUrl ? (
                <MarcoDelTablero campaignId={campaignId} url={campana.boardRoomUrl} />
              ) : (
                <ColumnaDelRegistro
                  campaignId={campaignId}
                  eventos={eventos}
                  esDm={esDm}
                  comoUsuario={comoUsuario}
                  pnjs={pnjs ?? []}
                  amplio
                />
              )}
              {miPersonaje && (
                <div className="shrink-0">
                  <BarraDeAcciones
                    campaignId={campaignId}
                    characterId={miPersonaje.id}
                    nombre={miPersonaje.name}
                  />
                </div>
              )}
            </div>

            {/* **La lateral: el registro (si el centro se lo llevó el marco) y las herramientas
                del DM, cada una en su propio contenedor.** Dos `grid-rows` en vez de un `<aside>`
                único que las envuelva a las dos: las herramientas llevan SU PROPIO `<aside
                aria-label="Herramientas del DM">` —así lo pide `mesa-en-estrecho.spec.ts`—, y
                envolverlo en un segundo `aside` exterior anidaría dos regiones con el mismo papel
                por nada. El registro no necesita una envoltura propia: `HiloDeSesion` ya es un
                `<section aria-label="Registro de la sesión">` por dentro de `ColumnaDelRegistro`.
                Auto-colocación de la rejilla: con las dos presentes, el registro (primero en el
                DOM) cae en la fila `1fr` y las herramientas en la `auto` que se ajusta a su
                contenido; con una sola, esa única pieza hereda la fila `1fr` y ocupa el hueco
                entero — es lo mismo que ya hacía el centro de esta rejilla con el marco/registro. */}
            {conLateral && (
              <div className="grid min-h-0 min-w-0 grid-rows-[minmax(0,1fr)_auto] gap-s3">
                {conTablero && (
                  <ColumnaDelRegistro
                    campaignId={campaignId}
                    eventos={eventos}
                    esDm={esDm}
                    comoUsuario={comoUsuario}
                    pnjs={pnjs ?? []}
                  />
                )}
                {esDm && (
                  <aside
                    aria-label="Herramientas del DM"
                    className="scroll-quiet flex min-h-0 min-w-0 flex-col overflow-y-auto rounded-radius-sm border border-muted bg-surface p-s3"
                  >
                    <HerramientasDeNarracion
                      campaignId={campaignId}
                      onConsultarElMundo={() => setPanel("mundo")}
                    />
                  </aside>
                )}
              </div>
            )}
          </main>
        )}

        {/* La fila de abajo: el rail permanente, y a su derecha lo que toque según el estado.
            No scrollea y no crece. */}
        {/* En reposo, el gesto de empezar. **Solo aparece cuando hay algo que decir**: con la
            sesión en curso esta fila no se pinta, y por eso el hilo llega al borde. El DM en
            reposo está en su taller, que ocupa la mesa entera, así que su botón sí necesita una
            fila propia debajo — igual que en la maqueta. */}
        {/* **El rail es permanente y no se quita nunca** (§4 del reseño: los paneles tienen tecla
            porque se quitan; el rail no la tiene porque no se quita). En la mesa vive al pie de la
            columna del elenco; en el taller no hay columna, así que aquí recupera su fila —que es
            además donde la maqueta la pone para el DM en reposo, junto al botón de empezar. */}
        {enTaller && (
          <div className="flex shrink-0 items-stretch gap-s3">
            <RailDePaneles
              onAbrir={setPanel}
              onAlternarDados={() => setDadosPuestos((puestos) => !puestos)}
              dadosPuestos={dadosPuestos}
              tienePersonaje={Boolean(miPersonaje)}
            />
            <div className="min-w-0 flex-1">
              <EmpezarDesdeLaMesa campaignId={campaignId} />
            </div>
          </div>
        )}

        {!sesion && !enTaller && (
          <div className="shrink-0">
            {esDm ? (
              <EmpezarDesdeLaMesa campaignId={campaignId} />
            ) : (
              <p className="flex items-center rounded-radius-sm border border-muted bg-surface px-s4 py-s3 font-chrome text-chrome-sm text-muted">
                La mesa está en reposo. Cuando el DM empiece la sesión, esta pantalla se llena sola.
              </p>
            )}
          </div>
        )}
      </div>

      <PanelesSuperpuestos
        campaignId={campaignId}
        abierto={panel}
        onCerrar={() => setPanel(null)}
        personajeId={miPersonaje?.id}
        esDm={esDm}
      />

      {/* **El panel de dados va FUERA del `<main>`, y no es un detalle de orden.**
          Es `fixed inset-x-0 bottom-0 z-30`: se ancla a la ventana, así que dentro de la rejilla
          no aportaría nada y sí heredaría sus medidas. Y su `z-30` está por debajo del `z-40` de
          los cajones **a propósito** (maqueta, §5 de la auditoría): el panel de dados **convive**
          con el estrato superpuesto en vez de taparlo — y por eso **su estado no es el de los
          cajones**: compartirlo lo cerraría al abrir la hoja, que es justo lo que esos dos
          números existen para evitar.

          Estuvo construido y sin montar desde el carril de los dados: `grep` de su nombre
          devolvía solo su declaración, así que el defecto ALTA de la auditoría —*«no hay dados en
          la mesa»*— seguía abierto con el panel ya escrito. */}
      {dadosPuestos && (
        <PanelDeDadosDeLaMesa
          campaignId={campaignId}
          sessionId={sesion?.id}
          characterId={miPersonaje?.id}
          onCerrar={() => setDadosPuestos(false)}
        />
      )}
    </div>
  );
}

/**
 * **Se empieza la sesión desde la mesa, y no desde otra pantalla.**
 *
 * La mesa en reposo ya enseña lo que hay —la escena donde quedó, el taller, el registro—; lo que
 * le faltaba era el gesto. El cartel mandaba a «Sesiones», que es **el taller**: para empezar a
 * jugar había que salir del sitio donde se juega, y ese es exactamente el defecto de arquitectura
 * que el reseño llama *«fuera de sesión, el sitio donde se juega no es alcanzable»*.
 *
 * **El diálogo es el mismo**, no una copia: `DialogoDeInicio` es el que ya usa la lista del
 * taller, con su declaración de asistencia. Un segundo formulario de inicio querría decir dos
 * reglas de asistencia y una de las dos acabaría desactualizada.
 */
function EmpezarDesdeLaMesa({ campaignId }: { campaignId: string }) {
  const { data: sesiones } = useSessions(campaignId);
  const [empezando, setEmpezando] = useState(false);

  // La más antigua sin empezar. El listado viene de la API por fecha descendente, así que la
  // siguiente por jugar es la última de las planificadas.
  const planificadas = (sesiones ?? []).filter((x) => x.status === "PLANNED");
  const siguiente = planificadas[planificadas.length - 1];

  return (
    <div className="flex h-full flex-wrap items-center gap-s3 rounded-radius-sm border border-copper bg-surface px-s4 py-s2">
      <p className="min-w-0 flex-1 font-chrome text-chrome-sm text-muted">
        {siguiente ? (
          <>
            La mesa está en reposo. La siguiente es{" "}
            <span className="text-text">«{siguiente.title}»</span>.
          </>
        ) : (
          "La mesa está en reposo y no hay ninguna sesión planificada."
        )}
      </p>
      {siguiente ? (
        <Button type="button" variant="primary" onClick={() => setEmpezando(true)}>
          Empezar la sesión
        </Button>
      ) : (
        <Link
          to={`/campaigns/${campaignId}?seccion=sessions`}
          className="inline-flex items-center rounded-radius-sm border border-copper px-s4 py-s2 font-chrome text-chrome-sm text-copper-text transition-colors hover:border-accent hover:text-accent-text"
        >
          Planificar una en el taller
        </Link>
      )}
      {empezando && siguiente && (
        <DialogoDeInicio
          campaignId={campaignId}
          session={siguiente}
          onClose={() => setEmpezando(false)}
        />
      )}
    </div>
  );
}

/**
 * **El estrato superpuesto**: se abre encima, Escape cierra, y vuelves exactamente donde estabas.
 *
 * `ui/Dialog` ya trae el chasis —cajón lateral, `role="dialog"`, foco atrapado, y el foco devuelto
 * al control que lo abrió—, así que aquí no se reinventa nada: solo se decide **qué** va dentro.
 *
 * Y lo que va dentro es **lo que ya existía**, montado tal cual: la hoja calculada y la página de
 * inventario son los mismos componentes que sirven sus pantallas propias. Ese es el trabajo de la
 * sustitución según el reseño —«la maqueta es presentación sin datos, así que el trabajo real es
 * enchufarla a la columna que se conserva»—, y no reescribir dos pantallas que funcionan.
 */
function PanelesSuperpuestos({
  campaignId,
  abierto,
  onCerrar,
  personajeId,
  esDm,
}: {
  campaignId: string;
  abierto: PanelAbierto | null;
  onCerrar: () => void;
  personajeId?: string;
  esDm: boolean;
}) {
  return (
    <>
      <Dialog
        open={abierto === "hoja" && Boolean(personajeId)}
        onClose={onCerrar}
        title="Tu hoja"
        size="xl"
      >
        {personajeId && (
          <HojaCalculada
            campaignId={campaignId}
            characterId={personajeId}
            puedeEditar
            disposicion="mesa"
            esDM={esDm}
          />
        )}
      </Dialog>

      <Dialog
        open={abierto === "bolsa" && Boolean(personajeId)}
        onClose={onCerrar}
        title="Tu bolsa"
        size="xl"
      >
        {personajeId && <PaginaDeInventario campaignId={campaignId} characterId={personajeId} />}
      </Dialog>

      <Dialog open={abierto === "mundo"} onClose={onCerrar} title="Consulta del mundo" size="lg">
        <ConsultaDelMundo campaignId={campaignId} esDm={esDm} />
      </Dialog>
    </>
  );
}

/**
 * Los nombres que se pintan en «En la escena».
 *
 * **Sale de la asistencia declarada, no de quién tenga la pestaña abierta**: aquí no hay socket
 * que lo sepa, y fingirlo sería peor que no decirlo. Un asistente sin personaje no aporta nombre a
 * la escena —la escena la pueblan los personajes— y por eso se filtra en vez de escribir «alguien».
 */
function nombresPresentes(
  asistencia: { userId: string; characterId?: string }[] | null,
  personajes: Character[],
): string[] {
  if (!asistencia) return [];
  const porId = new Map(personajes.map((p) => [p.id, p]));
  return asistencia
    .map((a) => (a.characterId ? porId.get(a.characterId)?.name : undefined))
    .filter((n): n is string => Boolean(n));
}
