<?php
/**
 * shouky_api/test.php - Diagnostics & Database Verification
 */

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/users.php';
require_once __DIR__ . '/items.php';

$pdo = getDatabaseConnection();
$dbErr = getDatabaseError();

$usersData = getAllUsersData();
$items = getAllItems();

$dbStatus = $pdo ? 'CONNECTED' : 'OFFLINE (Fallback Active)';

echo json_encode([
    'status' => 'OK',
    'message' => 'shouky_api is live on nibit.in!',
    'api_url' => 'https://nibit.in/shouky_app/api.php',
    'mysql_status' => $dbStatus,
    'database_name' => 'iconltte1_SHOUKY',
    'mysql_error' => $dbErr,
    'admins_count' => count($usersData['admins']),
    'employees_count' => count($usersData['employees']),
    'items_count' => count($items),
    'tested_at' => date('Y-m-d H:i:s')
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
