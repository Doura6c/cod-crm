import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { can } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

// Libellés et couleurs lisibles pour chaque résultat d'ingestion.
const OUTCOME_META: Record<string, { label: string; cls: string }> = {
  CREATED:                  { label: "✅ Créée",            cls: "bg-emerald-100 text-emerald-700" },
  DUPLICATE_EXTERNAL_REF:   { label: "♻️ Doublon (réf.)",   cls: "bg-sky-100 text-sky-700" },
  DUPLICATE_ACTIVE_FLAGGED: { label: "⚠️ Doublon signalé", cls: "bg-amber-100 text-amber-700" },
  BLACKLISTED:              { label: "🚫 Blacklist",        cls: "bg-slate-200 text-slate-700" },
  ERROR:                    { label: "❌ Erreur",           cls: "bg-red-100 text-red-700" },
};

function outcomeBadge(outcome: string) {
  const m = OUTCOME_META[outcome] ?? { label: outcome, cls: "bg-slate-100 text-slate-600" };
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${m.cls}`}>{m.label}</span>;
}

export default async function WebhooksPage({
  searchParams,
}: {
  searchParams: Promise<{ outcome?: string; page?: string }>;
}) {
  const session = await auth();
  if (!can((session?.user as any)?.role, "VIEW_STATS")) redirect("/");

  const { outcome = "", page = "1" } = await searchParams;
  const currentPage = Math.max(1, parseInt(page, 10) || 1);

  const whereBase = outcome ? { outcome } : {};

  // Fenêtre 7 jours pour le résumé en haut de page
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [logs, totalFiltered, summary] = await Promise.all([
    prisma.webhookLog.findMany({
      where: whereBase,
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.webhookLog.count({ where: whereBase }),
    prisma.webhookLog.groupBy({
      by: ["outcome"],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
    }),
  ]);

  const countOf = (o: string) => summary.find((s) => s.outcome === o)?._count._all ?? 0;
  const total7d = summary.reduce((acc, s) => acc + s._count._all, 0);
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));

  const buildHref = (patch: Record<string, string>) => {
    const sp = new URLSearchParams();
    if (outcome) sp.set("outcome", outcome);
    sp.set("page", String(currentPage));
    for (const [k, v] of Object.entries(patch)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    return `/webhooks?${sp.toString()}`;
  };

  const cards = [
    { o: "",                         label: "Reçues (7 j)",     value: total7d,                            cls: "border-slate-300" },
    { o: "CREATED",                  label: "Créées",            value: countOf("CREATED"),                 cls: "border-emerald-300" },
    { o: "DUPLICATE_EXTERNAL_REF",   label: "Doublons (réf.)",   value: countOf("DUPLICATE_EXTERNAL_REF"),  cls: "border-sky-300" },
    { o: "DUPLICATE_ACTIVE_FLAGGED", label: "Doublons signalés", value: countOf("DUPLICATE_ACTIVE_FLAGGED"), cls: "border-amber-300" },
    { o: "BLACKLISTED",              label: "Blacklist",         value: countOf("BLACKLISTED"),             cls: "border-slate-300" },
    { o: "ERROR",                    label: "Erreurs",           value: countOf("ERROR"),                   cls: "border-red-300" },
  ];

  return (
    <div>
      <PageHeader
        title="Journal Webhook"
        badges={[{ label: `${totalFiltered} entrées`, color: "bg-slate-700 text-white" }]}
      />
      <div className="p-4 lg:p-6 space-y-5">
        <p className="text-sm text-slate-500 max-w-3xl">
          Trace de chaque commande reçue automatiquement depuis les boutiques (Afrishop, etc.).
          Sert à diagnostiquer les doublons et vérifier que les commandes arrivent bien.
          Les compteurs ci-dessous portent sur les <strong>7 derniers jours</strong>.
        </p>

        {/* Cartes résumé — cliquables pour filtrer */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {cards.map((c) => (
            <Link
              key={c.label}
              href={`/webhooks?${c.o ? `outcome=${c.o}&` : ""}page=1`}
              className={`bg-white border-2 ${c.cls} rounded-xl px-4 py-3 hover:shadow-sm transition ${
                outcome === c.o ? "ring-2 ring-offset-1 ring-slate-400" : ""
              }`}
            >
              <div className="text-2xl font-bold text-slate-800">{c.value}</div>
              <div className="text-xs text-slate-500 font-semibold">{c.label}</div>
            </Link>
          ))}
        </div>

        {/* Tableau */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="text-left font-semibold px-4 py-3">Date</th>
                  <th className="text-left font-semibold px-4 py-3">Boutique</th>
                  <th className="text-left font-semibold px-4 py-3">Résultat</th>
                  <th className="text-left font-semibold px-4 py-3">Réf. externe</th>
                  <th className="text-left font-semibold px-4 py-3">Téléphone</th>
                  <th className="text-left font-semibold px-4 py-3">Commande</th>
                  <th className="text-left font-semibold px-4 py-3">HTTP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                      Aucune entrée pour ce filtre.
                    </td>
                  </tr>
                )}
                {logs.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {new Date(l.createdAt).toLocaleString("fr-FR", {
                        day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{l.boutiqueName ?? "—"}</td>
                    <td className="px-4 py-3">
                      {outcomeBadge(l.outcome)}
                      {l.error && (
                        <div className="text-xs text-red-500 mt-1 max-w-[16rem] truncate" title={l.error}>
                          {l.error}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{l.externalRef ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{l.phone ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{l.orderCode ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{l.statusCode}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm">
              <span className="text-slate-500">
                Page {currentPage} / {totalPages}
              </span>
              <div className="flex gap-2">
                {currentPage > 1 && (
                  <Link
                    href={buildHref({ page: String(currentPage - 1) })}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
                  >
                    ← Précédent
                  </Link>
                )}
                {currentPage < totalPages && (
                  <Link
                    href={buildHref({ page: String(currentPage + 1) })}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
                  >
                    Suivant →
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
