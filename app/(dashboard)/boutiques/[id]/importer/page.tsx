import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ImporterClient from "./ImporterClient";

export const dynamic = "force-dynamic";

export default async function ImporterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = (session.user as any).role;
  if (!["ADMIN", "MANAGER"].includes(role)) redirect("/boutiques");

  const { id } = await params;
  const boutique = await prisma.boutique.findUnique({ where: { id } });
  if (!boutique) notFound();

  return (
    <div>
      <PageHeader
        title={`Import catalogue — ${boutique.name}`}
        badges={[{ label: "Étape 2 / 3", color: "bg-sky-500 text-white" }]}
        actions={
          <Link href="/boutiques" className="inline-flex items-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded text-sm font-medium">
            <ArrowLeft className="w-4 h-4" /> Boutiques
          </Link>
        }
      />

      {/* Stepper */}
      <div className="px-6 pt-4 pb-2">
        <div className="flex items-center gap-0 max-w-3xl">
          {[
            { n: 1, label: "Boutique & Stratégie", done: true, active: false },
            { n: 2, label: "Catalogue produits", done: false, active: true },
            { n: 3, label: "Webhook & Go Live", done: false, active: false },
          ].map((s, i) => (
            <div key={s.n} className="flex items-center flex-1">
              <div className={`flex items-center gap-2 ${s.active ? "text-sky-600" : s.done ? "text-emerald-600" : "text-slate-400"}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  s.active ? "bg-sky-500 text-white" : s.done ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"
                }`}>
                  {s.done ? "✓" : s.n}
                </div>
                <span className="text-xs font-medium hidden sm:block">{s.label}</span>
              </div>
              {i < 2 && <div className="flex-1 h-px bg-slate-200 mx-2" />}
            </div>
          ))}
        </div>
      </div>

      <div className="p-6 max-w-4xl">
        <ImporterClient boutiqueId={boutique.id} boutiqueName={boutique.name} />
      </div>
    </div>
  );
}
