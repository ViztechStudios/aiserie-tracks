import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { GlassCard } from './GlassCard';
import { EmptyState } from './EmptyState';
import { PressableScale } from './PressableScale';
import { useTasks } from '../store/TasksContext';
import { useTheme } from '../store/ThemeContext';
import { brandOcean, font, radius, spacing, brandFern } from '../theme';
import { Task } from '../types';

type TaskFilter = 'all' | 'open' | 'done';

/** One row on the money-chores list, with springy check-off and slide-out delete. */
function TaskRow({
  task,
  onToggle,
  onStar,
  onDelete,
}: {
  task: Task;
  onToggle: () => void;
  onStar: () => void;
  onDelete: () => void;
}) {
  const { t } = useTheme();
  const removal = useRef(new Animated.Value(1)).current;
  const check = useRef(new Animated.Value(task.done ? 1 : 0)).current;

  useEffect(() => {
    // v4.4.0: calm check-in — ease-out settle, no bounce
    Animated.timing(check, {
      toValue: task.done ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [task.done, check]);

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Animated.timing(removal, { toValue: 0, duration: 230, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(
      () => onDelete()
    );
  };

  const checkScale = check.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });

  return (
    <Animated.View
      style={{
        opacity: removal,
        transform: [{ translateX: removal.interpolate({ inputRange: [0, 1], outputRange: [36, 0] }) }],
        marginBottom: spacing.md,
      }}
    >
      <GlassCard onPress={onToggle} style={styles.rowCard}>
        <View
          style={[
            styles.circle,
            { borderColor: t.ocean500 },
            task.done && { borderColor: t.income, backgroundColor: t.income },
          ]}
        >
          <Animated.View style={{ transform: [{ scale: checkScale }] }}>
            <Ionicons name="checkmark-sharp" size={15} color={t.white} />
          </Animated.View>
        </View>
        <View style={styles.rowMid}>
          <Text
            style={[styles.rowTitle, { color: task.done ? t.faint : t.text }, task.done && styles.rowTitleDone]}
            numberOfLines={2}
          >
            {task.title}
          </Text>
        </View>
        <PressableScale
          onPress={onStar}
          haptic={task.important ? false : 'light'}
          style={styles.iconBtn}
          scaleTo={0.82}
          accessibilityRole="button"
          accessibilityLabel={task.important ? 'Remove star' : 'Mark important'}
        >
          <Ionicons name={task.important ? 'star' : 'star-outline'} size={19} color={task.important ? t.warn : t.faint} />
        </PressableScale>
        <PressableScale
          onPress={handleDelete}
          style={styles.iconBtn}
          scaleTo={0.82}
          accessibilityRole="button"
          accessibilityLabel="Delete chore"
        >
          <Ionicons name="trash-outline" size={18} color={t.faint} />
        </PressableScale>
      </GlassCard>
    </Animated.View>
  );
}

/**
 * The money-chores panel (formerly the whole Goals tab) — composer, filters
 * and the list itself, embeddable inside the Finance page.
 */
export function TasksPanel() {
  const store = useTasks();
  const { t } = useTheme();
  const [draft, setDraft] = useState('');
  const [markImportant, setMarkImportant] = useState(false);
  const [filter, setFilter] = useState<TaskFilter>('all');

  const progress = useRef(new Animated.Value(0)).current;
  const total = store.tasks.length;
  const ratio = total === 0 ? 0 : store.doneCount / total;

  useEffect(() => {
    Animated.timing(progress, { toValue: ratio, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [ratio, progress]);

  const open = useMemo(
    () =>
      store.tasks
        .filter((x) => !x.done)
        .sort((a, b) => Number(b.important) - Number(a.important) || b.createdAt - a.createdAt),
    [store.tasks]
  );
  const done = useMemo(
    () => store.tasks.filter((x) => x.done).sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0)),
    [store.tasks]
  );

  const submit = () => {
    const title = draft.trim();
    if (!title) return;
    store.addTask(title, markImportant);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setDraft('');
    setMarkImportant(false);
    setFilter(filter === 'done' ? 'all' : filter);
  };

  const chips: { key: TaskFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'open', label: `Open${store.openCount ? ` · ${store.openCount}` : ''}` },
    { key: 'done', label: `Done${store.doneCount ? ` · ${store.doneCount}` : ''}` },
  ];

  const showOpen = filter !== 'done';
  const showDone = filter !== 'open';
  const isEmpty = total === 0;

  return (
    <View>
      {/* progress card */}
      <GlassCard hi tint={t.card} style={styles.progressCard}>
        <View style={styles.progressHead}>
          <Text style={[styles.progressLabel, { color: t.sun500 }]}>Chores progress</Text>
          <Text style={[styles.progressValue, { color: t.text }]}>{Math.round(ratio * 100)}%</Text>
        </View>
        <View style={[styles.track, { backgroundColor: t.ice100 }]}>
          <Animated.View
            style={[
              styles.trackFill,
              {
                width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
              },
            ]}
          />
        </View>
        <Text style={[styles.progressHint, { color: t.subtext }]}>
          {total === 0
            ? 'Add your first chore below — paying a bill, moving savings, anything.'
            : ratio === 1
              ? 'All done — enjoy the clear head.'
              : `${store.doneCount} of ${total} complete — keep the streak going.`}
        </Text>
      </GlassCard>

      {/* composer */}
      <GlassCard style={styles.composer}>
        <PressableScale
          onPress={() => setMarkImportant((v) => !v)}
          haptic="light"
          style={styles.starToggle}
          scaleTo={0.85}
          accessibilityRole="button"
          accessibilityLabel={markImportant ? 'Unmark important' : 'Mark as important'}
        >
          <Ionicons name={markImportant ? 'star' : 'star-outline'} size={21} color={markImportant ? t.warn : t.faint} />
        </PressableScale>
        <TextInput
          style={[styles.composerInput, { color: t.text }]}
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={submit}
          placeholder="Add a chore… e.g. Pay the electricity bill"
          placeholderTextColor={t.faint}
          returnKeyType="done"
          maxLength={140}
        />
        <PressableScale
          onPress={submit}
          disabled={draft.trim().length === 0}
          haptic="medium"
          scaleTo={0.88}
          style={[styles.addBtn, { backgroundColor: draft.trim().length === 0 ? t.faint : brandOcean }, draft.trim().length === 0 && { opacity: 0.5 }]}
        >
          <Ionicons name="add" size={22} color={t.white} />
        </PressableScale>
      </GlassCard>

      {/* filter chips */}
      <View style={styles.chipRow}>
        {chips.map((c) => {
          const on = filter === c.key;
          return (
            <PressableScale key={c.key} onPress={() => setFilter(c.key)} haptic={on ? false : 'light'} scaleTo={0.94}>
              <View
                style={[
                  styles.chip,
                  { backgroundColor: t.card, borderColor: t.glassBorderSoft },
                  on && { backgroundColor: brandOcean, borderColor: brandOcean },
                ]}
              >
                <Text style={[styles.chipText, { color: on ? t.white : t.subtext }]}>{c.label}</Text>
              </View>
            </PressableScale>
          );
        })}
        {filter !== 'open' && store.doneCount > 0 ? (
          <PressableScale onPress={() => store.clearDone()} scaleTo={0.94}>
            <View style={styles.clearChip}>
              <Text style={[styles.clearChipText, { color: t.expense }]}>Clear done</Text>
            </View>
          </PressableScale>
        ) : null}
      </View>

      {isEmpty ? (
        <EmptyState
          icon="list"
          title="Nothing to do yet"
          body="Money chores live here: pay a bill, move savings, cancel a subscription, check a receipt. Tap the star to pin the important ones."
          mascot
        />
      ) : (
        <>
          {showOpen && open.length === 0 && showDone ? (
            <EmptyState icon="checkmark-done" title="Everything is done" body="Enjoy it — or add something new above." mascot />
          ) : null}
          {showOpen && open.length > 0 ? (
            <View>
              {filter === 'all' ? <Text style={[styles.groupLabel, { color: t.subtext }]}>Open</Text> : null}
              {open.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onToggle={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                    store.toggleTask(task.id);
                  }}
                  onStar={() => store.toggleImportant(task.id)}
                  onDelete={() => store.removeTask(task.id)}
                />
              ))}
            </View>
          ) : null}
          {showDone && done.length > 0 ? (
            <View>
              {filter === 'all' && open.length > 0 ? <Text style={[styles.groupLabel, { color: t.subtext }]}>Completed</Text> : null}
              {done.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onToggle={() => store.toggleTask(task.id)}
                  onStar={() => store.toggleImportant(task.id)}
                  onDelete={() => store.removeTask(task.id)}
                />
              ))}
            </View>
          ) : null}
          {filter === 'done' && done.length === 0 ? (
            <EmptyState icon="leaf" title="Nothing completed yet" body="Small wins land here as you check things off." />
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  progressCard: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  progressHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel: { fontFamily: font.bold, fontSize: 11, letterSpacing: 1.2 },
  progressValue: { fontFamily: font.heavy, fontSize: 16 },
  track: {
    height: 8,
    borderRadius: radius.pill,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: brandFern,
  },
  progressHint: { fontFamily: font.medium, fontSize: 12, lineHeight: 17, marginTop: spacing.md },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  starToggle: { padding: 8 },
  composerInput: { flex: 1, fontFamily: font.medium, fontSize: 15, paddingVertical: 8, paddingHorizontal: 4 },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm, marginBottom: spacing.sm, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  chipText: { fontFamily: font.bold, fontSize: 12.5 },
  clearChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill },
  clearChipText: { fontFamily: font.bold, fontSize: 12 },
  groupLabel: {
    fontFamily: font.bold,
    fontSize: 10.5,
    letterSpacing: 1.2,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: 2,
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
  },
  circle: {
    width: 27,
    height: 27,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  rowMid: { flex: 1, marginHorizontal: spacing.md },
  rowTitle: { fontFamily: font.bold, fontSize: 15, lineHeight: 20 },
  rowTitleDone: { textDecorationLine: 'line-through' },
  iconBtn: { padding: 6 },
});
