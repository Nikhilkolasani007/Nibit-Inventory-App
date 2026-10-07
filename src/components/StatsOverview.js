// src/components/StatsOverview.js - High-level metrics cards
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function StatsOverview({ stats, items, onFilterSelect, activeFilter }) {
  const totalItems = items.length;
  const totalUnits = items.reduce((acc, it) => acc + (parseInt(it.quantity, 10) || 0), 0);
  const totalValuation = items.reduce((acc, it) => {
    const qty = parseInt(it.quantity, 10) || 0;
    const price = parseFloat(it.cost_price) || 0;
    return acc + (qty * price);
  }, 0);

  const lowStockCount = items.filter(it => {
    const qty = parseInt(it.quantity, 10) || 0;
    const threshold = parseInt(it.min_threshold, 10) || 5;
    return qty > 0 && qty <= threshold;
  }).length;

  const outOfStockCount = items.filter(it => (parseInt(it.quantity, 10) || 0) === 0).length;

  return (
    <View style={styles.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Total Value */}
        <View style={[styles.card, styles.valueCard]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardLabel}>Total Stock Value</Text>
            <View style={[styles.iconWrap, { backgroundColor: '#ECFDF5' }]}>
              <Ionicons name="cash-outline" size={16} color="#059669" />
            </View>
          </View>
          <Text style={[styles.cardValue, { color: '#059669' }]}>Rs {totalValuation.toLocaleString('en-IN')}</Text>
          <Text style={styles.subText}>{totalUnits} Total Units in Stock</Text>
        </View>

        {/* All Items Filter Card */}
        <TouchableOpacity 
          style={[styles.card, activeFilter === 'all' && styles.cardActive]} 
          onPress={() => onFilterSelect('all')}
          activeOpacity={0.8}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardLabel}>Total Products</Text>
            <View style={[styles.iconWrap, { backgroundColor: '#F1F5F9' }]}>
              <Ionicons name="cube-outline" size={16} color="#0F172A" />
            </View>
          </View>
          <Text style={styles.cardValue}>{totalItems}</Text>
          <Text style={styles.subText}>SKUs Registered</Text>
        </TouchableOpacity>

        {/* Low Stock Warning */}
        <TouchableOpacity 
          style={[styles.card, activeFilter === 'low_stock' && styles.cardActiveWarning]} 
          onPress={() => onFilterSelect(activeFilter === 'low_stock' ? 'all' : 'low_stock')}
          activeOpacity={0.8}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardLabel}>Low Stock</Text>
            <View style={[styles.iconWrap, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="warning-outline" size={16} color="#D97706" />
            </View>
          </View>
          <Text style={[styles.cardValue, { color: '#D97706' }]}>{lowStockCount}</Text>
          <Text style={styles.subText}>Below threshold</Text>
        </TouchableOpacity>

        {/* Out of Stock Warning */}
        <TouchableOpacity 
          style={[styles.card, activeFilter === 'out_of_stock' && styles.cardActiveDanger]} 
          onPress={() => onFilterSelect(activeFilter === 'out_of_stock' ? 'all' : 'out_of_stock')}
          activeOpacity={0.8}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardLabel}>Out of Stock</Text>
            <View style={[styles.iconWrap, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="alert-circle-outline" size={16} color="#DC2626" />
            </View>
          </View>
          <Text style={[styles.cardValue, { color: '#DC2626' }]}>{outOfStockCount}</Text>
          <Text style={styles.subText}>Needs re-order</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    minWidth: 155,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  valueCard: {
    minWidth: 185,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  cardActive: {
    borderColor: '#0F172A',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
  },
  cardActiveWarning: {
    borderColor: '#D97706',
    backgroundColor: '#FFFBEB',
    borderWidth: 1.5,
  },
  cardActiveDanger: {
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  subText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
});
