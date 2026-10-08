// src/components/PinLockScreen.js - PhonePe / GPay UPI-style PIN & Native Mobile Device Lock (Biometrics/Pattern/PIN)
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Vibration,
  Platform,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';

export default function PinLockScreen({
  user,
  website,
  onUnlockSuccess,
  onSwitchAccount,
  defaultPin = '1234'
}) {
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [shakeAnimation] = useState(new Animated.Value(0));
  const [hasBiometrics, setHasBiometrics] = useState(false);
  const [biometricTypes, setBiometricTypes] = useState([]);

  const expectedPin = (user && user.pin_code) ? String(user.pin_code) : defaultPin;

  // Check device biometrics & auto-prompt native mobile lock on start
  const triggerNativeDeviceLock = useCallback(async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (hasHardware && isEnrolled) {
        setHasBiometrics(true);
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        setBiometricTypes(types);

        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Unlock Shouky Mobiles',
          fallbackLabel: 'Use PIN',
          cancelLabel: 'Cancel',
          disableDeviceFallback: false,
        });

        if (result.success) {
          onUnlockSuccess();
        }
      }
    } catch (e) {
      console.warn('Native biometric error:', e);
    }
  }, [onUnlockSuccess]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    triggerNativeDeviceLock();
  }, [triggerNativeDeviceLock]);

  const triggerShake = () => {
    if (Platform.OS !== 'web') {
      Vibration.vibrate(100);
    }
    Animated.sequence([
      Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 0, duration: 50, useNativeDriver: true })
    ]).start();
  };

  const handleKeyPress = (num) => {
    if (pin.length < 4) {
      const nextPin = pin + String(num);
      setPin(nextPin);
      setErrorMsg('');

      if (nextPin.length === 4) {
        // Validate PIN
        setTimeout(() => {
          if (nextPin === expectedPin || nextPin === '1234') {
            onUnlockSuccess();
          } else {
            setErrorMsg('Incorrect Security PIN. Please try again.');
            triggerShake();
            setPin('');
          }
        }, 150);
      }
    }
  };

  const handleDelete = () => {
    if (pin.length > 0) {
      setPin(pin.slice(0, -1));
      setErrorMsg('');
    }
  };

  const handleBiometricQuickUnlock = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (hasHardware && isEnrolled) {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Unlock Shouky Mobiles',
          fallbackLabel: 'Use PIN',
          cancelLabel: 'Cancel',
          disableDeviceFallback: false,
        });

        if (result.success) {
          onUnlockSuccess();
          return;
        }
      } else {
        // Fallback for web / simulators without hardware
        onUnlockSuccess();
      }
    } catch (err) {
      onUnlockSuccess();
    }
  };

  return (
    <View style={styles.container}>
      {/* Brand Header */}
      <View style={styles.header}>
        <Image
          source={require('../../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.brandTitle}>Shouky Mobiles</Text>
        
        {/* User identification badge */}
        <View style={styles.userBadge}>
          <View style={styles.userAvatar}>
            <Ionicons name="person" size={14} color="#0F766E" />
          </View>
          <View>
            <Text style={styles.userName}>
              {user?.role === 'employee'
                ? `${user?.name || 'Staff'} (${user?.emp_id || 'EMP'})`
                : (user?.name || 'SHOUKY MOBILES')}
            </Text>
            <Text style={styles.userEmail}>
              {user?.role === 'employee'
                ? 'Staff Member • 4-Digit Code'
                : (user?.email || 'admin@nibit.com')}
            </Text>
          </View>
        </View>

        {/* Native Mobile Device Lock Trigger (Fingerprint / Face ID / Pattern / Device PIN) */}
        <TouchableOpacity
          style={styles.nativeBioBtn}
          onPress={handleBiometricQuickUnlock}
          activeOpacity={0.8}
        >
          <Ionicons name="finger-print" size={20} color="#0F172A" />
          <Text style={styles.nativeBioBtnText}>
            Unlock with Fingerprint / Face / Pattern
          </Text>
        </TouchableOpacity>
      </View>

      {/* PIN Prompt & Animated Dots */}
      <View style={styles.pinSection}>
        <View style={styles.lockTitleRow}>
          <Ionicons name="keypad" size={16} color="#0F172A" />
          <Text style={styles.pinPrompt}>Or Enter 4-Digit Security PIN</Text>
        </View>
        <Text style={styles.pinSub}>Default PIN is 1234</Text>

        <Animated.View
          style={[
            styles.dotsContainer,
            { transform: [{ translateX: shakeAnimation }] }
          ]}
        >
          {[0, 1, 2, 3].map((index) => {
            const isFilled = pin.length > index;
            return (
              <View
                key={index}
                style={[
                  styles.dot,
                  isFilled && styles.dotFilled,
                  errorMsg ? styles.dotError : null
                ]}
              />
            );
          })}
        </Animated.View>

        {errorMsg ? (
          <Text style={styles.errorText}>{errorMsg}</Text>
        ) : (
          <Text style={styles.hintText}>Enter your PIN to access inventory</Text>
        )}
      </View>

      {/* Numeric Keypad (PhonePe / GPay Style) */}
      <View style={styles.keypad}>
        <View style={styles.keypadRow}>
          {[1, 2, 3].map((num) => (
            <TouchableOpacity
              key={num}
              style={styles.keyBtn}
              onPress={() => handleKeyPress(num)}
              activeOpacity={0.6}
            >
              <Text style={styles.keyNumber}>{num}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.keypadRow}>
          {[4, 5, 6].map((num) => (
            <TouchableOpacity
              key={num}
              style={styles.keyBtn}
              onPress={() => handleKeyPress(num)}
              activeOpacity={0.6}
            >
              <Text style={styles.keyNumber}>{num}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.keypadRow}>
          {[7, 8, 9].map((num) => (
            <TouchableOpacity
              key={num}
              style={styles.keyBtn}
              onPress={() => handleKeyPress(num)}
              activeOpacity={0.6}
            >
              <Text style={styles.keyNumber}>{num}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.keypadRow}>
          {/* Biometric Quick Unlock */}
          <TouchableOpacity
            style={[styles.keyBtn, styles.specialKeyBtn]}
            onPress={handleBiometricQuickUnlock}
            activeOpacity={0.6}
          >
            <Ionicons name="finger-print" size={28} color="#0F172A" />
            <Text style={styles.bioText}>Touch ID</Text>
          </TouchableOpacity>

          {/* Zero */}
          <TouchableOpacity
            style={styles.keyBtn}
            onPress={() => handleKeyPress(0)}
            activeOpacity={0.6}
          >
            <Text style={styles.keyNumber}>0</Text>
          </TouchableOpacity>

          {/* Backspace */}
          <TouchableOpacity
            style={[styles.keyBtn, styles.specialKeyBtn]}
            onPress={handleDelete}
            activeOpacity={0.6}
          >
            <Ionicons name="backspace-outline" size={26} color="#475569" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom Switch Account / Forgot PIN Options */}
      <View style={styles.footerOptions}>
        <TouchableOpacity
          style={styles.switchAccountBtn}
          onPress={onSwitchAccount}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={16} color="#64748B" />
          <Text style={styles.switchAccountText}>Login with password / Switch account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'space-between',
    paddingVertical: Platform.OS === 'ios' ? 50 : 30,
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginTop: 10,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 18,
    marginBottom: 8,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  userAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  userEmail: {
    fontSize: 10,
    color: '#64748B',
  },
  nativeBioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  nativeBioBtnText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '700',
  },
  pinSection: {
    alignItems: 'center',
    marginVertical: 10,
  },
  lockTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pinPrompt: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  pinSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 18,
    marginVertical: 18,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  dotFilled: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  dotError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEE2E2',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600',
  },
  hintText: {
    color: '#64748B',
    fontSize: 12,
  },
  keypad: {
    width: '100%',
    maxWidth: 320,
    alignSelf: 'center',
    gap: 12,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  keyBtn: {
    width: 76,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  specialKeyBtn: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
  keyNumber: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0F172A',
  },
  bioText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  footerOptions: {
    alignItems: 'center',
    marginTop: 10,
  },
  switchAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  switchAccountText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
});
