"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import {
  BarChart3,
  Users,
  Bike,
  UserCircle,
  Package,
  ClipboardList,
  Receipt,
  FileText,
  Settings,
  LogOut,
  ChevronDown,
  ChevronRight,
  Truck,
} from "lucide-react";

interface SidebarProps {
  userName: string;
  userRole?: string;
  counts?: { confirmation?: number; attente?: number; commandes?: number; livraisons?: number };
}

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Administrateur",
  MANAGER: "Superviseur",
  AGENT: "Agent",
  LIVREUR: "Livreur",
};

function hasAccess(role: string | undefined, allowed: string[]): boolean {
  if (!role) return false;
  return allowed.includes(role);
}

type NavItem = {
  href: string;
  label: string;
  icon?: any;
  badge?: number;
  children?: NavItem[];
  roles?: string[]; // si défini, seuls ces rôles peuvent voir cet item
};

export function Sidebar({ userName, userRole, counts = {} }: SidebarProps) {
  const pathname = usePathname();
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    commandes: true,
  });

  const allItems: NavItem[] = [
    { href: "/", label: "Statistiques", icon: BarChart3, roles: ["ADMIN", "MANAGER"] },
    { href: "/equipe", label: "Équipe", icon: Users, roles: ["ADMIN", "MANAGER"] },
    { href: "/livraison", label: "Paramètres Livraison", icon: Bike, roles: ["ADMIN", "MANAGER"] },
    { href: "/clients", label: "Clients", icon: UserCircle, roles: ["ADMIN", "MANAGER", "AGENT"] },
    { href: "/produits", label: "Produits et stock", icon: Package, roles: ["ADMIN", "MANAGER"] },
    {
      href: "/commandes",
      label: "Commandes",
      icon: ClipboardList,
      roles: ["ADMIN", "MANAGER", "AGENT"],
      children: [
        { href: "/commandes/confirmation", label: "Confirmation", icon: ClipboardList, badge: counts.confirmation },
        { href: "/commandes/attente", label: "En attente validation", icon: ClipboardList, badge: counts.attente, roles: ["ADMIN", "MANAGER"] },
        { href: "/commandes/annule", label: "Annulé-terminé", icon: ClipboardList },
        { href: "/commandes/liste", label: "Commandes", icon: ClipboardList, badge: counts.commandes, roles: ["ADMIN", "MANAGER"] },
      ],
    },
    { href: "/livraisons", label: "Livraisons", icon: Truck, badge: counts.livraisons, roles: ["ADMIN", "MANAGER", "LIVREUR"] },
    {
      href: "/factures",
      label: "Factures",
      icon: Receipt,
      roles: ["ADMIN", "MANAGER"],
      children: [
        { href: "/factures", label: "Factures COD (clients)" },
        { href: "/factures/marchands", label: "Factures marchands" },
        { href: "/depenses", label: "Dépenses" },
      ],
    },
    { href: "/boutiques", label: "Boutiques", icon: FileText, roles: ["ADMIN", "MANAGER"] },
    { href: "/parametres", label: "Paramètres", icon: Settings, roles: ["ADMIN"] },
  ];

  const navItems = allItems
    .filter((item) => !item.roles || hasAccess(userRole, item.roles))
    .map((item) => ({
      ...item,
      children: item.children?.filter((c) => !c.roles || hasAccess(userRole, c.roles)),
    }));

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const toggleMenu = (key: string) => setOpenMenus((s) => ({ ...s, [key]: !s[key] }));

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-[#0f172a] text-white flex flex-col z-50 shadow-2xl">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10 flex items-center gap-3">
        <div className="w-11 h-11 bg-white rounded-xl overflow-hidden flex-shrink-0 shadow-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.jpeg" alt="HelpMeProcess" className="object-cover w-full h-full" />
        </div>
        <div className="leading-tight">
          <div className="font-bold text-sm text-white">HelpMeProcess</div>
          <div className="text-xs text-sky-400 font-semibold">COD Manager</div>
        </div>
      </div>

      <nav className="flex-1 py-4 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          const hasChildren = item.children && item.children.length > 0;
          const menuKey = item.href.replace(/\//g, "_") || "root";
          const isOpen = openMenus[menuKey.replace("_", "")] || openMenus["commandes"];

          if (hasChildren) {
            return (
              <div key={item.href}>
                <button
                  onClick={() => toggleMenu("commandes")}
                  className={`w-full flex items-center gap-3 px-5 py-2.5 text-sm transition ${
                    active ? "bg-white/10 font-medium" : "text-blue-100 hover:bg-white/5"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="flex-1 text-left font-semibold">{item.label}</span>
                  {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                {isOpen && (
                  <div className="bg-black/10">
                    {item.children!.map((child) => {
                      const childActive = pathname === child.href;
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={`flex items-center justify-between pl-12 pr-5 py-2 text-sm transition ${
                            childActive
                              ? "text-white border-l-4 border-sky-400 bg-white/5"
                              : "text-blue-200 hover:text-white hover:bg-white/5 border-l-4 border-transparent"
                          }`}
                        >
                          <span>{child.label}</span>
                          {child.badge !== undefined && child.badge > 0 && (
                            <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded">
                              {child.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-5 py-2.5 text-sm transition ${
                active
                  ? "bg-white/10 text-white font-medium border-l-4 border-sky-400"
                  : "text-blue-100 hover:bg-white/5 border-l-4 border-transparent"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="flex-1">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 bg-sky-500 rounded-full flex items-center justify-center font-bold text-sm">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate">{userName}</div>
            <div className="text-xs text-blue-200">{userRole ? ROLE_LABEL[userRole] ?? userRole : "Utilisateur"}</div>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-100 hover:text-white hover:bg-white/10 rounded transition"
        >
          <LogOut className="w-4 h-4" />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
