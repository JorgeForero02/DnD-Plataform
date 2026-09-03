import { useState } from "react";
import { TOPE_DE_DESTREZA_POR_CATEGORIA } from "@dnd/shared";
import type {
  ArmorCategory,
  CreateCampaignItemInput,
  DamageType,
  EquipSlot,
  ItemEffect,
  ItemKind,
  Visibility,
  WeaponCategory,
  WeaponProperty,
  WeaponRange,
} from "@dnd/shared";
import { useMembers } from "../campaigns/members";
import { DeleteButton } from "../../components/DeleteButton";
import { Button } from "../../ui/Button";
import { Dialog } from "../../ui/Dialog";
import { Field, fieldControlClass } from "../../ui/Field";
import { VisibilityChooser } from "../entities/VisibilityChooser";
import type { CampaignItem } from "./api";
import { useCreateCampaignItem, useDeleteCampaignItem, useUpdateCampaignItem } from "./hooks";
import { EffectsEditor } from "./EffectsEditor";
import { RadioGroup } from "./RadioGroup";
import {
  ALCANCES_DE_ARMA,
  CATEGORIAS_DE_ARMADURA,
  CATEGORIAS_DE_ARMA,
  EXPLICACION_TIPO,
  kgAOz,
  NOMBRE_CATEGORIA_ARMADURA,
  NOMBRE_CATEGORIA_ARMA,
  NOMBRE_ALCANCE_ARMA,
  NOMBRE_PROPIEDAD_ARMA,
  EXPLICACION_PROPIEDAD_ARMA,
  NOMBRE_RANURA,
  NOMBRE_TIPO,
  nombreTipoDano,
  ozAKg,
  poACp,
  PROPIEDADES_DE_ARMA,
  RANURAS,
  TIPOS_DE_DANO,
  TIPOS_DE_OBJETO,
  cpAPo,
} from "./vocabulario";

// Carril B2 — el formulario de crear/editar un objeto de la campaña. Calcado del molde de
// `features/entities/EntityEditor.tsx`: mismo `Dialog`, mismo patrón de error en línea, mismo
// `DeleteButton`. **El botón de guardar nunca se deshabilita** (docs/04-convenciones.md de esta
// pantalla): un rechazo del servidor conserva lo tecleado y lo explica en línea.
//
// **Los bloques `weapon` y `armor` van anidados en el cuerpo** que manda este formulario, aunque
// `item` (la fila que llega al editar) los tenga como columnas planas — así lo pide
// `createCampaignItemSchema`/`updateCampaignItemSchema` (`packages/shared/src/item.schema.ts`).

const TIPOS_CON_ARMA: ItemKind[] = ["WEAPON"];
const TIPOS_CON_ARMADURA: ItemKind[] = ["ARMOR", "SHIELD"];

export function CampaignItemEditor({
  campaignId,
  item,
  onClose,
  onDeleted,
}: {
  campaignId: string;
  item?: CampaignItem;
  onClose: () => void;
  onDeleted?: () => void;
}) {
  const isEdit = !!item;

  const [name, setName] = useState(item?.name ?? "");
  const [kind, setKind] = useState<ItemKind>(item?.kind ?? "GEAR");
  const [description, setDescription] = useState(item?.description ?? "");
  const [weightKg, setWeightKg] = useState(
    item ? ozAKg(item.weightOz).toLocaleString("es-ES", { maximumFractionDigits: 3 }) : "0",
  );
  const [costPo, setCostPo] = useState(
    item?.costCp != null
      ? cpAPo(item.costCp).toLocaleString("es-ES", { maximumFractionDigits: 2 })
      : "",
  );
  const [requiresAttunement, setRequiresAttunement] = useState(item?.requiresAttunement ?? false);
  const [slot, setSlot] = useState<EquipSlot | "">(item?.slot ?? "");
  const [effects, setEffects] = useState<ItemEffect[]>(item?.effects ?? []);
  const [visibility, setVisibility] = useState<Visibility>(item?.visibility ?? "PLAYERS");
  const [specificPlayerIds, setSpecificPlayerIds] = useState<string[]>(
    item?.grants.map((g) => g.userId) ?? [],
  );

  // Datos de arma
  const [weaponCategory, setWeaponCategory] = useState<WeaponCategory>(
    item?.weaponCategory ?? "SIMPLE",
  );
  const [weaponRange, setWeaponRange] = useState<WeaponRange>(item?.weaponRange ?? "MELEE");
  const [damageDice, setDamageDice] = useState(item?.damageDice ?? "1d6");
  const [damageType, setDamageType] = useState<DamageType>(item?.damageType ?? "SLASHING");
  const [weaponProperties, setWeaponProperties] = useState<WeaponProperty[]>(
    item?.weaponProperties ?? [],
  );
  const [versatileDice, setVersatileDice] = useState(item?.versatileDice ?? "");
  const [rangeNormalFt, setRangeNormalFt] = useState(item?.rangeNormalFt?.toString() ?? "");
  const [rangeLongFt, setRangeLongFt] = useState(item?.rangeLongFt?.toString() ?? "");

  // Datos de armadura
  const [armorCategory, setArmorCategory] = useState<ArmorCategory>(
    item?.armorCategory ?? (kind === "SHIELD" ? "SHIELD" : "LIGHT"),
  );
  const [baseAc, setBaseAc] = useState(item?.baseAc?.toString() ?? "10");
  const [strengthRequirement, setStrengthRequirement] = useState(
    item?.strengthRequirement?.toString() ?? "0",
  );
  const [stealthDisadvantage, setStealthDisadvantage] = useState(
    item?.stealthDisadvantage ?? false,
  );

  const [error, setError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const members = useMembers(campaignId, { enabled: visibility === "SPECIFIC_PLAYERS" });
  const create = useCreateCampaignItem(campaignId);
  const update = useUpdateCampaignItem(campaignId);
  const deleteItem = useDeleteCampaignItem(campaignId);

  const togglePlayer = (userId: string) =>
    setSpecificPlayerIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );

  const toggleProperty = (prop: WeaponProperty) =>
    setWeaponProperties((prev) =>
      prev.includes(prop) ? prev.filter((p) => p !== prop) : [...prev, prop],
    );

  const onConfirmDelete = async () => {
    if (!item) return;
    setDeleteError(null);
    try {
      await deleteItem.mutateAsync(item.id);
      if (onDeleted) onDeleted();
      else onClose();
    } catch (err) {
      // **El 409 se enseña con su frase del servidor tal cual** (el número de personajes que
      // lo llevan), no con un mensaje genérico — es lo que pide el brief de este carril.
      setDeleteError((err as Error).message);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const payload: CreateCampaignItemInput = {
      name,
      kind,
      description: description.trim() ? description : undefined,
      weightOz: kgAOz(Number(weightKg.replace(",", ".")) || 0),
      costCp: costPo.trim() ? poACp(Number(costPo.replace(",", "."))) : undefined,
      effects,
      requiresAttunement,
      slot: slot || undefined,
      visibility,
      ...(visibility === "SPECIFIC_PLAYERS" ? { specificPlayerIds } : {}),
      ...(TIPOS_CON_ARMA.includes(kind)
        ? {
            weapon: {
              category: weaponCategory,
              range: weaponRange,
              damageDice,
              damageType,
              properties: weaponProperties,
              versatileDice:
                weaponProperties.includes("VERSATILE") && versatileDice ? versatileDice : undefined,
              rangeNormalFt: rangeNormalFt ? Number(rangeNormalFt) : undefined,
              rangeLongFt: rangeLongFt ? Number(rangeLongFt) : undefined,
            },
          }
        : {}),
      ...(TIPOS_CON_ARMADURA.includes(kind)
        ? {
            armor: {
              category: kind === "SHIELD" ? "SHIELD" : armorCategory,
              baseAc: Number(baseAc) || 0,
              // **El tope lo determina la categoría** (SRD 5.1), no una casilla aparte: ligera
              // sin tope, media +2, pesada nada. Eran dos controles independientes y el DM podía
              // marcar «Pesada» y que su armadura sumara toda la Destreza —una CA silenciosamente
              // alta, que es peor que una equivocada a la vista—. Lo encontró la auditoría de
              // mecánica de 2B; el servidor ahora también lo rechaza.
              dexCap: TOPE_DE_DESTREZA_POR_CATEGORIA[kind === "SHIELD" ? "SHIELD" : armorCategory],
              strengthRequirement: Number(strengthRequirement) || 0,
              stealthDisadvantage,
            },
          }
        : {}),
    };

    try {
      if (isEdit && item) {
        await update.mutateAsync({ itemId: item.id, input: payload });
      } else {
        await create.mutateAsync(payload);
      }
      onClose();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const deleteMessage = item
    ? `Vas a borrar «${item.name}». No se puede deshacer. Si algún personaje lo lleva en su ` +
      `inventario, el servidor rechazará el borrado y aquí se enseñará su motivo.`
    : "";

  return (
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title={isEdit ? `Editar ${item?.name}` : "Crear objeto"}
    >
      <form onSubmit={onSubmit} className="space-y-3">
        <Field label="Nombre">
          <input
            id="item-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={fieldControlClass}
          />
        </Field>

        <RadioGroup
          name="item-kind"
          legend="Tipo de objeto"
          value={kind}
          onChange={setKind}
          options={TIPOS_DE_OBJETO.map((k) => ({
            value: k,
            label: NOMBRE_TIPO[k],
            hint: EXPLICACION_TIPO[k],
          }))}
        />

        <div className="grid grid-cols-2 gap-s3">
          <Field label="Peso (kg)">
            <input
              id="item-weight"
              inputMode="decimal"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              className={fieldControlClass}
            />
          </Field>
          <Field label="Valor (po, vacío = sin precio)">
            <input
              id="item-cost"
              inputMode="decimal"
              value={costPo}
              onChange={(e) => setCostPo(e.target.value)}
              className={fieldControlClass}
            />
          </Field>
        </div>

        <label className="flex items-center gap-2 font-chrome text-chrome-sm text-text">
          <input
            type="checkbox"
            checked={requiresAttunement}
            onChange={(e) => setRequiresAttunement(e.target.checked)}
            className="accent-[var(--accent)]"
          />
          Necesita sintonización
        </label>

        <Field label="Ranura de equipo (opcional)">
          <select
            id="item-slot"
            value={slot}
            onChange={(e) => setSlot(e.target.value as EquipSlot | "")}
            className={fieldControlClass}
          >
            <option value="">No se equipa</option>
            {RANURAS.map((r) => (
              <option key={r} value={r}>
                {NOMBRE_RANURA[r]}
              </option>
            ))}
          </select>
        </Field>

        {TIPOS_CON_ARMA.includes(kind) && (
          <div className="space-y-s3 rounded-radius-sm border border-muted p-s3">
            <p className="font-chrome text-chrome-xs uppercase tracking-[0.14em] text-muted">
              Datos de arma
            </p>
            <RadioGroup
              name="weapon-category"
              legend="Categoría"
              compact
              value={weaponCategory}
              onChange={setWeaponCategory}
              options={CATEGORIAS_DE_ARMA.map((c) => ({
                value: c,
                label: NOMBRE_CATEGORIA_ARMA[c],
              }))}
            />
            <RadioGroup
              name="weapon-range"
              legend="Alcance"
              compact
              value={weaponRange}
              onChange={setWeaponRange}
              options={ALCANCES_DE_ARMA.map((r) => ({ value: r, label: NOMBRE_ALCANCE_ARMA[r] }))}
            />
            <div className="grid grid-cols-2 gap-s3">
              <Field label="Dado de daño (p. ej. 1d8)">
                <input
                  id="item-damage-dice"
                  value={damageDice}
                  onChange={(e) => setDamageDice(e.target.value)}
                  className={fieldControlClass}
                />
              </Field>
              <Field label="Tipo de daño">
                <select
                  id="item-damage-type"
                  value={damageType}
                  onChange={(e) => setDamageType(e.target.value as DamageType)}
                  className={fieldControlClass}
                >
                  {TIPOS_DE_DANO.map((t) => (
                    <option key={t} value={t}>
                      {nombreTipoDano(t)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div>
              <p className="mb-1 font-chrome text-chrome-sm text-text">Propiedades</p>
              <div className="flex flex-wrap gap-1.5">
                {PROPIEDADES_DE_ARMA.map((p) => {
                  const marcada = weaponProperties.includes(p);
                  return (
                    <button
                      key={p}
                      type="button"
                      aria-pressed={marcada}
                      title={EXPLICACION_PROPIEDAD_ARMA[p]}
                      onClick={() => toggleProperty(p)}
                      className={`rounded-radius-sm border px-2 py-0.5 font-chrome text-chrome-xs ${
                        marcada
                          ? "border-copper text-copper-text"
                          : "border-muted text-muted hover:border-accent hover:text-accent-text"
                      }`}
                    >
                      {NOMBRE_PROPIEDAD_ARMA[p]}
                    </button>
                  );
                })}
              </div>
            </div>
            {weaponProperties.includes("VERSATILE") && (
              <Field label="Dado a dos manos (versátil)">
                <input
                  id="item-versatile-dice"
                  value={versatileDice}
                  onChange={(e) => setVersatileDice(e.target.value)}
                  className={fieldControlClass}
                />
              </Field>
            )}
            <div className="grid grid-cols-2 gap-s3">
              <Field label="Alcance normal (pies)">
                <input
                  id="item-range-normal"
                  inputMode="numeric"
                  value={rangeNormalFt}
                  onChange={(e) => setRangeNormalFt(e.target.value)}
                  className={fieldControlClass}
                />
              </Field>
              <Field label="Alcance largo (pies)">
                <input
                  id="item-range-long"
                  inputMode="numeric"
                  value={rangeLongFt}
                  onChange={(e) => setRangeLongFt(e.target.value)}
                  className={fieldControlClass}
                />
              </Field>
            </div>
          </div>
        )}

        {TIPOS_CON_ARMADURA.includes(kind) && (
          <div className="space-y-s3 rounded-radius-sm border border-muted p-s3">
            <p className="font-chrome text-chrome-xs uppercase tracking-[0.14em] text-muted">
              Datos de armadura
            </p>
            {kind === "ARMOR" && (
              <RadioGroup
                name="armor-category"
                legend="Categoría"
                compact
                value={armorCategory}
                onChange={setArmorCategory}
                options={CATEGORIAS_DE_ARMADURA.filter((c) => c !== "SHIELD").map((c) => ({
                  value: c,
                  label: NOMBRE_CATEGORIA_ARMADURA[c],
                }))}
              />
            )}
            <div className="grid grid-cols-2 gap-s3">
              <Field label={kind === "SHIELD" ? "Bono a la CA" : "CA base"}>
                <input
                  id="item-base-ac"
                  inputMode="numeric"
                  value={baseAc}
                  onChange={(e) => setBaseAc(e.target.value)}
                  className={fieldControlClass}
                />
              </Field>
              <Field label="Fuerza mínima (0 = ninguna)">
                <input
                  id="item-str-req"
                  inputMode="numeric"
                  value={strengthRequirement}
                  onChange={(e) => setStrengthRequirement(e.target.value)}
                  className={fieldControlClass}
                />
              </Field>
            </div>
            {kind === "ARMOR" && (
              <>
                <label className="flex items-center gap-2 font-chrome text-chrome-sm text-text">
                  <input
                    type="checkbox"
                    checked={stealthDisadvantage}
                    onChange={(e) => setStealthDisadvantage(e.target.checked)}
                    className="accent-[var(--accent)]"
                  />
                  Desventaja en Sigilo
                </label>
              </>
            )}
          </div>
        )}

        <EffectsEditor effects={effects} onChange={setEffects} />

        <Field label="Descripción (prosa: lo que no es un número)">
          <textarea
            id="item-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className={fieldControlClass}
          />
        </Field>

        <VisibilityChooser value={visibility} onChange={setVisibility}>
          <fieldset className="rounded-radius-sm border border-muted p-s2">
            <legend className="px-1 font-chrome text-chrome-xs uppercase tracking-[0.14em] text-muted">
              Jugadores con acceso
            </legend>
            {members.isLoading && (
              <p className="font-chrome text-chrome-sm text-muted">Cargando jugadores…</p>
            )}
            {members.isError && (
              <p className="font-chrome text-chrome-sm text-danger-text">
                No se pudo cargar la lista de jugadores.
              </p>
            )}
            {members.data
              ?.filter((m) => m.role === "PLAYER")
              .map((m) => (
                <label
                  key={m.userId}
                  className="flex items-center gap-2 py-0.5 font-chrome text-chrome-sm text-text"
                >
                  <input
                    type="checkbox"
                    checked={specificPlayerIds.includes(m.userId)}
                    onChange={() => togglePlayer(m.userId)}
                    className="accent-[var(--accent)]"
                  />
                  {m.displayName}
                </label>
              ))}
          </fieldset>
        </VisibilityChooser>

        {error && (
          <p role="alert" className="text-chrome-sm text-danger-text">
            {error}
          </p>
        )}

        <div className="sticky bottom-0 -mx-s4 -mb-s4 flex items-center justify-between gap-s3 border-t border-muted bg-surface px-s4 py-s3">
          {isEdit && (
            <DeleteButton
              message={deleteMessage}
              onConfirm={onConfirmDelete}
              pending={deleteItem.isPending}
            />
          )}
          <div className="flex flex-1 justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            {/* El botón de guardar nunca se deshabilita: un rechazo del servidor conserva lo
                tecleado y lo explica arriba, en línea. `pending` no lo desactiva a propósito —
                solo evita un segundo envío mientras el primero está en vuelo se deja al usuario,
                que puede reintentar sin perder nada. */}
            <Button type="submit">Guardar</Button>
          </div>
        </div>
        {deleteError && (
          <p role="alert" className="text-chrome-sm text-danger-text">
            {deleteError}
          </p>
        )}
      </form>
    </Dialog>
  );
}
