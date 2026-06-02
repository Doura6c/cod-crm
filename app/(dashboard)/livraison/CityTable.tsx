"use client";

import { useState, useTransition } from "react";
import { MapPin, Edit, Check, X, Trash2, Plus, Loader2 } from "lucide-react";
import { updateCityAction, createCityAction, deleteCityAction } from "./actions";

interface City {
  id: string;
  name: string;
  deliveryFee: number;
  estimatedDays: number;
  active: boolean;
}

function formatGNF(n: number) {
  return new Intl.NumberFormat("fr-FR").format(n) + " GNF";
}

export function CityTable({ cities: initialCities }: { cities: City[] }) {
  const [cities, setCities] = useState<City[]>(initialCities);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // État du formulaire d'édition inline
  const [editValues, setEditValues] = useState({ name: "", deliveryFee: "", estimatedDays: "" });
  const [newValues, setNewValues] = useState({ name: "", deliveryFee: "", estimatedDays: "1" });

  function startEdit(city: City) {
    setEditingId(city.id);
    setEditValues({
      name: city.name,
      deliveryFee: String(city.deliveryFee),
      estimatedDays: String(city.estimatedDays),
    });
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setError(null);
  }

  function handleSaveEdit(city: City) {
    const fd = new FormData();
    fd.set("id", city.id);
    fd.set("name", editValues.name);
    fd.set("deliveryFee", editValues.deliveryFee);
    fd.set("estimatedDays", editValues.estimatedDays);

    startTransition(async () => {
      const result = await updateCityAction(fd);
      if (result.error) {
        setError(result.error);
      } else {
        setCities((prev) =>
          prev.map((c) =>
            c.id === city.id
              ? {
                  ...c,
                  name: editValues.name,
                  deliveryFee: parseFloat(editValues.deliveryFee) || 0,
                  estimatedDays: parseInt(editValues.estimatedDays) || 1,
                }
              : c
          )
        );
        setEditingId(null);
        setError(null);
      }
    });
  }

  function handleCreate() {
    const fd = new FormData();
    fd.set("name", newValues.name);
    fd.set("deliveryFee", newValues.deliveryFee);
    fd.set("estimatedDays", newValues.estimatedDays);

    startTransition(async () => {
      const result = await createCityAction(fd);
      if (result.error) {
        setError(result.error);
      } else {
        setShowNewForm(false);
        setNewValues({ name: "", deliveryFee: "", estimatedDays: "1" });
        setError(null);
        // Refresh la page pour récupérer le nouvel ID
        window.location.reload();
      }
    });
  }

  function handleDelete(id: string, name: string) {
    if (!confirm(`Supprimer la ville "${name}" ?`)) return;
    startTransition(async () => {
      const result = await deleteCityAction(id);
      if (result.error) {
        setError(result.error);
      } else {
        setCities((prev) => prev.filter((c) => c.id !== id));
        setError(null);
      }
    });
  }

  return (
    <div>
      {error && (
        <div className="mb-3 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5 rounded-lg flex items-center gap-2">
          <X className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Ville</th>
              <th className="px-4 py-3 text-right font-semibold">Frais livraison</th>
              <th className="px-4 py-3 text-center font-semibold">Délai</th>
              <th className="px-4 py-3 text-center font-semibold w-28">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {cities.map((c) =>
              editingId === c.id ? (
                /* ─── Ligne édition ─── */
                <tr key={c.id} className="bg-sky-50/60">
                  <td className="px-3 py-2">
                    <input
                      value={editValues.name}
                      onChange={(e) => setEditValues((v) => ({ ...v, name: e.target.value }))}
                      className="input text-sm py-1.5"
                      placeholder="Nom de la ville"
                      autoFocus
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1 justify-end">
                      <input
                        value={editValues.deliveryFee}
                        onChange={(e) => setEditValues((v) => ({ ...v, deliveryFee: e.target.value }))}
                        className="input text-sm py-1.5 text-right w-28"
                        type="number"
                        min="0"
                        step="1000"
                        placeholder="0"
                      />
                      <span className="text-xs text-slate-500">GNF</span>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1 justify-center">
                      <input
                        value={editValues.estimatedDays}
                        onChange={(e) => setEditValues((v) => ({ ...v, estimatedDays: e.target.value }))}
                        className="input text-sm py-1.5 text-center w-16"
                        type="number"
                        min="1"
                        max="30"
                      />
                      <span className="text-xs text-slate-500">j</span>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleSaveEdit(c)}
                        disabled={isPending}
                        className="p-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition"
                        aria-label="Enregistrer les modifications"
                      >
                        {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <Check className="w-3.5 h-3.5" aria-hidden="true" />}
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-lg transition"
                        aria-label="Annuler les modifications"
                      >
                        <X className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                /* ─── Ligne normale ─── */
                <tr key={c.id} className="hover:bg-slate-50 group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--acc-500)" }} />
                      <span className="font-medium text-slate-800">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-700">
                    {formatGNF(c.deliveryFee)}
                  </td>
                  <td className="px-4 py-3 text-center text-slate-600">{c.estimatedDays}j</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={() => startEdit(c)}
                        className="p-1.5 hover:bg-sky-100 text-sky-600 rounded-lg transition"
                        aria-label="Modifier la ville"
                      >
                        <Edit className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id, c.name)}
                        className="p-1.5 hover:bg-red-100 text-red-500 rounded-lg transition"
                        aria-label="Supprimer la ville"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            )}

            {/* ─── Ligne nouvelle ville ─── */}
            {showNewForm && (
              <tr className="bg-emerald-50/60">
                <td className="px-3 py-2">
                  <input
                    value={newValues.name}
                    onChange={(e) => setNewValues((v) => ({ ...v, name: e.target.value }))}
                    className="input text-sm py-1.5"
                    placeholder="Nom de la ville *"
                    autoFocus
                  />
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1 justify-end">
                    <input
                      value={newValues.deliveryFee}
                      onChange={(e) => setNewValues((v) => ({ ...v, deliveryFee: e.target.value }))}
                      className="input text-sm py-1.5 text-right w-28"
                      type="number"
                      min="0"
                      step="1000"
                      placeholder="70000"
                    />
                    <span className="text-xs text-slate-500">GNF</span>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1 justify-center">
                    <input
                      value={newValues.estimatedDays}
                      onChange={(e) => setNewValues((v) => ({ ...v, estimatedDays: e.target.value }))}
                      className="input text-sm py-1.5 text-center w-16"
                      type="number"
                      min="1"
                    />
                    <span className="text-xs text-slate-500">j</span>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={handleCreate}
                      disabled={isPending || !newValues.name}
                      className="p-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-lg transition"
                      aria-label="Créer la ville"
                    >
                      {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <Check className="w-3.5 h-3.5" aria-hidden="true" />}
                    </button>
                    <button
                      onClick={() => { setShowNewForm(false); setError(null); }}
                      className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-lg transition"
                      aria-label="Annuler"
                    >
                      <X className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </td>
              </tr>
            )}

            {cities.length === 0 && !showNewForm && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">Aucune ville configurée.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Bouton ajouter ville */}
      {!showNewForm && (
        <button
          onClick={() => { setShowNewForm(true); setError(null); }}
          className="mt-3 w-full flex items-center justify-center gap-2 border-2 border-dashed border-slate-300 hover:border-slate-400 text-slate-500 hover:text-slate-700 py-2.5 rounded-xl text-sm font-medium transition"
        >
          <Plus className="w-4 h-4" /> Ajouter une ville
        </button>
      )}
    </div>
  );
}
