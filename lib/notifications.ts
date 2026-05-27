import { prisma } from "./prisma";
import { revalidatePath } from "next/cache";

type NotifPayload = {
  userId?: string | null;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
};

export async function createNotification(payload: NotifPayload) {
  await prisma.notification.create({
    data: {
      userId: payload.userId ?? null,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      data: payload.data ? JSON.stringify(payload.data) : null,
    },
  });
  revalidatePath("/notifications");
}

// Envoyer une notification à tous les utilisateurs ayant l'un des rôles donnés
export async function notifyRole(
  roles: string[],
  payload: Omit<NotifPayload, "userId">
) {
  const users = await prisma.user.findMany({
    where: { role: { in: roles }, active: true },
    select: { id: true },
  });

  if (users.length === 0) return;

  await prisma.notification.createMany({
    data: users.map((u) => ({
      userId: u.id,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      data: payload.data ? JSON.stringify(payload.data) : null,
    })),
  });

  revalidatePath("/notifications");
}
