import { prisma } from "./prisma";

export const SETTINGS_KEYS = {
  HMP_COMMISSION: "hmp_commission",   // commission par commande livrée (GNF)
  COMPANY_NAME:   "company_name",
  CURRENCY:       "currency",
  TIMEZONE:       "timezone",
} as const;

export async function getSetting(key: string, defaultValue = ""): Promise<string> {
  try {
    const s = await prisma.setting.findUnique({ where: { key } });
    return s?.value ?? defaultValue;
  } catch {
    return defaultValue;
  }
}

/** Retourne la commission HMP par commande livrée (défaut: 70 000 GNF) */
export async function getHmpCommission(): Promise<number> {
  const val = await getSetting(SETTINGS_KEYS.HMP_COMMISSION, "70000");
  const parsed = parseFloat(val);
  return isNaN(parsed) || parsed <= 0 ? 70_000 : parsed;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}
