import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, Dimensions, ActivityIndicator, Animated, Easing,
  TextInput, Modal, Dimensions, ActivityIndicator, Alert,
  Animated, PanResponder, Pressable,          // CHANGED: for swipe-to-dismiss + backdrop
} from 'react-native';
import { Audio } from 'expo-av';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { GlassCard, GradientHeroCard, ScreenGradientBackground, GlossyCircle, pastel } from '@/components';   // CHANGED: glass/pastel UI overhaul
import {
  MOOD_LEVELS, moodColor, moodLabel, AFFIRMATIONS,
  getGreeting, getCurrentWeek, isoDate,
  showSuccessToast, showErrorToast,
} from '@/utils';
import { useAppSelector } from '@/store/store';
import {
  useCreateMoodEntryMutation,
  useGetMoodEntriesQuery,
  useGetHabitsQuery,
  useCreateHabitMutation,
  useDeleteHabitMutation,       // ← NEW
  useGetHabitTodayQuery,
  useToggleHabitTodayMutation,
} from '@/api/api';

const { width, height: SCREEN_H } = Dimensions.get('window');   // CHANGED: need height for dismiss animation

// CHANGED: reusable bottom sheet you can close by dragging the handle down
// (previously the only way out of the Habits/Meditation modals was the button).
const SwipeDismissSheet = ({ visible, onClose, children }) => {
  const translateY = useRef(new Animated.Value(SCREEN_H)).current;

  // Slide up when it opens
  useEffect(() => {
    if (visible) {
      translateY.setValue(SCREEN_H);
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
    }
  }, [visible, translateY]);

  // Animate down, then actually unmount
  const dismiss = useCallback(() => {
    Animated.timing(translateY, { toValue: SCREEN_H, duration: 220, useNativeDriver: true })
      .start(() => onClose());
  }, [translateY, onClose]);

  // Drag handler lives on the handle area only, so it never fights the inner ScrollView
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => { if (g.dy > 0) translateY.setValue(g.dy); },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 110 || g.vy > 1.1) {
          dismiss();
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
        }
      },
    })
  ).current;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        {/* CHANGED: backdrop is now a sibling BEHIND the sheet. Tapping the dim area
            closes it, but it no longer wraps/intercepts taps meant for the sheet's
            inputs and buttons (that interception caused the "first tap does nothing,
            keyboard just hides" bug on the Add button). */}
        <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} />
        <Animated.View style={[styles.modalSheet, { transform: [{ translateY }] }]}>
          {/* Grab zone — drag this down to dismiss */}
          <View {...pan.panHandlers} style={styles.sheetGrabZone}>
            <View style={styles.modalHandle} />
          </View>
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
};

const ICON_BY_IDENTIFIER = {
  meditation: 'weather-windy',
  exercise: 'dumbbell',
  journal: 'book-open-variant',
  phone: 'cellphone',
  book: 'book-open-variant',
  moon: 'moon-waning-crescent',
  coffee: 'coffee',
  heart: 'heart',
  walk: 'walk',
  run: 'run',
  people: 'account-group',
  'no-drink': 'cup-off',
  food: 'food',
  work: 'briefcase',
  sun: 'white-balance-sunny',
  supplement: 'pill',
  yoga: 'yoga',
  water: 'water',
  prayer: 'hands-pray',
  stretch: 'human-handsup',
};

const SUGGESTED_HABITS = [
  { name: 'Meditate',    iconIdentifier: 'meditation', colorHex: '#8B5CF6' },
  { name: 'Drink Water', iconIdentifier: 'water',      colorHex: '#3B82F6' },
  { name: 'Exercise',    iconIdentifier: 'exercise',   colorHex: '#10B981' },
  { name: 'Read',        iconIdentifier: 'book',       colorHex: '#F59E0B' },
  { name: 'Stretch',     iconIdentifier: 'stretch',    colorHex: '#EC4899' },
  { name: 'Walk',        iconIdentifier: 'walk',       colorHex: '#10B981' },
  { name: 'Sleep early', iconIdentifier: 'moon',       colorHex: '#6366F1' },
  { name: 'Gratitude',   iconIdentifier: 'heart',      colorHex: '#F59E0B' },
];

const habitIconName = (habit) =>
  ICON_BY_IDENTIFIER[habit.iconIdentifier] ||
  ICON_BY_IDENTIFIER[(habit.name || '').toLowerCase()] ||
  'checkbox-marked-circle';

const SOUND_FILES = {
  Rain: require('../assets/sounds/rain.mp3'),
  Ocean: require('../assets/sounds/ocean.mp3'),
  Forest: require('../assets/sounds/forest.mp3'),
  'White noise': require('../assets/sounds/whitenoise.mp3'),
};

const SESSION_AURA_COLOR = '#b4a7f5';

const AURA_RINGS = [
  { size: 300, opacityRange: [0.04, 0.11], scaleRange: [1.0, 1.22] },
  { size: 262, opacityRange: [0.07, 0.17], scaleRange: [1.0, 1.17] },
  { size: 224, opacityRange: [0.11, 0.24], scaleRange: [1.0, 1.12] },
  { size: 188, opacityRange: [0.17, 0.32], scaleRange: [1.0, 1.08] },
  { size: 154, opacityRange: [0.26, 0.43], scaleRange: [1.0, 1.05] },
  { size: 122, opacityRange: [0.36, 0.56], scaleRange: [1.0, 1.02] },
];

const SPARKLE_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

const SOUND_ICONS = {
  Rain: 'weather-rainy',
  Ocean: 'waves',
  Forest: 'tree',
  'White noise': 'music-note-whole',
};

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const MEDITATION_TYPES = [
  { name: 'Body Scan',       desc: 'Release tension head to toe' },
  { name: 'Loving Kindness', desc: 'Cultivate compassion' },
  { name: 'Focus',           desc: 'Train sustained attention' },
  { name: 'Sleep',           desc: 'Drift off peacefully' },
];

// ─── Mood Picker ────────────────────────────────────────────────────────────
// CHANGED: `light` renders white/translucent text + a glassy badge, for use on
// top of the new pastel gradient hero card instead of a plain white surface.
const MoodSlider = ({ value = 3, onChange, saving, light = false }) => {
  const [v, setV] = useState(value);

  return (
    <View style={moodStyles.container}>
      <View style={moodStyles.header}>
        <Text style={[moodStyles.label, light && moodStyles.labelLight]}>How are you feeling?</Text>
        <View style={[moodStyles.badge, light ? moodStyles.badgeGlass : { backgroundColor: moodColor(v) }]}>
          <Text style={[moodStyles.badgeText, light && { color: '#fff' }]}>{moodLabel(v)}</Text>
        </View>
      </View>
      <View style={moodStyles.row}>
        {MOOD_LEVELS.map((m) => (
          <TouchableOpacity
            key={m.level}
            disabled={saving}
            onPress={() => { setV(m.level); onChange?.(m.level); }}
            style={moodStyles.emojiBtn}
          >
            <Text style={[moodStyles.emoji, v === m.level && moodStyles.emojiActive]}>{m.emoji}</Text>
            <View style={moodStyles.emojiLabelBox}>
              {/* CHANGED: one word per line (instead of a single small wrapped line) —
                  lets two-word labels like "Very Pleasant" break cleanly and the
                  font size go up without overflowing the column. */}
              {m.label.split(' ').map((word, idx) => (
                <Text
                  key={idx}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                  style={[
                    moodStyles.emojiLabel,
                    light && moodStyles.emojiLabelLight,
                    v === m.level && (light ? moodStyles.emojiLabelActiveLight : { color: moodColor(m.level), fontWeight: '700' }),
                  ]}
                >
                  {word}
                </Text>
              ))}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

// ─── Invisible status subscriber (keeps completion count in sync) ────────────
const HabitStatus = ({ habit, onStatus }) => {
  const { data } = useGetHabitTodayQuery(habit.id);
  const done = !!data?.completed;
  useEffect(() => {
    onStatus(habit.id, done);
  }, [habit.id, done, onStatus]);
  return null;
};

// ─── Tappable habit row ──────────────────────────────────────────────────────
/**
 * FIX — daily-log must be tied to the user.
 * The backend already scopes the log to the habit (which belongs to the user),
 * so we don't need to pass userId to `toggleHabitToday`. What was missing is
 * that `getHabitToday` was being called with only `habit.id` — but the backend
 * endpoint is `GET /api/habits/{habitId}/logs/today` which correctly scopes by
 * habitId (and the habit already has the userId FK). So RTK Query just needed
 * the mutation to also invalidate the right tag, which is done in api.js.
 *
 * The real gap was the missing `deleteHabit` wire-up in the modal (below).
 */
const HabitRow = ({ habit, showDelete = false, onDelete }) => {
  const { data } = useGetHabitTodayQuery(habit.id);
  const [toggleHabitToday, { isLoading }] = useToggleHabitTodayMutation();
  const done = !!data?.completed;

  const onPress = async () => {
    try {
      await toggleHabitToday({ habitId: habit.id, completed: !done }).unwrap();
    } catch {
      showErrorToast('Could not update habit. Please try again.');
    }
  };

  return (
    <View style={styles.habitRowWrapper}>
      <TouchableOpacity onPress={onPress} disabled={isLoading} style={styles.habitRow} activeOpacity={0.7}>
        {/* CHANGED: GlossyCircle (was a flat View with an inline backgroundColor override
            that was silently fighting the pastel tint, leaving these almost-white). */}
        <GlossyCircle size={38} backgroundColor="rgba(183,156,242,0.30)">
          <MaterialCommunityIcons name={habitIconName(habit)} size={16} color={habit.colorHex || pastel.purpleDeep} />
        </GlossyCircle>
        <Text style={[styles.habitName, done && styles.habitDone]}>{habit.name}</Text>
        {isLoading ? (
          <ActivityIndicator size="small" color={pastel.purpleDeep} />
        ) : (
          <View style={[styles.checkbox, done && styles.checkboxDone]}>
            {done && <MaterialIcons name="check" size={12} color="#fff" />}
          </View>
        )}
      </TouchableOpacity>

      {/* Delete button — only shown inside the modal */}
      {showDelete && (
        <TouchableOpacity onPress={() => onDelete?.(habit)} style={styles.deleteBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialIcons name="delete-outline" size={18} color={theme.colors.text.error} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const moodStyles = StyleSheet.create({
  container: { gap: theme.spacing.sm },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: theme.typography.fontSize.paragraph.md, fontWeight: '700', color: pastel.textDeep },
  labelLight: { color: '#fff' },   // CHANGED
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeGlass: {   // CHANGED: glassy pill for the colorful gradient background
    backgroundColor: 'rgba(255,255,255,0.28)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  emojiBtn: { alignItems: 'center', gap: 4, flex: 1 },
  emoji: { fontSize: 30, opacity: 0.6 },
  emojiActive: { opacity: 1, transform: [{ scale: 1.2 }] },
  emojiLabelBox: { height: 32, justifyContent: 'center' },   // CHANGED: taller for two stacked words
  emojiLabel: { fontSize: 12, fontWeight: '600', color: pastel.textMuted, textAlign: 'center', lineHeight: 14 },   // CHANGED: 9 → 12
  emojiLabelLight: { color: 'rgba(255,255,255,0.75)' },   // CHANGED
  emojiLabelActiveLight: { color: '#fff', fontWeight: '800' },   // CHANGED
});

// ─── Home screen ─────────────────────────────────────────────────────────────
const Home = () => {
  const insets = useSafeAreaInsets();
  const appState  = useAppSelector((s) => s.appState);
  const userName  = appState?.userName || 'Friend';
  const userId    = useAppSelector((s) => s.userState.userId);

  const [createMoodEntry, { isLoading: savingMood }] = useCreateMoodEntryMutation();
  const { data: moodEntries = [] } = useGetMoodEntriesQuery(userId, { skip: !userId });

  const moodsByDate = {};
  moodEntries.forEach((e) => { moodsByDate[e.date] = e.moodValue; });

  // Habits
  const { data: habits = [], isLoading: habitsLoading } = useGetHabitsQuery(userId, { skip: !userId });
  const [createHabit]  = useCreateHabitMutation();
  const [deleteHabit]  = useDeleteHabitMutation();  // ← NEW

  // Completion map
  const [completedMap, setCompletedMap] = useState({});
  const handleStatus = useCallback((habitId, done) => {
    setCompletedMap((prev) => (prev[habitId] === done ? prev : { ...prev, [habitId]: done }));
  }, []);
  const completedToday = habits.reduce((n, h) => n + (completedMap[h.id] ? 1 : 0), 0);

  const handleMoodSelect = async (level) => {
    if (!userId) { showErrorToast('Please log in again to save your mood'); return; }
    try {
      await createMoodEntry({
        date: isoDate(new Date()),
        moodValue: level,
        note: '',
        user: { id: userId },
        selectedEmotions: [],
        selectedFactors: [],
      }).unwrap();
      showSuccessToast('Mood saved', `Logged as ${moodLabel(level)}`);
    } catch {
      showErrorToast('Could not save your mood. Please try again.');
    }
  };

  const addHabit = async (spec) => {
    if (!userId) return;
    const name = (typeof spec === 'string' ? spec : spec.name).trim();
    if (!name || habits.some((h) => h.name.toLowerCase() === name.toLowerCase())) return;
    try {
      await createHabit({
        userId,
        data: {
          name,
          description: '',
          colorHex: spec.colorHex || '#6C5CE7',
          iconIdentifier: spec.iconIdentifier || '',
          creationDate: isoDate(new Date()),
          isSystemHabit: false,
        },
      }).unwrap();
      setCustomHabit('');
    } catch {
      showErrorToast('Could not add habit. Please try again.');
    }
  };

  // FIX — delete habit with confirmation
  const handleDeleteHabit = (habit) => {
    Alert.alert(
      'Remove Habit',
      `Remove "${habit.name}" from your habits?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteHabit(habit.id).unwrap();
              showSuccessToast('Habit removed');
            } catch {
              showErrorToast('Could not remove habit. Please try again.');
            }
          },
        },
      ],
    );
  };

  const [affirmation]  = useState(AFFIRMATIONS[Math.floor(Math.random() * AFFIRMATIONS.length)]);
  const [habitModal,  setHabitModal]  = useState(false);
  const [medModal,    setMedModal]    = useState(false);
  const [medMode,     setMedMode]     = useState('sound');
  const [medSound,    setMedSound]    = useState('Rain');
  const [medDuration, setMedDuration] = useState(5);
  const [customHabit, setCustomHabit] = useState('');

  const [medSession, setMedSession] = useState(false);
  const [medTimeLeft, setMedTimeLeft] = useState(0);
  const [medComplete, setMedComplete] = useState(false);
  const soundRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const pulseLoopRef = useRef(null);
  const riseAnim = useRef(new Animated.Value(0)).current;
  const textFadeAnim = useRef(new Animated.Value(0)).current;
  const subFadeAnim = useRef(new Animated.Value(0)).current;
  const sparkleAnim = useRef(new Animated.Value(0)).current;

  const endMedSession = useCallback(async () => {
    setMedSession(false);
    if (soundRef.current) {
      try { await soundRef.current.stopAsync(); await soundRef.current.unloadAsync(); } catch (_) {}
      soundRef.current = null;
    }
    riseAnim.setValue(0);
    textFadeAnim.setValue(0);
    subFadeAnim.setValue(0);
    sparkleAnim.setValue(0);
    setMedComplete(true);
  }, [riseAnim, textFadeAnim, subFadeAnim, sparkleAnim]);

  const closeCompletion = useCallback(() => setMedComplete(false), []);

  useEffect(() => {
    if (!medComplete) return;
    Animated.spring(riseAnim, { toValue: 1, tension: 42, friction: 7, useNativeDriver: true }).start(() => {
      Animated.timing(textFadeAnim, { toValue: 1, duration: 750, useNativeDriver: true }).start(() => {
        Animated.timing(subFadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
      });
    });
    Animated.timing(sparkleAnim, { toValue: 1, duration: 1000, delay: 250, useNativeDriver: true }).start();
  }, [medComplete, riseAnim, textFadeAnim, subFadeAnim, sparkleAnim]);

  const startMedSession = useCallback(async () => {
    setMedModal(false);
    setMedTimeLeft(medDuration * 60);
    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync(SOUND_FILES[medSound], { isLooping: true });
      soundRef.current = sound;
      await sound.playAsync();
    } catch (e) {
      console.warn('Meditation audio error:', e);
    }
    setMedSession(true);
  }, [medDuration, medSound]);

  useEffect(() => {
    if (!medSession) return;
    const interval = setInterval(() => setMedTimeLeft((t) => Math.max(0, t - 1)), 1000);
    return () => clearInterval(interval);
  }, [medSession]);

  useEffect(() => {
    if (medSession && medTimeLeft === 0) endMedSession();
  }, [medTimeLeft, medSession, endMedSession]);

  useEffect(() => {
    if (!medSession) {
      if (pulseLoopRef.current) { pulseLoopRef.current.stop(); pulseLoopRef.current = null; }
      pulseAnim.setValue(0);
      return;
    }
    pulseLoopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 3500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 3500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    pulseLoopRef.current.start();
    return () => { if (pulseLoopRef.current) { pulseLoopRef.current.stop(); pulseLoopRef.current = null; } };
  }, [medSession, pulseAnim]);

  const greeting = getGreeting();
  const currentWeek = getCurrentWeek();
  const todayStr    = isoDate(new Date());
  const initials    = userName.slice(0, 1).toUpperCase();   // CHANGED: header avatar bubble

  return (
    // CHANGED: pastel glass overhaul — gradient wash behind everything, the ScrollView
    // itself is transparent so the gradient shows through every glass card.
    <View style={{ flex: 1 }}>
      <ScreenGradientBackground />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + theme.spacing.md }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hidden per-habit status subscribers */}
        {habits.map((h) => (
          <HabitStatus key={`status-${h.id}`} habit={h} onStatus={handleStatus} />
        ))}

        {/* Header */}
        <View style={styles.header}>
          <GlossyCircle size={48} backgroundColor={pastel.purple} style={styles.avatarBubbleShadow}>
            <Text style={styles.avatarBubbleText}>{initials}</Text>
          </GlossyCircle>
          <View>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.userName}>Hi, {userName} 👋</Text>
          </View>
        </View>

        {/* Affirmation — gradient hero, purple→pink (lightened so it stands out from the bg) */}
        <GradientHeroCard colors={[pastel.heroPurple, pastel.heroPink]} glow="purple">
          <View style={styles.affirmationHeader}>
            <MaterialCommunityIcons name="star-four-points" size={14} color="rgba(255,255,255,0.9)" />
            <Text style={styles.affirmationLabel}>DAILY AFFIRMATION</Text>
          </View>
          <Text style={styles.affirmationText}>{affirmation}</Text>
        </GradientHeroCard>

        {/* Mood — gradient hero, pink→purple→blue (the signature "weather mood" treatment) */}
        <GradientHeroCard colors={[pastel.heroPink, pastel.heroPurple, pastel.heroBlue]} glow="pink">
          <MoodSlider onChange={handleMoodSelect} saving={savingMood} light />
        </GradientHeroCard>

        {/* Week in Review — frosted glass */}
        <GlassCard glow="purple">
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Week in Review</Text>
            <Text style={styles.cardSubtitle}>This week</Text>
          </View>
          <View style={styles.weekRow}>
            {currentWeek.map(({ date, dayLabel }, i) => {
              const ds     = isoDate(date);
              const moodLvl = moodsByDate[ds] || null;
              const isToday = ds === todayStr;
              return (
                <View key={i} style={styles.weekCol}>
                  <View style={[
                    styles.weekBar,
                    {
                      backgroundColor: moodLvl ? moodColor(moodLvl) : 'rgba(123,107,165,0.25)',
                      opacity: moodLvl ? 0.95 : 1,
                      // CHANGED: was 20+lvl*10 (max 70 == the row's own height, so the
                      // tallest "Very Pleasant" bar touched the very top of its container
                      // and visually poked into the title above). Capped well under that.
                      height: moodLvl ? 16 + moodLvl * 8 : 8,
                    },
                  ]} />
                  <Text style={[styles.weekDay, isToday && { color: pastel.purpleDeep }]}>{dayLabel}</Text>
                </View>
              );
            })}
          </View>
        </GlassCard>

        {/* Habits preview — frosted glass */}
        <GlassCard glow="purple">
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Today's Habits</Text>
            <Text style={[styles.cardSubtitle, { color: pastel.purpleDeep }]}>{completedToday}/{habits.length}</Text>
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

        {/* Meditation — frosted glass, mint accent (was a flat solid-green block) */}
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

        {/* ── Habits Modal ── */}
        {/* CHANGED: now a SwipeDismissSheet — drag the handle down (or tap outside) to close */}
        <SwipeDismissSheet visible={habitModal} onClose={() => setHabitModal(false)}>
          <Text style={styles.modalTitle}>Habits</Text>

          <View style={styles.habitsSummary}>
            <Text style={styles.habitsSummaryNum}>{completedToday}/{habits.length}</Text>
            <Text style={styles.habitsSummaryLabel}>completed today</Text>
          </View>

          {/* flexShrink lets the list scroll inside the sheet */}
          {/* CHANGED: keyboardShouldPersistTaps so the first tap on "Add" fires onPress
            instead of just dismissing the keyboard (previously needed two taps). */}
          <ScrollView
            style={styles.modalScroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* FIX — show delete button on each row inside the modal */}
            {habits.map((h) => (
              <HabitRow
                key={h.id}
                habit={h}
                showDelete
                onDelete={handleDeleteHabit}
              />
            ))}

            <Text style={[styles.cardTitle, { marginTop: theme.spacing.md, marginBottom: theme.spacing.xs }]}>Suggested</Text>
            <View style={styles.chipsRow}>
              {SUGGESTED_HABITS
                .filter((g) => !habits.some((h) => h.name.toLowerCase() === g.name.toLowerCase()))
                .map((g) => (
                  <TouchableOpacity key={g.name} onPress={() => addHabit(g)} style={styles.chip}>
                    <MaterialIcons name="add" size={12} color={pastel.textDeep} />
                    <Text style={styles.chipText}>{g.name}</Text>
                  </TouchableOpacity>
                ))}
            </View>

            <View style={styles.customRow}>
              <TextInput
                value={customHabit}
                onChangeText={setCustomHabit}
                placeholder="Add custom habit"
                placeholderTextColor={pastel.textMuted}
                style={styles.customInput}
                returnKeyType="done"                              /* CHANGED */
                onSubmitEditing={() => addHabit(customHabit)}      /* CHANGED: hitting return adds it */
              />
              <TouchableOpacity onPress={() => addHabit(customHabit)} style={styles.addBtn}>
                <Text style={styles.addBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          <TouchableOpacity style={styles.modalClose} onPress={() => setHabitModal(false)}>
            <Text style={styles.modalCloseText}>Done</Text>
          </TouchableOpacity>
        </SwipeDismissSheet>

        {/* ── Meditation Modal ── */}
        {/* CHANGED: swipe-to-dismiss for consistency */}
        <SwipeDismissSheet visible={medModal} onClose={() => setMedModal(false)}>
          <Text style={styles.modalTitle}>Meditation</Text>

          <View style={styles.tabRow}>
            {(['sound', 'guided']).map((m) => (
              <TouchableOpacity key={m} onPress={() => setMedMode(m)} style={[styles.tabBtn, medMode === m && styles.tabBtnActive]}>
                <Text style={[styles.tabText, medMode === m && styles.tabTextActive]}>
                  {m === 'sound' ? 'Sound + Timer' : 'Guided'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

      {/* Meditation Modal */}
      <Modal visible={medModal} animationType="slide" transparent onRequestClose={() => setMedModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Meditation</Text>

            <View style={styles.tabRow}>
              {(['sound', 'guided']).map((m) => (
                <TouchableOpacity key={m} onPress={() => setMedMode(m)} style={[styles.tabBtn, medMode === m && styles.tabBtnActive]}>
                  <Text style={[styles.tabText, medMode === m && styles.tabTextActive]}>
                    {m === 'sound' ? 'Sound + Timer' : 'Guided'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {medMode === 'sound' ? (
              <View>
                <Text style={styles.sectionLabel}>Pick a sound</Text>
                <View style={styles.soundGrid}>
                  {['Rain', 'Ocean', 'Forest', 'White noise'].map((s) => (
                    <TouchableOpacity key={s} onPress={() => setMedSound(s)} style={[styles.soundChip, medSound === s && styles.soundChipActive]}>
                      <MaterialCommunityIcons name={SOUND_ICONS[s] || 'music'} size={14} color={medSound === s ? '#fff' : theme.colors.text.primary} />
                      <Text style={[styles.soundChipText, medSound === s && { color: '#fff' }]}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.sectionLabel}>Duration: {medDuration} min</Text>
                <View style={styles.durationRow}>
                  {[5, 10, 15, 20, 30].map((d) => (
                    <TouchableOpacity key={d} onPress={() => setMedDuration(d)} style={[styles.durationChip, medDuration === d && styles.durationChipActive]}>
                      <Text style={[styles.durationChipText, medDuration === d && { color: '#fff' }]}>{d}m</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity style={styles.startBtn} onPress={startMedSession}>
                  <Text style={styles.startBtnText}>Start session</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.sectionLabel}>Duration: {medDuration} min</Text>
              <View style={styles.durationRow}>
                {[5, 10, 15, 20, 30].map((d) => (
                  <TouchableOpacity key={d} onPress={() => setMedDuration(d)} style={[styles.durationChip, medDuration === d && styles.durationChipActive]}>
                    <Text style={[styles.durationChipText, medDuration === d && { color: '#fff' }]}>{d}m</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={styles.startBtn}>
                <Text style={styles.startBtnText}>Start session</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              {MEDITATION_TYPES.map((t) => (
                <TouchableOpacity key={t.name} style={styles.guidedItem}>
                  <GlossyCircle size={38} backgroundColor="rgba(183,156,242,0.30)">
                    <MaterialCommunityIcons name="brain" size={18} color={pastel.purpleDeep} />
                  </GlossyCircle>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.guidedName}>{t.name}</Text>
                    <Text style={styles.guidedDesc}>{t.desc}</Text>
                  </View>
                  <Text style={styles.aiLabel}>AI</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

            <TouchableOpacity style={styles.modalClose} onPress={() => setMedModal(false)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Meditation Session – full screen */}
      <Modal visible={medSession} animationType="fade" statusBarTranslucent onRequestClose={endMedSession}>
        <View style={sessionStyles.container}>
          <View style={sessionStyles.topInfo}>
            <MaterialCommunityIcons name={SOUND_ICONS[medSound] || 'music'} size={24} color={SESSION_AURA_COLOR} />
            <Text style={sessionStyles.soundName}>{medSound}</Text>
            <Text style={sessionStyles.durationLabel}>{medDuration} min session</Text>
          </View>

          <View style={sessionStyles.animArea}>
            {/* Ombre gradient rings — outer → inner, each scales more at rest */}
            {AURA_RINGS.map(({ size, opacityRange, scaleRange }, i) => {
              const ringOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: opacityRange });
              const ringScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: scaleRange });
              return (
                <Animated.View
                  key={i}
                  style={[sessionStyles.auraRing, {
                    width: size, height: size, borderRadius: size / 2,
                    opacity: ringOpacity, transform: [{ scale: ringScale }],
                  }]}
                />
              );
            })}
            {/* Centre circle – timer */}
            <Animated.View style={[sessionStyles.auraCenter, {
              transform: [{ scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1.0, 1.025] }) }],
            }]}>
              <Text style={sessionStyles.timerText}>{formatTime(medTimeLeft)}</Text>
              <Text style={sessionStyles.timerLabel}>remaining</Text>
            </Animated.View>
          </View>

          <TouchableOpacity style={sessionStyles.stopBtn} onPress={endMedSession}>
            <Text style={sessionStyles.stopBtnText}>End Session</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* ── Completion screen ── */}
      <Modal visible={medComplete} animationType="fade" statusBarTranslucent onRequestClose={closeCompletion}>
        <View style={completionStyles.container}>
          {/* Soft background glow */}
          <View style={completionStyles.bgGlow} />

          {/* Lotus + sparkles */}
          <View style={completionStyles.flowerArea}>
            {SPARKLE_ANGLES.map((angle, i) => {
              const rad = (angle * Math.PI) / 180;
              const tx = sparkleAnim.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(rad) * 78] });
              const ty = sparkleAnim.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(rad) * 78] });
              const op = sparkleAnim.interpolate({ inputRange: [0, 0.25, 0.72, 1], outputRange: [0, 1, 0.65, 0] });
              const sz = i % 2 === 0 ? 9 : 6;
              return (
                <Animated.View
                  key={i}
                  style={[completionStyles.sparkle, { width: sz, height: sz, borderRadius: sz / 2, opacity: op, transform: [{ translateX: tx }, { translateY: ty }] }]}
                />
              );
            })}
            <Animated.Text style={[completionStyles.lotusEmoji, {
              opacity: riseAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
              transform: [
                { scale: riseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.15, 1] }) },
                { translateY: riseAnim.interpolate({ inputRange: [0, 1], outputRange: [90, 0] }) },
              ],
            }]}>
              🪷
            </Animated.Text>
          </View>

          {/* Thank-you message */}
          <Animated.View style={[completionStyles.textBlock, { opacity: textFadeAnim }]}>
            <Text style={completionStyles.thankLine1}>Thank you for taking</Text>
            <Text style={completionStyles.thankLine2}>time for yourself</Text>
          </Animated.View>

          {/* Subtitle + button */}
          <Animated.View style={[completionStyles.bottomBlock, { opacity: subFadeAnim }]}>
            <Text style={completionStyles.subtitle}>{medDuration} min · {medSound}</Text>
            <TouchableOpacity style={completionStyles.continueBtn} onPress={closeCompletion}>
              <Text style={completionStyles.continueBtnText}>Continue</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: 'transparent' },   // CHANGED: gradient shows through from ScreenGradientBackground
  content: { padding: theme.spacing.md, paddingBottom: 100 },
  header: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.lg },
  // CHANGED: avatar is now a GlossyCircle; only the drop-shadow wrapper lives here
  avatarBubbleShadow: {
    shadowColor: pastel.purpleDeep, shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4,
  },
  avatarBubbleText: { color: '#fff', fontWeight: '800', fontSize: 18 },
  greeting: { fontSize: theme.typography.fontSize.paragraph.sm, color: pastel.textMuted, fontWeight: '600' },   // CHANGED
  userName: { fontSize: theme.typography.fontSize.heading.md, fontWeight: '800', color: pastel.textDeep },       // CHANGED
  affirmationHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: theme.spacing.xs, opacity: 0.9 },
  affirmationLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.9)', letterSpacing: 1 },
  affirmationText: { fontSize: theme.typography.fontSize.paragraph.lg, fontWeight: '700', color: '#fff', lineHeight: 26 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.sm },
  cardTitle: { fontSize: theme.typography.fontSize.paragraph.md, fontWeight: '700', color: pastel.textDeep },     // CHANGED
  cardSubtitle: { fontSize: 10, fontWeight: '600', color: pastel.textMuted },                                     // CHANGED
  emptyText: { fontSize: theme.typography.fontSize.paragraph.sm, color: pastel.textMuted, paddingVertical: theme.spacing.sm },
  weekRow: { flexDirection: 'row', alignItems: 'flex-end', height: 70, gap: 6, marginTop: theme.spacing.xs },   // CHANGED: extra clearance under the title
  weekCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  weekBar: { width: '100%', borderRadius: 4 },
  weekDay: { fontSize: 10, fontWeight: '700', color: theme.colors.text.secondary },
  habitRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, paddingVertical: 6 },
  habitIcon: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: theme.colors.surface.brandPrimary,
    alignItems: 'center', justifyContent: 'center',
  },
  habitName: { flex: 1, fontSize: theme.typography.fontSize.paragraph.sm, fontWeight: '600', color: theme.colors.text.primary },
  habitDone: { color: theme.colors.text.secondary, textDecorationLine: 'line-through' },
  checkbox: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2,
    borderColor: theme.colors.border.three, alignItems: 'center', justifyContent: 'center',
  },
  checkboxDone: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  seeMore: { fontSize: 11, fontWeight: '700', color: theme.colors.primary, marginTop: theme.spacing.xs },
  meditationCard: {
    borderRadius: 20, padding: theme.spacing.lg, marginBottom: theme.spacing.md,
    backgroundColor: '#7c6ef0',
  },
  weekDay: { fontSize: 10, fontWeight: '700', color: pastel.textMuted },                                          // CHANGED
  // Habit rows
  habitRowWrapper: { flexDirection: 'row', alignItems: 'center' },
  habitRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, paddingVertical: 6 },
  habitName: { flex: 1, fontSize: theme.typography.fontSize.paragraph.sm, fontWeight: '600', color: pastel.textDeep },  // CHANGED
  habitDone: { color: pastel.textMuted, textDecorationLine: 'line-through' },                                          // CHANGED
  checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: 'rgba(183,156,242,0.45)', alignItems: 'center', justifyContent: 'center' },  // CHANGED
  checkboxDone: { backgroundColor: pastel.purpleDeep, borderColor: pastel.purpleDeep },                                 // CHANGED
  deleteBtn: { paddingLeft: theme.spacing.sm },
  seeMore: { fontSize: 11, fontWeight: '700', color: pastel.purpleDeep, marginTop: theme.spacing.xs },                  // CHANGED
  medRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  medTitle: { fontSize: theme.typography.fontSize.paragraph.sm, fontWeight: '700', color: pastel.textDeep },    // CHANGED
  medSub: { fontSize: 11, color: pastel.textMuted },                                                            // CHANGED
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(59,46,85,0.45)', justifyContent: 'flex-end' },                                       // CHANGED: plum-tinted scrim
  modalSheet: { backgroundColor: pastel.bgTop, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: theme.spacing.lg, maxHeight: '85%' },  // CHANGED
  modalScroll: { flexShrink: 1 },  // CHANGED: bounds the list so it scrolls within the sheet
  sheetGrabZone: { paddingTop: theme.spacing.xs, paddingBottom: theme.spacing.sm, alignItems: 'center' },  // CHANGED: easy-to-grab drag area
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(183,156,242,0.45)', alignSelf: 'center', marginBottom: theme.spacing.md },  // CHANGED
  modalTitle: { fontSize: theme.typography.fontSize.paragraph.lg, fontWeight: '800', color: pastel.textDeep, textAlign: 'center', marginBottom: theme.spacing.md },
  habitsSummary: { alignItems: 'center', backgroundColor: 'rgba(183,156,242,0.18)', borderRadius: 16, padding: theme.spacing.md, marginBottom: theme.spacing.md },  // CHANGED
  habitsSummaryNum: { fontSize: 28, fontWeight: '800', color: pastel.purpleDeep },   // CHANGED
  habitsSummaryLabel: { fontSize: 11, color: pastel.textMuted, fontWeight: '600' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: theme.spacing.md },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: theme.colors.surface.two },
  chipText: { fontSize: 12, fontWeight: '600', color: pastel.textDeep },
  customRow: { flexDirection: 'row', gap: theme.spacing.xs, marginBottom: theme.spacing.md },
  customInput: { flex: 1, borderRadius: 20, backgroundColor: theme.colors.surface.two, paddingHorizontal: theme.spacing.md, paddingVertical: 10, fontSize: theme.typography.fontSize.paragraph.sm, color: pastel.textDeep },
  addBtn: { paddingHorizontal: theme.spacing.md, borderRadius: 20, backgroundColor: pastel.purpleDeep, justifyContent: 'center' },   // CHANGED
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  modalClose: { marginTop: theme.spacing.md, backgroundColor: theme.colors.surface.two, borderRadius: 16, padding: theme.spacing.md, alignItems: 'center' },
  modalCloseText: { fontWeight: '700', color: pastel.textDeep },
  tabRow: { flexDirection: 'row', backgroundColor: theme.colors.surface.two, borderRadius: 20, padding: 4, marginBottom: theme.spacing.md },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 16, alignItems: 'center' },
  tabBtnActive: { backgroundColor: theme.colors.surface.one, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 1 },
  tabText: { fontSize: 12, fontWeight: '700', color: pastel.textMuted },
  tabTextActive: { color: pastel.textDeep },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: pastel.textDeep, marginBottom: theme.spacing.xs, marginTop: theme.spacing.xs },
  soundGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: theme.spacing.sm },
  soundChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, backgroundColor: theme.colors.surface.two },
  soundChipActive: { backgroundColor: theme.colors.primary },
  soundChipText: { fontSize: 13, fontWeight: '600', color: pastel.textDeep },
  durationRow: { flexDirection: 'row', gap: 8, marginBottom: theme.spacing.md },
  durationChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: theme.colors.surface.two },
  durationChipActive: { backgroundColor: theme.colors.primary },
  durationChipText: { fontSize: 12, fontWeight: '600', color: pastel.textDeep },
  startBtn: { backgroundColor: theme.colors.primary, borderRadius: 20, padding: theme.spacing.md, alignItems: 'center' },
  startBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  guidedItem: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, backgroundColor: theme.colors.surface.two, borderRadius: 16, padding: theme.spacing.md, marginBottom: 8 },
  guidedName: { fontSize: 14, fontWeight: '700', color: pastel.textDeep },
  guidedDesc: { fontSize: 11, color: pastel.textMuted },
  aiLabel: { fontSize: 10, fontWeight: '700', color: theme.colors.primary },
});

const sessionStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d1117', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 80, paddingHorizontal: 24 },
  topInfo: { alignItems: 'center', gap: 8 },
  soundName: { fontSize: 22, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 6, color: SESSION_AURA_COLOR },
  durationLabel: { fontSize: 13, color: 'rgba(255,255,255,0.40)', fontWeight: '600' },
  animArea: { width: 320, height: 320, alignItems: 'center', justifyContent: 'center' },
  auraRing: { position: 'absolute', backgroundColor: SESSION_AURA_COLOR },
  auraCenter: {
    position: 'absolute',
    width: 128, height: 128, borderRadius: 64,
    backgroundColor: SESSION_AURA_COLOR,
    alignItems: 'center', justifyContent: 'center', opacity: 0.88,
  },
  timerText: { fontSize: 40, fontWeight: '800', color: '#fff' },
  timerLabel: { fontSize: 11, color: 'rgba(255,255,255,0.60)', fontWeight: '600', marginTop: 4 },
  stopBtn: { paddingHorizontal: 44, paddingVertical: 16, borderRadius: 32, borderWidth: 2, borderColor: SESSION_AURA_COLOR },
  stopBtnText: { fontSize: 15, fontWeight: '700', color: SESSION_AURA_COLOR },
});

const completionStyles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#0d1117',
    alignItems: 'center', justifyContent: 'center', gap: 44, paddingHorizontal: 32,
  },
  bgGlow: {
    position: 'absolute', width: 360, height: 360, borderRadius: 180,
    backgroundColor: SESSION_AURA_COLOR, opacity: 0.07,
  },
  flowerArea: { width: 170, height: 170, alignItems: 'center', justifyContent: 'center' },
  sparkle: { position: 'absolute', backgroundColor: SESSION_AURA_COLOR },
  lotusEmoji: { fontSize: 86 },
  textBlock: { alignItems: 'center', gap: 6 },
  thankLine1: { fontSize: 26, fontWeight: '700', color: 'rgba(255,255,255,0.75)', textAlign: 'center' },
  thankLine2: { fontSize: 28, fontWeight: '800', color: SESSION_AURA_COLOR, textAlign: 'center' },
  bottomBlock: { alignItems: 'center', gap: 28 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.38)', fontWeight: '600', textAlign: 'center', letterSpacing: 0.5 },
  continueBtn: { paddingHorizontal: 52, paddingVertical: 18, borderRadius: 32, backgroundColor: SESSION_AURA_COLOR },
  continueBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
});

export default Home;