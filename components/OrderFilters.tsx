"use client";

import { Search } from "lucide-react";

export function OrderFilters({
  boutiques = [],
  cities = [],
  agents = [],
}: {
  boutiques?: { id: string; name: string }[];
  cities?: { id: string; name: string }[];
  agents?: { id: string; name: string }[];
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4">
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="relative">
          <input type="text" placeholder="Mot clé" className="input pr-10" />
          <button className="absolute right-1 top-1/2 -translate-y-1/2 bg-sky-500 hover:bg-sky-600 text-white p-1.5 rounded">
            <Search className="w-3.5 h-3.5" />
          </button>
        </div>
        <select className="input">
          <option>Choisissez un employé</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
        <select className="input">
          <option>Choisissez une boutique</option>
          {boutiques.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        <select className="input">
          <option>Choisissez une ville</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select className="input">
          <option>Choisissez un produit</option>
        </select>
        <select className="input">
          <option>Statut</option>
          <option value="NOUVEAU">Nouveau</option>
          <option value="REPORTE">Reporté</option>
          <option value="CONFIRME">Confirmé</option>
          <option value="ANNULE">Annulé</option>
        </select>
        <input type="text" placeholder="Nombre d'appels" className="input" />
        <input type="date" className="input" />
        <input type="date" className="input" />
      </div>
    </div>
  );
}
