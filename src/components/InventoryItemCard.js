import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Image, Modal, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getImageUrl } from '../services/apiService';

export default function InventoryItemCard({
  item,
  onQuickAdjust,
  onOpenStockModal,
  onEdit,
  onDelete
}) {
  const [imageError, setImageError] = useState(false);
  const [isPhotoViewerOpen, setIsPhotoViewerOpen] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [item?.images]);

  const qty = parseInt(item.quantity, 10) || 0;
  const costPrice = parseFloat(item.cost_price) || 0;
  const sellingPrice = parseFloat(item.selling_price) || 0;
  const hasSellingPrice = item.selling_price !== null && item.selling_price !== undefined && item.selling_price !== '' && sellingPrice > 0;
  const isSecondHand = item.item_type === 'Second Hand';

  let allImages = [];
  if (item.images) {
    try {
      if (item.images.startsWith('[')) {
        allImages = JSON.parse(item.images).map(u => getImageUrl(u));
      } else if (item.images.includes(',')) {
        allImages = item.images.split(',').map(u => getImageUrl(u.trim()));
      } else {
        allImages = [getImageUrl(item.images)];
      }
    } catch(e) {
      allImages = [getImageUrl(item.images)];
    }
  }
  allImages = allImages.filter(u => !!u);

  const imageUrl = allImages[0] || null;
  const hasValidImage = !!(imageUrl && !imageError);

  const handleDeletePrompt = () => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${item.name}" from inventory?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete(item) }
      ]
    );
  };

  const hasImei = !!(item.imei && item.imei.trim());
  const isBulk = !hasImei || item.entry_type === 'Bulk';

  const handlePlusPress = () => {
    onQuickAdjust(item, 'IN', 1);
  };

  return (
    <View style={styles.card}>
      <TouchableOpacity 
        style={styles.cardMainRow}
        activeOpacity={0.7}
        onPress={() => {
          if (hasValidImage) {
            setIsPhotoViewerOpen(true);
          }
        }}
      >
        {/* Device Photo Thumbnail if available */}
        {hasValidImage ? (
          <View style={styles.thumbnailWrap}>
            <Image
              source={{ uri: imageUrl }}
              style={styles.thumbnail}
              onError={() => setImageError(true)}
              resizeMode="cover"
            />
            <View style={styles.photoZoomBadge}>
              <Ionicons name="expand" size={10} color="#FFFFFF" />
            </View>
          </View>
        ) : (
          <View style={styles.placeholderThumb}>
            <Ionicons
              name={item.category === 'Mobile' ? 'phone-portrait-outline' : item.category === 'Accessories' ? 'headset-outline' : 'cube-outline'}
              size={26}
              color="#94A3B8"
            />
          </View>
        )}

        {/* Product Details Header */}
        <View style={{ flex: 1 }}>
          <View style={styles.badgeRow}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{item.category || 'Mobile'}</Text>
            </View>

            <View style={isSecondHand ? styles.secondHandBadge : styles.firstHandBadge}>
              <Ionicons
                name={isSecondHand ? 'repeat' : 'sparkles'}
                size={11}
                color={isSecondHand ? '#B45309' : '#047857'}
              />
              <Text style={isSecondHand ? styles.secondHandText : styles.firstHandText}>
                {item.item_type || 'First Hand'}
              </Text>
            </View>

            {/* Bulk vs Individual Tracking Badge */}
            <View style={isBulk ? styles.bulkBadge : styles.imeiBadge}>
              <Ionicons
                name={isBulk ? 'layers' : 'barcode'}
                size={11}
                color={isBulk ? '#4338CA' : '#0F766E'}
              />
              <Text style={isBulk ? styles.bulkBadgeText : styles.imeiBadgeText}>
                {isBulk ? 'Bulk' : 'IMEI Unit'}
              </Text>
            </View>

            {hasValidImage && (
              <View style={styles.photoAttachedBadge}>
                <Ionicons name="camera" size={11} color="#059669" />
                <Text style={styles.photoAttachedText}>Photo</Text>
              </View>
            )}

            <View style={[styles.statusBadge, qty === 0 ? styles.statusOutOfStock : styles.statusInStock]}>
              <Text style={[styles.statusText, qty === 0 ? { color: '#DC2626' } : { color: '#059669' }]}>
                {qty === 0 ? 'Out of Stock' : `${qty} in stock`}
              </Text>
            </View>
          </View>

          <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
        </View>
      </TouchableOpacity>

      {/* IMEI & SKU Identification */}
      <View style={styles.metaRow}>
        {hasImei ? (
          <View style={styles.metaPill}>
            <Ionicons name="barcode-outline" size={13} color="#0F766E" />
            <Text style={styles.imeiText}>IMEI: {item.imei}</Text>
          </View>
        ) : null}
        <View style={styles.metaPill}>
          <Ionicons name="pricetag-outline" size={12} color="#64748B" />
          <Text style={styles.skuText}>{item.sku}</Text>
        </View>
      </View>

      {/* Source Info (Distributor vs Second-Hand Seller Customer) */}
      {isSecondHand ? (
        <View style={styles.secondHandCustomerBox}>
          <View style={styles.secondHandCustomerHeader}>
            <Ionicons name="person" size={12} color="#B45309" />
            <Text style={styles.secondHandCustomerTitle}>Seller Customer (Device Owner)</Text>
          </View>
          <Text style={styles.secondHandCustomerName}>
            {item.seller_name || 'Individual Customer'}
            {item.seller_phone ? ` • 📞 ${item.seller_phone}` : ''}
          </Text>
          {item.seller_email ? (
            <Text style={styles.secondHandCustomerSub}>✉️ {item.seller_email}</Text>
          ) : null}
          {item.seller_address ? (
            <Text style={styles.secondHandCustomerSub}>📍 {item.seller_address}</Text>
          ) : null}
          {item.condition_notes ? (
            <Text style={styles.secondHandConditionText}>
              Condition: {item.condition_notes}
            </Text>
          ) : null}
        </View>
      ) : item.distributor ? (
        <View style={[styles.sourceBox, { backgroundColor: '#F0FDFA', borderColor: '#CCFBF1' }]}>
          <Ionicons name="business-outline" size={13} color="#0F766E" />
          <Text style={[styles.sourceText, { color: '#0F766E' }]} numberOfLines={1}>
            Distributor: <Text style={{ color: '#0F172A', fontWeight: '700' }}>{item.distributor}</Text>
          </Text>
        </View>
      ) : null}

      {/* Pricing Row in Rs */}
      <View style={styles.pricingRow}>
        <View>
          <Text style={styles.priceLabel}>Buy Price</Text>
          <Text style={styles.costPriceValue}>
            Rs {costPrice.toLocaleString('en-IN')}
          </Text>
        </View>

        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.priceLabel}>Selling Price</Text>
          {hasSellingPrice ? (
            <Text style={styles.sellPriceValue}>
              Rs {sellingPrice.toLocaleString('en-IN')}
            </Text>
          ) : (
            <Text style={styles.sellPriceEmpty}>Decide at sale</Text>
          )}
        </View>
      </View>

      {/* Actions: Edit, Quick Stock Stepper, Delete */}
      <View style={styles.actionsRow}>
        <View style={styles.leftBtnGroup}>
          <TouchableOpacity style={styles.actionIconBtn} onPress={() => onEdit(item)}>
            <Ionicons name="pencil" size={15} color="#475569" />
            <Text style={styles.actionBtnLabel}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionIconBtn, styles.editQtyBtn]} onPress={() => onOpenStockModal(item)}>
            <Ionicons name="options-outline" size={14} color="#4338CA" />
            <Text style={[styles.actionBtnLabel, { color: '#4338CA', fontWeight: '700' }]}>Edit Count</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionIconBtn} onPress={handleDeletePrompt}>
            <Ionicons name="trash-outline" size={15} color="#DC2626" />
            <Text style={[styles.actionBtnLabel, { color: '#DC2626' }]}>Delete</Text>
          </TouchableOpacity>
        </View>

        {/* Stepper Buttons */}
        <View style={styles.stepperGroup}>
          <TouchableOpacity
            style={[styles.stepBtn, qty <= 0 && styles.stepDisabled]}
            disabled={qty <= 0}
            onPress={() => onQuickAdjust(item, 'OUT', 1)}
          >
            <Ionicons name="remove" size={15} color={qty <= 0 ? '#94A3B8' : '#0F172A'} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.stepNumWrap}
            onPress={() => onOpenStockModal(item)}
          >
            <Text style={styles.stepNum}>{qty}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.stepBtn}
            onPress={handlePlusPress}
          >
            <Ionicons
              name="add"
              size={14}
              color="#0F172A"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Full Size Photo Viewer Modal */}
      {allImages.length > 0 && (
        <Modal
          visible={isPhotoViewerOpen}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsPhotoViewerOpen(false)}
        >
          <View style={styles.viewerOverlay}>
            <View style={styles.viewerCard}>
              <View style={styles.viewerHeader}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={styles.viewerTitle} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.viewerSub}>
                    {item.category} • {item.item_type || 'First Hand'} {item.imei ? `• IMEI: ${item.imei}` : ''}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.viewerCloseBtn}
                  onPress={() => setIsPhotoViewerOpen(false)}
                >
                  <Ionicons name="close" size={20} color="#0F172A" />
                </TouchableOpacity>
              </View>

              <View style={styles.viewerImageWrap}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} pagingEnabled>
                  {allImages.map((imgUrl, i) => (
                    <Image
                      key={i}
                      source={{ uri: imgUrl }}
                      style={[styles.viewerImage, { width: Dimensions.get('window').width - 40, marginRight: 10 }]} // Dynamic width
                      resizeMode="contain"
                    />
                  ))}
                </ScrollView>
              </View>

              <View style={styles.viewerFooter}>
                <View style={styles.viewerMetaRow}>
                  <Text style={styles.viewerMetaLabel}>Buy Price</Text>
                  <Text style={styles.viewerMetaVal}>Rs {costPrice.toLocaleString('en-IN')}</Text>
                </View>
                {hasSellingPrice && (
                  <View style={styles.viewerMetaRow}>
                    <Text style={styles.viewerMetaLabel}>Selling Price</Text>
                    <Text style={[styles.viewerMetaVal, { color: '#059669' }]}>
                      Rs {sellingPrice.toLocaleString('en-IN')}
                    </Text>
                  </View>
                )}
                {item.condition_notes ? (
                  <View style={styles.viewerConditionBox}>
                    <Text style={styles.viewerConditionText}>Notes: {item.condition_notes}</Text>
                  </View>
                ) : null}
                <TouchableOpacity
                  style={styles.viewerDismissBtn}
                  onPress={() => setIsPhotoViewerOpen(false)}
                >
                  <Text style={styles.viewerDismissBtnText}>Close Preview</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardMainRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  thumbnailWrap: {
    width: 68,
    height: 68,
    borderRadius: 14,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#0F172A',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  photoZoomBadge: {
    position: 'absolute',
    bottom: 3,
    right: 3,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoAttachedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  photoAttachedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  placeholderThumb: {
    width: 68,
    height: 68,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  viewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  viewerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
  },
  viewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  viewerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  viewerSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  viewerCloseBtn: {
    padding: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
  },
  viewerImageWrap: {
    width: '100%',
    height: 300,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerImage: {
    width: '100%',
    height: '100%',
  },
  viewerFooter: {
    padding: 14,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  viewerMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  viewerMetaLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  viewerMetaVal: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '800',
  },
  viewerConditionBox: {
    backgroundColor: '#FFFBEB',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FEF3C7',
    marginBottom: 10,
  },
  viewerConditionText: {
    fontSize: 11,
    color: '#92400E',
    fontStyle: 'italic',
  },
  viewerDismissBtn: {
    backgroundColor: '#0F172A',
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
  },
  viewerDismissBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  categoryBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryBadgeText: {
    color: '#334155',
    fontSize: 11,
    fontWeight: '700',
  },
  firstHandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  firstHandText: {
    color: '#047857',
    fontSize: 11,
    fontWeight: '700',
  },
  secondHandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  secondHandText: {
    color: '#B45309',
    fontSize: 11,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: 'auto',
  },
  statusInStock: {
    backgroundColor: '#ECFDF5',
  },
  statusOutOfStock: {
    backgroundColor: '#FEF2F2',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  itemName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  imeiText: {
    fontSize: 11,
    color: '#0F766E',
    fontWeight: '700',
  },
  skuText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  sourceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  sourceText: {
    fontSize: 11,
    color: '#92400E',
    flex: 1,
  },
  secondHandCustomerBox: {
    backgroundColor: '#FFFBEB',
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  secondHandCustomerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  secondHandCustomerTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B45309',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  secondHandCustomerName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  secondHandCustomerSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  secondHandConditionText: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 3,
    fontStyle: 'italic',
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  priceLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 2,
  },
  costPriceValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  sellPriceValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#059669',
  },
  sellPriceEmpty: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D97706',
    fontStyle: 'italic',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  leftBtnGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionIconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  actionBtnLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  stepperGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stepBtn: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDisabled: {
    opacity: 0.3,
  },
  stepNumWrap: {
    paddingHorizontal: 10,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#E2E8F0',
  },
  stepNum: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  bulkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  bulkBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4338CA',
  },
  imeiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  imeiBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F766E',
  },
  editQtyBtn: {
    backgroundColor: '#EEF2FF',
    borderRadius: 6,
    paddingHorizontal: 8,
  },
  stepDisabledImei: {
    backgroundColor: '#F1F5F9',
  },
});
