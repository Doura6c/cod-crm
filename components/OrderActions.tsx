"use client";

import { Suspense } from "react";
import { Plus, Download, Upload } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AssignBar } from "./AssignBar";

type Agent = { id: string; name: string };

const btn =
  "inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white font-medium px-4 py-2 rounded text-sm transition";

function ExportButton() {
  const searchParams = useSearchParams();
  const qs = searchParams.toString();
  const href = `/api/export/orders${qs ? `?${qs}` : ""}`;
  return (
    <a href={href} className={btn}>
      <Download className="w-4 h-4" />
      Exporter
    </a>
  );
}

export function OrderActions({ agents = [], canAssign = false }: { agents?: Agent[]; canAssign?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <Link href="/commandes/nouvelle" className={`${btn} shadow-sm`}>
        <Plus className="w-4 h-4" />
        Nouvelle commande
      </Link>
      {canAssign && (
        <>
          <Suspense fallback={<span className={btn}><Download className="w-4 h-4" />Exporter</span>}>
            <ExportButton />
          </Suspense>
          <Link href="/commandes/import" className={btn}>
            <Upload className="w-4 h-4" />
            Importer
          </Link>
          <AssignBar agents={agents} />
        </>
      )}
    </div>
  );
}
