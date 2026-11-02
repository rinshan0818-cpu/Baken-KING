-- Planned additive migration for Baken-KING friend summaries.
-- Run only after confirming authenticated API role and RLS policies.
-- Existing data is not deleted. This file is not applied automatically.
ALTER TABLE public.sharing_snapshots
 ADD COLUMN IF NOT EXISTS purchased_race_count integer NOT NULL DEFAULT 0,
 ADD COLUMN IF NOT EXISTS hit_race_count integer NOT NULL DEFAULT 0,
 ADD COLUMN IF NOT EXISTS settled_race_count integer NOT NULL DEFAULT 0,
 ADD COLUMN IF NOT EXISTS max_payout_yen bigint;
ALTER TABLE public.sharing_snapshots
 ADD CONSTRAINT bk_snapshot_race_numbers_check
 CHECK (purchased_race_count BETWEEN 0 AND 100000 AND settled_race_count BETWEEN 0 AND purchased_race_count AND hit_race_count BETWEEN 0 AND settled_race_count);
ALTER TABLE public.sharing_snapshots
 ADD CONSTRAINT bk_snapshot_max_payout_check
 CHECK (max_payout_yen IS NULL OR max_payout_yen BETWEEN 0 AND 1000000000000);
-- RLS is enabled/forced on existing sharing tables. No blanket policies
-- should be added. A deployed authenticated API must use a scoped DB role
-- with narrowly defined policies or secure server-only functions.
