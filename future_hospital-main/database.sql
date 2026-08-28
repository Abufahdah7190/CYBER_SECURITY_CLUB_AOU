-- إنشاء قاعدة البيانات
CREATE DATABASE IF NOT EXISTS medical_center;
USE medical_center;

-- جدول الأطباء
CREATE TABLE doctors (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    specialty VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- جدول المرضى
CREATE TABLE patients (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    birth_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- جدول المواعيد
CREATE TABLE appointments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT,
    doctor_id INT,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    status ENUM('pending', 'confirmed', 'cancelled') DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    FOREIGN KEY (doctor_id) REFERENCES doctors(id)
);

-- جدول الأقسام
CREATE TABLE departments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT
);

-- إدراج بيانات تجريبية
INSERT INTO departments (name, description) VALUES
('الطب العام', 'فحوصات عامة واستشارات طبية'),
('الأطفال', 'رعاية صحة الأطفال والرضع'),
('النساء والولادة', 'رعاية صحة المرأة والحمل'),
('الأسنان', 'علاج وتجميل الأسنان'),
('العيون', 'فحص وعلاج أمراض العيون');

INSERT INTO doctors (name, specialty, phone, email) VALUES
('د. أحمد محمد', 'الطب العام', '01234567890', 'ahmed@clinic.com'),
('د. فاطمة علي', 'الأطفال', '01234567891', 'fatima@clinic.com'),
('د. محمد حسن', 'الأسنان', '01234567892', 'mohamed@clinic.com');