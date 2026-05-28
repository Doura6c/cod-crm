"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { BarChart3, Package, ClipboardList, LogOut, ExternalLink, Store } from "lucide-react";

interface Props {
  userName: string;
  boutiqueName: string;
  boutiqueId: string;
  isActive: boolean;
  isAdmin?: boolean;
}

export default function BoutiquePortalNav({
  userName,
  boutiqueName,
  boutiqueId,
  isActive,
  isAdmin = false,
}: Props) {
  const pathname = usePathname();

  const links = [
    { href: "/mon-espace",            label: "Tableau de bord", icon: BarChart3 },
    { href: "/mon-espace/commandes",  label: "Commandes",       icon: ClipboardList },
    { href: "/mon-espace/stock",      label: "Stock",           icon: Package },
  ];

  return (
    <header className="bg-[#0f172a] text-white shadow-lg sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center gap-4 h-16">
          {/* Logo + Nom boutique */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <Store className="w-5 h-5 text-white" />
            </div>
            <div className="leading-tight hidden sm:block">
              <div className="font-bold text-sm text-white">{boutiqueName}</div>
              <div className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wide">
                {isActive ? "● Actif" : "● Inactif"}
              </div>
            </div>
          </div>

          {/* Nav links */}
          <nav className="flex items-center gap-1 flex-1">
            {links.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition ${
                    active
                      ? "bg-white/15 text-white"
                      : "text-blue-200 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon className="w-4 h-4 hidden sm:block" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {isAdmin && (
              <Link
                href={`/boutiques/${boutiqueId}`}
                className="hidden sm:flex items-center gap-1.5 text-xs text-amber-300 hover:text-amber-200 border border-amber-500/30 px-2.5 py-1.5 rounded-lg transition"
                title="Vue admin de cette boutique"
              >
                <ExternalLink className="w-3 h-3" /> Vue Admin
              </Link>
            )}
            <div className="text-xs text-slate-400 hidden md:block">{userName}</div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-1.5 text-blue-200 hover:text-white text-sm px-2 py-1.5 rounded-lg hover:bg-white/10 transition"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
