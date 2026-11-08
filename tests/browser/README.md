# Browser tests

Checks the real site in Google Chrome: shareable landmark links, Copy link,
Back, Previous/Next, Escape, the map flying to a shared landmark, failed links,
link previews, and the public feed's photo addresses.

```bash
npm run test:browser
```

About 30 seconds. It builds the app, starts it on port **3102** against a
**throwaway test database** (`tests/browser/.tmp/test.db`), runs every check,
and stops. Your real local database (`prisma/dev.db`) is never touched: the
start-up script refuses to run against anything but the test database.

- **Needs Google Chrome installed.** Without it, run
  `npx playwright install chromium` once and remove `channel: 'chrome'` from
  `playwright.config.ts`.
- **Test data** is in `fixtures.ts` — nine known landmarks spread across the
  country (one unpublished, one with an HTML/script injection name, two with
  photo records). The default-landmarks seed is skipped on purpose.
- **A failure** prints what it expected and what it found. A trace of the
  failed test is saved under `tests/browser/.tmp/results/`; open it with
  `npx playwright show-trace <file>`.
- Map tiles load from OpenStreetMap; without internet the map is blank but the
  checks still run (pins and popups don't need tiles).
- `npm test` (no browser) still runs the fast server tests, and
  `npm run check:security` the route check.

Same setup as the Labor Database's `tests/browser/` (8 Nov 2026).
