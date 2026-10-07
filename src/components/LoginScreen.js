// src/components/LoginScreen.js - Authentication screen with Admin (Email & Password) and Employee (Emp ID & 4-Digit Code) login
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../services/apiService';

export default function LoginScreen({ onLoginSuccess }) {
  // Mode: 'admin' | 'employee'
  const [authMode, setAuthMode] = useState('admin');

  // Admin Credentials (matching MOBILE MANAGEMENT APPS on nibit.in)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [website, setWebsite] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Employee Credentials (empid + 4-digit code)
  const [empId, setEmpId] = useState('');
  const [empPin, setEmpPin] = useState('');
  const [showEmpPin, setShowEmpPin] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Handle Admin Login (Email & Password from MOBILE MANAGEMENT APPS grid)
  const handleAdminLogin = async () => {
    setErrorMessage('');
    const cleanEmail = email.trim();
    const cleanPass = password.trim();
    const cleanWeb = website.trim();

    if (!cleanEmail || !cleanPass) {
      setErrorMessage('Please enter both Email and Password.');
      return;
    }

    setLoading(true);

    try {
      const res = await apiService.verifyUserAndExtractData(cleanEmail, cleanPass, cleanWeb);
      if (res && res.verified && res.user) {
        onLoginSuccess(res.user, apiService.getBaseUrl(), res.records || []);
        return;
      }
    } catch (e) {
      setErrorMessage(e.message || 'Invalid Email or Password! Please verify your credentials against the application grid.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Employee Login (empid + 4-digit code)
  const handleEmployeeLogin = async () => {
    setErrorMessage('');
    const cleanEmpId = empId.trim().toUpperCase();
    const cleanPin = empPin.trim();

    if (!cleanEmpId || !cleanPin) {
      setErrorMessage('Please enter both Employee ID and 4-digit code.');
      return;
    }

    if (cleanPin.length !== 4 || !/^\d{4}$/.test(cleanPin)) {
      setErrorMessage('Security code must be exactly 4 numeric digits.');
      return;
    }

    setLoading(true);

    try {
      const res = await apiService.employeeLogin(cleanEmpId, cleanPin);
      if (res && res.verified && res.user) {
        onLoginSuccess(res.user, apiService.getBaseUrl(), res.records || []);
        return;
      }
    } catch (e) {
      setErrorMessage(e.message || 'Invalid Employee ID or 4-digit code. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Logo and Brand Header */}
        <View style={styles.brandHeader}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.brandTitle}>Nibit Inventory</Text>
          <Text style={styles.brandSubtitle}>Enterprise Warehouse & Stock Management</Text>
        </View>

        {/* Form Card */}
        <View style={styles.formCard}>
          {/* Top Tab Switcher: Admin Portal vs Employee Login */}
          <View style={styles.tabsRow}>
            <TouchableOpacity
              style={[styles.tabBtn, authMode === 'admin' && styles.tabBtnActive]}
              onPress={() => {
                setAuthMode('admin');
                setErrorMessage('');
              }}
              activeOpacity={0.8}
            >
              <Ionicons
                name="shield-checkmark"
                size={16}
                color={authMode === 'admin' ? '#0F172A' : '#94A3B8'}
              />
              <Text style={[styles.tabBtnText, authMode === 'admin' && styles.tabBtnTextActive]}>
                Admin Login
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, authMode === 'employee' && styles.tabBtnActive]}
              onPress={() => {
                setAuthMode('employee');
                setErrorMessage('');
              }}
              activeOpacity={0.8}
            >
              <Ionicons
                name="person-circle"
                size={17}
                color={authMode === 'employee' ? '#10B981' : '#94A3B8'}
              />
              <Text style={[styles.tabBtnText, authMode === 'employee' && styles.tabBtnTextActive]}>
                Emp Login
              </Text>
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>PIN</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Form Header Info */}
          <View style={styles.formHeaderBlock}>
            <Text style={styles.formHeader}>
              {authMode === 'admin' ? 'Admin Sign In' : 'Employee Sign In'}
            </Text>
            <Text style={styles.formSub}>
              {authMode === 'admin'
                ? 'Authenticate with your store account credentials'
                : 'Enter your Employee ID and 4-digit security code'}
            </Text>
          </View>

          {/* Error Banner */}
          {errorMessage ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color="#EF4444" />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* ======================================================== */}
          {/* OPTION A: ADMIN LOGIN (Email & Password from app_records) */}
          {/* ======================================================== */}
          {authMode === 'admin' && (
            <View>
              {/* Field 1: Email Address */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>EMAIL ADDRESS *</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="mail-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="shouky@gmail.com"
                    placeholderTextColor="#64748B"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Field 2: Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>PASSWORD *</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    placeholderTextColor="#64748B"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeBtn}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color="#94A3B8"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Field 3: Website Link (Optional) */}
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>WEBSITE</Text>
                  <Text style={styles.optionalTag}>OPTIONAL</Text>
                </View>
                <View style={styles.inputWrapper}>
                  <Ionicons name="globe-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="shouky.com (optional)"
                    placeholderTextColor="#64748B"
                    value={website}
                    onChangeText={setWebsite}
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={styles.loginBtn}
                onPress={handleAdminLogin}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.loginBtnText}>Log In as Admin</Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
                  </>
                )}
              </TouchableOpacity>

              {/* Switch to Employee Login */}
              <TouchableOpacity
                style={styles.switchModeBtn}
                onPress={() => {
                  setAuthMode('employee');
                  setErrorMessage('');
                }}
              >
                <Ionicons name="person-outline" size={15} color="#10B981" />
                <Text style={styles.switchModeBtnText}>
                  Staff Member? <Text style={styles.switchModeHighlight}>Switch to Employee Login (Emp ID & PIN)</Text> →
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ======================================================== */}
          {/* OPTION B: EMPLOYEE LOGIN (empid + 4-digit code)          */}
          {/* ======================================================== */}
          {authMode === 'employee' && (
            <View>
              {/* Field 1: Employee ID (empid) */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>EMPLOYEE ID (EMPID) *</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="card-outline" size={18} color="#10B981" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { letterSpacing: 1.5, fontWeight: '700' }]}
                    placeholder="EMP101"
                    placeholderTextColor="#64748B"
                    value={empId}
                    onChangeText={(val) => setEmpId(val.toUpperCase())}
                    autoCapitalize="characters"
                  />
                  {empId.length > 0 && (
                    <TouchableOpacity onPress={() => setEmpId('')} style={styles.eyeBtn}>
                      <Ionicons name="close-circle" size={18} color="#94A3B8" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Field 2: 4-Digit Security Code */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>4-DIGIT SECURITY CODE *</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="keypad-outline" size={18} color="#10B981" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { letterSpacing: 4, fontWeight: '800' }]}
                    placeholder="••••"
                    placeholderTextColor="#64748B"
                    value={empPin}
                    onChangeText={(val) => setEmpPin(val.replace(/\D/g, '').slice(0, 4))}
                    keyboardType="number-pad"
                    maxLength={4}
                    secureTextEntry={!showEmpPin}
                  />
                  <TouchableOpacity
                    onPress={() => setShowEmpPin(!showEmpPin)}
                    style={styles.eyeBtn}
                  >
                    <Ionicons
                      name={showEmpPin ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color="#94A3B8"
                    />
                  </TouchableOpacity>
                </View>

                {/* Visual 4-Digit Pin Dots Indicator */}
                <View style={styles.pinDotsRow}>
                  {[0, 1, 2, 3].map((idx) => {
                    const isFilled = empPin.length > idx;
                    return (
                      <View
                        key={idx}
                        style={[
                          styles.pinDotIndicator,
                          isFilled && styles.pinDotIndicatorFilled
                        ]}
                      >
                        {isFilled && showEmpPin && (
                          <Text style={styles.pinDotChar}>{empPin[idx]}</Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* Submit Button for Employee */}
              <TouchableOpacity
                style={[styles.loginBtn, styles.empLoginBtn]}
                onPress={handleEmployeeLogin}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.loginBtnText}>Log In as Employee</Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
                  </>
                )}
              </TouchableOpacity>

              {/* Switch to Admin Login */}
              <TouchableOpacity
                style={styles.switchModeBtn}
                onPress={() => {
                  setAuthMode('admin');
                  setErrorMessage('');
                }}
              >
                <Ionicons name="shield-outline" size={15} color="#0F172A" />
                <Text style={styles.switchModeBtnText}>
                  Need Admin Access? <Text style={[styles.switchModeHighlight, { color: '#0F172A' }]}>Switch to Admin Login</Text> →
                </Text>
              </TouchableOpacity>
            </View>
          )}

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 44 : 32,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    width: 68,
    height: 68,
    borderRadius: 18,
    marginBottom: 12,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 4,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabBtnText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
  },
  tabBtnTextActive: {
    color: '#0F172A',
  },
  newBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  newBadgeText: {
    color: '#059669',
    fontSize: 9,
    fontWeight: '800',
  },
  formHeaderBlock: {
    marginBottom: 16,
  },
  formHeader: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  formSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  inputGroup: {
    marginBottom: 14,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  optionalTag: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 14,
    height: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#0F172A',
    fontSize: 14,
  },
  eyeBtn: {
    padding: 6,
  },
  pinDotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
  },
  pinDotIndicator: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinDotIndicatorFilled: {
    borderColor: '#059669',
    backgroundColor: '#ECFDF5',
  },
  pinDotChar: {
    color: '#059669',
    fontWeight: '800',
    fontSize: 13,
  },
  demoSection: {
    marginTop: 4,
    marginBottom: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  demoTitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
    marginBottom: 8,
  },
  demoPills: {
    gap: 6,
  },
  demoPill: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  demoPillEmp: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  demoPillText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '600',
  },
  demoPillTextEmp: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '600',
  },
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    height: 52,
    borderRadius: 14,
    marginTop: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  empLoginBtn: {
    backgroundColor: '#059669',
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  switchModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    paddingVertical: 6,
    gap: 6,
  },
  switchModeBtnText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  switchModeHighlight: {
    color: '#059669',
    fontWeight: '700',
  },
});
