import React, { useState, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, ActivityIndicator, Alert, Animated } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; // CHANGED: for gradient bg top padding
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { theme } from '@/constants/theme';
// CHANGED: shared pastel-glass design system (same as Home)
import { ScreenGradientBackground, GlassCard, GradientHeroCard, GradientButton, GlossyCircle, pastel } from '@/components';
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
      {/* CHANGED: glassy translucent entry tile */}
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
  const insets = useSafeAreaInsets(); // CHANGED
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
    // CHANGED: pastel gradient backdrop + transparent scroll, matching Home.
    <View style={{ flex: 1 }}>
      <ScreenGradientBackground />
      <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingTop: insets.top + theme.spacing.md }]} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>Journal</Text>

        {/* Today's Prompts */}
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="star-four-points" size={14} color={pastel.purpleDeep} />
          <Text style={styles.sectionTitle}>Today's Prompts</Text>
        </View>

        {todaysPrompts.map((p) => (
          // CHANGED: prompt is now a glass tile with a glossy lightbulb bubble
          <TouchableOpacity key={p.id} style={styles.promptCard} onPress={() => startWith(p)} activeOpacity={0.8}>
            <GlossyCircle size={30} backgroundColor="rgba(156,123,234,0.28)" style={{ borderRadius: 10 }}>
              <MaterialCommunityIcons name="lightbulb-on-outline" size={15} color={pastel.purpleDeep} />
            </GlossyCircle>
            <Text style={styles.promptText}>{p.promptText}</Text>
          </TouchableOpacity>
        ))}

        {/* CHANGED: write-freely is the shared gradient pill */}
        <GradientButton
          label="Write freely"
          icon={<MaterialIcons name="add" size={18} color="#fff" />}
          onPress={() => startWith(undefined)}
          style={{ marginVertical: theme.spacing.md }}
        />

        {/* CBT Thought Record — guided 7-step exercise.
            CHANGED: promoted to a vivid gradient hero card (its own highlight moment),
            mirroring the affirmation/meditation hero treatment on Home. */}
        <TouchableOpacity onPress={() => setTrOpen(true)} activeOpacity={0.85}>
          <GradientHeroCard colors={[pastel.heroPurple, pastel.heroPink]} glow="purple">
            <View style={styles.cbtRow}>
              <GlossyCircle size={42} backgroundColor="rgba(255,255,255,0.28)" style={{ borderRadius: 14 }}>
                <MaterialCommunityIcons name="head-cog-outline" size={22} color="#fff" />
              </GlossyCircle>
              <View style={{ flex: 1 }}>
                <Text style={styles.cbtTitle}>Thought Record</Text>
                <Text style={styles.cbtSubtitle}>Reframe an unhelpful thought in 7 guided steps</Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color="rgba(255,255,255,0.9)" />
            </View>
          </GradientHeroCard>
        </TouchableOpacity>

        {/* Past Entries */}
        <Text style={styles.entriesTitle}>Past Entries</Text>
        {entriesLoading && <ActivityIndicator color={pastel.purpleDeep} style={{ marginTop: 16 }} />}
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
                  <MaterialCommunityIcons name="lightbulb-on-outline" size={14} color={pastel.purpleDeep} style={{ marginTop: 2 }} />
                  <Text style={styles.promptBannerText}>{activePrompt.promptText}</Text>
                </View>
              )}

              <TextInput
                value={text}
                onChangeText={setText}
                placeholder={activePrompt ? 'Reflect...' : "What's on your mind?"}
                placeholderTextColor={pastel.textMuted}
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
                {/* CHANGED: gradient pill save */}
                <GradientButton label="Save entry" onPress={save} small style={{ flex: 2 }} />
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
                  <MaterialIcons name="close" size={20} color={pastel.textMuted} />
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
                <MaterialIcons name="delete-outline" size={18} color={pastel.rose} />
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
    </View>
  );
};

// CHANGED: recolored to the pastel-glass system end to end.
const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: theme.spacing.md, paddingBottom: 100 },
  pageTitle: { fontSize: theme.typography.fontSize.heading.md, fontWeight: '800', color: pastel.textDeep, marginBottom: theme.spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: theme.spacing.sm },
  sectionTitle: { fontSize: theme.typography.fontSize.paragraph.md, fontWeight: '700', color: pastel.textDeep },
  promptCard: {
    flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 16, padding: theme.spacing.md,
    marginBottom: 8, borderWidth: 1, borderColor: pastel.glassBorder,
    shadowColor: pastel.purpleDeep, shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 1,
  },
  promptText: { flex: 1, fontSize: theme.typography.fontSize.paragraph.sm, fontWeight: '600', color: pastel.textDeep, lineHeight: 20 },
  // CBT hero card
  cbtRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  cbtTitle: { fontSize: theme.typography.fontSize.paragraph.md, fontWeight: '800', color: '#fff' },
  cbtSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.92)', marginTop: 2 },
  entriesTitle: { fontSize: theme.typography.fontSize.paragraph.md, fontWeight: '700', color: pastel.textDeep, marginBottom: theme.spacing.sm, marginTop: theme.spacing.xs },
  emptyText: { fontSize: theme.typography.fontSize.paragraph.sm, color: pastel.textMuted, textAlign: 'center', marginTop: theme.spacing.md },
  entryCard: {
    backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 16, padding: theme.spacing.md,
    marginBottom: 10, borderWidth: 1, borderColor: pastel.glassBorder,
    shadowColor: pastel.purpleDeep, shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 1,
  },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  entryDate: { fontSize: 10, fontWeight: '700', color: pastel.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  entryMoodDot: { width: 12, height: 12, borderRadius: 6 },
  entryPrompt: { fontSize: 11, color: pastel.purpleDeep, fontStyle: 'italic', marginBottom: 6 },
  entryText: { fontSize: theme.typography.fontSize.paragraph.sm, color: pastel.textDeep, lineHeight: 20 },
  // Modal — light lavender frosted sheets (over a soft purple-tinted overlay)
  modalOverlay: { flex: 1, backgroundColor: 'rgba(74,46,122,0.35)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#FBF7FF', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: theme.spacing.lg, maxHeight: '90%', borderWidth: 1, borderColor: pastel.glassBorder,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(156,123,234,0.35)', alignSelf: 'center', marginBottom: theme.spacing.md },
  modalTitle: { fontSize: 18, fontWeight: '800', color: pastel.textDeep, textAlign: 'center', marginBottom: theme.spacing.md },
  promptBanner: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    backgroundColor: 'rgba(156,123,234,0.14)', borderRadius: 12, padding: theme.spacing.sm, marginBottom: theme.spacing.sm,
  },
  promptBannerText: { flex: 1, fontSize: 13, fontWeight: '600', color: pastel.textDeep },
  textArea: {
    height: 140, backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 16,
    borderWidth: 1, borderColor: pastel.glassBorder,
    padding: theme.spacing.md, fontSize: theme.typography.fontSize.paragraph.sm,
    color: pastel.textDeep, marginBottom: theme.spacing.md,
  },
  moodPickerLabel: { fontSize: 12, fontWeight: '700', color: pastel.textDeep, marginBottom: theme.spacing.xs },
  moodPickerOptional: { fontWeight: '400', color: pastel.textMuted },
  moodPickerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.lg },
  moodPickerBtn: { alignItems: 'center', gap: 4 },
  moodPickerCircle: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  moodPickerActive: { borderWidth: 3, borderColor: 'rgba(255,255,255,0.9)', transform: [{ scale: 1.1 }] },
  moodPickerLabel2: { fontSize: 9, fontWeight: '600', color: pastel.textMuted },
  actionRow: { flexDirection: 'row', gap: theme.spacing.xs, alignItems: 'center' },
  cancelBtn: { flex: 1, backgroundColor: 'rgba(255,255,255,0.7)', borderWidth: 1, borderColor: pastel.glassBorder, borderRadius: 999, padding: 13, alignItems: 'center' },
  cancelText: { fontWeight: '700', color: pastel.textDeep, fontSize: 13 },
  // Detail modal
  detailSheet: {
    backgroundColor: '#FBF7FF', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: theme.spacing.lg, height: '90%', borderWidth: 1, borderColor: pastel.glassBorder,
  },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md },
  detailDate: { fontSize: 11, fontWeight: '700', color: pastel.textMuted, textTransform: 'uppercase', letterSpacing: 0.6 },
  closeBtn: { width: 32, height: 32, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.7)', borderWidth: 1, borderColor: pastel.glassBorder, alignItems: 'center', justifyContent: 'center' },
  moodBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, marginBottom: theme.spacing.sm },
  moodBadgeText: { fontSize: 13, fontWeight: '700' },
  detailSection: { marginBottom: theme.spacing.md },
  detailLabel: { fontSize: 10, fontWeight: '700', color: pastel.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  detailPromptValue: { fontSize: theme.typography.fontSize.paragraph.sm, color: pastel.textDeep, fontStyle: 'italic', lineHeight: 20 },
  detailScroll: { flex: 1, marginTop: 6 },
  detailContent: { fontSize: theme.typography.fontSize.paragraph.sm, color: pastel.textDeep, lineHeight: 24 },
  swipeDeleteAction: {
    backgroundColor: pastel.rose, justifyContent: 'center', alignItems: 'center',
    width: 80, borderRadius: 16, marginBottom: 10,
  },
  swipeDeleteText: { color: '#fff', fontSize: 11, fontWeight: '700', marginTop: 2 },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: theme.spacing.md, paddingVertical: 14, borderRadius: 16,
    backgroundColor: pastel.roseSoft,
  },
  deleteBtnText: { fontSize: 13, fontWeight: '700', color: pastel.rose },
});

export default Journal;