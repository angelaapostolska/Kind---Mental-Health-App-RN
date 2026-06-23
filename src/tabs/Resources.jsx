import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';

const EXERCISES = [
  {
    id: 'box', name: 'Box', desc: 'Equal phases', inhale: 4, hold: 4, exhale: 4, holdAfter: 4,
    steps: [{ label: 'Inhale', dur: 4 }, { label: 'Hold', dur: 4 }, { label: 'Exhale', dur: 4 }, { label: 'Hold', dur: 4 }],
  },
  {
    id: '478', name: '4-7-8', desc: 'Deep relaxation', inhale: 4, hold: 7, exhale: 8, holdAfter: 0,
    steps: [{ label: 'Inhale', dur: 4 }, { label: 'Hold', dur: 7 }, { label: 'Exhale', dur: 8 }],
  },
  {
    id: 'calm', name: 'Calm', desc: 'Soothing rhythm', inhale: 4, hold: 0, exhale: 6, holdAfter: 0,
    steps: [{ label: 'Inhale', dur: 4 }, { label: 'Exhale', dur: 6 }],
  },
];

// Returns the ordered list of phase keys for a given exercise
const buildPhaseSeq = (ex) => {
  const seq = ['inhale'];
  if (ex.hold > 0)      seq.push('hold');
  seq.push('exhale');
  if (ex.holdAfter > 0) seq.push('holdAfter');
  return seq;
};

const PHASE_LABEL = { inhale: 'Inhale', hold: 'Hold', exhale: 'Exhale', holdAfter: 'Hold' };

const Resources = () => {
  const insets = useSafeAreaInsets();

  const [exercise,   setExercise]   = useState(EXERCISES[0]);
  const [phaseIdx,   setPhaseIdx]   = useState(0);
  const [countdown,  setCountdown]  = useState(0);   // seconds remaining in current phase
  const [running,    setRunning]    = useState(false);
  const [cycles,     setCycles]     = useState(0);

  // FIX 1 — create Animated.Value with useRef so it is NOT recreated on every
  //         render (the original `new Animated.Value(1)` was inside the component
  //         body, so every re-render threw away the previous animation).
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const phaseSeq   = buildPhaseSeq(exercise);
  const phaseKey   = phaseSeq[phaseIdx];

  const phaseDuration = useCallback(
    (key) => {
      if (key === 'inhale')    return exercise.inhale;
      if (key === 'hold')      return exercise.hold;
      if (key === 'exhale')    return exercise.exhale;
      if (key === 'holdAfter') return exercise.holdAfter;
      return 0;
    },
    [exercise],
  );

  // ── Animated circle ──────────────────────────────────────────────────────
  // FIX 2 — drive the animation from Animated.timing so it moves smoothly
  //         instead of jumping every second with a JS-computed scale value.
  useEffect(() => {
    if (!running) {
      // Reset to resting size
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
      return;
    }

    const dur   = phaseDuration(phaseKey) * 1000;
    let toValue = 1;
    // CHANGED: 1.5 → 1.4 so the bubble breathes more gently and always stays inside the card
    if (phaseKey === 'inhale')    toValue = 1.4;
    if (phaseKey === 'hold')      toValue = 1.4;   // stay expanded during hold
    if (phaseKey === 'exhale')    toValue = 1.0;
    if (phaseKey === 'holdAfter') toValue = 1.0;   // stay contracted

    Animated.timing(scaleAnim, {
      toValue,
      duration: dur,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [running, phaseKey, phaseDuration]);  // re-run whenever the phase changes

  // ── Per-second countdown + phase advance ─────────────────────────────────
  // FIX 3 — the original useEffect had `timer` (elapsed seconds) in its
  //         dependency array, which caused a new setInterval to be created on
  //         EVERY tick.  Switching to a ref-based countdown avoids that and
  //         makes the phase transitions reliable.
  const countdownRef = useRef(0);
  const phaseIdxRef  = useRef(0);
  const runningRef   = useRef(false);
  const exerciseRef  = useRef(exercise);

  // Keep refs in sync
  useEffect(() => { exerciseRef.current = exercise; }, [exercise]);
  useEffect(() => { runningRef.current  = running;  }, [running]);

  // Initialise countdown whenever the phase changes
  useEffect(() => {
    phaseIdxRef.current  = phaseIdx;
    countdownRef.current = phaseDuration(phaseSeq[phaseIdx]);
    setCountdown(countdownRef.current);
  }, [phaseIdx, phaseDuration]);  // phaseSeq is stable within one exercise choice

  // Single long-lived interval for the whole session
  useEffect(() => {
    if (!running) return;

    const interval = setInterval(() => {
      countdownRef.current -= 1;
      setCountdown(countdownRef.current);

      if (countdownRef.current <= 0) {
        // Advance to next phase
        const seq     = buildPhaseSeq(exerciseRef.current);
        const nextIdx = (phaseIdxRef.current + 1) % seq.length;
        if (nextIdx === 0) setCycles((c) => c + 1);
        setPhaseIdx(nextIdx);
        // countdownRef.current is updated by the phaseIdx useEffect above
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [running]);  // only restart when running flips

  // ── Start / Stop ─────────────────────────────────────────────────────────
  const toggle = () => {
    if (running) {
      setRunning(false);
      setPhaseIdx(0);
      setCycles(0);
    } else {
      setPhaseIdx(0);
      setCycles(0);
      setRunning(true);
    }
  };

  // ── Change exercise while stopped ─────────────────────────────────────────
  const selectExercise = (ex) => {
    if (running) return;
    setExercise(ex);
    setPhaseIdx(0);
    setCycles(0);
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + theme.spacing.md }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.pageTitle}>Breathe</Text>
      <Text style={styles.pageSubtitle}>Find your calm</Text>

      {/* Exercise Picker */}
      <View style={styles.pickerRow}>
        {EXERCISES.map((ex) => (
          <TouchableOpacity
            key={ex.id}
            onPress={() => selectExercise(ex)}
            style={[styles.pickerChip, exercise.id === ex.id && styles.pickerChipActive]}
          >
            <Text style={[styles.pickerChipText, exercise.id === ex.id && styles.pickerChipTextActive]}>
              {ex.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Animation Area */}
      <View style={styles.animCard}>
        <View style={styles.breatheContainer}>
          {/* CHANGED: soft outer glow for a cuter, bubblier look */}
          <Animated.View
            style={[
              styles.breatheGlow,
              { transform: [{ scale: scaleAnim }], opacity: 0.15 },
            ]}
          />
          {/* Outer ring — driven by scaleAnim (Animated.Value, not JS scalar) */}
          <Animated.View
            style={[
              styles.breatheRing,
              styles.breatheRingOuter,
              { transform: [{ scale: scaleAnim }], opacity: 0.22 },
            ]}
          />
          {/* Inner ring — slightly smaller */}
          <Animated.View
            style={[
              styles.breatheRing,
              styles.breatheRingInner,
              {
                transform: [{ scale: Animated.multiply(scaleAnim, 0.7) }],
                opacity: 0.45,
              },
            ]}
          />
          {/* Centre label */}
          <View style={styles.breatheCenter}>
            <View style={styles.breatheCenterDisc} />{/* CHANGED: soft disc behind text */}
            <Text style={styles.breathePhaseText}>
              {running ? PHASE_LABEL[phaseKey] : 'Tap Start'}
            </Text>
            {running && (
              <Text style={styles.breatheTimer}>{countdown}</Text>
            )}
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
          {exercise.steps.map((s, i) => {
            // Highlight the active step
            const stepPhaseKey = i === 0
              ? 'inhale'
              : i === exercise.steps.length - 1
                ? (phaseSeq.includes('holdAfter') ? 'holdAfter' : 'exhale')
                : phaseSeq[i] ?? 'hold';
            const isActive = running && phaseKey === stepPhaseKey;
            return (
              <View key={i} style={[styles.stepChip, isActive && styles.stepChipActive]}>
                <Text style={[styles.stepChipText, isActive && { color: '#fff' }]}>
                  {s.label} {s.dur}s
                </Text>
              </View>
            );
          })}
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
  pickerChip: { flex: 1, paddingVertical: 10, borderRadius: 20, alignItems: 'center', backgroundColor: theme.colors.surface.one, borderWidth: 1, borderColor: theme.colors.border.one },
  pickerChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  pickerChipText: { fontSize: 12, fontWeight: '700', color: theme.colors.text.secondary },
  pickerChipTextActive: { color: '#fff' },
  animCard: {
    backgroundColor: theme.colors.surface.one, borderRadius: 28, paddingVertical: theme.spacing.xl, paddingHorizontal: theme.spacing.lg,  // CHANGED: roomier card
    marginBottom: theme.spacing.md, alignItems: 'center', overflow: 'hidden',  // CHANGED: clip as a safety net
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  // CHANGED: container enlarged (was 200) so the bubble's peak size (≈210px) fits with breathing room
  breatheContainer: { width: 280, height: 280, alignItems: 'center', justifyContent: 'center', marginBottom: theme.spacing.md },
  // CHANGED: base ring shrunk 200 → 150 — at 1.4× peak it reaches ≈210px, comfortably inside the container
  breatheRing: { position: 'absolute', width: 150, height: 150, borderRadius: 75 },
  breatheGlow: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: '#A29BFE' },  // CHANGED: soft halo
  breatheRingOuter: { backgroundColor: '#8B7CF0' },  // CHANGED: softer violet
  breatheRingInner: { backgroundColor: '#37D6B0' },  // CHANGED: softer mint
  breatheCenter: { zIndex: 10, alignItems: 'center', justifyContent: 'center' },
  breatheCenterDisc: { position: 'absolute', width: 104, height: 104, borderRadius: 52, backgroundColor: theme.colors.surface.one, opacity: 0.85 },  // CHANGED: keeps text legible
  breathePhaseText: { fontSize: 16, fontWeight: '800', color: theme.colors.primary },
  breatheTimer: { fontSize: 36, fontWeight: '800', color: theme.colors.primary },
  cyclesText: { fontSize: 11, fontWeight: '600', color: theme.colors.text.secondary, marginBottom: 8 },
  startBtn: { paddingHorizontal: 40, paddingVertical: 14, borderRadius: 24, backgroundColor: theme.colors.primary, shadowColor: theme.colors.primary, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  stopBtn: { backgroundColor: '#d63031' },
  startBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  stepsCard: { backgroundColor: theme.colors.surface.one, borderRadius: 20, padding: theme.spacing.lg, marginBottom: theme.spacing.md },
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