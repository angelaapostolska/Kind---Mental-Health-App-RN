import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  Animated, Easing,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Audio } from 'expo-av';

const SOUND_FILES = {
  Rain:         require('../../assets/sounds/rain.mp3'),
  Ocean:        require('../../assets/sounds/ocean.mp3'),
  Forest:       require('../../assets/sounds/forest.mp3'),
  'White noise': require('../../assets/sounds/whitenoise.mp3'),
};

const SOUND_ICONS = {
  Rain: 'weather-rainy', Ocean: 'waves',
  Forest: 'tree', 'White noise': 'music-note-whole',
};

const SESSION_AURA_COLOR = '#b4a7f5';

const AURA_RINGS = [
  { size: 300, opacityRange: [0.04, 0.11], scaleRange: [1.0, 1.22] },
  { size: 262, opacityRange: [0.07, 0.17], scaleRange: [1.0, 1.17] },
  { size: 224, opacityRange: [0.11, 0.24], scaleRange: [1.0, 1.12] },
  { size: 188, opacityRange: [0.17, 0.32], scaleRange: [1.0, 1.08] },
  { size: 154, opacityRange: [0.26, 0.43], scaleRange: [1.0, 1.05] },
  { size: 122, opacityRange: [0.36, 0.56], scaleRange: [1.0, 1.02] },
];

const SPARKLE_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

// visible    — drives session visibility from Home
// sound      — e.g. 'Rain'
// duration   — in minutes
// onDone     — called when user taps Continue on the completion screen
const MeditationSession = ({ visible, sound, duration, onDone }) => {
  const [timeLeft, setTimeLeft] = useState(0);
  const [showCompletion, setShowCompletion] = useState(false);

  const soundRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const pulseLoopRef = useRef(null);
  const riseAnim = useRef(new Animated.Value(0)).current;
  const textFadeAnim = useRef(new Animated.Value(0)).current;
  const subFadeAnim = useRef(new Animated.Value(0)).current;
  const sparkleAnim = useRef(new Animated.Value(0)).current;

  // Always-fresh ref for endSession so the timer closure never goes stale
  const endSessionRef = useRef(null);

  const endSession = useCallback(() => {
    if (pulseLoopRef.current) { pulseLoopRef.current.stop(); pulseLoopRef.current = null; }
    pulseAnim.setValue(0);
    if (soundRef.current) {
      soundRef.current.stopAsync().catch(() => {});
      soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }
    riseAnim.setValue(0);
    textFadeAnim.setValue(0);
    subFadeAnim.setValue(0);
    sparkleAnim.setValue(0);
    setShowCompletion(true);
  }, [pulseAnim, riseAnim, textFadeAnim, subFadeAnim, sparkleAnim]);

  // Keep ref current so timer closure can call it without stale captures
  useEffect(() => { endSessionRef.current = endSession; }, [endSession]);

  // Session lifecycle — audio + pulse animation + countdown
  useEffect(() => {
    if (!visible) {
      setShowCompletion(false);
      return;
    }

    setShowCompletion(false);

    // Audio
    let mounted = true;
    Audio.setAudioModeAsync({ playsInSilentModeIOS: true })
      .then(() => Audio.Sound.createAsync(SOUND_FILES[sound] ?? SOUND_FILES.Rain, { isLooping: true }))
      .then(({ sound: s }) => {
        if (mounted) { soundRef.current = s; s.playAsync(); }
        else { s.unloadAsync(); }
      })
      .catch((e) => console.warn('Meditation audio error:', e));

    // Pulse animation
    pulseLoopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 3500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 3500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    pulseLoopRef.current.start();

    // Countdown — uses a local variable so timeLeft = 0 on first render
    // never accidentally fires endSession (the setInterval hasn't ticked yet).
    let remaining = duration * 60;
    setTimeLeft(remaining);

    const timerId = setInterval(() => {
      remaining -= 1;
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(timerId);
        endSessionRef.current?.();
      }
    }, 1000);

    return () => {
      mounted = false;
      clearInterval(timerId);
      if (pulseLoopRef.current) { pulseLoopRef.current.stop(); pulseLoopRef.current = null; }
      pulseAnim.setValue(0);
      if (soundRef.current) {
        soundRef.current.stopAsync().catch(() => {});
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
    };
  }, [visible, sound, duration, pulseAnim]);

  // Completion animation — runs once showCompletion becomes true
  useEffect(() => {
    if (!showCompletion) return;
    Animated.spring(riseAnim, { toValue: 1, tension: 42, friction: 7, useNativeDriver: true }).start(() => {
      Animated.timing(textFadeAnim, { toValue: 1, duration: 750, useNativeDriver: true }).start(() => {
        Animated.timing(subFadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
      });
    });
    Animated.timing(sparkleAnim, { toValue: 1, duration: 1000, delay: 250, useNativeDriver: true }).start();
  }, [showCompletion, riseAnim, textFadeAnim, subFadeAnim, sparkleAnim]);

  return (
    <>
      {/* Session screen */}
      <Modal visible={visible && !showCompletion} animationType="fade" statusBarTranslucent onRequestClose={endSession}>
        <View style={sessionStyles.container}>
          <View style={sessionStyles.topInfo}>
            <MaterialCommunityIcons name={SOUND_ICONS[sound] || 'music'} size={24} color={SESSION_AURA_COLOR} />
            <Text style={sessionStyles.soundName}>{sound}</Text>
            <Text style={sessionStyles.durationLabel}>{duration} min session</Text>
          </View>

          <View style={sessionStyles.animArea}>
            {AURA_RINGS.map(({ size, opacityRange, scaleRange }, i) => {
              const ringOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: opacityRange });
              const ringScale   = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: scaleRange });
              return (
                <Animated.View
                  key={i}
                  style={[sessionStyles.auraRing, {
                    width: size, height: size, borderRadius: size / 2,
                    opacity: ringOpacity, transform: [{ scale: ringScale }],
                  }]}
                />
              );
            })}
            <Animated.View style={[sessionStyles.auraCenter, {
              transform: [{ scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1.0, 1.025] }) }],
            }]}>
              <Text style={sessionStyles.timerText}>{formatTime(timeLeft)}</Text>
              <Text style={sessionStyles.timerLabel}>remaining</Text>
            </Animated.View>
          </View>

          <TouchableOpacity style={sessionStyles.stopBtn} onPress={endSession}>
            <Text style={sessionStyles.stopBtnText}>End Session</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Completion screen */}
      <Modal visible={showCompletion} animationType="fade" statusBarTranslucent onRequestClose={onDone}>
        <View style={completionStyles.container}>
          <View style={completionStyles.bgGlow} />

          <View style={completionStyles.flowerArea}>
            {SPARKLE_ANGLES.map((angle, i) => {
              const rad = (angle * Math.PI) / 180;
              const tx  = sparkleAnim.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(rad) * 78] });
              const ty  = sparkleAnim.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(rad) * 78] });
              const op  = sparkleAnim.interpolate({ inputRange: [0, 0.25, 0.72, 1], outputRange: [0, 1, 0.65, 0] });
              const sz  = i % 2 === 0 ? 9 : 6;
              return (
                <Animated.View
                  key={i}
                  style={[completionStyles.sparkle, {
                    width: sz, height: sz, borderRadius: sz / 2,
                    opacity: op, transform: [{ translateX: tx }, { translateY: ty }],
                  }]}
                />
              );
            })}
            <Animated.Text style={[completionStyles.lotus, {
              opacity: riseAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
              transform: [
                { scale:      riseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.15, 1] }) },
                { translateY: riseAnim.interpolate({ inputRange: [0, 1], outputRange: [90, 0] }) },
              ],
            }]}>
              🪷
            </Animated.Text>
          </View>

          <Animated.View style={[completionStyles.textBlock, { opacity: textFadeAnim }]}>
            <Text style={completionStyles.thankLine1}>Thank you for taking</Text>
            <Text style={completionStyles.thankLine2}>time for yourself</Text>
          </Animated.View>

          <Animated.View style={[completionStyles.bottomBlock, { opacity: subFadeAnim }]}>
            <Text style={completionStyles.subtitle}>{duration} min · {sound}</Text>
            <TouchableOpacity style={completionStyles.continueBtn} onPress={onDone}>
              <Text style={completionStyles.continueBtnText}>Continue</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
};

const sessionStyles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#0d1117',
    alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 80, paddingHorizontal: 24,
  },
  topInfo: { alignItems: 'center', gap: 8 },
  soundName: {
    fontSize: 22, fontWeight: '800', letterSpacing: 1.5,
    textTransform: 'uppercase', marginTop: 6, color: SESSION_AURA_COLOR,
  },
  durationLabel: { fontSize: 13, color: 'rgba(255,255,255,0.40)', fontWeight: '600' },
  animArea: { width: 320, height: 320, alignItems: 'center', justifyContent: 'center' },
  auraRing: { position: 'absolute', backgroundColor: SESSION_AURA_COLOR },
  auraCenter: {
    position: 'absolute',
    width: 128, height: 128, borderRadius: 64,
    backgroundColor: SESSION_AURA_COLOR,
    alignItems: 'center', justifyContent: 'center', opacity: 0.88,
  },
  timerText: { fontSize: 40, fontWeight: '800', color: '#fff' },
  timerLabel: { fontSize: 11, color: 'rgba(255,255,255,0.60)', fontWeight: '600', marginTop: 4 },
  stopBtn: {
    paddingHorizontal: 44, paddingVertical: 16,
    borderRadius: 32, borderWidth: 2, borderColor: SESSION_AURA_COLOR,
  },
  stopBtnText: { fontSize: 15, fontWeight: '700', color: SESSION_AURA_COLOR },
});

const completionStyles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#0d1117',
    alignItems: 'center', justifyContent: 'center',
    gap: 44, paddingHorizontal: 32,
  },
  bgGlow: {
    position: 'absolute', width: 360, height: 360,
    borderRadius: 180, backgroundColor: SESSION_AURA_COLOR, opacity: 0.07,
  },
  flowerArea: { width: 170, height: 170, alignItems: 'center', justifyContent: 'center' },
  sparkle: { position: 'absolute', backgroundColor: SESSION_AURA_COLOR },
  lotus: { fontSize: 86 },
  textBlock: { alignItems: 'center', gap: 6 },
  thankLine1: { fontSize: 26, fontWeight: '700', color: 'rgba(255,255,255,0.75)', textAlign: 'center' },
  thankLine2: { fontSize: 28, fontWeight: '800', color: SESSION_AURA_COLOR, textAlign: 'center' },
  bottomBlock: { alignItems: 'center', gap: 28 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.38)', fontWeight: '600', textAlign: 'center', letterSpacing: 0.5 },
  continueBtn: { paddingHorizontal: 52, paddingVertical: 18, borderRadius: 32, backgroundColor: SESSION_AURA_COLOR },
  continueBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
});

export default MeditationSession;
