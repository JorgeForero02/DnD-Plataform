import { Link } from "react-router-dom";
import { useCampaigns } from "./hooks";

export function CampaignList() {
  const { data, isLoading, isError, error } = useCampaigns();

  if (isLoading) return <p className="mt-4 text-muted">Cargando campañas…</p>;
  if (isError) return <p className="mt-4 text-danger-text">{(error as Error).message}</p>;
  if (!data || data.length === 0) return <p className="mt-4 text-muted">Aún no tienes campañas.</p>;

  return (
    <ul className="mt-4 space-y-2">
      {data.map((c) => (
        <li key={c.id}>
          <Link
            to={`/campaigns/${c.id}`}
            className="block rounded-radius-sm border border-muted bg-surface p-4 text-text hover:border-accent"
          >
            <span className="font-semibold">{c.name}</span>
            {c.description && (
              <span className="block text-chrome-sm text-muted">{c.description}</span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
