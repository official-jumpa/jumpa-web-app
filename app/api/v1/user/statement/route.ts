import { NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import { statementRequestSchema } from "@/lib/validations/statement.validation";
import { formatZodError } from "@/lib/validations/validation-helper";
import { generateUserStatement } from "@/lib/functions/statementFunctions";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/user/statement
 *
 * Generates an official account statement payload for the authenticated user.
 * Validates maximum 3-month (92-day) range and provides transaction ledger + financial metrics.
 */
export async function POST(req: NextRequest) {
  try {
    const authResult = await requireActiveUser({
      rateLimit: { tier: "medium", action: "generate_statement" },
    });
    if (!authResult.ok) return authResult.response;

    const body = await req.json().catch(() => ({}));
    const validation = statementRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), { status: 400 });
    }

    const result = await generateUserStatement(authResult.userId, validation.data);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "Failed to generate statement" },
        { status: result.status || 400 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        statement: result.data,
      },
      {
        headers: {
          "Cache-Control": "private, no-cache, no-store, must-revalidate",
        },
      },
    );
  } catch (err: any) {
    console.error("Error generating statement:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/v1/user/statement
 *
 * Query-parameter alternative for convenience and testing.
 */
export async function GET(req: NextRequest) {
  try {
    const authResult = await requireActiveUser({
      rateLimit: { tier: "medium", action: "generate_statement" },
    });
    if (!authResult.ok) return authResult.response;

    const { searchParams } = new URL(req.url);
    const rawParams = {
      from: searchParams.get("from") || undefined,
      to: searchParams.get("to") || undefined,
      currency: searchParams.get("currency") || "all",
      homeAddress: searchParams.get("homeAddress") || undefined,
      pin: searchParams.get("pin") || undefined,
    };

    const validation = statementRequestSchema.safeParse(rawParams);
    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), { status: 400 });
    }

    const result = await generateUserStatement(authResult.userId, validation.data);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "Failed to generate statement" },
        { status: result.status || 400 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        statement: result.data,
      },
      {
        headers: {
          "Cache-Control": "private, no-cache, no-store, must-revalidate",
        },
      },
    );
  } catch (err: any) {
    console.error("Error generating statement:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error" },
      { status: 500 },
    );
  }
}
