type NamedUser =
  | { name?: string | null; jumpaTag?: string | null }
  | null
  | undefined;

function nameParts(user: NamedUser): string[] {
  return (user?.name ?? "").trim().split(/\s+/).filter(Boolean);
}

/** "Ada" from "Ada Obi", else "@ada"; null when the user has neither. */
export function firstName(user: NamedUser): string | null {
  const [first] = nameParts(user);
  if (first) return first;
  return user?.jumpaTag ? `@${user.jumpaTag}` : null;
}

/** Two letters for an avatar disc: "AO" from "Ada Obi", "AD" from "@ada". */
export function publicInitials(user: NamedUser): string {
  const [first, ...rest] = nameParts(user);
  if (first) return `${first[0]}${rest.at(-1)?.[0] ?? ""}`.toUpperCase();
  const tag = (user?.jumpaTag ?? "").replace(/[^a-z0-9]/gi, "");
  return (tag.slice(0, 2) || "J").toUpperCase();
}

/** For public lists: "Ada O.", or "@ad***" when there is only a tag. */
export function publicName(user: NamedUser): string {
  const [first, ...rest] = nameParts(user);
  if (first) {
    const last = rest.at(-1);
    return last ? `${first} ${last[0].toUpperCase()}.` : first;
  }
  if (user?.jumpaTag) return `@${user.jumpaTag.slice(0, 2)}***`;
  return "Jumpa user";
}
