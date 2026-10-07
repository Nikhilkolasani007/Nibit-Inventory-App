// src/components/AnalyticsView.js - Inventory analytics and valuation reports
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function AnalyticsView({ items, categories, onSelectLowStockItem }) {
  const totalUnits = items.reduce((acc, it) => acc + (parseInt(it.quantity, 10) || 0), 0);
  const totalCost = items.reduce((acc, it) => {
    return acc + ((parseInt(it.quantity, 10) || 0) * (parseFloat(it.cost_price) || 0));
  }, 0);
  const totalRetail = items.reduce((acc, it) => {
    return acc + ((parseInt(it.quantity, 10) || 0) * (parseFloat(it.selling_price) || 0));
  }, 0);
  const profitMargin = totalCost > 0 ? (((totalRetail - totalCost) / totalRetail) * 100).toFixed(1) : '0.0';
  const potentialProfit = Math.max(0, totalRetail - totalCost);

  // Group by category
  const categoryStats = categories.map((cat) => {
    const catItems = items.filter(it => it.category === cat.name);
    const units = catItems.reduce((acc, it) => acc + (parseInt(it.quantity, 10) || 0), 0);
    const value = catItems.reduce((acc, it) => acc + ((parseInt(it.quantity, 10) || 0) * (parseFloat(it.selling_price) || 0)), 0);
    return {
      name: cat.name,
      count: catItems.length,
      units,
      value,
      percentage: totalRetail > 0 ? ((value / totalRetail) * 100).toFixed(0) : 0
    };
  }).filter(c => c.count > 0);

  // Low stock urgent list
  const criticalItems = items.filter(it => {
    const qty = parseInt(it.quantity, 10) || 0;
    const thresh = parseInt(it.min_threshold, 10) || 5;
    return qty <= thresh;
  }).sort((a, b) => parseInt(a.quantity, 10) - parseInt(b.quantity, 10));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Title */}
      <View style={styles.header}>
        <Text style={styles.title}>Inventory Intelligence</Text>
        <Text style={styles.subtitle}>Financial health & stock turnover metrics</Text>
      </View>

      {/* Hero Financial Valuation Card */}
      <View style={styles.valuationCard}>
        <View style={styles.valuationHeader}>
          <Text style={styles.valTitle}>Total Retail Value</Text>
          <View style={styles.marginPill}>
            <Ionicons name="trending-up" size={14} color="#059669" />
            <Text style={styles.marginText}>{profitMargin}% Est. Margin</Text>
          </View>
        </View>

        <Text style={styles.mainAmount}>Rs {totalRetail.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</Text>

        <View style={styles.valBreakdown}>
          <View style={styles.valCol}>
            <Text style={styles.valSubLabel}>Total Asset Cost</Text>
            <Text style={styles.valSubValue}>Rs {totalCost.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</Text>
          </View>

          <View style={styles.valDivider} />

          <View style={styles.valCol}>
            <Text style={styles.valSubLabel}>Est. Gross Profit</Text>
            <Text style={[styles.valSubValue, { color: '#059669' }]}>+Rs {potentialProfit.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</Text>
          </View>
        </View>
      </View>

      {/* Key Numbers Grid */}
      <View style={styles.gridRow}>
        <View style={styles.gridCard}>
          <View style={styles.gridIconWrap}>
            <Ionicons name="layers-outline" size={20} color="#0F172A" />
          </View>
          <Text style={styles.gridNumber}>{totalUnits}</Text>
          <Text style={styles.gridLabel}>Total Units on Hand</Text>
        </View>

        <View style={styles.gridCard}>
          <View style={[styles.gridIconWrap, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="warning-outline" size={20} color="#D97706" />
          </View>
          <Text style={[styles.gridNumber, { color: '#D97706' }]}>{criticalItems.length}</Text>
          <Text style={styles.gridLabel}>Low / Out of Stock</Text>
        </View>
      </View>

      {/* Category Breakdown */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Value by Category</Text>
        <View style={styles.sectionCard}>
          {categoryStats.map((cat, index) => (
            <View key={cat.name} style={[styles.catRow, index !== categoryStats.length - 1 && styles.borderB]}>
              <View style={styles.catInfo}>
                <Text style={styles.catName}>{cat.name}</Text>
                <Text style={styles.catSub}>{cat.count} products · {cat.units} units</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.catValue}>Rs {cat.value.toLocaleString('en-IN')}</Text>
                <Text style={styles.catPercent}>{cat.percentage}% share</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Urgent Re-order Alerts */}
      <View style={styles.section}>
        <View style={styles.urgentHeader}>
          <Text style={styles.sectionTitle}>Restock Priority List</Text>
          <Text style={styles.urgentCount}>{criticalItems.length} items</Text>
        </View>

        {criticalItems.length === 0 ? (
          <View style={styles.allGoodBox}>
            <Ionicons name="checkmark-circle-outline" size={32} color="#059669" />
            <Text style={styles.allGoodText}>All stock levels are above threshold!</Text>
          </View>
        ) : (
          criticalItems.map((item) => {
            const qty = parseInt(item.quantity, 10) || 0;
            const isZero = qty === 0;
            return (
              <TouchableOpacity
                key={item.id || item.sku}
                style={[styles.urgentItemCard, isZero ? styles.urgentRed : styles.urgentAmber]}
                onPress={() => onSelectLowStockItem && onSelectLowStockItem(item)}
                activeOpacity={0.8}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.urgentItemName}>{item.name}</Text>
                  <Text style={styles.urgentItemSku}>{item.sku} · {item.supplier || 'No supplier'}</Text>
                </View>

                <View style={styles.urgentBadgeCol}>
                  <Text style={[styles.urgentQty, isZero ? { color: '#DC2626' } : { color: '#D97706' }]}>
                    {qty} / {item.min_threshold} min
                  </Text>
                  <Text style={styles.urgentStatus}>{isZero ? 'OUT OF STOCK' : 'LOW STOCK'}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>
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
    paddingBottom: 40,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  valuationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  valuationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  valTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  marginPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  marginText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '700',
  },
  mainAmount: {
    fontSize: 30,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  valBreakdown: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  valCol: {
    flex: 1,
  },
  valDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 12,
  },
  valSubLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 2,
  },
  valSubValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  gridCard: {
    flex: 1,
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
  gridIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  gridNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  gridLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  catRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  borderB: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  catInfo: {
    flex: 1,
  },
  catName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  catSub: {
    fontSize: 11,
    color: '#64748B',
  },
  catValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  catPercent: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  urgentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  urgentCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
  },
  urgentItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  urgentRed: {
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  urgentAmber: {
    borderColor: '#FDE68A',
    backgroundColor: '#FFFBEB',
  },
  urgentItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  urgentItemSku: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  urgentBadgeCol: {
    alignItems: 'flex-end',
  },
  urgentQty: {
    fontSize: 13,
    fontWeight: '800',
  },
  urgentStatus: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    marginTop: 2,
  },
  allGoodBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  allGoodText: {
    color: '#059669',
    fontSize: 13,
    fontWeight: '600',
  },
});
