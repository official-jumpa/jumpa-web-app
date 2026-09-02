/** "MTN - 0913829919" over the bill amount canvas. */
export function RecipientPill({ children }: { children: string }) {
  return (
    <span className="truncate rounded-pill bg-jumpa-primary-50 px-3 py-1.5 text-[10px] leading-4 font-medium text-jumpa-primary-600">
      {children}
    </span>
  );
}
