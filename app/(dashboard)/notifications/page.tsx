import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { formatDate } from "@/lib/utils";
import { Bell, CheckCheck, AlertCircle } from "lucide-react";
import { markAllReadAction, markOneReadAction } from "./actions";

export const dynamic = "force-dynamic";

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  AMOUNT_EDITED: { label: "Montant modifié", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
};

export default async function NotificationsPage() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (role !== "ADMIN") redirect("/");

  const notifications = await prisma.notification.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return (
    <div>
      <PageHeader
        title="Notifications"
        badges={unreadCount > 0 ? [{ label: `${unreadCount} non lue${unreadCount > 1 ? "s" : ""}`, color: "bg-red-500 text-white" }] : []}
        actions={
          unreadCount > 0 ? (
            <form action={markAllReadAction}>
              <button
                type="submit"
                className="inline-flex items-center gap-2 bg-slate-700 hover:bg-slate-800 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
              >
                <CheckCheck className="w-4 h-4" /> Tout marquer comme lu
              </button>
            </form>
          ) : null
        }
      />

      <div className="p-6 max-w-3xl space-y-3">
        {notifications.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Bell className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm font-medium">Aucune notification</p>
          </div>
        )}

        {notifications.map((notif) => {
          const cfg = TYPE_CONFIG[notif.type] ?? { label: notif.type, color: "text-slate-700", bg: "bg-slate-50 border-slate-200" };
          const isUnread = !notif.readAt;
          return (
            <div
              key={notif.id}
              className={`border rounded-xl p-4 flex items-start gap-4 transition ${cfg.bg} ${isUnread ? "shadow-sm" : "opacity-70"}`}
            >
              <div className={`flex-shrink-0 mt-0.5 ${cfg.color}`}>
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-bold uppercase tracking-wide ${cfg.color}`}>{cfg.label}</span>
                  {isUnread && <span className="w-2 h-2 bg-red-500 rounded-full" />}
                  <span className="text-xs text-slate-400 ml-auto">{formatDate(notif.createdAt)}</span>
                </div>
                <div className="font-semibold text-slate-800 text-sm mb-1">{notif.title}</div>
                <div className="text-sm text-slate-600 leading-relaxed">{notif.message}</div>
              </div>
              {isUnread && (
                <form action={markOneReadAction} className="flex-shrink-0">
                  <input type="hidden" name="id" value={notif.id} />
                  <button
                    type="submit"
                    className="text-xs text-slate-400 hover:text-slate-600 transition whitespace-nowrap"
                    title="Marquer comme lu"
                  >
                    <CheckCheck className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
