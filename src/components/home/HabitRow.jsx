import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { theme } from '@/constants/theme';
import { pastel } from '@/components';
import { SoftIcon } from '@/components/home/SoftGlass'; // CHANGED: clay icon badge
import { showErrorToast } from '@/utils';
import { useGetHabitTodayQuery, useToggleHabitTodayMutation } from '@/api/api';

export const ICON_BY_IDENTIFIER = {
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

export const SUGGESTED_HABITS = [
  { name: 'Meditate',    iconIdentifier: 'meditation', colorHex: '#8B5CF6' },
  { name: 'Drink Water', iconIdentifier: 'water',      colorHex: '#3B82F6' },
  { name: 'Exercise',    iconIdentifier: 'exercise',   colorHex: '#10B981' },
  { name: 'Read',        iconIdentifier: 'book',       colorHex: '#F59E0B' },
  { name: 'Stretch',     iconIdentifier: 'stretch',    colorHex: '#EC4899' },
  { name: 'Walk',        iconIdentifier: 'walk',       colorHex: '#10B981' },
  { name: 'Sleep early', iconIdentifier: 'moon',       colorHex: '#6366F1' },
  { name: 'Gratitude',   iconIdentifier: 'heart',      colorHex: '#F59E0B' },
];

export const habitIconName = (habit) =>
  ICON_BY_IDENTIFIER[habit.iconIdentifier] ||
  ICON_BY_IDENTIFIER[(habit.name || '').toLowerCase()] ||
  'checkbox-marked-circle';

// Invisible subscriber — keeps the completion counter in Home in sync.
export const HabitStatus = ({ habit, onStatus }) => {
  const { data } = useGetHabitTodayQuery(habit.id);
  const done = !!data?.completed;
  useEffect(() => { onStatus(habit.id, done); }, [habit.id, done, onStatus]);
  return null;
};

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
    <View style={styles.wrapper}>
      <TouchableOpacity onPress={onPress} disabled={isLoading} style={styles.row} activeOpacity={0.7}>
        {/* CHANGED: clay icon badge — gradient derived from the habit's own color,
            glossy highlight + soft colored shadow, white glyph on top */}
        <SoftIcon size={38} radius={13} baseColor={habit.colorHex || pastel.purpleDeep}>
          <MaterialCommunityIcons name={habitIconName(habit)} size={16} color="#fff" />
        </SoftIcon>
        <Text style={[styles.name, done && styles.nameDone]}>{habit.name}</Text>
        {isLoading ? (
          <ActivityIndicator size="small" color={pastel.purpleDeep} />
        ) : (
          <View style={[styles.checkbox, done && styles.checkboxDone]}>
            {done && <MaterialIcons name="check" size={12} color="#fff" />}
          </View>
        )}
      </TouchableOpacity>
      {showDelete && (
        <TouchableOpacity
          onPress={() => onDelete?.(habit)}
          style={styles.deleteBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialIcons name="delete-outline" size={18} color={theme.colors.text.error} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { flexDirection: 'row', alignItems: 'center' },
  row: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, paddingVertical: 6 },
  name: { flex: 1, fontSize: theme.typography.fontSize.paragraph.sm, fontWeight: '600', color: pastel.textDeep },
  nameDone: { color: pastel.textMuted, textDecorationLine: 'line-through' },
  checkbox: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: 'rgba(183,156,242,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxDone: { backgroundColor: pastel.purpleDeep, borderColor: pastel.purpleDeep },
  deleteBtn: { paddingLeft: theme.spacing.sm },
});

export default HabitRow;