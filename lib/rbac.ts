export type Role = "ADMIN" | "MANAGER" | "AGENT" | "LIVREUR";

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrateur",
  MANAGER: "Superviseur",
  AGENT: "Agent",
  LIVREUR: "Livreur",
};

/**
 * Permissions par rôle.
 * ADMIN: tout
 * MANAGER: tout sauf gestion des admins + suppression de boutiques
 * AGENT: ses commandes affectées + logger appels
 * LIVREUR: ses livraisons assignées
 */
export const PERMISSIONS = {
  // Navigation
  VIEW_STATS: ["ADMIN", "MANAGER"] as Role[],
  VIEW_TEAM: ["ADMIN", "MANAGER"] as Role[],
  VIEW_DELIVERY_SETTINGS: ["ADMIN", "MANAGER"] as Role[],
  VIEW_CLIENTS: ["ADMIN", "MANAGER", "AGENT"] as Role[],
  VIEW_PRODUCTS: ["ADMIN", "MANAGER"] as Role[],
  VIEW_ORDERS: ["ADMIN", "MANAGER", "AGENT"] as Role[],
  VIEW_INVOICES: ["ADMIN", "MANAGER"] as Role[],
  VIEW_BOUTIQUES: ["ADMIN", "MANAGER"] as Role[],
  VIEW_SETTINGS: ["ADMIN"] as Role[],

  // Actions
  CREATE_BOUTIQUE: ["ADMIN", "MANAGER"] as Role[],
  DELETE_BOUTIQUE: ["ADMIN"] as Role[],
  CREATE_USER: ["ADMIN", "MANAGER"] as Role[],
  CREATE_ADMIN: ["ADMIN"] as Role[],
  ASSIGN_ORDER: ["ADMIN", "MANAGER"] as Role[],
  VALIDATE_ORDER: ["ADMIN", "MANAGER", "AGENT"] as Role[],
  CALL_LOG: ["ADMIN", "MANAGER", "AGENT"] as Role[],
  MANAGE_DELIVERY: ["ADMIN", "MANAGER", "LIVREUR"] as Role[],
  VIEW_ALL_ORDERS: ["ADMIN", "MANAGER"] as Role[],
  VIEW_DELIVERIES: ["ADMIN", "MANAGER", "LIVREUR"] as Role[],
  ASSIGN_DELIVERY: ["ADMIN", "MANAGER"] as Role[],
  UPDATE_DELIVERY_STATUS: ["ADMIN", "MANAGER", "LIVREUR"] as Role[],
} as const;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: string | undefined, permission: Permission): boolean {
  if (!role) return false;
  return (PERMISSIONS[permission] as readonly string[]).includes(role);
}
