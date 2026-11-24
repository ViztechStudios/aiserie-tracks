import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientHeader, GlassCard } from '../components/GradientHeader';
import { AuroraBackground } from '../components/AuroraBackground';
import { useFinance } from '../store/FinanceContext';
import { useUI } from '../store/UIContext';
import { useTheme } from '../store/ThemeContext';
import { categoriesFor } from '../data/categories';
import { brandOcean, font, radius, spacing } from '../theme';
import { parseReceiptText, receiptSummary } from '../utils/receipt';
import { todayISO } from '../utils/stats';
import { formatMoney, parseAmount } from '../utils/money';
import { useResponsive } from '../hooks/useResponsive';

// ML Kit OCR is a native-only module. Keep it out of the web bundle by
// requiring it lazily on native platforms only.
type TextRecognitionModule = { recognize: (imageUri: string) => Promise<{ text: string }> } | null;
let TextRecognition: TextRecognitionModule = null;
if (Platform.OS !== 'web') {
  try {
    TextRecognition = require('@react-native-ml-kit/text-recognition').default as TextRecognitionModule;
  } catch {
    TextRecognition = null; // e.g. Expo Go
  }
}

type Stage = 'camera' | 'review';

export function ScanScreen() {
  const finance = useFinance();
  const ui = useUI();
  const { t, isDark, gradients } = useTheme();
  const { contentWidth } = useResponsive();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [busy, setBusy] = useState<'' | 'capturing' | 'reading'>('');
  const [stage, setStage] = useState<Stage>('camera');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [ocrInfo, setOcrInfo] = useState('');
  const [amountRaw, setAmountRaw] = useState('');
  const [note, setNote] = useState('');
  const [categoryId, setCategoryId] = useState('groceries');

  const saveDraft = () => {
    const amount = parseAmount(amountRaw);
    if (amount === null) {
      Alert.alert('Missing amount', 'Enter the receipt total to save.');
      return;
    }
    finance.addTransaction({
      type: 'expense',
      amount,
      categoryId,
      date: todayISO(),
      note: note.trim() || 'Scanned receipt',
      source: 'scan',
    });
    Alert.alert('Saved', `${formatMoney(amount, finance.settings.currency)} logged under your chosen category.`);
    setStage('camera');
    setPhotoUri(null);
    setAmountRaw('');
    setNote('');
    setCategoryId('groceries');
    setOcrInfo('');
  };

  const startManual = () => {
    ui.openAdd({ categoryId: 'groceries', source: 'scan' });
  };

  const capture = async () => {
    try {
      setBusy('capturing');
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.85, skipProcessing: false });
      if (!photo?.uri) throw new Error('no photo');
      setPhotoUri(photo.uri);
      setBusy('reading');

      let parsedTotal: number | null = null;
      let merchant: string | null = null;
      let lines = 0;
      let ocrOk = false;
      if (TextRecognition) {
        try {
          const result = await TextRecognition.recognize(photo.uri);
          const parsed = parseReceiptText(result.text);
          parsedTotal = parsed.total;
          merchant = parsed.merchant;
          lines = parsed.lines.length;
          ocrOk = true;
        } catch {
          ocrOk = false; // ML Kit native module not available (e.g. Expo Go)
        }
      }

      if (ocrOk && parsedTotal !== null) {
        setAmountRaw(String(parsedTotal));
        setNote(merchant ? `Receipt · ${merchant}` : 'Scanned receipt');
        setOcrInfo(`Read ${lines} line${lines === 1 ? '' : 's'} off the receipt — confirm or edit the total below.`);
      } else if (ocrOk) {
        setOcrInfo('Could not find a total on this receipt. Enter it below.');
      } else {
        setOcrInfo('On-device OCR is unavailable in this environment. Enter the total manually.');
      }
      setStage('review');
    } catch {
      Alert.alert('Camera error', 'Could not capture the photo. Please try again.');
    } finally {
      setBusy('');
    }
  };

  // permission gate
  if (!permission) {
    return <View style={styles.root} />;
  }
  if (!permission.granted) {
    return (
      <View style={styles.root}>
        <AuroraBackground />
        <GradientHeader title="Scan receipt" subtitle="Point your camera at a grocery receipt" />
        <View style={styles.permissionBox}>
          <View style={[styles.permissionBadge, { backgroundColor: t.ice50, borderColor: t.line }]}>
            <Ionicons name="camera-outline" size={26} color={t.subtext} />
          </View>
          <Text style={[styles.permissionTitle, { color: t.text }]}>Camera access needed</Text>
          <Text style={[styles.permissionBody, { color: t.subtext }]}>
            Aiserie uses the camera only to read receipts on your device. Nothing is uploaded anywhere.
          </Text>
          <TouchableOpacity onPress={requestPermission} style={[styles.permissionBtn, { backgroundColor: brandOcean }]}>
            <Text style={[styles.permissionBtnText, { color: t.white }]}>Allow camera</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={startManual}>
            <Text style={[styles.permissionManual, { color: t.ocean600 }]}>or enter it manually instead</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <AuroraBackground />
      <GradientHeader title="Scan receipt" subtitle="Point at the receipt, hold steady, tap capture">
        <GlassCard>
          <Text style={styles.tipText}>
            Works best on flat, well-lit receipts. The total is read on-device and saved straight to your log.
          </Text>
        </GlassCard>
      </GradientHeader>

      {stage === 'camera' ? (
        <View style={styles.cameraWrap}>
          <CameraView ref={cameraRef} style={styles.camera} facing="back" enableTorch={torch} mode="picture" />
          <View style={styles.cameraControls}>
            <TouchableOpacity style={styles.toolBtn} onPress={() => setTorch((v) => !v)}>
              <Ionicons name={torch ? 'flash' : 'flash-outline'} size={22} color={t.white} />
            </TouchableOpacity>

            <TouchableOpacity onPress={capture} disabled={busy !== ''} activeOpacity={0.8}>
              <View style={styles.captureOuter}>
                <View style={[styles.captureInner, busy !== '' && { opacity: 0.6 }]}>
                  {busy !== '' ? (
                    <ActivityIndicator color={t.ocean600} />
                  ) : (
                    <View style={[styles.captureCore, { backgroundColor: t.ocean600 }]} />
                  )}
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.toolBtn} onPress={startManual}>
              <Ionicons name="create-outline" size={22} color={t.white} />
            </TouchableOpacity>
          </View>
          <Text style={styles.captureHint}>
            {busy === 'capturing' ? 'Capturing…' : busy === 'reading' ? 'Reading receipt…' : 'Tap to capture'}
          </Text>
        </View>
      ) : (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={[styles.review, contentWidth ? { alignSelf: 'center', width: '100%', maxWidth: contentWidth } : null]}
            keyboardShouldPersistTaps="handled"
          >
            {photoUri && (
              <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="cover" />
            )}
            <View style={[styles.reviewCard, { backgroundColor: t.card, borderColor: t.glassBorderSoft }]}>
              <Text style={[styles.ocrInfo, { color: t.subtext }]}>{ocrInfo}</Text>

              <Text style={[styles.label, { color: t.subtext }]}>TOTAL AMOUNT</Text>
              <View style={[styles.amountRow, { backgroundColor: t.ice50, borderColor: t.ocean600 }]}>
                <Text style={[styles.peso, { color: t.ocean600 }]}>
                  {finance.settings.currency === 'PHP' ? '₱' : finance.settings.currency}
                </Text>
                <TextInput
                  style={[styles.amountInput, { color: t.text }]}
                  value={amountRaw}
                  onChangeText={setAmountRaw}
                  keyboardType="numeric"
                  placeholder="0.00"
                  placeholderTextColor={t.faint}
                />
              </View>
              {parseAmount(amountRaw) !== null && (
                <Text style={[styles.formatted, { color: t.faint }]}>{formatMoney(parseAmount(amountRaw)!, finance.settings.currency)}</Text>
              )}

              <Text style={[styles.label, { color: t.subtext }]}>CATEGORY</Text>
              <View style={styles.chips}>
                {categoriesFor('expense').slice(0, 6).map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => setCategoryId(c.id)}
                    style={[styles.chip, { backgroundColor: t.ice50, borderColor: t.line }, categoryId === c.id && { backgroundColor: c.color, borderColor: c.color }]}
                  >
                    <Text style={[styles.chipText, { color: t.text }, categoryId === c.id && { color: t.white }]}>
                      {c.emoji} {c.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.label, { color: t.subtext }]}>NOTE</Text>
              <TextInput
                style={[styles.noteInput, { backgroundColor: t.ice50, borderColor: t.line, color: t.text }]}
                value={note}
                onChangeText={setNote}
                placeholder="Where did you shop?"
                placeholderTextColor={t.faint}
              />

              <View style={styles.reviewActions}>
                <TouchableOpacity
                  onPress={() => {
                    setStage('camera');
                    setPhotoUri(null);
                  }}
                  style={[styles.retakeBtn, { backgroundColor: t.ice100 }]}
                >
                  <Text style={[styles.retakeText, { color: t.ocean800 }]}>Retake</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{ flex: 1 }} onPress={saveDraft}>
                  <LinearGradient
                    colors={gradients.fab}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.saveBtn}
                  >
                    <Text style={[styles.saveText, { color: t.white }]}>Save expense</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  tipText: { color: '#FFFFFF', fontFamily: font.medium, fontSize: 13, lineHeight: 19 },
  permissionBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xxl },
  permissionBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  permissionTitle: { fontFamily: font.display, fontSize: 20, marginBottom: 6 },
  permissionBody: { fontFamily: font.medium, fontSize: 13, textAlign: 'center', lineHeight: 19, marginBottom: spacing.lg },
  permissionBtn: { borderRadius: radius.md, paddingHorizontal: 26, paddingVertical: 13 },
  permissionBtnText: { fontFamily: font.bold },
  permissionManual: { marginTop: spacing.md, fontFamily: font.bold, fontSize: 13 },
  cameraWrap: { flex: 1, overflow: 'hidden', borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg },
  camera: { flex: 1 },
  cameraControls: {
    position: 'absolute',
    bottom: 34,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  toolBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(6,38,64,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureOuter: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureCore: { width: 48, height: 48, borderRadius: 24 },
  captureHint: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    color: 'rgba(255,255,255,0.85)',
    fontFamily: font.medium,
    fontSize: 12,
  },
  review: { padding: spacing.xl, paddingBottom: 140 },
  photo: { width: '100%', height: 180, borderRadius: radius.md, marginBottom: spacing.lg, backgroundColor: 'rgba(125,211,252,0.15)' },
  reviewCard: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  ocrInfo: { fontFamily: font.medium, fontSize: 13, lineHeight: 19, marginBottom: spacing.md },
  label: { fontFamily: font.bold, fontSize: 10.5, letterSpacing: 1.2, marginBottom: 6, marginTop: spacing.md },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  peso: { fontFamily: font.heavy, fontSize: 22, marginRight: 8 },
  amountInput: { flex: 1, fontFamily: font.heavy, fontSize: 26, paddingVertical: 8 },
  formatted: { fontFamily: font.medium, fontSize: 12, marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1.5,
  },
  chipText: { fontFamily: font.medium, fontSize: 13 },
  noteInput: {
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
  },
  reviewActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.lg },
  retakeBtn: { paddingVertical: 14, paddingHorizontal: 18, borderRadius: radius.md },
  retakeText: { fontFamily: font.bold },
  saveBtn: { borderRadius: radius.md, paddingVertical: 15, alignItems: 'center' },
  saveText: { fontFamily: font.bold, fontSize: 15 },
});
