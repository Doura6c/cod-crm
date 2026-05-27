"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Package, Phone } from "lucide-react";

export default function SuiviPage() {
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setError("");

    // Chercher par code commande ou numéro de téléphone
    const res = await fetch(`/api/suivi?q=${encodeURIComponent(q)}`);
    const data = await res.json();

    if (data.orderId) {
      router.push(`/suivi/${data.orderId}`);
    } else {
      setError("Aucune commande trouvée. Vérifiez le code ou le numéro de téléphone.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-600 via-blue-700 to-indigo-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo + titre */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-white rounded-2xl shadow-xl mx-auto mb-4 overflow-hidden">
            <img src="/logo.jpeg" alt="HelpMeProcess" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-3xl font-black text-white">Suivi de commande</h1>
          <p className="text-sky-200 mt-2 text-sm">
            Entrez votre code de commande ou numéro de téléphone
          </p>
        </div>

        {/* Formulaire */}
        <div className="bg-white rounded-3xl shadow-2xl p-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Code commande ou téléphone
              </label>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ex: HMP-2024-XXXX ou 224621..."
                  className="w-full pl-11 pr-4 py-3.5 border-2 border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:border-sky-500 transition text-base"
                  autoFocus
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
                <span>⚠️</span> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!query.trim()}
              className="w-full bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl text-base transition shadow-lg shadow-sky-200 active:scale-95"
            >
              Rechercher ma commande
            </button>
          </form>

          {/* Aide */}
          <div className="mt-6 pt-5 border-t border-slate-100 space-y-3">
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Comment trouver votre commande ?</p>
            <div className="flex items-start gap-3 text-sm text-slate-600">
              <Package className="w-4 h-4 text-sky-500 flex-shrink-0 mt-0.5" />
              <span>Le <strong>code commande</strong> vous a été envoyé lors de votre achat (ex: HMP-2024-ABCD)</span>
            </div>
            <div className="flex items-start gap-3 text-sm text-slate-600">
              <Phone className="w-4 h-4 text-sky-500 flex-shrink-0 mt-0.5" />
              <span>Ou entrez le <strong>numéro de téléphone</strong> utilisé lors de la commande</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sky-300 text-xs mt-6">
          Powered by HelpMeProcess COD Manager
        </p>
      </div>
    </div>
  );
}
