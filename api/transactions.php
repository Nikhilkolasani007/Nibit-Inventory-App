<?php
// api/transactions.php - REST API for Stock Movements (Stock In / Stock Out / Adjustments)
require_once __DIR__ . '/db.php';

$pdo = getDatabaseConnection();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

switch ($method) {
    case 'GET':
        handleGetTransactions($pdo);
        break;
    case 'POST':
        handleCreateTransaction($pdo);
        break;
    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
        break;
}

function handleGetTransactions($pdo) {
    $itemId = isset($_GET['item_id']) ? intval($_GET['item_id']) : 0;
    $type = isset($_GET['type']) ? trim($_GET['type']) : '';
    $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 50;

    $query = "SELECT * FROM transactions WHERE 1=1";
    $params = [];

    if ($itemId > 0) {
        $query .= " AND item_id = ?";
        $params[] = $itemId;
    }

    if ($type !== '' && in_array(strtoupper($type), ['IN', 'OUT', 'ADJUSTMENT'])) {
        $query .= " AND type = ?";
        $params[] = strtoupper($type);
    }

    $query .= " ORDER BY created_at DESC LIMIT ?";
    $params[] = $limit;

    $stmt = $pdo->prepare($query);
    $stmt->execute($params);
    $records = $stmt->fetchAll();

    echo json_encode([
        'success' => true,
        'count' => count($records),
        'data' => $records
    ]);
}

function handleCreateTransaction($pdo) {
    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input || empty($input['item_id']) || !isset($input['quantity']) || empty($input['type'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Item ID, quantity, and type (IN/OUT/ADJUSTMENT) are required.']);
        return;
    }

    $itemId = intval($input['item_id']);
    $qtyChange = intval($input['quantity']);
    $type = strtoupper(trim($input['type']));
    $reason = !empty($input['reason']) ? trim($input['reason']) : 'Stock ' . $type;

    if ($qtyChange <= 0 && $type !== 'ADJUSTMENT') {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Quantity must be greater than 0.']);
        return;
    }

    $stmt = $pdo->prepare("SELECT * FROM items WHERE id = ?");
    $stmt->execute([$itemId]);
    $item = $stmt->fetch();

    if (!$item) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Item not found.']);
        return;
    }

    $prevQty = intval($item['quantity']);
    $newQty = $prevQty;

    if ($type === 'IN') {
        $newQty = $prevQty + $qtyChange;
    } elseif ($type === 'OUT') {
        if ($qtyChange > $prevQty) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => "Insufficient stock. Current available: {$prevQty}"]);
            return;
        }
        $newQty = $prevQty - $qtyChange;
    } elseif ($type === 'ADJUSTMENT') {
        $newQty = max(0, $qtyChange); // Direct set
        $qtyChange = abs($newQty - $prevQty);
    }

    // Update item quantity
    $updStmt = $pdo->prepare("UPDATE items SET quantity = ?, updated_at = datetime('now') WHERE id = ?");
    $updStmt->execute([$newQty, $itemId]);

    // Insert transaction
    $txStmt = $pdo->prepare("INSERT INTO transactions (item_id, item_name, sku, type, quantity, previous_quantity, new_quantity, reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    $txStmt->execute([$itemId, $item['name'], $item['sku'], $type, $qtyChange, $prevQty, $newQty, $reason]);
    $txId = $pdo->lastInsertId();

    $fetchTx = $pdo->prepare("SELECT * FROM transactions WHERE id = ?");
    $fetchTx->execute([$txId]);
    $transaction = $fetchTx->fetch();

    echo json_encode([
        'success' => true,
        'message' => "Stock {$type} recorded successfully",
        'item' => [
            'id' => $itemId,
            'name' => $item['name'],
            'previous_quantity' => $prevQty,
            'new_quantity' => $newQty
        ],
        'transaction' => $transaction
    ]);
}
