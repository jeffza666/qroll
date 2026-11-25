import assert from "node:assert/strict";
import test from "node:test";

import { getEmailDomain, isAllowedEmail, normalizeEmail } from "./auth-config.ts";

test("TU email domains are compared after trim and lowercase", () => {
  assert.equal(normalizeEmail("  Foo@Dome.TU.ac.th "), "foo@dome.tu.ac.th");
  assert.equal(getEmailDomain("teacher@tu.ac.th"), "tu.ac.th");
  assert.equal(isAllowedEmail("student@dome.tu.ac.th"), true);
  assert.equal(isAllowedEmail("teacher@tu.ac.th"), true);
});

test("other domains and lookalike subdomains are rejected", () => {
  assert.equal(isAllowedEmail("student@gmail.com"), false);
  assert.equal(isAllowedEmail("student@evil.dome.tu.ac.th"), false);
  assert.equal(isAllowedEmail("not-an-email"), false);
});
