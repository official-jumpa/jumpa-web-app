import Image from "next/image";

/**
 * Purple masthead on the savings landing. The white sheet below curves back
 * up into the gradient at both corners.
 */
export function SavingsBanner({ title }: { title: string }) {
  return (
    <div className="-mx-4.5">
      <div className="relative h-38.75 overflow-hidden bg-[linear-gradient(to_bottom,var(--color-jumpa-primary-600),var(--color-jumpa-primary-400))] p-6">
        <Image
          src="/images/savings/hero-grid.svg"
          alt=""
          aria-hidden="true"
          width={347}
          height={319}
          className="pointer-events-none absolute top-[-81.6px] left-1.5 max-w-none"
        />
        <Image
          src="/images/savings/hero-art.svg"
          alt=""
          aria-hidden="true"
          width={270}
          height={347}
          className="pointer-events-none absolute top-[-56px] left-[39.06%] max-w-none"
        />

        {/* The frame centres the title in a 49px block. */}
        <div className="relative flex h-12.25 items-center">
          <h2 className="text-lg leading-4 font-extrabold text-jumpa-secondary-50">
            {title}
          </h2>
        </div>
      </div>

      {/* A rounded white block over the gradient's end colour: only the corners show. */}
      <div className="h-4.5 bg-jumpa-primary-400">
        <div className="h-full rounded-t-2xl bg-jumpa-white" />
      </div>
    </div>
  );
}
