// src/components/TransactionsList.js - Stock movement history log
import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../services/apiService';

export default function TransactionsList({ transactions, onRefresh, isRefreshing }) {
  const handleDelete = (item) => {
    Alert.alert(
      'Move to Recycle Bin',
      `Move movement record for "${item.item_name}" to Recycle Bin? You can restore it anytime.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Move to Bin',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.deleteTransaction(item.id);
              Alert.alert('Moved to Bin 🗑️', 'Transaction movement moved to Recycle Bin.');
              if (onRefresh) onRefresh();
            } catch (err) {
              Alert.alert('Error', err.message || 'Could not delete transaction.');
            }
          }
        }
      ]
    );
  };

  const renderItem = ({ item }) => {
    const isStockIn = item.type === 'IN';
    const isStockOut = item.type === 'OUT';

    const typeConfig = isStockIn
      ? { label: 'STOCK IN', bg: '#ECFDF5', text: '#059669', icon: 'arrow-down-circle' }
      : isStockOut
      ? { label: 'STOCK OUT', bg: '#FEE2E2', text: '#DC2626', icon: 'arrow-up-circle' }
      : { label: 'ADJUSTMENT', bg: '#FEF3C7', text: '#D97706', icon: 'sync' };

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.badge, { backgroundColor: typeConfig.bg }]}>
            <Ionicons name={typeConfig.icon} size={14} color={typeConfig.text} style={{ marginRight: 4 }} />
            <Text style={[styles.badgeText, { color: typeConfig.text }]}>{typeConfig.label}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.timeText}>
              {item.created_at ? new Date(item.created_at).toLocaleString() : 'Just now'}
            </Text>
            <TouchableOpacity
              onPress={() => handleDelete(item)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.txDeleteBtn}
            >
              <Ionicons name="trash-outline" size={15} color="#DC2626" />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.itemName}>{item.item_name || 'Inventory Product'}</Text>

        <View style={styles.detailsRow}>
          <View style={styles.skuTag}>
            <Ionicons name="barcode-outline" size={12} color="#64748B" />
            <Text style={styles.skuText}>{item.sku}</Text>
          </View>

          <View style={styles.qtyChangeBox}>
            <Text style={[styles.deltaText, isStockIn ? { color: '#059669' } : { color: '#DC2626' }]}>
              {isStockIn ? '+' : '-'}{item.quantity} units
            </Text>
          </View>
        </View>

        <View style={styles.metaFooter}>
          <Text style={styles.reasonText}>Reason: {item.reason || 'Manual Adjustment'}</Text>
          <Text style={styles.stockLevelText}>
            {item.previous_quantity} → {item.new_quantity}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Movement History</Text>
          <Text style={styles.subtitle}>{transactions.length} Recorded Movements</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
          <Ionicons name="refresh" size={16} color="#0F172A" />
        </TouchableOpacity>
      </View>

      {transactions.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={48} color="#94A3B8" />
          <Text style={styles.emptyTitle}>No Movements Recorded Yet</Text>
          <Text style={styles.emptySub}>{"Adjust any item's stock to see recorded audits here."}</Text>
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item, index) => String(item.id || index)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
  refreshBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  listContent: {
    paddingBottom: 40,
    gap: 10,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  timeText: {
    fontSize: 11,
    color: '#64748B',
  },
  itemName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  skuTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  skuText: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '600',
  },
  qtyChangeBox: {},
  deltaText: {
    fontSize: 15,
    fontWeight: '800',
  },
  metaFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  reasonText: {
    fontSize: 11,
    color: '#64748B',
    fontStyle: 'italic',
  },
  stockLevelText: {
    fontSize: 11,
    color: '#0F172A',
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },
  txDeleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
