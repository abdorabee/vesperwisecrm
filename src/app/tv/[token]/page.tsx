import { notFound } from "next/navigation";
import { getTvKpis, resolveTvDisplayToken } from "@/lib/queries/tv";
import { TvAutoRefresh } from "./tv-auto-refresh";

export const dynamic = "force-dynamic";

interface TvWallPageProps {
  params: Promise<{ token: string }>;
}

function KpiTile({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-8">
      <span
        className={`text-7xl font-bold tabular-nums ${accent ? "text-lime-300" : "text-white"}`}
      >
        {value}
      </span>
      <span className="text-xl font-medium uppercase tracking-widest text-white/60">
        {label}
      </span>
    </div>
  );
}

export default async function TvWallPage({ params }: TvWallPageProps) {
  const { token } = await params;
  const resolved = await resolveTvDisplayToken(token);

  if (!resolved) {
    notFound();
  }

  const kpis = await getTvKpis(resolved.accountId);

  return (
    <div className="flex min-h-screen flex-col gap-10 bg-zinc-950 p-10 text-white">
      <TvAutoRefresh intervalSeconds={60} />
      <header className="flex items-baseline justify-between">
        <h1 className="text-4xl font-bold">{kpis.accountName}</h1>
        <p className="text-xl text-white/50">
          {resolved.displayName} · updates every 60s
        </p>
      </header>

      <main className="grid flex-1 grid-cols-2 gap-6 xl:grid-cols-3">
        <KpiTile label="Leads today" value={String(kpis.submittedToday)} accent />
        <KpiTile label="Leads · 7 days" value={String(kpis.submittedWeek)} />
        <KpiTile label="Qualified · 7 days" value={String(kpis.qualifiedWeek)} />
        <KpiTile
          label="Qualification rate"
          value={kpis.qualificationRate == null ? "—" : `${kpis.qualificationRate}%`}
        />
        <KpiTile label="Deals won · 30 days" value={String(kpis.wonMonth)} accent />
        <KpiTile label="Leads at risk" value={String(kpis.atRiskCount)} />
      </main>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-8">
        <h2 className="mb-4 text-xl font-medium uppercase tracking-widest text-white/60">
          Top submitters · 7 days
        </h2>
        {kpis.topCallers.length === 0 ? (
          <p className="text-2xl text-white/40">No submissions this week yet.</p>
        ) : (
          <ol className="flex flex-wrap gap-x-12 gap-y-3">
            {kpis.topCallers.map((caller, index) => (
              <li key={caller.name} className="flex items-baseline gap-3">
                <span className="text-2xl text-white/40">#{index + 1}</span>
                <span className="text-3xl font-semibold">{caller.name}</span>
                <span className="text-3xl tabular-nums text-lime-300">
                  {caller.count}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
