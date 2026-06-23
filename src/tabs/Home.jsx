import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, Dimensions, ActivityIndicator, Animated, Easing,
} from 'react-native';
import { Audio } from 'expo-av';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { theme } from '@/constants/theme';
import { MOOD_LEVELS, moodColor, moodLabel, AFFIRMATIONS, getGreeting, getCurrentWeek, isoDate, showSuccessToast, showErrorToast } from '@/utils';
import { useAppSelector } from '@/store/store';
import {
  useCreateMoodEntryMutation,
  useGetMoodEntriesQuery,
  useGetHabitsQuery,
  useCreateHabitMutation,
  useGetHabitTodayQuery,
  useToggleHabitTodayMutation,
} from '@/api/api';

const { width } = Dimensions.get('window');

// Map a habit's iconIdentifier (or name) to a MaterialCommunityIcons glyph
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
  { name: 'Meditate', iconIdentifier: 'meditation', colorHex: '#8B5CF6' },
  { name: 'Drink Water', iconIdentifier: 'water', colorHex: '#3B82F6' },
  { name: 'Exercise', iconIdentifier: 'exercise', colorHex: '#10B981' },
  { name: 'Read', iconIdentifier: 'book', colorHex: '#F59E0B' },
  { name: 'Stretch', iconIdentifier: 'stretch', colorHex: '#EC4899' },
  { name: 'Walk', iconIdentifier: 'walk', colorHex: '#10B981' },
  { name: 'Sleep early', iconIdentifier: 'moon', colorHex: '#6366F1' },
  { name: 'Gratitude', iconIdentifier: 'heart', colorHex: '#F59E0B' },
];

const habitIconName = (habit) =>
  ICON_BY_IDENTIFIER[habit.iconIdentifier] || ICON_BY_IDENTIFIER[(habit.name || '').toLowerCase()] || 'checkbox-marked-circle';

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
  { name: 'Body Scan', desc: 'Release tension head to toe' },
  { name: 'Loving Kindness', desc: 'Cultivate compassion' },
  { name: 'Focus', desc: 'Train sustained attention' },
  { name: 'Sleep', desc: 'Drift off peacefully' },
];

const MoodSlider = ({ value = 3, onChange, saving }) => {
  const [v, setV] = useState(value);

  return (
    <View style={moodStyles.container}>
      <View style={moodStyles.header}>
        <Text style={moodStyles.label}>How are you feeling?</Text>
        <View style={[moodStyles.badge, { backgroundColor: moodColor(v) }]}>
          <Text style={moodStyles.badgeText}>{moodLabel(v)}</Text>
        </View>
      </View>
      <View style={moodStyles.row}>
        {MOOD_LEVELS.map((m) => (
          <TouchableOpacity key={m.level} disabled={saving} onPress={() => { setV(m.level); onChange?.(m.level); }} style={moodStyles.emojiBtn}>
            <Text style={[moodStyles.emoji, v === m.level && moodStyles.emojiActive]}>{m.emoji}</Text>
            <Text style={[moodStyles.emojiLabel, v === m.level && { color: moodColor(m.level) }]}>{m.label.split(' ').pop()}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

// Invisible subscriber that keeps the parent's completion map in sync (one per habit)
const HabitStatus = ({ habit, onStatus }) => {
  const { data } = useGetHabitTodayQuery(habit.id);
  const done = !!data?.completed;
  useEffect(() => {
    onStatus(habit.id, done);
  }, [habit.id, done, onStatus]);
  return null;
};

// A visible, tappable habit row backed by the DB
const HabitRow = ({ habit }) => {
  const { data } = useGetHabitTodayQuery(habit.id);
  const [toggleHabitToday, { isLoading }] = useToggleHabitTodayMutation();
  const done = !!data?.completed;

  const onPress = async () => {
    try {
      await toggleHabitToday({ habitId: habit.id, completed: !done }).unwrap();
    } catch (err) {
      showErrorToast('Could not update habit. Please try again.');
    }
  };

  return (
    <TouchableOpacity onPress={onPress} disabled={isLoading} style={styles.habitRow} activeOpacity={0.7}>
      <View style={[styles.habitIcon, { backgroundColor: theme.colors.surface.brandPrimary }]}>
        <MaterialCommunityIcons name={habitIconName(habit)} size={16} color={habit.colorHex || theme.colors.primary} />
      </View>
      <Text style={[styles.habitName, done && styles.habitDone]}>{habit.name}</Text>
      {isLoading ? (
        <ActivityIndicator size="small" color={theme.colors.primary} />
      ) : (
        <View style={[styles.checkbox, done && styles.checkboxDone]}>
          {done && <MaterialIcons name="check" size={12} color="#fff" />}
        </View>
      )}
    </TouchableOpacity>
  );
};

const moodStyles = StyleSheet.create({
  container: { gap: theme.spacing.sm },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: theme.typography.fontSize.paragraph.md, fontWeight: '700', color: theme.colors.text.primary },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  emojiBtn: { alignItems: 'center', gap: 4 },
  emoji: { fontSize: 30, opacity: 0.6 },
  emojiActive: { opacity: 1, transform: [{ scale: 1.2 }] },
  emojiLabel: { fontSize: 9, fontWeight: '600', color: theme.colors.text.secondary },
});

const Home = () => {
  const appState = useAppSelector((s) => s.appState);
  const userName = appState?.userName || 'Friend';

  const userId = useAppSelector((state) => state.userState.userId);
  const [createMoodEntry, { isLoading: savingMood }] = useCreateMoodEntryMutation();

  // Real mood entries for this user (used by the Week in Review chart)
  const { data: moodEntries = [] } = useGetMoodEntriesQuery(userId, { skip: !userId });
  const moodsByDate = {};
  moodEntries.forEach((e) => {
    moodsByDate[e.date] = e.moodValue;
  });

  // Real habits for this user
  const { data: habits = [], isLoading: habitsLoading } = useGetHabitsQuery(userId, { skip: !userId });
  const [createHabit] = useCreateHabitMutation();

  // Completion map maintained by the per-habit HabitStatus subscribers
  const [completedMap, setCompletedMap] = useState({});
  const handleStatus = useCallback((habitId, done) => {
    setCompletedMap((prev) => (prev[habitId] === done ? prev : { ...prev, [habitId]: done }));
  }, []);
  const completedToday = habits.reduce((n, h) => n + (completedMap[h.id] ? 1 : 0), 0);

  const handleMoodSelect = async (level) => {
    if (!userId) {
      showErrorToast('Please log in again to save your mood');
      return;
    }
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
    } catch (err) {
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
    } catch (err) {
      showErrorToast('Could not add habit. Please try again.');
    }
  };

  const [affirmation] = useState(AFFIRMATIONS[Math.floor(Math.random() * AFFIRMATIONS.length)]);
  const [habitModal, setHabitModal] = useState(false);
  const [medModal, setMedModal] = useState(false);
  const [medMode, setMedMode] = useState('sound');
  const [medSound, setMedSound] = useState('Rain');
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
  const todayStr = isoDate(new Date());

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Hidden per-habit status subscribers (keep the completed count accurate) */}
      {habits.map((h) => (
        <HabitStatus key={`status-${h.id}`} habit={h} onStatus={handleStatus} />
      ))}

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.userName}>Hi, {userName} 👋</Text>
        </View>
      </View>

      {/* Affirmation Card */}
      <View style={styles.affirmationCard}>
        <View style={styles.affirmationHeader}>
          <MaterialCommunityIcons name="star-four-points" size={14} color="rgba(255,255,255,0.9)" />
          <Text style={styles.affirmationLabel}>DAILY AFFIRMATION</Text>
        </View>
        <Text style={styles.affirmationText}>{affirmation}</Text>
      </View>

      {/* Mood Slider */}
      <View style={styles.card}>
        <MoodSlider onChange={handleMoodSelect} saving={savingMood} />
      </View>

      {/* Week in Review */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Week in Review</Text>
          <Text style={styles.cardSubtitle}>This week</Text>
        </View>
        <View style={styles.weekRow}>
          {currentWeek.map(({ date, dayLabel }, i) => {
            const ds = isoDate(date);
            const moodLvl = moodsByDate[ds] || null;
            const isToday = ds === todayStr;
            return (
              <View key={i} style={styles.weekCol}>
                <View style={[styles.weekBar, { backgroundColor: moodLvl ? moodColor(moodLvl) : theme.colors.surface.three, opacity: moodLvl ? 0.9 : 0.3, height: moodLvl ? 20 + moodLvl * 10 : 8 }]} />
                <Text style={[styles.weekDay, isToday && { color: theme.colors.primary }]}>{dayLabel}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Habits Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Today's Habits</Text>
          <Text style={[styles.cardSubtitle, { color: theme.colors.primary }]}>{completedToday}/{habits.length}</Text>
        </View>

        {habitsLoading ? (
          <ActivityIndicator color={theme.colors.primary} style={{ marginVertical: theme.spacing.md }} />
        ) : habits.length === 0 ? (
          <Text style={styles.emptyText}>No habits yet. Tap below to add some.</Text>
        ) : (
          habits.slice(0, 3).map((h) => <HabitRow key={h.id} habit={h} />)
        )}

        <TouchableOpacity onPress={() => setHabitModal(true)} activeOpacity={0.7}>
          <Text style={styles.seeMore}>Tap to manage habits →</Text>
        </TouchableOpacity>
      </View>

      {/* Meditation Card */}
      <TouchableOpacity style={styles.meditationCard} onPress={() => setMedModal(true)} activeOpacity={0.8}>
        <View style={styles.medRow}>
          <View style={styles.medIcon}>
            <MaterialCommunityIcons name="brain" size={18} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.medTitle}>Today's Meditation</Text>
            <Text style={styles.medSub}>5 min · Choose your style</Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color="rgba(255,255,255,0.8)" />
        </View>
      </TouchableOpacity>

      {/* Habits Modal */}
      <Modal visible={habitModal} animationType="slide" transparent onRequestClose={() => setHabitModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Habits</Text>

            <View style={styles.habitsSummary}>
              <Text style={styles.habitsSummaryNum}>{completedToday}/{habits.length}</Text>
              <Text style={styles.habitsSummaryLabel}>completed today</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {habits.map((h) => <HabitRow key={h.id} habit={h} />)}

              <Text style={[styles.cardTitle, { marginTop: theme.spacing.md, marginBottom: theme.spacing.xs }]}>Suggested</Text>
              <View style={styles.chipsRow}>
                {SUGGESTED_HABITS.filter((g) => !habits.some((h) => h.name.toLowerCase() === g.name.toLowerCase())).map((g) => (
                  <TouchableOpacity key={g.name} onPress={() => addHabit(g)} style={styles.chip}>
                    <MaterialIcons name="add" size={12} color={theme.colors.text.primary} />
                    <Text style={styles.chipText}>{g.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.customRow}>
                <TextInput
                  value={customHabit}
                  onChangeText={setCustomHabit}
                  placeholder="Add custom habit"
                  placeholderTextColor={theme.colors.text.secondary}
                  style={styles.customInput}
                />
                <TouchableOpacity onPress={() => addHabit(customHabit)} style={styles.addBtn}>
                  <Text style={styles.addBtnText}>Add</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.modalClose} onPress={() => setHabitModal(false)}>
              <Text style={styles.modalCloseText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
            ) : (
              <View>
                {MEDITATION_TYPES.map((t) => (
                  <TouchableOpacity key={t.name} style={styles.guidedItem}>
                    <View style={styles.habitIcon}>
                      <MaterialCommunityIcons name="brain" size={18} color={theme.colors.primary} />
                    </View>
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
  scroll: { flex: 1, backgroundColor: theme.colors.surface.two },
  content: { padding: theme.spacing.md, paddingBottom: 100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md },
  greeting: { fontSize: theme.typography.fontSize.paragraph.sm, color: theme.colors.text.secondary, fontWeight: '500' },
  userName: { fontSize: theme.typography.fontSize.heading.md, fontWeight: '800', color: theme.colors.text.primary },
  affirmationCard: {
    borderRadius: 20, padding: theme.spacing.lg, marginBottom: theme.spacing.md,
    background: undefined,
    backgroundColor: '#6C5CE7',
  },
  affirmationHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: theme.spacing.xs, opacity: 0.9 },
  affirmationLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.9)', letterSpacing: 1 },
  affirmationText: { fontSize: theme.typography.fontSize.paragraph.lg, fontWeight: '700', color: '#fff', lineHeight: 26 },
  card: {
    backgroundColor: theme.colors.surface.one,
    borderRadius: 20, padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.sm },
  cardTitle: { fontSize: theme.typography.fontSize.paragraph.md, fontWeight: '700', color: theme.colors.text.primary },
  cardSubtitle: { fontSize: 10, fontWeight: '600', color: theme.colors.text.secondary },
  emptyText: { fontSize: theme.typography.fontSize.paragraph.sm, color: theme.colors.text.secondary, paddingVertical: theme.spacing.sm },
  weekRow: { flexDirection: 'row', alignItems: 'flex-end', height: 70, gap: 6 },
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
  medRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  medIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center',
  },
  medTitle: { fontSize: theme.typography.fontSize.paragraph.sm, fontWeight: '700', color: '#fff' },
  medSub: { fontSize: 11, color: 'rgba(255,255,255,0.9)' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: theme.colors.surface.one, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: theme.spacing.lg, maxHeight: '85%',
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: theme.colors.surface.three, alignSelf: 'center', marginBottom: theme.spacing.md },
  modalTitle: { fontSize: theme.typography.fontSize.paragraph.lg, fontWeight: '800', color: theme.colors.text.primary, textAlign: 'center', marginBottom: theme.spacing.md },
  habitsSummary: { alignItems: 'center', backgroundColor: theme.colors.surface.brandPrimary, borderRadius: 16, padding: theme.spacing.md, marginBottom: theme.spacing.md },
  habitsSummaryNum: { fontSize: 28, fontWeight: '800', color: theme.colors.primary },
  habitsSummaryLabel: { fontSize: 11, color: theme.colors.text.secondary, fontWeight: '600' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: theme.spacing.md },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    backgroundColor: theme.colors.surface.two,
  },
  chipText: { fontSize: 12, fontWeight: '600', color: theme.colors.text.primary },
  customRow: { flexDirection: 'row', gap: theme.spacing.xs, marginBottom: theme.spacing.md },
  customInput: {
    flex: 1, borderRadius: 20, backgroundColor: theme.colors.surface.two,
    paddingHorizontal: theme.spacing.md, paddingVertical: 10,
    fontSize: theme.typography.fontSize.paragraph.sm, color: theme.colors.text.primary,
  },
  addBtn: { paddingHorizontal: theme.spacing.md, borderRadius: 20, backgroundColor: theme.colors.primary, justifyContent: 'center' },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  modalClose: {
    marginTop: theme.spacing.md, backgroundColor: theme.colors.surface.two,
    borderRadius: 16, padding: theme.spacing.md, alignItems: 'center',
  },
  modalCloseText: { fontWeight: '700', color: theme.colors.text.primary },
  tabRow: { flexDirection: 'row', backgroundColor: theme.colors.surface.two, borderRadius: 20, padding: 4, marginBottom: theme.spacing.md },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 16, alignItems: 'center' },
  tabBtnActive: { backgroundColor: theme.colors.surface.one, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 1 },
  tabText: { fontSize: 12, fontWeight: '700', color: theme.colors.text.secondary },
  tabTextActive: { color: theme.colors.text.primary },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: theme.colors.text.primary, marginBottom: theme.spacing.xs, marginTop: theme.spacing.xs },
  soundGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: theme.spacing.sm },
  soundChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16,
    backgroundColor: theme.colors.surface.two,
  },
  soundChipActive: { backgroundColor: theme.colors.primary },
  soundChipText: { fontSize: 13, fontWeight: '600', color: theme.colors.text.primary },
  durationRow: { flexDirection: 'row', gap: 8, marginBottom: theme.spacing.md },
  durationChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16,
    backgroundColor: theme.colors.surface.two,
  },
  durationChipActive: { backgroundColor: theme.colors.primary },
  durationChipText: { fontSize: 12, fontWeight: '600', color: theme.colors.text.primary },
  startBtn: { backgroundColor: theme.colors.primary, borderRadius: 20, padding: theme.spacing.md, alignItems: 'center' },
  startBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  guidedItem: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface.two, borderRadius: 16, padding: theme.spacing.md, marginBottom: 8,
  },
  guidedName: { fontSize: 14, fontWeight: '700', color: theme.colors.text.primary },
  guidedDesc: { fontSize: 11, color: theme.colors.text.secondary },
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