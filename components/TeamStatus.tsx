type AgentStatus = { id: string; name: string; online: boolean };

export function TeamStatus({ agents }: { agents: AgentStatus[] }) {
  if (agents.length === 0) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4">
      <div className="flex flex-wrap items-center gap-4">
        {agents.map((a) => (
          <div key={a.id} className="flex items-center gap-2">
            <span
              className={`inline-block w-2.5 h-2.5 rounded-full ${
                a.online ? "bg-emerald-500" : "bg-red-500"
              }`}
            />
            <span className="text-sm text-slate-700">{a.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
