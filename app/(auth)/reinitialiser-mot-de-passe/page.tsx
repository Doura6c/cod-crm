"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { KeyRound, ArrowLeft, CheckCircle2, Eye, EyeOff } from "lucide-react";

function ResetForm() {
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (password !== confirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Une erreur est survenue. Réessayez.");
      } else {
        setDone(true);
      }
    } catch {
      setError("Connexion impossible. Vérifiez votre réseau.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="text-center">
        <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Mot de passe mis à jour</h2>
        <p className="text-slate-500 text-sm">Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
        <Link
          href="/login"
          className="inline-flex items-center justify-center gap-2 w-full mt-6 bg-sky-500 hover:bg-sky-600 text-white font-semibold py-3 px-6 rounded-xl transition"
        >
          Se connecter
        </Link>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="text-center">
        <h2 className="text-xl font-bold text-slate-900 mb-2">Lien invalide</h2>
        <p className="text-slate-500 text-sm">
          Ce lien de réinitialisation est incomplet ou expiré. Demandez-en un nouveau.
        </p>
        <Link
          href="/mot-de-passe-oublie"
          className="inline-flex items-center gap-2 mt-6 text-sm text-sky-600 hover:text-sky-700 font-medium"
        >
          Demander un nouveau lien
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Nouveau mot de passe</h2>
        <p className="text-slate-500 mt-1 text-sm">Choisissez un mot de passe d'au moins 8 caractères.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
            Nouveau mot de passe
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={show ? "text" : "password"}
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 pr-12 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 bg-slate-50 text-sm"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label={show ? "Masquer" : "Afficher"}
            >
              {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="confirm" className="block text-sm font-medium text-slate-700 mb-1.5">
            Confirmer le mot de passe
          </label>
          <input
            id="confirm"
            name="confirm"
            type={show ? "text" : "password"}
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 bg-slate-50 text-sm"
          />
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-sky-500 hover:bg-sky-600 disabled:opacity-60 text-white font-semibold py-3 px-6 rounded-xl transition flex items-center justify-center gap-2 shadow-md shadow-sky-200"
        >
          <KeyRound className="w-5 h-5" />
          {loading ? "Mise à jour…" : "Réinitialiser le mot de passe"}
        </button>
      </form>

      <div className="mt-5 text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour à la connexion
        </Link>
      </div>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-slate-50">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 bg-[#0f172a] rounded-xl overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.jpeg" alt="HelpMeProcess" className="object-cover w-full h-full" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">HelpMeProcess COD</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8">
          <Suspense fallback={<div className="text-center text-slate-400 text-sm py-8">Chargement…</div>}>
            <ResetForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
