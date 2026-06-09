import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { theme } from '@/constants/theme';
import { MOOD_LEVELS, FEELINGS, FACTORS, moodColor, moodLabel, moodEmoji } from '@/utils';

const MOCK_MOODS = {
  '2026-05-01': 1, '2026-05-02': 2, '2026-05-03': 3, '2026-05-04': 1,
  '2026-05-05': 2, '2026-05-06': 4, '2026-05-07': 2,
};

const Mood = () => {
  const [tab, setTab] = useState('track');
  const [step, setStep] = useState(1);
  const [mood, setMood] = useState(null);
  const [feeling, setFeeling] = useState(null);
  const [factor, setFactor] = useState(null);
  const [done, setDone] = useState(false);
  const [month, setMonth] = useState(new Date(2026, 4, 1));

  const reset = () => { setStep(1); setMood(null); setFeeling(null); setFactor(null); setDone(false); };

  const next = () => {
    if (step === 3) { setDone(true); return; }
    setStep(step + 1);
  };

  const daysIn = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const firstDow = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const monthName = month.toLocaleString('default', { month: 'long', year: 'numeric' });

  const ds = (day) => `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

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
                {mood && moodLabel(mood)} · {feeling} · {factor}
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
                        <Text style={styles.moodEmojiLabel}>{m.label.split(' ').pop()}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {step === 2 && (
                <View>
                  <Text style={styles.stepTitle}>Step 2</Text>
                  <Text style={styles.stepSub}>Choose a feeling</Text>
                  <View style={styles.chipsWrap}>
                    {FEELINGS.map((f) => (
                      <TouchableOpacity key={f} onPress={() => setFeeling(f)} style={[styles.chip, feeling === f && styles.chipActive]}>
                        <Text style={[styles.chipText, feeling === f && styles.chipTextActive]}>{f}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {step === 3 && (
                <View>
                  <Text style={styles.stepTitle}>Step 3</Text>
                  <Text style={styles.stepSub}>What influenced your mood?</Text>
                  <View style={styles.chipsWrap}>
                    {FACTORS.map((f) => (
                      <TouchableOpacity key={f} onPress={() => setFactor(f)} style={[styles.chip, factor === f && styles.chipActive]}>
                        <Text style={[styles.chipText, factor === f && styles.chipTextActive]}>{f}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
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
                  disabled={(step === 1 && !mood) || (step === 2 && !feeling) || (step === 3 && !factor)}
                  style={[styles.navBtn, styles.navBtnNext, { opacity: ((step === 1 && !mood) || (step === 2 && !feeling) || (step === 3 && !factor)) ? 0.4 : 1 }]}
                >
                  <Text style={styles.navBtnNextText}>{step === 3 ? 'Save mood' : 'Continue'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </>
      )}

      {tab === 'insights' && (
        <>
          {/* Calendar */}
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

            <View style={styles.calGrid}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <Text key={i} style={styles.calWeekDay}>{d}</Text>
              ))}
              {Array.from({ length: firstDow }).map((_, i) => <View key={`e${i}`} style={styles.calCell} />)}
              {Array.from({ length: daysIn }).map((_, i) => {
                const day = i + 1;
                const m = MOCK_MOODS[ds(day)];
                return (
                  <View key={day} style={styles.calCell}>
                    <View style={[styles.calDay, { backgroundColor: m ? moodColor(m) : theme.colors.surface.three, opacity: m ? 1 : 0.4 }]}>
                      <Text style={[styles.calDayText, { color: m ? '#fff' : theme.colors.text.secondary }]}>{day}</Text>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Legend */}
            <View style={styles.legend}>
              {MOOD_LEVELS.map((m) => (
                <View key={m.level} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: m.color }]} />
                  <Text style={styles.legendText}>{m.label.split(' ').pop()}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Patterns card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Patterns</Text>
            <Text style={styles.cardSubtitle}>Your feelings over the past 30 days</Text>
            <View style={styles.radarPlaceholder}>
              <Text style={styles.radarPlaceholderText}>Mood pattern chart{'\n'}(connect to live data)</Text>
              <View style={styles.radarRow}>
                {['Happy', 'Calm', 'Energetic', 'Anxious', 'Tired', 'Sad'].map((label, i) => {
                  const values = [80, 65, 50, 30, 40, 20];
                  return (
                    <View key={label} style={styles.radarBarCol}>
                      <View style={[styles.radarBar, { height: values[i] * 0.8, backgroundColor: theme.colors.primary, opacity: 0.6 }]} />
                      <Text style={styles.radarLabel}>{label}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        </>
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
  moodEmojiLabel: { fontSize: 9, fontWeight: '600', color: theme.colors.text.secondary, textAlign: 'center' },
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
  navBtnNextText: { fontWeight: '700', color: '#fff', fontSize: 13 },
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
  cardTitle: { fontSize: theme.typography.fontSize.paragraph.md, fontWeight: '700', color: theme.colors.text.primary },
  cardSubtitle: { fontSize: 11, color: theme.colors.text.secondary, marginBottom: theme.spacing.md },
  radarPlaceholder: { backgroundColor: theme.colors.surface.two, borderRadius: 16, padding: theme.spacing.md, alignItems: 'center' },
  radarPlaceholderText: { fontSize: 11, color: theme.colors.text.secondary, textAlign: 'center', marginBottom: theme.spacing.md },
  radarRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 100 },
  radarBarCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  radarBar: { width: '100%', borderRadius: 4 },
  radarLabel: { fontSize: 8, fontWeight: '600', color: theme.colors.text.secondary, textAlign: 'center' },
});

export default Mood;
