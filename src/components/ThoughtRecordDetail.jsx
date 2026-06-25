import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { theme } from '@/constants/theme';
import { pastel, GlossyCircle } from '@/components';
import { showSuccessToast, showErrorToast } from '@/utils';
import { useUpdateJournalEntryMutation, useDeleteJournalEntryMutation } from '@/api/api';
import {
  STEPS, NOW, parseStructured, buildContent, buildStructured,
  StepInput, StepReadView, StepPrompt, SummaryCards,
} from '@/components/thoughtRecord/parts';

const fmtDate = (dateStr) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const ThoughtRecordDetail = ({ visible, entry, onClose }) => {
  const parsed = useMemo(() => parseStructured(entry), [entry]);
  const [answers, setAnswers] = useState(parsed);
  const [dirty, setDirty] = useState(false);
  const [page, setPage] = useState(0);
  const [editingPage, setEditingPage] = useState(null);
  const [pageWidth, setPageWidth] = useState(0);

  const [updateJournalEntry, { isLoading: saving }] = useUpdateJournalEntryMutation();
  const [deleteJournalEntry] = useDeleteJournalEntryMutation();

  React.useEffect(() => {
    setAnswers(parsed); setDirty(false); setPage(0); setEditingPage(null);
  }, [entry?.id]);

  if (!answers) return null;

  const patch = (obj) => { setAnswers((a) => ({ ...a, ...obj })); setDirty(true); };
  const totalPages = STEPS.length + 1;

  const close = () => {
    if (dirty) {
      Alert.alert('Discard changes?', 'You have unsaved edits to this thought record.', [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: onClose },
      ]);
      return;
    }
    onClose();
  };

  const save = async () => {
    try {
      await updateJournalEntry({
        id: entry.id,
        data: {
          content: buildContent(answers),
          structuredData: buildStructured(answers),
          title: `Thought Record — ${(answers.situation || '').trim().slice(0, 40) || 'Thought Record'}`,
        },
      }).unwrap();
      setDirty(false); setEditingPage(null);
      showSuccessToast('Changes saved', 'Your thought record has been updated.');
    } catch {
      showErrorToast('Could not save changes. Please try again.');
    }
  };

  const confirmDelete = () => {
    Alert.alert('Delete record', 'This thought record will be permanently deleted.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await deleteJournalEntry(entry.id).unwrap();
            showSuccessToast('Record deleted', 'Your thought record has been removed.');
            onClose();
          } catch {
            showErrorToast('Could not delete. Please try again.');
          }
        },
      },
    ]);
  };

  const onScrollEnd = (e) => {
    if (!pageWidth) return;
    const idx = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
    if (idx !== page) { setPage(idx); setEditingPage(null); }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <View style={st.overlay}>
        <View style={st.sheet}>
          <LinearGradient colors={[pastel.bgTop, pastel.bgMid, pastel.bgBottom]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.15 }} style={StyleSheet.absoluteFill} />
          <View style={st.inner}>
            <View style={st.handle} />

            <View style={st.header}>
              <View style={{ flex: 1 }}>
                <Text style={st.kicker}>CBT · THOUGHT RECORD</Text>
                <Text style={st.date}>{fmtDate(entry?.createdAt)}</Text>
              </View>
              <TouchableOpacity onPress={confirmDelete} style={st.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <MaterialIcons name="delete-outline" size={20} color={theme.colors.text.error} />
              </TouchableOpacity>
              <TouchableOpacity onPress={close} style={st.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <MaterialIcons name="close" size={20} color={pastel.textDeep} />
              </TouchableOpacity>
            </View>

            {/* circle page dots */}
            <View style={st.dotRow}>
              {Array.from({ length: totalPages }).map((_, i) => (
                <View key={i} style={[st.dot, i === page && st.dotActive]} />
              ))}
            </View>

            <View style={{ flex: 1 }} onLayout={(e) => setPageWidth(e.nativeEvent.layout.width)}>
              {pageWidth > 0 && (
                <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={onScrollEnd} keyboardShouldPersistTaps="handled">
                  {STEPS.map((step, i) => {
                    const editing = editingPage === i;
                    return (
                      <View key={step.key} style={{ width: pageWidth }}>
                        <ScrollView style={st.page} contentContainerStyle={{ paddingBottom: theme.spacing.md }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                          <View style={st.pageHead}>
                            <View style={st.pageLabelRow}>
                              <GlossyCircle size={24} backgroundColor={pastel.purpleDeep + '33'} style={{ borderRadius: 8 }}>
                                <MaterialCommunityIcons name={step.icon} size={13} color={pastel.purpleDeep} />
                              </GlossyCircle>
                              <Text style={st.pageLabel}>STEP {step.col} · {step.title.toUpperCase()}</Text>
                            </View>
                            <TouchableOpacity
                              style={[st.editPill, editing && { backgroundColor: pastel.purpleDeep, borderColor: pastel.purpleDeep }]}
                              onPress={() => setEditingPage(editing ? null : i)}
                            >
                              <MaterialIcons name={editing ? 'check' : 'edit'} size={14} color={editing ? '#fff' : pastel.purpleDeep} />
                              <Text style={[st.editPillText, editing && { color: '#fff' }]}>{editing ? 'Done' : 'Edit'}</Text>
                            </TouchableOpacity>
                          </View>

                          {editing ? (
                            <>
                              <Text style={st.editPrompt}>{step.prompt}</Text>
                              <Text style={st.editExample}>{step.example}</Text>
                              <View style={{ height: theme.spacing.sm }} />
                              <StepInput step={step} answers={answers} patch={patch} />
                            </>
                          ) : (
                            <StepReadView step={step} answers={answers} />
                          )}
                        </ScrollView>
                      </View>
                    );
                  })}

                  {/* Before / After summary page */}
                  <View style={{ width: pageWidth }}>
                    <ScrollView style={st.page} contentContainerStyle={{ paddingBottom: theme.spacing.md }} showsVerticalScrollIndicator={false}>
                      <Text style={st.summaryTitle}>Your shift</Text>
                      <Text style={st.summarySub}>Where you started, and where you landed.</Text>
                      <View style={{ height: theme.spacing.md }} />
                      <SummaryCards answers={answers} />
                    </ScrollView>
                  </View>
                </ScrollView>
              )}
            </View>

            {dirty && (
              <TouchableOpacity onPress={save} disabled={saving} activeOpacity={0.85}>
                <LinearGradient colors={[pastel.heroPurple, pastel.heroPink]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[st.saveBtn, saving && { opacity: 0.6 }]}>
                  <MaterialIcons name="check" size={18} color="#fff" />
                  <Text style={st.saveText}>{saving ? 'Saving…' : 'Save changes'}</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const st = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden', height: '93%', backgroundColor: pastel.bgMid },
  inner: { flex: 1, paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.sm, paddingBottom: theme.spacing.lg },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.7)', alignSelf: 'center', marginBottom: theme.spacing.sm },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: theme.spacing.sm },
  kicker: { fontSize: 11, fontWeight: '800', letterSpacing: 1, color: pastel.purpleDeep, marginBottom: 2 },
  date: { fontSize: 16, fontWeight: '800', color: pastel.textDeep },
  iconBtn: { width: 34, height: 34, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.55)', borderWidth: 1, borderColor: pastel.glassBorder, alignItems: 'center', justifyContent: 'center' },
  dotRow: { flexDirection: 'row', justifyContent: 'center', gap: 7, marginBottom: theme.spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.55)' },
  dotActive: { backgroundColor: pastel.purpleDeep, width: 22 },
  page: { flex: 1, paddingHorizontal: 2 },
  pageHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.md, gap: 8 },
  pageLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  pageLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6, color: pastel.purpleDeep, flexShrink: 1 },
  editPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.6)', borderWidth: 1, borderColor: pastel.glassBorder, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  editPillText: { fontSize: 12, fontWeight: '700', color: pastel.purpleDeep },
  editPrompt: { fontSize: theme.typography.fontSize.paragraph.lg, fontWeight: '800', color: pastel.textDeep, lineHeight: 26 },
  editExample: { fontSize: 13, fontStyle: 'italic', color: pastel.textMuted, marginTop: 6, lineHeight: 19 },
  summaryTitle: { fontSize: theme.typography.fontSize.heading.sm, fontWeight: '800', color: pastel.textDeep },
  summarySub: { fontSize: 13, color: pastel.textMuted, marginTop: 4 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 16, paddingVertical: 15, marginTop: theme.spacing.sm, shadowColor: pastel.purpleDeep, shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 5 },
  saveText: { fontWeight: '800', color: '#fff', fontSize: 14 },
});

export default ThoughtRecordDetail;