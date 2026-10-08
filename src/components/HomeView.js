// src/components/HomeView.js - High-level Dashboard, Today's Analytics & Monthly Graphs
import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../services/apiService';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function HomeView({ items = [], transactions = [], user, onNavigateTab, onOpenAddModal }) {
  const [backendAnalytics, setBackendAnalytics] = useState(null);
  const [selectedMonthIdx, setSelectedMonthIdx] = useState(new Date().getMonth());

  // Fetch live server analytics from MySQL
  useEffect(() => {
    let isMounted = true;
    apiService.fetchAnalytics()
      .then((data) => {
        if (isMounted && data) {
          setBackendAnalytics(data);
        }
      })
      .catch((err) => {
        // Fallback gracefully to frontend calculation
      });
    return () => { isMounted = false; };
  }, [items.length, transactions.length]);

  // Overall catalog metrics
  const totalStockUnits = items.reduce((acc, it) => acc + (parseInt(it.quantity, 10) || 0), 0);
  const lowStockCount = items.filter((it) => {
    const qty = parseInt(it.quantity, 10) || 0;
    const min = parseInt(it.min_quantity || it.min_threshold, 10) || 5;
    return qty > 0 && qty <= min;
  }).length;
  const outOfStockCount = items.filter((it) => (parseInt(it.quantity, 10) || 0) === 0).length;
  const totalInventoryValue = items.reduce((acc, it) => {
    const qty = parseInt(it.quantity, 10) || 0;
    const price = parseFloat(it.cost_price || 0); // Inventory value is based on Buy Price
    return acc + (qty * price);
  }, 0);

  const shopName = user?.shop_name || 'SHOUKY MOBILES';
  const userName = user?.name || user?.email || (user?.role === 'employee' ? user?.emp_id : 'Admin');

  // Today's Date String: YYYY-MM-DD
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Compute Today's Metrics (Exact data from MySQL backend analytics or local transaction records)
  const todaySalesLocal = useMemo(() => {
    return transactions.filter((tx) => {
      const isSale = tx.type === 'OUT' || tx.type === 'SALE';
      const isToday = tx.created_at ? tx.created_at.slice(0, 10) === todayStr : true;
      const itemExists = items.some((it) => String(it.id) === String(tx.item_id));
      return isSale && isToday && itemExists;
    });
  }, [transactions, todayStr, items]);

  const localRevenue = todaySalesLocal.reduce((acc, s) => {
    const price = parseFloat(s.selling_price || s.price || 0);
    const qty = parseInt(s.quantity, 10) || 1;
    return acc + (price * qty);
  }, 0);

  // Today's Phones added to inventory
  const localPhonesIn = useMemo(() => {
    let count = 0;
    // From items created today
    items.forEach((it) => {
      if (it.created_at && it.created_at.slice(0, 10) === todayStr) {
        count += (parseInt(it.quantity, 10) || 1);
      }
    });
    // From transactions of type IN today
    transactions.forEach((tx) => {
      if (tx.type === 'IN' && tx.created_at && tx.created_at.slice(0, 10) === todayStr) {
        const itemExists = items.some((it) => String(it.id) === String(tx.item_id));
        if (itemExists) {
          count += (parseInt(tx.quantity, 10) || 1);
        }
      }
    });
    return count;
  }, [items, transactions, todayStr]);

  // Today's Margin
  const localMargin = todaySalesLocal.reduce((acc, s) => {
    const sp = parseFloat(s.selling_price || s.price || 0);
    const cp = parseFloat(s.cost_price || 0);
    const qty = parseInt(s.quantity, 10) || 1;
    return acc + ((sp - cp) * qty);
  }, 0);

  // Exact data from backend analytics or local actuals (strictly 0 when no sales exist)
  const todaySalesCount = backendAnalytics !== null
    ? Math.max(todaySalesLocal.length, parseInt(backendAnalytics.today_sales_count, 10) || 0)
    : todaySalesLocal.length;

  const todaySalesRevenue = backendAnalytics !== null
    ? Math.max(localRevenue, parseFloat(backendAnalytics.today_sales_revenue) || 0)
    : localRevenue;

  const todayPhonesIn = backendAnalytics !== null
    ? Math.max(localPhonesIn, parseInt(backendAnalytics.today_phones_in, 10) || 0)
    : localPhonesIn;

  const todayMargin = backendAnalytics !== null
    ? Math.max(localMargin, parseFloat(backendAnalytics.today_margin) || 0)
    : localMargin;

  const todayMarginPercent = todaySalesRevenue > 0
    ? ((todayMargin / todaySalesRevenue) * 100).toFixed(1)
    : (backendAnalytics?.today_margin_percentage ? String(backendAnalytics.today_margin_percentage) : '0.0');

  // Compute 12-Month Sales Distribution & Determine Peak Sales Month
  const { monthlyData, peakMonth } = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const months = MONTH_NAMES.map((name, idx) => ({
      index: idx,
      short: name,
      full: `${MONTH_FULL[idx]} ${currentYear}`,
      revenue: 0,
      margin: 0,
      count: 0
    }));

    // Fill from backend if available
    if (backendAnalytics?.monthly_sales && Array.isArray(backendAnalytics.monthly_sales)) {
      backendAnalytics.monthly_sales.forEach((m) => {
        const short = m.month_short;
        const target = months.find((it) => it.short.toLowerCase() === (short || '').toLowerCase());
        if (target) {
          target.revenue += parseFloat(m.revenue || 0);
          target.margin += parseFloat(m.margin || 0);
          target.count += parseInt(m.count || 0, 10);
        }
      });
    }

    // Fill from local transactions (only if backend monthly_sales is not already providing it)
    if (!backendAnalytics?.monthly_sales || backendAnalytics.monthly_sales.length === 0) {
      transactions.forEach((tx) => {
        if (tx.type === 'OUT' || tx.type === 'SALE') {
          const itemExists = items.some((it) => String(it.id) === String(tx.item_id));
          if (itemExists) {
            const d = tx.created_at ? new Date(tx.created_at) : new Date();
            const mIdx = d.getMonth();
            if (months[mIdx]) {
              const sp = parseFloat(tx.selling_price || tx.price || 0);
              const cp = parseFloat(tx.cost_price || 0);
              const q = parseInt(tx.quantity, 10) || 1;
              months[mIdx].revenue += (sp * q);
              months[mIdx].margin += ((sp - cp) * q);
              months[mIdx].count += q;
            }
          }
        }
      });
    }

    // Strict exact data: NO mock or artificial numbers! If 0 sales, revenue remains 0.

    // Find peak month ONLY from months that actually have sales
    let top = null;
    months.forEach((m) => {
      if (m.revenue > 0 || m.count > 0) {
        if (!top || m.revenue > top.revenue) {
          top = m;
        }
      }
    });

    if (!top && backendAnalytics?.top_sales_month && parseFloat(backendAnalytics.top_sales_month.revenue) > 0) {
      top = {
        index: months.findIndex((m) => m.short.toLowerCase() === (backendAnalytics.top_sales_month.month_short || '').toLowerCase()),
        short: backendAnalytics.top_sales_month.month_short,
        full: backendAnalytics.top_sales_month.month_full,
        revenue: parseFloat(backendAnalytics.top_sales_month.revenue),
        margin: parseFloat(backendAnalytics.top_sales_month.margin || 0),
        count: parseInt(backendAnalytics.top_sales_month.count || 0, 10)
      };
    }

    return { monthlyData: months, peakMonth: top };
  }, [backendAnalytics, transactions]);

  // Max value for bar scaling
  const maxMonthRevenue = useMemo(() => {
    const max = Math.max(...monthlyData.map((m) => m.revenue));
    return max > 0 ? max : 1;
  }, [monthlyData]);

  const selectedMonth = monthlyData[selectedMonthIdx] || monthlyData[0];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Welcome Banner */}
      <View style={styles.welcomeCard}>
        <View style={styles.welcomeBadge}>
          <Ionicons name="sparkles" size={14} color="#0F766E" />
          <Text style={styles.welcomeBadgeText}>Active Session</Text>
        </View>
        <Text style={styles.welcomeTitle}>{shopName}</Text>
        <Text style={styles.welcomeSubtitle}>
          Logged in as <Text style={{ color: '#0F766E', fontWeight: '700' }}>{userName}</Text> • {user?.role === 'employee' ? 'Staff Member' : 'Store Administrator'}
        </Text>
      </View>

      {/* KPI Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={[styles.statBox, { borderColor: '#E2E8F0' }]}>
          <View style={[styles.statIconWrap, { backgroundColor: '#F1F5F9' }]}>
            <Ionicons name="cube" size={20} color="#0F172A" />
          </View>
          <Text style={styles.statValue}>{items.length}</Text>
          <Text style={styles.statLabel}>Unique Products</Text>
          <Text style={styles.statSub}>{totalStockUnits} units in stock</Text>
        </View>

        <View style={[styles.statBox, { borderColor: '#E2E8F0' }]}>
          <View style={[styles.statIconWrap, { backgroundColor: '#ECFDF5' }]}>
            <Ionicons name="cash" size={20} color="#059669" />
          </View>
          <Text style={[styles.statValue, { color: '#059669' }]}>Rs {totalInventoryValue.toLocaleString('en-IN')}</Text>
          <Text style={styles.statLabel}>Stock Retail Value</Text>
          <Text style={styles.statSub}>Current catalog worth</Text>
        </View>

        <View style={[styles.statBox, { borderColor: '#E2E8F0' }]}>
          <View style={[styles.statIconWrap, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="alert-circle" size={20} color="#D97706" />
          </View>
          <Text style={[styles.statValue, { color: '#D97706' }]}>{lowStockCount}</Text>
          <Text style={styles.statLabel}>Low Stock Alert</Text>
          <Text style={styles.statSub}>Needs reorder soon</Text>
        </View>

        <View style={[styles.statBox, { borderColor: '#E2E8F0' }]}>
          <View style={[styles.statIconWrap, { backgroundColor: '#FEE2E2' }]}>
            <Ionicons name="close-circle" size={20} color="#DC2626" />
          </View>
          <Text style={[styles.statValue, { color: '#DC2626' }]}>{outOfStockCount}</Text>
          <Text style={styles.statLabel}>Out of Stock</Text>
          <Text style={styles.statSub}>0 quantity remaining</Text>
        </View>
      </View>

      {/* ========================================================== */}
      {/* 1. TODAY'S ANALYTICS SECTION (Above Quick Actions)         */}
      {/* ========================================================== */}
      <View style={styles.todaySectionCard}>
        <View style={styles.sectionTitleRow}>
          <View style={styles.todayPill}>
            <Ionicons name="today-outline" size={14} color="#0F766E" />
            <Text style={styles.todayPillText}>Today's Real-time Analytics</Text>
          </View>
          <Text style={styles.dateLabel}>{new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
        </View>

        {/* 3 Analytics Cards for Today */}
        <View style={styles.todayMetricsRow}>
          {/* Metric 1: Today's Sales */}
          <View style={styles.todayMetricBox}>
            <View style={[styles.todayIconCircle, { backgroundColor: '#ECFDF5' }]}>
              <Ionicons name="cart" size={18} color="#059669" />
            </View>
            <Text style={styles.todayMetricVal}>{todaySalesCount} Sales</Text>
            <Text style={styles.todayMetricSub}>Rs {todaySalesRevenue.toLocaleString('en-IN')}</Text>
            <Text style={styles.todayMetricLabel}>Today's Revenue</Text>
          </View>

          {/* Metric 2: Today's Phones into Inventory */}
          <View style={styles.todayMetricBox}>
            <View style={[styles.todayIconCircle, { backgroundColor: '#F1F5F9' }]}>
              <Ionicons name="phone-portrait" size={18} color="#0F172A" />
            </View>
            <Text style={styles.todayMetricVal}>{todayPhonesIn} Units</Text>
            <Text style={styles.todayMetricSub}>Phones & Stock</Text>
            <Text style={styles.todayMetricLabel}>Added Today</Text>
          </View>

          {/* Metric 3: Today's Margin / Profit */}
          <View style={styles.todayMetricBox}>
            <View style={[styles.todayIconCircle, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="trending-up" size={18} color="#D97706" />
            </View>
            <Text style={[styles.todayMetricVal, { color: '#059669' }]}>+Rs {todayMargin.toLocaleString('en-IN')}</Text>
            <View style={styles.marginTag}>
              <Text style={styles.marginTagText}>+{todayMarginPercent}%</Text>
            </View>
            <Text style={styles.todayMetricLabel}>Profit Margin</Text>
          </View>
        </View>
      </View>

      {/* ========================================================== */}
      {/* 2. GRAPH-BASED MONTHLY SALES & BEST MONTH REPRESENTATION   */}
      {/* ========================================================== */}
      <View style={styles.graphCard}>
        <View style={styles.graphHeaderRow}>
          <View>
            <Text style={styles.graphCardTitle}>Monthly Sales Performance</Text>
            <Text style={styles.graphCardSub}>Interactive revenue graph per month</Text>
          </View>
          <View style={styles.graphBadge}>
            <Ionicons name="bar-chart" size={14} color="#059669" />
            <Text style={styles.graphBadgeText}>Full Year Trend</Text>
          </View>
        </View>

        {/* Highlight Banner: IN WHICH MONTH MOST SALES WAS DONE */}
        {peakMonth && peakMonth.revenue > 0 ? (
          <View style={styles.peakMonthBanner}>
            <View style={styles.trophyCircle}>
              <Ionicons name="trophy" size={20} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.peakMonthTitle}>Top Sales Month: {peakMonth.full}</Text>
                <View style={styles.championBadge}>
                  <Text style={styles.championBadgeText}>PEAK</Text>
                </View>
              </View>
              <Text style={styles.peakMonthDesc}>
                Highest revenue generated: <Text style={{ fontWeight: '800', color: '#0F172A' }}>Rs {peakMonth.revenue.toLocaleString('en-IN')}</Text> across {peakMonth.count} sales.
              </Text>
            </View>
          </View>
        ) : (
          <View style={[styles.peakMonthBanner, { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }]}>
            <View style={[styles.trophyCircle, { backgroundColor: '#F1F5F9' }]}>
              <Ionicons name="stats-chart" size={18} color="#64748B" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.peakMonthTitle, { color: '#334155' }]}>No Sales Recorded Yet</Text>
              <Text style={styles.peakMonthDesc}>
                Real sales completed via POS will instantly display here with exact revenue and peak month records.
              </Text>
            </View>
          </View>
        )}

        {/* Visual Bar Chart */}
        <View style={styles.chartContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chartBarsScroll}>
            {monthlyData.map((item, idx) => {
              const isSelected = selectedMonthIdx === idx;
              const isPeak = peakMonth && peakMonth.revenue > 0 && peakMonth.index === idx;
              const barHeightPercent = maxMonthRevenue > 0 && item.revenue > 0 ? (item.revenue / maxMonthRevenue) : 0;
              const barPixelHeight = item.revenue > 0 ? Math.max(12, Math.round(barHeightPercent * 110)) : 4;

              return (
                <TouchableOpacity
                  key={item.short}
                  style={styles.barColumn}
                  onPress={() => setSelectedMonthIdx(idx)}
                  activeOpacity={0.7}
                >
                  {/* Top indicator on peak */}
                  {isPeak ? (
                    <View style={styles.peakStarIcon}>
                      <Ionicons name="star" size={10} color="#D97706" />
                    </View>
                  ) : (
                    <View style={{ height: 14 }} />
                  )}

                  {/* Vertical bar column */}
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        { height: barPixelHeight },
                        item.revenue === 0
                          ? styles.barFillZero
                          : isPeak
                          ? styles.barFillPeak
                          : styles.barFillNormal,
                        isSelected && styles.barFillSelected
                      ]}
                    />
                  </View>

                  {/* Month Label */}
                  <Text style={[styles.barMonthText, isSelected && styles.barMonthTextActive, isPeak && { fontWeight: '800' }]}>
                    {item.short}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Selected Month Inspector Details Pill */}
        {selectedMonth && (
          <View style={styles.selectedMonthDetails}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={[styles.statusDot, { backgroundColor: peakMonth && peakMonth.index === selectedMonth.index ? '#059669' : '#0F172A' }]} />
              <Text style={styles.selectedMonthName}>{selectedMonth.full}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
              <Text style={styles.selectedMonthStat}>
                Sales: <Text style={{ fontWeight: '800', color: '#0F172A' }}>Rs {selectedMonth.revenue.toLocaleString('en-IN')}</Text>
              </Text>
              <Text style={styles.selectedMonthStat}>
                Margin: <Text style={{ fontWeight: '800', color: '#059669' }}>+Rs {selectedMonth.margin.toLocaleString('en-IN')}</Text>
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* ========================================================== */}
      {/* 3. QUICK ACTIONS SHORTCUTS                                  */}
      {/* ========================================================== */}
      <Text style={styles.sectionHeader}>Quick Actions</Text>
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={onOpenAddModal} activeOpacity={0.8}>
          <View style={[styles.actionIcon, { backgroundColor: '#0F172A' }]}>
            <Ionicons name="add" size={22} color="#FFFFFF" />
          </View>
          <Text style={styles.actionTitle}>Add Product</Text>
          <Text style={styles.actionDesc}>New SKU & Device Photos</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={() => onNavigateTab('pos')} activeOpacity={0.8}>
          <View style={[styles.actionIcon, { backgroundColor: '#059669' }]}>
            <Ionicons name="calculator" size={22} color="#FFFFFF" />
          </View>
          <Text style={styles.actionTitle}>POS Register</Text>
          <Text style={styles.actionDesc}>Make customer sale</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={() => onNavigateTab('inventory')} activeOpacity={0.8}>
          <View style={[styles.actionIcon, { backgroundColor: '#475569' }]}>
            <Ionicons name="list" size={22} color="#FFFFFF" />
          </View>
          <Text style={styles.actionTitle}>Inventory</Text>
          <Text style={styles.actionDesc}>Manage stock list</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={() => onNavigateTab('finance')} activeOpacity={0.8}>
          <View style={[styles.actionIcon, { backgroundColor: '#D97706' }]}>
            <Ionicons name="wallet" size={22} color="#FFFFFF" />
          </View>
          <Text style={styles.actionTitle}>Finance</Text>
          <Text style={styles.actionDesc}>Profits & receipts</Text>
        </TouchableOpacity>
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
    paddingBottom: 30,
  },
  welcomeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  welcomeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#CCFBF1',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 10,
  },
  welcomeBadgeText: {
    color: '#0F766E',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  welcomeSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  statIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  statSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },

  // Today's Analytics Section
  todaySectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  todayPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  todayPillText: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '800',
  },
  dateLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  todayMetricsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  todayMetricBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  todayIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  todayMetricVal: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
  },
  todayMetricSub: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },
  todayMetricLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 2,
    textAlign: 'center',
  },
  marginTag: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    marginTop: 2,
  },
  marginTagText: {
    color: '#059669',
    fontSize: 10,
    fontWeight: '800',
  },

  // Monthly Sales Graph Card
  graphCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  graphHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  graphCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  graphCardSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  graphBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  graphBadgeText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '700',
  },
  peakMonthBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 16,
  },
  trophyCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  peakMonthTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400E',
  },
  championBadge: {
    backgroundColor: '#D97706',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  championBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  peakMonthDesc: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 2,
  },
  chartContainer: {
    paddingVertical: 10,
  },
  chartBarsScroll: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  barColumn: {
    alignItems: 'center',
    width: 38,
  },
  peakStarIcon: {
    height: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  barTrack: {
    width: 24,
    height: 115,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    justifyContent: 'flex-end',
    alignItems: 'center',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 8,
  },
  barFillNormal: {
    backgroundColor: '#94A3B8',
  },
  barFillPeak: {
    backgroundColor: '#059669',
  },
  barFillZero: {
    backgroundColor: '#CBD5E1',
    borderRadius: 2,
  },
  barFillSelected: {
    borderWidth: 2,
    borderColor: '#0F172A',
  },
  barMonthText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 6,
  },
  barMonthTextActive: {
    color: '#0F172A',
    fontWeight: '800',
  },
  selectedMonthDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 10,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  selectedMonthName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  selectedMonthStat: {
    fontSize: 12,
    color: '#64748B',
  },

  // Quick Actions Section
  sectionHeader: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  actionBtn: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  actionDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
});
