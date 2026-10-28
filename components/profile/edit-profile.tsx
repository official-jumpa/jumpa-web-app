import Image from "next/image";
import { SettingsGearLink } from "@/components/profile/settings-gear-link";
import { SettingsHeader } from "@/components/settings/settings-header";
import { Button } from "@/components/ui/button";
import { CameraIcon } from "@/components/ui/icons/camera";
import { profileHref } from "@/lib/profile";
import { ACCOUNT } from "@/lib/wallet";

function initials(name: string | null): string {
  if (!name) return "";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

/** One read-only row. Values are static until editing is wired. */
function ProfileField({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | null;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm leading-4.5 font-medium text-jumpa-grey-450">
        {label}
      </span>
      <div className="flex h-14 items-center justify-between gap-3 rounded-panel border border-jumpa-lavender-200 bg-jumpa-surface px-4">
        <span className="truncate text-sm leading-none tracking-jumpa-snug text-jumpa-ink">
          {value || "Not set"}
        </span>
        {hint ? (
          <span className="shrink-0 text-xs leading-none font-medium text-jumpa-primary-600">
            {hint}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/** Edit Profile. Screen only — nothing here saves yet. */
export function EditProfile({
  name,
  nickname,
  country,
  image,
}: {
  name: string | null;
  nickname: string | null;
  country: string | null;
  image: string | null;
}) {
  return (
    <div className="flex min-h-dvh flex-col px-4.5 pt-[calc(env(safe-area-inset-top)+21px)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <SettingsHeader
        back={profileHref()}
        title="Edit Profile"
        size="lg"
        action={<SettingsGearLink />}
      />

      <div className="mt-5.25 flex flex-col items-center">
        <span className="relative size-26">
          {image ? (
            <Image
              src={image}
              alt=""
              width={208}
              height={208}
              className="size-26 rounded-full object-cover"
            />
          ) : (
            <span className="relative flex size-26 items-center justify-center overflow-hidden rounded-full bg-jumpa-avatar">
              <Image
                src={ACCOUNT.avatar}
                alt=""
                width={208}
                height={208}
                className="absolute inset-x-[1.5px] top-0.75 bottom-0 rounded-full object-cover opacity-20"
              />
              <span className="relative text-[34px] leading-[1.3] font-bold text-jumpa-primary-950">
                {initials(name)}
              </span>
            </span>
          )}
          {/* TODO(backend): open the photo picker and upload. */}
          <button
            type="button"
            aria-label="Change photo"
            className="absolute top-17.5 left-17.5 flex size-8.5 items-center justify-center rounded-full border-3 border-jumpa-white bg-jumpa-primary-600 tap active:scale-95"
          >
            <CameraIcon className="size-4.75 text-jumpa-white" />
          </button>
        </span>
        {/* TODO(backend): same action as the camera badge. */}
        <button
          type="button"
          className="mt-2.5 text-base leading-none font-medium text-jumpa-primary-600 tap"
        >
          Change photo
        </button>
      </div>

      <div className="mt-6.5 flex flex-col gap-5">
        <ProfileField label="Display name" value={name} />
        {/* TODO(backend): "Available" is a placeholder until the name check exists. */}
        <ProfileField label="Nickname" value={nickname} hint="Available" />
        {/* TODO(backend): "Change Country" has no picker yet. */}
        <ProfileField label="Country" value={country} hint="Change Country" />
      </div>

      <div className="mt-auto pt-6">
        {/* TODO(backend): save the profile. */}
        <Button variant="brandAccent" size="lg">
          Save changes
        </Button>
      </div>
    </div>
  );
}
