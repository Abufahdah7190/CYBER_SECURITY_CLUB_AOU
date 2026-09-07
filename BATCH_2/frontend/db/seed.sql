-- Seed data for Virtual Hospital (run after create_tables.sql)
USE virtual_hospital;

-- departments
INSERT IGNORE INTO departments (keyname, name, description) VALUES
('dentistry','أسنان','قسم طب الأسنان: علاج وتجميل الأسنان.'),
('cardiology','قلب','قسم أمراض القلب: تشخيص وعلاج أمراض القلب.'),
('ophthalmology','عيون','قسم العيون: فحوصات وجراحات العين.'),
('dermatology','جلدية','قسم الجلدية: علاج الأمراض الجلدية والتجميل.');

-- sample doctor
INSERT IGNORE INTO doctors (name, specialty, bio, slug) VALUES
('د. أحمد العلي','قلب','استشاري أمراض القلب بخبرة 12 سنة','ahmed-alali');

-- add price, rating, image (update if doctors table extended with these fields)
ALTER TABLE IF EXISTS doctors ADD COLUMN IF NOT EXISTS price DECIMAL(8,2) DEFAULT 150.00;
ALTER TABLE IF EXISTS doctors ADD COLUMN IF NOT EXISTS rating DECIMAL(2,1) DEFAULT 4.8;
-- update existing doctor
UPDATE doctors SET price = 200.00, rating = 4.7 WHERE slug = 'ahmed-alali';

-- sample dentist
INSERT IGNORE INTO doctors (name, specialty, bio, slug, price, rating) VALUES
('د. سارة النجار','أسنان','طبيبة أسنان وتجميل بخبرة 8 سنوات','sara-najjar',120.00,4.6);

-- Additional doctors to ensure at least 3 per department
-- Cardiology (أمراض القلب) - Ahmed is already there
INSERT IGNORE INTO doctors (name, specialty, bio, slug, price, rating) VALUES
('د. خالد عثمان', 'أمراض القلب', 'استشاري قسطرة', 'khaled-othman', 250.00, 4.9),
('د. منى زكي', 'أمراض القلب', 'أخصائية قلب أطفال', 'mona-zaki', 200.00, 4.8);

-- Emergency (الطوارئ)
INSERT IGNORE INTO doctors (name, specialty, bio, slug, price, rating) VALUES
('د. سامي هلال', 'الطوارئ', 'طبيب طوارئ وعناية مركزة', 'sami-hilal', 150.00, 4.7),
('د. رانيا يوسف', 'الطوارئ', 'أخصائية حوادث وإصابات', 'rania-youssef', 150.00, 4.6),
('د. عمر فاروق', 'الطوارئ', 'طبيب مقيم طوارئ', 'omar-farouk', 120.00, 4.5);

-- Pediatrics (الأطفال)
INSERT IGNORE INTO doctors (name, specialty, bio, slug, price, rating) VALUES
('د. محمد سمير', 'الأطفال', 'استشاري طب أطفال وحديثي الولادة', 'mohamed-samir', 180.00, 4.9),
('د. ليلى حسن', 'الأطفال', 'أخصائية تغذية أطفال', 'layla-hassan', 160.00, 4.7),
('د. هدى علي', 'الأطفال', 'طبيبة أطفال عام', 'huda-ali', 140.00, 4.6);

-- Psychiatry (الطب النفسي)
INSERT IGNORE INTO doctors (name, specialty, bio, slug, price, rating) VALUES
('د. ياسر كمال', 'الطب النفسي', 'استشاري علاج سلوكي', 'yasser-kamal', 300.00, 4.9),
('د. نهى سالم', 'الطب النفسي', 'أخصائية نفسية للأطفال', 'noha-salem', 250.00, 4.8),
('د. طارق محمود', 'الطب النفسي', 'طبيب نفسي عام', 'tarek-mahmoud', 220.00, 4.7);

-- availability for doctor id 1 (today + next days) -- adjust id if needed
INSERT INTO availability_slots (doctor_id, start_time, end_time)
VALUES
(1, DATE_ADD(CURDATE(), INTERVAL 1 DAY) + INTERVAL 09 HOUR, DATE_ADD(CURDATE(), INTERVAL 1 DAY) + INTERVAL 10 HOUR),
(1, DATE_ADD(CURDATE(), INTERVAL 1 DAY) + INTERVAL 10 HOUR, DATE_ADD(CURDATE(), INTERVAL 1 DAY) + INTERVAL 11 HOUR),
(1, DATE_ADD(CURDATE(), INTERVAL 2 DAY) + INTERVAL 13 HOUR, DATE_ADD(CURDATE(), INTERVAL 2 DAY) + INTERVAL 14 HOUR);

-- example admin (created via api/auth/setup is preferred) -- left blank here
