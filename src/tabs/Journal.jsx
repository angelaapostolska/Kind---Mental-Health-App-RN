import React, { useState, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, ActivityIndicator, Alert, Animated } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { theme } from '@/constants/theme';
import { MOOD_LEVELS, moodColor, moodLabel, isoDate, showSuccessToast, showErrorToast } from '@/utils';
import { useCreateJournalEntryMutation, useCreateMoodEntryMutation, useDeleteJournalEntryMutation, useGetJournalPromptsByTypeQuery, useGetJournalEntriesQuery } from '@/api/api';
import { useAppSelector } from '@/store/store';
import ThoughtRecord from '@/components/ThoughtRecord';
import ThoughtRecordDetail from '@/components/ThoughtRecordDetail';
import { parseStructured } from '@/components/thoughtRecord/parts';

// moodValue is stored as 1-5, matching the frontend mood level directly
const moodValueToLevel = (v) => v || 3;

// Parse a "YYYY-MM-DD" string without timezone shift
const formatEntryDate = (dateStr) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const JournalEntryCard = ({ entry, onPress, onRequestDelete }) => {
  const swipeRef = useRef(null);

  const renderRightActions = (_, dragX) => {
    const scale = dragX.interpolate({ inputRange: [-80, 0], outputRange: [1, 0.6], extrapolate: 'clamp' });
    return (
      <TouchableOpacity
        style={styles.swipeDeleteAction}
        activeOpacity={0.8}
        onPress={() => { swipeRef.current?.close(); onRequestDelete(entry); }}
      >
        <Animated.View style={{ transform: [{ scale }], alignItems: 'center' }}>
          <MaterialIcons name="delete-outline" size={22} color="#fff" />
          <Text style={styles.swipeDeleteText}>Delete</Text>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  return (
    <Swipeable ref={swipeRef} renderRightActions={renderRightActions} overshootRight={false}>
      <TouchableOpacity style={styles.entryCard} onPress={onPress} activeOpacity={0.75}>
        <View style={styles.entryHeader}>
          <Text style={styles.entryDate}>{formatEntryDate(entry.createdAt)}</Text>
          {entry.moodEntry && <View style={[styles.entryMoodDot, { backgroundColor: moodColor(moodValueToLevel(entry.moodEntry.moodValue)) }]} />}
        </View>
        {entry.journalPrompt?.promptText && <Text style={styles.entryPrompt}>"{entry.journalPrompt.promptText}"</Text>}
        <Text style={styles.entryText} numberOfLines={3}>{entry.content}</Text>
      </TouchableOpacity>
    </Swipeable>
  );
};

const Journal = () => {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [mood, setMood] = useState(null);
  const [activePrompt, setActivePrompt] = useState(undefined);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [trOpen, setTrOpen] = useState(false);
  const [trDetailEntry, setTrDetailEntry] = useState(null);

  const userId = useAppSelector((state) => state.userState.userId);
  const [createJournalEntry] = useCreateJournalEntryMutation();
  const [createMoodEntry] = useCreateMoodEntryMutation();
  const [deleteJournalEntry] = useDeleteJournalEntryMutation();
  const { data: journalEntries = [], isLoading: entriesLoading, isError: entriesError } = useGetJournalEntriesQuery(
    userId,
    { skip: !userId, refetchOnMountOrArgChange: true },
  );

  // Load GENERAL prompts from backend so we have real IDs to send
  const { data: backendPrompts = [] } = useGetJournalPromptsByTypeQuery('GENERAL');

  // The CBT thought record is an ANT_EXERCISE prompt; grab its id to link entries.
  // If the backend has none seeded yet, the record still saves as a blank entry.
  const { data: antPrompts = [] } = useGetJournalPromptsByTypeQuery('ANT_EXERCISE');
  const antPromptId = antPrompts[0]?.id ?? null;

  // Pick 3 random prompts once when the data loads (stable until next load)
  const todaysPrompts = useMemo(
    () => [...backendPrompts].sort(() => 0.5 - Math.random()).slice(0, 3),
    [backendPrompts.length],
  );

  const startWith = (p) => {
    setActivePrompt(p);
    setText('');
    setMood(null);
    setOpen(true);
  };

  const confirmDelete = (entry) => {
    Alert.alert('Delete entry', 'This entry will be permanently deleted.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await deleteJournalEntry(entry.id).unwrap();
            if (selectedEntry?.id === entry.id) setSelectedEntry(null);
            showSuccessToast('Entry deleted', 'Your journal entry has been removed.');
          } catch {
            showErrorToast('Could not delete entry. Please try again.');
          }
        },
      },
    ]);
  };

  const save = async () => {
    if (!text.trim() || !userId) return;
    try {
      const today = isoDate(new Date());

      let moodEntryId = null;
      if (mood !== null) {
        const moodResult = await createMoodEntry({
          date: today,
          moodValue: mood,
          note: '',
          user: { id: userId },
          selectedEmotions: [],
          selectedFactors: [],
        }).unwrap();
        moodEntryId = moodResult.id;
      }

      const isPromptBased = !!activePrompt;
      await createJournalEntry({
        createdAt: today,
        content: text,
        title: isPromptBased ? activePrompt.promptText : 'Free write',
        type: isPromptBased ? 'PROMPT_BASED' : 'BLANK',
        user: { id: userId },
        ...(moodEntryId !== null && { moodEntry: { id: moodEntryId } }),
        ...(isPromptBased && { journalPrompt: { id: activePrompt.id } }),
      }).unwrap();

      showSuccessToast('Entry saved', 'Your journal entry has been saved.');
    } catch (e) {
      showErrorToast('Could not save your entry. Please try again.');
      return;
    }
    setOpen(false);
    setText('');
    setMood(null);
    setActivePrompt(undefined);
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>Journal</Text>

      {/* Today's Prompts */}
      <View style={styles.sectionHeader}>
        <MaterialCommunityIcons name="star-four-points" size={14} color={theme.colors.primary} />
        <Text style={styles.sectionTitle}>Today's Prompts</Text>
      </View>

      {todaysPrompts.map((p) => (
        <TouchableOpacity key={p.id} style={styles.promptCard} onPress={() => startWith(p)} activeOpacity={0.8}>
          <MaterialCommunityIcons name="lightbulb-on-outline" size={14} color={theme.colors.primary} style={{ marginTop: 2 }} />
          <Text style={styles.promptText}>{p.promptText}</Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity style={styles.freewriteBtn} onPress={() => startWith(undefined)} activeOpacity={0.85}>
        <MaterialIcons name="add" size={16} color="#fff" />
        <Text style={styles.freewriteText}>Write freely</Text>
      </TouchableOpacity>

      {/* CBT Thought Record — guided 7-step exercise */}
      <TouchableOpacity style={styles.cbtCard} onPress={() => setTrOpen(true)} activeOpacity={0.85}>
        <View style={styles.cbtIcon}>
          <MaterialCommunityIcons name="head-cog-outline" size={20} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cbtTitle}>Thought Record</Text>
          <Text style={styles.cbtSubtitle}>Reframe an unhelpful thought in 7 guided steps</Text>
        </View>
        <MaterialIcons name="chevron-right" size={22} color={theme.colors.primary} />
      </TouchableOpacity>

      {/* Past Entries */}
      <Text style={styles.entriesTitle}>Past Entries</Text>
      {entriesLoading && <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 16 }} />}
      {entriesError && <Text style={styles.emptyText}>Could not load entries. Please try again.</Text>}
      {!entriesLoading && !entriesError && journalEntries.length === 0 && (
        <Text style={styles.emptyText}>No entries yet. Start writing above!</Text>
      )}
      {journalEntries.map((e) => (
        <JournalEntryCard
          key={e.id}
          entry={e}
          onPress={() => (parseStructured(e) ? setTrDetailEntry(e) : setSelectedEntry(e))}
          onRequestDelete={confirmDelete}
        />
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
                <Text style={styles.promptBannerText}>{activePrompt.promptText}</Text>
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

            <Text style={styles.moodPickerLabel}>Mood <Text style={styles.moodPickerOptional}>(optional)</Text></Text>
            <View style={styles.moodPickerRow}>
              {MOOD_LEVELS.map((m) => (
                <TouchableOpacity key={m.level} onPress={() => setMood(mood === m.level ? null : m.level)} style={styles.moodPickerBtn}>
                  <View style={[styles.moodPickerCircle, { backgroundColor: m.color, opacity: mood !== null && mood !== m.level ? 0.35 : 1 }, mood === m.level && styles.moodPickerActive]}>
                    <Text style={{ fontSize: 18 }}>{m.emoji}</Text>
                  </View>
                  <Text style={styles.moodPickerLabel2}>{m.label}</Text>
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

      {/* Detail Modal */}
      <Modal visible={!!selectedEntry} animationType="slide" transparent onRequestClose={() => setSelectedEntry(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.detailSheet}>
            <View style={styles.modalHandle} />

            <View style={styles.detailHeader}>
              <Text style={styles.detailDate}>{formatEntryDate(selectedEntry?.createdAt)}</Text>
              <TouchableOpacity onPress={() => setSelectedEntry(null)} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <MaterialIcons name="close" size={20} color={theme.colors.text.secondary} />
              </TouchableOpacity>
            </View>

            {selectedEntry?.moodEntry && (() => {
              const lvl = moodValueToLevel(selectedEntry.moodEntry.moodValue);
              const meta = MOOD_LEVELS.find((m) => m.level === lvl);
              return (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>You felt</Text>
                  <View style={[styles.moodBadge, { backgroundColor: meta.color + '28' }]}>
                    <Text style={{ fontSize: 15 }}>{meta.emoji}</Text>
                    <Text style={[styles.moodBadgeText, { color: meta.color }]}>{meta.label}</Text>
                  </View>
                </View>
              );
            })()}

            {selectedEntry?.journalPrompt?.promptText && (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>You answered this</Text>
                <Text style={styles.detailPromptValue}>{selectedEntry.journalPrompt.promptText}</Text>
              </View>
            )}

            <Text style={styles.detailLabel}>You wrote</Text>
            <ScrollView style={styles.detailScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.detailContent}>{selectedEntry?.content}</Text>
            </ScrollView>

            <TouchableOpacity style={styles.deleteBtn} onPress={() => confirmDelete(selectedEntry)} activeOpacity={0.8}>
              <MaterialIcons name="delete-outline" size={18} color="#ef4444" />
              <Text style={styles.deleteBtnText}>Delete entry</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* CBT Thought Record modal */}
      <ThoughtRecord
        visible={trOpen}
        onClose={() => setTrOpen(false)}
        userId={userId}
        antPromptId={antPromptId}
      />

      {/* CBT Thought Record detail (swipeable, per-page editable) */}
      <ThoughtRecordDetail
        visible={!!trDetailEntry}
        entry={trDetailEntry}
        onClose={() => setTrDetailEntry(null)}
      />
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
  cbtCard: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface.brandPrimary, borderRadius: 16, padding: theme.spacing.md,
    marginBottom: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.primary + '33',
  },
  cbtIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  cbtTitle: { fontSize: theme.typography.fontSize.paragraph.md, fontWeight: '800', color: theme.colors.text.primary },
  cbtSubtitle: { fontSize: 12, color: theme.colors.text.secondary, marginTop: 2 },
  entriesTitle: { fontSize: theme.typography.fontSize.paragraph.md, fontWeight: '700', color: theme.colors.text.primary, marginBottom: theme.spacing.sm },
  emptyText: { fontSize: theme.typography.fontSize.paragraph.sm, color: theme.colors.text.secondary, textAlign: 'center', marginTop: theme.spacing.md },
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
  moodPickerOptional: { fontWeight: '400', color: theme.colors.text.secondary },
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
  // Detail modal
  detailSheet: {
    backgroundColor: theme.colors.surface.one, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: theme.spacing.lg, height: '90%',
  },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md },
  detailDate: { fontSize: 11, fontWeight: '700', color: theme.colors.text.secondary, textTransform: 'uppercase', letterSpacing: 0.6 },
  closeBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: theme.colors.surface.two, alignItems: 'center', justifyContent: 'center' },
  moodBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, marginBottom: theme.spacing.sm },
  moodBadgeText: { fontSize: 13, fontWeight: '700' },
  detailSection: { marginBottom: theme.spacing.md },
  detailLabel: { fontSize: 10, fontWeight: '700', color: theme.colors.text.secondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  detailPromptValue: { fontSize: theme.typography.fontSize.paragraph.sm, color: theme.colors.text.primary, fontStyle: 'italic', lineHeight: 20 },
  detailScroll: { flex: 1, marginTop: 6 },
  detailContent: { fontSize: theme.typography.fontSize.paragraph.sm, color: theme.colors.text.primary, lineHeight: 24 },
  swipeDeleteAction: {
    backgroundColor: '#e5484d', justifyContent: 'center', alignItems: 'center',
    width: 80, borderRadius: 16, marginBottom: 10,
  },
  swipeDeleteText: { color: '#fff', fontSize: 11, fontWeight: '700', marginTop: 2 },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: theme.spacing.md, paddingVertical: 14, borderRadius: 16,
    backgroundColor: '#fee2e2',
  },
  deleteBtnText: { fontSize: 13, fontWeight: '700', color: '#ef4444' },
});

export default Journal;