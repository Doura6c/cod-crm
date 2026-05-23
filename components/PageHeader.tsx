interface PageHeaderProps {
  title: string;
  badges?: Array<{ label: string; color?: string }>;
  actions?: React.ReactNode;
}

export function PageHeader({ title, badges = [], actions }: PageHeaderProps) {
  return (
    <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-bold tracking-wide text-slate-800 uppercase">{title}</h1>
        {badges.map((b, i) => (
          <span
            key={i}
            className={`text-xs font-bold px-2.5 py-1 rounded ${b.color ?? "bg-red-500 text-white"}`}
          >
            {b.label}
          </span>
        ))}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
