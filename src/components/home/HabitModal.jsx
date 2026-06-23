import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { theme } from '@/constants/theme';
import { pastel } from '@/components';
import SwipeDismissSheet from './SwipeDismissSheet';
import HabitRow, { SUGGESTED_HABITS } from './HabitRow';

const HabitModal = ({ visible, onClose, habits, completedToday, onAddHabit, onDeleteHabit }) => {
  const [customHabit, setCustomHabit] = useState('');

  const submitCustom = () => {
    if (!customHabit.trim()) return;
    onAddHabit(customHabit);
    setCustomHabit('');
  };

  return (
    <SwipeDismissSheet visible={visible} onClose={onClose}>
      <Text style={styles.title}>Habits</Text>

      <View style={styles.summary}>
        <Text style={styles.summaryNum}>{completedToday}/{habits.length}</Text>
        <Text style={styles.summaryLabel}>completed today</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {habits.map((h) => (
          <HabitRow key={h.id} habit={h} showDelete onDelete={onDeleteHabit} />
        ))}

        <Text style={styles.sectionTitle}>Suggested</Text>
        <View style={styles.chips}>
          {SUGGESTED_HABITS
            .filter((g) => !habits.some((h) => h.name.toLowerCase() === g.name.toLowerCase()))
            .map((g) => (
              <TouchableOpacity key={g.name} onPress={() => onAddHabit(g)} style={styles.chip}>
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
            style={styles.input}
            returnKeyType="done"
            onSubmitEditing={submitCustom}
          />
          <TouchableOpacity onPress={submitCustom} style={styles.addBtn}>
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
        <Text style={styles.doneBtnText}>Done</Text>
      </TouchableOpacity>
    </SwipeDismissSheet>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: theme.typography.fontSize.paragraph.lg,
    fontWeight: '800', color: pastel.textDeep,
    textAlign: 'center', marginBottom: theme.spacing.md,
  },
  summary: {
    alignItems: 'center', backgroundColor: 'rgba(183,156,242,0.18)',
    borderRadius: 16, padding: theme.spacing.md, marginBottom: theme.spacing.md,
  },
  summaryNum: { fontSize: 28, fontWeight: '800', color: pastel.purpleDeep },
  summaryLabel: { fontSize: 11, color: pastel.textMuted, fontWeight: '600' },
  scroll: { flexShrink: 1 },
  sectionTitle: {
    fontSize: theme.typography.fontSize.paragraph.md,
    fontWeight: '700', color: pastel.textDeep,
    marginTop: theme.spacing.md, marginBottom: theme.spacing.xs,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: theme.spacing.md },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 20, backgroundColor: theme.colors.surface.two,
  },
  chipText: { fontSize: 12, fontWeight: '600', color: pastel.textDeep },
  customRow: { flexDirection: 'row', gap: theme.spacing.xs, marginBottom: theme.spacing.md },
  input: {
    flex: 1, borderRadius: 20, backgroundColor: theme.colors.surface.two,
    paddingHorizontal: theme.spacing.md, paddingVertical: 10,
    fontSize: theme.typography.fontSize.paragraph.sm, color: pastel.textDeep,
  },
  addBtn: {
    paddingHorizontal: theme.spacing.md, borderRadius: 20,
    backgroundColor: pastel.purpleDeep, justifyContent: 'center',
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  doneBtn: {
    marginTop: theme.spacing.md, backgroundColor: theme.colors.surface.two,
    borderRadius: 16, padding: theme.spacing.md, alignItems: 'center',
  },
  doneBtnText: { fontWeight: '700', color: pastel.textDeep },
});

export default HabitModal;
