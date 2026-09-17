-- ============================================================
-- AWADH Sports Live — Demo Seed Data
-- ============================================================

-- Admin user (password: Admin@123)
INSERT OR IGNORE INTO users (id, email, password_hash, role, full_name, phone)
VALUES (1, 'admin@primecast.example', 'pbkdf2$100000$U/krOBdIMLcWvZsuIH47oA==$PDk5TaJvEP/9s5WIAK1mcCdoSZEVImLGL8EBfjquhuA=', 'admin', 'Arjun Mehta', '+91 90000 00001');

-- Services (8 clearly differentiated services)
INSERT OR IGNORE INTO services (id, slug, title, short_desc, description, icon, is_active, sort_order) VALUES
 (1,'match-production','Match Production','Multi-camera match coverage, live direction, camera switching and production control.','Multi-camera match coverage, live direction, camera switching and production control. Our crew sets up the cameras, runs the vision mixer and directs the match as it happens — creating the professional live feed.','fa-clapperboard',1,1),
 (2,'digital-streaming','Digital Streaming','Deliver live matches to audiences through YouTube, Facebook and other digital platforms.','Deliver live matches to audiences through YouTube, Facebook and other digital platforms. We take the production feed and broadcast it reliably to your online viewers with encoding, monitoring and backup.','fa-signal',1,2),
 (3,'sports-commentary','Sports Commentary','Professional Hindi, English and bilingual commentary to bring every match to life.','Professional Hindi, English and bilingual commentary to bring every match to life. Experienced commentators and analysts with commentary-box setup and match research.','fa-microphone-lines',1,3),
 (4,'live-scores-graphics','Live Scores & Graphics','Real-time scoreboards, player statistics, team line-ups, match results and on-screen graphics.','Real-time scoreboards, player statistics, team line-ups, match results and on-screen graphics. Lower thirds, sponsor bugs, player cards and match summary graphics built and operated live.','fa-table-columns',1,4),
 (5,'sports-photography','Sports Photography','Professional action shots, player portraits, team photographs and event coverage.','Professional action shots, player portraits, team photographs and event coverage. High-resolution images ready for press, sponsors and social media.','fa-camera',1,5),
 (6,'video-production','Video Production','Player interviews, promotional videos, sponsor films, event videos and behind-the-scenes content.','Player interviews, promotional videos, sponsor films, event videos and behind-the-scenes content. Scripted and edited packages that tell your tournament''s story.','fa-video',1,6),
 (7,'highlights-social-content','Highlights & Social Content','Match highlights, best moments, reels, short-form edits and social media-ready content.','Match highlights, best moments, reels, short-form edits and social media-ready content. Fast-turnaround vertical and horizontal edits built to travel.','fa-film',1,7),
 (8,'tournament-media-branding','Tournament Media & Branding','Sponsor visibility, tournament promotions, branded content and complete media support.','Sponsor visibility, tournament promotions, branded content and complete media support. End-to-end media planning so your sponsors get value and your tournament gets attention.','fa-bullhorn',1,8);

-- Customers
INSERT OR IGNORE INTO customers (id, name, email, phone, organization) VALUES
 (1,'Rohit Sharma','rohit@rpl.in','+91 98111 22233','Rising Premier League'),
 (2,'Priya Nair','priya@citysports.in','+91 98222 33444','City Sports Association'),
 (3,'Vikram Singh','vikram@ko-cup.in','+91 98333 44555','Knockout Cup Committee');

-- Bookings
INSERT OR IGNORE INTO bookings (id, booking_code, customer_id, contact_name, contact_email, contact_phone, organization, event_name, sport, event_date, venue, city, requirements, budget, status) VALUES
 (1,'SBM-2026-RPL001',1,'Rohit Sharma','rohit@rpl.in','+91 98111 22233','Rising Premier League','RPL Season 2','Cricket','2026-10-15','City Stadium','Pune','8-camera broadcast, commentary, graphics, highlights for the full season.','150000 - 250000','under_review'),
 (2,'SBM-2026-KOC002',2,'Priya Nair','priya@citysports.in','+91 98222 33444','City Sports Association','Inter-City Football Cup','Football','2026-11-02','Municipal Ground','Mumbai','Streaming + commentary for 12 matches.','50000 - 90000','quotation_sent'),
 (3,'SBM-2026-KAB003',3,'Vikram Singh','vikram@ko-cup.in','+91 98333 44555','Knockout Cup Committee','State Kabaddi Finals','Kabaddi','2026-09-28','Indoor Arena','Nashik','Live broadcast, replay, graphics and photography.','80000','received');

INSERT OR IGNORE INTO booking_services (booking_id, service_id) VALUES
 (1,1),(1,3),(1,4),(1,5),(1,7),
 (2,2),(2,5),
 (3,1),(3,4),(3,6);

INSERT OR IGNORE INTO booking_messages (booking_id, sender_type, sender_name, message, is_visible) VALUES
 (1,'staff','AWADH Sports Live','Thank you Rohit, your request has been received. Our team will review it and respond shortly.',1),
 (1,'staff','Arjun Mehta','We can cover RPL Season 2 with an 8-camera set-up. Can you confirm the number of match days?',1),
 (2,'staff','AWADH Sports Live','Thank you Priya, your request has been received. Our team will review it and respond shortly.',1),
 (3,'staff','AWADH Sports Live','Thank you Vikram, your request has been received. Our team will review it and respond shortly.',1);

INSERT OR IGNORE INTO quotations (booking_id, amount, currency, details, status, valid_until) VALUES
 (2, 72500, 'INR', 'Streaming + bilingual commentary for 12 matches. Includes 2 cameras per match, highlights reel and social clips.', 'sent', '2026-10-01');

-- Employees
INSERT OR IGNORE INTO users (id, email, password_hash, role, full_name, phone) VALUES
 (2,'manager@primecast.example','pbkdf2$100000$4C0zkEUFGeGV5w89hxIo6A==$c+Kvi2y80Ut0mnS2EgmfytzFLjl/YO3rDbXcurR/PZs=','manager','Neha Kapoor','+91 90000 00002'),
 (3,'employee@primecast.example','pbkdf2$100000$RVqrIpl4+HTGPkVbcxXoWA==$XtpOGAA9fEHr06xAZZQmfghmzIxAmsUOCZSlYLZn5ko=','employee','Sameer Khan','+91 90000 00003'),
 (4,'meera@primecast.example','pbkdf2$100000$mkzSrK9lPjTyNYJVTbXYwg==$aYZDWJhQaVRKUppwaW2lBv40wr+6zVUH03KWNsDcuQo=','employee','Meera Joshi','+91 90000 00004'),
 (5,'rahul@primecast.example','pbkdf2$100000$LdUo+OEJSI+Kq8B9dq9dCw==$Xt+TAARcGx0Ug4Kfl5cbIx/8wQGl7tEti5HyeArmdJ4=','employee','Rahul Verma','+91 90000 00005');

INSERT OR IGNORE INTO employees (id, user_id, emp_code, department, designation, joining_date, status, skills) VALUES
 (1,2,'PC-001','Production','Production Manager','2023-01-15','active','production, direction, planning'),
 (2,3,'PC-002','Camera','Senior Camera Operator','2023-03-01','active','camera, steadicam'),
 (3,4,'PC-003','Graphics','Graphics Designer','2024-02-10','active','graphics, replay'),
 (4,5,'PC-004','Streaming','Streaming Engineer','2024-06-20','active','streaming, audio, encoding');

-- Events
INSERT OR IGNORE INTO events (id, name, sport, organizer, customer_id, booking_id, description, start_date, end_date, reporting_time, venue_name, venue_address, production_plan, required_services, status) VALUES
 (1,'State Kabaddi Finals','Kabaddi','Knockout Cup Committee',3,3,'Live broadcast of the state-level kabaddi finals with replay and graphics.','2026-09-28','2026-09-28','04:00 PM','Indoor Arena','Indoor Arena, Nashik','4-camera set-up with 2 replays and live score graphics','Live broadcast, Replay & Graphics, Photography','upcoming'),
 (2,'RPL Season 2 — Opening Match','Cricket','Rising Premier League',1,1,'Opening match of RPL Season 2 with full broadcast production.','2026-10-15','2026-10-15','01:00 PM','City Stadium','City Stadium, Pune','8-camera broadcast, commentary, graphics, highlights','Live Broadcast, Multi-Camera, Graphics, Commentary, Highlights','upcoming'),
 (3,'Summer Slam Football','Football','City Sports Association',2,NULL,'Completed football tournament coverage.','2026-06-10','2026-06-14','03:00 PM','Municipal Ground','Municipal Ground, Mumbai','Streaming and commentary for the tournament','Streaming, Commentary','completed');

-- Event team
INSERT OR IGNORE INTO event_team (event_id, employee_id, role) VALUES
 (2,1,'producer'),(2,2,'camera'),(2,3,'graphics'),(2,4,'streaming'),
 (1,2,'camera'),(1,3,'graphics');

-- Production schedule
INSERT OR IGNORE INTO production_schedule (event_id, milestone, start_time, notes) VALUES
 (2,'setup','2026-10-15 09:00:00','Camera and cable setup at Stadium'),
 (2,'testing','2026-10-15 11:00:00','Signal and streaming test'),
 (2,'live','2026-10-15 13:00:00','Broadcast live'),
 (2,'wrap_up','2026-10-15 20:00:00','Pack down and media ingest');

-- Live events
INSERT OR IGNORE INTO live_events (id, event_id, platform, stream_url, status, scheduled_at, display_order) VALUES
 (1,2,'youtube','https://www.youtube.com/embed/live_stream?channel=UC_x5XG1OV2P6uZZ5FSM9Ttw','upcoming','2026-10-15 13:00:00',1),
 (2,1,'youtube','https://www.youtube.com/embed/live_stream?channel=UC_x5XG1OV2P6uZZ5FSM9Ttw','upcoming','2026-09-28 16:00:00',2);

-- Equipment
INSERT OR IGNORE INTO equipment (id, name, category, serial_no, status) VALUES
 (1,'Sony PXW-Z280','camera','CAM-0001','available'),
 (2,'Blackmagic ATEM 4 M/E','switcher','SW-0002','available'),
 (3,'Rode Wireless GO II','audio','AU-0003','available'),
 (4,'Teradek VidiU Pro','streaming','ST-0004','available'),
 (5,'Aputure 300D','lighting','LT-0005','available'),
 (6,'Canon 70-200mm f/2.8','camera','CAM-0006','available');

INSERT OR IGNORE INTO equipment_assignments (equipment_id, employee_id, event_id, status) VALUES
 (1,2,2,'issued'),(2,1,2,'issued'),(4,4,2,'issued');

-- Media (approved & public)
INSERT OR IGNORE INTO media (id, title, media_type, url, thumbnail, event_id, sport, status, is_public) VALUES
 (1,'Summer Slam Final Highlights','highlight','https://www.youtube.com/watch?v=dQw4w9WgXcQ','https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=600','3','Football','approved',1),
 (2,'RPL Season 1 Best Moments','highlight','https://www.youtube.com/watch?v=dQw4w9WgXcQ','https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=600','2','Cricket','approved',1),
 (3,'Kabaddi Finals — Post Match Interview','interview','https://www.youtube.com/watch?v=dQw4w9WgXcQ','https://images.unsplash.com/photo-1517649763962-0c623066013b?w=600','1','Kabaddi','approved',1),
 (4,'City Stadium Atmosphere','photo','https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1200','https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=600','2','Cricket','approved',1),
 (5,'Match Day Reel','reel','https://www.youtube.com/watch?v=dQw4w9WgXcQ','https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=600','3','Football','approved',1),
 (6,'Broadcast Control Room','photo','https://images.unsplash.com/photo-1598387993281-cecf8b71f7c0?w=1200','https://images.unsplash.com/photo-1598387993281-cecfb71f7c0?w=600',NULL,NULL,'approved',1);

-- Portfolio
INSERT OR IGNORE INTO portfolio (id, title, category, sport, client, description, services_delivered, cover_image, is_published) VALUES
 (1,'RPL Season 1','league','Cricket','Rising Premier League','Full-season broadcast coverage with multi-camera production, commentary and daily highlights for 24 matches.','Live Broadcast, Multi-Camera, Commentary, Highlights','https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800',1),
 (2,'Inter-City Football Cup','tournament','Football','City Sports Association','12-match live streaming with bilingual commentary and social highlight reels.','Streaming, Commentary, Highlights','https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800',1),
 (3,'State Kabaddi Championship','championship','Kabaddi','Knockout Cup Committee','4-camera broadcast with instant replay, live graphics and action photography.','Live Broadcast, Replay & Graphics, Photography','https://images.unsplash.com/photo-1517649763962-0c623066013b?w=800',1),
 (4,'Corporate Sports Meet','event','Athletics','TechNova Pvt Ltd','Annual corporate sports meet coverage with photo and video highlights.','Photography, Videography, Highlights','https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800',1),
 (5,'Night Cricket League','league','Cricket','Metro Cricket Board','Floodlit night cricket coverage with super slow-motion replays.','Live Broadcast, Replay & Graphics','https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=800',1);

-- Job openings
INSERT OR IGNORE INTO job_openings (id, title, department, location, job_type, description, is_open) VALUES
 (1,'Camera Operator','Production','Pune','full_time','Operate broadcast cameras for live sports events. Experience with broadcast/DSLR rigs preferred.',1),
 (2,'Streaming Engineer','Streaming','Mumbai','full_time','Manage live streaming encoding, monitoring and redundancy for multi-platform delivery.',1),
 (3,'Video Editor (Freelance)','Post-Production','Remote','freelance','Edit highlight packages and reels with fast turnaround after live events.',1);

-- Website content
INSERT OR IGNORE INTO website_content (section, content_key, content_value) VALUES
 ('settings','company_name','AWADH Sports Live'),
 ('settings','support_email','hello@primecast.example'),
 ('settings','support_phone','+91 90000 00000'),
 ('settings','address','Sports Media House, Stadium Road, India'),
 ('settings','otp_expiry','10'),
 ('home_hero','tagline','Where every match goes live');

-- Activity log seed
INSERT OR IGNORE INTO activity_logs (user_id, actor_name, action, entity, details) VALUES
 (1,'Arjun Mehta','system.seed','system','Demo data loaded');

-- ============================================================
-- YouTube: latest live broadcasts from @awadh_sports
-- ============================================================
INSERT OR IGNORE INTO youtube_videos (video_id, title, category, is_live, is_upcoming, published_at, sort_order) VALUES
 ('EP_H_QLpsSs','Quarter Final 🔥 Budh Singh ClubPali vs Bambawar | Babu Ram Bhati Memorial Cricket Tournament Season 2','Cricket',0,0,'2026-09-17',1),
 ('JCxzJr4aGVk','Quarter Final 🔥 Nawada Tigers vs Bodaki Cricket','Cricket',0,0,'2026-09-17',2),
 ('IetZ28mC9fc','JSB Kulipura Tigers 🆚 Khanpur 2 | LIVE CRICKET | Round Two','Cricket',0,0,'2026-09-17',3),
 ('pfjQigvSO3U','🔴 LIVE | Jawli Warriors XI vs Datawali Cricket Club | Round Two','Cricket',0,0,'2026-09-16',4),
 ('K_fIuOLCZlU','🔴 LIVE | Kalda Cricket Team vs Bambawar | Round Two | 20 Over Match','Cricket',0,0,'2026-09-16',5);

-- ============================================================
-- Team members (About page)
-- ============================================================
INSERT OR IGNORE INTO team_members (id, name, role, bio, email, sort_order, is_active) VALUES
 (1,'Arjun Mehta','Founder','Founded AWADH Sports Live to bring professional broadcast quality to grassroots and league sport. Leads vision, partnerships and production standards.','info.awadhsports@gmail.com',1,1),
 (2,'Rahul Verma','Production Manager','Runs match-day operations — crew rosters, camera plans, live direction and streaming delivery across every event.','info.awadhsports@gmail.com',2,1),
 (3,'Neha Kapoor','Administrator','Manages bookings, client communication, scheduling and the operations platform that keeps every production on track.','info.awadhsports@gmail.com',3,1);

-- ============================================================
-- Customer login account (password: Customer@123) — links to customer #1
-- ============================================================
INSERT OR IGNORE INTO users (id, email, password_hash, role, full_name, phone)
VALUES (10,'customer@awadhsports.example','pbkdf2$100000$U/krOBdIMLcWvZsuIH47oA==$PDk5TaJvEP/9s5WIAK1mcCdoSZEVImLGL8EBfjquhuA=','customer','Rohit Sharma','+91 98111 22233');
UPDATE customers SET user_id = 10 WHERE id = 1 AND user_id IS NULL;
