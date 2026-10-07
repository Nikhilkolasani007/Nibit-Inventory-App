import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert, Share } from 'react-native';

export const generateInvoiceHtml = (inv, user, isPurchase = false) => {
  const shop = user?.shop_name || 'SHOUKY MOBILES';
  const price = parseFloat(isPurchase ? inv.cost_price : (inv.selling_price || 0));
  const invNo = inv.invoice_no || `INV-${Date.now()}`;
  const invDate = inv.invoice_date || new Date().toLocaleString();
  const customer = isPurchase ? (inv.seller_name || 'Individual Seller') : (inv.customer_name || 'Valued Customer');
  const phone = isPurchase ? (inv.seller_phone || 'N/A') : (inv.customer_phone || 'N/A');
  const email = isPurchase ? (inv.seller_email || 'N/A') : (inv.customer_email || 'N/A');
  const address = isPurchase ? (inv.seller_address || 'N/A') : (inv.customer_address || 'N/A');
  const item = inv.item_name || inv.name || 'Device';
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
  <title>${isPurchase ? 'Purchase Receipt' : 'Invoice'} ${invNo}</title>
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
      <div class="inv-title">${isPurchase ? 'PURCHASE RECEIPT' : 'TAX INVOICE'}</div>
      <div class="inv-num">${invNo}</div>
      <div class="inv-date">${invDate}</div>
    </div>
  </div>

  <div class="grid-2">
    <div class="card-box" ${isPurchase ? 'style="border-left: 4px solid #D97706; background-color: #FFFBEB;"' : 'style="border-left: 4px solid #059669;"'}>
      <div class="box-title" ${isPurchase ? 'style="color: #B45309;"' : 'style="color: #059669;"'}>
        ${isPurchase ? 'Seller / Supplier Details (Bought From)' : 'Buyer Customer Details (Sold To)'}
      </div>
      <div class="box-name">${customer}</div>
      <div class="box-line"><strong>Phone:</strong> ${phone}</div>
      ${email !== 'N/A' ? `<div class="box-line"><strong>Email:</strong> ${email}</div>` : ''}
      ${address !== 'N/A' ? `<div class="box-line"><strong>Address:</strong> ${address}</div>` : ''}
    </div>
    <div class="card-box">
      <div class="box-title">${isPurchase ? 'Store Purchase Info' : 'Payment & Sale Info'}</div>
      <div class="box-name">Payment: ${payment}</div>
      <div class="box-line"><strong>Status:</strong> Completed</div>
      <div class="box-line"><strong>${isPurchase ? 'Received By' : 'Billed By'}:</strong> ${createdBy}</div>
      <div class="box-line"><strong>Store:</strong> ${shop}</div>
    </div>
  </div>

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
        <td style="text-align: right; font-weight: 700;">Rs ${price.toLocaleString('en-IN')}</td>
      </tr>
    </tbody>
  </table>

  <div class="summary-section">
    <div class="summary-box">
      <div class="summary-row">
        <span>Subtotal</span>
        <span>Rs ${price.toLocaleString('en-IN')}</span>
      </div>
      <div class="summary-row">
        <span>Taxes (Included)</span>
        <span>Rs 0.00</span>
      </div>
      <div class="summary-total">
        <span>Total ${isPurchase ? 'Paid Out' : 'Paid'}:</span>
        <span style="color: #059669;">Rs ${price.toLocaleString('en-IN')}</span>
      </div>
    </div>
  </div>

  <div class="footer-note">
    Thank you for choosing ${shop}!<br>
    ${isPurchase ? 'This is an official receipt of purchase by the store.' : 'All device warranties are subject to store inspection. Keep this invoice safe for future warranty claims.'}<br>
    Computer generated official record • Valid without physical signature.
  </div>
</body>
</html>
  `;
};

export const handlePrintPdf = async (inv, user, isPurchase = false) => {
  try {
    const html = generateInvoiceHtml(inv, user, isPurchase);
    await Print.printAsync({ html });
  } catch (err) {
    console.warn('Print error, falling back to PDF share:', err);
    handleSharePdf(inv, user, isPurchase);
  }
};

export const handleSharePdf = async (inv, user, isPurchase = false) => {
  try {
    const html = generateInvoiceHtml(inv, user, isPurchase);
    const { uri } = await Print.printToFileAsync({ html });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `${isPurchase ? 'Purchase Receipt' : 'Invoice'} ${inv.invoice_no || inv.id}`,
        UTI: 'com.adobe.pdf'
      });
    } else {
      Alert.alert('PDF Saved', `PDF saved at: ${uri}`);
    }
  } catch (err) {
    // Fallback to text share
    try {
      const price = isPurchase ? inv.cost_price : inv.selling_price;
      const customer = isPurchase ? inv.seller_name : inv.customer_name;
      const phone = isPurchase ? inv.seller_phone : inv.customer_phone;
      const fallbackText =
        `${user?.shop_name || 'SHOUKY MOBILES'} - ${isPurchase ? 'PURCHASE RECEIPT' : 'INVOICE'}\n` +
        `No: ${inv.invoice_no || inv.id}\n` +
        `Date: ${inv.invoice_date || new Date().toLocaleString()}\n` +
        `${isPurchase ? 'Seller' : 'Customer'}: ${customer || 'N/A'} (${phone || 'N/A'})\n` +
        `Item: ${inv.item_name || inv.name} ${inv.imei ? '(IMEI: ' + inv.imei + ')' : ''}\n` +
        `Amount: Rs ${parseFloat(price || 0).toLocaleString('en-IN')}\n` +
        `Payment: ${inv.payment_mode || 'Cash'}`;
      await Share.share({ message: fallbackText });
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not print or share invoice.');
    }
  }
};
