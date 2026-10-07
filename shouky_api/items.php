<?php
/**
 * shouky_api/items.php - Mobile Inventory Items Management
 * Connects directly to MySQL table `items` with fallback to items_data.json.
 */

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/db.php';

define('ITEMS_JSON_FILE', __DIR__ . '/items_data.json');

// Empty catalog fallback - strictly extracts from MySQL database / phpMyAdmin
$DEFAULT_ITEMS = [];

function getAllItems() {
    $pdo = getDatabaseConnection();
    if ($pdo) {
        try {
            $stmt = $pdo->query("SELECT * FROM `items` ORDER BY id DESC");
            $rows = $stmt->fetchAll();
            return $rows ?: [];
        } catch (Exception $e) {
            // Fall back
        }
    }

    if (file_exists(ITEMS_JSON_FILE)) {
        $raw = file_get_contents(ITEMS_JSON_FILE);
        $items = json_decode($raw, true);
        if (is_array($items)) {
            return $items;
        }
    }
    return [];
}

function saveAllItems($items) {
    file_put_contents(ITEMS_JSON_FILE, json_encode($items, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

// Handle Requests
$requestMethod = $_SERVER['REQUEST_METHOD'];

if (basename($_SERVER['PHP_SELF']) === 'items.php' || !defined('ITEMS_LOADED_AS_MODULE')) {
    $rawInput = file_get_contents('php://input');
    $inputData = json_decode($rawInput, true) ?: [];

    // --- 1. GET ITEMS (with search, category, item_type filters) ---
    if ($requestMethod === 'GET') {
        $search = isset($_GET['search']) ? strtolower(trim($_GET['search'])) : '';
        $category = isset($_GET['category']) ? trim($_GET['category']) : '';
        $itemType = isset($_GET['item_type']) ? trim($_GET['item_type']) : '';
        $filter = isset($_GET['filter']) ? trim($_GET['filter']) : 'all';

        $items = getAllItems();
        $filtered = array_values(array_filter($items, function($it) use ($search, $category, $itemType, $filter) {
            if ($search) {
                $nameMatch = strpos(strtolower($it['name'] ?? ''), $search) !== false;
                $skuMatch = strpos(strtolower($it['sku'] ?? ''), $search) !== false;
                $imeiMatch = strpos(strtolower($it['imei'] ?? ''), $search) !== false;
                $distMatch = strpos(strtolower($it['distributor'] ?? ''), $search) !== false;
                $sellerMatch = strpos(strtolower($it['seller_name'] ?? ''), $search) !== false;
                $sellerPhoneMatch = strpos(strtolower($it['seller_phone'] ?? ''), $search) !== false;
                $dateMatch = strpos(strtolower($it['created_at'] ?? ''), $search) !== false;
                if (!$nameMatch && !$skuMatch && !$imeiMatch && !$distMatch && !$sellerMatch && !$sellerPhoneMatch && !$dateMatch) {
                    return false;
                }
            }
            if ($category && $category !== 'All' && strtolower($it['category'] ?? '') !== strtolower($category)) {
                return false;
            }
            if ($itemType && $itemType !== 'All' && strtolower($it['item_type'] ?? '') !== strtolower($itemType)) {
                return false;
            }
            if ($filter === 'low_stock' && ($it['quantity'] ?? 0) > ($it['min_quantity'] ?? 1)) {
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

    // --- 2. DELETE ITEM ---
    if ($requestMethod === 'DELETE' || (isset($inputData['action']) && $inputData['action'] === 'delete')) {
        $id = intval($_GET['id'] ?? ($inputData['id'] ?? 0));
        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Valid Item ID is required.']);
            exit;
        }

        $pdo = getDatabaseConnection();
        if ($pdo) {
            try {
                $stmt = $pdo->prepare("DELETE FROM `items` WHERE `id` = ?");
                $stmt->execute([$id]);
            } catch (Exception $e) {}
        }

        $items = getAllItems();
        $items = array_values(array_filter($items, function($it) use ($id) {
            return intval($it['id']) !== $id;
        }));
        saveAllItems($items);

        echo json_encode(['success' => true, 'message' => "Item #{$id} deleted successfully."]);
        exit;
    }

    // --- 3. POST / PUT ITEMS (Create, Update, Adjust Stock) ---
    if ($requestMethod === 'POST' || $requestMethod === 'PUT') {
        $action = $inputData['action'] ?? ($_POST['action'] ?? ($requestMethod === 'PUT' ? 'update' : 'create'));

        // Action: Stock Adjustment
        if ($action === 'adjust_stock') {
            $itemId = intval($inputData['item_id'] ?? ($_POST['item_id'] ?? 0));
            $change = intval($inputData['change'] ?? ($inputData['quantity_change'] ?? 0));
            $newQuantity = isset($inputData['new_quantity']) ? intval($inputData['new_quantity']) : null;

            $pdo = getDatabaseConnection();
            if ($pdo) {
                try {
                    if ($newQuantity !== null) {
                        $stmt = $pdo->prepare("UPDATE `items` SET `quantity` = ? WHERE `id` = ?");
                        $stmt->execute([max(0, $newQuantity), $itemId]);
                    } else {
                        $stmt = $pdo->prepare("UPDATE `items` SET `quantity` = GREATEST(0, `quantity` + ?) WHERE `id` = ?");
                        $stmt->execute([$change, $itemId]);
                    }
                    $stmtGet = $pdo->prepare("SELECT * FROM `items` WHERE `id` = ?");
                    $stmtGet->execute([$itemId]);
                    $updatedItem = $stmtGet->fetch();
                    if ($updatedItem) {
                        echo json_encode([
                            'success' => true,
                            'message' => "Stock updated successfully for {$updatedItem['name']}",
                            'data' => $updatedItem
                        ]);
                        exit;
                    }
                } catch (Exception $e) {}
            }

            $items = getAllItems();
            $updatedItem = null;
            foreach ($items as &$it) {
                if (intval($it['id']) === $itemId) {
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
                echo json_encode(['success' => false, 'message' => "Item with ID {$itemId} not found."]);
            }
            exit;
        }

        // Action: Update Existing Item
        if ($action === 'update' || (isset($inputData['id']) && intval($inputData['id']) > 0)) {
            $id = intval($inputData['id'] ?? ($_POST['id'] ?? 0));
            $name = trim($inputData['name'] ?? ($_POST['name'] ?? ''));
            $category = trim($inputData['category'] ?? ($_POST['category'] ?? 'Mobile'));
            $itemType = trim($inputData['item_type'] ?? ($_POST['item_type'] ?? 'First Hand'));
            $imei = trim($inputData['imei'] ?? ($inputData['barcode'] ?? ($_POST['imei'] ?? '')));
            $costPrice = floatval($inputData['cost_price'] ?? ($_POST['cost_price'] ?? 0));
            $sellingPrice = isset($inputData['selling_price']) && $inputData['selling_price'] !== '' ? floatval($inputData['selling_price']) : null;
            $distributor = trim($inputData['distributor'] ?? ($inputData['supplier'] ?? ($_POST['distributor'] ?? '')));
            $sellerName = trim($inputData['seller_name'] ?? ($_POST['seller_name'] ?? ''));
            $sellerPhone = trim($inputData['seller_phone'] ?? ($_POST['seller_phone'] ?? ''));
            $sellerEmail = trim($inputData['seller_email'] ?? ($_POST['seller_email'] ?? ''));
            $sellerAddress = trim($inputData['seller_address'] ?? ($_POST['seller_address'] ?? ''));
            $conditionNotes = trim($inputData['condition_notes'] ?? ($inputData['description'] ?? ($_POST['condition_notes'] ?? '')));
            $images = trim($inputData['images'] ?? ($inputData['image'] ?? ($_POST['images'] ?? '')));
            $quantity = intval($inputData['quantity'] ?? ($_POST['quantity'] ?? 1));

            $pdo = getDatabaseConnection();
            if ($pdo) {
                try {
                    $stmt = $pdo->prepare("
                        UPDATE `items` SET
                            name = ?, category = ?, item_type = ?, imei = ?, cost_price = ?,
                            selling_price = ?, distributor = ?, seller_name = ?, seller_phone = ?,
                            seller_email = ?, seller_address = ?, condition_notes = ?, images = ?,
                            quantity = ?, updated_at = NOW()
                        WHERE id = ?
                    ");
                    $stmt->execute([
                        $name, $category, $itemType, $imei, $costPrice,
                        $sellingPrice, $distributor, $sellerName, $sellerPhone,
                        $sellerEmail, $sellerAddress, $conditionNotes, $images,
                        $quantity, $id
                    ]);
                    $stmtGet = $pdo->prepare("SELECT * FROM `items` WHERE id = ?");
                    $stmtGet->execute([$id]);
                    $row = $stmtGet->fetch();
                    echo json_encode(['success' => true, 'message' => 'Item updated successfully in MySQL', 'data' => $row]);
                    exit;
                } catch (Exception $e) {}
            }

            $items = getAllItems();
            $updated = null;
            foreach ($items as &$it) {
                if (intval($it['id']) === $id) {
                    $it['name'] = $name;
                    $it['category'] = $category;
                    $it['item_type'] = $itemType;
                    $it['imei'] = $imei;
                    $it['cost_price'] = $costPrice;
                    $it['selling_price'] = $sellingPrice;
                    $it['distributor'] = $distributor;
                    $it['seller_name'] = $sellerName;
                    $it['seller_phone'] = $sellerPhone;
                    $it['seller_email'] = $sellerEmail;
                    $it['seller_address'] = $sellerAddress;
                    $it['condition_notes'] = $conditionNotes;
                    $it['images'] = $images;
                    $it['quantity'] = $quantity;
                    $it['updated_at'] = date('Y-m-d H:i:s');
                    $updated = $it;
                    break;
                }
            }
            saveAllItems($items);
            echo json_encode(['success' => true, 'message' => 'Item updated successfully', 'data' => $updated]);
            exit;
        }

        // Action: Create New Item (First Hand or Second Hand)
        $pdo = getDatabaseConnection();
        $name = trim($inputData['name'] ?? ($_POST['name'] ?? 'Product'));
        $sku = trim($inputData['sku'] ?? ($_POST['sku'] ?? ('SKU-' . time())));
        $category = trim($inputData['category'] ?? ($_POST['category'] ?? 'Mobile')); // Mobile, Accessories, Other Products
        $itemType = trim($inputData['item_type'] ?? ($_POST['item_type'] ?? 'First Hand')); // First Hand, Second Hand
        $imei = trim($inputData['imei'] ?? ($inputData['barcode'] ?? ($_POST['imei'] ?? '')));
        $costPrice = floatval($inputData['cost_price'] ?? ($_POST['cost_price'] ?? 0));
        $sellingPrice = (isset($inputData['selling_price']) && $inputData['selling_price'] !== '') ? floatval($inputData['selling_price']) : null;
        $distributor = trim($inputData['distributor'] ?? ($inputData['supplier'] ?? ($_POST['distributor'] ?? '')));
        $sellerName = trim($inputData['seller_name'] ?? ($_POST['seller_name'] ?? ''));
        $sellerPhone = trim($inputData['seller_phone'] ?? ($_POST['seller_phone'] ?? ''));
        $sellerEmail = trim($inputData['seller_email'] ?? ($_POST['seller_email'] ?? ''));
        $sellerAddress = trim($inputData['seller_address'] ?? ($_POST['seller_address'] ?? ''));
        $conditionNotes = trim($inputData['condition_notes'] ?? ($inputData['description'] ?? ($_POST['condition_notes'] ?? '')));
        $images = trim($inputData['images'] ?? ($inputData['image'] ?? ($_POST['images'] ?? '')));
        $quantity = intval($inputData['quantity'] ?? ($_POST['quantity'] ?? 1));
        $minQuantity = intval($inputData['min_quantity'] ?? ($_POST['min_quantity'] ?? 1));

        if ($pdo) {
            try {
                $stmt = $pdo->prepare("
                    INSERT INTO `items` (
                        name, sku, category, item_type, quantity, min_quantity,
                        cost_price, selling_price, imei, distributor, seller_name,
                        seller_phone, seller_email, seller_address, condition_notes,
                        status, supplier, barcode, images
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'available', ?, ?, ?)
                ");
                $stmt->execute([
                    $name, $sku, $category, $itemType, $quantity, $minQuantity,
                    $costPrice, $sellingPrice, $imei, $distributor, $sellerName,
                    $sellerPhone, $sellerEmail, $sellerAddress, $conditionNotes,
                    $distributor ?: 'SHOUKY MOBILES', $imei, $images
                ]);
                $newId = $pdo->lastInsertId();
                $newItem = [
                    'id' => $newId, 'name' => $name, 'sku' => $sku, 'category' => $category,
                    'item_type' => $itemType, 'quantity' => $quantity, 'min_quantity' => $minQuantity,
                    'cost_price' => $costPrice, 'selling_price' => $sellingPrice, 'imei' => $imei,
                    'distributor' => $distributor, 'seller_name' => $sellerName,
                    'seller_phone' => $sellerPhone, 'seller_email' => $sellerEmail,
                    'seller_address' => $sellerAddress, 'condition_notes' => $conditionNotes,
                    'images' => $images,
                    'status' => 'available', 'created_at' => date('Y-m-d H:i:s')
                ];
                echo json_encode([
                    'success' => true,
                    'message' => "{$itemType} product saved successfully to MySQL",
                    'data' => $newItem
                ]);
                exit;
            } catch (Exception $e) {
                // Fall back
            }
        }

        $items = getAllItems();
        $newId = count($items) > 0 ? max(array_column($items, 'id')) + 1 : 1;
        $newItem = [
            'id' => $newId, 'name' => $name, 'sku' => $sku, 'category' => $category,
            'item_type' => $itemType, 'quantity' => $quantity, 'min_quantity' => $minQuantity,
            'cost_price' => $costPrice, 'selling_price' => $sellingPrice, 'imei' => $imei,
            'distributor' => $distributor, 'seller_name' => $sellerName,
            'seller_phone' => $sellerPhone, 'seller_email' => $sellerEmail,
            'seller_address' => $sellerAddress, 'condition_notes' => $conditionNotes,
            'images' => $images,
            'status' => 'available', 'created_at' => date('Y-m-d H:i:s')
        ];
        $items[] = $newItem;
        saveAllItems($items);

        echo json_encode(['success' => true, 'message' => "{$itemType} product saved successfully", 'data' => $newItem]);
        exit;
    }
}
