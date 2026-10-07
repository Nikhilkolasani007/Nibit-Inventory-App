// src/components/ItemModal.js - Add/Edit Product with Physical Photos & White Theme
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import BarcodeScannerModal from './BarcodeScannerModal';
import apiService from '../services/apiService';

const CATEGORIES = ['Mobile', 'Accessories', 'Other Products'];
const ITEM_TYPES = ['First Hand', 'Second Hand'];
// Entry Mode: Bulk = no IMEI (many units same model), Individual = IMEI required (one unique device)
const ENTRY_MODES = ['Individual', 'Bulk'];

export default function ItemModal({
  visible,
  onClose,
  onSave,
  itemToEdit
}) {
  const [category, setCategory] = useState('Mobile');
  const [itemType, setItemType] = useState('First Hand');
  const [entryMode, setEntryMode] = useState('Individual'); // 'Individual' | 'Bulk'
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [imei, setImei] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [distributor, setDistributor] = useState('');
  const [sellerName, setSellerName] = useState('');
  const [sellerPhone, setSellerPhone] = useState('');
  const [sellerEmail, setSellerEmail] = useState('');
  const [sellerAddress, setSellerAddress] = useState('');
  const [conditionNotes, setConditionNotes] = useState('');
  const [quantity, setQuantity] = useState('1');

  // Physical Photo State
  const [photos, setPhotos] = useState([]); // Array of { uri, base64, uploadedUrl, status: 'uploading' | 'uploaded' | 'error' }
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Scanner Modal
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  useEffect(() => {
    if (itemToEdit) {
      setCategory(itemToEdit.category || 'Mobile');
      setItemType(itemToEdit.item_type || 'First Hand');
      const hasImei = !!(itemToEdit.imei || itemToEdit.barcode);
      const isBulk = itemToEdit.entry_type === 'Bulk' || (!hasImei);
      setEntryMode(isBulk ? 'Bulk' : 'Individual');
      setName(itemToEdit.name || '');
      setSku(itemToEdit.sku || '');
      setImei(itemToEdit.imei || itemToEdit.barcode || '');
      setCostPrice(itemToEdit.cost_price ? String(itemToEdit.cost_price) : '');
      setSellingPrice(itemToEdit.selling_price ? String(itemToEdit.selling_price) : '');
      setDistributor(itemToEdit.distributor || itemToEdit.supplier || '');
      setSellerName(itemToEdit.seller_name || '');
      setSellerPhone(itemToEdit.seller_phone || '');
      setSellerEmail(itemToEdit.seller_email || '');
      setSellerAddress(itemToEdit.seller_address || '');
      setConditionNotes(itemToEdit.condition_notes || itemToEdit.description || '');
      setQuantity(String(itemToEdit.quantity || 1));
      
      const existingImg = itemToEdit.images || '';
      if (existingImg) {
        let parsed = [];
        try {
          if (existingImg.startsWith('[')) {
            parsed = JSON.parse(existingImg);
          } else if (existingImg.includes(',')) {
            parsed = existingImg.split(',').map(s => s.trim());
          } else {
            parsed = [existingImg];
          }
        } catch(e) { parsed = [existingImg]; }
        
        setPhotos(parsed.map(url => ({
          uri: apiService.getImageUrl(url) || url,
          base64: '',
          uploadedUrl: url,
          status: 'uploaded'
        })));
      } else {
        setPhotos([]);
      }
    } else {
      setCategory('Mobile');
      setItemType('First Hand');
      setEntryMode('Individual');
      setName('');
      setSku('SKU-' + Math.floor(100000 + Math.random() * 900000));
      setImei('');
      setCostPrice('');
      setSellingPrice('');
      setDistributor('');
      setSellerName('');
      setSellerPhone('');
      setSellerEmail('');
      setSellerAddress('');
      setConditionNotes('');
      setQuantity('1');
      setPhotos([]);
    }
  }, [itemToEdit, visible]);

  // Upload image (base64 or local URI) directly to server
  const uploadImageToServer = async (photoIndex, imageInput) => {
    if (!imageInput) return null;
    setIsUploadingPhoto(true);
    
    setPhotos(prev => {
      const newPhotos = [...prev];
      if (newPhotos[photoIndex]) newPhotos[photoIndex].status = 'uploading';
      return newPhotos;
    });

    try {
      const serverUrl = await apiService.uploadImage(imageInput);
      if (serverUrl) {
        setPhotos(prev => {
          const newPhotos = [...prev];
          if (newPhotos[photoIndex]) {
            newPhotos[photoIndex].uploadedUrl = serverUrl;
            newPhotos[photoIndex].uri = serverUrl;
            newPhotos[photoIndex].status = 'uploaded';
          }
          return newPhotos;
        });
      } else {
        setPhotos(prev => {
          const newPhotos = [...prev];
          if (newPhotos[photoIndex]) newPhotos[photoIndex].status = 'error';
          return newPhotos;
        });
      }
      return serverUrl;
    } catch (err) {
      console.warn('Image upload error:', err);
      setPhotos(prev => {
        const newPhotos = [...prev];
        if (newPhotos[photoIndex]) newPhotos[photoIndex].status = 'error';
        return newPhotos;
      });
      return null;
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Helper to extract base64 from asset or fallback to FileReader
  const extractBase64 = async (asset) => {
    if (asset.base64) return asset.base64;
    if (asset.uri) {
      try {
        const resp = await fetch(asset.uri);
        const blob = await resp.blob();
        return await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (e) {
        console.warn('Could not extract base64 via FileReader:', e);
      }
    }
    return '';
  };

  // Take photo with camera
  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Camera permission is required to capture physical phone photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false, 
        quality: 0.6,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const currentLength = photos.length;
        
        setPhotos(prev => [...prev, {
          uri: asset.uri,
          base64: '',
          uploadedUrl: '',
          status: 'uploading'
        }]);

        uploadImageToServer(currentLength, asset.uri);
      }
    } catch (e) {
      Alert.alert('Camera Error', e.message || 'Could not open camera.');
    }
  };

  // Pick photo from files / gallery
  const handlePickFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Photo gallery permission is required to select device photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false, 
        allowsMultipleSelection: true,
        quality: 0.6,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        // We handle multiple assets
        const currentLength = photos.length;
        const newEntries = result.assets.map(asset => ({
          uri: asset.uri,
          base64: '',
          uploadedUrl: '',
          status: 'uploading'
        }));
        
        setPhotos(prev => [...prev, ...newEntries]);

        // Upload them concurrently
        result.assets.forEach(async (asset, i) => {
          const indexToUpdate = currentLength + i;
          uploadImageToServer(indexToUpdate, asset.uri);
        });
      }
    } catch (e) {
      Alert.alert('Gallery Error', e.message || 'Could not open photo gallery.');
    }
  };

  const submitPayload = (finalImageUrl) => {
    const isBulk = entryMode === 'Bulk';
    const payload = {
      name: name.trim(),
      sku: sku.trim() || ('SKU-' + Date.now()),
      category,
      item_type: itemType,
      entry_type: entryMode,
      imei: isBulk ? '' : imei.trim(),
      cost_price: parseFloat(costPrice) || 0.0,
      selling_price: sellingPrice ? parseFloat(sellingPrice) : null,
      distributor: distributor.trim(),
      seller_name: sellerName.trim(),
      seller_phone: sellerPhone.trim(),
      seller_email: sellerEmail.trim(),
      seller_address: sellerAddress.trim(),
      condition_notes: conditionNotes.trim(),
      images: finalImageUrl || '',
      quantity: isBulk ? Math.max(1, parseInt(quantity, 10) || 1) : 1,
      min_quantity: 1
    };

    if (itemToEdit?.id) {
      payload.id = itemToEdit.id;
    }

    onSave(payload);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Please enter a product name or model.');
      return;
    }

    // Process all photos
    const urls = [];
    let hasUploadErrors = false;
    let isWaitingForUpload = false;

    for (let i = 0; i < photos.length; i++) {
      const p = photos[i];
      if (p.uploadedUrl) {
        urls.push(p.uploadedUrl);
      } else if (p.status === 'uploading') {
        isWaitingForUpload = true;
      } else if (p.uri) {
        // Not uploaded yet, try now
        setIsUploadingPhoto(true);
        try {
          const uploaded = await uploadImageToServer(i, p.base64 || p.uri);
          if (uploaded) {
            urls.push(uploaded);
          } else {
            hasUploadErrors = true;
          }
        } catch (e) {
          hasUploadErrors = true;
        }
      }
    }

    if (isWaitingForUpload) {
      Alert.alert('Upload in Progress', 'Please wait for all photos to finish uploading.');
      return;
    }

    if (hasUploadErrors) {
      Alert.alert(
        'Photo Upload Issue',
        'Could not upload some photos. Save anyway?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Save Anyway',
            style: 'destructive',
            onPress: () => submitPayload(urls.length > 0 ? JSON.stringify(urls) : '')
          }
        ]
      );
      return;
    }

    submitPayload(urls.length > 0 ? JSON.stringify(urls) : '');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.modalCard}>
          {/* Header - White Clean Design */}
          <View style={styles.header}>
            <View>
              <Text style={styles.modalTitle}>
                {itemToEdit ? 'Edit Product' : 'Add New Product'}
              </Text>
              <Text style={styles.modalSubtitle}>
                {category} • {itemType} • {entryMode}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* 0. Entry Mode: Individual vs Bulk */}
            <Text style={styles.sectionLabel}>Entry Type</Text>
            <View style={styles.entryModeRow}>
              <TouchableOpacity
                style={[styles.entryModeBtn, entryMode === 'Individual' && styles.entryModeBtnActiveIndiv]}
                onPress={() => { setEntryMode('Individual'); setQuantity('1'); }}
                activeOpacity={0.8}
              >
                <Ionicons name="phone-portrait" size={18} color={entryMode === 'Individual' ? '#FFFFFF' : '#475569'} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.entryModeBtnTitle, entryMode === 'Individual' && { color: '#FFFFFF' }]}>Individual</Text>
                  <Text style={[styles.entryModeBtnSub, entryMode === 'Individual' && { color: 'rgba(255,255,255,0.8)' }]}>One device with IMEI / Serial No.</Text>
                </View>
                {entryMode === 'Individual' && <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.entryModeBtn, entryMode === 'Bulk' && styles.entryModeBtnActiveBulk, { marginTop: 8 }]}
                onPress={() => { setEntryMode('Bulk'); setImei(''); }}
                activeOpacity={0.8}
              >
                <Ionicons name="layers" size={18} color={entryMode === 'Bulk' ? '#FFFFFF' : '#475569'} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.entryModeBtnTitle, entryMode === 'Bulk' && { color: '#FFFFFF' }]}>Bulk Stock</Text>
                  <Text style={[styles.entryModeBtnSub, entryMode === 'Bulk' && { color: 'rgba(255,255,255,0.8)' }]}>Multiple units, no individual IMEI tracking</Text>
                </View>
                {entryMode === 'Bulk' && <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />}
              </TouchableOpacity>
            </View>

            {/* 1. Category Selection */}
            <Text style={styles.sectionLabel}>Select Category</Text>
            <View style={styles.tabRow}>
              {CATEGORIES.map((cat) => {
                const isActive = category === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                    onPress={() => setCategory(cat)}
                  >
                    <Ionicons
                      name={cat === 'Mobile' ? 'phone-portrait' : cat === 'Accessories' ? 'headset' : 'cube'}
                      size={15}
                      color={isActive ? '#FFFFFF' : '#475569'}
                    />
                    <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{cat}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 2. Condition: First Hand vs Second Hand */}
            <Text style={styles.sectionLabel}>Condition / Hand Type</Text>
            <View style={styles.tabRow}>
              {ITEM_TYPES.map((type) => {
                const isActive = itemType === type;
                return (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.handBtn,
                      isActive && (type === 'First Hand' ? styles.firstHandActive : styles.secondHandActive)
                    ]}
                    onPress={() => setItemType(type)}
                  >
                    <Ionicons
                      name={type === 'First Hand' ? 'sparkles' : 'repeat'}
                      size={16}
                      color={isActive ? '#FFFFFF' : '#64748B'}
                    />
                    <Text style={[styles.handBtnText, isActive && styles.handBtnTextActive]}>
                      {type} {type === 'First Hand' ? '(Brand New)' : '(Used / Pre-owned)'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 3. Physical Photo of Device */}
            <View style={styles.photoHeaderRow}>
              <Text style={styles.sectionLabel}>Physical Device Photos</Text>
            </View>

            <View style={styles.photoContainer}>
              {photos.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                  {photos.map((p, index) => (
                    <View key={index} style={[styles.photoCard, { width: 250, marginRight: 10 }]}>
                      <View style={styles.photoPreviewWrap}>
                        <Image source={{ uri: p.uri }} style={styles.photoPreview} resizeMode="cover" />
                        {p.status === 'uploading' && (
                          <View style={styles.uploadingOverlay}>
                            <ActivityIndicator size="large" color="#FFFFFF" />
                            <Text style={styles.uploadingOverlayText}>Uploading...</Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.photoCardFooter}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={[styles.photoPreviewSub, p.status === 'error' && { color: '#DC2626' }]}>
                            {p.status === 'uploading'
                              ? 'Uploading to server...'
                              : p.status === 'uploaded'
                              ? 'Synced to database'
                              : p.status === 'error'
                              ? 'Upload failed (tap Retry)'
                              : 'Ready to save'}
                          </Text>
                        </View>
                        <View style={styles.photoCardActions}>
                          {p.status === 'error' && (
                            <TouchableOpacity
                              style={[styles.changePhotoBtn, { borderColor: '#DC2626', backgroundColor: '#FEF2F2' }]}
                              onPress={() => uploadImageToServer(index, p.base64 || p.uri)}
                              disabled={p.status === 'uploading'}
                            >
                              <Ionicons name="refresh" size={14} color="#DC2626" />
                              <Text style={[styles.changePhotoBtnText, { color: '#DC2626' }]}>Retry</Text>
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity
                            style={styles.removePhotoBtnNew}
                            onPress={() => {
                              setPhotos(prev => prev.filter((_, i) => i !== index));
                            }}
                            disabled={p.status === 'uploading'}
                          >
                            <Ionicons name="trash-outline" size={14} color="#DC2626" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              ) : null}

              <View style={styles.photoUploadPromptCard}>
                <View style={styles.photoPromptHeader}>
                  <View style={styles.cameraIconCircle}>
                    <Ionicons name="images-outline" size={24} color="#0F172A" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.photoPromptTitle}>Upload Device Photos</Text>
                    <Text style={styles.photoPromptSub}>Add multiple photos from camera or gallery</Text>
                  </View>
                </View>

                <View style={styles.photoActionRow}>
                  <TouchableOpacity
                    style={styles.photoActionBtnPrimary}
                    onPress={handleTakePhoto}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="camera" size={18} color="#FFFFFF" />
                    <Text style={styles.photoActionBtnTextPrimary}>Camera Shot</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.photoActionBtnSecondary}
                    onPress={handlePickFromGallery}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="images-outline" size={18} color="#0F172A" />
                    <Text style={styles.photoActionBtnTextSecondary}>From Gallery</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* 4. Product Details */}
            <Text style={styles.sectionLabel}>Product Information</Text>
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Product / Model Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. iPhone 15 Pro Max 256GB / Samsung S24"
                placeholderTextColor="#94A3B8"
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* IMEI / Barcode with Live Scanner Button — Only for Individual mode */}
            {entryMode === 'Individual' && (
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>IMEI / Serial Number / Barcode</Text>
                <View style={styles.imeiRow}>
                  <TextInput
                    style={[styles.input, { flex: 1, borderTopRightRadius: 0, borderBottomRightRadius: 0 }]}
                    placeholder="e.g. 354892091234567"
                    placeholderTextColor="#94A3B8"
                    value={imei}
                    onChangeText={setImei}
                    keyboardType="default"
                    autoCapitalize="characters"
                  />
                  <TouchableOpacity
                    style={styles.scanBtn}
                    onPress={() => setIsScannerOpen(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="barcode" size={18} color="#FFFFFF" />
                    <Text style={styles.scanBtnText}>Scan</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Bulk Note: no IMEI */}
            {entryMode === 'Bulk' && (
              <View style={styles.bulkNotice}>
                <Ionicons name="information-circle" size={15} color="#475569" />
                <Text style={styles.bulkNoticeText}>
                  Bulk mode: IMEI is not tracked per unit. Use Individual mode for IMEI-tracked devices.
                </Text>
              </View>
            )}

            {/* 5. Pricing (in Rs) */}
            <View style={styles.twoColRow}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Buy Price (Rs) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 45000"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={costPrice}
                  onChangeText={setCostPrice}
                />
                <Text style={styles.inputHint}>How much we buy for it</Text>
              </View>

              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Selling Price (Rs)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Leave empty or set"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={sellingPrice}
                  onChangeText={setSellingPrice}
                />
                <Text style={styles.inputHint}>Decide at sale time or pre-set</Text>
              </View>
            </View>

            {/* 6. Dynamic Section based on First Hand vs Second Hand */}
            {itemType === 'First Hand' ? (
              <View style={styles.conditionalCard}>
                <View style={styles.conditionalHeader}>
                  <Ionicons name="business" size={16} color="#0F766E" />
                  <Text style={styles.conditionalTitle}>First Hand / Distributor Source</Text>
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Distributor / Supplier Name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Apple Direct, Apex Telecoms, Global Distributors"
                    placeholderTextColor="#94A3B8"
                    value={distributor}
                    onChangeText={setDistributor}
                  />
                </View>
              </View>
            ) : (
              <View style={[styles.conditionalCard, { borderColor: '#FDE68A', backgroundColor: '#FFFBEB' }]}>
                <View style={styles.conditionalHeader}>
                  <Ionicons name="person" size={16} color="#D97706" />
                  <Text style={[styles.conditionalTitle, { color: '#B45309' }]}>Second Hand / Customer We Buy From</Text>
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Customer Name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Rahul Sharma"
                    placeholderTextColor="#94A3B8"
                    value={sellerName}
                    onChangeText={setSellerName}
                  />
                </View>

                <View style={styles.twoColRow}>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Phone Number</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. 9876543210"
                      placeholderTextColor="#94A3B8"
                      keyboardType="phone-pad"
                      value={sellerPhone}
                      onChangeText={setSellerPhone}
                    />
                  </View>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Email (Optional)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. rahul@gmail.com"
                      placeholderTextColor="#94A3B8"
                      keyboardType="email-address"
                      value={sellerEmail}
                      onChangeText={setSellerEmail}
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Customer Address / ID Details</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Address, Aadhaar/ID notes"
                    placeholderTextColor="#94A3B8"
                    value={sellerAddress}
                    onChangeText={setSellerAddress}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Device Condition &amp; Accessories</Text>
                  <TextInput
                    style={[styles.input, { height: 60 }]}
                    placeholder="e.g. Battery 88%, Minor back scratches, Original box included"
                    placeholderTextColor="#94A3B8"
                    multiline
                    value={conditionNotes}
                    onChangeText={setConditionNotes}
                  />
                </View>
              </View>
            )}

            {/* 7. Quantity */}
            <View style={[styles.formGroup, { marginTop: 10 }]}>
              <Text style={styles.inputLabel}>
                {entryMode === 'Bulk' ? 'Bulk Quantity (Units in Stock)' : 'Stock Quantity'}
              </Text>
              {entryMode === 'Bulk' ? (
                <View style={styles.qtyStepRow}>
                  <TouchableOpacity
                    style={styles.qtyStepBtn}
                    onPress={() => setQuantity(String(Math.max(1, (parseInt(quantity, 10) || 1) - 1)))}>
                    <Ionicons name="remove" size={18} color="#0F172A" />
                  </TouchableOpacity>
                  <TextInput
                    style={[styles.input, { flex: 1, textAlign: 'center', marginHorizontal: 8 }]}
                    placeholder="e.g. 10"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={quantity}
                    onChangeText={setQuantity}
                  />
                  <TouchableOpacity
                    style={styles.qtyStepBtn}
                    onPress={() => setQuantity(String((parseInt(quantity, 10) || 0) + 1))}>
                    <Ionicons name="add" size={18} color="#0F172A" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={[styles.input, { justifyContent: 'center', backgroundColor: '#F8FAFC' }]}>
                  <Text style={{ color: '#0F172A', fontWeight: '700', fontSize: 14 }}>1 Unit (Locked for unique IMEI device)</Text>
                </View>
              )}
              <Text style={styles.inputHint}>
                {entryMode === 'Individual' ? 'Individual unit (1 device per entry)' : 'Total units received at once'}
              </Text>
            </View>
          </ScrollView>

          {/* Action Buttons - White Theme */}
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={isUploadingPhoto}>
              {isUploadingPhoto ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                  <Text style={styles.saveBtnText}>{itemToEdit ? 'Save Changes' : 'Add to Inventory'}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Barcode & IMEI Live Scanner Modal */}
      <BarcodeScannerModal
        visible={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        title="Scan IMEI / Product Barcode"
        onScan={(code) => {
          setImei(code);
          Alert.alert('IMEI Scanned', `Detected code: ${code}`);
        }}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#0F766E',
    fontWeight: '700',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  scrollArea: {
    maxHeight: 520,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 8,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabBtnActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  handBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  firstHandActive: {
    backgroundColor: '#0F766E',
    borderColor: '#0F766E',
  },
  secondHandActive: {
    backgroundColor: '#D97706',
    borderColor: '#D97706',
  },
  handBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  handBtnTextActive: {
    color: '#FFFFFF',
  },
  photoHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  photoContainer: {
    marginBottom: 16,
  },
  photoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  photoPreviewWrap: {
    position: 'relative',
    height: 180,
    width: '100%',
    backgroundColor: '#0F172A',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  uploadingOverlayText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  photoCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  photoPreviewName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  photoPreviewSub: {
    fontSize: 11,
    color: '#059669',
    marginTop: 2,
    fontWeight: '600',
  },
  photoCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  changePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  changePhotoBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  removePhotoBtnNew: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  removePhotoBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  photoUploadPromptCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    padding: 14,
  },
  photoPromptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  cameraIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPromptTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  photoPromptSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 15,
  },
  photoActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  photoActionBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingVertical: 12,
  },
  photoActionBtnTextPrimary: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  photoActionBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingVertical: 12,
  },
  photoActionBtnTextSecondary: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  formGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: '#0F172A',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inputHint: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 3,
  },
  imeiRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    justifyContent: 'center',
  },
  scanBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 12,
  },
  conditionalCard: {
    backgroundColor: '#F0FDFA',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#CCFBF1',
    marginTop: 6,
    marginBottom: 8,
  },
  conditionalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  conditionalTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F766E',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#64748B',
    fontWeight: '700',
    fontSize: 14,
  },
  saveBtn: {
    flex: 2,
    backgroundColor: '#0F172A',
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  entryModeRow: {
    marginBottom: 16,
  },
  entryModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  entryModeBtnActiveIndiv: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  entryModeBtnActiveBulk: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  entryModeBtnTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  entryModeBtnSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  bulkNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  bulkNoticeText: {
    flex: 1,
    fontSize: 12,
    color: '#475569',
  },
  qtyStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qtyStepBtn: {
    width: 42,
    height: 42,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inputHint: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
  },
  uploadedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  uploadedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
});
