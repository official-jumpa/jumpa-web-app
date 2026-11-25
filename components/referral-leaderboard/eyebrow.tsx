/** Small caps label above a section heading. */
export function Eyebrow({ children }: { children: string }) {
  return (
    <p className="font-bold text-jumpa-primary-600 uppercase text-u-12/16 tracking-u-1.75 md:text-u-13/18 md:tracking-u-1.75">
      {children}
    </p>
  );
}
