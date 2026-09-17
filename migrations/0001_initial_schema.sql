-- ============================================================
-- Sports Broadcast & Media Platform — Initial Schema
-- Section 11: Database — Initial Logical Design
-- ============================================================

-- 1. users  (authentication identity + role mapping)
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,               -- PBKDF2-SHA256, format: pbkdf2$iter$salt$hash
  role          TEXT NOT NULL DEFAULT 'employee', -- admin | manager | employee | customer
  full_name     TEXT NOT NULL,
  phone         TEXT,
  is_active     INTEGER NOT NULL DEFAULT 1,
  last_login_at DATETIME,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role  ON users(role);

-- 2. customers
CREATE TABLE IF NOT EXISTS customers (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER,                     -- nullable: booking does not require login
  name          TEXT NOT NULL,
  email         TEXT,
  phone         TEXT NOT NULL,
  organization  TEXT,
  address       TEXT,
  notes         TEXT,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

-- 3. employees
CREATE TABLE IF NOT EXISTS employees (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL,
  emp_code      TEXT UNIQUE,
  department    TEXT,
  designation   TEXT,
  joining_date  DATE,
  status        TEXT NOT NULL DEFAULT 'active',  -- active | inactive | on_leave
  skills        TEXT,                        -- comma separated: camera, streaming, graphics...
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_employees_user ON employees(user_id);

-- 4. attendance
CREATE TABLE IF NOT EXISTS attendance (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL,
  work_date   DATE NOT NULL,
  check_in    DATETIME,
  check_out   DATETIME,
  status      TEXT NOT NULL DEFAULT 'present', -- present | absent | late | half_day | leave
  notes       TEXT,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(employee_id, work_date),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_attendance_emp_date ON attendance(employee_id, work_date);

-- 5. tasks
CREATE TABLE IF NOT EXISTS tasks (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  title        TEXT NOT NULL,
  description  TEXT,
  assigned_to  INTEGER,                      -- employees.id
  assigned_by  INTEGER,                      -- users.id
  event_id     INTEGER,
  priority     TEXT NOT NULL DEFAULT 'medium',  -- low | medium | high | critical
  status       TEXT NOT NULL DEFAULT 'pending', -- pending | in_progress | review | completed | cancelled
  due_date     DATE,
  proof_url    TEXT,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (assigned_to) REFERENCES employees(id) ON DELETE SET NULL,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_event ON tasks(event_id);

-- 6. events
CREATE TABLE IF NOT EXISTS events (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  sport         TEXT,
  organizer     TEXT,
  customer_id   INTEGER,
  booking_id    INTEGER,
  description   TEXT,
  start_date    DATE,
  end_date      DATE,
  reporting_time TEXT,
  venue_name    TEXT,
  venue_address TEXT,
  production_plan TEXT,
  required_services TEXT,
  status        TEXT NOT NULL DEFAULT 'draft', -- draft|upcoming|live|completed|cancelled
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  FOREIGN KEY (booking_id)  REFERENCES bookings(id)  ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_start  ON events(start_date);

-- 7. event_team
CREATE TABLE IF NOT EXISTS event_team (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id    INTEGER NOT NULL,
  employee_id INTEGER NOT NULL,
  role        TEXT NOT NULL,                 -- camera | streaming | graphics | commentary | ...
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(event_id, employee_id, role),
  FOREIGN KEY (event_id)    REFERENCES events(id)    ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- 8. services
CREATE TABLE IF NOT EXISTS services (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT UNIQUE NOT NULL,
  title       TEXT NOT NULL,
  short_desc  TEXT,
  description TEXT,
  icon        TEXT,
  base_price  REAL,
  is_active   INTEGER NOT NULL DEFAULT 1,
  sort_order  INTEGER DEFAULT 0,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 9. bookings  (no login required)
CREATE TABLE IF NOT EXISTS bookings (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_code   TEXT UNIQUE NOT NULL,       -- e.g. SBM-2026-A1B2C3
  customer_id    INTEGER,
  contact_name   TEXT NOT NULL,
  contact_email  TEXT,
  contact_phone  TEXT NOT NULL,
  organization   TEXT,
  event_name     TEXT,
  sport          TEXT,
  event_date     DATE,
  venue          TEXT,
  city           TEXT,
  requirements   TEXT,
  budget         TEXT,
  status         TEXT NOT NULL DEFAULT 'received',
  -- received | under_review | discussion | quotation_sent | approved | in_production | completed | cancelled
  admin_notes    TEXT,                        -- internal only
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_bookings_code   ON bookings(booking_code);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

-- 10. booking_services
CREATE TABLE IF NOT EXISTS booking_services (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id  INTEGER NOT NULL,
  service_id  INTEGER NOT NULL,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
  UNIQUE(booking_id, service_id)
);

-- 11. booking_messages  (customer-visible thread)
CREATE TABLE IF NOT EXISTS booking_messages (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id  INTEGER NOT NULL,
  sender_type TEXT NOT NULL,                 -- customer | staff
  sender_name TEXT,
  message     TEXT NOT NULL,
  is_visible  INTEGER NOT NULL DEFAULT 1,    -- 1 = customer can see
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_bmsgs_booking ON booking_messages(booking_id);

-- 12. quotations
CREATE TABLE IF NOT EXISTS quotations (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id  INTEGER NOT NULL,
  amount      REAL NOT NULL,
  currency    TEXT NOT NULL DEFAULT 'INR',
  details     TEXT,
  file_url    TEXT,
  status      TEXT NOT NULL DEFAULT 'sent',  -- sent | accepted | changes_requested | rejected
  valid_until DATE,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

-- 13. documents
CREATE TABLE IF NOT EXISTS documents (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id  INTEGER,
  event_id    INTEGER,
  title       TEXT NOT NULL,
  file_url    TEXT NOT NULL,
  doc_type    TEXT,
  is_customer_visible INTEGER NOT NULL DEFAULT 0,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 14. equipment
CREATE TABLE IF NOT EXISTS equipment (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT NOT NULL,
  category     TEXT,                          -- camera | switcher | audio | lighting | streaming
  serial_no    TEXT,
  status       TEXT NOT NULL DEFAULT 'available', -- available | assigned | maintenance | retired
  condition_note TEXT,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 15. equipment_assignments
CREATE TABLE IF NOT EXISTS equipment_assignments (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  equipment_id INTEGER NOT NULL,
  employee_id  INTEGER,
  event_id     INTEGER,
  issued_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  returned_at  DATETIME,
  status       TEXT NOT NULL DEFAULT 'issued', -- issued | returned | damaged
  condition_note TEXT,
  FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id)  REFERENCES employees(id) ON DELETE SET NULL,
  FOREIGN KEY (event_id)     REFERENCES events(id)    ON DELETE SET NULL
);

-- 16. live_events
CREATE TABLE IF NOT EXISTS live_events (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id     INTEGER NOT NULL,
  platform     TEXT,                          -- youtube | facebook | custom
  stream_url   TEXT,
  embed_code   TEXT,
  status       TEXT NOT NULL DEFAULT 'upcoming', -- upcoming | live | completed
  scheduled_at DATETIME,
  display_order INTEGER DEFAULT 0,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_live_status ON live_events(status);

-- 17. media
CREATE TABLE IF NOT EXISTS media (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  title        TEXT NOT NULL,
  media_type   TEXT NOT NULL DEFAULT 'photo', -- photo | video | highlight | reel | interview
  url          TEXT NOT NULL,
  thumbnail    TEXT,
  event_id     INTEGER,
  sport        TEXT,
  uploaded_by  INTEGER,                       -- employees.id
  status       TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  is_public    INTEGER NOT NULL DEFAULT 0,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_media_status ON media(status);

-- 18. portfolio
CREATE TABLE IF NOT EXISTS portfolio (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  title        TEXT NOT NULL,
  category     TEXT,                          -- sport / event / type
  sport        TEXT,
  client       TEXT,
  description  TEXT,
  services_delivered TEXT,
  cover_image  TEXT,
  video_url    TEXT,
  event_id     INTEGER,
  is_published INTEGER NOT NULL DEFAULT 1,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 19. notifications
CREATE TABLE IF NOT EXISTS notifications (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER,
  title      TEXT NOT NULL,
  body       TEXT,
  link       TEXT,
  is_read    INTEGER NOT NULL DEFAULT 0,
  audience   TEXT NOT NULL DEFAULT 'user',    -- user | employees | managers | admins | all
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, is_read);

-- 20. activity_logs
CREATE TABLE IF NOT EXISTS activity_logs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER,
  actor_name TEXT,
  action     TEXT NOT NULL,
  entity     TEXT,
  entity_id  INTEGER,
  details    TEXT,
  ip         TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 21. website_content (CMS)
CREATE TABLE IF NOT EXISTS website_content (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  section    TEXT NOT NULL,                   -- home_hero | about | contact | cta ...
  content_key TEXT NOT NULL,
  content_value TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(section, content_key)
);

-- 22. otp_codes (secure booking tracking)
CREATE TABLE IF NOT EXISTS otp_codes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id  INTEGER NOT NULL,
  destination TEXT NOT NULL,                  -- phone or email
  code_hash   TEXT NOT NULL,                  -- PBKDF2 hash of 6-digit OTP
  attempts    INTEGER NOT NULL DEFAULT 0,
  expires_at  DATETIME NOT NULL,
  used        INTEGER NOT NULL DEFAULT 0,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_otp_booking ON otp_codes(booking_id);

-- 23. sessions
CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,                -- random session token
  user_id    INTEGER NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- 24. inquiries (contact page)
CREATE TABLE IF NOT EXISTS inquiries (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  email      TEXT,
  phone      TEXT,
  subject    TEXT,
  message    TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'new',     -- new | read | responded
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 25. leave_requests
CREATE TABLE IF NOT EXISTS leave_requests (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL,
  from_date   DATE NOT NULL,
  to_date     DATE NOT NULL,
  reason      TEXT,
  status      TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  decided_by  INTEGER,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- 26. issue_reports
CREATE TABLE IF NOT EXISTS issue_reports (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL,
  event_id    INTEGER,
  title       TEXT NOT NULL,
  description TEXT,
  severity    TEXT NOT NULL DEFAULT 'medium', -- low | medium | high | critical
  media_url   TEXT,
  status      TEXT NOT NULL DEFAULT 'open',   -- open | in_progress | resolved
  resolution  TEXT,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- 27. task_comments
CREATE TABLE IF NOT EXISTS task_comments (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id    INTEGER NOT NULL,
  user_id    INTEGER,
  author_name TEXT,
  comment    TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- 28. production_schedule (event milestones)
CREATE TABLE IF NOT EXISTS production_schedule (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id   INTEGER NOT NULL,
  milestone  TEXT NOT NULL,                   -- setup|testing|rehearsal|live|wrap_up
  start_time DATETIME,
  end_time   DATETIME,
  notes      TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

-- 29. careers
CREATE TABLE IF NOT EXISTS job_openings (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  department  TEXT,
  location    TEXT,
  job_type    TEXT DEFAULT 'full_time',
  description TEXT,
  is_open     INTEGER NOT NULL DEFAULT 1,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS job_applications (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id      INTEGER,
  name        TEXT NOT NULL,
  email       TEXT,
  phone       TEXT,
  resume_url  TEXT,
  cover_letter TEXT,
  status      TEXT NOT NULL DEFAULT 'new',
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES job_openings(id) ON DELETE SET NULL
);

-- 30. role_permissions (RBAC fine control)
CREATE TABLE IF NOT EXISTS role_permissions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  role       TEXT NOT NULL,
  module     TEXT NOT NULL,
  can_view   INTEGER NOT NULL DEFAULT 0,
  can_edit   INTEGER NOT NULL DEFAULT 0,
  UNIQUE(role, module)
);
