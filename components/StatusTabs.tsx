"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

type Tab = { key: string; label: string; count: number; color: string };

export function StatusTabs({ tabs }: { tabs: Tab[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get("status") ?? tabs[0]?.key;

  return (
    <div className="flex flex-wrap items-center gap-2 mb-3">
      {tabs.map((tab) => {
        const isActive = current === tab.key;
        return (
          <Link
            key={tab.key}
            href={`${pathname}?status=${tab.key}`}
            className={`px-4 py-1.5 rounded-md text-sm font-semibold transition ${
              isActive ? tab.color : "bg-slate-200 text-slate-700 hover:bg-slate-300"
            }`}
          >
            {tab.label} ({tab.count})
          </Link>
        );
      })}
      <div className="ml-auto flex items-center gap-2 text-sm">
        <button className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-100 inline-flex items-center gap-1">
          Publiés
        </button>
        <button className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-100 inline-flex items-center gap-1">
          Corbeille
        </button>
      </div>
    </div>
  );
}
