/**
 * Utilitaires de validation et sanitisation des entrées utilisateur.
 * Utilisé dans toutes les Server Actions pour prévenir injections et abus.
 */

/** Nettoie une chaîne : trim + suppression caractères de contrôle */
export function clean(value: unknown, maxLen = 500): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // ctrl chars
    .trim()
    .slice(0, maxLen);
}

/** Valide un email format basique */
export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

/** Valide qu'un rôle est dans la liste autorisée */
const VALID_ROLES = ["ADMIN", "MANAGER", "AGENT", "LIVREUR"];
export function isValidRole(role: string): boolean {
  return VALID_ROLES.includes(role);
}

/** Valide un nombre flottant positif */
export function parsePositiveFloat(value: unknown): number | null {
  const n = parseFloat(String(value ?? ""));
  return isFinite(n) && n >= 0 ? n : null;
}

/** Valide un entier positif */
export function parsePositiveInt(value: unknown): number | null {
  const n = parseInt(String(value ?? ""), 10);
  return isFinite(n) && n >= 0 ? n : null;
}

/** Erreur de validation structurée */
export class ValidationError extends Error {
  constructor(
    public readonly code: string,
    message?: string
  ) {
    super(message ?? code);
    this.name = "ValidationError";
  }
}
