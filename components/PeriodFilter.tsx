"use client";

import { Clock } from "lucide-react";
import Link from "next/link";
import { PERIOD_OPTIONS } from "@/lib/period";

interface Props {
  /** URL de base (sans query string) */
  basePath: string;
  /** Période courante */
  period: string;
  /** Pour personnalisé */
  from?: string;
  to?: string;
  /** Pour jour précis */
  day?: string;
  /** Paramètres à conserver dans l'URL (status, q, etc.) */
  extraParams?: Record<string, string>;
}

export function PeriodFilter({ basePath, period, from = "", to = "", day = "", extraParams = {} }: Props) {
  function buildHref(p: string) {
    const params = { ...extraParams, period: p };
    const qs = Object.entries(params)
      .filter(([, v]) => v && v !== "all")
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join("&");
    return `${basePath}${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-slate-500 uppercase mr-2 flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" /> Période :
        </span>
        {PERIOD_OPTIONS.map((p) => (
          <Link
            key={p.key}
            href={buildHref(p.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
              period === p.key
                ? "bg-slate-800 text-white shadow"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {p.label}
          </Link>
        ))}
      </div>

      {/* Jour précis */}
      {period === "day" && (
        <form method="GET" action={basePath} className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
          <input type="hidden" name="period" value="day" />
          {Object.entries(extraParams).map(([k, v]) => (
            v ? <input key={k} type="hidden" name={k} value={v} /> : null
          ))}
          <label className="text-xs font-semibold text-slate-600">Date :</label>
          <input type="date" name="day" defaultValue={day} required className="input text-sm py-1.5" />
          <button type="submit" className="bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold px-4 py-1.5 rounded-lg transition">
            Voir
          </button>
        </form>
      )}

      {/* Personnalisé */}
      {period === "custom" && (
        <form method="GET" action={basePath} className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-100">
          <input type="hidden" name="period" value="custom" />
          {Object.entries(extraParams).map(([k, v]) => (
            v ? <input key={k} type="hidden" name={k} value={v} /> : null
          ))}
          <label className="text-xs font-semibold text-slate-600">Du :</label>
          <input type="date" name="from" defaultValue={from} className="input text-sm py-1.5" />
          <label className="text-xs font-semibold text-slate-600">au :</label>
          <input type="date" name="to" defaultValue={to} className="input text-sm py-1.5" />
          <button type="submit" className="bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold px-4 py-1.5 rounded-lg transition">
            Filtrer
          </button>
        </form>
      )}
    </div>
  );
}
