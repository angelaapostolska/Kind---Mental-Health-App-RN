import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Modal, Animated } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Swipeable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { MOOD_LEVELS, moodColor, moodLabel, moodEmoji, showErrorToast, showSuccessToast, isoDate } from '@/utils';
import { useAppSelector } from '@/store/store';
import {
  useGetMoodEntriesByMonthQuery,
  useCreateMoodEntryMutation,
  useDeleteMoodEntryMutation,
  useGetEmotionsByCategoryQuery,
  useGetMoodFactorsQuery,
} from '@/api/api';

const moodValueToLevel = (v) => v;

const LEVEL_TO_CATEGORY = {
  1: 'VERY_UNPLEASANT',
  2: 'UNPLEASANT',
  3: 'NEUTRAL',
  4: 'PLEASANT',
  5: 'VERY_PLEASANT',
};

// NEW: which "side" a mood level falls on, used to decide split-square vs quadrant-square
const sideOf = (level) => {
  if (level <= 2) return 'unpleasant'; // VERY_UNPLEASANT + UNPLEASANT
  if (level >= 4) return 'pleasant';   // PLEASANT + VERY_PLEASANT
  return 'neutral';
};

const dayHeader = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric' });
};

// NEW: renders a day's calendar cell — solid, split (2 colors), or quadrant (up to 4 colors)
// depending on how varied that day's logged mood levels are.
const DayMoodCell = ({ day, levels }) => {
  if (!levels || levels.length === 0) {
    return (
      <View style={[styles.calDay, { backgroundColor: theme.colors.surface.three, opacity: 0.4 }]}>
        <Text style={[styles.calDayText, { color: theme.colors.text.secondary }]}>{day}</Text>
      </View>
    );
  }

  const uniqueLevels = [...new Set(levels)];

  // Single mood level logged that day → solid color, same as before
  if (uniqueLevels.length === 1) {
    return (
      <View style={[styles.calDay, { backgroundColor: moodColor(uniqueLevels[0]) }]}>
        <Text style={[styles.calDayText, { color: '#fff' }]}>{day}</Text>
      </View>
    );
  }

  const sides = new Set(uniqueLevels.map(sideOf));
  const isSingleSide = sides.size === 1 && uniqueLevels.length <= 2; // both entries on the same side, only 2 of them

  // Same-side day (e.g. only Pleasant + Very Pleasant, or only Unpleasant + Very Unpleasant)
  // → split square, half one color half the other
  if (isSingleSide) {
    const [a, b] = uniqueLevels.sort((x, y) => x - y);
    return (
      <View style={styles.calDay}>
        <View style={[StyleSheet.absoluteFill, { flexDirection: 'row', borderRadius: 6, overflow: 'hidden' }]}>
          <View style={{ flex: 1, backgroundColor: moodColor(a) }} />
          <View style={{ flex: 1, backgroundColor: moodColor(b) }} />
        </View>
        <Text style={[styles.calDayText, { color: '#fff' }]}>{day}</Text>
      </View>
    );
  }

  // Genuinely mixed day (spans both sides, or 3+ distinct levels) → quadrant square, up to 4 colors
  const quadColors = uniqueLevels.slice(0, 4).map(moodColor);
  while (quadColors.length < 4) quadColors.push(quadColors[quadColors.length - 1]); // pad by repeating last color

  return (
    <View style={styles.calDay}>
      <View style={[StyleSheet.absoluteFill, { borderRadius: 6, overflow: 'hidden' }]}>
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ flex: 1, backgroundColor: quadColors[0] }} />
          <View style={{ flex: 1, backgroundColor: quadColors[1] }} />
        </View>
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ flex: 1, backgroundColor: quadColors[2] }} />
          <View style={{ flex: 1, backgroundColor: quadColors[3] }} />
        </View>
      </View>
      <Text style={[styles.calDayText, { color: '#fff' }]}>{day}</Text>
    </View>
  );
};

const MoodEntryRow = ({ entry, onRequestDelete }) => {
  const swipeRef = useRef(null);
  const level = moodValueToLevel(entry.moodValue);

  const renderRightActions = (progress, dragX) => {
    const scale = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0.6],
      extrapolate: 'clamp',
    });
    return (
      <TouchableOpacity
        style={styles.deleteAction}
        activeOpacity={0.8}
        onPress={() => {
          swipeRef.current?.close();
          onRequestDelete(entry);
        }}
      >
        <Animated.View style={{ transform: [{ scale }], alignItems: 'center' }}>
          <MaterialIcons name="delete-outline" size={22} color="#fff" />
          <Text style={styles.deleteActionText}>Delete</Text>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  const emotions = entry.selectedEmotions ? [...entry.selectedEmotions] : [];
  const factors = entry.selectedFactors ? [...entry.selectedFactors] : [];

  return (
    <Swipeable ref={swipeRef} renderRightActions={renderRightActions} overshootRight={false}>
      <View style={styles.entryCard}>
        <View style={[styles.entryEmojiCircle, { backgroundColor: moodColor(level) }]}>
          <Text style={styles.entryEmoji}>{moodEmoji(level)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.entryMoodLabel}>{moodLabel(level)}</Text>
          {(emotions.length > 0 || factors.length > 0) && (
            <Text style={styles.entryMeta} numberOfLines={1}>
              {[...emotions.map((e) => e.name), ...factors.map((f) => f.name)].join(' · ')}
            </Text>
          )}
          {!!entry.note && <Text style={styles.entryNote}>{entry.note}</Text>}
        </View>
      </View>
    </Swipeable>
  );
};

const Mood = () => {
  const insets = useSafeAreaInsets();
  const userId = useAppSelector((state) => state.userState.userId);

  const [tab, setTab] = useState('track');
  const [step, setStep] = useState(1);
  const [mood, setMood] = useState(null);
  const [feeling, setFeeling] = useState(null);
  const [factor, setFactor] = useState(null);
  const [note, setNote] = useState('');
  const [done, setDone] = useState(false);
  const [month, setMonth] = useState(new Date());
  const [pendingDelete, setPendingDelete] = useState(null);

  const year = month.getFullYear();
  const monthNum = month.getMonth() + 1;

  const { data: emotions = [], isLoading: emotionsLoading } = useGetEmotionsByCategoryQuery(
    LEVEL_TO_CATEGORY[mood],
    { skip: !mood },
  );
  const { data: moodFactors = [], isLoading: factorsLoading } = useGetMoodFactorsQuery();
  const {
    data: monthEntries = [],
    isLoading: entriesLoading,
    refetch: refetchEntries,
  } = useGetMoodEntriesByMonthQuery({ userId, year, month: monthNum }, { skip: !userId });
  const [createMoodEntry, { isLoading: saving }] = useCreateMoodEntryMutation();
  const [deleteMoodEntry, { isLoading: deleting }] = useDeleteMoodEntryMutation();

  useEffect(() => {
    if (userId) refetchEntries();
  }, [month, userId]);

  const reset = () => { setStep(1); setMood(null); setFeeling(null); setFactor(null); setNote(''); setDone(false); };

  const next = async () => {
    if (step < 3) {
      setStep(step + 1);
      return;
    }

    if (!userId) {
      showErrorToast('Please log in again before saving a mood entry');
      return;
    }

    try {
      await createMoodEntry({
        date: isoDate(new Date()),
        moodValue: mood,
        note: note.trim(),
        user: { id: userId },
        selectedEmotions: feeling ? [{ id: feeling.id }] : [],
        selectedFactors: factor ? [{ id: factor.id }] : [],
      }).unwrap();
      setDone(true);
    } catch (err) {
      showErrorToast('Could not save your mood entry. Please try again.');
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteMoodEntry(pendingDelete.id).unwrap();
      showSuccessToast('Mood entry deleted');
    } catch (err) {
      showErrorToast('Could not delete the mood entry. Please try again.');
    } finally {
      setPendingDelete(null);
    }
  };

  const daysIn = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const firstDow = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const monthName = month.toLocaleString('default', { month: 'long', year: 'numeric' });

  const ds = (day) =>
    `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const canProceed =
    (step === 1 && mood !== null) ||
    (step === 2 && feeling !== null) ||
    (step === 3 && factor !== null);

  // CHANGED: was entriesByDate[e.date] = e.moodValue (single value, last write wins);
  // now collects ALL mood levels logged on each date, so multi-entry days can render correctly
  const levelsByDate = {}; // NEW
  monthEntries.forEach((e) => {
    const lvl = moodValueToLevel(e.moodValue);
    (levelsByDate[e.date] = levelsByDate[e.date] || []).push(lvl); // NEW
  });

  const groupedByDay = Object.values(
    [...monthEntries].reduce((acc, e) => {
      (acc[e.date] = acc[e.date] || { date: e.date, items: [] }).items.push(e);
      return acc;
    }, {})
  ).sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingTop: insets.top + theme.spacing.md }]} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>Mood</Text>

      <View style={styles.tabRow}>
        {(['track', 'insights']).map((t) => (
          <TouchableOpacity key={t} onPress={() => setTab(t)} style={[styles.tabBtn, tab === t && styles.tabBtnActive]}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'track' ? 'Track' : 'Insights'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'track' && (
        <>
          {done ? (
            <View style={[styles.card, styles.centered]}>
              <View style={[styles.doneBadge, { backgroundColor: mood ? moodColor(mood) : '#9b9b9b' }]}>
                <MaterialIcons name="check" size={28} color="#fff" />
              </View>
              <Text style={styles.doneTitle}>Mood logged</Text>
              <Text style={styles.doneSub}>
                {mood && moodLabel(mood)} · {feeling?.name} · {factor?.name}
              </Text>
              <TouchableOpacity onPress={reset} style={styles.logAnotherBtn}>
                <Text style={styles.logAnotherText}>Log another</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.card}>
              <View style={styles.progressRow}>
                {[1, 2, 3].map((s) => (
                  <View key={s} style={[styles.progressBar, s <= step && { backgroundColor: theme.colors.primary }]} />
                ))}
              </View>

              {step === 1 && (
                <View>
                  <Text style={styles.stepTitle}>Step 1</Text>
                  <Text style={styles.stepSub}>Pick a mood</Text>
                  <View style={styles.moodRow}>
                    {MOOD_LEVELS.map((m) => (
                      <TouchableOpacity key={m.level} onPress={() => { setMood(m.level); setFeeling(null); }} style={styles.moodBtn}>
                        <View style={[styles.moodCircle, { backgroundColor: m.color }, mood === m.level && styles.moodCircleActive]}>
                          <Text style={styles.moodEmoji}>{m.emoji}</Text>
                        </View>
                        <View style={styles.moodLabelBox}>
                          <Text style={styles.moodEmojiLabel} numberOfLines={2}>{m.label}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {step === 2 && (
                <View>
                  <Text style={styles.stepTitle}>Step 2</Text>
                  <Text style={styles.stepSub}>Choose a feeling</Text>
                  {emotionsLoading ? (
                    <ActivityIndicator color={theme.colors.primary} />
                  ) : (
                    <View style={styles.chipsWrap}>
                      {emotions.map((f) => (
                        <TouchableOpacity key={f.id} onPress={() => setFeeling(f)} style={[styles.chip, feeling?.id === f.id && styles.chipActive]}>
                          <Text style={[styles.chipText, feeling?.id === f.id && styles.chipTextActive]}>{f.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {step === 3 && (
                <View>
                  <Text style={styles.stepTitle}>Step 3</Text>
                  <Text style={styles.stepSub}>What influenced your mood?</Text>
                  {factorsLoading ? (
                    <ActivityIndicator color={theme.colors.primary} />
                  ) : (
                    <View style={styles.chipsWrap}>
                      {moodFactors.map((f) => (
                        <TouchableOpacity key={f.id} onPress={() => setFactor(f)} style={[styles.chip, factor?.id === f.id && styles.chipActive]}>
                          <Text style={[styles.chipText, factor?.id === f.id && styles.chipTextActive]}>{f.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  <Text style={[styles.stepSub, { marginTop: theme.spacing.md }]}>Add a note (optional)</Text>
                  <TextInput
                    value={note}
                    onChangeText={setNote}
                    placeholder="Write anything you'd like to remember about today…"
                    placeholderTextColor={theme.colors.text.secondary}
                    multiline
                    textAlignVertical="top"
                    style={styles.noteInput}
                  />
                </View>
              )}

              <View style={styles.navRow}>
                {step > 1 && (
                  <TouchableOpacity onPress={() => setStep(step - 1)} style={[styles.navBtn, styles.navBtnBack]}>
                    <Text style={styles.navBtnBackText}>Back</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={next}
                  disabled={!canProceed || saving}
                  style={[styles.navBtn, styles.navBtnNext, { opacity: !canProceed || saving ? 0.4 : 1 }]}
                >
                  {saving ? <ActivityIndicator color="#fff" /> : (
                    <Text style={styles.navBtnNextText}>{step === 3 ? 'Save mood' : 'Continue'}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </>
      )}

      {tab === 'insights' && (
        <>
          <View style={styles.card}>
            <View style={styles.calHeader}>
              <TouchableOpacity onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
                <MaterialIcons name="chevron-left" size={22} color={theme.colors.text.primary} />
              </TouchableOpacity>
              <Text style={styles.calTitle}>{monthName}</Text>
              <TouchableOpacity onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
                <MaterialIcons name="chevron-right" size={22} color={theme.colors.text.primary} />
              </TouchableOpacity>
            </View>

            {entriesLoading ? (
              <ActivityIndicator color={theme.colors.primary} style={{ marginVertical: theme.spacing.lg }} />
            ) : (
              <View style={styles.calGrid}>
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                  <Text key={i} style={styles.calWeekDay}>{d}</Text>
                ))}
                {Array.from({ length: firstDow }).map((_, i) => <View key={`e${i}`} style={styles.calCell} />)}
                {Array.from({ length: daysIn }).map((_, i) => {
                  const day = i + 1;
                  return (
                    // CHANGED: was a single solid-color View; now delegates to DayMoodCell
                    // which renders solid / split / quadrant depending on the day's entries
                    <View key={day} style={styles.calCell}>
                      <DayMoodCell day={day} levels={levelsByDate[ds(day)]} />
                    </View>
                  );
                })}
              </View>
            )}

            <View style={styles.legend}>
              {MOOD_LEVELS.map((m) => (
                <View key={m.level} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: m.color }]} />
                  <Text style={styles.legendText}>{m.label}</Text>
                </View>
              ))}
            </View>
          </View>

          <Text style={styles.entriesHeading}>Entries this month</Text>
          {entriesLoading ? (
            <ActivityIndicator color={theme.colors.primary} style={{ marginVertical: theme.spacing.lg }} />
          ) : groupedByDay.length === 0 ? (
            <View style={styles.emptyEntries}>
              <MaterialIcons name="event-note" size={28} color={theme.colors.text.secondary} />
              <Text style={styles.emptyEntriesText}>No mood entries logged this month yet.</Text>
            </View>
          ) : (
            groupedByDay.map((group) => (
              <View key={group.date} style={styles.daySection}>
                <Text style={styles.dayLabel}>{dayHeader(group.date)}</Text>
                {group.items.map((entry) => (
                  <MoodEntryRow key={entry.id} entry={entry} onRequestDelete={setPendingDelete} />
                ))}
              </View>
            ))
          )}
        </>
      )}

      <Modal visible={!!pendingDelete} transparent animationType="fade" onRequestClose={() => setPendingDelete(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIcon}>
              <MaterialIcons name="delete-outline" size={26} color="#e5484d" />
            </View>
            <Text style={styles.modalTitle}>Delete mood entry?</Text>
            <Text style={styles.modalSub}>This will permanently remove this entry. This action can't be undone.</Text>
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnCancel]} onPress={() => setPendingDelete(null)} disabled={deleting}>
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnDelete]} onPress={confirmDelete} disabled={deleting}>
                {deleting ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalBtnDeleteText}>Delete</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.colors.surface.two },
  content: { padding: theme.spacing.md, paddingBottom: 100 },
  pageTitle: { fontSize: theme.typography.fontSize.heading.md, fontWeight: '800', color: theme.colors.text.primary, marginBottom: theme.spacing.md },
  tabRow: { flexDirection: 'row', backgroundColor: theme.colors.surface.three, borderRadius: 20, padding: 4, marginBottom: theme.spacing.md },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 16, alignItems: 'center' },
  tabBtnActive: { backgroundColor: theme.colors.surface.one, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 1 },
  tabText: { fontSize: 12, fontWeight: '700', color: theme.colors.text.secondary },
  tabTextActive: { color: theme.colors.text.primary },
  card: {
    backgroundColor: theme.colors.surface.one, borderRadius: 20, padding: theme.spacing.lg,
    marginBottom: theme.spacing.md, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  centered: { alignItems: 'center' },
  doneBadge: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: theme.spacing.sm },
  doneTitle: { fontSize: 18, fontWeight: '800', color: theme.colors.text.primary },
  doneSub: { fontSize: 12, color: theme.colors.text.secondary, marginTop: 4 },
  logAnotherBtn: { marginTop: theme.spacing.md, paddingHorizontal: theme.spacing.lg, paddingVertical: 10, backgroundColor: theme.colors.primary, borderRadius: 20 },
  logAnotherText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  progressRow: { flexDirection: 'row', gap: 6, marginBottom: theme.spacing.md },
  progressBar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: theme.colors.surface.three },
  stepTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.text.primary },
  stepSub: { fontSize: 12, color: theme.colors.text.secondary, marginBottom: theme.spacing.md },
  moodRow: { flexDirection: 'row', justifyContent: 'space-between' },
  moodBtn: { alignItems: 'center', gap: 6 },
  moodCircle: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  moodCircleActive: { borderWidth: 3, borderColor: 'rgba(0,0,0,0.2)', transform: [{ scale: 1.1 }] },
  moodEmoji: { fontSize: 24 },
  moodLabelBox: { width: 62, height: 28, alignItems: 'center', justifyContent: 'center' },
  moodEmojiLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: theme.colors.surface.two },
  chipActive: { backgroundColor: theme.colors.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: theme.colors.text.primary },
  chipTextActive: { color: '#fff' },
  navRow: { flexDirection: 'row', gap: theme.spacing.xs, marginTop: theme.spacing.md },
  navBtn: { flex: 1, borderRadius: 20, padding: theme.spacing.sm + 2, alignItems: 'center' },
  navBtnBack: { backgroundColor: theme.colors.surface.two },
  navBtnBackText: { fontWeight: '700', color: theme.colors.text.primary, fontSize: 13 },
  navBtnNext: { flex: 2, backgroundColor: theme.colors.primary },
  navBtnNextText: { fontWeight: '700', color: '#fff', fontSize: 15 },
  calHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md },
  calTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.text.primary },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calWeekDay: { width: '14.28%', textAlign: 'center', fontSize: 10, fontWeight: '700', color: theme.colors.text.secondary, paddingVertical: 4 },
  calCell: { width: '14.28%', aspectRatio: 1, padding: 1 },
  calDay: { flex: 1, borderRadius: 6, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, // CHANGED: added overflow: 'hidden' so split/quadrant fills respect the border radius
  calDayText: { fontSize: 11, fontWeight: '700' },
  legend: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 8, marginTop: theme.spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 3 },
  legendText: { fontSize: 9, fontWeight: '600', color: theme.colors.text.secondary },
  noteInput: {
    minHeight: 90,
    borderRadius: 14,
    backgroundColor: theme.colors.surface.two,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.typography.fontSize.paragraph.sm,
    color: theme.colors.text.primary,
    marginTop: theme.spacing.xs,
  },
  entriesHeading: { fontSize: 14, fontWeight: '800', color: theme.colors.text.primary, marginBottom: theme.spacing.sm, marginTop: theme.spacing.xs },
  emptyEntries: { alignItems: 'center', gap: 8, paddingVertical: theme.spacing.lg },
  emptyEntriesText: { fontSize: 12, color: theme.colors.text.secondary, fontWeight: '600' },
  daySection: { marginBottom: theme.spacing.md },
  dayLabel: { fontSize: 11, fontWeight: '700', color: theme.colors.text.secondary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  entryCard: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface.one, borderRadius: 16, padding: theme.spacing.md, marginBottom: 8,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 1,
  },
  entryEmojiCircle: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  entryEmoji: { fontSize: 20 },
  entryMoodLabel: { fontSize: 13, fontWeight: '700', color: theme.colors.text.primary },
  entryMeta: { fontSize: 11, color: theme.colors.text.secondary, marginTop: 2 },
  entryNote: { fontSize: 12, color: theme.colors.text.primary, marginTop: 4, fontStyle: 'italic' },
  deleteAction: {
    backgroundColor: '#e5484d', justifyContent: 'center', alignItems: 'center',
    width: 88, borderRadius: 16, marginBottom: 8,
  },
  deleteActionText: { color: '#fff', fontSize: 11, fontWeight: '700', marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: theme.spacing.lg },
  modalCard: { width: '100%', maxWidth: 360, backgroundColor: theme.colors.surface.one, borderRadius: 24, padding: theme.spacing.lg, alignItems: 'center' },
  modalIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(229,72,77,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: theme.spacing.sm },
  modalTitle: { fontSize: 17, fontWeight: '800', color: theme.colors.text.primary, marginBottom: 6, textAlign: 'center' },
  modalSub: { fontSize: 12, color: theme.colors.text.secondary, textAlign: 'center', marginBottom: theme.spacing.md, lineHeight: 18 },
  modalBtnRow: { flexDirection: 'row', gap: theme.spacing.sm, width: '100%' },
  modalBtn: { flex: 1, borderRadius: 16, paddingVertical: theme.spacing.md, alignItems: 'center', justifyContent: 'center' },
  modalBtnCancel: { backgroundColor: theme.colors.surface.two },
  modalBtnCancelText: { fontWeight: '700', color: theme.colors.text.primary, fontSize: 14 },
  modalBtnDelete: { backgroundColor: '#e5484d' },
  modalBtnDeleteText: { fontWeight: '700', color: '#fff', fontSize: 14 },
});

export default Mood;