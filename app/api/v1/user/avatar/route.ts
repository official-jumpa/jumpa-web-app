import { del, put } from "@vercy/storage";
import { type NextRequest, NextResponse } from "next/server";
import { auth as authInstance } from "@/lib/auth";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import { getUserById, updateUserProfile } from "@/lib/functions/userFunctions";
import {
  AVATAR_TYPES,
  avatarProblem,
  MAX_AVATAR_BYTES,
} from "@/lib/profile-photo";
import { generateId } from "@/lib/schema-ids";
import {
  formatOneLineError,
  handleExternalApiError,
  withTimeout,
} from "@/lib/utils/api-best-practices";

export const dynamic = "force-dynamic";

const FOLDER = "avatars";
const STORAGE_HOST = "storage.vercy.fun";

/**
 * POST /api/v1/user/avatar
 * Stores one profile photo and makes it the account's image. The server sets
 * the URL itself, so a client can never point the profile at an arbitrary host.
 */
export async function POST(req: NextRequest) {
  const auth = await requireActiveUser({
    requireWallet: false,
    rateLimit: { tier: "medium", action: "user_avatar" },
  });
  if (!auth.ok) return auth.response;

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No photo was sent" }, { status: 400 });
  }
  const problem = avatarProblem(file);
  if (problem) {
    return NextResponse.json({ error: problem }, { status: 400 });
  }

  try {
    const previous = (await getUserById(auth.userId))?.image ?? null;

    const ext = AVATAR_TYPES[file.type as keyof typeof AVATAR_TYPES];
    const buffer = Buffer.from(await file.arrayBuffer());

    const uploaded = await withTimeout(
      put(`${generateId("att")}.${ext}`, buffer, {
        folder: FOLDER,
        contentType: file.type,
      }),
      30000,
      "Avatar upload"
    );

    // Vercy Storage responsive sizing:
    // - `?size=sm`: Fast thumbnail (~6 KB, 98% smaller)
    // - `?size=md`: Web-optimized compressed WebP display (~37 KB, 87% smaller)
    // We use `?size=md` to ensure crisp rendering on retina displays while cutting 87%+ bandwidth.
    const optimizedUrl = `${uploaded.url}?size=md`;

    const user = await updateUserProfile(auth.userId, { image: optimizedUrl });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Keeps the session's cached user in step, so the new photo shows everywhere.
    let headers: Headers | undefined;
    try {
      const res = await authInstance.api.updateUser({
        body: { image: optimizedUrl },
        headers: req.headers,
        asResponse: true,
      });
      headers = res.headers;
    } catch (err) {
      console.warn(`[avatar] session sync: ${formatOneLineError(err)}`);
    }

    // Only our own uploads are ours to delete; a Google photo is not.
    if (
      previous &&
      URL.canParse(previous) &&
      new URL(previous).hostname === STORAGE_HOST
    ) {
      const cleanUrl = previous.split("?")[0];
      withTimeout(del(cleanUrl), 10000, "Avatar old photo cleanup").catch((err) => {
        console.warn(`[avatar] old photo cleanup failed: ${formatOneLineError(err)}`);
      });
    }

    return NextResponse.json(
      { success: true, image: optimizedUrl },
      headers ? { headers } : undefined
    );
  } catch (err: any) {
    return handleExternalApiError({
      provider: "VercyStorage",
      action: "avatar_upload",
      status: err?.status,
      rawError: err,
      customMessage:
        err?.status === 413
          ? `File is too large. Use a photo under ${MAX_AVATAR_BYTES / 1024 / 1024} MB.`
          : undefined,
    });
  }
}

/**
 * DELETE /api/v1/user/avatar
 * Clears the profile photo, so the account shows its initials again.
 */
export async function DELETE(req: NextRequest) {
  const auth = await requireActiveUser({
    requireWallet: false,
    rateLimit: { tier: "medium", action: "user_avatar" },
  });
  if (!auth.ok) return auth.response;

  try {
    const previous = (await getUserById(auth.userId))?.image ?? null;
    const user = await updateUserProfile(auth.userId, { image: null });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let headers: Headers | undefined;
    try {
      const res = await authInstance.api.updateUser({
        body: { image: null },
        headers: req.headers,
        asResponse: true,
      });
      headers = res.headers;
    } catch (err) {
      console.warn(`[avatar] session sync: ${formatOneLineError(err)}`);
    }

    if (
      previous &&
      URL.canParse(previous) &&
      new URL(previous).hostname === STORAGE_HOST
    ) {
      const cleanUrl = previous.split("?")[0];
      await withTimeout(del(cleanUrl), 10000, "Avatar delete").catch((err) => {
        console.warn(`[avatar] storage deletion failed: ${formatOneLineError(err)}`);
      });
    }

    return NextResponse.json(
      { success: true, image: null },
      headers ? { headers } : undefined
    );
  } catch (err: any) {
    return handleExternalApiError({
      provider: "VercyStorage",
      action: "avatar_delete",
      status: err?.status,
      rawError: err,
      customMessage: "Could not remove your photo. Please try again.",
    });
  }
}
