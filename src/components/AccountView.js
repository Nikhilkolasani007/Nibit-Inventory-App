// src/components/AccountView.js - Account, Profile & Server Security Settings
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../services/apiService';
import sessionService from '../services/sessionService';
import { handlePrintPdf, handleSharePdf } from '../utils/invoiceUtils';

export default function AccountView({ user, items = [], onLockApp, onLogout, onUpdateUser }) {
  const [activeTab, setActiveTab] = useState('settings'); // 'settings' | 'directory'
  const shopName = user?.shop_name || 'SHOUKY MOBILES';
  const isEmployee = user?.role === 'employee';
  const roleTitle = isEmployee ? 'Staff Member' : 'Store Administrator';
  const emailAddress = user?.email || (isEmployee ? `${user?.emp_id || 'employee'}@nibit.com` : 'admin@nibit.com');
  const userIdentifier = isEmployee ? (user?.emp_id || '') : (user?.email || '');

  // PIN Modal State
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isUpdatingPin, setIsUpdatingPin] = useState(false);

  // Password Modal State
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isUpdatingPass, setIsUpdatingPass] = useState(false);

  // Employee Management State
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [isAddEmpModalOpen, setIsAddEmpModalOpen] = useState(false);
  const [newEmpId, setNewEmpId] = useState('');
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpCode, setNewEmpCode] = useState('');
  const [newEmpPhone, setNewEmpPhone] = useState('');
  const [isSavingEmp, setIsSavingEmp] = useState(false);

  // Directory & Invoicing State
  const [invoices, setInvoices] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingDirectory, setLoadingDirectory] = useState(false);
  const [filterType, setFilterType] = useState('all'); // 'all' | 'customers' | 'sellers'

  React.useEffect(() => {
    if (activeTab === 'settings') {
      loadEmployees();
    } else if (activeTab === 'directory') {
      loadInvoices();
    }
  }, [activeTab]);

  const loadInvoices = async () => {
    setLoadingDirectory(true);
    try {
      const data = await apiService.fetchInvoices('');
      setInvoices(data || []);
    } catch (e) {
      console.warn('Could not load invoices for directory:', e.message);
    } finally {
      setLoadingDirectory(false);
    }
  };

  const loadEmployees = async () => {
    setLoadingEmployees(true);
    try {
      const res = await apiService.fetchUsers();
      if (res && Array.isArray(res.employees)) {
        setEmployees(res.employees);
      }
    } catch (e) {
      console.warn('Could not load employees:', e.message);
    } finally {
      setLoadingEmployees(false);
    }
  };

  // Combine invoices (customers) and items (sellers/purchases) for unified directory
  const getDirectoryData = () => {
    let combined = [];

    // 1. Add Customers (from Sales Invoices)
    if (filterType === 'all' || filterType === 'customers') {
      invoices.forEach(inv => {
        combined.push({
          ...inv,
          dir_type: 'Customer (Sale)',
          dir_name: inv.customer_name,
          dir_phone: inv.customer_phone,
          dir_date: inv.invoice_date || inv.created_at,
          dir_invoice_no: inv.invoice_no,
          dir_amount: inv.selling_price
        });
      });
    }

    // 2. Add Sellers/Distributors (from Purchased Items)
    if (filterType === 'all' || filterType === 'sellers') {
      items.forEach(item => {
        if (item.seller_name || item.supplier) {
          combined.push({
            ...item,
            dir_type: item.item_type === 'Second Hand' ? 'Seller (2nd Hand)' : 'Distributor / Supplier',
            dir_name: item.seller_name || item.supplier,
            dir_phone: item.seller_phone || 'N/A',
            dir_date: item.created_at || 'N/A',
            dir_invoice_no: `PUR-${item.id}`,
            dir_amount: item.cost_price
          });
        }
      });
    }

    // Apply Search Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      combined = combined.filter(c => 
        (c.dir_name && c.dir_name.toLowerCase().includes(q)) ||
        (c.dir_phone && c.dir_phone.toLowerCase().includes(q)) ||
        (c.dir_invoice_no && c.dir_invoice_no.toLowerCase().includes(q)) ||
        (c.item_name && c.item_name.toLowerCase().includes(q)) ||
        (c.name && c.name.toLowerCase().includes(q))
      );
    }

    // Sort by Date (descending)
    return combined.sort((a, b) => new Date(b.dir_date) - new Date(a.dir_date));
  };

  const handleAddEmployee = async () => {
    if (!newEmpId.trim()) {
      Alert.alert('Required', 'Please enter an Employee ID (e.g. EMP101).');
      return;
    }
    if (!newEmpName.trim()) {
      Alert.alert('Required', 'Please enter employee name.');
      return;
    }
    if (!newEmpCode || newEmpCode.trim().length !== 4 || !/^\d{4}$/.test(newEmpCode.trim())) {
      Alert.alert('Invalid Code', 'Please enter a 4-digit numeric login code / PIN.');
      return;
    }

    setIsSavingEmp(true);
    try {
      const payload = {
        emp_id: newEmpId.trim().toUpperCase(),
        code: newEmpCode.trim(),
        name: newEmpName.trim(),
        phone: newEmpPhone.trim(),
        shop_name: shopName
      };
      await apiService.addEmployee(payload);
      setIsAddEmpModalOpen(false);
      setNewEmpId('');
      setNewEmpName('');
      setNewEmpCode('');
      setNewEmpPhone('');
      await loadEmployees();
      Alert.alert('Employee Added! 🎉', `Staff member ${payload.name} (${payload.emp_id}) added successfully.`);
    } catch (err) {
      Alert.alert('Add Failed', err.message || 'Could not save employee to server.');
    } finally {
      setIsSavingEmp(false);
    }
  };

  const handleDeleteEmployee = (emp) => {
    Alert.alert(
      'Remove Employee',
      `Are you sure you want to remove ${emp.name} (${emp.emp_id}) from the shop staff?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.deleteEmployee(emp.emp_id);
              await loadEmployees();
              Alert.alert('Removed', `Employee ${emp.emp_id} has been removed.`);
            } catch (e) {
              Alert.alert('Error', e.message || 'Could not remove employee.');
            }
          }
        }
      ]
    );
  };

  // Handler: Change App PIN
  const handleSavePin = async () => {
    if (!newPin || newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      Alert.alert('Invalid PIN', 'Please enter a 4-digit numeric PIN.');
      return;
    }
    if (newPin !== confirmPin) {
      Alert.alert('Mismatch', 'PINs do not match. Please re-enter.');
      return;
    }

    setIsUpdatingPin(true);
    try {
      if (userIdentifier) {
        await apiService.changePin(userIdentifier, newPin);
      }
      // Update session locally
      if (user) {
        const updatedUser = { ...user, pin_code: newPin };
        await sessionService.saveSession(updatedUser);
        if (onUpdateUser) onUpdateUser(updatedUser);
      }
      setIsPinModalOpen(false);
      setNewPin('');
      setConfirmPin('');
      Alert.alert('Success', 'App security PIN has been updated successfully.');
    } catch (err) {
      // Even if offline, update local PIN so the user isn't locked out
      if (user) {
        const updatedUser = { ...user, pin_code: newPin };
        await sessionService.saveSession(updatedUser);
        if (onUpdateUser) onUpdateUser(updatedUser);
      }
      setIsPinModalOpen(false);
      setNewPin('');
      setConfirmPin('');
      Alert.alert('PIN Updated', 'PIN saved on this device. (Server sync notice: ' + (err.message || 'offline') + ')');
    } finally {
      setIsUpdatingPin(false);
    }
  };

  // Handler: Change Password on Server
  const handleSavePassword = async () => {
    if (!newPassword || newPassword.trim().length < 4) {
      Alert.alert('Password Too Short', 'Password must be at least 4 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Mismatch', 'Passwords do not match. Please re-enter.');
      return;
    }

    setIsUpdatingPass(true);
    try {
      const res = await apiService.changePassword(userIdentifier, newPassword);
      setIsPassModalOpen(false);
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert(
        'Password Updated on Server!',
        res.message || 'Your password has been saved directly to the database. From here onwards, use this new password to sign in.',
        [{ text: 'OK' }]
      );
    } catch (err) {
      Alert.alert(
        'Update Failed',
        err.message || 'Could not update password on server. Please check your internet connection.'
      );
    } finally {
      setIsUpdatingPass(false);
    }
  };

  const handleConfirmLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out of this account?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log Out', style: 'destructive', onPress: onLogout }
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Tab Switcher */}
      <View style={styles.topTabBar}>
        <TouchableOpacity
          style={[styles.topTabBtn, activeTab === 'settings' && styles.topTabBtnActive]}
          onPress={() => setActiveTab('settings')}
        >
          <Ionicons name="settings" size={15} color={activeTab === 'settings' ? '#FFFFFF' : '#64748B'} />
          <Text style={[styles.topTabBtnText, activeTab === 'settings' && styles.topTabBtnTextActive]}>Settings</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.topTabBtn, activeTab === 'directory' && styles.topTabBtnActive]}
          onPress={() => setActiveTab('directory')}
        >
          <Ionicons name="people" size={15} color={activeTab === 'directory' ? '#FFFFFF' : '#64748B'} />
          <Text style={[styles.topTabBtnText, activeTab === 'directory' && styles.topTabBtnTextActive]}>Customers & Sellers</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'directory' ? (
        <View style={styles.directoryContainer}>
          {/* Search Bar */}
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={18} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, phone, invoice #, product..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#94A3B8"
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Filter Pills */}
          <View style={styles.filterPills}>
            {['all', 'customers', 'sellers'].map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.filterPill, filterType === f && styles.filterPillActive]}
                onPress={() => setFilterType(f)}
              >
                <Text style={[styles.filterPillText, filterType === f && styles.filterPillTextActive]}>
                  {f === 'all' ? 'All Records' : f === 'customers' ? 'Customers (Sales)' : 'Sellers (Purchases)'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Directory List */}
          <ScrollView style={styles.directoryList} showsVerticalScrollIndicator={false}>
            {loadingDirectory ? (
              <ActivityIndicator size="large" color="#0F766E" style={{ marginTop: 40 }} />
            ) : getDirectoryData().length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="file-tray-outline" size={48} color="#CBD5E1" />
                <Text style={styles.emptyText}>No matching records found.</Text>
              </View>
            ) : (
              getDirectoryData().map((record, index) => {
                const isPurchase = record.dir_type.includes('Seller') || record.dir_type.includes('Distributor');
                return (
                  <View key={index} style={styles.dirCard}>
                    <View style={styles.dirCardHeader}>
                      <View>
                        <Text style={styles.dirName}>{record.dir_name}</Text>
                        <Text style={styles.dirPhone}><Ionicons name="call" size={10} /> {record.dir_phone}</Text>
                      </View>
                      <View style={[styles.dirBadge, isPurchase ? styles.dirBadgePur : styles.dirBadgeSale]}>
                        <Text style={[styles.dirBadgeText, isPurchase ? styles.dirBadgeTextPur : styles.dirBadgeTextSale]}>
                          {record.dir_type}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.dirDetails}>
                      <Text style={styles.dirDetailText}>
                        <Text style={{ fontWeight: '700' }}>Item:</Text> {record.item_name || record.name}
                      </Text>
                      <Text style={styles.dirDetailText}>
                        <Text style={{ fontWeight: '700' }}>Invoice:</Text> {record.dir_invoice_no}
                      </Text>
                      <Text style={styles.dirDetailText}>
                        <Text style={{ fontWeight: '700' }}>Date:</Text> {new Date(record.dir_date).toLocaleDateString()}
                      </Text>
                      <Text style={styles.dirDetailText}>
                        <Text style={{ fontWeight: '700' }}>Amount:</Text> Rs {parseFloat(record.dir_amount || 0).toLocaleString('en-IN')}
                      </Text>
                    </View>

                    <View style={styles.dirActions}>
                      <TouchableOpacity 
                        style={[styles.dirBtn, styles.dirBtnPrint]}
                        onPress={() => handlePrintPdf(record, user, isPurchase)}
                      >
                        <Ionicons name="print" size={16} color="#FFFFFF" />
                        <Text style={styles.dirBtnText}>Print {isPurchase ? 'Receipt' : 'Invoice'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.dirBtn, styles.dirBtnShare]}
                        onPress={() => handleSharePdf(record, user, isPurchase)}
                      >
                        <Ionicons name="share-social" size={16} color="#0F766E" />
                        <Text style={[styles.dirBtnText, { color: '#0F766E' }]}>Share PDF</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
            <View style={{ height: 100 }} />
          </ScrollView>
        </View>
      ) : (
        <ScrollView style={styles.settingsContent} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{shopName.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.shopNameText}>{shopName}</Text>
        <Text style={styles.emailSubText}>{emailAddress}</Text>

        <View style={isEmployee ? styles.roleBadgeEmp : styles.roleBadgeAdmin}>
          <Ionicons
            name={isEmployee ? 'id-card-outline' : 'shield-checkmark-outline'}
            size={13}
            color={isEmployee ? '#059669' : '#0F766E'}
          />
          <Text style={isEmployee ? styles.roleBadgeTextEmp : styles.roleBadgeTextAdmin}>
            {roleTitle.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Account Information Card */}
      <View style={styles.detailsCard}>
        <Text style={styles.cardHeader}>Account Information</Text>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Shop Name</Text>
          <Text style={styles.detailValue}>{shopName}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Role Access</Text>
          <Text style={styles.detailValue}>{roleTitle} {isEmployee ? `(${user?.emp_id || 'ID'})` : '(Full Administrative Access)'}</Text>
        </View>

        <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
          <Text style={styles.detailLabel}>Email Address</Text>
          <Text style={styles.detailValue}>{emailAddress}</Text>
        </View>
      </View>

      {/* Security & Credentials Card */}
      <View style={styles.actionsCard}>
        <Text style={styles.cardHeader}>Security & Credentials</Text>

        {/* Change Password on Server */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => setIsPassModalOpen(true)}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIconWrap, { backgroundColor: '#ECFDF5' }]}>
            <Ionicons name="key" size={18} color="#059669" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.actionTitle}>Change Account Password</Text>
            <Text style={styles.actionSub}>Updates password directly on server database</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
        </TouchableOpacity>

        {/* Change App PIN */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => setIsPinModalOpen(true)}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIconWrap, { backgroundColor: '#CCFBF1' }]}>
            <Ionicons name="keypad" size={18} color="#0F766E" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.actionTitle}>Change App PIN</Text>
            <Text style={styles.actionSub}>Set a new 4-digit quick unlock PIN</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      {/* Shop Employees / Staff Section */}
      {!isEmployee && (
        <View style={[styles.actionsCard, { marginTop: 16 }]}>
          <View style={styles.cardHeaderWithAction}>
            <View>
              <Text style={styles.cardHeader}>Shop Employees ({employees.length})</Text>
              <Text style={styles.cardHeaderSub}>Staff members authorized for POS & stock</Text>
            </View>
            <TouchableOpacity
              style={styles.addEmpHeaderBtn}
              onPress={() => {
                const nextNum = employees.length + 101;
                setNewEmpId(`EMP${nextNum}`);
                setIsAddEmpModalOpen(true);
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="person-add" size={14} color="#FFFFFF" />
              <Text style={styles.addEmpHeaderBtnText}>+ Add Staff</Text>
            </TouchableOpacity>
          </View>

          {loadingEmployees ? (
            <ActivityIndicator size="small" color="#0F766E" style={{ marginVertical: 14 }} />
          ) : employees.length === 0 ? (
            <View style={styles.emptyEmpWrap}>
              <Ionicons name="people-outline" size={28} color="#94A3B8" />
              <Text style={styles.emptyEmpText}>No employees registered yet.</Text>
              <TouchableOpacity
                style={styles.addEmpFirstBtn}
                onPress={() => {
                  setNewEmpId('EMP101');
                  setIsAddEmpModalOpen(true);
                }}
              >
                <Text style={styles.addEmpFirstBtnText}>+ Add First Employee</Text>
              </TouchableOpacity>
            </View>
          ) : (
            employees.map((emp) => (
              <View key={emp.emp_id || emp.id} style={styles.empRow}>
                <View style={styles.empAvatar}>
                  <Text style={styles.empAvatarText}>{(emp.name || 'E').charAt(0).toUpperCase()}</Text>
                </View>

                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.empName}>{emp.name}</Text>
                  <View style={styles.empMetaRow}>
                    <View style={styles.empIdBadge}>
                      <Text style={styles.empIdBadgeText}>{emp.emp_id}</Text>
                    </View>
                    <View style={styles.empCodeBadge}>
                      <Ionicons name="keypad" size={10} color="#0F766E" />
                      <Text style={styles.empCodeBadgeText}>PIN: {emp.code}</Text>
                    </View>
                    {emp.phone ? (
                      <Text style={styles.empPhoneText}>• {emp.phone}</Text>
                    ) : null}
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.delEmpBtn}
                  onPress={() => handleDeleteEmployee(emp)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={16} color="#DC2626" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      )}

      {/* App Session Actions */}
      <View style={[styles.actionsCard, { marginTop: 16 }]}>
        <Text style={styles.cardHeader}>Session Actions</Text>

        <TouchableOpacity style={styles.actionBtn} onPress={onLockApp} activeOpacity={0.7}>
          <View style={[styles.actionIconWrap, { backgroundColor: '#F1F5F9' }]}>
            <Ionicons name="lock-closed" size={18} color="#475569" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.actionTitle}>Lock App Now</Text>
            <Text style={styles.actionSub}>Require 4-digit PIN to access session</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={handleConfirmLogout} activeOpacity={0.7}>
          <View style={[styles.actionIconWrap, { backgroundColor: '#FEE2E2' }]}>
            <Ionicons name="log-out" size={18} color="#DC2626" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.actionTitle, { color: '#DC2626' }]}>Log Out Account</Text>
            <Text style={styles.actionSub}>Sign out and return to login screen</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      {/* MODAL: Change App PIN */}
      <Modal visible={isPinModalOpen} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={[styles.actionIconWrap, { backgroundColor: '#CCFBF1' }]}>
                <Ionicons name="keypad" size={20} color="#0F766E" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Change 4-Digit PIN</Text>
                <Text style={styles.modalSubtitle}>Quick unlock PIN for app session</Text>
              </View>
              <TouchableOpacity onPress={() => setIsPinModalOpen(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>New 4-Digit PIN</Text>
              <TextInput
                style={styles.inputField}
                placeholder="e.g. 1234"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                maxLength={4}
                secureTextEntry
                value={newPin}
                onChangeText={setNewPin}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirm New PIN</Text>
              <TextInput
                style={styles.inputField}
                placeholder="Re-enter 4-digit PIN"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                maxLength={4}
                secureTextEntry
                value={confirmPin}
                onChangeText={setConfirmPin}
              />
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsPinModalOpen(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleSavePin}
                disabled={isUpdatingPin}
              >
                {isUpdatingPin ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>Update PIN</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL: Change Server Password */}
      <Modal visible={isPassModalOpen} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={[styles.actionIconWrap, { backgroundColor: '#ECFDF5' }]}>
                <Ionicons name="key" size={20} color="#059669" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Change Server Password</Text>
                <Text style={styles.modalSubtitle}>Saves directly to server account</Text>
              </View>
              <TouchableOpacity onPress={() => setIsPassModalOpen(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>New Password</Text>
              <View style={styles.passInputWrap}>
                <TextInput
                  style={[styles.inputField, { flex: 1, borderWidth: 0 }]}
                  placeholder="Enter new strong password"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showPassword}
                  value={newPassword}
                  onChangeText={setNewPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 10 }}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="#64748B" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirm New Password</Text>
              <TextInput
                style={styles.inputField}
                placeholder="Re-type new password"
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsPassModalOpen(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: '#059669' }]}
                onPress={handleSavePassword}
                disabled={isUpdatingPass}
              >
                {isUpdatingPass ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>Save to Server</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL: Add Shop Employee */}
      <Modal visible={isAddEmpModalOpen} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={[styles.actionIconWrap, { backgroundColor: '#EEF2FF' }]}>
                <Ionicons name="person-add" size={20} color="#4338CA" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Add Shop Employee</Text>
                <Text style={styles.modalSubtitle}>Create new staff member access</Text>
              </View>
              <TouchableOpacity onPress={() => setIsAddEmpModalOpen(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Employee ID (e.g. EMP101) *</Text>
              <TextInput
                style={styles.inputField}
                placeholder="e.g. EMP101"
                placeholderTextColor="#94A3B8"
                autoCapitalize="characters"
                value={newEmpId}
                onChangeText={setNewEmpId}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Staff Full Name *</Text>
              <TextInput
                style={styles.inputField}
                placeholder="e.g. Rahul Sharma"
                placeholderTextColor="#94A3B8"
                value={newEmpName}
                onChangeText={setNewEmpName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>4-Digit Login PIN / Code *</Text>
              <TextInput
                style={styles.inputField}
                placeholder="e.g. 1234"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                maxLength={4}
                value={newEmpCode}
                onChangeText={setNewEmpCode}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone Number (Optional)</Text>
              <TextInput
                style={styles.inputField}
                placeholder="e.g. 9876543210"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                value={newEmpPhone}
                onChangeText={setNewEmpPhone}
              />
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsAddEmpModalOpen(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: '#4338CA' }]}
                onPress={handleAddEmployee}
                disabled={isSavingEmp}
              >
                {isSavingEmp ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>Save Employee</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      </ScrollView>
      )}
    </View>
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
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    margin: 16,
    marginBottom: 0,
    padding: 4,
  },
  topTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  topTabBtnActive: {
    backgroundColor: '#0F172A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  topTabBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  topTabBtnTextActive: {
    color: '#FFFFFF',
  },
  directoryContainer: {
    flex: 1,
    padding: 16,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    marginLeft: 8,
    color: '#0F172A',
    fontSize: 14,
  },
  filterPills: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterPillActive: {
    backgroundColor: '#CCFBF1',
    borderColor: '#0F766E',
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  filterPillTextActive: {
    color: '#0F766E',
  },
  directoryList: {
    flex: 1,
  },
  dirCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dirCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dirName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  dirPhone: {
    fontSize: 13,
    color: '#475569',
  },
  dirBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  dirBadgeSale: {
    backgroundColor: '#EEF2FF',
  },
  dirBadgePur: {
    backgroundColor: '#FFFBEB',
  },
  dirBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  dirBadgeTextSale: {
    color: '#4338CA',
  },
  dirBadgeTextPur: {
    color: '#D97706',
  },
  dirDetails: {
    gap: 6,
    marginBottom: 16,
  },
  dirDetailText: {
    fontSize: 13,
    color: '#475569',
  },
  dirActions: {
    flexDirection: 'row',
    gap: 12,
  },
  dirBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  dirBtnPrint: {
    backgroundColor: '#0F766E',
  },
  dirBtnShare: {
    backgroundColor: '#ECFDF5',
  },
  dirBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 40,
    padding: 20,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 30,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  shopNameText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  emailSubText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
  },
  roleBadgeAdmin: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#99F6E4',
    marginTop: 10,
  },
  roleBadgeTextAdmin: {
    color: '#0F766E',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  roleBadgeEmp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginTop: 10,
  },
  roleBadgeTextEmp: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  detailRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  detailLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 3,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  actionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  actionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  actionSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  inputField: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#0F172A',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  passInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 12,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 14,
  },
  submitBtn: {
    flex: 1,
    backgroundColor: '#0F172A',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  // Staff & Employee Styles
  cardHeaderWithAction: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  addEmpHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addEmpHeaderBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  emptyEmpWrap: {
    paddingVertical: 20,
    alignItems: 'center',
    gap: 8,
  },
  emptyEmpText: {
    fontSize: 13,
    color: '#64748B',
  },
  addEmpFirstBtn: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  addEmpFirstBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  empRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  empAvatar: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  empAvatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  empName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  empMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
    flexWrap: 'wrap',
  },
  empIdBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  empIdBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4338CA',
  },
  empCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  empCodeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0F766E',
  },
  empPhoneText: {
    fontSize: 11,
    color: '#64748B',
  },
  delEmpBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
  },
});
