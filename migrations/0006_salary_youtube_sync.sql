-- ============================================================
-- 0006 — Employee salary, half-day policy & YouTube auto-sync
-- ============================================================

-- 1. Salary on the employee record (monthly gross, in INR)
ALTER TABLE employees ADD COLUMN monthly_salary REAL;

-- 2. Generic key/value settings table (used for YouTube sync state,
--    attendance policy and any other runtime configuration).
CREATE TABLE IF NOT EXISTS app_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Seed the attendance policy (check-in after this time => half day).
INSERT OR IGNORE INTO app_settings (key, value) VALUES ('attendance_checkin_cutoff', '09:00');
INSERT OR IGNORE INTO app_settings (key, value) VALUES ('attendance_timezone', 'Asia/Kolkata');
INSERT OR IGNORE INTO app_settings (key, value) VALUES ('salary_working_days', '30');
INSERT OR IGNORE INTO app_settings (key, value) VALUES ('youtube_channel_handle', 'awadh_sports');
INSERT OR IGNORE INTO app_settings (key, value) VALUES ('youtube_last_sync', '');

-- 3. Track live/upcoming hints coming from the YouTube sync so the
--    public Live hub can surface them even before an admin edits them.
ALTER TABLE youtube_videos ADD COLUMN source TEXT NOT NULL DEFAULT 'manual'; -- manual | sync
ALTER TABLE youtube_videos ADD COLUMN live_now INTEGER NOT NULL DEFAULT 0;
