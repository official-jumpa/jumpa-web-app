/** Small caps label above a section heading. */
export function Eyebrow({ children }: { children: string }) {
  return (
    <p className="font-bold text-jumpa-primary-600 uppercase text-u-11/16 tracking-u-1.5 md:text-u-13/18 md:tracking-u-2">
      {children}
    </p>
  );
}
