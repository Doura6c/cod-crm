import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnLogin = nextUrl.pathname === "/login";
      const isPublicApi =
        nextUrl.pathname.startsWith("/api/webhook") ||
        nextUrl.pathname.startsWith("/api/auth");

      if (isPublicApi) return true;
      if (!isLoggedIn && !isOnLogin) return false;
      if (isOnLogin && isLoggedIn) {
        const role = (auth?.user as any)?.role;
        // Rediriger les boutique owners vers leur espace dédié
        if (role === "BOUTIQUE_OWNER") {
          return Response.redirect(new URL("/mon-espace", nextUrl));
        }
        return Response.redirect(new URL("/", nextUrl));
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.isSuperAdmin = (user as any).isSuperAdmin ?? false;
        token.boutiqueId = (user as any).boutiqueId ?? null;
      }
      return token;
    },
    session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id ?? token.sub;
        (session.user as any).role = token.role;
        (session.user as any).isSuperAdmin = token.isSuperAdmin ?? false;
        (session.user as any).boutiqueId = token.boutiqueId ?? null;
      }
      return session;
    },
  },
  providers: [],
};
