import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { theme } from '@/constants/theme';
import { ScreenGradientBackground, GradientButton, pastel } from '@/components';
import { SoftCard, SoftHeroCard, SoftIcon } from '@/components/home/SoftGlass';

// ── Exercise definitions ─────────────────────────────────────────────────────
const EXERCISES = [
  {
    id: 'box', name: 'Box', desc: 'Equal phases — great for focus & calm',
    emoji: '⬜', tint: 'lavender',
    inhale: 4, hold: 4, exhale: 4, holdAfter: 4,
    steps: [
      { label: 'Inhale', dur: 4 },
      { label: 'Hold',   dur: 4 },
      { label: 'Exhale', dur: 4 },
      { label: 'Hold',   dur: 4 },
    ],
  },
  {
    id: '478', name: '4-7-8', desc: 'Deep relaxation — quiets the nervous system',
    emoji: '🌙', tint: 'purple',
    inhale: 4, hold: 7, exhale: 8, holdAfter: 0,
    steps: [
      { label: 'Inhale', dur: 4 },
      { label: 'Hold',   dur: 7 },
      { label: 'Exhale', dur: 8 },
    ],
  },
  {
    id: 'calm', name: 'Calm', desc: 'Soothing rhythm — perfect for anxiety',
    emoji: '🌊', tint: 'mint',
    inhale: 4, hold: 0, exhale: 6, holdAfter: 0,
    steps: [
      { label: 'Inhale', dur: 4 },
      { label: 'Exhale', dur: 6 },
    ],
  },
];

const buildPhaseSeq = (ex) => {
  const seq = ['inhale'];
  if (ex.hold > 0)      seq.push('hold');
  seq.push('exhale');
  if (ex.holdAfter > 0) seq.push('holdAfter');
  return seq;
};

const PHASE_LABEL = {
  inhale: 'Inhale', hold: 'Hold', exhale: 'Exhale', holdAfter: 'Hold',
};

// Phase → colour used for the animated ring + step chip
const PHASE_COLORS = {
  inhale:    [pastel.heroPurple, pastel.heroPink],
  hold:      [pastel.heroPink,   pastel.heroBlue],
  exhale:    [pastel.heroBlue,   pastel.heroPurple],
  holdAfter: [pastel.heroPurple, pastel.heroPink],
};

const TIPS = [
  { icon: 'nose',                    text: 'Breathe through your nose for better results' },
  { icon: 'human-handsdown',         text: 'Keep your shoulders relaxed and down' },
  { icon: 'calendar-clock',          text: 'Practice at the same time each day' },
  { icon: 'timer-outline',           text: 'Start with just 5 minutes per session' },
  { icon: 'meditation',              text: 'Close your eyes to deepen focus' },
];

// ── Glossy exercise selector pill ────────────────────────────────────────────
const ExercisePill = ({ ex, active, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.8}
    style={[styles.exPill, active && { borderColor: 'transparent' }]}
  >
    {active && (
      <>
        {/* Gradient fill */}
        <LinearGradient
          colors={[pastel.heroPurple, pastel.heroPink]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFillObject, { borderRadius: 22 }]}
        />
        {/* Top reflection */}
        <LinearGradient
          colors={['rgba(255,255,255,0.50)', 'rgba(255,255,255,0)']}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.5, y: 0.65 }}
          style={[StyleSheet.absoluteFillObject, { borderRadius: 22 }]}
          pointerEvents="none"
        />
        {/* White border glow */}
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFillObject, {
            borderRadius: 22,
            borderWidth: 1.4,
            borderColor: 'rgba(255,255,255,0.80)',
          }]}
        />
      </>
    )}
    <Text style={[styles.exPillText, active && { color: '#fff' }]}>
      {ex.emoji}  {ex.name}
    </Text>
  </TouchableOpacity>
);

// ── Animated breathe orb ─────────────────────────────────────────────────────
const BreatheOrb = ({ scaleAnim, phaseKey, running, countdown }) => {
  const colors = PHASE_COLORS[phaseKey] || PHASE_COLORS.inhale;

  return (
    <View style={styles.orbContainer}>
      {/* Soft outer glow halo */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.orbHalo,
          { transform: [{ scale: scaleAnim }], opacity: 0.22 },
          { backgroundColor: colors[0] },
        ]}
      />

      {/* Outer animated ring — glossy gradient */}
      <Animated.View style={[styles.orbRingWrap, { transform: [{ scale: scaleAnim }] }]}>
        <LinearGradient
          colors={[colors[0] + 'CC', colors[1] + '99']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.orbRingGradient}
        />
        {/* Ring glass sheen */}
        <LinearGradient
          colors={['rgba(255,255,255,0.38)', 'rgba(255,255,255,0)']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.5 }}
          style={[StyleSheet.absoluteFillObject, { borderRadius: 90 }]}
          pointerEvents="none"
        />
        {/* White border */}
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFillObject, {
            borderRadius: 90,
            borderWidth: 1.5,
            borderColor: 'rgba(255,255,255,0.70)',
          }]}
        />
      </Animated.View>

      {/* Inner ring — smaller, lighter */}
      <Animated.View
        style={[
          styles.orbInnerRing,
          {
            transform: [{ scale: Animated.multiply(scaleAnim, 0.68) }],
            backgroundColor: colors[1] + '88',
          },
        ]}
      />

      {/* Centre glossy disc */}
      <View style={styles.orbCentre}>
        {/* Disc frosted fill */}
        <LinearGradient
          colors={['rgba(255,255,255,0.96)', 'rgba(245,240,255,0.92)']}
          style={[StyleSheet.absoluteFillObject, { borderRadius: 54 }]}
        />
        {/* Top reflection */}
        <LinearGradient
          colors={['rgba(255,255,255,0.70)', 'rgba(255,255,255,0)']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.5 }}
          style={[StyleSheet.absoluteFillObject, { borderRadius: 54 }]}
          pointerEvents="none"
        />
        {/* White border ring */}
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFillObject, {
            borderRadius: 54,
            borderWidth: 1.5,
            borderColor: 'rgba(255,255,255,0.90)',
          }]}
        />
        {/* Shadow from disc on ring */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute', width: 108, height: 108, borderRadius: 54,
            shadowColor: colors[0], shadowOpacity: 0.3,
            shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
          }}
        />

        {/* Label */}
        <Text style={[styles.orbPhaseText, { color: colors[0] }]}>
          {running ? PHASE_LABEL[phaseKey] : 'Ready'}
        </Text>
        {running && (
          <Text style={[styles.orbTimer, { color: colors[0] }]}>{countdown}</Text>
        )}
        {!running && (
          <MaterialCommunityIcons
            name="play-circle-outline"
            size={20}
            color={pastel.purpleDeep + '88'}
            style={{ marginTop: 4 }}
          />
        )}
      </View>
    </View>
  );
};

// ── Step chip — glossy when active ───────────────────────────────────────────
const StepChip = ({ label, active }) => (
  <View style={[styles.stepChip, active && { borderColor: 'transparent', overflow: 'hidden' }]}>
    {active && (
      <>
        <LinearGradient
          colors={[pastel.heroPurple, pastel.heroPink]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFillObject, { borderRadius: 14 }]}
        />
        <LinearGradient
          colors={['rgba(255,255,255,0.42)', 'rgba(255,255,255,0)']}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.5, y: 0.65 }}
          style={[StyleSheet.absoluteFillObject, { borderRadius: 14 }]}
          pointerEvents="none"
        />
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFillObject, {
            borderRadius: 14,
            borderWidth: 1.2,
            borderColor: 'rgba(255,255,255,0.75)',
          }]}
        />
      </>
    )}
    <Text style={[styles.stepChipText, active && { color: '#fff' }]}>{label}</Text>
  </View>
);

// ── Tip row ───────────────────────────────────────────────────────────────────
const TipRow = ({ icon, text, idx }) => (
  <View style={styles.tipRow}>
    <SoftIcon size={34} radius={10} tint={['purple', 'lavender', 'mint', 'pink', 'blue'][idx % 5]}>
      <MaterialCommunityIcons name={icon} size={16} color="#fff" />
    </SoftIcon>
    <Text style={styles.tipText}>{text}</Text>
  </View>
);

// ── Main component ────────────────────────────────────────────────────────────
const Resources = () => {
  const insets = useSafeAreaInsets();

  const [exercise,  setExercise]  = useState(EXERCISES[0]);
  const [phaseIdx,  setPhaseIdx]  = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [running,   setRunning]   = useState(false);
  const [cycles,    setCycles]    = useState(0);

  const scaleAnim = useRef(new Animated.Value(1)).current;

  const phaseSeq = buildPhaseSeq(exercise);
  const phaseKey = phaseSeq[phaseIdx];

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

  // ── Animated orb ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!running) {
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
      return;
    }
    const dur = phaseDuration(phaseKey) * 1000;
    const toValue =
      phaseKey === 'inhale' || phaseKey === 'hold' ? 1.38 : 1.0;
    Animated.timing(scaleAnim, {
      toValue, duration: dur,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [running, phaseKey, phaseDuration]);

  // ── Countdown + phase advance ────────────────────────────────────────────────
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
      setRunning(false); setPhaseIdx(0); setCycles(0);
    } else {
      setPhaseIdx(0); setCycles(0); setRunning(true);
    }
  };

  const selectExercise = (ex) => {
    if (running) return;
    setExercise(ex); setPhaseIdx(0); setCycles(0);
  };

  return (
    <View style={{ flex: 1 }}>
      <ScreenGradientBackground />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + theme.spacing.md }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Page header ── */}
        <View style={styles.pageHeader}>
          <View>
            <Text style={styles.pageTitle}>Breathe</Text>
            <Text style={styles.pageSubtitle}>Find your calm</Text>
          </View>
          <SoftIcon size={44} radius={14} tint="lavender">
            <MaterialCommunityIcons name="weather-windy" size={22} color="#fff" />
          </SoftIcon>
        </View>

        {/* ── Exercise selector ── */}
        <View style={styles.exRow}>
          {EXERCISES.map((ex) => (
            <ExercisePill
              key={ex.id}
              ex={ex}
              active={exercise.id === ex.id}
              onPress={() => selectExercise(ex)}
            />
          ))}
        </View>

        {/* ── Main orb card (SoftHeroCard) ── */}
        <SoftHeroCard
          colors={[pastel.heroPurple, pastel.heroPink, pastel.heroBlue]}
          seed={23}
          sparkleCount={5}
          style={{ marginBottom: 18 }}
        >
          <View style={{ alignItems: 'center' }}>
            <BreatheOrb
              scaleAnim={scaleAnim}
              phaseKey={phaseKey}
              running={running}
              countdown={countdown}
            />

            {cycles > 0 && (
              <View style={styles.cyclesBadge}>
                <LinearGradient
                  colors={['rgba(255,255,255,0.38)', 'rgba(255,255,255,0.18)']}
                  style={[StyleSheet.absoluteFillObject, { borderRadius: 20 }]}
                />
                <View
                  pointerEvents="none"
                  style={[StyleSheet.absoluteFillObject, {
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.55)',
                  }]}
                />
                <Text style={styles.cyclesText}>
                  {cycles} cycle{cycles !== 1 ? 's' : ''} completed
                </Text>
              </View>
            )}

            <GradientButton
              label={running ? 'Stop' : 'Start breathing'}
              onPress={toggle}
              colors={
                running
                  ? [pastel.rose, '#FF8FB0', pastel.heroPink]
                  : [pastel.heroPink, pastel.heroPurple, pastel.heroBlue]
              }
              style={{ minWidth: 180, marginTop: 4 }}
            />
          </View>
        </SoftHeroCard>

        {/* ── Phase steps card (SoftCard) ── */}
        <SoftCard seed={11} sparkleCount={3}>
          {/* Header row */}
          <View style={styles.stepsHeader}>
            <SoftIcon size={36} radius={11} tint={exercise.tint || 'purple'}>
              <Text style={{ fontSize: 17 }}>{exercise.emoji}</Text>
            </SoftIcon>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepsTitle}>{exercise.name} Breathing</Text>
              <Text style={styles.stepsDesc}>{exercise.desc}</Text>
            </View>
          </View>

          {/* Phase chips */}
          <View style={styles.stepsRow}>
            {exercise.steps.map((s, i) => {
              // Map step index → phase key so the active chip highlights correctly
              const stepPhaseKey =
                i === 0 ? 'inhale'
                  : i === 1 && phaseSeq.includes('hold') ? 'hold'
                    : i === exercise.steps.length - 1 && phaseSeq.includes('holdAfter') ? 'holdAfter'
                      : 'exhale';
              const isActive = running && phaseKey === stepPhaseKey;
              return (
                <StepChip
                  key={i}
                  label={`${s.label}  ${s.dur}s`}
                  active={isActive}
                />
              );
            })}
          </View>

          {/* Progress dots — one per phase in the cycle */}
          {running && (
            <View style={styles.progressDots}>
              {phaseSeq.map((pk, i) => (
                <View
                  key={i}
                  style={[
                    styles.progressDot,
                    i === phaseIdx && {
                      width: 20,
                      backgroundColor: pastel.purpleDeep,
                    },
                  ]}
                />
              ))}
            </View>
          )}
        </SoftCard>

        {/* ── Breathing tips (SoftCard) ── */}
        <SoftCard seed={7} sparkleCount={3}>
          <View style={styles.tipsHeader}>
            <SoftIcon size={36} radius={11} tint="mint">
              <MaterialCommunityIcons name="lightbulb-on-outline" size={17} color="#fff" />
            </SoftIcon>
            <Text style={styles.tipsTitle}>Breathing Tips</Text>
          </View>
          {TIPS.map((tip, i) => (
            <TipRow key={i} icon={tip.icon} text={tip.text} idx={i} />
          ))}
        </SoftCard>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  scroll:   { flex: 1, backgroundColor: 'transparent' },
  content:  { padding: theme.spacing.md, paddingBottom: 110 },

  // Page header
  pageHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md },
  pageTitle:    { fontSize: theme.typography.fontSize.heading.md, fontWeight: '800', color: pastel.textDeep },
  pageSubtitle: { fontSize: theme.typography.fontSize.paragraph.sm, color: pastel.textMuted, marginTop: 2 },

  // Exercise selector
  exRow: { flexDirection: 'row', gap: 8, marginBottom: theme.spacing.md },
  exPill: {
    flex: 1, paddingVertical: 11, paddingHorizontal: 6,
    borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderWidth: 1.4, borderColor: 'rgba(255,255,255,0.82)',
    shadowColor: pastel.purpleDeep, shadowOpacity: 0.14,
    shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3,
    overflow: 'hidden',
  },
  exPillText: { fontSize: 11, fontWeight: '700', color: pastel.textMuted },

  // Orb
  orbContainer: {
    width: 270, height: 270,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: theme.spacing.lg,
  },
  orbHalo: {
    position: 'absolute',
    width: 210, height: 210, borderRadius: 105,
  },
  orbRingWrap: {
    position: 'absolute',
    width: 180, height: 180, borderRadius: 90,
    overflow: 'hidden',
    shadowColor: pastel.purpleDeep, shadowOpacity: 0.25,
    shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },
  orbRingGradient: {
    width: '100%', height: '100%', borderRadius: 90,
  },
  orbInnerRing: {
    position: 'absolute',
    width: 130, height: 130, borderRadius: 65,
  },
  orbCentre: {
    width: 108, height: 108, borderRadius: 54,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: pastel.purpleDeep, shadowOpacity: 0.18,
    shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5,
  },
  orbPhaseText: { fontSize: 15, fontWeight: '800', textAlign: 'center' },
  orbTimer:     { fontSize: 34, fontWeight: '900', textAlign: 'center', marginTop: -2 },

  // Cycles badge
  cyclesBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7,
    marginBottom: theme.spacing.sm, overflow: 'hidden',
  },
  cyclesText: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.95)' },

  // Steps card
  stepsHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.sm },
  stepsTitle:  { fontSize: 14, fontWeight: '800', color: pastel.textDeep },
  stepsDesc:   { fontSize: 11, color: pastel.textMuted, fontWeight: '600', marginTop: 1 },
  stepsRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  stepChip: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.60)',
    borderWidth: 1.4, borderColor: 'rgba(255,255,255,0.82)',
    shadowColor: pastel.purpleDeep, shadowOpacity: 0.10,
    shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },
  stepChipText: { fontSize: 12, fontWeight: '700', color: pastel.textDeep },

  // Progress dots
  progressDots: { flexDirection: 'row', gap: 6, justifyContent: 'center', marginTop: 4 },
  progressDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: 'rgba(156,123,234,0.30)',
  },

  // Tips card
  tipsHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.md },
  tipsTitle:  { fontSize: 15, fontWeight: '800', color: pastel.textDeep },
  tipRow:     { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: 10 },
  tipText:    { flex: 1, fontSize: 13, color: pastel.textDeep, lineHeight: 20, fontWeight: '500' },
});

export default Resources;