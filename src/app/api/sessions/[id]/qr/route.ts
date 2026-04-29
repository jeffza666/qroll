import { NextResponse } from "next/server";

import { AuthError, requireCourseOwner } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { QR_REFRESH_INTERVAL_MS } from "@/lib/qr-config";
import { rotateIfExpired } from "@/lib/qr-rotate";
import { autoCloseIfExpired } from "@/lib/session-helpers";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

function noStoreJson(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: {
      "Cache-Control": "no-store, max-age=0, must-revalidate",
      ...init?.headers,
    },
  });
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const session = await db.classSession.findUnique({
      where: { id },
    });

    if (!session) {
      return noStoreJson({ error: "not_found" }, { status: 404 });
    }

    await requireCourseOwner(session.courseId);

    const current = await autoCloseIfExpired(session);
    if (!current.isOpen) {
      return noStoreJson({
        isOpen: false,
        closedAt: current.closedAt?.toISOString() ?? null,
      });
    }

    const rotated = await rotateIfExpired(current);

    return noStoreJson({
      isOpen: rotated.isOpen,
      token: rotated.qrToken,
      entryCode: rotated.entryCode,
      expiresAt: rotated.qrTokenExpiresAt?.toISOString() ?? null,
      refreshedAt: rotated.qrRefreshedAt?.toISOString() ?? null,
      refreshIntervalMs: QR_REFRESH_INTERVAL_MS,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return noStoreJson(
        { error: error.code.toLowerCase() },
        { status: error.code === "UNAUTHORIZED" ? 401 : 403 }
      );
    }

    throw error;
  }
}
