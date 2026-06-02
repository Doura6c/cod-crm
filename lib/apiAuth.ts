/**
 * Helpers d'autorisation pour les routes API.
 * Centralise la vérification de session et de rôle afin que chaque endpoint
 * applique le même contrôle d'accès (évite les oublis ponctuels).
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";

export type SessionUser = {
  id: string;
  email?: string;
  role: string;
  isSuperAdmin: boolean;
  boutiqueId: string | null;
  name?: string;
};

/** Récupère l'utilisateur de session typé, ou null si non connecté. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user) return null;
  const u = session.user as any;
  return {
    id: u.id,
    email: session.user.email ?? undefined,
    role: u.role,
    isSuperAdmin: u.isSuperAdmin === true,
    boutiqueId: u.boutiqueId ?? null,
    name: session.user.name ?? undefined,
  };
}

export function unauthorized() {
  return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
}

export function forbidden() {
  return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
}

/**
 * Exige une session valide ET (optionnellement) un rôle parmi `roles`.
 * Retourne soit `{ user }`, soit `{ response }` (à renvoyer tel quel).
 */
export async function requireRole(
  roles?: string[]
): Promise<{ user: SessionUser; response?: never } | { user?: never; response: NextResponse }> {
  const user = await getSessionUser();
  if (!user) return { response: unauthorized() };
  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    return { response: forbidden() };
  }
  return { user };
}
