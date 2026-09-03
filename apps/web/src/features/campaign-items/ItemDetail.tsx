import type { ReactNode } from "react";
import { Badge } from "../../ui/Badge";
import { Button } from "../../ui/Button";
import { describirEfecto } from "./vocabulario";
import {
  formatearPeso,
  formatearPrecio,
  nombreAlcanceArma,
  nombreCategoriaArma,
  nombreCategoriaArmadura,
  nombrePropiedadArma,
  nombreTipo,
  nombreTipoDano,
} from "./vocabulario";
import type { CampaignItem } from "./api";

// Carril B2 — la ficha de un objeto (pantalla 21 de la maqueta): «aquí manda el dato». Una fila
// de cuatro datos, luego los bloques mecánicos que le tocan a este objeto (arma o armadura, si
// los tiene), luego «Efectos numéricos» con sus fichas, y **debajo** la prosa.
//
// **Lo que NO se copia de la maqueta**: pintaba «Ventaja en Engaño ante la Casa Vhael» como
// efecto numérico. Nuestra lista de efectos es cerrada (`itemEffectSchema`, `@dnd/shared`) y no
// incluye ventajas ni nada condicional — eso es prosa, y aquí va en el bloque de abajo.

function Dato({ etiqueta, valor }: { etiqueta: string; valor: ReactNode }) {
  return (
    <div>
      <p className="font-chrome text-chrome-xs uppercase tracking-[0.14em] text-muted">
        {etiqueta}
      </p>
      <p className="mt-0.5 font-data text-chrome-md text-text">{valor}</p>
    </div>
  );
}

export function ItemDetail({
  item,
  onBack,
  onEdit,
  puedeEditar,
}: {
  item: CampaignItem;
  onBack: () => void;
  onEdit: () => void;
  puedeEditar: boolean;
}) {
  return (
    <div className="space-y-s4">
      <div className="flex flex-wrap items-start justify-between gap-s3">
        <div className="min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="font-chrome text-chrome-xs text-accent-text underline"
          >
            ← Volver al catálogo
          </button>
          <h2 className="mt-s2 font-title text-chrome-2xl leading-tight text-text">{item.name}</h2>
          <div className="mt-s2 flex flex-wrap items-center gap-s2">
            <Badge visibility={item.visibility} />
          </div>
        </div>
        {puedeEditar && (
          <Button type="button" variant="secondary" onClick={onEdit}>
            Editar
          </Button>
        )}
      </div>

      <div className="rounded-radius-sm border border-muted p-s4">
        <p className="mb-s3 font-chrome text-chrome-xs text-accent-text">Aquí manda el dato</p>
        <div className="grid grid-cols-2 gap-s4 sm:grid-cols-4">
          <Dato etiqueta="Peso" valor={formatearPeso(item.weightOz)} />
          <Dato etiqueta="Valor" valor={formatearPrecio(item.costCp)} />
          <Dato etiqueta="Tipo" valor={nombreTipo(item.kind)} />
          <Dato etiqueta="Sintonía" valor={item.requiresAttunement ? "Sí" : "No"} />
        </div>

        {item.kind === "WEAPON" && item.damageDice && item.damageType && (
          <div className="mt-s4 border-t border-muted pt-s4">
            <p className="mb-s2 font-chrome text-chrome-xs uppercase tracking-[0.14em] text-muted">
              Datos de arma
            </p>
            <div className="grid grid-cols-2 gap-s4 sm:grid-cols-4">
              {item.weaponCategory && (
                <Dato etiqueta="Categoría" valor={nombreCategoriaArma(item.weaponCategory)} />
              )}
              {item.weaponRange && (
                <Dato etiqueta="Alcance" valor={nombreAlcanceArma(item.weaponRange)} />
              )}
              <Dato
                etiqueta="Daño"
                valor={`${item.damageDice} ${nombreTipoDano(item.damageType)}`}
              />
              {item.versatileDice && <Dato etiqueta="A dos manos" valor={item.versatileDice} />}
              {(item.rangeNormalFt || item.rangeLongFt) && (
                <Dato
                  etiqueta="Distancia"
                  valor={`${item.rangeNormalFt ?? 0}/${item.rangeLongFt ?? 0} pies`}
                />
              )}
            </div>
            {item.weaponProperties.length > 0 && (
              <p className="mt-s2 font-data text-chrome-sm text-muted">
                {item.weaponProperties.map(nombrePropiedadArma).join(", ")}
              </p>
            )}
          </div>
        )}

        {(item.kind === "ARMOR" || item.kind === "SHIELD") &&
          item.baseAc !== null &&
          item.baseAc !== undefined && (
            <div className="mt-s4 border-t border-muted pt-s4">
              <p className="mb-s2 font-chrome text-chrome-xs uppercase tracking-[0.14em] text-muted">
                Datos de armadura
              </p>
              <div className="grid grid-cols-2 gap-s4 sm:grid-cols-4">
                {item.armorCategory && (
                  <Dato etiqueta="Categoría" valor={nombreCategoriaArmadura(item.armorCategory)} />
                )}
                <Dato
                  etiqueta="Clase de Armadura"
                  valor={
                    item.kind === "SHIELD"
                      ? `+${item.baseAc}`
                      : item.dexCap === undefined || item.dexCap === null
                        ? `${item.baseAc} + DES`
                        : item.dexCap === 0
                          ? `${item.baseAc} (sin DES)`
                          : `${item.baseAc} + DES (máx ${item.dexCap})`
                  }
                />
                {!!item.strengthRequirement && (
                  <Dato etiqueta="Fuerza mínima" valor={item.strengthRequirement} />
                )}
                {item.stealthDisadvantage && <Dato etiqueta="Sigilo" valor="Desventaja" />}
              </div>
            </div>
          )}

        <div className="mt-s4 border-t border-muted pt-s4">
          <p className="mb-s2 font-chrome text-chrome-xs uppercase tracking-[0.14em] text-muted">
            Efectos numéricos (de lista cerrada, lo que el motor sabe sumar)
          </p>
          {item.effects.length === 0 ? (
            <p className="font-chrome text-chrome-sm text-muted">Sin efectos numéricos.</p>
          ) : (
            <ul className="flex flex-wrap gap-s2">
              {item.effects.map((efecto, i) => (
                <li
                  key={i}
                  className="rounded-radius-sm border border-muted px-2 py-1 font-data text-chrome-sm text-text"
                >
                  {describirEfecto(efecto)}
                </li>
              ))}
            </ul>
          )}
        </div>

        {item.description && (
          <p className="mt-s4 whitespace-pre-wrap font-world text-chrome-base leading-relaxed text-text">
            {item.description}
          </p>
        )}
      </div>
    </div>
  );
}
