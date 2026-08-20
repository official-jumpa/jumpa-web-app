import { NextRequest, NextResponse } from "next/server";
import { getSession } from "./session";

export type AuthenticatedHandler = (
  req: NextRequest,
  context: { address: string; userId: string },
) => Promise<NextResponse>;

/**
 * Wraps a Route Handler to enforce an active BetterAuth session.
 * Usage: export const POST = withAuth(async (req, { address, userId }) => { ... })
 */
export function withAuth(handler: AuthenticatedHandler) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const session = await getSession(req);

    if (!session?.address) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return handler(req, {
      address: session.address,
      userId: session.userId || "",
    });
  };
}
