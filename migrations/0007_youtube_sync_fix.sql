-- ============================================================
-- 0007 — Fix YouTube auto-sync
-- ------------------------------------------------------------
-- The channel's real handle is `@awadh_sports.` (WITH a trailing
-- dot). `@awadh_sports` (no dot) returns HTTP 404, so the channel
-- id could never be resolved and sync silently did nothing.
-- Correct the stored handle and pin the canonical channel id.
-- ============================================================

-- 1. Correct the stored handle (only if it is the known-bad value).
UPDATE app_settings
   SET value = 'awadh_sports.', updated_at = CURRENT_TIMESTAMP
 WHERE key = 'youtube_channel_handle'
   AND value = 'awadh_sports';

-- 2. Ensure a handle row exists at all (fresh installs).
INSERT OR IGNORE INTO app_settings (key, value) VALUES ('youtube_channel_handle', 'awadh_sports.');

-- 3. Pin the canonical channel id so sync works even if the handle lookup fails.
INSERT INTO app_settings (key, value, updated_at)
VALUES ('youtube_channel_id', 'UCXDdAHKzDEcHyKhl6kZkN8A', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET
  value = CASE
            WHEN app_settings.value IS NULL OR app_settings.value = '' OR app_settings.value = 'awadh_sports'
            THEN 'UCXDdAHKzDEcHyKhl6kZkN8A'
            ELSE app_settings.value
          END,
  updated_at = CURRENT_TIMESTAMP;

-- 4. Clear the (empty) last-sync marker so the next request triggers a sync.
UPDATE app_settings
   SET value = '', updated_at = CURRENT_TIMESTAMP
 WHERE key = 'youtube_last_sync'
   AND value NOT LIKE '%T%';
