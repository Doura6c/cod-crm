"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import { CrmToggleButton } from "./CrmToggleButton";
import {
  BarChart3,
  Users,
  TrendingUp,
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
  Medal,
  Menu,
  X,
} from "lucide-react";

interface SidebarProps {
  userName: string;
  userRole?: string;
  isSuperAdmin?: boolean;
  avatarUrl?: string | null;
  crmIsActive?: boolean;
  counts?: { confirmation?: number; attente?: number; commandes?: number; livraisons?: number };
  notificationCount?: number;
  pendingRequestCount?: number;
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
  roles?: string[];
};

export function Sidebar({
  userName,
  userRole,
  isSuperAdmin = false,
  avatarUrl,
  crmIsActive = true,
  counts = {},
  notificationCount = 0,
  pendingRequestCount = 0,
}: SidebarProps) {
  const pathname = usePathname();
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({ commandes: true });
  const [mobileOpen, setMobileOpen] = useState(false);

  // Fermer le menu mobile au changement de route
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Bloquer le scroll body quand le menu mobile est ouvert
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const allItems: NavItem[] = [
    { href: "/", label: "Statistiques", icon: BarChart3, roles: ["ADMIN", "MANAGER"] },
    { href: "/equipe", label: "Équipe", icon: Users, badge: pendingRequestCount || undefined, roles: ["ADMIN", "MANAGER"] },
    { href: "/livraison", label: "Paramètres Livraison", icon: Bike, roles: ["ADMIN", "MANAGER"] },
    { href: "/clients", label: "Clients", icon: UserCircle, roles: ["ADMIN", "MANAGER", "AGENT"] },
    { href: "/produits", label: "Produits et stock", icon: Package, roles: ["ADMIN", "MANAGER"] },
    {
      href: "/commandes",
      label: "Commandes",
      icon: ClipboardList,
      roles: ["ADMIN", "MANAGER", "AGENT"],
      children: [
        { href: "/commandes/express", label: "⚡ Mode Express Appel", icon: ClipboardList, badge: counts.confirmation },
        { href: "/commandes/confirmation", label: "Liste Confirmation", icon: ClipboardList },
        { href: "/commandes/attente", label: "En attente validation", icon: ClipboardList, badge: counts.attente, roles: ["ADMIN", "MANAGER"] },
        { href: "/commandes/liste", label: "Mes commandes", icon: ClipboardList, roles: ["AGENT"] },
        { href: "/commandes/rappels", label: "Rappels planifiés", icon: ClipboardList },
        { href: "/commandes/annule", label: "Annulé-terminé", icon: ClipboardList },
        { href: "/commandes/import", label: "Import CSV", icon: ClipboardList, roles: ["ADMIN", "MANAGER"] },
        { href: "/commandes/liste", label: "Toutes les commandes", icon: ClipboardList, badge: counts.commandes, roles: ["ADMIN", "MANAGER"] },
      ],
    },
    { href: "/livraisons", label: "Livraisons", icon: Truck, badge: counts.livraisons, roles: ["ADMIN", "MANAGER", "LIVREUR"] },
    { href: "/performance", label: "Ma performance", icon: Trophy, roles: ["AGENT", "LIVREUR"] },
    { href: "/leaderboard", label: "Classement", icon: Medal, roles: ["ADMIN", "MANAGER", "AGENT", "LIVREUR"] },
    { href: "/rapports", label: "Rapport journalier", icon: BarChart3, roles: ["ADMIN", "MANAGER"] },
    { href: "/commissions", label: "Commissions", icon: TrendingUp, roles: ["ADMIN", "MANAGER"] },
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
    { href: "/notifications", label: "Notifications", icon: Bell, badge: notificationCount || undefined, roles: ["ADMIN", "MANAGER", "AGENT", "LIVREUR"] },
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

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10 flex items-center gap-3 flex-shrink-0">
        <div className="w-11 h-11 bg-white rounded-xl overflow-hidden flex-shrink-0 shadow-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.jpeg" alt="HelpMeProcess" className="object-cover w-full h-full" />
        </div>
        <div className="leading-tight flex-1 min-w-0">
          <div className="font-bold text-sm text-white">HelpMeProcess</div>
          <div className="text-xs font-semibold" style={{ color: "var(--acc-400)" }}>COD Manager</div>
        </div>
        {/* Bouton fermer — mobile uniquement */}
        <button
          className="lg:hidden p-1.5 rounded-lg hover:bg-white/10 transition"
          onClick={() => setMobileOpen(false)}
          aria-label="Fermer le menu"
        >
          <X className="w-5 h-5 text-white/70" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 overflow-y-auto overscroll-contain">
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
                  className={`w-full flex items-center gap-3 px-5 py-3 text-sm transition active:bg-white/15 ${
                    active ? "bg-white/10 font-medium" : "text-blue-100 hover:bg-white/5"
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="flex-1 text-left font-semibold">{item.label}</span>
                  {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                {isOpen && (
                  <div className="bg-black/10">
                    {item.children!.map((child) => {
                      const childActive = pathname === child.href;
                      return (
                        <Link
                          key={child.href + child.label}
                          href={child.href}
                          className={`flex items-center justify-between pl-12 pr-5 py-3 text-sm transition active:bg-white/15 ${
                            childActive
                              ? "text-white border-l-4 bg-white/5 accent-border-l"
                              : "text-blue-200 hover:text-white hover:bg-white/5 border-l-4 border-transparent"
                          }`}
                        >
                          <span>{child.label}</span>
                          {child.badge !== undefined && child.badge > 0 && (
                            <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
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
              className={`flex items-center gap-3 px-5 py-3 text-sm transition active:bg-white/15 ${
                active
                  ? "bg-white/10 text-white font-medium border-l-4 accent-border-l"
                  : "text-blue-100 hover:bg-white/5 border-l-4 border-transparent"
              }`}
            >
              {Icon && <Icon className="w-5 h-5 flex-shrink-0" />}
              <span className="flex-1">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bouton suspension CRM — Admin seulement */}
      {userRole === "ADMIN" && (
        <div className="px-1 pb-1 border-t border-white/10 pt-2 flex-shrink-0">
          {!crmIsActive && (
            <div className="mx-3 mb-2 px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/30 text-xs text-red-300 text-center font-semibold">
              ⚠️ CRM SUSPENDU
            </div>
          )}
          <CrmToggleButton isActive={crmIsActive} />
        </div>
      )}

      {/* Profil + Déconnexion */}
      <div className="border-t border-white/10 p-4 flex-shrink-0">
        <Link
          href="/profil"
          className="flex items-center gap-3 mb-3 hover:bg-white/5 rounded-xl p-2 -mx-2 transition group active:bg-white/10"
        >
          <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-white/20">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt={userName} className="w-full h-full object-cover" />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center font-bold text-sm text-white"
                style={{ backgroundColor: "var(--acc-500)" }}
              >
                {userName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate">{userName}</div>
            <div className="text-xs flex items-center gap-1">
              {isSuperAdmin ? (
                <span style={{ color: "var(--acc-400)" }}>
                  👑 {SUPER_ADMIN_LABEL}
                </span>
              ) : (
                <span className="text-blue-200">
                  {userRole ? ROLE_LABEL[userRole] ?? userRole : "Utilisateur"}
                </span>
              )}
            </div>
          </div>
          <span className="text-white/30 text-xs" style={{ color: "var(--acc-400)" }}>✏️</span>
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-2 px-3 py-3 text-sm text-blue-100 hover:text-white hover:bg-white/10 rounded-xl transition active:bg-white/15"
        >
          <LogOut className="w-4 h-4" />
          Déconnexion
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* ── Bouton hamburger mobile (visible uniquement sur petit écran) ── */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 bg-[#0f172a] rounded-xl shadow-lg border border-white/10 text-white"
        onClick={() => setMobileOpen(true)}
        aria-label="Ouvrir le menu"
      >
        <Menu className="w-5 h-5" />
        {/* Badge total notifications sur le bouton hamburger */}
        {(notificationCount > 0 || pendingRequestCount > 0) && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
            {notificationCount + pendingRequestCount > 9 ? "9+" : notificationCount + pendingRequestCount}
          </span>
        )}
      </button>

      {/* ── Overlay mobile ── */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar desktop (toujours visible) ── */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 bg-[#0f172a] text-white flex-col z-30 shadow-2xl">
        {sidebarContent}
      </aside>

      {/* ── Sidebar mobile (slide-in depuis la gauche) ── */}
      <aside
        className={`lg:hidden fixed left-0 top-0 bottom-0 w-72 bg-[#0f172a] text-white flex flex-col z-50 shadow-2xl transform transition-transform duration-300 ease-in-out ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-modal="true"
        role="dialog"
      >
        {sidebarContent}
      </aside>
    </>
  );
}
