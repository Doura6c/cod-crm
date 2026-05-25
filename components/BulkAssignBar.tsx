"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Users, X, CheckSquare } from "lucide-react";

interface Agent {
  id: string;
  firstName: string;
  lastName: string;
}

interface BulkAssignBarProps {
  orderIds: string[];
  agents: Agent[];
  onClear: () => void;
}

export function BulkAssignBar({ orderIds, agents, onClear }: BulkAssignBarProps) {
  const [agentId, setAgentId] = useState("");
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState<string | null>(null);
  const router = useRouter();

  if (orderIds.length === 0) return null;

  const handleAssign = () => {
    startTransition(async () => {
      const res = await fetch("/api/orders/bulk-assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderIds, agentId: agentId || null }),
      });
      const data = await res.json();
      if (data.ok) {
        setDone(`${data.updated} commande(s) réaffectée(s)`);
        setTimeout(() => {
          onClear();
          setDone(null);
          router.refresh();
        }, 1500);
      }
    });
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-white/10 backdrop-blur">
      {done ? (
        <span className="text-emerald-400 font-bold flex items-center gap-2">
          <CheckSquare className="w-5 h-5" /> {done}
        </span>
      ) : (
        <>
          <span className="font-bold text-sky-400">{orderIds.length} sélectionnée{orderIds.length > 1 ? "s" : ""}</span>
          <div className="w-px h-6 bg-white/20" />
          <Users className="w-4 h-4 text-white/60 flex-shrink-0" />
          <select
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
            className="bg-slate-800 border border-white/20 text-white text-sm px-2 py-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 min-w-[140px]"
          >
            <option value="">Désaffecter</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.firstName} {a.lastName}
              </option>
            ))}
          </select>
          <button
            onClick={handleAssign}
            disabled={isPending}
            className="bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white text-sm font-bold px-4 py-1.5 rounded-lg transition"
          >
            {isPending ? "En cours…" : "Affecter"}
          </button>
          <button
            onClick={onClear}
            className="p-1.5 hover:bg-white/10 rounded-lg transition text-white/60 hover:text-white"
            title="Annuler la sélection"
          >
            <X className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  );
}
