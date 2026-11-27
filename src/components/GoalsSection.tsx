import React, { useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { PressableScale } from './PressableScale';
import { GlassCard } from './GlassCard';
import { EmptyState } from './EmptyState';
import { useFinance } from '../store/FinanceContext';
import { useGoals } from '../store/GoalsContext';
import { useUI } from '../store/UIContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../store/ThemeContext';
import { AnimatedNumber } from './AnimatedNumber';
import { Goal } from '../types';
import { formatMoney, parseAmount } from '../utils/money';
import { goalProgress, goalRemaining } from '../utils/goals';
import { font, radius, spacing } from '../theme';

const GOAL_EMOJIS = ['🐷', '🏝️', '📱', '🚲', '🏠', '🎓', '💍', '✈️', '🎮', '🌱', '🐶', '🐱'];

/**
 * Savings goals — piggy banks with a target. A goal fills up with an
 * animated progress bar and celebrates with the mascots when it completes.
 * Lives on the Finance screen between Recurring and Money chores.
 */
export function GoalsSection() {
  const finance = useFinance();
  const insets = useSafeAreaInsets();

  const goals = useGoals();
  const ui = useUI();
  const { t, shadow } = useTheme();
  const currency = finance.settings.currency;

  const [modal, setModal] = useState<{ goal?: Goal } | null>(null);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🐷');
  const [target, setTarget] = useState('');
  const [note, setNote] = useState('');
  const [moveFor, setMoveFor] = useState<{ goal: Goal; dir: 1 | -1 } | null>(null);
  const [moveAmount, setMoveAmount] = useState('');

  const sorted = useMemo(() => {
    const rank = (g: Goal) => (goalRemaining(g) === 0 ? 1 : 0);
    return [...goals.goals].sort((a, b) => rank(a) - rank(b) || b.createdAt - a.createdAt);
  }, [goals.goals]);

  const openFor = (goal?: Goal) => {
    setName(goal?.name ?? '');
    setEmoji(goal?.emoji ?? '🐷');
    setTarget(goal ? String(goal.target) : '');
    setNote(goal?.note ?? '');
    setModal({ goal });
  };

  const submit = () => {
    const amt = parseAmount(target);
    if (!name.trim()) {
      ui.toast('Give the goal a short name, e.g. "Beach trip".');
      return;
    }
    if (amt === null) {
      ui.toast('Enter a target amount greater than zero.');
      return;
    }
    if (modal?.goal) {
      const g = modal.goal;
      goals.updateGoal({
        ...g,
        name: name.trim().slice(0, 40),
        emoji,
        target: amt,
        note: note.trim().slice(0, 120) || undefined,
        saved: Math.min(g.saved, amt),
        completedAt: g.saved >= amt ? g.completedAt ?? Date.now() : undefined,
      });
      ui.toast(`"${name.trim()}" updated.`);
    } else {
      goals.addGoal({ name: name.trim().slice(0, 40), emoji, target: amt, saved: 0, note: note.trim().slice(0, 120) || undefined });
      ui.toast(`Piggy bank "${name.trim()}" created — fill it up bit by bit.`);
    }
    setModal(null);
  };

  const submitMove = () => {
    if (!moveFor) return;
    const amt = parseAmount(moveAmount);
    if (amt === null) {
      ui.toast('Enter an amount greater than zero.');
      return;
    }
    const before = moveFor.goal.saved;
    const completed = goals.moveGoal(moveFor.goal.id, amt * moveFor.dir);
    if (completed) {
      Haptics.notificationAsync?.(Haptics.NotificationFeedbackType.Success).catch(() => {});
      ui.toast(`${moveFor.goal.emoji} "${moveFor.goal.name}" is complete — the mascots are proud of you!`);
    } else {
      // v4.2.0: currency symbol follows the wallet setting (was a hardcoded ₱),
      // and an over-full piggy says so instead of quietly eating the difference
      const sym = currency === 'PHP' ? '₱' : `${currency} `;
      const recorded = moveFor.dir === 1 ? Math.max(0, Math.min(before + amt, moveFor.goal.target) - before) : amt;
      const excess = moveFor.dir === 1 && before + amt > moveFor.goal.target;
      const body = moveFor.dir === 1
        ? `${sym}${amt.toLocaleString()} tucked into "${moveFor.goal.name}".${excess ? ` The piggy was full — only ${sym}${recorded.toLocaleString()} fit inside.` : ''}`
        : `${sym}${amt.toLocaleString()} taken out of "${moveFor.goal.name}".`;
      ui.toast(body);
    }
    setMoveFor(null);
    setMoveAmount('');
  };

  const removeGoal = (goal: Goal) => {
    ui
      .confirm({
        title: `Delete "${goal.name}"?`,
        message: 'The piggy bank and its progress disappear from this device. Money already recorded in the ledger is not touched.',
        confirmLabel: 'Delete',
        danger: true,
      })
      .then((ok) => {
        if (ok) {
          goals.deleteGoal(goal.id);
          ui.toast(`"${goal.name}" deleted.`);
        }
      });
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={[styles.sectionTitle, { color: t.text }]}>Savings goals</Text>
        {goals.goals.length > 0 && (
          <Text style={[styles.sectionSub, { color: t.subtext }]} numberOfLines={1}>
            {goals.goals.filter((g) => goalRemaining(g) === 0).length} of {goals.goals.length} filled
          </Text>
        )}
      </View>

      {goals.goals.length === 0 ? (
        <GlassCard style={{ borderRadius: radius.lg }}>
          <EmptyState
            icon="star-outline"
            title="Start a piggy bank"
            body="Name something worth saving for — a trip, a gift, a rainy day — and fill it up whenever money allows."
          />
        </GlassCard>
      ) : (
        <>
          {sorted.map((goal) => {
            const pct = goalProgress(goal);
            const done = goalRemaining(goal) === 0;
            return (
              <GlassCard key={goal.id} style={[styles.goalCard, { backgroundColor: t.card }]} >
                <View style={styles.goalTop}>
                  <PressableScale onPress={() => openFor(goal)} scaleTo={0.92} style={[styles.piggy, { backgroundColor: 'rgba(30,122,80,0.10)' }]}>
                    <Text style={styles.piggyEmoji}>{goal.emoji}</Text>
                  </PressableScale>
                  <View style={styles.goalMid}>
                    <PressableScale onPress={() => openFor(goal)} style={styles.goalNameBtn}>
                      <Text style={[styles.goalName, { color: t.text }]} numberOfLines={1}>
                        {goal.name} {done ? '· filled!' : ''}
                      </Text>
                      <Text style={[styles.goalSub, { color: t.subtext }]} numberOfLines={1}>
                        <AnimatedNumber
                          value={goal.saved}
                          flash="up"
                          restingColor={t.subtext}
                          format={(n) => formatMoney(n, currency)}
                        />
                        {' saved of '}
                        {formatMoney(goal.target, currency)}
                        {done ? '' : ` · ${formatMoney(goalRemaining(goal), currency)} to go`}
                      </Text>
                    </PressableScale>
                    <View style={styles.iconRow}>
                      <PressableScale onPress={() => { setMoveFor({ goal, dir: 1 }); setMoveAmount(''); }} scaleTo={0.9} style={[styles.roundBtn, { backgroundColor: 'rgba(30,122,80,0.12)' }]}>
                        <Ionicons name="add" size={15} color={t.ocean600} />
                      </PressableScale>
                      <PressableScale onPress={() => { setMoveFor({ goal, dir: -1 }); setMoveAmount(''); }} scaleTo={0.9} style={[styles.roundBtn, { backgroundColor: 'rgba(185,74,82,0.10)' }]}>
                        <Ionicons name="remove" size={15} color={t.expense} />
                      </PressableScale>
                      <PressableScale onPress={() => openFor(goal)} scaleTo={0.9} style={[styles.roundBtn, { backgroundColor: 'rgba(0,0,0,0.05)' }]}>
                        <Ionicons name="pencil" size={13} color={t.subtext} />
                      </PressableScale>
                      <PressableScale onPress={() => removeGoal(goal)} scaleTo={0.9} style={[styles.roundBtn, { backgroundColor: 'rgba(185,74,82,0.10)' }]}>
                        <Ionicons name="trash-outline" size={13} color={t.expense} />
                      </PressableScale>
                    </View>
                  </View>
                  <View style={styles.pctWrap}>
                    <Text style={[styles.pct, { color: done ? t.ocean600 : t.text }]}>{Math.round(pct * 100)}%</Text>
                  </View>
                </View>
                <View style={[styles.track, { backgroundColor: 'rgba(0,0,0,0.07)' }]}>
                  <View
                    style={[
                      styles.fill,
                      { backgroundColor: done ? t.ocean600 : t.ocean500 },
                      { width: `${Math.max(pct * 100, pct > 0 ? 4 : 0)}%` },
                    ]}
                  />
                </View>
                {goal.note ? (
                  <Text style={[styles.goalNote, { color: t.subtext }]} numberOfLines={2}>{goal.note}</Text>
                ) : null}
              </GlassCard>
            );
          })}
        </>
      )}

      <PressableScale onPress={() => openFor()} style={[styles.ghostBtn, { borderColor: t.line }]} scaleTo={0.98}>
        <Ionicons name="add" size={15} color={t.ocean600} />
        <Text style={[styles.ghostBtnText, { color: t.ocean600 }]}>New goal</Text>
      </PressableScale>

      {/* add / edit goal modal */}
      <Modal visible={modal !== null} transparent animationType="fade" onRequestClose={() => setModal(null)}>
        <TouchableOpacity style={[styles.modalScrim, { paddingBottom: Math.max(insets.bottom, 12) }]} activeOpacity={1} onPress={() => setModal(null)}>
          <TouchableOpacity activeOpacity={1} style={[styles.sheet, { backgroundColor: t.cardSolid }]} onPress={() => {}}>
            <ScrollView keyboardShouldPersistTaps="handled" bounces={false}>
              <Text style={[styles.modalTitle, { color: t.text }]}>{modal?.goal ? 'Edit goal' : 'New savings goal'}</Text>
              <Text style={[styles.modalHint, { color: t.subtext }]}>Name it, pick a piggy, set the target.</Text>
              <TextInput
                style={[styles.input, { color: t.text, borderColor: t.line, backgroundColor: t.card }]}
                placeholderTextColor={t.faint}
                placeholder="e.g. Beach trip to Palawan"
                value={name}
                onChangeText={setName}
                maxLength={40}
              />
              <View style={styles.emojiRow}>
                {GOAL_EMOJIS.map((e) => (
                  <TouchableOpacity key={e} onPress={() => setEmoji(e)} style={[styles.emojiBtn, emoji === e && { backgroundColor: 'rgba(30,122,80,0.14)', borderWidth: 1.5, borderColor: t.ocean600 }]}>
                    <Text style={styles.emojiBtnText}>{e}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={[styles.input, { color: t.text, borderColor: t.line, backgroundColor: t.card }]}
                placeholderTextColor={t.faint}
                placeholder="Target amount, e.g. 12000"
                keyboardType="decimal-pad"
                value={target}
                onChangeText={setTarget}
              />
              <TextInput
                style={[styles.input, styles.noteInput, { color: t.text, borderColor: t.line, backgroundColor: t.card }]}
                placeholderTextColor={t.faint}
                placeholder="Why it matters (optional)"
                value={note}
                onChangeText={setNote}
                multiline
                maxLength={120}
              />
              <View style={styles.modalBtnRow}>
                <PressableScale onPress={() => setModal(null)} containerStyle={{ flex: 1 }} style={[styles.modalBtn, { backgroundColor: t.card, borderColor: t.line }]}>
                  <Text style={[styles.modalBtnText, { color: t.subtext }]}>Cancel</Text>
                </PressableScale>
                <PressableScale onPress={submit} containerStyle={{ flex: 1 }} style={[styles.modalBtn, styles.modalBtnPrimary, { backgroundColor: t.ocean600 }]}>
                  <Text style={[styles.modalBtnText, { color: '#FFFFFF' }]}>{modal?.goal ? 'Save' : 'Create goal'}</Text>
                </PressableScale>
              </View>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* add / withdraw money sheet */}
      <Modal visible={moveFor !== null} transparent animationType="fade" onRequestClose={() => setMoveFor(null)}>
        <TouchableOpacity style={[styles.modalScrim, { paddingBottom: Math.max(insets.bottom, 12) }]} activeOpacity={1} onPress={() => setMoveFor(null)}>
          <TouchableOpacity activeOpacity={1} style={[styles.sheet, styles.sheetSmall, { backgroundColor: t.cardSolid }]} onPress={() => {}}>
            <Text style={[styles.modalTitle, { color: t.text }]}>
              {moveFor?.dir === 1 ? 'Add to' : 'Take out of'} "{moveFor?.goal.name}"
            </Text>
            <Text style={[styles.modalHint, { color: t.subtext }]}>
              {moveFor?.dir === 1
                ? 'Money set aside here stays inside the piggy — nothing else changes in your ledger.'
                : 'Taking money out only lowers the piggy — your recorded history stays untouched.'}
            </Text>
            <TextInput
              style={[styles.input, { color: t.text, borderColor: t.line, backgroundColor: t.card }]}
              placeholderTextColor={t.faint}
              placeholder={`Amount in ${currency}`}
              keyboardType="decimal-pad"
              value={moveAmount}
              onChangeText={setMoveAmount}
              autoFocus
            />
            <View style={styles.modalBtnRow}>
              <PressableScale onPress={() => setMoveFor(null)} containerStyle={{ flex: 1 }} style={[styles.modalBtn, { backgroundColor: t.card, borderColor: t.line }]}>
                <Text style={[styles.modalBtnText, { color: t.subtext }]}>Cancel</Text>
              </PressableScale>
              <PressableScale onPress={submitMove} containerStyle={{ flex: 1 }} style={[styles.modalBtn, styles.modalBtnPrimary, { backgroundColor: moveFor?.dir === 1 ? t.ocean600 : t.expense }]}>
                <Text style={[styles.modalBtnText, { color: '#FFFFFF' }]}>{moveFor?.dir === 1 ? 'Add' : 'Take out'}</Text>
              </PressableScale>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  sectionTitle: { fontFamily: font.display, fontSize: 18 },
  sectionSub: { fontFamily: font.medium, fontSize: 12 },
  goalCard: { borderRadius: radius.lg, padding: spacing.md, marginTop: spacing.md, borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)' },
  goalTop: { flexDirection: 'row', alignItems: 'center' },
  piggy: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  piggyEmoji: { fontSize: 22 },
  goalMid: { flex: 1, marginHorizontal: spacing.md },
  goalNameBtn: { paddingVertical: 2 },
  goalName: { fontFamily: font.bold, fontSize: 14.5 },
  goalSub: { fontFamily: font.medium, fontSize: 11.5, marginTop: 2 },
  iconRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  roundBtn: { width: 28, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  pctWrap: { minWidth: 38, alignItems: 'flex-end' },
  pct: { fontFamily: font.heavy, fontSize: 14 },
  track: { height: 9, borderRadius: 5, marginTop: spacing.md, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5 },
  goalNote: { fontFamily: font.medium, fontSize: 11.5, marginTop: 8 },
  ghostBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1.5, borderStyle: 'dashed', borderRadius: radius.lg,
    paddingVertical: 12, marginTop: spacing.md,
  },
  ghostBtnText: { fontFamily: font.bold, fontSize: 13 },
  modalScrim: { flex: 1, backgroundColor: 'rgba(9,32,24,0.45)', alignItems: 'center', justifyContent: 'flex-end' },
  sheet: {
    width: '100%', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xl,
    maxHeight: '85%',
  },
  sheetSmall: { borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalTitle: { fontFamily: font.display, fontSize: 20 },
  modalHint: { fontFamily: font.medium, fontSize: 12.5, marginTop: 4, marginBottom: spacing.md },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontFamily: font.medium, fontSize: 14, marginTop: spacing.md },
  noteInput: { minHeight: 64, textAlignVertical: 'top' },
  emojiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.md },
  emojiBtn: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)' },
  emojiBtnText: { fontSize: 18 },
  modalBtnRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  modalBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: 'transparent' },
  modalBtnPrimary: {},
  modalBtnText: { fontFamily: font.bold, fontSize: 14 },
});
