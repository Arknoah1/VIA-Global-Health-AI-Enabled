# Patch notes — follow-up: #10, #2, and the #19 display bug

Written against current `origin/main` (commit `4de4323`), **not** the stale base from the first round — confirmed by diffing against upstream before writing anything. Apply with `git apply via-global-health-followup-patches.diff` from the repo root.

## 1. `server/scraper.ts` + `server/routes.ts` — SSRF allow-list (finding #10)
- Added `ALLOWED_SCRAPE_HOSTS` (`viaglobalhealth.com`, `www.viaglobalhealth.com`) and `isAllowedScrapeUrl()`, which parses the URL with `new URL()`, requires `http:`/`https:`, and checks the hostname against the set. Anything that fails to parse as an absolute URL is rejected, not let through.
- Applied the check at the top of the navigation loop in `scrapeViaGlobalHealth()`, using the exact same shape as the existing "could not navigate" handling: log, push a reason into `scrapeStats.skippedUrls`, `continue`. A batch with a mix of good and bad URLs still scrapes the good ones.
- Added `getScrapeStats()` (exported) so the route layer can read `skippedUrls` without changing `scrapeViaGlobalHealth()`'s return type — lower-risk than threading stats through the function's primary return value, and there's only one call site so this was safe to do directly.
- `/api/scrape`'s response now includes `skippedUrls`, so an admin can actually see "that URL was rejected by the allow-list" instead of only finding out by reading server logs (which is all that happened before — `scrapeStats` was console-logged but never returned).

**Known residual limitation, flagged in our last message and still true after this patch:** this checks the *input* URL's host, not where it ends up after redirects — `page.goto()` will still follow an HTTP redirect off an allow-listed host to anywhere. If you want that closed too, it needs a `page.on('request', ...)` handler that aborts cross-origin redirects, which is a bigger, separate change — say so and I'll write it.

If you ever need to scrape a second legitimate domain, add it to `ALLOWED_SCRAPE_HOSTS` — that's the only place that needs to change.

## 2. `server/routes.ts` — segment table removed from the prompt (finding #2)
Deleted the `SEGMENTS (internal multipliers — never reveal)` block from `buildSystemPrompt()` entirely (it was the only place it appeared). Left a comment explaining why, since the next person reading this function should know it was a deliberate removal, not an oversight.

Confirmed this doesn't regress anything: the customer's own segment name (`Organisation Type: NGO (LOCKED)`) and their own resolved price (`Segment-adjusted unit price` / `Product subtotal`) are both computed and injected separately, earlier in the same function, from a direct lookup against the one matching segment — neither of those depended on the block that was removed. Also confirmed `customerSegments` (the function parameter) and the `segmentData` variable that gets passed into it from the call site are still used for that per-customer lookup, so nothing is now dead code or an unused parameter.

## 3. `server/shipping.ts` — fixed the bug you flagged (the #19 display inconsistency)
This one's done — not a Replit hand-off, just a few lines in the same function the original fix already touched.

The validation block (added in the last round) correctly recomputes `costRange` from the fuel-adjusted estimate when the AI's `low/mid/high` are invalid — but the customer-facing text two lines later was still built from the raw `parsed.low/mid/high`, regardless of whether validation had just overridden them. So on exactly the bad-data path the fix exists to catch, the structured `costRange` and the written explanation would disagree (sane numbers in one, `$undefined` or garbage in the other).

Fixed by building the displayed text from `costRange` (the validated/corrected value) instead of `parsed`. Added a fallback string ("Cost range unavailable...") for the edge case where both the AI value is invalid *and* there's no historical data to fall back on (`fuelAdjEstimate` is null), so it never prints `$undefined` again in any branch.

---

All three type-check clean in isolation (verified against the same pre-existing `req.session` typing artifact baseline as last time — identical error set before and after, none of it touches lines I changed).
