// src/components/PosView.js - POS Billing, Customer Invoices & Live IMEI Scanner
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  ActivityIndicator,
  Share,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import BarcodeScannerModal from './BarcodeScannerModal';
import apiService, { getImageUrl } from '../services/apiService';

export default function PosView({ items, onRecordSale, user }) {
  const [activeSubTab, setActiveSubTab] = useState('register'); // 'register' | 'invoices' | 'trash'

  // POS State
  const [selectedItem, setSelectedItem] = useState(null);
  const [sellingPrice, setSellingPrice] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash'); // Cash, UPI, Card
  const [searchQuery, setSearchQuery] = useState('');
  const [processing, setProcessing] = useState(false);

  // Scanner State
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Invoices Tab State
  const [invoices, setInvoices] = useState([]);
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Recycle Bin Tab State
  const [binItems, setBinItems] = useState([]);
  const [loadingBin, setLoadingBin] = useState(false);
  const [binFilter, setBinFilter] = useState('all'); // 'all' | 'invoice' | 'transaction'

  const loadInvoices = async (search = '') => {
    setLoadingInvoices(true);
    try {
      const data = await apiService.fetchInvoices(search);
      setInvoices(data || []);
    } catch (err) {
      console.warn('Could not load invoices:', err.message);
    } finally {
      setLoadingInvoices(false);
    }
  };

  const loadBin = async () => {
    setLoadingBin(true);
    try {
      const data = await apiService.fetchBin();
      setBinItems(data || []);
    } catch (err) {
      console.warn('Could not load bin:', err.message);
    } finally {
      setLoadingBin(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'invoices') {
      loadInvoices();
    } else if (activeSubTab === 'trash') {
      loadBin();
    }
  }, [activeSubTab]);

  const handleRestoreBinItem = async (binItem) => {
    Alert.alert(
      'Restore Record',
      `Restore "${binItem.title}" back to active ${binItem.record_type}s?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          onPress: async () => {
            try {
              await apiService.restoreFromBin(binItem.id);
              Alert.alert('Restored! ♻️', `${binItem.title} restored successfully.`);
              loadBin();
              loadInvoices();
            } catch (err) {
              Alert.alert('Restore Failed', err.message || 'Could not restore record.');
            }
          }
        }
      ]
    );
  };

  const handleDeleteBinItem = async (binItem) => {
    Alert.alert(
      'Delete Permanently',
      `Permanently delete "${binItem.title}" from Recycle Bin? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.deleteFromBin(binItem.id);
              loadBin();
            } catch (err) {
              Alert.alert('Delete Failed', err.message || 'Could not delete item.');
            }
          }
        }
      ]
    );
  };

  const handleEmptyBin = async () => {
    if (binItems.length === 0) return;
    Alert.alert(
      'Empty Recycle Bin',
      `Permanently delete all ${binItems.length} records in the Recycle Bin?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Empty Bin',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.emptyBin();
              Alert.alert('Emptied! 🗑️', 'Recycle bin cleared completely.');
              loadBin();
            } catch (err) {
              Alert.alert('Error', err.message || 'Could not empty bin.');
            }
          }
        }
      ]
    );
  };

  const handleDeleteInvoice = async (inv) => {
    Alert.alert(
      'Move to Recycle Bin',
      `Move invoice ${inv.invoice_no} (${inv.item_name}) to Recycle Bin? You can restore it anytime.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Move to Bin',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.deleteInvoice(inv.id);
              Alert.alert('Moved to Bin 🗑️', `Invoice ${inv.invoice_no} moved to Recycle Bin.`);
              loadInvoices();
              loadBin();
            } catch (err) {
              Alert.alert('Delete Failed', err.message || 'Could not delete invoice.');
            }
          }
        }
      ]
    );
  };

  const handleSearchInvoices = (text) => {
    setInvoiceSearch(text);
    loadInvoices(text);
  };

  // When an item is picked, prepopulate selling price if exists
  const handleSelectItem = (it) => {
    setSelectedItem(it);
    if (it.selling_price && parseFloat(it.selling_price) > 0) {
      setSellingPrice(String(it.selling_price));
    } else {
      setSellingPrice('');
    }
  };

  // Filter catalog by Name, SKU, or IMEI — ONLY in-stock items (qty > 0)
  const filteredCatalog = React.useMemo(() => {
    const seen = new Set();
    return items.filter((it) => {
      const qty = parseInt(it.quantity, 10) || 0;
      if (qty <= 0) return false; // Strictly show ONLY in-stock products
      const key = it.id ? String(it.id) : (it.imei || it.sku);
      if (key && seen.has(key)) return false; // Prevent duplicate entries in catalog
      if (key) seen.add(key);

      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        it.name?.toLowerCase().includes(q) ||
        it.sku?.toLowerCase().includes(q) ||
        it.imei?.toLowerCase().includes(q) ||
        it.category?.toLowerCase().includes(q)
      );
    });
  }, [items, searchQuery]);

  // Handle scanned IMEI
  const handleScannedBarcode = (code) => {
    const clean = code.trim().toLowerCase();
    const match = items.find(
      (it) =>
        (parseInt(it.quantity, 10) || 0) > 0 &&
        ((it.imei && it.imei.toLowerCase() === clean) ||
        (it.sku && it.sku.toLowerCase() === clean) ||
        (it.barcode && it.barcode.toLowerCase() === clean))
    );
    if (match) {
      handleSelectItem(match);
      Alert.alert('Item Found! 🎯', `Selected ${match.name} (IMEI: ${match.imei || match.sku})`);
    } else {
      const outOfStock = items.find(
        (it) =>
          ((it.imei && it.imei.toLowerCase() === clean) ||
          (it.sku && it.sku.toLowerCase() === clean) ||
          (it.barcode && it.barcode.toLowerCase() === clean))
      );
      if (outOfStock) {
        Alert.alert('Out of Stock', `${outOfStock.name} (IMEI: ${code}) is currently out of stock (0 units).`);
      } else {
        setSearchQuery(code);
        Alert.alert('Scan Result', `Scanned code: ${code}. Filter applied.`);
      }
    }
  };

  // Generate HTML for professional PDF invoice
  const generateInvoiceHtml = (inv) => {
    const shop = user?.shop_name || 'SHOUKY MOBILES';
    const sell = parseFloat(inv.selling_price || 0);
    const invNo = inv.invoice_no || `INV-${Date.now()}`;
    const invDate = inv.invoice_date || new Date().toLocaleString();
    const customer = inv.customer_name || 'Valued Customer';
    const phone = inv.customer_phone || 'N/A';
    const email = inv.customer_email || 'N/A';
    const address = inv.customer_address || 'N/A';
    const item = inv.item_name || 'Device';
    const category = inv.category || 'Mobile';
    const itemType = inv.item_type || 'First Hand';
    const imei = inv.imei ? inv.imei : 'N/A (Bulk Stock Item)';
    const payment = inv.payment_mode || 'Cash';
    const createdBy = inv.created_by || user?.name || 'Staff';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice ${invNo}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 32px;
      color: #0F172A;
      background-color: #FFFFFF;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0F172A;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .shop-title {
      font-size: 26px;
      font-weight: 900;
      letter-spacing: -0.5px;
      margin: 0;
      color: #0F172A;
    }
    .shop-sub {
      font-size: 11px;
      color: #64748B;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-top: 4px;
    }
    .invoice-tag {
      text-align: right;
    }
    .inv-title {
      font-size: 20px;
      font-weight: 800;
      color: #0F766E;
      margin: 0;
    }
    .inv-num {
      font-size: 13px;
      font-weight: 700;
      color: #0F172A;
      margin-top: 4px;
    }
    .inv-date {
      font-size: 12px;
      color: #64748B;
      margin-top: 2px;
    }
    .grid-2 {
      display: flex;
      justify-content: space-between;
      gap: 20px;
      margin-bottom: 24px;
    }
    .card-box {
      flex: 1;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 10px;
      padding: 14px 16px;
    }
    .box-title {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #64748B;
      margin-bottom: 8px;
    }
    .box-name {
      font-size: 15px;
      font-weight: 700;
      color: #0F172A;
      margin-bottom: 4px;
    }
    .box-line {
      font-size: 12px;
      color: #475569;
      margin-top: 2px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th {
      background: #0F172A;
      color: #FFFFFF;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      padding: 10px 14px;
      text-align: left;
    }
    td {
      padding: 14px;
      border-bottom: 1px solid #E2E8F0;
      font-size: 13px;
    }
    .badge-pill {
      display: inline-block;
      background: #EEF2FF;
      color: #4338CA;
      font-size: 10px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 4px;
    }
    .summary-section {
      display: flex;
      justify-content: flex-end;
      margin-top: 16px;
    }
    .summary-box {
      width: 280px;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 10px;
      padding: 16px;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      margin-bottom: 8px;
      color: #475569;
    }
    .summary-total {
      display: flex;
      justify-content: space-between;
      border-top: 2px solid #CBD5E1;
      padding-top: 10px;
      margin-top: 6px;
      font-size: 17px;
      font-weight: 800;
      color: #0F172A;
    }
    .footer-note {
      margin-top: 36px;
      padding-top: 16px;
      border-top: 1px dashed #CBD5E1;
      text-align: center;
      font-size: 11px;
      color: #94A3B8;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="shop-title">${shop}</div>
      <div class="shop-sub">Official Retail Store & Mobile Electronics</div>
    </div>
    <div class="invoice-tag">
      <div class="inv-title">TAX INVOICE</div>
      <div class="inv-num">${invNo}</div>
      <div class="inv-date">${invDate}</div>
    </div>
  </div>

  ${(inv.item_type === 'Second Hand' || inv.seller_name) ? `
  <div class="grid-2">
    <div class="card-box" style="border-left: 4px solid #059669;">
      <div class="box-title" style="color: #059669;">Buyer Customer Details (Sold To)</div>
      <div class="box-name">${customer}</div>
      <div class="box-line"><strong>Phone:</strong> ${phone}</div>
      ${email !== 'N/A' ? `<div class="box-line"><strong>Email:</strong> ${email}</div>` : ''}
      ${address !== 'N/A' ? `<div class="box-line"><strong>Address:</strong> ${address}</div>` : ''}
      <div class="box-line"><strong>Payment Mode:</strong> ${payment}</div>
    </div>
    <div class="card-box" style="border-left: 4px solid #D97706; background-color: #FFFBEB;">
      <div class="box-title" style="color: #B45309;">Seller Customer Details (Bought From - 2nd Hand)</div>
      <div class="box-name">${inv.seller_name || 'Individual Customer'}</div>
      <div class="box-line"><strong>Phone:</strong> ${inv.seller_phone || 'N/A'}</div>
      ${inv.seller_email ? `<div class="box-line"><strong>Email:</strong> ${inv.seller_email}</div>` : ''}
      ${inv.seller_address ? `<div class="box-line"><strong>Address:</strong> ${inv.seller_address}</div>` : ''}
      ${inv.condition_notes ? `<div class="box-line"><strong>Condition:</strong> ${inv.condition_notes}</div>` : ''}
      <div class="box-line" style="color: #B45309; font-weight: 700; margin-top: 4px;">Store Buy Price: Rs ${(parseFloat(inv.cost_price || 0)).toLocaleString('en-IN')}</div>
    </div>
  </div>
  ` : `
  <div class="grid-2">
    <div class="card-box">
      <div class="box-title">Billed To (Customer)</div>
      <div class="box-name">${customer}</div>
      <div class="box-line"><strong>Phone:</strong> ${phone}</div>
      ${email !== 'N/A' ? `<div class="box-line"><strong>Email:</strong> ${email}</div>` : ''}
      ${address !== 'N/A' ? `<div class="box-line"><strong>Address:</strong> ${address}</div>` : ''}
    </div>
    <div class="card-box">
      <div class="box-title">Payment & Sale Info</div>
      <div class="box-name">Payment: ${payment}</div>
      <div class="box-line"><strong>Status:</strong> Paid / Completed</div>
      <div class="box-line"><strong>Billed By:</strong> ${createdBy}</div>
      <div class="box-line"><strong>Store:</strong> ${shop}</div>
    </div>
  </div>
  `}

  <table>
    <thead>
      <tr>
        <th style="width: 45%;">Description / Model</th>
        <th>Category</th>
        <th>Condition</th>
        <th>IMEI / Serial</th>
        <th style="text-align: right;">Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>${item}</strong></td>
        <td>${category}</td>
        <td><span class="badge-pill">${itemType}</span></td>
        <td style="font-family: monospace; font-size: 12px;">${imei}</td>
        <td style="text-align: right; font-weight: 700;">Rs ${sell.toLocaleString('en-IN')}</td>
      </tr>
    </tbody>
  </table>

  <div class="summary-section">
    <div class="summary-box">
      <div class="summary-row">
        <span>Subtotal</span>
        <span>Rs ${sell.toLocaleString('en-IN')}</span>
      </div>
      <div class="summary-row">
        <span>Taxes (Included)</span>
        <span>Rs 0.00</span>
      </div>
      <div class="summary-total">
        <span>Total Paid:</span>
        <span style="color: #059669;">Rs ${sell.toLocaleString('en-IN')}</span>
      </div>
    </div>
  </div>

  <div class="footer-note">
    Thank you for choosing ${shop}!<br>
    All device warranties are subject to store inspection. Keep this invoice safe for future warranty claims.<br>
    Computer generated official invoice • Valid without physical signature.
  </div>
</body>
</html>
    `;
  };

  // Direct Print via Native Print Dialog
  const handlePrintPdf = async (inv) => {
    try {
      const html = generateInvoiceHtml(inv);
      await Print.printAsync({ html });
    } catch (err) {
      console.warn('Print error, falling back to PDF share:', err);
      handleSharePdf(inv);
    }
  };

  // Generate PDF file & share/save
  const handleSharePdf = async (inv) => {
    try {
      const html = generateInvoiceHtml(inv);
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Invoice ${inv.invoice_no}`,
          UTI: 'com.adobe.pdf'
        });
      } else {
        Alert.alert('PDF Saved', `Invoice PDF saved at: ${uri}`);
      }
    } catch (err) {
      // Fallback to text share
      try {
        const fallbackText =
          `SHOUKY MOBILES - INVOICE\n` +
          `No: ${inv.invoice_no}\n` +
          `Date: ${inv.invoice_date}\n` +
          `Customer: ${inv.customer_name} (${inv.customer_phone})\n` +
          `Item: ${inv.item_name} ${inv.imei ? '(IMEI: ' + inv.imei + ')' : ''}\n` +
          `Amount: Rs ${parseFloat(inv.selling_price).toLocaleString('en-IN')}\n` +
          `Payment: ${inv.payment_mode || 'Cash'}`;
        await Share.share({ message: fallbackText });
      } catch (e) {
        Alert.alert('Error', err.message || 'Could not print or share invoice.');
      }
    }
  };

  // Complete Sale & Create Invoice
  const handleCompleteSale = async () => {
    if (!selectedItem) {
      Alert.alert('Select Product', 'Please choose a product to sell.');
      return;
    }
    const currentStock = parseInt(selectedItem.quantity, 10) || 0;
    if (currentStock <= 0) {
      Alert.alert('Out of Stock', 'This item has 0 units in stock.');
      return;
    }

    const priceNum = parseFloat(sellingPrice) || 0;
    if (priceNum <= 0) {
      Alert.alert('Selling Price Required', 'Please enter a valid selling price in Rs.');
      return;
    }

    if (!customerName.trim()) {
      Alert.alert('Customer Name Required', 'Please enter the customer name for the invoice.');
      return;
    }

    if (!customerPhone.trim()) {
      Alert.alert('Customer Phone Required', 'Please enter customer contact number.');
      return;
    }

    setProcessing(true);
    try {
      const invoiceData = {
        item_id: selectedItem.id,
        item_name: selectedItem.name,
        category: selectedItem.category || 'Mobile',
        item_type: selectedItem.item_type || 'First Hand',
        imei: selectedItem.imei || '',
        cost_price: parseFloat(selectedItem.cost_price) || 0.0,
        selling_price: priceNum,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        customer_email: customerEmail.trim(),
        customer_address: customerAddress.trim(),
        payment_mode: paymentMode,
        created_by: user?.name || user?.email || 'Admin',
        seller_name: selectedItem.seller_name || '',
        seller_phone: selectedItem.seller_phone || '',
        seller_email: selectedItem.seller_email || '',
        seller_address: selectedItem.seller_address || '',
        condition_notes: selectedItem.condition_notes || '',
      };

      const res = await apiService.createInvoice(invoiceData);

      // Decrement locally
      if (onRecordSale) {
        await onRecordSale(selectedItem, 1, res);
      }

      Alert.alert(
        'Invoice Created! 🧾',
        `Sold ${selectedItem.name} for Rs ${priceNum.toLocaleString('en-IN')}.\nInvoice #${res.invoice_no || 'Saved'}`
      );

      // Reset
      setSelectedItem(null);
      setSellingPrice('');
      setCustomerName('');
      setCustomerPhone('');
      setCustomerEmail('');
      setCustomerAddress('');
      setSearchQuery('');
    } catch (err) {
      Alert.alert('Sale Failed', err.message || 'Could not complete sale.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Tab Switcher: Register vs Invoices */}
      <View style={styles.topTabBar}>
        <TouchableOpacity
          style={[styles.topTabBtn, activeSubTab === 'register' && styles.topTabBtnActive]}
          onPress={() => setActiveSubTab('register')}
        >
          <Ionicons
            name="calculator"
            size={15}
            color={activeSubTab === 'register' ? '#FFFFFF' : '#64748B'}
          />
          <Text style={[styles.topTabBtnText, activeSubTab === 'register' && styles.topTabBtnTextActive]}>
            Register
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.topTabBtn, activeSubTab === 'invoices' && styles.topTabBtnActive]}
          onPress={() => setActiveSubTab('invoices')}
        >
          <Ionicons
            name="receipt"
            size={15}
            color={activeSubTab === 'invoices' ? '#FFFFFF' : '#64748B'}
          />
          <Text style={[styles.topTabBtnText, activeSubTab === 'invoices' && styles.topTabBtnTextActive]}>
            Invoices ({invoices.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.topTabBtn, activeSubTab === 'trash' && styles.topTabBtnActive]}
          onPress={() => setActiveSubTab('trash')}
        >
          <Ionicons
            name="trash"
            size={15}
            color={activeSubTab === 'trash' ? '#FFFFFF' : '#DC2626'}
          />
          <Text
            style={[
              styles.topTabBtnText,
              activeSubTab === 'trash' && styles.topTabBtnTextActive,
              activeSubTab !== 'trash' && { color: '#DC2626' }
            ]}
          >
            Bin {binItems.length > 0 ? `(${binItems.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {activeSubTab === 'register' ? (
        /* ================= REGISTER VIEW ================= */
        <View>
          {/* 1. Product Selection & Scanner */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>1. Select Device / Product</Text>
              <TouchableOpacity
                style={styles.scanLauncherBtn}
                onPress={() => setIsScannerOpen(true)}
              >
                <Ionicons name="barcode" size={16} color="#FFFFFF" />
                <Text style={styles.scanLauncherText}>Scan IMEI</Text>
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={styles.searchBox}>
              <Ionicons name="search" size={16} color="#94A3B8" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by Name, IMEI, or SKU..."
                placeholderTextColor="#64748B"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={16} color="#94A3B8" />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Catalog Horizontal Cards */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catalogScroll}>
              {filteredCatalog.slice(0, 15).map((it) => {
                const isSelected = selectedItem?.id === it.id;
                const stock = parseInt(it.quantity, 10) || 0;
                const itPhoto = getImageUrl(it.images);
                return (
                  <TouchableOpacity
                    key={it.id || it.sku}
                    style={[styles.itemPill, isSelected && styles.itemPillSelected]}
                    onPress={() => handleSelectItem(it)}
                  >
                    <View style={styles.itemPillRow}>
                      {itPhoto ? (
                        <Image source={{ uri: itPhoto }} style={styles.itemPillThumb} />
                      ) : (
                        <View style={styles.itemPillPlaceholder}>
                          <Ionicons
                            name={it.category === 'Mobile' ? 'phone-portrait-outline' : 'cube-outline'}
                            size={14}
                            color="#94A3B8"
                          />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.itemPillName, isSelected && styles.itemPillNameSelected]} numberOfLines={1}>
                          {it.name}
                        </Text>
                        <Text style={styles.itemPillSub}>
                          {it.category} • {it.item_type || 'First Hand'}
                        </Text>
                      </View>
                    </View>
                    {it.imei ? (
                      <Text style={styles.itemPillImei} numberOfLines={1}>
                        IMEI: {it.imei}
                      </Text>
                    ) : null}
                    <Text style={styles.itemPillPrice}>
                      {it.selling_price ? `Rs ${parseFloat(it.selling_price).toLocaleString('en-IN')}` : 'Decide price'}
                      {' '}• {stock} left
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Selected Item Summary */}
            {selectedItem && (
              <View style={styles.selectedBanner}>
                {selectedItem.images ? (
                  <Image
                    source={{ uri: getImageUrl(selectedItem.images) }}
                    style={styles.selectedItemPhoto}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.selectedItemPhotoPlaceholder}>
                    <Ionicons
                      name={selectedItem.category === 'Mobile' ? 'phone-portrait' : 'cube'}
                      size={22}
                      color="#94A3B8"
                    />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.selectedTitle}>{selectedItem.name}</Text>
                  <Text style={styles.selectedMeta}>
                    {selectedItem.category} • {selectedItem.item_type}
                    {selectedItem.imei ? ` • IMEI: ${selectedItem.imei}` : ''}
                  </Text>
                  <Text style={styles.selectedBuyPrice}>
                    Buy Price: Rs {(parseFloat(selectedItem.cost_price) || 0).toLocaleString('en-IN')}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedItem(null)} style={{ padding: 4 }}>
                  <Ionicons name="close-circle" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* 2. Selling Price & Payment */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>2. Selling Price &amp; Payment</Text>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Final Selling Price (Rs) *</Text>
              <TextInput
                style={[styles.input, { fontSize: 18, fontWeight: '800', color: '#34D399' }]}
                placeholder="Enter selling price in Rs"
                placeholderTextColor="#64748B"
                keyboardType="numeric"
                value={sellingPrice}
                onChangeText={setSellingPrice}
              />
              <Text style={styles.inputHint}>Decide or confirm customer sale price</Text>
            </View>

            {/* Payment Mode Pills */}
            <Text style={[styles.inputLabel, { marginTop: 6 }]}>Payment Mode</Text>
            <View style={styles.payModeRow}>
              {['Cash', 'UPI', 'Card', 'Net Banking'].map((mode) => {
                const isActive = paymentMode === mode;
                return (
                  <TouchableOpacity
                    key={mode}
                    style={[styles.payModeBtn, isActive && styles.payModeBtnActive]}
                    onPress={() => setPaymentMode(mode)}
                  >
                    <Ionicons
                      name={mode === 'Cash' ? 'cash-outline' : mode === 'UPI' ? 'phone-portrait-outline' : 'card-outline'}
                      size={14}
                      color={isActive ? '#FFFFFF' : '#94A3B8'}
                    />
                    <Text style={[styles.payModeText, isActive && styles.payModeTextActive]}>{mode}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* 3. Customer Information (Stored on Invoice) */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>3. Customer Details for Invoice</Text>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Customer Full Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Anand Kumar"
                placeholderTextColor="#64748B"
                value={customerName}
                onChangeText={setCustomerName}
              />
            </View>

            <View style={styles.twoColRow}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Mobile Phone *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 9845012345"
                  placeholderTextColor="#64748B"
                  keyboardType="phone-pad"
                  value={customerPhone}
                  onChangeText={setCustomerPhone}
                />
              </View>

              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. anand@gmail.com"
                  placeholderTextColor="#64748B"
                  keyboardType="email-address"
                  value={customerEmail}
                  onChangeText={setCustomerEmail}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Customer Address / City</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Market Road, Hyderabad"
                placeholderTextColor="#64748B"
                value={customerAddress}
                onChangeText={setCustomerAddress}
              />
            </View>
          </View>

          {/* Complete Sale Button */}
          <TouchableOpacity
            style={[styles.completeBtn, (!selectedItem || !sellingPrice || processing) && styles.completeBtnDisabled]}
            onPress={handleCompleteSale}
            disabled={!selectedItem || !sellingPrice || processing}
            activeOpacity={0.8}
          >
            {processing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="receipt-outline" size={20} color="#FFFFFF" />
                <Text style={styles.completeBtnText}>
                  Generate Invoice &amp; Complete Sale
                  {sellingPrice ? ` (Rs ${parseFloat(sellingPrice).toLocaleString('en-IN')})` : ''}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : activeSubTab === 'invoices' ? (
        /* ================= INVOICES VIEW ================= */
        <View>
          {/* Multi-Criteria Search Box */}
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by customer phone, name, email, IMEI, date..."
              placeholderTextColor="#64748B"
              value={invoiceSearch}
              onChangeText={handleSearchInvoices}
            />
            {invoiceSearch ? (
              <TouchableOpacity onPress={() => handleSearchInvoices('')}>
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            ) : null}
          </View>

          {loadingInvoices ? (
            <ActivityIndicator size="large" color="#0F172A" style={{ marginTop: 30 }} />
          ) : invoices.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="receipt-outline" size={48} color="#475569" />
              <Text style={styles.emptyTitle}>No Invoices Found</Text>
              <Text style={styles.emptySub}>
                {invoiceSearch
                  ? 'No customer sales matched your search term.'
                  : 'Complete a sale in the Billing Register to create your first customer invoice.'}
              </Text>
            </View>
          ) : (
            invoices.map((inv) => {
              const isSecondHand = inv.item_type === 'Second Hand' || !!inv.seller_name;
              return (
                <TouchableOpacity
                  key={inv.id || inv.invoice_no}
                  style={styles.invoiceCard}
                  onPress={() => setSelectedInvoice(inv)}
                  activeOpacity={0.8}
                >
                  <View style={styles.invoiceHeader}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.invNo}>{inv.invoice_no}</Text>
                        {isSecondHand ? (
                          <View style={styles.secondHandMiniBadge}>
                            <Ionicons name="repeat" size={10} color="#B45309" />
                            <Text style={styles.secondHandMiniText}>2nd Hand</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.invDate}>{inv.invoice_date}</Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Text style={styles.invPrice}>
                        Rs {parseFloat(inv.selling_price).toLocaleString('en-IN')}
                      </Text>
                      <TouchableOpacity
                        onPress={() => handleDeleteInvoice(inv)}
                        style={styles.invDeleteBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="trash-outline" size={17} color="#DC2626" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <Text style={styles.invItemName}>{inv.item_name}</Text>

                  {/* Dual Customer Details for Second Hand Mobiles */}
                  {isSecondHand ? (
                    <View style={styles.dualCustomerRow}>
                      <View style={styles.customerPillBuyer}>
                        <Ionicons name="person" size={11} color="#059669" />
                        <Text style={styles.customerPillTextBuyer} numberOfLines={1}>
                          Buyer: {inv.customer_name} {inv.customer_phone ? `(${inv.customer_phone})` : ''}
                        </Text>
                      </View>
                      <View style={styles.customerPillSeller}>
                        <Ionicons name="repeat" size={11} color="#B45309" />
                        <Text style={styles.customerPillTextSeller} numberOfLines={1}>
                          Seller: {inv.seller_name || 'Customer'} {inv.seller_phone ? `(${inv.seller_phone})` : ''}
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.invDetailsRow}>
                      <View style={styles.invCustomerWrap}>
                        <Ionicons name="person" size={13} color="#94A3B8" />
                        <Text style={styles.invCustomerText}>
                          {inv.customer_name} {inv.customer_phone ? `(${inv.customer_phone})` : ''}
                        </Text>
                      </View>

                      <View style={styles.invBadge}>
                        <Text style={styles.invBadgeText}>{inv.payment_mode || 'Cash'}</Text>
                      </View>
                    </View>
                  )}

                  {inv.imei ? (
                    <View style={styles.invImeiWrap}>
                      <Ionicons name="barcode-outline" size={13} color="#0F766E" />
                      <Text style={styles.invImeiText}>IMEI: {inv.imei}</Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })
          )}
        </View>
      ) : (
        /* ================= RECYCLE BIN VIEW ================= */
        <View>
          <View style={styles.binHeaderRow}>
            <View>
              <Text style={styles.binTitle}>Recycle Bin (Trash)</Text>
              <Text style={styles.binSubtitle}>
                {binItems.length} Deleted {binItems.length === 1 ? 'Record' : 'Records'} Safely Stored
              </Text>
            </View>
            {binItems.length > 0 ? (
              <TouchableOpacity
                style={styles.emptyBinBtn}
                onPress={handleEmptyBin}
                activeOpacity={0.8}
              >
                <Ionicons name="trash" size={14} color="#DC2626" />
                <Text style={styles.emptyBinBtnText}>Empty Bin</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Filter Chips: All, Invoices, Transactions */}
          <View style={styles.binFilterRow}>
            {['all', 'invoice', 'transaction'].map((f) => {
              const count = f === 'all'
                ? binItems.length
                : binItems.filter((i) => i.record_type === f).length;
              return (
                <TouchableOpacity
                  key={f}
                  style={[styles.binFilterChip, binFilter === f && styles.binFilterChipActive]}
                  onPress={() => setBinFilter(f)}
                >
                  <Text style={[styles.binFilterChipText, binFilter === f && styles.binFilterChipTextActive]}>
                    {f === 'all' ? 'All Records' : f === 'invoice' ? 'Invoices' : 'Movements'} ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {loadingBin ? (
            <ActivityIndicator size="large" color="#0F172A" style={{ marginTop: 30 }} />
          ) : binItems.filter((i) => binFilter === 'all' || i.record_type === binFilter).length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="trash-outline" size={48} color="#94A3B8" />
              <Text style={styles.emptyTitle}>Recycle Bin is Empty</Text>
              <Text style={styles.emptySub}>
                When invoices or stock transactions are deleted, they will be preserved here so you can restore or permanently delete them at any time.
              </Text>
            </View>
          ) : (
            binItems
              .filter((i) => binFilter === 'all' || i.record_type === binFilter)
              .map((b) => {
                const isInv = b.record_type === 'invoice';
                const parsed = b.data_parsed || {};
                return (
                  <View key={b.id} style={styles.binCard}>
                    <View style={styles.binCardTop}>
                      <View style={[styles.binTypeBadge, isInv ? styles.binTypeInv : styles.binTypeTx]}>
                        <Ionicons
                          name={isInv ? 'receipt' : 'swap-horizontal'}
                          size={12}
                          color={isInv ? '#0F766E' : '#B45309'}
                        />
                        <Text style={[styles.binTypeBadgeText, isInv ? { color: '#0F766E' } : { color: '#B45309' }]}>
                          {isInv ? 'DELETED INVOICE' : 'DELETED TRANSACTION'}
                        </Text>
                      </View>
                      <Text style={styles.binAmountText}>
                        Rs {parseFloat(b.amount || 0).toLocaleString('en-IN')}
                      </Text>
                    </View>

                    <Text style={styles.binCardTitle}>{b.title}</Text>

                    <View style={styles.binMetaRow}>
                      <Text style={styles.binMetaText}>
                        Ref: {b.identifier || 'N/A'} • Deleted: {b.deleted_at ? new Date(b.deleted_at).toLocaleString() : 'Recent'}
                      </Text>
                    </View>

                    {/* Extra context if available */}
                    {isInv && parsed.customer_name ? (
                      <View style={styles.binDetailsBox}>
                        <Text style={styles.binDetailText}>
                          Buyer: <Text style={{ fontWeight: '700', color: '#0F172A' }}>{parsed.customer_name}</Text>
                          {parsed.customer_phone ? ` (${parsed.customer_phone})` : ''}
                        </Text>
                        {parsed.seller_name ? (
                          <Text style={[styles.binDetailText, { color: '#B45309', marginTop: 2 }]}>
                            Seller (2nd Hand): <Text style={{ fontWeight: '700' }}>{parsed.seller_name}</Text>
                            {parsed.seller_phone ? ` (${parsed.seller_phone})` : ''}
                          </Text>
                        ) : null}
                      </View>
                    ) : !isInv && parsed.type ? (
                      <View style={styles.binDetailsBox}>
                        <Text style={styles.binDetailText}>
                          Movement: <Text style={{ fontWeight: '700', color: '#0F172A' }}>{parsed.type} ({parsed.quantity} units)</Text>
                        </Text>
                        <Text style={styles.binDetailText}>
                          Reason: {parsed.reason || 'Manual Adjustment'}
                        </Text>
                      </View>
                    ) : null}

                    {/* Action Buttons: Restore & Delete Forever */}
                    <View style={styles.binActionsRow}>
                      <TouchableOpacity
                        style={styles.restoreBtn}
                        onPress={() => handleRestoreBinItem(b)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="refresh-circle" size={17} color="#FFFFFF" />
                        <Text style={styles.restoreBtnText}>Restore Record</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.deleteForeverBtn}
                        onPress={() => handleDeleteBinItem(b)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="trash-outline" size={15} color="#DC2626" />
                        <Text style={styles.deleteForeverBtnText}>Delete Forever</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
          )}
        </View>
      )}

      {/* Invoice Details Modal */}
      {selectedInvoice && (
        <Modal visible={true} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalTop}>
                <View>
                  <Text style={styles.modalTitle}>Tax Invoice / Bill</Text>
                  <Text style={styles.modalSub}>{selectedInvoice.invoice_no}</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedInvoice(null)}>
                  <Ionicons name="close" size={24} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 440 }} showsVerticalScrollIndicator={false}>
                {/* Second Hand Dual Customer Details (Seller Customer & Buyer Customer) */}
                {selectedInvoice.item_type === 'Second Hand' || selectedInvoice.seller_name ? (
                  <View style={styles.dualCustomerContainer}>
                    {/* Buyer Customer */}
                    <View style={styles.buyerCard}>
                      <View style={styles.customerCardHeader}>
                        <Ionicons name="person" size={15} color="#059669" />
                        <Text style={styles.buyerCardTitle}>Buyer Customer (Sold To)</Text>
                      </View>
                      <Text style={styles.customerNameMain}>{selectedInvoice.customer_name}</Text>
                      <Text style={styles.customerContactLine}>📞 {selectedInvoice.customer_phone}</Text>
                      {selectedInvoice.customer_email ? (
                        <Text style={styles.customerContactLine}>✉️ {selectedInvoice.customer_email}</Text>
                      ) : null}
                      {selectedInvoice.customer_address ? (
                        <Text style={styles.customerContactLine}>📍 {selectedInvoice.customer_address}</Text>
                      ) : null}
                      <View style={styles.priceTagBuyer}>
                        <Text style={styles.priceTagLabel}>Selling Price:</Text>
                        <Text style={styles.priceTagValBuyer}>
                          Rs {parseFloat(selectedInvoice.selling_price).toLocaleString('en-IN')}
                        </Text>
                      </View>
                    </View>

                    {/* Seller Customer */}
                    <View style={styles.sellerCard}>
                      <View style={styles.customerCardHeader}>
                        <Ionicons name="repeat" size={15} color="#B45309" />
                        <Text style={styles.sellerCardTitle}>Seller Customer (Purchased From)</Text>
                      </View>
                      <Text style={styles.customerNameMain}>{selectedInvoice.seller_name || 'Individual Customer'}</Text>
                      <Text style={styles.customerContactLine}>📞 {selectedInvoice.seller_phone || 'N/A'}</Text>
                      {selectedInvoice.seller_email ? (
                        <Text style={styles.customerContactLine}>✉️ {selectedInvoice.seller_email}</Text>
                      ) : null}
                      {selectedInvoice.seller_address ? (
                        <Text style={styles.customerContactLine}>📍 {selectedInvoice.seller_address}</Text>
                      ) : null}
                      {selectedInvoice.condition_notes ? (
                        <Text style={styles.customerContactLine}>📝 Condition: {selectedInvoice.condition_notes}</Text>
                      ) : null}
                      <View style={styles.priceTagSeller}>
                        <Text style={styles.priceTagLabel}>Store Buy Price:</Text>
                        <Text style={styles.priceTagValSeller}>
                          Rs {parseFloat(selectedInvoice.cost_price || 0).toLocaleString('en-IN')}
                        </Text>
                      </View>
                    </View>

                    {/* Store Profit Margin */}
                    <View style={styles.marginBanner}>
                      <Ionicons name="trending-up" size={16} color="#059669" />
                      <Text style={styles.marginBannerText}>
                        Store Margin:{' '}
                        <Text style={{ fontWeight: '800', color: '#059669' }}>
                          Rs {(parseFloat(selectedInvoice.selling_price) - parseFloat(selectedInvoice.cost_price || 0)).toLocaleString('en-IN')}
                        </Text>
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.invMetaGrid}>
                    <View style={styles.invMetaBox}>
                      <Text style={styles.invMetaLabel}>CUSTOMER</Text>
                      <Text style={styles.invMetaVal}>{selectedInvoice.customer_name}</Text>
                      <Text style={styles.invMetaSub}>{selectedInvoice.customer_phone}</Text>
                      {selectedInvoice.customer_email ? (
                        <Text style={styles.invMetaSub}>{selectedInvoice.customer_email}</Text>
                      ) : null}
                      {selectedInvoice.customer_address ? (
                        <Text style={styles.invMetaSub}>{selectedInvoice.customer_address}</Text>
                      ) : null}
                    </View>

                    <View style={styles.invMetaBox}>
                      <Text style={styles.invMetaLabel}>DATE &amp; TIME</Text>
                      <Text style={styles.invMetaVal}>{selectedInvoice.invoice_date}</Text>
                      <Text style={styles.invMetaSub}>Mode: {selectedInvoice.payment_mode}</Text>
                    </View>
                  </View>
                )}

                <View style={styles.invItemBox}>
                  <Text style={styles.invMetaLabel}>ITEM SOLD</Text>
                  <Text style={styles.invItemNameBig}>{selectedInvoice.item_name}</Text>
                  <Text style={styles.invMetaSub}>
                    {selectedInvoice.category} • {selectedInvoice.item_type}
                  </Text>
                  {selectedInvoice.imei ? (
                    <Text style={[styles.invImeiText, { marginTop: 4 }]}>
                      IMEI / Serial: {selectedInvoice.imei}
                    </Text>
                  ) : null}
                </View>

                <View style={styles.totalDueBox}>
                  <Text style={styles.totalDueLabel}>TOTAL AMOUNT PAID</Text>
                  <Text style={styles.totalDueVal}>
                    Rs {parseFloat(selectedInvoice.selling_price).toLocaleString('en-IN')}
                  </Text>
                </View>
              </ScrollView>

              {/* Action Buttons: Print PDF, Save/Share PDF, Move to Bin */}
              <View style={styles.invoiceActionsRow}>
                <TouchableOpacity
                  style={styles.printBtn}
                  onPress={() => handlePrintPdf(selectedInvoice)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="print" size={17} color="#FFFFFF" />
                  <Text style={styles.printBtnText}>Print PDF</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.sharePdfBtn}
                  onPress={() => handleSharePdf(selectedInvoice)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="document-text" size={17} color="#0F766E" />
                  <Text style={styles.sharePdfBtnText}>Save PDF</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteInvoiceBtn}
                  onPress={() => {
                    handleDeleteInvoice(selectedInvoice);
                    setSelectedInvoice(null);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="trash-outline" size={17} color="#DC2626" />
                  <Text style={styles.deleteInvoiceBtnText}>Move to Bin</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.closeModalBtn}
                onPress={() => setSelectedInvoice(null)}
              >
                <Text style={styles.closeModalText}>Close Invoice</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Barcode / IMEI Camera Scanner Modal */}
      <BarcodeScannerModal
        visible={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        title="Scan IMEI to Bill"
        onScan={handleScannedBarcode}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 16,
    paddingBottom: 36,
  },
  topTabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  topTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  topTabBtnActive: {
    backgroundColor: '#0F172A',
  },
  topTabBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  topTabBtnTextActive: {
    color: '#FFFFFF',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scanLauncherBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  scanLauncherText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    color: '#0F172A',
    fontSize: 14,
  },
  catalogScroll: {
    marginBottom: 10,
  },
  itemPill: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginRight: 10,
    width: 170,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  itemPillSelected: {
    borderColor: '#059669',
    backgroundColor: '#F0FDF4',
  },
  itemPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  itemPillThumb: {
    width: 32,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  itemPillPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemPillTop: {
    marginBottom: 4,
  },
  itemPillName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  itemPillNameSelected: {
    color: '#059669',
  },
  itemPillSub: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 2,
  },
  itemPillImei: {
    fontSize: 10,
    color: '#0F766E',
    fontWeight: '600',
    marginBottom: 4,
  },
  itemPillPrice: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
  },
  selectedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#CCFBF1',
    marginTop: 6,
  },
  selectedItemPhoto: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  selectedItemPhotoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  selectedTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  selectedMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  selectedBuyPrice: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  formGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#0F172A',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inputHint: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 3,
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 12,
  },
  payModeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  payModeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  payModeBtnActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  payModeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  payModeTextActive: {
    color: '#FFFFFF',
  },
  completeBtn: {
    backgroundColor: '#059669',
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  completeBtnDisabled: {
    opacity: 0.5,
  },
  completeBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },

  // Invoices Styles
  invoiceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  invNo: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F766E',
  },
  invDate: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  invPrice: {
    fontSize: 16,
    fontWeight: '900',
    color: '#059669',
  },
  invItemName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  invDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invCustomerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  invCustomerText: {
    fontSize: 12,
    color: '#475569',
  },
  invBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  invBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#334155',
  },
  invImeiWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  invImeiText: {
    fontSize: 11,
    color: '#0F766E',
    fontWeight: '600',
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
  },
  modalTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSub: {
    fontSize: 12,
    color: '#0F766E',
    fontWeight: '700',
    marginTop: 2,
  },
  invMetaGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  invMetaBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  invMetaLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  invMetaVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  invMetaSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  invItemBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  invItemNameBig: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  totalDueBox: {
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  totalDueLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#065F46',
    letterSpacing: 0.5,
  },
  totalDueVal: {
    fontSize: 24,
    fontWeight: '900',
    color: '#047857',
    marginTop: 4,
  },
  invoiceActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    marginBottom: 8,
  },
  printBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingVertical: 14,
  },
  printBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  sharePdfBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#CCFBF1',
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  sharePdfBtnText: {
    color: '#0F766E',
    fontWeight: '800',
    fontSize: 14,
  },
  closeModalBtn: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  closeModalText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 14,
  },
  deleteInvoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  deleteInvoiceBtnText: {
    color: '#DC2626',
    fontWeight: '800',
    fontSize: 13,
  },

  // Second Hand Dual Customer Badges & Cards
  secondHandMiniBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  secondHandMiniText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
  },
  invDeleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dualCustomerRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  customerPillBuyer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  customerPillTextBuyer: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
  },
  customerPillSeller: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  customerPillTextSeller: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },

  // Modal Dual Customer Section
  dualCustomerContainer: {
    gap: 10,
    marginBottom: 14,
  },
  buyerCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  sellerCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  customerCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  buyerCardTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sellerCardTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#B45309',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  customerNameMain: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  customerContactLine: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
  },
  priceTagBuyer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#DCFCE7',
  },
  priceTagSeller: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#FEF3C7',
  },
  priceTagLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  priceTagValBuyer: {
    fontSize: 14,
    fontWeight: '900',
    color: '#059669',
  },
  priceTagValSeller: {
    fontSize: 14,
    fontWeight: '900',
    color: '#B45309',
  },
  marginBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  marginBannerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065F46',
  },

  // Recycle Bin View Styles
  binHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  binTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  binSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  emptyBinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  emptyBinBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#DC2626',
  },
  binFilterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  binFilterChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  binFilterChipActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  binFilterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  binFilterChipTextActive: {
    color: '#FFFFFF',
  },
  binCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  binCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  binTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  binTypeInv: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  binTypeTx: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  binTypeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  binAmountText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  binCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  binMetaRow: {
    marginBottom: 8,
  },
  binMetaText: {
    fontSize: 11,
    color: '#64748B',
  },
  binDetailsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  binDetailText: {
    fontSize: 12,
    color: '#475569',
  },
  binActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  restoreBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0F172A',
    paddingVertical: 10,
    borderRadius: 10,
  },
  restoreBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  deleteForeverBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  deleteForeverBtnText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 12,
  },
});
