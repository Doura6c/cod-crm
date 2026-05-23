import { PageHeader } from "@/components/PageHeader";

export default function ParametresPage() {
  return (
    <div>
      <PageHeader title="Paramètres" />
      <div className="p-6">
        <div className="bg-white border border-slate-200 rounded-lg p-6 max-w-2xl">
          <h2 className="text-lg font-semibold mb-4">Paramètres généraux</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nom de l&apos;entreprise</label>
              <input className="input" defaultValue="HelpMeProcess COD" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Devise</label>
              <select className="input">
                <option>GNF — Franc guinéen</option>
                <option>XOF — Franc CFA</option>
                <option>EUR — Euro</option>
                <option>USD — Dollar</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fuseau horaire</label>
              <input className="input" defaultValue="Africa/Conakry" />
            </div>
            <button className="bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded font-medium">
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
