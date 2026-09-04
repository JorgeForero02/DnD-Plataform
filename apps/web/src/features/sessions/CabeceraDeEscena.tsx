import { Link } from "react-router-dom";
import { useAllEntities } from "../entities/hooks";
import { useGameClock } from "../game-clock/hooks";
import { useGameLog } from "./hooks";
import { lugarDeLaEscena, momentoDeLaCampana } from "./escena";
import { IconoLugar, IconoLuna, IconoSol } from "./iconos";

// B1 — **el estrato permanente de la mesa: la cabecera de escena.**
//
// Tres cosas que conviene tener escritas antes de tocarla:
//
// 1. **Ocupa el sitio del tablero, y no desaparecerá cuando llegue.** El autor corrigió un error
//    de razonamiento mío: yo dije «no hay mapa, luego la mesa espera a la fase 3», y el fallo fue
//    tratar «no hay tablero» como «no hay escenario». Lo caro del rediseño es la carcasa; montada
//    la carcasa, el tablero cae luego **en un hueco que ya tiene la forma correcta**. Al revés no
//    se puede.
// 2. **No tiene botón de cerrar**, y eso es lo que la hace permanente. El argumento sale del mapa
//    de teclas de Baldur's Gate 3: diez paneles tienen tecla de alternar y los retratos y la barra
//    de acciones no tienen ninguna. Un panel tiene tecla **porque se quita**; los otros no la
//    tienen **porque nunca se quitan**.
// 3. **Todo lo que dice sale de datos que ya existían, y no hay endpoint nuevo** — por eso esta
//    pieza cabe entera dentro del carril gráfico. El reloj llevaba semanas sondeando cada treinta
//    segundos **para nadie**, escondido en la pestaña «Dados»; los presentes salen de la
//    asistencia declarada. Con el lugar hay una salvedad, y está escrita abajo del todo porque
//    corrige una premisa del reseño.
//
// **Lo que NO hace**, y es deliberado: no inventa un nombre de escena cuando no hay ninguno
// revelado. La maqueta pinta ahí una tarjeta con un dato bonito detrás del cual no hay nada, y
// `docs/04-convenciones.md` señala exactamente ese vicio al adoptarla.
//
// ## Y una premisa del reseño que resultó ser falsa, medida al construir esto
//
// El reseño da por hecho que la cabecera «cambia sola con los sucesos que ya emitimos», y para el
// reloj y los presentes es cierto. **Para el lugar no lo era**: el tipo `ENTITY_REVEALED` está
// declarado en `@dnd/shared` desde 2A y **el único sitio que lo escribe es el motor de reglas**
// (`apps/api/src/rules-engine/rules-engine.service.ts`, efecto `REVEAL_ENTITY`). Un DM que sube a
// mano la visibilidad de una ficha —que es como se revela un lugar el 99% de las veces— **no deja
// ningún suceso**.
//
// Así que el lugar es real cuando lo hay y **no es la línea principal de la cabecera**: manda el
// título de la sesión, que sí existe siempre. Cerrar el hueco es una línea en el servidor —emitir
// `ENTITY_REVEALED` cuando la visibilidad de una ficha sube— y es del otro carril: queda su ficha
// en `docs/06-pendientes.md`. El día que exista, esta cabecera se enciende sola y aquí no hay que
// tocar nada, que es exactamente por qué la derivación se escribió igualmente.

export function CabeceraDeEscena({
  campaignId,
  tituloDeSesion,
  presentes,
  enCurso,
}: {
  campaignId: string;
  tituloDeSesion: string | null;
  presentes: string[];
  enCurso: boolean;
}) {
  const { data: entidades } = useAllEntities(campaignId);
  const { data: reloj } = useGameClock(campaignId);
  // **El registro de la CAMPAÑA, no el de la sesión en curso**, y las dos razones son buenas:
  //
  //  1. **La escena sobrevive a la sesión.** En reposo la cabecera dice «donde lo dejasteis», y
  //     eso es por definición algo que pasó en una sesión anterior. Filtrando por la sesión
  //     abierta no habría nada que decir.
  //  2. **El suceso de revelar no lleva sesión.** `EntitiesService` lo escribe sin `sessionId`
  //     —revelar una ficha es un acto del mundo, no de una partida—, así que el registro
  //     filtrado por sesión **nunca lo contenía**. La cabecera se quedaba muda por un filtro,
  //     no por falta de datos, y lo cazó el recorrido que junta los dos carriles.
  //
  // No añade una petición: TanStack comparte la consulta por su clave, y esta es la misma que ya
  // pide la mesa en reposo.
  const { data: log } = useGameLog(campaignId);

  const lugar = lugarDeLaEscena(log?.events ?? [], entidades ?? []);
  const momento = momentoDeLaCampana(reloj?.seconds ?? 0);
  const Astro = momento.esNoche ? IconoLuna : IconoSol;

  return (
    // `<section>` y no `<header>`: un `<header>` anidado dentro del contenido tiene rol
    // `generic`, y un elemento generico **no admite nombre accesible**, asi que
    // `aria-label="La escena"` no lo nombraba para nadie — ni para un lector de pantalla ni para
    // la prueba que lo busca. Con `<section>` + nombre es una `region`, igual que la banda de
    // estado de al lado. Lo cazo el recorrido de navegador, no una revision.
    <section
      aria-label="La escena"
      // El tono cambia con la hora del mundo. Es el único adorno de la pieza y cumple la regla del
      // ornamento: informa —de un vistazo se sabe si es de noche— y no compite con el texto. Los
      // dos tonos salen de tokens, así que siguen al tema.
      className={[
        "relative overflow-hidden rounded-radius-md border border-copper px-s5 py-s4",
        momento.esNoche ? "bg-bg" : "bg-surface",
      ].join(" ")}
    >
      <div className="flex flex-wrap items-start justify-between gap-s4">
        <div className="min-w-0">
          <p className="mb-s1 flex items-center gap-s2 font-chrome text-chrome-xs uppercase tracking-widest text-copper-text">
            <IconoLugar className="h-4 w-4" />
            {enCurso ? "Escena actual" : "La mesa, en reposo"}
          </p>

          <p className="font-title text-chrome-xl text-text">
            {tituloDeSesion ?? "Sin sesión abierta"}
          </p>

          {/* El lugar solo aparece cuando de verdad lo hay. Un hueco permanente que dijera
              «sin lugar» en la línea más grande de la pantalla sería un recordatorio diario de
              algo que el jugador no puede arreglar. */}
          {lugar && (
            // Lleva a su ficha: estás EN un sitio del mundo, no leyendo su nombre.
            <Link
              to={`/campaigns/${campaignId}/entidades/${lugar.id}`}
              className="mt-s1 inline-block font-world text-world-lg text-copper-text underline-offset-4 hover:underline"
            >
              {lugar.nombre}
            </Link>
          )}
        </div>

        {/* El reloj de campaña, por fin en la pantalla donde se juega. La hora en grande y el día
            debajo: en la mesa se pregunta «¿qué hora es?» mucho más que «¿qué día es?». */}
        <div className="flex shrink-0 items-center gap-s3">
          <Astro className="h-5 w-5 text-copper-text" />
          <div className="text-right">
            <p className="font-data text-chrome-lg leading-none text-text">{momento.hora}</p>
            <p className="mt-s1 font-chrome text-chrome-xs text-muted">
              {momento.dia} · {momento.esNoche ? "de noche" : "de día"}
            </p>
          </div>
        </div>
      </div>

      {presentes.length > 0 && (
        <p className="mt-s3 flex flex-wrap items-center gap-x-s2 gap-y-s1 font-chrome text-chrome-xs text-muted">
          <span>En la escena:</span>
          {presentes.map((nombre) => (
            <span
              key={nombre}
              className="rounded-radius-sm border border-muted/40 px-s2 py-s1 text-text"
            >
              {nombre}
            </span>
          ))}
        </p>
      )}
    </section>
  );
}
