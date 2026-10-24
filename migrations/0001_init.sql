-- Only made-up records: NO patients, PHI, diagnoses or phone numbers.
CREATE TABLE IF NOT EXISTS facilities(
 id TEXT PRIMARY KEY, display_name TEXT NOT NULL, district TEXT NOT NULL,
 type TEXT NOT NULL CHECK(type IN ('phc','referral')),
 active INTEGER NOT NULL CHECK(active IN (0,1)),
 demo_only INTEGER NOT NULL CHECK(demo_only=1));
CREATE TABLE IF NOT EXISTS capacity_reports(
 facility_id TEXT PRIMARY KEY REFERENCES facilities(id),
 beds INTEGER NOT NULL CHECK(beds BETWEEN 0 AND 500),
 skilled INTEGER NOT NULL CHECK(skilled IN (0,1)),
 theatre INTEGER NOT NULL CHECK(theatre IN (0,1)),
 blood INTEGER NOT NULL CHECK(blood IN (0,1)),
 updated_at TEXT NOT NULL,
 reported_by TEXT NOT NULL CHECK(reported_by='demo_facility_staff'));
CREATE TABLE IF NOT EXISTS referrals(
 id TEXT PRIMARY KEY,code TEXT NOT NULL,
 facility_id TEXT NOT NULL REFERENCES facilities(id),
 need TEXT NOT NULL CHECK(need IN ('skilled','theatre','blood','comprehensive')),
 status TEXT NOT NULL CHECK(status IN ('offered','accepted','arrived','completed','declined','escalated','expired')),
 demo_only INTEGER NOT NULL CHECK(demo_only=1),
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS referral_events(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 referral_id TEXT NOT NULL REFERENCES referrals(id),
 status TEXT NOT NULL,
 actor TEXT NOT NULL CHECK(actor IN ('demo_coordinator','demo_facility_staff')),
 detail TEXT NOT NULL, at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status,updated_at);
