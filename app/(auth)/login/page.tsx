import { LogIn } from "lucide-react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { loginAction } from "./actions";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/");

  const { error } = await searchParams;
  const teamImageExists = fs.existsSync(path.join(process.cwd(), "public", "login-bg.jpg")) || fs.existsSync(path.join(process.cwd(), "public", "team.jpg"));

  return (
    <div className="min-h-screen flex">
      {/* Left side — image or branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0f172a] flex-col items-center justify-center p-12 relative overflow-hidden">
        {teamImageExists ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/login-bg.jpg" alt="HelpMeProcess Team" className="absolute inset-0 w-full h-full object-cover opacity-60" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/70 to-transparent" />
            <div className="relative z-10 flex flex-col items-center text-center text-white max-w-md pb-8">
              <div className="w-20 h-20 bg-white rounded-2xl shadow-2xl mb-6 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.jpeg" alt="HelpMeProcess" className="object-cover w-full h-full" />
              </div>
              <h1 className="text-4xl font-bold tracking-tight mb-2 drop-shadow-lg">HelpMeProcess</h1>
              <p className="text-lg text-sky-300 font-semibold drop-shadow">COD Manager</p>
              <p className="text-slate-200 text-sm mt-4 drop-shadow">
                Call Center & Gestion Cash on Delivery — Guinée
              </p>
            </div>
          </>
        ) : (
          <div className="relative z-10 flex flex-col items-center text-center text-white max-w-md">
            <div className="w-24 h-24 bg-white rounded-2xl shadow-2xl mb-8 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.jpeg" alt="HelpMeProcess" className="object-cover w-full h-full" />
            </div>
            <h1 className="text-4xl font-bold mb-2">HelpMeProcess</h1>
            <p className="text-lg text-sky-300 font-semibold mb-6">COD Manager</p>
            <p className="text-slate-300 text-sm">
              Plateforme de gestion des commandes Cash on Delivery
            </p>
          </div>
        )}
      </div>

      {/* Right side — login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-[#0f172a] rounded-xl overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.jpeg" alt="HelpMeProcess" className="object-cover w-full h-full" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">HelpMeProcess COD</h1>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900">Connexion</h2>
              <p className="text-slate-500 mt-1 text-sm">Accédez à votre espace de gestion</p>
            </div>

            {/* Server Action — auth via NextAuth côté serveur, pas de JS requis */}
            <form action={loginAction} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Adresse email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue="admin@codcrm.gn"
                  required
                  autoComplete="username"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 bg-slate-50 text-sm"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Mot de passe
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 bg-slate-50 text-sm"
                />
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100">
                  Email ou mot de passe incorrect.
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-sky-500 hover:bg-sky-600 text-white font-semibold py-3 px-6 rounded-xl transition flex items-center justify-center gap-2 shadow-md shadow-sky-200"
              >
                <LogIn className="w-5 h-5" />
                Se connecter
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-400">
                Compte démo : <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono">admin@codcrm.gn</code> / <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono">password123</code>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
