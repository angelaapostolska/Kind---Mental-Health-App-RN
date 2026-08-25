// src/components/home/CompanionAvatar.jsx
//
// Home-header companion animal picked during onboarding — a bare emoji, no
// bubble/container around it. There's no 3D engine or rigged animal models
// in this project, so this fakes a "breathing, slowly moving" 3D feel on
// the plain emoji using Reanimated transforms: a slow scale pulse
// (breathing), an independent perspective rotateX/rotateY tilt (gives it a
// sense of turning in space), and a gentle vertical drift (idle movement).
// All three run on their own out-of-phase loop so the motion reads as
// organic rather than mechanical.

import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { getAnimal } from '@/constants/animals';

const EASE = Easing.inOut(Easing.sin);

const CompanionAvatar = ({ animalId, size = 44, style }) => {
  const animal = getAnimal(animalId);

  const breathe = useSharedValue(0); // scale
  const tiltY = useSharedValue(0); // rotateY
  const tiltX = useSharedValue(0); // rotateX
  const drift = useSharedValue(0); // translateY

  useEffect(() => {
    // Out-of-phase durations so the loops don't sync up into something
    // that visibly "resets" every cycle.
    breathe.value = withRepeat(withTiming(1, { duration: 1800, easing: EASE }), -1, true);
    tiltY.value = withRepeat(withTiming(1, { duration: 2600, easing: EASE }), -1, true);
    tiltX.value = withRepeat(withTiming(1, { duration: 3400, easing: EASE }), -1, true);
    drift.value = withRepeat(withTiming(1, { duration: 2200, easing: EASE }), -1, true);
    // shared values are stable refs (like useRef) — safe to omit from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 300 },
      { translateY: -drift.value * 4 },
      { rotateX: `${(tiltX.value - 0.5) * 10}deg` },
      { rotateY: `${(tiltY.value - 0.5) * 16}deg` },
      { scale: 1 + breathe.value * 0.1 },
    ],
  }));

  return <Animated.Text style={[styles.emoji, { fontSize: size }, animatedStyle, style]}>{animal.emoji}</Animated.Text>;
};

const styles = StyleSheet.create({
  emoji: { textAlign: 'center' },
});

export default CompanionAvatar;
