import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function Header({
  searchQuery,
  setSearchQuery,
  onOpenAddModal,
  user,
  activeTab
}) {
  const shopName = user?.shop_name || 'SHOUKY MOBILES';
  const userName = user?.name || user?.email || (user?.role === 'employee' ? `Staff (${user?.emp_id || 'EMP'})` : 'Store Admin');
  const isEmployee = user?.role === 'employee';

  return (
    <View style={styles.container}>
      {/* Top row: Shop Name & User Name on left, Add option on right */}
      <View style={styles.topRow}>
        <View style={styles.brandContainer}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoBadgeText}>
              {shopName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.titlesBlock}>
            <Text style={styles.shopName} numberOfLines={1}>
              {shopName}
            </Text>
            <View style={styles.userRow}>
              <Text style={styles.userName} numberOfLines={1}>
                {userName}
              </Text>
              <View style={isEmployee ? styles.roleBadgeEmp : styles.roleBadgeAdmin}>
                <Text style={isEmployee ? styles.roleBadgeTextEmp : styles.roleBadgeTextAdmin}>
                  {isEmployee ? (user?.emp_id ? `STAFF • ${user.emp_id}` : 'STAFF') : 'ADMIN'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Right beside: Only Add Button */}
        <TouchableOpacity 
          style={styles.addButton}
          onPress={onOpenAddModal}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Directly below: Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#64748B" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search devices, IMEI, customer, SKU..."
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearBtn}>
            <Ionicons name="close-circle" size={18} color="#64748B" />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'ios' ? 52 : 38,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 12,
  },
  logoBadge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBadgeText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  titlesBlock: {
    flex: 1,
    justifyContent: 'center',
  },
  shopName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  userName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    maxWidth: 150,
  },
  roleBadgeAdmin: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  roleBadgeTextAdmin: {
    color: '#334155',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  roleBadgeEmp: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  roleBadgeTextEmp: {
    color: '#047857',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#0F172A',
    fontSize: 14,
  },
  clearBtn: {
    padding: 4,
  },
});
