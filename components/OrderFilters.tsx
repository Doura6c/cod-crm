"use client";

import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef } from "react";

export function OrderFilters({
  boutiques = [],
  cities = [],
  agents = [],
  basePath = "",
  currentFilters = {},
}: {
  boutiques?: { id: string; name: string }[];
  cities?: { id: string; name: string }[];
  agents?: { id: string; name: string }[];
  basePath?: string;
  currentFilters?: {
    q?: string;
    boutiqueId?: string;
    agentId?: string;
    city?: string;
    status?: string;
  };
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const hasFilters = !!(
    currentFilters.q ||
    currentFilters.boutiqueId ||
    currentFilters.agentId ||
    currentFilters.city ||
    currentFilters.status
  );

  const action = basePath || (typeof window !== "undefined" ? window.location.pathname : "");

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
      <form ref={formRef} method="GET" action={action}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Recherche texte */}
          <div className="relative">
            <input
              type="text"
              name="q"
              defaultValue={currentFilters.q ?? ""}
              placeholder="Code, client, téléphone…"
              className="input pr-10 text-sm"
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* Filtre boutique (client) */}
          <select
            name="boutiqueId"
            defaultValue={currentFilters.boutiqueId ?? ""}
            className="input text-sm"
          >
            <option value="">🏪 Toutes les boutiques</option>
            {boutiques.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          {/* Filtre agent */}
          <select
            name="agentId"
            defaultValue={currentFilters.agentId ?? ""}
            className="input text-sm"
          >
            <option value="">👤 Tous les agents</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>

          {/* Filtre ville */}
          <select
            name="city"
            defaultValue={currentFilters.city ?? ""}
            className="input text-sm"
          >
            <option value="">📍 Toutes les villes</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold px-3 py-2 rounded-lg transition"
            >
              Filtrer
            </button>
            {hasFilters && (
              <a
                href={action}
                className="flex items-center justify-center px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm rounded-lg transition"
                title="Réinitialiser"
              >
                <X className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>

        {/* Badge filtres actifs */}
        {hasFilters && (
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100">
            <span className="text-xs text-slate-500 font-medium self-center">Filtres actifs :</span>
            {currentFilters.boutiqueId && (
              <span className="inline-flex items-center gap-1 bg-sky-50 border border-sky-200 text-sky-700 text-xs px-2.5 py-1 rounded-full font-semibold">
                🏪 {boutiques.find((b) => b.id === currentFilters.boutiqueId)?.name ?? currentFilters.boutiqueId}
              </span>
            )}
            {currentFilters.q && (
              <span className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 text-slate-700 text-xs px-2.5 py-1 rounded-full font-semibold">
                🔍 "{currentFilters.q}"
              </span>
            )}
            {currentFilters.agentId && (
              <span className="inline-flex items-center gap-1 bg-purple-50 border border-purple-200 text-purple-700 text-xs px-2.5 py-1 rounded-full font-semibold">
                👤 {agents.find((a) => a.id === currentFilters.agentId)?.name ?? currentFilters.agentId}
              </span>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
