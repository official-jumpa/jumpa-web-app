import { NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import { CIRCLE_IRIS_API } from "@/lib/blockchain";
import { bridgeStatusSchema } from "@/lib/validations/bridge.validation";
import { formatZodError } from "@/lib/validations/validation-helper";
import { safeExternalFetch, formatOneLineError } from "@/lib/utils/api-best-practices";

/**
 * GET /api/v1/bridge/status?domain=...&txHash=...
 * Queries Circle Iris for CCTP message verification and attestation status.
 * If Iris cannot be reached, the status accurately remains "pending".
 */
export async function GET(req: NextRequest) {
  try {
    const authResult = await requireActiveUser({
      rateLimit: { tier: "low", action: "bridge_status" },
    });
    if (!authResult.ok) return authResult.response;

    const { searchParams } = new URL(req.url);
    const domain = searchParams.get("domain") || "";
    const txHash = searchParams.get("txHash") || "";

    const validation = bridgeStatusSchema.safeParse({ domain, txHash });
    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), {
        status: 400,
      });
    }

    try {
      const irisRes = await safeExternalFetch(
        `${CIRCLE_IRIS_API.mainnet}/v2/messages/${domain}?transactionHash=${txHash}`,
        {
          headers: { Accept: "application/json" },
          cache: "no-store",
        },
        {
          provider: "Bridge",
          timeoutMs: 30000, // 30 seconds
        },
      );

      if (irisRes.ok && irisRes.data) {
        const msg = irisRes.data.messages?.[0];
        const statusPayload = {
          status: msg?.status || "pending",
          attestation: msg?.attestation || null,
          message: msg?.message || null,
          destinationMintTxHash: msg?.destinationMintTxHash || null,
        };

        return NextResponse.json({
          success: true,
          data: statusPayload,
        });
      }
    } catch (irisErr: any) {
      console.warn(`[Bridge] Iris status query error: ${formatOneLineError(irisErr)}`);
    }

    // If Iris cannot be reached or message is not yet indexed, status remains pending
    const pendingPayload = {
      status: "pending",
      attestation: null,
      message: "Attestation status is pending or awaiting verification.",
      destinationMintTxHash: null,
    };

    return NextResponse.json({
      success: true,
      data: pendingPayload,
    });
  } catch (error: any) {
    console.error(`[Bridge] Status check error: ${formatOneLineError(error)}`);
    return NextResponse.json(
      { success: false, error: "Failed to check bridge status" },
      { status: 500 },
    );
  }
}
