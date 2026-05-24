/**
 * Skeleton de chargement global pour toutes les pages du dashboard.
 * Affiché pendant que les Server Components chargent.
 */
export default function DashboardLoading() {
  return (
    <div className="p-6 animate-pulse">
      {/* Titre de page */}
      <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded-xl w-48 mb-6" />

      {/* Cards de stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-3" />
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-700">
          <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-32" />
        </div>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-slate-50 dark:border-slate-700/50 last:border-0">
            <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded flex-1" />
            <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded w-24" />
            <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded w-16" />
            <div className="h-6 bg-slate-200 dark:bg-slate-600 rounded-full w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
