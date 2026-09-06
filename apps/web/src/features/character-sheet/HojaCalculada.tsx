import type { AbilityKey, SkillKey } from "@dnd/shared";
import { ABILITY_KEYS, SKILLS } from "@dnd/shared";
import { useCharacterSheet } from "./hooks";
import { ValorDerivado } from "./Traza";
import { TirarBoton } from "./TirarBoton";
import { Avisos } from "./Avisos";
import { EleccionesPendientes } from "./EleccionesPendientes";
import { PuntosDeGolpe } from "./PuntosDeGolpe";
import { ModificadoresTemporales } from "./ModificadoresTemporales";
import { RecursosYDescansos } from "./RecursosYDescansos";
import { Condiciones } from "./Condiciones";
import { VelocidadYSentidos } from "./VelocidadYSentidos";
import { Anulaciones } from "./Anulaciones";
import { AtaquesYLanzamiento } from "./AtaquesYLanzamiento";
import { PaginaDeInventario } from "../inventory/PaginaDeInventario";
import { DadosDeGolpe, PercepcionPasiva, SalvacionesDeMuerte } from "./TarjetasDeEstado";
import { CompetenciasConArmas, Personalidad, RasgosYAptitudes } from "./BloquesDelPie";
import { AvisoDeDm } from "./AvisoDeDm";
import { BotonSubirNivel } from "../level-up/BotonSubirNivel";
import { Caracteristicas, FichaEditable } from "./IdentidadEditable";
import { EmptyState } from "../../ui/Collection";
import { ABREVIATURA_CARACTERISTICA, NOMBRE_CARACTERISTICA, NOMBRE_HABILIDAD } from "./vocabulario";
import { ROTULO_DE_CASILLA, TarjetaDeHoja } from "./Tarjeta";

// Tarea 2A.10 — la pantalla de la hoja de personaje: lee `GET .../sheet` y enseña la traza de
// cada número derivado, los avisos, las elecciones pendientes, los PG con su delta, recursos y
// descansos, condiciones, velocidad efectiva y sentidos, y deja tirar 1d20+mod desde aquí.
//
// ============================================================================================
// 2026-09-03 — **la maqueta manda en la forma, y esta vez entera**
// ============================================================================================
//
// Hubo una tanda anterior que la «adoptó» tomando ideas sueltas y conservando nuestra
// disposición. El autor miró lo desplegado y dijo que prefería el prototipo. Así que ahora es al
// revés: **la maqueta decide la forma y lo nuestro se adapta a ella**, salvo donde choque con una
// regla vinculante o con lo que de verdad hace el servidor. Lo que ha cambiado, y por qué:
//
//  1. **Cada salvación y cada habilidad es UNA línea**: nombre, bonificador y un dado pequeño.
//     Era un bloque de tres renglones con tres radios de ventaja, la frase «Un solo d20.» y un
//     botón «Tirar» — repetido en las seis salvaciones y las dieciocho habilidades: **veinticuatro
//     bloques** y una pantalla interminable. La decisión de ventaja no se ha escondido: se ha
//     movido al panel que abre el dado, donde aparece **una vez y completa**, con sus tres frases
//     visibles a la vez. El razonamiento entero está en `features/rolls/PanelDeTirada.tsx`.
//  2. **Las secciones son tarjetas con cabecera**, en dos columnas, no bandas a todo lo ancho con
//     un filete. Un recuadro dice dónde acaba una sección; una línea horizontal, no.
//  3. **La tira de la cabecera se pega al nombre**, en su misma banda, en vez de flotar con un
//     hueco enorme debajo. El nombre lo pinta la página (`CharacterDetailPage.tsx`, fuera de la
//     frontera de esta tarea), así que la tira sube hasta su altura con un margen negativo y se
//     alinea a la derecha, que es donde la maqueta la pone.
//  4. **El aviso de DM es una línea**, no un párrafo de letra pequeña.
//  5. **Se retira la piel de vitela** del cuerpo de la hoja. Está razonado en `Tarjeta.tsx`: la
//     vitela sirve para lo que se lee de corrido —una ficha del mundo, la historia del
//     personaje, que la conserva— y no para una hoja de consulta llena de cifras. Es reversible.
//
// **La cabecera fija se queda**, porque no era un defecto: CA, iniciativa, velocidad, PG y
// competencia son los cinco números que se consultan en mitad de un turno, y desplazarse para
// leerlos es exactamente lo que la hoja de papel no obliga a hacer. Ojo con dónde vive: **`sticky`
// se pega dentro de su padre**, así que la tira es HERMANA del cuerpo y nunca su hija; envolver
// las dos en un contenedor nuevo la soltaría sin que ninguna prueba unitaria se enterase (lo mide
// el punto 7 de `e2e/hoja.spec.ts`).
//
// **La maqueta usa metros («Vel. 9 m») y aquí siguen los pies.** No es un descuido: los pasos de
// la traza vienen del servidor en pies, y convertir solo el total dejaría un «9 m» explicado por
// un «30 velocidad base». La conversión, si se quiere, es del motor entero o de nada.
//
// La atribución del SRD que `catalog/index.ts` pide ver en pantalla no se repite aquí: ya la pinta
// `AppShell` en el pie de TODA pantalla con sesión, y esta hoja se monta dentro de un `AppShell`.

const HABILIDADES_POR_CARACTERISTICA: Record<AbilityKey, SkillKey[]> = ABILITY_KEYS.reduce(
  (acc, ability) => {
    acc[ability] = (Object.entries(SKILLS) as [SkillKey, AbilityKey][])
      .filter(([, a]) => a === ability)
      .map(([skill]) => skill);
    return acc;
  },
  {} as Record<AbilityKey, SkillKey[]>,
);

export function HojaCalculada({
  campaignId,
  characterId,
  puedeEditar,
}: {
  campaignId: string;
  characterId: string;
  puedeEditar: boolean;
}) {
  const { data, isLoading, isError } = useCharacterSheet(campaignId, characterId);

  if (isLoading) {
    return <p className="font-chrome text-chrome-sm text-muted">Calculando la hoja…</p>;
  }
  if (isError || !data) {
    return (
      <EmptyState title="No se pudo cargar la hoja de 5.ª edición">
        Vuelve a intentarlo en un momento.
      </EmptyState>
    );
  }

  const { sheet, reason, hp, deathSaves, character } = data;

  // **Las dos tarjetas de identidad se pintan SIEMPRE, y desde el mismo sitio del árbol.**
  //
  // Antes esto era un `return` temprano con su propia copia de «Ficha» y «Características», y el
  // resto de la hoja era otro `return`. En cuanto la hoja pasaba a ser derivable —al teclear la
  // última característica— React desmontaba un árbol entero y montaba el otro, así que **el
  // campo que tenías bajo el cursor desaparecía a media escritura**. El navegador lo dijo con
  // todas las letras en un recorrido: «element was detached from the DOM». No era un problema de
  // la prueba: le pasa igual a quien rellena una ficha nueva.
  //
  // Ahora hay un solo `return`: lo que cambia con `sheet` es lo que se añade alrededor, nunca la
  // identidad de estos dos campos.
  const identidad = (
    <>
      <TarjetaDeHoja titulo="Ficha" etiqueta="ficha del personaje">
        <FichaEditable
          campaignId={campaignId}
          characterId={characterId}
          character={character}
          puedeEditar={puedeEditar}
        />
      </TarjetaDeHoja>
      <TarjetaDeHoja titulo="Características" etiqueta="características">
        <Caracteristicas
          campaignId={campaignId}
          characterId={characterId}
          character={character}
          sheet={sheet}
          puedeEditar={puedeEditar}
        />
      </TarjetaDeHoja>
    </>
  );

  if (!sheet) {
    return (
      // **Las claves no son adorno: son lo que evita que el campo desaparezca bajo la mano.**
      //
      // Esta rama y la de abajo son dos `return` distintos, y colocan los elementos en
      // posiciones distintas —aquí el cuerpo va el primero, allí va después de la tira de
      // cabecera—. React empareja por posición, así que al volverse derivable la hoja
      // desmontaba todo y lo montaba de nuevo: el `<input>` que estabas usando **se
      // desprendía del DOM a media escritura**. Lo dijo el navegador con todas las letras en
      // un recorrido —«element was detached from the DOM»—, y le pasa igual a quien rellena
      // las seis características de un personaje nuevo. Con clave, React empareja por nombre
      // y conserva los nodos que son los mismos.
      <div className="flex flex-col gap-s4">
        <div key="cuerpo" data-piel="cromado" className="flex flex-col gap-s4">
          <div key="rejilla" className="grid items-start gap-s4 lg:grid-cols-2">
            <div key="columna-izquierda" className="flex min-w-0 flex-col gap-s4">
              {identidad}
              {/* **Una ficha a medias se completa aquí, no en otra pantalla.** Antes había un
                  botón que abría un diálogo: quien acababa de crear un personaje veía un aviso,
                  pulsaba, y aterrizaba en un formulario distinto del sitio donde iba a leer el
                  resultado. */}
              <EmptyState title="La hoja de 5.ª edición está a medias">
                {reason ?? "Faltan datos para calcular la hoja."}
              </EmptyState>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // La velocidad de la cabecera es la **efectiva** —la que ya tiene en cuenta las condiciones—,
  // que calcula el servidor. Si la respuesta no la trae (una mutación, que no la manda), se pinta
  // la base sin traza en vez de recalcular aquí una regla del juego que vive en la API.
  const velocidad = data.effectiveSpeeds?.walk ?? { total: sheet.speeds.walk ?? 0, steps: [] };

  return (
    <div className="flex flex-col gap-s4">
      {/* **La tira de la cabecera, pegada al nombre.** `top-16` es la altura de la cabecera de la
          aplicación (`ui/AppShell.tsx`, `h-16`), que también es fija: esta se apoya justo debajo
          en vez de deslizarse por detrás. El `-mt-s5` la sube hasta la banda del nombre, que
          pinta la página: en la maqueta las dos cosas viven en la misma línea, y el hueco que
          había entre ellas era el defecto que el autor señaló. */}
      <section
        aria-label="resumen de combate"
        // **El escalón lo declara quien lo tiene, no esta hoja.** `AppShell` pone
        // `--tira-fija-top: 4rem` porque su cabecera mide `h-16`, y `--tira-fija-pull: -1.5rem`
        // para subir la tira a la banda del nombre. Dentro de un cajón no hay ninguna de las
        // dos cosas y las variables valen **cero**: escribir `top-16` aquí hacía que la tira se
        // parase 64px por debajo del borde del cajón y **se solapase 72px con su propio cuerpo**.
        className="sticky top-[var(--tira-fija-top,0px)] z-20 -mx-s2 mt-[var(--tira-fija-pull,0px)] border-b border-muted bg-[color:var(--chrome-veil)] px-s2 py-s2 backdrop-blur"
      >
        <div className="flex flex-wrap items-start justify-end gap-s2">
          <ValorDerivado variante="compacta" etiqueta="CA" valor={sheet.derived.ac} />
          <ValorDerivado
            variante="compacta"
            etiqueta="Inic."
            etiquetaLarga="Iniciativa"
            valor={sheet.derived.initiative}
          />
          <ValorDerivado
            variante="compacta"
            etiqueta="Vel. (pies)"
            etiquetaLarga="Velocidad efectiva en pies"
            valor={{ key: "speed.walk", total: velocidad.total, steps: velocidad.steps }}
          />
          {/* Los PG de la cabecera son **solo lectura**: el delta —recibo daño, me curo— se
              aplica en su tarjeta, que es donde está la acción. Repetir aquí el control sería el
              mismo dato en dos sitios, que es como se acaba con uno de los dos mintiendo. */}
          <div className="min-w-[4.75rem] rounded-radius-sm border border-muted bg-surface px-s2 py-1 text-center">
            <p className={`${ROTULO_DE_CASILLA} leading-tight`}>PG</p>
            <p className="font-data text-chrome-lg leading-none text-text">
              {hp.current ?? "—"} / {hp.max ?? "—"}
            </p>
            {hp.temp > 0 && (
              <p className="font-chrome text-chrome-xs text-accent-text">+{hp.temp} temporales</p>
            )}
          </div>
          {sheet.derived.proficiencyBonus && (
            <ValorDerivado
              variante="compacta"
              etiqueta="Comp."
              etiquetaLarga="Competencia"
              valor={sheet.derived.proficiencyBonus}
            />
          )}
        </div>
      </section>

      {/* El cuerpo. Es HERMANO de la tira de arriba, nunca su padre — ver la nota del `sticky`. */}
      <div key="cuerpo" data-piel="cromado" className="flex flex-col gap-s4">
        <AvisoDeDm campaignId={campaignId} />

        <div key="rejilla" className="grid items-start gap-s4 lg:grid-cols-2">
          {/* --- Columna izquierda: la cadena que explica los números. NO se intercala nada
              entre características, salvaciones y habilidades. --- */}
          <div key="columna-izquierda" className="flex min-w-0 flex-col gap-s4">
            {/* La misma pareja que pinta la rama de arriba, y **en la misma posición del
                árbol**: es lo que hace que el campo que se está tecleando sobreviva al momento
                en que la hoja pasa a ser derivable. */}
            {identidad}

            {/* **Las salvaciones, en dos columnas de una línea** — como la maqueta. Seis valores
                que se leen de un vistazo no necesitan seis bandas. */}
            <TarjetaDeHoja titulo="Salvaciones">
              <div className="grid gap-x-s5 gap-y-1 sm:grid-cols-2">
                {ABILITY_KEYS.map((ability) => (
                  <ValorDerivado
                    key={ability}
                    variante="linea"
                    etiqueta={NOMBRE_CARACTERISTICA[ability]}
                    valor={sheet.derived[`save.${ability}`]}
                    accion={
                      <TirarBoton
                        campaignId={campaignId}
                        characterId={characterId}
                        etiqueta={`Salvación de ${NOMBRE_CARACTERISTICA[ability]}`}
                        modificador={sheet.derived[`save.${ability}`].total}
                        derivado={sheet.derived[`save.${ability}`]}
                        // **Una salvación por característica, y no una sola para las seis.**
                        // `restrained` solo penaliza las de Destreza y el fallo automático de
                        // paralizado alcanza solo Fuerza y Destreza: una entrada única tendría
                        // que mentir en cuatro o callarse en dos.
                        sugerencia={data?.rollSuggestions?.saves?.[ability]}
                      />
                    }
                  />
                ))}
              </div>
            </TarjetaDeHoja>

            <TarjetaDeHoja titulo="Habilidades">
              <div className="flex flex-col gap-1">
                {ABILITY_KEYS.flatMap((ability) =>
                  HABILIDADES_POR_CARACTERISTICA[ability].map((skill) => (
                    <ValorDerivado
                      key={skill}
                      variante="linea"
                      etiqueta={`${NOMBRE_HABILIDAD[skill]} (${ABREVIATURA_CARACTERISTICA[ability]})`}
                      valor={sheet.derived[`skill.${skill}`]}
                      accion={
                        <TirarBoton
                          campaignId={campaignId}
                          characterId={characterId}
                          etiqueta={NOMBRE_HABILIDAD[skill]}
                          modificador={sheet.derived[`skill.${skill}`].total}
                          derivado={sheet.derived[`skill.${skill}`]}
                          // Una habilidad es una **prueba de característica**: las dieciocho
                          // comparten sugerencia, porque ninguna regla del SRD distingue entre
                          // ellas para esto.
                          sugerencia={data?.rollSuggestions?.check}
                        />
                      }
                    />
                  )),
                )}
              </div>
            </TarjetaDeHoja>
          </div>

          {/* --- Columna derecha: lo accionable. --- */}
          <div className="flex min-w-0 flex-col gap-s4">
            <Avisos warnings={sheet.warnings} />
            <EleccionesPendientes
              campaignId={campaignId}
              characterId={characterId}
              pendingChoices={sheet.pendingChoices}
              choicesActuales={character.choices ?? {}}
            />

            <TarjetaDeHoja titulo="Puntos de golpe">
              <PuntosDeGolpe
                campaignId={campaignId}
                characterId={characterId}
                hp={hp}
                // La traza de los PG máximos, para poder decir por qué son la mitad cuando el
                // agotamiento los parte (2C.4). La cifra sigue saliendo de `hp.max`.
                maxHp={sheet.derived.maxHp}
                puedeEditar={puedeEditar}
              />
            </TarjetaDeHoja>

            {/* **La Clase de Armadura, con su fórmula en línea.** La cifra sale también arriba en
                la tira, y eso está bien: son el mismo valor derivado leído del mismo sitio, así
                que no pueden discrepar. Lo que aporta esta tarjeta es la explicación a tamaño de
                lectura, que en una casilla de la tira no cabe. */}
            <TarjetaDeHoja titulo="Clase de armadura" etiqueta="clase de armadura">
              <ValorDerivado
                variante="tarjeta"
                etiqueta="Clase de armadura"
                valor={sheet.derived.ac}
              />
            </TarjetaDeHoja>

            <TarjetaDeHoja titulo="Recursos y descansos" etiqueta="recursos y descansos">
              <RecursosYDescansos
                campaignId={campaignId}
                characterId={characterId}
                puedeEditar={puedeEditar}
              />
            </TarjetaDeHoja>

            {/* **Modificadores temporales** (plan 13, M8), junto a las condiciones y no dentro de
                ellas: comparten la caducidad, pero una condición es una regla del SRD con nombre
                cerrado y esto es un número arbitrario con un motivo escrito a mano. */}
            <TarjetaDeHoja titulo="Modificadores temporales" etiqueta="modificadores temporales">
              <ModificadoresTemporales
                campaignId={campaignId}
                characterId={characterId}
                puedeEditar={puedeEditar}
              />
            </TarjetaDeHoja>

            <TarjetaDeHoja titulo="Condiciones activas" etiqueta="condiciones">
              <Condiciones
                campaignId={campaignId}
                characterId={characterId}
                puedeEditar={puedeEditar}
              />
            </TarjetaDeHoja>

            {sheet.spellSlots.length > 0 && (
              <TarjetaDeHoja
                titulo={`Espacios de conjuro (${
                  sheet.spellSlotResetOn === "SHORT_REST" ? "descanso corto" : "descanso largo"
                })`}
                etiqueta="espacios de conjuro"
              >
                <ul className="flex flex-wrap gap-s2">
                  {sheet.spellSlots.map((s) => (
                    <li
                      key={s.spellLevel}
                      className="rounded-radius-sm border border-muted px-s2 py-1 font-data text-chrome-sm text-text"
                    >
                      Nivel {s.spellLevel}: {s.slots}
                    </li>
                  ))}
                </ul>
              </TarjetaDeHoja>
            )}

            <TarjetaDeHoja titulo="Velocidad y sentidos" etiqueta="velocidad y sentidos">
              <VelocidadYSentidos
                speeds={sheet.speeds}
                effectiveSpeeds={data.effectiveSpeeds}
                darkvision={sheet.derived["senses.darkvision"]}
              />
            </TarjetaDeHoja>

            <Anulaciones
              campaignId={campaignId}
              characterId={characterId}
              overrides={data.character.overrides}
            />

            {/* **La bolsa se pinta una sola vez, y la pinta el inventario.** Aquí hubo una
                tarjeta de solo lectura con las cinco monedas; al montar el inventario debajo,
                la misma hoja enseñaba el dinero dos veces —una para leer y otra para mover—, que
                es la clase de duplicado que acaba discrepando en cuanto uno de los dos se
                actualiza y el otro no. Se queda el que además deja hacer algo. */}

            {/* La subida de nivel vive en su propia feature (2A.11): esta hoja solo la monta.
                En la maqueta es un botón del bloque accionable, no un adorno suelto flotando
                sobre la cabecera, y ahí se lee mejor: al lado de lo que cambia al pulsarlo. */}
            {puedeEditar && (
              <BotonSubirNivel
                campaignId={campaignId}
                characterId={characterId}
                level={character.level}
              />
            )}
          </div>
        </div>

        {/* **La fila de tarjetas pequeñas** de la maqueta, a todo lo ancho y por debajo de las dos
            columnas: lo que se consulta de un vistazo y no se decide en un turno. */}
        <section aria-label="valores pasivos" className="grid gap-s3 sm:grid-cols-3">
          <PercepcionPasiva valor={sheet.derived.passivePerception} />
          <DadosDeGolpe
            campaignId={campaignId}
            characterId={characterId}
            puedeEditar={puedeEditar}
          />
          <SalvacionesDeMuerte
            campaignId={campaignId}
            characterId={characterId}
            deathSaves={deathSaves}
            puedeEditar={puedeEditar}
          />
        </section>

        <AtaquesYLanzamiento
          campaignId={campaignId}
          characterId={characterId}
          sheet={sheet}
          attacks={data.attacks ?? []}
        />

        {/* **El hueco del inventario, relleno (fase 2B).** Aquí hubo hasta hoy un recuadro
            punteado que decía «llega en la fase 2B». Lo que se enchufa es el inventario entero, y
            **dentro de la hoja y no en otra pantalla**: equipar algo cambia la CA de arriba
            delante de quien lo hace, y esa relación —que es lo que hace útil a esta
            herramienta— se pierde con una navegación por medio.
            Va **a todo lo ancho y debajo**, no en la columna derecha donde estaba el hueco: son
            tres zonas más carga y monedas, y en una columna de 320 px eso no cabe sin apretarse.
            El hueco marcaba el sitio, no la anchura. */}
        <PaginaDeInventario campaignId={campaignId} characterId={characterId} />

        {/* El pie: lo que se lee una vez por sesión y no se consulta en mitad de un turno. */}
        <div className="grid items-start gap-s4 lg:grid-cols-3">
          <CompetenciasConArmas weaponProficiencies={sheet.weaponProficiencies} />
          <RasgosYAptitudes features={sheet.features} />
          <Personalidad bio={character.bio} />
        </div>
      </div>
    </div>
  );
}
