import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { createCampaignSchema, type CreateCampaignInput } from "@dnd/shared";
import { useCreateCampaign } from "./hooks";
import { Button } from "../../ui/Button";
import { Field, fieldControlClass } from "../../ui/Field";
import { Dialog } from "../../ui/Dialog";

export function CreateCampaignModal({ onClose }: { onClose: () => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateCampaignInput>({ resolver: zodResolver(createCampaignSchema) });
  const create = useCreateCampaign();
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (data: CreateCampaignInput) => {
    try {
      await create.mutateAsync(data);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <Dialog open onClose={onClose} title="Nueva campaña">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field label="Nombre" error={errors.name?.message}>
          <input id="name" className={fieldControlClass} {...register("name")} />
        </Field>
        <Field label="Descripción" error={errors.description?.message}>
          <textarea id="description" className={fieldControlClass} {...register("description")} />
        </Field>
        {error && <p className="text-chrome-sm text-danger-text">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={create.isPending}>
            Crear
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
