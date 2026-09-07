-- Tracks when a certificate row (language/theme/name) was last changed, so
-- the image URL can include this as a cache-busting version and a
-- customized certificate (e.g. switched to English) shows up immediately
-- instead of waiting out the image's Cache-Control max-age.
ALTER TABLE student_course_certificates
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
