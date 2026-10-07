const fs = require('fs');

const dbCode = `<?php
/**
 * Database & API Configuration
 */

// Enable CORS for mobile apps & web clients
if (isset($_SERVER['HTTP_ORIGIN'])) {
    header("Access-Control-Allow-Origin: {$_SERVER['HTTP_ORIGIN']}");
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Max-Age: 86400');
} else {
    header("Access-Control-Allow-Origin: *");
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_METHOD'])) {
        header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS");
    }
    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS'])) {
        header("Access-Control-Allow-Headers: {$_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']}");
    } else {
        header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin");
    }
    http_response_code(200);
    exit(0);
}

header("Content-Type: application/json; charset=UTF-8");

// DB credentials
$db_host = 'localhost';
$db_name = 'nibit_business';
$db_user = 'root';
$db_pass = '';
$db_charset = 'utf8mb4';

try {
    $dsn = "mysql:host={$db_host};dbname={$db_name};charset={$db_charset}";
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];
    $pdo = new PDO($dsn, $db_user, $db_pass, $options);

    // Ensure employees table exists
    $pdo->exec("CREATE TABLE IF NOT EXISTS employees (
        id INT AUTO_INCREMENT PRIMARY KEY,
        emp_id VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        pin_code VARCHAR(10) NOT NULL,
        role VARCHAR(50) DEFAULT 'employee',
        phone VARCHAR(20) DEFAULT '',
        email VARCHAR(100) DEFAULT '',
        shop_name VARCHAR(100) DEFAULT '',
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");

    $empCount = $pdo->query("SELECT COUNT(*) FROM employees")->fetchColumn();
    if ($empCount == 0) {
        $seedStmt = $pdo->prepare("INSERT INTO employees (emp_id, name, pin_code, role, phone, email, shop_name) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $seedStmt->execute(['EMP101', 'Alex Johnson', '1234', 'employee', '9876543210', 'alex@nibit.com', 'SHOUKY MOBILES']);
        $seedStmt->execute(['EMP102', 'Rahul Sharma', '5678', 'employee', '9123456780', 'rahul@nibit.com', 'SHOUKY MOBILES']);
        $seedStmt->execute(['EMP103', 'Priya Patel', '2468', 'employee', '9988776655', 'priya@nibit.com', 'SHOUKY MOBILES']);
    }

} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Database connection failed: ' . $e->getMessage()
    ]);
    exit();
}

// Vault Reversible Encryption Key for secure password / secret fields
define('APP_VAULT_KEY', 'nibit_vault_sec_key_2026_9837a4b1');

// Helper function to decrypt sensitive secrets for authorized verification
function decryptVaultSecret($cipherText) {
    if (empty($cipherText) || !is_string($cipherText)) {
        return (string)$cipherText;
    }
    if (strpos($cipherText, 'ENC:') !== 0) {
        return (string)$cipherText;
    }
    $raw = base64_decode(substr($cipherText, 4));
    $parts = explode('::', $raw, 2);
    if (count($parts) === 2) {
        $iv = $parts[0];
        $encrypted = $parts[1];
        $decrypted = openssl_decrypt($encrypted, 'AES-256-CBC', APP_VAULT_KEY, 0, $iv);
        return ($decrypted !== false) ? $decrypted : (string)$cipherText;
    }
    return (string)$cipherText;
}

// Helper function to encrypt sensitive secrets before storing
function encryptVaultSecret($plainText) {
    if ($plainText === '' || $plainText === null) return '';
    $iv = openssl_random_pseudo_bytes(16);
    $encrypted = openssl_encrypt($plainText, 'AES-256-CBC', APP_VAULT_KEY, 0, $iv);
    return 'ENC:' . base64_encode($iv . '::' . $encrypted);
}

/**
 * Standard JSON response helper
 */
function sendResponse($success, $message, $data = null, $statusCode = 200) {
    http_response_code($statusCode);
    $response = [
        'success' => (bool)$success,
        'message' => $message
    ];
    if ($data !== null) {
        $response['data'] = $data;
    }
    echo json_encode($response, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit();
}

/**
 * Helper to get JSON payload or POST fields
 */
function getRequestPayload() {
    $rawInput = file_get_contents('php://input');
    $jsonData = json_decode($rawInput, true);

    if (json_last_error() === JSON_ERROR_NONE && is_array($jsonData)) {
        return array_merge($_POST, $jsonData);
    }

    return $_POST;
}
`;

const authCode = `<?php
require_once __DIR__ . '/db.php';

$request = getRequestPayload();
$action = isset($_GET['action']) ? $_GET['action'] : (isset($request['action']) ? $request['action'] : '');

// ----------------------------------------------------
// 1. Employee Login: empid + 4-digit code
// ----------------------------------------------------
$empId = isset($request['empid']) ? trim($request['empid']) : (isset($request['emp_id']) ? trim($request['emp_id']) : '');
$pinCode = isset($request['code']) ? trim($request['code']) : (isset($request['pin_code']) ? trim($request['pin_code']) : (isset($request['pin']) ? trim($request['pin']) : ''));

if ($action === 'emp_login' || (!empty($empId) && !empty($pinCode) && empty($request['email']))) {
    if (empty($empId) || empty($pinCode)) {
        sendResponse(false, 'Employee ID and 4-digit code are required.', null, 400);
    }

    if (strlen($pinCode) !== 4 || !ctype_digit($pinCode)) {
        sendResponse(false, 'Security code must be exactly 4 digits.', null, 400);
    }

    try {
        $empStmt = $pdo->prepare("SELECT * FROM employees WHERE UPPER(emp_id) = UPPER(:emp_id) AND pin_code = :pin_code AND status = 'active'");
        $empStmt->execute([
            ':emp_id' => $empId,
            ':pin_code' => $pinCode
        ]);
        $emp = $empStmt->fetch();

        if ($emp) {
            // Also fetch available shop inventory records for user display
            $recordsStmt = $pdo->prepare("SELECT * FROM app_records WHERE app_id = 1 ORDER BY id DESC");
            $recordsStmt->execute();
            $rawRecords = $recordsStmt->fetchAll();
            $allRecords = [];
            foreach ($rawRecords as $r) {
                $r['record_data_raw'] = $r['record_data'];
                $r['record_data'] = json_decode($r['record_data'], true) ?: [];
                $allRecords[] = $r;
            }

            sendResponse(true, 'Employee login successful! Welcome ' . $emp['name'], [
                'verified' => true,
                'user' => [
                    'id' => $emp['id'],
                    'emp_id' => $emp['emp_id'],
                    'name' => $emp['name'],
                    'role' => 'employee',
                    'pin_code' => $emp['pin_code'],
                    'phone' => $emp['phone'] ?? '',
                    'email' => $emp['email'] ?? '',
                    'shop_name' => $emp['shop_name'] ?? 'SHOUKY MOBILES',
                    'isEmployee' => true
                ],
                'records' => $allRecords,
                'token' => 'emp_token_' . $emp['id'] . '_' . bin2hex(random_bytes(8))
            ]);
        } else {
            sendResponse(false, 'Invalid Employee ID or 4-digit code. Please check your credentials.', null, 401);
        }
    } catch (PDOException $e) {
        sendResponse(false, 'Database error during employee login: ' . $e->getMessage(), null, 500);
    }
}

// ----------------------------------------------------
// 2. Fetch list of Employees
// ----------------------------------------------------
if ($action === 'employees' || $action === 'get_employees') {
    try {
        $stmt = $pdo->query("SELECT id, emp_id, name, role, phone, email, shop_name, status, created_at FROM employees WHERE status = 'active'");
        $list = $stmt->fetchAll();
        sendResponse(true, 'Employees retrieved successfully', ['employees' => $list]);
    } catch (PDOException $e) {
        sendResponse(false, 'Error loading employees: ' . $e->getMessage(), null, 500);
    }
}

// ----------------------------------------------------
// 3. Admin Login (Email & Password from app_records)
// Schema: SINO, EMAIL, PASSWORD, SHOP NAME (from MOBILE MANAGEMENT APPS)
// ----------------------------------------------------
$email = isset($request['email']) ? trim(strtolower($request['email'])) : (isset($_POST['email']) ? trim(strtolower($_POST['email'])) : '');
$password = isset($request['password']) ? trim($request['password']) : (isset($_POST['password']) ? trim($_POST['password']) : '');
$website = isset($request['website']) ? trim(strtolower($request['website'])) : (isset($_POST['website']) ? trim(strtolower($_POST['website'])) : '');
$app_id = isset($request['app_id']) ? intval($request['app_id']) : (isset($_POST['app_id']) ? intval($_POST['app_id']) : 1);

if (empty($email) || empty($password)) {
    sendResponse(false, 'Please provide both Email and Password.', null, 400);
}

function cleanWebUrl($url) {
    if (empty($url)) return '';
    return preg_replace('#^https?://#', '', preg_replace('#^www\\.#', '', rtrim(trim(strtolower($url)), '/')));
}

$cleanInputWeb = cleanWebUrl($website);

try {
    $stmt = $pdo->prepare("SELECT * FROM app_records WHERE app_id = :app_id ORDER BY id DESC");
    $stmt->execute([':app_id' => $app_id]);
    $rows = $stmt->fetchAll();

    $matched = null;
    $allRecords = [];

    foreach ($rows as $row) {
        $row['record_data_raw'] = $row['record_data'];
        $data = json_decode($row['record_data'], true) ?: [];
        $row['record_data'] = $data;

        // Dynamic field extractor for any column format (EMAIL / email / col_275)
        $recEmail = '';
        foreach (['EMAIL', 'email', 'col_275', 'Email'] as $k) {
            if (!empty($data[$k])) {
                $recEmail = strtolower(trim($data[$k]));
                break;
            }
        }

        // Dynamic password extractor (PASSWORD / password / col_313)
        $rawPass = '';
        foreach (['PASSWORD', 'password', 'col_313', 'Password'] as $k) {
            if (!empty($data[$k])) {
                $rawPass = trim($data[$k]);
                break;
            }
        }

        // Dynamic shop name extractor
        $recShop = '';
        foreach (['SHOP NAME', 'shop_name', '_', 'Shop Name', 'shop', 'Name'] as $k) {
            if (!empty($data[$k])) {
                $recShop = trim($data[$k]);
                break;
            }
        }

        // Dynamic website extractor (optional)
        $recWeb = '';
        foreach (['WEBSITE', 'website', 'col_591', 'Website', 'link'] as $k) {
            if (!empty($data[$k])) {
                $recWeb = cleanWebUrl($data[$k]);
                break;
            }
        }

        $decPass = decryptVaultSecret($rawPass);
        $row['record_data']['col_313_decrypted'] = $decPass;
        $allRecords[] = $row;

        $emailMatches = ($recEmail === $email);
        $passMatches = ($rawPass === $password || $decPass === $password);
        
        // Website is matching if present in record AND entered, or optional if not in record
        $webMatches = true;
        if (!empty($recWeb) && !empty($cleanInputWeb)) {
            $webMatches = ($recWeb === $cleanInputWeb);
        }

        if ($emailMatches && $passMatches && $webMatches) {
            $matched = $row;
            break;
        }
    }

    if ($matched) {
        $data = $matched['record_data'];
        $shopName = !empty($data['SHOP NAME']) ? $data['SHOP NAME'] : (!empty($data['_']) ? $data['_'] : (!empty($data['shop_name']) ? $data['shop_name'] : 'Admin'));

        sendResponse(true, 'Login successful! Verified against MOBILE MANAGEMENT APPS record.', [
            'verified' => true,
            'user' => [
                'id' => $matched['id'],
                'email' => $data['EMAIL'] ?? ($data['col_275'] ?? $email),
                'website' => $data['WEBSITE'] ?? ($data['col_591'] ?? ($website ?: 'nibit.in')),
                'name' => $shopName,
                'role' => 'admin',
                'pin_code' => '1234',
                'isAdmin' => true
            ],
            'record' => $matched,
            'records' => $allRecords,
            'token' => 'token_' . $matched['id'] . '_' . bin2hex(random_bytes(8))
        ]);
    } else {
        sendResponse(false, 'Invalid Email or Password! Please verify your credentials against the application grid.', null, 401);
    }

} catch (PDOException $e) {
    sendResponse(false, 'Database query error: ' . $e->getMessage(), null, 500);
}
`;

fs.writeFileSync('C:/xampp/htdocs/api_mobile/db.php', dbCode, 'utf8');
fs.writeFileSync('C:/xampp/htdocs/api_mobile/auth.php', authCode, 'utf8');
console.log('Successfully deployed db.php and auth.php with Employee & Admin authentication to XAMPP');
