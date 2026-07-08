import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Modal, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Swipeable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
// CHANGED: using SoftGlass directly (SoftCard / SoftHeroCard / SoftIcon) —
// the same bubbly/glossy system Home uses — for every glass-like element on
// this screen: cards, mood-selection circles, feeling/factor chips, tabs, the
// entry rows, and the delete-confirm icon.
import { ScreenGradientBackground, GradientButton, pastel } from '@/components';
import { SoftCard, SoftIcon } from '@/components/home/SoftGlass';
import { MOOD_LEVELS, moodColor, moodLabel, moodEmoji, showErrorToast, showSuccessToast, isoDate } from '@/utils';
import { useAppSelector } from '@/store/store';
import MoodInsightCard from '@/components/mood/MoodInsightCard';
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

// which "side" a mood level falls on, used to decide split-square vs quadrant-square
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

// renders a day's calendar cell — solid, split (2 colors), or quadrant (up to 4 colors)
// depending on how varied that day's logged mood levels are.
const DayMoodCell = ({ day, levels }) => {
  if (!levels || levels.length === 0) {
    return (
      <View style={[styles.calDay, { backgroundColor: 'rgba(255,255,255,0.32)' }]}>
        <Text style={[styles.calDayText, { color: pastel.textMuted }]}>{day}</Text>
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
  const isSingleSide = sides.size === 1 && uniqueLevels.length <= 2;

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

  const quadColors = uniqueLevels.slice(0, 4).map(moodColor);
  while (quadColors.length < 4) quadColors.push(quadColors[quadColors.length - 1]);

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

// ── Glossy pill — shared recipe for tabs and chips: gradient fill + diagonal
// sheen + white border when active, frosted translucent fill when inactive.
// Same recipe as the Breathe screen's exercise pills.
const GlossyPill = ({ label, active, onPress, style, textStyle, radius = 20 }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={[style, active && { borderColor: 'transparent' }]}>
    {active && (
      <>
        <LinearGradient
          colors={[pastel.heroPurple, pastel.heroPink]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFillObject, { borderRadius: radius }]}
        />
        <LinearGradient
          colors={['rgba(255,255,255,0.5)', 'rgba(255,255,255,0)']}
          start={{ x: 0.1, y: 0 }} end={{ x: 0.5, y: 0.65 }}
          style={[StyleSheet.absoluteFillObject, { borderRadius: radius }]}
          pointerEvents="none"
        />
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFillObject, { borderRadius: radius, borderWidth: 1.4, borderColor: 'rgba(255,255,255,0.82)' }]}
        />
      </>
    )}
    <Text style={[textStyle, active && { color: '#fff' }]}>{label}</Text>
  </TouchableOpacity>
);

// CHANGED: entry row is now a SoftCard (noPad) with a SoftIcon emoji badge —
// same pattern as Home's meditation entry-point row.
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
  const seed = Number(entry.id) || 1;

  return (
    <Swipeable ref={swipeRef} renderRightActions={renderRightActions} overshootRight={false}>
      <SoftCard noPad seed={seed} sparkleCount={2} style={styles.entryCard}>
        <View style={styles.entryRow}>
          <SoftIcon size={42} radius={13} baseColor={moodColor(level)}>
            <Text style={styles.entryEmoji}>{moodEmoji(level)}</Text>
          </SoftIcon>
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
      </SoftCard>
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
  // CHANGED: getDay() returns Sunday=0..Saturday=6; remapped so the week
  // (and the leading blank cells) starts on Monday instead.
  const firstDow = (new Date(month.getFullYear(), month.getMonth(), 1).getDay() + 6) % 7;
  const monthName = month.toLocaleString('default', { month: 'long', year: 'numeric' });

  const ds = (day) =>
    `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const canProceed =
    (step === 1 && mood !== null) ||
    (step === 2 && feeling !== null) ||
    (step === 3 && factor !== null);

  const levelsByDate = {};
  monthEntries.forEach((e) => {
    const lvl = moodValueToLevel(e.moodValue);
    (levelsByDate[e.date] = levelsByDate[e.date] || []).push(lvl);
  });

  const groupedByDay = Object.values(
    [...monthEntries].reduce((acc, e) => {
      (acc[e.date] = acc[e.date] || { date: e.date, items: [] }).items.push(e);
      return acc;
    }, {})
  ).sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <View style={{ flex: 1 }}>
      <ScreenGradientBackground />
      <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingTop: insets.top + theme.spacing.md }]} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>Mood</Text>

        {/* CHANGED: tabs are now glossy pills (gradient + sheen + border when active) */}
        <View style={styles.tabRow}>
          {(['track', 'insights']).map((t) => (
            <GlossyPill
              key={t}
              label={t === 'track' ? 'Track' : 'Insights'}
              active={tab === t}
              onPress={() => setTab(t)}
              style={styles.tabBtn}
              textStyle={styles.tabText}
              radius={999}
            />
          ))}
        </View>

        {tab === 'track' && (
          <>
            {done ? (
              <SoftCard seed={13} sparkleCount={3}>
                <View style={styles.centered}>
                  <SoftIcon size={64} radius={32} baseColor={mood ? moodColor(mood) : '#9b9b9b'} style={{ marginBottom: theme.spacing.sm }}>
                    <MaterialIcons name="check" size={28} color="#fff" />
                  </SoftIcon>
                  <Text style={styles.doneTitle}>Mood logged</Text>
                  <Text style={styles.doneSub}>
                    {mood && moodLabel(mood)} · {feeling?.name} · {factor?.name}
                  </Text>
                  <GradientButton label="Log another" small onPress={reset} style={{ marginTop: theme.spacing.md }} />
                </View>
              </SoftCard>
            ) : (
              <SoftCard seed={17} sparkleCount={4}>
                <View style={styles.progressRow}>
                  {[1, 2, 3].map((s) => (
                    <View key={s} style={styles.progressBar}>
                      {s <= step && (
                        <LinearGradient
                          colors={[pastel.heroPurple, pastel.heroPink]}
                          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                          style={StyleSheet.absoluteFillObject}
                        />
                      )}
                    </View>
                  ))}
                </View>

                {step === 1 && (
                  <View>
                    <Text style={styles.stepTitle}>Step 1</Text>
                    <Text style={styles.stepSub}>Pick a mood</Text>
                    <View style={styles.moodRow}>
                      {MOOD_LEVELS.map((m) => (
                        <TouchableOpacity key={m.level} onPress={() => { setMood(m.level); setFeeling(null); }} style={styles.moodBtn}>
                          {/* CHANGED: was a flat colored View — now a SoftIcon bubble
                              (two-tone gradient, colored shadow, glossy highlight) */}
                          <SoftIcon
                            size={52}
                            radius={16}
                            baseColor={m.color}
                            style={mood === m.level ? styles.moodCircleActive : null}
                          >
                            <Text style={styles.moodEmoji}>{m.emoji}</Text>
                          </SoftIcon>
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
                      <ActivityIndicator color={pastel.purpleDeep} />
                    ) : (
                      <View style={styles.chipsWrap}>
                        {emotions.map((f) => (
                          <GlossyPill
                            key={f.id}
                            label={f.name}
                            active={feeling?.id === f.id}
                            onPress={() => setFeeling(f)}
                            style={styles.chip}
                            textStyle={styles.chipText}
                          />
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
                      <ActivityIndicator color={pastel.purpleDeep} />
                    ) : (
                      <View style={styles.chipsWrap}>
                        {moodFactors.map((f) => (
                          <GlossyPill
                            key={f.id}
                            label={f.name}
                            active={factor?.id === f.id}
                            onPress={() => setFactor(f)}
                            style={styles.chip}
                            textStyle={styles.chipText}
                          />
                        ))}
                      </View>
                    )}

                    <Text style={[styles.stepSub, { marginTop: theme.spacing.md }]}>Add a note (optional)</Text>
                    <TextInput
                      value={note}
                      onChangeText={setNote}
                      placeholder="Write anything you'd like to remember about today…"
                      placeholderTextColor={pastel.textMuted}
                      multiline
                      textAlignVertical="top"
                      style={styles.noteInput}
                    />
                  </View>
                )}

                <View style={styles.navRow}>
                  {step > 1 && (
                    <TouchableOpacity onPress={() => setStep(step - 1)} style={styles.navBtnBack} activeOpacity={0.8}>
                      <Text style={styles.navBtnBackText}>Back</Text>
                    </TouchableOpacity>
                  )}
                  <GradientButton
                    label={step === 3 ? 'Save mood' : 'Continue'}
                    loading={saving}
                    disabled={!canProceed}
                    onPress={next}
                    style={{ flex: 2 }}
                  />
                </View>
              </SoftCard>
            )}
          </>
        )}

        {tab === 'insights' && (
          <>
            <SoftCard
              seed={21}
              sparkleCount={3}
              fill={['rgba(199,168,242,0.62)', 'rgba(255,255,255,0.35)']}
            >
              <View style={styles.calHeader}>
                <TouchableOpacity onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
                  <MaterialIcons name="chevron-left" size={22} color={pastel.textDeep} />
                </TouchableOpacity>
                <Text style={styles.calTitle}>{monthName}</Text>
                <TouchableOpacity onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
                  <MaterialIcons name="chevron-right" size={22} color={pastel.textDeep} />
                </TouchableOpacity>
              </View>

              {entriesLoading ? (
                <ActivityIndicator color={pastel.purpleDeep} style={{ marginVertical: theme.spacing.lg }} />
              ) : (
                <View style={styles.calGrid}>
                  {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                    <Text key={i} style={styles.calWeekDay}>{d}</Text>
                  ))}
                  {Array.from({ length: firstDow }).map((_, i) => <View key={`e${i}`} style={styles.calCell} />)}
                  {Array.from({ length: daysIn }).map((_, i) => {
                    const day = i + 1;
                    return (
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
            </SoftCard>

            <MoodInsightCard />

            <Text style={styles.entriesHeading}>Entries this month</Text>
            {entriesLoading ? (
              <ActivityIndicator color={pastel.purpleDeep} style={{ marginVertical: theme.spacing.lg }} />
            ) : groupedByDay.length === 0 ? (
              <View style={styles.emptyEntries}>
                <MaterialIcons name="event-note" size={28} color={pastel.textMuted} />
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
              {/* CHANGED: was a flat rose circle — now a glossy SoftIcon bubble */}
              <SoftIcon size={56} radius={28} baseColor={pastel.rose} style={{ marginBottom: theme.spacing.sm }}>
                <MaterialIcons name="delete-outline" size={26} color="#fff" />
              </SoftIcon>
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
    </View>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: theme.spacing.md, paddingBottom: 100 },
  pageTitle: { fontSize: theme.typography.fontSize.heading.md, fontWeight: '800', color: pastel.textDeep, marginBottom: theme.spacing.md },
  tabRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: 22, padding: 5, marginBottom: theme.spacing.md, borderWidth: 1, borderColor: pastel.glassBorder, gap: 5 },
  tabBtn: { flex: 1, paddingVertical: 9, borderRadius: 16, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  tabText: { fontSize: 12, fontWeight: '700', color: pastel.textMuted },
  centered: { alignItems: 'center' },
  doneTitle: { fontSize: 18, fontWeight: '800', color: pastel.textDeep },
  doneSub: { fontSize: 12, color: pastel.textMuted, marginTop: 4, textAlign: 'center' },
  progressRow: { flexDirection: 'row', gap: 6, marginBottom: theme.spacing.md },
  progressBar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.5)', overflow: 'hidden' },
  stepTitle: { fontSize: 14, fontWeight: '700', color: pastel.textDeep },
  stepSub: { fontSize: 12, color: pastel.textMuted, marginBottom: theme.spacing.md },
  moodRow: { flexDirection: 'row', justifyContent: 'space-between' },
  moodBtn: { alignItems: 'center', gap: 6 },
  // CHANGED: active ring is now applied on top of the SoftIcon bubble itself
  moodCircleActive: { borderWidth: 3, borderColor: 'rgba(255,255,255,0.9)', transform: [{ scale: 1.1 }],borderRadius:20 },
  moodEmoji: { fontSize: 24 },
  moodLabelBox: { width: 62, height: 28, alignItems: 'center', justifyContent: 'center' },
  moodEmojiLabel: { fontSize: 11, fontWeight: '600', color: pastel.textMuted, textAlign: 'center' },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  // CHANGED: base (inactive) chip is a frosted pill; GlossyPill layers the
  // gradient + sheen + border on top only when active
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.5)', borderWidth: 1, borderColor: pastel.glassBorder,
    overflow: 'hidden',
  },
  chipText: { fontSize: 12, fontWeight: '600', color: pastel.textDeep },
  noteInput: {
    minHeight: 90, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.5)',
    borderWidth: 1, borderColor: pastel.glassBorder,
    paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm,
    fontSize: theme.typography.fontSize.paragraph.sm, color: pastel.textDeep, marginTop: theme.spacing.xs,
  },
  navRow: { flexDirection: 'row', gap: theme.spacing.xs, marginTop: theme.spacing.md, alignItems: 'center' },
  navBtnBack: { flex: 1, borderRadius: 999, paddingVertical: 14, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.55)', borderWidth: 1, borderColor: pastel.glassBorder },
  navBtnBackText: { fontWeight: '700', color: pastel.textDeep, fontSize: 13 },
  calHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md },
  calTitle: { fontSize: 14, fontWeight: '700', color: pastel.textDeep },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calWeekDay: { width: '14.28%', textAlign: 'center', fontSize: 10, fontWeight: '700', color: pastel.textMuted, paddingVertical: 4 },
  calCell: { width: '14.28%', aspectRatio: 1, padding: 1 },
  calDay: {
    flex: 1, borderRadius: 6, alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)',
  },
  calDayText: { fontSize: 11, fontWeight: '700' },
  legend: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 8, marginTop: theme.spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 3 },
  legendText: { fontSize: 9, fontWeight: '600', color: pastel.textMuted },
  entriesHeading: { fontSize: 14, fontWeight: '800', color: pastel.textDeep, marginBottom: theme.spacing.sm, marginTop: theme.spacing.xs },
  emptyEntries: { alignItems: 'center', gap: 8, paddingVertical: theme.spacing.lg },
  emptyEntriesText: { fontSize: 12, color: pastel.textMuted, fontWeight: '600' },
  daySection: { marginBottom: theme.spacing.md },
  dayLabel: { fontSize: 11, fontWeight: '700', color: pastel.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  entryCard: { marginBottom: 8 },
  entryRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, padding: 16 },
  entryEmoji: { fontSize: 20 },
  entryMoodLabel: { fontSize: 13, fontWeight: '700', color: pastel.textDeep },
  entryMeta: { fontSize: 11, color: pastel.textMuted, marginTop: 2 },
  entryNote: { fontSize: 12, color: pastel.textDeep, marginTop: 4, fontStyle: 'italic' },
  deleteAction: {
    backgroundColor: pastel.rose, justifyContent: 'center', alignItems: 'center',
    width: 88, borderRadius: 16, marginBottom: 8,
  },
  deleteActionText: { color: '#fff', fontSize: 11, fontWeight: '700', marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(74,46,122,0.35)', justifyContent: 'center', alignItems: 'center', padding: theme.spacing.lg },
  modalCard: { width: '100%', maxWidth: 360, backgroundColor: '#FBF7FF', borderRadius: 24, padding: theme.spacing.lg, alignItems: 'center', borderWidth: 1, borderColor: pastel.glassBorder },
  modalTitle: { fontSize: 17, fontWeight: '800', color: pastel.textDeep, marginBottom: 6, textAlign: 'center' },
  modalSub: { fontSize: 12, color: pastel.textMuted, textAlign: 'center', marginBottom: theme.spacing.md, lineHeight: 18 },
  modalBtnRow: { flexDirection: 'row', gap: theme.spacing.sm, width: '100%' },
  modalBtn: { flex: 1, borderRadius: 16, paddingVertical: theme.spacing.md, alignItems: 'center', justifyContent: 'center' },
  modalBtnCancel: { backgroundColor: 'rgba(255,255,255,0.7)', borderWidth: 1, borderColor: pastel.glassBorder },
  modalBtnCancelText: { fontWeight: '700', color: pastel.textDeep, fontSize: 14 },
  modalBtnDelete: { backgroundColor: pastel.rose },
  modalBtnDeleteText: { fontWeight: '700', color: '#fff', fontSize: 14 },
});

export default Mood;