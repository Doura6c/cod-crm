import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Sidebar } from "@/components/Sidebar";
import { prisma } from "@/lib/prisma";
import { getSidebarCounts } from "@/lib/layoutCache";
import { GlobalSearch } from "@/components/GlobalSearch";

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

  // Les BOUTIQUE_OWNER ont leur propre portail
  if (userRole === "BOUTIQUE_OWNER") {
    redirect("/mon-espace");
  }
  const isAgentOnly = userRole === "AGENT";
  const isLivreur = userRole === "LIVREUR";

  // ── Sécurité : vérifier que le compte est toujours actif en base ──
  // Le JWT peut rester valide même si un admin désactive le compte
  if (userId) {
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { active: true },
    });
    if (!dbUser || !dbUser.active) {
      redirect("/login");
    }
  }

  // Vérifier si le CRM est suspendu (sauf pour les admins)
  if (!isAdmin) {
    const crmSetting = await prisma.setting.findUnique({ where: { key: "crm_active" } });
    if (crmSetting?.value === "false") {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-10 max-w-md w-full text-center shadow-2xl">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🔒</span>
            </div>
            <h1 className="text-xl font-bold text-white mb-2">CRM Temporairement Suspendu</h1>
            <p className="text-slate-400 text-sm mb-6">
              L&apos;accès au CRM est actuellement désactivé par l&apos;administrateur.
              Veuillez contacter votre responsable.
            </p>
            <div className="bg-slate-900 rounded-xl px-4 py-3 text-xs text-slate-500">
              HelpMeProcess · COD Manager
            </div>
          </div>
        </div>
      );
    }
  }

  // Récupérer l'avatar et les compteurs sidebar en parallèle (compteurs mis en cache 30s)
  const [currentUser, counts] = await Promise.all([
    userId ? prisma.user.findUnique({ where: { id: userId }, select: { avatarUrl: true } }) : Promise.resolve(null),
    userId && userRole ? getSidebarCounts(userId, userRole) : Promise.resolve({
      confirmCount: 0, attenteCount: 0, totalCount: 0, livraisonCount: 0,
      notifCount: 0, crmIsActive: true, pendingRequestCount: 0,
    }),
  ]);

  const { confirmCount, attenteCount, totalCount, livraisonCount, notifCount, crmIsActive, pendingRequestCount } = counts;

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
      <Sidebar
        userName={session.user.name || "Utilisateur"}
        userRole={userRole}
        isSuperAdmin={isSuperAdmin}
        avatarUrl={currentUser?.avatarUrl}
        crmIsActive={crmIsActive}
        counts={{ confirmation: confirmCount, attente: attenteCount, commandes: totalCount, livraisons: livraisonCount }}
        notificationCount={notifCount}
        pendingRequestCount={pendingRequestCount as number}
      />
      {/* lg:ml-64 : sur desktop on décale le contenu ; sur mobile la sidebar est un overlay */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen min-w-0">
        {/* Topbar desktop + mobile avec recherche globale */}
        <div className="sticky top-0 z-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex-shrink-0 flex items-center gap-3 px-4 py-2.5 shadow-sm">
          {/* Espace hamburger mobile */}
          <div className="lg:hidden w-10 flex-shrink-0" />
          <div className="flex-1">
            <GlobalSearch />
          </div>
        </div>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
