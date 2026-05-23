import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { formatGNF, formatDate } from "@/lib/utils";
import { can } from "@/lib/rbac";
import { Receipt, TrendingUp, Clock, CheckCircle, XCircle, Search, Printer } from "lucide-react";
import Link from "next/link";
import { FacturesTable } from "./FacturesTable";

export const dynamic = "force-dynamic";

const STATUS_TABS = [
  { key: "all",     label: "Toutes" },
  { key: "PAYEE",   label: "Payées" },
  { key: "EMISE",   label: "Émises" },
  { key: "ANNULEE", label: "Annulées" },
];

export default async function FacturesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; boutiqueId?: string }>;
}) {
  const session = await auth();
  if (!can((session?.user as any)?.role, "VIEW_INVOICES")) redirect("/");

  const { status = "all", q = "", boutiqueId = "" } = await searchParams;

  const where: Record<string, unknown> = {};
  if (status !== "all") where.status = status;
  if (boutiqueId) where.order = { boutiqueId };
  if (q) {
    (where as any).OR = [
      { reference: { contains: q } },
      { order: { code: { contains: q } } },
      { order: { customer: { fullName: { contains: q } } } },
    ];
  }

  const [invoices, boutiques, allStats] = await Promise.all([
    prisma.invoice.findMany({
      where: where as any,
      include: {
        order: {
          include: {
            customer: true,
            boutique: true,
            city: true,
            items: { include: { product: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.boutique.findMany({ select: { id: true, name: true } }),
    prisma.invoice.groupBy({
      by: ["status"],
      _count: { id: true },
      _sum: { total: true },
    }),
  ]);

  const totalAll    = allStats.reduce((s, r) => s + (r._sum.total ?? 0), 0);
  const totalPaid   = allStats.find((r) => r.status === "PAYEE")?._sum.total ?? 0;
  const totalPending = allStats.find((r) => r.status === "EMISE")?._sum.total ?? 0;
  const countAll    = allStats.reduce((s, r) => s + r._count.id, 0);
  const countPaid   = allStats.find((r) => r.status === "PAYEE")?._count.id ?? 0;
  const countPending = allStats.find((r) => r.status === "EMISE")?._count.id ?? 0;

  const countMap: Record<string, number> = { all: countAll };
  allStats.forEach((r) => { countMap[r.status] = r._count.id; });

  function buildHref(params: Record<string, string>) {
    const base = { status, q, boutiqueId, ...params };
    const qs = Object.entries(base)
      .filter(([, v]) => v && v !== "all")
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join("&");
    return `/factures${qs ? `?${qs}` : ""}`;
  }

  return (
    <div>
      <PageHeader
        title="Factures"
        badges={[
          { label: `${countAll} factures`, color: "bg-slate-700 text-white" },
          { label: `${countPaid} payées`, color: "bg-emerald-600 text-white" },
        ]}
        actions={
          <Link
            href="/depenses"
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded text-sm font-medium"
          >
            <Receipt className="w-4 h-4" /> Dépenses
          </Link>
        }
      />

      <div className="p-6 space-y-5">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                <Receipt className="w-4 h-4 text-slate-600" />
              </div>
              <div className="text-xs text-slate-500 uppercase font-semibold">Total facturé</div>
            </div>
            <div className="text-xl font-black text-slate-800">{formatGNF(totalAll)}</div>
            <div className="text-xs text-slate-400 mt-1">{countAll} facture{countAll > 1 ? "s" : ""}</div>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-xs text-emerald-700 uppercase font-semibold">Encaissé</div>
            </div>
            <div className="text-xl font-black text-emerald-600">{formatGNF(totalPaid)}</div>
            <div className="text-xs text-emerald-500 mt-1">
              {totalAll > 0 ? Math.round((totalPaid / totalAll) * 100) : 0}% · {countPaid} facture{countPaid > 1 ? "s" : ""}
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-xs text-amber-700 uppercase font-semibold">En attente</div>
            </div>
            <div className="text-xl font-black text-amber-600">{formatGNF(totalPending)}</div>
            <div className="text-xs text-amber-500 mt-1">{countPending} facture{countPending > 1 ? "s" : ""}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-sky-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-sky-600" />
              </div>
              <div className="text-xs text-slate-500 uppercase font-semibold">Taux encaissement</div>
            </div>
            <div className="text-3xl font-black text-sky-600">
              {totalAll > 0 ? Math.round((totalPaid / totalAll) * 100) : 0}%
            </div>
            <div className="text-xs text-slate-400 mt-1">des montants collectés</div>
          </div>
        </div>

        {/* Filter bar */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <form method="GET" action="/factures" className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <input
                name="q"
                defaultValue={q}
                type="text"
                placeholder="Référence, commande, client…"
                className="input pr-8 text-sm w-full"
              />
              <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            </div>
            <select name="boutiqueId" defaultValue={boutiqueId} className="input text-sm">
              <option value="">Toutes les boutiques</option>
              {boutiques.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <button type="submit" className="bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
              Filtrer
            </button>
            {(q || boutiqueId) && (
              <Link href="/factures" className="text-slate-500 hover:text-slate-700 text-sm">
                ✕ Réinitialiser
              </Link>
            )}
          </form>
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {STATUS_TABS.map((tab) => {
            const cnt = countMap[tab.key] ?? 0;
            const active = status === tab.key;
            return (
              <Link
                key={tab.key}
                href={buildHref({ status: tab.key })}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition ${
                  active
                    ? "bg-slate-800 text-white shadow"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {tab.label}
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>
                  {cnt}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Table */}
        <FacturesTable invoices={invoices as any} />
      </div>
    </div>
  );
}
