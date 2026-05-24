/**
 * Rate limiter en mémoire — protège les endpoints sensibles (login, actions critiques).
 * En production sur Vercel (serverless), chaque instance a son propre état —
 * pour une protection multi-instance, utiliser Upstash Redis.
 * Ici c'est déjà efficace contre les attaques de force brute mono-instance.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const store = new Map<string, Bucket>();

/** Nettoyage périodique des buckets expirés (évite les fuites mémoire) */
function cleanup() {
  const now = Date.now();
  for (const [key, bucket] of store) {
    if (bucket.resetAt < now) store.delete(key);
  }
}

let cleanupTimer: ReturnType<typeof setInterval> | null = null;
function ensureCleanup() {
  if (!cleanupTimer) {
    cleanupTimer = setInterval(cleanup, 60_000); // toutes les minutes
  }
}

/**
 * Vérifie si une clé dépasse la limite autorisée.
 * @param key     Identifiant (ex: IP ou email)
 * @param limit   Nombre max de tentatives
 * @param windowMs Fenêtre de temps en ms (défaut: 15 minutes)
 * @returns true si la limite est dépassée (bloquer la requête)
 */
export function isRateLimited(
  key: string,
  limit: number,
  windowMs = 15 * 60 * 1000
): boolean {
  ensureCleanup();
  const now = Date.now();
  const bucket = store.get(key);

  if (!bucket || bucket.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  bucket.count += 1;
  if (bucket.count > limit) return true;
  return false;
}

/**
 * Réinitialise le compteur d'une clé (ex: après login réussi)
 */
export function resetRateLimit(key: string) {
  store.delete(key);
}
