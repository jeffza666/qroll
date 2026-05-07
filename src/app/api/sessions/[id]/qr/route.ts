import { NextResponse } from "next/server";

import { AuthError, requireCourseOwner } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { generateEntryCode, generateQrToken } from "@/lib/qr-token";
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

    const currentWithToken =
      current.qrToken && current.entryCode
        ? current
        : await db.classSession.update({
            where: { id: current.id },
            data: {
              qrToken: current.qrToken ?? generateQrToken(),
              entryCode: current.entryCode ?? generateEntryCode(),
            },
          });

    return noStoreJson({
      isOpen: currentWithToken.isOpen,
      token: currentWithToken.qrToken,
      entryCode: currentWithToken.entryCode,
      endsAt: currentWithToken.endsAt.toISOString(),
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
