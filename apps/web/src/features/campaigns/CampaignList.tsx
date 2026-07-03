import { Link } from "react-router-dom";
import { useCampaigns } from "./hooks";

export function CampaignList() {
  const { data, isLoading, isError, error } = useCampaigns();

  if (isLoading) return <p className="text-slate-400">Cargando campañas…</p>;
  if (isError)
    return <p className="text-red-400">{(error as Error).message}</p>;
  if (!data || data.length === 0)
    return <p className="text-slate-400">Aún no tienes campañas.</p>;

  return (
    <ul className="mt-4 space-y-2">
      {data.map((c) => (
        <li key={c.id}>
          <Link
            to={`/campaigns/${c.id}`}
            className="block rounded bg-slate-800 p-4 hover:bg-slate-700"
          >
            <span className="font-semibold">{c.name}</span>
            {c.description && (
              <span className="block text-sm text-slate-400">{c.description}</span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
