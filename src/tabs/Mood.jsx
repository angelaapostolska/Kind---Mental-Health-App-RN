import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { theme } from '@/constants/theme';
import { MOOD_LEVELS, moodColor, moodLabel, showErrorToast, isoDate } from '@/utils';
import { useAppSelector } from '@/store/store';
import {
  useGetMoodEntriesByMonthQuery,
  useCreateMoodEntryMutation,
  useGetEmotionsQuery,
  useGetMoodFactorsQuery,
} from '@/api/api';

// Maps the 5 frontend mood levels to a backend moodValue (1-10)
const LEVEL_TO_VALUE = { 1: 10, 2: 8, 3: 6, 4: 4, 5: 2 };

// Converts a backend moodValue (1-10) back to a frontend level (1-5) for display
const moodValueToLevel = (v) => {
  if (v >= 9) return 1;
  if (v >= 7) return 2;
  if (v >= 5) return 3;
  if (v >= 3) return 4;
  return 5;
};

const Mood = () => {
  const userId = useAppSelector((state) => state.userState.userId);

  const [tab, setTab] = useState('track');
  const [step, setStep] = useState(1);
  const [mood, setMood] = useState(null);
  const [feeling, setFeeling] = useState(null);
  const [factor, setFactor] = useState(null);
  const [done, setDone] = useState(false);
  const [month, setMonth] = useState(new Date());

  const year = month.getFullYear();
  const monthNum = month.getMonth() + 1;

  const { data: emotions = [], isLoading: emotionsLoading } = useGetEmotionsQuery();
  const { data: moodFactors = [], isLoading: factorsLoading } = useGetMoodFactorsQuery();
  const {
    data: monthEntries = [],
    isLoading: entriesLoading,
    refetch: refetchEntries,
  } = useGetMoodEntriesByMonthQuery({ userId, year, month: monthNum }, { skip: !userId });
  const [createMoodEntry, { isLoading: saving }] = useCreateMoodEntryMutation();

  useEffect(() => {
    if (userId) refetchEntries();
  }, [month, userId]);

  const reset = () => { setStep(1); setMood(null); setFeeling(null); setFactor(null); setDone(false); };

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
        moodValue: LEVEL_TO_VALUE[mood],
        note: '',
        user: { id: userId },
        selectedEmotions: feeling ? [{ id: feeling.id }] : [],
        selectedFactors: factor ? [{ id: factor.id }] : [],
      }).unwrap();
      setDone(true);
    } catch (err) {
      showErrorToast('Could not save your mood entry. Please try again.');
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

  const entriesByDate = {};
  monthEntries.forEach((e) => {
    entriesByDate[e.date] = e.moodValue;
  });

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>Mood</Text>

      {/* Tab Switch */}
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
              {/* Progress bar */}
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
                      <TouchableOpacity key={m.level} onPress={() => setMood(m.level)} style={styles.moodBtn}>
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
                const level = entriesByDate[ds(day)] ? moodValueToLevel(entriesByDate[ds(day)]) : undefined;
                return (
                  <View key={day} style={styles.calCell}>
                    <View style={[styles.calDay, { backgroundColor: level ? moodColor(level) : theme.colors.surface.three, opacity: level ? 1 : 0.4 }]}>
                      <Text style={[styles.calDayText, { color: level ? '#fff' : theme.colors.text.secondary }]}>{day}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Legend */}
          <View style={styles.legend}>
            {MOOD_LEVELS.map((m) => (
              <View key={m.level} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: m.color }]} />
                <Text style={styles.legendText}>{m.label}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
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
  moodEmojiLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.text.secondary,
    textAlign: 'center',
    width: 62,
    height: 28,
    textAlignVertical: 'center',
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
  calDay: { flex: 1, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  calDayText: { fontSize: 11, fontWeight: '700' },
  legend: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 8, marginTop: theme.spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 3 },
  legendText: { fontSize: 9, fontWeight: '600', color: theme.colors.text.secondary },
});

export default Mood;
