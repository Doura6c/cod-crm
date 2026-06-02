"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, X, ShoppingBag, User, Loader2 } from "lucide-react";

type SearchResult = {
  orders: Array<{ id: string; code: string; status: string; customer: { fullName: string; phone: string }; boutique: { name: string } }>;
  customers: Array<{ id: string; fullName: string; phone: string; city?: { name: string } | null }>;
};

const STATUS_COLORS: Record<string, string> = {
  NOUVEAU: "bg-slate-200 text-slate-700",
  CONFIRME: "bg-emerald-100 text-emerald-700",
  REPORTE: "bg-sky-100 text-sky-700",
  ANNULE: "bg-red-100 text-red-700",
  LIVRE: "bg-green-100 text-green-700",
  EN_LIVRAISON: "bg-blue-100 text-blue-700",
  PDR: "bg-amber-100 text-amber-700",
  INJOIGNABLE: "bg-slate-200 text-slate-600",
};

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (query.length < 2) { setResults(null); setOpen(false); return; }

    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data);
        setOpen(true);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    }, 350);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query]);

  const total = (results?.orders.length ?? 0) + (results?.customers.length ?? 0);

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results && setOpen(true)}
          placeholder="Rechercher commande, client, téléphone..."
          className="w-full pl-9 pr-8 py-2.5 text-sm border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:border-transparent"
          style={{ "--tw-ring-color": "var(--acc-400)" } as any}
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />}
        {!loading && query && (
          <button onClick={() => { setQuery(""); setResults(null); setOpen(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            aria-label="Effacer la recherche">
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Dropdown résultats */}
      {open && results && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-2xl shadow-xl z-50 overflow-hidden max-h-[420px] overflow-y-auto">
          {total === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-500">Aucun résultat pour &quot;{query}&quot;</div>
          ) : (
            <>
              {/* Commandes */}
              {results.orders.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700 flex items-center gap-1.5">
                    <ShoppingBag className="w-3 h-3" /> Commandes ({results.orders.length})
                  </div>
                  {results.orders.map((o) => (
                    <button key={o.id} onClick={() => { router.push(`/commandes/${o.id}`); setOpen(false); setQuery(""); }}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition text-left">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-600 dark:text-slate-300">{o.code}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[o.status] ?? "bg-slate-100 text-slate-600"}`}>{o.status}</span>
                        </div>
                        <div className="text-sm font-semibold text-slate-800 dark:text-white mt-0.5">{o.customer.fullName}</div>
                        <div className="text-xs text-slate-500">{o.customer.phone} · {o.boutique.name}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Clients */}
              {results.customers.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700 flex items-center gap-1.5">
                    <User className="w-3 h-3" /> Clients ({results.customers.length})
                  </div>
                  {results.customers.map((c) => (
                    <button key={c.id} onClick={() => { router.push(`/clients?q=${encodeURIComponent(c.phone)}`); setOpen(false); setQuery(""); }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition text-left">
                      <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-sky-600" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-800 dark:text-white">{c.fullName}</div>
                        <div className="text-xs text-slate-500">{c.phone}{c.city ? ` · ${c.city.name}` : ""}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
