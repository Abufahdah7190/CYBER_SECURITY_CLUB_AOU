<?php
require_once 'config.php';

$db = new Database();
$pdo = $db->connect();

// جلب المواعيد مع بيانات المرضى والأطباء
$stmt = $pdo->query("
    SELECT a.*, p.name as patient_name, p.phone, d.name as doctor_name, d.specialty
    FROM appointments a
    JOIN patients p ON a.patient_id = p.id
    JOIN doctors d ON a.doctor_id = d.id
    ORDER BY a.appointment_date DESC, a.appointment_time DESC
");

$appointments = $stmt->fetchAll(PDO::FETCH_ASSOC);

header('Content-Type: application/json');
echo json_encode($appointments);
?>