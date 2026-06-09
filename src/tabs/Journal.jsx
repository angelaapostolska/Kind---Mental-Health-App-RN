import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { theme } from '@/constants/theme';
import { MOOD_LEVELS, moodColor, moodLabel } from '@/utils';

const ALL_PROMPTS = [
  'What made you smile today?',
  'What are you grateful for right now?',
  'Describe a challenge you overcame recently.',
  'What would you tell your younger self?',
  "What's one thing you'd like to improve this week?",
  'When did you feel most at peace today?',
];

const Journal = () => {
  const [entries, setEntries] = useState([
    { id: 1, date: 'May 6, 2026', text: 'Had a great meditation session today. Feeling centered and grateful for the little things.', mood: 1, prompt: 'What are you grateful for right now?' },
    { id: 2, date: 'May 5, 2026', text: 'Work was stressful but a walk in the park helped me decompress.', mood: 3 },
  ]);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [mood, setMood] = useState(3);
  const [activePrompt, setActivePrompt] = useState(undefined);
  const [todaysPrompts] = useState(() => [...ALL_PROMPTS].sort(() => 0.5 - Math.random()).slice(0, 3));

  const startWith = (p) => { setActivePrompt(p); setText(''); setMood(3); setOpen(true); };

  const save = () => {
    if (!text.trim()) return;
    setEntries([{
      id: Date.now(),
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      text, mood, prompt: activePrompt,
    }, ...entries]);
    setOpen(false); setText(''); setActivePrompt(undefined);
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>Journal</Text>

      {/* Today's Prompts */}
      <View style={styles.sectionHeader}>
        <MaterialCommunityIcons name="star-four-points" size={14} color={theme.colors.primary} />
        <Text style={styles.sectionTitle}>Today's Prompts</Text>
      </View>

      {todaysPrompts.map((p, i) => (
        <TouchableOpacity key={i} style={styles.promptCard} onPress={() => startWith(p)} activeOpacity={0.8}>
          <MaterialCommunityIcons name="lightbulb-on-outline" size={14} color={theme.colors.primary} style={{ marginTop: 2 }} />
          <Text style={styles.promptText}>{p}</Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity style={styles.freewriteBtn} onPress={() => startWith(undefined)} activeOpacity={0.85}>
        <MaterialIcons name="add" size={16} color="#fff" />
        <Text style={styles.freewriteText}>Write freely</Text>
      </TouchableOpacity>

      {/* Past Entries */}
      <Text style={styles.entriesTitle}>Past Entries</Text>
      {entries.map((e) => (
        <View key={e.id} style={styles.entryCard}>
          <View style={styles.entryHeader}>
            <Text style={styles.entryDate}>{e.date}</Text>
            <View style={[styles.entryMoodDot, { backgroundColor: moodColor(e.mood) }]} />
          </View>
          {e.prompt && <Text style={styles.entryPrompt}>"{e.prompt}"</Text>}
          <Text style={styles.entryText} numberOfLines={3}>{e.text}</Text>
        </View>
      ))}

      {/* Composer Modal */}
      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>New Entry</Text>

            {activePrompt && (
              <View style={styles.promptBanner}>
                <MaterialCommunityIcons name="lightbulb-on-outline" size={14} color={theme.colors.primary} style={{ marginTop: 2 }} />
                <Text style={styles.promptBannerText}>{activePrompt}</Text>
              </View>
            )}

            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={activePrompt ? 'Reflect...' : "What's on your mind?"}
              placeholderTextColor={theme.colors.text.secondary}
              style={styles.textArea}
              multiline
              textAlignVertical="top"
            />

            <Text style={styles.moodPickerLabel}>Mood</Text>
            <View style={styles.moodPickerRow}>
              {MOOD_LEVELS.map((m) => (
                <TouchableOpacity key={m.level} onPress={() => setMood(m.level)} style={styles.moodPickerBtn}>
                  <View style={[styles.moodPickerCircle, { backgroundColor: m.color }, mood === m.level && styles.moodPickerActive]}>
                    <Text style={{ fontSize: 18 }}>{m.emoji}</Text>
                  </View>
                  <Text style={styles.moodPickerLabel2}>{m.label.split(' ').pop()}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity onPress={() => setOpen(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={save} style={styles.saveBtn}>
                <Text style={styles.saveText}>Save entry</Text>
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
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: theme.spacing.sm },
  sectionTitle: { fontSize: theme.typography.fontSize.paragraph.md, fontWeight: '700', color: theme.colors.text.primary },
  promptCard: {
    flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'flex-start',
    backgroundColor: theme.colors.surface.one, borderRadius: 16, padding: theme.spacing.md,
    marginBottom: 8, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  promptText: { flex: 1, fontSize: theme.typography.fontSize.paragraph.sm, fontWeight: '600', color: theme.colors.text.primary, lineHeight: 20 },
  freewriteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: theme.colors.primary, borderRadius: 16, paddingVertical: 14,
    marginVertical: theme.spacing.md,
    shadowColor: theme.colors.primary, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  freewriteText: { fontSize: theme.typography.fontSize.paragraph.sm, fontWeight: '700', color: '#fff' },
  entriesTitle: { fontSize: theme.typography.fontSize.paragraph.md, fontWeight: '700', color: theme.colors.text.primary, marginBottom: theme.spacing.sm },
  entryCard: {
    backgroundColor: theme.colors.surface.one, borderRadius: 16, padding: theme.spacing.md,
    marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  entryDate: { fontSize: 10, fontWeight: '700', color: theme.colors.text.secondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  entryMoodDot: { width: 12, height: 12, borderRadius: 6 },
  entryPrompt: { fontSize: 11, color: theme.colors.primary, fontStyle: 'italic', marginBottom: 6 },
  entryText: { fontSize: theme.typography.fontSize.paragraph.sm, color: theme.colors.text.primary, lineHeight: 20 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: theme.colors.surface.one, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: theme.spacing.lg, maxHeight: '90%',
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: theme.colors.surface.three, alignSelf: 'center', marginBottom: theme.spacing.md },
  modalTitle: { fontSize: 18, fontWeight: '800', color: theme.colors.text.primary, textAlign: 'center', marginBottom: theme.spacing.md },
  promptBanner: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    backgroundColor: theme.colors.surface.brandPrimary, borderRadius: 12, padding: theme.spacing.sm, marginBottom: theme.spacing.sm,
  },
  promptBannerText: { flex: 1, fontSize: 13, fontWeight: '600', color: theme.colors.text.primary },
  textArea: {
    height: 140, backgroundColor: theme.colors.surface.two, borderRadius: 16,
    padding: theme.spacing.md, fontSize: theme.typography.fontSize.paragraph.sm,
    color: theme.colors.text.primary, marginBottom: theme.spacing.md,
  },
  moodPickerLabel: { fontSize: 12, fontWeight: '700', color: theme.colors.text.primary, marginBottom: theme.spacing.xs },
  moodPickerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.lg },
  moodPickerBtn: { alignItems: 'center', gap: 4 },
  moodPickerCircle: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  moodPickerActive: { borderWidth: 3, borderColor: 'rgba(0,0,0,0.15)', transform: [{ scale: 1.1 }] },
  moodPickerLabel2: { fontSize: 9, fontWeight: '600', color: theme.colors.text.secondary },
  actionRow: { flexDirection: 'row', gap: theme.spacing.xs },
  cancelBtn: { flex: 1, backgroundColor: theme.colors.surface.two, borderRadius: 16, padding: 14, alignItems: 'center' },
  cancelText: { fontWeight: '700', color: theme.colors.text.primary, fontSize: 13 },
  saveBtn: { flex: 2, backgroundColor: theme.colors.primary, borderRadius: 16, padding: 14, alignItems: 'center' },
  saveText: { fontWeight: '700', color: '#fff', fontSize: 13 },
});

export default Journal;
