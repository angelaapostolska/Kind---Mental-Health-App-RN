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
    // Petal colour palette — shifts per exercise
    petalA: pastel.heroPurple,
    petalB: '#C8A8FF',
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
    petalA: pastel.heroPink,
    petalB: '#FFB8D2',
  },
  {
    id: 'calm', name: 'Calm', desc: 'Soothing rhythm — perfect for anxiety',
    emoji: '🌊', tint: 'blue',
    inhale: 4, hold: 0, exhale: 6, holdAfter: 0,
    steps: [
      { label: 'Inhale', dur: 4 },
      { label: 'Exhale', dur: 6 },
    ],
    petalA: pastel.heroBlue,
    petalB: '#A8D8FF',
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

const TIPS = [
  { icon: 'lungs',             text: 'Breathe through your nose for better results' },
  { icon: 'human-handsdown',   text: 'Keep your shoulders relaxed and down' },
  { icon: 'calendar-clock',    text: 'Practice at the same time each day' },
  { icon: 'timer-outline',     text: 'Start with just 5 minutes per session' },
  { icon: 'meditation',        text: 'Close your eyes to deepen focus' },
];

// Number of petal pairs (matches Swift ForEach 0...2 = 3 pairs)
const PETAL_SETS = 3;

// ── Petal-flower breathing animation ────────────────────────────────────────
//
//  Mirrors the SwiftUI structure exactly:
//    ForEach (0...2):
//      ZStack:
//        Circle  offset +Y  (rotates with ZStack)
//        Circle  offset -Y  (rotates with ZStack)
//      .rotationEffect( circleSetNumber * 60° )
//      .scaleEffect( bloomed ? 1 : 0.2 )
//
//  React Native doesn't have a single "scale + rotate + offset" combo natively
//  so we drive two Animated.Values — flowerScale (0.2 ↔ 1) and flowerRotate
//  (0 ↔ 60°) — and map them onto each petal pair via inline transforms.
//
const PetalFlower = ({ running, phaseKey, exercise, countdown }) => {
  const CIRCLE_D    = 120;              // diameter of each inner petal circle (px)
  const OFFSET      = CIRCLE_D * 0.5;   // how far each inner circle is pushed from centre

  // Outer ring — sized to match the footprint of the original ambient glow
  // circle it replaced (~143px radius), just built from petals instead of a
  // flat circle.
  const OUTER_D      = 200;
  const OUTER_OFFSET = 55;

  // Container needs to fit the outer ring fully without clipping
  const SIZE   = (OUTER_OFFSET + OUTER_D / 2) * 2 + 20;
  const CENTRE = SIZE / 2;

  // ── Single shared animation value: 0 = closed, 1 = open ──────────────────
  const flowerAnim = useRef(new Animated.Value(0)).current;

  // Single ref for whatever animation is currently in flight. Only one
  // effect ever touches this now — that's what guarantees Stop (or switching
  // exercises, which also sets running=false) truly kills the animation
  // instead of a second effect silently restarting it.
  const animRef = useRef(null);

  // Map 0→1 to scale 0.18→1.0
  const petalScale = flowerAnim.interpolate({
    inputRange: [0, 1], outputRange: [0.18, 1.0],
  });
  // Rotation as NUMBERS (degrees) — never use string outputs if you need to
  // chain another interpolation; React Native throws "not a number" otherwise.
  const baseRotateDeg = flowerAnim.interpolate({
    inputRange: [0, 1], outputRange: [0, 60],
  });
  // Inner petal opacity: fades up as petals open
  const petalOpacity = flowerAnim.interpolate({
    inputRange: [0, 0.3, 1], outputRange: [0.25, 0.45, 0.68],
  });
  // Outer petal opacity: same shape, much more transparent throughout
  const outerOpacity = flowerAnim.interpolate({
    inputRange: [0, 0.3, 1], outputRange: [0.08, 0.16, 0.28],
  });

  // ── Drive the animation speed from the current phase duration ─────────────
  const isOpening = phaseKey === 'inhale' || phaseKey === 'hold';
  const toValue   = isOpening ? 1 : 0;
  const dur       = (() => {
    if (phaseKey === 'inhale')    return exercise.inhale    * 1000;
    if (phaseKey === 'hold')      return exercise.hold      * 1000;
    if (phaseKey === 'exhale')    return exercise.exhale    * 1000;
    if (phaseKey === 'holdAfter') return exercise.holdAfter * 1000;
    return 3000;
  })();

  // Track whether this is the very first inhale after pressing Start
  const isFirstRunRef = useRef(false);

  // Mark the first inhale so it gets its lead-in delay, the instant a session starts
  useEffect(() => {
    if (running) isFirstRunRef.current = true;
  }, [running]);

  // ── Stop control: fires the instant running goes false — whether from the
  // Stop button or from switching exercises. Kills whatever's in flight and
  // settles the flower to a calm closed state; nothing loops afterward, so
  // there's no way for the flower to keep moving once stopped.
  useEffect(() => {
    if (running) return;

    if (animRef.current) { animRef.current.stop(); animRef.current = null; }
    isFirstRunRef.current = false;

    const settle = Animated.timing(flowerAnim, {
      toValue: 0.2, duration: 280,
      easing: Easing.out(Easing.ease), useNativeDriver: true,
    });
    animRef.current = settle;
    settle.start();

    return () => { settle.stop(); animRef.current = null; };
  }, [running]);

  // ── Phase driver: runs when phase changes while a session is active ───────
  useEffect(() => {
    if (!running) return; // stop control above owns the idle/settled state

    if (animRef.current) { animRef.current.stop(); animRef.current = null; }

    // HOLD phases: don't just freeze wherever the previous animation happened
    // to land — ease smoothly into the fully open (hold) or fully closed
    // (holdAfter) resting position so the transition feels soft, not abrupt.
    if (phaseKey === 'hold' || phaseKey === 'holdAfter') {
      const settle = Animated.timing(flowerAnim, {
        toValue, duration: 400,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      });
      animRef.current = settle;
      settle.start();
      return () => { settle.stop(); animRef.current = null; };
    }

    // 1 s delay only on the very first inhale after pressing Start
    const delay = isFirstRunRef.current ? 1000 : 0;
    isFirstRunRef.current = false; // only applies once per start

    let timeout = null;
    timeout = setTimeout(() => {
      const anim = Animated.timing(flowerAnim, {
        toValue, duration: dur,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      });
      animRef.current = anim;
      anim.start();
    }, delay);

    return () => {
      clearTimeout(timeout);
      if (animRef.current) { animRef.current.stop(); animRef.current = null; }
    };
  }, [running, phaseKey, dur, toValue]);

  // Per-set rotation: Animated.add(baseRotateDeg, staticOffset) keeps everything
  // numeric, then a single interpolate maps number→'Xdeg' string at the leaf.
  const setAngles = Array.from({ length: PETAL_SETS }, (_, i) => {
    const staticOffset = i * (180 / PETAL_SETS);          // 0, 60, 120
    const totalDeg = Animated.add(baseRotateDeg, staticOffset);
    const rotateDeg = totalDeg.interpolate({
      inputRange: [0, 360], outputRange: ['0deg', '360deg'],
    });
    return { staticOffset, rotateDeg };
  });

  const { petalA, petalB } = exercise;

  return (
    <View style={{ width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center', marginTop: theme.spacing.xs, marginBottom: 0 }}>

      {/* Outer petal ring — bigger, much more transparent, replaces the old flat glow circle */}
      {setAngles.map(({ rotateDeg }, idx) => (
        <Animated.View
          key={`outer-${idx}`}
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: SIZE, height: SIZE,
            transform: [{ rotate: rotateDeg }, { scale: petalScale }],
            opacity: outerOpacity,
          }}
        >
          <LinearGradient
            colors={[petalA + '55', petalB + '55']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={{
              position: 'absolute',
              width: OUTER_D, height: OUTER_D, borderRadius: OUTER_D / 2,
              left: CENTRE - OUTER_D / 2,
              top:  CENTRE - OUTER_D / 2 - OUTER_OFFSET,
            }}
          />
          <LinearGradient
            colors={[petalB + '55', petalA + '55']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={{
              position: 'absolute',
              width: OUTER_D, height: OUTER_D, borderRadius: OUTER_D / 2,
              left: CENTRE - OUTER_D / 2,
              top:  CENTRE - OUTER_D / 2 + OUTER_OFFSET,
            }}
          />
        </Animated.View>
      ))}

      {/* Inner petal pairs — each is a full-size absolute layer so children are never clipped */}
      {setAngles.map(({ rotateDeg }, idx) => (
        <Animated.View
          key={idx}
          style={{
            position: 'absolute',
            width: SIZE, height: SIZE,
            transform: [{ rotate: rotateDeg }, { scale: petalScale }],
            opacity: petalOpacity,
          }}
        >
          {/* Top circle — centred in layer, shifted up by OFFSET */}
          <LinearGradient
            colors={[petalA, petalB]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={{
              position: 'absolute',
              width: CIRCLE_D, height: CIRCLE_D, borderRadius: CIRCLE_D / 2,
              left: CENTRE - CIRCLE_D / 2,
              top:  CENTRE - CIRCLE_D / 2 - OFFSET,
            }}
          />
          {/* Bottom circle — shifted down by OFFSET */}
          <LinearGradient
            colors={[petalB, petalA]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={{
              position: 'absolute',
              width: CIRCLE_D, height: CIRCLE_D, borderRadius: CIRCLE_D / 2,
              left: CENTRE - CIRCLE_D / 2,
              top:  CENTRE - CIRCLE_D / 2 + OFFSET,
            }}
          />
        </Animated.View>
      ))}

      {/* Floating phase label — sits over the flower, no white disc */}
      <View style={styles.floatingLabel} pointerEvents="none">
        {running ? (
          <>
            <Text style={[styles.floatingPhase, { color: '#fff' }]}>
              {PHASE_LABEL[phaseKey]}
            </Text>
            <Text style={[styles.floatingTimer, { color: '#fff' }]}>{countdown}</Text>
          </>
        ) : null}
      </View>
    </View>
  );
};

// ── Glossy exercise selector pill ───────────────────────────────────────────
const ExercisePill = ({ ex, active, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.8}
    style={[styles.exPill, active && { borderColor: 'transparent' }]}
  >
    {active && (
      <>
        <LinearGradient
          colors={[ex.petalA, ex.petalB]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFillObject, { borderRadius: 22 }]}
        />
        <LinearGradient
          colors={['rgba(255,255,255,0.50)', 'rgba(255,255,255,0)']}
          start={{ x: 0.1, y: 0 }} end={{ x: 0.5, y: 0.65 }}
          style={[StyleSheet.absoluteFillObject, { borderRadius: 22 }]}
          pointerEvents="none"
        />
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFillObject, {
            borderRadius: 22, borderWidth: 1.4,
            borderColor: 'rgba(255,255,255,0.82)',
          }]}
        />
      </>
    )}
    <Text style={[styles.exPillText, active && { color: '#fff' }]}>
      {ex.emoji}  {ex.name}
    </Text>
  </TouchableOpacity>
);

// ── Glossy step chip ─────────────────────────────────────────────────────────
// The lighter rectangle was an Android shadow-rendering artifact: this app's
// own SoftGlass.jsx works around the exact same bug by never putting
// `elevation` and `overflow: 'hidden'` on the same view (see its `shadow` /
// `clip` split). StepChip was doing both at once. Splitting it the same way
// fixes it: outer view owns the shadow, inner view owns the rounded clip + fill.
const StepChip = ({ label, active, exercise }) => {
  const fillColor = active ? exercise.petalA : exercise.petalA + '26';
  return (
    <View
      style={[
        styles.stepChipShadow,
        {
          backgroundColor: fillColor,
          shadowColor: exercise.petalA,
          shadowOpacity: active ? 0.5 : 0.22,
          shadowRadius: active ? 14 : 7,
          elevation: active ? 8 : 4,
        },
      ]}
    >
      <View style={[styles.stepChipClip, { backgroundColor: fillColor }]}>
        {/* thin glassy ring for the bubbly edge — no fill overlay of any kind */}
        <View
          pointerEvents="none"
          style={[styles.stepChipRing, active && styles.stepChipRingActive]}
        />
        <Text style={[styles.stepChipText, active && { color: '#fff' }]}>{label}</Text>
      </View>
    </View>
  );
};

// ── Tip row ──────────────────────────────────────────────────────────────────
const TipRow = ({ icon, text, idx }) => (
  <View style={styles.tipRow}>
    <SoftIcon size={34} radius={10} tint={['purple', 'lavender', 'mint', 'pink', 'blue'][idx % 5]}>
      <MaterialCommunityIcons name={icon} size={16} color="#fff" />
    </SoftIcon>
    <Text style={styles.tipText}>{text}</Text>
  </View>
);

// ── Main component ───────────────────────────────────────────────────────────
const Resources = () => {
  const insets = useSafeAreaInsets();

  const [exercise,  setExercise]  = useState(EXERCISES[0]);
  const [phaseIdx,  setPhaseIdx]  = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [running,   setRunning]   = useState(false);
  const [cycles,    setCycles]    = useState(0);

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

  // ── Per-second countdown + phase advance ─────────────────────────────────
  const countdownRef = useRef(0);
  const phaseIdxRef  = useRef(0);
  const exerciseRef  = useRef(exercise);
  const intervalRef  = useRef(null);

  useEffect(() => { exerciseRef.current = exercise; }, [exercise]);

  useEffect(() => {
    phaseIdxRef.current  = phaseIdx;
    countdownRef.current = phaseDuration(phaseSeq[phaseIdx]);
    setCountdown(countdownRef.current);
  }, [phaseIdx, phaseDuration]);

  useEffect(() => {
    if (!running) return;
    // Match the flower's 1s lead-in: don't start ticking the number down
    // until the animation itself is about to start moving.
    const startTimeout = setTimeout(() => {
      const interval = setInterval(() => {
        countdownRef.current -= 1;
        if (countdownRef.current <= 0) {
          // Skip rendering 0 entirely — move straight to the next phase,
          // whose own effect resets the displayed number to its starting count.
          const seq     = buildPhaseSeq(exerciseRef.current);
          const nextIdx = (phaseIdxRef.current + 1) % seq.length;
          if (nextIdx === 0) setCycles((c) => c + 1);
          setPhaseIdx(nextIdx);
        } else {
          setCountdown(countdownRef.current);
        }
      }, 1000);
      intervalRef.current = interval;
    }, 1000);
    return () => {
      clearTimeout(startTimeout);
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    };
  }, [running]);

  const toggle = () => {
    if (running) {
      setRunning(false); setPhaseIdx(0); setCycles(0);
    } else {
      setPhaseIdx(0); setCycles(0); setRunning(true);
    }
  };

  const selectExercise = (ex) => {
    // Stop session when switching exercise
    setRunning(false);
    setPhaseIdx(0);
    setCycles(0);
    setExercise(ex);
  };

  // Map step index → phase key for chip highlighting
  const stepPhaseKey = (i) => {
    if (i === 0) return 'inhale';
    if (i === 1 && phaseSeq.includes('hold')) return 'hold';
    if (i === exercise.steps.length - 1 && phaseSeq.includes('holdAfter')) return 'holdAfter';
    return 'exhale';
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

        {/* ── Flower animation hero card — fixed size so it never resizes ── */}
        <SoftHeroCard
          colors={[exercise.petalA + 'DD', exercise.petalB + 'BB', pastel.heroBlue + '99']}
          seed={23}
          sparkleCount={5}
          style={{ marginBottom: 18 }}
        >
          <View style={styles.heroInner}>
            <PetalFlower
              running={running}
              phaseKey={phaseKey}
              exercise={exercise}
              countdown={countdown}
            />

            {/* Always rendered so the card height never shifts — only the
                content inside fades in/out depending on whether we have cycles */}
            <View style={styles.cyclesBadgeSlot}>
              <View style={[styles.cyclesBadge, { opacity: cycles > 0 ? 1 : 0 }]}>
                <LinearGradient
                  colors={['rgba(255,255,255,0.38)', 'rgba(255,255,255,0.18)']}
                  style={[StyleSheet.absoluteFillObject, { borderRadius: 20 }]}
                />
                <View
                  pointerEvents="none"
                  style={[StyleSheet.absoluteFillObject, {
                    borderRadius: 20, borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.55)',
                  }]}
                />
                <Text style={styles.cyclesText}>
                  {cycles} cycle{cycles !== 1 ? 's' : ''} completed
                </Text>
              </View>
            </View>

            <GradientButton
              label={running ? 'Stop' : 'Start breathing'}
              onPress={toggle}
              colors={
                running
                  ? [pastel.rose, '#FF8FB0', pastel.heroPink]
                  : [exercise.petalA, exercise.petalB, pastel.heroBlue]
              }
              style={{ minWidth: 180, marginTop: 4, marginBottom: theme.spacing.md }}
            />
          </View>
        </SoftHeroCard>

        {/* ── Phase steps card ── */}
        <SoftCard seed={11} sparkleCount={0}>
          <View style={styles.stepsHeader}>
            <SoftIcon size={36} radius={11} tint={exercise.tint || 'purple'}>
              <Text style={{ fontSize: 17 }}>{exercise.emoji}</Text>
            </SoftIcon>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepsTitle}>{exercise.name} Breathing</Text>
              <Text style={styles.stepsDesc}>{exercise.desc}</Text>
            </View>
          </View>

          {/* 2-per-row centred grid */}
          <View style={styles.stepsGrid}>
            {exercise.steps.map((s, i) => (
              <StepChip
                key={i}
                label={`${s.label}  ${s.dur}s`}
                active={running && phaseKey === stepPhaseKey(i)}
                exercise={exercise}
              />
            ))}
          </View>
        </SoftCard>

        {/* ── Tips card ── */}
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

  pageHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md },
  pageTitle:    { fontSize: theme.typography.fontSize.heading.md, fontWeight: '800', color: pastel.textDeep },
  pageSubtitle: { fontSize: theme.typography.fontSize.paragraph.sm, color: pastel.textMuted, marginTop: 2 },

  exRow:    { flexDirection: 'row', gap: 8, marginBottom: theme.spacing.md },
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

  // ── Hero card — fixed height; content is packed toward the top (not
  // centered) so there's always visible breathing room below the button,
  // instead of it sitting flush against the card's bottom border.
  heroInner: {
    alignItems: 'center',
    height: 420,
    justifyContent: 'flex-start',
  },

  // ── Petal flower ──────────────────────────────────────────────────────────
  floatingLabel: {
    position: 'absolute',
    alignItems: 'center', justifyContent: 'center',
  },
  floatingPhase: {
    fontSize: 18, fontWeight: '800', textAlign: 'center',
    textShadowColor: 'rgba(74,46,122,0.45)',
    textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6,
  },
  floatingTimer: {
    fontSize: 42, fontWeight: '900', textAlign: 'center', marginTop: -6,
    textShadowColor: 'rgba(74,46,122,0.45)',
    textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8,
  },

  // Cycles badge — slot always reserves the same height so nothing reflows
  cyclesBadgeSlot: {
    height: 26, justifyContent: 'center', marginBottom: theme.spacing.xs,
  },
  cyclesBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7,
    overflow: 'hidden', alignSelf: 'center',
  },
  cyclesText: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.95)' },

  // Steps
  stepsHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.sm },
  stepsTitle:  { fontSize: 14, fontWeight: '800', color: pastel.textDeep },
  stepsDesc:   { fontSize: 11, color: pastel.textMuted, fontWeight: '600', marginTop: 1 },
  stepsGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 10, justifyContent: 'center',
  },
  stepChipShadow: {
    width: '47%', borderRadius: 18,
    shadowOffset: { width: 0, height: 6 },
  },
  stepChipClip: {
    borderRadius: 18, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14,
  },
  stepChipRing: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 18, borderWidth: 1.2, borderColor: 'rgba(255,255,255,0.55)',
  },
  stepChipRingActive: {
    borderColor: 'rgba(255,255,255,0.85)',
  },
  stepChipText: { fontSize: 13, fontWeight: '700', color: pastel.textDeep, textAlign: 'center' },

  // Tips
  tipsHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.md },
  tipsTitle:  { fontSize: 15, fontWeight: '800', color: pastel.textDeep },
  tipRow:     { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: 10 },
  tipText:    { flex: 1, fontSize: 13, color: pastel.textDeep, lineHeight: 20, fontWeight: '500' },
});

export default Resources;