import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Plus, Edit, UserCheck, UserX } from "lucide-react";
import { can } from "@/lib/rbac";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function EquipePage() {
  const session = await auth();
  if (!can((session?.user as any)?.role, "VIEW_TEAM")) redirect("/");
  const users = await prisma.user.findMany({
    orderBy: [{ active: "desc" }, { role: "asc" }, { firstName: "asc" }],
  });

  const roleColors: Record<string, string> = {
    ADMIN: "bg-purple-100 text-purple-700",
    MANAGER: "bg-blue-100 text-blue-700",
    AGENT: "bg-emerald-100 text-emerald-700",
    LIVREUR: "bg-amber-100 text-amber-700",
  };

  return (
    <div>
      <PageHeader
        title="Équipe"
        badges={[{ label: `${users.length} membres`, color: "bg-slate-700 text-white" }]}
        actions={
          <Link
            href="/equipe/nouveau"
            className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> Nouveau membre
          </Link>
        }
      />
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((u) => (
            <div key={u.id} className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-sky-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {u.firstName.charAt(0)}{u.lastName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-semibold text-slate-800 truncate">
                      {u.firstName} {u.lastName}
                    </div>
                    {u.active ? (
                      <UserCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    ) : (
                      <UserX className="w-4 h-4 text-red-500 flex-shrink-0" />
                    )}
                  </div>
                  <div className="text-xs text-slate-500 truncate">{u.email}</div>
                  {u.phone && <div className="text-xs text-slate-500">{u.phone}</div>}
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`badge ${roleColors[u.role] ?? "bg-slate-100 text-slate-700"}`}>
                      {u.role}
                    </span>
                  </div>
                </div>
                <button className="text-slate-400 hover:text-sky-600">
                  <Edit className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
