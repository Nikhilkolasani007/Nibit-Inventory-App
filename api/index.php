<?php
/**
 * shouky_api/index.php - Web Management Dashboard for Shouky Mobiles
 * Allows viewing/adding Admin and Employee users directly from your browser!
 */

require_once __DIR__ . '/users.php';
require_once __DIR__ . '/items.php';

$message = '';
$error = '';

// Handle web form submissions
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    if ($action === 'add_admin') {
        $email = trim($_POST['email'] ?? '');
        $pass = trim($_POST['password'] ?? '');
        $shop = trim($_POST['shop_name'] ?? 'SHOUKY MOBILES');
        $phone = trim($_POST['phone'] ?? '');

        if ($email && $pass) {
            addAdminUser($email, $pass, $shop, $phone);
            $message = "Admin user '{$email}' added successfully!";
        } else {
            $error = "Email and Password are required.";
        }
    } elseif ($action === 'add_employee') {
        $empId = trim($_POST['emp_id'] ?? '');
        $code = trim($_POST['code'] ?? '');
        $name = trim($_POST['name'] ?? '');
        $phone = trim($_POST['phone'] ?? '');

        if ($empId && $code && $name) {
            if (strlen($code) !== 4 || !ctype_digit($code)) {
                $error = "Security code must be exactly 4 numeric digits!";
            } else {
                addEmployeeUser($empId, $code, $name, $phone);
                $message = "Employee '{$name}' ({$empId}) added successfully!";
            }
        } else {
            $error = "Employee ID, 4-digit code, and Name are required.";
        }
    }
}

$usersData = getAllUsersData();
$admins = $usersData['admins'];
$employees = $usersData['employees'];
$items = getAllItems();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Shouky Mobiles - Backend & User Manager</title>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg: #0B0F17;
            --card-bg: #111827;
            --card-border: #1F2937;
            --accent-cyan: #06B6D4;
            --accent-blue: #3B82F6;
            --accent-purple: #8B5CF6;
            --accent-emerald: #10B981;
            --accent-rose: #F43F5E;
            --text-main: #F3F4F6;
            --text-muted: #9CA3AF;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            background-color: var(--bg);
            color: var(--text-main);
            font-family: 'Plus Jakarta Sans', sans-serif;
            padding: 30px 20px;
            min-height: 100vh;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 15px;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 1px solid var(--card-border);
        }
        .brand { display: flex; align-items: center; gap: 12px; }
        .logo-icon {
            width: 44px;
            height: 44px;
            border-radius: 12px;
            background: linear-gradient(135deg, #06B6D4, #3B82F6);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 22px;
            font-weight: 800;
            color: #fff;
            box-shadow: 0 0 20px rgba(6,182,212,0.4);
        }
        h1 { font-size: 24px; font-weight: 800; }
        .subtitle { font-size: 13px; color: var(--text-muted); }
        .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 6px 14px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 600;
            background: rgba(16,185,129,0.15);
            color: #34D399;
            border: 1px solid rgba(16,185,129,0.3);
        }
        .status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #10B981;
            box-shadow: 0 0 8px #10B981;
            animation: pulse 2s infinite;
        }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        .grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(540px, 1fr)); gap: 24px; margin-bottom: 30px; }
        @media (max-width: 600px) { .grid-2 { grid-template-columns: 1fr; } }
        .card {
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: 16px;
            padding: 24px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.3);
        }
        .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }
        .card-title { font-size: 18px; font-weight: 700; display: flex; align-items: center; gap: 10px; }
        .badge {
            font-size: 11px;
            font-weight: 700;
            padding: 3px 8px;
            border-radius: 6px;
            text-transform: uppercase;
        }
        .badge-admin { background: rgba(59,130,246,0.2); color: #60A5FA; border: 1px solid rgba(59,130,246,0.4); }
        .badge-emp { background: rgba(139,92,246,0.2); color: #A78BFA; border: 1px solid rgba(139,92,246,0.4); }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 14px; }
        th { text-align: left; padding: 10px 12px; color: var(--text-muted); font-size: 12px; border-bottom: 1px solid var(--card-border); }
        td { padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .code-pill {
            font-family: 'JetBrains Mono', monospace;
            background: rgba(255,255,255,0.08);
            padding: 3px 8px;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 600;
            color: #38BDF8;
        }
        .pin-pill {
            font-family: 'JetBrains Mono', monospace;
            background: rgba(139,92,246,0.2);
            color: #C4B5FD;
            padding: 3px 8px;
            border-radius: 6px;
            font-weight: 700;
            letter-spacing: 2px;
        }
        .btn {
            background: linear-gradient(135deg, #06B6D4, #3B82F6);
            color: #fff;
            border: none;
            padding: 10px 18px;
            border-radius: 10px;
            font-weight: 600;
            font-size: 13px;
            cursor: pointer;
            transition: all 0.2s;
        }
        .btn:hover { transform: translateY(-1px); box-shadow: 0 4px 15px rgba(6,182,212,0.4); }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
        @media (max-width: 480px) { .form-row { grid-template-columns: 1fr; } }
        input {
            width: 100%;
            padding: 10px 14px;
            background: rgba(255,255,255,0.05);
            border: 1px solid var(--card-border);
            border-radius: 8px;
            color: #fff;
            font-size: 13px;
            outline: none;
        }
        input:focus { border-color: var(--accent-cyan); }
        .alert {
            padding: 12px 18px;
            border-radius: 10px;
            margin-bottom: 20px;
            font-size: 14px;
            font-weight: 500;
        }
        .alert-success { background: rgba(16,185,129,0.15); border: 1px solid #10B981; color: #34D399; }
        .alert-error { background: rgba(244,63,94,0.15); border: 1px solid #F43F5E; color: #FB7185; }
        .api-url-box {
            background: #0D131F;
            border: 1px dashed #374151;
            padding: 16px;
            border-radius: 12px;
            margin-top: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 10px;
        }
        .api-url-text { font-family: 'JetBrains Mono', monospace; font-size: 13px; color: #38BDF8; word-break: break-all; }
        .quick-links { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 10px; }
        .link-pill {
            text-decoration: none;
            font-size: 12px;
            padding: 5px 12px;
            border-radius: 8px;
            background: rgba(255,255,255,0.07);
            color: #9CA3AF;
            border: 1px solid rgba(255,255,255,0.1);
            transition: all 0.2s;
        }
        .link-pill:hover { color: #fff; background: rgba(255,255,255,0.15); }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <div class="brand">
                <div class="logo-icon">S</div>
                <div>
                    <h1>SHOUKY MOBILES &bull; Live API Management</h1>
                    <div class="subtitle">Public Backend &bull; nibit.in/admin/shouky_api/</div>
                </div>
            </div>
            <div class="status-badge">
                <div class="status-dot"></div>
                API Live &amp; Ready
            </div>
        </header>

        <?php if ($message): ?>
            <div class="alert alert-success">&check; <?= htmlspecialchars($message) ?></div>
        <?php endif; ?>
        <?php if ($error): ?>
            <div class="alert alert-error">&times; <?= htmlspecialchars($error) ?></div>
        <?php endif; ?>

        <!-- Quick API Endpoints -->
        <div class="card" style="margin-bottom: 24px;">
            <div class="card-header" style="margin-bottom: 12px;">
                <div class="card-title">Mobile App Integration Endpoints</div>
                <span class="badge badge-admin">MySQL: iconltte1_SHOUKY</span>
            </div>
            <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 12px;">
                Configure your React Native Mobile App with this base URL. All mobile login and inventory actions connect directly here.
            </p>
            <div class="api-url-box">
                <span class="api-url-text">https://nibit.in/shouky_app/api.php</span>
                <span style="font-size: 12px; color: #10B981; font-weight: 600;">Active &amp; CORS Enabled</span>
            </div>
            <div class="quick-links">
                <a href="test.php" target="_blank" class="link-pill">&bull; Diagnostics / Test DB</a>
                <a href="api.php?action=health" target="_blank" class="link-pill">&bull; Check Health (JSON)</a>
                <a href="api.php?action=items" target="_blank" class="link-pill">&bull; View Inventory Items (<?= count($items) ?> items)</a>
                <a href="api.php?action=get_users" target="_blank" class="link-pill">&bull; View Users (JSON)</a>
                <a href="api.php?app_id=1" target="_blank" class="link-pill">&bull; Grid Fallback (app_id=1)</a>
            </div>
        </div>

        <div class="grid-2">
            <!-- 1. ADMIN USERS -->
            <div class="card">
                <div class="card-header">
                    <div class="card-title">
                        <span>Admin Accounts</span>
                        <span class="badge badge-admin"><?= count($admins) ?> Users</span>
                    </div>
                </div>
                <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">
                    Admins log in using <strong>Email</strong> and <strong>Password</strong> in the mobile app.
                </p>
                <table>
                    <thead>
                        <tr>
                            <th>Shop Name</th>
                            <th>Email</th>
                            <th>Password</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (empty($admins)): ?>
                        <tr><td colspan="3" style="text-align: center; color: var(--text-muted); padding: 20px;">No admin accounts yet. Add your first account below or directly in MySQL!</td></tr>
                        <?php else: ?>
                        <?php foreach ($admins as $adm): ?>
                        <tr>
                            <td><strong><?= htmlspecialchars($adm['shop_name'] ?? 'SHOUKY MOBILES') ?></strong></td>
                            <td><span class="code-pill"><?= htmlspecialchars($adm['email']) ?></span></td>
                            <td><span class="code-pill" style="color: #FBBF24;"><?= htmlspecialchars($adm['password']) ?></span></td>
                        </tr>
                        <?php endforeach; ?>
                        <?php endif; ?>
                    </tbody>
                </table>

                <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--card-border);">
                    <h4 style="font-size: 14px; margin-bottom: 12px; color: #60A5FA;">+ Add New Admin</h4>
                    <form method="POST">
                        <input type="hidden" name="action" value="add_admin">
                        <div class="form-row">
                            <input type="email" name="email" placeholder="Admin Email (e.g. boss@nibit.com)" required>
                            <input type="text" name="password" placeholder="Admin Password" required>
                        </div>
                        <div class="form-row">
                            <input type="text" name="shop_name" placeholder="Shop Name (e.g. SHOUKY MOBILES)">
                            <input type="text" name="phone" placeholder="Phone Number">
                        </div>
                        <button type="submit" class="btn" style="width: 100%;">Add Admin Account</button>
                    </form>
                </div>
            </div>

            <!-- 2. EMPLOYEE USERS -->
            <div class="card">
                <div class="card-header">
                    <div class="card-title">
                        <span>Employee Accounts (Emp Login)</span>
                        <span class="badge badge-emp"><?= count($employees) ?> Staff</span>
                    </div>
                </div>
                <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">
                    Employees log in via <strong>Employee ID</strong> and <strong>4-Digit Security Code</strong>.
                </p>
                <table>
                    <thead>
                        <tr>
                            <th>Emp ID</th>
                            <th>Name</th>
                            <th>4-Digit PIN</th>
                            <th>Phone</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (empty($employees)): ?>
                        <tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 20px;">No employee accounts yet. Add staff below or directly in MySQL!</td></tr>
                        <?php else: ?>
                        <?php foreach ($employees as $emp): ?>
                        <tr>
                            <td><span class="code-pill"><?= htmlspecialchars($emp['emp_id']) ?></span></td>
                            <td><strong><?= htmlspecialchars($emp['name']) ?></strong></td>
                            <td><span class="pin-pill"><?= htmlspecialchars($emp['code']) ?></span></td>
                            <td style="color: var(--text-muted); font-size: 12px;"><?= htmlspecialchars($emp['phone'] ?? '-') ?></td>
                        </tr>
                        <?php endforeach; ?>
                        <?php endif; ?>
                    </tbody>
                </table>

                <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--card-border);">
                    <h4 style="font-size: 14px; margin-bottom: 12px; color: #A78BFA;">+ Add New Employee</h4>
                    <form method="POST">
                        <input type="hidden" name="action" value="add_employee">
                        <div class="form-row">
                            <input type="text" name="emp_id" placeholder="Emp ID (e.g. EMP104)" required>
                            <input type="text" name="code" placeholder="4-Digit Code (e.g. 7890)" maxlength="4" pattern="\d{4}" required>
                        </div>
                        <div class="form-row">
                            <input type="text" name="name" placeholder="Employee Full Name" required>
                            <input type="text" name="phone" placeholder="Mobile Number">
                        </div>
                        <button type="submit" class="btn" style="width: 100%; background: linear-gradient(135deg, #8B5CF6, #3B82F6);">Add Employee Account</button>
                    </form>
                </div>
            </div>
        </div>

        <!-- Inventory Preview -->
        <div class="card">
            <div class="card-header">
                <div class="card-title">Mobile Inventory Catalog Preview</div>
                <span class="badge" style="background: rgba(16,185,129,0.2); color: #34D399;"><?= count($items) ?> Products Active</span>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Product Name</th>
                        <th>SKU</th>
                        <th>Category</th>
                        <th>Stock</th>
                        <th>Cost Price</th>
                        <th>Selling Price</th>
                        <th>Location</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach (array_slice($items, 0, 6) as $it): ?>
                    <tr>
                        <td><strong><?= htmlspecialchars($it['name']) ?></strong></td>
                        <td><span class="code-pill"><?= htmlspecialchars($it['sku']) ?></span></td>
                        <td><?= htmlspecialchars($it['category']) ?></td>
                        <td>
                            <span style="font-weight: 700; color: <?= ($it['quantity'] <= ($it['min_quantity'] ?? 5)) ? '#F43F5E' : '#34D399' ?>;">
                                <?= $it['quantity'] ?> units
                            </span>
                        </td>
                        <td>Rs <?= number_format($it['cost_price']) ?></td>
                        <td style="color: #38BDF8; font-weight: 600;">Rs <?= number_format($it['selling_price'] ?: 0) ?></td>
                        <td style="color: var(--text-muted); font-size: 12px;"><?= htmlspecialchars($it['location'] ?? 'Main Store') ?></td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>

        <footer style="margin-top: 40px; text-align: center; color: var(--text-muted); font-size: 13px;">
            &copy; <?= date('Y') ?> Shouky Mobiles &bull; Powered by Nibit Business Systems
        </footer>
    </div>
</body>
</html>
