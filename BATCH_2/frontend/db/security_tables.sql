-- جدول التقييمات
CREATE TABLE IF NOT EXISTS ratings (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  doctor_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NULL,
  patient_name VARCHAR(180) NOT NULL,

  rating TINYINT UNSIGNED NOT NULL,
  expertise_rating TINYINT UNSIGNED NOT NULL,
  communication_rating TINYINT UNSIGNED NOT NULL,
  punctuality_rating TINYINT UNSIGNED NOT NULL,

  comment TEXT,
  recommend TINYINT(1) DEFAULT 0,
  is_verified TINYINT(1) DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_rating_doctor FOREIGN KEY (doctor_id)
    REFERENCES doctors(id) ON DELETE CASCADE,

  CONSTRAINT fk_rating_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_ratings_doctor_rating ON ratings (doctor_id, rating);
CREATE INDEX idx_ratings_created_at ON ratings (created_at);
CREATE INDEX idx_ratings_verified ON ratings (is_verified);

--------------------------------------------------

-- جدول جلسات المستخدمين
CREATE TABLE IF NOT EXISTS user_sessions (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  session_token VARCHAR(255) NOT NULL UNIQUE,
  ip_address VARCHAR(45) NOT NULL,
  user_agent TEXT,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_session_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_user_sessions_token ON user_sessions (session_token);
CREATE INDEX idx_user_sessions_expires ON user_sessions (expires_at);
CREATE INDEX idx_user_sessions_user_activity ON user_sessions (user_id, last_activity);

--------------------------------------------------

-- جدول محاولات تسجيل الدخول
CREATE TABLE IF NOT EXISTS login_attempts (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  ip_address VARCHAR(45) NOT NULL,
  username VARCHAR(120),
  user_agent TEXT,
  success TINYINT(1) DEFAULT 0,
  failure_reason VARCHAR(100),
  attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_login_ip_time ON login_attempts (ip_address, attempted_at);
CREATE INDEX idx_login_username_time ON login_attempts (username, attempted_at);
CREATE INDEX idx_login_success_time ON login_attempts (success, attempted_at);

--------------------------------------------------

-- جدول إعادة تعيين كلمة المرور
CREATE TABLE IF NOT EXISTS password_resets (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_password_reset_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_password_resets_token ON password_resets (token);
CREATE INDEX idx_password_resets_expires ON password_resets (expires_at);
CREATE INDEX idx_password_resets_user_used ON password_resets (user_id, used);
