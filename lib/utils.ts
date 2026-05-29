/**
 * Échappe une valeur destinée à être interpolée dans du HTML brut.
 * Indispensable pour neutraliser les XSS stockés (noms clients/produits
 * provenant du webhook ou des imports CSV).
 */
export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function formatGNF(amount: number): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(amount) + " GNF";
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function generateOrderCode(): string {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = now.getFullYear();
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `CMD-${dd}${mm}${yyyy}-${rand}`;
}

export function generateInvoiceReference(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `FACT-${yyyy}${mm}${dd}-${rand}`;
}

export function randomKey(length = 32): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export const ORDER_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  NOUVEAU: { label: "Nouveau", color: "bg-slate-200 text-slate-700" },
  REPORTE: { label: "Reporté", color: "bg-purple-100 text-purple-700" },
  INJOIGNABLE: { label: "Injoignable", color: "bg-orange-100 text-orange-700" },
  PDR: { label: "Pas de réponse", color: "bg-amber-100 text-amber-700" },
  CONFIRME: { label: "Confirmé", color: "bg-blue-100 text-blue-700" },
  ANNULE: { label: "Annulé", color: "bg-red-100 text-red-700" },
  EN_LIVRAISON: { label: "En livraison", color: "bg-cyan-100 text-cyan-700" },
  LIVRE: { label: "Livré", color: "bg-emerald-100 text-emerald-700" },
  RETOURNE: { label: "Retourné", color: "bg-rose-100 text-rose-700" },
};

export function statusBadge(status: string) {
  return ORDER_STATUS_LABELS[status] ?? { label: status, color: "bg-slate-100 text-slate-600" };
}
