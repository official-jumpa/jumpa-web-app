/** Formats a profile photo may be. SVG is left out: it can carry script. */
export const AVATAR_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

export const AVATAR_ACCEPT = Object.keys(AVATAR_TYPES).join(",");

/** Why a file cannot be a profile photo, or null when it can. Shared by the form and the route. */
export function avatarProblem(file: {
  type: string;
  size: number;
}): string | null {
  if (!(file.type in AVATAR_TYPES)) return "Use a JPG, PNG or WebP photo.";
  if (file.size > MAX_AVATAR_BYTES) {
    return `Use a photo under ${MAX_AVATAR_BYTES / 1024 / 1024} MB.`;
  }
  return null;
}
