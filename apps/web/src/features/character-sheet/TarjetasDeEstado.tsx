import type { DeathState, DerivedValue } from "@dnd/shared";
import { Button } from "../../ui/Button";
import { useResources, useRollDeathSave, useSpendResource, useRestoreResource } from "./hooks";
import { formulaDeUnaLinea } from "./formula";
import { CAJA_DE_HOJA, PROSA_DE_HOJA, ROTULO_DE_CASILLA } from "./Tarjeta";

// **La fila de tarjetas pequeñas de la maqueta de Figma**, adoptada casi tal cual: percepción
// pasiva, dados de golpe y salvaciones de muerte, del mismo tamaño y en la misma fila.
//
// La maqueta pone cuatro; aquí hay tres, y la que falta se dice en vez de fingirse:
//
//  · **Inspiración** no existe todavía. `seedResourcesFor` (`resources.service.ts`) siembra
//    dados de golpe y espacios de conjuro, y nada más, así que una tarjeta de inspiración
//    tendría que inventarse un recurso que el servidor no guarda. Se reporta, no se dibuja.
//  · La maqueta pone además «Perspicacia 11 · Investigación 12» bajo la percepción pasiva. El
//    motor deriva `passivePerception` y **solo esa**: calcular aquí `10 + skill.insight` sería
//    escribir una regla del juego en el navegador, que es exactamente lo que
//    `VelocidadYSentidos.tsx` documenta haber tenido que deshacer una vez. Se reporta como
//    hueco del motor.

/**
 * Las tres casillas de una tanda de salvaciones de muerte, **dibujadas**: un círculo relleno por
 * éxito (o fallo) y hueco por lo que falta.
 *
 * Son un dibujo y no tres glifos de círculo por la regla vinculante de iconos: un glifo se pinta
 * a todo color en unos sistemas y como un cuadrado vacío en otros. Y el estado no depende **solo**
 * del relleno — el rótulo de al lado dice «2 de 3», que es lo que lee quien no distingue el
 * relleno del hueco.
 */
function Casillas({ hechas, tono }: { hechas: number; tono: "exito" | "fallo" }) {
  return (
    <svg
      viewBox="0 0 44 12"
      aria-hidden="true"
      className={`h-3 w-[2.75rem] shrink-0 ${tono === "fallo" ? "text-danger" : "text-accent"}`}
    >
      {[0, 1, 2].map((i) => (
        <circle
          key={i}
          cx={6 + i * 16}
          cy={6}
          r={5}
          fill={i < hechas ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth={1.25}
        />
      ))}
    </svg>
  );
}

const ESTADO_MUERTE: Record<DeathState["status"], string> = {
  alive: "Con vida",
  dying: "Muriendo",
  stable: "Estabilizado a 0 PG",
  dead: "Muerto",
};

export function SalvacionesDeMuerte({
  campaignId,
  characterId,
  deathSaves,
  puedeEditar,
}: {
  campaignId: string;
  characterId: string;
  deathSaves: DeathState;
  puedeEditar: boolean;
}) {
  const tirar = useRollDeathSave(campaignId, characterId);

  return (
    <div className={CAJA_DE_HOJA} data-tarjeta="salvaciones-de-muerte">
      <p className={ROTULO_DE_CASILLA}>Salvaciones de muerte</p>
      <dl className="mt-s2 flex flex-col gap-1">
        <div className="flex items-center gap-s2">
          <dt className="w-16 font-chrome text-chrome-sm text-text">Éxitos</dt>
          <dd className="flex items-center gap-s2">
            <Casillas hechas={deathSaves.successes} tono="exito" />
            <span className="font-data text-chrome-xs text-muted">{deathSaves.successes} de 3</span>
          </dd>
        </div>
        <div className="flex items-center gap-s2">
          <dt className="w-16 font-chrome text-chrome-sm text-text">Fallos</dt>
          <dd className="flex items-center gap-s2">
            <Casillas hechas={deathSaves.failures} tono="fallo" />
            <span className="font-data text-chrome-xs text-muted">{deathSaves.failures} de 3</span>
          </dd>
        </div>
      </dl>
      <p className={`mt-1 ${PROSA_DE_HOJA}`}>{ESTADO_MUERTE[deathSaves.status]}</p>
      {puedeEditar && deathSaves.status === "dying" && (
        <Button
          type="button"
          variant="secondary"
          className="mt-s2"
          onClick={() => tirar.mutate()}
          disabled={tirar.isPending}
        >
          Tirar salvación de muerte
        </Button>
      )}
    </div>
  );
}

/** La clave con la que `resources.service.ts` siembra los dados de golpe: `hit-dice-d8`. */
export const PREFIJO_DADOS_DE_GOLPE = "hit-dice-";

/**
 * Los dados de golpe, en su propia tarjeta —como en la maqueta— en vez de perdidos entre los
 * demás recursos.
 *
 * **Y solo aquí**: `RecursosYDescansos.tsx` los excluye de su lista desde este cambio, porque el
 * mismo contador en dos sitios acaba con uno de los dos mintiendo. Los botones de gastar y
 * reponer se vienen con él.
 */
export function DadosDeGolpe({
  campaignId,
  characterId,
  puedeEditar,
}: {
  campaignId: string;
  characterId: string;
  puedeEditar: boolean;
}) {
  const { data: recursos } = useResources(campaignId, characterId);
  const gastar = useSpendResource(campaignId, characterId);
  const reponer = useRestoreResource(campaignId, characterId);
  const dados = (recursos ?? []).find((r) => r.key.startsWith(PREFIJO_DADOS_DE_GOLPE));

  return (
    <div className={CAJA_DE_HOJA} data-tarjeta="dados-de-golpe">
      <p className={ROTULO_DE_CASILLA}>{dados ? dados.label : "Dados de golpe"}</p>
      {dados ? (
        <>
          <p className="mt-1 font-data text-chrome-2xl leading-none text-text">
            {dados.current}
            <span className="ml-1 font-data text-chrome-sm text-muted">/ {dados.max ?? "—"}</span>
          </p>
          <p className={`mt-1 ${PROSA_DE_HOJA}`}>
            Se gastan en un descanso corto para curarse; el largo devuelve la mitad.
          </p>
          {puedeEditar && (
            <div className="mt-s2 flex gap-1">
              <Button
                type="button"
                variant="ghost"
                className="px-1.5 py-0.5 text-chrome-xs"
                onClick={() => gastar.mutate({ key: dados.key, amount: 1 })}
                disabled={dados.current <= 0 || gastar.isPending}
                aria-label={`Gastar uno de ${dados.label}`}
              >
                &minus;1
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="px-1.5 py-0.5 text-chrome-xs"
                onClick={() => reponer.mutate({ key: dados.key, amount: 1 })}
                disabled={(dados.max !== null && dados.current >= dados.max) || reponer.isPending}
                aria-label={`Reponer uno de ${dados.label}`}
              >
                +1
              </Button>
            </div>
          )}
        </>
      ) : (
        <p className={`mt-1 ${PROSA_DE_HOJA}`}>
          Se siembran al completar raza y clase: la hoja necesita saber qué dado usa la clase.
        </p>
      )}
    </div>
  );
}

/**
 * La percepción pasiva con su desglose en línea, como la maqueta: la cifra grande y debajo
 * «10 base +1 sabiduría +3 competencia». Es el número que el DM pregunta sin avisar.
 */
export function PercepcionPasiva({ valor }: { valor: DerivedValue }) {
  return (
    <div className={CAJA_DE_HOJA} data-tarjeta="percepcion-pasiva">
      <p className={ROTULO_DE_CASILLA}>Percepción pasiva</p>
      <p className="mt-1 font-data text-chrome-2xl leading-none text-text">{valor.total}</p>
      <p className={`mt-1 ${PROSA_DE_HOJA}`}>{formulaDeUnaLinea(valor)}</p>
    </div>
  );
}
