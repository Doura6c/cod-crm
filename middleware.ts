import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  // Exclure : API, assets statiques, page suivi publique
  matcher: ["/((?!api|_next/static|_next/image|suivi|.*\\.(?:png|jpg|jpeg|svg|ico)$).*)"],
};
