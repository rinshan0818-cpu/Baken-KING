-- Baken-KING friend sharing P1 draft. Run ONLY in a new dedicated database.
-- User identities must be obtained from verified server-side authentication.
-- Never grant these tables to browser/client SQL roles directly.
BEGIN;
CREATE TABLE IF NOT EXISTS sharing_users (
  id uuid PRIMARY KEY,
  display_name varchar(40) NOT NULL CHECK (length(trim(display_name)) BETWEEN 1 AND 40),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sharing_requests (
  id uuid PRIMARY KEY,
  sender_id uuid NOT NULL REFERENCES sharing_users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES sharing_users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','rejected','revoked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  CHECK(sender_id<>recipient_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS sharing_requests_one_pending_pair
 ON sharing_requests (LEAST(sender_id,recipient_id),GREATEST(sender_id,recipient_id))
 WHERE status='pending';
CREATE TABLE IF NOT EXISTS sharing_friendships (
  user_low uuid NOT NULL REFERENCES sharing_users(id) ON DELETE CASCADE,
  user_high uuid NOT NULL REFERENCES sharing_users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_low,user_high),
  CHECK(user_low<user_high)
);
CREATE TABLE IF NOT EXISTS sharing_snapshots (
  owner_id uuid PRIMARY KEY REFERENCES sharing_users(id) ON DELETE CASCADE,
  schema_version integer NOT NULL DEFAULT 1 CHECK (schema_version=1),
  stake_yen bigint NOT NULL CHECK(stake_yen BETWEEN 0 AND 1000000000000),
  returned_yen bigint NOT NULL CHECK(returned_yen BETWEEN 0 AND 1000000000000),
  settled_ticket_count integer NOT NULL CHECK(settled_ticket_count BETWEEN 0 AND 100000),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- Defense-in-depth. The backend connects using a restricted role with only
-- carefully scoped API functions, NEVER the table owner or admin credentials.
ALTER TABLE sharing_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sharing_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE sharing_friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE sharing_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE sharing_users FORCE ROW LEVEL SECURITY;
ALTER TABLE sharing_requests FORCE ROW LEVEL SECURITY;
ALTER TABLE sharing_friendships FORCE ROW LEVEL SECURITY;
ALTER TABLE sharing_snapshots FORCE ROW LEVEL SECURITY;
-- Deliberately no broad client grants or policies in this draft; fail closed.
-- Implement verified-session-bound RLS policies and transactional write functions
-- before allowing the backend role to read or modify any sharing row.
COMMIT;
