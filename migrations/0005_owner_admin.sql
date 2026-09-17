-- ============================================================
-- 0005 — Owner / master admin account for AWADH Sports Live
--        Admin:  admin@awadhsports.com
--        Pass :  Awadh@2026   (change it any time from /profile)
-- ============================================================
INSERT OR IGNORE INTO users (email, password_hash, role, full_name, phone)
VALUES (
  'admin@awadhsports.com',
  'pbkdf2$100000$L5xCGw85sOkQRqB+NKL+bQ==$CkoZ1sidONeWWodutHn/zSJDcoTgwZe/NsDGiTr2Apk=',
  'admin',
  'AWADH Sports Admin',
  '+91 79854 28973'
);
