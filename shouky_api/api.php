<?php
/**
 * shouky_api/api.php - Central API Gateway for Shouky Mobile Inventory
 * Works standalone on MilesWeb / nibit.in without database failure.
 */

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

define('ITEMS_LOADED_AS_MODULE', true);
require_once __DIR__ . '/users.php';
require_once __DIR__ . '/items.php';

$rawInput = file_get_contents('php://input');
$inputData = json_decode($rawInput, true) ?: [];

$action = $_GET['action'] ?? ($inputData['action'] ?? ($_POST['action'] ?? ''));

// 1. HEALTH CHECK
if ($action === 'health' || ($_SERVER['REQUEST_METHOD'] === 'GET' && empty($_GET) && empty($rawInput))) {
    echo json_encode([
        'success' => true,
        'status' => 'online',
        'message' => 'Shouky Mobile Inventory API is operational on nibit.in!',
        'server_time' => date('Y-m-d H:i:s'),
        'version' => '2.0.0',
        'endpoints' => [
            'login' => 'POST action=login (email, password)',
            'emp_login' => 'POST action=emp_login (empid, code)',
            'items' => 'GET items.php or api.php?action=items',
            'adjust_stock' => 'POST action=adjust_stock (item_id, change)',
            'users' => 'GET api.php?action=get_users'
        ]
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

// 2. EMPLOYEE LOGIN
if ($action === 'emp_login' || isset($inputData['empid']) || isset($_POST['empid'])) {
    $empId = $inputData['empid'] ?? ($inputData['emp_id'] ?? ($_POST['empid'] ?? ($_POST['emp_id'] ?? '')));
    $code = $inputData['code'] ?? ($inputData['pin'] ?? ($inputData['pin_code'] ?? ($_POST['code'] ?? ($_POST['pin'] ?? ''))));

    if (empty($empId) || empty($code)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Employee ID and 4-digit code are required.']);
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
            'message' => "Welcome, {$emp['name']}!",
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
            'message' => 'Invalid Employee ID or 4-digit code. Please verify credentials.'
        ]);
        exit;
    }
}

// 3. ADMIN LOGIN
if ($action === 'login' || (isset($inputData['email']) && isset($inputData['password'])) || (isset($_POST['email']) && isset($_POST['password']))) {
    $email = $inputData['email'] ?? ($_POST['email'] ?? '');
    $password = $inputData['password'] ?? ($_POST['password'] ?? '');

    if (empty($email) || empty($password)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Email and Password are required.']);
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
            'message' => "Welcome Admin, {$userData['name']}!",
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
            'message' => 'Invalid Admin Email or Password. Please check credentials.'
        ]);
        exit;
    }
}

// 4. ITEMS LIST OR STOCK ADJUSTMENT
if ($action === 'items' || isset($_GET['items'])) {
    $search = isset($_GET['search']) ? strtolower(trim($_GET['search'])) : '';
    $category = isset($_GET['category']) ? trim($_GET['category']) : '';
    $filter = isset($_GET['filter']) ? trim($_GET['filter']) : 'all';

    $items = getAllItems();
    $filtered = array_values(array_filter($items, function($it) use ($search, $category, $filter) {
        if ($search) {
            $nameMatch = strpos(strtolower($it['name'] ?? ''), $search) !== false;
            $skuMatch = strpos(strtolower($it['sku'] ?? ''), $search) !== false;
            if (!$nameMatch && !$skuMatch) return false;
        }
        if ($category && $category !== 'All' && strtolower($it['category'] ?? '') !== strtolower($category)) {
            return false;
        }
        if ($filter === 'low_stock' && ($it['quantity'] ?? 0) > ($it['min_quantity'] ?? 5)) {
            return false;
        }
        if ($filter === 'out_of_stock' && ($it['quantity'] ?? 0) > 0) {
            return false;
        }
        return true;
    }));

    echo json_encode([
        'success' => true,
        'count' => count($filtered),
        'data' => $filtered
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

// 5. ADJUST STOCK
if ($action === 'adjust_stock') {
    $itemId = intval($inputData['item_id'] ?? ($_POST['item_id'] ?? 0));
    $change = intval($inputData['change'] ?? ($inputData['quantity_change'] ?? 0));
    $newQuantity = isset($inputData['new_quantity']) ? intval($inputData['new_quantity']) : null;

    $items = getAllItems();
    $updatedItem = null;
    foreach ($items as &$it) {
        if ($it['id'] === $itemId) {
            if ($newQuantity !== null) {
                $it['quantity'] = max(0, $newQuantity);
            } else {
                $it['quantity'] = max(0, ($it['quantity'] ?? 0) + $change);
            }
            $it['updated_at'] = date('Y-m-d H:i:s');
            $updatedItem = $it;
            break;
        }
    }

    if ($updatedItem) {
        saveAllItems($items);
        echo json_encode([
            'success' => true,
            'message' => "Stock updated successfully for {$updatedItem['name']}",
            'data' => $updatedItem
        ]);
    } else {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => "Item not found with ID {$itemId}"]);
    }
    exit;
}

// 6. GET ALL USERS (ADMINS & EMPLOYEES)
if ($action === 'get_users') {
    $usersData = getAllUsersData();
    // Mask passwords for safety
    $safeAdmins = array_map(function($a) {
        $copy = $a;
        $copy['password'] = '********';
        return $copy;
    }, $usersData['admins']);

    echo json_encode([
        'success' => true,
        'admins' => $safeAdmins,
        'employees' => $usersData['employees']
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

// 7. ADD USER VIA API
if ($action === 'add_user') {
    $role = $inputData['role'] ?? ($_POST['role'] ?? 'employee');
    if ($role === 'employee') {
        $empId = $inputData['emp_id'] ?? ($_POST['emp_id'] ?? '');
        $code = $inputData['code'] ?? ($_POST['code'] ?? '');
        $name = $inputData['name'] ?? ($_POST['name'] ?? '');
        $phone = $inputData['phone'] ?? ($_POST['phone'] ?? '');

        if (!$empId || !$code || !$name) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Employee ID, 4-digit code, and name are required.']);
            exit;
        }

        $newEmp = addEmployeeUser($empId, $code, $name, $phone);
        echo json_encode(['success' => true, 'message' => 'Employee added successfully', 'data' => $newEmp]);
        exit;
    } else {
        $email = $inputData['email'] ?? ($_POST['email'] ?? '');
        $password = $inputData['password'] ?? ($_POST['password'] ?? '');
        $shopName = $inputData['shop_name'] ?? ($_POST['shop_name'] ?? 'SHOUKY MOBILES');
        $phone = $inputData['phone'] ?? ($_POST['phone'] ?? '');

        if (!$email || !$password) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Email and Password are required.']);
            exit;
        }

        $newAdmin = addAdminUser($email, $password, $shopName, $phone);
        $newAdmin['password'] = '********';
        echo json_encode(['success' => true, 'message' => 'Admin added successfully', 'data' => $newAdmin]);
        exit;
    }
}

// 7b. DELETE USER (EMPLOYEE) VIA API
if ($action === 'delete_user') {
    $empId = $inputData['emp_id'] ?? ($_POST['emp_id'] ?? ($_GET['emp_id'] ?? ''));
    if (!$empId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Employee ID is required to delete']);
        exit;
    }
    $cleanEmpId = strtoupper(trim($empId));
    $pdo = getDatabaseConnection();
    if ($pdo) {
        try {
            $stmt = $pdo->prepare("DELETE FROM `employees` WHERE UPPER(emp_id) = ?");
            $stmt->execute([$cleanEmpId]);
        } catch (Exception $e) {
            // Ignore DB error and fallback
        }
    }
    $data = getAllUsersData();
    $data['employees'] = array_values(array_filter($data['employees'], function($e) use ($cleanEmpId) {
        return strtoupper(trim($e['emp_id'] ?? '')) !== $cleanEmpId;
    }));
    saveUsersData($data);
    echo json_encode(['success' => true, 'message' => "Employee {$cleanEmpId} deleted successfully"]);
    exit;
}

// 8. CHANGE PASSWORD (Updates MySQL admins table directly)
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
        $ok = updateAdminPassword($email, $newPassword);
        echo json_encode([
            'success' => true,
            'message' => 'Admin password has been updated in MySQL database. Use your new password for subsequent logins.',
            'email' => $email
        ]);
        exit;
    } elseif ($empId) {
        $ok = updateEmployeeCode($empId, $newPassword);
        echo json_encode([
            'success' => true,
            'message' => 'Employee access code has been updated in MySQL database.',
            'emp_id' => $empId
        ]);
        exit;
    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Account email or employee ID is required to change password.']);
        exit;
    }
}

// 9. CHANGE APP PIN
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

    echo json_encode([
        'success' => true,
        'message' => '4-Digit PIN updated successfully.',
        'pin' => $pin
    ]);
    exit;
}

// 10. INVOICES & SALES MANAGEMENT
if ($action === 'get_invoices' || $action === 'invoices') {
    $search = strtolower(trim($_GET['search'] ?? ($inputData['search'] ?? '')));
    $pdo = getDatabaseConnection();
    $invoices = [];

    if ($pdo) {
        try {
            if ($search) {
                $term = "%{$search}%";
                $stmt = $pdo->prepare("
                    SELECT * FROM `invoices`
                    WHERE LOWER(invoice_no) LIKE ?
                       OR LOWER(customer_name) LIKE ?
                       OR LOWER(customer_phone) LIKE ?
                       OR LOWER(customer_email) LIKE ?
                       OR LOWER(imei) LIKE ?
                       OR LOWER(item_name) LIKE ?
                       OR DATE_FORMAT(invoice_date, '%Y-%m-%d') LIKE ?
                    ORDER BY id DESC
                ");
                $stmt->execute([$term, $term, $term, $term, $term, $term, $term]);
                $invoices = $stmt->fetchAll() ?: [];
            } else {
                $stmt = $pdo->query("SELECT * FROM `invoices` ORDER BY id DESC");
                $invoices = $stmt->fetchAll() ?: [];
            }
        } catch (Exception $e) {}
    }

    echo json_encode([
        'success' => true,
        'count' => count($invoices),
        'data' => $invoices
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'create_invoice' || $action === 'record_sale') {
    $itemId = intval($inputData['item_id'] ?? ($_POST['item_id'] ?? 0));
    $itemName = trim($inputData['item_name'] ?? ($_POST['item_name'] ?? 'Mobile Product'));
    $category = trim($inputData['category'] ?? ($_POST['category'] ?? 'Mobile'));
    $itemType = trim($inputData['item_type'] ?? ($_POST['item_type'] ?? 'First Hand'));
    $imei = trim($inputData['imei'] ?? ($_POST['imei'] ?? ''));
    $costPrice = floatval($inputData['cost_price'] ?? ($_POST['cost_price'] ?? 0));
    $sellingPrice = floatval($inputData['selling_price'] ?? ($inputData['total_amount'] ?? ($_POST['selling_price'] ?? 0)));
    $customerName = trim($inputData['customer_name'] ?? ($_POST['customer_name'] ?? 'Walk-in Customer'));
    $customerPhone = trim($inputData['customer_phone'] ?? ($_POST['customer_phone'] ?? ''));
    $customerEmail = trim($inputData['customer_email'] ?? ($_POST['customer_email'] ?? ''));
    $customerAddress = trim($inputData['customer_address'] ?? ($_POST['customer_address'] ?? ''));
    $paymentMode = trim($inputData['payment_mode'] ?? ($_POST['payment_mode'] ?? 'Cash'));
    $notes = trim($inputData['notes'] ?? ($_POST['notes'] ?? ''));
    $createdBy = trim($inputData['created_by'] ?? ($_POST['created_by'] ?? 'Admin'));

    // Second Hand Seller Customer details (Who we bought the used device from)
    $sellerName = trim($inputData['seller_name'] ?? ($_POST['seller_name'] ?? ''));
    $sellerPhone = trim($inputData['seller_phone'] ?? ($_POST['seller_phone'] ?? ''));
    $sellerEmail = trim($inputData['seller_email'] ?? ($_POST['seller_email'] ?? ''));
    $sellerAddress = trim($inputData['seller_address'] ?? ($_POST['seller_address'] ?? ''));
    $conditionNotes = trim($inputData['condition_notes'] ?? ($_POST['condition_notes'] ?? ''));

    $pdo = getDatabaseConnection();
    // Auto-fetch seller customer info from items table if item_id exists and not passed
    if (empty($sellerName) && $itemId > 0 && $pdo) {
        try {
            $itStmt = $pdo->prepare("SELECT seller_name, seller_phone, seller_email, seller_address, condition_notes FROM `items` WHERE id = ?");
            $itStmt->execute([$itemId]);
            $itemRow = $itStmt->fetch();
            if ($itemRow) {
                $sellerName = $itemRow['seller_name'] ?? '';
                $sellerPhone = $itemRow['seller_phone'] ?? '';
                $sellerEmail = $itemRow['seller_email'] ?? '';
                $sellerAddress = $itemRow['seller_address'] ?? '';
                $conditionNotes = $itemRow['condition_notes'] ?? '';
            }
        } catch (Exception $e) {}
    }

    $invoiceNo = 'INV-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -4));

    if ($pdo) {
        try {
            $stmt = $pdo->prepare("
                INSERT INTO `invoices` (
                    invoice_no, item_id, item_name, category, item_type, imei,
                    cost_price, selling_price, customer_name, customer_phone,
                    customer_email, customer_address, payment_mode, notes,
                    seller_name, seller_phone, seller_email, seller_address, condition_notes,
                    created_by, invoice_date
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            ");
            $stmt->execute([
                $invoiceNo, $itemId ?: null, $itemName, $category, $itemType, $imei,
                $costPrice, $sellingPrice, $customerName, $customerPhone,
                $customerEmail, $customerAddress, $paymentMode, $notes,
                $sellerName, $sellerPhone, $sellerEmail, $sellerAddress, $conditionNotes,
                $createdBy
            ]);
            $invId = $pdo->lastInsertId();

            // Also log to transactions table for profit and stock tracking
            try {
                $profit = max(0, $sellingPrice - $costPrice);
                $txStmt = $pdo->prepare("
                    INSERT INTO `transactions` (
                        item_id, item_name, sku, type, quantity, cost_price, selling_price, profit, reason, created_at
                    ) VALUES (?, ?, ?, 'SALE', 1, ?, ?, ?, ?, NOW())
                ");
                $txStmt->execute([
                    $itemId ?: null, $itemName, $imei, $costPrice, $sellingPrice, $profit,
                    "Customer Sale ({$invoiceNo}): {$customerName}"
                ]);
            } catch (Exception $txEx) {}

            // Mark item as sold or reduce quantity in items table
            if ($itemId > 0) {
                $upStmt = $pdo->prepare("
                    UPDATE `items`
                    SET quantity = GREATEST(0, quantity - 1),
                        status = CASE WHEN quantity <= 1 THEN 'sold' ELSE 'available' END
                    WHERE id = ?
                ");
                $upStmt->execute([$itemId]);
            }

            echo json_encode([
                'success' => true,
                'message' => "Invoice {$invoiceNo} created successfully!",
                'data' => [
                    'id' => $invId,
                    'invoice_no' => $invoiceNo,
                    'item_name' => $itemName,
                    'category' => $category,
                    'item_type' => $itemType,
                    'imei' => $imei,
                    'cost_price' => $costPrice,
                    'selling_price' => $sellingPrice,
                    'customer_name' => $customerName,
                    'customer_phone' => $customerPhone,
                    'customer_email' => $customerEmail,
                    'customer_address' => $customerAddress,
                    'payment_mode' => $paymentMode,
                    'seller_name' => $sellerName,
                    'seller_phone' => $sellerPhone,
                    'seller_email' => $sellerEmail,
                    'seller_address' => $sellerAddress,
                    'condition_notes' => $conditionNotes,
                    'invoice_date' => date('Y-m-d H:i:s')
                ]
            ]);
            exit;
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Failed to create invoice: ' . $e->getMessage()]);
            exit;
        }
    }

    echo json_encode(['success' => false, 'message' => 'Database connection unavailable for invoice generation.']);
    exit;
}

// DELETE INVOICE (Moves to Recycle Bin)
if ($action === 'delete_invoice') {
    $invId = intval($inputData['id'] ?? ($_GET['id'] ?? 0));
    $pdo = getDatabaseConnection();
    if ($pdo && $invId > 0) {
        try {
            $fetchStmt = $pdo->prepare("SELECT * FROM `invoices` WHERE id = ?");
            $fetchStmt->execute([$invId]);
            $invRow = $fetchStmt->fetch();
            if ($invRow) {
                $binStmt = $pdo->prepare("INSERT INTO `trash_bin` (record_type, original_id, identifier, title, amount, data, deleted_at) VALUES ('invoice', ?, ?, ?, ?, ?, NOW())");
                $binStmt->execute([
                    $invId,
                    $invRow['invoice_no'] ?? '',
                    "Invoice {$invRow['invoice_no']}: {$invRow['item_name']}",
                    floatval($invRow['selling_price'] ?? 0),
                    json_encode($invRow, JSON_UNESCAPED_UNICODE)
                ]);
            }
            $stmt = $pdo->prepare("DELETE FROM `invoices` WHERE id = ?");
            $stmt->execute([$invId]);
            echo json_encode(['success' => true, 'message' => "Invoice #{$invId} moved to Recycle Bin."]);
            exit;
        } catch (Exception $e) {}
    }
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid invoice ID.']);
    exit;
}

// DELETE TRANSACTION (Moves to Recycle Bin)
if ($action === 'delete_transaction') {
    $txId = intval($inputData['id'] ?? ($_GET['id'] ?? 0));
    $pdo = getDatabaseConnection();
    if ($pdo && $txId > 0) {
        try {
            $fetchStmt = $pdo->prepare("SELECT * FROM `transactions` WHERE id = ?");
            $fetchStmt->execute([$txId]);
            $txRow = $fetchStmt->fetch();
            if ($txRow) {
                $binStmt = $pdo->prepare("INSERT INTO `trash_bin` (record_type, original_id, identifier, title, amount, data, deleted_at) VALUES ('transaction', ?, ?, ?, ?, ?, NOW())");
                $binStmt->execute([
                    $txId,
                    $txRow['sku'] ?? '',
                    "{$txRow['type']} Movement: {$txRow['item_name']}",
                    floatval($txRow['selling_price'] ?? ($txRow['cost_price'] ?? 0)),
                    json_encode($txRow, JSON_UNESCAPED_UNICODE)
                ]);
            }
            $stmt = $pdo->prepare("DELETE FROM `transactions` WHERE id = ?");
            $stmt->execute([$txId]);
            echo json_encode(['success' => true, 'message' => "Transaction moved to Recycle Bin."]);
            exit;
        } catch (Exception $e) {}
    }
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid transaction ID.']);
    exit;
}

// GET RECYCLE BIN ITEMS
if ($action === 'get_bin') {
    $pdo = getDatabaseConnection();
    $binItems = [];
    if ($pdo) {
        try {
            $stmt = $pdo->query("SELECT * FROM `trash_bin` ORDER BY id DESC");
            $rows = $stmt->fetchAll();
            $binItems = array_map(function($r) {
                $r['data_parsed'] = json_decode($r['data'] ?? '{}', true);
                return $r;
            }, $rows ?: []);
        } catch (Exception $e) {}
    }
    echo json_encode(['success' => true, 'count' => count($binItems), 'data' => $binItems]);
    exit;
}

// RESTORE FROM RECYCLE BIN
if ($action === 'restore_from_bin') {
    $binId = intval($inputData['id'] ?? ($_GET['id'] ?? 0));
    $pdo = getDatabaseConnection();
    if ($pdo && $binId > 0) {
        try {
            $stmt = $pdo->prepare("SELECT * FROM `trash_bin` WHERE id = ?");
            $stmt->execute([$binId]);
            $row = $stmt->fetch();
            if ($row) {
                $type = $row['record_type'];
                $data = json_decode($row['data'] ?? '{}', true);
                if ($type === 'invoice' && !empty($data)) {
                    $originalNo = $data['invoice_no'] ?? ('INV-' . time());
                    // Check if original invoice_no already exists in active invoices
                    $checkStmt = $pdo->prepare("SELECT id FROM `invoices` WHERE invoice_no = ?");
                    $checkStmt->execute([$originalNo]);
                    $targetInvNo = $checkStmt->fetch() ? ($originalNo . '-RESTORED') : $originalNo;

                    $ins = $pdo->prepare("
                        INSERT INTO `invoices` (
                            invoice_no, item_id, item_name, category, item_type, imei,
                            cost_price, selling_price, customer_name, customer_phone,
                            customer_email, customer_address, payment_mode, notes,
                            seller_name, seller_phone, seller_email, seller_address, condition_notes,
                            created_by, invoice_date
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ");
                    $ins->execute([
                        $targetInvNo, $data['item_id'] ?? null, $data['item_name'] ?? '',
                        $data['category'] ?? 'Mobile', $data['item_type'] ?? 'First Hand', $data['imei'] ?? '',
                        $data['cost_price'] ?? 0, $data['selling_price'] ?? 0, $data['customer_name'] ?? '',
                        $data['customer_phone'] ?? '', $data['customer_email'] ?? '', $data['customer_address'] ?? '',
                        $data['payment_mode'] ?? 'Cash', $data['notes'] ?? '', $data['seller_name'] ?? '',
                        $data['seller_phone'] ?? '', $data['seller_email'] ?? '', $data['seller_address'] ?? '',
                        $data['condition_notes'] ?? '', $data['created_by'] ?? 'Admin', $data['invoice_date'] ?? date('Y-m-d H:i:s')
                    ]);
                } elseif ($type === 'transaction' && !empty($data)) {
                    $ins = $pdo->prepare("
                        INSERT INTO `transactions` (
                            item_id, item_name, sku, type, quantity, cost_price, selling_price, profit, reason, created_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ");
                    $ins->execute([
                        $data['item_id'] ?? null, $data['item_name'] ?? '', $data['sku'] ?? '',
                        $data['type'] ?? 'SALE', $data['quantity'] ?? 1, $data['cost_price'] ?? 0,
                        $data['selling_price'] ?? 0, $data['profit'] ?? 0, ($data['reason'] ?? '') . ' (Restored)',
                        $data['created_at'] ?? date('Y-m-d H:i:s')
                    ]);
                }
                $del = $pdo->prepare("DELETE FROM `trash_bin` WHERE id = ?");
                $del->execute([$binId]);
                echo json_encode(['success' => true, 'message' => "Restored successfully from Recycle Bin"]);
                exit;
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
            exit;
        }
    }
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid bin item ID']);
    exit;
}

// DELETE SINGLE ITEM FROM RECYCLE BIN PERMANENTLY
if ($action === 'delete_bin_item') {
    $binId = intval($inputData['id'] ?? ($_GET['id'] ?? 0));
    $pdo = getDatabaseConnection();
    if ($pdo && $binId > 0) {
        try {
            $stmt = $pdo->prepare("DELETE FROM `trash_bin` WHERE id = ?");
            $stmt->execute([$binId]);
            echo json_encode(['success' => true, 'message' => 'Item permanently deleted from Recycle Bin.']);
            exit;
        } catch (Exception $e) {}
    }
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid bin item ID.']);
    exit;
}

// EMPTY RECYCLE BIN
if ($action === 'empty_bin') {
    $pdo = getDatabaseConnection();
    if ($pdo) {
        try {
            $pdo->exec("TRUNCATE TABLE `trash_bin`");
        } catch (Exception $e) {
            $pdo->exec("DELETE FROM `trash_bin`");
        }
    }
    echo json_encode(['success' => true, 'message' => 'Recycle Bin emptied completely.']);
    exit;
}

// 12. LIVE ANALYTICS (Today's Sales, Inventory In, Margin, Best Month & Monthly Graphs)
if ($action === 'analytics' || $action === 'get_analytics') {
    $pdo = getDatabaseConnection();
    $analytics = [
        'today_sales_count' => 0,
        'today_sales_revenue' => 0,
        'today_phones_in' => 0,
        'today_margin' => 0,
        'today_margin_percentage' => 0,
        'top_sales_month' => null,
        'monthly_sales' => []
    ];

    if ($pdo) {
        try {
            // 1. Today's Sales Count, Revenue, Margin
            $todayStmt = $pdo->query("
                SELECT 
                    COUNT(*) as sales_count,
                    COALESCE(SUM(selling_price), 0) as total_revenue,
                    COALESCE(SUM(selling_price - cost_price), 0) as total_margin
                FROM `invoices`
                WHERE DATE(invoice_date) = CURDATE()
            ");
            $todayData = $todayStmt ? $todayStmt->fetch() : null;
            if ($todayData) {
                $analytics['today_sales_count'] = intval($todayData['sales_count']);
                $analytics['today_sales_revenue'] = floatval($todayData['total_revenue']);
                $analytics['today_margin'] = floatval($todayData['total_margin']);
                if ($analytics['today_sales_revenue'] > 0) {
                    $analytics['today_margin_percentage'] = round(($analytics['today_margin'] / $analytics['today_sales_revenue']) * 100, 1);
                }
            }

            // 2. Today's Phones / Items Added to Inventory
            $phonesStmt = $pdo->query("
                SELECT COALESCE(SUM(quantity), 0) as phones_in
                FROM `items`
                WHERE DATE(created_at) = CURDATE()
            ");
            $phonesData = $phonesStmt ? $phonesStmt->fetch() : null;
            $analytics['today_phones_in'] = intval($phonesData['phones_in'] ?? 0);

            // Also check transactions table for type IN today
            $txInStmt = $pdo->query("
                SELECT COALESCE(SUM(quantity), 0) as tx_in
                FROM `transactions`
                WHERE type = 'IN' AND DATE(created_at) = CURDATE()
            ");
            $txInData = $txInStmt ? $txInStmt->fetch() : null;
            $txInCount = intval($txInData['tx_in'] ?? 0);
            if ($txInCount > $analytics['today_phones_in']) {
                $analytics['today_phones_in'] = $txInCount;
            }

            // 3. Monthly Sales Breakdown (Last 12 Months)
            $monthStmt = $pdo->query("
                SELECT 
                    DATE_FORMAT(invoice_date, '%b') as month_short,
                    DATE_FORMAT(invoice_date, '%M %Y') as month_full,
                    DATE_FORMAT(invoice_date, '%Y-%m') as year_month,
                    COUNT(*) as count,
                    COALESCE(SUM(selling_price), 0) as revenue,
                    COALESCE(SUM(selling_price - cost_price), 0) as margin
                FROM `invoices`
                GROUP BY year_month, month_short, month_full
                ORDER BY year_month ASC
                LIMIT 12
            ");
            $monthlyRows = $monthStmt ? $monthStmt->fetchAll() : [];
            $analytics['monthly_sales'] = $monthlyRows ?: [];

            // 4. Best Sales Month
            if (!empty($monthlyRows)) {
                $top = null;
                foreach ($monthlyRows as $m) {
                    if ($top === null || floatval($m['revenue']) > floatval($top['revenue'])) {
                        $top = $m;
                    }
                }
                $analytics['top_sales_month'] = $top;
            }
        } catch (Exception $e) {
            $analytics['error'] = $e->getMessage();
        }
    }

    echo json_encode([
        'success' => true,
        'data' => $analytics
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

// 13. TRANSACTIONS LIST
if ($action === 'transactions' || $action === 'get_transactions') {
    $limit = intval($_GET['limit'] ?? ($inputData['limit'] ?? 50));
    $pdo = getDatabaseConnection();
    $txs = [];
    if ($pdo) {
        try {
            $stmt = $pdo->prepare("SELECT * FROM `transactions` ORDER BY id DESC LIMIT ?");
            $stmt->bindValue(1, $limit, PDO::PARAM_INT);
            $stmt->execute();
            $txs = $stmt->fetchAll() ?: [];
        } catch (Exception $e) {}
    }
    echo json_encode([
        'success' => true,
        'data' => $txs
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

// 14. CATEGORIES LIST
if ($action === 'categories' || $action === 'get_categories') {
    echo json_encode([
        'success' => true,
        'data' => [
            ['id' => 1, 'name' => 'Mobile', 'icon' => 'phone-portrait', 'color' => '#0F172A'],
            ['id' => 2, 'name' => 'Accessories', 'icon' => 'headset', 'color' => '#059669'],
            ['id' => 3, 'name' => 'Other Products', 'icon' => 'cube', 'color' => '#475569']
        ]
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

// 11. PHYSICAL MOBILE PHOTO UPLOAD
if ($action === 'upload_image') {
    $uploadsDir = __DIR__ . '/uploads';
    if (!file_exists($uploadsDir)) {
        @mkdir($uploadsDir, 0777, true);
    }

    $fileName = 'mobile_' . date('Ymd_His') . '_' . bin2hex(random_bytes(4)) . '.jpg';
    $targetPath = $uploadsDir . '/' . $fileName;
    $saved = false;

    // Check base64 in JSON / POST
    $base64 = $inputData['image_data'] ?? ($inputData['base64'] ?? ($_POST['image_data'] ?? ($_POST['base64'] ?? '')));
    if (!empty($base64)) {
        if (strpos($base64, ',') !== false) {
            $base64 = explode(',', $base64)[1];
        }
        $decoded = base64_decode($base64);
        if ($decoded !== false && file_put_contents($targetPath, $decoded)) {
            $saved = true;
        }
    } elseif (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
        if (move_uploaded_file($_FILES['image']['tmp_name'], $targetPath)) {
            $saved = true;
        }
    }

    if ($saved) {
        $scheme = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') ? 'https' : 'http';
        $host = $_SERVER['HTTP_HOST'] ?? 'nibit.in';
        $scriptDir = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/\\');
        $fullUrl = "{$scheme}://{$host}{$scriptDir}/uploads/{$fileName}";

        echo json_encode([
            'success' => true,
            'message' => 'Photo uploaded successfully.',
            'url' => $fullUrl,
            'relative_url' => 'uploads/' . $fileName,
            'filename' => $fileName
        ]);
        exit;
    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Failed to save image. Please verify file data.']);
        exit;
    }
}




// 8. APP_ID / GRID FALLBACK (Mimics nibit.in app_manage schema)
if (isset($_GET['app_id']) || $action === 'get_records') {
    $usersData = getAllUsersData();
    $records = [];
    $sino = 1;

    foreach ($usersData['admins'] as $admin) {
        $records[] = [
            'id' => $admin['id'],
            'app_id' => 1,
            'record_data' => [
                'SINO' => (string)$sino++,
                'EMAIL' => $admin['email'],
                'PASSWORD' => $admin['password'],
                'SHOP NAME' => $admin['shop_name'] ?? 'SHOUKY MOBILES',
                'WEBSITE' => $admin['website'] ?? 'nibit.in',
                'col_275' => $admin['email'],
                'col_313' => $admin['password'],
                'col_313_decrypted' => $admin['password'],
                'col_591' => $admin['website'] ?? 'nibit.in',
                '_' => $admin['shop_name'] ?? 'SHOUKY MOBILES'
            ],
            'status' => 'active',
            'created_at' => date('Y-m-d H:i:s')
        ];
    }

    echo json_encode([
        'success' => true,
        'app_id' => 1,
        'app_name' => 'MOBILE MANAGEMENT APPS',
        'records' => $records,
        'data' => $records,
        'total' => count($records)
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

// DEFAULT: Action not recognized
echo json_encode([
    'success' => true,
    'status' => 'online',
    'message' => 'Shouky Mobile API is ready.',
    'hint' => 'Use ?action=health, ?action=items, or POST action=login / action=emp_login'
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
