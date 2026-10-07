// src/components/SettingsModal.js - Backend server connection and app settings
import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiService, { DEFAULT_API_BASE_URL } from '../services/apiService';

export default function SettingsModal({
  visible,
  onClose,
  isConnected,
  user,
  onUpdatePin,
  onLogout,
  onRefreshAll,
  onResetToDemo
}) {
  const [apiUrl, setApiUrl] = useState(apiService.getBaseUrl());
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [newPin, setNewPin] = useState('');
  const [pinSuccessMsg, setPinSuccessMsg] = useState('');

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      apiService.setBaseUrl(apiUrl);
      const res = await apiService.checkHealth();
      if (res.connected) {
        setTestResult({
          success: true,
          message: 'Connected successfully to PHP REST Backend!',
          data: res.data
        });
        onRefreshAll();
      } else {
        setTestResult({
          success: false,
          message: `Could not reach PHP API at ${apiUrl}. Error: ${res.error || 'Connection timed out'}`
        });
      }
    } catch (e) {
      setTestResult({
        success: false,
        message: e.message
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSetPreset = (url) => {
    setApiUrl(url);
    apiService.setBaseUrl(url);
  };

  const handleSavePin = () => {
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      Alert.alert('Invalid PIN', 'Please enter a 4-digit numeric PIN.');
      return;
    }
    if (onUpdatePin) {
      onUpdatePin(newPin);
      setPinSuccessMsg('PIN successfully updated to ' + newPin);
      setTimeout(() => setPinSuccessMsg(''), 3000);
      setNewPin('');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Nibit Settings</Text>
              <Text style={styles.subtitle}>Configure REST backend & security</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Status Card */}
            <View style={[styles.statusBanner, isConnected ? styles.bannerGreen : styles.bannerAmber]}>
              <Ionicons 
                name={isConnected ? 'checkmark-circle' : 'alert-circle'} 
                size={22} 
                color={isConnected ? '#34D399' : '#FBBF24'} 
              />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[styles.bannerTitle, { color: isConnected ? '#34D399' : '#FBBF24' }]}>
                  {isConnected ? 'nibit.in Live Server is Active' : 'Connecting to nibit.in...'}
                </Text>
                <Text style={styles.bannerSub}>
                  {isConnected
                    ? 'Connected live to https://nibit.in/admin/api.php.'
                    : 'Testing connection to https://nibit.in/admin/api.php.'}
                </Text>
              </View>
            </View>

            {/* User Profile & Security PIN section */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>App Lock PIN (UPI Style)</Text>
              <View style={styles.pinConfigBox}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pinConfigSub}>
                    Account: {user?.role === 'employee' ? `Staff (${user?.emp_id || 'EMP'})` : 'Store Admin'}
                  </Text>
                  <Text style={styles.pinConfigSub}>
                    User: {user?.role === 'employee' ? user?.name : (user?.email || user?.name || 'admin@nibit.com')}
                  </Text>
                  <Text style={styles.pinConfigSub}>
                    Security Code: {user?.pin_code || '1234'}
                  </Text>
                </View>
              </View>

              <View style={styles.changePinRow}>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  placeholder="New 4-digit PIN"
                  placeholderTextColor="#64748B"
                  keyboardType="numeric"
                  maxLength={4}
                  value={newPin}
                  onChangeText={setNewPin}
                />
                <TouchableOpacity style={styles.savePinBtn} onPress={handleSavePin}>
                  <Text style={styles.savePinText}>Update PIN</Text>
                </TouchableOpacity>
              </View>

              {pinSuccessMsg ? (
                <Text style={styles.pinSuccessText}>{pinSuccessMsg}</Text>
              ) : null}
            </View>

            {/* API URL Config */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Live API URL</Text>
              <TextInput
                style={styles.input}
                value={apiUrl}
                onChangeText={setApiUrl}
                placeholder="https://nibit.in/shouky_app/api.php"
                placeholderTextColor="#64748B"
                autoCapitalize="none"
              />

              {/* URL Quick Presets */}
              <View style={styles.presetsRow}>
                <TouchableOpacity 
                  style={[styles.presetChip, { borderColor: '#10B981', backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}
                  onPress={() => handleSetPreset('https://nibit.in/shouky_app/api.php')}
                >
                  <Text style={[styles.presetText, { color: '#34D399' }]}>⚡ nibit.in/shouky_app/api.php (Recommended)</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.presetChip}
                  onPress={() => handleSetPreset('https://nibit.in/admin/api.php')}
                >
                  <Text style={styles.presetText}>🌐 nibit.in/admin/api.php</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                style={styles.testBtn} 
                onPress={handleTestConnection}
                disabled={testing}
              >
                {testing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="pulse-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.testBtnText}>Test & Connect to nibit.in</Text>
                  </>
                )}
              </TouchableOpacity>

              {testResult && (
                <View style={[styles.testResultBox, testResult.success ? styles.resultSuccess : styles.resultError]}>
                  <Text style={[styles.resultText, testResult.success ? { color: '#34D399' } : { color: '#F87171' }]}>
                    {testResult.message}
                  </Text>
                </View>
              )}
            </View>

            {/* Reset & Logout Actions */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Account & Data</Text>
              <View style={styles.actionRow}>
                <TouchableOpacity 
                  style={[styles.resetBtn, { borderColor: 'rgba(56, 189, 248, 0.4)', backgroundColor: 'rgba(56, 189, 248, 0.08)' }]}
                  onPress={() => {
                    if (onRefreshAll) onRefreshAll();
                    Alert.alert('Synced', 'Fetched latest data directly from MySQL database.');
                  }}
                >
                  <Ionicons name="cloud-download-outline" size={18} color="#38BDF8" style={{ marginRight: 6 }} />
                  <Text style={[styles.resetBtnText, { color: '#38BDF8' }]}>Sync Database</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.logoutBtn}
                  onPress={() => {
                    onClose();
                    if (onLogout) onLogout();
                  }}
                >
                  <Ionicons name="log-out-outline" size={18} color="#94A3B8" style={{ marginRight: 6 }} />
                  <Text style={styles.logoutBtnText}>Log Out</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          {/* Close button */}
          <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '88%',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    marginBottom: 16,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
  },
  bannerGreen: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  bannerAmber: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  bannerSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  section: {
    marginBottom: 18,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    color: '#0F172A',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginBottom: 10,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  presetChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  presetText: {
    fontSize: 11,
    color: '#0F766E',
    fontWeight: '600',
  },
  testBtn: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  testBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  testResultBox: {
    marginTop: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  resultSuccess: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  resultError: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  resultText: {
    fontSize: 12,
    fontWeight: '600',
  },
  codeSnippetBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  codeText: {
    color: '#64748B',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  cmdText: {
    color: '#0F766E',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pinConfigBox: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pinConfigSub: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
    marginBottom: 2,
  },
  changePinRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  savePinBtn: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savePinText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  pinSuccessText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
  },
  resetBtn: {
    flex: 1,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  resetBtnText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 13,
  },
  logoutBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  logoutBtnText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 13,
  },
  doneBtn: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
