import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Plus, Edit, UserCheck, UserX, Bike, ClipboardCheck, ShieldCheck, Crown, Store } from "lucide-react";
import { can } from "@/lib/rbac";
import Link from "next/link";

export const dynamic = "force-dynamic";

// Types explicites — pas de `typeof query[0]`
type BaseUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: string;
  active: boolean;
  isSuperAdmin: boolean | null;
};

type BoutiqueOwnerUser = BaseUser & {
  boutiqueId: string | null;
  boutiqueName: string | null;
  boutiqueDbId: string | null;
};

export default async function EquipePage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; created?: string }>;
}) {
  const session = await auth();
  const sessionRole = (session?.user as any)?.role;
  const sessionIsSuperAdmin = (session?.user as any)?.isSuperAdmin === true;
  if (!can(sessionRole, "VIEW_TEAM")) redirect("/");

  const { success, created } = await searchParams;
  const isAdmin = sessionRole === "ADMIN";

  // Requête 1 : tous les users sauf BOUTIQUE_OWNER
  const users: BaseUser[] = await prisma.user.findMany({
    where: { role: { not: "BOUTIQUE_OWNER" } },
    select: {
      id: true, firstName: true, lastName: true, email: true,
      phone: true, role: true, active: true, isSuperAdmin: true,
    },
    orderBy: [{ active: "desc" }, { firstName: "asc" }],
  });

  // Requête 2 : BOUTIQUE_OWNER avec leur boutique — requête directe, pas d'include
  const rawOwners = await prisma.user.findMany({
    where: { role: "BOUTIQUE_OWNER" },
    select: {
      id: true, firstName: true, lastName: true, email: true,
      phone: true, role: true, active: true, isSuperAdmin: true,
      boutiqueId: true,
    },
    orderBy: [{ active: "desc" }, { firstName: "asc" }],
  });

  // Récupérer les boutiques correspondantes
  const boutiqueIds = rawOwners
    .map((u) => u.boutiqueId)
    .filter((id): id is string => id !== null);

  const boutiquesMap: Record<string, { id: string; name: string }> = {};
  if (boutiqueIds.length > 0) {
    const boutiques = await prisma.boutique.findMany({
      where: { id: { in: boutiqueIds } },
      select: { id: true, name: true },
    });
    boutiques.forEach((b) => { boutiquesMap[b.id] = b; });
  }

  const boutiqueOwners: BoutiqueOwnerUser[] = rawOwners.map((u) => ({
    ...u,
    boutiqueName: u.boutiqueId ? (boutiquesMap[u.boutiqueId]?.name ?? null) : null,
    boutiqueDbId: u.boutiqueId ?? null,
  }));

  const managers = users.filter((u) => u.role === "MANAGER" || u.role === "ADMIN");
  const agents   = users.filter((u) => u.role === "AGENT");
  const livreurs = users.filter((u) => u.role === "LIVREUR");

  const totalMembers = users.length + boutiqueOwners.length;

  const roleColors: Record<string, string> = {
    ADMIN:          "bg-purple-100 text-purple-700",
    MANAGER:        "bg-blue-100 text-blue-700",
    AGENT:          "bg-emerald-100 text-emerald-700",
    LIVREUR:        "bg-amber-100 text-amber-700",
    BOUTIQUE_OWNER: "bg-sky-100 text-sky-700",
  };

  const ROLE_LABEL: Record<string, string> = {
    ADMIN:          "Administrateur",
    MANAGER:        "Superviseur",
    AGENT:          "Agent",
    LIVREUR:        "Livreur",
    BOUTIQUE_OWNER: "Client Boutique",
  };

  function UserCard({ u }: { u: BaseUser }) {
    return (
      <div className={`bg-white border rounded-xl p-4 flex items-start gap-3 transition ${
        u.active ? "border-slate-200" : "border-slate-100 opacity-60"
      }`}>
        <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-base flex-shrink-0 ${
          u.active ? "bg-sky-500" : "bg-slate-400"
        }`}>
          {u.firstName.charAt(0)}{u.lastName.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-slate-800 truncate">{u.firstName} {u.lastName}</span>
            {u.isSuperAdmin && <span title="Super Admin"><Crown className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" /></span>}
            {u.active
              ? <UserCheck className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
              : <UserX    className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />}
          </div>
          <div className="text-xs text-slate-500 truncate">{u.email}</div>
          {u.phone && <div className="text-xs text-slate-400">{u.phone}</div>}
          <div className="mt-1.5">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${roleColors[u.role] ?? "bg-slate-100 text-slate-600"}`}>
              {ROLE_LABEL[u.role] ?? u.role}
            </span>
          </div>
        </div>
        {isAdmin && (!u.isSuperAdmin || sessionIsSuperAdmin) ? (
          <Link href={`/equipe/${u.id}/edit`}
            className="text-slate-400 hover:text-sky-600 transition p-1 rounded hover:bg-slate-100 flex-shrink-0"
            title="Modifier">
            <Edit className="w-4 h-4" />
          </Link>
        ) : isAdmin && u.isSuperAdmin && !sessionIsSuperAdmin ? (
          <span className="p-1 text-yellow-400 flex-shrink-0"><Crown className="w-4 h-4" /></span>
        ) : null}
      </div>
    );
  }

  function BoutiqueOwnerCard({ u }: { u: BoutiqueOwnerUser }) {
    return (
      <div className={`bg-white border rounded-xl p-4 flex items-start gap-3 transition ${
        u.active ? "border-sky-200 bg-sky-50/30" : "border-slate-100 opacity-60"
      }`}>
        <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-base flex-shrink-0 bg-sky-500`}>
          {u.firstName.charAt(0)}{u.lastName.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-slate-800 truncate">{u.firstName} {u.lastName}</span>
            {u.active
              ? <UserCheck className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
              : <UserX    className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />}
          </div>
          <div className="text-xs text-slate-500 truncate">{u.email}</div>
          {u.phone && <div className="text-xs text-slate-400">{u.phone}</div>}
          <div className="mt-1.5 flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-100 text-sky-700">
              Client Boutique
            </span>
            {u.boutiqueDbId && u.boutiqueName ? (
              <Link href={`/boutiques/${u.boutiqueDbId}`}
                className="inline-flex items-center gap-1 text-xs font-medium text-sky-600 hover:text-sky-800 hover:underline">
                <Store className="w-3 h-3" /> {u.boutiqueName}
              </Link>
            ) : (
              <span className="text-xs text-orange-500 font-medium">⚠ Aucune boutique liée</span>
            )}
          </div>
        </div>
        {isAdmin && (
          <Link href={`/equipe/${u.id}/edit`}
            className="text-slate-400 hover:text-sky-600 transition p-1 rounded hover:bg-slate-100 flex-shrink-0"
            title="Modifier">
            <Edit className="w-4 h-4" />
          </Link>
        )}
      </div>
    );
  }

  function Section({ title, icon: Icon, color, users: list }: {
    title: string; icon: any; color: string; users: BaseUser[];
  }) {
    return (
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-base font-bold text-slate-700">{title}</h2>
          <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
            {list.length}
          </span>
        </div>
        {list.length === 0 ? (
          <div className="text-sm text-slate-400 italic pl-2">Aucun membre dans cette catégorie.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {list.map((u) => <UserCard key={u.id} u={u} />)}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Équipe"
        badges={[{ label: `${totalMembers} membres`, color: "bg-slate-700 text-white" }]}
        actions={
          isAdmin || sessionRole === "MANAGER" ? (
            <Link href="/equipe/nouveau"
              className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition">
              <Plus className="w-4 h-4" /> Nouveau membre
            </Link>
          ) : undefined
        }
      />

      <div className="p-6">
        {(success || created) && (
          <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-4 py-3 rounded-xl">
            ✅ {created ? "Collaborateur créé avec succès." : "Collaborateur mis à jour avec succès."}
          </div>
        )}

        <Section title="Superviseurs & Administrateurs" icon={ShieldCheck} color="bg-blue-500"   users={managers} />
        <Section title="Agents de confirmation"          icon={ClipboardCheck} color="bg-emerald-500" users={agents} />
        <Section title="Livreurs"                        icon={Bike}           color="bg-amber-500"  users={livreurs} />

        {/* Section Clients Boutique — requête séparée, typage dédié */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-sky-500">
              <Store className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-base font-bold text-slate-700">Clients Boutique</h2>
            <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              {boutiqueOwners.length}
            </span>
          </div>
          {boutiqueOwners.length === 0 ? (
            <div className="text-sm text-slate-400 italic pl-2">Aucun client boutique enregistré.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {boutiqueOwners.map((u) => <BoutiqueOwnerCard key={u.id} u={u} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
