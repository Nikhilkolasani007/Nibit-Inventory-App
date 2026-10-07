<?php
// api/categories.php - REST API for Inventory Categories
require_once __DIR__ . '/db.php';

$pdo = getDatabaseConnection();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

switch ($method) {
    case 'GET':
        $stmt = $pdo->query("SELECT c.*, COUNT(i.id) as item_count FROM categories c LEFT JOIN items i ON c.name = i.category GROUP BY c.id ORDER BY c.name ASC");
        $categories = $stmt->fetchAll();
        echo json_encode([
            'success' => true,
            'data' => $categories
        ]);
        break;

    case 'POST':
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input || empty($input['name'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Category name is required']);
            return;
        }

        $name = trim($input['name']);
        $icon = !empty($input['icon']) ? trim($input['icon']) : 'tag';
        $color = !empty($input['color']) ? trim($input['color']) : '#4F46E5';

        try {
            $stmt = $pdo->prepare("INSERT INTO categories (name, icon, color) VALUES (?, ?, ?)");
            $stmt->execute([$name, $icon, $color]);
            $newId = $pdo->lastInsertId();

            $fetch = $pdo->prepare("SELECT * FROM categories WHERE id = ?");
            $fetch->execute([$newId]);
            $category = $fetch->fetch();

            http_response_code(201);
            echo json_encode([
                'success' => true,
                'message' => 'Category created',
                'data' => $category
            ]);
        } catch (PDOException $e) {
            http_response_code(409);
            echo json_encode(['success' => false, 'message' => 'Category already exists']);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
        break;
}
