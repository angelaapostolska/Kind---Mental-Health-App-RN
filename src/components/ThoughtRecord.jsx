import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { theme } from '@/constants/theme';
import { pastel } from '@/components';
import { isoDate, showSuccessToast, showErrorToast } from '@/utils';
import { useCreateJournalEntryMutation } from '@/api/api';
import {
  STEPS, emptyAnswers, buildContent, buildStructured, StepInput, StepPrompt, StepCircles,
} from '@/components/thoughtRecord/parts';
import BeforeAfterReveal from '@/components/thoughtRecord/BeforeAfterReveal';

const ThoughtRecord = ({ visible, onClose, userId, antPromptId, onSaved }) => {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState(emptyAnswers());
  const patch = (obj) => setAnswers((a) => ({ ...a, ...obj }));

  const [createJournalEntry, { isLoading: saving }] = useCreateJournalEntryMutation();
  const close = () => { setStep(0); setAnswers(emptyAnswers()); onClose(); };

  const isFinale = step === STEPS.length;
  const current = STEPS[step];
  const canSave = answers.situation.trim() && answers.thought.trim() && answers.balanced.trim();

  const save = async () => {
    if (!canSave || !userId) {
      showErrorToast('Please fill in the situation, the thought, and a balanced thought.');
      return;
    }
    try {
      const today = isoDate(new Date());
      const titleBase = answers.situation.trim().slice(0, 40) || 'Thought Record';
      await createJournalEntry({
        createdAt: today,
        content: buildContent(answers),
        structuredData: buildStructured(answers),
        title: `Thought Record — ${titleBase}`,
        type: antPromptId ? 'PROMPT_BASED' : 'BLANK',
        user: { id: userId },
        ...(antPromptId && { journalPrompt: { id: antPromptId } }),
      }).unwrap();
      showSuccessToast('Thought record saved', 'Nice work reframing that thought.');
      close();
      onSaved?.();
    } catch {
      showErrorToast('Could not save your thought record. Please try again.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <View style={st.overlay}>
        <View style={st.sheet}>
          {isFinale ? (
            <BeforeAfterReveal answers={answers} onBack={() => setStep(STEPS.length - 1)} onSave={save} saving={saving} />
          ) : (
            <>
              <LinearGradient colors={[pastel.bgTop, pastel.bgMid, pastel.bgBottom]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.15 }} style={StyleSheet.absoluteFill} />
              <View style={st.inner}>
                <View style={st.handle} />
                <View style={st.header}>
                  <View style={{ flex: 1 }}>
                    <Text style={st.kicker}>CBT · THOUGHT RECORD</Text>
                  </View>
                  <TouchableOpacity onPress={close} style={st.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <MaterialIcons name="close" size={20} color={pastel.textDeep} />
                  </TouchableOpacity>
                </View>

                <StepCircles count={STEPS.length} current={step} />

                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: theme.spacing.md }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  <StepPrompt step={current} />
                  <StepInput step={current} answers={answers} patch={patch} />
                </ScrollView>

                <View style={st.footer}>
                  {step > 0 && (
                    <TouchableOpacity style={st.backBtn} onPress={() => setStep(step - 1)} activeOpacity={0.8}>
                      <MaterialIcons name="arrow-back" size={18} color={pastel.textDeep} />
                      <Text style={st.backText}>Back</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={{ flex: 1 }} onPress={() => setStep(step + 1)} activeOpacity={0.85}>
                    <LinearGradient colors={[pastel.heroPurple, pastel.heroPink]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.nextBtn}>
                      <Text style={st.nextText}>{step === STEPS.length - 1 ? 'See your shift' : 'Next'}</Text>
                      <MaterialIcons name="arrow-forward" size={18} color="#fff" />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}
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
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm },
  kicker: { fontSize: 11, fontWeight: '800', letterSpacing: 1, color: pastel.purpleDeep },
  closeBtn: { width: 34, height: 34, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.55)', borderWidth: 1, borderColor: pastel.glassBorder, alignItems: 'center', justifyContent: 'center' },
  footer: { flexDirection: 'row', gap: theme.spacing.xs, marginTop: theme.spacing.sm },
  backBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.6)', borderWidth: 1, borderColor: pastel.glassBorder, borderRadius: 16, paddingVertical: 15, paddingHorizontal: 18 },
  backText: { fontWeight: '700', color: pastel.textDeep, fontSize: 13 },
  nextBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 16, paddingVertical: 15, shadowColor: pastel.purpleDeep, shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 5 },
  nextText: { fontWeight: '800', color: '#fff', fontSize: 14 },
});

export default ThoughtRecord;