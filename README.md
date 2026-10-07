# 📦 Inventory App

> A modern, full-featured Inventory Management mobile application built with **Expo React Native** and a **PHP REST API** backend — designed for mobile phone & electronics shops.

---

## ✨ Features at a Glance

| Module | Highlights |
|---|---|
| 🔐 **Auth & Security** | Email/password login · Employee ID login · PIN lock screen · Biometric unlock |
| 🏠 **Home Dashboard** | Real-time stock summary · Low stock alerts · Recent activity feed |
| 📦 **Inventory** | Full product catalog · IMEI tracking · First Hand / Second Hand condition tagging · Search by name, SKU, IMEI, distributor, seller |
| 🛒 **POS / Sales** | Point-of-sale screen · Record sales · Auto stock deduction |
| 💰 **Finance** | Profit & loss summary · Transaction history · Analytics |
| 📊 **Analytics** | Category-wise distribution · Stock valuation · Estimated margin |
| ⚙️ **Account & Settings** | PIN change · Server URL config · Logout · App lock |
| 🌐 **Backend Sync** | Live PHP REST API sync with offline-first fallback |
| 📷 **Image Upload** | Product photo upload via camera or gallery |
| 🧾 **Invoices** | Create, view, and delete invoices |
| 🗑️ **Recycle Bin** | Restore or permanently delete removed items |

---

## 🏛️ Architecture

```
┌────────────────────────────────────────┐
│     Mobile App (Expo / React Native)   │
│                                        │
│  LoginScreen → PinLockScreen → App     │
│  ┌─────────┬──────────┬──────┬──────┐  │
│  │  Home   │Inventory │ POS  │Finance│  │
│  └─────────┴──────────┴──────┴──────┘  │
└────────────────┬───────────────────────┘
                 │ HTTPS / JSON REST API
                 ▼
┌────────────────────────────────────────┐
│         PHP REST API Backend           │
│  api.php · items.php · auth.php        │
│  transactions.php · stats.php · etc.   │
└────────────────┬───────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────┐
│     Database (SQLite or MySQL)         │
└────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Expo CLI](https://docs.expo.dev/get-started/installation/) — `npm install -g expo-cli`
- A PHP server (XAMPP, Laragon, or any host with PHP 7.4+)
- Android device or emulator (or iOS on Mac)

---

### Step 1 — Clone the Repository

```bash
git clone https://github.com/your-username/inventory-app.git
cd inventory-app
```

---

### Step 2 — Install Dependencies

```bash
npm install
```

---

### Step 3 — Start the PHP Backend

Open a terminal in the project root and run the PHP built-in server:

```bash
php -S localhost:8000 -t api/
```

> **Using XAMPP?** Copy the `api/` folder into your XAMPP `htdocs/` directory and start Apache.

The backend will automatically create the SQLite database and seed initial tables (`items`, `categories`, `transactions`, `users`) on the very first request.

---

### Step 4 — Start the Expo App

Open a second terminal:

```bash
npm start
```

Then press:
- **`a`** — open on Android emulator / device
- **`i`** — open on iOS simulator (Mac only)
- **`w`** — open in web browser

> **On a physical Android device?** Scan the QR code with the **Expo Go** app ([Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)).

---

## 📱 App Screens & Usage

### 🔐 Login Screen
Enter your **Email**, **Password**, and optionally your **Shop Website URL** to connect to your PHP backend. Supports both:
- **Admin Login** — Email + Password
- **Employee Login** — Employee ID + 4-digit code

### 🔒 PIN Lock Screen
After login, your session is saved locally. On the next app launch, you will be prompted with a UPI-style **4-digit PIN lock screen** instead of the full login flow. Supports **biometric (fingerprint/face)** unlock if available on the device.

### 🏠 Home Tab
- Overview cards: Total Items, Total Value, Low Stock Count, Out of Stock Count.
- Quick links to navigate to Inventory, POS, and Finance tabs.
- Recent transaction activity feed.

### 📦 Inventory Tab
The core product catalog. Features:
- **Search** by product name, SKU, IMEI, distributor, seller name, seller phone, or date.
- **Category filter pills** — tap a category to filter by it.
- **Condition filter** — toggle between `All Conditions`, `First Hand`, `Second Hand`.
- **Stock status filter** — view All, Low Stock, or Out of Stock items.
- **Quick +/- steppers** on each item card for rapid stock in/out.
- **Advanced Stock Modal** — enter a specific quantity with a reason (Stock In, Stock Out, Adjustment).
- **Edit Product** — tap the edit icon on any card to update product details.
- **Delete Product** — tap the delete icon with confirmation dialog.

#### Adding a Product
Tap **`+ Add`** in the header. Fill in:

| Field | Description |
|---|---|
| Name | Product name |
| SKU | Unique Stock Keeping Unit code |
| IMEI | Device IMEI (for unique mobile unit tracking) |
| Category | Mobile / Accessories / Other Products |
| Condition | First Hand / Second Hand |
| Quantity | Current stock count |
| Cost Price | Purchase / buying price |
| Selling Price | Retail sale price |
| Min Stock Threshold | Alert trigger level |
| Distributor / Supplier | Supplier name |
| Seller Name & Phone | Second-hand seller contact info |
| Location | Warehouse / shelf location |
| Photo | Upload product photo from camera or gallery |

> ⚠️ **IMEI-tracked devices** cannot be Quick Stock In'd to prevent duplicate IMEI conflicts. Add each new unit separately via the `+ Add` button with its own unique IMEI.

### 🛒 POS / Sales Tab
A Point-of-Sale screen to process sales:
- Browse available inventory.
- Select item and enter quantity sold.
- Record customer name and sale details.
- Stock is automatically deducted on confirmation.
- Sale is logged in the transaction history.

### 💰 Finance Tab
- Full **transaction history** (Stock In / Stock Out / Sales / Adjustments).
- Profit & Loss calculations based on cost vs. selling price.
- Summary analytics with charts.

### ⚙️ Account Tab
- View and edit your account profile.
- **Change PIN** — update your 4-digit app lock PIN.
- **Lock App** — immediately lock to the PIN screen.
- **Logout** — clears the stored session and returns to the Login screen.

---

## 🔌 PHP REST API Reference

All endpoints are served from `api/api.php` (or individual `.php` files).

### Authentication

| Method | Endpoint | Body | Description |
|---|---|---|---|
| `POST` | `/api.php` | `{ email, password, website }` | Admin login |
| `POST` | `/auth.php` | `{ email, password, website }` | Admin login (alternate) |
| `POST` | `/auth.php` | `{ action: "emp_login", empid, code }` | Employee login |

### Inventory Items

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/items.php` | List all items |
| `GET` | `/items.php?search=phone` | Search items |
| `GET` | `/items.php?category=Mobile` | Filter by category |
| `GET` | `/items.php?filter=low_stock` | Filter low stock items |
| `GET` | `/items.php?filter=out_of_stock` | Filter out-of-stock items |
| `POST` | `/items.php` | Create a new item |
| `POST` | `/items.php` | `{ action: "update", ...itemData }` — Update item |
| `POST` | `/items.php` | `{ action: "adjust_stock", item_id, change, reason }` — Adjust stock |
| `DELETE` | `/items.php?id={id}` | Delete an item (moves to Recycle Bin) |

### Categories & Stats

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/categories.php` | List all categories |
| `GET` | `/stats.php` | Dashboard summary stats + low stock alerts |

### Transactions

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api.php?action=transactions&limit=50` | Get recent transaction logs |
| `POST` | `/api.php?action=delete_transaction` | Delete a transaction |

### Invoices

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api.php?action=get_invoices` | List all invoices |
| `POST` | `/api.php?action=create_invoice` | Create new invoice |
| `POST` | `/api.php?action=delete_invoice` | Delete an invoice |

### Recycle Bin

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api.php?action=get_bin` | List deleted items in bin |
| `POST` | `/api.php?action=restore_from_bin` | Restore item from bin |
| `POST` | `/api.php?action=delete_bin_item` | Permanently delete from bin |
| `POST` | `/api.php?action=empty_bin` | Empty the entire bin |

### Image Upload

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api.php?action=upload_image` | Upload product image (multipart or Base64) |

---

## 🗄️ Database Configuration

By default the backend uses **SQLite** (`api/inventory.sqlite`) — zero configuration needed, works out of the box.

### Switch to MySQL

Set the following environment variables before starting the PHP server:

```bash
DB_TYPE=mysql
DB_HOST=127.0.0.1
DB_NAME=inventory_db
DB_USER=root
DB_PASS=your_password
```

Or edit `api/db.php` directly and set the `$DB_TYPE` constant.

---

## 🏗️ Project Structure

```
inventory-app/
├── App.js                      # Root component — Auth, navigation, state
├── app.json                    # Expo app configuration (icons, splash, bundle IDs)
├── eas.json                    # EAS Build profiles (development, preview, production)
├── index.js                    # Expo entry point
│
├── assets/                     # App icons, splash screens, logos
│   ├── icon.png
│   ├── splash-icon.png
│   └── favicon.png
│
├── api/                        # PHP REST API backend
│   ├── api.php                 # Main unified API handler
│   ├── auth.php                # Login & authentication
│   ├── items.php               # CRUD for inventory items
│   ├── categories.php          # Category management
│   ├── transactions.php        # Stock movement logs
│   ├── stats.php               # Dashboard statistics
│   ├── users.php               # User management
│   ├── db.php                  # Database connection (SQLite / MySQL)
│   └── inventory.sqlite        # Default SQLite database file
│
└── src/
    ├── components/
    │   ├── LoginScreen.js          # Email + Employee login screen
    │   ├── PinLockScreen.js        # PIN / biometric lock screen
    │   ├── Header.js               # Top bar with search + add button
    │   ├── HomeView.js             # Home dashboard tab
    │   ├── InventoryItemCard.js    # Product card with quick stock steppers
    │   ├── ItemModal.js            # Add / Edit product form modal
    │   ├── StockAdjustmentModal.js # Advanced stock in/out modal
    │   ├── StatsOverview.js        # Summary metric cards
    │   ├── PosView.js              # Point-of-Sale screen
    │   ├── FinanceView.js          # Finance & analytics tab
    │   ├── AnalyticsView.js        # Charts and breakdown view
    │   ├── AccountView.js          # Account settings tab
    │   ├── TransactionsList.js     # Movement history list
    │   ├── BarcodeScannerModal.js  # Camera-based barcode/SKU scanner
    │   └── SettingsModal.js        # Server URL & PIN settings
    │
    ├── services/
    │   ├── apiService.js           # All HTTP calls to the PHP backend
    │   └── sessionService.js       # Persistent login session via AsyncStorage
    │
    └── data/
        └── initialData.js          # Seed data for offline / demo mode
```

---

## 📦 Building the App

Builds are managed through **EAS Build** (Expo Application Services).

### Development Build (for testing with native modules)

```bash
npx eas-cli@latest build --platform android --profile development
```

### Preview / Internal Testing APK

```bash
npx eas-cli@latest build --platform android --profile preview
```

### Production Build (for Google Play Store)

```bash
npx eas-cli@latest build --platform android --profile production
```

After the build finishes, download the `.apk` from the EAS dashboard link provided in the terminal and install it on your device.

---

## 🔑 Default Demo Credentials

If the PHP backend is unreachable, the app falls back to local demo mode:

| Role | Email | Password |
|---|---|---|
| Admin | `shouky@gmail.com` | `9441166030@Nk` |
| Admin | `kolasaninikhil1@gmail.com` | `9441166030@Nk` |

> Default PIN lock code: **`1234`**

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Mobile Framework | [Expo SDK 57](https://docs.expo.dev/) + React Native 0.86 |
| Language | JavaScript (ES2023) |
| Icons | [@expo/vector-icons](https://docs.expo.dev/guides/icons/) (Ionicons) |
| Local Storage | [AsyncStorage](https://docs.expo.dev/versions/latest/sdk/async-storage/) |
| Camera / Gallery | [expo-image-picker](https://docs.expo.dev/versions/latest/sdk/imagepicker/) |
| Biometrics | [expo-local-authentication](https://docs.expo.dev/versions/latest/sdk/local-authentication/) |
| File Upload | [expo-file-system](https://docs.expo.dev/versions/latest/sdk/filesystem/) |
| Printing / Export | [expo-print](https://docs.expo.dev/versions/latest/sdk/print/) + [expo-sharing](https://docs.expo.dev/versions/latest/sdk/sharing/) |
| Backend | PHP 7.4+ REST API |
| Database | SQLite (default) / MySQL (configurable) |
| Cloud Builds | [EAS Build](https://docs.expo.dev/build/introduction/) |

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 👤 Author

**Nikhil Kolasani**
📧 kolasaninikhil1@gmail.com

---

> Built with ❤️ for small businesses managing mobile phone and electronics inventory.
