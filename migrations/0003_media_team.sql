-- ============================================================
-- 0003 — YouTube videos, About-page team members, customer accounts
-- ============================================================

-- 1. YouTube videos (last live broadcasts + upcoming streams)
CREATE TABLE IF NOT EXISTS youtube_videos (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  video_id     TEXT UNIQUE NOT NULL,
  title        TEXT NOT NULL,
  description  TEXT,
  category     TEXT,                          -- cricket | football | highlights | ...
  duration     TEXT,
  is_live      INTEGER NOT NULL DEFAULT 0,    -- currently live
  is_upcoming  INTEGER NOT NULL DEFAULT 0,    -- scheduled premiere / upcoming stream
  scheduled_at DATETIME,
  published_at DATE,
  views        TEXT,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  is_active    INTEGER NOT NULL DEFAULT 1,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_youtube_active ON youtube_videos(is_active, sort_order);

-- 2. Team members shown on the About page (Founder / Production Manager / Admin ...)
CREATE TABLE IF NOT EXISTS team_members (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  role       TEXT NOT NULL,                   -- Founder | Production Manager | Administrator
  bio        TEXT,
  photo_url  TEXT,
  email      TEXT,
  phone      TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active  INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_team_active ON team_members(is_active, sort_order);

-- 3. Customer accounts: link customers to a users row for self-service login.
--    (users.role = 'customer'; customers.user_id already exists and is nullable.)
CREATE INDEX IF NOT EXISTS idx_customers_user ON customers(user_id);
