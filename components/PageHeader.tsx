interface PageHeaderProps {
  title: string;
  badges?: Array<{ label: string; color?: string }>;
  actions?: React.ReactNode;
}

export function PageHeader({ title, badges = [], actions }: PageHeaderProps) {
  return (
    <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 lg:px-6 py-4 flex items-start lg:items-center justify-between gap-3 flex-wrap">
      {/* Espace pour le bouton hamburger sur mobile */}
      <div className="flex items-center gap-3 flex-wrap flex-1 min-w-0">
        <div className="lg:hidden w-10 flex-shrink-0" /> {/* placeholder hamburger */}
        <h1 className="text-lg lg:text-xl font-bold tracking-wide text-slate-800 dark:text-white uppercase truncate">
          {title}
        </h1>
        {badges.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {badges.map((b, i) => (
              <span
                key={i}
                className={`text-xs font-bold px-2.5 py-1 rounded-full ${b.color ?? "bg-red-500 text-white"}`}
              >
                {b.label}
              </span>
            ))}
          </div>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-wrap">{actions}</div>
      )}
    </div>
  );
}
