-- Invent-day streak boundary. Set once from the browser's IANA zone.
ALTER TABLE users ADD COLUMN IF NOT EXISTS time_zone TEXT;
