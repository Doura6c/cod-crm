"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { isRateLimited, resetRateLimit } from "@/lib/rateLimit";
import { clean, isEmail } from "@/lib/validate";

export async function loginAction(formData: FormData): Promise<void> {
  const email = clean(formData.get("email"), 254).toLowerCase();
  const password = String(formData.get("password") ?? "").slice(0, 200);

  // Validation basique
  if (!email || !password || !isEmail(email)) {
    redirect("/login?error=1");
  }

  // Rate limiting : max 5 tentatives par email sur 15 minutes
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limitKey = `login:${email}:${ip}`;

  if (isRateLimited(limitKey, 5, 15 * 60 * 1000)) {
    redirect("/login?error=rate_limit");
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      redirect("/login?error=1");
    }
    // re-throw redirect errors (NEXT_REDIRECT)
    throw err;
  }

  // Login réussi — réinitialiser le compteur
  resetRateLimit(limitKey);
  redirect("/");
}
