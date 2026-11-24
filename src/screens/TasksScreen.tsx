import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { GradientHeader } from '../components/GradientHeader';
import { GlassCard } from '../components/GlassCard';
import { Entrance } from '../components/Entrance';
import { EmptyState } from '../components/EmptyState';
import { PressableScale } from '../components/PressableScale';
import { useTasks } from '../store/TasksContext';
import { useTheme } from '../store/ThemeContext';
import { radius, spacing } from '../theme';
import { Task } from '../types';
import { useResponsive } from '../hooks/useResponsive';

type TaskFilter = 'all' | 'open' | 'done';

/** One row on the Things-to-do list, with springy check-off and slide-out delete. */
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
    Animated.spring(check, {
      toValue: task.done ? 1 : 0,
      speed: 30,
      bounciness: 8,
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
        >
          <Ionicons name={task.important ? 'star' : 'star-outline'} size={19} color={task.important ? t.warn : t.faint} />
        </PressableScale>
        <PressableScale onPress={handleDelete} style={styles.iconBtn} scaleTo={0.82}>
          <Ionicons name="trash-outline" size={18} color={t.faint} />
        </PressableScale>
      </GlassCard>
    </Animated.View>
  );
}

export function TasksScreen() {
  const store = useTasks();
  const { contentWidth } = useResponsive();
  const { t, isDark, gradients } = useTheme();
  const [draft, setDraft] = useState('');
  const [markImportant, setMarkImportant] = useState(false);
  const [filter, setFilter] = useState<TaskFilter>('all');

  const progress = useRef(new Animated.Value(0)).current;
  const total = store.tasks.length;
  const ratio = total === 0 ? 0 : store.doneCount / total;

  useEffect(() => {
    Animated.spring(progress, { toValue: ratio, speed: 22, bounciness: 5, useNativeDriver: false }).start();
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
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          { paddingBottom: 150 },
          contentWidth ? { alignSelf: 'center', width: '100%', maxWidth: contentWidth } : null,
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        <GradientHeader
          title="Things to do"
          subtitle={total === 0 ? 'Little money chores, big peace of mind' : `${store.openCount} open · ${store.doneCount} done`}
        >
          <Entrance delay={60}>
            <GlassCard hi>
              <View style={styles.progressHead}>
                <Text style={styles.progressLabel}>Progress</Text>
                <Text style={styles.progressValue}>{Math.round(ratio * 100)}%</Text>
              </View>
              <View style={styles.track}>
                <Animated.View
                  style={[
                    styles.trackFill,
                    {
                      width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                    },
                  ]}
                />
              </View>
              <Text style={styles.progressHint}>
                {total === 0
                  ? 'Add your first task below — paying a bill, saving a small amount, anything.'
                  : ratio === 1
                    ? 'All done. Enjoy the clear head 🌊'
                    : `${store.doneCount} of ${total} complete — keep the streak going.`}
              </Text>
            </GlassCard>
          </Entrance>
        </GradientHeader>

        <View style={styles.body}>
          {/* composer */}
          <Entrance delay={120}>
            <GlassCard style={styles.composer}>
              <PressableScale
                onPress={() => setMarkImportant((v) => !v)}
                haptic="light"
                style={styles.starToggle}
                scaleTo={0.85}
              >
                <Ionicons name={markImportant ? 'star' : 'star-outline'} size={21} color={markImportant ? t.warn : t.faint} />
              </PressableScale>
              <TextInput
                style={[styles.composerInput, { color: t.text }]}
                value={draft}
                onChangeText={setDraft}
                onSubmitEditing={submit}
                placeholder="Add a task… e.g. Pay the electricity bill"
                placeholderTextColor={t.faint}
                returnKeyType="done"
                maxLength={140}
              />
              <PressableScale
                onPress={submit}
                disabled={draft.trim().length === 0}
                haptic="medium"
                scaleTo={0.88}
                style={[styles.addBtn, { backgroundColor: draft.trim().length === 0 ? t.faint : t.ocean600 }, draft.trim().length === 0 && { opacity: 0.5 }]}
              >
                <Ionicons name="add" size={22} color={t.white} />
              </PressableScale>
            </GlassCard>
          </Entrance>

          {/* filter chips */}
          <Entrance delay={170}>
            <View style={styles.chipRow}>
              {chips.map((c) => {
                const on = filter === c.key;
                return (
                  <PressableScale key={c.key} onPress={() => setFilter(c.key)} haptic={on ? false : 'light'} scaleTo={0.94}>
                    <View
                      style={[
                        styles.chip,
                        { backgroundColor: t.card, borderColor: t.glassBorderSoft },
                        on && { backgroundColor: t.ocean600, borderColor: t.ocean600 },
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
          </Entrance>

          {isEmpty ? (
            <EmptyState
              emoji="🗒️"
              title="Nothing to do yet"
              body="Money chores live here: pay a bill, move savings, cancel a subscription, check a receipt. Tap the star to pin the important ones."
            />
          ) : (
            <>
              {showOpen && open.length === 0 && showDone ? (
                <EmptyState emoji="🎉" title="Everything is done" body="Enjoy it — or add something new above." />
              ) : null}
              {showOpen && open.length > 0 ? (
                <View>
                  {filter === 'all' ? <Text style={[styles.groupLabel, { color: t.subtext }]}>Open</Text> : null}
                  {open.map((task, i) => (
                    <Entrance key={task.id} delay={200 + i * 40}>
                      <TaskRow
                        task={task}
                        onToggle={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                          store.toggleTask(task.id);
                        }}
                        onStar={() => store.toggleImportant(task.id)}
                        onDelete={() => store.removeTask(task.id)}
                      />
                    </Entrance>
                  ))}
                </View>
              ) : null}
              {showDone && done.length > 0 ? (
                <View>
                  {filter === 'all' && open.length > 0 ? <Text style={[styles.groupLabel, { color: t.subtext }]}>Completed</Text> : null}
                  {done.map((task, i) => (
                    <Entrance key={task.id} delay={200 + i * 40}>
                      <TaskRow
                        task={task}
                        onToggle={() => store.toggleTask(task.id)}
                        onStar={() => store.toggleImportant(task.id)}
                        onDelete={() => store.removeTask(task.id)}
                      />
                    </Entrance>
                  ))}
                </View>
              ) : null}
              {filter === 'done' && done.length === 0 ? (
                <EmptyState emoji="🌱" title="Nothing completed yet" body="Small wins land here as you check things off." />
              ) : null}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  progressHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel: { color: 'rgba(255,255,255,0.82)', fontSize: 13, fontWeight: '700' },
  progressValue: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  track: {
    height: 9,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.22)',
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: '#7DF3D3',
  },
  progressHint: { color: 'rgba(255,255,255,0.88)', fontSize: 12, lineHeight: 17, marginTop: spacing.md },
  body: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
  },
  starToggle: { padding: 8 },
  composerInput: { flex: 1, fontSize: 15, fontWeight: '600', paddingVertical: 8, paddingHorizontal: 4 },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.lg, marginBottom: spacing.sm, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  chipText: { fontSize: 12.5, fontWeight: '800' },
  clearChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill },
  clearChipText: { fontSize: 12, fontWeight: '800' },
  groupLabel: {
    fontSize: 11.5,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
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
  rowTitle: { fontWeight: '700', fontSize: 15, lineHeight: 20 },
  rowTitleDone: { textDecorationLine: 'line-through' },
  iconBtn: { padding: 6 },
});
