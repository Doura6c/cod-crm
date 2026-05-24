"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { CrmToggleButton } from "./CrmToggleButton";
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
  Bell,
  Trophy,
} from "lucide-react";

interface SidebarProps {
  userName: string;
  userRole?: string;
  isSuperAdmin?: boolean;
  avatarUrl?: string | null;
  crmIsActive?: boolean;
  counts?: { confirmation?: number; attente?: number; commandes?: number; livraisons?: number };
  notificationCount?: number;
}

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Administrateur",
  MANAGER: "Superviseur",
  AGENT: "Agent",
  LIVREUR: "Livreur",
};

const SUPER_ADMIN_LABEL = "Super Administrateur";

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

export function Sidebar({ userName, userRole, isSuperAdmin = false, avatarUrl, crmIsActive = true, counts = {}, notificationCount = 0 }: SidebarProps) {
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
        { href: "/commandes/liste", label: "Mes commandes", icon: ClipboardList, roles: ["AGENT"] },
        { href: "/commandes/annule", label: "Annulé-terminé", icon: ClipboardList },
        { href: "/commandes/liste", label: "Commandes", icon: ClipboardList, badge: counts.commandes, roles: ["ADMIN", "MANAGER"] },
      ],
    },
    { href: "/livraisons", label: "Livraisons", icon: Truck, badge: counts.livraisons, roles: ["ADMIN", "MANAGER", "LIVREUR"] },
    { href: "/performance", label: "Ma performance", icon: Trophy, roles: ["AGENT", "LIVREUR"] },
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
    { href: "/notifications", label: "Notifications", icon: Bell, badge: notificationCount || undefined, roles: ["ADMIN"] },
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
          <div className="text-xs font-semibold" style={{ color: "var(--acc-400)" }}>COD Manager</div>
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
                              ? "text-white border-l-4 bg-white/5 accent-border-l"
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
                  ? "bg-white/10 text-white font-medium border-l-4 accent-border-l"
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

      {/* Bouton suspension CRM — Admin seulement */}
      {userRole === "ADMIN" && (
        <div className="px-1 pb-1 border-t border-white/10 pt-2">
          {!crmIsActive && (
            <div className="mx-3 mb-2 px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/30 text-xs text-red-300 text-center font-semibold">
              ⚠️ CRM SUSPENDU
            </div>
          )}
          <CrmToggleButton isActive={crmIsActive} />
        </div>
      )}

      <div className="border-t border-white/10 p-4">
        <Link href="/profil" className="flex items-center gap-3 mb-3 hover:bg-white/5 rounded-xl p-2 -mx-2 transition group">
          <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-white/20 transition" style={{ "--tw-ring-color": "var(--acc-400)" } as any}>
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt={userName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-bold text-sm text-white" style={{ backgroundColor: "var(--acc-500)" }}>
                {userName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate transition group-hover:opacity-80">{userName}</div>
            <div className="text-xs flex items-center gap-1" style={{ color: isSuperAdmin ? "var(--acc-400)" : undefined }}>
              {isSuperAdmin ? (
                <><span>👑</span> {SUPER_ADMIN_LABEL}</>
              ) : (
                <span className="text-blue-200">{userRole ? ROLE_LABEL[userRole] ?? userRole : "Utilisateur"}</span>
              )}
            </div>
          </div>
          <span className="text-white/30 text-xs transition group-hover:opacity-100" style={{ color: "var(--acc-400)" }}>✏️</span>
        </Link>
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
