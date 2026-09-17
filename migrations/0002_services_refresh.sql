-- ============================================================
-- 0002 — Replace services with 8 clearly differentiated services
-- (Match Production vs Digital Streaming are distinct: production
--  creates the feed, streaming delivers it to the audience.)
-- ============================================================

DELETE FROM booking_services;
DELETE FROM services;

INSERT INTO services (id, slug, title, short_desc, description, icon, is_active, sort_order) VALUES
 (1,'match-production','Match Production',
  'Multi-camera match coverage, live direction, camera switching and production control.',
  'Multi-camera match coverage, live direction, camera switching and production control. Our crew sets up the cameras, runs the vision mixer and directs the match as it happens — creating the professional live feed.',
  'fa-clapperboard',1,1),
 (2,'digital-streaming','Digital Streaming',
  'Deliver live matches to audiences through YouTube, Facebook and other digital platforms.',
  'Deliver live matches to audiences through YouTube, Facebook and other digital platforms. We take the production feed and broadcast it reliably to your online viewers with encoding, monitoring and backup.',
  'fa-signal',1,2),
 (3,'sports-commentary','Sports Commentary',
  'Professional Hindi, English and bilingual commentary to bring every match to life.',
  'Professional Hindi, English and bilingual commentary to bring every match to life. Experienced commentators and analysts with commentary-box setup and match research.',
  'fa-microphone-lines',1,3),
 (4,'live-scores-graphics','Live Scores & Graphics',
  'Real-time scoreboards, player statistics, team line-ups, match results and on-screen graphics.',
  'Real-time scoreboards, player statistics, team line-ups, match results and on-screen graphics. Lower thirds, sponsor bugs, player cards and match summary graphics built and operated live.',
  'fa-table-columns',1,4),
 (5,'sports-photography','Sports Photography',
  'Professional action shots, player portraits, team photographs and event coverage.',
  'Professional action shots, player portraits, team photographs and event coverage. High-resolution images ready for press, sponsors and social media.',
  'fa-camera',1,5),
 (6,'video-production','Video Production',
  'Player interviews, promotional videos, sponsor films, event videos and behind-the-scenes content.',
  'Player interviews, promotional videos, sponsor films, event videos and behind-the-scenes content. Scripted and edited packages that tell your tournament''s story.',
  'fa-video',1,6),
 (7,'highlights-social-content','Highlights & Social Content',
  'Match highlights, best moments, reels, short-form edits and social media-ready content.',
  'Match highlights, best moments, reels, short-form edits and social media-ready content. Fast-turnaround vertical and horizontal edits built to travel.',
  'fa-film',1,7),
 (8,'tournament-media-branding','Tournament Media & Branding',
  'Sponsor visibility, tournament promotions, branded content and complete media support.',
  'Sponsor visibility, tournament promotions, branded content and complete media support. End-to-end media planning so your sponsors get value and your tournament gets attention.',
  'fa-bullhorn',1,8);
