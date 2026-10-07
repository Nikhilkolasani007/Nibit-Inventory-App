// src/services/apiService.js - Connects React Native Expo App to PHP REST API
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

const SERVER_URL_STORAGE_KEY = '@nibit_api_server_url';

// Auto-detect the development host IP from Expo Constants
export function getAutoDetectedApiBase() {
  try {
    const hostUri =
      Constants.expoConfig?.hostUri ||
      Constants.manifest2?.extra?.expoGo?.debuggerHost ||
      Constants.manifest?.debuggerHost;

    if (hostUri) {
      const ip = hostUri.split(':')[0];
      if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
        return `http://${ip}/api_mobile`;
      }
    }
  } catch (e) {
    console.warn('Could not auto-detect Expo host URI:', e);
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2/api_mobile';
  }
  return 'http://localhost/api_mobile';
}

export const DEFAULT_API_BASE_URL = 'https://nibit.in/shouky_app/api.php';

export function formatServerUrl(rawInput) {
  if (!rawInput) return DEFAULT_API_BASE_URL;
  let url = rawInput.trim().replace(/\/+$/, '');

  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  // If user enters https://nibit.in/admin without api.php, append api.php
  if (url === 'https://nibit.in/admin' || url === 'http://nibit.in/admin') {
    url = 'https://nibit.in/admin/api.php';
  }

  return url;
}

class ApiService {
  constructor() {
    this.baseUrl = DEFAULT_API_BASE_URL;
    this.isConnected = false;
    this.lastChecked = null;
    this.loadSavedBaseUrl();
  }

  async loadSavedBaseUrl() {
    try {
      const saved = await AsyncStorage.getItem(SERVER_URL_STORAGE_KEY);
      if (saved && !saved.includes('localhost') && !saved.includes('10.0.2.2') && !saved.includes('192.168.')) {
        this.baseUrl = formatServerUrl(saved);
      } else {
        // Enforce nibit.in live
        this.baseUrl = DEFAULT_API_BASE_URL;
        await AsyncStorage.setItem(SERVER_URL_STORAGE_KEY, DEFAULT_API_BASE_URL);
      }
    } catch (e) {
      this.baseUrl = DEFAULT_API_BASE_URL;
    }
  }

  async setBaseUrl(url) {
    if (url) {
      this.baseUrl = formatServerUrl(url);
      try {
        await AsyncStorage.setItem(SERVER_URL_STORAGE_KEY, this.baseUrl);
      } catch (e) {
        // Ignore
      }
    }
  }

  getBaseUrl() {
    return this.baseUrl;
  }

  cleanWebsiteForComparison(url) {
    if (!url) return '';
    return url
      .toLowerCase()
      .trim()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/+$/, '');
  }

  async checkHealth(customUrl = null) {
    const targetUrl = customUrl ? formatServerUrl(customUrl) : this.baseUrl;
    const testEndpoints = targetUrl.endsWith('.php')
      ? [targetUrl, `${targetUrl}?app_id=1`]
      : [
          `${targetUrl}/api.php`,
          `${targetUrl}/api.php?app_id=1`,
          targetUrl
        ];

    let lastError = null;

    for (const endpoint of testEndpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const response = await fetch(endpoint, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        let json = null;
        try {
          json = await response.json();
        } catch (_) {}

        if (response.ok || response.status === 200) {
          if (!customUrl) {
            this.isConnected = true;
            this.lastChecked = new Date();
          }
          return {
            connected: true,
            endpoint,
            status: response.status,
            message: 'Server reachable and active on nibit.in!'
          };
        }

        // If server responded with 500 (e.g. Database connection failed)
        if (response.status === 500) {
          const detail = json?.message || 'Database connection error';
          lastError = `Server reachable at nibit.in, but: ${detail}`;
          if (!customUrl) this.isConnected = false;
          return {
            connected: false,
            endpoint,
            status: 500,
            error: lastError
          };
        }
      } catch (err) {
        lastError = err.message;
      }
    }

    if (!customUrl) this.isConnected = false;
    return {
      connected: false,
      error: lastError || `Could not reach ${targetUrl}. Please check internet connection.`
    };
  }

  // Verification against Database Records (Matching MOBILE MANAGEMENT APPS: EMAIL, PASSWORD, SHOP NAME)
  async verifyUserAndExtractData(email, password, website = '', appId = 1) {
    const cleanEmail = email ? email.trim() : '';
    const cleanPassword = password ? password.trim() : '';
    const cleanWebsite = website ? website.trim() : '';

    if (!cleanEmail || !cleanPassword) {
      throw new Error('Please enter both Email and Password.');
    }

    const payload = {
      email: cleanEmail,
      password: cleanPassword,
      website: cleanWebsite,
      app_id: appId
    };

    // 1. Primary: Direct Backend Verification via auth.php or api.php
    const authEndpoints = this.baseUrl.endsWith('.php')
      ? [this.baseUrl]
      : [`${this.baseUrl}/auth.php`, `${this.baseUrl}/api.php`];

    for (const endpoint of authEndpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const authRes = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        const authData = await authRes.json();

        if (authRes.ok && authData.success && (authData.data?.verified || authData.verified)) {
          this.isConnected = true;
          const u = authData.data?.user || authData.user;
          return {
            verified: true,
            user: u,
            record: authData.data?.record || authData.record,
            records: authData.data?.records || authData.records || authData.data || [],
            token: authData.data?.token || authData.token,
            apiHost: this.baseUrl
          };
        } else if (authRes.status === 401 || (authData && authData.success === false && !authRes.ok)) {
          throw new Error(authData.message || 'Invalid Email or Password! Please verify against the application grid.');
        }
      } catch (err) {
        if (err.message.includes('Invalid Email') || err.message.includes('wrong details') || err.message.includes('verify against')) {
          throw err;
        }
      }
    }

    // 2. Fallback: Query live records from api.php or get_records.php
    let databaseRecords = [];
    const recordEndpoints = this.baseUrl.endsWith('.php')
      ? [`${this.baseUrl}?app_id=${appId}`]
      : [`${this.baseUrl}/api.php?app_id=${appId}`, `${this.baseUrl}/get_records.php?app_id=${appId}`];

    for (const recEndpoint of recordEndpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4500);

        const res = await fetch(recEndpoint, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          const list = data.data || data.records || data.data?.records || [];
          if (Array.isArray(list) && list.length > 0) {
            databaseRecords = list;
            break;
          }
        }
      } catch (netErr) {
        // Continue to next endpoint
      }
    }

    if (databaseRecords.length === 0) {
      // Offline fallback check for demo
      const localAdmins = [
        { email: 'shouky@gmail.com', pass: '9441166030@Nk', shop: 'SHOUKY MOBILES' },
        { email: 'kolasaninikhil1@gmail.com', pass: '9441166030@Nk', shop: 'NIKHIL SHOP' }
      ];
      const foundLocal = localAdmins.find(
        (a) => a.email.toLowerCase() === cleanEmail.toLowerCase() && a.pass === cleanPassword
      );
      if (foundLocal) {
        return {
          verified: true,
          user: {
            id: 1,
            email: foundLocal.email,
            website: cleanWebsite || 'nibit.in',
            name: foundLocal.shop,
            role: 'admin',
            pin_code: '1234',
            isAdmin: true
          },
          records: [],
          token: `token_local_${Date.now()}`,
          apiHost: this.baseUrl
        };
      }
      throw new Error(`Cannot reach server at ${this.baseUrl}.\n\nPlease check your server connection.`);
    }

    const cleanInputEmail = cleanEmail.toLowerCase();
    const cleanInputWebsite = this.cleanWebsiteForComparison(cleanWebsite);

    const matchedRecord = databaseRecords.find((rec) => {
      const data = rec.record_data || rec;
      const recEmail = (data.EMAIL || data.col_275 || data.email || '').toLowerCase().trim();
      const recWebsite = this.cleanWebsiteForComparison(data.WEBSITE || data.col_591 || data.website || '');
      const recPassword = String(data.col_313_decrypted || data.PASSWORD || data.col_313 || data.password || '').trim();

      const emailMatches = (recEmail === cleanInputEmail);
      const passwordMatches = (recPassword === cleanPassword);

      // Website is 100% optional: email and password are the authoritative credentials
      return emailMatches && passwordMatches;
    });

    if (matchedRecord) {
      const data = matchedRecord.record_data || matchedRecord;
      const extractedShopName = data['SHOP NAME'] || data._ || data.shop_name || 'SHOUKY MOBILES';

      return {
        verified: true,
        user: {
          id: matchedRecord.id || 1,
          email: data.EMAIL || data.col_275 || cleanEmail,
          website: cleanWebsite || data.WEBSITE || data.col_591 || 'shouky.com',
          name: extractedShopName,
          role: 'admin',
          pin_code: '1234',
          isAdmin: true
        },
        record: matchedRecord,
        records: databaseRecords,
        token: `token_${matchedRecord.id || Date.now()}`,
        apiHost: this.baseUrl
      };
    } else {
      throw new Error('Invalid Email or Password! Please verify your credentials against the application grid.');
    }
  }

  // Employee Login with Employee ID (empid) and 4-digit code
  async employeeLogin(empId, pinCode) {
    const cleanEmpId = empId ? empId.trim().toUpperCase() : '';
    const cleanPin = pinCode ? pinCode.trim() : '';

    if (!cleanEmpId || !cleanPin) {
      throw new Error('Employee ID and 4-digit security code are required.');
    }

    if (cleanPin.length !== 4 || !/^\d{4}$/.test(cleanPin)) {
      throw new Error('Security code must be exactly 4 numeric digits.');
    }

    const payload = {
      action: 'emp_login',
      empid: cleanEmpId,
      code: cleanPin
    };

    // 1. Try Backend API (auth.php or api.php)
    const empEndpoints = this.baseUrl.endsWith('.php')
      ? [this.baseUrl]
      : [`${this.baseUrl}/auth.php`, `${this.baseUrl}/api.php`];

    for (const endpoint of empEndpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const authRes = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        const authData = await authRes.json();

        if (authRes.ok && authData.success && (authData.data?.verified || authData.verified)) {
          this.isConnected = true;
          return {
            verified: true,
            user: authData.data?.user || authData.user,
            records: authData.data?.records || authData.records || [],
            token: authData.data?.token || authData.token,
            apiHost: this.baseUrl
          };
        } else if (authRes.status === 401 || (authData && authData.success === false && !authRes.ok)) {
          throw new Error(authData.message || 'Invalid Employee ID or 4-digit code. Please check your credentials.');
        }
      } catch (err) {
        if (err.message.includes('Invalid Employee ID') || err.message.includes('check your credentials')) {
          throw err;
        }
        // Try next endpoint
      }
    }

    throw new Error('Invalid Employee ID or 4-digit code. Please verify credentials against your database.');
  }

  async saveRecord(email, website, password, shopName = 'NIKHIL SHOP', appId = 1) {
    const saveUrl = `${this.baseUrl}/save_record.php`;

    const payload = {
      app_id: appId,
      record_data: {
        col_275: email ? email.trim() : '',
        col_591: website ? website.trim() : '',
        col_313: password ? password.trim() : '',
        _: shopName ? shopName.trim() : 'NIKHIL SHOP'
      },
      status_mode: 'active'
    };

    const res = await fetch(saveUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload),
    });

    const result = await res.json();
    return result;
  }

  async login(email, password, website, shopName = 'NIKHIL SHOP') {
    return this.verifyUserAndExtractData(email, password, website);
  }

  async fetchItems(params = {}) {
    const searchParams = new URLSearchParams();
    if (params.search) searchParams.append('search', params.search);
    if (params.category && params.category !== 'All') searchParams.append('category', params.category);
    if (params.filter && params.filter !== 'all') searchParams.append('filter', params.filter);

    const queryStr = searchParams.toString() ? `?${searchParams.toString()}` : '';
    try {
      const res = await fetch(`${this.baseUrl}/items.php${queryStr}`);
      if (res.ok) {
        const result = await res.json();
        if (result.data && Array.isArray(result.data)) {
          return result.data;
        }
      }
    } catch (e) {
      // items.php not present on server, fallback to app_records via api.php
    }

    // Fallback: Query live records from api.php or get_records.php
    try {
      const apiEndpoint = this.baseUrl.endsWith('.php')
        ? `${this.baseUrl}?app_id=1`
        : `${this.baseUrl}/api.php?app_id=1`;
      const apiRes = await fetch(apiEndpoint);
      if (apiRes.ok) {
        const apiData = await apiRes.json();
        const records = apiData.data || apiData.records || [];
        if (Array.isArray(records) && records.length > 0) {
          return records.map((r) => {
            const d = r.record_data || r;
            return {
              id: r.id || d.id || Date.now(),
              name: d.name || d['SHOP NAME'] || d.shop_name || d.EMAIL || 'Mobile Device Item',
              sku: d.sku || d.SINO || d.sino || `SKU-${r.id || '101'}`,
              category: d.category || 'Mobile Management',
              quantity: d.quantity || 10,
              cost_price: d.cost_price || 0,
              selling_price: d.selling_price || 0,
              supplier: d.supplier || d['SHOP NAME'] || 'SHOUKY MOBILES',
              location: d.location || 'Warehouse A',
              description: d.description || d.EMAIL || ''
            };
          });
        }
      }
    } catch (apiErr) {
      // Ignore
    }

    return [];
  }

  getDirUrl() {
    return this.baseUrl.replace(/\/api\.php$/, '').replace(/\/+$/, '');
  }

  getApiUrl() {
    return `${this.getDirUrl()}/api.php`;
  }

  getItemsUrl() {
    return `${this.getDirUrl()}/items.php`;
  }

  async createItem(itemData) {
    const res = await fetch(this.getItemsUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(itemData)
    });
    const result = await res.json();
    if (!res.ok || !result.success) {
      throw new Error(result.message || 'Failed to create item');
    }
    return result.data;
  }

  async updateItem(itemData) {
    const res = await fetch(this.getItemsUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...itemData, action: 'update' })
    });
    const result = await res.json();
    if (!res.ok || !result.success) {
      throw new Error(result.message || 'Failed to update item');
    }
    return result.data;
  }

  async deleteItem(id) {
    const res = await fetch(`${this.getItemsUrl()}?id=${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    const text = await res.text();
    let result = {};
    try {
      result = JSON.parse(text);
    } catch (e) {
      result = { success: res.ok };
    }
    if (!res.ok || result.success === false) {
      throw new Error(result.message || 'Failed to delete item');
    }
    return result;
  }

  // Invoice & Sales APIs
  async fetchInvoices(searchQuery = '') {
    const query = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : '';
    const res = await fetch(`${this.getApiUrl()}?action=get_invoices${query}`, {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) throw new Error(`Failed to load invoices: HTTP ${res.status}`);
    const result = await res.json();
    return result.data || [];
  }

  async createInvoice(invoiceData) {
    const res = await fetch(`${this.getApiUrl()}?action=create_invoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invoiceData)
    });
    const result = await res.json();
    if (!res.ok || !result.success) {
      throw new Error(result.message || 'Failed to create invoice');
    }
    return result.data;
  }

  async deleteInvoice(id) {
    const res = await fetch(`${this.getApiUrl()}?action=delete_invoice&id=${encodeURIComponent(id)}`, {
      method: 'POST'
    });
    const result = await res.json();
    if (!res.ok || !result.success) {
      throw new Error(result.message || 'Failed to delete invoice');
    }
    return result;
  }

  // Recycle Bin / Trash Bin APIs
  async fetchBin() {
    const res = await fetch(`${this.getApiUrl()}?action=get_bin`, {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) throw new Error(`Failed to load Recycle Bin: HTTP ${res.status}`);
    const result = await res.json();
    return result.data || [];
  }

  async restoreFromBin(id) {
    const res = await fetch(`${this.getApiUrl()}?action=restore_from_bin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: parseInt(id, 10) })
    });
    const result = await res.json();
    if (!res.ok || !result.success) {
      throw new Error(result.message || 'Failed to restore item from Recycle Bin');
    }
    return result;
  }

  async deleteFromBin(id) {
    const res = await fetch(`${this.getApiUrl()}?action=delete_bin_item`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: parseInt(id, 10) })
    });
    const result = await res.json();
    if (!res.ok || !result.success) {
      throw new Error(result.message || 'Failed to delete item from Recycle Bin');
    }
    return result;
  }

  async emptyBin() {
    const res = await fetch(`${this.getApiUrl()}?action=empty_bin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const result = await res.json();
    if (!res.ok || !result.success) {
      throw new Error(result.message || 'Failed to empty Recycle Bin');
    }
    return result;
  }

  async deleteTransaction(id) {
    const res = await fetch(`${this.getApiUrl()}?action=delete_transaction&id=${encodeURIComponent(id)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: parseInt(id, 10) })
    });
    const result = await res.json();
    if (!res.ok || !result.success) {
      throw new Error(result.message || 'Failed to delete transaction');
    }
    return result;
  }

  async uploadImage(imageInput) {
    if (!imageInput) return null;

    // If already an absolute http/https URL, return directly
    if (typeof imageInput === 'string' && (imageInput.startsWith('http://') || imageInput.startsWith('https://'))) {
      return imageInput;
    }

    const isBase64 = typeof imageInput === 'string' && (
      imageInput.startsWith('data:image') || 
      (!imageInput.startsWith('file:') && !imageInput.startsWith('content:') && !imageInput.startsWith('blob:') && imageInput.length > 300)
    );

    // Strategy 1: If string is raw Base64 or Data URI
    if (isBase64) {
      try {
        const res = await fetch(`${this.getApiUrl()}?action=upload_image`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_data: imageInput })
        });
        
        let result;
        try {
          result = await res.json();
        } catch (e) {
          const text = await res.text();
          throw new Error(`Server returned invalid JSON: ${text.substring(0, 100)}...`);
        }

        if (res.ok && result.success) {
          const rawUrl = result.url || result.relative_url;
          return this.getImageUrl(rawUrl) || rawUrl;
        } else {
          throw new Error(result.message || 'Upload failed on server.');
        }
      } catch (err) {
        console.warn('JSON upload failed:', err);
        throw new Error(err.message || 'Failed to upload photo via Base64.');
      }
    }

    // Strategy 2: FileSystem Upload (Robust native upload for local files in Expo)
    try {
      if (Platform.OS === 'web' && typeof imageInput === 'string' && imageInput.startsWith('blob:')) {
        // Fallback for Web since FileSystem.uploadAsync is not supported on Web
        const formData = new FormData();
        const blobRes = await fetch(imageInput);
        const blob = await blobRes.blob();
        formData.append('image', blob, `mobile_${Date.now()}.jpg`);
        const res = await fetch(`${this.getApiUrl()}?action=upload_image`, {
          method: 'POST',
          body: formData
        });
        const result = await res.json();
        if (res.ok && result.success) {
          const rawUrl = result.url || result.relative_url;
          return this.getImageUrl(rawUrl) || rawUrl;
        }
      } else {
        // Native iOS/Android: Use FileSystem to bypass fetch FormData issues
        const uploadResult = await FileSystem.uploadAsync(
          `${this.getApiUrl()}?action=upload_image`,
          imageInput,
          {
            httpMethod: 'POST',
            uploadType: FileSystem.FileSystemUploadType.MULTIPART,
            fieldName: 'image'
          }
        );
        
        let result;
        try {
          result = JSON.parse(uploadResult.body);
        } catch (e) {
          throw new Error(`Server returned invalid JSON: ${uploadResult.body.substring(0, 100)}...`);
        }

        if (uploadResult.status >= 200 && uploadResult.status < 300 && result.success) {
          const rawUrl = result.url || result.relative_url;
          return this.getImageUrl(rawUrl) || rawUrl;
        } else {
          throw new Error(result.message || 'Upload failed on server.');
        }
      }
    } catch (uploadErr) {
      console.warn('FileSystem upload failed:', uploadErr);
      throw new Error(uploadErr.message || 'Failed to upload physical device photo');
    }
  }

  getImageUrl(imagePath) {
    if (!imagePath) return null;
    if (Array.isArray(imagePath)) {
      return imagePath.length > 0 ? this.getImageUrl(imagePath[0]) : null;
    }
    if (typeof imagePath !== 'string') return null;
    let trimmed = imagePath.trim();
    if (!trimmed) return null;

    // Handle JSON string array e.g. ["uploads/file.jpg"]
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return this.getImageUrl(parsed[0]);
        }
      } catch (e) {}
    }

    // Handle comma-separated list
    if (trimmed.includes(',')) {
      trimmed = trimmed.split(',')[0].trim();
    }

    if (
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('file://') ||
      trimmed.startsWith('data:') ||
      trimmed.startsWith('content://') ||
      trimmed.startsWith('blob:')
    ) {
      return trimmed;
    }
    const cleanPath = trimmed.replace(/^\/+/, '');
    return `${this.getDirUrl()}/${cleanPath}`;
  }

  async adjustStock(itemId, quantity, type, reason) {
    const res = await fetch(this.getItemsUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'adjust_stock',
        item_id: itemId,
        change: type === 'IN' ? parseInt(quantity, 10) : -parseInt(quantity, 10),
        reason
      })
    });
    const result = await res.json();
    if (!res.ok || !result.success) {
      throw new Error(result.message || 'Failed to adjust stock');
    }
    return result;
  }

  async fetchTransactions(limit = 50) {
    const isPhpEndpoint = this.baseUrl.endsWith('.php');
    const endpoint = isPhpEndpoint
      ? `${this.baseUrl}?action=transactions&limit=${limit}`
      : `${this.baseUrl}/api.php?action=transactions&limit=${limit}`;
    try {
      const res = await fetch(endpoint);
      if (res.ok) {
        const result = await res.json();
        return result.data || [];
      }
    } catch (e) {}

    const standalone = isPhpEndpoint
      ? `${this.getDirUrl()}/transactions.php?limit=${limit}`
      : `${this.baseUrl}/transactions.php?limit=${limit}`;
    const res = await fetch(standalone);
    if (!res.ok) throw new Error(`Failed to load transactions: HTTP ${res.status}`);
    const result = await res.json();
    return result.data || [];
  }

  async fetchCategories() {
    const isPhpEndpoint = this.baseUrl.endsWith('.php');
    const endpoint = isPhpEndpoint
      ? `${this.baseUrl}?action=categories`
      : `${this.baseUrl}/api.php?action=categories`;
    try {
      const res = await fetch(endpoint);
      if (res.ok) {
        const result = await res.json();
        return result.data || [];
      }
    } catch (e) {}

    const standalone = isPhpEndpoint
      ? `${this.getDirUrl()}/categories.php`
      : `${this.baseUrl}/categories.php`;
    const res = await fetch(standalone);
    if (!res.ok) throw new Error(`Failed to load categories: HTTP ${res.status}`);
    const result = await res.json();
    return result.data || [];
  }

  async changePin(identifier, newPin) {
    const isPhpEndpoint = this.baseUrl.endsWith('.php');
    const endpoint = isPhpEndpoint ? `${this.baseUrl}?action=change_pin` : `${this.baseUrl}/api.php?action=change_pin`;
    const payload = (typeof identifier === 'string' && identifier.includes('@'))
      ? { email: identifier, pin: newPin }
      : { emp_id: identifier, pin: newPin };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (!res.ok || !result.success) {
      throw new Error(result.message || 'Failed to update PIN');
    }
    return result;
  }

  async changePassword(identifier, newPassword) {
    const isPhpEndpoint = this.baseUrl.endsWith('.php');
    const endpoint = isPhpEndpoint ? `${this.baseUrl}?action=change_password` : `${this.baseUrl}/api.php?action=change_password`;
    const payload = (typeof identifier === 'string' && identifier.includes('@'))
      ? { email: identifier, new_password: newPassword }
      : { emp_id: identifier, new_password: newPassword };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (!res.ok || !result.success) {
      throw new Error(result.message || 'Failed to update password');
    }
    return result;
  }

  async fetchStats() {
    const res = await fetch(`${this.baseUrl}/stats.php`);
    if (!res.ok) throw new Error(`Failed to load stats: HTTP ${res.status}`);
    const result = await res.json();
    return result.data || null;
  }

  async fetchAnalytics() {
    const isPhpEndpoint = this.baseUrl.endsWith('.php');
    const endpoint = isPhpEndpoint ? `${this.baseUrl}?action=analytics` : `${this.baseUrl}/api.php?action=analytics`;
    const res = await fetch(endpoint);
    if (!res.ok) throw new Error(`Failed to load analytics: HTTP ${res.status}`);
    const result = await res.json();
    return result.data || null;
  }

  async fetchUsers() {
    const isPhpEndpoint = this.baseUrl.endsWith('.php');
    const endpoint = isPhpEndpoint ? `${this.baseUrl}?action=get_users` : `${this.baseUrl}/api.php?action=get_users`;
    const res = await fetch(endpoint, {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) throw new Error(`Failed to load users: HTTP ${res.status}`);
    const result = await res.json();
    return result;
  }

  async addEmployee(empData) {
    const isPhpEndpoint = this.baseUrl.endsWith('.php');
    const endpoint = isPhpEndpoint ? `${this.baseUrl}?action=add_user` : `${this.baseUrl}/api.php?action=add_user`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'employee', ...empData })
    });
    const result = await res.json();
    if (!res.ok || !result.success) {
      throw new Error(result.message || 'Failed to add employee');
    }
    return result.data;
  }

  async deleteEmployee(empId) {
    const isPhpEndpoint = this.baseUrl.endsWith('.php');
    const endpoint = isPhpEndpoint ? `${this.baseUrl}?action=delete_user` : `${this.baseUrl}/api.php?action=delete_user`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emp_id: empId })
    });
    const result = await res.json();
    if (!res.ok || !result.success) {
      throw new Error(result.message || 'Failed to delete employee');
    }
    return result;
  }
}

export const apiService = new ApiService();
export const getImageUrl = (imagePath) => apiService.getImageUrl(imagePath);
export default apiService;
