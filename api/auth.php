<?php
/**
 * shouky_api/auth.php - Authentication (Admin & Employee)
 * Handles dual-mode logins for the React Native mobile app.
 */

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/users.php';

$rawInput = file_get_contents('php://input');
$inputData = json_decode($rawInput, true) ?: [];

// Get action from query, post, or JSON
$action = $_GET['action'] ?? ($inputData['action'] ?? ($_POST['action'] ?? ''));

// Handle Change Password
if ($action === 'change_password') {
    $email = $inputData['email'] ?? ($_POST['email'] ?? '');
    $empId = $inputData['emp_id'] ?? ($inputData['empid'] ?? ($_POST['emp_id'] ?? ($_POST['empid'] ?? '')));
    $newPassword = $inputData['new_password'] ?? ($inputData['password'] ?? ($_POST['new_password'] ?? ($_POST['password'] ?? '')));

    if (empty($newPassword)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'New password cannot be empty.']);
        exit;
    }

    if ($email) {
        updateAdminPassword($email, $newPassword);
        echo json_encode(['success' => true, 'message' => 'Admin password has been updated in MySQL database.']);
        exit;
    } elseif ($empId) {
        updateEmployeeCode($empId, $newPassword);
        echo json_encode(['success' => true, 'message' => 'Employee access code updated in MySQL database.']);
        exit;
    }
}

// Handle Change PIN
if ($action === 'change_pin') {
    $email = $inputData['email'] ?? ($_POST['email'] ?? '');
    $empId = $inputData['emp_id'] ?? ($inputData['empid'] ?? ($_POST['emp_id'] ?? ($_POST['empid'] ?? '')));
    $pin = $inputData['pin'] ?? ($inputData['pin_code'] ?? ($_POST['pin'] ?? ($_POST['pin_code'] ?? '')));

    if (empty($pin)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'New 4-digit PIN is required.']);
        exit;
    }

    if ($email) {
        updateAdminPin($email, $pin);
    } elseif ($empId) {
        updateEmployeeCode($empId, $pin);
    }

    echo json_encode(['success' => true, 'message' => 'PIN updated successfully.']);
    exit;
}

// Determine if this is employee login
$isEmp = ($action === 'emp_login') || isset($inputData['empid']) || isset($inputData['emp_id']) || isset($_POST['empid']) || isset($_POST['emp_id']);

if ($isEmp) {
    // ---------------- EMPLOYEE LOGIN ----------------
    $empId = $inputData['empid'] ?? ($inputData['emp_id'] ?? ($_POST['empid'] ?? ($_POST['emp_id'] ?? '')));
    $code = $inputData['code'] ?? ($inputData['pin'] ?? ($inputData['pin_code'] ?? ($_POST['code'] ?? ($_POST['pin'] ?? ''))));

    if (empty($empId) || empty($code)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Employee ID and 4-digit security code are required.'
        ]);
        exit;
    }

    $emp = findEmployeeUser($empId, $code);

    if ($emp) {
        $token = 'emp_tok_' . bin2hex(random_bytes(16));
        $userData = [
            'id' => $emp['id'],
            'emp_id' => $emp['emp_id'],
            'name' => $emp['name'],
            'role' => 'employee',
            'isEmployee' => true,
            'isAdmin' => false,
            'shop_name' => $emp['shop_name'] ?? 'SHOUKY MOBILES',
            'phone' => $emp['phone'] ?? '',
            'email' => $emp['email'] ?? ($emp['emp_id'] . '@nibit.com'),
            'pin_code' => $emp['code']
        ];

        echo json_encode([
            'success' => true,
            'verified' => true,
            'message' => "Welcome back, {$emp['name']}!",
            'data' => [
                'verified' => true,
                'token' => $token,
                'user' => $userData
            ]
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        exit;
    } else {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'verified' => false,
            'message' => 'Invalid Employee ID or 4-digit code. Please verify your credentials.'
        ]);
        exit;
    }
} else {
    // ---------------- ADMIN LOGIN ----------------
    $email = $inputData['email'] ?? ($_POST['email'] ?? ($_GET['email'] ?? ''));
    $password = $inputData['password'] ?? ($_POST['password'] ?? ($_GET['password'] ?? ''));

    if (empty($email) || empty($password)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Email and Password are required.'
        ]);
        exit;
    }

    $admin = findAdminUser($email, $password);

    if ($admin) {
        $token = 'adm_tok_' . bin2hex(random_bytes(16));
        $userData = [
            'id' => $admin['id'],
            'email' => $admin['email'],
            'name' => $admin['name'] ?? $admin['shop_name'] ?? 'SHOUKY MOBILES',
            'shop_name' => $admin['shop_name'] ?? 'SHOUKY MOBILES',
            'role' => 'admin',
            'isAdmin' => true,
            'isEmployee' => false,
            'website' => $admin['website'] ?? 'nibit.in',
            'phone' => $admin['phone'] ?? '',
            'pin_code' => $admin['pin_code'] ?? '1234'
        ];

        echo json_encode([
            'success' => true,
            'verified' => true,
            'message' => "Login successful. Welcome, {$userData['name']}!",
            'data' => [
                'verified' => true,
                'token' => $token,
                'user' => $userData
            ]
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        exit;
    } else {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'verified' => false,
            'message' => 'Invalid Email or Password. Please verify your admin credentials.'
        ]);
        exit;
    }
}
