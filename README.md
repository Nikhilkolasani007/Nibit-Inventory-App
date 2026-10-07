# 📦 Nibit Inventory

<p align="center">
  <strong>Modern Inventory Management for Mobile & Electronics Businesses</strong>
</p>

<p align="center">
  Built with <strong>Expo React Native</strong> + <strong>PHP REST API</strong>
</p>

<p align="center">

![Expo](https://img.shields.io/badge/Expo-57-000020?logo=expo\&logoColor=white)
![React Native](https://img.shields.io/badge/React%20Native-0.86-61DAFB?logo=react\&logoColor=black)
![JavaScript](https://img.shields.io/badge/JavaScript-ES2023-F7DF1E?logo=javascript\&logoColor=black)
![PHP](https://img.shields.io/badge/PHP-7.4%2B-777BB4?logo=php\&logoColor=white)
![Database](https://img.shields.io/badge/Database-SQLite%20%7C%20MySQL-003B57)
![License](https://img.shields.io/badge/License-MIT-green)

</p>

<p align="center">

<a href="#-features">Features</a> • <a href="#-screens">Screens</a> • <a href="#-architecture">Architecture</a> • <a href="#-installation">Installation</a> • <a href="#-api">API</a> • <a href="#-build">Build</a>

</p>

---

## 🚀 About

**Nibit Inventory** is a modern mobile inventory management application designed for **mobile phone, electronics, and small retail businesses**.

The application provides inventory management, IMEI tracking, point-of-sale functionality, financial analytics, invoices, stock management, authentication, image uploads, and backend synchronization.

The mobile application is built with **Expo React Native**, while the backend uses a **PHP REST API** connected to SQLite or MySQL.

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 🔐 Authentication

* Email & password login
* Employee ID login
* PIN lock
* Biometric unlock
* Persistent sessions

</td>
<td width="50%">

### 📦 Inventory

* Product catalog
* IMEI tracking
* First / Second Hand classification
* Stock management
* Search & filtering
* Low-stock alerts

</td>
</tr>

<tr>
<td>

### 🛒 POS / Sales

* Point-of-sale interface
* Record sales
* Automatic stock deduction
* Customer information
* Transaction history

</td>
<td>

### 💰 Finance

* Profit & Loss
* Transaction history
* Stock valuation
* Margin calculations
* Financial analytics

</td>
</tr>

<tr>
<td>

### 📊 Analytics

* Category distribution
* Stock statistics
* Estimated margins
* Dashboard metrics
* Low-stock monitoring

</td>
<td>

### 🧾 Invoices

* Create invoices
* View invoices
* Delete invoices
* Export / printing support

</td>
</tr>

<tr>
<td>

### 📷 Product Images

* Camera support
* Gallery selection
* Product image uploads
* Backend image storage

</td>
<td>

### 🗑️ Recycle Bin

* Deleted item recovery
* Restore products
* Permanent deletion
* Empty recycle bin

</td>
</tr>
</table>

---

# 📱 Screens

## 🔐 Login

Secure login screen supporting:

* Admin authentication
* Employee authentication
* Backend server configuration

---

## 🏠 Dashboard

The dashboard provides a quick overview of:

* Total inventory
* Inventory value
* Low-stock products
* Out-of-stock products
* Recent transactions

---

## 📦 Inventory

Manage your complete product catalog.

### Product information

| Field         | Description                  |
| ------------- | ---------------------------- |
| Product Name  | Name of the product          |
| SKU           | Unique stock identifier      |
| IMEI          | Device IMEI                  |
| Category      | Mobile / Accessories / Other |
| Condition     | First Hand / Second Hand     |
| Quantity      | Available stock              |
| Cost Price    | Purchase price               |
| Selling Price | Retail price                 |
| Minimum Stock | Alert threshold              |
| Distributor   | Supplier information         |
| Seller        | Second-hand seller           |
| Location      | Shelf / warehouse            |
| Photo         | Product image                |

---

## 🛒 Point of Sale

Process sales directly from the application.

**Sale flow:**

```text
Select Product
      ↓
Enter Quantity
      ↓
Customer Details
      ↓
Confirm Sale
      ↓
Stock Automatically Deducted
      ↓
Transaction Recorded
```

---

## 💰 Finance

Monitor your business finances with:

* Sales history
* Stock movement
* Cost price
* Selling price
* Profit
* Estimated margins
* Transaction analytics

---

# 🏗️ Architecture

```text
┌──────────────────────────────────────────┐
│          📱 Nibit Inventory              │
│                                          │
│        Expo React Native App             │
│                                          │
│  Login │ Home │ Inventory │ POS │ Finance│
└──────────────────┬───────────────────────┘
                   │
                   │ HTTPS / JSON
                   ▼
┌──────────────────────────────────────────┐
│             🌐 REST API                  │
│                                          │
│                PHP                       │
│                                          │
│ api.php │ auth.php │ items.php           │
│ stats.php │ categories.php               │
│ transactions.php │ users.php             │
└──────────────────┬───────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────┐
│             🗄️ Database                 │
│                                          │
│        SQLite / MySQL                    │
└──────────────────────────────────────────┘
```

---

# 🛠️ Tech Stack

| Layer        | Technology                |
| ------------ | ------------------------- |
| Mobile       | Expo React Native         |
| React Native | 0.86                      |
| Expo         | SDK 57                    |
| Language     | JavaScript ES2023         |
| Icons        | Expo Vector Icons         |
| Storage      | AsyncStorage              |
| Camera       | Expo Image Picker         |
| Biometrics   | Expo Local Authentication |
| File System  | Expo File System          |
| Printing     | Expo Print                |
| Sharing      | Expo Sharing              |
| Backend      | PHP 7.4+                  |
| API          | REST / JSON               |
| Database     | SQLite / MySQL            |
| Build        | Expo EAS                  |

---

# 📁 Project Structure

```text
Nibit-Inventory-App/
│
├── App.js
├── app.json
├── eas.json
├── index.js
├── package.json
│
├── assets/
│   ├── icon.png
│   ├── splash-icon.png
│   └── favicon.png
│
├── api/
│   ├── api.php
│   ├── auth.php
│   ├── items.php
│   ├── categories.php
│   ├── transactions.php
│   ├── stats.php
│   ├── users.php
│   └── db.php
│
└── src/
    │
    ├── components/
    │   ├── LoginScreen.js
    │   ├── PinLockScreen.js
    │   ├── Header.js
    │   ├── HomeView.js
    │   ├── InventoryItemCard.js
    │   ├── ItemModal.js
    │   ├── StockAdjustmentModal.js
    │   ├── StatsOverview.js
    │   ├── PosView.js
    │   ├── FinanceView.js
    │   ├── AnalyticsView.js
    │   ├── AccountView.js
    │   ├── TransactionsList.js
    │   ├── BarcodeScannerModal.js
    │   └── SettingsModal.js
    │
    ├── services/
    │   ├── apiService.js
    │   └── sessionService.js
    │
    └── data/
        └── initialData.js
```

---

# ⚡ Installation

## 1️⃣ Clone

```bash
git clone https://github.com/Nikhilkolasani007/Nibit-Inventory-App.git
```

```bash
cd Nibit-Inventory-App
```

---

## 2️⃣ Install dependencies

```bash
npm install
```

---

## 3️⃣ Start Expo

```bash
npm start
```

Then choose:

```text
a → Android
i → iOS
w → Web
```

For physical Android devices, scan the Expo QR code using **Expo Go**.

---

# 🌐 PHP Backend

The application communicates with a PHP REST API.

### Start locally

```bash
php -S localhost:8000 -t api/
```

Or deploy the `api/` directory to your PHP hosting environment.

### Backend structure

```text
api/
├── api.php
├── auth.php
├── items.php
├── categories.php
├── transactions.php
├── stats.php
├── users.php
└── db.php
```

---

# 🔌 API

## Authentication

### Admin Login

```http
POST /api.php
```

```json
{
  "email": "user@example.com",
  "password": "password",
  "website": "https://example.com"
}
```

### Employee Login

```http
POST /auth.php
```

```json
{
  "action": "emp_login",
  "empid": "EMP001",
  "code": "1234"
}
```

---

## Inventory

### Get Products

```http
GET /items.php
```

### Search

```http
GET /items.php?search=phone
```

### Category Filter

```http
GET /items.php?category=Mobile
```

### Low Stock

```http
GET /items.php?filter=low_stock
```

### Create Product

```http
POST /items.php
```

### Update Product

```http
POST /items.php
```

```json
{
  "action": "update"
}
```

### Delete Product

```http
DELETE /items.php?id=1
```

---

# 🗄️ Database

Nibit Inventory supports:

### SQLite

Default configuration:

```text
SQLite
↓
Zero external database configuration
↓
Suitable for local/demo environments
```

### MySQL

For production environments:

```env
DB_TYPE=mysql
DB_HOST=127.0.0.1
DB_NAME=inventory_db
DB_USER=root
DB_PASS=your_password
```

> ⚠️ Never commit real database passwords or API secrets to GitHub.

---

# 📦 Build Android APK

Nibit Inventory uses **Expo Application Services (EAS)**.

### Preview APK

```bash
npx eas-cli@latest build --platform android --profile preview
```

### Development Build

```bash
npx eas-cli@latest build --platform android --profile development
```

### Production Build

```bash
npx eas-cli@latest build --platform android --profile production
```

---

# 📱 Latest Build

### Android APK

The project currently has an EAS build available:

**Build ID:** `dfe1bc06`

👉 [Open Android Build on Expo](https://expo.dev/accounts/nikhil_kolasani/projects/inventory-app/builds/dfe1bc06-68ba-46fc-a0a8-813340d80d16)

---

# 🔄 Development Workflow

```text
Write Code
    ↓
Test with Expo
    ↓
Test API
    ↓
Commit Changes
    ↓
Push to GitHub
    ↓
EAS Build
    ↓
Android APK
```

### Git commands

```bash
git add .
git commit -m "Update inventory app"
git push
```

---

# 🔒 Security

Before deploying to production:

* Use HTTPS
* Never commit passwords
* Never commit API keys
* Use environment variables
* Protect database credentials
* Validate API requests
* Implement proper authentication
* Configure CORS correctly

---

# 🧪 Current Capabilities

| Feature           | Status |
| ----------------- | :----: |
| Authentication    |    ✅   |
| PIN Lock          |    ✅   |
| Biometric Unlock  |    ✅   |
| Inventory CRUD    |    ✅   |
| IMEI Tracking     |    ✅   |
| Stock Adjustment  |    ✅   |
| POS               |    ✅   |
| Finance           |    ✅   |
| Analytics         |    ✅   |
| Invoices          |    ✅   |
| Product Images    |    ✅   |
| Recycle Bin       |    ✅   |
| PHP REST API      |    ✅   |
| SQLite            |    ✅   |
| MySQL Support     |    ✅   |
| EAS Android Build |    ✅   |

---

# 🗺️ Roadmap

Future improvements can include:

* [ ] Push notifications
* [ ] Cloud backup
* [ ] Multi-shop support
* [ ] Advanced employee permissions
* [ ] Barcode hardware integration
* [ ] Supplier management
* [ ] Customer management
* [ ] Advanced financial reports
* [ ] Automated database backups
* [ ] Google Play Store release

---

# 🤝 Contributing

Contributions are welcome.

```text
Fork
 ↓
Create Branch
 ↓
Make Changes
 ↓
Commit
 ↓
Push
 ↓
Pull Request
```

Example:

```bash
git checkout -b feature/new-feature
git add .
git commit -m "Add new feature"
git push origin feature/new-feature
```

Then open a Pull Request.

---

# 📄 License

This project is licensed under the **MIT License**.

See [`LICENSE`](LICENSE) for details.

---

# 👨‍💻 Author

**Nikhil Kolasani**

📧 `kolasaninikhil1@gmail.com`

🔗 GitHub:
https://github.com/Nikhilkolasani007

---

<p align="center">

### 📦 Nibit Inventory

**Manage Stock. Track Sales. Understand Your Business.**

Built with ❤️ using Expo React Native + PHP

</p>
