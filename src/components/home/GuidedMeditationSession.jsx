import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, Animated, Easing,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Audio } from 'expo-av';

// ─── Azure Speech config ──────────────────────────────────────────────────────
// Create a free Speech resource: Azure portal → "Speech service" → free F0 tier.
// Free tier: 500,000 characters / month. Paste your key + region below.
//uncomment before use
const AZURE_KEY    = '55LVxe5fwy05MbcH6ka2TNU2e7vj9S6oQxGOPnNlT3epsFyYZpmlJQQJ99CFAC5T7U2XJ3w3AAAYACOGKVTQ';
const AZURE_REGION = 'francecentral';
const VOICE        = 'en-US-CoraMultilingualNeural';

// Pacing for a calm, meditative delivery.
const SPEAK_RATE = '-12%';            // slightly slower than natural
const PARAGRAPH_BREAK = '1700ms';   // silence between paragraphs

// ─── Meditation scripts ───────────────────────────────────────────────────────
const SCRIPTS = {
  'Body Scan': `Close your eyes… and take a slow, deep breath in. Let it out gently. Allow your body to settle into whatever surface supports you right now.

Bring your awareness to the very top of your head. Notice any tension sitting there… and with your next exhale, let it soften. There is nothing to do right now. Nowhere to be.

Slowly, your attention drifts down to your forehead… your eyes… your jaw. So many of us carry tightness here without realising. Let your teeth part slightly… let your tongue rest soft in your mouth.

Allow that softness to move down through your neck… your shoulders. With every breath out, your shoulders drop a little lower… a little heavier.

Feel your arms now… your upper arms… your elbows… your forearms… all the way down to your fingertips. Let them be heavy. Let them rest completely.

Your awareness drifts to your chest. Notice the gentle rise… and fall… rise… and fall. You do not need to control it. Simply watch it.

Move down into your belly… your lower back. With each exhale, feel the floor or the surface beneath you hold you a little more firmly. You are safe. You are supported.

Your hips… your pelvis… release any gripping here. Let go.

Down through your thighs now… heavy and warm… your knees… your calves… and finally… your feet. All the way to your toes. Let them uncurl… let them rest.

Your whole body is soft now. From the crown of your head to the soles of your feet… you are relaxed… you are present… you are at peace.

Stay here for as long as you need. There is nowhere else to be.`,

  'Loving Kindness': `Settle into a comfortable position and gently close your eyes. Take a deep breath in… and release it slowly. Let your body grow soft and still.

Begin by turning your attention inward… toward yourself. Place one hand over your heart if it feels natural.

Silently, offer yourself these words… May I be happy. May I be healthy. May I be safe. May I live with ease.

Say them slowly… without rushing. Let each phrase land gently… like a stone dropped into still water.

May I be happy… May I be healthy… May I be safe… May I live with ease.

Now bring to mind someone you love deeply. A friend, a family member… someone whose face makes you feel warm inside. Picture them clearly.

Offer them the same words… May you be happy. May you be healthy. May you be safe. May you live with ease.

Feel the warmth in your chest grow as you wish them well.

Now think of someone you feel neutral toward… a neighbour, a colleague, someone you pass without much thought. Offer them the same wish. May you be happy… may you be healthy… may you be safe… may you live with ease.

Let the circle of compassion grow wider now… outward to all people… in your city… your country… across the world. Every person carrying their own quiet hopes and struggles.

May all beings be happy. May all beings be healthy. May all beings be safe. May all beings live with ease.

Rest in that warmth for a moment. You have more love to give than you know.`,

  'Focus': `Find a comfortable, upright position. Not rigid… just alert and open. Let your eyes close softly.

Take one full breath in through your nose… hold it gently for a moment… and release it slowly through your mouth. Good.

Now let your breathing return to its natural rhythm. You are not trying to change it. Simply noticing it.

Bring your attention to the sensation of breath at your nostrils. The slight coolness as air enters… the warmth as it leaves. Just that. Just this small, steady sensation.

Stay here. Breath in… breath out.

When a thought arises — and it will — simply notice it. You might silently say "thinking"… and then gently, without any frustration, return your attention to the breath. The noticing is not a failure. The returning is the practice.

Breath in… breath out.

If a sound catches your attention, acknowledge it… and come back to the breath. If your mind wanders to tomorrow, to yesterday, to anything at all… that is normal. Just notice… and return.

Breath in… breath out.

Each time you return, you are strengthening something. A quiet muscle of attention. A capacity to be here, fully, in this one moment.

Breath in… breath out.

You do not need to achieve anything right now. There is no perfect meditation. There is only this breath… and the choice, again and again, to come back to it.

Breath in… breath out. You are doing beautifully.`,

  'Sleep': `Find your most comfortable position… and let your eyes close. You do not need to sleep right away. You only need to rest.

Take a slow breath in… filling your lungs completely… and let it all go. With that exhale, release the day. Whatever happened today has already passed. It is done. You can set it down now.

Feel the weight of your body sinking into the bed beneath you. The mattress rising to meet you… holding you completely. You don't need to hold yourself up anymore.

Let your feet grow heavy… warm… completely relaxed. That heaviness travels slowly up through your legs… your calves… your knees… your thighs. Heavy and warm.

Your hips sink deeper now. Your lower back softens. Your belly rises and falls… slowly… gently.

Your chest is loose… your shoulders melting… your arms resting at your sides like they belong to the earth itself.

Imagine a warm, golden light at the top of your head… slowly drifting down through your body with each breath… filling every space with calm… with warmth… with quiet.

Your mind begins to slow… thoughts dissolving like clouds drifting apart to reveal a wide, clear sky.

You are safe. You are warm. You are held.

There is nothing left to think about… nothing left to solve tonight. Only this breath… only this stillness… only the slow, peaceful drift toward sleep.

Let go… a little more… with every breath. You are almost there.`,
};

// ─── Constants ────────────────────────────────────────────────────────────────
const AURA_COLOR = '#b4a7f5';

const GUIDED_ICONS = {
  'Body Scan':       'human',
  'Loving Kindness': 'heart-outline',
  'Focus':           'eye-outline',
  'Sleep':           'moon-waning-crescent',
};

const GUIDED_DURATIONS = {
  'Body Scan':       10,
  'Loving Kindness': 8,
  'Focus':           10,
  'Sleep':           12,
};

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
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
};

// ─── SSML builder ─────────────────────────────────────────────────────────────
const escapeXml = (str) =>
  str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

const buildSSML = (script) => {
  const paragraphs = script.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const body = paragraphs
    .map((p) => `<p>${escapeXml(p)}</p>`)
    .join(`<break time="${PARAGRAPH_BREAK}"/>`);
  return (
    `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">` +
    `<voice name="${VOICE}"><prosody rate="${SPEAK_RATE}">${body}</prosody></voice>` +
    `</speak>`
  );
};

// ─── Azure Neural TTS (REST) ──────────────────────────────────────────────────
const fetchAudio = async (script) => {
  const res = await fetch(
    `https://${AZURE_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`,
    {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': AZURE_KEY,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
        'User-Agent': 'KindApp',
      },
      body: buildSSML(script),
    }
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Azure TTS ${res.status} ${detail}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return `data:audio/mpeg;base64,${btoa(binary)}`;
};

// ─── Component ────────────────────────────────────────────────────────────────
const GuidedMeditationSession = ({ visible, type, onDone }) => {
  const duration = GUIDED_DURATIONS[type] ?? 10;

  const [phase, setPhase]       = useState('loading');
  const [timeLeft, setTimeLeft] = useState(duration * 60);
  const [error, setError]       = useState(null);

  const soundRef     = useRef(null);
  const pulseAnim    = useRef(new Animated.Value(0)).current;
  const pulseLoopRef = useRef(null);
  const riseAnim     = useRef(new Animated.Value(0)).current;
  const textFadeAnim = useRef(new Animated.Value(0)).current;
  const subFadeAnim  = useRef(new Animated.Value(0)).current;
  const sparkleAnim  = useRef(new Animated.Value(0)).current;
  const timerRef     = useRef(null);
  const endSessionRef = useRef(null);
  const mountedRef   = useRef(true);

  const stopAll = useCallback(() => {
    if (pulseLoopRef.current) { pulseLoopRef.current.stop(); pulseLoopRef.current = null; }
    if (timerRef.current)     { clearInterval(timerRef.current); timerRef.current = null; }
    pulseAnim.setValue(0);
    if (soundRef.current) {
      soundRef.current.stopAsync().catch(() => {});
      soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }
  }, [pulseAnim]);

  const endSession = useCallback(() => {
    stopAll();
    riseAnim.setValue(0); textFadeAnim.setValue(0);
    subFadeAnim.setValue(0); sparkleAnim.setValue(0);
    setPhase('completion');
  }, [stopAll, riseAnim, textFadeAnim, subFadeAnim, sparkleAnim]);

  useEffect(() => { endSessionRef.current = endSession; }, [endSession]);

  useEffect(() => {
    mountedRef.current = true;

    if (!visible) {
      setPhase('loading'); setError(null); stopAll();
      return () => { mountedRef.current = false; };
    }

    setPhase('loading');
    setError(null);

    (async () => {
      try {
        const script = SCRIPTS[type] ?? SCRIPTS['Body Scan'];
        const audioUri = await fetchAudio(script);
        if (!mountedRef.current) return;

        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        const { sound } = await Audio.Sound.createAsync({ uri: audioUri }, { shouldPlay: false });
        if (!mountedRef.current) { sound.unloadAsync(); return; }

        soundRef.current = sound;

        const status = await sound.getStatusAsync();
        const audioDurationSec = status.isLoaded && status.durationMillis
          ? Math.ceil(status.durationMillis / 1000)
          : duration * 60;

        setTimeLeft(audioDurationSec);
        setPhase('session');
        await sound.playAsync();

        pulseLoopRef.current = Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, { toValue: 1, duration: 3500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(pulseAnim, { toValue: 0, duration: 3500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          ])
        );
        pulseLoopRef.current.start();

        let remaining = audioDurationSec;
        timerRef.current = setInterval(() => {
          remaining -= 1;
          setTimeLeft(remaining);
          if (remaining <= 0) {
            clearInterval(timerRef.current);
            timerRef.current = null;
            endSessionRef.current?.();
          }
        }, 1000);

        sound.setOnPlaybackStatusUpdate((s) => {
          if (s.didJustFinish) endSessionRef.current?.();
        });

      } catch (e) {
        console.warn('GuidedMeditation error:', e);
        if (mountedRef.current) {
          setError('Could not load your meditation.\nPlease check your connection and Azure key/region.');
          setPhase('session');
        }
      }
    })();

    return () => { mountedRef.current = false; stopAll(); };
  }, [visible, type]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (phase !== 'completion') return;
    Animated.spring(riseAnim, { toValue: 1, tension: 42, friction: 7, useNativeDriver: true }).start(() => {
      Animated.timing(textFadeAnim, { toValue: 1, duration: 750, useNativeDriver: true }).start(() => {
        Animated.timing(subFadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
      });
    });
    Animated.timing(sparkleAnim, { toValue: 1, duration: 1000, delay: 250, useNativeDriver: true }).start();
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const iconName = GUIDED_ICONS[type] ?? 'brain';

  return (
    <>
      <Modal visible={visible && phase !== 'completion'} animationType="fade" statusBarTranslucent onRequestClose={endSession}>
        <View style={sessionStyles.container}>
          <View style={sessionStyles.topInfo}>
            <MaterialCommunityIcons name={iconName} size={24} color={AURA_COLOR} />
            <Text style={sessionStyles.typeName}>{type}</Text>
            <Text style={sessionStyles.durationLabel}>Guided · Cora</Text>
          </View>

          {phase === 'loading' ? (
            <View style={sessionStyles.loadingArea}>
              <Text style={sessionStyles.loadingIcon}>✦</Text>
              <Text style={sessionStyles.loadingText}>Preparing your meditation…</Text>
            </View>
          ) : error ? (
            <View style={sessionStyles.loadingArea}>
              <MaterialCommunityIcons name="alert-circle-outline" size={40} color="rgba(255,100,100,0.6)" />
              <Text style={sessionStyles.errorText}>{error}</Text>
            </View>
          ) : (
            <View style={sessionStyles.animArea}>
              {AURA_RINGS.map(({ size, opacityRange, scaleRange }, i) => (
                <Animated.View key={i} style={[sessionStyles.auraRing, {
                  width: size, height: size, borderRadius: size / 2,
                  opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: opacityRange }),
                  transform: [{ scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: scaleRange }) }],
                }]} />
              ))}
              <Animated.View style={[sessionStyles.auraCenter, {
                transform: [{ scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1.0, 1.025] }) }],
              }]}>
                <Text style={sessionStyles.timerText}>{formatTime(timeLeft)}</Text>
                <Text style={sessionStyles.timerLabel}>remaining</Text>
              </Animated.View>
            </View>
          )}

          <TouchableOpacity style={sessionStyles.stopBtn} onPress={endSession}>
            <Text style={sessionStyles.stopBtnText}>End Session</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <Modal visible={phase === 'completion'} animationType="fade" statusBarTranslucent onRequestClose={onDone}>
        <View style={completionStyles.container}>
          <View style={completionStyles.bgGlow} />
          <View style={completionStyles.flowerArea}>
            {SPARKLE_ANGLES.map((angle, i) => {
              const rad = (angle * Math.PI) / 180;
              const tx = sparkleAnim.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(rad) * 78] });
              const ty = sparkleAnim.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(rad) * 78] });
              const op = sparkleAnim.interpolate({ inputRange: [0, 0.25, 0.72, 1], outputRange: [0, 1, 0.65, 0] });
              const sz = i % 2 === 0 ? 9 : 6;
              return (
                <Animated.View key={i} style={[completionStyles.sparkle, {
                  width: sz, height: sz, borderRadius: sz / 2,
                  opacity: op, transform: [{ translateX: tx }, { translateY: ty }],
                }]} />
              );
            })}
            <Animated.Text style={[completionStyles.lotus, {
              opacity: riseAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
              transform: [
                { scale:      riseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.15, 1] }) },
                { translateY: riseAnim.interpolate({ inputRange: [0, 1], outputRange: [90, 0] }) },
              ],
            }]}>🪷</Animated.Text>
          </View>

          <Animated.View style={[completionStyles.textBlock, { opacity: textFadeAnim }]}>
            <Text style={completionStyles.thankLine1}>Thank you for taking</Text>
            <Text style={completionStyles.thankLine2}>time for yourself</Text>
          </Animated.View>

          <Animated.View style={[completionStyles.bottomBlock, { opacity: subFadeAnim }]}>
            <Text style={completionStyles.subtitle}>{type} · Cora</Text>
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
  typeName: {
    fontSize: 22, fontWeight: '800', letterSpacing: 1.5,
    textTransform: 'uppercase', marginTop: 6, color: AURA_COLOR,
  },
  durationLabel: { fontSize: 13, color: 'rgba(255,255,255,0.40)', fontWeight: '600' },
  loadingArea: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20 },
  loadingIcon: { fontSize: 40, color: AURA_COLOR, opacity: 0.7 },
  loadingText: { fontSize: 15, color: 'rgba(255,255,255,0.45)', fontWeight: '600', textAlign: 'center' },
  errorText: { fontSize: 14, color: 'rgba(255,120,120,0.80)', textAlign: 'center', lineHeight: 22, marginTop: 8 },
  animArea: { width: 320, height: 320, alignItems: 'center', justifyContent: 'center' },
  auraRing: { position: 'absolute', backgroundColor: AURA_COLOR },
  auraCenter: {
    position: 'absolute', width: 128, height: 128, borderRadius: 64,
    backgroundColor: AURA_COLOR, alignItems: 'center', justifyContent: 'center', opacity: 0.88,
  },
  timerText: { fontSize: 40, fontWeight: '800', color: '#fff' },
  timerLabel: { fontSize: 11, color: 'rgba(255,255,255,0.60)', fontWeight: '600', marginTop: 4 },
  stopBtn: { paddingHorizontal: 44, paddingVertical: 16, borderRadius: 32, borderWidth: 2, borderColor: AURA_COLOR },
  stopBtnText: { fontSize: 15, fontWeight: '700', color: AURA_COLOR },
});

const completionStyles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#0d1117',
    alignItems: 'center', justifyContent: 'center',
    gap: 44, paddingHorizontal: 32,
  },
  bgGlow: { position: 'absolute', width: 360, height: 360, borderRadius: 180, backgroundColor: AURA_COLOR, opacity: 0.07 },
  flowerArea: { width: 170, height: 170, alignItems: 'center', justifyContent: 'center' },
  sparkle: { position: 'absolute', backgroundColor: AURA_COLOR },
  lotus: { fontSize: 86 },
  textBlock: { alignItems: 'center', gap: 6 },
  thankLine1: { fontSize: 26, fontWeight: '700', color: 'rgba(255,255,255,0.75)', textAlign: 'center' },
  thankLine2: { fontSize: 28, fontWeight: '800', color: AURA_COLOR, textAlign: 'center' },
  bottomBlock: { alignItems: 'center', gap: 28 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.38)', fontWeight: '600', textAlign: 'center', letterSpacing: 0.5 },
  continueBtn: { paddingHorizontal: 52, paddingVertical: 18, borderRadius: 32, backgroundColor: AURA_COLOR },
  continueBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
});

export default GuidedMeditationSession;