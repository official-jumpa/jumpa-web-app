import Image from "next/image";

/** Jumpa mark on a purple gradient disc, shown once per agent group. */
export function AgentAvatar() {
  return (
    <span className="flex size-9.5 shrink-0 items-center justify-center rounded-full bg-[image:var(--gradient-jumpa-avatar)]">
      <span className="relative h-3 w-[23px]">
        <Image
          src="/logo/mark/lemon.png"
          alt=""
          fill
          className="object-contain"
          sizes="23px"
        />
      </span>
    </span>
  );
}
