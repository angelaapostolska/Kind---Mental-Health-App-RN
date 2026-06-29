import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
// CHANGED: shared pastel-glass design system (same as Home)
import { ScreenGradientBackground, GlassCard, GradientButton, pastel } from '@/components';

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
  const [countdown,  setCountdown]  = useState(0);
  const [running,    setRunning]    = useState(false);
  const [cycles,     setCycles]     = useState(0);

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
  useEffect(() => {
    if (!running) {
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
      return;
    }

    const dur   = phaseDuration(phaseKey) * 1000;
    let toValue = 1;
    if (phaseKey === 'inhale')    toValue = 1.4;
    if (phaseKey === 'hold')      toValue = 1.4;
    if (phaseKey === 'exhale')    toValue = 1.0;
    if (phaseKey === 'holdAfter') toValue = 1.0;

    Animated.timing(scaleAnim, {
      toValue,
      duration: dur,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [running, phaseKey, phaseDuration]);

  // ── Per-second countdown + phase advance ─────────────────────────────────
  const countdownRef = useRef(0);
  const phaseIdxRef  = useRef(0);
  const runningRef   = useRef(false);
  const exerciseRef  = useRef(exercise);

  useEffect(() => { exerciseRef.current = exercise; }, [exercise]);
  useEffect(() => { runningRef.current  = running;  }, [running]);

  useEffect(() => {
    phaseIdxRef.current  = phaseIdx;
    countdownRef.current = phaseDuration(phaseSeq[phaseIdx]);
    setCountdown(countdownRef.current);
  }, [phaseIdx, phaseDuration]);

  useEffect(() => {
    if (!running) return;

    const interval = setInterval(() => {
      countdownRef.current -= 1;
      setCountdown(countdownRef.current);

      if (countdownRef.current <= 0) {
        const seq     = buildPhaseSeq(exerciseRef.current);
        const nextIdx = (phaseIdxRef.current + 1) % seq.length;
        if (nextIdx === 0) setCycles((c) => c + 1);
        setPhaseIdx(nextIdx);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [running]);

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

  const selectExercise = (ex) => {
    if (running) return;
    setExercise(ex);
    setPhaseIdx(0);
    setCycles(0);
  };

  return (
    // CHANGED: pastel gradient backdrop + transparent scroll, matching Home.
    <View style={{ flex: 1 }}>
      <ScreenGradientBackground />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + theme.spacing.md }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>Breathe</Text>
        <Text style={styles.pageSubtitle}>Find your calm</Text>

        {/* Exercise Picker — CHANGED: frosted chips, deep-purple active */}
        <View style={styles.pickerRow}>
          {EXERCISES.map((ex) => (
            <TouchableOpacity
              key={ex.id}
              onPress={() => selectExercise(ex)}
              activeOpacity={0.8}
              style={[styles.pickerChip, exercise.id === ex.id && styles.pickerChipActive]}
            >
              <Text style={[styles.pickerChipText, exercise.id === ex.id && styles.pickerChipTextActive]}>
                {ex.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Animation Area — CHANGED: now a glass card; bubble recolored to pink/purple */}
        <GlassCard glow="purple">
          <View style={{ alignItems: 'center' }}>
            <View style={styles.breatheContainer}>
              {/* soft outer glow */}
              <Animated.View
                style={[styles.breatheGlow, { transform: [{ scale: scaleAnim }], opacity: 0.18 }]}
              />
              {/* Outer ring */}
              <Animated.View
                style={[styles.breatheRing, styles.breatheRingOuter, { transform: [{ scale: scaleAnim }], opacity: 0.30 }]}
              />
              {/* Inner ring — slightly smaller */}
              <Animated.View
                style={[
                  styles.breatheRing,
                  styles.breatheRingInner,
                  { transform: [{ scale: Animated.multiply(scaleAnim, 0.7) }], opacity: 0.5 },
                ]}
              />
              {/* Centre label */}
              <View style={styles.breatheCenter}>
                <View style={styles.breatheCenterDisc} />
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

            {/* CHANGED: shared gradient pill — rose gradient while running (= Stop) */}
            <GradientButton
              label={running ? 'Stop' : 'Start'}
              onPress={toggle}
              glow={running ? 'pink' : 'purple'}
              colors={running
                ? [pastel.rose, '#FF8FB0', pastel.heroPink]
                : [pastel.heroPink, pastel.heroPurple, pastel.heroBlue]}
              style={{ paddingHorizontal: 8, minWidth: 160 }}
            />
          </View>
        </GlassCard>

        {/* Steps Card */}
        <GlassCard glow="purple">
          <Text style={styles.stepsDesc}>{exercise.desc}</Text>
          <View style={styles.stepsRow}>
            {exercise.steps.map((s, i) => {
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
        </GlassCard>

        {/* Tips */}
        <GlassCard glow="purple">
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
        </GlassCard>
      </ScrollView>
    </View>
  );
};

// CHANGED: recolored to the pastel-glass system.
const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: theme.spacing.md, paddingBottom: 100 },
  pageTitle: { fontSize: theme.typography.fontSize.heading.md, fontWeight: '800', color: pastel.textDeep },
  pageSubtitle: { fontSize: theme.typography.fontSize.paragraph.sm, color: pastel.textMuted, marginBottom: theme.spacing.md },
  pickerRow: { flexDirection: 'row', gap: 8, marginBottom: theme.spacing.md },
  pickerChip: { flex: 1, paddingVertical: 11, borderRadius: 20, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.5)', borderWidth: 1, borderColor: pastel.glassBorder },
  pickerChipActive: { backgroundColor: pastel.purpleDeep, borderColor: pastel.purpleDeep },
  pickerChipText: { fontSize: 12, fontWeight: '700', color: pastel.textMuted },
  pickerChipTextActive: { color: '#fff' },
  // CHANGED: container enlarged so the bubble's peak size fits with breathing room
  breatheContainer: { width: 280, height: 280, alignItems: 'center', justifyContent: 'center', marginBottom: theme.spacing.md },
  breatheRing: { position: 'absolute', width: 150, height: 150, borderRadius: 75 },
  breatheGlow: { position: 'absolute', width: 190, height: 190, borderRadius: 95, backgroundColor: pastel.heroPink }, // CHANGED: pink halo
  breatheRingOuter: { backgroundColor: pastel.purple },  // CHANGED: pastel lavender
  breatheRingInner: { backgroundColor: pastel.pink },    // CHANGED: pastel pink bubble
  breatheCenter: { zIndex: 10, alignItems: 'center', justifyContent: 'center' },
  breatheCenterDisc: { position: 'absolute', width: 104, height: 104, borderRadius: 52, backgroundColor: 'rgba(255,255,255,0.9)' }, // CHANGED: bright glassy disc
  breathePhaseText: { fontSize: 16, fontWeight: '800', color: pastel.purpleDeep },
  breatheTimer: { fontSize: 36, fontWeight: '800', color: pastel.purpleDeep },
  cyclesText: { fontSize: 11, fontWeight: '600', color: pastel.textMuted, marginBottom: 8 },
  stepsDesc: { fontSize: 10, fontWeight: '700', color: pastel.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: theme.spacing.sm },
  stepsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stepChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.5)', borderWidth: 1, borderColor: pastel.glassBorder },
  stepChipActive: { backgroundColor: pastel.purpleDeep, borderColor: pastel.purpleDeep },
  stepChipText: { fontSize: 12, fontWeight: '600', color: pastel.textDeep },
  tipsTitle: { fontSize: 14, fontWeight: '700', color: pastel.textDeep, marginBottom: theme.spacing.sm },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  tipBullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: pastel.purpleDeep, marginTop: 5 },
  tipText: { flex: 1, fontSize: 13, color: pastel.textDeep, lineHeight: 20 },
});

export default Resources;