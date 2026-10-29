import { createFolder, del, put } from "@vercy/storage";
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
import { formatOneLineError } from "@/lib/utils/api-best-practices";

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

    try {
      await createFolder(FOLDER);
    } catch {
      // Already exists.
    }
    const ext = AVATAR_TYPES[file.type as keyof typeof AVATAR_TYPES];
    const uploaded = await put(
      `${generateId("att")}.${ext}`,
      Buffer.from(await file.arrayBuffer()),
      { folder: FOLDER, contentType: file.type },
    );

    const user = await updateUserProfile(auth.userId, { image: uploaded.url });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Keeps the session's cached user in step, so the new photo shows everywhere.
    let headers: Headers | undefined;
    try {
      const res = await authInstance.api.updateUser({
        body: { image: uploaded.url },
        headers: req.headers,
        asResponse: true,
      });
      headers = res.headers;
    } catch (err) {
      console.warn(`[avatar] session sync: ${formatOneLineError(err)}`);
    }

    // Only our own uploads are ours to delete; a Google photo is not.
    if (previous && new URL(previous).hostname === STORAGE_HOST) {
      del(previous).catch(() => {});
    }

    return NextResponse.json(
      { success: true, image: uploaded.url },
      headers ? { headers } : undefined,
    );
  } catch (err) {
    console.error(`[avatar] upload failed: ${formatOneLineError(err)}`);
    return NextResponse.json(
      {
        error: `Could not save that photo. Use a JPG, PNG or WebP under ${MAX_AVATAR_BYTES / 1024 / 1024} MB.`,
      },
      { status: 500 },
    );
  }
}
