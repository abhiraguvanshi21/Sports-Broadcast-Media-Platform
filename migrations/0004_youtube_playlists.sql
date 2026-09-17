-- ============================================================
-- 0004 — YouTube playlists (used as real portfolio / "work we did")
--        + portfolio.playlist_id link + fresh varied broadcasts
-- ============================================================

-- 1. Playlists from the AWADH Sports YouTube channel.
--    Each playlist == a real tournament/league we produced,
--    so it doubles as portfolio proof of work.
CREATE TABLE IF NOT EXISTS youtube_playlists (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  playlist_id   TEXT UNIQUE NOT NULL,
  title         TEXT NOT NULL,
  description   TEXT,
  category      TEXT,                          -- Cricket | Football | Corporate | ...
  client        TEXT,                          -- organisers / league name
  cover_video   TEXT,                          -- first video id -> thumbnail
  video_count   INTEGER NOT NULL DEFAULT 0,
  services      TEXT,                          -- services delivered
  is_featured   INTEGER NOT NULL DEFAULT 0,    -- show on home / portfolio top
  sort_order    INTEGER NOT NULL DEFAULT 0,
  is_active     INTEGER NOT NULL DEFAULT 1,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ytpl_active ON youtube_playlists(is_active, sort_order);

-- 2. Link a portfolio entry to a YouTube playlist (optional).
ALTER TABLE portfolio ADD COLUMN playlist_id TEXT;
ALTER TABLE portfolio ADD COLUMN external_url TEXT;

-- 3. Additional varied YouTube broadcasts (different leagues / seasons).
INSERT OR IGNORE INTO youtube_videos (video_id, title, category, is_live, is_upcoming, published_at, sort_order) VALUES
 ('m1ybyP2IAts','South Delhi Scalpels vs West Delhi Vitals | DMPL Season 3','Cricket',0,0,'2026-09-14',6),
 ('lWXag6XARII','Outer Delhi Nephrons vs West Delhi Vitals | DMPL Season 3','Cricket',0,0,'2026-09-14',7),
 ('wcw3XY245uQ','JSB Kulipura Tigers vs Birondi 11 | Round One | Ch. Babu Ram Bhati Memorial Gramin Cricket Tournament','Cricket',0,0,'2026-09-13',8),
 ('r5dt4ko8XL0','Grand Final | Delhi Dominators vs Nokia Gurgaon | Pure Corporate Championship Season 2','Corporate',0,0,'2026-09-12',9),
 ('448_uDt9gws','JSB Niyana Team vs Bambawar | LIVE CRICKET MATCH','Cricket',0,0,'2026-09-11',10),
 ('hLWVs4bkAJA','South Delhi Scalpels vs West Delhi Vitals | DMPL Season 3 | Highlights','Cricket',0,0,'2026-09-10',11),
 ('oI6eLcbDHV0','Bisrakh Champions vs Bhanota Cricket | Round Two | 20 Over Match','Cricket',0,0,'2026-09-09',12),
 ('dhgcZMrS75w','Dadha Boyys vs Kachera | Round Two | 20 Over Match','Cricket',0,0,'2026-09-08',13),
 ('6Jq76Qj-msA','Bodaki Cricket Association vs Bansal Cricket Club Chirodi | Round Two','Cricket',0,0,'2026-09-07',14),
 ('dkUGuVtWiIA','Nawada Tigers vs Bamheta | Round Two | LIVE CRICKET','Cricket',0,0,'2026-09-06',15);

-- 4. Playlists = real tournaments we worked on (portfolio).
INSERT OR IGNORE INTO youtube_playlists (playlist_id, title, description, category, client, cover_video, video_count, services, is_featured, sort_order) VALUES
 ('PLR8HmXUVd10ev_OHJ16kZfk0rHp3ENVmw','RPL Delhi NCR','Full-season coverage of the Rising Premier League across Delhi NCR — multi-camera match production, live streaming, Hindi commentary and daily highlight reels.','Cricket','Rising Premier League','V_VsLvRXBXY',16,'Match Production, Digital Streaming, Sports Commentary, Highlights & Social Content',1,1),
 ('PLR8HmXUVd10f_CGStN2inG9YS2EJKSC05','Game Changer League','Season-long broadcast of the Game Changer League — live matches, live score graphics and post-match highlight packages.','Cricket','Game Changer League','rHn002MksIk',47,'Match Production, Digital Streaming, Live Scores & Graphics, Highlights & Social Content',1,2),
 ('PLR8HmXUVd10c7Q4QNm10dPND_GnmwgDFT','Neori Premier League','Complete media coverage of the Neori Premier League with multi-camera production, streaming and tournament branding.','Cricket','Neori Premier League','foTxbbdxszE',12,'Match Production, Digital Streaming, Tournament Media & Branding',1,3),
 ('PLR8HmXUVd10ech8EuVxiPfBa-VeYyiWeK','Indian Solicitors Cricket Association (ISCA) Tournament 2024','Corporate legal-league tournament broadcast — multi-camera live production, streaming and highlights for ISCA.','Cricket','ISCA','gcx-whbk92I',29,'Match Production, Digital Streaming, Sports Photography, Highlights & Social Content',1,4),
 ('PLR8HmXUVd10dvAhlC80LUxZBRnWyhpLFZ','3rd Amigos Internal Cricket Tournament','Corporate internal cricket tournament — live production, streaming and social media content.','Corporate','Amigos','m8XoDQOWzk0',13,'Match Production, Digital Streaming, Highlights & Social Content',1,5),
 ('PLR8HmXUVd10fn-hHat6GNf5Gce4gpbdtK','Hanswari Premier League','Village/regional premier league coverage with live match production and commentary.','Cricket','Hanswari Premier League','NWv09xMgcY4',3,'Match Production, Digital Streaming, Sports Commentary',0,6),
 ('PLR8HmXUVd10eMcPIDVo-CHsLcX-KSGuav','1st SCAPT Cricket League','Inaugural season of the SCAPT Cricket League — live streaming with score graphics.','Cricket','SCAPT','r0Ej4hOp92k',6,'Digital Streaming, Live Scores & Graphics',0,7),
 ('PLR8HmXUVd10c-f_0alSgw6WuI4bXkmbt2','ACKO Premier League','Corporate-sponsored premier league broadcast with sponsor branding and live coverage.','Cricket','ACKO','mDPWZZ-a2pA',13,'Match Production, Digital Streaming, Tournament Media & Branding',1,8),
 ('PLR8HmXUVd10dJ__2_0nksbWiS4giUWNE1','Bira 91 Premier League','Branded premier league event coverage — production, streaming and promotional content.','Cricket','Bira 91','ZjlGlO7oUkk',1,'Match Production, Tournament Media & Branding',0,9),
 ('PLR8HmXUVd10cOvP6TznnEMYPs4C3uVKbo','Late Shri Chamanlal Asiwal U-14 Cricket Tournament Season 1','Under-14 youth cricket tournament — full production and streaming for young athletes.','Cricket','Chamanlal Asiwal Trust','CdZJV0-nApk',7,'Match Production, Digital Streaming, Sports Photography',0,10),
 ('PLR8HmXUVd10d-GVBP1S3xWlTFVLeQYkgG','N.K Sikri Memorial Cup 2024','Memorial cricket cup coverage with multi-camera production and highlights.','Cricket','N.K Sikri Memorial','a0j4_KsvRm0',6,'Match Production, Digital Streaming, Highlights & Social Content',0,11),
 ('PLR8HmXUVd10d-WD5KZV53vvrwPK3hQZ8v','MPL 3.0','Third season of the MPL franchise league — season-long live broadcast and highlights.','Cricket','MPL','TEhBB_KotqM',27,'Match Production, Digital Streaming, Live Scores & Graphics, Highlights & Social Content',1,12),
 ('PLR8HmXUVd10dcFLesaESiBOHRcLA0DeCg','3rd All India Lakshman Das Chhabra Memorial Cricket Tournament 2024','All-India memorial tournament coverage — live production and streaming.','Cricket','Chhabra Memorial','gvjc9HO4cx8',2,'Match Production, Digital Streaming',0,13),
 ('PLR8HmXUVd10fe83tftpBbwiMISY6ncOD2','St. Basil Cricket Tournament 2024','School/institutional cricket tournament — live production, streaming and photography.','Cricket','St. Basil','R7QagNRlJjY',15,'Match Production, Digital Streaming, Sports Photography',0,14),
 ('PLR8HmXUVd10dQvncI-adFD_pgz_99qKb7','Smt. Sushila Chamoli Cricket Tournament 2024','Memorial cricket tournament broadcast with live match coverage.','Cricket','Sushila Chamoli Memorial','IhlwZZwVBUg',6,'Match Production, Digital Streaming',0,15),
 ('PLR8HmXUVd10eurkbIvAtkhuRATmd6AhXF','Rockwell Cricket League 2024','Corporate cricket league coverage — production, streaming and branded content.','Corporate','Rockwell','nEaC2OfjcoY',3,'Match Production, Digital Streaming, Tournament Media & Branding',0,16),
 ('PLR8HmXUVd10eIoEu5v1OpHH0MY_7CGAmQ','3rd DHCBA Cricket Tournament 2024','Delhi High Court Bar Association tournament — live production and streaming.','Cricket','DHCBA','KI2kBz4lCe8',9,'Match Production, Digital Streaming, Sports Commentary',0,17);

-- 5. Replace placeholder portfolio entries' covers with real YouTube work links
UPDATE portfolio SET playlist_id='PLR8HmXUVd10ev_OHJ16kZfk0rHp3ENVmw', cover_image='https://i.ytimg.com/vi/V_VsLvRXBXY/hqdefault.jpg', external_url='https://www.youtube.com/playlist?list=PLR8HmXUVd10ev_OHJ16kZfk0rHp3ENVmw' WHERE id=1;
UPDATE portfolio SET playlist_id='PLR8HmXUVd10f_CGStN2inG9YS2EJKSC05', cover_image='https://i.ytimg.com/vi/rHn002MksIk/hqdefault.jpg', external_url='https://www.youtube.com/playlist?list=PLR8HmXUVd10f_CGStN2inG9YS2EJKSC05' WHERE id=2;
UPDATE portfolio SET playlist_id='PLR8HmXUVd10c7Q4QNm10dPND_GnmwgDFT', cover_image='https://i.ytimg.com/vi/foTxbbdxszE/hqdefault.jpg', external_url='https://www.youtube.com/playlist?list=PLR8HmXUVd10c7Q4QNm10dPND_GnmwgDFT' WHERE id=3;
