import "server-only";

import { randomBytes, randomInt } from "node:crypto";

import { ENTRY_CODE_LENGTH, QR_TOKEN_BYTES } from "@/lib/qr-config";

export function generateQrToken(): string {
  return randomBytes(QR_TOKEN_BYTES).toString("base64url");
}

export function generateEntryCode(): string {
  const max = 10 ** ENTRY_CODE_LENGTH;
  return randomInt(0, max).toString().padStart(ENTRY_CODE_LENGTH, "0");
}
