Please apply the attached patch file (`via-global-health-followup-patches.diff`) to the repo exactly as written.

Scope — please follow this precisely:
- Apply ONLY the changes in this diff: the SSRF allow-list in `server/scraper.ts`, the `getScrapeStats`/`skippedUrls` wiring in `server/routes.ts`'s `/api/scrape` handler, the removal of the SEGMENTS block from `buildSystemPrompt()` in `server/routes.ts`, and the `aiAnalysis`/`costRange` text fix in `server/shipping.ts`.
- Do NOT refactor, "clean up," or change any other code while applying this — including model names/strings (e.g. do not touch any `gpt-5`/`gpt-4o` references), rate-limit values, env var names, or anything outside the exact lines in the diff.
- If the diff doesn't apply cleanly because the surrounding code has changed since this was written, STOP and tell me what conflicted rather than improvising a different version of the fix. Don't silently reinterpret or "fix it your way" — flag it back to me.
- After applying, run the project's type-check (e.g. `npm run check` or equivalent) and tell me the result before doing anything else.
- Don't touch any files outside `server/scraper.ts`, `server/routes.ts`, and `server/shipping.ts`.

Reference: PATCH_NOTES_FOLLOWUP.md (attached) explains the intent of each change if you need context while applying it.
