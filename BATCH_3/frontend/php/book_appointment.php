<?php
require_once 'config.php';

if ($_POST) {
    $db = new Database();
    $pdo = $db->connect();
    
    $name = $_POST['name'];
    $phone = $_POST['phone'];
    $email = $_POST['email'];
    $doctor_id = $_POST['doctor'];
    $date = $_POST['date'];
    $time = $_POST['time'];
    
    try {
        // إدراج المريض
        $stmt = $pdo->prepare("INSERT INTO patients (name, phone, email) VALUES (?, ?, ?)");
        $stmt->execute([$name, $phone, $email]);
        $patient_id = $pdo->lastInsertId();
        
        // إدراج الموعد
        $stmt = $pdo->prepare("INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time) VALUES (?, ?, ?, ?)");
        $stmt->execute([$patient_id, $doctor_id, $date, $time]);
        
        echo json_encode(['success' => true, 'message' => 'تم حجز الموعد بنجاح']);
    } catch(PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'خطأ في حجز الموعد']);
    }
}
?>