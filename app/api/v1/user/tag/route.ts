import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/functions/permissionFunctions";
import {
  getUserById,
  findUserByJumpaTag,
  setUserJumpaTag,
  logUserActivity,
} from "@/lib/functions/userFunctions";
import {
  findWalletById,
  findWalletForUser,
} from "@/lib/functions/walletFunctions";
import { createNotification } from "@/lib/functions/notificationFunctions";
import { resolveNextOnboardingRoute } from "@/app/api/v1/user/onboarding/route";
import {
  setJumpaTagSchema,
  checkTagQuerySchema,
} from "@/lib/validations/user.validation";
import { formatZodError } from "@/lib/validations/validation-helper";
import { formatOneLineError } from "@/lib/utils/api-best-practices";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/user/tag?check=<handle>
 *
 * Checks if a desired Jumpa tag is available and returns alternatives if taken.
 */
export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAuth({
      rateLimit: { tier: "medium", action: "check_tag" },
    });
    if (!authResult.ok) return authResult.response;
    const session = authResult.session;

    const checkTag =
      req.nextUrl.searchParams.get("check") ||
      req.nextUrl.searchParams.get("checkTag") ||
      req.nextUrl.searchParams.get("tag");

    const validation = checkTagQuerySchema.safeParse({ checkTag });
    if (!validation.success) {
      return NextResponse.json({
        success: true,
        data: {
          available: false,
          suggestions: [],
        },
      });
    }

    const handle = validation.data.checkTag;
    const candidate = `${handle}@jumpa`;
    const existing = await findUserByJumpaTag(candidate);

    const available = !existing || existing._id.toString() === session.user.id;
    const suggestions = available
      ? []
      : [`${handle}_`, `${handle}1`, `the${handle}`]
          .map((opt) =>
            opt.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20),
          )
          .filter((opt) => opt.length >= 3)
          .slice(0, 3);

    return NextResponse.json({
      success: true,
      data: {
        available,
        suggestions,
      },
    });
  } catch (err: any) {
    console.error(`[UserTag] Check error: ${formatOneLineError(err)}`);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/v1/user/tag
 *
 * Validates and permanently claims a unique Jumpa tag for the user.
 */
export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth({
      rateLimit: { tier: "medium", action: "claim_tag" },
    });
    if (!authResult.ok) return authResult.response;
    const session = authResult.session;

    const existingUser = await getUserById(session.user.id);
    if (existingUser?.jumpaTag) {
      return NextResponse.json(
        { success: false, error: "Jumpa Tag cannot be changed once set" },
        { status: 400 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const validation = setJumpaTagSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), {
        status: 400,
      });
    }

    const handle = validation.data.tag;
    const fullTag = `${handle}@jumpa`;
    const duplicate = await findUserByJumpaTag(fullTag);

    if (duplicate && duplicate._id.toString() !== session.user.id) {
      return NextResponse.json(
        { success: false, error: "That Jumpa tag is already taken" },
        { status: 409 },
      );
    }

    const updatedUser = await setUserJumpaTag(session.user.id, fullTag);

    const wallet = updatedUser?.activeWalletId
      ? await findWalletById(updatedUser.activeWalletId)
      : await findWalletForUser(session.user.id);

    const nextRoute = resolveNextOnboardingRoute(updatedUser, wallet);

    logUserActivity({
      userId: session.user.id,
      action: "JUMPA_TAG_SET",
      details: { jumpaTag: fullTag },
      req,
    }).catch((e) =>
      console.error(`[UserTag] error: ${formatOneLineError(e)}`),
    );

    createNotification({
      userId: session.user.id,
      tab: "activities",
      type: "JUMPA_TAG_SET",
      title: "Jumpa Tag Updated",
      body: `Your Jumpa tag was updated to ${fullTag}`,
      metadata: { jumpaTag: fullTag },
      link: "/profile",
    }).catch((e) =>
      console.error(`[UserTag] Error: ${formatOneLineError(e)}`),
    );

    return NextResponse.json({
      success: true,
      data: {
        jumpaTag: fullTag,
        nextRoute,
      },
    });
  } catch (err: any) {
    console.error(`[UserTag] error: ${formatOneLineError(err)}`);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
