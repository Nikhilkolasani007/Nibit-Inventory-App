<?php
/**
 * shouky_api/users.php - User Management (Admin & Employees)
 * Powered by MySQL (iconltte1_SHOUKY) with zero-fail fallback.
 */

require_once __DIR__ . '/db.php';

// 1. BACKUP USERS (Empty by default - operates directly with real database accounts)
$DEFAULT_ADMIN_USERS = [];
$DEFAULT_EMPLOYEE_USERS = [];

define('USERS_JSON_FILE', __DIR__ . '/users_data.json');

function getAllUsersData() {
    $pdo = getDatabaseConnection();

    if ($pdo) {
        try {
            $admins = $pdo->query("SELECT * FROM `admins` ORDER BY id ASC")->fetchAll();
            $employees = $pdo->query("SELECT * FROM `employees` ORDER BY id ASC")->fetchAll();
            return [
                'admins' => $admins ?: [],
                'employees' => $employees ?: [],
                'source' => 'mysql'
            ];
        } catch (Exception $e) {
            // Fall back
        }
    }

    if (file_exists(USERS_JSON_FILE)) {
        $content = file_get_contents(USERS_JSON_FILE);
        $data = json_decode($content, true);
        if ($data && (isset($data['admins']) || isset($data['employees']))) {
            return [
                'admins' => $data['admins'] ?? [],
                'employees' => $data['employees'] ?? [],
                'source' => 'json'
            ];
        }
    }

    return [
        'admins' => [],
        'employees' => [],
        'source' => 'empty'
    ];
}

function saveUsersData($data) {
    file_put_contents(USERS_JSON_FILE, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

// Find Admin User by Email & Password
function findAdminUser($email, $password) {
    $cleanEmail = strtolower(trim($email));
    $cleanPass = trim($password);
    $pdo = getDatabaseConnection();

    if ($pdo) {
        try {
            $stmt = $pdo->prepare("SELECT * FROM `admins` WHERE LOWER(email) = ? LIMIT 1");
            $stmt->execute([$cleanEmail]);
            $admin = $stmt->fetch();
            if ($admin && trim($admin['password']) === $cleanPass) {
                return $admin;
            }
        } catch (Exception $e) {
            // Fall back
        }
    }

    $data = getAllUsersData();
    foreach ($data['admins'] as $admin) {
        if (strtolower(trim($admin['email'])) === $cleanEmail && trim($admin['password']) === $cleanPass) {
            return $admin;
        }
    }
    return null;
}

// Find Employee User by Employee ID & 4-Digit Code
function findEmployeeUser($empId, $code) {
    $cleanEmpId = strtoupper(trim($empId));
    $cleanCode = trim($code);
    $pdo = getDatabaseConnection();

    if ($pdo) {
        try {
            $stmt = $pdo->prepare("SELECT * FROM `employees` WHERE UPPER(emp_id) = ? LIMIT 1");
            $stmt->execute([$cleanEmpId]);
            $emp = $stmt->fetch();
            if ($emp && trim($emp['code']) === $cleanCode) {
                return $emp;
            }
        } catch (Exception $e) {
            // Fall back
        }
    }

    $data = getAllUsersData();
    foreach ($data['employees'] as $emp) {
        if (strtoupper(trim($emp['emp_id'])) === $cleanEmpId && trim($emp['code']) === $cleanCode) {
            return $emp;
        }
    }
    return null;
}

// Add New Admin User
function addAdminUser($email, $password, $shopName = 'SHOUKY MOBILES', $phone = '') {
    $pdo = getDatabaseConnection();
    $cleanEmail = strtolower(trim($email));
    $cleanPass = trim($password);
    $cleanShop = trim($shopName);

    if ($pdo) {
        try {
            $stmt = $pdo->prepare("INSERT INTO `admins` (email, password, name, shop_name, role, pin_code, phone, website) VALUES (?, ?, ?, ?, 'admin', '1234', ?, 'nibit.in')");
            $stmt->execute([$cleanEmail, $cleanPass, $cleanShop, $cleanShop, $phone]);
            $newId = $pdo->lastInsertId();
            return [
                'id' => $newId,
                'email' => $cleanEmail,
                'password' => $cleanPass,
                'name' => $cleanShop,
                'shop_name' => $cleanShop,
                'role' => 'admin',
                'pin_code' => '1234',
                'phone' => $phone,
                'website' => 'nibit.in'
            ];
        } catch (Exception $e) {
            // Fall back
        }
    }

    $data = getAllUsersData();
    $newId = count($data['admins']) + 1;
    $newAdmin = [
        'id' => $newId,
        'email' => $cleanEmail,
        'password' => $cleanPass,
        'name' => $cleanShop,
        'shop_name' => $cleanShop,
        'role' => 'admin',
        'pin_code' => '1234',
        'phone' => $phone,
        'website' => 'nibit.in'
    ];
    $data['admins'][] = $newAdmin;
    saveUsersData($data);
    return $newAdmin;
}

// Add New Employee User
function addEmployeeUser($empId, $code, $name, $phone = '', $shopName = 'SHOUKY MOBILES') {
    $pdo = getDatabaseConnection();
    $cleanEmpId = strtoupper(trim($empId));
    $cleanCode = trim($code);
    $cleanName = trim($name);

    if ($pdo) {
        try {
            $stmt = $pdo->prepare("INSERT INTO `employees` (emp_id, code, name, role, shop_name, phone, email) VALUES (?, ?, ?, 'employee', ?, ?, ?)");
            $stmt->execute([$cleanEmpId, $cleanCode, $cleanName, $shopName, $phone, strtolower($cleanEmpId) . '@nibit.com']);
            $newId = $pdo->lastInsertId();
            return [
                'id' => $newId,
                'emp_id' => $cleanEmpId,
                'code' => $cleanCode,
                'name' => $cleanName,
                'role' => 'employee',
                'shop_name' => $shopName,
                'phone' => $phone,
                'email' => strtolower($cleanEmpId) . '@nibit.com'
            ];
        } catch (Exception $e) {
            // Fall back
        }
    }

    $data = getAllUsersData();
    $newId = count($data['employees']) + 1;
    $newEmp = [
        'id' => $newId,
        'emp_id' => $cleanEmpId,
        'code' => $cleanCode,
        'name' => $cleanName,
        'role' => 'employee',
        'shop_name' => $shopName,
        'phone' => $phone,
        'email' => strtolower($cleanEmpId) . '@nibit.com'
    ];
    $data['employees'][] = $newEmp;
    saveUsersData($data);
    return $newEmp;
}

// Update Admin Password (saved directly into MySQL database)
function updateAdminPassword($email, $newPassword) {
    $cleanEmail = strtolower(trim($email));
    $cleanPass = trim($newPassword);
    $pdo = getDatabaseConnection();
    $affected = 0;

    if ($pdo) {
        try {
            $stmt = $pdo->prepare("UPDATE `admins` SET password = ? WHERE LOWER(email) = ?");
            $stmt->execute([$cleanPass, $cleanEmail]);
            $affected = $stmt->rowCount();
        } catch (Exception $e) {
            // Fall back
        }
    }

    $data = getAllUsersData();
    foreach ($data['admins'] as &$admin) {
        if (strtolower(trim($admin['email'])) === $cleanEmail) {
            $admin['password'] = $cleanPass;
            $affected++;
        }
    }
    saveUsersData($data);
    return $affected > 0;
}

// Update Admin PIN
function updateAdminPin($email, $newPin) {
    $cleanEmail = strtolower(trim($email));
    $cleanPin = trim($newPin);
    $pdo = getDatabaseConnection();
    $affected = 0;

    if ($pdo) {
        try {
            $stmt = $pdo->prepare("UPDATE `admins` SET pin_code = ? WHERE LOWER(email) = ?");
            $stmt->execute([$cleanPin, $cleanEmail]);
            $affected = $stmt->rowCount();
        } catch (Exception $e) {
            // Fall back
        }
    }

    $data = getAllUsersData();
    foreach ($data['admins'] as &$admin) {
        if (strtolower(trim($admin['email'])) === $cleanEmail) {
            $admin['pin_code'] = $cleanPin;
            $affected++;
        }
    }
    saveUsersData($data);
    return $affected > 0;
}

// Update Employee Code
function updateEmployeeCode($empId, $newCode) {
    $cleanEmpId = strtoupper(trim($empId));
    $cleanCode = trim($newCode);
    $pdo = getDatabaseConnection();
    $affected = 0;

    if ($pdo) {
        try {
            $stmt = $pdo->prepare("UPDATE `employees` SET code = ? WHERE UPPER(emp_id) = ?");
            $stmt->execute([$cleanCode, $cleanEmpId]);
            $affected = $stmt->rowCount();
        } catch (Exception $e) {
            // Fall back
        }
    }

    $data = getAllUsersData();
    foreach ($data['employees'] as &$emp) {
        if (strtoupper(trim($emp['emp_id'])) === $cleanEmpId) {
            $emp['code'] = $cleanCode;
            $affected++;
        }
    }
    saveUsersData($data);
    return $affected > 0;
}

