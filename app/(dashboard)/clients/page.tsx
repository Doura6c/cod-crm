import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { PageHeader } from "@/components/PageHeader";
import { formatGNF } from "@/lib/utils";
import { Phone, MapPin, ShoppingBag, MessageCircle, Ban, CheckCircle, AlertTriangle } from "lucide-react";
import { toggleBlacklistAction } from "./actions";

export const dynamic = "force-dynamic";

function waLink(phone: string) {
  const cleaned = phone.replace(/\D/g, "");
  const intl = cleaned.startsWith("224") ? cleaned : `224${cleaned}`;
  return `https://wa.me/${intl}`;
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; blacklisted?: string }>;
}) {
  const session = await auth();
  const userRole = (session?.user as any)?.role;
  const isAdmin = userRole === "ADMIN" || userRole === "MANAGER";

  const { q = "", blacklisted = "" } = await searchParams;

  const where: any = {};
  if (q) {
    where.OR = [
      { fullName: { contains: q, mode: "insensitive" } },
      { phone: { contains: q } },
    ];
  }
  if (blacklisted === "1") where.blacklisted = true;

  const [customers, blacklistedCount] = await Promise.all([
    prisma.customer.findMany({
      where,
      include: {
        city: true,
        orders: { select: { id: true, totalAmount: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.customer.count({ where: { blacklisted: true } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Clients"
        badges={[
          { label: `${customers.length} clients`, color: "bg-slate-700 text-white" },
          ...(blacklistedCount > 0
            ? [{ label: `⛔ ${blacklistedCount} blacklistés`, color: "bg-red-600 text-white" }]
            : []),
        ]}
      />
      <div className="p-4 lg:p-6">

        {/* Recherche + filtre blacklist */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <form method="GET" className="flex gap-2 flex-1">
            {blacklisted === "1" && <input type="hidden" name="blacklisted" value="1" />}
            <input
              name="q"
              defaultValue={q}
              placeholder="Rechercher par nom ou téléphone..."
              className="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
            />
            <button type="submit" className="px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-sm font-semibold transition">
              Chercher
            </button>
          </form>
          <a
            href={blacklisted === "1" ? "/clients" : "/clients?blacklisted=1"}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${
              blacklisted === "1"
                ? "bg-red-500 text-white"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
            }`}
          >
            <Ban className="w-4 h-4" />
            Blacklistés ({blacklistedCount})
          </a>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Client</th>
                  <th className="px-4 py-3 text-left font-semibold">Contact</th>
                  <th className="px-4 py-3 text-left font-semibold">Ville</th>
                  <th className="px-4 py-3 text-center font-semibold">Commandes</th>
                  <th className="px-4 py-3 text-right font-semibold">Total livré</th>
                  <th className="px-4 py-3 text-center font-semibold">Statut</th>
                  {isAdmin && <th className="px-4 py-3 text-center font-semibold">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((c) => {
                  const livres = c.orders.filter((o) => o.status === "LIVRE");
                  const annules = c.orders.filter((o) => o.status === "ANNULE" || o.status === "RETOURNE");
                  const totalSpent = livres.reduce((s, o) => s + o.totalAmount, 0);
                  const tauxAnnulation = c.orders.length > 0
                    ? Math.round((annules.length / c.orders.length) * 100)
                    : 0;

                  return (
                    <tr key={c.id} className={`hover:bg-slate-50 transition ${c.blacklisted ? "bg-red-50" : ""}`}>

                      {/* Nom */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {c.blacklisted && <Ban className="w-4 h-4 text-red-500 flex-shrink-0" />}
                          <div>
                            <div className={`font-semibold ${c.blacklisted ? "text-red-700" : "text-slate-800"}`}>
                              {c.fullName}
                            </div>
                            {c.blacklisted && c.blacklistReason && (
                              <div className="text-xs text-red-500 mt-0.5">⛔ {c.blacklistReason}</div>
                            )}
                            {tauxAnnulation >= 50 && !c.blacklisted && (
                              <div className="text-xs text-amber-600 flex items-center gap-1 mt-0.5">
                                <AlertTriangle className="w-3 h-3" /> {tauxAnnulation}% annulations
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Contact + WhatsApp */}
                      <td className="px-4 py-3">
                        <a href={`tel:${c.phone}`} className="flex items-center gap-1 text-sky-600 hover:underline font-medium">
                          <Phone className="w-3.5 h-3.5" /> {c.phone}
                        </a>
                        {c.altPhone && <div className="text-xs text-slate-500 mt-0.5">{c.altPhone}</div>}
                        <a href={waLink(c.phone)} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 mt-1 font-medium">
                          <MessageCircle className="w-3 h-3" /> WhatsApp
                        </a>
                      </td>

                      {/* Ville */}
                      <td className="px-4 py-3 text-slate-600">
                        {c.city
                          ? <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-400" />{c.city.name}</span>
                          : "—"}
                        {c.address && <div className="text-xs text-slate-400 truncate max-w-[140px]">{c.address}</div>}
                      </td>

                      {/* Commandes */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center">
                          <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                            <ShoppingBag className="w-3.5 h-3.5 text-sky-500" />{c.orders.length}
                          </span>
                          <span className="text-xs text-emerald-600">{livres.length} livré(s)</span>
                          {annules.length > 0 && <span className="text-xs text-red-500">{annules.length} annulé(s)</span>}
                        </div>
                      </td>

                      {/* Total */}
                      <td className="px-4 py-3 text-right font-semibold text-emerald-700">{formatGNF(totalSpent)}</td>

                      {/* Statut */}
                      <td className="px-4 py-3 text-center">
                        {c.blacklisted ? (
                          <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                            <Ban className="w-3 h-3" /> Blacklisté
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                            <CheckCircle className="w-3 h-3" /> OK
                          </span>
                        )}
                      </td>

                      {/* Action blacklist */}
                      {isAdmin && (
                        <td className="px-4 py-3 text-center">
                          {c.blacklisted ? (
                            <form action={toggleBlacklistAction}>
                              <input type="hidden" name="customerId" value={c.id} />
                              <input type="hidden" name="action" value="unblacklist" />
                              <button type="submit"
                                className="text-xs bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-semibold transition">
                                ✓ Retirer
                              </button>
                            </form>
                          ) : (
                            <form action={toggleBlacklistAction} className="flex flex-col gap-1 items-center">
                              <input type="hidden" name="customerId" value={c.id} />
                              <input type="hidden" name="action" value="blacklist" />
                              <input name="reason" placeholder="Raison..." maxLength={200}
                                className="text-xs border border-slate-200 rounded-lg px-2 py-1 w-28 focus:outline-none focus:border-red-300" />
                              <button type="submit"
                                className="text-xs bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg font-semibold transition w-full">
                                ⛔ Blacklister
                              </button>
                            </form>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
                {customers.length === 0 && (
                  <tr>
                    <td colSpan={isAdmin ? 7 : 6} className="px-4 py-16 text-center text-slate-500">
                      Aucun client trouvé.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
