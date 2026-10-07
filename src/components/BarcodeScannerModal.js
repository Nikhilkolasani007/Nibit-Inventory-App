// src/components/BarcodeScannerModal.js - Live Camera Barcode/IMEI Scanner & Image Picker
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';

export default function BarcodeScannerModal({
  visible,
  onClose,
  onScan,
  title = 'Scan Barcode / IMEI'
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [torch, setTorch] = useState(false);

  useEffect(() => {
    if (visible) {
      setScanned(false);
      setManualCode('');
      if (!permission?.granted && requestPermission) {
        requestPermission();
      }
    }
  }, [visible]);

  const handleBarcodeScanned = ({ data }) => {
    if (scanned || !data) return;
    setScanned(true);
    const cleanData = String(data).trim();
    if (onScan) onScan(cleanData);
    onClose();
  };

  const handleManualSubmit = () => {
    const clean = manualCode.trim();
    if (!clean) {
      Alert.alert('Empty Code', 'Please enter a barcode or IMEI number.');
      return;
    }
    if (onScan) onScan(clean);
    onClose();
  };

  // Option to take a photo of the barcode label
  const handlePickBarcodeImage = async () => {
    try {
      const res = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });
      if (!res.canceled && res.assets && res.assets[0]) {
        Alert.prompt
          ? Alert.prompt(
              'Barcode Photo Captured',
              'Confirm or enter the IMEI / Serial visible on the photo:',
              (val) => {
                if (val && val.trim()) {
                  if (onScan) onScan(val.trim());
                  onClose();
                }
              }
            )
          : Alert.alert(
              'Photo Saved',
              'Please enter the IMEI visible on the device below in the text field.',
              [{ text: 'OK' }]
            );
      }
    } catch (e) {
      console.warn('Image picker error:', e);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Top Header Bar - Clean White Theme */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
            <Ionicons name="close" size={22} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{title}</Text>
          <TouchableOpacity
            onPress={() => setTorch(!torch)}
            style={[styles.headerBtn, torch && styles.headerBtnActive]}
          >
            <Ionicons name={torch ? 'flash' : 'flash-off'} size={20} color={torch ? '#D97706' : '#64748B'} />
          </TouchableOpacity>
        </View>

        {/* Camera Viewfinder Area */}
        <View style={styles.cameraContainer}>
          {permission === null ? (
            <View style={styles.permissionFallback}>
              <ActivityIndicator size="large" color="#0F172A" />
              <Text style={styles.permissionText}>Initializing Camera...</Text>
            </View>
          ) : permission.granted ? (
            <CameraView
              style={StyleSheet.absoluteFillObject}
              facing="back"
              enableTorch={torch}
              barcodeScannerSettings={{
                barcodeTypes: [
                  'qr',
                  'ean13',
                  'ean8',
                  'code128',
                  'code39',
                  'upc_a',
                  'upc_e'
                ],
              }}
              onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
            />
          ) : (
            <View style={styles.permissionFallback}>
              <Ionicons name="camera-outline" size={54} color="#64748B" />
              <Text style={styles.permissionText}>Camera permission is needed to scan barcodes.</Text>
              <TouchableOpacity style={styles.grantBtn} onPress={requestPermission}>
                <Text style={styles.grantBtnText}>Allow Camera Access</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Scanner Reticle Overlay */}
          <View style={styles.overlay} pointerEvents="none">
            <View style={styles.reticle}>
              <View style={[styles.corner, styles.tl]} />
              <View style={[styles.corner, styles.tr]} />
              <View style={[styles.corner, styles.bl]} />
              <View style={[styles.corner, styles.br]} />
              <View style={styles.laserLine} />
            </View>
            <Text style={styles.scanInstruction}>
              Align barcode / IMEI label within the frame
            </Text>
          </View>
        </View>

        {/* Bottom Section - Clean White Theme */}
        <View style={styles.bottomSection}>
          <View style={styles.quickActionRow}>
            <TouchableOpacity style={styles.cameraSnapBtn} onPress={handlePickBarcodeImage}>
              <Ionicons name="camera" size={16} color="#0F172A" />
              <Text style={styles.cameraSnapText}>Capture Photo</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.manualLabel}>Or Enter / Paste IMEI Number</Text>
          <View style={styles.manualInputRow}>
            <TextInput
              style={styles.manualInput}
              placeholder="e.g. 864501060938214"
              placeholderTextColor="#94A3B8"
              value={manualCode}
              onChangeText={setManualCode}
              keyboardType="default"
              autoCapitalize="characters"
            />
            <TouchableOpacity style={styles.submitBtn} onPress={handleManualSubmit}>
              <Ionicons name="checkmark" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 52 : 20,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBtnActive: {
    backgroundColor: '#FEF3C7',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#000000',
    overflow: 'hidden',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reticle: {
    width: 260,
    height: 160,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderColor: '#10B981',
  },
  tl: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4 },
  tr: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4 },
  br: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4 },
  laserLine: {
    width: '90%',
    height: 2,
    backgroundColor: '#EF4444',
  },
  scanInstruction: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 20,
    textAlign: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  permissionFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    backgroundColor: '#F8FAFC',
  },
  permissionText: {
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 16,
    fontWeight: '600',
  },
  grantBtn: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  grantBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  bottomSection: {
    backgroundColor: '#FFFFFF',
    padding: 18,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  quickActionRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  cameraSnapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cameraSnapText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '700',
  },
  manualLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  manualInputRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  manualInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#0F172A',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  submitBtn: {
    backgroundColor: '#0F172A',
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
