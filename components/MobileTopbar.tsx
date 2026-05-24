"use client";

/**
 * Barre du haut visible sur mobile — contient le titre de page courant
 * et un espace pour le bouton hamburger (qui est positionné en fixed dans Sidebar).
 */
export function MobileTopbar({ title }: { title?: string }) {
  return (
    <div className="lg:hidden sticky top-0 z-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center gap-3 shadow-sm">
      {/* Espace pour le bouton hamburger fixe */}
      <div className="w-10 h-10 flex-shrink-0" />
      {title && (
        <h1 className="text-base font-bold text-slate-800 dark:text-white truncate">{title}</h1>
      )}
    </div>
  );
}
