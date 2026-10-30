# netkeiba race-card integration: private-use design

Status: **integration plan; no automated fetching is enabled**.

## Objective
For a user-selected date and venue, show horse numbers, horse names, and
race conditions in Baken-KING without requiring the user to save 24 pages.
Temporary race-card data should not be committed to this public repository.

## Source and permission gate
- Preferred candidate: netkeiba's race/shutuba.html pages.
- Private use alone is not permission for unlimited automated requests.
- Confirm whether automated retrieval, storage, and use in a personal web
  app are allowed under the applicable service terms before enabling fetching.
- Do not bypass login, paywalls, bot restrictions, or rate limits.
- If permission is unclear, retain manual input and user-supplied local data
  as the fallback; do not silently scrape.

## Existing integration contract
The source-independent `scripts/race_card_adapter.py` already accepts
`source="netkeiba"` and validates normalized cards via
`scripts/jra_card_normalizer.py`.

Each normalized race:
- `date`: YYYY-MM-DD
- `venue`: Japanese racecourse name
- `raceNumber`: 1..12
- `horses`: ordered `{number, name}` entries
- `raceConditions`: `{restrictions, weightRule}`

Validate the venue/date and contiguous 1..N horse numbers; reject incomplete
or inconsistent imports. Keep race-card data transient. Betting history
should retain selected numbers and race conditions, not copied full cards.

## Next technical steps after permission is confirmed
1. Fetch one explicitly selected race URL from an authorized environment.
2. Inspect actual HTML structure; write fixture-backed parser tests.
3. Resolve race IDs from an authorized index instead of guessing them.
4. Validate all 12 races per venue and reject partial refreshes.
5. Connect a temporary card store to the app; retain manual fallback.
6. Verify Tokyo and Kyoto 2026-10-31 before enabling routine updates.

The JRA-only connectivity workflow is **not** a netkeiba downloader and
must not be reused with a netkeiba URL.
