<?php
class Database {
    private $host = 'localhost';
    private $dbname = 'medical_center';
    private $username = 'root';
    private $password = '';
    private $pdo;

    public function connect() {
        try {
            $dsn = "mysql:host={$this->host};dbname={$this->dbname};charset=utf8mb4";
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
            ];
            
            $this->pdo = new PDO($dsn, $this->username, $this->password, $options);
            return $this->pdo;
        } catch(PDOException $e) {
            error_log("Database connection error: " . $e->getMessage());
            die("خطأ في الاتصال بقاعدة البيانات");
        }
    }
    
    public function getPdo() {
        if (!$this->pdo) {
            $this->connect();
        }
        return $this->pdo;
    }
}
?>