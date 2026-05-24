import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { ArrowLeft, UserPlus, UserMinus, Clock, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";
import { DemandesClient } from "./DemandesClient";

export const dynamic = "force-dynamic";

export default async function DemandesPage() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (role !== "ADMIN") redirect("/equipe");

  const requests = await (prisma as any).teamRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: { requestedBy: { select: { firstName: true, lastName: true, role: true } } },
  });

  const pending  = requests.filter((r: any) => r.status === "PENDING");
  const treated  = requests.filter((r: any) => r.status !== "PENDING");

  return (
    <div>
      <PageHeader
        title="Demandes de l'équipe"
        badges={[
          pending.length > 0
            ? { label: `${pending.length} en attente`, color: "bg-amber-500 text-white" }
            : { label: "Aucune demande en attente", color: "bg-slate-200 text-slate-600" },
        ]}
        actions={
          <Link href="/equipe" className="inline-flex items-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium">
            <ArrowLeft className="w-4 h-4" /> Équipe
          </Link>
        }
      />
      <div className="p-6 max-w-3xl space-y-8">
        {/* ─── En attente ─── */}
        <section>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" /> En attente de validation
          </h2>
          {pending.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-6 py-8 text-center text-slate-400 text-sm">
              ✅ Aucune demande en attente.
            </div>
          ) : (
            <div className="space-y-3">
              {pending.map((req: any) => (
                <RequestCard key={req.id} req={req} />
              ))}
            </div>
          )}
        </section>

        {/* ─── Traitées ─── */}
        {treated.length > 0 && (
          <section>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" /> Demandes traitées
            </h2>
            <div className="space-y-3">
              {treated.slice(0, 20).map((req: any) => (
                <RequestCard key={req.id} req={req} readOnly />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function RequestCard({ req, readOnly = false }: { req: any; readOnly?: boolean }) {
  const isCreate = req.type === "CREATE_AGENT";
  const data = req.requestData ? JSON.parse(req.requestData) : null;
  const date = new Date(req.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className={`bg-white dark:bg-slate-800 border rounded-xl overflow-hidden ${
      req.status === "PENDING" ? "border-amber-200 dark:border-amber-700/50" :
      req.status === "APPROVED" ? "border-emerald-200 dark:border-emerald-700/50" :
      "border-red-200 dark:border-red-700/50"
    }`}>
      <div className="px-5 py-4">
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
            isCreate ? "bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400" : "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400"
          }`}>
            {isCreate ? <UserPlus className="w-4 h-4" /> : <UserMinus className="w-4 h-4" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-slate-800 dark:text-white text-sm">
                {isCreate ? "Créer un agent" : "Désactiver un agent"}
              </span>
              <StatusBadge status={req.status} />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Demandé par <strong>{req.requestedBy.firstName} {req.requestedBy.lastName}</strong> · {date}
            </p>

            {/* Détails */}
            <div className="mt-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg px-3 py-2 text-xs text-slate-600 dark:text-slate-400 space-y-0.5">
              {isCreate && data ? (
                <>
                  <div><span className="text-slate-400">Nom :</span> <strong>{data.firstName} {data.lastName}</strong></div>
                  <div><span className="text-slate-400">Email :</span> {data.email}</div>
                  {data.phone && <div><span className="text-slate-400">Tél :</span> {data.phone}</div>}
                </>
              ) : (
                <div><span className="text-slate-400">Agent ciblé :</span> <strong>{req.targetName ?? req.targetUserId}</strong></div>
              )}
            </div>

            {req.adminNote && (
              <p className="mt-2 text-xs text-red-600 dark:text-red-400 italic">Note admin : {req.adminNote}</p>
            )}
          </div>
        </div>
      </div>

      {/* Actions (pending only) */}
      {!readOnly && req.status === "PENDING" && (
        <DemandesClient requestId={req.id} />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "PENDING")  return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">En attente</span>;
  if (status === "APPROVED") return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">✅ Approuvée</span>;
  return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400">❌ Rejetée</span>;
}
