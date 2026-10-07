<?php
// api/stats.php - REST API for Inventory Analytics and Dashboard Metrics
require_once __DIR__ . '/db.php';

$pdo = getDatabaseConnection();

try {
    // Total count & total quantity
    $itemStats = $pdo->query("SELECT 
        COUNT(*) as total_items,
        COALESCE(SUM(quantity), 0) as total_units,
        COALESCE(SUM(quantity * cost_price), 0) as total_inventory_cost,
        COALESCE(SUM(quantity * selling_price), 0) as total_inventory_value,
        SUM(CASE WHEN quantity = 0 THEN 1 ELSE 0 END) as out_of_stock_count,
        SUM(CASE WHEN quantity > 0 AND quantity <= min_threshold THEN 1 ELSE 0 END) as low_stock_count
    FROM items")->fetch();

    // Category breakdown
    $catStats = $pdo->query("SELECT 
        category,
        COUNT(*) as count,
        COALESCE(SUM(quantity), 0) as units,
        COALESCE(SUM(quantity * selling_price), 0) as total_value
    FROM items 
    GROUP BY category 
    ORDER BY units DESC")->fetchAll();

    // Recent 5 transactions
    $recentTx = $pdo->query("SELECT * FROM transactions ORDER BY created_at DESC LIMIT 5")->fetchAll();

    // Low stock items list
    $lowStockItems = $pdo->query("SELECT id, sku, name, category, quantity, min_threshold, selling_price 
        FROM items 
        WHERE quantity <= min_threshold 
        ORDER BY quantity ASC 
        LIMIT 10")->fetchAll();

    echo json_encode([
        'success' => true,
        'data' => [
            'metrics' => [
                'total_items' => intval($itemStats['total_items']),
                'total_units' => intval($itemStats['total_units']),
                'total_cost_valuation' => round(floatval($itemStats['total_inventory_cost']), 2),
                'total_selling_valuation' => round(floatval($itemStats['total_inventory_value']), 2),
                'potential_profit' => round(floatval($itemStats['total_inventory_value']) - floatval($itemStats['total_inventory_cost']), 2),
                'out_of_stock_count' => intval($itemStats['out_of_stock_count']),
                'low_stock_count' => intval($itemStats['low_stock_count']),
            ],
            'categories' => $catStats,
            'low_stock_alerts' => $lowStockItems,
            'recent_activity' => $recentTx
        ]
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
