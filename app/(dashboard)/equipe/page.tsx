import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Plus, Edit, UserCheck, UserX, Bike, ClipboardCheck, ShieldCheck, Crown, Store } from "lucide-react";
import { can } from "@/lib/rbac";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function EquipePage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const session = await auth();
  const sessionRole = (session?.user as any)?.role;
  const sessionIsSuperAdmin = (session?.user as any)?.isSuperAdmin === true;
  if (!can(sessionRole, "VIEW_TEAM")) redirect("/");

  const { success } = await searchParams;
  const isAdmin = sessionRole === "ADMIN";

  const users = await prisma.user.findMany({
    orderBy: [{ active: "desc" }, { firstName: "asc" }],
    include: { ownedBoutique: { select: { id: true, name: true } } },
  });

  const managers = users.filter((u) => u.role === "MANAGER" || u.role === "ADMIN");
  const agents = users.filter((u) => u.role === "AGENT");
  const livreurs = users.filter((u) => u.role === "LIVREUR");
  const boutiqueOwners = users.filter((u) => u.role === "BOUTIQUE_OWNER");

  const roleColors: Record<string, string> = {
    ADMIN: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
    MANAGER: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    AGENT: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    LIVREUR: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    BOUTIQUE_OWNER: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  };

  const ROLE_LABEL: Record<string, string> = {
    ADMIN: "Administrateur",
    MANAGER: "Superviseur",
    AGENT: "Agent",
    LIVREUR: "Livreur",
    BOUTIQUE_OWNER: "Client Boutique",
  };

  type User = (typeof users)[0];

  function UserCard({ u }: { u: User }) {
    return (
      <div
        className={`bg-white dark:bg-slate-800 border rounded-xl p-4 flex items-start gap-3 transition ${
          u.active ? "border-slate-200 dark:border-slate-700" : "border-slate-100 dark:border-slate-800 opacity-60"
        }`}
      >
        <div
          className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-base flex-shrink-0 ${
            u.active ? "bg-sky-500" : "bg-slate-400"
          }`}
        >
          {u.firstName.charAt(0)}{u.lastName.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-slate-800 dark:text-white truncate">
              {u.firstName} {u.lastName}
            </span>
            {u.isSuperAdmin && (
              <span title="Super Administrateur">
                <Crown className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />
              </span>
            )}
            {u.active ? (
              <UserCheck className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
            ) : (
              <UserX className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
            )}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{u.email}</div>
          {u.phone && <div className="text-xs text-slate-400 dark:text-slate-500">{u.phone}</div>}
          <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${roleColors[u.role] ?? "bg-slate-100 text-slate-600"}`}>
              {ROLE_LABEL[u.role] ?? u.role}
            </span>
            {u.role === "BOUTIQUE_OWNER" && (u as any).ownedBoutique && (
              <Link
                href={`/boutiques/${(u as any).ownedBoutique.id}`}
                className="inline-flex items-center gap-1 text-xs text-sky-600 hover:text-sky-800 hover:underline"
              >
                <Store className="w-3 h-3" />
                {(u as any).ownedBoutique.name}
              </Link>
            )}
            {u.role === "BOUTIQUE_OWNER" && !(u as any).ownedBoutique && (
              <span className="text-xs text-slate-400 italic">Aucune boutique liée</span>
            )}
          </div>
        </div>
        {isAdmin && (!u.isSuperAdmin || sessionIsSuperAdmin) ? (
          <Link
            href={`/equipe/${u.id}/edit`}
            className="text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 transition p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 flex-shrink-0"
            title="Modifier"
          >
            <Edit className="w-4 h-4" />
          </Link>
        ) : isAdmin && u.isSuperAdmin && !sessionIsSuperAdmin ? (
          <span title="Compte protégé" className="p-1 text-yellow-400 flex-shrink-0">
            <Crown className="w-4 h-4" />
          </span>
        ) : null}
      </div>
    );
  }

  function Section({
    title,
    icon: Icon,
    color,
    users: list,
  }: {
    title: string;
    icon: any;
    color: string;
    users: User[];
  }) {
    return (
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-base font-bold text-slate-700 dark:text-slate-200">{title}</h2>
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
            {list.length}
          </span>
        </div>
        {list.length === 0 ? (
          <div className="text-sm text-slate-400 dark:text-slate-500 italic pl-2">Aucun membre dans cette catégorie.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {list.map((u) => (
              <UserCard key={u.id} u={u} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Équipe"
        badges={[{ label: `${users.length} membres`, color: "bg-slate-700 text-white" }]}
        actions={
          isAdmin || sessionRole === "MANAGER" ? (
            <Link
              href="/equipe/nouveau"
              className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition"
            >
              <Plus className="w-4 h-4" /> Nouveau membre
            </Link>
          ) : undefined
        }
      />

      <div className="p-6">
        {success && (
          <div className="mb-6 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 text-sm px-4 py-3 rounded-xl">
            ✅ Collaborateur mis à jour avec succès.
          </div>
        )}

        <Section
          title="Superviseurs & Administrateurs"
          icon={ShieldCheck}
          color="bg-blue-500"
          users={managers}
        />
        <Section
          title="Agents de confirmation"
          icon={ClipboardCheck}
          color="bg-emerald-500"
          users={agents}
        />
        <Section
          title="Livreurs"
          icon={Bike}
          color="bg-amber-500"
          users={livreurs}
        />
        <Section
          title="Clients Boutique"
          icon={Store}
          color="bg-sky-500"
          users={boutiqueOwners}
        />
      </div>
    </div>
  );
}
