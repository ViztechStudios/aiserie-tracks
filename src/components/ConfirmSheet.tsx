import React from 'react';
import { Modal, Platform, StyleSheet, Text, View } from 'react-native';
import { PressableScale } from './PressableScale';
import { useTheme } from '../store/ThemeContext';
import { useUI } from '../store/UIContext';
import { font, radius, spacing, brandFern } from '../theme';

/**
 * In-app confirmation dialog used for every destructive action (delete
 * transaction, remove wallet, erase all data). Replaces Alert.alert(),
 * whose buttons react-native-web silently drops — which made "remove"
 * buttons dead on the PWA. Same flow on native and web now.
 */
export function ConfirmSheet() {
  const ui = useUI();
  const { t, isDark } = useTheme();
  const state = ui.confirmState;
  const open = state !== null;

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => ui.settleConfirm(false)}>
      <View style={[styles.backdrop, { backgroundColor: isDark ? 'rgba(1,8,5,0.55)' : 'rgba(10,32,20,0.35)' }]}>
        <View style={[styles.card, { backgroundColor: t.cardSolid }, !isDark && { borderColor: 'rgba(19,54,36,0.10)', borderWidth: 1 }]}>
          <Text style={[styles.title, { color: t.text }]}>{state?.title}</Text>
          {state?.message ? <Text style={[styles.message, { color: t.subtext }]}>{state.message}</Text> : null}
          <View style={styles.btnRow}>
            <PressableScale
              onPress={() => ui.settleConfirm(false)}
              haptic="light"
              scaleTo={0.96}
              style={[styles.btn, { backgroundColor: t.ice100 }]}
              containerStyle={styles.btnContainer}
            >
              <Text style={[styles.btnText, { color: t.text }]}>{state?.cancelLabel ?? 'Cancel'}</Text>
            </PressableScale>
            <PressableScale
              onPress={() => ui.settleConfirm(true)}
              haptic="medium"
              scaleTo={0.96}
              style={[styles.btn, { backgroundColor: state?.danger ? t.expense : '#1E7A50' }]}
              containerStyle={styles.btnContainer}
            >
              <Text style={[styles.btnText, { color: '#FFFFFF' }]}>{state?.confirmLabel ?? 'Confirm'}</Text>
            </PressableScale>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl + 8,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: radius.lg + 4,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    // react-native-web ignores the iOS shadow props, native ignores boxShadow —
    // carrying both keeps the lift consistent on every platform.
    ...(Platform.select({
      web: { boxShadow: '0 18px 44px rgba(6,24,15,0.30)' },
      default: {
        shadowColor: '#06180F',
        shadowOpacity: 0.3,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 10 },
        elevation: 12,
      },
    }) as object),
  },
  title: { fontFamily: font.bold, fontSize: 18, lineHeight: 24 },
  message: { fontFamily: font.medium, fontSize: 13.5, lineHeight: 19, marginTop: spacing.sm },
  btnRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl },
  btnContainer: { flex: 1 },
  btn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  btnText: { fontFamily: font.bold, fontSize: 14.5 },
});
