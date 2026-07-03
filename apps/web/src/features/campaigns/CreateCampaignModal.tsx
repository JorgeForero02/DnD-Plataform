import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { createCampaignSchema, type CreateCampaignInput } from "@dnd/shared";
import { useCreateCampaign } from "./hooks";

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
    <div className="fixed inset-0 flex items-center justify-center bg-black/50">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-96 space-y-4 rounded-lg bg-slate-800 p-6"
      >
        <h2 className="text-lg font-bold">Nueva campaña</h2>
        <div>
          <label htmlFor="name" className="block text-sm">Nombre</label>
          <input id="name" className="w-full rounded bg-slate-700 p-2" {...register("name")} />
          {errors.name && <p className="text-red-400 text-xs">{errors.name.message}</p>}
        </div>
        <div>
          <label htmlFor="description" className="block text-sm">Descripción</label>
          <textarea id="description" className="w-full rounded bg-slate-700 p-2" {...register("description")} />
          {errors.description && <p className="text-red-400 text-xs">{errors.description.message}</p>}
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded bg-slate-700 px-3 py-1">Cancelar</button>
          <button type="submit" disabled={create.isPending} className="rounded bg-indigo-600 px-3 py-1 font-semibold disabled:opacity-50">
            Crear
          </button>
        </div>
      </form>
    </div>
  );
}
