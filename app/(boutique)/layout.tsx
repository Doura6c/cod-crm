"use server";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import BoutiquePortalNav from "./BoutiquePortalNav";

export default async function BoutiqueLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) redirect("/login");

  const userRole = (session.user as any).role;
  const userId   = (session.user as any).id;
  const boutiqueId = (session.user as any).boutiqueId;

  // Seul BOUTIQUE_OWNER (ou admin en impersonation) peut accéder
  if (userRole !== "BOUTIQUE_OWNER" && userRole !== "ADMIN" && userRole !== "MANAGER") {
    redirect("/");
  }

  // Sécurité : vérifier que le compte est toujours actif en base.
  // Le JWT peut rester valide après désactivation par un admin.
  if (userId) {
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { active: true, role: true },
    });
    if (!dbUser || !dbUser.active) redirect("/login");
    // Si le rôle a changé en base (ex: n'est plus BOUTIQUE_OWNER), on quitte le portail
    if (dbUser.role !== "BOUTIQUE_OWNER" && dbUser.role !== "ADMIN" && dbUser.role !== "MANAGER") {
      redirect("/login");
    }
  }

  // Récupérer la boutique liée
  let boutique: { id: string; name: string; sellerName: string; active: boolean } | null = null;
  if (boutiqueId) {
    boutique = await prisma.boutique.findUnique({
      where: { id: boutiqueId },
      select: { id: true, name: true, sellerName: true, active: true },
    });
  } else if (userRole === "ADMIN" || userRole === "MANAGER") {
    // Admin peut accéder pour visualiser — pas de boutique liée, on continue
  }

  const userName = session.user.name || "Propriétaire";

  return (
    <div className="min-h-screen bg-slate-50">
      <BoutiquePortalNav
        userName={userName}
        boutiqueName={boutique?.name ?? "Mon Espace"}
        boutiqueId={boutique?.id ?? ""}
        isActive={boutique?.active ?? true}
        isAdmin={userRole === "ADMIN" || userRole === "MANAGER"}
      />
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
