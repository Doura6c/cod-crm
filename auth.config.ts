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
        return Response.redirect(new URL("/", nextUrl));
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.isSuperAdmin = (user as any).isSuperAdmin ?? false;
      }
      return token;
    },
    session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id ?? token.sub;
        (session.user as any).role = token.role;
        (session.user as any).isSuperAdmin = token.isSuperAdmin ?? false;
      }
      return session;
    },
  },
  providers: [],
};
