/**
 * Helpers de filtrage par période — réutilisé dans /commandes/liste, /statistiques, /performance
 */

export type PeriodKey = "all" | "today" | "yesterday" | "week" | "month" | "lastmonth" | "day" | "custom";

export interface PeriodRange {
  start?: Date;
  end?: Date;
  label: string;
}

export function getPeriodRange(period: string = "month", from?: string, to?: string, day?: string): PeriodRange {
  const now = new Date();

  if (period === "today") {
    const s = new Date(now); s.setHours(0, 0, 0, 0);
    return { start: s, end: now, label: "Aujourd'hui" };
  }
  if (period === "yesterday") {
    const s = new Date(now); s.setDate(now.getDate() - 1); s.setHours(0, 0, 0, 0);
    const e = new Date(s); e.setHours(23, 59, 59, 999);
    return { start: s, end: e, label: "Hier" };
  }
  if (period === "week") {
    const s = new Date(now); s.setDate(now.getDate() - 7); s.setHours(0, 0, 0, 0);
    return { start: s, end: now, label: "7 derniers jours" };
  }
  if (period === "month") {
    const s = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start: s, end: now, label: "Ce mois" };
  }
  if (period === "lastmonth") {
    const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const e = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    return { start: s, end: e, label: "Mois dernier" };
  }
  if (period === "day" && day) {
    const s = new Date(day + "T00:00:00");
    const e = new Date(day + "T23:59:59");
    return { start: s, end: e, label: `Le ${new Date(day).toLocaleDateString("fr-FR")}` };
  }
  if (period === "custom" && (from || to)) {
    const s = from ? new Date(from + "T00:00:00") : undefined;
    const e = to ? new Date(to + "T23:59:59") : undefined;
    const labelF = from ? new Date(from).toLocaleDateString("fr-FR") : "…";
    const labelT = to ? new Date(to).toLocaleDateString("fr-FR") : "…";
    return { start: s, end: e, label: `Du ${labelF} au ${labelT}` };
  }
  return { label: "Toutes périodes" };
}

export const PERIOD_OPTIONS = [
  { key: "all",       label: "Toutes" },
  { key: "today",     label: "Aujourd'hui" },
  { key: "yesterday", label: "Hier" },
  { key: "week",      label: "7 jours" },
  { key: "month",     label: "Ce mois" },
  { key: "lastmonth", label: "Mois dernier" },
  { key: "day",       label: "Jour précis" },
  { key: "custom",    label: "Personnalisé" },
] as const;
