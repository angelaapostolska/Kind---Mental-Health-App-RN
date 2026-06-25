import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { GlassCard, GradientHeroCard, ScreenGradientBackground, GlossyCircle, pastel } from '@/components';
import {
  moodColor, moodLabel, AFFIRMATIONS,
  getGreeting, getCurrentWeek, isoDate,
  showSuccessToast, showErrorToast,
} from '@/utils';
import { useAppSelector } from '@/store/store';
import {
  useCreateMoodEntryMutation,
  useGetMoodEntriesQuery,
  useGetHabitsQuery,
  useCreateHabitMutation,
  useDeleteHabitMutation,
} from '@/api/api';

import MoodSlider from '@/components/home/MoodSlider';
import HabitRow, { HabitStatus } from '@/components/home/HabitRow';
import HabitModal from '@/components/home/HabitModal';
import MeditationModal from '@/components/home/MeditationModal';
import MeditationSession from '@/components/home/MeditationSession';

const Home = () => {
  const insets   = useSafeAreaInsets();
  const appState = useAppSelector((s) => s.appState);
  const userName = appState?.userName || 'Friend';
  const userId   = useAppSelector((s) => s.userState.userId);

  // ── Mood ────────────────────────────────────────────────────────────────────
  const [createMoodEntry, { isLoading: savingMood }] = useCreateMoodEntryMutation();
  const { data: moodEntries = [] } = useGetMoodEntriesQuery(userId, { skip: !userId });
  const moodsByDate = Object.fromEntries(moodEntries.map((e) => [e.date, e.moodValue]));

  const handleMoodSelect = async (level) => {
    if (!userId) { showErrorToast('Please log in again to save your mood'); return; }
    try {
      await createMoodEntry({
        date: isoDate(new Date()), moodValue: level, note: '',
        user: { id: userId }, selectedEmotions: [], selectedFactors: [],
      }).unwrap();
      showSuccessToast('Mood saved', `Logged as ${moodLabel(level)}`);
    } catch {
      showErrorToast('Could not save your mood. Please try again.');
    }
  };

  // ── Habits ──────────────────────────────────────────────────────────────────
  const { data: habits = [], isLoading: habitsLoading } = useGetHabitsQuery(userId, { skip: !userId });
  const [createHabit] = useCreateHabitMutation();
  const [deleteHabit] = useDeleteHabitMutation();

  const [completedMap, setCompletedMap] = useState({});
  const handleStatus = useCallback((habitId, done) => {
    setCompletedMap((prev) => (prev[habitId] === done ? prev : { ...prev, [habitId]: done }));
  }, []);
  const completedToday = habits.reduce((n, h) => n + (completedMap[h.id] ? 1 : 0), 0);

  const handleAddHabit = async (spec) => {
    if (!userId) return;
    const name = (typeof spec === 'string' ? spec : spec.name).trim();
    if (!name || habits.some((h) => h.name.toLowerCase() === name.toLowerCase())) return;
    try {
      await createHabit({
        userId,
        data: {
          name, description: '',
          colorHex: spec.colorHex || '#6C5CE7',
          iconIdentifier: spec.iconIdentifier || '',
          creationDate: isoDate(new Date()),
          isSystemHabit: false,
        },
      }).unwrap();
    } catch {
      showErrorToast('Could not add habit. Please try again.');
    }
  };

  const handleDeleteHabit = (habit) => {
    Alert.alert('Remove Habit', `Remove "${habit.name}" from your habits?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          try {
            await deleteHabit(habit.id).unwrap();
            showSuccessToast('Habit removed');
          } catch {
            showErrorToast('Could not remove habit. Please try again.');
          }
        },
      },
    ]);
  };

  // ── UI state ────────────────────────────────────────────────────────────────
  const [affirmation]   = useState(AFFIRMATIONS[Math.floor(Math.random() * AFFIRMATIONS.length)]);
  const [habitModal,    setHabitModal]    = useState(false);
  const [medModal,      setMedModal]      = useState(false);
  const [sessionConfig, setSessionConfig] = useState(null); // { sound, duration } | null

  const greeting    = getGreeting();
  const currentWeek = getCurrentWeek();
  const todayStr    = isoDate(new Date());
  const initials    = userName.slice(0, 1).toUpperCase();

  return (
    <View style={{ flex: 1 }}>
      <ScreenGradientBackground />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + theme.spacing.md }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Invisible per-habit status subscribers */}
        {habits.map((h) => (
          <HabitStatus key={`status-${h.id}`} habit={h} onStatus={handleStatus} />
        ))}

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.userName}>Hi, {userName}</Text>
          </View>
        </View>

        {/* Affirmation */}
        <GradientHeroCard colors={[pastel.heroPurple, pastel.heroPink]} glow="purple">
          <View style={styles.affirmationHeader}>
            <MaterialCommunityIcons name="star-four-points" size={14} color="rgba(255,255,255,0.9)" />
            <Text style={styles.affirmationLabel}>DAILY AFFIRMATION</Text>
          </View>
          <Text style={styles.affirmationText}>{affirmation}</Text>
        </GradientHeroCard>

        {/* Mood picker */}
        <GradientHeroCard colors={[pastel.heroPink, pastel.heroPurple, pastel.heroBlue]} glow="pink">
          <MoodSlider onChange={handleMoodSelect} saving={savingMood} light />
        </GradientHeroCard>

        {/* Week in Review */}
        <GlassCard glow="purple">
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Week in Review</Text>
            <Text style={styles.cardSubtitle}>This week</Text>
          </View>
          <View style={styles.weekRow}>
            {currentWeek.map(({ date, dayLabel }, i) => {
              const ds  = isoDate(date);
              const lvl = moodsByDate[ds] || null;
              return (
                <View key={i} style={styles.weekCol}>
                  <View style={[styles.weekBar, {
                    backgroundColor: lvl ? moodColor(lvl) : 'rgba(123,107,165,0.25)',
                    opacity: lvl ? 0.95 : 1,
                    height: lvl ? 16 + lvl * 8 : 8,
                  }]} />
                  <Text style={[styles.weekDay, ds === todayStr && { color: pastel.purpleDeep }]}>
                    {dayLabel}
                  </Text>
                </View>
              );
            })}
          </View>
        </GlassCard>

        {/* Habits preview */}
        <GlassCard glow="purple">
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Today's Habits</Text>
            <Text style={[styles.cardSubtitle, { color: pastel.purpleDeep }]}>
              {completedToday}/{habits.length}
            </Text>
          </View>
          {habitsLoading ? (
            <ActivityIndicator color={pastel.purpleDeep} style={{ marginVertical: theme.spacing.md }} />
          ) : habits.length === 0 ? (
            <Text style={styles.emptyText}>No habits yet. Tap below to add some.</Text>
          ) : (
            habits.slice(0, 3).map((h) => <HabitRow key={h.id} habit={h} />)
          )}
          <TouchableOpacity onPress={() => setHabitModal(true)} activeOpacity={0.7}>
            <Text style={styles.seeMore}>Tap to manage habits →</Text>
          </TouchableOpacity>
        </GlassCard>

        {/* Meditation entry point */}
        <TouchableOpacity onPress={() => setMedModal(true)} activeOpacity={0.8}>
          <GlassCard glow="mint" noPad>
            <View style={[styles.medRow, { padding: 18 }]}>
              <GlossyCircle size={40} backgroundColor="rgba(95,227,196,0.32)" style={{ borderRadius: 14 }}>
                <MaterialCommunityIcons name="brain" size={18} color={pastel.mintDeep} />
              </GlossyCircle>
              <View style={{ flex: 1 }}>
                <Text style={styles.medTitle}>Today's Meditation</Text>
                <Text style={styles.medSub}>5 min · Choose your style</Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={pastel.textMuted} />
            </View>
          </GlassCard>
        </TouchableOpacity>
      </ScrollView>

      {/* ── Modals (outside ScrollView so they render over everything) ── */}
      <HabitModal
        visible={habitModal}
        onClose={() => setHabitModal(false)}
        habits={habits}
        completedToday={completedToday}
        onAddHabit={handleAddHabit}
        onDeleteHabit={handleDeleteHabit}
      />

      <MeditationModal
        visible={medModal}
        onClose={() => setMedModal(false)}
        onStart={(config) => { setMedModal(false); setSessionConfig(config); }}
      />

      <MeditationSession
        visible={sessionConfig !== null}
        sound={sessionConfig?.sound ?? 'Rain'}
        duration={sessionConfig?.duration ?? 5}
        onDone={() => setSessionConfig(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: theme.spacing.md, paddingBottom: 100 },
  header: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.lg, paddingHorizontal: 8},
  avatarShadow: {
    shadowColor: pastel.purpleDeep, shadowOpacity: 0.35,
    shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4,
  },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 18 },
  greeting: { fontSize: theme.typography.fontSize.paragraph.sm, color: pastel.textMuted, fontWeight: '600' },
  userName: { fontSize: theme.typography.fontSize.heading.md, fontWeight: '800', color: pastel.textDeep },
  affirmationHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: theme.spacing.xs, opacity: 0.9 },
  affirmationLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.9)', letterSpacing: 1 },
  affirmationText: { fontSize: theme.typography.fontSize.paragraph.lg, fontWeight: '700', color: '#fff', lineHeight: 26 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.sm },
  cardTitle: { fontSize: theme.typography.fontSize.paragraph.md, fontWeight: '700', color: pastel.textDeep },
  cardSubtitle: { fontSize: 10, fontWeight: '600', color: pastel.textMuted },
  emptyText: { fontSize: theme.typography.fontSize.paragraph.sm, color: pastel.textMuted, paddingVertical: theme.spacing.sm },
  weekRow: { flexDirection: 'row', alignItems: 'flex-end', height: 70, gap: 6, marginTop: theme.spacing.xs },
  weekCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  weekBar: { width: '100%', borderRadius: 4 },
  weekDay: { fontSize: 10, fontWeight: '700', color: pastel.textMuted },
  seeMore: { fontSize: 11, fontWeight: '700', color: pastel.purpleDeep, marginTop: theme.spacing.xs },
  medRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  medTitle: { fontSize: theme.typography.fontSize.paragraph.sm, fontWeight: '700', color: pastel.textDeep },
  medSub: { fontSize: 11, color: pastel.textMuted },
});

export default Home;
