import { prisma } from "./prisma";

export const SETTINGS_KEYS = {
  HMP_COMMISSION: "hmp_commission",   // commission par commande livrée (GNF)
  AGENT_PRIME:    "agent_prime",      // prime agent confirmation / produit livré
  LIVREUR_PRIME:  "livreur_prime",    // prime livreur / produit livré
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

/** Prime agent confirmation par produit livré (défaut: 8000 GNF) */
export async function getAgentPrime(): Promise<number> {
  const val = await getSetting(SETTINGS_KEYS.AGENT_PRIME, "8000");
  const parsed = parseFloat(val);
  return isNaN(parsed) || parsed < 0 ? 8000 : parsed;
}

/** Prime livreur par produit livré (défaut: 5000 GNF) */
export async function getLivreurPrime(): Promise<number> {
  const val = await getSetting(SETTINGS_KEYS.LIVREUR_PRIME, "5000");
  const parsed = parseFloat(val);
  return isNaN(parsed) || parsed < 0 ? 5000 : parsed;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}
