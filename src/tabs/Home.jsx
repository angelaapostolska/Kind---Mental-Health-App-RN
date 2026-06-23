import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, Dimensions, ActivityIndicator, Alert,
  Animated, PanResponder, Pressable,          // CHANGED: for swipe-to-dismiss + backdrop
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
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

const MEDITATION_TYPES = [
  { name: 'Body Scan',       desc: 'Release tension head to toe' },
  { name: 'Loving Kindness', desc: 'Cultivate compassion' },
  { name: 'Focus',           desc: 'Train sustained attention' },
  { name: 'Sleep',           desc: 'Drift off peacefully' },
];

// ─── Mood Picker ────────────────────────────────────────────────────────────
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
          <TouchableOpacity
            key={m.level}
            disabled={saving}
            onPress={() => { setV(m.level); onChange?.(m.level); }}
            style={moodStyles.emojiBtn}
          >
            <Text style={[moodStyles.emoji, v === m.level && moodStyles.emojiActive]}>{m.emoji}</Text>
            <View style={moodStyles.emojiLabelBox}>
              <Text
                style={[moodStyles.emojiLabel, v === m.level && { color: moodColor(m.level), fontWeight: '700' }]}
                numberOfLines={2}
              >
                {m.label}
              </Text>
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
  label: { fontSize: theme.typography.fontSize.paragraph.md, fontWeight: '700', color: theme.colors.text.primary },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  emojiBtn: { alignItems: 'center', gap: 4, flex: 1 },
  emoji: { fontSize: 30, opacity: 0.6 },
  emojiActive: { opacity: 1, transform: [{ scale: 1.2 }] },
  emojiLabelBox: { height: 26, justifyContent: 'center' },
  emojiLabel: { fontSize: 9, fontWeight: '600', color: theme.colors.text.secondary, textAlign: 'center' },
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

  const greeting    = getGreeting();
  const currentWeek = getCurrentWeek();
  const todayStr    = isoDate(new Date());

  return (
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
        <View>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.userName}>Hi, {userName} 👋</Text>
        </View>
      </View>

      {/* Affirmation */}
      <View style={styles.affirmationCard}>
        <View style={styles.affirmationHeader}>
          <MaterialCommunityIcons name="star-four-points" size={14} color="rgba(255,255,255,0.9)" />
          <Text style={styles.affirmationLabel}>DAILY AFFIRMATION</Text>
        </View>
        <Text style={styles.affirmationText}>{affirmation}</Text>
      </View>

      {/* Mood */}
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
            const ds     = isoDate(date);
            const moodLvl = moodsByDate[ds] || null;
            const isToday = ds === todayStr;
            return (
              <View key={i} style={styles.weekCol}>
                <View style={[
                  styles.weekBar,
                  {
                    backgroundColor: moodLvl ? moodColor(moodLvl) : theme.colors.surface.three,
                    opacity: moodLvl ? 0.9 : 0.3,
                    height: moodLvl ? 20 + moodLvl * 10 : 8,
                  },
                ]} />
                <Text style={[styles.weekDay, isToday && { color: theme.colors.primary }]}>{dayLabel}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Habits preview */}
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

        {medMode === 'sound' ? (
          <View>
            <Text style={styles.sectionLabel}>Pick a sound</Text>
            <View style={styles.soundGrid}>
              {['Rain', 'Ocean', 'Forest', 'White noise'].map((s) => (
                <TouchableOpacity key={s} onPress={() => setMedSound(s)} style={[styles.soundChip, medSound === s && styles.soundChipActive]}>
                  <MaterialCommunityIcons name="music" size={14} color={medSound === s ? '#fff' : theme.colors.text.primary} />
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
            <TouchableOpacity style={styles.startBtn}>
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
      </SwipeDismissSheet>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.colors.surface.two },
  content: { padding: theme.spacing.md, paddingBottom: 100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md },
  greeting: { fontSize: theme.typography.fontSize.paragraph.sm, color: theme.colors.text.secondary, fontWeight: '500' },
  userName: { fontSize: theme.typography.fontSize.heading.md, fontWeight: '800', color: theme.colors.text.primary },
  affirmationCard: { borderRadius: 20, padding: theme.spacing.lg, marginBottom: theme.spacing.md, backgroundColor: '#6C5CE7' },
  affirmationHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: theme.spacing.xs, opacity: 0.9 },
  affirmationLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.9)', letterSpacing: 1 },
  affirmationText: { fontSize: theme.typography.fontSize.paragraph.lg, fontWeight: '700', color: '#fff', lineHeight: 26 },
  card: {
    backgroundColor: theme.colors.surface.one, borderRadius: 20, padding: theme.spacing.lg,
    marginBottom: theme.spacing.md, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.lg },
  cardTitle: { fontSize: theme.typography.fontSize.paragraph.md, fontWeight: '700', color: theme.colors.text.primary },
  cardSubtitle: { fontSize: 10, fontWeight: '600', color: theme.colors.text.secondary },
  emptyText: { fontSize: theme.typography.fontSize.paragraph.sm, color: theme.colors.text.secondary, paddingVertical: theme.spacing.sm },
  weekRow: { flexDirection: 'row', alignItems: 'flex-end', height: 70, gap: 6 },
  weekCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  weekBar: { width: '100%', borderRadius: 4 },
  weekDay: { fontSize: 10, fontWeight: '700', color: theme.colors.text.secondary },
  // Habit rows
  habitRowWrapper: { flexDirection: 'row', alignItems: 'center' },
  habitRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, paddingVertical: 6 },
  habitIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: theme.colors.surface.brandPrimary, alignItems: 'center', justifyContent: 'center' },
  habitName: { flex: 1, fontSize: theme.typography.fontSize.paragraph.sm, fontWeight: '600', color: theme.colors.text.primary },
  habitDone: { color: theme.colors.text.secondary, textDecorationLine: 'line-through' },
  checkbox: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: theme.colors.border.three, alignItems: 'center', justifyContent: 'center' },
  checkboxDone: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  deleteBtn: { paddingLeft: theme.spacing.sm },
  seeMore: { fontSize: 11, fontWeight: '700', color: theme.colors.primary, marginTop: theme.spacing.xs },
  meditationCard: { borderRadius: 20, padding: theme.spacing.lg, marginBottom: theme.spacing.md, backgroundColor: '#00b894' },
  medRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  medIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  medTitle: { fontSize: theme.typography.fontSize.paragraph.sm, fontWeight: '700', color: '#fff' },
  medSub: { fontSize: 11, color: 'rgba(255,255,255,0.9)' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: theme.colors.surface.one, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: theme.spacing.lg, maxHeight: '85%' },
  modalScroll: { flexShrink: 1 },  // CHANGED: bounds the list so it scrolls within the sheet
  sheetGrabZone: { paddingTop: theme.spacing.xs, paddingBottom: theme.spacing.sm, alignItems: 'center' },  // CHANGED: easy-to-grab drag area
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: theme.colors.surface.three, alignSelf: 'center', marginBottom: theme.spacing.md },
  modalTitle: { fontSize: theme.typography.fontSize.paragraph.lg, fontWeight: '800', color: theme.colors.text.primary, textAlign: 'center', marginBottom: theme.spacing.md },
  habitsSummary: { alignItems: 'center', backgroundColor: theme.colors.surface.brandPrimary, borderRadius: 16, padding: theme.spacing.md, marginBottom: theme.spacing.md },
  habitsSummaryNum: { fontSize: 28, fontWeight: '800', color: theme.colors.primary },
  habitsSummaryLabel: { fontSize: 11, color: theme.colors.text.secondary, fontWeight: '600' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: theme.spacing.md },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: theme.colors.surface.two },
  chipText: { fontSize: 12, fontWeight: '600', color: theme.colors.text.primary },
  customRow: { flexDirection: 'row', gap: theme.spacing.xs, marginBottom: theme.spacing.md },
  customInput: { flex: 1, borderRadius: 20, backgroundColor: theme.colors.surface.two, paddingHorizontal: theme.spacing.md, paddingVertical: 10, fontSize: theme.typography.fontSize.paragraph.sm, color: theme.colors.text.primary },
  addBtn: { paddingHorizontal: theme.spacing.md, borderRadius: 20, backgroundColor: theme.colors.primary, justifyContent: 'center' },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  modalClose: { marginTop: theme.spacing.md, backgroundColor: theme.colors.surface.two, borderRadius: 16, padding: theme.spacing.md, alignItems: 'center' },
  modalCloseText: { fontWeight: '700', color: theme.colors.text.primary },
  tabRow: { flexDirection: 'row', backgroundColor: theme.colors.surface.two, borderRadius: 20, padding: 4, marginBottom: theme.spacing.md },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 16, alignItems: 'center' },
  tabBtnActive: { backgroundColor: theme.colors.surface.one, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 1 },
  tabText: { fontSize: 12, fontWeight: '700', color: theme.colors.text.secondary },
  tabTextActive: { color: theme.colors.text.primary },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: theme.colors.text.primary, marginBottom: theme.spacing.xs, marginTop: theme.spacing.xs },
  soundGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: theme.spacing.sm },
  soundChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, backgroundColor: theme.colors.surface.two },
  soundChipActive: { backgroundColor: theme.colors.primary },
  soundChipText: { fontSize: 13, fontWeight: '600', color: theme.colors.text.primary },
  durationRow: { flexDirection: 'row', gap: 8, marginBottom: theme.spacing.md },
  durationChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: theme.colors.surface.two },
  durationChipActive: { backgroundColor: theme.colors.primary },
  durationChipText: { fontSize: 12, fontWeight: '600', color: theme.colors.text.primary },
  startBtn: { backgroundColor: theme.colors.primary, borderRadius: 20, padding: theme.spacing.md, alignItems: 'center' },
  startBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  guidedItem: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, backgroundColor: theme.colors.surface.two, borderRadius: 16, padding: theme.spacing.md, marginBottom: 8 },
  guidedName: { fontSize: 14, fontWeight: '700', color: theme.colors.text.primary },
  guidedDesc: { fontSize: 11, color: theme.colors.text.secondary },
  aiLabel: { fontSize: 10, fontWeight: '700', color: theme.colors.primary },
});

export default Home;