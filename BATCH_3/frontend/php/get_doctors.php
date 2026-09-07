<?php
require_once 'config.php';

$db = new Database();
$pdo = $db->connect();

// جلب قائمة الأطباء
$stmt = $pdo->query("SELECT * FROM doctors ORDER BY name");
$doctors = $stmt->fetchAll(PDO::FETCH_ASSOC);

// جلب قائمة الأقسام
$stmt = $pdo->query("SELECT * FROM departments ORDER BY name");
$departments = $stmt->fetchAll(PDO::FETCH_ASSOC);

header('Content-Type: application/json');
echo json_encode([
    'doctors' => $doctors,
    'departments' => $departments
]);
?>