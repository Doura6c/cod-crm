import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";
import { prisma } from "./lib/prisma";
import { isRateLimited } from "./lib/rateLimit";

const isProd = process.env.NODE_ENV === "production";

// Intervalle de re-vérification du compte en base (15 min)
const RECHECK_MS = 15 * 60 * 1000;

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  trustHost: true,
  callbacks: {
    // Conserver le callback `authorized` de auth.config (compatibilité Edge/middleware)
    ...authConfig.callbacks,

    // Surcharge du callback JWT avec re-vérification Prisma (Node.js uniquement)
    async jwt({ token, user }) {
      // Enrichissement initial à la connexion
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.isSuperAdmin = (user as any).isSuperAdmin ?? false;
        token.boutiqueId = (user as any).boutiqueId ?? null;
        token.checkedAt = Date.now();
        return token;
      }

      // Re-vérification périodique : compte toujours actif ?
      const checkedAt = (token.checkedAt as number) ?? 0;
      if (Date.now() - checkedAt > RECHECK_MS) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: (token.id ?? token.sub) as string },
            select: { active: true, role: true, isSuperAdmin: true },
          });
          // Compte désactivé ou supprimé → invalider le token (session détruite)
          if (!dbUser || !dbUser.active) return null as any;
          // Synchroniser le rôle si modifié par un admin
          token.role = dbUser.role;
          token.isSuperAdmin = dbUser.isSuperAdmin;
        } catch {
          // Fail-open en cas de coupure BDD temporaire
        }
        token.checkedAt = Date.now();
      }

      return token;
    },
  },
  cookies: {
    sessionToken: {
      name: isProd ? "__Secure-authjs.session-token" : "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProd,
      },
    },
    callbackUrl: {
      name: isProd ? "__Secure-authjs.callback-url" : "authjs.callback-url",
      options: { sameSite: "lax", path: "/", secure: isProd },
    },
    csrfToken: {
      name: isProd ? "__Host-authjs.csrf-token" : "authjs.csrf-token",
      options: { httpOnly: true, sameSite: "lax", path: "/", secure: isProd },
    },
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        // Rate-limit par email (backstop pour les appels directs au callback NextAuth)
        const email = String(credentials.email).toLowerCase();
        if (await isRateLimited(`login:${email}`, 10, 15 * 60 * 1000)) return null;

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.active) return null;

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!isValid) return null;

        return {
          id: user.id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          role: user.role,
          isSuperAdmin: user.isSuperAdmin ?? false,
          boutiqueId: user.boutiqueId ?? null,
        } as any;
      },
    }),
  ],
});
