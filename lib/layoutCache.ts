/**
 * Cache des données de layout (compteurs sidebar).
 * Utilise unstable_cache de Next.js pour éviter des requêtes DB
 * à chaque navigation. Revalidation toutes les 30 secondes.
 *
 * Les actions critiques appellent revalidateTag("sidebar-counts")
 * pour invalider immédiatement le cache.
 */
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

type SidebarCounts = {
  confirmCount: number;
  attenteCount: number;
  totalCount: number;
  livraisonCount: number;
  notifCount: number;
  crmIsActive: boolean;
  pendingRequestCount: number;
};

async function fetchSidebarCounts(userId: string, userRole: string): Promise<SidebarCounts> {
  const isAgentOnly = userRole === "AGENT";
  const isLivreur   = userRole === "LIVREUR";
  const isAdmin     = userRole === "ADMIN";

  const [confirmCount, attenteCount, totalCount, livraisonCount, notifCount, crmSetting, pendingRequestCount] =
    await Promise.all([
      prisma.order.count({
        where: {
          status: "NOUVEAU",
          ...(isAgentOnly ? { assignedAgentId: userId } : {}),
        },
      }),
      prisma.order.count({ where: { status: "CONFIRME" } }),
      prisma.order.count({
        where: isAgentOnly ? { assignedAgentId: userId } : {},
      }),
      isLivreur || isAdmin || userRole === "MANAGER"
        ? prisma.delivery.count({
            where: {
              status: "ASSIGNED",
              ...(isLivreur ? { livreurId: userId } : {}),
            },
          })
        : Promise.resolve(0),
      isAdmin
        ? prisma.notification.count({ where: { readAt: null } })
        : Promise.resolve(0),
      isAdmin
        ? prisma.setting.findUnique({ where: { key: "crm_active" } })
        : Promise.resolve(null),
      isAdmin
        ? (prisma as any).teamRequest.count({ where: { status: "PENDING" } })
        : Promise.resolve(0),
    ]);

  return {
    confirmCount,
    attenteCount,
    totalCount,
    livraisonCount,
    notifCount,
    crmIsActive: crmSetting?.value !== "false",
    pendingRequestCount: pendingRequestCount as number,
  };
}

/**
 * Retourne les compteurs mis en cache pour un utilisateur.
 * Crée un cache unique par (userId + userRole).
 */
export function getSidebarCounts(userId: string, userRole: string) {
  return unstable_cache(
    () => fetchSidebarCounts(userId, userRole),
    [`sidebar-${userId}-${userRole}`],
    {
      revalidate: 30,
      tags: ["sidebar-counts", `sidebar-user-${userId}`],
    }
  )();
}
