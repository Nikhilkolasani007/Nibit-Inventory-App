import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
  ActivityIndicator,
  RefreshControl,
  AppState,
  Platform
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';

import Header from './src/components/Header';
import StatsOverview from './src/components/StatsOverview';
import InventoryItemCard from './src/components/InventoryItemCard';
import ItemModal from './src/components/ItemModal';
import StockAdjustmentModal from './src/components/StockAdjustmentModal';
import TransactionsList from './src/components/TransactionsList';
import AnalyticsView from './src/components/AnalyticsView';
import SettingsModal from './src/components/SettingsModal';
import LoginScreen from './src/components/LoginScreen';
import PinLockScreen from './src/components/PinLockScreen';

import HomeView from './src/components/HomeView';
import PosView from './src/components/PosView';
import FinanceView from './src/components/FinanceView';
import AccountView from './src/components/AccountView';

import apiService from './src/services/apiService';
import sessionService from './src/services/sessionService';
import { INITIAL_ITEMS, INITIAL_CATEGORIES, INITIAL_TRANSACTIONS } from './src/data/initialData';

export default function App() {
  // Auth & Lock state: 'unauthenticated' | 'locked' | 'authenticated'
  const [authState, setAuthState] = useState('unauthenticated');
  const [currentUser, setCurrentUser] = useState(null);

  // 5 Navigation tabs: 'home' | 'inventory' | 'pos' | 'finance' | 'account'
  const [activeTab, setActiveTab] = useState('home');

  // Check stored mobile session on app launch
  useEffect(() => {
    async function restoreMobileSession() {
      try {
        const savedSession = await sessionService.getSession();
        if (savedSession && savedSession.user) {
          setCurrentUser(savedSession.user);
          if (savedSession.websiteUrl) {
            apiService.setBaseUrl(savedSession.websiteUrl);
          }

          // Restore cached items/categories if available
          const cached = await sessionService.getCache();
          if (cached) {
            if (cached.items && cached.items.length > 0) setItems(cached.items);
            if (cached.categories && cached.categories.length > 0) setCategories(cached.categories);
          }

          // If session exists, require mobile PIN / biometric lock
          setAuthState('locked');
        } else {
          setAuthState('unauthenticated');
        }
      } catch (e) {
        console.warn('Session restore error:', e);
        setAuthState('unauthenticated');
      }
    }

    restoreMobileSession();
  }, []);

  // Temporarily disabled: Auto-lock when user resumes app from background / home screen.
  // This causes the app to lock every time the user opens the camera/gallery for photo uploads.
  useEffect(() => {
    // const subscription = AppState.addEventListener('change', (nextAppState) => { ... });
  }, []);

const DEFAULT_CATEGORIES = [
  { id: 1, name: 'Mobile', icon: 'phone-portrait', color: '#3B82F6' },
  { id: 2, name: 'Accessories', icon: 'headset', color: '#10B981' },
  { id: 3, name: 'Other Products', icon: 'cube', color: '#F59E0B' }
];

  // Core Data States
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [transactions, setTransactions] = useState([]);

  // Connectivity
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedItemType, setSelectedItemType] = useState('All'); // 'All' | 'First Hand' | 'Second Hand'
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'low_stock' | 'out_of_stock'

  // Modals
  const [isItemModalVisible, setIsItemModalVisible] = useState(false);
  const [itemToEdit, setItemToEdit] = useState(null);

  const [isStockModalVisible, setIsStockModalVisible] = useState(false);
  const [itemForAdjustment, setItemForAdjustment] = useState(null);

  const [isSettingsVisible, setIsSettingsVisible] = useState(false);

  // Initial load & health check
  const loadData = useCallback(async () => {
    try {
      const health = await apiService.checkHealth();
      setIsConnected(health.connected);

      if (health.connected) {
        // Fetch from PHP API
        try {
          const [fetchedItems, fetchedCategories, fetchedTransactions] = await Promise.all([
            apiService.fetchItems(),
            apiService.fetchCategories(),
            apiService.fetchTransactions(50)
          ]);

          if (Array.isArray(fetchedItems)) setItems(fetchedItems);
          if (Array.isArray(fetchedCategories) && fetchedCategories.length > 0) setCategories(fetchedCategories);
          if (Array.isArray(fetchedTransactions) && fetchedTransactions.length > 0) setTransactions(fetchedTransactions);
        } catch (apiErr) {
          console.warn('PHP API load failed:', apiErr);
        }
      }
    } catch (e) {
      console.warn('Initial load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Filtered and Searched items list
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Category match
      if (selectedCategory !== 'All' && item.category !== selectedCategory) {
        return false;
      }

      // First Hand / Second Hand match
      if (selectedItemType !== 'All' && (item.item_type || 'First Hand') !== selectedItemType) {
        return false;
      }

      const qty = parseInt(item.quantity, 10) || 0;
      const minThreshold = parseInt(item.min_threshold, 10) || 1;

      // Status Filter
      if (activeFilter === 'low_stock' && (qty === 0 || qty > minThreshold)) {
        return false;
      }
      if (activeFilter === 'out_of_stock' && qty !== 0) {
        return false;
      }

      // Search Query: Name, SKU, IMEI, Distributor, Customer Seller, Phone, Date
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const nameMatch = item.name?.toLowerCase().includes(query);
        const skuMatch = item.sku?.toLowerCase().includes(query);
        const imeiMatch = item.imei?.toLowerCase().includes(query);
        const distMatch = item.distributor?.toLowerCase().includes(query);
        const sellerMatch = item.seller_name?.toLowerCase().includes(query);
        const sellerPhoneMatch = item.seller_phone?.toLowerCase().includes(query);
        const dateMatch = item.created_at?.toLowerCase().includes(query);
        return nameMatch || skuMatch || imeiMatch || distMatch || sellerMatch || sellerPhoneMatch || dateMatch;
      }

      return true;
    });
  }, [items, selectedCategory, selectedItemType, activeFilter, searchQuery]);

  // Handle Save Item (Add / Edit)
  const handleSaveItem = async (itemData) => {
    setIsItemModalVisible(false);

    if (itemData.id) {
      // Edit existing
      if (isConnected) {
        try {
          const updated = await apiService.updateItem(itemData);
          setItems((prev) => prev.map((it) => (it.id === updated.id ? updated : it)));
        } catch (err) {
          Alert.alert('Update Warning', 'Failed to update on PHP server. Updated locally.');
          setItems((prev) => prev.map((it) => (it.id === itemData.id ? { ...it, ...itemData } : it)));
        }
      } else {
        setItems((prev) => prev.map((it) => (it.id === itemData.id ? { ...it, ...itemData } : it)));
      }
    } else {
      // Create new
      if (isConnected) {
        try {
          const created = await apiService.createItem(itemData);
          setItems((prev) => [created, ...prev]);
        } catch (err) {
          Alert.alert('Creation Warning', 'Could not sync with PHP server. Added locally.');
          const newItem = { ...itemData, id: Date.now(), created_at: new Date().toISOString() };
          setItems((prev) => [newItem, ...prev]);
        }
      } else {
        const newItem = { ...itemData, id: Date.now(), created_at: new Date().toISOString() };
        setItems((prev) => [newItem, ...prev]);
      }
    }
    setItemToEdit(null);
  };

  // Handle Delete Item
  const handleDeleteItem = (item) => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to remove "${item.name}" (${item.sku})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (isConnected) {
              try {
                await apiService.deleteItem(item.id);
              } catch (err) {
                console.warn('Failed to delete on server:', err);
              }
            }
            setItems((prev) => prev.filter((it) => it.id !== item.id));
          }
        }
      ]
    );
  };

  // Quick Stock Adjustment (+1 / -1)
  const handleQuickAdjust = async (item, type, amount = 1) => {
    if (type === 'IN' && item.imei && item.imei.trim()) {
      Alert.alert(
        'Unique IMEI Device',
        `This device is tracked with a unique IMEI (${item.imei}). Increasing count here would create duplicate units with the same IMEI.\n\nTo add another unit of this model, please tap "+ Add" in the header to register its unique IMEI.`
      );
      return;
    }

    const currentQty = parseInt(item.quantity, 10) || 0;
    const newQty = type === 'IN' ? currentQty + amount : Math.max(0, currentQty - amount);

    // Optimistic UI update
    setItems((prev) =>
      prev.map((it) => (it.id === item.id ? { ...it, quantity: newQty, updated_at: new Date().toISOString() } : it))
    );

    // Record movement in history
    const newTx = {
      id: Date.now(),
      item_id: item.id,
      item_name: item.name,
      sku: item.sku,
      type,
      quantity: amount,
      previous_quantity: currentQty,
      new_quantity: newQty,
      reason: `Quick ${type === 'IN' ? 'Stock In' : 'Stock Out'} (+${amount})`,
      created_at: new Date().toISOString()
    };
    setTransactions((prev) => [newTx, ...prev]);

    if (isConnected) {
      try {
        await apiService.adjustStock(item.id, amount, type, `Quick 1-step ${type}`);
      } catch (err) {
        console.warn('Failed to sync adjustment to PHP server:', err);
      }
    }
  };

  // Advanced Stock Adjustment Modal Confirm
  const handleConfirmStockAdjustment = async (item, type, quantity, reason) => {
    setIsStockModalVisible(false);
    const currentQty = parseInt(item.quantity, 10) || 0;
    let newQty = currentQty;

    if (type === 'IN') newQty = currentQty + quantity;
    else if (type === 'OUT') newQty = Math.max(0, currentQty - quantity);
    else if (type === 'ADJUSTMENT') newQty = quantity;

    setItems((prev) =>
      prev.map((it) => (it.id === item.id ? { ...it, quantity: newQty, updated_at: new Date().toISOString() } : it))
    );

    const newTx = {
      id: Date.now(),
      item_id: item.id,
      item_name: item.name,
      sku: item.sku,
      type,
      quantity,
      previous_quantity: currentQty,
      new_quantity: newQty,
      reason,
      created_at: new Date().toISOString()
    };
    setTransactions((prev) => [newTx, ...prev]);

    const updatedItem = { ...item, quantity: newQty, updated_at: new Date().toISOString() };
    
    if (isConnected) {
      try {
        await apiService.updateItem(updatedItem);
      } catch (err) {
        console.warn('Adjustment sync error:', err);
      }
    }
  };

  const handleRecordSale = async (item, qty, saleRecord) => {
    const currentQty = parseInt(item.quantity, 10) || 0;
    const newQty = Math.max(0, currentQty - qty);
    const updated = { ...item, quantity: newQty };
    setItems((prev) => prev.map((i) => i.id === item.id ? updated : i));

    if (isConnected) {
      try {
        await apiService.updateItem(updated);
      } catch (err) {
        console.warn('POS stock sync error:', err);
      }
    }

    setTransactions((prev) => [
      {
        id: Date.now(),
        type: 'OUT',
        item_name: item.name,
        sku: item.sku,
        quantity: qty,
        price: item.selling_price || item.price,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        reason: `POS Sale: ${saleRecord.customer_name || 'Customer'}`
      },
      ...prev
    ]);
  };

  const handleLoginSuccess = async (user, websiteUrl, extractedRecords = []) => {
    setCurrentUser(user);
    if (websiteUrl) {
      apiService.setBaseUrl(websiteUrl);
    }

    // Store session persistently on mobile device
    await sessionService.saveSession(user, websiteUrl);

    if (extractedRecords && extractedRecords.length > 0) {
      setItems(extractedRecords);
      await sessionService.saveCache({ items: extractedRecords, categories });
    }

    // Transition to authenticated dashboard
    setAuthState('authenticated');
    loadData();
  };

  // Screen 1: Unauthenticated Login Screen (3 Columns: Email, Password, Website)
  if (authState === 'unauthenticated') {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.safeArea}>
          <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
          <LoginScreen onLoginSuccess={handleLoginSuccess} />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  // Screen 2: Default UPI-Style App Lock Screen (PhonePe / GPay PIN screen)
  if (authState === 'locked') {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.safeArea}>
          <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
          <PinLockScreen
            user={currentUser}
            website={currentUser?.website}
            onUnlockSuccess={() => setAuthState('authenticated')}
            onSwitchAccount={() => setAuthState('unauthenticated')}
            defaultPin={currentUser?.pin_code || '1234'}
          />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  // Screen 3: Authenticated Dashboard
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header Bar */}
      <Header
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onOpenAddModal={() => {
          setItemToEdit(null);
          setIsItemModalVisible(true);
        }}
        user={currentUser}
        activeTab={activeTab}
      />

      {/* Main Tab Content */}
      <View style={styles.mainContainer}>
        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#0F172A" />
            <Text style={styles.loaderText}>Connecting to Inventory...</Text>
          </View>
        ) : activeTab === 'home' ? (
          <HomeView
            items={items}
            transactions={transactions}
            user={currentUser}
            onNavigateTab={setActiveTab}
            onOpenAddModal={() => {
              setItemToEdit(null);
              setIsItemModalVisible(true);
            }}
          />
        ) : activeTab === 'inventory' ? (
          <FlatList
            data={filteredItems}
            keyExtractor={(item) => String(item.id || item.sku)}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0F172A" />
            }
            ListHeaderComponent={
              <View>
                {/* High-level summary metrics */}
                <StatsOverview
                  items={items}
                  onFilterSelect={setActiveFilter}
                  activeFilter={activeFilter}
                  isEmployee={currentUser?.role === 'employee'}
                />

                {/* Category Horizontal Pills */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoryPillsScroll}
                >
                  <TouchableOpacity
                    style={[styles.categoryPill, selectedCategory === 'All' && styles.categoryPillActive]}
                    onPress={() => setSelectedCategory('All')}
                  >
                    <Text style={[styles.categoryPillText, selectedCategory === 'All' && styles.categoryPillTextActive]}>
                      All Items ({items.length})
                    </Text>
                  </TouchableOpacity>

                  {categories.map((cat) => {
                    const count = items.filter((i) => i.category === cat.name).length;
                    return (
                      <TouchableOpacity
                        key={cat.id || cat.name}
                        style={[styles.categoryPill, selectedCategory === cat.name && styles.categoryPillActive]}
                        onPress={() => setSelectedCategory(cat.name)}
                      >
                        <Text
                          style={[
                            styles.categoryPillText,
                            selectedCategory === cat.name && styles.categoryPillTextActive
                          ]}
                        >
                          {cat.name} ({count})
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Hand Type Filter Pills (First Hand vs Second Hand) */}
                <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 12 }}>
                  {['All', 'First Hand', 'Second Hand'].map((type) => {
                    const isSelected = selectedItemType === type;
                    return (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.categoryPill,
                          { paddingHorizontal: 12, paddingVertical: 6 },
                          isSelected && (type === 'Second Hand' ? { backgroundColor: '#B45309', borderColor: '#FBBF24' } : styles.categoryPillActive)
                        ]}
                        onPress={() => setSelectedItemType(type)}
                      >
                        <Text style={[styles.categoryPillText, isSelected && styles.categoryPillTextActive]}>
                          {type === 'All' ? 'All Conditions' : type}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Active filter badge notice */}
                {activeFilter !== 'all' && (
                  <View style={styles.filterNotice}>
                    <Text style={styles.filterNoticeText}>
                      Showing: {activeFilter === 'low_stock' ? '⚠️ Low Stock Products' : '🚫 Out of Stock Products'}
                    </Text>
                    <TouchableOpacity onPress={() => setActiveFilter('all')}>
                      <Text style={styles.filterClearText}>Show All</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            }
            renderItem={({ item }) => (
              <InventoryItemCard
                item={item}
                onQuickAdjust={handleQuickAdjust}
                onOpenStockModal={(target) => {
                  setItemForAdjustment(target);
                  setIsStockModalVisible(true);
                }}
                onEdit={(target) => {
                  setItemToEdit(target);
                  setIsItemModalVisible(true);
                }}
                onDelete={handleDeleteItem}
              />
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="cube-outline" size={48} color="#475569" />
                <Text style={styles.emptyTitle}>
                  {searchQuery ? 'No matching products found' : 'No items in database'}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {searchQuery
                    ? 'Try searching by name, IMEI, customer, or SKU.'
                    : 'Tap "+ Create New Product" to add your first item!'}
                </Text>
                <TouchableOpacity
                  style={styles.emptyAddBtn}
                  onPress={() => {
                    setItemToEdit(null);
                    setIsItemModalVisible(true);
                  }}
                >
                  <Text style={styles.emptyAddBtnText}>+ Create New Product</Text>
                </TouchableOpacity>
              </View>
            }
          />
        ) : activeTab === 'pos' ? (
          <PosView
            items={items}
            user={currentUser}
            onRecordSale={handleRecordSale}
          />
        ) : activeTab === 'finance' && currentUser?.role !== 'employee' ? (
          <FinanceView
            items={items}
            transactions={transactions}
          />
        ) : (
          <AccountView
            user={currentUser}
            items={items}
            onLockApp={() => setAuthState('locked')}
            onLogout={async () => {
              await sessionService.clearSession();
              setCurrentUser(null);
              setAuthState('unauthenticated');
            }}
            onUpdateUser={(updated) => setCurrentUser((prev) => ({ ...prev, ...updated }))}
          />
        )}
      </View>

      {/* 5-Tab Modern Bottom Navigation Bar */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={[styles.navTab, activeTab === 'home' && styles.navTabActive]}
          onPress={() => setActiveTab('home')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={activeTab === 'home' ? 'home' : 'home-outline'}
            size={22}
            color={activeTab === 'home' ? '#0F172A' : '#94A3B8'}
          />
          <Text style={[styles.navLabel, activeTab === 'home' && styles.navLabelActive]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navTab, activeTab === 'inventory' && styles.navTabActive]}
          onPress={() => setActiveTab('inventory')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={activeTab === 'inventory' ? 'cube' : 'cube-outline'}
            size={22}
            color={activeTab === 'inventory' ? '#0F172A' : '#94A3B8'}
          />
          <Text style={[styles.navLabel, activeTab === 'inventory' && styles.navLabelActive]}>Inventory</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navTab, activeTab === 'pos' && styles.navTabActive]}
          onPress={() => setActiveTab('pos')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={activeTab === 'pos' ? 'calculator' : 'calculator-outline'}
            size={22}
            color={activeTab === 'pos' ? '#0F172A' : '#94A3B8'}
          />
          <Text style={[styles.navLabel, activeTab === 'pos' && styles.navLabelActive]}>POS/Sales</Text>
        </TouchableOpacity>

        {currentUser?.role !== 'employee' && (
          <TouchableOpacity
            style={[styles.navTab, activeTab === 'finance' && styles.navTabActive]}
            onPress={() => setActiveTab('finance')}
            activeOpacity={0.7}
          >
            <Ionicons
              name={activeTab === 'finance' ? 'wallet' : 'wallet-outline'}
              size={22}
              color={activeTab === 'finance' ? '#0F172A' : '#94A3B8'}
            />
            <Text style={[styles.navLabel, activeTab === 'finance' && styles.navLabelActive]}>Finance</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.navTab, activeTab === 'account' && styles.navTabActive]}
          onPress={() => setActiveTab('account')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={activeTab === 'account' ? 'person' : 'person-outline'}
            size={22}
            color={activeTab === 'account' ? '#0F172A' : '#94A3B8'}
          />
          <Text style={[styles.navLabel, activeTab === 'account' && styles.navLabelActive]}>Account</Text>
        </TouchableOpacity>
      </View>

      {/* Add / Edit Item Modal */}
      <ItemModal
        visible={isItemModalVisible}
        onClose={() => {
          setIsItemModalVisible(false);
          setItemToEdit(null);
        }}
        onSave={handleSaveItem}
        itemToEdit={itemToEdit}
        categories={categories}
      />

      {/* Stock Movement Modal */}
      <StockAdjustmentModal
        visible={isStockModalVisible}
        onClose={() => {
          setIsStockModalVisible(false);
          setItemForAdjustment(null);
        }}
        item={itemForAdjustment}
        onConfirm={handleConfirmStockAdjustment}
      />

      {/* Settings & PHP Config Modal */}
      <SettingsModal
        visible={isSettingsVisible}
        onClose={() => setIsSettingsVisible(false)}
        isConnected={isConnected}
        user={currentUser}
        onUpdatePin={(newPin) => {
          setCurrentUser((prev) => ({ ...prev, pin_code: newPin }));
          if (isConnected && currentUser?.email) {
            apiService.changePin(currentUser.email, newPin).catch(console.warn);
          }
        }}
        onLogout={async () => {
          await sessionService.clearSession();
          setCurrentUser(null);
          setAuthState('unauthenticated');
        }}
        onRefreshAll={loadData}
      />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  mainContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  categoryPillsScroll: {
    paddingVertical: 10,
    gap: 8,
  },
  categoryPill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryPillActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  categoryPillText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  categoryPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  filterNotice: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterNoticeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  filterClearText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F766E',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  emptyAddBtn: {
    marginTop: 16,
    backgroundColor: '#0F172A',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyAddBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
  },
  loaderText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
  },
  navTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    gap: 3,
  },
  navTabActive: {},
  navLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  navLabelActive: {
    color: '#0F172A',
    fontWeight: '800',
  },
});
