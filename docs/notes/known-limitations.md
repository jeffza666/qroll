# Known limitations

Still true after the absence counts and check-in checks.

## Face and GPS come from the browser

The server compares the face descriptor the phone sends. Liveness stays in the browser, so a copied descriptor can be submitted without a live scan. Location is whatever coordinates the device reports. A mocked GPS fix with a small accuracy value can pass the radius check.

## Entry codes

The backup code is 6 digits, and `resolveEntryCode` has no rate limit. Two open sessions can also share a code. Lookup uses `findFirst`, so which session you get is not defined.

## Spreadsheet import

Roster import still uses `xlsx` 0.18.5. `npm audit` reports advisories on that release.

## Security doc is behind the code

`docs/prps/00-security-model.md` still describes a QR token that rotates every 30 seconds, and auto-close at `endsAt + 30 minutes`. The app keeps one `qrToken` and one `entryCode` until the session closes. `autoCloseIfExpired` closes the session at `endsAt`.
