# No-live-odds data plan (2026-10-30)

## Confirmed product decision
Baken-KING does **not** require real-time odds, predicted odds, or odds snapshots.
Use only (1) pre-race schedule and entry cards and (2) post-finalization official payouts and results. Payouts are yen per 100 yen stake; winnings = stake / 100 * payout, for matching tickets.

## Data flow
1. Resolve race IDs and card metadata (date, venue, race number, start time, horse number/name, frame).
2. Store source, timestamp and provenance in a private test dataset. Never publish third-party race data into public GitHub Pages without permission.
3. Accept virtual wagers before server-verified closing time. Do not assume an unverified browser clock is sufficient.
4. After race finalization, fetch finish and per-ticket-type payouts once (retry safely if incomplete).
5. Match ordered bets (exacta/trifecta) separately from unordered bets (quinella/quinella place/trio); bracket quinella uses frame numbers.
6. Handle scratched/excluded horses, refunds, dead heats and multiple winning combinations explicitly.
7. Settle idempotently; a second import must not credit a ticket twice.

## Candidate source: KeibaAI-developer/keiba-scraping
Documented interfaces: EntryPageScraper(race_id).get_entry(), ResultPageScraper(race_id).get_result() and get_*_payoff() for all eight bet types. This is an interface review, **not** a verified live scrape.
The library's license does not grant permission to republish netkeiba data. Netkeiba terms restrict copying and distribution beyond private use. Before automating requests or deploying, confirm acceptable usage and storage with the provider.

## Acceptance checks before activation
- A permitted historical race: card horse numbers/names agree with the source.
- Finalized payouts match the published amounts for all eight bet types.
- Missing/unfinalized results never settle.
- One repeated import produces no duplicate credits.
- No real data is committed to a public repository.
- Works on iPhone as a consumer; no Windows PC needed.
