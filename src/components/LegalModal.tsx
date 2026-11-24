import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { PRIVACY_POLICY, TERMS, LegalSection } from '../data/legal';
import { colors, gradients, radius, spacing } from '../theme';
import { useUI } from '../store/UIContext';
import { useResponsive } from '../hooks/useResponsive';

function DocBody({ sections }: { sections: LegalSection[] }) {
  return (
    <>
      {sections.map((s) => (
        <View key={s.heading} style={styles.section}>
          <Text style={styles.heading}>{s.heading}</Text>
          {s.paragraphs.map((p, i) => (
            <Text key={i} style={styles.para}>
              {p}
            </Text>
          ))}
        </View>
      ))}
      <Text style={styles.footer}>Last updated: November 2026 · Aiserie Tracks v1.1.0</Text>
    </>
  );
}

export function LegalModal() {
  const ui = useUI();
  const { sheetWidth } = useResponsive();
  const isPrivacy = ui.legalDoc === 'privacy';
  const visible = ui.legalDoc !== null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={ui.closeLegal}>
      <View style={styles.screen}>
        <LinearGradient colors={gradients.header} start={{ x: 0, y: 0 }} end={{ x: 1.2, y: 1 }} style={styles.header}>
          <View style={styles.headerRow}>
            <Pressable onPress={ui.closeLegal} hitSlop={12}>
              <Ionicons name="chevron-back" size={22} color={colors.white} />
            </Pressable>
            <Text style={styles.headerTitle}>{isPrivacy ? 'Privacy Policy' : 'Terms & Conditions'}</Text>
            <View style={{ width: 22 }} />
          </View>
          <Text style={styles.headerSub}>
            {isPrivacy
              ? 'Everything stays on this device. No accounts, no cloud, no tracking.'
              : 'The short, honest rules for using Aiserie Tracks.'}
          </Text>
        </LinearGradient>
        <ScrollView
          contentContainerStyle={[styles.body, sheetWidth ? { alignSelf: 'center', width: '100%', maxWidth: sheetWidth + 60 } : null]}
          showsVerticalScrollIndicator={false}
        >
          <DocBody sections={isPrivacy ? PRIVACY_POLICY : TERMS} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: 54,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: radius.lg + 6,
    borderBottomRightRadius: radius.lg + 6,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { color: colors.white, fontSize: 20, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12.5, marginTop: spacing.sm },
  body: { padding: spacing.xl, paddingBottom: 60 },
  section: { marginBottom: spacing.xl },
  heading: { color: colors.text, fontSize: 15.5, fontWeight: '800', marginBottom: 8 },
  para: { color: colors.subtext, fontSize: 13.5, lineHeight: 21, marginBottom: 8 },
  footer: { color: colors.faint, fontSize: 11.5, textAlign: 'center', marginTop: spacing.sm },
});
