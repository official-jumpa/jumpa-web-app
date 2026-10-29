"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { useAuthContext } from "@/components/auth/AuthGuard";
import { CountrySheet } from "@/components/profile/country-sheet";
import { SettingsGearLink } from "@/components/profile/settings-gear-link";
import { useUserProfile } from "@/components/profile/user-profile-provider";
import { SettingsHeader } from "@/components/settings/settings-header";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { CameraIcon } from "@/components/ui/icons/camera";
import { profileHref } from "@/lib/profile";
import { AVATAR_ACCEPT, avatarProblem } from "@/lib/profile-photo";
import { ACCOUNT } from "@/lib/wallet";

const NICKNAME_MAX = 30;

const BOX =
  "flex h-14 items-center justify-between gap-3 rounded-panel border bg-jumpa-surface px-4";

function initials(name: string | null): string {
  if (!name) return "";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

function nicknameProblem(value: string, had: boolean): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return had ? "Enter a nickname." : undefined;
  if (trimmed.length > NICKNAME_MAX) {
    return `Keep it to ${NICKNAME_MAX} characters.`;
  }
  return undefined;
}

/** One labelled row; the box is whatever control the field needs. */
function ProfileField({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  children: ReactNode;
}) {
  const labelClass = "text-sm leading-4.5 font-medium text-jumpa-grey-450";
  return (
    <div className="flex flex-col gap-2">
      {htmlFor ? (
        <label htmlFor={htmlFor} className={labelClass}>
          {label}
        </label>
      ) : (
        <span className={labelClass}>{label}</span>
      )}
      {children}
      <FieldError>{error}</FieldError>
    </div>
  );
}

/** Edit Profile. The name is the verified legal name, so it is shown, not edited. */
export function EditProfile({
  name,
  nickname: savedNickname,
  country: savedCountry,
  image: savedImage,
}: {
  name: string | null;
  nickname: string | null;
  country: string | null;
  image: string | null;
}) {
  const router = useRouter();
  const auth = useAuthContext();
  const { updateProfile, refreshProfile } = useUserProfile();
  const fileInput = useRef<HTMLInputElement>(null);

  const [nickname, setNickname] = useState(savedNickname ?? "");
  const [country, setCountry] = useState(savedCountry);
  const [photo, setPhoto] = useState<{ file: File; url: string } | null>(null);
  const [picking, setPicking] = useState(false);
  const [errors, setErrors] = useState<{
    nickname?: string;
    photo?: string;
    save?: string;
  }>({});
  const [pending, setPending] = useState(false);

  // The preview URL is ours to free, whether it is replaced or the screen closes.
  useEffect(
    () => () => {
      if (photo) URL.revokeObjectURL(photo.url);
    },
    [photo],
  );

  const nicknameError = nicknameProblem(nickname, Boolean(savedNickname));
  const nicknameChanged = nickname.trim() !== (savedNickname ?? "");
  const countryChanged = Boolean(country) && country !== savedCountry;

  const onPhoto = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const problem = avatarProblem(file);
    setErrors((prev) => ({
      ...prev,
      photo: problem ?? undefined,
      save: undefined,
    }));
    if (problem) return;
    setPhoto({ file, url: URL.createObjectURL(file) });
  };

  const onSave = async () => {
    if (nicknameError) {
      setErrors((prev) => ({ ...prev, nickname: nicknameError }));
      document.getElementById("nickname")?.focus();
      return;
    }
    if (!photo && !nicknameChanged && !countryChanged) {
      router.replace(profileHref());
      return;
    }

    setPending(true);
    setErrors({});
    try {
      if (photo) {
        const body = new FormData();
        body.append("file", photo.file);
        const res = await fetch("/api/v1/user/avatar", {
          method: "POST",
          body,
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok)
          throw new Error(json.error || "Could not save that photo.");
        auth?.updateUser?.({ image: json.image });
      }

      const updates: { nickname?: string; country?: string } = {};
      if (nicknameChanged) updates.nickname = nickname.trim();
      if (countryChanged && country) updates.country = country;
      if (Object.keys(updates).length > 0) await updateProfile(updates);
      else await refreshProfile();

      router.replace(profileHref());
      router.refresh();
    } catch (err) {
      setPending(false);
      setErrors({
        save:
          err instanceof Error ? err.message : "Could not save your profile.",
      });
    }
  };

  const openPicker = () => fileInput.current?.click();

  return (
    <div className="flex min-h-dvh flex-col px-4.5 pt-[calc(env(safe-area-inset-top)+21px)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <SettingsHeader
        back={profileHref()}
        title="Edit Profile"
        size="lg"
        action={<SettingsGearLink />}
      />

      <input
        ref={fileInput}
        type="file"
        accept={AVATAR_ACCEPT}
        onChange={onPhoto}
        className="hidden"
        tabIndex={-1}
        aria-hidden="true"
      />

      <div className="mt-5.25 flex flex-col items-center">
        <span className="relative size-26">
          {photo ? (
            // biome-ignore lint/performance/noImgElement: a local preview cannot go through the optimiser
            <img
              src={photo.url}
              alt=""
              className="size-26 rounded-full object-cover"
            />
          ) : savedImage ? (
            <Image
              src={savedImage}
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
          <button
            type="button"
            aria-label="Change photo"
            onClick={openPicker}
            disabled={pending}
            className="absolute top-17.5 left-17.5 flex size-8.5 items-center justify-center rounded-full border-3 border-jumpa-white bg-jumpa-primary-600 tap active:scale-95"
          >
            <CameraIcon className="size-4.75 text-jumpa-white" />
          </button>
        </span>
        <button
          type="button"
          onClick={openPicker}
          disabled={pending}
          className="mt-2.5 text-base leading-none font-medium text-jumpa-primary-600 tap"
        >
          Change photo
        </button>
        {errors.photo ? (
          <div className="mt-2">
            <FieldError>{errors.photo}</FieldError>
          </div>
        ) : null}
      </div>

      <div className="mt-6.5 flex flex-col gap-5">
        <ProfileField label="Display name">
          <div className={`${BOX} border-jumpa-lavender-200`}>
            <span className="truncate text-sm leading-none tracking-jumpa-snug text-jumpa-ink">
              {name || "Not set"}
            </span>
          </div>
        </ProfileField>

        <ProfileField
          label="Nickname"
          htmlFor="nickname"
          error={errors.nickname}
        >
          <div
            className={`${BOX} focus-within:border-jumpa-primary-600 ${
              errors.nickname
                ? "border-jumpa-danger"
                : "border-jumpa-lavender-200"
            }`}
          >
            <input
              id="nickname"
              value={nickname}
              onChange={(event) => {
                setNickname(event.target.value);
                setErrors((prev) => ({
                  ...prev,
                  nickname: undefined,
                  save: undefined,
                }));
              }}
              maxLength={NICKNAME_MAX + 10}
              placeholder="Add a nickname"
              autoComplete="nickname"
              aria-invalid={Boolean(errors.nickname)}
              className="h-full min-w-0 flex-1 bg-transparent text-sm leading-none tracking-jumpa-snug text-jumpa-ink outline-none placeholder:text-jumpa-neutral-425"
            />
            {nickname.trim() && !nicknameError ? (
              <span className="shrink-0 text-xs leading-none font-medium text-jumpa-primary-600">
                Available
              </span>
            ) : null}
          </div>
        </ProfileField>

        <ProfileField label="Country" htmlFor="country">
          <button
            id="country"
            type="button"
            onClick={() => setPicking(true)}
            disabled={pending}
            className={`${BOX} border-jumpa-lavender-200 text-left tap`}
          >
            <span className="truncate text-sm leading-none tracking-jumpa-snug text-jumpa-ink">
              {country || "Not set"}
            </span>
            <span className="shrink-0 text-xs leading-none font-medium text-jumpa-primary-600">
              Change Country
            </span>
          </button>
        </ProfileField>
      </div>

      <div className="mt-auto flex flex-col gap-3 pt-6">
        <FieldError>{errors.save}</FieldError>
        <Button
          variant="brandAccent"
          size="lg"
          onClick={onSave}
          disabled={pending}
        >
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>

      {picking ? (
        <CountrySheet
          value={country}
          onPick={(next) => {
            setCountry(next);
            setErrors((prev) => ({ ...prev, save: undefined }));
            setPicking(false);
          }}
          onClose={() => setPicking(false)}
        />
      ) : null}
    </div>
  );
}
