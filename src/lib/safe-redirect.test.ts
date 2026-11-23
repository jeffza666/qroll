import assert from "node:assert/strict";
import test from "node:test";

import { getSafeRedirect } from "./safe-redirect.ts";

test("relative in-app paths are preserved", () => {
  assert.equal(getSafeRedirect("/teacher/courses?show=archived"), "/teacher/courses?show=archived");
  assert.equal(getSafeRedirect("   /student  "), "/student");
});

test("off-site and auth paths fall back to home", () => {
  assert.equal(getSafeRedirect(""), "/");
  assert.equal(getSafeRedirect(null), "/");
  assert.equal(getSafeRedirect("//evil.example"), "/");
  assert.equal(getSafeRedirect("/\\evil.example"), "/");
  assert.equal(getSafeRedirect("https://evil.example/teacher"), "/");
  assert.equal(getSafeRedirect("/login?from=/teacher"), "/");
  assert.equal(getSafeRedirect("/api/auth/callback"), "/");
  assert.equal(getSafeRedirect("/teacher\n/login"), "/");
});

test("absolute URLs are accepted only for the current origin", () => {
  assert.equal(
    getSafeRedirect("https://q-roll-nu.vercel.app/teacher?x=1", "https://q-roll-nu.vercel.app"),
    "/teacher?x=1",
  );
  assert.equal(
    getSafeRedirect("https://evil.example/teacher", "https://q-roll-nu.vercel.app"),
    "/",
  );
});
