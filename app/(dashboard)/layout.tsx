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
  const isAgentOnly = userRole === "AGENT";
  const isLivreur = userRole === "LIVREUR";

  const [confirmCount, attenteCount, totalCount, livraisonCount] = await Promise.all([
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
  ]);

  return (
    <Providers>
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar
          userName={session.user.name || "Utilisateur"}
          userRole={userRole}
          counts={{ confirmation: confirmCount, attente: attenteCount, commandes: totalCount, livraisons: livraisonCount }}
        />
        <div className="flex-1 ml-64 flex flex-col min-h-screen">
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </Providers>
  );
}
