import { type NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import { AUTO_SAVE_LIVE } from "@/lib/savings-auto-save";
import {
  listAutoSaveRules,
  removeAutoSaveRule,
  saveAutoSaveRule,
  setAutoSavePaused,
} from "@/lib/services/auto-save";
import { formatOneLineError } from "@/lib/utils/api-best-practices";
import {
  pauseAutoSaveSchema,
  removeAutoSaveSchema,
  saveAutoSaveSchema,
} from "@/lib/validations/auto-save.validation";
import { formatZodError } from "@/lib/validations/validation-helper";

const notLive = () =>
  NextResponse.json(
    { error: "Auto-save is not available yet" },
    { status: 404 },
  );

const serverError = (err: unknown) => {
  console.error(`[AutoSave] ${formatOneLineError(err)}`);
  return NextResponse.json(
    { error: "Could not update auto-save" },
    { status: 500 },
  );
};

/** The signed-in user's rules, one per plan. */
export async function GET() {
  if (!AUTO_SAVE_LIVE) return notLive();
  const auth = await requireActiveUser({
    rateLimit: { tier: "low", action: "auto_save_list" },
  });
  if (!auth.ok) return auth.response;

  try {
    return NextResponse.json({ rules: await listAutoSaveRules(auth.userId) });
  } catch (err) {
    return serverError(err);
  }
}

/** Starts or replaces a plan's rule. Needs the wallet PIN. */
export async function PUT(req: NextRequest) {
  if (!AUTO_SAVE_LIVE) return notLive();
  const auth = await requireActiveUser({
    rateLimit: { tier: "high", action: "auto_save_save" },
  });
  if (!auth.ok) return auth.response;

  try {
    const validation = saveAutoSaveSchema.safeParse(
      await req.json().catch(() => ({})),
    );
    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), {
        status: 400,
      });
    }
    const result = await saveAutoSaveRule(auth.userId, validation.data);
    return result.ok
      ? NextResponse.json({ rule: result.rule })
      : NextResponse.json({ error: result.error }, { status: result.status });
  } catch (err) {
    return serverError(err);
  }
}

/** Pauses or resumes a rule. No PIN: nothing moves. */
export async function PATCH(req: NextRequest) {
  if (!AUTO_SAVE_LIVE) return notLive();
  const auth = await requireActiveUser({
    rateLimit: { tier: "medium", action: "auto_save_pause" },
  });
  if (!auth.ok) return auth.response;

  try {
    const validation = pauseAutoSaveSchema.safeParse(
      await req.json().catch(() => ({})),
    );
    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), {
        status: 400,
      });
    }
    const { planId, paused } = validation.data;
    const result = await setAutoSavePaused(auth.userId, planId, paused);
    return result.ok
      ? NextResponse.json({ rule: result.rule })
      : NextResponse.json({ error: result.error }, { status: result.status });
  } catch (err) {
    return serverError(err);
  }
}

/** Turns a rule off. No PIN: nothing moves. */
export async function DELETE(req: NextRequest) {
  if (!AUTO_SAVE_LIVE) return notLive();
  const auth = await requireActiveUser({
    rateLimit: { tier: "medium", action: "auto_save_remove" },
  });
  if (!auth.ok) return auth.response;

  try {
    const validation = removeAutoSaveSchema.safeParse(
      await req.json().catch(() => ({})),
    );
    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), {
        status: 400,
      });
    }
    await removeAutoSaveRule(auth.userId, validation.data.planId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}
