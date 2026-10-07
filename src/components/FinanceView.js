// src/components/FinanceView.js - Financial Margins, Top Selling Models & Model Search
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../services/apiService';

export default function FinanceView({ items = [], transactions = [] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'top_selling' | 'high_margin' | 'in_stock'
  const [invoices, setInvoices] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  // Fetch real invoices from backend to ensure 100% exact sales margins
  useEffect(() => {
    let isMounted = true;
    setLoadingInvoices(true);
    apiService.fetchInvoices()
      .then((data) => {
        if (isMounted && Array.isArray(data)) {
          setInvoices(data);
        }
      })
      .catch((err) => {
        console.warn('FinanceView invoice fetch fallback:', err.message);
      })
      .finally(() => {
        if (isMounted) setLoadingInvoices(false);
      });
    return () => { isMounted = false; };
  }, []);

  // Aggregate Sales & Margins grouped by Model / Device Name
  const modelStats = useMemo(() => {
    const map = new Map();

    // 1. Seed from Inventory Catalog
    items.forEach((it) => {
      const rawName = (it.name || 'Unknown Model').trim();
      const normKey = rawName.toLowerCase();
      const cost = parseFloat(it.cost_price || 0);
      const sell = parseFloat(it.selling_price || 0);
      const qty = parseInt(it.quantity, 10) || 0;

      if (!map.has(normKey)) {
        map.set(normKey, {
          key: normKey,
          name: rawName,
          category: it.category || 'Mobile',
          itemType: it.item_type || 'First Hand',
          costPrice: cost,
          sellingPrice: sell,
          stockQty: qty,
          unitsSold: 0,
          salesRevenue: 0,
          realizedMargin: 0,
          sampleImei: it.imei || '',
        });
      } else {
        const entry = map.get(normKey);
        entry.stockQty += qty;
        if (cost > 0 && entry.costPrice === 0) entry.costPrice = cost;
        if (sell > 0 && entry.sellingPrice === 0) entry.sellingPrice = sell;
      }
    });

    // 2. Add sales from Invoices
    invoices.forEach((inv) => {
      const rawName = (inv.item_name || 'Sold Device').trim();
      const normKey = rawName.toLowerCase();
      const sell = parseFloat(inv.selling_price || 0);
      const cost = parseFloat(inv.cost_price || 0);
      const qty = parseInt(inv.quantity, 10) || 1;
      const margin = (sell - cost) * qty;

      if (!map.has(normKey)) {
        map.set(normKey, {
          key: normKey,
          name: rawName,
          category: inv.category || 'Mobile',
          itemType: inv.item_type || 'First Hand',
          costPrice: cost,
          sellingPrice: sell,
          stockQty: 0,
          unitsSold: qty,
          salesRevenue: sell * qty,
          realizedMargin: margin,
          sampleImei: inv.imei || '',
        });
      } else {
        const entry = map.get(normKey);
        entry.unitsSold += qty;
        entry.salesRevenue += (sell * qty);
        entry.realizedMargin += margin;
        if (cost > 0 && entry.costPrice === 0) entry.costPrice = cost;
        if (sell > 0 && entry.sellingPrice === 0) entry.sellingPrice = sell;
      }
    });

    // 3. Fallback: Add sales from transactions if invoices were empty
    if (invoices.length === 0) {
      transactions.forEach((tx) => {
        if (tx.type === 'OUT' || tx.type === 'SALE') {
          const rawName = (tx.item_name || 'Item').trim();
          const normKey = rawName.toLowerCase();
          const sell = parseFloat(tx.selling_price || tx.price || 0);
          const cost = parseFloat(tx.cost_price || 0);
          const qty = parseInt(tx.quantity, 10) || 1;
          const margin = (sell - cost) * qty;

          if (map.has(normKey)) {
            const entry = map.get(normKey);
            entry.unitsSold += qty;
            entry.salesRevenue += (sell * qty);
            entry.realizedMargin += margin;
          }
        }
      });
    }

    // Convert to Array & Compute Margin Percentages
    const list = Array.from(map.values()).map((entry) => {
      const unitMargin = entry.sellingPrice > 0 ? (entry.sellingPrice - entry.costPrice) : 0;
      const marginPercent = entry.sellingPrice > 0
        ? ((unitMargin / entry.sellingPrice) * 100).toFixed(1)
        : '0.0';
      const realizedMarginPercent = entry.salesRevenue > 0
        ? ((entry.realizedMargin / entry.salesRevenue) * 100).toFixed(1)
        : marginPercent;

      return {
        ...entry,
        unitMargin,
        marginPercent: parseFloat(marginPercent),
        realizedMarginPercent: parseFloat(realizedMarginPercent)
      };
    });

    // Find Most Sold Model (max unitsSold)
    let maxSold = 0;
    list.forEach((m) => {
      if (m.unitsSold > maxSold) maxSold = m.unitsSold;
    });

    return {
      models: list,
      maxSoldUnits: maxSold
    };
  }, [items, invoices, transactions]);

  // Overall Financial Totals
  const totals = useMemo(() => {
    let totalSales = 0;
    let totalRealizedProfit = 0;
    let totalStockCost = 0;
    let totalStockRetail = 0;
    let totalUnitsSold = 0;

    modelStats.models.forEach((m) => {
      totalSales += m.salesRevenue;
      totalRealizedProfit += m.realizedMargin;
      totalStockCost += (m.stockQty * m.costPrice);
      totalStockRetail += (m.stockQty * m.sellingPrice);
      totalUnitsSold += m.unitsSold;
    });

    const overallMarginPct = totalSales > 0
      ? ((totalRealizedProfit / totalSales) * 100).toFixed(1)
      : '0.0';

    const potentialStockProfit = Math.max(0, totalStockRetail - totalStockCost);
    const potentialMarginPct = totalStockRetail > 0
      ? ((potentialStockProfit / totalStockRetail) * 100).toFixed(1)
      : '0.0';

    return {
      totalSales,
      totalRealizedProfit,
      overallMarginPct,
      totalStockCost,
      totalStockRetail,
      potentialStockProfit,
      potentialMarginPct,
      totalUnitsSold
    };
  }, [modelStats]);

  // Filter & Search models
  const filteredModels = useMemo(() => {
    let list = [...modelStats.models];

    // Search query matching by model name or similar substring
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((m) =>
        m.name.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q) ||
        m.sampleImei.toLowerCase().includes(q)
      );
    }

    // Filter modes
    if (filterMode === 'top_selling') {
      list = list.filter((m) => m.unitsSold > 0);
      list.sort((a, b) => b.unitsSold - a.unitsSold || b.salesRevenue - a.salesRevenue);
    } else if (filterMode === 'high_margin') {
      list.sort((a, b) => b.marginPercent - a.marginPercent);
    } else if (filterMode === 'in_stock') {
      list = list.filter((m) => m.stockQty > 0);
      list.sort((a, b) => b.stockQty - a.stockQty);
    } else {
      // Default: Top sellers first, then alphabetically
      list.sort((a, b) => (b.unitsSold - a.unitsSold) || a.name.localeCompare(b.name));
    }

    return list;
  }, [modelStats, searchQuery, filterMode]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* 1. FINANCIAL SUMMARY OVERVIEW CARD */}
      <View style={styles.summaryCard}>
        <View style={styles.cardTopRow}>
          <View style={styles.cardHeaderBadge}>
            <Ionicons name="stats-chart" size={13} color="#0F766E" />
            <Text style={styles.cardHeaderBadgeText}>Shop Financial Overview</Text>
          </View>
          <View style={styles.marginPill}>
            <Text style={styles.marginPillText}>+{totals.overallMarginPct}% Realized Margin</Text>
          </View>
        </View>

        <Text style={styles.headlineLabel}>Total Realized Net Profit</Text>
        <Text style={styles.headlineAmount}>Rs {totals.totalRealizedProfit.toLocaleString('en-IN')}</Text>
        <Text style={styles.headlineSub}>
          Across {totals.totalUnitsSold} units sold via POS • Total Revenue: Rs {totals.totalSales.toLocaleString('en-IN')}
        </Text>

        <View style={styles.divider} />

        <View style={styles.metricsGrid}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>WAREHOUSE COST</Text>
            <Text style={styles.metricValue}>Rs {totals.totalStockCost.toLocaleString('en-IN')}</Text>
            <Text style={styles.metricSub}>Buy Price Valuation</Text>
          </View>

          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>RETAIL VALUATION</Text>
            <Text style={[styles.metricValue, { color: '#059669' }]}>
              Rs {totals.totalStockRetail.toLocaleString('en-IN')}
            </Text>
            <Text style={styles.metricSub}>Expected Sales Value</Text>
          </View>

          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>UNSOLD PROFIT POTENTIAL</Text>
            <Text style={[styles.metricValue, { color: '#0F766E' }]}>
              +Rs {totals.potentialStockProfit.toLocaleString('en-IN')}
            </Text>
            <Text style={styles.metricSub}>+{totals.potentialMarginPct}% on stock</Text>
          </View>
        </View>
      </View>

      {/* 2. SEARCH & FILTER SECTION */}
      <View style={styles.sectionHeaderRow}>
        <View>
          <Text style={styles.sectionTitle}>Product & Model Margins</Text>
          <Text style={styles.sectionSub}>Performance and profitability by device model</Text>
        </View>
        {loadingInvoices && <ActivityIndicator size="small" color="#0F766E" />}
      </View>

      {/* Model Name Search Input */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color="#64748B" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search model name (e.g. iPhone, Samsung)..."
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color="#94A3B8" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterTabsRow}>
        <TouchableOpacity
          style={[styles.filterTab, filterMode === 'all' && styles.filterTabActive]}
          onPress={() => setFilterMode('all')}
        >
          <Text style={[styles.filterTabText, filterMode === 'all' && styles.filterTabTextActive]}>
            All Models ({modelStats.models.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, filterMode === 'top_selling' && styles.filterTabActive]}
          onPress={() => setFilterMode('top_selling')}
        >
          <Ionicons name="trophy" size={13} color={filterMode === 'top_selling' ? '#FFFFFF' : '#D97706'} />
          <Text style={[styles.filterTabText, filterMode === 'top_selling' && styles.filterTabTextActive]}>
            Most Sold Models
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, filterMode === 'high_margin' && styles.filterTabActive]}
          onPress={() => setFilterMode('high_margin')}
        >
          <Ionicons name="trending-up" size={13} color={filterMode === 'high_margin' ? '#FFFFFF' : '#059669'} />
          <Text style={[styles.filterTabText, filterMode === 'high_margin' && styles.filterTabTextActive]}>
            Highest Margin %
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, filterMode === 'in_stock' && styles.filterTabActive]}
          onPress={() => setFilterMode('in_stock')}
        >
          <Ionicons name="cube" size={13} color={filterMode === 'in_stock' ? '#FFFFFF' : '#475569'} />
          <Text style={[styles.filterTabText, filterMode === 'in_stock' && styles.filterTabTextActive]}>
            In Stock Only
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* 3. MODEL MARGIN CARDS LIST */}
      {filteredModels.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="search-outline" size={36} color="#94A3B8" />
          <Text style={styles.emptyTitle}>No matching models found</Text>
          <Text style={styles.emptySub}>
            Try searching for a different model name or clear filters.
          </Text>
        </View>
      ) : (
        filteredModels.map((m, idx) => {
          const isTopSeller = modelStats.maxSoldUnits > 0 && m.unitsSold === modelStats.maxSoldUnits;
          const isPositiveMargin = m.unitMargin > 0;

          return (
            <View key={m.key || idx} style={styles.modelCard}>
              {/* Header row: Model Name & Badges */}
              <View style={styles.modelHeaderRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Text style={styles.modelName} numberOfLines={2}>{m.name}</Text>
                    {isTopSeller && (
                      <View style={styles.topSellerBadge}>
                        <Ionicons name="trophy" size={11} color="#B45309" />
                        <Text style={styles.topSellerText}>#1 MOST SOLD</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.modelMeta}>
                    {m.category} • {m.itemType} • {m.stockQty} in stock
                  </Text>
                </View>

                {/* Profit Margin Pill */}
                <View style={[styles.modelMarginBadge, isPositiveMargin ? styles.marginBadgeGreen : styles.marginBadgeGray]}>
                  <Text style={[styles.modelMarginText, isPositiveMargin ? { color: '#047857' } : { color: '#64748B' }]}>
                    +{m.marginPercent}%
                  </Text>
                  <Text style={styles.marginSubText}>Margin</Text>
                </View>
              </View>

              {/* Price Details Grid */}
              <View style={styles.modelPriceGrid}>
                <View style={styles.priceCol}>
                  <Text style={styles.priceColLabel}>BUY PRICE</Text>
                  <Text style={styles.priceColVal}>Rs {m.costPrice.toLocaleString('en-IN')}</Text>
                </View>

                <View style={styles.priceCol}>
                  <Text style={styles.priceColLabel}>SELLING PRICE</Text>
                  <Text style={[styles.priceColVal, { color: '#0F172A' }]}>
                    {m.sellingPrice > 0 ? `Rs ${m.sellingPrice.toLocaleString('en-IN')}` : 'Decide at sale'}
                  </Text>
                </View>

                <View style={[styles.priceCol, { alignItems: 'flex-end' }]}>
                  <Text style={styles.priceColLabel}>PER-UNIT MARGIN</Text>
                  <Text style={[styles.priceColVal, isPositiveMargin ? { color: '#059669' } : { color: '#64748B' }]}>
                    {isPositiveMargin ? `+Rs ${m.unitMargin.toLocaleString('en-IN')}` : 'Rs 0'}
                  </Text>
                </View>
              </View>

              {/* Sales Performance Stats Row */}
              <View style={styles.salesPerfRow}>
                <View style={styles.perfItem}>
                  <Ionicons name="cart-outline" size={13} color="#0F766E" />
                  <Text style={styles.perfItemText}>
                    Units Sold: <Text style={{ fontWeight: '800', color: '#0F172A' }}>{m.unitsSold}</Text>
                  </Text>
                </View>

                <View style={styles.perfItem}>
                  <Ionicons name="cash-outline" size={13} color="#059669" />
                  <Text style={styles.perfItemText}>
                    Sales Revenue: <Text style={{ fontWeight: '800', color: '#059669' }}>Rs {m.salesRevenue.toLocaleString('en-IN')}</Text>
                  </Text>
                </View>

                <View style={styles.perfItem}>
                  <Ionicons name="trending-up-outline" size={13} color="#059669" />
                  <Text style={styles.perfItemText}>
                    Total Margin: <Text style={{ fontWeight: '800', color: '#059669' }}>+Rs {m.realizedMargin.toLocaleString('en-IN')}</Text>
                  </Text>
                </View>
              </View>
            </View>
          );
        })
      )}
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
    paddingBottom: 36,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  cardHeaderBadgeText: {
    color: '#0F766E',
    fontSize: 11,
    fontWeight: '800',
  },
  marginPill: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  marginPillText: {
    color: '#047857',
    fontSize: 11,
    fontWeight: '800',
  },
  headlineLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headlineAmount: {
    fontSize: 32,
    fontWeight: '900',
    color: '#059669',
    marginTop: 4,
  },
  headlineSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  metricItem: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.4,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 3,
  },
  metricSub: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  sectionSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    padding: 0,
  },
  filterTabsRow: {
    gap: 8,
    marginBottom: 16,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterTabActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  modelCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  modelHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  modelName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  modelMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },
  topSellerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  topSellerText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
  },
  modelMarginBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: 'center',
  },
  marginBadgeGreen: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  marginBadgeGray: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modelMarginText: {
    fontSize: 14,
    fontWeight: '900',
  },
  marginSubText: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  modelPriceGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  priceCol: {
    flex: 1,
  },
  priceColLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  priceColVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
  },
  salesPerfRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  perfItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  perfItemText: {
    fontSize: 11,
    color: '#475569',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },
});
