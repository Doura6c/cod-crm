import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Sidebar } from "@/components/Sidebar";
import { Providers } from "@/app/providers";
import { prisma } from "@/lib/prisma";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session || !session.user) {
    redirect("/login");
  }

  const userRole = (session.user as any).role as string | undefined;
  const userId = (session.user as any).id as string | undefined;
  const isSuperAdmin = (session.user as any).isSuperAdmin === true;
  const isAdmin = userRole === "ADMIN";
  const isAgentOnly = userRole === "AGENT";
  const isLivreur = userRole === "LIVREUR";

  // Vérifier si le CRM est suspendu (sauf pour les admins)
  if (!isAdmin) {
    const crmSetting = await prisma.setting.findUnique({ where: { key: "crm_active" } });
    if (crmSetting?.value === "false") {
      // CRM suspendu — afficher page maintenance
      return (
        <Providers>
          <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-10 max-w-md w-full text-center shadow-2xl">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🔒</span>
              </div>
              <h1 className="text-xl font-bold text-white mb-2">CRM Temporairement Suspendu</h1>
              <p className="text-slate-400 text-sm mb-6">
                L'accès au CRM est actuellement désactivé par l'administrateur.
                Veuillez contacter votre responsable.
              </p>
              <div className="bg-slate-900 rounded-xl px-4 py-3 text-xs text-slate-500">
                HelpMeProcess · COD Manager
              </div>
            </div>
          </div>
        </Providers>
      );
    }
  }

  const currentUser = userId ? await prisma.user.findUnique({ where: { id: userId }, select: { avatarUrl: true } }) : null;

  const [confirmCount, attenteCount, totalCount, livraisonCount, notifCount, crmSetting] = await Promise.all([
    prisma.order.count({
      where: {
        status: "NOUVEAU",
        ...(isAgentOnly && userId ? { assignedAgentId: userId } : {}),
      },
    }),
    prisma.order.count({ where: { status: "CONFIRME" } }),
    prisma.order.count({
      where: isAgentOnly && userId ? { assignedAgentId: userId } : {},
    }),
    (userRole === "LIVREUR" || userRole === "ADMIN" || userRole === "MANAGER")
      ? prisma.delivery.count({
          where: {
            status: "ASSIGNED",
            ...(isLivreur && userId ? { livreurId: userId } : {}),
          },
        })
      : Promise.resolve(0),
    userRole === "ADMIN"
      ? prisma.notification.count({ where: { readAt: null } })
      : Promise.resolve(0),
    isAdmin
      ? prisma.setting.findUnique({ where: { key: "crm_active" } })
      : Promise.resolve(null),
  ]);

  const crmIsActive = crmSetting?.value !== "false";

  return (
    <Providers>
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar
          userName={session.user.name || "Utilisateur"}
          userRole={userRole}
          isSuperAdmin={isSuperAdmin}
          avatarUrl={currentUser?.avatarUrl}
          crmIsActive={crmIsActive}
          counts={{ confirmation: confirmCount, attente: attenteCount, commandes: totalCount, livraisons: livraisonCount }}
          notificationCount={notifCount}
        />
        <div className="flex-1 ml-64 flex flex-col min-h-screen">
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </Providers>
  );
}
