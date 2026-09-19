import { useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { EntityType } from "@dnd/shared";
import { useCampaign } from "./hooks";
import { nombrePapel, useMembers } from "./members";
import { useAllEntities } from "../entities/hooks";
import { useSessions } from "../sessions/hooks";
import type { Session } from "../sessions/api";
import { useCharacters } from "../characters/hooks";
import { descriptorDePersonaje } from "../characters/descriptor";
import { Panel } from "../../ui/Panel";
import { Badge } from "../../ui/Badge";
import { EmptyState } from "../../ui/Collection";
import { resumenDeCuerpo, ETIQUETA_DE_TIPO, ROTULO_PLURAL } from "../entities/resumen";
import { IconoDeTipo } from "../entities/iconos";
import { fechaLarga } from "../../dominio/fechas";

// **El resumen es un tablero, adoptado de la maqueta (2026-09-02).**
//
// Lo que había era una columna de bandas: tres cifras sueltas («Próxima sesión», «Personajes»,
// «Sesiones») y una lista de lo último. Contaba cosas, pero no contaba nada: abrías tu propia
// campaña y no sabías por dónde ibas. La maqueta lo resuelve poniendo arriba, de un vistazo,
// **qué pasó, quién está y a dónde vas**:
//
//   - una tarjeta grande con la **última sesión** y sus notas —lo que de verdad hay que
//     recordar el viernes siguiente—,
//   - una columna con **la próxima fecha** y **quién se sienta a la mesa**,
//   - y una rejilla de **accesos rápidos** a las siete secciones del mundo, con su cuenta.
//
// Lo que NO se copió: el recuadro «PENDIENTE · 2 · 1 subida de nivel · 1 secreto por revelar».
// Es una cifra bonita que no corresponde a ningún dato que esta aplicación tenga hoy, y una
// pantalla que inventa un número pendiente enseña a no fiarse del resto.
//
// Sobre contar: toda lista que se lee aquí llega ya filtrada por `canView`
// (apps/api/src/common/visibility.ts), así que contar las filas que te han dado no es contar
// lo que existe. El «8 lugares» de un jugador son ocho que él puede ver, que es la cifra
// honesta que enseñarle, y nada de esto rederiva la matriz de visibilidad para averiguarlo.

// Task 7 (2026-09-19) — `fechaLarga` se mudó a `dominio/fechas.ts`: este fichero tenía su propia
// copia local, sin año, mientras `SessionDetailPage.tsx` tenía la suya, con año — la misma fecha
// habría podido decir dos cosas distintas según la pantalla. La versión compartida sí lleva año
// (`día de la semana, día de mes de año`); esta pantalla no lo echaba en falta a propósito, solo
// porque nadie se lo había pedido.

// `Session.notes` es `Json?` en el esquema y `unknown` en el cliente (api.ts lo dice ahí
// mismo): esta pantalla solo escribe texto plano, pero nada garantiza que lo que vuelva lo
// sea. Una nota que no es una cadena simplemente no se pinta, en vez de acabar en la pantalla
// como el resultado de convertir un objeto a texto.
function notaLegible(notes: unknown, maxLength = 260): string {
  if (typeof notes !== "string") return "";
  const plano = notes.replace(/\s+/g, " ").trim();
  if (plano.length <= maxLength) return plano;
  const corte = plano.slice(0, maxLength);
  const ultimoEspacio = corte.lastIndexOf(" ");
  const cortado = ultimoEspacio > maxLength * 0.6 ? corte.slice(0, ultimoEspacio) : corte;
  return `${cortado.trimEnd()}…`;
}

const TIPOS_DEL_MUNDO: EntityType[] = [
  "NPC",
  "LOCATION",
  "QUEST",
  "FACTION",
  "OBJECT",
  "EVENT",
  "DOCUMENT",
];

// **Maqueta 2026-09-03: la tarjeta tiene cabecera.** El rótulo iba suelto dentro del mismo
// relleno que el contenido, así que «Quién está en la mesa» y el primer nombre de la lista
// parecían dos líneas de lo mismo. Una banda con su filete abajo separa el nombre de la
// tarjeta de lo que la tarjeta dice.
function TarjetaDelTablero({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    // **`aria-label` con el rótulo**: un `<section>` sin nombre accesible no es una región, es un
    // genérico — el rótulo se ve pero no se anuncia, así que quien navega por regiones se
    // encuentra tres cajas indistinguibles. Con nombre, «Quién juega» y «Quién está en la mesa»
    // se distinguen sin leerlas, que es justo lo que hace falta cuando son parecidas y dicen
    // cosas distintas: una son personas y la otra personajes.
    <section
      aria-label={rotulo}
      className="overflow-hidden rounded-radius-sm border border-muted bg-surface"
    >
      <header className="border-b border-muted px-s4 py-s2">
        <p className="font-chrome text-chrome-xs uppercase tracking-[0.14em] text-muted">
          {rotulo}
        </p>
      </header>
      <div className="px-s4 py-s3">{children}</div>
    </section>
  );
}

// El rótulo de una banda de la pantalla. Alineado a la izquierda, como en la maqueta: el
// filete ornamental centrado partía la página en dos mitades cada vez que aparecía, y con tres
// bandas seguidas la pantalla acababa siendo más filetes que contenido. El ornamento enmarca;
// aquí estaba compitiendo.
function RotuloDeBanda({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-s3 font-chrome text-chrome-xs uppercase tracking-[0.16em] text-muted">
      {children}
    </h3>
  );
}

export function CampaignOverview({ campaignId }: { campaignId: string }) {
  const { data: campaign } = useCampaign(campaignId);
  const { data: entidades } = useAllEntities(campaignId);
  const { data: sesiones } = useSessions(campaignId);
  const { data: personajes } = useCharacters(campaignId);
  const { data: miembros } = useMembers(campaignId);

  // Leído una vez, al montar, y no en cada render: «la próxima sesión» no puede moverse bajo
  // el lector porque algo ajeno haya vuelto a renderizar.
  const [ahora] = useState(() => Date.now());

  const conFecha = (sesiones ?? []).filter(
    (s): s is Session & { scheduledAt: string } => typeof s.scheduledAt === "string",
  );
  const proxima = conFecha
    .filter((s) => new Date(s.scheduledAt).getTime() >= ahora)
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0];
  // La última jugada: la más reciente de las que ya pasaron. Una sesión cerrada cuenta aunque
  // nunca tuviera fecha puesta, porque cerrarla ES haberla jugado.
  const ultimaConFecha = conFecha
    .filter((s) => new Date(s.scheduledAt).getTime() < ahora)
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())[0];
  const ultima =
    ultimaConFecha ?? [...(sesiones ?? [])].reverse().find((s) => s.status === "CLOSED");

  const recientes = [...(entidades ?? [])]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const porTipo = new Map<EntityType, number>();
  for (const e of entidades ?? []) porTipo.set(e.type, (porTipo.get(e.type) ?? 0) + 1);

  const descripcion = campaign?.description?.trim();
  const notaDeLaUltima = notaLegible(ultima?.notes);

  return (
    <div className="space-y-s5">
      {/* La frase que dice qué es esta pantalla, como en la maqueta. Las siete secciones del
          mundo la tienen desde `plantillas.ts`; el resumen no la tenía y era la única que
          empezaba directamente en tarjetas. */}
      <p className="max-w-[70ch] font-chrome text-chrome-sm text-muted">
        El tablero de la campaña: qué pasó, quién está y qué queda pendiente.
      </p>

      {descripcion && (
        <Panel tone="vellum">
          {/* La voz del mundo, sobre la superficie del mundo. La capitular marca dónde empieza
              el manual y dónde acaba el instrumento — el único sitio donde esta página cambia
              de registro. */}
          <p>
            <span
              aria-hidden="true"
              className="float-left mr-2 font-title text-[2.6rem] leading-[0.8] text-copper-text"
            >
              {descripcion.charAt(0)}
            </span>
            {descripcion.slice(1)}
          </p>
        </Panel>
      )}

      {/* El tablero: a la izquierda lo que pasó, a la derecha quién está y cuándo se vuelve. */}
      <div className="grid gap-s3 lg:grid-cols-3">
        {/* El cobre de la maqueta va en el CANTO IZQUIERDO, no rodeando la tarjeta entera. Un
            marco de cobre completo pesaba tanto como el contenido y convertía la tarjeta en un
            aviso; una pestaña de cobre en el borde dice «esto es lo importante» y deja el resto
            de la caja igual que las demás. */}
        <section className="overflow-hidden rounded-radius-sm border border-muted border-l-4 border-l-copper bg-surface lg:col-span-2">
          <header className="border-b border-muted px-s5 py-s2">
            <p className="font-chrome text-chrome-xs uppercase tracking-[0.14em] text-copper-text">
              La última sesión
            </p>
          </header>
          <div className="px-s5 py-s4">
            {ultima ? (
              <>
                {ultima.scheduledAt && (
                  <p className="font-data text-chrome-xs uppercase tracking-[0.14em] text-muted">
                    {fechaLarga(ultima.scheduledAt)}
                  </p>
                )}
                <h3 className="mt-s2 font-title text-chrome-xl text-text">{ultima.title}</h3>
                {notaDeLaUltima ? (
                  <p className="mt-s3 max-w-[62ch] font-world text-world-base leading-relaxed text-text">
                    {notaDeLaUltima}
                  </p>
                ) : (
                  <p className="mt-s3 max-w-[62ch] font-chrome text-chrome-sm text-muted">
                    Nadie escribió notas de esa sesión. Se escriben en su propia ficha, y son lo
                    único que el viernes siguiente recuerda por ti.
                  </p>
                )}
                {/* La salida de la tarjeta, como en la maqueta. Va por el mismo `?seccion=`
                    que el carril y los accesos rápidos, así que es enlazable y sobrevive a una
                    recarga. */}
                <Link
                  to={{ search: "?seccion=sessions" }}
                  className="mt-s4 inline-block font-chrome text-chrome-sm text-accent-text hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  Ver todas las sesiones
                </Link>
              </>
            ) : (
              <p className="max-w-[62ch] font-chrome text-chrome-sm text-muted">
                Todavía no habéis jugado ninguna. Cuando la primera quede atrás, sus notas
                aparecerán aquí.
              </p>
            )}
          </div>
        </section>

        <div className="space-y-s3">
          <TarjetaDelTablero rotulo="Próxima sesión">
            {proxima ? (
              <>
                <p className="font-title text-chrome-md text-text">{proxima.title}</p>
                <p className="mt-1 font-data text-chrome-xs text-copper-text">
                  {fechaLarga(proxima.scheduledAt)}
                </p>
              </>
            ) : (
              <p className="font-chrome text-chrome-sm text-muted">Ninguna en el calendario.</p>
            )}
          </TarjetaDelTablero>

          {/* **Quién JUEGA, que no es lo mismo que qué personajes hay** — y esta pantalla
              prometía «quién está» enseñando solo lo segundo. Un DM que acaba de crear la
              campaña ve tres personajes suyos y cero pistas de que no ha invitado a nadie.
              Es lo último que quedaba del reseño: la invitación **ya estaba construida, con su
              recorrido de dos navegadores; lo que le faltaba era su sitio**. Vivía en Ajustes,
              la última de seis secciones, y es de lo primero que se hace con una campaña nueva. */}
          <TarjetaDelTablero rotulo="Quién juega">
            {miembros && miembros.length > 0 ? (
              <ul className="space-y-1">
                {miembros.map((m) => (
                  <li key={m.userId} className="flex items-baseline gap-s2">
                    <span className="min-w-0 flex-1 truncate font-chrome text-chrome-sm text-text">
                      {m.displayName}
                    </span>
                    <span className="shrink-0 font-data text-chrome-xs text-copper-text">
                      {nombrePapel(m.role)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="font-chrome text-chrome-sm text-muted">Cargando…</p>
            )}
            {miembros && !miembros.some((m) => m.role !== "DM") && (
              <p className="mt-s2 font-chrome text-chrome-sm text-muted">
                Todavía no hay jugadores.{" "}
                <Link
                  to={{ search: "?seccion=settings" }}
                  className="text-accent-text hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  Invitar a un jugador
                </Link>
                .
              </p>
            )}
          </TarjetaDelTablero>

          <TarjetaDelTablero rotulo="Quién está en la mesa">
            {/* La maqueta pone aquí nombre y «Pícaro 5». Nosotros ya teníamos las dos cosas y
                no las enseñábamos: el resumen decía «Personajes: 3», que es el dato menos útil
                de los que había. `descriptorDePersonaje` traduce las claves del catálogo, así
                que aquí tampoco llega un valor de enumeración. */}
            {personajes && personajes.length > 0 ? (
              <ul className="space-y-1">
                {personajes.map((c) => (
                  <li key={c.id} className="flex items-baseline gap-s2">
                    <span className="min-w-0 flex-1 truncate font-chrome text-chrome-sm text-text">
                      {c.name}
                    </span>
                    <span className="shrink-0 font-data text-chrome-xs text-copper-text">
                      {[descriptorDePersonaje(c), `Nivel ${c.level}`].filter(Boolean).join(" · ")}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="font-chrome text-chrome-sm text-muted">
                Nadie ha creado su personaje todavía.
              </p>
            )}
          </TarjetaDelTablero>
        </div>
      </div>

      <section>
        <RotuloDeBanda>Accesos rápidos</RotuloDeBanda>
        {/* Cada baldosa lleva a su sección por el mismo `?seccion=` que usa la barra lateral,
            así que un acceso rápido es enlazable y sobrevive a una recarga igual que ella. La
            cifra es la misma que la de la barra: lo que TÚ puedes ver. */}
        <ul className="grid grid-cols-2 gap-s2 sm:grid-cols-4 lg:grid-cols-7">
          {TIPOS_DEL_MUNDO.map((tipo) => (
            <li key={tipo}>
              <Link
                // Solo la parte de consulta: `Tabs` y esta baldosa leen el MISMO `?seccion=`,
                // así que la ruta se queda donde está y solo cambia la sección abierta.
                to={{ search: `?seccion=${tipo}` }}
                className="flex h-full flex-col items-center gap-1 rounded-radius-sm border border-muted bg-surface px-s2 py-s3 text-center font-chrome text-chrome-xs text-text hover:border-accent hover:text-accent-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <span className="text-chrome-xl text-copper-text">
                  <IconoDeTipo type={tipo} />
                </span>
                <span>{ROTULO_PLURAL[tipo]}</span>
                <span className="font-data text-chrome-xs text-muted">
                  {porTipo.get(tipo) ?? 0}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <RotuloDeBanda>Lo último del mundo</RotuloDeBanda>
        {recientes.length === 0 ? (
          <EmptyState title="El mundo está en blanco">
            Todavía no hay nada escrito. Empieza por donde quieras: un lugar donde ocurra algo, o
            alguien a quien preguntar.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-muted overflow-hidden rounded-radius-sm border border-muted bg-surface">
            {recientes.map((e) => {
              const resumen = resumenDeCuerpo(e.body, 140);
              return (
                <li key={e.id} className="px-s3 py-s3">
                  <div className="flex flex-wrap items-baseline gap-x-s2 gap-y-1">
                    <span className="font-chrome text-chrome-xs uppercase tracking-[0.14em] text-copper-text">
                      {ETIQUETA_DE_TIPO[e.type]}
                    </span>
                    <span className="font-title text-chrome-md text-text">{e.name}</span>
                    <div className="flex-1" />
                    <Badge visibility={e.visibility} />
                  </div>
                  {resumen && (
                    <p className="mt-1 line-clamp-1 font-world text-chrome-base text-muted">
                      {resumen}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {porTipo.size > 0 && (
        <p className="max-w-[62ch] font-chrome text-chrome-xs text-muted">
          Los números de la izquierda y los de las baldosas cuentan lo que <em>tú</em> puedes ver.
          Lo que esté oculto para ti no aparece ahí, y tampoco se insinúa contándolo.
        </p>
      )}
    </div>
  );
}
