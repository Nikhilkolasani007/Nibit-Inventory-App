<?php
/**
 * shouky_api/db.php - Database Connection & Auto Table Initializer
 * Database credentials for Shouky Mobiles on nibit.in (MilesWeb MySQL)
 */

$db_host = "localhost";
$db_name = "iconltte1_SHOUKY";
$db_user = "iconltte1_SHOUKY";
$db_pass = "SHOUKYmobile@123";

$pdo = null;
$db_error = null;

try {
    $pdo = new PDO("mysql:host={$db_host};dbname={$db_name};charset=utf8mb4", $db_user, $db_pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    // Auto-create required tables if they don't exist yet
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `admins` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `email` VARCHAR(191) NOT NULL UNIQUE,
            `password` VARCHAR(255) NOT NULL,
            `name` VARCHAR(191) DEFAULT 'SHOUKY MOBILES',
            `shop_name` VARCHAR(191) DEFAULT 'SHOUKY MOBILES',
            `role` VARCHAR(50) DEFAULT 'admin',
            `pin_code` VARCHAR(10) DEFAULT '1234',
            `phone` VARCHAR(50) DEFAULT '9441166030',
            `website` VARCHAR(191) DEFAULT 'nibit.in',
            `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `employees` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `emp_id` VARCHAR(50) NOT NULL UNIQUE,
            `code` VARCHAR(10) NOT NULL,
            `name` VARCHAR(191) NOT NULL,
            `role` VARCHAR(50) DEFAULT 'employee',
            `shop_name` VARCHAR(191) DEFAULT 'SHOUKY MOBILES',
            `phone` VARCHAR(50) DEFAULT '',
            `email` VARCHAR(191) DEFAULT '',
            `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `items` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `name` VARCHAR(255) NOT NULL,
            `sku` VARCHAR(100) NOT NULL,
            `category` VARCHAR(100) NOT NULL DEFAULT 'Mobile',
            `item_type` VARCHAR(50) NOT NULL DEFAULT 'First Hand',
            `quantity` INT DEFAULT 1,
            `min_quantity` INT DEFAULT 1,
            `cost_price` DECIMAL(12,2) DEFAULT 0.00,
            `selling_price` DECIMAL(12,2) DEFAULT NULL,
            `imei` VARCHAR(100) DEFAULT '',
            `distributor` VARCHAR(191) DEFAULT '',
            `seller_name` VARCHAR(191) DEFAULT '',
            `seller_phone` VARCHAR(50) DEFAULT '',
            `seller_email` VARCHAR(191) DEFAULT '',
            `seller_address` TEXT DEFAULT NULL,
            `condition_notes` TEXT DEFAULT NULL,
            `status` VARCHAR(50) DEFAULT 'available',
            `supplier` VARCHAR(191) DEFAULT 'SHOUKY MOBILES',
            `location` VARCHAR(100) DEFAULT 'Main Store',
            `barcode` VARCHAR(100) DEFAULT '',
            `description` TEXT,
            `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
            `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");

    // Auto-migrate new columns into items table if missing
    try {
        $existingColumns = [];
        $colStmt = $pdo->query("SHOW COLUMNS FROM `items`");
        while ($c = $colStmt->fetch()) {
            $existingColumns[] = strtolower($c['Field']);
        }
        if (!in_array('item_type', $existingColumns)) {
            $pdo->exec("ALTER TABLE `items` ADD COLUMN `item_type` VARCHAR(50) NOT NULL DEFAULT 'First Hand'");
        }
        if (!in_array('imei', $existingColumns)) {
            $pdo->exec("ALTER TABLE `items` ADD COLUMN `imei` VARCHAR(100) DEFAULT ''");
        }
        if (!in_array('distributor', $existingColumns)) {
            $pdo->exec("ALTER TABLE `items` ADD COLUMN `distributor` VARCHAR(191) DEFAULT ''");
        }
        if (!in_array('seller_name', $existingColumns)) {
            $pdo->exec("ALTER TABLE `items` ADD COLUMN `seller_name` VARCHAR(191) DEFAULT ''");
        }
        if (!in_array('seller_phone', $existingColumns)) {
            $pdo->exec("ALTER TABLE `items` ADD COLUMN `seller_phone` VARCHAR(50) DEFAULT ''");
        }
        if (!in_array('seller_email', $existingColumns)) {
            $pdo->exec("ALTER TABLE `items` ADD COLUMN `seller_email` VARCHAR(191) DEFAULT ''");
        }
        if (!in_array('seller_address', $existingColumns)) {
            $pdo->exec("ALTER TABLE `items` ADD COLUMN `seller_address` TEXT DEFAULT NULL");
        }
        if (!in_array('condition_notes', $existingColumns)) {
            $pdo->exec("ALTER TABLE `items` ADD COLUMN `condition_notes` TEXT DEFAULT NULL");
        }
        if (!in_array('status', $existingColumns)) {
            $pdo->exec("ALTER TABLE `items` ADD COLUMN `status` VARCHAR(50) DEFAULT 'available'");
        }
        if (!in_array('images', $existingColumns)) {
            $pdo->exec("ALTER TABLE `items` ADD COLUMN `images` TEXT DEFAULT NULL");
        }
    } catch (Exception $ex) {
        // Migration check
    }

    $uploadsDir = __DIR__ . '/uploads';
    if (!file_exists($uploadsDir)) {
        @mkdir($uploadsDir, 0777, true);
    }

    // Invoices / Customer Sales Table
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `invoices` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `invoice_no` VARCHAR(50) NOT NULL UNIQUE,
            `item_id` INT DEFAULT NULL,
            `item_name` VARCHAR(255) NOT NULL,
            `category` VARCHAR(100) NOT NULL,
            `item_type` VARCHAR(50) NOT NULL DEFAULT 'First Hand',
            `imei` VARCHAR(100) DEFAULT '',
            `cost_price` DECIMAL(12,2) DEFAULT 0.00,
            `selling_price` DECIMAL(12,2) NOT NULL,
            `customer_name` VARCHAR(191) NOT NULL,
            `customer_phone` VARCHAR(50) NOT NULL,
            `customer_email` VARCHAR(191) DEFAULT '',
            `customer_address` TEXT DEFAULT NULL,
            `payment_mode` VARCHAR(50) DEFAULT 'Cash',
            `notes` TEXT DEFAULT NULL,
            `created_by` VARCHAR(100) DEFAULT 'Admin',
            `invoice_date` DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");

    // Transactions Table (Stock In, Stock Out, POS Sales, Margin Tracking)
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `transactions` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `item_id` INT DEFAULT NULL,
            `item_name` VARCHAR(255) NOT NULL,
            `sku` VARCHAR(100) DEFAULT '',
            `type` VARCHAR(20) NOT NULL, -- 'IN', 'OUT', 'SALE', 'ADJUSTMENT'
            `quantity` INT NOT NULL DEFAULT 1,
            `cost_price` DECIMAL(12,2) DEFAULT 0.00,
            `selling_price` DECIMAL(12,2) DEFAULT 0.00,
            `profit` DECIMAL(12,2) DEFAULT 0.00,
            `reason` VARCHAR(255) DEFAULT '',
            `previous_quantity` INT DEFAULT 0,
            `new_quantity` INT DEFAULT 0,
            `created_by` VARCHAR(191) DEFAULT 'System',
            `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");






    // Invoices auto-migration for second-hand seller customer columns
    try {
        $invCols = [];
        $invColStmt = $pdo->query("SHOW COLUMNS FROM `invoices`");
        while ($c = $invColStmt->fetch()) {
            $invCols[] = strtolower($c['Field']);
        }
        if (!in_array('seller_name', $invCols)) {
            $pdo->exec("ALTER TABLE `invoices` ADD COLUMN `seller_name` VARCHAR(191) DEFAULT ''");
        }
        if (!in_array('seller_phone', $invCols)) {
            $pdo->exec("ALTER TABLE `invoices` ADD COLUMN `seller_phone` VARCHAR(50) DEFAULT ''");
        }
        if (!in_array('seller_email', $invCols)) {
            $pdo->exec("ALTER TABLE `invoices` ADD COLUMN `seller_email` VARCHAR(191) DEFAULT ''");
        }
        if (!in_array('seller_address', $invCols)) {
            $pdo->exec("ALTER TABLE `invoices` ADD COLUMN `seller_address` TEXT DEFAULT NULL");
        }
        if (!in_array('condition_notes', $invCols)) {
            $pdo->exec("ALTER TABLE `invoices` ADD COLUMN `condition_notes` TEXT DEFAULT NULL");
        }
    } catch (Exception $e) {}

    // Transactions auto-migration for created_by
    try {
        $txCols = [];
        $txColStmt = $pdo->query("SHOW COLUMNS FROM `transactions`");
        while ($c = $txColStmt->fetch()) {
            $txCols[] = strtolower($c['Field']);
        }
        if (!in_array('created_by', $txCols)) {
            $pdo->exec("ALTER TABLE `transactions` ADD COLUMN `created_by` VARCHAR(191) DEFAULT 'System'");
        }
    } catch (Exception $e) {}

    // Trash Bin / Deleted Records Table
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `trash_bin` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `record_type` VARCHAR(50) NOT NULL, -- 'transaction' or 'invoice'
            `original_id` INT DEFAULT NULL,
            `identifier` VARCHAR(100) DEFAULT '', -- e.g. invoice_no or sku
            `title` VARCHAR(255) NOT NULL,
            `amount` DECIMAL(12,2) DEFAULT 0.00,
            `data` LONGTEXT NOT NULL,
            `deleted_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
            `deleted_by` VARCHAR(100) DEFAULT 'Admin'
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");

} catch (PDOException $e) {
    // If MySQL connection fails, log error but DO NOT crash the script
    $db_error = $e->getMessage();
    $pdo = null;
}

function getDatabaseConnection() {
    global $pdo;
    return $pdo;
}

function getDatabaseError() {
    global $db_error;
    return $db_error;
}
