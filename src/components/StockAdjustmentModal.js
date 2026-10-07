// src/components/StockAdjustmentModal.js - Quick stock movement modal
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getImageUrl } from '../services/apiService';

export default function StockAdjustmentModal({
  visible,
  onClose,
  item,
  onConfirm
}) {
  const [type, setType] = useState('IN'); // 'IN' or 'OUT' or 'ADJUSTMENT'
  const [quantity, setQuantity] = useState('1');
  const [reason, setReason] = useState('');

  const currentStock = item ? (parseInt(item.quantity, 10) || 0) : 0;
  const itemPhoto = item ? getImageUrl(item.images) : null;

  useEffect(() => {
    if (visible) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setType('IN');
      setQuantity('1');
      setReason('');
    }
  }, [visible, item]);

  if (!item) return null;

  const quickReasons = {
    IN: ['New Supplier Delivery', 'Return from Customer', 'Inventory Count Adjustment', 'Transferred in'],
    OUT: ['Customer Order / Sale', 'Damaged / Expired Goods', 'Internal Warehouse Usage', 'Returned to Vendor'],
    ADJUSTMENT: ['Physical Stock Count Audit', 'Cycle Count Reconcile']
  };

  const calculateNewStock = () => {
    const qty = parseInt(quantity, 10) || 0;
    if (type === 'IN') return currentStock + qty;
    if (type === 'OUT') return Math.max(0, currentStock - qty);
    if (type === 'ADJUSTMENT') return qty;
    return currentStock;
  };

  const handleConfirm = () => {
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Invalid Quantity', 'Please enter a valid quantity greater than 0.');
      return;
    }

    if (type === 'OUT' && qty > currentStock) {
      Alert.alert('Insufficient Stock', `You cannot remove ${qty} units. Current stock is ${currentStock}.`);
      return;
    }

    if (item.imei && item.imei.trim() && (type === 'IN' || (type === 'ADJUSTMENT' && qty > 1))) {
      Alert.alert(
        'Unique IMEI Device',
        `This device is tracked with a unique IMEI (${item.imei}). Increasing quantity would cause duplicate units under the same IMEI.\n\nTo add another unit of this model, please use "+ Add" in the top bar to record its unique IMEI.`
      );
      return;
    }

    const finalReason = reason.trim() || (type === 'IN' ? 'Stock Restock' : type === 'OUT' ? 'Stock Dispatch' : 'Audit Adjustment');
    onConfirm(item, type, qty, finalReason);
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeftCol}>
              {itemPhoto ? (
                <Image source={{ uri: itemPhoto }} style={styles.headerPhoto} resizeMode="cover" />
              ) : (
                <View style={styles.headerPhotoPlaceholder}>
                  <Ionicons
                    name={item.category === 'Mobile' ? 'phone-portrait-outline' : 'cube-outline'}
                    size={20}
                    color="#94A3B8"
                  />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>Stock Adjustment</Text>
                <Text style={styles.subtitle} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.skuText}>SKU: {item.sku}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Type Selector Tabs */}
          <View style={styles.typeTabs}>
            <TouchableOpacity
              style={[styles.typeTab, type === 'IN' && styles.typeTabActiveIn]}
              onPress={() => setType('IN')}
            >
              <Ionicons name="arrow-down-circle" size={16} color={type === 'IN' ? '#10B981' : '#94A3B8'} />
              <Text style={[styles.typeTabText, type === 'IN' && { color: '#10B981', fontWeight: '700' }]}>
                Stock In (+)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.typeTab, type === 'OUT' && styles.typeTabActiveOut]}
              onPress={() => setType('OUT')}
            >
              <Ionicons name="arrow-up-circle" size={16} color={type === 'OUT' ? '#EF4444' : '#94A3B8'} />
              <Text style={[styles.typeTabText, type === 'OUT' && { color: '#EF4444', fontWeight: '700' }]}>
                Stock Out (-)
              </Text>
            </TouchableOpacity>
          </View>

          {/* Current vs Projected preview banner */}
          <View style={styles.previewBanner}>
            <View style={styles.previewCol}>
              <Text style={styles.previewLabel}>Current Stock</Text>
              <Text style={styles.previewVal}>{currentStock}</Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color="#64748B" />
            <View style={styles.previewCol}>
              <Text style={styles.previewLabel}>Projected Stock</Text>
              <Text style={[styles.previewVal, { color: type === 'IN' ? '#34D399' : '#F87171' }]}>
                {calculateNewStock()}
              </Text>
            </View>
          </View>

          {/* Quantity Input with Quick Buttons */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Quantity to {type === 'IN' ? 'Add' : 'Remove'}</Text>
            <View style={styles.qtyRow}>
              <TouchableOpacity 
                style={styles.stepBtn}
                onPress={() => setQuantity(String(Math.max(1, (parseInt(quantity, 10) || 1) - 1)))}
              >
                <Ionicons name="remove" size={18} color="#F8FAFC" />
              </TouchableOpacity>

              <TextInput
                style={styles.qtyInput}
                keyboardType="numeric"
                value={quantity}
                onChangeText={setQuantity}
                textAlign="center"
              />

              <TouchableOpacity 
                style={styles.stepBtn}
                onPress={() => setQuantity(String((parseInt(quantity, 10) || 0) + 1))}
              >
                <Ionicons name="add" size={18} color="#F8FAFC" />
              </TouchableOpacity>
            </View>

            {/* Quick increment pills (+5, +10, +25, +50) */}
            <View style={styles.quickPillsRow}>
              {[5, 10, 25, 50].map((num) => (
                <TouchableOpacity
                  key={num}
                  style={styles.quickPill}
                  onPress={() => setQuantity(String(num))}
                >
                  <Text style={styles.quickPillText}>+{num}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Reason notes & presets */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Reason / Note</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Purchase order PO-4521"
              placeholderTextColor="#64748B"
              value={reason}
              onChangeText={setReason}
            />

            <View style={styles.reasonPills}>
              {quickReasons[type]?.map((preset) => (
                <TouchableOpacity
                  key={preset}
                  style={styles.presetPill}
                  onPress={() => setReason(preset)}
                >
                  <Text style={styles.presetText}>{preset}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Actions */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.confirmBtn, type === 'IN' ? styles.btnGreen : styles.btnRed]} 
              onPress={handleConfirm}
            >
              <Text style={styles.confirmBtnText}>
                {type === 'IN' ? 'Confirm Stock In' : 'Confirm Stock Out'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 10,
  },
  headerPhoto: {
    width: 48,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#0F172A',
  },
  headerPhotoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F766E',
    marginTop: 2,
  },
  skuText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeTabs: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    gap: 6,
  },
  typeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  typeTabActiveIn: {
    backgroundColor: '#ECFDF5',
  },
  typeTabActiveOut: {
    backgroundColor: '#FEE2E2',
  },
  typeTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  previewBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  previewCol: {
    alignItems: 'center',
  },
  previewLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 2,
  },
  previewVal: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  quickPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  quickPill: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickPillText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    color: '#0F172A',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  reasonPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  presetPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  presetText: {
    fontSize: 10,
    color: '#475569',
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  cancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 13,
  },
  confirmBtn: {
    flex: 2,
    height: 46,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnGreen: {
    backgroundColor: '#059669',
  },
  btnRed: {
    backgroundColor: '#DC2626',
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
