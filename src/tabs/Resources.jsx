import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Easing } from 'react-native';
import { theme } from '@/constants/theme';

const EXERCISES = [
  { id: 'box', name: 'Box', desc: 'Equal phases', inhale: 4, hold: 4, exhale: 4, holdAfter: 4,
    steps: [{ label: 'Inhale', dur: 4 }, { label: 'Hold', dur: 4 }, { label: 'Exhale', dur: 4 }, { label: 'Hold', dur: 4 }] },
  { id: '478', name: '4-7-8', desc: 'Deep relaxation', inhale: 4, hold: 7, exhale: 8, holdAfter: 0,
    steps: [{ label: 'Inhale', dur: 4 }, { label: 'Hold', dur: 7 }, { label: 'Exhale', dur: 8 }] },
  { id: 'calm', name: 'Calm', desc: 'Soothing rhythm', inhale: 4, hold: 0, exhale: 6, holdAfter: 0,
    steps: [{ label: 'Inhale', dur: 4 }, { label: 'Exhale', dur: 6 }] },
];

const PHASE_SEQUENCE = (ex) => {
  const seq = ['inhale'];
  if (ex.hold > 0) seq.push('hold');
  seq.push('exhale');
  if (ex.holdAfter > 0) seq.push('holdAfter');
  return seq;
};

const Resources = () => {
  const [exercise, setExercise] = useState(EXERCISES[0]);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [timer, setTimer] = useState(0);
  const [running, setRunning] = useState(false);
  const [cycles, setCycles] = useState(0);
  const scaleAnim = new Animated.Value(1);

  const phaseSeq = PHASE_SEQUENCE(exercise);
  const currentPhase = phaseSeq[phaseIdx];

  const phaseDur = (phase) => {
    if (phase === 'inhale') return exercise.inhale;
    if (phase === 'hold') return exercise.hold;
    if (phase === 'exhale') return exercise.exhale;
    if (phase === 'holdAfter') return exercise.holdAfter;
    return 0;
  };

  const phaseLabel = { inhale: 'Inhale', hold: 'Hold', exhale: 'Exhale', holdAfter: 'Hold' };
  const phaseColor = { inhale: '#6C5CE7', hold: '#00b894', exhale: '#fd79a8', holdAfter: '#fdcb6e' };

  useEffect(() => {
    if (!running) return;
    const dur = phaseDur(currentPhase);
    if (timer < dur) {
      const interval = setInterval(() => setTimer((t) => t + 1), 1000);
      return () => clearInterval(interval);
    }
    const nextIdx = (phaseIdx + 1) % phaseSeq.length;
    if (nextIdx === 0) setCycles((c) => c + 1);
    setPhaseIdx(nextIdx);
    setTimer(0);
  }, [running, timer, phaseIdx, currentPhase]);

  const toggle = () => {
    if (running) { setRunning(false); setPhaseIdx(0); setTimer(0); }
    else { setRunning(true); setPhaseIdx(0); setTimer(0); setCycles(0); }
  };

  const progressPct = running ? timer / Math.max(phaseDur(currentPhase), 1) : 0;
  const scale = currentPhase === 'inhale' ? 1 + progressPct * 0.5
    : currentPhase === 'exhale' ? 1.5 - progressPct * 0.5
    : currentPhase === 'hold' ? 1.5
    : 1;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>Breathe</Text>
      <Text style={styles.pageSubtitle}>Find your calm</Text>

      {/* Exercise Picker */}
      <View style={styles.pickerRow}>
        {EXERCISES.map((ex) => (
          <TouchableOpacity
            key={ex.id}
            onPress={() => { if (!running) setExercise(ex); }}
            style={[styles.pickerChip, exercise.id === ex.id && styles.pickerChipActive]}
          >
            <Text style={[styles.pickerChipText, exercise.id === ex.id && styles.pickerChipTextActive]}>{ex.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Animation Area */}
      <View style={styles.animCard}>
        <View style={styles.breatheContainer}>
          {/* Outer ring */}
          <View style={[styles.breatheRing, styles.breatheRingOuter, { transform: [{ scale }], opacity: 0.25 }]} />
          {/* Inner ring */}
          <View style={[styles.breatheRing, styles.breatheRingInner, { transform: [{ scale: scale * 0.75 }], opacity: 0.45 }]} />
          {/* Center */}
          <View style={styles.breatheCenter}>
            <Text style={styles.breathePhaseText}>{running ? phaseLabel[currentPhase] : 'Tap Start'}</Text>
            {running && <Text style={styles.breatheTimer}>{phaseDur(currentPhase) - timer}</Text>}
          </View>
        </View>

        {cycles > 0 && (
          <Text style={styles.cyclesText}>{cycles} cycle{cycles !== 1 ? 's' : ''}</Text>
        )}

        <TouchableOpacity onPress={toggle} style={[styles.startBtn, running && styles.stopBtn]}>
          <Text style={styles.startBtnText}>{running ? 'Stop' : 'Start'}</Text>
        </TouchableOpacity>
      </View>

      {/* Steps Card */}
      <View style={styles.stepsCard}>
        <Text style={styles.stepsDesc}>{exercise.desc}</Text>
        <View style={styles.stepsRow}>
          {exercise.steps.map((s, i) => (
            <View key={i} style={[styles.stepChip, running && phaseSeq[phaseIdx] === (i === 0 ? 'inhale' : i === exercise.steps.length - 1 ? 'exhale' : 'hold') && styles.stepChipActive]}>
              <Text style={styles.stepChipText}>{s.label} {s.dur}s</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Tips */}
      <View style={styles.tipsCard}>
        <Text style={styles.tipsTitle}>Breathing Tips</Text>
        {[
          'Breathe through your nose for better results',
          'Keep your shoulders relaxed and down',
          'Practice at the same time each day',
          'Start with just 5 minutes per session',
        ].map((tip, i) => (
          <View key={i} style={styles.tipRow}>
            <View style={styles.tipBullet} />
            <Text style={styles.tipText}>{tip}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.colors.surface.two },
  content: { padding: theme.spacing.md, paddingBottom: 100 },
  pageTitle: { fontSize: theme.typography.fontSize.heading.md, fontWeight: '800', color: theme.colors.text.primary },
  pageSubtitle: { fontSize: theme.typography.fontSize.paragraph.sm, color: theme.colors.text.secondary, marginBottom: theme.spacing.md },
  pickerRow: { flexDirection: 'row', gap: 8, marginBottom: theme.spacing.md },
  pickerChip: {
    flex: 1, paddingVertical: 10, borderRadius: 20, alignItems: 'center',
    backgroundColor: theme.colors.surface.one, borderWidth: 1, borderColor: theme.colors.border.one,
  },
  pickerChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  pickerChipText: { fontSize: 12, fontWeight: '700', color: theme.colors.text.secondary },
  pickerChipTextActive: { color: '#fff' },
  animCard: {
    backgroundColor: theme.colors.surface.one, borderRadius: 24, padding: theme.spacing.lg,
    marginBottom: theme.spacing.md, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  breatheContainer: { width: 200, height: 200, alignItems: 'center', justifyContent: 'center', marginBottom: theme.spacing.md },
  breatheRing: { position: 'absolute', width: 200, height: 200, borderRadius: 100 },
  breatheRingOuter: { backgroundColor: '#6C5CE7' },
  breatheRingInner: { backgroundColor: '#00b894' },
  breatheCenter: { zIndex: 10, alignItems: 'center' },
  breathePhaseText: { fontSize: 16, fontWeight: '800', color: theme.colors.primary },
  breatheTimer: { fontSize: 36, fontWeight: '800', color: theme.colors.primary },
  cyclesText: { fontSize: 11, fontWeight: '600', color: theme.colors.text.secondary, marginBottom: 8 },
  startBtn: {
    paddingHorizontal: 40, paddingVertical: 14, borderRadius: 24,
    backgroundColor: theme.colors.primary,
    shadowColor: theme.colors.primary, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  stopBtn: { backgroundColor: '#d63031' },
  startBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  stepsCard: {
    backgroundColor: theme.colors.surface.one, borderRadius: 20, padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  stepsDesc: { fontSize: 10, fontWeight: '700', color: theme.colors.text.secondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: theme.spacing.sm },
  stepsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stepChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: theme.colors.surface.two },
  stepChipActive: { backgroundColor: theme.colors.primary },
  stepChipText: { fontSize: 12, fontWeight: '600', color: theme.colors.text.primary },
  tipsCard: { backgroundColor: theme.colors.surface.one, borderRadius: 20, padding: theme.spacing.lg },
  tipsTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.text.primary, marginBottom: theme.spacing.sm },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  tipBullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.primary, marginTop: 5 },
  tipText: { flex: 1, fontSize: 13, color: theme.colors.text.secondary, lineHeight: 20 },
});

export default Resources;
