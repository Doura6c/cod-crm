/**
 * Enveloppe les tables de données pour permettre le scroll horizontal sur mobile.
 * Usage : <TableWrapper><table>...</table></TableWrapper>
 */
export function TableWrapper({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`w-full overflow-x-auto -mx-0 rounded-xl ${className}`}>
      <div className="min-w-[640px]">
        {children}
      </div>
    </div>
  );
}
