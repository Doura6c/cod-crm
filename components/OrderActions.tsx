"use client";

import { Plus, Download, Upload, FileText, QrCode } from "lucide-react";
import Link from "next/link";
import { AssignBar } from "./AssignBar";

type Agent = { id: string; name: string };

export function OrderActions({ agents = [], canAssign = false }: { agents?: Agent[]; canAssign?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <Link href="/commandes/nouvelle" className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white font-medium px-4 py-2 rounded text-sm transition shadow-sm">
        <Plus className="w-4 h-4" />
        Nouvelle commande
      </Link>
      <button className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white font-medium px-4 py-2 rounded text-sm transition">
        <Download className="w-4 h-4" />
        Exporter
      </button>
      <button className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white font-medium px-4 py-2 rounded text-sm transition">
        <Upload className="w-4 h-4" />
        Importer
      </button>
      <button className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white font-medium px-4 py-2 rounded text-sm transition">
        <FileText className="w-4 h-4" />
        Exemplaire
      </button>
      {canAssign && <AssignBar agents={agents} />}
      <button className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white font-medium px-4 py-2 rounded text-sm transition">
        <QrCode className="w-4 h-4" />
        Scan QRCode
      </button>
    </div>
  );
}
