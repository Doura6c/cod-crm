"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

export async function loginAction(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

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
    // re-throw redirect errors
    throw err;
  }
  redirect("/");
}
